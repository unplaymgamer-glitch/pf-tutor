"use client";
import Link from "next/link";
import { useProgress } from "../useProgress";

export function ContinueCard() {
  const { progress } = useProgress();
  if (!progress.last) {
    return (
      <div className="box box-definition">
        <strong>New here?</strong> Start with <Link href="/week-1">Week 1</Link>. Each lesson explains one idea in simple words, then shows it with an animation and code.
      </div>
    );
  }
  return (
    <div className="box box-definition flex flex-wrap items-center justify-between gap-2">
      <span>Continue where you left off: <strong>{progress.last.title}</strong></span>
      <Link className="btn btn-primary inline-flex items-center" href={`/week-${progress.last.week}/${progress.last.slug}`}>Continue ▶</Link>
      <span className="text-sm text-muted">XP: {progress.xp}</span>
    </div>
  );
}
