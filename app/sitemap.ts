import type { MetadataRoute } from "next";
import { getTopics } from "@/lib/content";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// Only what a student can open right now is listed, so locked lesson titles/paths never leak through the sitemap.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const state = await getSiteState();
  const now = new Date();
  const stat: MetadataRoute.Sitemap = ["", "/playground", "/practice", "/mock", "/revision/mid", "/revision/final", "/privacy", "/how-to-study", "/faq", "/about"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const weeks: MetadataRoute.Sitemap = [];
  for (let w = 1; w <= 16; w++) {
    const open = getTopics(w).filter((t) => topicAccess(state, w, t.slug, now).allowed);
    if (!open.length) continue;
    weeks.push({ url: `${SITE_URL}/week-${w}`, changeFrequency: "weekly", priority: 0.8 });
    for (const t of open) weeks.push({ url: `${SITE_URL}/week-${w}/${t.slug}`, changeFrequency: "monthly", priority: 0.7 });
  }
  return [...stat, ...weeks];
}
