import { describe, it, expect } from "vitest";
import { validateNickname, clampXp, isDeviceId, newDeviceId, MAX_WEEK_XP, MAX_JUMP_PER_SYNC, AVATARS } from "@/lib/game/leaderboard";

describe("nickname rules", () => {
  it("accepts friendly nicknames (English, Roman Urdu, Urdu script, digits, - _)", () => {
    for (const n of ["Sara", "Code Ninja", "ali_k", "Hamza-7", "عائشہ"]) expect(validateNickname(n).ok, n).toBe(true);
  });
  it("normalises spacing", () => expect(validateNickname("  Code   Ninja ")).toEqual({ ok: true, nickname: "Code Ninja" }));
  it("rejects bad length and characters", () => {
    expect(validateNickname("a").ok).toBe(false);
    expect(validateNickname("x".repeat(17)).ok).toBe(false);
    expect(validateNickname("<script>").ok).toBe(false);
    expect(validateNickname("a@b.com").ok).toBe(false);
  });
  it("rejects phone/ID-like numbers", () => expect(validateNickname("Ali 0300 1234567").ok).toBe(false));
  it("rejects banned words even with leetspeak, spacing and case tricks", () => {
    for (const n of ["ADMIN", "4dm1n", "a d m i n", "Mr Instructor", "UMT Sir", "f u c k"]) expect(validateNickname(n).ok, n).toBe(false);
  });
  it("honours the admin's extra banned words", () => {
    expect(validateNickname("Joker").ok).toBe(true);
    expect(validateNickname("Joker", ["joker"]).ok).toBe(false);
    expect(validateNickname("J0K3R", ["joker"]).ok).toBe(false);
  });
});

describe("plausibility caps", () => {
  it("limits the jump per sync and the weekly ceiling", () => {
    expect(clampXp(0, 100)).toBe(100);
    expect(clampXp(0, 99999)).toBe(MAX_JUMP_PER_SYNC);
    expect(clampXp(1400, 99999)).toBe(MAX_WEEK_XP);
    expect(clampXp(500, 300)).toBe(300); // may go down (e.g. restored an older backup)
    expect(clampXp(0, -5)).toBe(0);
    expect(clampXp(0, NaN)).toBe(0);
  });
  it("device ids", () => {
    expect(isDeviceId(newDeviceId())).toBe(true);
    expect(isDeviceId("nope")).toBe(false);
    expect(isDeviceId(undefined)).toBe(false);
    expect(new Set(Array.from({ length: 50 }, newDeviceId)).size).toBe(50);
    expect(AVATARS.length).toBeGreaterThan(8);
  });
});
