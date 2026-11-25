import { describe, it, expect } from "vitest";
import { evalExpr } from "@/lib/expr";

describe("evalExpr", () => {
  const v = { marks: 72, age: 17, x: 0 };
  it("arithmetic precedence", () => expect(evalExpr("2 + 3 * 4", {})).toBe(14));
  it("relational", () => { expect(evalExpr("marks >= 50", v)).toBe(1); expect(evalExpr("marks < 50", v)).toBe(0); });
  it("logical and/or/not", () => {
    expect(evalExpr("marks >= 50 && age < 18", v)).toBe(1);
    expect(evalExpr("marks < 50 || age > 20", v)).toBe(0);
    expect(evalExpr("!(x)", v)).toBe(1);
  });
  it("equality and modulus", () => { expect(evalExpr("marks % 2 == 0", v)).toBe(1); expect(evalExpr("age != 17", v)).toBe(0); });
  it("rejects unknown vars and junk", () => {
    expect(() => evalExpr("zzz > 1", v)).toThrow();
    expect(() => evalExpr("1 +", v)).toThrow();
    expect(() => evalExpr("1 $ 2", v)).toThrow();
  });
  it("does not execute code", () => expect(() => evalExpr("process.exit()", v)).toThrow());
});
