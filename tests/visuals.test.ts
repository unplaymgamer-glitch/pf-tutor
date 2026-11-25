import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { SORT_CODE, sortProgram, sortSteps } from "@/lib/visuals/sort";
import { arraySteps } from "@/lib/visuals/arrays";
import { cellOrder, pattern, renderRows, type Shape } from "@/lib/visuals/pattern";
import { matrixSteps } from "@/lib/visuals/matrix";
import { Overload, T, resolveOverload } from "@/lib/visuals/resolver";
import { Visual } from "@/lib/content-schema";

const gxx = process.env.CC111_GXX ?? "g++";
const base = process.platform === "win32" ? "C:\\" : undefined;
const env = (dir: string) => ({ ...process.env, TMP: dir, TEMP: dir, TMPDIR: dir });
function gxxWorks() {
  if (spawnSync(gxx, ["--version"]).status !== 0) return false;
  const dir = mkdtempSync(join(base ?? process.env.TMPDIR ?? "/tmp", "cc111v-"));
  try { writeFileSync(join(dir, "m.cpp"), "int main(){return 0;}"); return spawnSync(gxx, ["m.cpp", "-o", "m.out"], { cwd: dir, env: env(dir) }).status === 0; }
  catch { return false; } finally { rmSync(dir, { recursive: true, force: true }); }
}
const have = gxxWorks();
function compileRun(code: string): { compiled: boolean; out: string } {
  const dir = mkdtempSync(join(base ?? process.env.TMPDIR ?? "/tmp", "cc111v-"));
  try {
    writeFileSync(join(dir, "m.cpp"), code);
    const exe = process.platform === "win32" ? "a.exe" : "a.out";
    const c = spawnSync(gxx, ["-std=c++17", "m.cpp", "-o", exe], { cwd: dir, encoding: "utf8", env: env(dir) });
    if (c.status !== 0) return { compiled: false, out: "" };
    return { compiled: true, out: spawnSync(join(dir, exe), [], { cwd: dir, encoding: "utf8", timeout: 5000 }).stdout.replace(/\r\n/g, "\n") };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe("sort steps", () => {
  const inputs = [[5, 1, 4, 2, 8], [3, 2, 1], [1, 2, 3, 4], [9, 9, 1, 9], [7, 3, 8, 1, 6, 2, 5], [4, 4, 4]];
  for (const algo of ["bubble", "selection"] as const) {
    it(`${algo}: every run ends sorted, counters never decrease, sorted-set grows`, () => {
      for (const v of inputs) {
        const s = sortSteps(algo, v);
        expect(s.at(-1)!.arr).toEqual([...v].sort((a, b) => a - b));
        expect(s.at(-1)!.sorted.length).toBe(v.length);
        for (let i = 1; i < s.length; i++) { expect(s[i].comparisons).toBeGreaterThanOrEqual(s[i - 1].comparisons); expect(s[i].swaps).toBeGreaterThanOrEqual(s[i - 1].swaps); }
        for (const st of s) expect(st.line).toBeLessThanOrEqual(SORT_CODE[algo].split("\n").length);
      }
    });
    (have ? it : it.skip)(`${algo}: comparisons, swaps and result equal a REAL g++ run of the displayed code`, () => {
      for (const v of inputs) {
        const r = compileRun(sortProgram(algo, v));
        expect(r.compiled, `${algo} ${v}`).toBe(true);
        const last = sortSteps(algo, v).at(-1)!;
        expect(r.out.trim(), `${algo} ${v}`).toBe(`${last.comparisons} ${last.swaps} ${last.arr.join(",")}`);
      }
    });
  }
  it("bubble and selection have genuinely different behaviour (selection never swaps more than n-1 times)", () => {
    const v = [9, 8, 7, 6, 5, 4];
    expect(sortSteps("selection", v).at(-1)!.swaps).toBeLessThanOrEqual(v.length - 1);
    expect(sortSteps("bubble", v).at(-1)!.swaps).toBe(15);
  });
  it("swap steps mark which indexes moved", () => {
    const s = sortSteps("bubble", [2, 1]);
    expect(s.find((x) => x.swapped)?.compare).toEqual([0, 1]);
  });
});

describe("array steps", () => {
  it("linear search stops at the first match and counts comparisons", () => {
    const s = arraySteps("search", [4, 9, 2, 9, 5], 9);
    expect(s.at(-1)!.found).toBe(1);
    expect(s.at(-1)!.vars.comparisons).toBe("2");
  });
  it("search for a missing value checks everything", () => {
    const s = arraySteps("search", [1, 2, 3], 7);
    expect(s.at(-1)!.note).toContain("not in the array");
    expect(s.at(-1)!.vars.comparisons).toBe("3");
  });
  it("min/max, sum and reverse agree with plain computations", () => {
    const v = [4, -2, 9, 0, 7];
    expect(arraySteps("minmax", v).at(-1)!.vars).toEqual({ min: "-2", max: "9" });
    expect(arraySteps("sum", v).at(-1)!.vars.sum).toBe("18");
    expect(arraySteps("reverse", v).at(-1)!.arr).toEqual([7, 0, 9, -2, 4]);
    expect(arraySteps("reverse", [1, 2, 3]).at(-1)!.arr).toEqual([3, 2, 1]);
  });
});

describe("patterns", () => {
  const rows = (s: Shape, n = 4) => pattern(s, n).rows;
  it("triangle, pyramid, diamond sizes", () => {
    expect(rows("right-triangle").map((r) => r.length)).toEqual([1, 2, 3, 4]);
    expect(rows("inverted-triangle").map((r) => r.length)).toEqual([4, 3, 2, 1]);
    expect(rows("pyramid").map((r) => r.join("").trim().length)).toEqual([1, 3, 5, 7]);
    expect(rows("diamond").length).toBe(7);
    expect(rows("diamond").map((r) => r.join("").trim().length)).toEqual([1, 3, 5, 7, 5, 3, 1]);
  });
  it("square and hollow square", () => {
    expect(renderRows(rows("hollow-square", 4))).toBe("****\n*  *\n*  *\n****");
    expect(rows("square", 3).flat().every((c) => c === "*")).toBe(true);
  });
  it("number triangle and multiplication table", () => {
    expect(renderRows(rows("number-triangle", 3))).toBe("1\n12\n123");
    expect(rows("multiplication-table", 3)[2]).toEqual(["3", "6", "9"]);
  });
  it("cell order covers every cell once, row by row", () => {
    const r = rows("pyramid");
    expect(cellOrder(r).length).toBe(r.flat().length);
  });
  (have ? it : it.skip)("the displayed loop code really prints the pattern (g++), for every shape", () => {
    for (const shape of ["right-triangle", "inverted-triangle", "pyramid", "diamond", "square", "hollow-square", "number-triangle", "multiplication-table"] as Shape[]) {
      const p = pattern(shape, 4);
      const r = compileRun(`#include <iostream>\nusing namespace std;\nint main() {\n    int n = 4;\n${p.code.split("\n").map((l) => "    " + l).join("\n")}\n    return 0;\n}\n`);
      expect(r.compiled, shape).toBe(true);
      const expected = shape === "multiplication-table" ? p.rows.map((row) => row.map((c) => c + " ").join("")).join("\n") : renderRows(p.rows);
      expect(r.out.replace(/\n$/, "").split("\n").map((l) => l.replace(/\s+$/, "")), shape).toEqual(expected.split("\n").map((l) => l.replace(/\s+$/, "")));
    }
  });
});

describe("matrix steps", () => {
  const A = [[1, 2], [3, 4]], B = [[5, 6], [7, 8]];
  it("add, transpose, multiply produce the right final matrices", () => {
    expect(matrixSteps("add", A, B).at(-1)!.res).toEqual([[6, 8], [10, 12]]);
    expect(matrixSteps("transpose", [[1, 2, 3], [4, 5, 6]]).at(-1)!.res).toEqual([[1, 4], [2, 5], [3, 6]]);
    expect(matrixSteps("multiply", A, B).at(-1)!.res).toEqual([[19, 22], [43, 50]]);
    expect(matrixSteps("multiply", [[1, 2, 3]], [[1], [2], [3]]).at(-1)!.res).toEqual([[14]]);
  });
  it("refuses impossible multiplication with a clear note", () => {
    const s = matrixSteps("multiply", [[1, 2, 3]], [[1, 2]]);
    expect(s.length).toBe(1);
    expect(s[0].note).toContain("Cannot multiply");
  });
  it("search, count-even and diagonal", () => {
    expect(matrixSteps("search", [[3, 9], [1, 4]]).at(-1)!.vars).toEqual({ max: "9", row: "0", col: "1" });
    expect(matrixSteps("count-even", [[1, 2], [4, 7]]).at(-1)!.vars.count).toBe("2");
    expect(matrixSteps("diagonal", [[1, 2], [3, 4]]).at(-1)!.vars.sum).toBe("5");
  });
});

describe("overload resolver (verified against g++)", () => {
  const ov: Overload[] = [{ sig: "f(int)", params: ["int"] }, { sig: "f(double)", params: ["double"] }];
  const cases: { ov: Overload[]; args: T[]; chosen: number | null; status: string }[] = [
    { ov, args: ["int"], chosen: 0, status: "exact" },
    { ov, args: ["double"], chosen: 1, status: "exact" },
    { ov, args: ["char"], chosen: 0, status: "promotion" },
    { ov, args: ["bool"], chosen: 0, status: "promotion" },
    { ov, args: ["string"], chosen: null, status: "none" },
    { ov: [{ sig: "g(int,double)", params: ["int", "double"] }, { sig: "g(double,int)", params: ["double", "int"] }], args: ["int", "int"], chosen: null, status: "ambiguous" },
    { ov: [{ sig: "g(int,double)", params: ["int", "double"] }, { sig: "g(double,int)", params: ["double", "int"] }], args: ["int", "double"], chosen: 0, status: "exact" },
  ];
  it("matches the rules", () => { for (const c of cases) expect(resolveOverload(c.ov, c.args), JSON.stringify(c.args)).toMatchObject({ chosen: c.chosen, status: c.status }); });
  (have ? it : it.skip)("g++ agrees on which overload runs (or that the call does not compile)", () => {
    const lit: Record<T, string> = { int: "1", double: "1.5", char: "'a'", bool: "true", string: '"hi"' };
    for (const c of cases) {
      const decls = c.ov.map((o, i) => `void ${o.sig.split("(")[0]}(${o.params.map((p, k) => `${p === "string" ? "const char*" : p} p${k}`).join(", ")}) { cout << ${i}; }`).join("\n");
      const name = c.ov[0].sig.split("(")[0];
      const r = compileRun(`#include <iostream>\nusing namespace std;\n${decls}\nint main() { ${name}(${c.args.map((a) => lit[a]).join(", ")}); }\n`);
      if (c.chosen === null) expect(r.compiled, JSON.stringify(c.args)).toBe(false);
      else { expect(r.compiled, JSON.stringify(c.args)).toBe(true); expect(r.out, JSON.stringify(c.args)).toBe(String(c.chosen)); }
    }
  });
});

describe("new visual kinds validate against the schema", () => {
  it("accepts good definitions and rejects bad ones", () => {
    expect(Visual.safeParse({ kind: "sort", title: "t", algo: "bubble", values: [5, 1, 4] }).success).toBe(true);
    expect(Visual.safeParse({ kind: "sort", title: "t", algo: "quick", values: [5, 1, 4] }).success).toBe(false);
    expect(Visual.safeParse({ kind: "array", title: "t", mode: "search", values: [1, 2, 3], target: 2 }).success).toBe(true);
    expect(Visual.safeParse({ kind: "array", title: "t", mode: "search", values: [1] }).success).toBe(false);
    expect(Visual.safeParse({ kind: "pattern", title: "t", shape: "diamond" }).success).toBe(true);
    expect(Visual.safeParse({ kind: "matrix", title: "t", op: "multiply", a: [[1, 2]], b: [[1], [2]] }).success).toBe(true);
    expect(Visual.safeParse({ kind: "resolver", title: "t", overloads: [{ sig: "f(int)", params: ["int"] }, { sig: "f(double)", params: ["double"] }], argTypes: ["char"] }).success).toBe(true);
  });
});

import { recursionProgram, recursionSteps, type RecFn } from "@/lib/visuals/recursion";
describe("recursion steps", () => {
  const cases: [RecFn, number, number?][] = [["factorial", 1], ["factorial", 5], ["fibonacci", 1], ["fibonacci", 6], ["fibonacci", 8], ["sum", 6], ["power", 5, 3], ["power", 1, 7], ["gcd", 8, 12], ["gcd", 7, 5], ["countdown", 4]];
  for (const [fn, n, m] of cases) {
    it(`${fn}(${n}${m ? "," + m : ""}): result and number of calls equal the real program`, () => {
      const g = recursionSteps(fn, n, m);
      expect(g.steps.length).toBeGreaterThan(1);
      // stack is empty after the last step's pop and never deeper than maxDepth
      expect(Math.max(...g.steps.map((s) => s.stack.length))).toBe(g.maxDepth);
      if (!have) return;
      const r = compileRun(recursionProgram(fn, n, m));
      expect(r.compiled).toBe(true);
      expect(r.out.trim()).toBe(`${g.result} ${g.calls}`);
    });
  }
  it("countdown prints n..1 then Go!", () => {
    expect(recursionSteps("countdown", 3).steps.at(-1)!.out).toBe("3\n2\n1\nGo!\n");
  });
  it("schema accepts the new visual kinds", () => {
    expect(Visual.safeParse({ kind: "recursion", title: "t", fn: "fibonacci", n: 5 }).success).toBe(true);
    expect(Visual.safeParse({ kind: "recursion", title: "t", fn: "fibonacci", n: 50 }).success).toBe(false);
    expect(Visual.safeParse({ kind: "canvas", title: "t", sampleId: "house" }).success).toBe(true);
    expect(Visual.safeParse({ kind: "memory", title: "t", cells: [{ name: "x", type: "int", addr: "0x1000" }], steps: [{ note: "a" }, { note: "b" }] }).success).toBe(true);
  });
});

import { runGraphics } from "@/lib/visuals/graphics";
const HOUSE = `#include <graphics.h>
#include <conio.h>
int main()
{
    int gd = DETECT, gm;
    initgraph(&gd, &gm, (char*)"C:\\TURBOC3\\BGI");   // use "" with WinBGIm
    setbkcolor(BLACK);
    setcolor(WHITE);
    rectangle(200, 200, 400, 350);          // walls
    line(200, 200, 300, 120);               // roof left
    line(300, 120, 400, 200);               // roof right
    rectangle(275, 280, 325, 350);          // door
    setfillstyle(SOLID_FILL, RED);          // colour the walls
    floodfill(210, 210, WHITE);
    setcolor(YELLOW);
    circle(520, 90, 40);                    // sun
    setfillstyle(SOLID_FILL, YELLOW);
    floodfill(520, 90, YELLOW);
    setcolor(WHITE);
    outtextxy(240, 380, (char*)"My House");
    getch();                                // wait for a key
    closegraph();
    return 0;
}`;
const ANIM = `#include <graphics.h>
int main() {
  int gd = DETECT, gm;
  initgraph(&gd, &gm, (char*)"");
  for (int x = 50; x <= 550; x += 5) { cleardevice(); setcolor(GREEN); circle(x, 240, 30); delay(30); }
  getch(); closegraph(); return 0;
}`;
describe("graphics simulator", () => {
  it("draws the notes' house in order with the right colours", () => {
    const r = runGraphics(HOUSE);
    expect(r.error).toBeUndefined();
    expect(r.frames).toHaveLength(1);
    const ops = r.frames[0];
    expect(ops).toHaveLength(8);
    expect(ops[0]).toEqual({ t: "rect", l: 200, tp: 200, r: 400, b: 350, c: 15 });
    expect(ops[4]).toEqual({ t: "fill", x: 210, y: 210, color: 4, border: 15 });
    expect(ops[5]).toEqual({ t: "circle", x: 520, y: 90, r: 40, c: 14 });
    expect(ops.at(-1)).toEqual({ t: "text", x: 240, y: 380, s: "My House", c: 15 });
  });
  it("animation: one frame per delay, each frame has only the current circle", () => {
    const r = runGraphics(ANIM);
    expect(r.error).toBeUndefined();
    expect(r.frames).toHaveLength(101);
    expect(r.frames[0]).toEqual([{ t: "circle", x: 50, y: 240, r: 30, c: 2 }]);
    expect(r.frames[100]).toEqual([{ t: "circle", x: 550, y: 240, r: 30, c: 2 }]);
  });
  it("supports variables and arithmetic, and refuses unknown calls", () => {
    const r = runGraphics(`int main(){ int w = 100; int cx = getmaxx() / 2; rectangle(cx - w / 2, 10, cx + w / 2, 60); return 0; }`);
    expect(r.frames[0][0]).toEqual({ t: "rect", l: 269, tp: 10, r: 369, b: 60, c: 15 });
    expect(runGraphics(`int main(){ system("rm -rf /"); }`).error).toMatch(/does not know/);
    expect(runGraphics(`int main(){ for (int i = 0; i < 5; i += 0) { circle(1,1,1); } }`).error).toMatch(/endless/);
    expect(runGraphics(`int main(){ while (1) { circle(1,1,1); } }`).error).toBeTruthy();
  });
});

import { rasterize, SCREEN_W } from "@/lib/visuals/graphics";
describe("graphics rasteriser", () => {
  it("house: walls are filled red inside the border, outside stays black, sun is yellow", () => {
    const buf = rasterize(runGraphics(HOUSE).frames[0], 0);
    const px = (x: number, y: number) => buf[y * SCREEN_W + x];
    expect(px(250, 250)).toBe(4);   // inside walls: red
    expect(px(300, 160)).toBe(0);   // roof is a separate closed region (the walls' top edge closes it), so floodfill does not reach it
    expect(px(100, 250)).toBe(0);   // outside the house
    expect(px(200, 250)).toBe(15);  // wall line itself stays white
    expect(px(520, 90)).toBe(14);   // sun filled
    expect(px(520, 50)).toBe(14);   // top of the sun outline (circle is yellow)
  });
  it("floodfill stops at the border and does not leak out of an open shape's neighbour", () => {
    const ops = runGraphics(`int main(){ setcolor(WHITE); rectangle(10,10,50,50); setfillstyle(SOLID_FILL, BLUE); floodfill(20,20,WHITE); return 0; }`).frames[0];
    const buf = rasterize(ops);
    expect(buf[20 * SCREEN_W + 20]).toBe(1);
    expect(buf[60 * SCREEN_W + 60]).toBe(0);
    expect(buf[10 * SCREEN_W + 30]).toBe(15);
  });
  it("lines are 1 pixel wide and a circle is closed", () => {
    const buf = rasterize(runGraphics(`int main(){ line(0,0,9,0); circle(100,100,20); return 0; }`).frames[0]);
    expect([...buf.slice(0, 10)].every((v) => v === 15)).toBe(true);
    expect(buf[100 * SCREEN_W + 120]).toBe(15);
    expect(buf[100 * SCREEN_W + 80]).toBe(15);
    expect(buf[100 * SCREEN_W + 100]).toBe(0);
  });
});

import { loopCode, loopProgram, loopSteps, type LoopParams } from "@/lib/visuals/loops";
describe("loop lab steps", () => {
  const base = { start: 1, end: 5, step: 1, cmp: "<=" } as const;
  const cases: LoopParams[] = [];
  for (const loop of ["for", "while", "do-while"] as const) {
    cases.push({ loop, ...base }, { loop, start: 5, end: 1, step: -1, cmp: ">=" }, { loop, start: 0, end: 10, step: 3, cmp: "<" }, { loop, start: 10, end: 5, step: 1, cmp: "<=" },
      { loop, ...base, jump: { type: "break", at: 3 } }, { loop, ...base, jump: { type: "continue", at: 3 } }, { loop, start: 2, end: 20, step: 4, cmp: "<", jump: { type: "continue", at: 6 } });
  }
  it("every generated step points at a real code line and the run is consistent", () => {
    for (const p of cases) {
      const { code } = loopCode(p), n = code.split("\n").length;
      const g = loopSteps(p);
      expect(g.endless).toBe(false);
      for (const s of g.steps) expect(s.line >= 1 && s.line <= n, `${p.loop} line ${s.line} of ${n}`).toBe(true);
      expect(g.steps.at(-1)!.phase).toBe("exit");
    }
  });
  it("do-while runs its body once even when the condition starts false; for and while run it zero times", () => {
    expect(loopSteps({ loop: "do-while", start: 10, end: 5, step: 1, cmp: "<=" }).bodyRuns).toBe(1);
    expect(loopSteps({ loop: "for", start: 10, end: 5, step: 1, cmp: "<=" }).bodyRuns).toBe(0);
    expect(loopSteps({ loop: "while", start: 10, end: 5, step: 1, cmp: "<=" }).bodyRuns).toBe(0);
  });
  it("a condition that never becomes false is cut off and flagged as endless", () => {
    const g = loopSteps({ loop: "while", start: 1, end: 5, step: -1, cmp: "<=" });
    expect(g.endless).toBe(true);
    expect(g.steps.length).toBeLessThan(200);
  });
  it("output and number of body runs equal a real g++ run for every loop kind", () => {
    if (!have) return;
    for (const p of cases) {
      const r = compileRun(loopProgram(p));
      expect(r.compiled, `${p.loop} compiled\n${loopProgram(p)}`).toBe(true);
      const g = loopSteps(p);
      expect(r.out.trim(), JSON.stringify(p)).toBe(`${g.output}|${g.bodyRuns}`);
    }
  });
});

import { arrayCells, callFrames, cellCount, factorialOf, flatIndex, type Dims } from "@/lib/visuals/scene3d";
describe("3-D scene helpers", () => {
  it("a 3-D array has layers x rows x columns cells, numbered row-major like real C++ memory", () => {
    const d: Dims = [2, 3, 4];
    const cells = arrayCells(d);
    expect(cells).toHaveLength(24);
    expect(cellCount(d)).toBe(24);
    cells.forEach((c, i) => { expect(c.flat).toBe(i); expect(flatIndex(d, c.l, c.r, c.c)).toBe(i); });
    expect(flatIndex(d, 1, 0, 0)).toBe(12);
    expect(flatIndex(d, 0, 2, 3)).toBe(11);
  });
  it("flat index equals the address offset a real compiler uses (g++ checks &a[l][r][c] - &a[0][0][0])", () => {
    if (!have) return;
    const d: Dims = [2, 3, 4];
    const probes = [[0, 0, 0], [0, 0, 3], [0, 2, 1], [1, 0, 0], [1, 2, 3]];
    const prog = `#include <iostream>\nusing namespace std;\nint main(){ int a[2][3][4]; int* b = &a[0][0][0];\n${probes.map(([l, r, c]) => `cout << (&a[${l}][${r}][${c}] - b) << " ";`).join("\n")}\nreturn 0; }\n`;
    const r = compileRun(prog);
    expect(r.compiled).toBe(true);
    expect(r.out.trim().split(/\s+/).map(Number)).toEqual(probes.map(([l, rr, c]) => flatIndex(d, l, rr, c)));
  });
  it("call frames list the newest call last and factorial values are right", () => {
    expect(callFrames(4, 3).map((f) => f.label)).toEqual(["factorial(4)", "factorial(3)", "factorial(2)"]);
    expect(callFrames(4, 99)).toHaveLength(4);
    expect([1, 2, 3, 4, 5, 6].map(factorialOf)).toEqual([1, 2, 6, 24, 120, 720]);
  });
});
