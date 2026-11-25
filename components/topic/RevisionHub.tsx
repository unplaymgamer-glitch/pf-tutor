import Link from "next/link";
import { chapterByWeek } from "@/lib/course";
import type { Topic } from "@/lib/content-schema";

export type HubWeek = { week: number; topics: Topic[] };

/** Printable revision sheet: per lesson the one-line goal, syntax, quick summary, classic mistakes and exam tips. Pure server component. */
export function RevisionHub({ title, intro, weeks, backHref }: { title: string; intro: string; weeks: HubWeek[]; backHref: string }) {
  const total = weeks.reduce((n, w) => n + w.topics.length, 0);
  return (
    <div className="grid gap-6 revision-hub">
      <p className="flex items-center gap-x-2 text-sm text-muted print:hidden"><Link className="inline-flex min-h-11 items-center" href={backHref}>Home</Link> / Revision</p>
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted">{intro}</p>
        <p className="text-sm text-muted">{total} lessons · tip: use your browser&apos;s Print → Save as PDF to keep a copy.</p>
        <nav aria-label="Jump to week" className="flex flex-wrap gap-2 print:hidden">
          {weeks.filter((w) => w.topics.length > 0).map((w) => (
            <a key={w.week} className="btn" href={`#week-${w.week}`}>Week {w.week}</a>
          ))}
          <Link className="btn btn-primary" href="/mock">Take a mock exam</Link>
        </nav>
      </header>
      {total === 0 && <p className="box box-definition">No unlocked lessons yet. Revision sheets appear here as your instructor opens each week.</p>}
      {weeks.filter((w) => w.topics.length > 0).map((w) => {
        const c = chapterByWeek(w.week);
        return (
          <section key={w.week} id={`week-${w.week}`} aria-labelledby={`h-week-${w.week}`} className="grid gap-3">
            <h2 id={`h-week-${w.week}`} className="text-2xl font-semibold">Week {w.week}{c ? `: ${c.title}` : ""}</h2>
            {w.topics.map((t) => (
              <article key={t.slug} className="box grid gap-2 break-inside-avoid">
                <h3 className="text-lg font-semibold"><Link href={`/week-${w.week}/${t.slug}`}>{t.title}</Link></h3>
                <p><strong>Goal:</strong> {t.goal}</p>
                {t.syntax.trim() && <pre tabIndex={0} className="code" dir="ltr">{t.syntax}</pre>}
                <ul className="list-disc ps-5">
                  {t.romanSummary.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                {t.mistakes.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold">Classic mistakes</div>
                    <ul className="list-disc ps-5 text-sm">
                      {t.mistakes.slice(0, 2).map((m, i) => <li key={i}><code dir="ltr">{m.wrong}</code> → <code dir="ltr">{m.right}</code></li>)}
                    </ul>
                  </div>
                )}
                {t.examTips.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold">Exam tips</div>
                    <ul className="list-disc ps-5 text-sm">{t.examTips.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                )}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
