import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Topic } from "@/lib/content-schema";
import { CHAPTERS, FINAL_LAST_WEEK, MID_LAST_WEEK } from "@/lib/course";
import { buildMock, gradable, type PoolQuestion } from "@/lib/game/pool";
import { defaultState, topicAccess } from "@/lib/gate-logic";

// What the Mid-term / Final hubs and mock exams CLAIM must be what they CONTAIN. Everything is open by default.
const topics: Topic[] = readdirSync("content").flatMap((wk) => readdirSync(join("content", wk)).filter((f) => f.endsWith(".json")).map((f) => Topic.parse(JSON.parse(readFileSync(join("content", wk, f), "utf8")))));
const pool: PoolQuestion[] = topics.flatMap((t) => [...t.quiz, ...t.practice].map((q) => ({ key: `w${t.week}/${t.slug}#${q.id}`, topicKey: `w${t.week}/${t.slug}`, week: t.week, topicTitle: t.title, type: q.type, difficulty: q.difficulty, prompt: q.prompt, options: q.options, answer: q.answer, hint: q.hint, explanation: q.explanation })));

describe("claims match content", () => {
  it("the course has all 16 chapters, each with at least one lesson", () => {
    expect(CHAPTERS).toHaveLength(16);
    for (let w = 1; w <= 16; w++) expect(topics.filter((t) => t.week === w).length, `week ${w} lessons`).toBeGreaterThan(0);
  });
  it("every week is open to students by default (nothing locked)", () => {
    const s = defaultState();
    for (const t of topics) expect(topicAccess(s, t.week, t.slug, new Date()).allowed, `${t.week}/${t.slug}`).toBe(true);
  });
  it("hub ranges: Mid = weeks 1..8 and Final = weeks 1..16, every claimed week has lessons and auto-gradable questions", () => {
    expect(MID_LAST_WEEK).toBe(8);
    expect(FINAL_LAST_WEEK).toBe(16);
    for (let w = 1; w <= FINAL_LAST_WEEK; w++) expect(pool.filter((q) => q.week === w && gradable(q)).length, `week ${w} gradable questions`).toBeGreaterThanOrEqual(5);
  });
  it("mock exams draw only from their claimed weeks, and the final mock reaches the whole course", () => {
    for (const seed of ["a", "b", "c"]) {
      const mid = buildMock(pool, "mid", seed, 20);
      expect(mid.length).toBe(20);
      expect(Math.max(...mid.map((q) => q.week))).toBeLessThanOrEqual(MID_LAST_WEEK);
    }
    const weeksSeen = new Set<number>();
    for (const seed of ["a", "b", "c", "d", "e", "f"]) for (const q of buildMock(pool, "final", seed, 30)) weeksSeen.add(q.week);
    for (let w = 1; w <= FINAL_LAST_WEEK; w++) expect(weeksSeen.has(w), `final mock includes week ${w}`).toBe(true);
  });
  it("every lesson meets the standard format (3 worked examples, practice, quiz, Roman Urdu summary)", () => {
    for (const t of topics) {
      const id = `${t.week}/${t.slug}`;
      expect(t.worked.length, `${id} worked`).toBe(3);
      expect(t.practice.length, `${id} practice`).toBeGreaterThanOrEqual(6);
      expect(t.quiz.length, `${id} quiz`).toBeGreaterThanOrEqual(3);
      expect(t.romanSummary.length, `${id} roman`).toBeGreaterThan(0);
    }
  });
});
