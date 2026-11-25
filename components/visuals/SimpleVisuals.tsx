"use client";
import { useMemo, useState } from "react";
import type { Visual } from "@/lib/content-schema";
import { truthy } from "@/lib/expr";

type V<K extends Visual["kind"]> = Extract<Visual, { kind: K }>;

export function Pipeline({ v }: { v: V<"pipeline"> }) {
  const [i, setI] = useState(0);
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{v.title}</h3>
      <ol className="grid gap-2" aria-label="Stages">
        {v.stages.map((s, k) => (
          <li key={s.name}>
            <button
              className={`btn w-full text-start ${k === i ? "border-primary" : ""} ${k < i ? "opacity-70" : ""}`}
              aria-current={k === i ? "step" : undefined}
              onClick={() => setI(k)}
            >
              <strong>{k + 1}. {s.name}</strong>
            </button>
          </li>
        ))}
      </ol>
      <p role="status" className="box box-definition">{v.stages[i].detail}</p>
      <div className="flex gap-2">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>◀ Back</button>
        <button className="btn btn-primary" disabled={i === v.stages.length - 1} onClick={() => setI(i + 1)}>Next ▶</button>
      </div>
    </div>
  );
}

export function Decision({ v }: { v: V<"decision"> }) {
  const [vals, setVals] = useState<Record<string, number>>(Object.fromEntries(v.vars.map((x) => [x.name, x.value])));
  const hit = useMemo(() => v.branches.findIndex((b) => truthy(b.expr, vals)), [v.branches, vals]);
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{v.title}</h3>
      {v.vars.map((x) => (
        <label key={x.name} className="grid gap-1">
          <span>{x.label ?? x.name} = <strong className="font-mono">{vals[x.name]}</strong></span>
          <input type="range" min={x.min} max={x.max} value={vals[x.name]} onChange={(e) => setVals({ ...vals, [x.name]: Number(e.target.value) })} />
        </label>
      ))}
      <ol className="grid gap-2" aria-label="Conditions checked in order">
        {v.branches.map((b, k) => {
          const checked = hit === -1 || k <= hit;
          const ok = k === hit;
          return (
            <li key={k} className={`rounded-lg border p-2 ${ok ? "border-success" : "border-border"} ${checked ? "" : "border-dashed text-muted"}`}>
              <code className="font-mono" dir="ltr">{k === 0 ? "if" : "else if"} ({b.expr})</code>{" "}
              <span>{!checked ? "— skipped" : ok ? `→ TRUE ✓ ${b.label}` : "→ false ✗"}</span>
            </li>
          );
        })}
        {v.elseLabel && (
          <li className={`rounded-lg border p-2 ${hit === -1 ? "border-success" : "border-border border-dashed text-muted"}`}>
            <code className="font-mono">else</code> <span>{hit === -1 ? `→ runs: ${v.elseLabel}` : "— skipped"}</span>
          </li>
        )}
      </ol>
      <p role="status" className="box box-exam">
        {hit >= 0 ? v.branches[hit].label : v.elseLabel ?? "No branch runs, the program continues after the if."}
      </p>
    </div>
  );
}

export function Truth({ v }: { v: V<"truth"> }) {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const f = (x: boolean, y: boolean) => (v.op === "and" ? x && y : v.op === "or" ? x || y : !x);
  const sym = v.op === "and" ? "&&" : v.op === "or" ? "||" : "!";
  const rows = v.op === "not" ? [[true], [false]] : [[true, true], [true, false], [false, true], [false, false]];
  const short = v.op === "and" ? !a : v.op === "or" ? a : false;
  const T = (x: boolean) => (x ? "true" : "false");
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{v.title}</h3>
      <div className="flex flex-wrap gap-2">
        <button className="btn" aria-pressed={a} onClick={() => setA(!a)}>A = {T(a)}</button>
        {v.op !== "not" && <button className="btn" aria-pressed={b} onClick={() => setB(!b)}>B = {T(b)}</button>}
      </div>
      <p className="font-mono text-lg" dir="ltr">
        {v.op === "not" ? `!${T(a)}` : `${T(a)} ${sym} ${T(b)}`} → <strong>{T(f(a, b))}</strong>
      </p>
      {v.op !== "not" && (
        <p role="status" className="box box-exam">
          {short
            ? `Short-circuit: A is ${T(a)}, so C++ already knows the answer is ${v.op === "and" ? "false" : "true"} and never checks B.`
            : "A did not decide the answer, so C++ also checks B."}
        </p>
      )}
      <table className="w-full border-collapse text-center">
        <caption className="sr-only">Truth table for {sym}</caption>
        <thead>
          <tr>{v.op === "not" ? <><th>A</th><th>!A</th></> : <><th>A</th><th>B</th><th>A {sym} B</th></>}</tr>
        </thead>
        <tbody>
          {rows.map((r, k) => {
            const active = v.op === "not" ? r[0] === a : r[0] === a && r[1] === b;
            return (
              <tr key={k} className={active ? "bg-primary/20 font-semibold" : ""}>
                {r.map((c, j) => <td key={j} className="border border-border p-1">{T(c)}</td>)}
                <td className="border border-border p-1">{T(f(r[0], r[1] ?? false))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SwitchSim({ v }: { v: V<"switch"> }) {
  const [n, setN] = useState(v.value);
  const start = v.cases.findIndex((c) => c.value === n);
  const ran: number[] = [];
  if (start >= 0) for (let k = start; k < v.cases.length; k++) { ran.push(k); if (v.cases[k].breaks) break; }
  const fellOff = start >= 0 && ran.length > 0 && !v.cases[ran[ran.length - 1]].breaks;
  const runDefault = !!v.defaultText && (start < 0 || fellOff);
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{v.title}</h3>
      <label className="grid gap-1">
        <span>choice = <strong className="font-mono">{n}</strong></span>
        <input type="range" min={v.min} max={v.max} value={n} onChange={(e) => setN(Number(e.target.value))} />
      </label>
      <ul className="grid gap-2" aria-label="switch cases">
        {v.cases.map((c, k) => (
          <li key={k} className={`rounded-lg border p-2 ${ran.includes(k) ? "border-success" : "border-border border-dashed text-muted"}`}>
            <code className="font-mono">case {c.value}:</code> {c.text}{" "}
            {c.breaks ? <code className="font-mono">break;</code> : <em className="text-warning">(no break: falls through!)</em>}
          </li>
        ))}
        {v.defaultText && (
          <li className={`rounded-lg border p-2 ${runDefault ? "border-success" : "border-border border-dashed text-muted"}`}>
            <code className="font-mono">default:</code> {v.defaultText}
          </li>
        )}
      </ul>
    </div>
  );
}

export function Match({ v }: { v: V<"match"> }) {
  const [term, setTerm] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("Tap a term, then tap its meaning.");
  const order = useMemo(() => v.pairs.map((_, i) => i).sort((a, b) => ((a * 7 + 3) % v.pairs.length) - ((b * 7 + 3) % v.pairs.length) || a - b), [v.pairs]);
  const pickMeaning = (i: number) => {
    if (term === null) { setMsg("First tap a term."); return; }
    if (i === term) { setDone(new Set(done).add(i)); setMsg("Correct!"); } else setMsg("Not a match, try again.");
    setTerm(null);
  };
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{v.title}</h3>
      <p role="status">{msg} ({done.size}/{v.pairs.length})</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          {v.pairs.map((p, i) => (
            <button key={i} className={`btn ${term === i ? "border-primary" : ""}`} disabled={done.has(i)} aria-pressed={term === i} onClick={() => setTerm(i)}>{p.term}</button>
          ))}
        </div>
        <div className="grid gap-2">
          {order.map((i) => (
            <button key={i} className={`btn text-start ${done.has(i) ? "border-success" : ""}`} disabled={done.has(i)} onClick={() => pickMeaning(i)}>{v.pairs[i].meaning}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
