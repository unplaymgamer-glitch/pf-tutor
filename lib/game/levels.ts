// Levels named after learning milestones. Thresholds grow so early levels arrive quickly (motivation) and later ones feel earned.
export const LEVELS = [
  { name: "Beginner", min: 0, icon: "🌱" },
  { name: "Coder", min: 100, icon: "⌨️" },
  { name: "Debugger", min: 300, icon: "🐞" },
  { name: "Algorithm Thinker", min: 700, icon: "🧠" },
  { name: "Pointer Master", min: 1400, icon: "🎯" },
  { name: "C++ Champion", min: 2500, icon: "🏆" },
] as const;

export type LevelInfo = { index: number; name: string; icon: string; xp: number; floor: number; next: number | null; pct: number; toNext: number };

export function levelFor(xp: number): LevelInfo {
  const x = Math.max(0, Math.floor(xp));
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (x >= LEVELS[k].min) i = k;
  const cur = LEVELS[i];
  const nxt = LEVELS[i + 1];
  const pct = nxt ? Math.min(100, Math.round(((x - cur.min) / (nxt.min - cur.min)) * 100)) : 100;
  return { index: i, name: cur.name, icon: cur.icon, xp: x, floor: cur.min, next: nxt ? nxt.min : null, pct, toNext: nxt ? nxt.min - x : 0 };
}
