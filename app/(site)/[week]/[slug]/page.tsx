import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chapterByWeek, weekFromSlug } from "@/lib/course";
import { allTopics, getTopic, getTopics } from "@/lib/content";
import { topicAccess, redactForExamMode } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { TopicView } from "@/components/topic/TopicView";
import { Locked } from "@/components/topic/Locked";

// Rendered on the server for every request (cached at the edge for a few seconds, see next.config.ts) so that
// locked lessons are never baked into static HTML. A locked lesson's text is never sent to the browser.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[week]/[slug]">): Promise<Metadata> {
  const { week, slug } = await params;
  const w = weekFromSlug(week);
  const t = w ? getTopic(w, slug) : undefined;
  if (!t) return {};
  const state = await getSiteState();
  // Do not reveal the title/goal of a locked lesson in metadata either.
  if (!topicAccess(state, t.week, t.slug, new Date()).allowed) return { title: "Coming soon", robots: { index: false } };
  const path = `/week-${t.week}/${t.slug}`;
  return { title: `${t.title} (Week ${t.week})`, description: t.goal, alternates: { canonical: path }, openGraph: { type: "article", url: path, title: `${t.title} (Week ${t.week})`, description: t.goal } };
}

export default async function TopicPage({ params }: PageProps<"/[week]/[slug]">) {
  const { week, slug } = await params;
  const w = weekFromSlug(week);
  const exists = w ? getTopic(w, slug) : undefined;
  if (!w || !exists) notFound();

  const state = await getSiteState();
  const now = new Date();
  const access = topicAccess(state, w, slug, now);
  const ch = chapterByWeek(w);
  if (!access.allowed) return <Locked reason={access.reason} week={w} chapterTitle={ch?.title ?? ""} />;

  const topic = state.examMode ? redactForExamMode(exists) : exists;
  const flat = allTopics().filter((t) => topicAccess(state, t.week, t.slug, now).allowed);
  const idx = flat.findIndex((t) => t.week === w && t.slug === slug);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];
  const weekTopics: Record<number, string[]> = { [w]: getTopics(w).filter((t) => topicAccess(state, w, t.slug, now).allowed).map((t) => `w${w}/${t.slug}`) };
  const related = getTopics(w).filter((t) => t.slug !== slug && topicAccess(state, t.week, t.slug, now).allowed).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "LearningResource", name: topic.title, description: topic.goal, inLanguage: "en",
    learningResourceType: "lesson", educationalLevel: "Beginner", teaches: topic.title, isAccessibleForFree: true,
    isPartOf: { "@type": "Course", name: "CC111 Programming Fundamentals (C++)", provider: { "@type": "CollegeOrUniversity", name: "University of Management and Technology, Lahore" } },
  };
  return (
    <div className="grid gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted"><Link className="inline-flex min-h-11 items-center" href="/">Home</Link> / <Link className="inline-flex min-h-11 items-center" href={`/week-${w}`}>Week {w}{ch ? `: ${ch.title}` : ""}</Link></p>
      <TopicView topic={topic} weekTopics={weekTopics} nextHref={next ? `/week-${next.week}/${next.slug}` : undefined} />
      <nav aria-label="Previous and next lesson" className="grid gap-2 sm:grid-cols-2">
        {prev ? <Link className="btn flex items-center" href={`/week-${prev.week}/${prev.slug}`}>◀ {prev.title}</Link> : <span />}
        {next ? <Link className="btn btn-primary flex items-center justify-end" href={`/week-${next.week}/${next.slug}`}>{next.title} ▶</Link> : null}
      </nav>
      {related.length > 0 && (
        <aside className="box"><h2 className="font-semibold">Related topics</h2>
          <ul className="list-disc ps-6">{related.map((t) => <li key={t.slug}><Link className="inline-flex min-h-11 items-center" href={`/week-${t.week}/${t.slug}`}>{t.title}</Link></li>)}</ul>
        </aside>
      )}
    </div>
  );
}
