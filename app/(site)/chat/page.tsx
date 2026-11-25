import type { Metadata } from "next";
import { allTopics } from "@/lib/content";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { ChatPage } from "@/components/tutor/ChatPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Chat", description: "Ask the CC111 tutor anything about C++: step-by-step answers in English, Roman Urdu or Urdu, with runnable code." };

export default async function Chat({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const state = await getSiteState();
  const now = new Date();
  // Only an open lesson can be pinned, so a locked lesson's title never leaks through this page.
  const t = topic ? allTopics().find((x) => `w${x.week}/${x.slug}` === topic && topicAccess(state, x.week, x.slug, now).allowed) : undefined;
  return (
    <div className="grid gap-3">
      <h1 className="text-3xl font-bold sm:text-4xl">💬 <span className="gradient-text">AI Chat</span></h1>
      <ChatPage initial={t ? { topic: `${t.title} (Week ${t.week})`, topicKey: `w${t.week}/${t.slug}` } : undefined} />
    </div>
  );
}
