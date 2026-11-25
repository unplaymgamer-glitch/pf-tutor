"use client";
import { stars } from "@/lib/progress";
import { useProgress } from "../useProgress";
import { useSiteState } from "../SiteState";

export function ProgressBadge({ k }: { k: string }) {
  const { progress } = useProgress();
  const site = useSiteState();
  const t = progress.topics[k];
  const s = stars(t);
  // k looks like "w2/if-statement"
  const [wk, slug] = [Number(k.slice(1).split("/")[0]), k.split("/")[1]];
  const taught = !!site?.taughtTopics.includes(`${wk}/${slug}`) || !!site?.weeks.find((w) => w.week === wk)?.taught;
  const mark = taught ? " · Taught in class ✅" : "";
  if (t?.done) return <span aria-label={`Completed, ${s} stars`} className="text-success">✅ {"⭐".repeat(s)}{mark}</span>;
  if (t?.visited) return <span className="text-muted">📖 in progress{mark}</span>;
  return <span className="text-muted">{taught ? "Taught in class ✅" : "not started"}</span>;
}
