// The game engine: one pure function turns a learning event into new progress + friendly messages.
// All rules live here (and are unit-tested): XP with daily caps (anti-farming), streaks, badges, quests, spaced review.
import { MockResult, Progress, XP, answerQuestion, completeTopic } from "../progress";
import { dayKey, isoWeekId } from "./dates";
import { BadgeCtx, badgeById, newlyEarned } from "./badges";
import { levelFor } from "./levels";
import { applyReview, reviewKey, scheduleMiss } from "./review";
import { bump, completable, ensureWeek, questsForWeek } from "./quests";
import { streakMessage, touchStreak } from "./streak";

export type GameEvent =
  | { type: "visit"; key: string; week: number; slug: string; title: string }
  | { type: "answer"; key: string; qid: string; correct: boolean; qtype: string }
  | { type: "topic-complete"; key: string; right: number; total: number }
  | { type: "run" }
  | { type: "review"; itemKey: string; correct: boolean }
  | { type: "daily"; correct: boolean; day: string }
  | { type: "mock-finish"; result: MockResult; missedKeys: string[] };

export type Toast = { kind: "xp" | "badge" | "streak" | "level" | "quest" | "info"; text: string };
export type Ctx = { now: Date; badges: BadgeCtx };

/** Per-day XP ceilings per source. Repeating easy things must never be the fastest way to level up. */
export const DAILY_CAPS: Record<string, number> = { answer: 150, run: 15, review: 60 };

function award(p: Progress, kind: string, amount: number, today: string, weekId: string): { p: Progress; gained: number } {
  if (amount <= 0) return { p, gained: 0 };
  const sameDay = p.xpToday.day === today;
  const used = sameDay ? (p.xpToday.byKind[kind] ?? 0) : 0;
  const cap = DAILY_CAPS[kind];
  const gained = cap === undefined ? amount : Math.max(0, Math.min(amount, cap - used));
  if (gained === 0) return { p, gained: 0 };
  const xpWeek = p.xpWeek.weekId === weekId ? { weekId, xp: p.xpWeek.xp + gained } : { weekId, xp: gained };
  return { p: { ...p, xp: p.xp + gained, xpWeek, xpToday: { day: today, byKind: { ...(sameDay ? p.xpToday.byKind : {}), [kind]: used + gained } } }, gained };
}

export function applyEvent(prev: Progress, e: GameEvent, ctx: Ctx): { progress: Progress; toasts: Toast[] } {
  const toasts: Toast[] = [];
  const today = dayKey(ctx.now);
  const weekId = isoWeekId(ctx.now);
  const hour = ctx.now.getHours();
  let p: Progress = { ...prev, quests: ensureWeek(prev.quests, weekId) };
  const levelBefore = levelFor(prev.xp).index;

  // Any learning activity touches the streak and the time-of-day stats.
  const s = touchStreak(p.streak, today);
  p = { ...p, streak: s.streak, stats: { ...p.stats, night: p.stats.night || hour < 4, early: p.stats.early || (hour >= 4 && hour < 7) } };
  const sm = streakMessage(s.event, s.streak.count);
  if (sm && s.event !== "first") toasts.push({ kind: "streak", text: sm });

  const gainXp = (kind: string, amount: number, label?: string) => {
    const r = award(p, kind, amount, today, weekId);
    p = r.p;
    if (r.gained > 0 && label) toasts.push({ kind: "xp", text: `+${r.gained} XP ${label}` });
  };

  switch (e.type) {
    case "visit": {
      const t = { ...(p.topics[e.key] ?? {}), visited: true };
      p = { ...p, last: { week: e.week, slug: e.slug, title: e.title }, topics: { ...p.topics, [e.key]: t } };
      break;
    }
    case "answer": {
      const before = p.xp;
      const prevState = p.topics[e.key]?.answered?.[e.qid];
      const next = answerQuestion(p, e.key, e.qid, e.correct);
      const raw = next.xp - before;
      p = { ...next, xp: before }; // re-award through the cap
      gainXp("answer", raw, e.correct ? (prevState === undefined ? "first try!" : "") : undefined);
      if (e.correct && prevState === undefined) {
        p = { ...p, stats: { ...p.stats, correctFirstTry: p.stats.correctFirstTry + 1, bugsFixed: p.stats.bugsFixed + (e.qtype === "bug" ? 1 : 0) } };
        if (e.qtype === "bug") p = { ...p, quests: bump(p.quests, "bugs") };
      }
      if (!e.correct) p = { ...p, review: scheduleMiss(p.review, reviewKey(e.key, e.qid), today) };
      break;
    }
    case "topic-complete": {
      const t0 = p.topics[e.key];
      const firstTime = !t0?.done;
      const bestBefore = t0?.quizBest ?? 0;
      const before = p.xp;
      const next = completeTopic(p, e.key, { right: e.right, total: e.total });
      p = { ...next, xp: before };
      gainXp("topic", next.xp - before, firstTime ? "lesson complete" : undefined);
      const pct = e.total ? Math.round((e.right / e.total) * 100) : 0;
      if (e.total > 0 && e.right === e.total && bestBefore < e.total) {
        p = { ...p, stats: { ...p.stats, perfectQuizzes: p.stats.perfectQuizzes + 1 } };
        gainXp("perfect", XP.perfectQuiz, "perfect quiz");
      }
      if (firstTime) p = { ...p, quests: bump(p.quests, "lessons") };
      if (pct >= 80) p = { ...p, quests: bump(p.quests, "quiz80") };
      const prevPct = t0?.quizLastPct;
      if (prevPct !== undefined && pct > prevPct) toasts.push({ kind: "info", text: `Improved by ${pct - prevPct}% since your last try.` });
      break;
    }
    case "run":
      p = { ...p, stats: { ...p.stats, runs: p.stats.runs + 1 }, quests: bump(p.quests, "runs") };
      gainXp("run", XP.run, undefined);
      break;
    case "review": {
      p = { ...p, review: applyReview(p.review, e.itemKey, e.correct, today), stats: { ...p.stats, reviews: p.stats.reviews + (e.correct ? 1 : 0) } };
      if (e.correct) { p = { ...p, quests: bump(p.quests, "reviews") }; gainXp("review", XP.review, "review"); }
      break;
    }
    case "daily":
      if (e.correct && p.dailyDone !== e.day) { p = { ...p, dailyDone: e.day }; gainXp("daily", XP.daily, "daily challenge"); }
      break;
    case "mock-finish": {
      let review = p.review;
      for (const k of e.missedKeys) review = scheduleMiss(review, k, today);
      p = { ...p, review, mocks: [...p.mocks, e.result].slice(-30), stats: { ...p.stats, mocks: p.stats.mocks + 1 } };
      gainXp("mock", XP.mock, "mock exam finished");
      break;
    }
  }

  // Quests: claim anything newly complete.
  for (const q of completable(p.quests)) {
    p = { ...p, quests: { ...p.quests, claimed: [...p.quests.claimed, q.id] } };
    const r = award(p, "quest", q.xp, today, weekId);
    p = r.p;
    toasts.push({ kind: "quest", text: `Quest done: ${q.title(1).replace(/ from Week \d+/, "")} (+${q.xp} XP)` });
  }

  // Badges.
  for (const id of newlyEarned(p, ctx.badges)) {
    p = { ...p, badges: { ...p.badges, [id]: today } };
    const b = badgeById(id)!;
    toasts.push({ kind: "badge", text: `${b.icon} Badge: ${b.title}` });
  }

  const after = levelFor(p.xp);
  if (after.index > levelBefore) toasts.push({ kind: "level", text: `${after.icon} Level up: ${after.name}!` });
  return { progress: p, toasts };
}

export { questsForWeek };
