"use client";
import { useEffect, useRef, useState } from "react";

// Flowchart from Mermaid text, loaded on demand (only when the Algorithm tab is opened).
export function Flowchart({ chart, description }: { chart: string; description: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = document.documentElement.dataset.theme
          ? document.documentElement.dataset.theme === "dark"
          : window.matchMedia("(prefers-color-scheme: dark)").matches;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default" });
        const id = "fc-" + Math.random().toString(36).slice(2);
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <figure>
      <div ref={ref} role="img" aria-label={description} className="overflow-x-auto rounded-lg border border-border bg-surface p-3" dir="ltr">
        {!failed && <span className="text-muted">Loading flowchart…</span>}
        {failed && <span className="text-muted">The flowchart could not load. Use the steps above instead.</span>}
      </div>
      <figcaption className="mt-1 text-sm text-muted">Flowchart: {description}</figcaption>
    </figure>
  );
}
