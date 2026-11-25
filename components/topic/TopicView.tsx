"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { Topic } from "@/lib/content-schema";
import { CHAPTERS, WEEK_HUES, WEEK_ICONS } from "@/lib/course";
import { lessonMeta, mistakesAtAGlance } from "@/lib/lesson-meta";
import { useProgress } from "../useProgress";
import { useTutor } from "../tutor/TutorProvider";
import { CodeBlock } from "./CodeBlock";
import { Flowchart } from "./Flowchart";
import { PredictCard } from "./PredictCard";
import { MiniQuiz, PracticeList } from "./Quiz";
import { ReadingProgress } from "./ReadingProgress";
import { ShowMore } from "./ShowMore";
import { useActiveSection } from "./useActiveSection";
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

function Section({ id, title, children, tone }: { id: string; title: string; children: React.ReactNode; tone?: string }) {
  return (
    <section id={id} className="scroll-mt-48">
      <details open className={`box ${tone ?? ""}`}>
        <summary className="cursor-pointer min-h-11 flex items-center"><h2 className="text-lg font-semibold">{title}</h2></summary>
        <div className="mt-2 grid gap-3">{children}</div>
      </details>
    </section>
  );
}

export type RelatedLesson = { title: string; href: string };

export function TopicView({ topic, weekTopics, nextHref, related = [] }: { topic: Topic; weekTopics?: Record<number, string[]>; nextHref?: string; related?: RelatedLesson[] }) {
  const key = `w${topic.week}/${topic.slug}`;
  const { progress, update, dispatch } = useProgress();
  const tutor = useTutor();
  // Remembered choice (device only). Server render uses the topic default; the saved choice applies after hydration.
  const view: View = progress.view ?? topic.defaultView;
  useEffect(() => { dispatch({ type: "visit", key, week: topic.week, slug: topic.slug, title: topic.title }); }, [key, topic.week, topic.slug, topic.title, dispatch]);
  useEffect(() => { trackView(topic.week, topic.slug); }, [topic.week, topic.slug]);

  const pick = (v: View) => update((p) => ({ ...p, view: v }));
  const samples = topic.worked.map((w) => w.sample);
  const meta = useMemo(() => lessonMeta(topic), [topic]);
  const chapter = CHAPTERS.find((c) => c.week === topic.week);
  const hue = WEEK_HUES[topic.week - 1], icon = WEEK_ICONS[topic.week - 1];
  // Predict-the-output uses a real, runnable (non-graphics) example, preferring the middle level.
  const predict = [samples[1], samples[0], samples[2]].find((s) => s && !s.graphics && s.expectedOutput.trim() && s.code.split("\n").length <= 28);
  const answered = (qs: Topic["practice"]) => qs.filter((q) => progress.topics[key]?.answered?.[q.id]).length;

  const sections: [string, string][] = [
    ["top", "Overview"], ["learn", "See it"], ["warmup", "Warm-up"], ...(predict ? [["predict", "Predict"] as [string, string]] : []), ["definition", "Definition"], ["syntax", "Syntax"], ["examples", "Examples"],
    ...(topic.variations.length ? [["variations", "Table"] as [string, string]] : []), ...(topic.mistakes.length ? [["mistakes", "Mistakes"] as [string, string]] : []),
    ...(topic.examTips.length ? [["exam", "Exam tips"] as [string, string]] : []), ["roman", "Roman Urdu"], ["practice", "Practice"], ["quiz", "Quiz"],
  ];
  const active = useActiveSection(sections.map(([id]) => id));

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

  const glance = mistakesAtAGlance(topic);
  const relatedBox = related.length > 0 && (
    <div className="grid gap-1"><h2 className="text-sm font-semibold text-muted">Related topics</h2>
      <ul className="grid gap-1">{related.map((r) => <li key={r.href}><Link className="inline-flex min-h-11 items-center text-sm" href={r.href}>{r.title}</Link></li>)}</ul></div>
  );

  return (
    <div className="wk grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]" style={{ ["--wk-h" as string]: hue }}>
      <ReadingProgress />
      <article className="grid min-w-0 gap-5">
        {/* Hero strip */}
        <header id="top" className="card relative grid gap-3 overflow-hidden scroll-mt-48" style={{ borderTop: "3px solid var(--wk)" }}>
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: "var(--wk-glow)", opacity: 0.35 }} />
          <div className="relative flex flex-wrap items-center gap-2">
            <span aria-hidden className="text-2xl">{icon}</span>
            <span className="pill font-semibold" style={{ color: "var(--wk)" }}>Week {topic.week}{chapter ? ` · ${chapter.title}` : ""}</span>
            <span className="pill text-xs sm:hidden">⏱ {meta.minutes} min · {meta.level}</span>
          </div>
          <h1 className="relative text-2xl font-bold leading-tight sm:text-4xl">{topic.title}</h1>
          <div className="relative grid gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--wk)" }}>🎯 What you will be able to do</h2>
            <p className="text-base sm:text-lg">{topic.goal}</p>
          </div>
          <ul className="relative hidden flex-wrap gap-2 text-sm sm:flex" aria-label="Lesson facts">
            <li className="pill">⏱ about {meta.minutes} min</li>
            <li className="pill">🎚 {meta.level}</li>
            <li className="pill">🧪 {topic.worked.length} worked examples</li>
            <li className="pill">✍ {topic.practice.length + topic.quiz.length} questions</li>
          </ul>
          <div className="relative flex flex-wrap gap-2">
            <button className="btn btn-primary !px-3 sm:!px-4" onClick={() => tutor.open({ topic: `${topic.title} (Week ${topic.week})`, topicKey: `w${topic.week}/${topic.slug}` })}>💬 Study <span className="hidden sm:inline">this topic </span>with AI</button>
            <a className="btn inline-flex items-center !px-3 no-underline sm:!px-4" href="#learn">👁 <span className="hidden sm:inline">&nbsp;Jump to the&nbsp;</span>Animation</a>
          </div>
        </header>

        {/* 1. The animation comes first: a picture must be on the first screen */}
        <section id="learn" className="scroll-mt-48 grid gap-3">
          <h2 className="text-xl font-semibold max-sm:sr-only">👁 See it, then read it</h2>
          <div role="tablist" aria-label="Choose how to learn this topic" className="flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <button key={v.id} role="tab" aria-selected={view === v.id} className={`btn ${v.id === "all" ? "hidden lg:inline-flex lg:items-center" : ""} ${view === v.id ? "btn-primary" : ""}`} onClick={() => pick(v.id)}>{v.label}</button>
            ))}
          </div>
          {view === "all" ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div><h3 className="mb-2 font-semibold">👁 Visualize</h3>{visualPanel}</div>
              <div><h3 className="mb-2 font-semibold">💻 Code</h3>{codePanel}</div>
              <div><h3 className="mb-2 font-semibold">🧠 Algorithm</h3>{algoPanel}</div>
            </div>
          ) : (
            <div role="tabpanel">{view === "visualize" ? visualPanel : view === "code" ? codePanel : algoPanel}</div>
          )}
          <div className="mt-1"><h3 className="mb-1 text-sm font-semibold text-muted">How it works</h3><ShowMore text={topic.howItWorks} /></div>
        </section>

        {/* Mobile contents chips (the desktop version lives in the sidebar) */}
        <nav aria-label="On this page" className="scroll-quiet sticky top-[6.6rem] z-30 -mx-4 overflow-x-auto border-b border-border bg-bg/95 px-4 py-1 backdrop-blur lg:hidden">
          <ul className="flex gap-1 whitespace-nowrap">
            {sections.map(([id, label]) => <li key={id} className="shrink-0"><a className="inline-flex min-h-11 items-center rounded px-2 text-sm hover:text-primary" aria-current={active === id ? "location" : undefined} style={active === id ? { color: "var(--primary)", fontWeight: 700 } : undefined} href={`#${id}`}>{label}</a></li>)}
          </ul>
        </nav>

        {/* 2. Everyday warm-up with an illustration */}
        <section id="warmup" className="scroll-mt-48">
          <div className="card flex gap-4">
            <div aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl sm:h-20 sm:w-20 sm:text-4xl" style={{ background: "var(--wk-soft)" }}>{icon}</div>
            <div className="min-w-0"><h2 className="mb-1 text-lg font-semibold">🛺 Everyday-life warm-up</h2><ShowMore text={topic.warmup} /></div>
          </div>
        </section>

        {/* 3. Predict the output */}
        {predict && <Section id="predict" title="🔮 Predict the output" tone="box-try"><PredictCard sample={predict} /></Section>}

        {/* 4. Definition in a few short lines, then the syntax card */}
        <Section id="definition" title="📘 Definition" tone="box-definition"><ShowMore text={topic.definition} /></Section>
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

        {/* Practice and quiz are open: they are the point of the lesson */}
        <Section id="practice" title="✍ Practice">
          <div className="flex flex-wrap items-center gap-3 text-sm" aria-label="Practice progress">
            <div className="h-2 min-w-32 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }} aria-hidden><div className="h-full rounded-full" style={{ width: `${topic.practice.length ? (answered(topic.practice) / topic.practice.length) * 100 : 0}%`, background: "linear-gradient(90deg, var(--grad-a), var(--grad-b))", transition: "width .3s" }} /></div>
            <span>{answered(topic.practice)} of {topic.practice.length} answered · +XP for every answer</span>
          </div>
          <PracticeList questions={topic.practice} k={key} />
        </Section>
        <Section id="quiz" title="⭐ Mini-quiz">
          <MiniQuiz questions={topic.quiz} k={key} weekTopics={weekTopics} nextHref={nextHref} />
        </Section>

        <div className="grid gap-3 lg:hidden">{relatedBox && <div className="card">{relatedBox}</div>}</div>
      </article>

      {/* Desktop sidebar: contents, what the lesson covers, mistakes at a glance, related topics */}
      <aside className="hidden lg:block">
        <div className="sticky top-[7.5rem] grid max-h-[calc(100dvh-9rem)] gap-4 overflow-y-auto pe-1">
          <nav aria-label="Lesson contents" className="card grid gap-1 p-3">
            <h2 className="mb-1 text-sm font-semibold text-muted">On this page</h2>
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} className="inline-flex min-h-9 items-center rounded-md px-2 text-sm no-underline hover:text-primary" style={active === id ? { background: "var(--wk-soft)", color: "var(--wk)", fontWeight: 700 } : undefined}>{label}</a>
            ))}
          </nav>
          {topic.sources.length > 0 && (
            <div className="card grid gap-2 p-3"><h2 className="text-sm font-semibold text-muted">This lesson covers</h2>
              <ul className="flex flex-wrap gap-1.5">{topic.sources.slice(0, 6).map((s) => <li key={s} className="pill text-xs">{s}</li>)}</ul></div>
          )}
          {glance.length > 0 && (
            <div className="card grid gap-2 p-3"><h2 className="text-sm font-semibold text-muted">Mistakes at a glance</h2>
              <ul className="grid gap-2 text-sm">{glance.map((g, i) => <li key={i}><span className="text-error">✗</span> <code dir="ltr">{g.wrong}</code><br /><span className="text-success">✓</span> <code dir="ltr">{g.right}</code></li>)}</ul></div>
          )}
          {relatedBox && <div className="card p-3">{relatedBox}</div>}
        </div>
      </aside>
    </div>
  );
}
