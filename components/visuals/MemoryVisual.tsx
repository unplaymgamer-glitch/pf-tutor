"use client";
import { useMemo } from "react";
import { StepperControls, useStepper } from "./Stepper";

type Cell = { name: string; type: string; addr: string };
type Step = { code: string; note: string; values: Record<string, string>; points: Record<string, string> };

/** Variables as boxes with addresses; pointer cells show an arrow label and the box they point to is highlighted. */
export function MemoryVisual({ title, cells, steps }: { title: string; cells: Cell[]; steps: Step[] }) {
  const s = useStepper(steps.length, 1400);
  const st = steps[s.i];
  // cumulative values and pointer targets up to the current step
  const { vals, ptrs, changed } = useMemo(() => {
    const vals: Record<string, string> = {}, ptrs: Record<string, string> = {};
    let changed: string[] = [];
    steps.slice(0, s.i + 1).forEach((x, k) => {
      if (k === s.i) changed = [...Object.keys(x.values), ...Object.keys(x.points)];
      Object.assign(vals, x.values);
      for (const [k, v] of Object.entries(x.points)) { if (v === "") delete ptrs[k]; else ptrs[k] = v; } // an empty target means the pointer now points to nothing
    });
    return { vals, ptrs, changed };
  }, [steps, s.i]);
  const targets = new Set(Object.values(ptrs));
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <StepperControls s={s} label="memory" />
      {st.code && <pre tabIndex={0} role="group" className="code" dir="ltr" aria-label="Line just executed">{st.code}</pre>}
      <p role="status" aria-live="polite" className="box box-definition">{st.note}</p>
      <ul className="flex flex-wrap gap-3" aria-label="Memory boxes">
        {cells.map((c) => {
          const isPtr = c.name in ptrs;
          return (
            <li key={c.name} className={`min-w-28 rounded-lg border-2 p-2 text-center ${targets.has(c.name) ? "border-success bg-success/10" : changed.includes(c.name) ? "border-warning bg-warning/10" : "border-border bg-surface"}`}>
              <div className="font-mono text-xs text-muted" dir="ltr">{c.addr}</div>
              <div className="text-xs text-muted">{c.type}</div>
              <div className="font-mono text-lg" dir="ltr">{vals[c.name] ?? "?"}</div>
              <div className="font-mono text-sm text-primary" dir="ltr">{c.name}</div>
              {isPtr && <div className="text-xs text-success" dir="ltr">points to ▸ {ptrs[c.name]}</div>}
              {targets.has(c.name) && <div className="text-xs text-success">▲ pointed to</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
