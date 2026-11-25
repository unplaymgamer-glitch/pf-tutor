"use client";
import Link from "next/link";
import { useState } from "react";
import { useSettings } from "./SettingsProvider";
import { useProgress } from "./useProgress";
import { levelFor } from "@/lib/game/levels";
import { streakAlive } from "@/lib/game/streak";
import { dayKey } from "@/lib/game/dates";
import { dueKeys } from "@/lib/game/review";

/** Small bold line icon (stroke 2.6) so the toolbar stays tiny but clear. */
function Ico({ d, fill }: { d: string; fill?: boolean }) {
  return <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { settings: s, update } = useSettings();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-bold no-underline">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold max-[420px]:hidden" style={{ background: "linear-gradient(135deg, var(--grad-a), var(--grad-b))", color: "var(--on-primary)" }}>C++</span>
          <span className="gradient-text whitespace-nowrap max-[420px]:text-sm">CC111 PF Hub</span>        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/playground" className="btn btn-sm hidden no-underline sm:inline-flex" aria-label="Playground: run C++"><Ico d="M8 5v14l11-7z" fill /><span className="hidden md:inline">Playground</span></Link>
          <Link href="/search" className="btn btn-sm hidden no-underline sm:inline-flex" aria-label="Search lessons"><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5.5 12.5L21 21" /><span className="hidden md:inline">Search</span></Link>
          <select className="btn btn-sm !px-1.5" aria-label="Language" value={s.lang} onChange={(e) => update({ lang: e.target.value as typeof s.lang })}>
            <option value="en">EN</option>
            <option value="roman">Roman</option>
            <option value="ur">اردو</option>
          </select>
          <button className="btn btn-sm inline-flex" aria-label="Switch between dark and light theme" onClick={() => { const dark = s.theme === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : s.theme === "dark"; update({ theme: dark ? "light" : "dark" }); }}>
            <span className="ti-to-light"><Ico d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></span>
            <span className="ti-to-dark"><Ico d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></span>
          </button>
          <button className="btn btn-sm inline-flex" aria-pressed={s.reduceMotion} aria-label="Pause animations" onClick={() => update({ reduceMotion: !s.reduceMotion })}>
            {s.reduceMotion ? <Ico d="M8 5v14l11-7z" fill /> : <Ico d="M7 5v14M17 5v14" />}
          </button>
          <button className="btn btn-sm inline-flex" aria-expanded={open} aria-controls="settings-panel" onClick={() => setOpen((o) => !o)}>
            <Ico d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.600 3h-4l-.4 2.600a7 7 0 0 0-2 1.200l-2.300-.9-2 3.400 2 1.500a7 7 0 0 0 0 2.400l-2 1.500 2 3.400 2.300-.9a7 7 0 0 0 2 1.200l.4 2.600h4l.4-2.600a7 7 0 0 0 2-1.200l2.300.9 2-3.400-2-1.500c.1-.4.1-.8.1-1.200z" /><span className="hidden lg:inline">Settings</span><span className="sr-only lg:hidden">Settings</span>
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
