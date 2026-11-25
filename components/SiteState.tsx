"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { PublicState } from "@/lib/gate-logic";

// Public site state (locks, taught flags, announcements). Fetched after load so static pages stay cacheable.
const Ctx = createContext<PublicState | null>(null);
export const useSiteState = () => useContext(Ctx);

export function SiteStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PublicState | null>(null);
  useEffect(() => {
    let off = false;
    const load = () => fetch("/api/state").then((r) => (r.ok ? r.json() : null)).then((s) => { if (!off && s) setState(s); }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { off = true; clearInterval(t); };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function AnnouncementBanner() {
  const s = useSiteState();
  // Nothing renders until the state fetch finishes (client only), so reading storage here cannot cause a hydration mismatch.
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem("cc111.dismissed") ?? "[]"); } catch { return []; }
  });
  const list = (s?.announcements ?? []).filter((a) => !dismissed.includes(a.id));
  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem("cc111.dismissed", JSON.stringify(next.slice(-30))); } catch { /* ignore */ }
  };
  if (s?.maintenance) {
    return <div role="status" className="border-b border-border bg-surface2 px-4 py-2 text-center">The site is in maintenance mode. Lessons will be back soon.</div>;
  }
  if (!list.length) return null;
  return (
    <div className="border-b border-border bg-surface2">
      <ul className="mx-auto max-w-4xl">
        {list.map((a) => (
          <li key={a.id} role="status" className="flex items-center justify-between gap-3 px-4 py-2">
            <span>📢 {a.text}</span>
            <button className="btn !min-h-9" aria-label="Dismiss announcement" onClick={() => dismiss(a.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
