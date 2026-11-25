"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BADGES } from "@/lib/game/badges";
import { dayKey } from "@/lib/game/dates";
import { levelFor, LEVELS } from "@/lib/game/levels";
import { questsForWeek } from "@/lib/game/quests";
import { dueKeys } from "@/lib/game/review";
import { streakAlive } from "@/lib/game/streak";
import { isoWeekId } from "@/lib/game/dates";
import { makeBackupCode, mergeProgress, readBackupCode } from "@/lib/game/backup";
import { stars } from "@/lib/progress";
import { useProgress } from "../useProgress";
import { DailyChallenge } from "./DailyChallenge";
import { LeaderboardPanel } from "./LeaderboardPanel";

function Ring({ pct, children }: { pct: number; children: React.ReactNode }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-32 w-32 place-items-center" role="img" aria-label={`${pct}% of the way to the next level`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="text-center leading-tight">{children}</div>
    </div>
  );
}

export function ProgressDashboard() {
  const { progress: p } = useProgress();
  const now = new Date();
  const today = dayKey(now);
  const lv = levelFor(p.xp);
  const weekId = isoWeekId(now);
  const quests = questsForWeek(weekId);
  const qState = p.quests.weekId === weekId ? p.quests : { weekId, counters: { lessons: 0, quiz80: 0, runs: 0, bugs: 0, reviews: 0 }, claimed: [] as string[] };
  const due = dueKeys(p.review, today).length;
  const alive = streakAlive(p.streak, today);
  const topics = Object.entries(p.topics);
  const weak = useMemo(() => topics.filter(([, t]) => t.quizTotal && t.quizBest !== undefined && (t.quizLastPct ?? 100) < 70).map(([k, t]) => [k, t.quizLastPct ?? 0] as const), [topics]);
  const href = (k: string) => `/${k.split("/")[0].replace("w", "week-")}/${k.split("/")[1]}`;
  const earned = BADGES.filter((b) => p.badges[b.id]);

  return (
    <div className="grid gap-6">
      <section className="box grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center" aria-label="Level and XP">
        <Ring pct={lv.pct}><div className="text-3xl">{lv.icon}</div><div className="text-sm font-semibold">{lv.name}</div></Ring>
        <div className="grid gap-1">
          <p className="text-2xl font-semibold">{p.xp} XP</p>
          <p className="text-muted">{lv.next ? `${lv.toNext} XP to ${LEVELS[lv.index + 1].name}` : "Top level reached. You are a C++ Champion!"}</p>
          <p>{alive ? "🔥" : "💤"} <strong>{p.streak.count}</strong>-day streak {p.streak.best > p.streak.count && <span className="text-muted">(best {p.streak.best})</span>}</p>
          <p className="text-sm text-muted">{alive ? "Learn a little today to keep it going. You get one free pass each week." : "Welcome back! Any lesson, quiz or program today starts a new streak."}</p>
        </div>
      </section>

      <DailyChallenge />

      <section aria-labelledby="quests" className="box grid gap-2">
        <h2 id="quests" className="text-lg font-semibold">This week&apos;s quests</h2>
        <ul className="grid gap-2">{quests.map((q) => {
          const n = Math.min(qState.counters[q.counter], q.target);
          const done = qState.claimed.includes(q.id);
          return <li key={q.id} className="flex flex-wrap items-center justify-between gap-2"><span>{done ? "✅" : "⬜"} {q.title(1).replace(/Week \d+/, "this week")}</span><span className="text-sm text-muted">{n}/{q.target} · +{q.xp} XP</span></li>;
        })}</ul>
      </section>

      <section aria-labelledby="review" className="box grid gap-2">
        <h2 id="review" className="text-lg font-semibold">Review today</h2>
        <p>{due > 0 ? `${due} card(s) are ready. Short, spaced practice is the best way to remember.` : "Nothing due today."}</p>
        <Link className="btn btn-primary w-fit no-underline" href="/review">{due > 0 ? "Start review" : "Open review"}</Link>
      </section>

      <section aria-labelledby="badges">
        <h2 id="badges" className="mb-2 text-lg font-semibold">Trophy shelf ({earned.length}/{BADGES.filter((b) => !b.id.startsWith("chapter-") || p.badges[b.id]).length})</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {BADGES.filter((b) => !b.id.startsWith("chapter-") || p.badges[b.id] || b.id === "chapter-1" || b.id === "chapter-2").map((b) => {
            const got = p.badges[b.id];
            return (
              <li key={b.id} className={`box flex items-center gap-3 ${got ? "" : "border-dashed text-muted"}`}>
                <span className="text-2xl" aria-hidden>{got ? b.icon : "🔒"}</span>
                <span><strong>{b.title}</strong><br /><span className="text-sm text-muted">{b.desc}{got ? ` · earned ${got}` : ""}</span></span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="mastery">
        <h2 id="mastery" className="mb-2 text-lg font-semibold">Your lessons</h2>
        {topics.length === 0 ? <p className="text-muted">Open a lesson to start.</p> : (
          <ul className="grid gap-1">{topics.filter(([, t]) => t.visited).sort().map(([k, t]) => (
            <li key={k} className="box flex flex-wrap items-center justify-between gap-2">
              <Link className="inline-flex min-h-11 items-center" href={href(k)}>{k.replace(/^w(\d+)\//, "Week $1: ").replace(/-/g, " ")}</Link>
              <span className="text-sm">{t.done ? `${"⭐".repeat(stars(t))}${stars(t) === 0 ? "✅" : ""}` : "in progress"}{t.quizLastPct !== undefined && <span className="text-muted"> · last {t.quizLastPct}%{t.quizPrevPct !== undefined ? (t.quizLastPct > t.quizPrevPct ? ` (+${t.quizLastPct - t.quizPrevPct}%)` : "") : ""}</span>}</span>
            </li>
          ))}</ul>
        )}
        {weak.length > 0 && <p className="box box-mistake mt-3">Worth another look: {weak.map(([k]) => <Link key={k} className="me-2" href={href(k)}>{k.split("/")[1].replace(/-/g, " ")}</Link>)}</p>}
      </section>

      <LeaderboardPanel />
      <BackupPanel />
    </div>
  );
}

function BackupPanel() {
  const { progress, replace } = useProgress();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [restored, setRestored] = useState<Awaited<ReturnType<typeof readBackupCode>> | null>(null);

  async function create() {
    const c = await makeBackupCode(progress);
    setCode(c);
    try { await navigator.clipboard.writeText(c); setMsg("Backup code created and copied. Keep it somewhere safe (notes app, email to yourself)."); } catch { setMsg("Backup code created. Select and copy it."); }
  }
  function download() {
    const blob = new Blob([code || ""], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `cc111-backup-${dayKey(new Date())}.txt`; a.click();
    URL.revokeObjectURL(a.href);
  }
  async function check() { setRestored(await readBackupCode(code)); setMsg(""); }

  return (
    <section aria-labelledby="backup" className="box grid gap-3">
      <h2 id="backup" className="text-lg font-semibold">Backup and restore</h2>
      <p className="text-sm text-muted">Your progress lives on this device only. Use a backup code to move it to another phone or laptop. No account needed.</p>
      <textarea className="btn !min-h-24 text-start font-mono text-sm" dir="ltr" value={code} onChange={(e) => { setCode(e.target.value); setRestored(null); }} placeholder="CC111-…  (paste a backup code here to restore)" spellCheck={false} aria-label="Backup code" />
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={create}>Create backup code</button>
        <button className="btn" onClick={download} disabled={!code}>Download as file</button>
        <button className="btn" onClick={check} disabled={!code.trim()}>Check code</button>
      </div>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      {restored && !restored.ok && <p role="alert" className="text-error">{restored.error}</p>}
      {restored && restored.ok && (
        <div className="box box-definition grid gap-2" role="status">
          <p>This backup has <strong>{restored.progress.xp} XP</strong>, {Object.values(restored.progress.topics).filter((t) => t.done).length} finished lesson(s) and {Object.keys(restored.progress.badges).length} badge(s). You currently have {progress.xp} XP.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => { replace(mergeProgress(progress, restored.progress)); setMsg("Merged: the best of both was kept."); setRestored(null); }}>Merge (keep the best of both)</button>
            <button className="btn" onClick={() => { if (confirm("Replace the progress on this device with the backup?")) { replace(restored.progress); setMsg("Restored."); setRestored(null); } }}>Replace this device&apos;s progress</button>
          </div>
        </div>
      )}
    </section>
  );
}
