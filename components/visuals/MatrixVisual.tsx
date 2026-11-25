"use client";
import { useMemo } from "react";
import { matrixSteps, type Cell, type Op } from "@/lib/visuals/matrix";
import { StepperControls, useStepper } from "./Stepper";

function Grid({ name, m, hi, tone }: { name: string; m: (number | null)[][]; hi: Cell[]; tone: string }) {
  if (!m.length || !m[0].length) return null;
  return (
    <div className="grid gap-1">
      <div className="text-center font-mono text-sm text-muted">{name} ({m.length}x{m[0].length})</div>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${m[0].length}, 3rem)` }} role="img" aria-label={`Matrix ${name}: ${m.map((r) => r.map((v) => v ?? "?").join(" ")).join("; ")}`}>
        {m.flatMap((row, i) => row.map((v, j) => (
          <div key={`${i},${j}`} className={`grid h-10 place-items-center rounded border-2 font-mono ${hi.some(([r, c]) => r === i && c === j) ? tone : "border-border bg-surface"}`}>{v ?? ""}</div>
        )))}
      </div>
    </div>
  );
}

/** Matrix operations step by step with row/column highlighting. */
export function MatrixVisual({ title, op, a, b }: { title: string; op: Op; a: number[][]; b?: number[][] }) {
  const steps = useMemo(() => matrixSteps(op, a, b), [op, a, b]);
  const s = useStepper(steps.length);
  const st = steps[s.i];
  const showB = (op === "add" || op === "multiply") && (b ?? a);
  const sym = op === "add" ? "+" : op === "multiply" ? "×" : "";
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <StepperControls s={s} label="matrix" />
      <div className="flex flex-wrap items-center gap-4 overflow-x-auto">
        <Grid name="A" m={a} hi={st.hiA} tone="border-warning bg-warning/20" />
        {showB && <><span className="text-2xl" aria-hidden>{sym}</span><Grid name="B" m={(b ?? a) as number[][]} hi={st.hiB} tone="border-primary bg-primary/20" /></>}
        {st.res.length > 0 && <><span className="text-2xl" aria-hidden>{op === "transpose" ? "→" : "="}</span><Grid name={op === "transpose" ? "Aᵀ" : "C"} m={st.res} hi={st.hiRes} tone="border-success bg-success/20" /></>}
      </div>
      <div className="flex flex-wrap gap-2">{Object.entries(st.vars).map(([k, v]) => <div key={k} className="min-w-16 rounded-lg border border-border bg-surface p-2 text-center"><div className="font-mono">{v}</div><div className="font-mono text-sm text-primary">{k}</div></div>)}</div>
      <p role="status" aria-live="polite" className="box box-definition">{st.note}</p>
    </div>
  );
}
