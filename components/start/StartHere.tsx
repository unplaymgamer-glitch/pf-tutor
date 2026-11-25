"use client";
import Link from "next/link";
import { useState } from "react";
import { Txt, useT } from "../I18n";
import { useProgress } from "../useProgress";

/** The five crash-path lessons, in order. */
export const CRASH_PATH = [
  { key: "w1/pdlc", href: "/week-1/pdlc", label: "start.l1" },
  { key: "w1/hello-world", href: "/week-1/hello-world", label: "start.l2" },
  { key: "w1/variables-data-types", href: "/week-1/variables-data-types", label: "start.l3" },
  { key: "w1/input-output", href: "/week-1/input-output", label: "start.l4" },
  { key: "w2/if-statement", href: "/week-2/if-statement", label: "start.l5" },
] as const;

// Where the placement quiz sends a student, by number of right answers (the right answer is always option 1 in the dictionary; ORDER shuffles what is shown).
const WHERE: { min: number; href: string; name: string; note: string }[] = [
  { min: 8, href: "/week-12/purpose-of-structures", name: "Why Structures", note: "start.r6" },
  { min: 7, href: "/week-9/what-is-a-pointer", name: "What Is a Pointer", note: "start.r5" },
  { min: 6, href: "/week-7/functions-intro", name: "Functions Intro", note: "start.r4" },
  { min: 5, href: "/week-4/arrays-intro", name: "Arrays Intro", note: "start.r3" },
  { min: 4, href: "/week-3/for-loop", name: "For Loop", note: "start.r2" },
  { min: 2, href: "/week-2/relational-operators", name: "Relational Operators", note: "start.r1" },
  { min: 0, href: "/week-1/pdlc", name: "Program Life Cycle", note: "start.r0" },
];
const ORDER = [[1, 0, 3, 2], [2, 0, 1, 3], [3, 1, 0, 2], [1, 2, 0, 3], [0, 3, 1, 2], [2, 3, 0, 1], [3, 0, 2, 1], [1, 3, 2, 0]];
const QUESTIONS = 8;

function Quiz() {
  const { t, name } = useT();
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const finished = i >= QUESTIONS;
  const answer = (original: number | null) => { if (original === 0) setScore((s) => s + 1); setI((n) => n + 1); };
  if (finished) {
    const w = WHERE.find((x) => score >= x.min)!;
    const key = w.href.slice(1).replace(/^week-(\d+)\//, "w$1/");
    return (
      <div className="card grid gap-3" role="status">
        <p className="text-lg font-semibold"><Txt>{t("start.result", { s: score, t: QUESTIONS })}</Txt></p>
        <p><Txt>{t(w.note)}</Txt></p>
        <div className="flex flex-wrap gap-2">
          <Link href={w.href} className="btn btn-primary inline-flex items-center no-underline"><Txt>{t("start.go", { l: name(key, w.name) })}</Txt></Link>
          <button className="btn" onClick={() => { setI(0); setScore(0); }}><Txt>{t("start.retry")}</Txt></button>
        </div>
      </div>
    );
  }
  const n = i + 1;
  const opts = t(`sq${n}.o`).split("|");
  return (
    <div className="card grid gap-3">
      <p className="text-sm text-muted"><Txt>{t("start.question", { n, t: QUESTIONS })}</Txt></p>
      <p className="text-lg font-semibold" dir="auto"><Txt>{t(`sq${n}.q`)}</Txt></p>
      <ul className="grid gap-2" role="list">
        {ORDER[i].map((orig) => (
          <li key={orig}><button className="btn w-full !justify-start text-start" dir="auto" onClick={() => answer(orig)}>{opts[orig]}</button></li>
        ))}
      </ul>
      <button className="btn w-fit text-sm" onClick={() => answer(null)}><Txt>{t("start.skip")}</Txt></button>
    </div>
  );
}

export function StartHere() {
  const { t } = useT();
  const { progress } = useProgress();
  const done = CRASH_PATH.filter((l) => progress.topics[l.key]?.done).length;
  const next = CRASH_PATH.find((l) => !progress.topics[l.key]?.done);
  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl"><span className="gradient-text"><Txt>{t("start.title")}</Txt></span></h1>
        <p className="max-w-3xl text-muted"><Txt block>{t("start.sub")}</Txt></p>
      </header>

      <section aria-labelledby="path" className="grid gap-3">
        <h2 id="path" className="text-2xl font-semibold"><Txt>{t("start.pathTitle")}</Txt></h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2" role="img" aria-label={t("start.progress", { a: done, b: CRASH_PATH.length })}><div className="h-full rounded-full" style={{ width: `${(done / CRASH_PATH.length) * 100}%`, background: "linear-gradient(90deg, var(--grad-a), var(--grad-b))", transition: "width .5s" }} /></div>
          <span><Txt>{t("start.progress", { a: done, b: CRASH_PATH.length })}</Txt></span>
        </div>
        <ol className="grid gap-2">
          {CRASH_PATH.map((l, idx) => {
            const isDone = !!progress.topics[l.key]?.done;
            return (
              <li key={l.key} className="card flex flex-wrap items-center gap-3 !p-3">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: isDone ? "var(--success)" : "var(--surface-2)", color: isDone ? "var(--on-primary)" : "var(--text)" }}>{isDone ? "✓" : idx + 1}</span>
                <span className="min-w-0 flex-1 font-medium"><Txt>{t(l.label)}</Txt></span>
                <Link href={l.href} className={`btn inline-flex items-center no-underline ${next?.key === l.key ? "btn-primary" : ""}`}><Txt>{t(isDone ? "start.done" : "start.open")}</Txt></Link>
              </li>
            );
          })}
          <li className="card flex items-center gap-3 !p-3" style={{ borderStyle: "dashed" }}>
            <span aria-hidden className="text-2xl">🏁</span><span className="font-semibold"><Txt>{t("start.finish")}</Txt></span>
          </li>
        </ol>
        {done === CRASH_PATH.length && <p className="box box-definition" role="status"><Txt block>{t("start.badge")}</Txt></p>}
      </section>

      <section aria-labelledby="quiz" className="grid gap-3">
        <h2 id="quiz" className="text-2xl font-semibold"><Txt>{t("start.quizTitle")}</Txt></h2>
        <p className="text-muted"><Txt block>{t("start.quizSub")}</Txt></p>
        <Quiz />
      </section>
    </div>
  );
}
