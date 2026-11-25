"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { dayKey } from "@/lib/game/dates";
import { dueKeys } from "@/lib/game/review";
import { useProgress } from "../useProgress";
import { PoolGate, usePool } from "./usePool";
import { QuestionRunner } from "./QuestionRunner";

/** Review today: questions you missed come back at growing intervals (1, 3, 7, 14, 30 days). */
export function ReviewDeck() {
  const pool = usePool();
  const { progress, dispatch } = useProgress();
  const today = dayKey(new Date());
  // Fix the session's cards once, so answering does not reshuffle what is on screen.
  const [session, setSession] = useState<string[] | null>(null);
  const due = useMemo(() => dueKeys(progress.review, today), [progress.review, today]);
  const total = Object.keys(progress.review).length;

  return (
    <PoolGate pool={pool}>
      {(questions) => {
        const byKey = new Map(questions.map((q) => [q.key, q]));
        const cards = (session ?? due).filter((k) => byKey.has(k));
        if (!session && cards.length === 0) {
          return (
            <div className="box box-roman" role="status">
              <p className="text-lg font-semibold">All caught up ✅</p>
              <p>{total === 0 ? "Questions you miss will appear here, so you can practise them again at the best time." : `Nothing is due today. ${total} card(s) are waiting for a later day.`}</p>
              <Link className="btn btn-primary mt-2 inline-flex items-center" href="/practice">Go to Practice</Link>
            </div>
          );
        }
        if (!session) {
          return (
            <div className="box box-definition grid gap-2">
              <p><strong>{cards.length}</strong> card(s) due today. Takes about {Math.max(1, Math.round(cards.length * 0.7))} minute(s).</p>
              <button className="btn btn-primary w-fit" onClick={() => setSession(cards)}>Start review</button>
            </div>
          );
        }
        return <Session cards={cards} byKey={byKey} onResult={(k, ok) => dispatch({ type: "review", itemKey: k, correct: ok })} />;
      }}
    </PoolGate>
  );
}

function Session({ cards, byKey, onResult }: { cards: string[]; byKey: Map<string, import("@/lib/game/pool").PoolQuestion>; onResult: (k: string, ok: boolean) => void }) {
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [right, setRight] = useState(0);
  const key = cards[i];
  if (i >= cards.length) {
    return (
      <div className="box box-roman" role="status">
        <p className="text-lg font-semibold">Review finished 🎉</p>
        <p>{right} of {cards.length} correct. Cards you missed return tomorrow; the others move further away.</p>
        <Link className="btn btn-primary mt-2 inline-flex items-center" href="/progress">See my progress</Link>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">Card {i + 1} of {cards.length}</p>
      <QuestionRunner key={key} q={byKey.get(key)!} onAnswer={(ok) => { setAnswered(true); if (ok) setRight((r) => r + 1); onResult(key, ok); }} />
      <button className="btn btn-primary w-fit" disabled={!answered} onClick={() => { setI(i + 1); setAnswered(false); }}>{i + 1 === cards.length ? "Finish" : "Next card ▶"}</button>
    </div>
  );
}
