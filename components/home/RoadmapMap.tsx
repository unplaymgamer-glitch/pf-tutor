"use client";
import Link from "next/link";
import { Fragment } from "react";
import { useProgress } from "../useProgress";
import { ChapterStatus } from "../topic/ChapterStatus";

export type MapChapter = { week: number; title: string; summary: string; assessment?: string; slugs: string[]; hue: number; icon: string };

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
                  <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: "linear-gradient(135deg, var(--wk-soft), color-mix(in srgb, var(--wk) 30%, transparent))", border: "1px solid color-mix(in srgb, var(--wk) 40%, transparent)" }}>{c.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--wk)" }}>Week {c.week}{c.assessment ? ` · ${c.assessment}` : ""}</div>
                    <div className="font-semibold leading-snug">{c.title}</div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted">{c.summary}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" role="img" aria-label={`${done} of ${c.slugs.length} lessons finished`} style={{ background: "var(--wk-soft)" }}><div className="h-full rounded-full" style={{ width: `${c.slugs.length ? (done / c.slugs.length) * 100 : 0}%`, background: "var(--wk)", transition: "width .6s ease" }} /></div>
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
