"use client";
import Link from "next/link";
import { useProgress } from "../useProgress";
import { T } from "../I18n";

export function ContinueCard() {
  const { progress } = useProgress();
  if (!progress.last) {
    return (
      <div className="box box-definition">
        <Link href="/week-1" className="no-underline"><T k="cont.new" /></Link>
      </div>
    );
  }
  return (
    <div className="box box-definition flex flex-wrap items-center justify-between gap-2">
      <span><T k="cont.where" /> <strong>{progress.last.title}</strong></span>
      <Link className="btn btn-primary inline-flex items-center" href={`/week-${progress.last.week}/${progress.last.slug}`}><T k="cont.button" /> ▶</Link>
      <span className="text-sm text-muted"><T k="cont.xp" vars={{ n: progress.xp }} /></span>
    </div>
  );
}
