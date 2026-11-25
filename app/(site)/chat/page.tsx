import type { Metadata } from "next";
import { CHAPTERS, MODULES } from "@/lib/course";
import { getTopics } from "@/lib/content";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { ChatPage } from "@/components/tutor/ChatPage";
import type { ModuleNav } from "@/components/tutor/ChatApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Chat", description: "Ask the CC111 tutor anything about C++: step-by-step answers in English, Roman Urdu or Urdu, with runnable code." };

export default async function Chat({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const state = await getSiteState();
  const now = new Date();
  // Only open lessons are listed or can be pinned, so a locked lesson's title never leaks through this page.
  const modules: ModuleNav[] = MODULES.map((m) => ({
    id: m.id, title: m.title, icon: m.icon, hue: m.hue,
    lessons: m.weeks.flatMap((w) => getTopics(w).filter((t) => topicAccess(state, w, t.slug, now).allowed).map((t) => ({ key: `w${w}/${t.slug}`, title: t.title, week: w, href: `/week-${w}/${t.slug}` }))),
  })).filter((m) => m.lessons.length);
  void CHAPTERS;
  const pinned = topic && modules.some((m) => m.lessons.some((l) => l.key === topic)) ? topic : undefined;
  return <ChatPage initial={pinned ? { topicKey: pinned } : undefined} modules={modules} />;
}
