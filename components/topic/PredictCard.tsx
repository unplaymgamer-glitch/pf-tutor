"use client";
import { useState } from "react";
import type { CodeSample } from "@/lib/content-schema";
import { CodeBlock } from "./CodeBlock";

/** Predict first, then reveal: the strongest habit for learning to read code. The output shown is the real, verified output. */
export function PredictCard({ sample }: { sample: CodeSample }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="grid gap-3">
      <p>Read the code below. <strong>What will it print?</strong> Say it in your head (or write it down), then check.</p>
      {sample.stdin && <p className="text-sm text-muted">Program input: <code dir="ltr">{sample.stdin.trim().replace(/\n/g, " ⏎ ")}</code></p>}
      <CodeBlock code={sample.code} label={sample.title} tryIt={{ stdin: sample.stdin }} />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" aria-expanded={shown} onClick={() => setShown((v) => !v)}>{shown ? "Hide the output" : "👁 Show the output"}</button>
        <span className="text-sm text-muted">Then press &quot;Try it&quot; to run it yourself.</span>
      </div>
      {shown && (
        <div role="status"><div className="text-sm text-muted">Real output (checked by compiling and running this exact code)</div>
          <pre tabIndex={0} role="group" aria-label="Output" className="code" dir="ltr">{sample.expectedOutput || " "}</pre></div>
      )}
    </div>
  );
}
