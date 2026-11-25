// Weekly rotating quests tied to the current chapter, so the game stays fresh after the novelty period.
// Counters are stored per ISO week; progress resets automatically when the week id changes.
export type QuestCounters = { lessons: number; quiz80: number; runs: number; bugs: number; reviews: number };
export type QuestState = { weekId: string; counters: QuestCounters; claimed: string[] };
export const EMPTY_COUNTERS: QuestCounters = { lessons: 0, quiz80: 0, runs: 0, bugs: 0, reviews: 0 };

export type QuestDef = { id: string; title: (chapter: number) => string; counter: keyof QuestCounters; target: number; xp: number };

const POOL: QuestDef[] = [
  { id: "lessons2", title: (c) => `Finish 2 lessons from Week ${c}`, counter: "lessons", target: 2, xp: 30 },
  { id: "quiz80", title: () => "Score 80% or more on a mini-quiz", counter: "quiz80", target: 1, xp: 25 },
  { id: "runs3", title: () => "Run 3 programs in the Playground", counter: "runs", target: 3, xp: 20 },
  { id: "bugs2", title: () => "Fix 2 bugs (Fix-the-bug questions)", counter: "bugs", target: 2, xp: 25 },
  { id: "reviews5", title: () => "Review 5 cards in the Review deck", counter: "reviews", target: 5, xp: 25 },
  { id: "lessons3", title: (c) => `Finish 3 lessons from Week ${c}`, counter: "lessons", target: 3, xp: 40 },
];

/** Deterministic: the same week gives every student the same three quests; they rotate with the week number. */
export function questsForWeek(weekId: string): QuestDef[] {
  const n = Number(weekId.split("-W")[1] ?? 0) + Number(weekId.slice(0, 4)) * 53;
  const picks = [POOL[n % POOL.length], POOL[(n + 2) % POOL.length], POOL[(n + 4) % POOL.length]];
  return [...new Map(picks.map((q) => [q.id, q])).values()];
}

export const freshQuestState = (weekId: string): QuestState => ({ weekId, counters: { ...EMPTY_COUNTERS }, claimed: [] });
export const ensureWeek = (q: QuestState | undefined, weekId: string): QuestState => (q && q.weekId === weekId ? q : freshQuestState(weekId));

export function bump(q: QuestState, counter: keyof QuestCounters, by = 1): QuestState {
  return { ...q, counters: { ...q.counters, [counter]: q.counters[counter] + by } };
}

/** Quests newly completed by the current counters (not yet claimed). */
export function completable(q: QuestState): QuestDef[] {
  return questsForWeek(q.weekId).filter((d) => !q.claimed.includes(d.id) && q.counters[d.counter] >= d.target);
}
