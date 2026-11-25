import type { Progress } from "../progress";
import { levelFor } from "./levels";

// Badges are the main reward (points and badges are what research found most motivating; see docs/DECISIONS.md).
export type BadgeCtx = { weekTopics: Record<number, string[]> }; // topic keys per week that exist and are unlocked
export type BadgeDef = { id: string; title: string; desc: string; icon: string; test: (p: Progress, c: BadgeCtx) => boolean };

const done = (p: Progress, k: string) => p.topics[k]?.done === true;
const bestMock = (p: Progress) => p.mocks.reduce((m, x) => Math.max(m, x.total ? x.right / x.total : 0), 0);

export const BADGES: BadgeDef[] = [
  { id: "first-steps", title: "First steps", desc: "Open your first lesson", icon: "👣", test: (p) => Object.values(p.topics).some((t) => t.visited) },
  { id: "first-run", title: "It runs!", desc: "Run your first program", icon: "▶️", test: (p) => p.stats.runs >= 1 },
  { id: "first-lesson", title: "Lesson done", desc: "Finish your first lesson quiz", icon: "✅", test: (p) => Object.values(p.topics).some((t) => t.done) },
  { id: "perfect-quiz", title: "Perfect quiz", desc: "Get every answer right in a mini-quiz", icon: "💯", test: (p) => p.stats.perfectQuizzes >= 1 },
  { id: "perfectionist", title: "Perfectionist", desc: "5 perfect quizzes", icon: "🌟", test: (p) => p.stats.perfectQuizzes >= 5 },
  { id: "bug-hunter", title: "Bug hunter", desc: "Fix 5 bugs on the first try", icon: "🐞", test: (p) => p.stats.bugsFixed >= 5 },
  { id: "streak-3", title: "3-day streak", desc: "Learn 3 days in a row", icon: "🔥", test: (p) => p.streak.best >= 3 },
  { id: "streak-7", title: "Week streak", desc: "Learn 7 days in a row", icon: "🔥", test: (p) => p.streak.best >= 7 },
  { id: "streak-30", title: "30-day streak", desc: "Learn 30 days in a row", icon: "🏅", test: (p) => p.streak.best >= 30 },
  { id: "xp-100", title: "Coder level", desc: "Reach 100 XP", icon: "⌨️", test: (p) => p.xp >= 100 },
  { id: "xp-500", title: "Debugger level", desc: "Reach 300 XP", icon: "🛠️", test: (p) => levelFor(p.xp).index >= 2 },
  { id: "xp-1400", title: "Pointer Master level", desc: "Reach 1400 XP", icon: "🎯", test: (p) => levelFor(p.xp).index >= 4 },
  { id: "night-owl", title: "Night owl", desc: "Study after midnight", icon: "🦉", test: (p) => p.stats.night },
  { id: "early-bird", title: "Early bird", desc: "Study before 7 am", icon: "🐦", test: (p) => p.stats.early },
  { id: "reviewer", title: "Memory keeper", desc: "Review 10 cards", icon: "🧠", test: (p) => p.stats.reviews >= 10 },
  { id: "mock-taker", title: "Exam practice", desc: "Finish a mock exam", icon: "📝", test: (p) => p.stats.mocks >= 1 },
  { id: "mock-ace", title: "Mock ace", desc: "Score 80% or more in a mock exam", icon: "🎓", test: (p) => bestMock(p) >= 0.8 },
  { id: "sort-master", title: "Sort master", desc: "Finish the Bubble Sort and Selection Sort lessons", icon: "📊", test: (p) => done(p, "w5/bubble-sort") && done(p, "w5/selection-sort") },
  ...Array.from({ length: 16 }, (_, i): BadgeDef => ({
    id: `chapter-${i + 1}`, title: `Chapter ${i + 1} complete`, desc: `Finish every lesson of Week ${i + 1}`, icon: "📘",
    test: (p, c) => { const keys = c.weekTopics[i + 1] ?? []; return keys.length > 0 && keys.every((k) => done(p, k)); },
  })),
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);

/** Ids of badges whose condition is now true but that are not yet in the shelf. */
export function newlyEarned(p: Progress, ctx: BadgeCtx): string[] {
  return BADGES.filter((b) => !p.badges[b.id] && b.test(p, ctx)).map((b) => b.id);
}
