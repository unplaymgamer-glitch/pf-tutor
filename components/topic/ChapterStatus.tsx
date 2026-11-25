"use client";
import { useSiteState } from "../SiteState";

/** Roadmap badge for a chapter: locked by the instructor, or taught in class. */
export function ChapterStatus({ week }: { week: number }) {
  const s = useSiteState();
  const w = s?.weeks.find((x) => x.week === week);
  if (!w) return null;
  if (s?.maintenance) return <span className="text-muted">⏸ paused</span>;
  if (w.locked) return <span className="text-muted">🔒 {w.unlockAt ? `opens ${new Date(w.unlockAt).toLocaleString()}` : "locked"}</span>;
  if (w.taught) return <span className="text-success">✅ Taught in class</span>;
  return <span className="text-primary">📖 open</span>;
}
