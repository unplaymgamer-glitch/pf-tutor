import "server-only";
import type { CodeSample, Visual } from "./content-schema";
import { allSamples } from "./content-schema";
import { allTopics, getTopic } from "./content";

// Index of every animation and step-through in the course, for the Visual Lab. The index carries metadata only (small);
// the visual itself is loaded on demand from /api/visual so the gallery page stays light.
export type VisualItem = { id: string; week: number; slug: string; lesson: string; kind: string; title: string };

const TRACE_PREFIX = "t:";

export function visualIndex(): VisualItem[] {
  const items: VisualItem[] = [];
  for (const t of allTopics()) {
    t.visuals.forEach((v, i) => { if (v.kind !== "trace") items.push({ id: `v${i}`, week: t.week, slug: t.slug, lesson: t.title, kind: v.kind, title: v.title }); });
    for (const w of t.worked) if (w.sample.trace) items.push({ id: TRACE_PREFIX + w.sample.id, week: t.week, slug: t.slug, lesson: t.title, kind: "trace", title: `Step through: ${w.sample.title}` });
  }
  return items;
}

/** One visual plus the code samples it needs (only traces and graphics read samples). */
export function loadVisual(week: number, slug: string, id: string): { visual: Visual; samples: CodeSample[]; lesson: string } | null {
  const t = getTopic(week, slug);
  if (!t) return null;
  if (id.startsWith(TRACE_PREFIX)) {
    const s = allSamples(t).find((x) => x.id === id.slice(TRACE_PREFIX.length) && x.trace);
    return s ? { visual: { kind: "trace", title: `Step through: ${s.title}` }, samples: [s], lesson: t.title } : null;
  }
  const m = /^v(\d{1,3})$/.exec(id);
  const v = m ? t.visuals[Number(m[1])] : undefined;
  if (!v || v.kind === "trace") return null;
  return { visual: v, samples: v.kind === "canvas" ? allSamples(t).filter((s) => s.id === v.sampleId) : [], lesson: t.title };
}
