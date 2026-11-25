"use client";
import { useState } from "react";
import { resolveOverload, type T } from "@/lib/visuals/resolver";

const TYPES: T[] = ["int", "double", "char", "bool", "string"];
const EXAMPLE: Record<T, string> = { int: "5", double: "2.5", char: "'A'", bool: "true", string: '"hi"' };

/** Choose the argument types of a call and see which overloaded function C++ picks (or why it refuses). */
export function ResolverVisual({ title, overloads, argTypes }: { title: string; overloads: { sig: string; params: T[] }[]; argTypes: T[] }) {
  const [args, setArgs] = useState<T[]>(argTypes);
  const name = overloads[0].sig.split("(")[0];
  const r = resolveOverload(overloads, args);
  const n = Math.max(...overloads.map((o) => o.params.length));
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="flex flex-wrap items-end gap-3">
        {Array.from({ length: Math.min(n, 3) }, (_, k) => (
          <label key={k} className="grid gap-1 text-sm">Argument {k + 1}
            <select className="btn" value={args[k] ?? ""} onChange={(e) => { const next = [...args]; if (e.target.value) next[k] = e.target.value as T; else next.splice(k); setArgs(next.filter(Boolean) as T[]); }}>
              {k > 0 && <option value="">(none)</option>}
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        ))}
      </div>
      <p className="font-mono text-lg" dir="ltr">{name}({args.map((a) => EXAMPLE[a]).join(", ")});</p>
      <ul className="grid gap-2" aria-label="Overloads">
        {overloads.map((o, i) => (
          <li key={o.sig} className={`rounded-lg border-2 p-2 font-mono ${r.chosen === i ? "border-success bg-success/10" : "border-border"}`} dir="ltr">
            {o.sig} {r.chosen === i && <span className="text-success">← chosen</span>}
            {r.ranks[i] === null ? <span className="text-sm text-muted"> (different number of arguments)</span> : <span className="text-sm text-muted"> match quality: {r.ranks[i]!.map((x) => (x === 3 ? "exact" : x === 2 ? "promotion" : x === 1 ? "conversion" : "no")).join(", ")}</span>}
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className={`box ${r.chosen === null ? "box-error" : "box-definition"}`}>{r.reason}</p>
    </div>
  );
}
