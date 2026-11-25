"use client";
import Link from "next/link";
import { useProgress } from "../useProgress";

export type MindTopic = { slug: string; title: string };

function wrap(text: string, max = 30, lines = 2): string[] {
  const out: string[] = []; let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur + " " + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) { const kept = out.slice(0, lines); kept[lines - 1] = kept[lines - 1].replace(/\s*\S*$/, "") + "…"; return kept; }
  return out;
}

/** Animated mind map of a week: the week in the middle, its lessons as clickable branches. Colours come from the week accent. */
export function WeekMindMap({ week, title, icon, topics }: { week: number; title: string; icon: string; topics: MindTopic[] }) {
  const { progress } = useProgress();
  const n = topics.length;
  const rows = Math.ceil(n / 2);
  const H = Math.max(230, rows * 70 + 30), W = 900, cx = W / 2, cy = H / 2;
  const left = topics.slice(0, rows), right = topics.slice(rows);
  const place = (list: MindTopic[], side: "L" | "R") => list.map((t, i) => {
    const y = 15 + (i + 0.5) * ((H - 30) / list.length) - 27;
    return { t, x: side === "L" ? 14 : W - 14 - 290, y, side, idx: side === "L" ? i : rows + i };
  });
  const nodes = [...place(left, "L"), ...place(right, "R")];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Mind map of week ${week}: ${title}. Each branch is a lesson link.`} className="w-full" style={{ maxHeight: 460 }}>
      {nodes.map(({ t, x, y, side, idx }) => {
        const sx = side === "L" ? x + 290 : x, sy = y + 27, ex = side === "L" ? cx - 105 : cx + 105, ey = cy;
        const mid = (sx + ex) / 2;
        return <path key={`l${t.slug}`} className="mm-line" d={`M${sx},${sy} C${mid},${sy} ${mid},${ey} ${ex},${ey}`} fill="none" stroke="var(--wk)" strokeWidth="2" strokeOpacity="0.55" style={{ animationDelay: `${idx * 60}ms` }} />;
      })}
      <g>
        <rect x={cx - 105} y={cy - 38} width="210" height="76" rx="18" fill="var(--wk-soft)" stroke="var(--wk)" strokeWidth="2.5" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" aria-hidden>{icon}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--wk)">Week {week}</text>
        {wrap(title, 24, 1).map((l, i) => <text key={i} x={cx} y={cy + 32} textAnchor="middle" fontSize="11" fill="var(--text)">{l}</text>)}
      </g>
      {nodes.map(({ t, x, y, idx }) => {
        const done = !!progress.topics[`w${week}/${t.slug}`]?.done;
        const ls = wrap(t.title.replace(/:.*$/, "") || t.title, 34, 2);
        return (
          <Link key={t.slug} href={`/week-${week}/${t.slug}`}>
            <g className="mm-node" style={{ animationDelay: `${idx * 60 + 150}ms`, cursor: "pointer" }}>
              <title>{t.title}</title>
              <rect x={x} y={y} width="290" height="54" rx="14" fill="var(--surface)" stroke="var(--wk)" strokeWidth="1.6" />
              <rect x={x} y={y} width="6" height="54" rx="3" fill="var(--wk)" />
              <text x={x + 20} y={y + (ls.length > 1 ? 22 : 31)} fontSize="12.5" fontWeight="600" fill="var(--text)">
                <tspan>{idx + 1}. {ls[0]}</tspan>
                {ls[1] && <tspan x={x + 20} dy="16">{ls[1]}</tspan>}
              </text>
              {done && <text x={x + 268} y={y + 33} textAnchor="end" fontSize="16" fill="var(--success)" aria-label="completed">✓</text>}
            </g>
          </Link>
        );
      })}
    </svg>
  );
}
