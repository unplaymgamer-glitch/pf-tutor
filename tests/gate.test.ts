import { describe, it, expect } from "vitest";
import { defaultState, topicAccess, isLockedAt, publicState, redactForExamMode, activeAnnouncements, SiteState } from "@/lib/gate-logic";
import { Topic } from "@/lib/content-schema";
import { readFileSync } from "node:fs";

const now = new Date("2026-12-01T10:00:00Z");
const mk = (patch: Partial<SiteState> = {}): SiteState => ({ ...defaultState(), ...patch });

describe("topicAccess", () => {
  it("default state: every week is open", () => {
    for (let w = 1; w <= 16; w++) expect(topicAccess(mk(), w, "any-topic", now).allowed, `week ${w}`).toBe(true);
  });
  it("an instructor lock still closes a week, and unlocking reopens it", () => {
    const s = mk(); s.weeks[2] = { ...s.weeks[2], locked: true };
    expect(topicAccess(s, 3, "for-loop", now)).toEqual({ allowed: false, reason: "week-locked" });
    s.weeks[2] = { ...s.weeks[2], locked: false };
    expect(topicAccess(s, 3, "for-loop", now).allowed).toBe(true);
  });
  it("maintenance blocks everything, even open weeks", () => {
    expect(topicAccess(mk({ maintenance: true }), 1, "hello-world", now)).toEqual({ allowed: false, reason: "maintenance" });
  });
  it("unknown week row is open (open by default); maintenance still wins", () => {
    expect(topicAccess(mk({ weeks: [] }), 1, null, now).allowed).toBe(true);
    expect(topicAccess(mk({ weeks: [], maintenance: true }), 1, null, now).allowed).toBe(false);
  });
  it("scheduled unlock opens exactly at the time", () => {
    const s = mk(); s.weeks[2] = { week: 3, locked: true, unlock_at: "2026-12-01T10:00:00Z", taught: false };
    expect(topicAccess(s, 3, null, new Date("2026-12-01T09:59:59Z")).allowed).toBe(false);
    expect(topicAccess(s, 3, null, now).allowed).toBe(true);
  });
  it("topic flag overrides the week both ways", () => {
    const s = mk(); s.weeks[2] = { ...s.weeks[2], locked: true }; s.topics = [{ week: 1, slug: "pdlc", locked: true, unlock_at: null, taught: false }, { week: 3, slug: "for-loop", locked: false, unlock_at: null, taught: false }];
    expect(topicAccess(s, 1, "pdlc", now)).toEqual({ allowed: false, reason: "topic-locked" });
    expect(topicAccess(s, 1, "comments", now).allowed).toBe(true);
    expect(topicAccess(s, 3, "for-loop", now).allowed).toBe(true);
    expect(topicAccess(s, 3, "while-loop", now).allowed).toBe(false);
  });
  it("isLockedAt", () => {
    expect(isLockedAt(false, null, now)).toBe(false);
    expect(isLockedAt(true, null, now)).toBe(true);
    expect(isLockedAt(true, "2026-01-01T00:00:00Z", now)).toBe(false);
  });
});

describe("publicState / announcements / exam mode", () => {
  it("announcements honour start and end", () => {
    const s = mk({ announcements: [
      { id: "a", text: "now", starts_at: "2026-11-30T00:00:00Z", ends_at: null },
      { id: "b", text: "future", starts_at: "2026-12-05T00:00:00Z", ends_at: null },
      { id: "c", text: "expired", starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-30T00:00:00Z" },
    ] });
    expect(activeAnnouncements(s, now).map((a) => a.id)).toEqual(["a"]);
    expect(publicState(s, now).announcements).toEqual([{ id: "a", text: "now" }]);
  });
  it("public state leaks no lesson content", () => {
    const j = JSON.stringify(publicState(mk(), now));
    expect(j).not.toMatch(/practice|answer|explanation/);
  });
  it("exam mode strips every practice solution", () => {
    const t = Topic.parse(JSON.parse(readFileSync("content/week-02/if-statement.json", "utf8")));
    const r = redactForExamMode(t);
    expect(r.practice.length).toBe(t.practice.length);
    expect(r.practice.every((q) => q.answer === "" && q.explanation === "")).toBe(true);
    // Option text of a multiple-choice question is shown to students anyway; the solution texts must be gone.
    // (Short answers like ">=" can legitimately appear elsewhere in the lesson, so we check the practice list itself.)
    const j = JSON.stringify(r.practice);
    for (const q of t.practice) expect(j).not.toContain(q.explanation);
  });
});
