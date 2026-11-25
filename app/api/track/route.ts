import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey } from "@/lib/server/admin-auth";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// Anonymous, aggregate-only analytics. No personal data: only counters keyed by lesson and device class.
const Body = z.discriminatedUnion("event", [
  z.object({ event: z.literal("view"), week: z.number().int().min(1).max(16), slug: z.string().regex(/^[a-z0-9-]{1,80}$/), mobile: z.boolean() }),
  z.object({ event: z.literal("quiz"), week: z.number().int().min(1).max(16), slug: z.string().regex(/^[a-z0-9-]{1,80}$/), right: z.number().int().min(0).max(50), total: z.number().int().min(1).max(50), missed: z.array(z.string().regex(/^[a-z0-9-]{1,20}$/)).max(50).default([]) }),
  z.object({ event: z.literal("run") }),
  z.object({ event: z.literal("chat"), week: z.number().int().min(1).max(16).optional() }),
]);
const DAILY_LIMIT = 400; // events per anonymous client per day

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 2000) return new NextResponse(null, { status: 413 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const store = getStore();
  try {
    if ((await store.incr("rl-track", clientKey(req))) > DAILY_LIMIT) return new NextResponse(null, { status: 429 });
    const e = parsed.data;
    if (e.event === "view") {
      await store.incr("view-week", `week-${e.week}`);
      await store.incr("view-topic", `${e.week}/${e.slug}`);
      await store.incr("device", e.mobile ? "mobile" : "desktop");
    } else if (e.event === "quiz") {
      const k = `${e.week}/${e.slug}`;
      await store.incr("quiz-attempts", k);
      // Score is stored as a 20%-wide bucket (0,20,40,60,80,100): enough for an average, and one write only.
      await store.incr("quiz-score", `${k}|${Math.min(100, Math.floor(((e.right / e.total) * 100) / 20) * 20)}`);
      for (const q of e.missed) await store.incr("quiz-missed", `${k}#${q}`);
    } else if (e.event === "run") await store.incr("code-run", "all");
    else await store.incr("chat-topic", e.week ? `week-${e.week}` : "general");
  } catch {
    /* analytics must never break the student's session */
  }
  return new NextResponse(null, { status: 204 });
}
