// Step generator for the Loop Lab (for / while / do-while, with optional break or continue). Pure functions.
// tests/visuals.test.ts compiles the program from loopProgram() with g++ and checks output and body-run count against these steps.
export type LoopKind = "for" | "while" | "do-while";
export type Cmp = "<" | "<=" | ">" | ">=";
export type LoopParams = { loop: LoopKind; start: number; end: number; step: number; cmp: Cmp; jump?: { type: "break" | "continue"; at: number } };
export type Phase = "init" | "check" | "body" | "skip" | "break" | "update" | "exit";
export type LoopStep = { phase: Phase; i: number; line: number; note: string; cond?: boolean; out: string; bodyRuns: number };

export const MAX_ITER = 40;

const upd = (step: number) => (step === 1 ? "i++" : step === -1 ? "i--" : step > 0 ? `i += ${step}` : `i -= ${-step}`);
const test = (p: LoopParams) => `i ${p.cmp} ${p.end}`;
const holds = (i: number, p: LoopParams) => (p.cmp === "<" ? i < p.end : p.cmp === "<=" ? i <= p.end : p.cmp === ">" ? i > p.end : i >= p.end);

/** The C++ shown beside the animation, plus the 1-based line numbers the steps point at. */
export function loopCode(p: LoopParams): { code: string; lines: { init: number; check: number; jump: number; print: number; update: number } } {
  const L: string[] = [];
  const jumpLine = p.jump ? (p.jump.type === "break" ? `if (i == ${p.jump.at}) break;` : p.loop === "for" ? `if (i == ${p.jump.at}) continue;` : `if (i == ${p.jump.at}) { ${upd(p.step)}; continue; }`) : "";
  const init = 1; let check = 1, jump = 0, print = 0, update = 0;
  if (p.loop === "for") {
    L.push(`for (int i = ${p.start}; ${test(p)}; ${upd(p.step)}) {`);
    if (p.jump) { L.push(`    ${jumpLine}`); jump = L.length; }
    L.push(`    cout << i << " ";`); print = L.length; L.push("}"); update = 1;
  } else if (p.loop === "while") {
    L.push(`int i = ${p.start};`, `while (${test(p)}) {`); check = 2;
    if (p.jump) { L.push(`    ${jumpLine}`); jump = L.length; }
    L.push(`    cout << i << " ";`); print = L.length; L.push(`    ${upd(p.step)};`); update = L.length; L.push("}");
  } else {
    L.push(`int i = ${p.start};`, "do {");
    if (p.jump) { L.push(`    ${jumpLine}`); jump = L.length; }
    L.push(`    cout << i << " ";`); print = L.length; L.push(`    ${upd(p.step)};`); update = L.length; L.push(`} while (${test(p)});`); check = L.length;
  }
  return { code: L.join("\n"), lines: { init, check, jump, print, update } };
}

export function loopSteps(p: LoopParams): { steps: LoopStep[]; endless: boolean; output: string; bodyRuns: number } {
  const { lines } = loopCode(p);
  const steps: LoopStep[] = [];
  let i = p.start, out = "", runs = 0, endless = false;
  const push = (phase: Phase, line: number, note: string, cond?: boolean) => steps.push({ phase, i, line, note, cond, out, bodyRuns: runs });
  push("init", lines.init, `i starts at ${p.start}.`);
  const body = (): "continue" | "break" => {
    runs++;
    if (p.jump && i === p.jump.at) {
      if (p.jump.type === "break") { push("break", lines.jump, `i is ${i}: break leaves the whole loop at once.`); return "break"; }
      push("skip", lines.jump, `i is ${i}: continue skips the rest of this turn${p.loop === "for" ? " and goes to the update" : " (the update runs first, otherwise the loop would never end)"}.`);
      return "continue";
    }
    out += `${i} `;
    push("body", lines.print, `Body runs with i = ${i}: prints ${i}.`);
    return "continue";
  };
  const update = (line: number) => { i += p.step; push("update", line, `Update: i becomes ${i}.`); };
  const tooLong = () => runs >= MAX_ITER;

  if (p.loop === "do-while") {
    for (;;) {
      const r = body();
      if (r === "break") break;
      if (p.jump?.type === "continue" && i === p.jump.at) update(lines.jump); else update(lines.update);
      const c = holds(i, p);
      push("check", lines.check, `Check after the body: ${i} ${p.cmp} ${p.end} is ${c ? "true, go round again" : "false, stop"}.`, c);
      if (!c) break;
      if (tooLong()) { endless = true; break; }
    }
  } else {
    for (;;) {
      const c = holds(i, p);
      push("check", lines.check, `Check first: ${i} ${p.cmp} ${p.end} is ${c ? "true, run the body" : "false, stop"}.`, c);
      if (!c) break;
      if (tooLong()) { endless = true; break; }
      const r = body();
      if (r === "break") break;
      update(p.loop === "for" ? lines.update : p.jump?.type === "continue" && i === p.jump.at ? lines.jump : lines.update);
    }
  }
  const ended = steps[steps.length - 1];
  push("exit", ended.line, endless ? `Stopped here: this loop never ends because the condition stays true (the demo cuts it after ${MAX_ITER} turns).` : `The loop is over. It printed: ${out.trim() || "nothing"}. The body ran ${runs} time${runs === 1 ? "" : "s"}.`);
  return { steps, endless, output: out, bodyRuns: runs };
}

/** A complete C++ program with the same loop plus a body counter, used to check the generator against g++. */
export function loopProgram(p: LoopParams): string {
  const { code } = loopCode(p);
  const withCounter = code.replace('cout << i << " ";', 'cout << i << " "; ').replace(/\n(\s*)if \(i == (\d+)\)/, "\n$1if (i == $2)");
  // count entries into the body: add `runs++;` as the first statement inside the loop body
  const lines = withCounter.split("\n");
  const open = lines.findIndex((l) => /\{\s*$/.test(l) && /(for|while|do)\b/.test(l));
  lines.splice(open + 1, 0, "    runs++;");
  return `#include <iostream>\nusing namespace std;\nint main() {\n    int runs = 0;\n${lines.map((l) => "    " + l).join("\n")}\n    cout << "|" << runs << endl;\n    return 0;\n}\n`;
}
