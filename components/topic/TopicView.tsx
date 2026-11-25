"use client";
import { useEffect } from "react";
import type { Topic } from "@/lib/content-schema";
import { useProgress } from "../useProgress";
import { CodeBlock } from "./CodeBlock";
import { Flowchart } from "./Flowchart";
import { MiniQuiz, PracticeList } from "./Quiz";
import { VisualRenderer } from "../visuals/VisualRenderer";
import { StepTracer } from "../visuals/StepTracer";
import { SafeBoundary } from "../SafeBoundary";
import { trackView } from "../track";

type View = "visualize" | "code" | "algorithm" | "all";
const VIEWS: { id: View; label: string }[] = [
  { id: "visualize", label: "👁 Visualize" },
  { id: "code", label: "💻 Code" },
  { id: "algorithm", label: "🧠 Algorithm" },
  { id: "all", label: "All three" },
];
const NAV = [
  ["goal", "Goal"], ["warmup", "Warm-up"], ["definition", "Definition"], ["learn", "Learn it"], ["syntax", "Syntax"], ["examples", "Examples"],
  ["variations", "Variations"], ["mistakes", "Mistakes"], ["exam", "Exam tips"], ["roman", "Roman Urdu"], ["practice", "Practice"], ["quiz", "Quiz"],
] as const;

function Section({ id, title, children, tone, defaultOpen = true }: { id: string; title: string; children: React.ReactNode; tone?: string; defaultOpen?: boolean }) {
  return (
    <section id={id} className="scroll-mt-28">
      <details open={defaultOpen} className={`box ${tone ?? ""}`}>
        <summary className="cursor-pointer min-h-11 flex items-center"><h2 className="text-lg font-semibold">{title}</h2></summary>
        <div className="mt-2 grid gap-3">{children}</div>
      </details>
    </section>
  );
}

export function TopicView({ topic, weekTopics, nextHref }: { topic: Topic; weekTopics?: Record<number, string[]>; nextHref?: string }) {
  const key = `w${topic.week}/${topic.slug}`;
  const { progress, update, dispatch } = useProgress();
  // Remembered choice (device only). Server render uses the topic default; the saved choice applies after hydration.
  const view: View = progress.view ?? topic.defaultView;
  useEffect(() => {
    dispatch({ type: "visit", key, week: topic.week, slug: topic.slug, title: topic.title });
  }, [key, topic.week, topic.slug, topic.title, dispatch]);

  useEffect(() => { trackView(topic.week, topic.slug); }, [topic.week, topic.slug]);

  const pick = (v: View) => update((p) => ({ ...p, view: v }));
  const samples = topic.worked.map((w) => w.sample);

  const visualPanel = (
    <div className="grid gap-6">
      {topic.visuals.filter((v) => v.kind !== "trace").map((v, i) => <VisualRenderer key={i} visual={v} samples={samples} />)}
      {topic.worked.filter((w) => w.sample.trace).map((w) => (
        <div key={w.sample.id}><h3 className="mb-2 font-semibold">Step through: {w.sample.title}</h3><SafeBoundary what="animation"><StepTracer sample={w.sample} /></SafeBoundary></div>
      ))}
      {!topic.visuals.length && !samples.some((s) => s.trace) && <p className="box">An animation for this topic is coming soon. Use the Code or Algorithm view meanwhile.</p>}
    </div>
  );
  const codePanel = (
    <div className="grid gap-6">
      {topic.worked.map((w) => (
        <div key={w.sample.id} className="grid gap-2">
          <h3 className="font-semibold">{w.sample.title}</h3>
          <CodeBlock code={w.sample.code} label={w.sample.title} tryIt={w.sample.graphics ? undefined : { stdin: w.sample.stdin }} />
          <div><div className="text-sm text-muted">Verified output (checked by compiling and running this exact code)</div>
            <pre tabIndex={0} className="code" dir="ltr">{w.sample.expectedOutput || " "}</pre></div>
          {w.sample.stdin && <p className="text-sm text-muted">Program input used: <code dir="ltr">{w.sample.stdin.trim().replace(/\n/g, " ⏎ ")}</code></p>}
          {w.sample.explanation.length > 0 && (
            <ol className="grid gap-1 ps-5">{w.sample.explanation.map((e, k) => <li key={k}><strong>Line {e.line}:</strong> {e.text}</li>)}</ol>
          )}
        </div>
      ))}
    </div>
  );
  const algoPanel = (
    <div className="grid gap-6">
      {topic.worked.map((w) => (
        <div key={w.sample.id} className="grid gap-2">
          <h3 className="font-semibold">{w.problem}</h3>
          <ol className="list-decimal ps-6">{w.pseudocode.map((s, k) => <li key={k}><code dir="ltr">{s}</code></li>)}</ol>
          {view !== "visualize" && w.flowchartMermaid && <Flowchart chart={w.flowchartMermaid} description={w.pseudocode.join(", then ")} />}
        </div>
      ))}
    </div>
  );

  return (
    <article className="grid gap-4">
      <header>
        <p className="text-sm text-muted">Week {topic.week}</p>
        <h1 className="text-3xl font-semibold">{topic.title}</h1>
      </header>

      <nav aria-label="On this page" className="scroll-quiet sticky top-14 z-30 -mx-4 overflow-x-auto border-b border-border bg-bg/95 px-4 py-1 backdrop-blur">
        <ul className="flex gap-1 whitespace-nowrap">
          {NAV.map(([id, label]) => <li key={id} className="shrink-0"><a className="inline-flex min-h-11 items-center rounded px-2 text-sm hover:text-primary" href={`#${id}`}>{label}</a></li>)}
        </ul>
      </nav>

      <Section id="goal" title="🎯 Learning goal" tone="box-definition"><p>{topic.goal}</p></Section>
      <Section id="warmup" title="🛺 Everyday-life warm-up"><p>{topic.warmup}</p></Section>
      <Section id="definition" title="📘 Definition" tone="box-definition"><p>{topic.definition}</p></Section>

      <section id="learn" className="scroll-mt-28">
        <div role="tablist" aria-label="Choose how to learn this topic" className="mb-3 flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} className={`btn ${v.id === "all" ? "hidden lg:inline-flex lg:items-center" : ""} ${view === v.id ? "btn-primary" : ""}`} onClick={() => pick(v.id)}>{v.label}</button>
          ))}
        </div>
        <p className="mb-3">{topic.howItWorks}</p>
        {view === "all" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div><h2 className="mb-2 font-semibold">👁 Visualize</h2>{visualPanel}</div>
            <div><h2 className="mb-2 font-semibold">💻 Code</h2>{codePanel}</div>
            <div><h2 className="mb-2 font-semibold">🧠 Algorithm</h2>{algoPanel}</div>
          </div>
        ) : (
          <div role="tabpanel">{view === "visualize" ? visualPanel : view === "code" ? codePanel : algoPanel}</div>
        )}
      </section>

      <Section id="syntax" title="🧩 Syntax"><CodeBlock code={topic.syntax} label="syntax" /></Section>

      <Section id="examples" title="🧪 Worked examples">
        {topic.worked.map((w) => (
          <div key={w.sample.id} className="grid gap-2">
            <h3 className="font-semibold"><span className="rounded bg-surface2 px-2 py-0.5 text-sm">{w.level === "basic" ? "Basic" : w.level === "intermediate" ? "Intermediate" : "Exam-style"}</span> {w.problem}</h3>
            <p className="text-sm text-muted">Steps: {w.pseudocode.join(" → ")}</p>
            <CodeBlock code={w.sample.code} label={w.sample.title} tryIt={w.sample.graphics ? undefined : { stdin: w.sample.stdin }} />
            <pre tabIndex={0} role="group" className="code" dir="ltr" aria-label="Verified output">{w.sample.expectedOutput || " "}</pre>
          </div>
        ))}
      </Section>

      {topic.variations.length > 0 && (
        <Section id="variations" title="📊 Variations">
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Table: ways and when to use them">
            <table className="w-full border-collapse text-start">
              <thead><tr><th className="border border-border p-2 text-start">Form</th><th className="border border-border p-2 text-start">When to use</th><th className="border border-border p-2 text-start">Example</th></tr></thead>
              <tbody>{topic.variations.map((v, i) => <tr key={i}><td className="border border-border p-2">{v.way}</td><td className="border border-border p-2">{v.when}</td><td className="border border-border p-2"><code dir="ltr">{v.example}</code></td></tr>)}</tbody>
            </table>
          </div>
        </Section>
      )}

      {topic.mistakes.length > 0 && (
        <Section id="mistakes" title="⚠ Common mistakes" tone="box-mistake">
          {topic.mistakes.map((m, i) => (
            <div key={i} className="grid gap-1">
              <p><strong className="text-error">✗ Wrong:</strong> <code dir="ltr">{m.wrong}</code></p>
              <p><strong className="text-success">✓ Right:</strong> <code dir="ltr">{m.right}</code></p>
              <p className="text-sm text-muted">Compiler says: <code dir="ltr">{m.error}</code></p>
            </div>
          ))}
        </Section>
      )}

      {topic.examTips.length > 0 && (
        <Section id="exam" title="📝 Exam tips" tone="box-exam"><ul className="list-disc ps-6">{topic.examTips.map((t, i) => <li key={i}>{t}</li>)}</ul></Section>
      )}

      <Section id="roman" title="🟢 Roman Urdu summary" tone="box-roman"><ul className="list-disc ps-6">{topic.romanSummary.map((t, i) => <li key={i} lang="ur-Latn">{t}</li>)}</ul></Section>

      <Section id="practice" title="✍ Practice" defaultOpen={false}><PracticeList questions={topic.practice} k={key} /></Section>
      <Section id="quiz" title="⭐ Mini-quiz" defaultOpen={false}><MiniQuiz questions={topic.quiz} k={key} weekTopics={weekTopics} nextHref={nextHref} /></Section>
    </article>
  );
}
