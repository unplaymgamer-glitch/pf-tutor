import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fleschEase } from "@/lib/readability";

// The first lessons are the ones a nervous beginner meets: keep them easy to read (Flesch >= 60) with no sentence over 32 words.
describe("readability of the opening text, Weeks 1 to 4", () => {
  const rows = readdirSync("content").filter((d) => Number(d.slice(5)) <= 4).flatMap((d) => readdirSync(join("content", d)).filter((f) => f.endsWith(".json")).map((f) => {
    const t = JSON.parse(readFileSync(join("content", d, f), "utf8"));
    return { f: `${d}/${f}`, ...fleschEase([t.goal, t.warmup, t.definition, t.howItWorks].join("\n")) };
  }));
  it("every lesson scores at least 60", () => expect(rows.filter((r) => r.score < 60).map((r) => `${r.f} ${r.score.toFixed(0)}`)).toEqual([]));
  it("no sentence is longer than 32 words", () => expect(rows.filter((r) => r.longest > 32).map((r) => `${r.f} ${r.longest}`)).toEqual([]));
  it("the average is at least 70", () => expect(rows.reduce((n, r) => n + r.score, 0) / rows.length).toBeGreaterThanOrEqual(70));
});
