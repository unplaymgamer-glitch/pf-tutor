"use client";
import { useState } from "react";
import type { PoolQuestion } from "@/lib/game/pool";

/**
 * One question with instant check for multiple choice and self-grading for the other types.
 * Used by Review, Daily challenge and Mock review (the lesson pages use QuestionCard, which also records first-try XP).
 */
export function QuestionRunner({ q, onAnswer, reveal = "after", note }: { q: PoolQuestion; onAnswer: (correct: boolean, picked?: string) => void; reveal?: "after" | "never"; note?: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [graded, setGraded] = useState<boolean | null>(null);
  const mcq = q.type === "mcq" && !!q.options?.length;

  const pick = (o: string) => {
    if (picked !== null) return;
    setPicked(o);
    onAnswer(o === q.answer, o);
  };
  const grade = (ok: boolean) => { if (graded !== null) return; setGraded(ok); onAnswer(ok); };

  return (
    <div className="box grid gap-2">
      <p className="text-sm text-muted">{q.topicTitle} · {q.difficulty}</p>
      {note && <p className="text-sm">{note}</p>}
      <p className="whitespace-pre-wrap font-medium">{q.prompt}</p>
      {mcq ? (
        <div role="group" aria-label="Choices" className="grid gap-2">
          {q.options!.map((o) => (
            <button key={o} className={`btn text-start ${picked !== null && o === q.answer && reveal === "after" ? "border-success" : picked === o && o !== q.answer && reveal === "after" ? "border-error" : picked === o ? "border-primary" : ""}`} aria-pressed={picked === o} onClick={() => pick(o)} disabled={picked !== null}>{o}</button>
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          <button className="btn" onClick={() => setShown(true)} disabled={shown}>Show answer</button>
          {shown && (
            <>
              <pre tabIndex={0} className="code" dir="ltr">{q.answer}</pre>
              <p>{q.explanation}</p>
              {graded === null ? (
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => grade(true)}>I got it right</button>
                  <button className="btn" onClick={() => grade(false)}>Not yet</button>
                </div>
              ) : <p role="status" className={graded ? "text-success" : "text-muted"}>{graded ? "Nice!" : "No problem. It will come back soon."}</p>}
            </>
          )}
        </div>
      )}
      {mcq && picked !== null && reveal === "after" && <p role="status" className={picked === q.answer ? "text-success" : "text-error"}>{picked === q.answer ? "Correct!" : "Not quite."} {q.explanation}</p>}
    </div>
  );
}
