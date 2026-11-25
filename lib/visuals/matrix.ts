// Step generators for the matrix visualizer. Pure and unit-tested.
export type Cell = [number, number];
export type MatrixStep = { res: (number | null)[][]; hiA: Cell[]; hiB: Cell[]; hiRes: Cell[]; note: string; vars: Record<string, string> };
export type Op = "add" | "transpose" | "multiply" | "search" | "count-even" | "diagonal";

const blank = (r: number, c: number): (number | null)[][] => Array.from({ length: r }, () => Array.from({ length: c }, () => null));
const copy = (m: (number | null)[][]) => m.map((r) => [...r]);

export function matrixSteps(op: Op, a: number[][], b?: number[][]): MatrixStep[] {
  const R = a.length, C = a[0].length;
  const steps: MatrixStep[] = [];
  if (op === "add") {
    const B = b && b.length === R && b[0].length === C ? b : a;
    const res = blank(R, C);
    steps.push({ res: copy(res), hiA: [], hiB: [], hiRes: [], vars: {}, note: `Add matrices of the SAME size (${R}x${C}): add the elements in the same position.` });
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      res[i][j] = a[i][j] + B[i][j];
      steps.push({ res: copy(res), hiA: [[i, j]], hiB: [[i, j]], hiRes: [[i, j]], vars: { i: String(i), j: String(j) }, note: `c[${i}][${j}] = a[${i}][${j}] + b[${i}][${j}] = ${a[i][j]} + ${B[i][j]} = ${res[i][j]}.` });
    }
  } else if (op === "transpose") {
    const res = blank(C, R);
    steps.push({ res: copy(res), hiA: [], hiB: [], hiRes: [], vars: {}, note: `Transpose: rows become columns. A ${R}x${C} matrix becomes ${C}x${R}.` });
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      res[j][i] = a[i][j];
      steps.push({ res: copy(res), hiA: [[i, j]], hiB: [], hiRes: [[j, i]], vars: { i: String(i), j: String(j) }, note: `t[${j}][${i}] = a[${i}][${j}] = ${a[i][j]}.` });
    }
  } else if (op === "multiply") {
    const B = b ?? a;
    const K = B[0].length;
    if (C !== B.length) return [{ res: blank(R, K), hiA: [], hiB: [], hiRes: [], vars: {}, note: `Cannot multiply: columns of A (${C}) must equal rows of B (${B.length}).` }];
    const res = blank(R, K);
    steps.push({ res: copy(res), hiA: [], hiB: [], hiRes: [], vars: {}, note: `Multiply A (${R}x${C}) by B (${B.length}x${K}): the result is ${R}x${K}. Each cell = row of A times column of B.` });
    for (let i = 0; i < R; i++) for (let k = 0; k < K; k++) {
      let sum = 0;
      const parts: string[] = [];
      const hiA: Cell[] = [], hiB: Cell[] = [];
      for (let j = 0; j < C; j++) { sum += a[i][j] * B[j][k]; parts.push(`${a[i][j]}x${B[j][k]}`); hiA.push([i, j]); hiB.push([j, k]); }
      res[i][k] = sum;
      steps.push({ res: copy(res), hiA, hiB, hiRes: [[i, k]], vars: { i: String(i), k: String(k) }, note: `c[${i}][${k}] = ${parts.join(" + ")} = ${sum}.` });
    }
  } else if (op === "search") {
    let best = a[0][0], bi = 0, bj = 0;
    steps.push({ res: blank(0, 0), hiA: [[0, 0]], hiB: [], hiRes: [], vars: { max: String(best) }, note: "Search for the largest element: start with a[0][0]." });
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      if (i === 0 && j === 0) continue;
      const better = a[i][j] > best;
      if (better) { best = a[i][j]; bi = i; bj = j; }
      steps.push({ res: blank(0, 0), hiA: [[i, j]], hiB: [], hiRes: [], vars: { max: String(best), row: String(bi), col: String(bj) }, note: `a[${i}][${j}] = ${a[i][j]}: ${better ? "new largest" : "not larger"}.` });
    }
    steps.push({ res: blank(0, 0), hiA: [[bi, bj]], hiB: [], hiRes: [], vars: { max: String(best), row: String(bi), col: String(bj) }, note: `Largest = ${best} at row ${bi}, column ${bj}.` });
  } else if (op === "count-even") {
    let count = 0;
    steps.push({ res: blank(0, 0), hiA: [], hiB: [], hiRes: [], vars: { count: "0" }, note: "Count the even numbers: check every element with % 2 == 0." });
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      const even = a[i][j] % 2 === 0;
      if (even) count++;
      steps.push({ res: blank(0, 0), hiA: [[i, j]], hiB: [], hiRes: [], vars: { count: String(count) }, note: `${a[i][j]} % 2 == ${a[i][j] % 2}: ${even ? "even, count = " + count : "odd"}.` });
    }
  } else if (op === "diagonal") {
    let s = 0;
    steps.push({ res: blank(0, 0), hiA: [], hiB: [], hiRes: [], vars: { sum: "0" }, note: "Sum of the main diagonal: the elements where row == column." });
    for (let i = 0; i < Math.min(R, C); i++) { s += a[i][i]; steps.push({ res: blank(0, 0), hiA: [[i, i]], hiB: [], hiRes: [], vars: { sum: String(s) }, note: `sum = sum + a[${i}][${i}] = ${s}.` }); }
  }
  return steps;
}
