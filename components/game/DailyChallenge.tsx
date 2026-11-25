"use client";
import { useMemo, useState } from "react";
import { dayKey } from "@/lib/game/dates";
import { pickDaily } from "@/lib/game/pool";
import { useProgress } from "../useProgress";
import { PoolGate, usePool } from "./usePool";
import { QuestionRunner } from "./QuestionRunner";

/** One question per day, the same for everyone. +30 XP once a day when answered correctly. */
export function DailyChallenge() {
  const today = dayKey(new Date());
  const pool = usePool(today); // only today's one question is downloaded, not every question of every lesson
  const { progress, dispatch } = useProgress();
  const [open, setOpen] = useState(false);
  const done = progress.dailyDone === today;
  const q = useMemo(() => (pool.status === "ready" ? pickDaily(pool.questions, today) : null), [pool, today]);

  return (
    <section aria-labelledby="daily" className="box grid gap-2">
      <h2 id="daily" className="text-lg font-semibold">🎯 Daily challenge {done && <span className="text-success">✓ done today</span>}</h2>
      <PoolGate pool={pool}>
        {() => (!q ? <p className="text-muted">Challenges appear once lessons are open.</p>
          : done ? <p>Great job. A new question arrives tomorrow.</p>
          : !open ? <button className="btn btn-primary w-fit" onClick={() => setOpen(true)}>Try today&apos;s question (+30 XP)</button>
          : <QuestionRunner q={q} onAnswer={(ok) => dispatch({ type: "daily", correct: ok, day: today })} />)}
      </PoolGate>
    </section>
  );
}
