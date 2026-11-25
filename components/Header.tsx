"use client";
import Link from "next/link";
import { useState } from "react";
import { useSettings } from "./SettingsProvider";
import { T, useT } from "./I18n";
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
  const { t } = useT();
  const { progress: p } = useProgress();
  const today = dayKey(new Date());
  const lv = levelFor(p.xp);
  const due = dueKeys(p.review, today).length;
  const alive = streakAlive(p.streak, today);
  const nav = "inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-2.5 text-sm font-medium no-underline hover:text-primary";
  const langs = [["en", "English"], ["roman", "Roman"], ["ur", "اردو"]] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1.5">
        <Link href="/" aria-label="C++ CC111 PF Hub" className="me-2 inline-flex min-h-11 items-center gap-2 font-bold no-underline">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold max-[420px]:hidden" style={{ background: "linear-gradient(135deg, var(--grad-a), var(--grad-b))", color: "var(--on-primary)" }}>C++</span>
          <span className="gradient-text whitespace-nowrap max-[420px]:text-sm lg:max-xl:hidden">CC111 PF Hub</span>
        </Link>
        <nav aria-label="Main" className="ms-auto hidden items-center lg:flex">
          <Link className={nav} href="/"><T k="nav.home" /></Link>
          <Link className={nav} href="/#modules"><T k="nav.modules" /></Link>
          <Link className={nav} href="/chat"><T k="nav.ask" /></Link>
          <Link className={nav} href="/visual-lab"><T k="nav.visualLab" /></Link>
          <Link className={`${nav} hidden xl:inline-flex`} href="/practice"><T k="nav.practice" />{due > 0 && <span className="ms-1 rounded-full bg-primary px-1.5 text-xs text-onprimary" aria-label={`${due} cards due`}>{due}</span>}</Link>
          <Link className={`${nav} hidden xl:inline-flex`} href="/playground"><T k="nav.playground" /></Link>
          <Link className={nav} href="/more"><T k="nav.more" /></Link>
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1 lg:ms-3">
          <div role="group" aria-label={t("nav.language")} className="hidden rounded-xl border border-border p-0.5 xl:flex">
            {langs.map(([v, label]) => <button key={v} aria-pressed={s.lang === v} className={`min-h-8 rounded-lg px-2.5 text-xs font-semibold ${s.lang === v ? "bg-primary text-onprimary" : "text-muted hover:text-text"}`} onClick={() => update({ lang: v })}>{label}</button>)}
          </div>
          <select className="btn btn-sm !px-1.5 xl:hidden" aria-label={t("nav.language")} value={s.lang} onChange={(e) => update({ lang: e.target.value as typeof s.lang })}>
            <option value="en">EN</option>
            <option value="roman">Roman</option>
            <option value="ur">اردو</option>
          </select>
          <Link href="/search" className="btn btn-sm hidden no-underline sm:inline-flex" aria-label={t("nav.search")}><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5.5 12.5L21 21" /></Link>
          <button className="btn btn-sm inline-flex" aria-label={t("nav.theme")} onClick={() => { const dark = s.theme === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : s.theme === "dark"; update({ theme: dark ? "light" : "dark" }); }}>
            <span className="ti-to-light"><Ico d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></span>
            <span className="ti-to-dark"><Ico d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></span>
          </button>
          <button className="btn btn-sm inline-flex max-[360px]:hidden" aria-pressed={s.reduceMotion} aria-label={t("nav.pause")} onClick={() => update({ reduceMotion: !s.reduceMotion })}>
            {s.reduceMotion ? <Ico d="M8 5v14l11-7z" fill /> : <Ico d="M7 5v14M17 5v14" />}
          </button>
          <button className="btn btn-sm inline-flex" aria-expanded={open} aria-controls="settings-panel" aria-label={t("nav.settings")} onClick={() => setOpen((o) => !o)}>
            <Ico d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.6 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
          </button>
          <Link className="ms-1 inline-flex min-h-8 items-center whitespace-nowrap rounded-lg px-1.5 text-xs font-semibold no-underline" href="/progress" aria-label={`${t("nav.progress")}: ${lv.name}, ${p.xp} XP, ${p.streak.count}`}>{lv.icon} {p.xp} XP <span className="ms-1.5">{alive ? "🔥" : "💤"}{p.streak.count}</span></Link>
        </div>
      </div>
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </header>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings: s, update, tier } = useSettings();
  const { t } = useT();
  return (
    <section id="settings-panel" aria-label={t("nav.settings")} className="border-t border-border bg-surface px-4 py-4">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
        <label className="grid gap-1"><T k="set.language" />
          <select className="btn" value={s.lang} onChange={(e) => update({ lang: e.target.value as typeof s.lang })}>
            <option value="en">English</option>
            <option value="roman">Roman Urdu</option>
            <option value="ur">اردو (Urdu script)</option>
          </select>
        </label>
        <label className="grid gap-1"><T k="set.theme" />
          <select className="btn" value={s.theme} onChange={(e) => update({ theme: e.target.value as typeof s.theme })}>
            <option value="system">{t("set.system")}</option>
            <option value="dark">{t("set.dark")}</option>
            <option value="light">{t("set.light")}</option>
          </select>
        </label>
        <label className="grid gap-1"><T k="set.textSize" vars={{ n: Math.round(s.fontScale * 100) }} />
          <input type="range" min={0.9} max={1.5} step={0.05} value={s.fontScale}
            onChange={(e) => update({ fontScale: Number(e.target.value) })} />
        </label>
        <label className="grid gap-1"><T k="set.threeD" vars={{ mode: tier === "low" ? "2D" : tier }} />
          <select className="btn" value={s.threeD} onChange={(e) => update({ threeD: e.target.value as typeof s.threeD })}>
            <option value="auto">{t("set.threeDAuto")}</option>
            <option value="on">{t("set.threeDOn")}</option>
            <option value="off">{t("set.threeDOff")}</option>
          </select>
        </label>
        <Toggle label="set.reduceMotion" checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        <Toggle label="set.lowData" checked={s.lowData} onChange={(v) => update({ lowData: v })} />
        <Toggle label="set.dyslexia" checked={s.dyslexia} onChange={(v) => update({ dyslexia: v })} />
      </div>
      <div className="mx-auto mt-3 max-w-5xl"><button className="btn" onClick={onClose}><T k="set.close" /></button></div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" className="h-5 w-5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <T k={label} />
    </label>
  );
}
