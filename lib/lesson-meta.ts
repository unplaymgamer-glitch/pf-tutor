import type { Topic } from "./content-schema";

// Helpers for the V2 lesson page. Pure functions (unit-tested in tests/lesson-meta.test.ts).

/** Reading limit for one paragraph in the default view (about three short lines). Longer text goes behind "Show more". */
export const LEAD_LIMIT = 230;
/** Authoring cap for any single text field: beyond this the lint test asks the author to split the lesson text. */
export const FIELD_HARD_CAP = 2300;

/** Split a paragraph into a short lead (whole sentences, about LEAD_LIMIT characters) and the rest. lead + " " + rest is the original text. */
export function splitForShowMore(text: string, limit = LEAD_LIMIT): { lead: string; rest: string } {
  const clean = text.trim();
  if (clean.length <= limit * 1.15) return { lead: clean, rest: "" };
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9'"(])/);
  let lead = sentences[0];
  let i = 1;
  while (i < sentences.length && (lead + " " + sentences[i]).length <= limit) lead += " " + sentences[i++];
  return { lead, rest: sentences.slice(i).join(" ") };
}

const words = (s: string) => (s.match(/\S+/g) ?? []).length;

export type LessonMeta = { minutes: number; level: "Beginner" | "Core" | "Challenging" | "Applied" };

/** Honest estimates, not measurements: reading at 200 words per minute, 3 minutes per worked example, 40 seconds per question. */
export function lessonMeta(t: Topic): LessonMeta {
  const text = [t.goal, t.warmup, t.definition, t.howItWorks, ...t.worked.map((w) => w.problem + " " + w.pseudocode.join(" "))].join(" ");
  const raw = words(text) / 200 + 3 * t.worked.length + (t.practice.length + t.quiz.length) * (2 / 3);
  const minutes = Math.max(10, Math.ceil(raw / 5) * 5);
  const level = t.week <= 3 ? "Beginner" : t.week <= 8 ? "Core" : t.week <= 13 ? "Challenging" : "Applied";
  return { minutes, level };
}

/** The first few classic mistakes, shown as an at-a-glance card. */
export const mistakesAtAGlance = (t: Topic, n = 3) => t.mistakes.slice(0, n).map((m) => ({ wrong: m.wrong, right: m.right }));

/** Characters of reading text in a lesson (for the "too much text, no visuals" lint). */
export function textVolume(t: Topic): number {
  return [t.goal, t.warmup, t.definition, t.howItWorks, ...t.examTips, ...t.romanSummary].join(" ").length;
}
