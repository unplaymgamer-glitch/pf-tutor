"use client";
import { useEffect, useState } from "react";
import type { PoolQuestion } from "@/lib/game/pool";

export type PoolState = { status: "loading" } | { status: "ready"; questions: PoolQuestion[] } | { status: "disabled"; reason: string } | { status: "error" };

/** Loads the question pool from the server (unlocked lessons only). Used by pages that need answers: review, daily, practice, mock. */
export function usePool(daily?: string): PoolState {
  const [state, setState] = useState<PoolState>({ status: "loading" });
  useEffect(() => {
    let off = false;
    // `daily` asks the server for just that day's one question (small); without it the whole pool is loaded.
    fetch(daily ? `/api/pool?daily=${encodeURIComponent(daily)}` : "/api/pool", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        if (j.disabled) setState({ status: "disabled", reason: j.disabled });
        else setState({ status: "ready", questions: j.questions as PoolQuestion[] });
      })
      .catch(() => !off && setState({ status: "error" }));
    return () => { off = true; };
  }, [daily]);
  return state;
}

export const PoolGate = ({ pool, children }: { pool: PoolState; children: (q: PoolQuestion[]) => React.ReactNode }) => {
  if (pool.status === "loading") return <p className="text-muted">Loading…</p>;
  if (pool.status === "error") return <p className="box box-warning" role="alert">Could not load questions. Check your connection and reload.</p>;
  if (pool.status === "disabled") return <p className="box box-exam" role="status">{pool.reason === "exam-mode" ? "Practice questions are switched off right now (exam mode)." : "The site is in maintenance mode. Please come back soon."}</p>;
  return <>{children(pool.questions)}</>;
};
