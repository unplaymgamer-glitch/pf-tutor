import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { signSession, verifySession, newSession, csrfOk, originOk, needsRotation, revoked, SESSION_TTL_S } from "@/lib/server/session";
import { afterFailure, afterSuccess, isLocked, progressiveDelayMs, EMPTY_ATTEMPT, MAX_FAILS } from "@/lib/lockout";

const SECRET = "x".repeat(40);
describe("session token", () => {
  it("round-trips", () => {
    const p = newSession(); const t = signSession(SECRET, p);
    expect(verifySession(SECRET, t)).toEqual(p);
  });
  it("rejects tampering, wrong secret, expiry, junk, short secret", () => {
    const p = newSession(); const t = signSession(SECRET, p);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...p, exp: p.exp + 99999 })).toString("base64url");
    expect(verifySession(SECRET, `${forged}.${sig}`)).toBeNull();
    expect(verifySession("y".repeat(40), t)).toBeNull();
    expect(verifySession(SECRET, t, (p.exp + 1) * 1000)).toBeNull();
    expect(verifySession(SECRET, "garbage")).toBeNull();
    expect(verifySession(SECRET, undefined)).toBeNull();
    expect(verifySession("short", signSession("short", p))).toBeNull();
    expect(body.length).toBeGreaterThan(10);
  });
  it("lasts 8 hours and rotates after 1 hour", () => {
    const p = newSession(0);
    expect(p.exp - p.iat).toBe(SESSION_TTL_S);
    expect(needsRotation(p, 30 * 60_000)).toBe(false);
    expect(needsRotation(p, 61 * 60_000)).toBe(true);
  });
  it("revocation cut-off kills older sessions only", () => {
    const old = newSession(1000), fresh = newSession(5000);
    expect(revoked(old, 3000)).toBe(true);
    expect(revoked(fresh, 3000)).toBe(false);
    expect(revoked(old, 1000)).toBe(true); // created at the cut-off instant counts as revoked
  });
  it("csrf and origin checks", () => {
    const p = newSession();
    expect(csrfOk(p, p.csrf)).toBe(true);
    expect(csrfOk(p, "nope")).toBe(false);
    expect(csrfOk(p, null)).toBe(false);
    expect(originOk("https://site.vercel.app", "site.vercel.app")).toBe(true);
    expect(originOk("https://evil.com", "site.vercel.app")).toBe(false);
    expect(originOk(null, "site.vercel.app")).toBe(false);
  });
});

describe("login lockout", () => {
  const t0 = new Date("2026-12-01T10:00:00Z");
  it("locks after 5 failures for 15 minutes, then frees", () => {
    let a = EMPTY_ATTEMPT;
    for (let i = 0; i < MAX_FAILS - 1; i++) { a = afterFailure(a, t0); expect(isLocked(a, t0).locked).toBe(false); }
    a = afterFailure(a, t0);
    expect(isLocked(a, t0)).toEqual({ locked: true, retryAfterS: 900 });
    expect(isLocked(a, new Date(t0.getTime() + 16 * 60_000)).locked).toBe(false);
  });
  it("success resets; old failures are forgotten", () => {
    let a = afterFailure(afterFailure(EMPTY_ATTEMPT, t0), t0);
    expect(afterSuccess().fails).toBe(0);
    a = afterFailure(a, new Date(t0.getTime() + 2 * 3600_000));
    expect(a.fails).toBe(1);
  });
  it("progressive delay grows and is capped", () => {
    expect([0, 1, 2, 3, 4, 9].map(progressiveDelayMs)).toEqual([0, 500, 1000, 2000, 4000, 4000]);
  });
});
