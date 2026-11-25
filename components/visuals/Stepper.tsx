"use client";
import { useEffect, useState } from "react";

/** Shared play / pause / back / next / reset / speed controls for every step-by-step visual. */
export function useStepper(n: number, initialSpeed = 900) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const last = n - 1;
  useEffect(() => {
    if (!playing) return;
    if (i >= last) {
      const t = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((x) => Math.min(last, x + 1)), speed);
    return () => clearTimeout(t);
  }, [playing, i, last, speed]);
  return { i: Math.min(i, last), n, playing, speed, setSpeed, setI,
    reset: () => { setI(0); setPlaying(false); },
    back: () => setI((x) => Math.max(0, x - 1)),
    next: () => setI((x) => Math.min(last, x + 1)),
    toggle: () => { if (i >= last) { setI(0); setPlaying(true); } else setPlaying((p) => !p); },
    pause: () => setPlaying(false) };
}
export type StepperState = ReturnType<typeof useStepper>;

export function StepperControls({ s, label }: { s: StepperState; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${label} controls`}>
      <button className="btn" onClick={s.reset}>⏮ Reset</button>
      <button className="btn" onClick={s.back} disabled={s.i === 0}>◀ Back</button>
      <button className="btn btn-primary" onClick={s.toggle}>{s.playing ? "⏸ Pause" : "▶ Play"}</button>
      <button className="btn" onClick={s.next} disabled={s.i >= s.n - 1}>Next ▶</button>
      <label className="flex items-center gap-2 text-sm">Speed
        <select className="btn !min-h-11" value={s.speed} onChange={(e) => s.setSpeed(Number(e.target.value))}>
          <option value={1800}>Slow</option><option value={900}>Normal</option><option value={350}>Fast</option>
        </select>
      </label>
      <span className="text-sm text-muted">Step {s.i + 1} of {s.n}</span>
    </div>
  );
}

/** Parse "5, 3, 9" style input into small positive integers (for custom sorting input). */
export function parseNumbers(text: string, min: number, max: number, count: [number, number]): number[] | null {
  const nums = text.split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < count[0] || nums.length > count[1] || nums.some((x) => !Number.isInteger(x) || x < min || x > max)) return null;
  return nums;
}
