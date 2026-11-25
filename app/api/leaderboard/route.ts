import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey } from "@/lib/server/admin-auth";
import { getSiteState, getStore } from "@/lib/server/store";
import { AVATARS, clampXp, isDeviceId, validateNickname } from "@/lib/game/leaderboard";
import { isoWeekIdUTC } from "@/lib/game/dates";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const Body = z.object({
  deviceId: z.string().regex(/^[a-f0-9]{32}$/),
  nickname: z.string().min(1).max(40),
  avatar: z.enum(AVATARS),
  xpWeek: z.number().int().min(0).max(1_000_000),
});

/** Public weekly board: top 20 + the caller's own rank. Nothing but nickname, avatar and weekly XP is ever returned. */
export async function GET(req: Request) {
  const state = await getSiteState();
  if (state.maintenance || !state.features.leaderboard) return NextResponse.json({ enabled: false }, { headers: noStore });
  const store = getStore();
  const weekId = isoWeekIdUTC(new Date());
  try {
    const deviceId = new URL(req.url).searchParams.get("deviceId");
    const top = await store.lbTop(weekId, 20);
    let me: { rank: number; xp: number; nickname: string } | null = null;
    if (isDeviceId(deviceId)) {
      const row = await store.lbGet(deviceId);
      if (row && row.week_id === weekId && !row.hidden) me = { rank: (await store.lbCountAbove(weekId, row.xp_week)) + 1, xp: row.xp_week, nickname: row.nickname };
    }
    return NextResponse.json({ enabled: true, weekId, top: top.map((r, i) => ({ rank: i + 1, nickname: r.nickname, avatar: r.avatar, xp: r.xp_week })), me }, { headers: noStore });
  } catch {
    return NextResponse.json({ enabled: true, weekId, top: [], me: null, error: true }, { headers: noStore });
  }
}

/** Join / update. Validated, rate limited, plausibility-capped. */
export async function POST(req: Request) {
  const state = await getSiteState();
  if (!state.features.leaderboard) return NextResponse.json({ error: "The leaderboard is switched off." }, { status: 403, headers: noStore });
  if (Number(req.headers.get("content-length") ?? 0) > 1000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", fields: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400, headers: noStore });
  const b = parsed.data;
  const store = getStore();
  const ck = clientKey(req);
  try {
    if ((await store.incr("rl-lb", ck)) > 120 || (await store.incr("rl-lb-dev", b.deviceId)) > 120) return NextResponse.json({ error: "Too many updates today." }, { status: 429, headers: noStore });
    const nick = validateNickname(b.nickname, await store.getBannedWords());
    if (!nick.ok) return NextResponse.json({ error: nick.reason }, { status: 422, headers: noStore });
    const weekId = isoWeekIdUTC(new Date());
    const existing = await store.lbGet(b.deviceId);
    // A moderator-hidden entry stays hidden and keeps its (possibly moderator-set) name; students cannot undo moderation.
    const prevXp = existing && existing.week_id === weekId ? existing.xp_week : 0;
    const row = {
      device_id: b.deviceId, week_id: weekId, avatar: b.avatar,
      nickname: existing?.hidden ? existing.nickname : nick.nickname,
      hidden: existing?.hidden ?? false,
      xp_week: clampXp(prevXp, b.xpWeek),
      updated_at: new Date().toISOString(),
    };
    await store.lbUpsert(row);
    return NextResponse.json({ ok: true, xp: row.xp_week, hidden: row.hidden }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Could not save right now." }, { status: 503, headers: noStore });
  }
}

/** Leave the leaderboard: deletes the student's row. */
export async function DELETE(req: Request) {
  const parsed = z.object({ deviceId: z.string().regex(/^[a-f0-9]{32}$/) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400, headers: noStore });
  try { await getStore().lbDelete(parsed.data.deviceId); } catch { /* ignore */ }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
