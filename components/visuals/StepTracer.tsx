"use client";
import { useEffect, useState } from "react";
import type { CodeSample } from "@/lib/content-schema";
import { CodeBlock } from "../topic/CodeBlock";

// Step-through tracer: code line highlight + memory boxes + output. Steps are hand-authored and
// verified by scripts/verify-content.mts (the traced output must equal the real program output).
export function StepTracer({ sample }: { sample: CodeSample }) {
  const trace = sample.trace!;
  const n = trace.steps.length;
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1200);

  useEffect(() => {
    if (!playing) return;
    if (i >= n - 1) {
      const t = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((x) => Math.min(n - 1, x + 1)), speed);
    return () => clearTimeout(t);
  }, [playing, i, n, speed]);

  const step = trace.steps[i];
  const out = trace.steps.slice(0, i + 1).map((s) => s.out).join("");
  const names = Object.keys(trace.types);
  const valueOf = (nm: string) => [...trace.steps.slice(0, i + 1)].reverse().find((s) => nm in s.vars)?.vars[nm];

  return (
    <div className="grid gap-3" aria-label={`Step by step trace of ${sample.title}`}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Playback controls">
        <button className="btn" onClick={() => { setI(0); setPlaying(false); }}>⏮ Reset</button>
        <button className="btn" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>◀ Back</button>
        <button className="btn btn-primary" onClick={() => { if (i >= n - 1) { setI(0); setPlaying(true); } else setPlaying((p) => !p); }}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button className="btn" onClick={() => setI((x) => Math.min(n - 1, x + 1))} disabled={i >= n - 1}>Next ▶</button>
        <label className="flex items-center gap-2 text-sm">Speed
          <select className="btn !min-h-11" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value={2200}>Slow</option>
            <option value={1200}>Normal</option>
            <option value={600}>Fast</option>
          </select>
        </label>
        <span className="text-sm text-muted">Step {i + 1} of {n}</span>
      </div>
      <CodeBlock code={sample.code} highlight={step.line} label={sample.title} />
      <p role="status" aria-live="polite" className="box box-definition">{step.note}</p>
      {step.stack && (
        <div aria-label="Call stack" className="grid gap-1">
          <div className="text-sm text-muted">Call stack (newest call on top)</div>
          <ol className="flex flex-col-reverse gap-1">
            {step.stack.map((f, k) => (
              <li key={k} className={`rounded-lg border-2 p-2 font-mono text-sm ${k === step.stack!.length - 1 ? "border-primary bg-primary/10" : "border-border bg-surface"}`} dir="ltr">
                <strong>{f.fn}</strong>{Object.keys(f.vars).length > 0 && <span className="text-muted"> · {Object.entries(f.vars).map(([a, b]) => `${a} = ${b}`).join(", ")}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {names.length > 0 && (
        <div className="flex flex-wrap gap-3" aria-label="Variables in memory">
          {names.map((nm) => (
            <div key={nm} className="min-w-24 rounded-lg border border-border bg-surface p-2 text-center">
              <div className="text-xs text-muted">{trace.types[nm]}</div>
              <div className="font-mono text-lg">{valueOf(nm) ?? "?"}</div>
              <div className="font-mono text-sm text-primary">{nm}</div>
            </div>
          ))}
        </div>
      )}
      <div>
        <div className="text-sm text-muted">Output so far</div>
        <pre tabIndex={0} className="code" dir="ltr" aria-live="polite">{out || " "}</pre>
      </div>
    </div>
  );
}
