"use client";
import Link from "next/link";
import { useState } from "react";
import type { CourseModule } from "@/lib/course";
import { useProgress } from "../useProgress";
import { ChapterStatus } from "../topic/ChapterStatus";
import { useTutor } from "../tutor/TutorProvider";
import { ModuleArt } from "./ModuleArt";

export type ModuleCard = CourseModule & { label: string; lessons: { key: string; slug: string; title: string; week: number }[] };

function Ring({ pct }: { pct: number }) {
  const r = 15, c = 2 * Math.PI * r;
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" role="img" aria-label={`${pct}% finished`}>
      <circle cx="21" cy="21" r="19" fill="var(--bg)" fillOpacity=".85" />
      <circle cx="21" cy="21" r={r} fill="none" stroke="color-mix(in srgb, var(--wk) 25%, transparent)" strokeWidth="3" />
      <circle cx="21" cy="21" r={r} fill="none" stroke="var(--wk)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 21 21)" style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="21" y="25" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)">{pct}%</text>
    </svg>
  );
}

/** Choose a module: ten cards (six before the Mid-term, four after). Open "sub-topics" to jump to a lesson or ask the tutor about just that lesson. */
export function ModuleGrid({ modules, midAfter = 8 }: { modules: ModuleCard[]; midAfter?: number }) {
  const { progress } = useProgress();
  const tutor = useTutor();
  const [phase, setPhase] = useState<"all" | "pre" | "post">("all");
  const [open, setOpen] = useState<number | null>(null);
  const shown = modules.filter((m) => phase === "all" || m.phase === phase);
  const pre = modules.filter((m) => m.phase === "pre").length;
  const tabs = [
    { v: "all" as const, t: "All modules", s: "Weeks 1–16" },
    { v: "pre" as const, t: "Pre-Midterm", s: `Weeks 1–${midAfter} · Modules 1–${pre}` },
    { v: "post" as const, t: "Post-Midterm", s: `Weeks ${midAfter + 1}–16 · Modules ${pre + 1}–${modules.length}` },
  ];
  return (
    <div className="grid gap-5">
      <div role="tablist" aria-label="Show modules" className="flex flex-wrap gap-2">
        {tabs.map((x) => (
          <button key={x.v} role="tab" aria-selected={phase === x.v} onClick={() => setPhase(x.v)}
            className={`min-h-14 rounded-2xl border px-4 text-start transition-colors ${phase === x.v ? "border-primary bg-surface2" : "border-border hover:border-primary"}`}>
            <span className="block font-semibold">{x.t}</span><span className="block text-xs text-muted">{x.s}</span>
          </button>
        ))}
      </div>
      <ul className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shown.map((m) => {
          const done = m.lessons.filter((l) => progress.topics[l.key]?.done).length;
          const pct = m.lessons.length ? Math.round((done / m.lessons.length) * 100) : 0;
          const isOpen = open === m.id;
          return (
            <li key={m.id} className="wk module-card card overflow-hidden !p-0" style={{ ["--wk-h" as string]: m.hue, borderTop: "3px solid var(--wk)" }}>
              <div className="relative h-40" style={{ background: "linear-gradient(160deg, var(--wk-soft), transparent 75%)" }}>
                <ModuleArt art={m.art} />
                <span className="absolute start-3 top-3 rounded-full bg-bg/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">{m.phase === "pre" ? "Pre-mid" : "Post-mid"} · {m.label}</span>
                <span className="absolute end-3 top-3"><Ring pct={pct} /></span>
              </div>
              <div className="grid gap-2 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Module {m.id} · {m.label}</p>
                <h3 className="text-xl font-bold leading-snug"><span aria-hidden>{m.icon} </span>{m.title}</h3>
                <p className="text-sm text-muted">{m.blurb}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button className="rounded-full border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: "var(--wk)", color: "var(--wk)" }} aria-expanded={isOpen} aria-controls={`mod-${m.id}`} onClick={() => setOpen(isOpen ? null : m.id)}>
                    {m.lessons.length} sub-topics <span aria-hidden>{isOpen ? "▴" : "▾"}</span>
                  </button>
                  {m.weeks.length === 1 && <ChapterStatus week={m.weeks[0]} />}
                </div>
                {isOpen && (
                  <ol id={`mod-${m.id}`} className="mt-2 grid gap-0.5 border-t border-border pt-2">
                    {m.lessons.map((l, i) => (
                      <li key={l.key} className="flex items-center gap-1">
                        <Link href={`/week-${l.week}/${l.slug}`} className="group flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 no-underline hover:bg-surface2">
                          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ background: progress.topics[l.key]?.done ? "var(--wk)" : "var(--wk-soft)", color: progress.topics[l.key]?.done ? "var(--on-primary)" : "var(--wk)" }}>{progress.topics[l.key]?.done ? "✓" : i + 1}</span>
                          <span className="min-w-0 flex-1 text-sm"><span className="line-clamp-2 block leading-snug" title={l.title}>{l.title}</span>{m.weeks.length > 1 && <span className="block text-xs text-muted">Week {l.week}</span>}</span>
                          <span aria-hidden className="text-muted transition-transform group-hover:translate-x-1">→</span>
                        </Link>
                        <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface2 hover:text-primary" aria-label={`Ask the tutor about ${l.title}`} onClick={() => tutor.open({ topic: l.title, topicKey: l.key })}>💬</button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card flex flex-wrap items-center justify-between gap-3" style={{ borderStyle: "dashed" }}>
          <div><div className="text-lg font-semibold">🏁 Mid-term milestone</div><p className="text-sm text-muted">Weeks 1–{midAfter} on a few pages, plus a timed mock.</p></div>
          <div className="flex flex-wrap gap-2"><Link className="btn" href="/revision/mid">Mid-term hub</Link><Link className="btn btn-primary inline-flex items-center no-underline" href="/mock">Mock exam</Link></div>
        </div>
        <div className="card flex flex-wrap items-center justify-between gap-3" style={{ borderStyle: "dashed" }}>
          <div><div className="text-lg font-semibold">🏆 Final exam milestone</div><p className="text-sm text-muted">The whole course in one revision hub and a 60-minute mock.</p></div>
          <div className="flex flex-wrap gap-2"><Link className="btn" href="/revision/final">Final hub</Link><Link className="btn btn-primary inline-flex items-center no-underline" href="/mock">Mock exam</Link></div>
        </div>
      </div>
    </div>
  );
}
