// Step generators for the sorting visualizer. Pure functions; the same loops as the C++ code shown beside the animation.
// tests/visuals.test.ts compiles that C++ with g++ and checks comparisons, swaps and the result against these steps.
export type SortAlgo = "bubble" | "selection";
export type SortStep = {
  arr: number[];
  compare?: [number, number];   // the two indexes being compared
  swapped?: boolean;            // this step swapped two elements
  minIdx?: number;              // selection sort: index of the smallest value found so far
  sorted: number[];             // indexes already in their final place
  pass: number;                 // outer loop counter i (0-based)
  comparisons: number;
  swaps: number;
  line: number;                 // 1-based line of SORT_CODE[algo] to highlight
  note: string;
};

export const SORT_CODE: Record<SortAlgo, string> = {
  bubble: `for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - 1 - i; j++) {
        if (a[j] > a[j + 1]) {
            int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
        }
    }
}`,
  selection: `for (int i = 0; i < n - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < n; j++) {
        if (a[j] < a[minIdx]) minIdx = j;
    }
    if (minIdx != i) { int t = a[i]; a[i] = a[minIdx]; a[minIdx] = t; }
}`,
};

export function sortSteps(algo: SortAlgo, values: number[]): SortStep[] {
  const a = [...values];
  const n = a.length;
  const steps: SortStep[] = [];
  const sorted: number[] = [];
  let comparisons = 0, swaps = 0;
  const push = (s: Partial<SortStep> & { line: number; note: string; pass: number }) =>
    steps.push({ arr: [...a], sorted: [...sorted], comparisons, swaps, ...s });

  push({ line: 1, pass: 0, note: `Start: [${a.join(", ")}]. ${algo === "bubble" ? "Bubble sort repeatedly compares neighbours and swaps them if they are in the wrong order." : "Selection sort finds the smallest value in the unsorted part and puts it in front."}` });

  if (algo === "bubble") {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        comparisons++;
        const wrong = a[j] > a[j + 1];
        push({ line: 3, pass: i, compare: [j, j + 1], note: `Compare a[${j}]=${a[j]} and a[${j + 1}]=${a[j + 1]}: ${wrong ? "left is bigger, so swap" : "already in order, no swap"}.` });
        if (wrong) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swaps++;
          push({ line: 4, pass: i, compare: [j, j + 1], swapped: true, note: `Swapped. Now a[${j}]=${a[j]} and a[${j + 1}]=${a[j + 1]}.` });
        }
      }
      sorted.push(n - 1 - i);
      push({ line: 1, pass: i, note: `Pass ${i + 1} finished: the largest remaining value (${a[n - 1 - i]}) has bubbled to position ${n - 1 - i}.` });
    }
  } else {
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      push({ line: 2, pass: i, minIdx, note: `Pass ${i + 1}: assume the smallest is at index ${i} (value ${a[i]}).` });
      for (let j = i + 1; j < n; j++) {
        comparisons++;
        const smaller = a[j] < a[minIdx];
        const prev = minIdx;
        if (smaller) minIdx = j;
        push({ line: 4, pass: i, compare: [prev, j], minIdx, note: `Compare a[${j}]=${a[j]} with the smallest so far a[${prev}]=${a[prev]}: ${smaller ? `smaller, new minimum at index ${j}` : "not smaller, keep the minimum"}.` });
      }
      if (minIdx !== i) {
        [a[i], a[minIdx]] = [a[minIdx], a[i]];
        swaps++;
        sorted.push(i);
        push({ line: 6, pass: i, compare: [i, minIdx], swapped: true, minIdx, note: `Swap the smallest (${a[i]}) into position ${i}.` });
      } else {
        sorted.push(i);
        push({ line: 6, pass: i, minIdx, note: `The smallest is already at index ${i}: no swap needed.` });
      }
    }
  }
  sorted.push(...Array.from({ length: n }, (_, k) => k).filter((k) => !sorted.includes(k)));
  push({ line: 1, pass: n - 1, note: `Sorted: [${a.join(", ")}] after ${comparisons} comparisons and ${swaps} swaps.` });
  return steps;
}

/** A complete C++ program running the SAME loops with counters, used by tests to verify the generator against real execution. */
export function sortProgram(algo: SortAlgo, values: number[]): string {
  // Counters are added around the displayed lines without changing them: one statement before the comparison line,
  // and one inside the swap.
  const lines = SORT_CODE[algo].split("\n");
  const body =
    algo === "bubble"
      ? [lines[0], lines[1], "        comparisons++;", lines[2], "            swaps++;", ...lines.slice(3)]
      : [lines[0], lines[1], lines[2], "        comparisons++;", lines[3], lines[4], lines[5].replace("{ int t", "{ swaps++; int t"), lines[6]];
  return `#include <iostream>
using namespace std;
int main() {
    int a[] = {${values.join(", ")}};
    int n = ${values.length};
    int comparisons = 0, swaps = 0;
${body.map((l) => "    " + l).join("\n")}
    cout << comparisons << " " << swaps << " ";
    for (int k = 0; k < n; k++) cout << a[k] << (k + 1 < n ? "," : "");
    return 0;
}
`;
}
