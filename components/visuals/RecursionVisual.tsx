"use client";
import { useMemo } from "react";
import { recursionSteps, type RecFn } from "@/lib/visuals/recursion";
import { StepperControls, useStepper } from "./Stepper";

/** Call stack that grows until the base case and then unwinds with return values. */
export function RecursionVisual({ title, fn, n, m }: { title: string; fn: RecFn; n: number; m?: number }) {
  const g = useMemo(() => recursionSteps(fn, n, m), [fn, n, m]);
  const s = useStepper(g.steps.length, 900);
  const st = g.steps[s.i];
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <StepperControls s={s} label="recursion" />
      <p role="status" aria-live="polite" className="box box-definition">{st.note}</p>
      <div>
        <div className="text-sm text-muted">Call stack (newest call on top) · {g.calls} calls in total, deepest {g.maxDepth}</div>
        <ol className="flex min-h-12 flex-col-reverse gap-1" aria-label="Call stack">
          {st.stack.map((f, k) => (
            <li key={k} className={`rounded-lg border-2 p-2 font-mono text-sm ${f.status === "returning" ? "border-success bg-success/15" : f.status === "active" ? "border-primary bg-primary/10" : "border-border bg-surface"}`} dir="ltr" style={{ marginInlineStart: `${Math.min(k, 8) * 12}px` }}>
              <strong>{f.label}</strong>
              {f.status === "returning" && <span className="text-success"> → returns {f.ret}</span>}
              {f.status === "waiting" && <span className="text-muted"> · waiting</span>}
            </li>
          ))}
        </ol>
      </div>
      {st.out && (<div><div className="text-sm text-muted">Output so far</div><pre tabIndex={0} className="code" dir="ltr">{st.out}</pre></div>)}
      {s.i === s.n - 1 && <p className="box box-roman">Final answer: <strong>{fn === "countdown" ? "(printed above)" : g.result}</strong></p>}
    </div>
  );
}
