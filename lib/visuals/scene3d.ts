// Pure helpers for the 3D scenes (and their 2D fallbacks). Unit-tested in tests/visuals.test.ts.
export type Dims = [number, number, number];

/** Every cell of a 3-D array a[L][R][C] with its position in memory (row-major: the last index changes fastest). */
export function arrayCells(d: Dims): { l: number; r: number; c: number; flat: number }[] {
  const out: { l: number; r: number; c: number; flat: number }[] = [];
  let flat = 0;
  for (let l = 0; l < d[0]; l++) for (let r = 0; r < d[1]; r++) for (let c = 0; c < d[2]; c++) out.push({ l, r, c, flat: flat++ });
  return out;
}
export const flatIndex = (d: Dims, l: number, r: number, c: number) => (l * d[1] + r) * d[2] + c;
export const cellCount = (d: Dims) => d[0] * d[1] * d[2];

/** Frames of factorial(depth) after `pushed` calls have been made (newest last). */
export function callFrames(depth: number, pushed: number): { label: string; n: number }[] {
  return Array.from({ length: Math.max(0, Math.min(pushed, depth)) }, (_, k) => ({ label: `factorial(${depth - k})`, n: depth - k }));
}
/** The value a frame returns once everything above it has returned. */
export const factorialOf = (n: number): number => (n <= 1 ? 1 : n * factorialOf(n - 1));
