import { FINAL_LAST_WEEK, MID_LAST_WEEK } from "../course";
// Question pool for daily challenge, spaced review and mock exams. Built on the server from UNLOCKED lessons only.
export type PoolQuestion = {
  key: string;            // "w2/if-statement#q3" = topic key + question id
  topicKey: string;       // "w2/if-statement"
  week: number;
  topicTitle: string;
  type: "mcq" | "output" | "bug" | "blank" | "write";
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  options?: string[];
  answer: string;
  hint: string;
  explanation: string;
};

/** Small deterministic hash -> number (for "the same question for everyone today" and reproducible mock exams). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Auto-gradable questions only (multiple choice). */
export const gradable = (q: PoolQuestion) => q.type === "mcq" && !!q.options?.length && !!q.answer;

export function pickDaily(pool: PoolQuestion[], day: string): PoolQuestion | null {
  const g = pool.filter(gradable).sort((a, b) => a.key.localeCompare(b.key));
  return g.length ? g[hashString(`daily-${day}`) % g.length] : null;
}

/** Mock exam: topic-balanced random sample. Same seed = same exam (so a result can be reviewed). */
export function buildMock(pool: PoolQuestion[], mode: "mid" | "final", seed: string, count = 20): PoolQuestion[] {
  const maxWeek = mode === "mid" ? MID_LAST_WEEK : FINAL_LAST_WEEK;
  const g = pool.filter((q) => gradable(q) && q.week <= maxWeek).sort((a, b) => a.key.localeCompare(b.key));
  const rnd = seededRandom(hashString(`${mode}-${seed}`));
  const byTopic = new Map<string, PoolQuestion[]>();
  for (const q of g) byTopic.set(q.topicKey, [...(byTopic.get(q.topicKey) ?? []), q]);
  for (const list of byTopic.values()) list.sort(() => rnd() - 0.5);
  const out: PoolQuestion[] = [];
  // Round-robin across topics so no single lesson dominates.
  const lists = [...byTopic.values()].sort(() => rnd() - 0.5);
  while (out.length < count && lists.some((l) => l.length)) for (const l of lists) { const q = l.pop(); if (q && out.length < count) out.push(q); }
  return out.sort(() => rnd() - 0.5);
}

export const MOCK_MINUTES = { mid: 30, final: 60 } as const;
