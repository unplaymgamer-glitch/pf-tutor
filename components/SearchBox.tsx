"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MiniSearch from "minisearch";

type Doc = { id: string; week: number; slug: string; title: string; goal: string; text: string };

export function SearchBox() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const engine = useRef<MiniSearch<Doc> | null>(null);
  const [hits, setHits] = useState<Doc[]>([]);

  useEffect(() => {
    let off = false;
    fetch("/search-index.json")
      .then((r) => r.json() as Promise<Doc[]>)
      .then((docs) => {
        if (off) return;
        const m = new MiniSearch<Doc>({ fields: ["title", "goal", "text"], storeFields: ["week", "slug", "title", "goal"], searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3 } } });
        m.addAll(docs);
        engine.current = m;
        setStatus("ready");
      })
      .catch(() => !off && setStatus("error"));
    return () => { off = true; };
  }, []);

  const run = (v: string) => {
    setQ(v);
    setHits(engine.current && v.trim() ? (engine.current.search(v).slice(0, 12) as unknown as Doc[]) : []);
  };

  return (
    <div className="grid gap-3">
      <label className="grid gap-1">
        <span className="font-semibold">Search lessons</span>
        <input type="search" value={q} onChange={(e) => run(e.target.value)} placeholder="e.g. switch, pointer, semicolon" className="btn !min-h-12 text-start" autoFocus />
      </label>
      {status === "loading" && <p className="text-muted">Loading search…</p>}
      {status === "error" && <p className="box box-warning">Search could not load. You can still browse lessons from the home page.</p>}
      {q.trim() && status === "ready" && hits.length === 0 && <p>No lesson found. Try a shorter word.</p>}
      <ul className="grid gap-2" aria-live="polite">
        {hits.map((h) => (
          <li key={`${h.week}/${h.slug}`}>
            <Link className="box block no-underline" href={`/week-${h.week}/${h.slug}`}>
              <span className="text-sm text-muted">Week {h.week}</span>
              <span className="block font-semibold">{h.title}</span>
              <span className="block text-sm text-muted">{h.goal}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
