import { describe, it, expect } from "vitest";
import { EMPTY_PROGRESS, answerQuestion, completeTopic, sanitizeProgress, stars, XP } from "@/lib/progress";

describe("XP rules", () => {
  it("first-try correct gives full XP, repeats give little, never negative", () => {
    let p = answerQuestion(EMPTY_PROGRESS, "w1/a", "q1", true);
    expect(p.xp).toBe(XP.firstTry);
    p = answerQuestion(p, "w1/a", "q1", true);
    expect(p.xp).toBe(XP.firstTry); // already right: no farming
  });
  it("wrong then right gives repeat XP", () => {
    let p = answerQuestion(EMPTY_PROGRESS, "w1/a", "q1", false);
    expect(p.xp).toBe(0);
    p = answerQuestion(p, "w1/a", "q1", true);
    expect(p.xp).toBe(XP.repeat);
  });
  it("topic completion pays once", () => {
    let p = completeTopic(EMPTY_PROGRESS, "w1/a", { right: 4, total: 5 });
    p = completeTopic(p, "w1/a", { right: 5, total: 5 });
    expect(p.xp).toBe(XP.topicDone);
    expect(p.topics["w1/a"].quizBest).toBe(5);
  });
  it("stars from accuracy", () => {
    expect(stars({ quizBest: 5, quizTotal: 5 })).toBe(3);
    expect(stars({ quizBest: 3, quizTotal: 5 })).toBe(1);
    expect(stars({ quizBest: 1, quizTotal: 5 })).toBe(0);
    expect(stars(undefined)).toBe(0);
  });
  it("sanitize survives garbage", () => {
    expect(sanitizeProgress("x")).toEqual(sanitizeProgress({}));
    expect(sanitizeProgress({ xp: -5, view: "bogus" }).xp).toBe(0);
  });
});
