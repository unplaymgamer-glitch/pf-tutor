import { NextResponse } from "next/server";
import { loadVisual } from "@/lib/visual-index";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// One visual for the Visual Lab. Obeys the same gating as the lesson pages: a locked lesson or the OFF switch returns nothing.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const week = Number(q.get("w")), slug = q.get("slug") ?? "", id = q.get("id") ?? "";
  if (!Number.isInteger(week) || week < 1 || week > 16 || !/^[a-z0-9-]{1,60}$/.test(slug) || !/^(v\d{1,3}|t:[a-z0-9-]{1,60})$/.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const state = await getSiteState();
  if (!topicAccess(state, week, slug, new Date()).allowed) return NextResponse.json({ error: "not available" }, { status: 404 });
  const found = loadVisual(week, slug, id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(found, { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
}
