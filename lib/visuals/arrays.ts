// Step generators for the array visualizer (search, min/max, sum, reverse). Pure; the "access" mode is interactive in the component.
export type ArrayMode = "access" | "search" | "minmax" | "sum" | "reverse";
export type ArrayStep = { arr: number[]; hi: number[]; vars: Record<string, string>; note: string; found?: number };

export function arraySteps(mode: ArrayMode, values: number[], target?: number): ArrayStep[] {
  const a = [...values];
  const n = a.length;
  const steps: ArrayStep[] = [];
  if (mode === "search") {
    const t = target ?? a[Math.min(2, n - 1)];
    steps.push({ arr: [...a], hi: [], vars: { target: String(t), comparisons: "0" }, note: `Linear search: look for ${t} by checking every box from index 0.` });
    for (let i = 0; i < n; i++) {
      const hit = a[i] === t;
      steps.push({ arr: [...a], hi: [i], vars: { target: String(t), i: String(i), comparisons: String(i + 1) }, found: hit ? i : undefined, note: `Check a[${i}] = ${a[i]}: ${hit ? `equal to ${t}. Found at index ${i} after ${i + 1} comparison(s). Stop.` : `not ${t}, move on.`}` });
      if (hit) return steps;
    }
    steps.push({ arr: [...a], hi: [], vars: { target: String(t), comparisons: String(n) }, note: `Checked all ${n} elements: ${t} is not in the array (the program would print "not found").` });
  } else if (mode === "minmax") {
    let mn = a[0], mx = a[0];
    steps.push({ arr: [...a], hi: [0], vars: { min: String(mn), max: String(mx) }, note: `Start: assume the first element ${a[0]} is both the smallest and the largest.` });
    for (let i = 1; i < n; i++) {
      const notes: string[] = [];
      if (a[i] < mn) { mn = a[i]; notes.push(`new minimum ${mn}`); }
      if (a[i] > mx) { mx = a[i]; notes.push(`new maximum ${mx}`); }
      steps.push({ arr: [...a], hi: [i], vars: { i: String(i), min: String(mn), max: String(mx) }, note: `a[${i}] = ${a[i]}: ${notes.length ? notes.join(" and ") : "no change"}.` });
    }
    steps.push({ arr: [...a], hi: [], vars: { min: String(mn), max: String(mx) }, note: `Done: smallest = ${mn}, largest = ${mx}.` });
  } else if (mode === "sum") {
    let s = 0;
    steps.push({ arr: [...a], hi: [], vars: { sum: "0" }, note: "Start with sum = 0." });
    for (let i = 0; i < n; i++) { s += a[i]; steps.push({ arr: [...a], hi: [i], vars: { i: String(i), sum: String(s) }, note: `sum = sum + a[${i}] = ${s - a[i]} + ${a[i]} = ${s}.` }); }
    steps.push({ arr: [...a], hi: [], vars: { sum: String(s), average: (s / n).toFixed(2) }, note: `Total ${s}. Average = ${s} / ${n} = ${(s / n).toFixed(2)}.` });
  } else if (mode === "reverse") {
    steps.push({ arr: [...a], hi: [], vars: {}, note: "Swap the first and last, then the second and second-last, and so on until the middle." });
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const j = n - 1 - i;
      [a[i], a[j]] = [a[j], a[i]];
      steps.push({ arr: [...a], hi: [i, j], vars: { i: String(i), j: String(j) }, note: `Swap a[${i}] and a[${j}].` });
    }
    steps.push({ arr: [...a], hi: [], vars: {}, note: `Reversed: [${a.join(", ")}].` });
  }
  return steps;
}
