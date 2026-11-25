import type { Metadata } from "next";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { visualIndex } from "@/lib/visual-index";
import { VisualLab } from "@/components/visuals/VisualLab";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visual Lab", description: "Every animation, step-through and interactive demo of the course in one searchable gallery." };

export default async function VisualLabPage() {
  const state = await getSiteState();
  const now = new Date();
  const items = visualIndex().filter((v) => topicAccess(state, v.week, v.slug, now).allowed);
  return (
    <div className="grid gap-5">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">🎬 <span className="gradient-text">Visual Lab</span></h1>
        <p className="text-muted">{items.length} animations and step-throughs from all 16 weeks. Search, open one full screen, change the input and watch what happens.</p>
      </header>
      <VisualLab items={items} />
    </div>
  );
}
