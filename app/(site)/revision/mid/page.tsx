import type { Metadata } from "next";
import { getTopics } from "@/lib/content";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { RevisionHub } from "@/components/topic/RevisionHub";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mid-Term Revision Hub", description: "Weeks 1-8 on a few pages: syntax, summaries, classic mistakes and exam tips. Printable." };

export default async function MidRevisionPage() {
  const state = await getSiteState();
  const now = new Date();
  // Only lessons the student may open are included; locked content never leaves the server.
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1).map((week) => ({
    week,
    topics: getTopics(week).filter((t) => topicAccess(state, week, t.slug, now).allowed),
  }));
  return (
    <RevisionHub
      title="Mid-Term Revision Hub (Weeks 1-8)"
      intro="Everything from the first half of CC111 on one page: what each topic is for, the syntax to remember, the usual mistakes and what examiners like to ask."
      weeks={weeks}
      backHref="/"
    />
  );
}
