"use client";
import { useMemo, useState } from "react";
import { SORT_CODE, sortSteps, type SortAlgo } from "@/lib/visuals/sort";
import { CodeBlock } from "../topic/CodeBlock";
import { StepperControls, parseNumbers, useStepper } from "./Stepper";

function Bars({ algo, values }: { algo: SortAlgo; values: number[] }) {
  const steps = useMemo(() => sortSteps(algo, values), [algo, values]);
  const s = useStepper(steps.length);
  const st = steps[s.i];
  const max = Math.max(...values);
  return (
    <div className="grid gap-3" aria-label={`${algo} sort animation`}>
      <h4 className="font-semibold">{algo === "bubble" ? "Bubble sort" : "Selection sort"}</h4>
      <StepperControls s={s} label={`${algo} sort`} />
      <div className="flex h-44 items-end gap-1 rounded-lg border border-border bg-surface p-2" role="img" aria-label={`Bars: ${st.arr.join(", ")}`}>
        {st.arr.map((v, k) => {
          const cmp = st.compare?.includes(k);
          const done = st.sorted.includes(k);
          const isMin = st.minIdx === k;
          return (
            <div key={k} className="flex h-full flex-1 flex-col items-center justify-end text-xs" style={{ transition: "height .3s" }}>
              <span className="font-mono">{v}</span>
              <div className={`w-full rounded-t ${st.swapped && cmp ? "bg-error" : cmp ? "bg-warning" : isMin ? "bg-accent" : done ? "bg-success" : "bg-primary"}`} style={{ height: `${(v / max) * 80}%`, minHeight: 6 }} />
              <span className="text-muted">{k}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">Colours: <span className="text-primary">blue</span> unsorted · <span className="text-warning">yellow</span> being compared · <span className="text-error">red</span> just swapped · <span className="text-accent">violet</span> smallest so far · <span className="text-success">green</span> in its final place. The index is shown under each bar.</p>
      <p role="status" aria-live="polite" className="box box-definition">{st.note}</p>
      <p className="font-mono text-sm" dir="ltr">Comparisons: <strong>{st.comparisons}</strong> · Swaps: <strong>{st.swaps}</strong> · Outer pass i = {st.pass}</p>
      <CodeBlock code={SORT_CODE[algo]} highlight={st.line} label={`${algo} sort code`} />
    </div>
  );
}

/** Sorting visualizer: bars with comparison/swap counters, code-line sync, custom input, optional side-by-side comparison. */
export function SortVisual({ title, algo, values, compare }: { title: string; algo: SortAlgo; values: number[]; compare: boolean }) {
  const [vals, setVals] = useState(values);
  const [text, setText] = useState(values.join(", "));
  const [err, setErr] = useState("");
  const [side, setSide] = useState(compare);
  const [key, setKey] = useState(0);
  const apply = () => {
    const n = parseNumbers(text, 1, 99, [3, 12]);
    if (!n) { setErr("Type 3 to 12 whole numbers from 1 to 99, separated by commas."); return; }
    setErr(""); setVals(n); setKey((k) => k + 1);
  };
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <label className="grid gap-1 text-sm">Your numbers
          <input className="btn text-start font-mono" dir="ltr" value={text} onChange={(e) => setText(e.target.value)} aria-describedby="sort-err" />
        </label>
        <button className="btn">Use these numbers</button>
        <button type="button" className="btn" onClick={() => { const r = Array.from({ length: 7 }, () => 1 + Math.floor(Math.random() * 99)); setText(r.join(", ")); setVals(r); setKey((k) => k + 1); }}>Random</button>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={side} onChange={(e) => setSide(e.target.checked)} /> Compare bubble and selection side by side</label>
      </form>
      {err && <p id="sort-err" role="alert" className="text-error">{err}</p>}
      <div className={side ? "grid gap-6 lg:grid-cols-2" : ""}>
        {side ? (<><Bars key={`b${key}`} algo="bubble" values={vals} /><Bars key={`s${key}`} algo="selection" values={vals} /></>) : <Bars key={`${algo}${key}`} algo={algo} values={vals} />}
      </div>
    </div>
  );
}
