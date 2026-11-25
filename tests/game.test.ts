import { describe, it, expect } from "vitest";
import { EMPTY_PROGRESS, Progress, sanitizeProgress } from "@/lib/progress";
import { addDays, daysBetween, isoWeekId, dayKey } from "@/lib/game/dates";
import { levelFor, LEVELS } from "@/lib/game/levels";
import { EMPTY_STREAK, streakAlive, touchStreak } from "@/lib/game/streak";
import { applyReview, dueKeys, scheduleMiss, INTERVALS_DAYS } from "@/lib/game/review";
import { questsForWeek, freshQuestState, bump, completable } from "@/lib/game/quests";
import { applyEvent, DAILY_CAPS, GameEvent } from "@/lib/game/engine";
import { BADGES } from "@/lib/game/badges";
import { makeBackupCode, readBackupCode, mergeProgress, crc32 } from "@/lib/game/backup";
import { PoolQuestion, buildMock, pickDaily, hashString } from "@/lib/game/pool";

const at = (iso: string) => new Date(iso); // no "Z": parsed as local time, like a student's device
const ctx = (iso = "2026-12-01T10:00:00", weekTopics: Record<number, string[]> = {}) => ({ now: at(iso), badges: { weekTopics } });
function run(p: Progress, events: GameEvent[], iso = "2026-12-01T10:00:00", wt: Record<number, string[]> = {}) {
  let cur = p;
  const toasts: string[] = [];
  for (const e of events) {
    const r = applyEvent(cur, e, ctx(iso, wt));
    cur = r.progress;
    toasts.push(...r.toasts.map((t) => t.text));
  }
  return { p: cur, toasts };
}

describe("dates", () => {
  it("day math and ISO weeks", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-03-01", "2026-03-29")).toBe(28);
    expect(isoWeekId(new Date(2026, 11, 28))).toBe("2026-W53");
    expect(isoWeekId(new Date(2027, 0, 4))).toBe("2027-W01");
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("levels", () => {
  it("named levels with progress", () => {
    expect(levelFor(0).name).toBe("Beginner");
    expect(levelFor(99).name).toBe("Beginner");
    expect(levelFor(100).name).toBe("Coder");
    expect(levelFor(5000)).toMatchObject({ name: "C++ Champion", pct: 100, toNext: 0, next: null });
    expect(levelFor(200).pct).toBe(50);
    expect(LEVELS.map((l) => l.name)).toEqual(["Beginner", "Coder", "Debugger", "Algorithm Thinker", "Pointer Master", "C++ Champion"]);
  });
});

describe("streaks (gentle)", () => {
  it("counts consecutive days", () => {
    let s = touchStreak(EMPTY_STREAK, "2026-12-01");
    expect(s.event).toBe("first");
    s = touchStreak(s.streak, "2026-12-01");
    expect(s.event).toBe("same-day");
    s = touchStreak(s.streak, "2026-12-02");
    expect(s).toMatchObject({ event: "continued", streak: { count: 2 } });
  });
  it("one free pass per week covers a single missed day; a second miss in the same week restarts kindly", () => {
    const s = touchStreak(touchStreak(EMPTY_STREAK, "2026-12-01").streak, "2026-12-02").streak; // Tue
    const a = touchStreak(s, "2026-12-04"); // missed Wed
    expect(a).toMatchObject({ event: "freeze-used", streak: { count: 3 } });
    const b = touchStreak(a.streak, "2026-12-06"); // missed Fri, same week: no second freeze
    expect(b).toMatchObject({ event: "restarted", streak: { count: 1, best: 3 } });
  });
  it("a long break restarts at 1 and never reduces the best", () => {
    const s = touchStreak({ count: 9, best: 9, lastDay: "2026-12-01", freezeWeek: null }, "2026-12-20");
    expect(s).toMatchObject({ event: "restarted", streak: { count: 1, best: 9 } });
  });
  it("alive check", () => {
    expect(streakAlive({ count: 2, best: 2, lastDay: "2026-12-01", freezeWeek: null }, "2026-12-02")).toBe(true);
    expect(streakAlive({ count: 2, best: 2, lastDay: "2026-12-01", freezeWeek: null }, "2026-12-10")).toBe(false);
    expect(streakAlive(EMPTY_STREAK, "2026-12-01")).toBe(false);
  });
  it("clock going backwards is ignored", () => expect(touchStreak({ count: 3, best: 3, lastDay: "2026-12-05", freezeWeek: null }, "2026-12-01").event).toBe("same-day"));
});

describe("spaced review", () => {
  it("miss -> tomorrow; correct reviews push it out; last box graduates; wrong resets", () => {
    let d = scheduleMiss({}, "w1/a#q1", "2026-12-01");
    expect(d["w1/a#q1"]).toEqual({ box: 0, due: "2026-12-02" });
    expect(dueKeys(d, "2026-12-01")).toEqual([]);
    expect(dueKeys(d, "2026-12-02")).toEqual(["w1/a#q1"]);
    d = applyReview(d, "w1/a#q1", true, "2026-12-02");
    expect(d["w1/a#q1"]).toEqual({ box: 1, due: "2026-12-05" });
    d = applyReview(d, "w1/a#q1", false, "2026-12-05");
    expect(d["w1/a#q1"].box).toBe(0);
    for (let i = 0; i < INTERVALS_DAYS.length; i++) d = applyReview(d, "w1/a#q1", true, "2026-12-10");
    expect(d["w1/a#q1"]).toBeUndefined();
  });
});

describe("quests", () => {
  it("same week -> same quests for everyone; they rotate across weeks", () => {
    expect(questsForWeek("2026-W48").map((q) => q.id)).toEqual(questsForWeek("2026-W48").map((q) => q.id));
    expect(new Set([...Array(8)].map((_, i) => questsForWeek(`2026-W${40 + i}`).map((q) => q.id).join())).size).toBeGreaterThan(2);
    expect(questsForWeek("2026-W48").length).toBeGreaterThanOrEqual(2);
  });
  it("completes when the counter reaches the target", () => {
    let q = freshQuestState("2026-W48");
    const def = questsForWeek("2026-W48")[0];
    for (let i = 0; i < def.target; i++) q = bump(q, def.counter);
    expect(completable(q).map((d) => d.id)).toContain(def.id);
  });
});

describe("engine: XP, caps and anti-farming", () => {
  const ans = (qid: string, correct: boolean, qtype = "mcq"): GameEvent => ({ type: "answer", key: "w1/a", qid, correct, qtype });
  it("first-try correct pays 10, repeating the same question pays nothing more", () => {
    const { p } = run(EMPTY_PROGRESS, [ans("q1", true), ans("q1", true), ans("q1", true)]);
    expect(p.xp).toBe(10);
  });
  it("answer XP is capped per day and the cap resets tomorrow", () => {
    const { p } = run(EMPTY_PROGRESS, Array.from({ length: 40 }, (_, i) => ans(`q${i}`, true)));
    expect(p.xp).toBe(DAILY_CAPS.answer);
    const r = run(p, [ans("fresh", true)], "2026-12-02T10:00:00");
    expect(r.p.xp).toBe(DAILY_CAPS.answer + 10);
  });
  it("running code pays little and is capped", () => {
    const { p } = run(EMPTY_PROGRESS, Array.from({ length: 50 }, () => ({ type: "run" }) as GameEvent));
    expect(p.xp).toBeLessThanOrEqual(DAILY_CAPS.run + 40); // allow for quest rewards
    expect(p.stats.runs).toBe(50);
  });
  it("wrong answers earn no XP and enter the review deck for tomorrow", () => {
    const { p } = run(EMPTY_PROGRESS, [ans("q9", false)]);
    expect(p.xp).toBe(0);
    expect(p.review["w1/a#q9"]).toEqual({ box: 0, due: "2026-12-02" });
  });
  it("fixing 5 bugs first try earns Bug hunter", () => {
    const { p, toasts } = run(EMPTY_PROGRESS, [1, 2, 3, 4, 5].map((i) => ans(`b${i}`, true, "bug")));
    expect(p.stats.bugsFixed).toBe(5);
    expect(p.badges["bug-hunter"]).toBeTruthy();
    expect(toasts.join(" ")).toContain("Bug hunter");
  });
  it("topic completion: one-time XP, perfect-quiz bonus once, improvement message", () => {
    // Quests are pre-claimed so their reward XP does not blur the numbers asserted here.
    const noQuests = { ...EMPTY_PROGRESS, quests: { weekId: "2026-W49", counters: { lessons: 0, quiz80: 0, runs: 0, bugs: 0, reviews: 0 }, claimed: questsForWeek("2026-W49").map((q) => q.id) } };
    const first = run(noQuests, [{ type: "topic-complete", key: "w1/a", right: 3, total: 4 }]);
    expect(first.p.xp).toBe(20);
    const second = run(first.p, [{ type: "topic-complete", key: "w1/a", right: 4, total: 4 }]);
    expect(second.p.xp).toBe(20 + 10);
    expect(second.toasts.join(" ")).toMatch(/Improved by 25%/);
    const third = run(second.p, [{ type: "topic-complete", key: "w1/a", right: 4, total: 4 }]);
    expect(third.p.xp).toBe(second.p.xp);
  });
  it("welcome back after a break; weekly XP is tracked per ISO week", () => {
    let r = run(EMPTY_PROGRESS, [{ type: "run" }], "2026-12-01T10:00:00");
    r = run(r.p, [{ type: "run" }], "2026-12-20T10:00:00");
    expect(r.toasts.join(" ")).toContain("Welcome back");
    expect(r.p.xpWeek.weekId).toBe("2026-W51");
  });
  it("badges: first steps, night owl, early bird, chapter complete", () => {
    const night = run(EMPTY_PROGRESS, [{ type: "visit", key: "w1/a", week: 1, slug: "a", title: "A" }], "2026-12-01T01:30:00");
    expect(night.p.badges["first-steps"]).toBeTruthy();
    expect(night.p.badges["night-owl"]).toBeTruthy();
    expect(night.p.badges["early-bird"]).toBeUndefined();
    expect(run(EMPTY_PROGRESS, [{ type: "run" }], "2026-12-01T05:30:00").p.badges["early-bird"]).toBeTruthy();
    const wt = { 1: ["w1/a", "w1/b"] };
    let c = run(EMPTY_PROGRESS, [{ type: "topic-complete", key: "w1/a", right: 3, total: 3 }], "2026-12-01T10:00:00", wt);
    expect(c.p.badges["chapter-1"]).toBeUndefined();
    c = run(c.p, [{ type: "topic-complete", key: "w1/b", right: 2, total: 3 }], "2026-12-01T10:00:00", wt);
    expect(c.p.badges["chapter-1"]).toBeTruthy();
  });
  it("level-up toast", () => {
    const r = run({ ...EMPTY_PROGRESS, xp: 95 }, [{ type: "topic-complete", key: "w1/a", right: 1, total: 1 }]);
    expect(r.toasts.join(" ")).toContain("Level up: Coder");
  });
  it("daily challenge pays once per day", () => {
    let r = run(EMPTY_PROGRESS, [{ type: "daily", correct: true, day: "2026-12-01" }]);
    expect(r.p.xp).toBe(30);
    r = run(r.p, [{ type: "daily", correct: true, day: "2026-12-01" }]);
    expect(r.p.xp).toBe(30);
    r = run(r.p, [{ type: "daily", correct: false, day: "2026-12-02" }], "2026-12-02T10:00:00");
    expect(r.p.xp).toBe(30);
  });
  it("review: correct pushes the card on and pays a little; wrong pays nothing", () => {
    const seeded = { ...EMPTY_PROGRESS, review: { "w1/a#q1": { box: 0, due: "2026-12-01" } } };
    const ok = run(seeded, [{ type: "review", itemKey: "w1/a#q1", correct: true }]);
    expect(ok.p.xp).toBe(4);
    expect(ok.p.review["w1/a#q1"].box).toBe(1);
    expect(run(seeded, [{ type: "review", itemKey: "w1/a#q1", correct: false }]).p.xp).toBe(0);
  });
  it("every badge id is unique and has copy", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const b of BADGES) {
      expect(b.title.length).toBeGreaterThan(2);
      expect(b.desc.length).toBeGreaterThan(5);
    }
  });
  it("engine output survives sanitize unchanged for core fields", () => {
    const r = run(EMPTY_PROGRESS, [{ type: "visit", key: "w1/a", week: 1, slug: "a", title: "A" }, { type: "run" }, { type: "answer", key: "w1/a", qid: "q1", correct: false, qtype: "mcq" }]);
    const s = sanitizeProgress(JSON.parse(JSON.stringify(r.p)));
    expect(s.xp).toBe(r.p.xp);
    expect(s.streak).toEqual(r.p.streak);
    expect(s.review).toEqual(r.p.review);
    expect(s.badges).toEqual(r.p.badges);
  });
});

describe("backup code", () => {
  it("round-trips progress", async () => {
    const { p } = run(EMPTY_PROGRESS, [{ type: "visit", key: "w1/a", week: 1, slug: "a", title: "Ünïcode ✓" }, { type: "topic-complete", key: "w1/a", right: 3, total: 3 }]);
    const code = await makeBackupCode(p);
    expect(code.startsWith("CC111-")).toBe(true);
    const back = await readBackupCode(code);
    expect(back.ok && back.progress.xp).toBe(p.xp);
    expect(back.ok && back.progress.badges).toEqual(p.badges);
  });
  it("rejects damaged, foreign and oversized codes without throwing", async () => {
    const code = await makeBackupCode(EMPTY_PROGRESS);
    const flipped = code.slice(0, 12) + (code[12] === "A" ? "B" : "A") + code.slice(13);
    expect((await readBackupCode(flipped)).ok).toBe(false);
    expect((await readBackupCode("hello")).ok).toBe(false);
    expect((await readBackupCode("CC111-")).ok).toBe(false);
    expect((await readBackupCode("CC111-" + "A".repeat(300_000))).ok).toBe(false);
    expect((await readBackupCode("")).ok).toBe(false);
  });
  it("a forged code with absurd values is repaired, not trusted", async () => {
    const raw = new TextEncoder().encode(JSON.stringify({ v: 2, p: { xp: 1e15, streak: { count: -5 }, badges: { x: "bad" } } }));
    const code = `CC111-r${btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.${crc32(raw)}`;
    const r = await readBackupCode(code);
    expect(r.ok && r.progress.xp).toBeLessThanOrEqual(10_000_000);
    expect(r.ok && r.progress.streak.count).toBe(0);
  });
  it("merge keeps the best of both devices", () => {
    const a = { ...EMPTY_PROGRESS, xp: 50, topics: { t: { done: false, quizBest: 1, quizTotal: 4 } }, badges: { x: "2026-01-01" } };
    const b = { ...EMPTY_PROGRESS, xp: 120, topics: { t: { done: true, quizBest: 4, quizTotal: 4 }, u: { visited: true } }, badges: { y: "2026-01-02" } };
    const m = mergeProgress(a, b);
    expect(m.xp).toBe(120);
    expect(m.topics.t).toMatchObject({ done: true, quizBest: 4 });
    expect(m.topics.u.visited).toBe(true);
    expect(Object.keys(m.badges).sort()).toEqual(["x", "y"]);
  });
});

describe("question pool: daily challenge and mock exams", () => {
  const mk = (week: number, topic: string, n: number): PoolQuestion[] =>
    Array.from({ length: n }, (_, i) => ({ key: `w${week}/${topic}#q${i}`, topicKey: `w${week}/${topic}`, week, topicTitle: topic, type: "mcq" as const, difficulty: "easy" as const, prompt: "?", options: ["a", "b"], answer: "a", hint: "", explanation: "" }));
  const pool = [...mk(1, "t1", 6), ...mk(2, "t2", 6), ...mk(9, "t9", 6)];
  it("daily question is the same all day and changes by day", () => {
    expect(pickDaily(pool, "2026-12-01")?.key).toBe(pickDaily(pool, "2026-12-01")?.key);
    expect(new Set([...Array(10)].map((_, i) => pickDaily(pool, `2026-12-${10 + i}`)?.key)).size).toBeGreaterThan(1);
    expect(pickDaily([], "2026-12-01")).toBeNull();
  });
  it("mid exam only uses weeks 1-8, is balanced, reproducible, and has no duplicates", () => {
    const m = buildMock(pool, "mid", "s1", 8);
    expect(m.length).toBe(8);
    expect(m.every((q) => q.week <= 8)).toBe(true);
    expect(new Set(m.map((q) => q.key)).size).toBe(8);
    expect(m.filter((q) => q.topicKey === "w1/t1").length).toBe(4);
    expect(buildMock(pool, "mid", "s1", 8).map((q) => q.key)).toEqual(m.map((q) => q.key));
    expect(buildMock(pool, "mid", "s2", 8).map((q) => q.key)).not.toEqual(m.map((q) => q.key));
  });
  it("final exam can include later weeks; asks for fewer when the pool is small", () => {
    expect(buildMock(pool, "final", "x", 18).some((q) => q.week === 9)).toBe(true);
    expect(buildMock(pool, "mid", "x", 50).length).toBe(12);
  });
  it("only gradable (multiple-choice) questions are used", () => {
    const mixed = [...pool, { ...pool[0], key: "w1/t1#w", type: "write" as const }, { ...pool[0], key: "w1/t1#n", options: undefined }];
    expect(buildMock(mixed, "mid", "s", 50).every((q) => q.type === "mcq" && q.options)).toBe(true);
  });
  it("hash is stable", () => expect(hashString("abc")).toBe(hashString("abc")));
});
