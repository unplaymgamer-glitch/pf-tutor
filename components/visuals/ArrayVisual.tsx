"use client";
import { useMemo, useState } from "react";
import { arraySteps, type ArrayMode } from "@/lib/visuals/arrays";
import { StepperControls, parseNumbers, useStepper } from "./Stepper";

function Boxes({ arr, hi, found }: { arr: number[]; hi: number[]; found?: number }) {
  return (
    <div className="flex flex-wrap gap-1" role="img" aria-label={`Array boxes: ${arr.map((v, i) => `index ${i} holds ${v}`).join(", ")}`}>
      {arr.map((v, i) => (
        <div key={i} className={`grid w-14 place-items-center rounded-lg border-2 p-1 text-center ${found === i ? "border-success bg-success/15" : hi.includes(i) ? "border-warning bg-warning/15" : "border-border bg-surface"}`}>
          <span className="font-mono text-lg">{v}</span>
          <span className="text-xs text-muted">a[{i}]</span>
        </div>
      ))}
    </div>
  );
}

/** Interactive array: access by index (with out-of-bounds warning), or a stepped linear search / min-max / sum / reverse. */
export function ArrayVisual({ title, mode, values, target }: { title: string; mode: ArrayMode; values: number[]; target?: number }) {
  const [vals, setVals] = useState(values);
  const [text, setText] = useState(values.join(", "));
  const [tgt, setTgt] = useState(target ?? values[Math.min(2, values.length - 1)]);
  const [err, setErr] = useState("");
  const [key, setKey] = useState(0);
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const n = parseNumbers(text, -99, 999, [2, 12]); if (!n) { setErr("Type 2 to 12 whole numbers, separated by commas."); return; } setErr(""); setVals(n); setKey((k) => k + 1); }}>
        <label className="grid gap-1 text-sm">Array values<input className="btn text-start font-mono" dir="ltr" value={text} onChange={(e) => setText(e.target.value)} /></label>
        {mode === "search" && <label className="grid gap-1 text-sm">Search for<input type="number" className="btn text-start" value={tgt} onChange={(e) => setTgt(Number(e.target.value))} /></label>}
        <button className="btn">Use these</button>
      </form>
      {err && <p role="alert" className="text-error">{err}</p>}
      {mode === "access" ? <Access key={key} vals={vals} setVals={setVals} /> : <Stepped key={`${key}-${tgt}`} mode={mode} vals={vals} tgt={tgt} />}
    </div>
  );
}

function Access({ vals, setVals }: { vals: number[]; setVals: (v: number[]) => void }) {
  const [idx, setIdx] = useState(0);
  const [wr, setWr] = useState(0);
  const oob = idx < 0 || idx >= vals.length;
  return (
    <div className="grid gap-3">
      <p className="font-mono" dir="ltr">int a[{vals.length}];  // size = {vals.length}, valid indexes: 0 to {vals.length - 1}</p>
      <Boxes arr={vals} hi={oob ? [] : [idx]} />
      <label className="grid gap-1">Index i = <strong className="font-mono">{idx}</strong>
        <input type="range" min={-2} max={vals.length + 2} value={idx} onChange={(e) => setIdx(Number(e.target.value))} />
      </label>
      {oob ? (
        <p role="alert" className="box box-error"><strong>Out of bounds!</strong> a[{idx}] is outside the array (valid indexes are 0 to {vals.length - 1}). In C++ this does not stop the program politely: it reads or writes memory that is not yours (undefined behaviour).</p>
      ) : (
        <p role="status" className="box box-definition">a[{idx}] = <strong>{vals[idx]}</strong>. The index counts from 0, so the first element is a[0] and the last is a[{vals.length - 1}] (size − 1).</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">Write a value<input type="number" className="btn text-start" value={wr} onChange={(e) => setWr(Number(e.target.value))} /></label>
        <button className="btn" disabled={oob} onClick={() => setVals(vals.map((v, k) => (k === idx ? wr : v)))}>a[{oob ? "i" : idx}] = {wr};</button>
      </div>
    </div>
  );
}

function Stepped({ mode, vals, tgt }: { mode: ArrayMode; vals: number[]; tgt: number }) {
  const steps = useMemo(() => arraySteps(mode, vals, tgt), [mode, vals, tgt]);
  const s = useStepper(steps.length);
  const st = steps[s.i];
  return (
    <div className="grid gap-3">
      <StepperControls s={s} label={mode} />
      <Boxes arr={st.arr} hi={st.hi} found={st.found} />
      <div className="flex flex-wrap gap-2">
        {Object.entries(st.vars).map(([k, v]) => <div key={k} className="min-w-20 rounded-lg border border-border bg-surface p-2 text-center"><div className="font-mono text-lg">{v}</div><div className="font-mono text-sm text-primary">{k}</div></div>)}
      </div>
      <p role="status" aria-live="polite" className="box box-definition">{st.note}</p>
    </div>
  );
}
