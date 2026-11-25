// Function-overloading resolver (simplified, course-level): which overload does the compiler pick for the given argument types?
// Ranking per argument: exact match (3) > promotion (2: char/bool -> int) > conversion (1: int <-> double, char/bool -> double).
export type T = "int" | "double" | "char" | "string" | "bool";
export type Overload = { sig: string; params: T[] };
export type Resolution = { chosen: number | null; status: "exact" | "promotion" | "conversion" | "ambiguous" | "none"; reason: string; ranks: (number[] | null)[] };

function rank(arg: T, param: T): number {
  if (arg === param) return 3;
  if ((arg === "char" || arg === "bool") && param === "int") return 2; // integral promotion
  const num = (t: T) => t === "int" || t === "double" || t === "char" || t === "bool";
  if (num(arg) && num(param)) return 1; // standard conversion
  return 0; // not convertible (e.g. string <-> number)
}

export function resolveOverload(overloads: Overload[], args: T[]): Resolution {
  const ranks = overloads.map((o) => (o.params.length === args.length ? args.map((a, i) => rank(a, o.params[i])) : null));
  const viable = ranks.map((r, i) => ({ r, i })).filter((x): x is { r: number[]; i: number } => x.r !== null && x.r.every((v) => v > 0));
  if (!viable.length) return { chosen: null, status: "none", reason: "No overload matches this number and type of arguments: compile error (no matching function).", ranks };
  // The best candidate must be at least as good as every other in every argument and strictly better in one (C++ rule).
  const best = viable.filter((v) => viable.every((w) => w.i === v.i || (v.r.every((x, k) => x >= w.r[k]) && v.r.some((x, k) => x > w.r[k]))));
  if (best.length !== 1) return { chosen: null, status: "ambiguous", reason: "Two or more overloads fit equally well: compile error (ambiguous call).", ranks };
  const c = best[0];
  const min = Math.min(...c.r);
  const status = min === 3 ? "exact" : min === 2 ? "promotion" : "conversion";
  return { chosen: c.i, status, ranks, reason: status === "exact" ? "Exact match for every argument." : status === "promotion" ? "No exact match; char/bool is promoted to int." : "No exact match; the arguments are converted (for example int to double)." };
}
