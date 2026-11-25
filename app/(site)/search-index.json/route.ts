import { allTopics } from "@/lib/content";
import { getSiteState } from "@/lib/server/store";
import { topicAccess } from "@/lib/gate-logic";

export const dynamic = "force-dynamic";

// Search index of UNLOCKED lessons only (locked lesson text must never leave the server).
export async function GET() {
  const state = await getSiteState();
  const now = new Date();
  const docs = allTopics()
    .filter((t) => topicAccess(state, t.week, t.slug, now).allowed)
    .map((t) => ({
      id: `${t.week}/${t.slug}`, week: t.week, slug: t.slug, title: t.title, goal: t.goal,
      text: [t.definition, t.warmup, t.howItWorks, ...t.romanSummary, ...t.examTips, ...t.sources, ...t.mistakes.map((m) => m.wrong + " " + m.error)].join(" "),
    }));
  return Response.json(docs, { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "s-maxage=10, stale-while-revalidate=30" } });
}
