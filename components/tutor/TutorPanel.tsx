"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { askTutor, prepareImage, tutorDeviceId, type TutorPayload } from "@/lib/tutor/client";
import { Session, StoredMessage, deleteAllSessions, deleteSession, exportSessions, listSessions, newSession, saveSession, titleFrom } from "@/lib/tutor/history";
import { useSettings } from "../SettingsProvider";
import { useSiteState } from "../SiteState";
import { Message } from "./Message";
import { listen, speak, speechInputSupported, speechOutputSupported, stopSpeaking } from "./voice";
import type { AskContext } from "./TutorProvider";

type Status = { enabled: boolean; ai: boolean; dailyPerDevice: number } | null;
type Suggest = { title: string; href: string }[];


export default function Panel({ onClose, initial }: { onClose: () => void; initial?: AskContext }) {
  const { settings } = useSettings();
  const site = useSiteState();
  const lang = settings.lang;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cur, setCur] = useState<Session>(() => newSession());
  const [showList, setShowList] = useState(false);
  const [input, setInput] = useState(initial?.text ?? "");
  const [context, setContext] = useState<AskContext | undefined>(initial);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [images, setImages] = useState<{ mediaType: "image/jpeg"; data: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<{ text: string; meta?: StoredMessage["meta"] } | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [errorBox, setErrorBox] = useState<{ message: string; suggest?: Suggest } | null>(null);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const abort = useRef<AbortController | null>(null);
  const stopListen = useRef<(() => void) | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listSessions().then((s) => { setSessions(s); });
    void fetch("/api/tutor", { cache: "no-store" }).then((r) => r.json()).then(setStatus).catch(() => setStatus({ enabled: true, ai: false, dailyPerDevice: 20 }));
    area.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); abort.current?.abort(); stopListen.current?.(); stopSpeaking(); };
  }, [onClose]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [cur.messages.length, live?.text]);

  async function persist(s: Session) {
    setCur(s);
    await saveSession(s);
    setSessions(await listSessions());
  }

  async function send(deep = false, overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    setErrorBox(null); setNote("");
    const userMsg: StoredMessage = { id: crypto.randomUUID(), role: "user", text, at: Date.now() };
    const base: Session = { ...cur, title: cur.messages.length ? cur.title : titleFrom(text), messages: [...cur.messages, userMsg], updatedAt: Date.now() };
    await persist(base);
    setInput(""); setBusy(true); setLive({ text: "" });
    const payload: TutorPayload = {
      messages: base.messages.slice(-12).map((m) => ({ role: m.role, content: m.text })),
      lang, deviceId: tutorDeviceId(), deep,
      context: context && (context.code || context.diagnostics) ? { code: context.code, diagnostics: context.diagnostics, stdin: context.stdin, topic: context.topic } : undefined,
      file: file ?? undefined,
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
    setContext(undefined); setFile(null); setImages([]); // attachments belong to the question they were sent with
    if (acc) await persist({ ...base, messages: [...base.messages, { id: crypto.randomUUID(), role: "assistant", text: acc, meta, at: Date.now() }], updatedAt: Date.now() });
    else if (!failed) setErrorBox({ message: "No answer came back. Please try again." });
    if (!/Mock tutor/.test(acc)) try { void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "chat" }), keepalive: true }); } catch { /* ignore */ }
  }

  async function pickFile(f: File | undefined) {
    if (!f) return;
    setNote("");
    if (/^image\//.test(f.type)) {
      const img = await prepareImage(f);
      if (!img) { setNote("Could not use that image. Use a PNG or JPEG under 8 MB."); return; }
      setImages([{ ...img, name: f.name }]);
    } else if (/\.(cpp|cc|cxx|h|hpp|txt)$/i.test(f.name) && f.size <= 20_000) {
      setFile({ name: f.name, text: await f.text() });
    } else setNote("Attach a .cpp or .txt file under 20 KB, or a PNG/JPEG screenshot.");
  }

  function toggleMic() {
    if (listening) { stopListen.current?.(); return; }
    setNote(""); setListening(true);
    stopListen.current = listen(lang, (t) => setInput(t), (err) => { setListening(false); if (err) setNote(err); });
  }

  const features = site?.features;
  const lastAssistant = [...cur.messages].reverse().find((m) => m.role === "assistant");
  const unavailable = status && !status.enabled;

  return (
    <section role="dialog" aria-label="CC111 Tutor chat" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl border border-border bg-bg shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[28rem] sm:rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <strong>💬 CC111 Tutor</strong>
        <span className="flex gap-1">
          <button className="btn !min-h-9 text-sm" aria-expanded={showList} onClick={() => setShowList(!showList)}>History ({sessions.length})</button>
          <button className="btn !min-h-9 text-sm" onClick={() => { setCur(newSession()); setErrorBox(null); setShowList(false); }}>New</button>
          <button className="btn !min-h-9 text-sm" aria-label="Close tutor chat" onClick={onClose}>✕</button>
        </span>
      </header>

      {showList ? (
        <div className="grid gap-2 overflow-y-auto p-3">
          {sessions.length === 0 && <p className="text-muted">No saved chats yet. Chats stay on this device.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="box flex items-center justify-between gap-2">
              <button className="min-h-11 flex-1 text-start" onClick={() => { setCur(s); setShowList(false); }}>{s.title}<br /><span className="text-xs text-muted">{new Date(s.updatedAt).toLocaleString()}</span></button>
              <button className="btn !min-h-9" aria-label={`Delete chat ${s.title}`} onClick={async () => { await deleteSession(s.id); setSessions(await listSessions()); if (cur.id === s.id) setCur(newSession()); }}>🗑</button>
            </div>
          ))}
          {sessions.length > 0 && (
            <div className="flex gap-2">
              <button className="btn" onClick={() => exportSessions(sessions)}>Export all</button>
              <button className="btn" onClick={async () => { if (confirm("Delete ALL saved chats on this device?")) { await deleteAllSessions(); setSessions([]); setCur(newSession()); } }}>Delete all</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid flex-1 gap-3 overflow-y-auto p-3" aria-live="polite">
            {cur.messages.length === 0 && !live && (
              <div className="box box-definition grid gap-1 text-sm">
                <p><strong>Ask me anything about your C++ lessons.</strong> I explain step by step, in English, Roman Urdu or Urdu (change it in ⚙ Settings).</p>
                <p className="text-muted">Tips: paste your code, press 🎤 to speak, or attach a screenshot of an error. For graded work I give hints first.</p>
                {status && !status.ai && <p className="text-warning">The AI part is not connected yet. I can still answer from the lessons.</p>}
                {unavailable && <p className="text-warning">The tutor is switched off right now.</p>}
              </div>
            )}
            {cur.messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ms-8 rounded-xl bg-surface2 p-3" : "me-4 rounded-xl border border-border bg-surface p-3"}>
                <Message text={m.text} />
                {m.role === "assistant" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{m.meta?.source === "claude" ? `AI · ${m.meta.model}` : m.meta?.source === "instructor" ? "From your instructor" : "From the lessons (free)"}</span>
                    {speechOutputSupported() && features?.voice !== false && (
                      <button className="btn !min-h-8 text-xs" onClick={() => { if (!speak(m.text, lang)) setNote(lang === "ur" ? "No Urdu voice is installed on this device, so I cannot read Urdu aloud." : "Reading aloud is not available here."); }}>🔊 Read aloud</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {live && <div className="me-4 rounded-xl border border-border bg-surface p-3">{live.text ? <Message text={live.text} streaming /> : <span className="text-muted">Thinking…</span>}</div>}
            {errorBox && (
              <div className="box box-warning" role="alert">
                <p>{errorBox.message}</p>
                {errorBox.suggest && errorBox.suggest.length > 0 && <p className="mt-1 text-sm">Try: {errorBox.suggest.map((s) => <Link key={s.href} className="me-3" href={s.href} onClick={onClose}>{s.title}</Link>)}</p>}
              </div>
            )}
            {!busy && lastAssistant?.meta?.source === "claude" && cur.messages.at(-1) === lastAssistant && (
              <button className="btn w-fit text-sm" onClick={() => { const q = [...cur.messages].reverse().find((m) => m.role === "user"); if (q) void send(true, q.text); }}>🧠 Answer more deeply</button>
            )}
            {!busy && lastAssistant?.meta?.source === "notes" && cur.messages.at(-1) === lastAssistant && (
              <button className="btn w-fit text-sm" onClick={() => { const q = [...cur.messages].reverse().find((m) => m.role === "user"); if (q) void send(true, q.text); }}>🧠 Explain it with AI</button>
            )}
            <div ref={bottom} />
          </div>

          <div className="grid gap-2 border-t border-border p-3">
            {(context?.code || file || images.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {context?.code && <span className="rounded bg-surface2 px-2 py-1">📝 your code{context.diagnostics ? " + error" : ""}</span>}
                {file && <span className="rounded bg-surface2 px-2 py-1">📎 {file.name}</span>}
                {images.map((i) => <span key={i.name} className="rounded bg-surface2 px-2 py-1">🖼 {i.name}</span>)}
                <button className="btn !min-h-8 text-xs" onClick={() => { setContext(undefined); setFile(null); setImages([]); }}>Remove</button>
              </div>
            )}
            {note && <p role="status" className="text-sm text-muted">{note}</p>}
            <div className="flex items-end gap-2">
              <textarea ref={area} className="btn !min-h-11 flex-1 text-start" rows={2} maxLength={4000} value={input} placeholder="Type your question…" aria-label="Your question" disabled={!!unavailable}
                onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
              <button className="btn btn-primary" disabled={busy || !input.trim() || !!unavailable} onClick={() => void send()}>{busy ? "…" : "Send"}</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {features?.upload !== false && (
                <label className="btn !min-h-9 cursor-pointer text-sm">📎 Attach
                  <input type="file" className="sr-only" accept=".cpp,.cc,.cxx,.h,.hpp,.txt,image/png,image/jpeg" onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              )}
              {features?.voice !== false && speechInputSupported() && <button className={`btn !min-h-9 text-sm ${listening ? "border-error" : ""}`} aria-pressed={listening} onClick={toggleMic}>{listening ? "⏹ Stop" : "🎤 Speak"}</button>}
              {busy && <button className="btn !min-h-9 text-sm" onClick={() => abort.current?.abort()}>Stop</button>}
              <span className="ms-auto text-xs text-muted">{left !== null ? `${left} AI question(s) left today` : ""}</span>
            </div>
            <p className="text-xs text-muted">The tutor can make mistakes. Check important answers with your lesson or instructor. Chats are saved only on this device.</p>
          </div>
        </>
      )}
    </section>
  );
}
