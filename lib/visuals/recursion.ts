// Step generator for the recursion visual: a call stack that grows, hits the base case and unwinds with return values.
// Values are computed by really evaluating the recursion (tests compare results and call counts with g++).
export type RecFn = "factorial" | "fibonacci" | "sum" | "power" | "gcd" | "countdown";
export type Frame = { label: string; status: "active" | "waiting" | "returning"; ret?: string };
export type RecStep = { stack: Frame[]; note: string; out: string };

type Def = {
  label: (a: number[]) => string;
  base: (a: number[]) => number | null; // value when this is the base case
  children: (a: number[]) => number[][];
  combine: (a: number[], r: number[]) => { value: number; expr: string };
  print?: (a: number[]) => string; // printed on the way down (countdown)
  baseText: (a: number[], v: number) => string;
  isVoid?: boolean;
};

const DEFS: Record<RecFn, Def> = {
  factorial: {
    label: ([n]) => `factorial(${n})`, base: ([n]) => (n <= 1 ? 1 : null), children: ([n]) => [[n - 1]],
    combine: ([n], [r]) => ({ value: n * r, expr: `${n} × ${r} = ${n * r}` }), baseText: ([n]) => `Base case: n is ${n}, so factorial(${n}) is 1.`,
  },
  fibonacci: {
    label: ([n]) => `fib(${n})`, base: ([n]) => (n <= 1 ? n : null), children: ([n]) => [[n - 1], [n - 2]],
    combine: (_a, [a, b]) => ({ value: a + b, expr: `${a} + ${b} = ${a + b}` }), baseText: ([n]) => `Base case: fib(${n}) is ${n}.`,
  },
  sum: {
    label: ([n]) => `sum(${n})`, base: ([n]) => (n <= 1 ? 1 : null), children: ([n]) => [[n - 1]],
    combine: ([n], [r]) => ({ value: n + r, expr: `${n} + ${r} = ${n + r}` }), baseText: () => "Base case: sum(1) is 1.",
  },
  power: {
    label: ([b, e]) => `power(${b}, ${e})`, base: ([, e]) => (e === 0 ? 1 : null), children: ([b, e]) => [[b, e - 1]],
    combine: ([b], [r]) => ({ value: b * r, expr: `${b} × ${r} = ${b * r}` }), baseText: () => "Base case: anything to the power 0 is 1.",
  },
  gcd: {
    label: ([a, b]) => `gcd(${a}, ${b})`, base: ([a, b]) => (b === 0 ? a : null), children: ([a, b]) => [[b, a % b]],
    combine: (_a, [r]) => ({ value: r, expr: `same answer ${r}` }), baseText: ([a]) => `Base case: b is 0, so the answer is ${a}.`,
  },
  countdown: {
    label: ([n]) => `countdown(${n})`, base: ([n]) => (n === 0 ? 0 : null), children: ([n]) => [[n - 1]], isVoid: true,
    print: ([n]) => (n === 0 ? "" : `${n}\n`),
    combine: () => ({ value: 0, expr: "nothing left to do" }), baseText: () => "Base case: n is 0, print Go! and stop.",
  },
};

/** Arguments for a visual's parameters: n is the main argument; m is the second one (power: base, gcd: second number). */
export function recursionArgs(fn: RecFn, n: number, m?: number): number[] {
  if (fn === "power") return [m ?? 2, n];
  if (fn === "gcd") return [n, m ?? 4];
  return [n];
}

export function recursionSteps(fn: RecFn, n: number, m?: number): { steps: RecStep[]; result: number; calls: number; maxDepth: number } {
  const d = DEFS[fn];
  const steps: RecStep[] = [];
  const stack: Frame[] = [];
  let out = "", calls = 0, maxDepth = 0;
  const snap = (note: string) => steps.push({ stack: stack.map((f) => ({ ...f })), note, out });
  const setStatus = () => stack.forEach((f, i) => { if (f.status !== "returning") f.status = i === stack.length - 1 ? "active" : "waiting"; });

  const run = (a: number[]): number => {
    calls++;
    stack.push({ label: d.label(a), status: "active" });
    maxDepth = Math.max(maxDepth, stack.length);
    setStatus();
    if (d.print) out += d.print(a);
    const b = d.base(a);
    if (b !== null) {
      if (fn === "countdown") out += "Go!\n";
      snap(`Call ${d.label(a)}. ${d.baseText(a, b)}`);
      stack[stack.length - 1].status = "returning"; stack[stack.length - 1].ret = d.isVoid ? "done" : String(b);
      snap(`${d.label(a)} returns ${d.isVoid ? "(nothing)" : b} to its caller.`);
      stack.pop(); setStatus();
      return b;
    }
    snap(`Call ${d.label(a)}. Not the base case, so it calls itself with a smaller problem and waits.`);
    const rs: number[] = [];
    for (const c of d.children(a)) { rs.push(run(c)); }
    const { value, expr } = d.combine(a, rs);
    stack[stack.length - 1].status = "returning"; stack[stack.length - 1].ret = d.isVoid ? "done" : String(value);
    snap(`${d.label(a)} gets its answer back${d.isVoid ? "" : `: ${expr}`}. It returns ${d.isVoid ? "(nothing)" : value}.`);
    stack.pop(); setStatus();
    return value;
  };
  const result = run(recursionArgs(fn, n, m));
  return { steps, result, calls, maxDepth };
}

/** A C++ program that prints the result and the number of calls, used to check the generator against g++. */
export function recursionProgram(fn: RecFn, n: number, m?: number): string {
  const a = recursionArgs(fn, n, m);
  const body: Record<RecFn, string> = {
    factorial: "long f(int n){ calls++; if(n<=1) return 1; return n*f(n-1); }",
    fibonacci: "long f(int n){ calls++; if(n<=1) return n; return f(n-1)+f(n-2); }",
    sum: "long f(int n){ calls++; if(n<=1) return 1; return n+f(n-1); }",
    power: "long f(int b,int e){ calls++; if(e==0) return 1; return b*f(b,e-1); }",
    gcd: "long f(int a,int b){ calls++; if(b==0) return a; return f(b,a%b); }",
    countdown: "long f(int n){ calls++; if(n==0){ return 0; } return f(n-1); }",
  };
  return `#include <iostream>\nusing namespace std;\nlong calls = 0;\n${body[fn]}\nint main(){ long r = f(${a.join(", ")}); cout << r << \" \" << calls << endl; }\n`;
}
