"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BasicRunner, FullRunner, Outcome, RUN_TIMEOUT_MS, fullSupported, isCached, totalDownloadMB } from "@/lib/runner/client";
import { Explained, explainCompilerOutput, explainRuntime } from "@/lib/runner/explain";
import { unsupportedInBasicMode } from "@/lib/runner/features";
import { decodeSnippet, encodeSnippet } from "@/lib/runner/share";
import { externalCompilerUrl } from "@/lib/runner/external";
import { TEMPLATES } from "@/lib/runner/templates";
import { useSettings } from "../SettingsProvider";
import { useSiteState } from "../SiteState";
import { useProgress } from "../useProgress";
import { useTutor } from "../tutor/TutorProvider";
import type { EditorHandle } from "./CodeEditor";

const CodeEditor = dynamic(() => import("./CodeEditor"), { ssr: false, loading: () => <div className="box" style={{ minHeight: "14rem" }}>Loading editor…</div> });

type Line = { fd: number; text: string };
type Status = { kind: "idle" } | { kind: "busy"; phase: string } | { kind: "done"; outcome: Outcome; mode: "full" | "basic" };
const PERMANENT_RUNNER = new FullRunner(); // one compiler per tab, shared between runs

export function Playground({ initialCode, initialStdin }: { initialCode?: string; initialStdin?: string }) {
  const { settings } = useSettings();
  const lang = settings.lang;
  const site = useSiteState();
  const { dispatch } = useProgress();
  const tutor = useTutor();
  const runnerOff = site?.features.runner === false;

  const start = TEMPLATES[0];
  const [code, setCode] = useState(initialCode ?? start.code);
  const [stdin, setStdin] = useState(initialStdin ?? start.stdin);
  const [original, setOriginal] = useState({ code: initialCode ?? start.code, stdin: initialStdin ?? start.stdin });
  const editor = useRef<EditorHandle | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fullState, setFullState] = useState<"off" | "downloading" | "ready" | "error">("off");
  const [progress, setProgress] = useState<{ text: string; pct: number | null }>({ text: "", pct: null });
  const [fullError, setFullError] = useState("");
  const [sizeMB, setSizeMB] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const basic = useRef(new BasicRunner());
  const [editorKey, setEditorKey] = useState(0);

  // Open a shared link (#s=...) once.
  useEffect(() => {
    if (!location.hash.startsWith("#s=")) return;
    void decodeSnippet(location.hash).then((s) => {
      if (!s) return;
      setCode(s.code); setStdin(s.stdin); setOriginal(s);
      editor.current?.setValue(s.code);
      setEditorKey((k) => k + 1);
    });
  }, []);

  const connectFull = useCallback(async () => {
    setFullState("downloading"); setFullError("");
    PERMANENT_RUNNER.onProgress = (text, pct) => setProgress({ text, pct });
    try { await PERMANENT_RUNNER.enable(); setFullState("ready"); }
    catch (e) { setFullState("error"); setFullError((e as Error).message); }
  }, []);

  // If the compiler is already stored on this device, start it silently (no download). Otherwise never download on its own.
  useEffect(() => {
    let off = false;
    void totalDownloadMB().then((n) => !off && setSizeMB(n)).catch(() => {});
    void isCached().then((c) => { if (c && !off) void connectFull(); });
    return () => { off = true; };
  }, [connectFull]);

  const unsupported = useMemo(() => unsupportedInBasicMode(code), [code]);
  // Browser-only facts: the server render (and first client render) assume "not supported / not mobile data" so markup matches.
  const noSubscribe = () => () => {};
  const supported = useSyncExternalStore(noSubscribe, fullSupported, () => false);
  const onMobileData = useSyncExternalStore(noSubscribe, () => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; type?: string; effectiveType?: string } }).connection;
    return !!c && (c.saveData === true || c.type === "cellular" || ["slow-2g", "2g", "3g"].includes(c.effectiveType ?? ""));
  }, () => false);

  async function run() {
    setNotice(""); setLines([]);
    const useFull = fullState === "ready";
    if (!useFull && unsupported.length > 0) {
      setStatus({ kind: "idle" });
      setNotice("needs-full");
      return;
    }
    setStatus({ kind: "busy", phase: useFull ? "Compiling…" : "Running…" });
    const sink = (fd: number, text: string) => setLines((l) => [...l, { fd, text }].slice(-2000));
    const onPhase = (p: "compiling" | "running") => setStatus({ kind: "busy", phase: p === "compiling" ? "Compiling…" : "Running…" });
    let outcome: Outcome;
    try {
      outcome = useFull ? await PERMANENT_RUNNER.run(code, stdin, { onOut: sink, onPhase }) : await basic.current.run(code, stdin, { onOut: sink, onPhase });
    } catch (e) {
      if (useFull) setFullState("off");
      outcome = { kind: "basic-error", message: (e as Error).message, ms: 0 };
    }
    setStatus({ kind: "done", outcome, mode: useFull ? "full" : "basic" });
    if (useFull && outcome.kind === "timeout") { setFullState("downloading"); void connectFull(); } // worker was killed: restart from cache
    if (outcome.kind === "ok" || outcome.kind === "runtime") dispatch({ type: "run" });
    try { void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "run" }), keepalive: true }); } catch { /* ignore */ }
  }

  const explained: Explained[] = useMemo(() => {
    if (status.kind !== "done") return [];
    const o = status.outcome;
    if (o.kind === "compile-error") return explainCompilerOutput(o.diagnostics, lang);
    if (o.kind === "ok" && status.mode === "full") return [];
    return [];
  }, [status, lang]);
  const warnings = useMemo(() => (status.kind === "done" && status.outcome.kind === "ok" ? [] : []), [status]);
  void warnings;

  const runtimeInfo = (() => {
    if (status.kind !== "done") return null;
    const o = status.outcome;
    if (o.kind === "timeout") return explainRuntime("timeout", undefined, lang);
    if (o.kind === "output-limit") return explainRuntime("output", undefined, lang);
    if (o.kind === "runtime") return explainRuntime(o.trap?.startsWith("unsupported feature") ? "unsupported" : "trap", o.trap, lang);
    return null;
  })();

  async function share() {
    const h = await encodeSnippet({ code, stdin });
    const url = `${location.origin}/playground#s=${h}`;
    try { await navigator.clipboard.writeText(url); setNotice("Link copied. Anyone with it can open your code."); } catch { setNotice(url); }
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setNotice("Code copied."); } catch { setNotice("Could not copy. Select the code and copy it manually."); }
  }
  async function openExternal() {
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
    window.open(externalCompilerUrl(code, stdin), "_blank", "noopener,noreferrer");
  }
  function loadTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    if (code !== original.code && !confirm("Replace your code with this template?")) return;
    setCode(t.code); setStdin(t.stdin); setOriginal({ code: t.code, stdin: t.stdin });
    editor.current?.setValue(t.code);
    setLines([]); setStatus({ kind: "idle" }); setNotice("");
  }
  function reset() { setCode(original.code); setStdin(original.stdin); editor.current?.setValue(original.code); setLines([]); setStatus({ kind: "idle" }); setNotice(""); }

  if (runnerOff) return <p className="box box-warning" role="status">Running code is switched off by your instructor right now.</p>;

  return (
    <div className="grid gap-4">
      <ModeBanner state={fullState} progress={progress} error={fullError} sizeMB={sizeMB} onMobileData={onMobileData} supported={supported} onEnable={connectFull} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Start from a template
          <select className="btn" defaultValue="" onChange={(e) => { loadTemplate(e.target.value); e.target.value = ""; }}>
            <option value="" disabled>Choose…</option>
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>Week {t.week}: {t.title}</option>)}
          </select>
        </label>
        <button className="btn btn-primary" onClick={run} disabled={status.kind === "busy"}>{status.kind === "busy" ? status.phase : "▶ Run"}</button>
        <button className="btn" onClick={reset}>Reset</button>
        <button className="btn" onClick={copyCode}>Copy</button>
        <button className="btn" onClick={share}>Share link</button>
      </div>

      <CodeEditor key={editorKey} initial={code} onChange={setCode} handleRef={editor} label="C++ code editor" />

      <label className="grid gap-1">
        <span className="text-sm">Program input (what cin reads, one value per line or separated by spaces)</span>
        <textarea className="btn !min-h-20 text-start font-mono" dir="ltr" rows={3} value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} />
      </label>

      {notice === "needs-full" && fullState === "ready" ? null : notice === "needs-full" ? (
        <div className="box box-mistake" role="alert">
          <strong>This program needs the full C++ compiler.</strong>
          <ul className="list-disc ps-6">{unsupported.map((u) => <li key={u.feature}><code>{u.feature}</code>: {u.why}</li>)}</ul>
          <div className="mt-2 flex flex-wrap gap-2">
            {supported && <button className="btn btn-primary" onClick={connectFull}>Enable full mode{sizeMB ? ` (one-time ${sizeMB} MB download)` : ""}</button>}
            <button className="btn" onClick={openExternal} title="Opens godbolt.org (Compiler Explorer). Your code is sent to their servers.">Open in an online compiler (sends code to godbolt.org)</button>
          </div>
        </div>
      ) : notice ? <p role="status" className="text-sm text-muted">{notice}</p> : null}

      <section aria-label="Output" aria-live="polite" className="grid gap-2">
        <h2 className="font-semibold">Output {status.kind === "done" && <span className="text-sm font-normal text-muted">({status.mode === "full" ? "full compiler" : "basic mode"}, {status.outcome.ms} ms)</span>}</h2>
        <pre tabIndex={0} className="code" dir="ltr" style={{ minHeight: "5rem" }}>{lines.length === 0 && status.kind !== "busy" ? <span className="text-muted">Output appears here.</span> : lines.filter((l) => l.fd !== 2).map((l, i) => <span key={i}>{l.text}</span>)}</pre>
        {lines.some((l) => l.fd === 2) && (<><h3 className="text-sm text-muted">Errors printed by your program (cerr)</h3><pre className="code box-error" dir="ltr">{lines.filter((l) => l.fd === 2).map((l) => l.text).join("")}</pre></>)}
        {status.kind === "done" && status.outcome.kind !== "ok" && (
          <button className="btn w-fit" onClick={() => tutor.open({ code, stdin, text: "Why did my program fail? Please explain simply and show me how to fix it.", diagnostics: status.outcome.kind === "compile-error" ? status.outcome.diagnostics : status.outcome.kind === "basic-error" ? status.outcome.message : status.outcome.kind === "runtime" ? status.outcome.trap : status.outcome.kind === "timeout" ? "The program ran longer than 8 seconds and was stopped." : "The program printed too much output and was stopped." })}>💬 Ask the tutor about this error</button>
        )}
        {status.kind === "done" && status.outcome.kind === "ok" && <p className="text-success">✓ Finished (exit code {status.outcome.exitCode}).</p>}
        {runtimeInfo && <div className="box box-error" role="alert"><strong>{runtimeInfo.title}</strong><p>{runtimeInfo.help}</p>{status.kind === "done" && status.outcome.kind === "timeout" && <p className="text-sm text-muted">Limit: {RUN_TIMEOUT_MS / 1000} seconds.</p>}</div>}
        {status.kind === "done" && status.outcome.kind === "basic-error" && (
          <div className="box box-error" role="alert"><strong>Basic mode could not run this program</strong><p className="whitespace-pre-wrap text-sm" dir="ltr">{status.outcome.message.slice(0, 400)}</p>
            <p>Basic mode supports simple C++ only. Try full mode for the real compiler messages.</p>
            {supported && fullState !== "ready" && <button className="btn btn-primary" onClick={connectFull}>Enable full mode{sizeMB ? ` (${sizeMB} MB)` : ""}</button>}</div>
        )}
        {explained.length > 0 && (
          <div className="grid gap-2" role="alert">
            <h3 className="font-semibold">What went wrong, in simple words</h3>
            {explained.map((e, i) => (
              <div key={i} className={`box ${e.severity === "error" ? "box-error" : "box-mistake"}`}>
                <strong>{e.severity === "error" ? "✗" : "⚠"} {e.title}</strong>
                {e.line && <button className="btn ms-2 !min-h-9" onClick={() => editor.current?.goToLine(e.line!)}>Go to line {e.line}</button>}
                <p>{e.help}</p>
                {e.fix && <pre tabIndex={0} className="code" dir="ltr">{e.fix}</pre>}
                <details><summary className="cursor-pointer text-sm text-muted">Original compiler message</summary><code dir="ltr" className="break-all">{e.raw}</code></details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ModeBanner(p: { state: "off" | "downloading" | "ready" | "error"; progress: { text: string; pct: number | null }; error: string; sizeMB: number | null; onMobileData: boolean; supported: boolean; onEnable: () => void }) {
  if (p.state === "ready") return <p className="box box-roman" role="status">✓ Full C++ mode is ready (works offline now). Real compiler, all course features.</p>;
  if (p.state === "downloading") {
    return (
      <div className="box box-definition" role="status">
        <strong>Getting the C++ compiler…</strong> <span className="text-sm text-muted">{p.progress.text}</span>
        <progress className="block w-full" max={100} value={p.progress.pct ?? undefined} aria-label="Download progress" />
        <span className="text-sm text-muted">{p.progress.pct !== null ? `${p.progress.pct}%` : "Preparing…"} — keep this page open. You only do this once.</span>
      </div>
    );
  }
  return (
    <div className="box box-definition grid gap-2">
      <p><strong>Basic mode is on.</strong> It runs simple programs (loops, arrays, functions without references) instantly. For strings, structures, pointers with new/delete, files and real compiler errors, enable full mode.</p>
      {p.state === "error" && <p className="text-error" role="alert">Could not enable full mode: {p.error}. You can try again, or use Basic mode.</p>}
      {p.supported ? (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={p.onEnable}>Enable Run Code (full mode){p.sizeMB ? ` — one-time ${p.sizeMB} MB download` : ""}</button>
          <span className="text-sm text-muted">{p.onMobileData ? "⚠ You seem to be on mobile data. Use Wi-Fi if you can." : "Use Wi-Fi. It is saved on this device afterwards."}</span>
        </div>
      ) : <p className="text-muted">Your browser cannot run full mode. Basic mode and the online compiler link still work.</p>}
    </div>
  );
}
