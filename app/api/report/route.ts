import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey } from "@/lib/server/admin-auth";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";
const Body = z.object({ where: z.string().max(120), message: z.string().max(300) });

// Privacy-safe client error log: a widget name and a short message, nothing else. Reviewed in the admin Health panel.
export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return new NextResponse(null, { status: 400 });
  const store = getStore();
  try {
    if ((await store.incr("rl-report", clientKey(req))) <= 20) await store.logClientError(p.data.where, p.data.message);
  } catch { /* ignore */ }
  return new NextResponse(null, { status: 204 });
}
