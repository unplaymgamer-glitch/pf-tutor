// Tiny, safe C++-style expression evaluator for the interactive decision visuals. No eval().
// Supports: numbers, identifiers, ! - unary, * / %, + -, < <= > >=, == !=, &&, ||, parentheses.
type Tok = { t: "num" | "id" | "op"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(&&|\|\||==|!=|<=|>=|[-+*/%<>!()]))/y;
  let i = 0;
  while (i < src.length) {
    if (/^\s*$/.test(src.slice(i))) break;
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new Error(`Unexpected character at ${i}`);
    out.push(m[1] ? { t: "num", v: m[1] } : m[2] ? { t: "id", v: m[2] } : { t: "op", v: m[3] });
    i = re.lastIndex;
  }
  return out;
}

export function evalExpr(src: string, vars: Record<string, number>): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (v?: string) => {
    const t = toks[p++];
    if (!t || (v !== undefined && t.v !== v)) throw new Error(`Expected ${v ?? "token"}`);
    return t;
  };
  const bin = (next: () => number, ops: string[], f: (op: string, a: number, b: number) => number) => () => {
    let a = next();
    while (peek() && peek().t === "op" && ops.includes(peek().v)) { const op = eat().v; a = f(op, a, next()); }
    return a;
  };
  const primary = (): number => {
    const t = eat();
    if (t.t === "num") return Number(t.v);
    if (t.t === "id") { if (!(t.v in vars)) throw new Error(`Unknown variable ${t.v}`); return vars[t.v]; }
    if (t.v === "(") { const v = or(); eat(")"); return v; }
    if (t.v === "-") return -primary();
    if (t.v === "!") return primary() ? 0 : 1;
    throw new Error(`Unexpected ${t.v}`);
  };
  const mul = bin(primary, ["*", "/", "%"], (o, a, b) => (o === "*" ? a * b : o === "/" ? (b === 0 ? NaN : a / b) : b === 0 ? NaN : a % b));
  const add = bin(mul, ["+", "-"], (o, a, b) => (o === "+" ? a + b : a - b));
  const rel = bin(add, ["<", "<=", ">", ">="], (o, a, b) => Number(o === "<" ? a < b : o === "<=" ? a <= b : o === ">" ? a > b : a >= b));
  const eq = bin(rel, ["==", "!="], (o, a, b) => Number(o === "==" ? a === b : a !== b));
  const and = (): number => { let a = eq(); while (peek()?.v === "&&") { eat(); const b = eq(); a = Number(!!a && !!b); } return a; };
  const or = (): number => { let a = and(); while (peek()?.v === "||") { eat(); const b = and(); a = Number(!!a || !!b); } return a; };
  const v = or();
  if (p < toks.length) throw new Error("Trailing input");
  return v;
}

export const truthy = (src: string, vars: Record<string, number>): boolean => {
  try { return !!evalExpr(src, vars); } catch { return false; }
};
