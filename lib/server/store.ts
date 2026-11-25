import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Announcement, Features, SiteState, TopicState, WeekState, DEFAULT_FEATURES, defaultState } from "../gate-logic";
import { Attempt, EMPTY_ATTEMPT } from "../lockout";
import { TutorSettings, sanitizeTutorSettings } from "../tutor/settings";

export type InstructorAnswer = { id: string; keywords: string; answer: string; created_at: string };
export type LbRow = { device_id: string; nickname: string; avatar: string; week_id: string; xp_week: number; hidden: boolean; updated_at: string };

// One interface, two backends: Supabase (service role, server only) and an in-memory store for local dev/tests.
export interface Store {
  readonly kind: "supabase" | "memory";
  getState(): Promise<SiteState>;
  setWeek(week: number, patch: Partial<Pick<WeekState, "locked" | "unlock_at" | "taught">>): Promise<void>;
  setTopic(week: number, slug: string, patch: Partial<Pick<TopicState, "locked" | "unlock_at" | "taught">>): Promise<void>;
  setSetting(key: "maintenance" | "examMode" | "features", value: unknown): Promise<void>;
  listAnnouncements(): Promise<Announcement[]>;
  addAnnouncement(a: { text: string; starts_at?: string; ends_at?: string | null }): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  audit(action: string, detail?: Record<string, unknown>): Promise<void>;
  listAudit(limit: number): Promise<{ id: number; at: string; action: string; detail: unknown }[]>;
  getAttempt(id: string): Promise<Attempt>;
  setAttempt(id: string, a: Attempt): Promise<void>;
  incr(kind: string, key: string): Promise<number>;
  counters(days: number): Promise<{ day: string; kind: string; key: string; n: number }[]>;
  logClientError(where: string, message: string): Promise<void>;
  recentClientErrors(limit: number): Promise<{ at: string; where_: string; message: string }[]>;
  ping(): Promise<{ ok: boolean; ms: number; error?: string }>;
  getSessionsValidAfter(): Promise<number>;
  setSessionsValidAfter(ms: number): Promise<void>;
  // Optional weekly leaderboard (nickname + avatar only)
  lbGet(deviceId: string): Promise<LbRow | null>;
  lbUpsert(row: LbRow): Promise<void>;
  lbTop(weekId: string, limit: number): Promise<LbRow[]>;
  lbCountAbove(weekId: string, xp: number): Promise<number>;
  lbListAll(weekId: string, limit: number): Promise<LbRow[]>;
  lbPatch(deviceId: string, patch: Partial<Pick<LbRow, "nickname" | "hidden">>): Promise<void>;
  lbDelete(deviceId: string): Promise<void>;
  lbResetWeek(weekId: string): Promise<void>;
  getBannedWords(): Promise<string[]>;
  setBannedWords(words: string[]): Promise<void>;
  // Tutor
  add(kind: string, key: string, amount: number): Promise<number>;
  getTutorSettings(): Promise<TutorSettings>;
  setTutorSettings(s: TutorSettings): Promise<void>;
  listInstructorAnswers(): Promise<InstructorAnswer[]>;
  addInstructorAnswer(keywords: string, answer: string): Promise<InstructorAnswer>;
  deleteInstructorAnswer(id: string): Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------ in-memory ------------------------------ */
class MemoryStore implements Store {
  readonly kind = "memory" as const;
  s: SiteState = defaultState();
  ann: Announcement[] = [];
  log: { id: number; at: string; action: string; detail: unknown }[] = [];
  att = new Map<string, Attempt>();
  cnt = new Map<string, number>();
  errs: { at: string; where_: string; message: string }[] = [];
  async getState() { return { ...this.s, weeks: this.s.weeks.map((w) => ({ ...w })), topics: [...this.s.topics], announcements: [...this.ann] }; }
  async setWeek(week: number, p: Partial<WeekState>) {
    this.s.weeks = this.s.weeks.map((w) => (w.week === week ? { ...w, ...p, taught_at: p.taught === true ? new Date().toISOString() : w.taught_at } : w));
  }
  async setTopic(week: number, slug: string, p: Partial<TopicState>) {
    const i = this.s.topics.findIndex((t) => t.week === week && t.slug === slug);
    const base: TopicState = i >= 0 ? this.s.topics[i] : { week, slug, locked: null, unlock_at: null, taught: false };
    const next = { ...base, ...p };
    if (i >= 0) this.s.topics[i] = next; else this.s.topics.push(next);
  }
  async setSetting(key: string, value: unknown) {
    if (key === "maintenance") this.s.maintenance = value === true;
    else if (key === "examMode") this.s.examMode = value === true;
    else if (key === "features") this.s.features = { ...DEFAULT_FEATURES, ...(value as Partial<Features>) };
  }
  async listAnnouncements() { return [...this.ann]; }
  async addAnnouncement(a: { text: string; starts_at?: string; ends_at?: string | null }) {
    const row: Announcement = { id: crypto.randomUUID(), text: a.text, starts_at: a.starts_at ?? new Date().toISOString(), ends_at: a.ends_at ?? null };
    this.ann.push(row); return row;
  }
  async deleteAnnouncement(id: string) { this.ann = this.ann.filter((a) => a.id !== id); }
  async audit(action: string, detail: Record<string, unknown> = {}) { this.log.unshift({ id: this.log.length + 1, at: new Date().toISOString(), action, detail }); }
  async listAudit(limit: number) { return this.log.slice(0, limit); }
  async getAttempt(id: string) { return this.att.get(id) ?? { ...EMPTY_ATTEMPT }; }
  async setAttempt(id: string, a: Attempt) { this.att.set(id, a); }
  async incr(kind: string, key: string) { const k = `${today()}|${kind}|${key}`; const n = (this.cnt.get(k) ?? 0) + 1; this.cnt.set(k, n); return n; }
  async counters() { return [...this.cnt.entries()].map(([k, n]) => { const [day, kind, key] = k.split("|"); return { day, kind, key, n }; }); }
  async logClientError(where: string, message: string) { this.errs.unshift({ at: new Date().toISOString(), where_: where, message }); this.errs.length = Math.min(this.errs.length, 100); }
  async recentClientErrors(limit: number) { return this.errs.slice(0, limit); }
  async ping() { return { ok: true, ms: 0 }; }
  validAfter = 0;
  async getSessionsValidAfter() { return this.validAfter; }
  async setSessionsValidAfter(ms: number) { this.validAfter = ms; }
  lb = new Map<string, LbRow>();
  banned: string[] = [];
  async lbGet(id: string) { return this.lb.get(id) ?? null; }
  async lbUpsert(r: LbRow) { this.lb.set(r.device_id, { ...r }); }
  async lbTop(w: string, n: number) { return [...this.lb.values()].filter((r) => r.week_id === w && !r.hidden && r.xp_week > 0).sort((a, b) => b.xp_week - a.xp_week || a.updated_at.localeCompare(b.updated_at)).slice(0, n); }
  async lbCountAbove(w: string, xp: number) { return [...this.lb.values()].filter((r) => r.week_id === w && !r.hidden && r.xp_week > xp).length; }
  async lbListAll(w: string, n: number) { return [...this.lb.values()].filter((r) => r.week_id === w).sort((a, b) => b.xp_week - a.xp_week).slice(0, n); }
  async lbPatch(id: string, p: Partial<LbRow>) { const r = this.lb.get(id); if (r) this.lb.set(id, { ...r, ...p }); }
  async lbDelete(id: string) { this.lb.delete(id); }
  async lbResetWeek(w: string) { for (const [k, r] of this.lb) if (r.week_id === w) this.lb.delete(k); }
  async getBannedWords() { return [...this.banned]; }
  async setBannedWords(w: string[]) { this.banned = [...w]; }
  tutor: TutorSettings = sanitizeTutorSettings(null);
  ia: InstructorAnswer[] = [];
  async add(kind: string, key: string, amount: number) { const k = `${today()}|${kind}|${key}`; const n = (this.cnt.get(k) ?? 0) + amount; this.cnt.set(k, n); return n; }
  async getTutorSettings() { return { ...this.tutor }; }
  async setTutorSettings(s: TutorSettings) { this.tutor = { ...s }; }
  async listInstructorAnswers() { return [...this.ia]; }
  async addInstructorAnswer(keywords: string, answer: string) { const r = { id: crypto.randomUUID(), keywords, answer, created_at: new Date().toISOString() }; this.ia.push(r); return r; }
  async deleteInstructorAnswer(id: string) { this.ia = this.ia.filter((a) => a.id !== id); }
}

/* ------------------------------- supabase ------------------------------ */
class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  constructor(private db: SupabaseClient) {}
  private fail(e: { message: string } | null) { if (e) throw new Error(e.message); }

  async getState(): Promise<SiteState> {
    const [w, t, s, a] = await Promise.all([
      this.db.from("cc111_week_state").select("*"),
      this.db.from("cc111_topic_state").select("*"),
      this.db.from("cc111_settings").select("*"),
      this.db.from("cc111_announcements").select("*").order("created_at", { ascending: false }),
    ]);
    this.fail(w.error); this.fail(t.error); this.fail(s.error); this.fail(a.error);
    const set = Object.fromEntries((s.data ?? []).map((r) => [r.key, r.value]));
    return {
      maintenance: set.maintenance === true,
      examMode: set.examMode === true,
      features: { ...DEFAULT_FEATURES, ...(set.features ?? {}) },
      weeks: (w.data ?? []).sort((x, y) => x.week - y.week),
      topics: t.data ?? [],
      announcements: a.data ?? [],
    };
  }
  async setWeek(week: number, p: Partial<WeekState>) {
    const patch: Record<string, unknown> = { ...p, updated_at: new Date().toISOString() };
    if (p.taught === true) patch.taught_at = new Date().toISOString();
    this.fail((await this.db.from("cc111_week_state").update(patch).eq("week", week)).error);
  }
  async setTopic(week: number, slug: string, p: Partial<TopicState>) {
    const row: Record<string, unknown> = { week, slug, ...p, updated_at: new Date().toISOString() };
    if (p.taught === true) row.taught_at = new Date().toISOString();
    this.fail((await this.db.from("cc111_topic_state").upsert(row, { onConflict: "week,slug" })).error);
  }
  async setSetting(key: string, value: unknown) {
    this.fail((await this.db.from("cc111_settings").upsert({ key, value, updated_at: new Date().toISOString() })).error);
  }
  async listAnnouncements() {
    const r = await this.db.from("cc111_announcements").select("*").order("created_at", { ascending: false }).limit(100);
    this.fail(r.error); return r.data ?? [];
  }
  async addAnnouncement(a: { text: string; starts_at?: string; ends_at?: string | null }) {
    const r = await this.db.from("cc111_announcements").insert({ text: a.text, ...(a.starts_at ? { starts_at: a.starts_at } : {}), ends_at: a.ends_at ?? null }).select().single();
    this.fail(r.error); return r.data as Announcement;
  }
  async deleteAnnouncement(id: string) { this.fail((await this.db.from("cc111_announcements").delete().eq("id", id)).error); }
  async audit(action: string, detail: Record<string, unknown> = {}) { await this.db.from("cc111_audit_log").insert({ action, detail }); }
  async listAudit(limit: number) {
    const r = await this.db.from("cc111_audit_log").select("*").order("id", { ascending: false }).limit(limit);
    this.fail(r.error); return r.data ?? [];
  }
  async getAttempt(id: string): Promise<Attempt> {
    const r = await this.db.from("cc111_admin_attempts").select("fails,locked_until,last_fail").eq("id", id).maybeSingle();
    this.fail(r.error); return r.data ?? { ...EMPTY_ATTEMPT };
  }
  async setAttempt(id: string, a: Attempt) { this.fail((await this.db.from("cc111_admin_attempts").upsert({ id, ...a })).error); }
  async incr(kind: string, key: string) {
    const r = await this.db.rpc("cc111_incr", { p_kind: kind, p_key: key });
    this.fail(r.error); return Number(r.data);
  }
  async counters(days: number) {
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
    const r = await this.db.from("cc111_counters").select("day,kind,key,n").gte("day", since).limit(5000);
    this.fail(r.error); return (r.data ?? []).map((x) => ({ ...x, n: Number(x.n) }));
  }
  async logClientError(where: string, message: string) { await this.db.from("cc111_client_errors").insert({ where_: where, message }); }
  async recentClientErrors(limit: number) {
    const r = await this.db.from("cc111_client_errors").select("at,where_,message").order("id", { ascending: false }).limit(limit);
    this.fail(r.error); return r.data ?? [];
  }
  async ping() {
    const t0 = Date.now();
    const r = await this.db.from("cc111_settings").select("key").limit(1);
    return { ok: !r.error, ms: Date.now() - t0, error: r.error?.message };
  }
  async getSessionsValidAfter() {
    const r = await this.db.from("cc111_settings").select("value").eq("key", "sessionsValidAfter").maybeSingle();
    this.fail(r.error); return typeof r.data?.value === "number" ? r.data.value : 0;
  }
  async setSessionsValidAfter(ms: number) {
    this.fail((await this.db.from("cc111_settings").upsert({ key: "sessionsValidAfter", value: ms, updated_at: new Date().toISOString() })).error);
  }
  async lbGet(id: string) {
    const r = await this.db.from("cc111_leaderboard").select("*").eq("device_id", id).maybeSingle();
    this.fail(r.error); return (r.data as LbRow | null) ?? null;
  }
  async lbUpsert(row: LbRow) { this.fail((await this.db.from("cc111_leaderboard").upsert(row)).error); }
  async lbTop(weekId: string, limit: number) {
    const r = await this.db.from("cc111_leaderboard").select("*").eq("week_id", weekId).eq("hidden", false).gt("xp_week", 0).order("xp_week", { ascending: false }).order("updated_at", { ascending: true }).limit(limit);
    this.fail(r.error); return (r.data ?? []) as LbRow[];
  }
  async lbCountAbove(weekId: string, xp: number) {
    const r = await this.db.from("cc111_leaderboard").select("device_id", { count: "exact", head: true }).eq("week_id", weekId).eq("hidden", false).gt("xp_week", xp);
    this.fail(r.error); return r.count ?? 0;
  }
  async lbListAll(weekId: string, limit: number) {
    const r = await this.db.from("cc111_leaderboard").select("*").eq("week_id", weekId).order("xp_week", { ascending: false }).limit(limit);
    this.fail(r.error); return (r.data ?? []) as LbRow[];
  }
  async lbPatch(id: string, patch: Partial<Pick<LbRow, "nickname" | "hidden">>) { this.fail((await this.db.from("cc111_leaderboard").update({ ...patch, updated_at: new Date().toISOString() }).eq("device_id", id)).error); }
  async lbDelete(id: string) { this.fail((await this.db.from("cc111_leaderboard").delete().eq("device_id", id)).error); }
  async lbResetWeek(weekId: string) { this.fail((await this.db.from("cc111_leaderboard").delete().eq("week_id", weekId)).error); }
  async getBannedWords() {
    const r = await this.db.from("cc111_settings").select("value").eq("key", "bannedWords").maybeSingle();
    this.fail(r.error); return Array.isArray(r.data?.value) ? (r.data!.value as string[]) : [];
  }
  async setBannedWords(words: string[]) { this.fail((await this.db.from("cc111_settings").upsert({ key: "bannedWords", value: words, updated_at: new Date().toISOString() })).error); }
  async add(kind: string, key: string, amount: number) {
    const r = await this.db.rpc("cc111_add", { p_kind: kind, p_key: key, p_amount: Math.round(amount) });
    this.fail(r.error); return Number(r.data);
  }
  async getTutorSettings() {
    const r = await this.db.from("cc111_settings").select("value").eq("key", "tutor").maybeSingle();
    this.fail(r.error); return sanitizeTutorSettings(r.data?.value);
  }
  async setTutorSettings(s: TutorSettings) { this.fail((await this.db.from("cc111_settings").upsert({ key: "tutor", value: s, updated_at: new Date().toISOString() })).error); }
  async listInstructorAnswers() {
    const r = await this.db.from("cc111_instructor_answers").select("*").order("created_at", { ascending: false }).limit(200);
    this.fail(r.error); return (r.data ?? []) as InstructorAnswer[];
  }
  async addInstructorAnswer(keywords: string, answer: string) {
    const r = await this.db.from("cc111_instructor_answers").insert({ keywords, answer }).select().single();
    this.fail(r.error); return r.data as InstructorAnswer;
  }
  async deleteInstructorAnswer(id: string) { this.fail((await this.db.from("cc111_instructor_answers").delete().eq("id", id)).error); }
}

/* ------------------------------ selection ------------------------------ */
const g = globalThis as unknown as { __cc111Store?: Store; __cc111Cache?: { at: number; state: SiteState } };

export function getStore(): Store {
  if (g.__cc111Store) return g.__cc111Store;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  g.__cc111Store = url && key && process.env.CC111_STORE !== "memory"
    ? new SupabaseStore(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }))
    : new MemoryStore();
  return g.__cc111Store;
}

const TTL_MS = 5000;
/** Cached state for the student-facing gate (<= 5 s stale per server instance). Fails closed to locked weeks. */
export async function getSiteState(): Promise<SiteState> {
  const now = Date.now();
  if (g.__cc111Cache && now - g.__cc111Cache.at < TTL_MS) return g.__cc111Cache.state;
  try {
    const state = await getStore().getState();
    g.__cc111Cache = { at: now, state };
    return state;
  } catch {
    // Database unreachable: keep serving the last known state, otherwise only the default open weeks.
    return g.__cc111Cache?.state ?? defaultState();
  }
}
export const invalidateSiteState = () => { g.__cc111Cache = undefined; };
