import type { Metadata } from "next";
import { getTopics } from "@/lib/content";
import { FINAL_LAST_WEEK } from "@/lib/course";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { RevisionHub } from "@/components/topic/RevisionHub";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Final Revision Hub", description: "All 16 weeks on a few pages: syntax, summaries, classic mistakes and exam tips. Printable." };

export default async function FinalRevisionPage() {
  const state = await getSiteState();
  const now = new Date();
  // Only lessons the student may open are included; locked content never leaves the server.
  const weeks = Array.from({ length: FINAL_LAST_WEEK }, (_, i) => i + 1).map((week) => ({
    week,
    topics: getTopics(week).filter((t) => topicAccess(state, week, t.slug, now).allowed),
  }));
  return (
    <RevisionHub
      title={`Final Revision Hub (Weeks 1-${FINAL_LAST_WEEK})`}
      intro="The whole course on one page: what each topic is for, the syntax to remember, the usual mistakes and what examiners like to ask. Weeks 1-8 are also on the Mid-Term hub."
      weeks={weeks}
      backHref="/"
    />
  );
}
