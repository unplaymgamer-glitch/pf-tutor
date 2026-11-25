import { z } from "zod";

// Hand-authored step trace. The verifier checks that all `out` text, concatenated, equals the real program output.
export const Trace = z.object({
  steps: z.array(z.object({
    line: z.number().int().positive(),                  // line in the sample's code (1-based)
    vars: z.record(z.string(), z.string()).default({}),  // variable name -> value shown after this step
    note: z.string(),                                    // plain-language explanation
    out: z.string().default(""),                         // text printed by this step
    // Optional call stack after this step (outermost first). Used by the function / recursion lessons.
    stack: z.array(z.object({ fn: z.string(), vars: z.record(z.string(), z.string()).default({}) })).optional(),
  })).min(1),
  types: z.record(z.string(), z.string()).default({}),   // variable name -> C++ type for the memory-box view
});
export type Trace = z.infer<typeof Trace>;

// One verified code sample. expectedOutput is checked against a real g++ run (scripts/verify-content.mts).
export const CodeSample = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  code: z.string().min(1),
  stdin: z.string().default(""),
  graphics: z.boolean().default(false), // graphics.h program: only type-checked against a stub header, drawn by the Graphics visual (expectedOutput stays empty)
  expectedOutput: z.string(), // exact stdout
  explanation: z.array(z.object({ line: z.number().int().positive(), text: z.string() })).default([]),
  trace: Trace.optional(),
});
export type CodeSample = z.infer<typeof CodeSample>;

const NumVar = z.object({ name: z.string(), label: z.string().optional(), min: z.number(), max: z.number(), value: z.number() });

// Interactive visuals for the Visualize tab (rendered by components/visuals/*).
export const Visual = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pipeline"), title: z.string(), stages: z.array(z.object({ name: z.string(), detail: z.string() })).min(2) }),
  z.object({ kind: z.literal("trace"), title: z.string() }), // uses the sample's trace
  z.object({
    kind: z.literal("decision"), title: z.string(), vars: z.array(NumVar).min(1),
    branches: z.array(z.object({ expr: z.string(), label: z.string() })).min(1), // first true wins
    elseLabel: z.string().optional(),
  }),
  z.object({ kind: z.literal("truth"), title: z.string(), op: z.enum(["and", "or", "not"]) }),
  z.object({ kind: z.literal("switch"), title: z.string(), min: z.number(), max: z.number(), value: z.number(),
    cases: z.array(z.object({ value: z.number(), text: z.string(), breaks: z.boolean().default(true) })), defaultText: z.string().optional() }),
  z.object({ kind: z.literal("match"), title: z.string(), pairs: z.array(z.object({ term: z.string(), meaning: z.string() })).min(2) }),
  // Arrays: indexed boxes. access = read/write by index (shows index vs size and out-of-bounds), search = linear search sweep,
  // minmax = running min/max, sum = running total, reverse = swapping from both ends.
  z.object({ kind: z.literal("array"), title: z.string(), mode: z.enum(["access", "search", "minmax", "sum", "reverse"]), values: z.array(z.number().int().min(-99).max(999)).min(2).max(12), target: z.number().int().optional() }),
  // Sorting bars with comparison/swap counters and code-line sync. compare = run both algorithms on the same input side by side.
  z.object({ kind: z.literal("sort"), title: z.string(), algo: z.enum(["bubble", "selection"]), values: z.array(z.number().int().min(1).max(99)).min(3).max(12), compare: z.boolean().default(false) }),
  // Nested-loop pattern builder: the pattern appears cell by cell with row/column counters and the loop formula.
  z.object({ kind: z.literal("pattern"), title: z.string(), shape: z.enum(["right-triangle", "inverted-triangle", "pyramid", "diamond", "square", "hollow-square", "number-triangle", "multiplication-table"]), n: z.number().int().min(2).max(8).default(4) }),
  // Matrices: add / transpose / multiply step by step, search / count highlight.
  z.object({ kind: z.literal("matrix"), title: z.string(), op: z.enum(["add", "transpose", "multiply", "search", "count-even", "diagonal"]), a: z.array(z.array(z.number().int().min(-9).max(99)).min(1).max(4)).min(1).max(4), b: z.array(z.array(z.number().int().min(-9).max(99)).min(1).max(4)).min(1).max(4).optional() }),
  // Function overloading: pick argument types and see which overload the compiler chooses.
  z.object({ kind: z.literal("memory"), title: z.string(),
    cells: z.array(z.object({ name: z.string(), type: z.string(), addr: z.string() })).min(1).max(10), // variables in memory with made-up addresses
    steps: z.array(z.object({ code: z.string().default(""), note: z.string(),
      values: z.record(z.string(), z.string()).default({}), // cell name -> value shown after this step
      points: z.record(z.string(), z.string()).default({}), // pointer cell name -> name of the cell it points to
    })).min(2).max(16) }),
  z.object({ kind: z.literal("recursion"), title: z.string(), fn: z.enum(["factorial", "fibonacci", "sum", "power", "gcd", "countdown"]), n: z.number().int().min(1).max(8).default(4), m: z.number().int().min(1).max(12).optional() }),
  z.object({ kind: z.literal("loop"), title: z.string(), loop: z.enum(["for", "while", "do-while"]), start: z.number().int().min(-50).max(50).default(1), end: z.number().int().min(-50).max(50).default(5),
    step: z.number().int().min(-10).max(10).refine((n) => n !== 0, "step cannot be 0").default(1), cmp: z.enum(["<", "<=", ">", ">="]).default("<="),
    jump: z.object({ type: z.enum(["break", "continue"]), at: z.number().int().min(-50).max(50) }).optional() }),
  z.object({ kind: z.literal("scene3d"), title: z.string(), scene: z.enum(["array-layers", "stack-heap", "call-stack"]),
    dims: z.tuple([z.number().int().min(1).max(4), z.number().int().min(1).max(4), z.number().int().min(1).max(5)]).optional(), depth: z.number().int().min(2).max(6).optional() }),
  z.object({ kind: z.literal("canvas"), title: z.string(), sampleId: z.string() }), // draws the graphics.h sample with that id
  z.object({ kind: z.literal("resolver"), title: z.string(), overloads: z.array(z.object({ sig: z.string(), params: z.array(z.enum(["int", "double", "char", "string", "bool"])) })).min(2).max(5), argTypes: z.array(z.enum(["int", "double", "char", "string", "bool"])).min(1).max(3) }),
]);
export type Visual = z.infer<typeof Visual>;

export const Worked = z.object({
  level: z.enum(["basic", "intermediate", "exam"]),
  problem: z.string(),
  pseudocode: z.array(z.string()).min(1),
  flowchartMermaid: z.string().optional(),
  sample: CodeSample,
});

export const Question = z.object({
  id: z.string(),
  type: z.enum(["mcq", "output", "bug", "blank", "write"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prompt: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  hint: z.string(),
  explanation: z.string(),
  sampleId: z.string().optional(), // predict-the-output questions reference a verified sample
});

export const Topic = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  week: z.number().int().min(1).max(16),
  title: z.string(),
  defaultView: z.enum(["visualize", "code", "algorithm"]),
  order: z.number().int().default(0),
  visuals: z.array(Visual).default([]),
  goal: z.string(),
  warmup: z.string(),
  definition: z.string(),
  howItWorks: z.string(),
  syntax: z.string(),
  worked: z.array(Worked).min(1),
  variations: z.array(z.object({ way: z.string(), when: z.string(), example: z.string() })).default([]),
  mistakes: z.array(z.object({ wrong: z.string(), right: z.string(), error: z.string() })).default([]),
  examTips: z.array(z.string()).default([]),
  romanSummary: z.array(z.string()).min(1),
  practice: z.array(Question).default([]),
  quiz: z.array(Question).default([]),
  sources: z.array(z.string()).default([]), // outline topics this page covers (feeds CONTENT_COVERAGE.md)
});
export type Topic = z.infer<typeof Topic>;

export function allSamples(t: Topic): CodeSample[] {
  return t.worked.map((w) => w.sample);
}

/** Normalise line endings and trailing whitespace so comparison is fair but strict on content. */
export function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\s+$/, "");
}
