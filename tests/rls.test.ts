// Negative tests: an anonymous (public) client must NOT be able to read or write any cc111 table or call the counter function.
// Runs only when SUPABASE_URL and SUPABASE_ANON_KEY are set (the anon key is public by design):
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... npx vitest run tests/rls.test.ts
import { describe, it, expect } from "vitest";

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY;
const run = URL_ && KEY ? describe : describe.skip;
const H = { apikey: KEY ?? "", Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const TABLES = ["cc111_settings", "cc111_week_state", "cc111_topic_state", "cc111_announcements", "cc111_audit_log", "cc111_admin_attempts", "cc111_counters", "cc111_client_errors", "cc111_leaderboard", "cc111_instructor_answers"];

run("anonymous client is locked out of every cc111 table", () => {
  for (const t of TABLES) {
    it(`${t}: cannot read`, async () => {
      const r = await fetch(`${URL_}/rest/v1/${t}?select=*`, { headers: H });
      const body = await r.text();
      // Either a permission error, or no rows leak. Data must never come back.
      expect(r.status === 200 ? JSON.parse(body).length : 0, `${t} leaked rows: ${body.slice(0, 80)}`).toBe(0);
    });
    it(`${t}: cannot insert`, async () => {
      const r = await fetch(`${URL_}/rest/v1/${t}`, { method: "POST", headers: H, body: JSON.stringify({ key: "hack", value: 1 }) });
      expect(r.ok, `${t} accepted an anonymous insert`).toBe(false);
    });
    it(`${t}: cannot update or delete`, async () => {
      const u = await fetch(`${URL_}/rest/v1/${t}?select=*`, { method: "PATCH", headers: H, body: JSON.stringify({ updated_at: "2000-01-01" }) });
      expect(u.ok && (await u.text()) !== "[]", `${t} anonymous update changed data`).toBe(false);
      const d = await fetch(`${URL_}/rest/v1/${t}?select=*`, { method: "DELETE", headers: H });
      expect(d.ok && (await d.text()) !== "[]", `${t} anonymous delete removed data`).toBe(false);
    });
  }
  it("cc111_incr RPC is not callable by anon", async () => {
    const r = await fetch(`${URL_}/rest/v1/rpc/cc111_incr`, { method: "POST", headers: H, body: JSON.stringify({ p_kind: "x", p_key: "y" }) });
    expect(r.ok).toBe(false);
  });
  it("cc111_add RPC (spend tracking) is not callable by anon", async () => {
    const r = await fetch(`${URL_}/rest/v1/rpc/cc111_add`, { method: "POST", headers: H, body: JSON.stringify({ p_kind: "tutor-micros", p_key: "2026-11", p_amount: -99999999 }) });
    expect(r.ok).toBe(false);
  });
});
