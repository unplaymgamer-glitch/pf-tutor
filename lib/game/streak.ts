import { addDays, daysBetween, isoWeekId, parseDay } from "./dates";

// Gentle streaks: one automatic "streak freeze" per ISO week covers a single missed day. A longer break simply restarts
// at 1 with a friendly message; there is no guilt and no penalty beyond the number.
export type Streak = { count: number; best: number; lastDay: string | null; freezeWeek: string | null };
export const EMPTY_STREAK: Streak = { count: 0, best: 0, lastDay: null, freezeWeek: null };
export type StreakEvent = "first" | "same-day" | "continued" | "freeze-used" | "restarted";

export function touchStreak(s: Streak, today: string): { streak: Streak; event: StreakEvent } {
  if (s.lastDay === today) return { streak: s, event: "same-day" };
  if (!s.lastDay) return { streak: { count: 1, best: Math.max(1, s.best), lastDay: today, freezeWeek: s.freezeWeek }, event: "first" };
  const gap = daysBetween(s.lastDay, today);
  if (gap < 0) return { streak: s, event: "same-day" }; // clock went backwards: ignore
  if (gap === 1) {
    const count = s.count + 1;
    return { streak: { ...s, count, best: Math.max(s.best, count), lastDay: today }, event: "continued" };
  }
  if (gap === 2) {
    // Exactly one missed day: use this week's freeze if it is still available.
    const week = isoWeekId(parseDay(addDays(today, -1))); // the week of the missed day
    if (s.freezeWeek !== week) {
      const count = s.count + 1;
      return { streak: { count, best: Math.max(s.best, count), lastDay: today, freezeWeek: week }, event: "freeze-used" };
    }
  }
  return { streak: { count: 1, best: s.best, lastDay: today, freezeWeek: s.freezeWeek }, event: "restarted" };
}

/** What to show today: the streak is "alive" if the last activity was today or yesterday (or the freeze would save it). */
export function streakAlive(s: Streak, today: string): boolean {
  if (!s.lastDay) return false;
  const gap = daysBetween(s.lastDay, today);
  if (gap <= 1) return true;
  if (gap === 2) return s.freezeWeek !== isoWeekId(parseDay(addDays(today, -1)));
  return false;
}

export function streakMessage(event: StreakEvent, count: number): string | null {
  switch (event) {
    case "first": return "Day 1 started. See you tomorrow!";
    case "continued": return `${count}-day streak. Keep it going!`;
    case "freeze-used": return `Streak saved by this week's free pass. ${count} days!`;
    case "restarted": return "Welcome back! A fresh start is a good start.";
    default: return null;
  }
}
