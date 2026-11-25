"use client";
import Link from "next/link";
import { useState } from "react";
import { useSettings } from "./SettingsProvider";
import { useProgress } from "./useProgress";
import { levelFor } from "@/lib/game/levels";
import { streakAlive } from "@/lib/game/streak";
import { dayKey } from "@/lib/game/dates";
import { dueKeys } from "@/lib/game/review";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-primary">CC111 PF Hub · C++ at UMT</Link>
        <div className="flex items-center gap-2">
          <Link href="/playground" className="btn inline-flex items-center no-underline" aria-label="Playground: run C++">▶<span className="hidden sm:inline">&nbsp;Playground</span></Link>
          <Link href="/search" className="btn inline-flex items-center no-underline" aria-label="Search lessons">🔍 <span className="hidden sm:inline">&nbsp;Search</span></Link>
          <button
            className="btn"
            aria-expanded={open}
            aria-controls="settings-panel"
            onClick={() => setOpen((o) => !o)}
          >
            ⚙ <span className="hidden sm:inline">Settings</span><span className="sm:hidden sr-only">Settings</span>
          </button>
        </div>
      </div>
      <SubNav />
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </header>
  );
}

function SubNav() {
  const { progress: p } = useProgress();
  const today = dayKey(new Date());
  const lv = levelFor(p.xp);
  const due = dueKeys(p.review, today).length;
  const alive = streakAlive(p.streak, today);
  const link = "inline-flex min-h-11 items-center whitespace-nowrap rounded px-2 text-sm no-underline hover:text-primary";
  return (
    <nav aria-label="Main" className="border-t border-border">
      <ul className="scroll-quiet mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4">
        <li className="shrink-0"><Link className={link} href="/">Lessons</Link></li>
        <li className="shrink-0"><Link className={link} href="/practice">Practice</Link></li>
        <li className="shrink-0"><Link className={link} href="/review">Review{due > 0 && <span className="ms-1 rounded-full bg-primary px-2 text-xs text-onprimary" aria-label={`${due} cards due`}>{due}</span>}</Link></li>
        <li className="shrink-0"><Link className={link} href="/mock">Mock exams</Link></li>
        <li className="shrink-0"><Link className={link} href="/revision/mid">Mid-term</Link></li>
        <li className="shrink-0"><Link className={link} href="/revision/final">Final</Link></li>
        <li className="ms-auto shrink-0"><Link className={`${link} font-semibold`} href="/progress" aria-label={`My progress: level ${lv.name}, ${p.xp} XP, ${p.streak.count} day streak`}>{lv.icon} {p.xp} XP <span className="ms-2">{alive ? "🔥" : "💤"}{p.streak.count}</span></Link></li>
      </ul>
    </nav>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings: s, update } = useSettings();
  return (
    <section id="settings-panel" aria-label="Settings" className="border-t border-border bg-surface px-4 py-4">
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
        <label className="grid gap-1">Language
          <select className="btn" value={s.lang} onChange={(e) => update({ lang: e.target.value as typeof s.lang })}>
            <option value="en">English</option>
            <option value="roman">Roman Urdu</option>
            <option value="ur">اردو (Urdu script)</option>
          </select>
        </label>
        <label className="grid gap-1">Theme
          <select className="btn" value={s.theme} onChange={(e) => update({ theme: e.target.value as typeof s.theme })}>
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="grid gap-1">Text size ({Math.round(s.fontScale * 100)}%)
          <input type="range" min={0.9} max={1.5} step={0.05} value={s.fontScale}
            onChange={(e) => update({ fontScale: Number(e.target.value) })} />
        </label>
        {/* The "3D scenes" control returns together with real 3D scenes (V2 phase D). It is not shown while it would change nothing. */}
        <Toggle label="Reduce motion" checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        <Toggle label="Low-data mode" checked={s.lowData} onChange={(v) => update({ lowData: v })} />
        <Toggle label="Dyslexia-friendly text" checked={s.dyslexia} onChange={(v) => update({ dyslexia: v })} />
      </div>
      <div className="mx-auto mt-3 max-w-4xl"><button className="btn" onClick={onClose}>Close</button></div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" className="h-5 w-5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
