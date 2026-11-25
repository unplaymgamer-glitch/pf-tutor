"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { dayKey } from "@/lib/game/dates";
import { MOCK_MINUTES, PoolQuestion, buildMock } from "@/lib/game/pool";
import type { MockResult } from "@/lib/progress";
import { useProgress } from "../useProgress";
import { PoolGate, usePool } from "./usePool";

type Phase = { name: "pick" } | { name: "run"; mode: "mid" | "final"; qs: PoolQuestion[]; seed: string; startedAt: number } | { name: "result"; mode: "mid" | "final"; qs: PoolQuestion[]; answers: Record<string, string>; seconds: number; timedOut: boolean };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const weekHref = (k: string) => `/${k.split("/")[0].replace("w", "week-")}/${k.split("/")[1]}`;

/** Timed mock exams: Mid-term (Weeks 1-8, 30 min) and Final (whole course, 60 min). Multiple choice only, marked on submit. */
export function MockExam() {
  const pool = usePool();
  const { progress, dispatch } = useProgress();
  const [phase, setPhase] = useState<Phase>({ name: "pick" });

  return (
    <PoolGate pool={pool}>
      {(questions) => {
        if (phase.name === "pick") return <Pick questions={questions} history={progress.mocks} onStart={(mode) => {
          const seed = String(Date.now());
          const qs = buildMock(questions, mode, seed, mode === "mid" ? 20 : 30);
          if (qs.length) setPhase({ name: "run", mode, qs, seed, startedAt: Date.now() });
        }} />;
        if (phase.name === "run") return <Run phase={phase} onFinish={(answers, timedOut) => {
          const seconds = Math.round((Date.now() - phase.startedAt) / 1000);
          const byTopic: MockResult["byTopic"] = {};
          const missed: string[] = [];
          let right = 0;
          for (const q of phase.qs) {
            const ok = answers[q.key] === q.answer;
            if (ok) right++; else missed.push(q.key);
            const t = byTopic[q.topicKey] ?? { right: 0, total: 0 };
            byTopic[q.topicKey] = { right: t.right + (ok ? 1 : 0), total: t.total + 1 };
          }
          dispatch({ type: "mock-finish", missedKeys: missed, result: { id: phase.seed, mode: phase.mode, date: dayKey(new Date()), right, total: phase.qs.length, seconds, byTopic } });
          setPhase({ name: "result", mode: phase.mode, qs: phase.qs, answers, seconds, timedOut });
        }} />;
        return <Result phase={phase} onAgain={() => setPhase({ name: "pick" })} />;
      }}
    </PoolGate>
  );
}

function Pick({ questions, history, onStart }: { questions: PoolQuestion[]; history: MockResult[]; onStart: (m: "mid" | "final") => void }) {
  const gradable = questions.filter((q) => q.type === "mcq" && q.options?.length);
  const midN = gradable.filter((q) => q.week <= 8).length;
  const weeks = [...new Set(gradable.map((q) => q.week))].sort((a, b) => a - b);
  return (
    <div className="grid gap-4">
      <p className="box box-definition">Mock exams use real lesson questions you can already open ({weeks.length ? `Weeks ${weeks.join(", ")}` : "none yet"}). They grow as your instructor opens more weeks. There is no feedback until you submit, like the real exam.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="box grid gap-2"><h2 className="text-lg font-semibold">Mid-term mock</h2><p>Weeks 1–8 · up to 20 questions · {MOCK_MINUTES.mid} minutes</p><p className="text-sm text-muted">{midN} questions available</p>
          <button className="btn btn-primary w-fit" disabled={midN === 0} onClick={() => onStart("mid")}>Start Mid-term mock</button></div>
        <div className="box grid gap-2"><h2 className="text-lg font-semibold">Final mock</h2><p>Whole course · up to 30 questions · {MOCK_MINUTES.final} minutes</p><p className="text-sm text-muted">{gradable.length} questions available</p>
          <button className="btn btn-primary w-fit" disabled={gradable.length === 0} onClick={() => onStart("final")}>Start Final mock</button></div>
      </div>
      {history.length > 0 && (
        <section aria-labelledby="mh"><h2 id="mh" className="mb-2 font-semibold">Your mock exams</h2>
          <ul className="grid gap-1">{[...history].reverse().slice(0, 8).map((m, i, arr) => {
            const pct = m.total ? Math.round((m.right / m.total) * 100) : 0;
            const prev = arr.slice(i + 1).find((x) => x.mode === m.mode);
            const prevPct = prev && prev.total ? Math.round((prev.right / prev.total) * 100) : null;
            return <li key={m.id} className="box">{m.mode === "mid" ? "Mid-term" : "Final"} · {m.date} · <strong>{pct}%</strong> ({m.right}/{m.total}) in {fmt(m.seconds)}{prevPct !== null && <span className={pct >= prevPct ? "text-success" : "text-muted"}> · {pct >= prevPct ? `improved by ${pct - prevPct}%` : `${prevPct - pct}% lower than last time`}</span>}</li>;
          })}</ul></section>
      )}
    </div>
  );
}

function Run({ phase, onFinish }: { phase: Extract<Phase, { name: "run" }>; onFinish: (a: Record<string, string>, timedOut: boolean) => void }) {
  const total = MOCK_MINUTES[phase.mode] * 60;
  const [left, setLeft] = useState(total);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const doneRef = useRef(false);
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; });
  const finish = (timedOut: boolean) => { if (doneRef.current) return; doneRef.current = true; onFinish(answersRef.current, timedOut); };

  useEffect(() => {
    const t = setInterval(() => {
      const l = total - Math.floor((Date.now() - phase.startedAt) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) { clearInterval(t); finish(true); }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = phase.qs[i];
  const answeredCount = Object.keys(answers).length;
  return (
    <div className="grid gap-3">
      <div className="sticky top-14 z-30 flex items-center justify-between gap-2 border-b border-border bg-bg/95 py-2 backdrop-blur">
        <span>Question {i + 1} of {phase.qs.length} · answered {answeredCount}</span>
        <span role="timer" aria-label="Time left" className={left < 120 ? "font-semibold text-error" : "font-semibold"}>⏱ {fmt(left)}</span>
      </div>
      <div className="box grid gap-2">
        <p className="text-sm text-muted">{q.topicTitle}</p>
        <p className="whitespace-pre-wrap font-medium">{q.prompt}</p>
        <div role="radiogroup" aria-label="Choices" className="grid gap-2">
          {q.options!.map((o) => (
            <button key={o} role="radio" aria-checked={answers[q.key] === o} className={`btn text-start ${answers[q.key] === o ? "border-primary" : ""}`} onClick={() => setAnswers({ ...answers, [q.key]: o })}>{o}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>◀ Previous</button>
        <button className="btn" disabled={i === phase.qs.length - 1} onClick={() => setI(i + 1)}>Next ▶</button>
        <button className="btn btn-primary ms-auto" onClick={() => { if (answeredCount === phase.qs.length || confirm(`You answered ${answeredCount} of ${phase.qs.length}. Submit anyway?`)) finish(false); }}>Submit exam</button>
      </div>
      <nav aria-label="Jump to question" className="flex flex-wrap gap-1">
        {phase.qs.map((x, k) => <button key={x.key} className={`btn !min-w-11 ${k === i ? "border-primary" : ""} ${answers[x.key] ? "bg-surface2" : ""}`} aria-label={`Question ${k + 1}${answers[x.key] ? " answered" : ""}`} onClick={() => setI(k)}>{k + 1}</button>)}
      </nav>
    </div>
  );
}

function Result({ phase, onAgain }: { phase: Extract<Phase, { name: "result" }>; onAgain: () => void }) {
  const right = phase.qs.filter((q) => phase.answers[q.key] === q.answer).length;
  const pct = Math.round((right / phase.qs.length) * 100);
  const byTopic = useMemo(() => {
    const m = new Map<string, { title: string; right: number; total: number }>();
    for (const q of phase.qs) { const t = m.get(q.topicKey) ?? { title: q.topicTitle, right: 0, total: 0 }; t.total++; if (phase.answers[q.key] === q.answer) t.right++; m.set(q.topicKey, t); }
    return [...m.entries()].sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total);
  }, [phase]);
  const weak = byTopic.filter(([, t]) => t.right / t.total < 0.7);
  const missed = phase.qs.filter((q) => phase.answers[q.key] !== q.answer);
  return (
    <div className="grid gap-4">
      <div className="box box-exam" role="status">
        <p className="text-2xl font-semibold">{pct}% <span className="text-base font-normal">({right}/{phase.qs.length}) in {fmt(phase.seconds)}{phase.timedOut ? " · time ran out" : ""}</span></p>
        <p>{pct >= 80 ? "Excellent! You are exam-ready on these topics." : pct >= 60 ? "Good effort. Revise the topics below, then try again." : "Do not worry. Use the revision list below and retry; your missed questions are now in your Review deck."}</p>
      </div>
      <section><h2 className="mb-2 font-semibold">Score by topic</h2>
        <ul className="grid gap-1">{byTopic.map(([k, t]) => <li key={k} className="box flex justify-between gap-2"><Link href={weekHref(k)}>{t.title}</Link><span>{t.right}/{t.total}</span></li>)}</ul></section>
      {weak.length > 0 && <section className="box box-mistake"><h2 className="font-semibold">What to revise</h2><ul className="list-disc ps-6">{weak.map(([k, t]) => <li key={k}><Link href={weekHref(k)}>{t.title}</Link> ({t.right}/{t.total})</li>)}</ul></section>}
      {missed.length > 0 && (
        <section><h2 className="mb-2 font-semibold">Questions you missed</h2>
          <ul className="grid gap-2">{missed.map((q) => <li key={q.key} className="box"><p className="whitespace-pre-wrap font-medium">{q.prompt}</p><p className="text-error">Your answer: {phase.answers[q.key] ?? "(no answer)"}</p><p className="text-success">Correct: {q.answer}</p><p>{q.explanation}</p></li>)}</ul></section>
      )}
      <div className="flex gap-2"><button className="btn btn-primary" onClick={onAgain}>Back to mock exams</button><Link className="btn inline-flex items-center" href="/review">Open Review deck</Link></div>
    </div>
  );
}
