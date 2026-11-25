"use client";
import { useMemo, useState } from "react";
import { cellOrder, pattern, type Shape } from "@/lib/visuals/pattern";
import { CodeBlock } from "../topic/CodeBlock";
import { StepperControls, useStepper } from "./Stepper";

const SHAPES: [Shape, string][] = [["right-triangle", "Right triangle"], ["inverted-triangle", "Inverted triangle"], ["pyramid", "Pyramid"], ["diamond", "Diamond"], ["square", "Square"], ["hollow-square", "Hollow square"], ["number-triangle", "Number triangle"], ["multiplication-table", "Multiplication table"]];

/** Builds a pattern cell by cell and shows the nested-loop counters (i = row, j = column) and the formula. */
export function PatternVisual({ title, shape, n }: { title: string; shape: Shape; n: number }) {
  const [sh, setSh] = useState<Shape>(shape);
  const [size, setSize] = useState(n);
  const p = useMemo(() => pattern(sh, size), [sh, size]);
  const order = useMemo(() => cellOrder(p.rows), [p]);
  const s = useStepper(order.length + 1, 450);
  const done = s.i; // number of cells drawn
  const cur = done > 0 ? order[done - 1] : null;
  const shown = new Set(order.slice(0, done).map(([r, c]) => `${r},${c}`));
  const width = Math.max(...p.rows.map((r) => r.length));
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Pattern
          <select className="btn" value={sh} onChange={(e) => { setSh(e.target.value as Shape); s.reset(); }}>{SHAPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="grid gap-1 text-sm">Size n = {size}
          <input type="range" min={2} max={8} value={size} onChange={(e) => { setSize(Number(e.target.value)); s.reset(); }} />
        </label>
      </div>
      <StepperControls s={s} label="pattern" />
      <div className="overflow-x-auto"><div className="inline-grid gap-1 rounded-lg border border-border bg-surface p-3 font-mono" style={{ gridTemplateColumns: `repeat(${width}, 2rem)` }} role="img" aria-label={`Pattern after ${done} cells`}>
        {p.rows.flatMap((row, i) => Array.from({ length: width }, (_, j) => {
          const c = row[j];
          const isCur = cur && cur[0] === i && cur[1] === j;
          return <div key={`${i},${j}`} className={`grid h-8 w-8 place-items-center rounded ${isCur ? "bg-warning text-onprimary" : c === undefined ? "" : shown.has(`${i},${j}`) ? (c === " " ? "border border-dashed border-border" : "bg-primary/25") : "border border-border/40"}`}>{c !== undefined && shown.has(`${i},${j}`) ? (c === " " ? "·" : c) : ""}</div>;
        }))}
      </div></div>
      <p role="status" aria-live="polite" className="font-mono text-sm" dir="ltr">{cur ? <>i (row) = <strong>{cur[0] + 1}</strong> · j (column) = <strong>{cur[1] + 1}</strong> · prints &quot;{p.rows[cur[0]][cur[1]] === " " ? "space" : p.rows[cur[0]][cur[1]]}&quot;</> : "Press Play: the loops will fill the grid one cell at a time."}</p>
      <ul className="list-disc ps-6">{p.formula.map((f) => <li key={f}>{f}</li>)}</ul>
      <CodeBlock code={p.code} label="pattern code" />
    </div>
  );
}
