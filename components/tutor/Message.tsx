"use client";
import Link from "next/link";
import { CodeBlock } from "../topic/CodeBlock";

// Renders tutor text safely: plain text, **bold**, `inline code`, fenced code blocks, headings, lists, tables and internal lesson links.
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

export type Block =
  | { k: "h"; level: number; text: string }
  | { k: "ul"; items: string[] }
  | { k: "ol"; items: string[] }
  | { k: "table"; head: string[]; rows: string[][] }
  | { k: "p"; text: string };

const ROW = /^\s*\|.+\|\s*$/;
const RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const BULLET = /^\s*[-*•]\s+(.+)$/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+(.+)$/;
const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/** Turns the tutor's text into simple blocks: headings, bullet and numbered lists, tables and paragraphs. Pure and tested. */
export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push({ k: "p", text: para.join("\n") }); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m: RegExpExecArray | null;
    if (!l.trim()) { flush(); continue; }
    if ((m = /^(#{1,4})\s+(.+)$/.exec(l))) { flush(); out.push({ k: "h", level: m[1].length, text: m[2] }); continue; }
    if (ROW.test(l) && RULE.test(lines[i + 1] ?? "")) {
      flush();
      const head = cells(l); const rows: string[][] = []; i += 2;
      while (i < lines.length && ROW.test(lines[i])) rows.push(cells(lines[i++]));
      i--; out.push({ k: "table", head, rows }); continue;
    }
    if ((m = BULLET.exec(l))) {
      flush(); const items = [m[1]];
      while (i + 1 < lines.length && (m = BULLET.exec(lines[i + 1]))) { items.push(m[1]); i++; }
      out.push({ k: "ul", items }); continue;
    }
    if ((m = NUMBERED.exec(l))) {
      flush(); const items = [m[1]];
      while (i + 1 < lines.length && (m = NUMBERED.exec(lines[i + 1]))) { items.push(m[1]); i++; }
      out.push({ k: "ol", items }); continue;
    }
    para.push(l);
  }
  flush();
  return out;
}

function Blocks({ text }: { text: string }) {
  return (
    <>
      {parseBlocks(text).map((b, i) => {
        if (b.k === "h") return <p key={i} className={`font-semibold ${b.level <= 2 ? "text-lg" : "text-base"}`}><Inline text={b.text} /></p>;
        if (b.k === "ul") return <ul key={i} className="ms-5 grid list-disc gap-1">{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ul>;
        if (b.k === "ol") return <ol key={i} className="ms-5 grid list-decimal gap-1">{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ol>;
        if (b.k === "table") return (
          <div key={i} className="overflow-x-auto"><table className="w-full border-collapse text-sm">
            <thead><tr>{b.head.map((h, j) => <th key={j} className="border border-border bg-surface2 px-2 py-1 text-start"><Inline text={h} /></th>)}</tr></thead>
            <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border border-border px-2 py-1"><Inline text={c} /></td>)}</tr>)}</tbody>
          </table></div>
        );
        return <p key={i} className="whitespace-pre-wrap"><Inline text={b.text} /></p>;
      })}
    </>
  );
}

export function Message({ text, streaming }: { text: string; streaming?: boolean }) {
  const parts = splitFences(text);
  return (
    <div className="grid gap-2">
      {parts.map((p, i) => p.kind === "code" ? (
        <CodeBlock key={i} code={p.code} label="code from the tutor" tryIt={{ stdin: "" }} />
      ) : (
        <Blocks key={i} text={p.text.trim()} />
      ))}
      {streaming && <span className="text-muted" aria-hidden>▍</span>}
    </div>
  );
}
