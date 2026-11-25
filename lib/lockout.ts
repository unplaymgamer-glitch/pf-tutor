// Brute-force protection for the admin login: progressive delay, then a temporary lockout. Pure functions.
export type Attempt = { fails: number; locked_until: string | null; last_fail: string | null };
export const EMPTY_ATTEMPT: Attempt = { fails: 0, locked_until: null, last_fail: null };

export const MAX_FAILS = 5;            // after this many consecutive failures the client is locked out
export const LOCK_MINUTES = 15;
export const FAIL_MEMORY_MINUTES = 60; // failures older than this are forgotten

export function isLocked(a: Attempt, now: Date): { locked: boolean; retryAfterS: number } {
  if (a.locked_until) {
    const ms = new Date(a.locked_until).getTime() - now.getTime();
    if (ms > 0) return { locked: true, retryAfterS: Math.ceil(ms / 1000) };
  }
  return { locked: false, retryAfterS: 0 };
}

/** Delay (ms) to wait before answering a failed attempt: 0, 0.5s, 1s, 2s, ... capped at 4s. */
export function progressiveDelayMs(fails: number): number {
  if (fails <= 0) return 0;
  return Math.min(4000, 500 * 2 ** (fails - 1));
}

export function afterFailure(prev: Attempt, now: Date): Attempt {
  const stale = prev.last_fail && now.getTime() - new Date(prev.last_fail).getTime() > FAIL_MEMORY_MINUTES * 60_000;
  const fails = (stale ? 0 : prev.fails) + 1;
  return {
    fails,
    last_fail: now.toISOString(),
    locked_until: fails >= MAX_FAILS ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() : prev.locked_until,
  };
}

export const afterSuccess = (): Attempt => ({ ...EMPTY_ATTEMPT });
