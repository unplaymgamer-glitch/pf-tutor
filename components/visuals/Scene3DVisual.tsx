"use client";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import { callFrames, cellCount, factorialOf, flatIndex, type Dims } from "@/lib/visuals/scene3d";
import { useSettings } from "../SettingsProvider";
import type { SceneState } from "./Scene3DCanvas";

const Canvas3D = dynamic(() => import("./Scene3DCanvas"), { ssr: false, loading: () => <div className="skeleton" style={{ height: 340 }} aria-busy="true" /> });

// If WebGL fails at run time the 2D view takes over: a 3D scene must never block the lesson.
class Fallback extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}
const hasWebgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };

type Scene = SceneState["scene"];
const Range = ({ label, value, max, on }: { label: string; value: number; max: number; on: (n: number) => void }) => (
  <label className="grid gap-1 text-sm">{label}: <strong>{value}</strong><input type="range" min={0} max={max} value={value} onChange={(e) => on(Number(e.target.value))} /></label>
);

/** A 3D scene that teaches one idea, with the same controls and a complete 2D version for phones, low-power devices and reduced motion. */
export function Scene3DVisual({ title, scene, dims = [2, 3, 4], depth = 4 }: { title: string; scene: Scene; dims?: Dims; depth?: number }) {
  const { tier, settings } = useSettings();
  const [view, setView] = useState<"auto" | "2d" | "3d">("auto");
  const [msg, setMsg] = useState("");
  const [sel, setSel] = useState<[number, number, number]>([0, 0, 0]);
  const [stack, setStack] = useState(2), [heap, setHeap] = useState(1);
  const [pushed, setPushed] = useState(0), [turn, setTurn] = useState(0);
  const use3d = view === "3d" || (view === "auto" && tier !== "low" && settings.threeD !== "off");
  const state: SceneState = { scene, dims, sel, stack, heap, frames: pushed, turn };

  const toggle = () => {
    if (use3d) { setView("2d"); setMsg(""); return; }
    if (!hasWebgl()) { setMsg("This browser cannot draw 3D (WebGL is off or missing), so you are seeing the 2D version of the same scene."); return; }
    setMsg(""); setView("3d");
  };

  const frames = callFrames(depth, pushed);
  const flat = flatIndex(dims, sel[0], sel[1], sel[2]);
  const controls = scene === "array-layers" ? (
    <div className="grid gap-2 sm:grid-cols-3">
      <Range label="Layer" value={sel[0]} max={dims[0] - 1} on={(n) => setSel([n, sel[1], sel[2]])} />
      <Range label="Row" value={sel[1]} max={dims[1] - 1} on={(n) => setSel([sel[0], n, sel[2]])} />
      <Range label="Column" value={sel[2]} max={dims[2] - 1} on={(n) => setSel([sel[0], sel[1], n])} />
    </div>
  ) : scene === "stack-heap" ? (
    <div className="flex flex-wrap gap-2">
      <button className="btn" disabled={stack >= 5} onClick={() => setStack(stack + 1)}>Call a function (stack grows)</button>
      <button className="btn" disabled={stack <= 0} onClick={() => setStack(stack - 1)}>Return (stack shrinks)</button>
      <button className="btn" disabled={heap >= 4} onClick={() => setHeap(heap + 1)}>new (heap block)</button>
      <button className="btn" disabled={heap <= 0} onClick={() => setHeap(heap - 1)}>delete</button>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-primary" disabled={pushed >= depth} onClick={() => setPushed(pushed + 1)}>Call deeper ▶</button>
      <button className="btn" disabled={pushed <= 0} onClick={() => setPushed(pushed - 1)}>◀ Return</button>
    </div>
  );

  const text = scene === "array-layers"
    ? `int a[${dims[0]}][${dims[1]}][${dims[2]}] has ${dims[0]} layers, ${dims[1]} rows and ${dims[2]} columns = ${cellCount(dims)} elements. a[${sel[0]}][${sel[1]}][${sel[2]}] is element number ${flat} in memory (counting from 0, the last index changes fastest).`
    : scene === "stack-heap"
      ? `Stack: ${stack} function frame${stack === 1 ? "" : "s"} (freed automatically when a function returns). Heap: ${heap} block${heap === 1 ? "" : "s"} made with new (they stay until you delete them, even after the function returns).`
      : pushed === 0 ? `Nothing has been called yet. factorial(${depth}) will call factorial(${depth - 1}) and so on until factorial(1), the base case.`
        : `Newest call: ${frames[frames.length - 1].label}${frames[frames.length - 1].n === 1 ? " (base case: returns 1)" : " (waiting for the call above it)"}. ${pushed} frame${pushed === 1 ? "" : "s"} on the stack. When ${frames[frames.length - 1].label} returns, it hands back ${factorialOf(frames[frames.length - 1].n)}.`;

  const twoD = (
    <div className="grid gap-3 rounded-xl border border-border p-3" style={{ background: "var(--code-bg)" }}>
      {scene === "array-layers" && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Layer {sel[0]} (the others are stacked behind it):</p>
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${dims[2]}, minmax(3.5rem, 1fr))` }} role="img" aria-label={`Layer ${sel[0]} of the 3-D array`}>
            {Array.from({ length: dims[1] }, (_, r) => Array.from({ length: dims[2] }, (_, c) => {
              const on = r === sel[1] && c === sel[2];
              return <div key={`${r}${c}`} className="rounded border-2 p-1 text-center font-mono text-xs" style={{ borderColor: on ? "var(--warning)" : "var(--border)", background: on ? "color-mix(in srgb, var(--warning) 20%, transparent)" : "var(--surface)" }}>[{sel[0]}][{r}][{c}]<br /><span className="text-muted">#{flatIndex(dims, sel[0], r, c)}</span></div>;
            }))}
          </div>
        </div>
      )}
      {scene === "stack-heap" && (
        <div className="grid grid-cols-2 gap-3" role="img" aria-label="Stack and heap">
          <div><div className="mb-1 text-sm font-semibold text-primary">Stack (automatic)</div><div className="flex min-h-40 flex-col-reverse gap-1">{Array.from({ length: stack }, (_, i) => <div key={i} className="rounded border-2 px-2 py-1 font-mono text-sm" style={{ borderColor: i === stack - 1 ? "var(--warning)" : "var(--primary)" }}>frame {i + 1}{i === 0 ? " (main)" : ""}</div>)}</div></div>
          <div><div className="mb-1 text-sm font-semibold" style={{ color: "var(--accent)" }}>Heap (you manage it)</div><div className="grid min-h-40 grid-cols-2 content-start gap-1">{Array.from({ length: heap }, (_, i) => <div key={i} className="rounded border-2 px-2 py-3 text-center font-mono text-sm" style={{ borderColor: "var(--accent)" }}>block {i + 1}</div>)}</div></div>
        </div>
      )}
      {scene === "call-stack" && (
        <div className="flex min-h-40 flex-col-reverse gap-1" role="img" aria-label="Call stack">
          {frames.map((f, i) => <div key={f.label} className="rounded border-2 px-3 py-1.5 font-mono text-sm" style={{ borderColor: i === frames.length - 1 ? "var(--warning)" : "var(--primary)", marginInlineStart: `${i * 10}px` }}>{f.label}{f.n === 1 ? "  ← base case" : ""}</div>)}
          {frames.length === 0 && <p className="text-muted">The stack is empty. Press “Call deeper”.</p>}
        </div>
      )}
    </div>
  );

  return (
    <figure className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <button className="btn" aria-pressed={use3d} onClick={toggle}>{use3d ? "Switch to the 2D view" : "🧊 View in 3D"}</button>
      </div>
      {msg && <p role="status" className="box box-exam">{msg}</p>}
      {use3d ? <Fallback fallback={twoD}><Canvas3D s={state} /></Fallback> : twoD}
      {use3d && <label className="grid gap-1 text-sm">Turn the scene<input type="range" min={0} max={360} value={turn} onChange={(e) => setTurn(Number(e.target.value))} /></label>}
      {controls}
      <figcaption className="box box-definition"><span role="status" aria-live="polite">{text}</span></figcaption>
    </figure>
  );
}
