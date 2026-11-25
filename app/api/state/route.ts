import { NextResponse } from "next/server";
import { getSiteState } from "@/lib/server/store";
import { publicState } from "@/lib/gate-logic";

export const dynamic = "force-dynamic";

// Public, non-sensitive site state (lock flags, taught flags, announcements). Edge-cached for a few seconds so a whole
// class opening the site at once costs one database read, while admin changes still appear within seconds.
export async function GET() {
  const state = await getSiteState();
  return NextResponse.json(publicState(state, new Date()), {
    // Browsers always revalidate (no stale copies); only Vercel's CDN keeps it for a few seconds.
    headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "s-maxage=10, stale-while-revalidate=30" },
  });
}
