"use client";
import Link from "next/link";
import { CodeBlock } from "../topic/CodeBlock";

// Renders tutor text safely: only plain text, **bold**, `inline code`, fenced code blocks and internal lesson links.
// No HTML is ever injected, so nothing the model (or a pasted file) says can run script.
type Part = { kind: "text"; text: string } | { kind: "code"; code: string };

export function splitFences(src: string): Part[] {
  const out: Part[] = [];
  const re = /```[a-zA-Z+]*\n?([\s\S]*?)```/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ kind: "text", text: src.slice(last, m.index) });
    out.push({ kind: "code", code: m[1].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  const tail = src.slice(last);
  // An unfinished fence while streaming: show what we have as code.
  const open = tail.indexOf("```");
  if (open >= 0) {
    if (open > 0) out.push({ kind: "text", text: tail.slice(0, open) });
    out.push({ kind: "code", code: tail.slice(open + 3).replace(/^[a-zA-Z+]*\n?/, "") });
  } else if (tail) out.push({ kind: "text", text: tail });
  return out;
}

function Inline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\/week-\d{1,2}(?:\/[a-z0-9-]+)?)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) nodes.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) nodes.push(<code key={k++} dir="ltr" className="rounded bg-surface2 px-1">{t.slice(1, -1)}</code>);
    else nodes.push(<Link key={k++} href={t}>{t}</Link>);
    last = m.index + t.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export function Message({ text, streaming }: { text: string; streaming?: boolean }) {
  const parts = splitFences(text);
  return (
    <div className="grid gap-2">
      {parts.map((p, i) => p.kind === "code" ? (
        <CodeBlock key={i} code={p.code} label="code from the tutor" tryIt={{ stdin: "" }} />
      ) : (
        <p key={i} className="whitespace-pre-wrap"><Inline text={p.text.trim()} /></p>
      ))}
      {streaming && <span className="text-muted" aria-hidden>▍</span>}
    </div>
  );
}
