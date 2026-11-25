import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Topic, allSamples } from "@/lib/content-schema";
import { FIELD_HARD_CAP, LEAD_LIMIT, lessonMeta, splitForShowMore, textVolume } from "@/lib/lesson-meta";

const topics: Topic[] = readdirSync("content").flatMap((wk) => readdirSync(join("content", wk)).filter((f) => f.endsWith(".json")).map((f) => Topic.parse(JSON.parse(readFileSync(join("content", wk, f), "utf8")))));

describe("splitForShowMore", () => {
  it("keeps short text whole", () => expect(splitForShowMore("One short sentence.")).toEqual({ lead: "One short sentence.", rest: "" }));
  it("never loses or reorders text, and the lead ends on a sentence boundary", () => {
    for (const t of topics) for (const s of [t.warmup, t.definition, t.howItWorks]) {
      const { lead, rest } = splitForShowMore(s);
      expect((lead + " " + rest).trim()).toBe(s.trim());
      expect(/[.!?'")};]$/.test(lead), `lead of ${t.slug} ends a sentence`).toBe(true);
    }
  });
  it("lead is about three short lines (<= limit) unless the first sentence alone is longer", () => {
    for (const t of topics) for (const s of [t.warmup, t.definition, t.howItWorks]) {
      const { lead } = splitForShowMore(s);
      const firstSentence = s.split(/(?<=[.!?])\s+(?=[A-Z0-9'"(])/)[0];
      expect(lead.length <= LEAD_LIMIT * 1.15 || lead === firstSentence, `${t.slug}: lead ${lead.length}`).toBe(true);
    }
  });
});

describe("text diet lint (V2 lesson standard)", () => {
  it("no single text field is a wall of text (hard cap), so authors must split long explanations", () => {
    for (const t of topics) for (const [k, v] of Object.entries({ goal: t.goal, warmup: t.warmup, definition: t.definition, howItWorks: t.howItWorks })) {
      expect(v.length, `${t.week}/${t.slug} ${k}`).toBeLessThanOrEqual(FIELD_HARD_CAP);
    }
  });
  it("a lesson with a lot of reading text must have an animation or trace (no text-only lessons)", () => {
    for (const t of topics) {
      const visual = t.visuals.some((v) => v.kind !== "trace") || allSamples(t).some((s) => s.trace);
      if (textVolume(t) > 1800) expect(visual, `${t.week}/${t.slug} has ${textVolume(t)} chars of text and no visual`).toBe(true);
    }
  });
  it("lesson time estimates are sensible (10 to 60 minutes) and levels are set", () => {
    for (const t of topics) { const m = lessonMeta(t); expect(m.minutes).toBeGreaterThanOrEqual(10); expect(m.minutes).toBeLessThanOrEqual(60); expect(m.level).toBeTruthy(); }
  });
});
