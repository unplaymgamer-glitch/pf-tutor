import { NextResponse } from "next/server";
import { z } from "zod";
import { allTopics } from "@/lib/content";
import { adminConfigured, clientKey, currentSession, endSession, requireAdmin, startSession, verifyCredentials } from "@/lib/server/admin-auth";
import { originOk } from "@/lib/server/session";
import { getStore, invalidateSiteState } from "@/lib/server/store";
import { afterFailure, afterSuccess, isLocked, progressiveDelayMs } from "@/lib/lockout";
import { SITE_NAME } from "@/lib/site";
import { isoWeekIdUTC } from "@/lib/game/dates";
import { sanitizeTutorSettings } from "@/lib/tutor/settings";
import { monthKey, microsToUSD } from "@/lib/tutor/pricing";
import { anthropicConfigured } from "@/lib/server/tutor-anthropic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };
const json = (data: unknown, status = 200, extra: HeadersInit = {}) => NextResponse.json(data, { status, headers: { ...noStore, ...extra } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const iso = z.string().datetime({ offset: true }).nullable();

const Login = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) });
const WeekBody = z.object({ week: z.number().int().min(1).max(16), locked: z.boolean().optional(), unlock_at: iso.optional(), taught: z.boolean().optional() });
const TopicBody = z.object({ week: z.number().int().min(1).max(16), slug: z.string().regex(/^[a-z0-9-]+$/).max(80), locked: z.boolean().nullable().optional(), unlock_at: iso.optional(), taught: z.boolean().optional() });
const SettingBody = z.discriminatedUnion("key", [
  z.object({ key: z.literal("maintenance"), value: z.boolean() }),
  z.object({ key: z.literal("examMode"), value: z.boolean() }),
  z.object({ key: z.literal("features"), value: z.object({ leaderboard: z.boolean(), voice: z.boolean(), upload: z.boolean(), runner: z.boolean(), threeD: z.boolean() }) }),
]);
const TutorBody = z.object({ enabled: z.boolean(), monthlyBudgetUSD: z.number().min(0).max(1000), dailyPerDevice: z.number().int().min(0).max(200), maxDeepPerDay: z.number().int().min(0).max(100), hintFirst: z.boolean(), tier0Threshold: z.number().min(0.3).max(1) });
const DeviceBody = z.object({ deviceId: z.string().regex(/^[a-f0-9]{32}$/) });
const AnnBody = z.object({ text: z.string().trim().min(1).max(300), starts_at: z.string().datetime({ offset: true }).optional(), ends_at: iso.optional() });

async function body<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | NextResponse> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 20_000) return json({ error: "Request too large" }, 413);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  return parsed.success ? parsed.data : json({ error: "Invalid input", detail: parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message) }, 400);
}
const bad = (x: unknown): x is NextResponse => x instanceof NextResponse;

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const store = getStore();

  if (action === "login") {
    if (!adminConfigured()) return json({ error: "Admin is not configured on this server." }, 503);
    if (!originOk(req.headers.get("origin"), req.headers.get("host"))) return json({ error: "Bad origin" }, 403);
    const b = await body(req, Login);
    if (bad(b)) return b;
    const key = clientKey(req);
    const attempt = await store.getAttempt(key);
    const lock = isLocked(attempt, new Date());
    if (lock.locked) return json({ error: `Too many attempts. Try again in ${Math.ceil(lock.retryAfterS / 60)} minute(s).` }, 429, { "Retry-After": String(lock.retryAfterS) });
    // Global ceiling against distributed guessing: 60 failures per hour across all clients.
    const hour = new Date().toISOString().slice(0, 13);
    const ok = await verifyCredentials(b.username, b.password);
    if (!ok) {
      const next = afterFailure(attempt, new Date());
      await store.setAttempt(key, next);
      const globalFails = await store.incr("admin-fail-hour", hour);
      await store.audit("login_failed", { fails: next.fails });
      await sleep(progressiveDelayMs(next.fails));
      if (globalFails > 60) return json({ error: "Login temporarily disabled. Try again later." }, 429, { "Retry-After": "900" });
      return json({ error: "Wrong username or password." }, 401);
    }
    await store.setAttempt(key, afterSuccess());
    await store.audit("login");
    const res = json({ ok: true });
    startSession(res);
    return res;
  }

  const g = await requireAdmin(req, { mutate: true });
  if (bad(g)) return g;

  if (action === "logout") {
    await store.audit("logout");
    // Revoke on the server: every session created up to now stops working, not just this browser's cookie.
    await store.setSessionsValidAfter(Date.now());
    const res = json({ ok: true });
    endSession(res);
    return res;
  }

  let result: NextResponse | null = null;
  if (action === "week") {
    const b = await body(req, WeekBody); if (bad(b)) return b;
    const { week, ...patch } = b;
    await store.setWeek(week, patch);
    await store.audit("week_update", { week, ...patch });
    result = json({ ok: true });
  } else if (action === "topic") {
    const b = await body(req, TopicBody); if (bad(b)) return b;
    if (!allTopics().some((t) => t.week === b.week && t.slug === b.slug)) return json({ error: "Unknown topic" }, 404);
    const { week, slug, ...patch } = b;
    await store.setTopic(week, slug, patch as never);
    await store.audit("topic_update", { week, slug, ...patch });
    result = json({ ok: true });
  } else if (action === "setting") {
    const b = await body(req, SettingBody); if (bad(b)) return b;
    await store.setSetting(b.key, b.value);
    await store.audit("setting_update", { key: b.key, value: b.value });
    result = json({ ok: true });
  } else if (action === "announcement") {
    const b = await body(req, AnnBody); if (bad(b)) return b;
    const row = await store.addAnnouncement(b);
    await store.audit("announcement_add", { id: row.id, text: row.text });
    result = json({ ok: true, id: row.id });
  } else if (action === "tutor-settings") {
    const b = await body(req, TutorBody); if (bad(b)) return b;
    await store.setTutorSettings(sanitizeTutorSettings(b));
    await store.audit("tutor_settings_update", b);
    result = json({ ok: true });
  } else if (action === "ia-add") {
    const b = await body(req, z.object({ keywords: z.string().trim().min(3).max(200), answer: z.string().trim().min(3).max(2000) })); if (bad(b)) return b;
    const row = await store.addInstructorAnswer(b.keywords, b.answer);
    await store.audit("instructor_answer_add", { id: row.id, keywords: b.keywords });
    result = json({ ok: true, id: row.id });
  } else if (action === "ia-delete") {
    const b = await body(req, z.object({ id: z.string().uuid() })); if (bad(b)) return b;
    await store.deleteInstructorAnswer(b.id);
    await store.audit("instructor_answer_delete", b);
    result = json({ ok: true });
  } else if (action === "lb-hide") {
    const b = await body(req, DeviceBody.extend({ hidden: z.boolean() })); if (bad(b)) return b;
    await store.lbPatch(b.deviceId, { hidden: b.hidden });
    await store.audit("leaderboard_hide", b);
    result = json({ ok: true });
  } else if (action === "lb-rename") {
    const b = await body(req, DeviceBody.extend({ nickname: z.string().trim().min(2).max(16) })); if (bad(b)) return b;
    await store.lbPatch(b.deviceId, { nickname: b.nickname });
    await store.audit("leaderboard_rename", { deviceId: b.deviceId });
    result = json({ ok: true });
  } else if (action === "lb-delete") {
    const b = await body(req, DeviceBody); if (bad(b)) return b;
    await store.lbDelete(b.deviceId);
    await store.audit("leaderboard_delete", b);
    result = json({ ok: true });
  } else if (action === "lb-reset") {
    await store.lbResetWeek(isoWeekIdUTC(new Date()));
    await store.audit("leaderboard_reset", { week: isoWeekIdUTC(new Date()) });
    result = json({ ok: true });
  } else if (action === "lb-banned") {
    const b = await body(req, z.object({ words: z.array(z.string().trim().min(3).max(24)).max(100) })); if (bad(b)) return b;
    await store.setBannedWords([...new Set(b.words.map((w) => w.toLowerCase()))]);
    await store.audit("banned_words_update", { count: b.words.length });
    result = json({ ok: true });
  } else if (action === "announcement-delete") {
    const b = await body(req, z.object({ id: z.string().uuid() })); if (bad(b)) return b;
    await store.deleteAnnouncement(b.id);
    await store.audit("announcement_delete", { id: b.id });
    result = json({ ok: true });
  }
  if (!result) return json({ error: "Unknown action" }, 404);
  invalidateSiteState();
  return g.rotate(result);
}

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const g = await requireAdmin(req, { mutate: false });
  if (bad(g)) return g;
  const store = getStore();

  if (action === "state") {
    const [state, announcements] = await Promise.all([store.getState(), store.listAnnouncements()]);
    const topics = allTopics().map((t) => ({ week: t.week, slug: t.slug, title: t.title }));
    return g.rotate(json({ siteName: SITE_NAME, csrf: g.session.csrf, store: store.kind, state: { ...state, announcements }, topics }));
  }
  if (action === "tutor") {
    const rows = await store.counters(35);
    const month = monthKey(new Date());
    const day = new Date().toISOString().slice(0, 10);
    const sum = (kind: string, f: (r: { day: string; key: string }) => boolean = () => true) => rows.filter((r) => r.kind === kind && f(r)).reduce((n, r) => n + r.n, 0);
    const by = (kind: string) => Object.entries(rows.filter((r) => r.kind === kind).reduce<Record<string, number>>((m, r) => ({ ...m, [r.key]: (m[r.key] ?? 0) + r.n }), {})).sort((a, b) => b[1] - a[1]);
    return json({
      settings: await store.getTutorSettings(), providerConfigured: anthropicConfigured(), mock: process.env.TUTOR_PROVIDER === "mock",
      spendUSD: microsToUSD(sum("tutor-micros", (r) => r.key === month)), questionsToday: sum("tutor-q", (r) => r.day === day),
      models: by("tutor-model"), topics: by("tutor-topic").slice(0, 10), answers: await store.listInstructorAnswers(),
    });
  }
  if (action === "leaderboard") {
    const weekId = isoWeekIdUTC(new Date());
    return json({ weekId, rows: await store.lbListAll(weekId, 200), banned: await store.getBannedWords() });
  }
  if (action === "audit") return json({ rows: await store.listAudit(200) });
  if (action === "analytics") {
    const rows = await store.counters(30);
    return json({ rows });
  }
  if (action === "health") {
    const db = await store.ping();
    return json({
      db: { ...db, kind: store.kind },
      aiProvider: { configured: !!process.env.ANTHROPIC_API_KEY, note: "AI tutor arrives in Phase 6" },
      codeRunner: { note: "Runner arrives in Phase 4" },
      lastDeploy: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local",
      clientErrors: await store.recentClientErrors(20),
    });
  }
  if (action === "export") {
    const fmt = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
    const [state, audit, counters] = await Promise.all([store.getState(), store.listAudit(1000), store.counters(90)]);
    if (fmt === "csv") {
      const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = ["day,kind,key,count", ...counters.map((c) => [c.day, c.kind, c.key, c.n].map(esc).join(","))];
      return new NextResponse(lines.join("\n"), { headers: { ...noStore, "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=cc111-analytics.csv" } });
    }
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), state, audit, counters }, null, 2), {
      headers: { ...noStore, "Content-Type": "application/json", "Content-Disposition": "attachment; filename=cc111-backup.json" },
    });
  }
  if (action === "session") return json({ ok: !!(await currentSession()) });
  return json({ error: "Unknown action" }, 404);
}
