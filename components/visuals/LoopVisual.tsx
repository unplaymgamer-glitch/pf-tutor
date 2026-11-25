"use client";
import { useMemo, useState } from "react";
import { MAX_ITER, loopCode, loopSteps, type Cmp, type LoopKind, type LoopParams } from "@/lib/visuals/loops";
import { CodeBlock } from "../topic/CodeBlock";
import { StepperControls, useStepper } from "./Stepper";

const PHASE: Record<string, { label: string; tone: string }> = {
  init: { label: "Start", tone: "var(--info)" }, check: { label: "Check the condition", tone: "var(--warning)" }, body: { label: "Run the body", tone: "var(--success)" },
  skip: { label: "continue: skip", tone: "var(--accent)" }, break: { label: "break: leave", tone: "var(--error)" }, update: { label: "Update", tone: "var(--primary)" }, exit: { label: "Done", tone: "var(--muted)" },
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));
const KINDS: LoopKind[] = ["for", "while", "do-while"];

/** Loop Lab: choose the loop, the start, end and step, and watch every check, body run and update. A comparison table shows the three loops side by side. */
export function LoopVisual({ title, init }: { title: string; init: LoopParams }) {
  const [p, setP] = useState<LoopParams>(init);
  const g = useMemo(() => loopSteps(p), [p]);
  const { code } = useMemo(() => loopCode(p), [p]);
  const s = useStepper(g.steps.length, 750);
  const st = g.steps[s.i];
  const change = (patch: Partial<LoopParams>) => { setP((x) => ({ ...x, ...patch })); s.reset(); };
  const num = (v: string, lo: number, hi: number, fallback: number) => (v === "" || v === "-" ? fallback : clamp(Number(v), lo, hi));
  const compare = useMemo(() => KINDS.map((k) => ({ k, r: loopSteps({ ...p, loop: k }) })), [p]);
  const ph = PHASE[st.phase];
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid gap-3 rounded-xl border border-border p-3" role="group" aria-label="Loop settings">
        <div role="group" aria-label="Loop kind" className="flex flex-wrap gap-2">
          {KINDS.map((k) => <button key={k} className={`btn ${p.loop === k ? "btn-primary" : ""}`} aria-pressed={p.loop === k} onClick={() => change({ loop: k })}>{k}</button>)}
        </div>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="grid gap-1">Start<input className="btn w-20 text-center" inputMode="numeric" value={p.start} onChange={(e) => change({ start: num(e.target.value, -50, 50, 0) })} /></label>
          <label className="grid gap-1">Condition<select className="btn" value={p.cmp} onChange={(e) => change({ cmp: e.target.value as Cmp })}>{["<", "<=", ">", ">="].map((c) => <option key={c} value={c}>i {c} end</option>)}</select></label>
          <label className="grid gap-1">End<input className="btn w-20 text-center" inputMode="numeric" value={p.end} onChange={(e) => change({ end: num(e.target.value, -50, 50, 0) })} /></label>
          <label className="grid gap-1">Step<input className="btn w-20 text-center" inputMode="numeric" value={p.step} onChange={(e) => change({ step: num(e.target.value, -10, 10, 1) || 1 })} /></label>
          <label className="grid gap-1">Jump
            <select className="btn" value={p.jump?.type ?? "none"} onChange={(e) => change({ jump: e.target.value === "none" ? undefined : { type: e.target.value as "break" | "continue", at: p.jump?.at ?? p.start + p.step * 2 } })}>
              <option value="none">none</option><option value="break">break</option><option value="continue">continue</option>
            </select></label>
          {p.jump && <label className="grid gap-1">when i is<input className="btn w-20 text-center" inputMode="numeric" value={p.jump.at} onChange={(e) => change({ jump: { type: p.jump!.type, at: num(e.target.value, -50, 50, 0) } })} /></label>}
        </div>
      </div>
      {g.endless && <p role="alert" className="box box-error">This loop never ends: the condition stays true for ever. The demo stops it after {MAX_ITER} turns. Change the step or the end value.</p>}
      <StepperControls s={s} label="loop" />
      <CodeBlock code={code} highlight={st.line} label={`${p.loop} loop code`} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="pill font-semibold" style={{ color: ph.tone }}>{ph.label}</span>
        <div className="min-w-16 rounded-lg border border-border bg-surface p-2 text-center"><div className="font-mono text-lg">{st.i}</div><div className="font-mono text-sm text-primary">i</div></div>
        <div className="min-w-16 rounded-lg border border-border bg-surface p-2 text-center"><div className="font-mono text-lg">{st.bodyRuns}</div><div className="text-sm text-muted">body runs</div></div>
      </div>
      <p role="status" aria-live="polite" className="box box-definition">{st.note}</p>
      <div><div className="text-sm text-muted">Output so far</div><pre tabIndex={0} className="code" dir="ltr">{st.out || " "}</pre></div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="The three loops with the same numbers">
        <table className="w-full border-collapse text-start text-sm">
          <caption className="pb-1 text-start text-muted">Same numbers, three loops</caption>
          <thead><tr><th className="border border-border p-2 text-start">Loop</th><th className="border border-border p-2 text-start">Checks the condition</th><th className="border border-border p-2 text-start">Body runs</th><th className="border border-border p-2 text-start">Prints</th></tr></thead>
          <tbody>{compare.map(({ k, r }) => (
            <tr key={k} style={k === p.loop ? { background: "var(--surface-2)" } : undefined}>
              <td className="border border-border p-2 font-mono">{k}</td><td className="border border-border p-2">{k === "do-while" ? "after the body" : "before the body"}</td>
              <td className="border border-border p-2">{r.endless ? "never stops" : r.bodyRuns}</td><td className="border border-border p-2 font-mono">{r.endless ? "…" : r.output.trim() || "nothing"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
