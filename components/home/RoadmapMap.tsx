"use client";
import Link from "next/link";
import { Fragment } from "react";
import { useProgress } from "../useProgress";
import { ChapterStatus } from "../topic/ChapterStatus";

export type MapChapter = { week: number; title: string; summary: string; assessment?: string; slugs: string[]; hue: number; icon: string };

function Ring({ done, total, icon }: { done: number; total: number; icon: string }) {
  const r = 20, c = 2 * Math.PI * r, frac = total ? done / total : 0;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`${done} of ${total} lessons finished`}>
      <circle cx="26" cy="26" r={r} fill="var(--wk-soft)" stroke="color-mix(in srgb, var(--wk) 22%, transparent)" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--wk)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 26 26)" style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="26" y="32" textAnchor="middle" fontSize="18" aria-hidden>{icon}</text>
    </svg>
  );
}

/** The 16 weeks as a colourful skill map: each week has its own accent, a progress ring and lesson count; Mid-term and Final are milestones. */
export function RoadmapMap({ chapters, midAfter = 8 }: { chapters: MapChapter[]; midAfter?: number }) {
  const { progress } = useProgress();
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" id="roadmap">
      {chapters.map((c) => {
        const done = c.slugs.filter((s) => progress.topics[`w${c.week}/${s}`]?.done).length;
        return (
          <Fragment key={c.week}>
            <li className="wk" style={{ ["--wk-h" as string]: c.hue }}>
              <Link href={`/week-${c.week}`} className="card card-link h-full" style={{ borderTop: "3px solid var(--wk)" }}>
                <div className="flex items-start gap-3">
                  <Ring done={done} total={c.slugs.length} icon={c.icon} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--wk)" }}>Week {c.week}{c.assessment ? ` · ${c.assessment}` : ""}</div>
                    <div className="font-semibold leading-snug">{c.title}</div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted">{c.summary}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="pill">{c.slugs.length} lessons{done ? ` · ${done} done` : ""}</span>
                  <ChapterStatus week={c.week} />
                </div>
              </Link>
            </li>
            {c.week === midAfter && (
              <li className="col-span-full" key="mid">
                <div className="card flex flex-wrap items-center justify-between gap-3" style={{ borderStyle: "dashed" }}>
                  <div><div className="text-lg font-semibold">🏁 Mid-term milestone</div><p className="text-sm text-muted">Weeks 1–{midAfter} on a few pages, plus a timed mock.</p></div>
                  <div className="flex flex-wrap gap-2"><Link className="btn" href="/revision/mid">Mid-term hub</Link><Link className="btn btn-primary inline-flex items-center no-underline" href="/mock">Mock exam</Link></div>
                </div>
              </li>
            )}
          </Fragment>
        );
      })}
      <li className="col-span-full">
        <div className="card flex flex-wrap items-center justify-between gap-3" style={{ borderStyle: "dashed" }}>
          <div><div className="text-lg font-semibold">🏆 Final exam milestone</div><p className="text-sm text-muted">The whole course in one revision hub and a 60-minute mock.</p></div>
          <div className="flex flex-wrap gap-2"><Link className="btn" href="/revision/final">Final hub</Link><Link className="btn btn-primary inline-flex items-center no-underline" href="/mock">Mock exam</Link></div>
        </div>
      </li>
    </ol>
  );
}
