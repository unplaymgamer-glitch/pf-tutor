// Student progress: stored only on the device (localStorage). No accounts. Backed up with a "backup code" (lib/game/backup.ts).
import { EMPTY_STREAK, Streak } from "./game/streak";
import { EMPTY_COUNTERS, QuestState } from "./game/quests";
import type { ReviewDeck } from "./game/review";

export type TopicProgress = {
  visited?: boolean; done?: boolean;
  quizBest?: number; quizTotal?: number;          // best number of correct answers and the quiz size at that time
  quizLastPct?: number; quizPrevPct?: number;      // last and previous attempt in %, for "improved by X%"
  answered?: Record<string, "right" | "wrong">;
};
export type Stats = { runs: number; bugsFixed: number; perfectQuizzes: number; reviews: number; mocks: number; night: boolean; early: boolean; correctFirstTry: number };
export type MockResult = { id: string; mode: "mid" | "final"; date: string; right: number; total: number; seconds: number; byTopic: Record<string, { right: number; total: number }> };
export type Profile = { nickname: string; avatar: string; leaderboard: boolean; deviceId: string };

export type Progress = {
  xp: number;
  last?: { week: number; slug: string; title: string };
  topics: Record<string, TopicProgress>;
  view?: "visualize" | "code" | "algorithm" | "all";
  streak: Streak;
  badges: Record<string, string>;                  // badge id -> date earned (YYYY-MM-DD)
  stats: Stats;
  review: ReviewDeck;
  quests: QuestState;
  mocks: MockResult[];
  profile: Profile;
  dailyDone: string | null;                        // day the daily challenge was completed
  xpToday: { day: string; byKind: Record<string, number> };
  xpWeek: { weekId: string; xp: number };          // XP earned this ISO week (leaderboard)
};

export const PROGRESS_KEY = "cc111.progress.v1";
export const EMPTY_STATS: Stats = { runs: 0, bugsFixed: 0, perfectQuizzes: 0, reviews: 0, mocks: 0, night: false, early: false, correctFirstTry: 0 };
export const EMPTY_PROGRESS: Progress = {
  xp: 0, topics: {}, streak: EMPTY_STREAK, badges: {}, stats: EMPTY_STATS, review: {},
  quests: { weekId: "", counters: EMPTY_COUNTERS, claimed: [] }, mocks: [],
  profile: { nickname: "", avatar: "🙂", leaderboard: false, deviceId: "" }, dailyDone: null, xpToday: { day: "", byKind: {} }, xpWeek: { weekId: "", xp: 0 },
};

const num = (v: unknown, d = 0, max = 1e9) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : d);
const str = (v: unknown, d = "", max = 200) => (typeof v === "string" ? v.slice(0, max) : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: unknown): string | null => (typeof v === "string" && DAY.test(v) ? v : null);

/** Parse and repair anything (old versions, backup codes, hand-edited storage). Never throws. */
export function sanitizeProgress(raw: unknown): Progress {
  const o = obj(raw);
  const topics: Record<string, TopicProgress> = {};
  for (const [k, v] of Object.entries(obj(o.topics)).slice(0, 400)) {
    const t = obj(v);
    const answered: Record<string, "right" | "wrong"> = {};
    for (const [q, r] of Object.entries(obj(t.answered)).slice(0, 100)) if (r === "right" || r === "wrong") answered[q.slice(0, 40)] = r;
    topics[k.slice(0, 80)] = {
      visited: t.visited === true, done: t.done === true,
      quizBest: typeof t.quizBest === "number" ? num(t.quizBest) : undefined, quizTotal: typeof t.quizTotal === "number" ? num(t.quizTotal) : undefined,
      quizLastPct: typeof t.quizLastPct === "number" ? num(t.quizLastPct, 0, 100) : undefined, quizPrevPct: typeof t.quizPrevPct === "number" ? num(t.quizPrevPct, 0, 100) : undefined,
      answered,
    };
  }
  const view = ["visualize", "code", "algorithm", "all"].includes(o.view as string) ? (o.view as Progress["view"]) : undefined;
  const lastO = obj(o.last);
  const last = typeof lastO.week === "number" && typeof lastO.slug === "string" ? { week: num(lastO.week, 1, 16), slug: str(lastO.slug, "", 80), title: str(lastO.title, "", 120) } : undefined;
  const s = obj(o.streak);
  const st = obj(o.stats);
  const badges: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(o.badges)).slice(0, 100)) if (day(v)) badges[k.slice(0, 40)] = v as string;
  const review: ReviewDeck = {};
  for (const [k, v] of Object.entries(obj(o.review)).slice(0, 500)) { const r = obj(v); if (day(r.due)) review[k.slice(0, 100)] = { box: num(r.box, 0, 4), due: r.due as string }; }
  const q = obj(o.quests), qc = obj(q.counters);
  const mocks = (Array.isArray(o.mocks) ? o.mocks : []).slice(-30).map((m) => {
    const x = obj(m); const byTopic: MockResult["byTopic"] = {};
    for (const [k, v] of Object.entries(obj(x.byTopic)).slice(0, 100)) byTopic[k.slice(0, 80)] = { right: num(obj(v).right, 0, 1000), total: num(obj(v).total, 0, 1000) };
    return { id: str(x.id, "", 40), mode: x.mode === "final" ? "final" : "mid", date: str(x.date, "", 10), right: num(x.right, 0, 1000), total: num(x.total, 0, 1000), seconds: num(x.seconds, 0, 100000), byTopic } as MockResult;
  });
  const p = obj(o.profile);
  const xt = obj(o.xpToday), xw = obj(o.xpWeek);
  const byKind: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(xt.byKind)).slice(0, 20)) byKind[k.slice(0, 20)] = num(v, 0, 100000);
  return {
    xp: num(o.xp, 0, 10_000_000), last, topics, view,
    streak: { count: num(s.count, 0, 5000), best: num(s.best, 0, 5000), lastDay: day(s.lastDay), freezeWeek: typeof s.freezeWeek === "string" ? s.freezeWeek.slice(0, 10) : null },
    badges,
    stats: { runs: num(st.runs), bugsFixed: num(st.bugsFixed), perfectQuizzes: num(st.perfectQuizzes), reviews: num(st.reviews), mocks: num(st.mocks), night: st.night === true, early: st.early === true, correctFirstTry: num(st.correctFirstTry) },
    review,
    quests: { weekId: str(q.weekId, "", 10), counters: { lessons: num(qc.lessons), quiz80: num(qc.quiz80), runs: num(qc.runs), bugs: num(qc.bugs), reviews: num(qc.reviews) }, claimed: (Array.isArray(q.claimed) ? q.claimed : []).filter((x): x is string => typeof x === "string").slice(0, 10).map((x) => x.slice(0, 20)) },
    mocks,
    profile: { nickname: str(p.nickname, "", 16), avatar: str(p.avatar, "🙂", 8), leaderboard: p.leaderboard === true, deviceId: /^[a-f0-9]{32}$/.test(str(p.deviceId)) ? str(p.deviceId) : "" },
    dailyDone: day(o.dailyDone),
    xpToday: { day: day(xt.day) ?? "", byKind },
    xpWeek: { weekId: str(xw.weekId, "", 10), xp: num(xw.xp, 0, 1_000_000) },
  };
}

/** Base XP values. Repeats and farming pay little; see lib/game/engine.ts for daily caps. */
export const XP = { firstTry: 10, repeat: 2, topicDone: 20, run: 3, review: 4, daily: 30, perfectQuiz: 10, quest: 0, mock: 50 } as const;

export function answerQuestion(p: Progress, key: string, qid: string, correct: boolean): Progress {
  const t = { ...(p.topics[key] ?? {}) };
  const answered = { ...(t.answered ?? {}) };
  const prev = answered[qid];
  let gain = 0;
  if (correct) gain = prev === undefined ? XP.firstTry : prev === "wrong" ? XP.repeat : 0;
  if (prev !== "right") answered[qid] = correct ? "right" : "wrong";
  return { ...p, xp: p.xp + gain, topics: { ...p.topics, [key]: { ...t, answered } } };
}

export function completeTopic(p: Progress, key: string, quizScore?: { right: number; total: number }): Progress {
  const t = { ...(p.topics[key] ?? {}) };
  const gain = t.done ? 0 : XP.topicDone;
  const best = quizScore ? Math.max(t.quizBest ?? 0, quizScore.right) : t.quizBest;
  const pct = quizScore ? Math.round((quizScore.right / quizScore.total) * 100) : undefined;
  return {
    ...p, xp: p.xp + gain,
    topics: { ...p.topics, [key]: { ...t, done: true, quizBest: best, quizTotal: quizScore?.total ?? t.quizTotal, quizPrevPct: pct !== undefined ? t.quizLastPct : t.quizPrevPct, quizLastPct: pct ?? t.quizLastPct } },
  };
}

/** Mastery stars from quiz accuracy: >=90% 3, >=70% 2, >=50% 1. Uses the best attempt. */
export function stars(t?: TopicProgress): 0 | 1 | 2 | 3 {
  if (!t?.quizTotal || t.quizBest === undefined) return 0;
  const a = t.quizBest / t.quizTotal;
  return a >= 0.9 ? 3 : a >= 0.7 ? 2 : a >= 0.5 ? 1 : 0;
}
