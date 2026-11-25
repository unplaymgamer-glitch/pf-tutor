// Pure access-control logic (no I/O): which weeks/topics a student may see, and what must be stripped.
import type { Topic } from "./content-schema";

export type WeekState = { week: number; locked: boolean; unlock_at: string | null; taught: boolean; taught_at?: string | null };
export type TopicState = { week: number; slug: string; locked: boolean | null; unlock_at: string | null; taught: boolean; taught_at?: string | null };
export type Features = { leaderboard: boolean; voice: boolean; upload: boolean; runner: boolean; threeD: boolean };
export type Announcement = { id: string; text: string; starts_at: string; ends_at: string | null };

export type SiteState = {
  maintenance: boolean;
  examMode: boolean;
  features: Features;
  weeks: WeekState[];
  topics: TopicState[];
  announcements: Announcement[];
};

export const DEFAULT_FEATURES: Features = { leaderboard: true, voice: true, upload: true, runner: true, threeD: true };

/** Default and fallback state (no database, or database unreachable): EVERYTHING is open. Locking is an optional instructor tool. */
export function defaultState(): SiteState {
  return {
    maintenance: false,
    examMode: false,
    features: DEFAULT_FEATURES,
    weeks: Array.from({ length: 16 }, (_, i) => ({ week: i + 1, locked: false, unlock_at: null, taught: false })),
    topics: [],
    announcements: [],
  };
}

/** A scheduled unlock time that has passed means "open", even if the locked flag is still true. */
export function isLockedAt(locked: boolean, unlockAt: string | null, now: Date): boolean {
  if (!locked) return false;
  if (unlockAt && new Date(unlockAt).getTime() <= now.getTime()) return false;
  return true;
}

export type Access = { allowed: boolean; reason: "ok" | "maintenance" | "week-locked" | "topic-locked" };

/** Decide whether a student may read a topic. Maintenance blocks everything. A topic flag overrides its week. */
export function topicAccess(state: SiteState, week: number, slug: string | null, now: Date): Access {
  if (state.maintenance) return { allowed: false, reason: "maintenance" };
  const w = state.weeks.find((x) => x.week === week);
  // Open by default: only a week the instructor explicitly locked is closed. An unknown week row is open.
  const weekLocked = w ? isLockedAt(w.locked, w.unlock_at, now) : false;
  if (slug) {
    const t = state.topics.find((x) => x.week === week && x.slug === slug);
    if (t && t.locked !== null) {
      return isLockedAt(t.locked, t.unlock_at, now) ? { allowed: false, reason: "topic-locked" } : { allowed: true, reason: "ok" };
    }
  }
  return weekLocked ? { allowed: false, reason: "week-locked" } : { allowed: true, reason: "ok" };
}

export function activeAnnouncements(state: SiteState, now: Date): Announcement[] {
  return state.announcements.filter(
    (a) => new Date(a.starts_at).getTime() <= now.getTime() && (!a.ends_at || new Date(a.ends_at).getTime() > now.getTime())
  );
}

/** Exam mode: practice solutions and explanations must not be sent to the browser at all. */
export function redactForExamMode(topic: Topic): Topic {
  return {
    ...topic,
    practice: topic.practice.map((q) => ({ ...q, answer: "", explanation: "", hint: q.hint })),
  };
}

/** What the public API may reveal about a state: no internal ids beyond what the UI needs. */
export function publicState(state: SiteState, now: Date) {
  return {
    maintenance: state.maintenance,
    examMode: state.examMode,
    features: state.features,
    weeks: state.weeks.map((w) => ({
      week: w.week,
      locked: isLockedAt(w.locked, w.unlock_at, now),
      unlockAt: w.locked && w.unlock_at ? w.unlock_at : null,
      taught: w.taught,
    })),
    taughtTopics: state.topics.filter((t) => t.taught).map((t) => `${t.week}/${t.slug}`),
    lockedTopics: state.topics.filter((t) => t.locked !== null && isLockedAt(t.locked, t.unlock_at, now)).map((t) => `${t.week}/${t.slug}`),
    announcements: activeAnnouncements(state, now).map((a) => ({ id: a.id, text: a.text })),
  };
}
export type PublicState = ReturnType<typeof publicState>;
