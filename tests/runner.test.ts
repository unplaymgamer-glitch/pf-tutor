import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { explainCompilerOutput, explainRuntime } from "@/lib/runner/explain";
import { unsupportedInBasicMode } from "@/lib/runner/features";
import { encodeSnippet, decodeSnippet } from "@/lib/runner/share";

// Real clang diagnostics captured from the in-browser compiler (tests/fixtures/clang-diagnostics.json).
const fx = JSON.parse(readFileSync("tests/fixtures/clang-diagnostics.json", "utf8")) as Record<string, { ok: boolean; diagnostics: string }>;
const first = (k: string, lang: "en" | "roman" | "ur" = "en") => explainCompilerOutput(fx[k].diagnostics, lang).find((e) => e.severity === "error") ?? explainCompilerOutput(fx[k].diagnostics, lang)[0];

describe("error explainer on real compiler output", () => {
  const expectTitle: Record<string, RegExp> = {
    "missing-semicolon": /semicolon/i,
    "undeclared-var": /not declared/,
    "undeclared-cout-no-using": /not known here/,
    "missing-brace": /bracket/i,
    "missing-paren": /bracket/i,
    "type-mismatch": /wrong kind of value/i,
    "assign-to-const": /constant/,
    "wrong-args": /does not match/,
    "redefinition": /declared twice/,
    "bad-include": /library .* was not found/i,
    "unknown-type": /not a type/,
    "throw": /try\/catch\/throw/,
    "else-without-if": /expected a value/i,
    "array-negative": /negative/,
    "pointer-int": /wrong kind of value|pointer/i,
    "modulus-double": /operator cannot be used/,
    "missing-main": /no main/,
  };
  for (const [k, re] of Object.entries(expectTitle)) {
    it(`${k}: explained in plain English`, () => {
      const e = first(k);
      expect(e, `no diagnostic parsed for ${k}`).toBeTruthy();
      expect(e.title).toMatch(re);
      expect(e.help.length).toBeGreaterThan(20);
    });
  }
  it("gives line and column for compiler errors", () => {
    const e = first("missing-semicolon");
    expect(e.line).toBe(3);
    expect(e.col).toBeGreaterThan(0);
  });
  it("warnings are explained too (uninitialized variable, = in if)", () => {
    const u = explainCompilerOutput(fx["uninitialized"].diagnostics).find((e) => e.severity === "warning");
    expect(u?.title).toMatch(/before it has a value/);
    const a = explainCompilerOutput(fx["assign-in-if"].diagnostics).find((e) => e.severity === "warning");
    expect(a?.title).toMatch(/==/);
  });
  it("Roman Urdu and Urdu script are produced for common errors", () => {
    expect(first("missing-semicolon", "roman").title).toMatch(/missing hai/);
    expect(first("missing-semicolon", "ur").title).toMatch(/[؀-ۿ]/);
    expect(first("undeclared-var", "ur").title).toMatch(/[؀-ۿ]/);
  });
  it("code and keywords stay English inside Urdu text", () => {
    expect(first("undeclared-var", "ur").help).toContain("int x;");
  });
  it("unknown messages still produce something readable", () => {
    const e = explainCompilerOutput("main.cpp:1:1: error: some brand new clang message", "en")[0];
    expect(e.title).toMatch(/problem/);
    expect(e.help).toContain("brand new clang message");
  });
  it("no duplicate entries and no crash on empty input", () => {
    expect(explainCompilerOutput("")).toEqual([]);
    const twice = fx["missing-semicolon"].diagnostics + fx["missing-semicolon"].diagnostics;
    expect(explainCompilerOutput(twice).length).toBe(explainCompilerOutput(fx["missing-semicolon"].diagnostics).length);
  });
});

describe("runtime explanations", () => {
  it("maps V8 trap messages", () => {
    expect(explainRuntime("trap", "divide by zero").title).toMatch(/Division by zero/);
    expect(explainRuntime("trap", "memory access out of bounds").title).toMatch(/Memory access/);
    expect(explainRuntime("trap", "Maximum call stack size exceeded").title).toMatch(/nested function calls/);
    expect(explainRuntime("timeout", undefined).help).toMatch(/endless loop/);
    expect(explainRuntime("output", undefined, "roman").title).toMatch(/output/);
  });
});

describe("Basic mode feature detection", () => {
  const H = "#include <iostream>\nusing namespace std;\n";
  it("accepts plain Week 1-6 programs", () => {
    expect(unsupportedInBasicMode(H + "int main(){ int a[3]={1,2,3}; for(int i=0;i<3;i++) cout<<a[i]; return 0; }")).toEqual([]);
    expect(unsupportedInBasicMode(H + "int sq(int x){return x*x;} int main(){ cout<<sq(3)<<(1&2); return 0;}")).toEqual([]);
  });
  it("flags string, struct, new, references, files, try", () => {
    const f = (c: string) => unsupportedInBasicMode(c).map((x) => x.feature).join("|");
    expect(f("#include <string>\nint main(){}")).toContain("<string>");
    expect(f(H + "struct S{int a;}; int main(){}")).toContain("struct");
    expect(f(H + "int main(){ int *p = new int; }")).toContain("new");
    expect(f(H + "void inc(int &r){r++;} int main(){}")).toContain("reference");
    expect(f("#include <fstream>\nint main(){}")).toContain("<fstream>");
    expect(f(H + "int main(){ try{}catch(...){} }")).toContain("try");
  });
  it("ignores keywords inside comments and strings", () => {
    expect(unsupportedInBasicMode(H + 'int main(){ cout << "new struct string"; // try new\n return 0; }')).toEqual([]);
  });
});

describe("share link", () => {
  it("round-trips code and input, including Unicode", async () => {
    const s = { code: '#include <iostream>\nint main(){ std::cout << "Hello UMT ✓"; }\n', stdin: "12 8\n" };
    const h = await encodeSnippet(s);
    expect(h.length).toBeLessThan(s.code.length * 2);
    expect(await decodeSnippet("s=" + h)).toEqual(s);
  });
  it("rejects garbage without throwing", async () => {
    expect(await decodeSnippet("s=!!!")).toBeNull();
    expect(await decodeSnippet("")).toBeNull();
    expect(await decodeSnippet("s=zAAAA")).toBeNull();
  });
});
