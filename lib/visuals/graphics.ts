// A tiny, safe interpreter for the graphics.h subset used in Week 15 (no eval): straight-line calls and simple `for` loops.
// It never runs the student's code as JavaScript; it only understands the statements listed in docs/CONTENT_AUTHORING_PHASE8.md.
export const BGI_COLORS = ["#000000", "#0000aa", "#00aa00", "#00aaaa", "#aa0000", "#aa00aa", "#aa5500", "#aaaaaa", "#555555", "#5555ff", "#55ff55", "#55ffff", "#ff5555", "#ff55ff", "#ffff55", "#ffffff"];
export const SCREEN_W = 640, SCREEN_H = 480;

export type Op =
  | { t: "pixel"; x: number; y: number; c: number }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; c: number }
  | { t: "rect"; l: number; tp: number; r: number; b: number; c: number }
  | { t: "bar"; l: number; tp: number; r: number; b: number; c: number }
  | { t: "circle"; x: number; y: number; r: number; c: number }
  | { t: "ellipse"; x: number; y: number; s: number; e: number; xr: number; yr: number; c: number }
  | { t: "arc"; x: number; y: number; s: number; e: number; r: number; c: number }
  | { t: "pie"; x: number; y: number; s: number; e: number; r: number; c: number; fill: number }
  | { t: "text"; x: number; y: number; s: string; c: number }
  | { t: "fill"; x: number; y: number; color: number; border: number };

export type GraphicsResult = { frames: Op[][]; bg: number; error?: string; calls: number };

const CONST: Record<string, number> = {
  BLACK: 0, BLUE: 1, GREEN: 2, CYAN: 3, RED: 4, MAGENTA: 5, BROWN: 6, LIGHTGRAY: 7, DARKGRAY: 8, LIGHTBLUE: 9, LIGHTGREEN: 10, LIGHTCYAN: 11, LIGHTRED: 12, LIGHTMAGENTA: 13, YELLOW: 14, WHITE: 15,
  DETECT: 0, SOLID_FILL: 1, EMPTY_FILL: 0, LINE_FILL: 2, HATCH_FILL: 7, XHATCH_FILL: 8, SOLID_LINE: 0, DOTTED_LINE: 1, DASHED_LINE: 3,
};
const IGNORED = new Set(["initgraph", "closegraph", "getch", "setlinestyle", "settextstyle", "kbhit"]);
const MAX_OPS = 20000, MAX_FRAMES = 400, MAX_ITER = 10000;

class Err extends Error {}

// ---- expressions: numbers, variables, constants, + - * / %, parentheses, getmaxx()/getmaxy() ----
function evalExpr(src: string, env: Map<string, number>): number {
  const toks = src.match(/\d+\.?\d*|[A-Za-z_]\w*\(\)|[A-Za-z_]\w*|[-+*/%()]/g) ?? [];
  if (toks.join("").length < src.replace(/\s+/g, "").length) throw new Err(`Cannot understand the expression "${src.trim()}"`);
  let i = 0;
  const peek = () => toks[i];
  const prim = (): number => {
    const t = toks[i++];
    if (t === undefined) throw new Err(`Unfinished expression "${src.trim()}"`);
    if (t === "(") { const v = add(); if (toks[i++] !== ")") throw new Err("Missing )"); return v; }
    if (t === "-") return -prim();
    if (t === "+") return prim();
    if (/^\d/.test(t)) return Number(t);
    if (t === "getmaxx()") return SCREEN_W - 1;
    if (t === "getmaxy()") return SCREEN_H - 1;
    if (env.has(t)) return env.get(t)!;
    if (t in CONST) return CONST[t];
    throw new Err(`Unknown name "${t}"`);
  };
  const mul = (): number => { let v = prim(); while (peek() === "*" || peek() === "/" || peek() === "%") { const o = toks[i++]; const r = prim(); v = o === "*" ? v * r : o === "/" ? (r === 0 ? 0 : Math.trunc(v / r)) : (r === 0 ? 0 : v % r); } return v; };
  const add = (): number => { let v = mul(); while (peek() === "+" || peek() === "-") { const o = toks[i++]; const r = mul(); v = o === "+" ? v + r : v - r; } return v; };
  const v = add();
  if (i < toks.length) throw new Err(`Cannot understand "${src.trim()}"`);
  return v;
}

function splitArgs(s: string): string[] {
  const out: string[] = []; let depth = 0, cur = "", inStr = false;
  for (const ch of s) {
    if (ch === '"') inStr = !inStr;
    if (!inStr) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; } }
    cur += ch;
  }
  if (cur.trim() !== "" || out.length) out.push(cur.trim());
  return out;
}

// ---- statements ----
type Stmt = { kind: "call"; name: string; args: string[] } | { kind: "decl"; name: string; expr: string } | { kind: "for"; v: string; from: string; cmp: string; to: string; step: string; body: Stmt[] };

function findMatching(s: string, open: number, o: string, c: string): number {
  let d = 0, inStr = false;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '"') inStr = !inStr;
    if (inStr) continue;
    if (s[i] === o) d++;
    if (s[i] === c && --d === 0) return i;
  }
  throw new Err(`Missing ${c}`);
}

function parseBlock(src: string): Stmt[] {
  const out: Stmt[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;
    if (i >= n) break;
    if (src[i] === "{") { const e = findMatching(src, i, "{", "}"); out.push(...parseBlock(src.slice(i + 1, e))); i = e + 1; continue; }
    const rest = src.slice(i);
    if (/^for\s*\(/.test(rest)) {
      const po = i + rest.indexOf("("); const pc = findMatching(src, po, "(", ")");
      const head = src.slice(po + 1, pc).split(";");
      if (head.length !== 3) throw new Err("A for loop needs three parts");
      const init = /^\s*(?:int\s+)?([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(head[0]);
      const cond = /^\s*([A-Za-z_]\w*)\s*(<=|>=|<|>|!=)\s*(.+)$/.exec(head[1]);
      const upd = /^\s*([A-Za-z_]\w*)\s*(\+\+|--|\+=|-=)\s*(.*)$/.exec(head[2]);
      if (!init || !cond || !upd) throw new Err("This for loop is outside the supported shape");
      const step = upd[2] === "++" ? "1" : upd[2] === "--" ? "-1" : upd[2] === "+=" ? upd[3] : `-(${upd[3]})`;
      let j = pc + 1; while (j < n && /\s/.test(src[j])) j++;
      let bodySrc: string;
      if (src[j] === "{") { const e = findMatching(src, j, "{", "}"); bodySrc = src.slice(j + 1, e); i = e + 1; }
      else { const e = src.indexOf(";", j); if (e < 0) throw new Err("Missing ;"); bodySrc = src.slice(j, e + 1); i = e + 1; }
      out.push({ kind: "for", v: init[1], from: init[2], cmp: cond[2], to: cond[3], step, body: parseBlock(bodySrc) });
      continue;
    }
    // simple statement up to ';' (semicolons inside string literals are not supported)
    const e = src.indexOf(";", i);
    if (e < 0) throw new Err(`Missing ; near "${src.slice(i, i + 20).trim()}"`);
    const text = src.slice(i, e).trim(); i = e + 1;
    if (text === "" || /^return\b/.test(text)) continue;
    let m: RegExpExecArray | null;
    if ((m = /^int\s+(.*)$/.exec(text))) {
      for (const part of splitArgs(m[1])) {
        const d = /^([A-Za-z_]\w*)\s*(?:=\s*(.+))?$/.exec(part);
        if (!d) throw new Err(`Cannot understand "${part}"`);
        if (d[2] === undefined) continue; // `int gd, gm;`
        if (d[2].trim() === "DETECT") continue;
        out.push({ kind: "decl", name: d[1], expr: d[2] });
      }
      continue;
    }
    if ((m = /^([A-Za-z_]\w*)\s*(\+=|-=|=)\s*(.+)$/.exec(text))) {
      out.push({ kind: "decl", name: m[1], expr: m[2] === "=" ? m[3] : `${m[1]} ${m[2][0]} (${m[3]})` });
      continue;
    }
    if ((m = /^([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/.exec(text))) { out.push({ kind: "call", name: m[1], args: splitArgs(m[2]) }); continue; }
    throw new Err(`Cannot understand "${text}"`);
  }
  return out;
}

/** Extract the body of main() and parse it. */
function mainBody(code: string): string {
  const clean = code.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const m = /\bmain\s*\(\s*(?:void)?\s*\)\s*\{/.exec(clean);
  if (!m) throw new Err("No main() found");
  const open = m.index + m[0].length - 1;
  return clean.slice(open + 1, findMatching(clean, open, "{", "}"));
}

export function runGraphics(code: string): GraphicsResult {
  const frames: Op[][] = [];
  let screen: Op[] = [];
  let dirty = false, calls = 0, opCount = 0, iter = 0;
  let color = 15, fillColor = 15, bg = 0;
  const env = new Map<string, number>();
  const push = (op: Op) => { if (++opCount > MAX_OPS) throw new Err("This program draws too much for the simulator"); screen.push(op); dirty = true; };
  const snapshot = () => { if (frames.length >= MAX_FRAMES) throw new Err("Too many animation frames for the simulator"); frames.push([...screen]); dirty = false; };

  const call = (name: string, a: string[]) => {
    if (++calls > 200000) throw new Err("Program too long");
    if (IGNORED.has(name)) return;
    const num = (k: number) => { if (a[k] === undefined) throw new Err(`${name}() needs more arguments`); return evalExpr(a[k], env); };
    const need = (n: number) => { if (a.length !== n) throw new Err(`${name}() takes ${n} arguments, not ${a.length}`); };
    switch (name) {
      case "setcolor": need(1); color = num(0); break;
      case "setbkcolor": need(1); bg = num(0); break;
      case "setfillstyle": need(2); fillColor = num(1); break;
      case "putpixel": need(3); push({ t: "pixel", x: num(0), y: num(1), c: num(2) }); break;
      case "line": need(4); push({ t: "line", x1: num(0), y1: num(1), x2: num(2), y2: num(3), c: color }); break;
      case "rectangle": need(4); push({ t: "rect", l: num(0), tp: num(1), r: num(2), b: num(3), c: color }); break;
      case "bar": need(4); push({ t: "bar", l: num(0), tp: num(1), r: num(2), b: num(3), c: fillColor }); break;
      case "circle": need(3); push({ t: "circle", x: num(0), y: num(1), r: num(2), c: color }); break;
      case "ellipse": need(6); push({ t: "ellipse", x: num(0), y: num(1), s: num(2), e: num(3), xr: num(4), yr: num(5), c: color }); break;
      case "fillellipse": need(4); push({ t: "ellipse", x: num(0), y: num(1), s: 0, e: 360, xr: num(2), yr: num(3), c: color }); break;
      case "arc": need(5); push({ t: "arc", x: num(0), y: num(1), s: num(2), e: num(3), r: num(4), c: color }); break;
      case "pieslice": need(5); push({ t: "pie", x: num(0), y: num(1), s: num(2), e: num(3), r: num(4), c: color, fill: fillColor }); break;
      case "floodfill": need(3); push({ t: "fill", x: num(0), y: num(1), color: fillColor, border: num(2) }); break;
      case "outtextxy": {
        need(3);
        const sm = /^(?:\(\s*(?:const\s+)?char\s*\*\s*\)\s*)?"((?:[^"\\]|\\.)*)"$/.exec(a[2].trim());
        if (!sm) throw new Err("outtextxy() needs a string in quotes");
        push({ t: "text", x: num(0), y: num(1), s: sm[1], c: color });
        break;
      }
      case "cleardevice": screen = []; dirty = true; break;
      case "delay": snapshot(); break;
      default: throw new Err(`The simulator does not know the function ${name}()`);
    }
  };

  const exec = (stmts: Stmt[]) => {
    for (const s of stmts) {
      if (s.kind === "decl") env.set(s.name, evalExpr(s.expr, env));
      else if (s.kind === "call") call(s.name, s.args);
      else {
        env.set(s.v, evalExpr(s.from, env));
        const step = evalExpr(s.step, env);
        if (step === 0) throw new Err("The loop step is 0 (endless loop)");
        for (;;) {
          const cur = env.get(s.v)!, lim = evalExpr(s.to, env);
          const ok = s.cmp === "<" ? cur < lim : s.cmp === "<=" ? cur <= lim : s.cmp === ">" ? cur > lim : s.cmp === ">=" ? cur >= lim : cur !== lim;
          if (!ok) break;
          if (++iter > MAX_ITER) throw new Err("Loop runs too long for the simulator");
          exec(s.body);
          env.set(s.v, env.get(s.v)! + step);
        }
      }
    }
  };

  try {
    exec(parseBlock(mainBody(code)));
    if (dirty || frames.length === 0) snapshot();
    return { frames, bg, calls };
  } catch (e) {
    return { frames: [], bg, calls, error: e instanceof Err ? e.message : "The simulator could not run this program" };
  }
}

// ---- rasteriser: draws ops into a 640x480 buffer of palette indices (crisp 1-pixel lines and a real flood fill, like BGI) ----
export function rasterize(ops: Op[], bg = 0): Uint8Array {
  const buf = new Uint8Array(SCREEN_W * SCREEN_H).fill(bg & 15);
  const put = (x: number, y: number, c: number) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < SCREEN_W && y < SCREEN_H) buf[y * SCREEN_W + x] = c & 15; };
  const line = (x1: number, y1: number, x2: number, y2: number, c: number) => {
    x1 = Math.round(x1); y1 = Math.round(y1); x2 = Math.round(x2); y2 = Math.round(y2);
    const dx = Math.abs(x2 - x1), dy = -Math.abs(y2 - y1), sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4000; n++) {
      put(x1, y1, c);
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
  };
  const arcPts = (x: number, y: number, s: number, e: number, xr: number, yr: number, c: number) => {
    if (e < s) e += 360;
    const steps = Math.max(8, Math.ceil(((e - s) * Math.PI / 180) * Math.max(xr, yr, 1)));
    let px = 0, py = 0;
    for (let k = 0; k <= steps; k++) {
      const a = (s + ((e - s) * k) / steps) * Math.PI / 180;
      const qx = x + xr * Math.cos(a), qy = y - yr * Math.sin(a);
      if (k > 0) line(px, py, qx, qy, c);
      px = qx; py = qy;
    }
  };
  const fill = (x: number, y: number, color: number, border: number) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= SCREEN_W || y >= SCREEN_H) return;
    const stop = (i: number) => buf[i] === (border & 15) || buf[i] === (color & 15);
    if (stop(y * SCREEN_W + x)) return;
    const stack: number[] = [x, y];
    while (stack.length) {
      const cy = stack.pop()!, cx = stack.pop()!;
      let l = cx, r = cx;
      while (l - 1 >= 0 && !stop(cy * SCREEN_W + l - 1)) l--;
      while (r + 1 < SCREEN_W && !stop(cy * SCREEN_W + r + 1)) r++;
      for (let i = l; i <= r; i++) buf[cy * SCREEN_W + i] = color & 15;
      for (const ny of [cy - 1, cy + 1]) {
        if (ny < 0 || ny >= SCREEN_H) continue;
        let inRun = false;
        for (let i = l; i <= r; i++) {
          const open = !stop(ny * SCREEN_W + i);
          if (open && !inRun) { stack.push(i, ny); inRun = true; } else if (!open) inRun = false;
        }
      }
    }
  };
  for (const op of ops) {
    switch (op.t) {
      case "pixel": put(op.x, op.y, op.c); break;
      case "line": line(op.x1, op.y1, op.x2, op.y2, op.c); break;
      case "rect": line(op.l, op.tp, op.r, op.tp, op.c); line(op.r, op.tp, op.r, op.b, op.c); line(op.r, op.b, op.l, op.b, op.c); line(op.l, op.b, op.l, op.tp, op.c); break;
      case "bar": for (let yy = Math.min(op.tp, op.b); yy <= Math.max(op.tp, op.b); yy++) for (let xx = Math.min(op.l, op.r); xx <= Math.max(op.l, op.r); xx++) put(xx, yy, op.c); break;
      case "circle": arcPts(op.x, op.y, 0, 360, op.r, op.r, op.c); break;
      case "ellipse": arcPts(op.x, op.y, op.s, op.e, op.xr, op.yr, op.c); break;
      case "arc": arcPts(op.x, op.y, op.s, op.e, op.r, op.r, op.c); break;
      case "pie": {
        arcPts(op.x, op.y, op.s, op.e, op.r, op.r, op.c);
        const a1 = op.s * Math.PI / 180, a2 = (op.e < op.s ? op.e + 360 : op.e) * Math.PI / 180;
        line(op.x, op.y, op.x + op.r * Math.cos(a1), op.y - op.r * Math.sin(a1), op.c);
        line(op.x, op.y, op.x + op.r * Math.cos(a2), op.y - op.r * Math.sin(a2), op.c);
        const mid = (a1 + a2) / 2;
        fill(op.x + (op.r / 2) * Math.cos(mid), op.y - (op.r / 2) * Math.sin(mid), op.fill, op.c);
        break;
      }
      case "fill": fill(op.x, op.y, op.color, op.border); break;
      case "text": break; // drawn by the component on top
    }
  }
  return buf;
}
