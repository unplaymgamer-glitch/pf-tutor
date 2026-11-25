"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Topic } from "@/lib/content-schema";
import { Playground } from "../playground/Playground";
import { CodeBlock } from "../topic/CodeBlock";
import { Flowchart } from "../topic/Flowchart";
import { PredictCard } from "../topic/PredictCard";
import { QuestionCard } from "../topic/Quiz";
import { StepTracer } from "../visuals/StepTracer";
import type { ModuleNav } from "../tutor/ChatApp";

const ChatApp = dynamic(() => import("../tutor/ChatApp"), { ssr: false, loading: () => <div className="skeleton m-3 h-64" aria-busy="true" /> });
type Pane = "notes" | "code" | "tutor";
type Q = Topic["practice"][number];

const GROUPS: { type: Q["type"]; title: string; hint: string }[] = [
  { type: "output", title: "Predict the output", hint: "Work it out on paper first, then check." },
  { type: "bug", title: "Find the error", hint: "Spot the syntax or logic mistake and fix it." },
  { type: "write", title: "Write a program", hint: "Try it in the editor above before you look at the answer." },
];

/** The lesson as a three-pane studio: notes and diagrams on the left, an editable code sandbox with a step-by-step dry run in the middle, and a tutor that only talks about this lesson on the right. */
export function Workspace({ topic, hue, label, lessonHref, prevHref, nextHref }: { topic: Topic; hue: number; label: string; lessonHref: string; prevHref?: string; nextHref?: string }) {
  const [pane, setPane] = useState<Pane>("code");
  const [idx, setIdx] = useState(0);
  const sample = topic.worked[idx].sample;
  const worked = topic.worked[idx];
  const key = `w${topic.week}/${topic.slug}`;
  const nav: ModuleNav[] = [{ id: 0, title: topic.title, icon: "📘", hue, lessons: [{ key, title: topic.title, week: topic.week, href: lessonHref }] }];
  const questions = [...topic.practice, ...topic.quiz];
  const tabs: { v: Pane; t: string }[] = [{ v: "notes", t: "Notes" }, { v: "code", t: "Code" }, { v: "tutor", t: "Tutor" }];
  const show = (p: Pane) => (pane === p ? "flex" : "hidden") + " lg:flex";
  const paneCls = "min-h-0 min-w-0 flex-col overflow-y-auto";

  return (
    <div className="wk fixed inset-0 z-[100] flex flex-col bg-bg" style={{ ["--wk-h" as string]: hue }}>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2" style={{ borderTop: "3px solid var(--wk)" }}>
        <Link href={lessonHref} className="btn btn-sm no-underline">← Lesson</Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-wide" style={{ color: "var(--wk)" }}>Workspace · {label}</p>
          <h1 className="truncate text-base font-semibold">{topic.title}</h1>
        </div>
        {prevHref && <Link href={prevHref} className="btn btn-sm hidden no-underline sm:inline-flex" aria-label="Previous lesson workspace">◀</Link>}
        {nextHref && <Link href={nextHref} className="btn btn-sm hidden no-underline sm:inline-flex" aria-label="Next lesson workspace">▶</Link>}
        <Link href={`/chat?topic=${key}`} className="btn btn-sm hidden no-underline md:inline-flex">Full-page chat</Link>
      </header>

      <div role="tablist" aria-label="Workspace panes" className="grid grid-cols-3 gap-1 border-b border-border p-1 lg:hidden">
        {tabs.map((x) => <button key={x.v} role="tab" aria-selected={pane === x.v} className={`min-h-10 rounded-lg text-sm font-semibold ${pane === x.v ? "bg-surface2 text-primary" : "text-muted"}`} onClick={() => setPane(x.v)}>{x.t}</button>)}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-label="Notes" className={`${paneCls} ${show("notes")} gap-4 border-e border-border p-4`}>
          <h2 className="text-lg font-bold">📖 Notes</h2>
          <div className="box box-definition"><strong>Goal.</strong> {topic.goal}</div>
          <div><h3 className="font-semibold">What it is</h3><p className="mt-1 whitespace-pre-wrap">{topic.definition}</p></div>
          <div><h3 className="font-semibold">How it works</h3><p className="mt-1 whitespace-pre-wrap">{topic.howItWorks}</p></div>
          <div><h3 className="mb-1 font-semibold">Syntax</h3><CodeBlock code={topic.syntax} label="Syntax template" /></div>
          {worked.flowchartMermaid && <div><h3 className="mb-1 font-semibold">Flowchart: {worked.problem}</h3><Flowchart chart={worked.flowchartMermaid} description={worked.pseudocode.join(". ")} /></div>}
          {worked.pseudocode.length > 0 && <div><h3 className="font-semibold">Steps</h3><ol className="ms-5 mt-1 list-decimal">{worked.pseudocode.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
          {topic.mistakes.length > 0 && (
            <div><h3 className="font-semibold">Common mistakes</h3>
              <ul className="mt-1 grid gap-2">{topic.mistakes.map((m, i) => <li key={i} className="box box-exam text-sm"><code dir="ltr">{m.wrong}</code> → <code dir="ltr">{m.right}</code><br /><span className="text-muted">{m.error}</span></li>)}</ul>
            </div>
          )}
          {topic.examTips.length > 0 && <div><h3 className="font-semibold">Exam tips</h3><ul className="ms-5 mt-1 list-disc">{topic.examTips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          <details><summary className="min-h-11 cursor-pointer font-semibold">Short summary in Roman Urdu</summary><ul className="ms-5 mt-1 list-disc">{topic.romanSummary.map((t, i) => <li key={i}>{t}</li>)}</ul></details>
        </section>

        <section aria-label="Code and dry run" className={`${paneCls} ${show("code")} gap-4 border-e border-border p-4`}>
          <h2 className="text-lg font-bold">🧪 Code &amp; dry run</h2>
          <div role="tablist" aria-label="Examples" className="flex flex-wrap gap-2">
            {topic.worked.map((w, i) => (
              <button key={w.sample.id} role="tab" aria-selected={idx === i} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${idx === i ? "border-primary bg-surface2" : "border-border"}`} onClick={() => setIdx(i)}>
                {w.level === "basic" ? "Basic" : w.level === "intermediate" ? "Intermediate" : "Exam"}: {w.sample.title}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">Change the code or the input box, then press Run. Press ⏮ Reset in the editor to get the original back.</p>
          <Playground key={sample.id} initialCode={sample.code} initialStdin={sample.stdin} />

          <div className="grid gap-2">
            <h3 className="text-base font-bold">Step-by-step dry run</h3>
            {sample.trace ? <StepTracer key={sample.id} sample={sample} /> : <p className="box box-definition text-sm">This example has no hand-made step trace. Run it above, or pick another example.</p>}
          </div>

          <div className="grid gap-3">
            <h3 className="text-base font-bold">Exam practice</h3>
            <details className="box"><summary className="min-h-11 cursor-pointer font-semibold">Predict the output of this example</summary><div className="mt-2"><PredictCard key={sample.id} sample={sample} /></div></details>
            {GROUPS.map((g) => {
              const qs = questions.filter((q) => q.type === g.type).slice(0, 4);
              if (!qs.length) return null;
              return (
                <details key={g.type} className="box" open={g.type === "output"}>
                  <summary className="min-h-11 cursor-pointer font-semibold">{g.title} ({qs.length})</summary>
                  <p className="mb-2 text-sm text-muted">{g.hint} The answer stays hidden until you ask for it.</p>
                  <ol className="grid gap-3">{qs.map((q) => <QuestionCard key={q.id} q={q} k={key} />)}</ol>
                </details>
              );
            })}
          </div>
        </section>

        <section aria-label="Topic tutor" className={`${show("tutor")} min-h-0 min-w-0 flex-col`}>
          <ChatApp embedded initial={{ topicKey: key }} modules={nav} />
        </section>
      </div>
    </div>
  );
}
