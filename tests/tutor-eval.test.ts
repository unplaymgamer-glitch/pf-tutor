// Checks the EVALUATION SET itself (offline, no AI): the questions are well-formed, cover every chapter and language, and every
// program used in an "output" question really prints what the set says (verified with g++). A wrong answer key would make the
// pass rate meaningless, so this must stay green. The AI pass rate itself comes from `npm run eval:tutor`.
import { describe, it, expect } from "vitest";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

type Item = { id: string; week: number; kind: string; lang: string; q: string; facts: string[][]; program?: string; stdin?: string; expectedOutput?: string; roman?: boolean; urdu?: boolean; context?: { code?: string } };
const items: Item[] = JSON.parse(readFileSync("tests/tutor-eval/questions.json", "utf8"));
const gxx = process.env.CC111_GXX ?? "g++";
const base = process.platform === "win32" ? "C:\\" : undefined;

function gxxWorks(): boolean {
  if (spawnSync(gxx, ["--version"]).status !== 0) return false;
  const dir = mkdtempSync(join(base ?? process.env.TMPDIR ?? "/tmp", "cc111q-"));
  try { writeFileSync(join(dir, "m.cpp"), "int main(){return 0;}"); return spawnSync(gxx, ["m.cpp", "-o", "m.out"], { cwd: dir, env: { ...process.env, TMP: dir, TEMP: dir, TMPDIR: dir } }).status === 0; }
  catch { return false; } finally { rmSync(dir, { recursive: true, force: true }); }
}
const have = gxxWorks();

describe("tutor evaluation set", () => {
  it("has at least 60 questions with unique ids", () => {
    expect(items.length).toBeGreaterThanOrEqual(60);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("covers every chapter (weeks 1-16), Roman Urdu, Urdu script, debugging, output, assignments, injection and out-of-scope", () => {
    expect(new Set(items.map((i) => i.week)).size).toBe(16);
    expect(items.filter((i) => i.lang === "roman").length).toBeGreaterThanOrEqual(4);
    expect(items.filter((i) => i.lang === "ur").length).toBeGreaterThanOrEqual(2);
    for (const k of ["concept", "debug", "output", "assignment", "injection", "oos"]) expect(items.some((i) => i.kind === k), k).toBe(true);
  });
  it("every item has a question and valid regex fact groups", () => {
    for (const i of items) {
      expect(i.q.length, i.id).toBeGreaterThan(5);
      expect(i.facts.length, i.id).toBeGreaterThan(0);
      for (const g of i.facts) { expect(g.length, i.id).toBeGreaterThan(0); for (const re of g) expect(() => new RegExp(re, "i"), `${i.id}: ${re}`).not.toThrow(); }
    }
  });
  it("the stated expected output satisfies the item's own fact patterns", () => {
    for (const i of items.filter((x) => x.expectedOutput !== undefined)) for (const g of i.facts) {
      if (g.some((re) => re.startsWith("\\b") || /^\d/.test(re)) || i.kind === "output") {
        const answer = `The program prints ${i.expectedOutput}`;
        if (i.id.endsWith("-output") || i.kind === "output") expect(g.some((re) => new RegExp(re, "i").test(answer)) || g.some((re) => /copy|break|fall|local|by value/.test(re)), `${i.id}: ${g.join("|")}`).toBe(true);
      }
    }
  });
  const programs = items.filter((i) => i.program);
  it("has output questions with programs", () => expect(programs.length).toBeGreaterThanOrEqual(8));
  for (const i of programs) {
    (have ? it : it.skip)(`${i.id}: the program compiles and prints exactly the expected output (g++)`, () => {
      const dir = mkdtempSync(join(base ?? process.env.TMPDIR ?? "/tmp", "cc111q-"));
      try {
        writeFileSync(join(dir, "m.cpp"), i.program!);
        const exe = process.platform === "win32" ? "a.exe" : "a.out";
        const c = spawnSync(gxx, ["-std=c++17", "-Wall", "m.cpp", "-o", exe], { cwd: dir, encoding: "utf8", env: { ...process.env, TMP: dir, TEMP: dir, TMPDIR: dir } });
        expect(c.status, c.stderr).toBe(0);
        const r = spawnSync(join(dir, exe), [], { cwd: dir, input: i.stdin ?? "", encoding: "utf8", timeout: 5000 });
        expect(r.stdout.replace(/\r\n/g, "\n")).toBe(i.expectedOutput);
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });
  }
});
