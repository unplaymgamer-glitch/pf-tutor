"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TutorAdmin } from "./TutorAdmin";
import type { SiteState } from "@/lib/gate-logic";
import { CHAPTERS } from "@/lib/course";

type AdminData = { siteName: string; csrf: string; store: "supabase" | "memory"; state: SiteState; topics: { week: number; slug: string; title: string }[] };
type Tab = "weeks" | "announcements" | "settings" | "tutor" | "leaderboard" | "analytics" | "audit" | "health" | "backup";
const TABS: [Tab, string][] = [["weeks", "Weeks & topics"], ["announcements", "Announcements"], ["settings", "Settings"], ["tutor", "AI tutor"], ["leaderboard", "Leaderboard"], ["analytics", "Analytics"], ["audit", "Audit log"], ["health", "Health"], ["backup", "Backup"]];

export function AdminApp() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("weeks");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/state", { cache: "no-store" });
    if (r.status === 401) { router.refresh(); return; }
    setData(await r.json());
  }, [router]);
  useEffect(() => {
    let off = false;
    void fetch("/api/admin/state", { cache: "no-store" }).then(async (r) => {
      if (off) return;
      if (r.status === 401) router.refresh();
      else setData(await r.json());
    });
    return () => { off = true; };
  }, [router]);

  async function post(action: string, body: unknown) {
    if (!data) return false;
    const r = await fetch(`/api/admin/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "x-csrf-token": data.csrf }, body: JSON.stringify(body) });
    if (r.status === 401) { router.refresh(); return false; }
    if (!r.ok) { setMsg(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? "Failed"); return false; }
    setMsg("Saved ✓"); await load(); return true;
  }
  async function logout() { await post("logout", {}); router.refresh(); }

  if (!data) return <p>Loading…</p>;
  const { state } = data;
  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{data.siteName}: instructor admin</h1>
        <button className="btn" onClick={logout}>Sign out</button>
      </header>
      {data.store === "memory" && (typeof window !== "undefined" && /^(localhost|127\.|\[::1\])/.test(window.location.hostname)
        ? <p className="box box-warning">Local test mode: no database configured, so changes are lost when the server restarts.</p>
        : <p className="box box-error" role="alert"><strong>⚠ Changes are NOT being saved.</strong> The database key is missing on the server. Add <code>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel → Settings → Environment Variables and redeploy; until then the ON/OFF switch, locks and announcements will not be remembered.</p>)}
      <div className={`box flex flex-wrap items-center justify-between gap-3 ${state.maintenance ? "box-error" : "box-roman"}`} role="status">
        <div>
          <strong className="text-lg">{state.maintenance ? "🔴 Website is OFF" : "🟢 Website is ON"}</strong>
          <p className="text-sm">{state.maintenance ? "Students see only a “closed” screen. Nothing else is shown to them. You can still use this admin page." : "Students can open the website normally."}</p>
        </div>
        <button className={`btn ${state.maintenance ? "btn-primary" : ""}`} onClick={() => { if (confirm(state.maintenance ? "Turn the website ON for students?" : "Turn the website OFF? Students will not be able to open anything.")) void post("setting", { key: "maintenance", value: !state.maintenance }); }}>
          {state.maintenance ? "Turn website ON" : "Turn website OFF"}
        </button></div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={`btn ${tab === id ? "btn-primary" : ""}`} onClick={() => { setTab(id); setMsg(""); }}>{label}</button>)}
      </div>
      <p role="status" className="min-h-6 text-sm text-muted">{msg}</p>
      {tab === "weeks" && <Weeks data={data} post={post} />}
      {tab === "announcements" && <Announcements data={data} post={post} />}
      {tab === "settings" && <Settings data={data} post={post} />}
      {tab === "tutor" && <TutorAdmin post={post} />}
      {tab === "leaderboard" && <Leaderboard post={post} />}
      {tab === "analytics" && <Analytics />}
      {tab === "audit" && <Audit />}
      {tab === "health" && <Health />}
      {tab === "backup" && <Backup />}
    </div>
  );
}

type Post = (a: string, b: unknown) => Promise<boolean>;

function Weeks({ data, post }: { data: AdminData; post: Post }) {
  const [open, setOpen] = useState<number | null>(null);
  const [unlockAt, setUnlockAt] = useState<Record<number, string>>({});
  return (
    <ul className="grid gap-2">
      {CHAPTERS.map((c) => {
        const w = data.state.weeks.find((x) => x.week === c.week);
        const topics = data.topics.filter((t) => t.week === c.week);
        return (
          <li key={c.week} className="box grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>Week {c.week}: {c.title}</strong>
              <span>{w?.locked ? "🔒 locked" : "🔓 open"}{w?.unlock_at && w.locked ? ` (opens ${new Date(w.unlock_at).toLocaleString()})` : ""} · {w?.taught ? "✅ taught" : "not taught"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => post("week", { week: c.week, locked: !w?.locked, unlock_at: null })}>{w?.locked ? "Unlock now" : "Lock"}</button>
              <button className="btn" onClick={() => post("week", { week: c.week, taught: !w?.taught })}>{w?.taught ? "Mark not taught" : "Mark taught ✅"}</button>
              <label className="flex items-center gap-1 text-sm">Open at
                <input type="datetime-local" className="btn" value={unlockAt[c.week] ?? ""} onChange={(e) => setUnlockAt({ ...unlockAt, [c.week]: e.target.value })} />
              </label>
              <button className="btn" disabled={!unlockAt[c.week]} onClick={() => post("week", { week: c.week, locked: true, unlock_at: new Date(unlockAt[c.week]).toISOString() })}>Schedule</button>
              {topics.length > 0 && <button className="btn" aria-expanded={open === c.week} onClick={() => setOpen(open === c.week ? null : c.week)}>Topics ({topics.length})</button>}
            </div>
            {open === c.week && (
              <ul className="grid gap-1 ps-2">
                {topics.map((t) => {
                  const ts = data.state.topics.find((x) => x.week === t.week && x.slug === t.slug);
                  const val = ts?.locked === true ? "locked" : ts?.locked === false ? "open" : "follow";
                  return (
                    <li key={t.slug} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1">
                      <span>{t.title}</span>
                      <span className="flex items-center gap-2">
                        <select aria-label={`Access for ${t.title}`} className="btn" value={val} onChange={(e) => post("topic", { week: t.week, slug: t.slug, locked: e.target.value === "follow" ? null : e.target.value === "locked", unlock_at: null })}>
                          <option value="follow">Follow week</option><option value="open">Always open</option><option value="locked">Locked</option>
                        </select>
                        <button className="btn" onClick={() => post("topic", { week: t.week, slug: t.slug, taught: !ts?.taught })}>{ts?.taught ? "✅ taught" : "Mark taught"}</button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Announcements({ data, post }: { data: AdminData; post: Post }) {
  const [text, setText] = useState(""), [start, setStart] = useState(""), [end, setEnd] = useState("");
  return (
    <div className="grid gap-3">
      <form className="box grid gap-2" onSubmit={async (e) => { e.preventDefault(); if (await post("announcement", { text, ...(start ? { starts_at: new Date(start).toISOString() } : {}), ends_at: end ? new Date(end).toISOString() : null })) { setText(""); setStart(""); setEnd(""); } }}>
        <label className="grid gap-1">New announcement (max 300 characters)<input className="btn text-start" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} required placeholder="Quiz 2 on Friday, Weeks 5–7" /></label>
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-sm">Show from (optional)<input type="datetime-local" className="btn" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Hide after (optional)<input type="datetime-local" className="btn" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        <button className="btn btn-primary">Publish</button>
      </form>
      <ul className="grid gap-2">
        {data.state.announcements.map((a) => (
          <li key={a.id} className="box flex flex-wrap items-center justify-between gap-2">
            <span>{a.text}<br /><small className="text-muted">{new Date(a.starts_at).toLocaleString()} → {a.ends_at ? new Date(a.ends_at).toLocaleString() : "no end"}</small></span>
            <button className="btn" onClick={() => post("announcement-delete", { id: a.id })}>Delete</button>
          </li>
        ))}
        {data.state.announcements.length === 0 && <li className="text-muted">No announcements.</li>}
      </ul>
    </div>
  );
}

function Settings({ data, post }: { data: AdminData; post: Post }) {
  const s = data.state;
  const feat = (k: keyof SiteState["features"]) => (
    <label key={k} className="flex min-h-11 items-center gap-3">
      <input type="checkbox" className="h-5 w-5" checked={s.features[k]} onChange={(e) => post("setting", { key: "features", value: { ...s.features, [k]: e.target.checked } })} /> {k}
    </label>
  );
  return (
    <div className="grid gap-4">
      <div className="box box-error grid gap-2">
        <strong>Website ON/OFF</strong>
        <p>OFF closes the whole student website immediately (students see only a closed screen). The same switch is at the top of this page.</p>
        <button className="btn" onClick={() => { if (confirm(s.maintenance ? "Turn the website ON?" : "Turn the website OFF for all students now?")) void post("setting", { key: "maintenance", value: !s.maintenance }); }}>{s.maintenance ? "Turn website ON" : "Turn website OFF"}</button>
      </div>
      <div className="box grid gap-2">
        <strong>Quiz / exam mode</strong>
        <p>Hides practice solutions and explanations (they are removed on the server, not just hidden).</p>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={s.examMode} onChange={(e) => post("setting", { key: "examMode", value: e.target.checked })} /> Exam mode</label>
      </div>
      <div className="box grid gap-1"><strong>Feature toggles</strong>{(Object.keys(s.features) as (keyof SiteState["features"])[]).map(feat)}
        <p className="text-sm text-muted">Features are wired up in later phases; the switches are stored now.</p></div>
    </div>
  );
}

function Leaderboard({ post }: { post: Post }) {
  const [d, setD] = useState<{ weekId: string; rows: { device_id: string; nickname: string; avatar: string; xp_week: number; hidden: boolean }[]; banned: string[] } | null>(null);
  const [words, setWords] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let off = false;
    void fetch("/api/admin/leaderboard", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (!off) { setD(j); setWords((j.banned ?? []).join(", ")); } });
    return () => { off = true; };
  }, [tick]);
  const act = async (a: string, b: unknown) => { if (await post(a, b)) setTick((t) => t + 1); };
  if (!d) return <p>Loading…</p>;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">Week {d.weekId}. Only nickname, avatar and weekly XP are stored. XP is self-reported by each device (capped by the server) so it cannot be fully cheat-proof: use moderation if something looks wrong.</p>
      <ul className="grid gap-2">
        {d.rows.map((r) => (
          <li key={r.device_id} className={`box flex flex-wrap items-center justify-between gap-2 ${r.hidden ? "border-dashed text-muted" : ""}`}>
            <span>{r.avatar} <strong>{r.nickname}</strong> · {r.xp_week} XP {r.hidden && "· hidden"}</span>
            <span className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => act("lb-hide", { deviceId: r.device_id, hidden: !r.hidden })}>{r.hidden ? "Show" : "Hide"}</button>
              <button className="btn" onClick={() => { const n = prompt("New nickname (2-16 characters)", r.nickname); if (n) void act("lb-rename", { deviceId: r.device_id, nickname: n }); }}>Rename</button>
              <button className="btn" onClick={() => { if (confirm("Remove this entry?")) void act("lb-delete", { deviceId: r.device_id }); }}>Remove</button>
            </span>
          </li>
        ))}
        {d.rows.length === 0 && <li className="text-muted">No entries this week.</li>}
      </ul>
      <div className="flex flex-wrap gap-2"><button className="btn" onClick={() => { if (confirm("Reset this week's leaderboard? All entries are deleted.")) void act("lb-reset", {}); }}>Reset this week</button></div>
      <form className="box grid gap-2" onSubmit={(e) => { e.preventDefault(); void act("lb-banned", { words: words.split(",").map((w) => w.trim()).filter((w) => w.length >= 3) }); }}>
        <label className="grid gap-1">Extra banned nickname words (comma separated, 3+ letters; a built-in list always applies)<textarea className="btn text-start" rows={2} value={words} onChange={(e) => setWords(e.target.value)} /></label>
        <button className="btn btn-primary w-fit">Save banned words</button>
      </form>
    </div>
  );
}

function Analytics() {
  const [rows, setRows] = useState<{ day: string; kind: string; key: string; n: number }[] | null>(null);
  useEffect(() => { void fetch("/api/admin/analytics", { cache: "no-store" }).then((r) => r.json()).then((j) => setRows(j.rows)); }, []);
  if (!rows) return <p>Loading…</p>;
  const sum = (kind: string) => { const m = new Map<string, number>(); rows.filter((r) => r.kind === kind).forEach((r) => m.set(r.key, (m.get(r.key) ?? 0) + r.n)); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const list = (title: string, kind: string, top = 10) => (
    <div className="box" key={kind}><strong>{title}</strong><ol className="ps-5">{sum(kind).slice(0, top).map(([k, n]) => <li key={k}>{k}: {n}</li>)}{sum(kind).length === 0 && <li className="list-none text-muted">No data yet.</li>}</ol></div>
  );
  // Average quiz score per topic from 20%-wide buckets (bucket midpoint).
  const scores = new Map<string, { sum: number; n: number }>();
  sum("quiz-score").forEach(([key, n]) => { const [topic, b] = key.split("|"); const e = scores.get(topic) ?? { sum: 0, n: 0 }; e.sum += (Number(b) + (Number(b) === 100 ? 0 : 10)) * n; e.n += n; scores.set(topic, e); });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {list("Visits per chapter (last 30 days)", "view-week", 16)}
      {list("Most viewed lessons", "view-topic")}
      {list("Mobile vs desktop", "device")}
      {list("Code runs (total)", "code-run")}
      {list("Most missed quiz questions", "quiz-missed")}
      {list("Chatbot questions by chapter", "chat-topic")}
      <div className="box sm:col-span-2"><strong>Average quiz score per lesson (approximate)</strong>
        <ul className="ps-5">{[...scores.entries()].map(([k, e]) => <li key={k}>{k}: {Math.round(e.sum / e.n)}% ({e.n} attempts)</li>)}{scores.size === 0 && <li className="list-none text-muted">No quiz data yet.</li>}</ul></div>
      <p className="text-sm text-muted sm:col-span-2">Anonymous counters only. No names, emails or device identifiers are stored.</p>
    </div>
  );
}

function Audit() {
  const [rows, setRows] = useState<{ id: number; at: string; action: string; detail: unknown }[] | null>(null);
  useEffect(() => { void fetch("/api/admin/audit", { cache: "no-store" }).then((r) => r.json()).then((j) => setRows(j.rows)); }, []);
  if (!rows) return <p>Loading…</p>;
  return <ul className="grid gap-1 text-sm">{rows.map((r) => <li key={r.id} className="box"><strong>{r.action}</strong> · {new Date(r.at).toLocaleString()} <code className="break-all">{JSON.stringify(r.detail)}</code></li>)}{rows.length === 0 && <li className="text-muted">Nothing logged yet.</li>}</ul>;
}

function Health() {
  const [h, setH] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { void fetch("/api/admin/health", { cache: "no-store" }).then((r) => r.json()).then(setH); }, []);
  if (!h) return <p>Checking…</p>;
  return <pre tabIndex={0} className="code" dir="ltr">{JSON.stringify(h, null, 2)}</pre>;
}

function Backup() {
  return (
    <div className="box grid gap-2">
      <p>Download settings, audit log and analytics. Keep the backup file private.</p>
      <div className="flex flex-wrap gap-2">
        <a className="btn inline-flex items-center no-underline" href="/api/admin/export?format=json" download>Download JSON backup</a>
        <a className="btn inline-flex items-center no-underline" href="/api/admin/export?format=csv" download>Download analytics CSV</a>
      </div>
    </div>
  );
}
