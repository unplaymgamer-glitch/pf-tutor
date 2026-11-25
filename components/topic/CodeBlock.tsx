"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { encodeSnippet } from "@/lib/runner/share";

export function CodeBlock({ code, highlight, label, tryIt }: { code: string; highlight?: number; label?: string; tryIt?: { stdin: string } }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  async function openInPlayground() {
    const h = await encodeSnippet({ code, stdin: tryIt?.stdin ?? "" });
    router.push(`/playground#s=${h}`);
  }
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex gap-2">
        {tryIt && (
          <button className="btn !min-h-9 text-sm" onClick={openInPlayground} aria-label={`Try it: run ${label ?? "this code"} in the Playground`}>▶ Try it</button>
        )}
        <button
          className="btn !min-h-9 text-sm"
          onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}
          aria-label={`${copied ? "Copied" : "Copy"}: ${label ?? "code"}`}
        >{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre tabIndex={0} role="group" className="code" dir="ltr" aria-label={label ?? "C++ code"}>
        {lines.map((l, i) => (
          <div key={i} className={highlight === i + 1 ? "bg-primary/20 -mx-3 px-3" : "-mx-3 px-3"} data-line={i + 1}>
            <span className="inline-block w-7 select-none text-muted">{i + 1}</span>{l || " "}
          </div>
        ))}
      </pre>
    </div>
  );
}
