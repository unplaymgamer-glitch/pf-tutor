// Date helpers in the student's LOCAL time (streaks follow the student's own calendar day).
const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // noon avoids DST edge cases
}

export const addDays = (key: string, n: number): string => {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

/** Whole calendar days from a to b (b - a). */
export const daysBetween = (a: string, b: string): number => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);

/** ISO-8601 week id like "2026-W48" (weeks start on Monday). Used for weekly quests, the weekly freeze and the weekly leaderboard. */
export function isoWeekId(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(week)}`;
}

/** Same week id computed in UTC: the server uses this so every device agrees on the leaderboard week. */
export function isoWeekIdUTC(d: Date): string {
  return isoWeekId(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
