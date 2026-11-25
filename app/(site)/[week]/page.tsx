import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chapterByWeek, weekFromSlug } from "@/lib/course";
import { getTopics } from "@/lib/content";
import { WEEK_HUES, WEEK_ICONS } from "@/lib/course";
import { WeekMindMap } from "@/components/home/WeekMindMap";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { ProgressBadge } from "@/components/topic/ProgressBadge";
import { Locked } from "@/components/topic/Locked";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[week]">): Promise<Metadata> {
  const w = weekFromSlug((await params).week);
  const c = w ? chapterByWeek(w) : undefined;
  return c ? { title: `Week ${c.week}: ${c.title}`, description: c.summary } : {};
}

export default async function ChapterPage({ params }: PageProps<"/[week]">) {
  const w = weekFromSlug((await params).week);
  const c = w ? chapterByWeek(w) : undefined;
  if (!w || !c) notFound();

  const state = await getSiteState();
  const now = new Date();
  const weekAccess = topicAccess(state, w, null, now);
  const topics = getTopics(w).filter((t) => topicAccess(state, w, t.slug, now).allowed);
  // A locked chapter shows only its title; no lesson titles or content leave the server.
  if (!weekAccess.allowed && topics.length === 0) return <Locked reason={weekAccess.reason} week={w} chapterTitle={c.title} />;
  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-x-2 text-sm text-muted"><Link className="inline-flex min-h-11 items-center" href="/">Home</Link> / Week {c.week}</p>
      <h1 className="flex items-center gap-3 text-3xl font-semibold"><span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: "color-mix(in srgb, hsl(var(--wk-h) 80% 55%) 20%, transparent)" }}>{WEEK_ICONS[c.week - 1]}</span>Week {c.week}: {c.title}</h1>
      <p className="text-muted">{c.summary}{c.assessment ? ` · ${c.assessment}` : ""}</p>
      {topics.length > 0 && (
        <div className="wk card hidden sm:block" style={{ ["--wk-h" as string]: WEEK_HUES[w - 1] }}>
          <WeekMindMap week={w} title={c.title} icon={WEEK_ICONS[w - 1]} topics={topics.map((t) => ({ slug: t.slug, title: t.title }))} />
        </div>
      )}
      {topics.length === 0 ? (
        <p className="box box-definition">Lessons for this week are coming soon.</p>
      ) : (
        <ol className="wk grid gap-2" style={{ ["--wk-h" as string]: WEEK_HUES[w - 1] }}>
          {topics.map((t, i) => (
            <li key={t.slug}>
              <Link className="box flex min-h-11 items-center justify-between gap-3 no-underline" href={`/week-${w}/${t.slug}`}>
                <span className="flex items-center gap-3"><span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: "color-mix(in srgb, hsl(var(--wk-h) 80% 55%) 20%, transparent)" }}>{WEEK_ICONS[w - 1]}</span><span><span className="text-muted">{i + 1}.</span> {t.title}</span></span>
                <ProgressBadge k={`w${w}/${t.slug}`} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
