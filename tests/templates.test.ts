// Every Playground template must compile with real g++ and print exactly what the in-browser compiler printed
// (outputs captured from the wasm compiler in tests/fixtures/templates-expected.json). Needs a working g++:
//   CC111_GXX=C:/mingw64/bin/g++.exe npx vitest run tests/templates.test.ts   (skipped otherwise)
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TEMPLATES } from "@/lib/runner/templates";

const gxx = process.env.CC111_GXX ?? "g++";
const base = process.platform === "win32" ? "C:\\" : undefined;

/** A g++ that can only print its version but cannot link (e.g. install path with spaces) must not fail the suite. */
function gxxWorks(): boolean {
  if (spawnSync(gxx, ["--version"]).status !== 0) return false;
  const dir = mkdtempSync(join(base ?? process.env.TMPDIR ?? "/tmp", "cc111p-"));
  try {
    writeFileSync(join(dir, "m.cpp"), "int main(){return 0;}");
    return spawnSync(gxx, ["m.cpp", "-o", "m.out"], { cwd: dir, env: { ...process.env, TMP: dir, TEMP: dir, TMPDIR: dir } }).status === 0;
  } catch { return false; } finally { rmSync(dir, { recursive: true, force: true }); }
}
const have = gxxWorks();
const expected = JSON.parse(readFileSync("tests/fixtures/templates-expected.json", "utf8")) as Record<string, { out: string; exit: number }>;

describe("templates", () => {
  it("fixture covers every template", () => expect(Object.keys(expected).sort()).toEqual(TEMPLATES.map((t) => t.id).sort()));
  for (const t of TEMPLATES) {
    (have ? it : it.skip)(`${t.id}: g++ output equals browser-compiler output`, () => {
      const dir = mkdtempSync(join(base ?? process.env.TMPDIR ?? "/tmp", "cc111t-"));
      try {
        writeFileSync(join(dir, "main.cpp"), t.code);
        const exe = process.platform === "win32" ? "a.exe" : "a.out";
        const c = spawnSync(gxx, ["-std=c++17", "-Wall", "main.cpp", "-o", exe], { cwd: dir, encoding: "utf8", env: { ...process.env, TMP: dir, TEMP: dir, TMPDIR: dir } });
        expect(c.status, c.stderr).toBe(0);
        expect(c.stderr, "template produces compiler warnings").toBe("");
        const r = spawnSync(join(dir, exe), [], { cwd: dir, input: t.stdin, encoding: "utf8", timeout: 5000 });
        expect(r.stdout.replace(/\r\n/g, "\n")).toBe(expected[t.id].out);
        expect(r.status).toBe(expected[t.id].exit);
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });
  }
});
