"use client";
import { useRef, useState } from "react";
import type { Topic } from "@/lib/content-schema";
import { useProgress } from "../useProgress";
import { trackQuiz } from "../track";
import Link from "next/link";

type Q = Topic["practice"][number];
const diffLabel = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

export function QuestionCard({ q, k, onResult }: { q: Q; k: string; onResult?: (correct: boolean) => void }) {
  const { dispatch } = useProgress();
  const [picked, setPicked] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showAns, setShowAns] = useState(false);
  const isMcq = q.type === "mcq" && q.options?.length;
  const hidden = q.answer === ""; // exam mode: the server removed the solution
  const correct = picked !== null && picked === q.answer;

  const choose = (o: string) => {
    if (picked !== null || hidden) return;
    setPicked(o);
    const ok = o === q.answer;
    dispatch({ type: "answer", key: k, qid: q.id, correct: ok, qtype: q.type });
    onResult?.(ok);
  };

  return (
    <li className="box">
      <p className="text-sm text-muted">{diffLabel[q.difficulty]} · {q.type === "mcq" ? "Multiple choice" : q.type === "output" ? "Predict the output" : q.type === "bug" ? "Fix the bug" : q.type === "blank" ? "Fill in the blank" : "Write the code"}</p>
      <p className="whitespace-pre-wrap font-medium">{q.prompt}</p>
      {isMcq ? (
        <div role="group" aria-label="Choices" className="mt-2 grid gap-2">
          {q.options!.map((o) => {
            const state = picked === null ? "" : o === q.answer ? "border-success" : o === picked ? "border-error" : "";
            return (
              <button key={o} className={`btn text-start ${state}`} aria-pressed={picked === o} onClick={() => choose(o)} disabled={picked !== null && picked !== o && o !== q.answer}>
                {o}{picked !== null && o === q.answer ? "  ✓ correct" : picked === o ? "  ✗ not this one" : ""}
              </button>
            );
          })}
        </div>
      ) : null}
      {picked !== null && (
        <p role="status" className={`mt-2 ${correct ? "text-success" : "text-error"}`}>{correct ? "Correct!" : "Not quite."} {q.explanation}</p>
      )}
      {hidden && <p role="note" className="box box-exam mt-2">Solutions are hidden right now (exam mode). Try it on your own.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}>Hint</button>
        {!isMcq && !hidden && <button className="btn" onClick={() => setShowAns((v) => !v)} aria-expanded={showAns}>Show answer</button>}
      </div>
      {showHint && <p className="mt-2 text-muted">Hint: {q.hint}</p>}
      {showAns && (<div className="mt-2"><pre tabIndex={0} className="code" dir="ltr">{q.answer}</pre><p>{q.explanation}</p></div>)}
    </li>
  );
}

export function PracticeList({ questions, k }: { questions: Q[]; k: string }) {
  if (!questions.length) return <p className="text-muted">Practice questions for this topic are coming soon.</p>;
  return <ol className="grid gap-3">{questions.map((q) => <QuestionCard key={q.id} q={q} k={k} />)}</ol>;
}

export function MiniQuiz({ questions, k, weekTopics, nextHref }: { questions: Q[]; k: string; weekTopics?: Record<number, string[]>; nextHref?: string }) {
  const { dispatch } = useProgress();
  const [results, setResults] = useState<Record<string, boolean>>({});
  const resultsRef = useRef<Record<string, boolean>>({}); // survives several answers arriving before a re-render
  if (!questions.length) return <p className="text-muted">Quiz coming soon.</p>;
  const done = Object.keys(results).length === questions.length;
  const right = Object.values(results).filter(Boolean).length;
  const report = (id: string, ok: boolean) => {
    const next = { ...resultsRef.current, [id]: ok };
    resultsRef.current = next;
    setResults(next);
    if (Object.keys(next).length === questions.length) {
      const r = Object.values(next).filter(Boolean).length;
      dispatch({ type: "topic-complete", key: k, right: r, total: questions.length }, weekTopics);
      const [wk, sl] = [Number(k.split("/")[0].slice(1)), k.split("/")[1]];
      trackQuiz(wk, sl, r, questions.length, Object.entries(next).filter(([, ok]) => !ok).map(([id]) => id));
    }
  };
  return (
    <div>
      <ol className="grid gap-3">{questions.map((q) => <QuestionCard key={q.id} q={q} k={k} onResult={(ok) => report(q.id, ok)} />)}</ol>
      {done && (
        <div role="status" className="box box-exam mt-3 grid gap-2">
          <p><strong>Score: {right}/{questions.length}.</strong> {right === questions.length ? "Perfect!" : right >= questions.length * 0.7 ? "Good work." : right >= questions.length / 2 ? "Getting there." : "Let us strengthen the basics first."}</p>
          <p className="text-sm">Best next step: {right === questions.length || right >= questions.length * 0.9
            ? <>move on{nextHref ? <> to the <Link href={nextHref}>next lesson</Link></> : null}.</>
            : right >= questions.length * 0.7
              ? <>do the <a href="#practice">Practice</a> questions, then continue.</>
              : <>re-read <a href="#definition">the Definition</a> and <a href="#mistakes">Common mistakes</a>. The questions you missed will come back in your <Link href="/review">Review deck</Link> tomorrow.</>}</p>
        </div>
      )}
    </div>
  );
}
