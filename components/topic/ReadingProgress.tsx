"use client";
import { useEffect, useState } from "react";

/** Thin bar at the very top of the page showing how far down the lesson you are. Purely visual; also exposed as a progressbar. */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, Math.round((h.scrollTop / max) * 100)) : 0);
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div role="progressbar" aria-label="Lesson reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1">
      <div className="h-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--grad-a), var(--grad-b))", transition: "width .15s linear" }} />
    </div>
  );
}
