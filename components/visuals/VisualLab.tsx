"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CodeSample, Visual } from "@/lib/content-schema";
import { CHAPTERS, WEEK_HUES, WEEK_ICONS } from "@/lib/course";
import type { VisualItem } from "@/lib/visual-index";
import { useTutor } from "../tutor/TutorProvider";
import { VisualRenderer } from "./VisualRenderer";

const KINDS: Record<string, { label: string; icon: string; group: "step" | "lab" | "diagram" }> = {
  trace: { label: "Step-through", icon: "👣", group: "step" },
  array: { label: "Array lab", icon: "🧱", group: "lab" }, sort: { label: "Sorting", icon: "📊", group: "lab" }, pattern: { label: "Pattern lab", icon: "🔺", group: "lab" },
  matrix: { label: "Matrix lab", icon: "🧮", group: "lab" }, resolver: { label: "Overload resolver", icon: "🧭", group: "lab" }, memory: { label: "Memory boxes", icon: "📦", group: "lab" },
  recursion: { label: "Call stack", icon: "♻️", group: "lab" }, decision: { label: "Decision demo", icon: "🔀", group: "lab" }, switch: { label: "Switch simulator", icon: "🎛️", group: "lab" },
  truth: { label: "Truth table", icon: "✅", group: "lab" }, canvas: { label: "Graphics", icon: "🎨", group: "lab" }, loop: { label: "Loop lab", icon: "🔁", group: "lab" }, scene3d: { label: "3D scene", icon: "🧊", group: "lab" },
  pipeline: { label: "Process diagram", icon: "➡️", group: "diagram" }, match: { label: "Match game", icon: "🧩", group: "diagram" },
};
const GROUPS = [["all", "All"], ["lab", "Interactive labs"], ["step", "Step-throughs"], ["diagram", "Diagrams and games"]] as const;
const info = (k: string) => KINDS[k] ?? { label: k, icon: "🎬", group: "lab" as const };

type Loaded = { visual: Visual; samples: CodeSample[]; lesson: string };

const PAGE = 12;

/** Searchable gallery of every visualization. Each opens full screen with its own controls, a link to the lesson and an "Ask AI" button. */
export function VisualLab({ items }: { items: VisualItem[] }) {
  const tutor = useTutor();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number][0]>("all");
  const [week, setWeek] = useState(0);
  const [limit, setLimit] = useState(PAGE); // the gallery starts with a page of cards and grows on request (327 at once made the page enormous)
  const [open, setOpen] = useState<VisualItem | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [err, setErr] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((v) => (group === "all" || info(v.kind).group === group) && (!week || v.week === week) && (!s || `${v.title} ${v.lesson} ${info(v.kind).label}`.toLowerCase().includes(s)));
  }, [items, q, group, week]);
  const visible = useMemo(() => shown.slice(0, limit), [shown, limit]);
  const byWeek = useMemo(() => {
    const m = new Map<number, VisualItem[]>();
    for (const v of visible) m.set(v.week, [...(m.get(v.week) ?? []), v]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [visible]);

  useEffect(() => {
    if (!open) return;
    let off = false;
    dlg.current?.showModal();
    fetch(`/api/visual?w=${open.week}&slug=${open.slug}&id=${encodeURIComponent(open.id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not available"))))
      .then((j: Loaded) => { if (!off) setLoaded(j); })
      .catch(() => { if (!off) setErr("This animation could not be loaded. Try again or open the lesson."); });
    return () => { off = true; };
  }, [open]);

  const close = () => { dlg.current?.close(); setOpen(null); setLoaded(null); };

  return (
    <div className="grid gap-5">
      <div className="card grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">Search animations
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="for example: sorting, pointer, recursion, matrix" className="btn text-start font-normal" style={{ cursor: "text" }} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Kind" className="flex flex-wrap gap-2">
            {GROUPS.map(([id, label]) => <button key={id} className={`btn ${group === id ? "btn-primary" : ""}`} aria-pressed={group === id} onClick={() => { setGroup(id); setLimit(PAGE); }}>{label}</button>)}
          </div>
          <label className="ms-auto flex items-center gap-2 text-sm">Week
            <select className="btn" value={week} onChange={(e) => { setWeek(Number(e.target.value)); setLimit(PAGE); }}>
              <option value={0}>All weeks</option>
              {CHAPTERS.map((c) => <option key={c.week} value={c.week}>{c.week}. {c.title}</option>)}
            </select>
          </label>
        </div>
        <p role="status" className="text-sm text-muted">{visible.length} of {items.length} shown{shown.length !== items.length ? ` · ${shown.length} match` : ""}</p>
      </div>

      {byWeek.length === 0 && <p className="box">Nothing matches. Try a shorter search.</p>}
      {byWeek.map(([w, list]) => {
        const c = CHAPTERS.find((x) => x.week === w);
        return (
          <section key={w} className="wk grid gap-2" style={{ ["--wk-h" as string]: WEEK_HUES[w - 1] }} aria-labelledby={`lab-w${w}`}>
            <h2 id={`lab-w${w}`} className="flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--wk)" }}><span aria-hidden>{WEEK_ICONS[w - 1]}</span>Week {w}: {c?.title} <span className="pill text-xs">{list.length}</span></h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v) => (
                <li key={`${v.slug}-${v.id}`}>
                  <button className="card card-link h-full w-full text-start" style={{ borderLeft: "4px solid var(--wk)", cursor: "pointer" }} onClick={() => { setLoaded(null); setErr(""); setOpen(v); }}>
                    <span className="pill mb-1 text-xs"><span aria-hidden>{info(v.kind).icon}</span>{info(v.kind).label}</span>
                    <span className="block font-semibold leading-snug">{v.title}</span>
                    <span className="block text-sm text-muted">{v.lesson}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {shown.length > visible.length && (
        <div className="flex justify-center"><button className="btn btn-primary" onClick={() => setLimit(limit + PAGE)}>Load more ({Math.min(PAGE, shown.length - visible.length)} of {shown.length - visible.length} left)</button></div>
      )}

      <dialog ref={dlg} onClose={() => { setOpen(null); setLoaded(null); }} aria-label={open ? `${open.title}` : "Animation"} className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-bg p-0 text-text backdrop:bg-black/70">
        {open && (
          <div className="wk mx-auto grid max-w-4xl gap-4 p-4" style={{ ["--wk-h" as string]: WEEK_HUES[open.week - 1] }}>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn" onClick={close} autoFocus>✕ Close</button>
              <span className="pill" style={{ color: "var(--wk)" }}>Week {open.week} · {open.lesson}</span>
              <span className="ms-auto flex flex-wrap gap-2">
                <Link className="btn btn-primary inline-flex items-center no-underline" href={`/week-${open.week}/${open.slug}`}>Open the lesson</Link>
                <button className="btn" onClick={() => { close(); tutor.open({ topic: `${open.lesson} (Week ${open.week})`, topicKey: `w${open.week}/${open.slug}`, text: `Explain this animation: ${open.title}` }); }}>💬 Ask AI about this</button>
              </span>
            </div>
            <h2 className="text-2xl font-bold">{open.title}</h2>
            {err && <p role="alert" className="box box-error">{err}</p>}
            {!loaded && !err && <div className="grid gap-2" aria-busy="true"><div className="skeleton h-8" /><div className="skeleton h-48" /></div>}
            {loaded && <VisualRenderer visual={loaded.visual} samples={loaded.samples} />}
          </div>
        )}
      </dialog>
    </div>
  );
}
