"use client";
import { useEffect, useRef, useState } from "react";
import { T } from "../I18n";

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to); // server render and no-JS show the real number
  useEffect(() => {
    const el = ref.current;
    if (!el || document.documentElement.getAttribute("data-motion") === "reduce" || typeof IntersectionObserver === "undefined") return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setN(0);
      const t0 = performance.now(), dur = 900;
      const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref}><span aria-hidden>{n.toLocaleString("en")}</span><span className="sr-only">{to.toLocaleString("en")}</span></span>;
}

/** Animated numbers computed from the real lesson files (never typed in by hand). */
export function StatCounters({ stats }: { stats: { label: string; value: number; icon: string }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="The course in numbers">
      {stats.map((s) => (
        <li key={s.label} className="card text-center">
          <div aria-hidden className="text-xl">{s.icon}</div>
          <div className="gradient-text text-3xl font-bold"><CountUp to={s.value} /></div>
          <div className="text-sm text-muted"><T k={s.label} /></div>
        </li>
      ))}
    </ul>
  );
}
