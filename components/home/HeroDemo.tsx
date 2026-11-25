"use client";
import { useEffect, useMemo, useState } from "react";
import { SORT_CODE, sortSteps } from "@/lib/visuals/sort";
import { useSettings } from "../SettingsProvider";
import { T } from "../I18n";

const VALUES = [64, 25, 12, 90, 22, 47, 8];

/** Live Bubble Sort next to the C++ loop that does it: the first thing a visitor sees. Autoplays unless motion is reduced; always pausable. */
export function HeroDemo() {
  const { settings } = useSettings();
  const steps = useMemo(() => sortSteps("bubble", VALUES), []);
  const last = steps.length - 1;
  const calm = settings.reduceMotion || settings.lowData;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState<boolean | null>(null); // null = follow the motion setting
  const isPaused = paused ?? calm;

  useEffect(() => {
    if (isPaused) return;
    const t = setTimeout(() => setI((x) => (x >= last ? 0 : x + 1)), i >= last ? 2200 : 650);
    return () => clearTimeout(t);
  }, [isPaused, i, last]);

  const shown = isPaused && paused === null && calm ? last : i; // calm users see the finished, sorted picture
  const s = steps[shown];
  const max = Math.max(...VALUES);
  const lines = SORT_CODE.bubble.split("\n");
  return (
    <div className="card grid gap-3 p-4" aria-label="Live demo: Bubble Sort">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="pill">🫧 <T k="demo.live" /></span>
        <button className="btn" aria-pressed={!isPaused} onClick={() => setPaused(!isPaused)}>{isPaused ? <>▶ <T k="demo.play" /></> : <>⏸ <T k="demo.pause" /></>}</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div role="img" aria-label={`Bars being sorted: ${s.arr.join(", ")}. ${s.note}`} className="flex h-44 items-end gap-1.5 rounded-xl border border-border bg-code p-3" style={{ background: "var(--code-bg)" }}>
          {s.arr.map((v, k) => {
            const comparing = s.compare?.includes(k), done = s.sorted.includes(k);
            return (
              <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
                <span className="font-mono text-xs text-muted" aria-hidden>{v}</span>
                <div className="w-full rounded-t-md transition-all duration-300" style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: done ? "var(--success)" : comparing ? (s.swapped ? "var(--xp)" : "var(--warning)") : "linear-gradient(180deg, var(--grad-a), var(--grad-b))" }} />
              </div>
            );
          })}
        </div>
        <pre dir="ltr" aria-hidden className="m-0 overflow-hidden rounded-xl border border-border p-3 font-mono text-[0.78rem] leading-relaxed" style={{ background: "var(--code-bg)" }}>
          {lines.map((l, k) => <div key={k} className={k + 1 === s.line ? "-mx-3 bg-primary/20 px-3" : "-mx-3 px-3"}>{l || " "}</div>)}
        </pre>
      </div>
      <p className="text-sm text-muted" aria-live="off">{s.note} · comparisons {s.comparisons} · swaps {s.swaps}</p>
    </div>
  );
}
