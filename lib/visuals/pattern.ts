// Pattern builder: which character appears in which cell, plus the loop formula that produces it.
export type Shape = "right-triangle" | "inverted-triangle" | "pyramid" | "diamond" | "square" | "hollow-square" | "number-triangle" | "multiplication-table";
export type PatternResult = { rows: string[][]; formula: string[]; code: string };

const stars = (k: number) => Array.from({ length: k }, () => "*");
const pad = (k: number) => Array.from({ length: k }, () => " ");

export function pattern(shape: Shape, n: number): PatternResult {
  const rows: string[][] = [];
  switch (shape) {
    case "right-triangle":
      for (let r = 1; r <= n; r++) rows.push(stars(r));
      return { rows, formula: ["outer loop i = 1 to n: one row per i", "inner loop j = 1 to i: print *", "row i has i stars"], code: `for (int i = 1; i <= n; i++) {\n    for (int j = 1; j <= i; j++) cout << "*";\n    cout << endl;\n}` };
    case "inverted-triangle":
      for (let r = 1; r <= n; r++) rows.push(stars(n - r + 1));
      return { rows, formula: ["outer loop i = 1 to n", "inner loop j = 1 to n - i + 1: print *", "row i has n - i + 1 stars"], code: `for (int i = 1; i <= n; i++) {\n    for (int j = 1; j <= n - i + 1; j++) cout << "*";\n    cout << endl;\n}` };
    case "pyramid":
      for (let r = 1; r <= n; r++) rows.push([...pad(n - r), ...stars(2 * r - 1)]);
      return { rows, formula: ["outer loop i = 1 to n", "first inner loop: n - i spaces", "second inner loop: 2i - 1 stars"], code: `for (int i = 1; i <= n; i++) {\n    for (int s = 1; s <= n - i; s++) cout << " ";\n    for (int j = 1; j <= 2 * i - 1; j++) cout << "*";\n    cout << endl;\n}` };
    case "diamond":
      for (let r = 1; r <= n; r++) rows.push([...pad(n - r), ...stars(2 * r - 1)]);
      for (let r = n - 1; r >= 1; r--) rows.push([...pad(n - r), ...stars(2 * r - 1)]);
      return { rows, formula: ["upper half: pyramid with i = 1 to n", "lower half: i = n - 1 down to 1", "same spaces and stars formula in both halves"], code: `for (int i = 1; i <= n; i++) {\n    for (int s = 1; s <= n - i; s++) cout << " ";\n    for (int j = 1; j <= 2 * i - 1; j++) cout << "*";\n    cout << endl;\n}\nfor (int i = n - 1; i >= 1; i--) {\n    for (int s = 1; s <= n - i; s++) cout << " ";\n    for (int j = 1; j <= 2 * i - 1; j++) cout << "*";\n    cout << endl;\n}` };
    case "square":
      for (let r = 1; r <= n; r++) rows.push(stars(n));
      return { rows, formula: ["outer loop i = 1 to n: rows", "inner loop j = 1 to n: columns", "every cell prints *"], code: `for (int i = 1; i <= n; i++) {\n    for (int j = 1; j <= n; j++) cout << "*";\n    cout << endl;\n}` };
    case "hollow-square":
      for (let r = 1; r <= n; r++) rows.push(Array.from({ length: n }, (_, c) => (r === 1 || r === n || c === 0 || c === n - 1 ? "*" : " ")));
      return { rows, formula: ["print * only on the border", "border = first/last row or first/last column", "condition: i == 1 || i == n || j == 1 || j == n"], code: `for (int i = 1; i <= n; i++) {\n    for (int j = 1; j <= n; j++) {\n        if (i == 1 || i == n || j == 1 || j == n) cout << "*";\n        else cout << " ";\n    }\n    cout << endl;\n}` };
    case "number-triangle":
      for (let r = 1; r <= n; r++) rows.push(Array.from({ length: r }, (_, c) => String(c + 1)));
      return { rows, formula: ["outer loop i = 1 to n", "inner loop j = 1 to i: print j", "row i prints 1, 2, ... i"], code: `for (int i = 1; i <= n; i++) {\n    for (int j = 1; j <= i; j++) cout << j;\n    cout << endl;\n}` };
    case "multiplication-table":
      for (let r = 1; r <= n; r++) rows.push(Array.from({ length: n }, (_, c) => String(r * (c + 1))));
      return { rows, formula: ["outer loop i = 1 to n: rows", "inner loop j = 1 to n: columns", "each cell prints i * j"], code: `for (int i = 1; i <= n; i++) {\n    for (int j = 1; j <= n; j++) cout << i * j << " ";\n    cout << endl;\n}` };
  }
}

/** Cell visiting order for the animation: row by row. `cell` index k -> (row, col). */
export const cellOrder = (rows: string[][]): [number, number][] => rows.flatMap((r, i) => r.map((_, j) => [i, j] as [number, number]));
export const renderRows = (rows: string[][], sep = ""): string => rows.map((r) => r.join(sep)).join("\n");
