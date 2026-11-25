"use client";
// Browser-side runner controller. Two tiers: "full" (clang in WebAssembly, opt-in download) and "basic" (small interpreter).
// Every run happens in a Web Worker with a time limit; on timeout the worker is killed so the page never freezes.
export type Mode = "full" | "basic";
export type Outcome =
  | { kind: "ok"; exitCode: number; ms: number }
  | { kind: "compile-error"; diagnostics: string; ms: number }
  | { kind: "runtime"; exitCode: number; trap?: string; ms: number }
  | { kind: "timeout"; ms: number }
  | { kind: "output-limit"; ms: number }
  | { kind: "basic-error"; message: string; ms: number };
export type Handlers = { onOut: (fd: number, text: string) => void; onPhase?: (p: "compiling" | "running") => void };

const MANIFEST_URL = "/runner/runner-manifest.json";
export const RUN_TIMEOUT_MS = 8000;
const COMPILE_TIMEOUT_MS = 40000;
const MAX_OUTPUT = 200_000;
let nextId = 1;

type Manifest = { cacheName: string; files: Record<string, { bytes: number; sha256: string }> };
async function loadManifest(): Promise<Manifest> {
  return (await fetch(MANIFEST_URL)).json();
}

export const fullSupported = () =>
  typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof caches !== "undefined" && typeof crypto?.subtle !== "undefined";

/** True when the compiler files are already stored on this device (no download needed). */
export async function isCached(): Promise<boolean> {
  try {
    if (!fullSupported()) return false;
    const m = await loadManifest();
    const cache = await caches.open(m.cacheName);
    const hits = await Promise.all(Object.values(m.files).map((f) => cache.match(new URL(`/runner/cache/${f.sha256}`, location.origin).href)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}
export async function totalDownloadMB(): Promise<number> {
  const m = await loadManifest();
  return Math.round(Object.values(m.files).reduce((a, f) => a + f.bytes, 0) / 1e6);
}
export async function clearCachedCompiler(): Promise<void> {
  const m = await loadManifest();
  await caches.delete(m.cacheName);
}

export class FullRunner {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  onProgress: (text: string, pct: number | null) => void = () => {};

  /** Start (or reuse) the worker and download/verify/compile the compiler. Resolves when ready. */
  enable(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      let w: Worker;
      try {
        w = new Worker("/runner/clang-worker.mjs", { type: "module" });
      } catch (e) {
        this.readyPromise = null;
        reject(e);
        return;
      }
      this.worker = w;
      const sizes: Record<string, number> = {};
      const total = () => Object.values(sizes).reduce((a, b) => a + b, 0);
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.type === "progress") {
          if (m.file && m.total) {
            sizes[m.file] = m.loaded;
            this.onProgress(m.text, Math.min(99, Math.round((total() / 60_347_928) * 100)));
          } else this.onProgress(m.text, null);
        } else if (m.type === "ready") resolve();
        else if (m.type === "init-error") {
          this.kill();
          reject(new Error(m.message));
        }
      };
      w.onerror = (e) => {
        this.kill();
        reject(new Error(e.message || "worker failed"));
      };
      w.postMessage({ type: "init" });
    });
    return this.readyPromise;
  }
  kill() {
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
  }

  async run(source: string, stdin: string, h: Handlers): Promise<Outcome> {
    await this.enable();
    const w = this.worker!;
    const id = nextId++;
    const t0 = performance.now();
    return new Promise<Outcome>((resolve) => {
      h.onPhase?.("compiling");
      let timer: ReturnType<typeof setTimeout>;
      const finish = (o: Outcome) => {
        clearTimeout(timer);
        w.removeEventListener("message", onMsg);
        resolve(o);
      };
      const arm = (ms: number) =>
        setTimeout(() => {
          this.kill(); // the worker is stuck in the student's loop: terminate it (it restarts from cache on the next run)
          finish({ kind: "timeout", ms: Math.round(performance.now() - t0) });
        }, ms);
      timer = arm(COMPILE_TIMEOUT_MS);
      let diagnostics = "";
      const onMsg = (ev: MessageEvent) => {
        const m = ev.data;
        if (m.id !== id) return;
        if (m.type === "built") {
          diagnostics = m.diagnostics ?? "";
          if (m.ok) {
            h.onPhase?.("running");
            clearTimeout(timer);
            timer = arm(RUN_TIMEOUT_MS);
          }
        } else if (m.type === "out") h.onOut(m.fd, m.text);
        else if (m.type === "done") {
          const ms = Math.round(performance.now() - t0);
          if (m.compileError) finish({ kind: "compile-error", diagnostics, ms });
          else if (m.truncated) finish({ kind: "output-limit", ms });
          else if (m.exitCode < 0) finish({ kind: "runtime", exitCode: m.exitCode, trap: m.trap, ms });
          else finish({ kind: "ok", exitCode: m.exitCode, ms });
        }
      };
      w.addEventListener("message", onMsg);
      w.postMessage({ type: "run", id, source, stdin, maxOutput: MAX_OUTPUT });
    });
  }
}

export class BasicRunner {
  async run(source: string, stdin: string, h: Handlers): Promise<Outcome> {
    const w = new Worker(new URL("./basic.worker.ts", import.meta.url));
    const id = nextId++;
    const t0 = performance.now();
    h.onPhase?.("running");
    return new Promise<Outcome>((resolve) => {
      const done = (o: Outcome) => {
        clearTimeout(timer);
        w.terminate();
        resolve(o);
      };
      const timer = setTimeout(() => done({ kind: "timeout", ms: RUN_TIMEOUT_MS }), RUN_TIMEOUT_MS + 1500);
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.id !== id) return;
        if (m.type === "out") h.onOut(m.fd, m.text);
        else if (m.type === "done") {
          const ms = Math.round(performance.now() - t0);
          if (m.error === "OUTPUT_LIMIT") done({ kind: "output-limit", ms });
          else if (m.error && /Time limit exceeded/i.test(m.error)) done({ kind: "timeout", ms });
          else if (m.error) done({ kind: "basic-error", message: m.error, ms });
          else done({ kind: "ok", exitCode: m.exitCode, ms });
        }
      };
      w.onerror = (e) => done({ kind: "basic-error", message: e.message || "interpreter failed", ms: Math.round(performance.now() - t0) });
      w.postMessage({ id, source, stdin, maxMs: RUN_TIMEOUT_MS });
    });
  }
}
