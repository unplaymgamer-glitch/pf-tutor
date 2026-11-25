import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chapterByWeek, moduleOfWeek, weekFromSlug } from "@/lib/course";
import { allTopics, getTopic } from "@/lib/content";
import { redactForExamMode, topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { Locked } from "@/components/topic/Locked";
import { Workspace } from "@/components/workspace/Workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ week: string; slug: string }> }): Promise<Metadata> {
  const { week, slug } = await params;
  const w = weekFromSlug(week);
  const t = w ? getTopic(w, slug) : undefined;
  if (!t) return {};
  const state = await getSiteState();
  if (!topicAccess(state, t.week, t.slug, new Date()).allowed) return { title: "Coming soon", robots: { index: false } };
  return { title: `Workspace: ${t.title} (Week ${t.week})`, description: `Notes, an editable code sandbox with a step-by-step dry run, and a tutor for ${t.title}.`, robots: { index: false } };
}

export default async function WorkspacePage({ params }: { params: Promise<{ week: string; slug: string }> }) {
  const { week, slug } = await params;
  const w = weekFromSlug(week);
  const exists = w ? getTopic(w, slug) : undefined;
  if (!w || !exists) notFound();
  const state = await getSiteState();
  const now = new Date();
  const access = topicAccess(state, w, slug, now);
  if (!access.allowed) return <Locked reason={access.reason} week={w} chapterTitle={chapterByWeek(w)?.title ?? ""} />;
  // Exam mode removes answers server-side here exactly as on the lesson page.
  const topic = state.examMode ? redactForExamMode(exists) : exists;
  const flat = allTopics().filter((t) => topicAccess(state, t.week, t.slug, now).allowed);
  const i = flat.findIndex((t) => t.week === w && t.slug === slug);
  const href = (t?: (typeof flat)[number]) => (t ? `/week-${t.week}/${t.slug}/workspace` : undefined);
  const mod = moduleOfWeek(w);
  return <Workspace topic={topic} hue={mod?.hue ?? 200} label={`Module ${mod?.id ?? ""} · Week ${w}`} lessonHref={`/week-${w}/${slug}`} prevHref={href(flat[i - 1])} nextHref={href(flat[i + 1])} />;
}
