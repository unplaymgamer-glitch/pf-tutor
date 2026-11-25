"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { askTutor, prepareImage, tutorDeviceId, type TutorPayload } from "@/lib/tutor/client";
import { Session, StoredMessage, deleteAllSessions, deleteSession, exportSessions, groupByAge, listSessions, newSession, saveSession, titleFrom } from "@/lib/tutor/history";
import type { Handoff } from "@/lib/tutor/handoff";
import { shortTitle } from "@/lib/short-titles";
import { detectLangRequest } from "@/lib/tutor/lang";
import { useSettings } from "../SettingsProvider";
import { useSiteState } from "../SiteState";
import { Message } from "./Message";
import { listen, speak, speechInputSupported, speechOutputSupported, stopSpeaking } from "./voice";

export type ModuleNav = { id: number; title: string; icon: string; hue: number; lessons: { key: string; title: string; week: number; href: string }[] };
type Status = { enabled: boolean; ai: boolean; dailyPerDevice: number } | null;
type Suggest = { title: string; href: string }[];
type Lang = "en" | "roman" | "ur";

// Module-level so the render-purity lint sees event-handler use, not render-time calls.
const stamp = () => ({ id: crypto.randomUUID(), at: Date.now() });
const nowMs = () => Date.now();

const STARTERS = ["Explain arrays with a picture", "Debug my code", "Quiz me on loops", "Make a quiz like mine", "Make an assignment like mine", "Trace this output step by step"];
const TOPIC_STARTERS = ["Explain this topic with a simple picture", "Give me a 3-question quiz on this", "What mistakes do beginners make here?", "Show a short C++ example I can run"];
const TEXT_FILE = /\.(cpp|cc|cxx|c|h|hpp|txt|md|csv|json)$/i;
const LANGS: { v: Lang; label: string }[] = [{ v: "en", label: "English" }, { v: "roman", label: "Roman Urdu" }, { v: "ur", label: "اردو" }];

/** The same clean outlined microphone Claude uses: a capsule, a cradle and a stem. */
function MicIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

async function toBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** The full-screen tutor: a sidebar with chats and topics, a roomy reading area and one composer that takes long text, files, PDFs, screenshots and voice. */
export default function ChatApp({ initial, modules, embedded = false }: { initial?: Handoff; modules: ModuleNav[]; embedded?: boolean }) {
  const { settings, update } = useSettings();
  const site = useSiteState();
  const lang = settings.lang as Lang;
  const lockTopic = embedded ? modules.flatMap((m) => m.lessons).find((l) => l.key === initial?.topicKey) : undefined;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cur, setCur] = useState<Session>(() => {
    const t = initial?.topicKey ? modules.flatMap((m) => m.lessons).find((l) => l.key === initial.topicKey) : undefined;
    return newSession(t ? { key: t.key, label: `${t.title} (Week ${t.week})` } : undefined);
  });
  const [tab, setTab] = useState<"chats" | "topics">("chats");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [openMod, setOpenMod] = useState<number | null>(null);
  const [input, setInput] = useState(initial?.autoSend ? "" : initial?.text ?? "");
  const [ctx, setCtx] = useState(initial?.code || initial?.diagnostics ? { code: initial.code, diagnostics: initial.diagnostics, stdin: initial.stdin } : undefined);
  const [texts, setTexts] = useState<{ name: string; text: string }[]>([]);
  const [pdfs, setPdfs] = useState<{ name: string; data: string }[]>([]);
  const [images, setImages] = useState<{ mediaType: "image/jpeg"; data: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<{ text: string; meta?: StoredMessage["meta"] } | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [errorBox, setErrorBox] = useState<{ message: string; suggest?: Suggest } | null>(null);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const stopListen = useRef<(() => void) | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    void fetch("/api/tutor", { cache: "no-store" }).then((r) => r.json()).then(setStatus).catch(() => setStatus({ enabled: true, ai: false, dailyPerDevice: 20 }));
    area.current?.focus();
    return () => { abort.current?.abort(); stopListen.current?.(); stopSpeaking(); };
  }, []);

  useEffect(() => {
    void listSessions().then((all) => {
      setSessions(all);
      if (started.current) return;
      started.current = true;
      // Coming from a lesson: continue that lesson's chat if there is one. A question sent from another page is asked straight away.
      const topicKey = initial?.topicKey;
      const existing = topicKey ? all.find((x) => x.topicKey === topicKey) : undefined;
      if (existing) setCur(existing);
      if (initial?.autoSend && initial.text) setTimeout(() => void submit(initial.text!, existing ?? cur), 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (cur.messages.length || live) bottom.current?.scrollIntoView({ block: "end" }); }, [cur.messages.length, live]);
  useEffect(() => {
    if (!drawer) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [drawer]);

  const askRef = useRef<(c: Handoff) => void>(() => {});
  useEffect(() => {
    askRef.current = (c) => { if (c.code || c.diagnostics) setCtx({ code: c.code, diagnostics: c.diagnostics, stdin: c.stdin }); if (c.text) void submit(c.text, cur); };
  });
  useEffect(() => {
    if (!embedded) return;
    const on = (e: Event) => askRef.current((e as CustomEvent<Handoff>).detail);
    window.addEventListener("cc111:ask", on);
    return () => window.removeEventListener("cc111:ask", on);
  }, [embedded]);

  async function persist(s: Session) {
    setCur(s);
    await saveSession(s);
    setSessions(await listSessions());
  }

  async function submit(text: string, base0: Session, deep = false) {
    const q = text.trim();
    // A student who asks for a language gets it, and it is remembered in their own browser.
    const reqLang = detectLangRequest(q) ?? lang;
    if (reqLang !== lang) update({ lang: reqLang });
    if (!q || busy) return;
    setErrorBox(null); setNote("");
    const userMsg: StoredMessage = { ...stamp(), role: "user", text: q };
    const base: Session = { ...base0, title: base0.messages.length ? base0.title : base0.topicLabel ?? titleFrom(q), messages: [...base0.messages, userMsg], updatedAt: userMsg.at };
    await persist(base);
    setInput(""); setBusy(true); setLive({ text: "" });
    if (area.current) area.current.style.height = "auto";
    const payload: TutorPayload = {
      messages: base.messages.slice(-12).map((m) => ({ role: m.role, content: m.text })),
      lang: reqLang, deviceId: tutorDeviceId(), deep,
      context: ctx || base.topicKey ? { code: ctx?.code, diagnostics: ctx?.diagnostics, stdin: ctx?.stdin, topic: base.topicKey } : undefined,
      file: texts.length ? { name: texts.map((t) => t.name).join(", ").slice(0, 200), text: texts.map((t) => `### ${t.name}\n${t.text}`).join("\n\n").slice(0, 120000) } : undefined,
      pdfs: pdfs.length ? pdfs : undefined,
      images: images.length ? images.map(({ mediaType, data }) => ({ mediaType, data })) : undefined,
    };
    const ac = new AbortController();
    abort.current = ac;
    let acc = "", meta: StoredMessage["meta"] | undefined, failed = false;
    await askTutor(payload, (e) => {
      if (e.type === "meta") { meta = { tier: e.tier, model: e.model, source: e.source, lessonKey: e.lessonKey }; setLive({ text: acc, meta }); }
      else if (e.type === "delta") { acc += e.text; setLive({ text: acc, meta }); }
      else if (e.type === "done") setLeft(e.leftToday);
      else if (e.type === "error") { failed = true; setErrorBox({ message: e.message, suggest: e.suggest }); }
    }, ac.signal);
    setLive(null); setBusy(false);
    setCtx(undefined); setTexts([]); setPdfs([]); setImages([]); // attachments belong to the question they were sent with
    if (acc) await persist({ ...base, messages: [...base.messages, { ...stamp(), role: "assistant", text: acc, meta }], updatedAt: stamp().at });
    else if (!failed) setErrorBox({ message: "No answer came back. Please try again." });
    if (!/Mock tutor/.test(acc)) try { void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "chat" }), keepalive: true }); } catch { /* ignore */ }
  }
  const send = (t = input, deep = false) => submit(t, cur, deep);

  async function pickFiles(list: FileList | File[] | null | undefined) {
    if (!list) return;
    setNote("");
    for (const f of Array.from(list)) {
      if (/^image\//.test(f.type)) {
        if (images.length >= 2) { setNote("You can attach up to 2 images."); continue; }
        const img = await prepareImage(f);
        if (!img) { setNote("Could not use that image. Use a PNG or JPEG under 8 MB."); continue; }
        setImages((p) => [...p, { ...img, name: f.name || "screenshot.jpg" }]);
      } else if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        if (pdfs.length >= 2) { setNote("You can attach up to 2 PDFs."); continue; }
        if (f.size > 4_000_000) { setNote("That PDF is over 4 MB. Split it or paste the text."); continue; }
        setPdfs((p) => [...p, { name: f.name, data: "" }]);
        const data = await toBase64(await f.arrayBuffer());
        setPdfs((p) => p.map((x) => (x.name === f.name && !x.data ? { ...x, data } : x)));
      } else if (TEXT_FILE.test(f.name)) {
        if (f.size > 120_000) { setNote(`${f.name} is over 120 KB. Paste the part you need.`); continue; }
        const text = await f.text();
        setTexts((p) => [...p, { name: f.name, text }]);
      } else setNote("Supported: PDF, .cpp .c .h .txt .md .csv .json files, and PNG or JPEG screenshots. For Word files, paste the text.");
    }
  }

  function toggleMic() {
    if (listening) { stopListen.current?.(); return; }
    setNote(""); setListening(true);
    stopListen.current = listen(lang, (t) => setInput(t), (err) => { setListening(false); if (err) setNote(err); });
  }

  function newChat() { setCur(newSession(lockTopic ? { key: lockTopic.key, label: `${lockTopic.title} (Week ${lockTopic.week})` } : undefined)); setErrorBox(null); setInput(""); setCtx(undefined); setTexts([]); setPdfs([]); setImages([]); setDrawer(false); area.current?.focus(); }
  function openTopic(l: ModuleNav["lessons"][number]) {
    const ex = sessions.find((s) => s.topicKey === l.key);
    setCur(ex ?? newSession({ key: l.key, label: `${l.title} (Week ${l.week})` }));
    setErrorBox(null); setDrawer(false); area.current?.focus();
  }
  async function copy(t: string) {
    try { await navigator.clipboard.writeText(t); setNote("Copied."); } catch { setNote("Could not copy. Select the text and copy it."); }
  }

  const features = site?.features;
  const unavailable = !!status && !status.enabled;
  const lastAssistant = [...cur.messages].reverse().find((m) => m.role === "assistant");
  const q = query.trim().toLowerCase();
  const groups = useMemo(() => groupByAge(sessions.filter((s) => !q || s.title.toLowerCase().includes(q) || (s.topicLabel ?? "").toLowerCase().includes(q)), nowMs()), [sessions, q]);
  const attachedCount = texts.length + pdfs.length + images.length + (ctx?.code ? 1 : 0);
  const topicLabel = cur.topicLabel;
  const lessonHref = cur.topicKey ? modules.flatMap((m) => m.lessons).find((l) => l.key === cur.topicKey)?.href : undefined;
  const side = "flex w-72 shrink-0 flex-col border-e border-border bg-surface";

  return (
    <section aria-label={embedded ? "Topic tutor chat" : "CC111 Tutor chat"} className={embedded ? "relative flex h-full min-h-0 bg-bg" : "fixed inset-0 z-[100] flex bg-bg"} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }} onDrop={(e) => { e.preventDefault(); setDragging(false); void pickFiles(e.dataTransfer.files); }}>
      {drawer && <button aria-label="Close the sidebar" className="fixed inset-0 z-10 bg-black/50 md:hidden" onClick={() => setDrawer(false)} />}
      <aside aria-label="Chats and topics" className={embedded ? "hidden" : `${side} ${drawer ? "fixed inset-y-0 start-0 z-20" : "hidden md:flex"}`}>
        <div className="grid gap-3 p-3">
          <button className="btn btn-primary !min-h-11 w-full text-base" onClick={newChat}>＋ New chat</button>
          <div role="tablist" aria-label="Sidebar" className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1">
            {(["chats", "topics"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={`min-h-10 rounded-lg text-sm font-semibold ${tab === t ? "bg-bg text-primary" : "text-muted"}`} onClick={() => setTab(t)}>{t === "chats" ? "Chats" : "Topics"}</button>
            ))}
          </div>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label={tab === "chats" ? "Search chats" : "Search topics"} placeholder={tab === "chats" ? "Search chats…" : "Search topics…"} className="btn w-full text-start text-sm" />
        </div>

        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {tab === "chats" ? (
            groups.length === 0 ? <p className="p-3 text-sm text-muted">{sessions.length ? "No chats match your search." : "No saved chats yet. Chats stay on this device."}</p> : groups.map((g) => (
              <div key={g.label} className="mb-3">
                <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
                <ul className="grid gap-0.5">
                  {g.items.map((s) => (
                    <li key={s.id} className={`group flex items-center rounded-lg ${s.id === cur.id ? "bg-surface2" : "hover:bg-surface2"}`}>
                      <button className="min-h-11 min-w-0 flex-1 px-2 text-start text-sm" aria-current={s.id === cur.id} onClick={() => { setCur(s); setErrorBox(null); setDrawer(false); }}>
                        <span className="block truncate">{s.title}</span>
                        {s.topicLabel && <span className="block truncate text-xs text-muted">📘 Topic chat</span>}
                      </button>
                      <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:text-error focus:opacity-100 md:opacity-0 md:group-hover:opacity-100" aria-label={`Delete chat ${s.title}`} onClick={async () => { await deleteSession(s.id); setSessions(await listSessions()); if (cur.id === s.id) newChat(); }}>🗑</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <ul className="grid gap-1">
              {modules.map((m) => {
                const lessons = m.lessons.filter((l) => !q || l.title.toLowerCase().includes(q) || m.title.toLowerCase().includes(q));
                if (!lessons.length) return null;
                const isOpen = openMod === m.id || !!q;
                return (
                  <li key={m.id} className="wk" style={{ ["--wk-h" as string]: m.hue }}>
                    <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start text-sm font-semibold hover:bg-surface2" aria-expanded={isOpen} onClick={() => setOpenMod(isOpen && !q ? null : m.id)}>
                      <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: "var(--wk-soft)" }}>{m.icon}</span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-normal" style={{ color: "var(--wk)" }}>Module {m.id}</span><span className="block truncate">{m.title}</span></span>
                      <span aria-hidden className="text-muted">{isOpen ? "▴" : "▾"}</span>
                    </button>
                    {isOpen && (
                      <ul className="mb-2 ms-4 grid gap-0.5 border-s border-border ps-2">
                        {lessons.map((l) => (
                          <li key={l.key}><button title={l.title} className={`min-h-10 w-full truncate rounded-lg px-2 text-start text-sm hover:bg-surface2 ${cur.topicKey === l.key ? "bg-surface2 font-semibold" : ""}`} onClick={() => openTopic(l)}>{shortTitle(l.key, l.title)}</button></li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-2 border-t border-border p-3">
          <nav aria-label="Site" className="grid grid-cols-2 gap-1 text-center text-xs font-semibold">
            {[["/", "Home"], ["/visual-lab", "Visual Lab"], ["/practice", "Practice"], ["/playground", "Playground"]].map(([h, t]) => <Link key={h} href={h} className="btn !min-h-10 !px-1 text-xs no-underline">{t}</Link>)}
          </nav>
          {sessions.length > 0 && (
            <div className="flex gap-2">
              <button className="btn !min-h-9 flex-1 text-xs" onClick={() => exportSessions(sessions)}>Export chats</button>
              <button className="btn !min-h-9 flex-1 text-xs" onClick={async () => { if (confirm("Delete ALL saved chats on this device?")) { await deleteAllSessions(); setSessions([]); newChat(); } }}>Delete all</button>
            </div>
          )}
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
          {!embedded && <button className="btn !min-h-10 !min-w-10 !px-0 md:hidden" aria-label="Open the sidebar" aria-expanded={drawer} onClick={() => setDrawer(true)}>☰</button>}
          {embedded ? (
            <>
              <h2 className="min-w-0 flex-1 truncate text-base font-semibold">💬 Topic tutor</h2>
              <select className="btn btn-sm max-w-[9rem]" aria-label="Chats about this topic" value={cur.id} onChange={(e) => { const s = sessions.find((x) => x.id === e.target.value); if (s) { setCur(s); setErrorBox(null); } }}>
                {!sessions.some((s) => s.id === cur.id) && <option value={cur.id}>New chat</option>}
                {sessions.filter((s) => s.topicKey === lockTopic?.key).map((s) => <option key={s.id} value={s.id}>{s.title.length > 22 ? `${s.title.slice(0, 22)}…` : s.title}</option>)}
              </select>
              <button className="btn btn-sm" onClick={newChat}>＋ New</button>
            </>
          ) : (
            <>
              <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{cur.messages.length ? cur.title : topicLabel ?? "New chat"}</h1>
              <Link href="/" className="btn !min-h-10 inline-flex items-center text-sm no-underline">← Home</Link>
            </>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
            {cur.messages.length === 0 && !live && (
              <div className="grid gap-4 py-4">
                <h2 className={embedded ? "text-xl font-bold" : "text-3xl font-bold sm:text-4xl"}>{topicLabel ? <>Studying <span className="gradient-text">{embedded ? lockTopic?.title ?? topicLabel : topicLabel}</span></> : <>Hello! <span aria-hidden>👋</span></>}</h2>
                {topicLabel ? (
                  <p className={embedded ? "text-sm text-muted" : "text-lg text-muted"}>Ask anything about this topic. I answer from this lesson first and use your language setting below. Your questions and my answers are saved in the Chats list, tagged as a topic chat.{" "}
                    {lessonHref && <Link href={lessonHref}>Open the lesson</Link>}</p>
                ) : (
                  <p className="text-base text-muted sm:text-lg">I&apos;m your CC111 Tutor. Ask anything about C++ and Programming Fundamentals. Type, paste long text, upload files (PDF, code, screenshots) or press the mic to speak in English, Roman Urdu or Urdu. I answer from your course lessons and link to them. Chats are saved in the sidebar on this device only.</p>
                )}
                {status && !status.ai && <p className="box box-exam text-sm">The AI part is not connected yet. I can still answer definition questions from the lessons.</p>}
                {unavailable && <p className="box box-exam text-sm">The tutor is switched off right now.</p>}
                <div className="flex flex-wrap gap-2" role="group" aria-label="Starter questions">
                  {(topicLabel ? TOPIC_STARTERS : STARTERS).map((s) => <button key={s} className="btn !min-h-11 !rounded-full text-sm" disabled={unavailable} onClick={() => void send(s)}>{s}</button>)}
                </div>
                <p className="text-sm text-muted">Tip: upload your own quiz or assignment (PDF, photo or pasted text) and ask “make a new one in the same format”. I copy the layout, marks and question types.</p>
              </div>
            )}

            {cur.messages.map((m) => m.role === "user" ? (
              <div key={m.id} dir="auto" className="ms-auto max-w-[88%] overflow-y-auto rounded-2xl bg-surface2 px-4 py-3 break-words whitespace-pre-wrap" style={{ maxHeight: "22rem" }}>{m.text}</div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold" style={{ background: "linear-gradient(135deg, var(--grad-a), var(--grad-b))", color: "var(--on-primary)" }}>C++</span>
                <div className="grid min-w-0 flex-1 gap-2">
                  <Message text={m.text} />
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted">
                    <span className="me-1">{m.meta?.source === "claude" ? `AI · ${m.meta.model}` : m.meta?.source === "instructor" ? "From your instructor" : "From the lessons (free)"}</span>
                    <button className="btn btn-sm" onClick={() => void copy(m.text)}>Copy</button>
                    {speechOutputSupported() && features?.voice !== false && (
                      <button className="btn btn-sm" onClick={() => { if (!speak(m.text, lang)) setNote(lang === "ur" ? "No Urdu voice is installed on this device, so I cannot read Urdu aloud." : "Reading aloud is not available here."); }}>🔊 Read aloud</button>
                    )}
                    {m === lastAssistant && !busy && m.meta?.source === "claude" && <button className="btn btn-sm" onClick={() => { const u = [...cur.messages].reverse().find((x) => x.role === "user"); if (u) void send(u.text, true); }}>🧠 Answer more deeply</button>}
                    {m === lastAssistant && !busy && m.meta?.source === "notes" && <button className="btn btn-sm" onClick={() => { const u = [...cur.messages].reverse().find((x) => x.role === "user"); if (u) void send(u.text, true); }}>🧠 Explain it with AI</button>}
                  </div>
                </div>
              </div>
            ))}
            {live && (
              <div className="flex gap-3">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold" style={{ background: "linear-gradient(135deg, var(--grad-a), var(--grad-b))", color: "var(--on-primary)" }}>C++</span>
                <div className="min-w-0 flex-1">{live.text ? <Message text={live.text} streaming /> : <span className="text-muted">Thinking…</span>}</div>
              </div>
            )}
            {errorBox && (
              <div className="box box-exam" role="alert">
                <p>{errorBox.message}</p>
                {errorBox.suggest && errorBox.suggest.length > 0 && <p className="mt-1 text-sm">Try: {errorBox.suggest.map((s) => <Link key={s.href} className="me-3" href={s.href}>{s.title}</Link>)}</p>}
              </div>
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="@container border-t border-border px-3 pb-3 pt-2">
          <div className="mx-auto grid max-w-3xl gap-2">
            {attachedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {ctx?.code && <span className="rounded-full bg-surface2 px-3 py-1">📝 your code{ctx.diagnostics ? " + error" : ""}</span>}
                {texts.map((t) => <span key={t.name} className="rounded-full bg-surface2 px-3 py-1">📎 {t.name}</span>)}
                {pdfs.map((p) => <span key={p.name} className="rounded-full bg-surface2 px-3 py-1">📄 {p.name}{p.data ? "" : " (reading…)"}</span>)}
                {images.map((i) => <span key={i.name} className="rounded-full bg-surface2 px-3 py-1">🖼 {i.name}</span>)}
                <button className="btn btn-sm" onClick={() => { setCtx(undefined); setTexts([]); setPdfs([]); setImages([]); }}>Remove all</button>
              </div>
            )}
            {note && <p role="status" className="text-sm text-muted">{note}</p>}
            <div className="flex flex-wrap items-end gap-1.5 rounded-3xl border border-border bg-surface p-1.5 focus-within:border-primary @xl:flex-nowrap">
              {features?.upload !== false && (
                <>
                  <button className="btn order-2 !min-h-11 !min-w-11 !rounded-full !px-0 text-xl @xl:order-1" aria-label="Attach files" onClick={() => fileRef.current?.click()}>＋</button>
                  <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden accept=".pdf,.cpp,.cc,.cxx,.c,.h,.hpp,.txt,.md,.csv,.json,image/png,image/jpeg" onChange={(e) => { void pickFiles(e.target.files); e.target.value = ""; }} />
                </>
              )}
              <textarea ref={area} className="order-1 max-h-60 min-h-11 basis-full resize-none @xl:order-2 @xl:basis-0 @xl:flex-1 bg-transparent px-2 py-2.5 !outline-none" rows={1} maxLength={40000} value={input} placeholder={topicLabel ? "Ask about this topic…" : "Ask a question, paste text or drop files…"} aria-label="Your question" dir="auto" disabled={unavailable}
                onChange={(e) => { setInput(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 240)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
                onPaste={(e) => { const f = Array.from(e.clipboardData.files).filter((x) => /^image\//.test(x.type)); if (f.length) { e.preventDefault(); void pickFiles(f); } }} />
              <select className="btn order-3 ms-auto !min-h-11 !px-2 text-sm @xl:ms-0" aria-label="Answer language" value={lang} onChange={(e) => update({ lang: e.target.value as Lang })}>
                {LANGS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
              </select>
              {features?.voice !== false && speechInputSupported() && <button className={`btn order-3 !min-h-11 !min-w-11 !rounded-full !px-0 ${listening ? "border-error text-error" : "text-muted hover:text-text"}`} aria-label={listening ? "Stop voice input" : "Voice input"} aria-pressed={listening} onClick={toggleMic}>{listening ? <span className="h-3.5 w-3.5 rounded-sm bg-current" aria-hidden /> : <MicIcon />}</button>}
              {busy
                ? <button className="btn order-3 !min-h-11 !min-w-11 !rounded-full !px-0" aria-label="Stop" onClick={() => abort.current?.abort()}>⏹</button>
                : <button className="btn btn-primary order-3 !min-h-11 !min-w-11 !rounded-full !px-0 text-lg" aria-label="Send" disabled={!input.trim() || unavailable} onClick={() => void send()}>↑</button>}
            </div>
            <p className="text-center text-xs text-muted">{left !== null ? `${left} AI question(s) left today · ` : ""}The tutor can make mistakes. Check important answers with your lesson or instructor.</p>
          </div>
        </div>
        {dragging && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center border-2 border-dashed border-primary bg-bg/80 text-xl font-semibold">Drop files here</div>}
      </div>
    </section>
  );
}
