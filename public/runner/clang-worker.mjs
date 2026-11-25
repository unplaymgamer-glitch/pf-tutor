// Web Worker (module) for the full in-browser C++ compiler. See clang-core.mjs for licensing notes.
// Messages in:  {type:"init"} | {type:"run", id, source, stdin, maxOutput}
// Messages out: {type:"progress", text, loaded?, total?} | {type:"ready"} | {type:"init-error", message}
//               {type:"out", id, fd, text} | {type:"built", id, ok, diagnostics} | {type:"done", id, exitCode, trap?, truncated}
import { ClangRunner, sha256Hex } from "./clang-core.mjs";
import { fetchVerified } from "./verified-fetch.mjs";

let runner = null;
let initPromise = null;

async function download(name, spec, manifest) {
  const cache = await caches.open(manifest.cacheName);
  return fetchVerified(name, spec, {
    cache, sha256Hex, fetchFn: (u, o) => fetch(u, o),
    key: new Request(new URL(`./cache/${spec.sha256}`, import.meta.url).href),
    onProgress: (p) => self.postMessage({ type: "progress", ...p }),
  });
}

async function init() {
  const manifest = await (await fetch(new URL("./runner-manifest.json", import.meta.url))).json();
  const files = {};
  for (const name of ["memfs", "sysroot", "lld", "clang"]) files[name] = await download(name, manifest.files[name], manifest);
  runner = new ClangRunner({ files });
  await runner.init((text) => self.postMessage({ type: "progress", text }));
}

self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.type === "init") {
    initPromise ??= init().then(() => self.postMessage({ type: "ready" })).catch((e) => { initPromise = null; self.postMessage({ type: "init-error", message: String(e && e.message || e) }); });
    return;
  }
  if (m.type === "run") {
    try {
      await initPromise;
      if (!runner) throw new Error("compiler not ready");
      const built = await runner.build(m.source);
      self.postMessage({ type: "built", id: m.id, ok: built.ok, diagnostics: built.diagnostics });
      if (!built.ok) { self.postMessage({ type: "done", id: m.id, exitCode: 1, compileError: true }); return; }
      const r = await runner.runProgram(built.wasm, m.stdin, (fd, text) => self.postMessage({ type: "out", id: m.id, fd, text }), m.maxOutput);
      self.postMessage({ type: "done", id: m.id, exitCode: r.exitCode, trap: r.trap, truncated: r.truncated });
    } catch (e) {
      self.postMessage({ type: "done", id: m.id, exitCode: -4, trap: String(e && e.message || e) });
    }
  }
};
