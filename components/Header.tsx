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
  const { settings: s, update } = useSettings();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-bold no-underline">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold max-[420px]:hidden" style={{ background: "linear-gradient(135deg, var(--grad-a), var(--grad-b))", color: "var(--on-primary)" }}>C++</span>
          <span className="gradient-text whitespace-nowrap max-[420px]:text-sm">CC111 PF Hub</span><span className="hidden whitespace-nowrap text-sm font-normal text-muted lg:inline">at UMT</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/playground" className="btn hidden items-center no-underline sm:inline-flex" aria-label="Playground: run C++">▶<span className="hidden md:inline">&nbsp;Playground</span></Link>
          <Link href="/search" className="btn hidden items-center no-underline sm:inline-flex" aria-label="Search lessons">🔍<span className="hidden md:inline">&nbsp;Search</span></Link>
          <select className="btn !px-2 text-sm" aria-label="Language" value={s.lang} onChange={(e) => update({ lang: e.target.value as typeof s.lang })}>
            <option value="en">EN</option>
            <option value="roman">Roman</option>
            <option value="ur">اردو</option>
          </select>
          <button className="btn" aria-label="Switch between dark and light theme" onClick={() => { const dark = s.theme === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : s.theme === "dark"; update({ theme: dark ? "light" : "dark" }); }}>
            <span aria-hidden className="ti-to-light">☀️</span><span aria-hidden className="ti-to-dark">🌙</span>
          </button>
          <button className="btn" aria-pressed={s.reduceMotion} aria-label="Pause animations" onClick={() => update({ reduceMotion: !s.reduceMotion })}>
            <span aria-hidden>{s.reduceMotion ? "▶" : "⏸"}</span>
          </button>
          <button className="btn" aria-expanded={open} aria-controls="settings-panel" onClick={() => setOpen((o) => !o)}>
            <span aria-hidden>⚙</span><span className="hidden lg:inline">&nbsp;Settings</span><span className="sr-only lg:hidden">Settings</span>
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
  const hideOnPhone = "hidden shrink-0 md:block"; // phones use the bottom bar for these
  return (
    <nav aria-label="Main" className="border-t border-border">
      <ul className="scroll-quiet mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4">
        <li className={hideOnPhone}><Link className={link} href="/">Home</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/#roadmap">Learn</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/visual-lab">Visual Lab</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/chat">AI Chat</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/practice">Practice</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/playground">Playground</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/review">Review{due > 0 && <span className="ms-1 rounded-full bg-primary px-2 text-xs text-onprimary" aria-label={`${due} cards due`}>{due}</span>}</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/mock">Mock exams</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/revision/mid">Mid-term</Link></li>
        <li className={hideOnPhone}><Link className={link} href="/revision/final">Final</Link></li>
        <li className="ms-auto shrink-0"><Link className={`${link} font-semibold`} href="/progress" aria-label={`My progress: level ${lv.name}, ${p.xp} XP, ${p.streak.count} day streak`}>{lv.icon} {p.xp} XP <span className="ms-2">{alive ? "🔥" : "💤"}{p.streak.count}</span></Link></li>
      </ul>
    </nav>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings: s, update, tier } = useSettings();
  return (
    <section id="settings-panel" aria-label="Settings" className="border-t border-border bg-surface px-4 py-4">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
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
        <label className="grid gap-1">3D scenes (now using: {tier === "low" ? "2D" : tier} view)
          <select className="btn" value={s.threeD} onChange={(e) => update({ threeD: e.target.value as typeof s.threeD })}>
            <option value="auto">Automatic (3D on laptops, 2D on phones)</option>
            <option value="on">Always 3D when possible</option>
            <option value="off">Off (simple 2D)</option>
          </select>
        </label>
        <Toggle label="Reduce motion (pause animations)" checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        <Toggle label="Low-data mode" checked={s.lowData} onChange={(v) => update({ lowData: v })} />
        <Toggle label="Dyslexia-friendly text" checked={s.dyslexia} onChange={(v) => update({ dyslexia: v })} />
      </div>
      <div className="mx-auto mt-3 max-w-5xl"><button className="btn" onClick={onClose}>Close</button></div>
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
