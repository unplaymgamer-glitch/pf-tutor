/// <reference lib="webworker" />
// Tier 2 "Basic mode": tiny C++ interpreter (JSCPP) in a Web Worker so an endless loop can never freeze the page.
import JSCPP from "JSCPP";

type In = { id: number; source: string; stdin: string; maxMs: number };
const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

self.onmessage = (ev: MessageEvent<In>) => {
  const { id, source, stdin, maxMs } = ev.data;
  let size = 0;
  try {
    const exitCode = JSCPP.run(source, stdin, {
      maxTimeout: maxMs,
      stdio: {
        write: (s: string) => {
          size += s.length;
          if (size > 200_000) throw new Error("OUTPUT_LIMIT");
          post({ type: "out", id, fd: 1, text: s });
        },
      },
    });
    post({ type: "done", id, exitCode });
  } catch (e) {
    post({ type: "done", id, exitCode: -1, error: String((e as Error)?.message ?? e) });
  }
};
