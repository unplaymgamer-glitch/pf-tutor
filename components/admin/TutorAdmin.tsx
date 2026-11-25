"use client";
import { useEffect, useState } from "react";

type TutorData = {
  settings: { enabled: boolean; monthlyBudgetUSD: number; dailyPerDevice: number; maxDeepPerDay: number; hintFirst: boolean; tier0Threshold: number };
  providerConfigured: boolean; mock: boolean; spendUSD: number; questionsToday: number;
  models: [string, number][]; topics: [string, number][]; answers: { id: string; keywords: string; answer: string }[];
};

export function TutorAdmin({ post }: { post: (a: string, b: unknown) => Promise<boolean> }) {
  const [d, setD] = useState<TutorData | null>(null);
  const [tick, setTick] = useState(0);
  const [kw, setKw] = useState("");
  const [ans, setAns] = useState("");
  useEffect(() => {
    let off = false;
    void fetch("/api/admin/tutor", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (!off) setD(j); });
    return () => { off = true; };
  }, [tick]);
  if (!d) return <p>Loading…</p>;
  const s = d.settings;
  const save = async (patch: Partial<TutorData["settings"]>) => { if (await post("tutor-settings", { ...s, ...patch })) setTick((t) => t + 1); };
  const pct = s.monthlyBudgetUSD > 0 ? Math.min(100, Math.round((d.spendUSD / s.monthlyBudgetUSD) * 100)) : 100;
  return (
    <div className="grid gap-4">
      <p className={`box ${d.providerConfigured || d.mock ? "box-roman" : "box-warning"}`} role="status">
        {d.providerConfigured ? "✓ Claude is connected (ANTHROPIC_API_KEY is set on the server)." : d.mock ? "Test mode: a mock tutor is answering (no AI, no cost)." : "Claude is NOT connected: set ANTHROPIC_API_KEY on the server. Until then the tutor answers only from the lessons and your instructor answers."}
      </p>
      <div className="box grid gap-2">
        <strong>Switch and limits</strong>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={s.enabled} onChange={(e) => save({ enabled: e.target.checked })} /> Tutor on</label>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={s.hintFirst} onChange={(e) => save({ hintFirst: e.target.checked })} /> Hints first for assignment-like requests (turn off to allow full solutions)</label>
        <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void save({ monthlyBudgetUSD: Number(f.get("b")), dailyPerDevice: Number(f.get("q")), maxDeepPerDay: Number(f.get("d")), tier0Threshold: Number(f.get("t")) }); }}>
          <label className="grid gap-1 text-sm">Monthly budget (USD)<input name="b" type="number" min={0} max={1000} step="0.5" defaultValue={s.monthlyBudgetUSD} className="btn text-start" /></label>
          <label className="grid gap-1 text-sm">AI questions per student per day<input name="q" type="number" min={0} max={200} defaultValue={s.dailyPerDevice} className="btn text-start" /></label>
          <label className="grid gap-1 text-sm">Deep answers per student per day<input name="d" type="number" min={0} max={100} defaultValue={s.maxDeepPerDay} className="btn text-start" /></label>
          <label className="grid gap-1 text-sm">Free-answer confidence (0.3 to 1)<input name="t" type="number" min={0.3} max={1} step="0.05" defaultValue={s.tier0Threshold} className="btn text-start" /></label>
          <button className="btn btn-primary w-fit sm:col-span-4">Save limits</button>
        </form>
      </div>
      <div className="box grid gap-1">
        <strong>This month</strong>
        <p>Spent ${d.spendUSD.toFixed(2)} of ${s.monthlyBudgetUSD.toFixed(2)} ({pct}%). When the cap is reached the tutor pauses and the lesson search still works.</p>
        <progress max={100} value={pct} className="w-full" aria-label="Budget used" />
        <p className="text-sm text-muted">AI questions today: {d.questionsToday}. By model: {d.models.map(([k, n]) => `${k} ${n}`).join(", ") || "none yet"}.</p>
      </div>
      <div className="box">
        <strong>Most asked lessons</strong>
        <ol className="ps-5">{d.topics.map(([k, n]) => <li key={k}>{k}: {n}</li>)}{d.topics.length === 0 && <li className="list-none text-muted">No questions yet.</li>}</ol>
      </div>
      <div className="box grid gap-2">
        <strong>Instructor answers (the tutor prefers these)</strong>
        <p className="text-sm text-muted">If a student&apos;s question contains ALL the keywords (comma separated), this answer is shown directly and costs nothing. The AI also sees them as preferred facts.</p>
        <form className="grid gap-2" onSubmit={async (e) => { e.preventDefault(); if (await post("ia-add", { keywords: kw, answer: ans })) { setKw(""); setAns(""); setTick((t) => t + 1); } }}>
          <label className="grid gap-1 text-sm">Keywords<input className="btn text-start" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="quiz 2, when" required minLength={3} /></label>
          <label className="grid gap-1 text-sm">Answer<textarea className="btn text-start" rows={3} value={ans} onChange={(e) => setAns(e.target.value)} placeholder="Quiz 2 is on Friday and covers Weeks 5 to 7." required minLength={3} maxLength={2000} /></label>
          <button className="btn btn-primary w-fit">Add answer</button>
        </form>
        <ul className="grid gap-2">
          {d.answers.map((a) => (
            <li key={a.id} className="box flex flex-wrap items-center justify-between gap-2">
              <span><strong>[{a.keywords}]</strong> {a.answer}</span>
              <button className="btn" onClick={async () => { if (await post("ia-delete", { id: a.id })) setTick((t) => t + 1); }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
