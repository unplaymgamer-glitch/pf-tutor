import "server-only";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_S, SessionPayload, csrfOk, needsRotation, newSession, originOk, revoked, signSession, verifySession } from "./session";
import { getStore } from "./store";

// A real bcrypt hash of a random string, built once: a wrong username then costs the same time as a wrong password.
let dummy: string | null = null;
const dummyHash = () => (dummy ??= bcrypt.hashSync(Math.random().toString(36) + Date.now(), 12));

/**
 * The bcrypt hash can be given as ADMIN_PASSWORD_HASH_B64 (base64, recommended: it contains no `$`, which .env loaders try
 * to expand and silently corrupt) or as the plain ADMIN_PASSWORD_HASH (fine in the Vercel dashboard).
 */
export function adminHash(): string {
  const b64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (b64) { try { return Buffer.from(b64, "base64").toString("utf8").trim(); } catch { return ""; } }
  return process.env.ADMIN_PASSWORD_HASH ?? "";
}

export const adminConfigured = () =>
  !!process.env.ADMIN_USERNAME && adminHash().startsWith("$2") && (process.env.SESSION_SECRET ?? "").length >= 32;

const secret = () => process.env.SESSION_SECRET ?? "";

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const wantUser = process.env.ADMIN_USERNAME ?? "";
  const hash = adminHash() || dummyHash();
  const userOk = username.length === wantUser.length && createHmac("sha256", "u").update(username).digest().equals(createHmac("sha256", "u").update(wantUser).digest());
  const passOk = await bcrypt.compare(password.slice(0, 200), userOk ? hash : dummyHash()).catch(() => false);
  return userOk && passOk;
}

/** Anonymous client key for rate limiting: HMAC of the IP, never the raw address. */
export function clientKey(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", secret() || "dev").update(ip).digest("hex").slice(0, 32);
}

export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_S,
});

export async function currentSession(): Promise<SessionPayload | null> {
  if (!adminConfigured()) return null;
  const s = verifySession(secret(), (await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  // Fail closed: if the revocation cut-off cannot be read, treat the session as invalid.
  try { return revoked(s, await getStore().getSessionsValidAfter()) ? null : s; } catch { return null; }
}

export function startSession(res: NextResponse, keepCsrf?: string): SessionPayload {
  const p = newSession();
  if (keepCsrf) p.csrf = keepCsrf; // rotation must not invalidate the CSRF token the open admin page already holds
  res.cookies.set(SESSION_COOKIE, signSession(secret(), p), cookieOptions());
  return p;
}
export function endSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export type AdminCtx = { session: SessionPayload; rotate: (res: NextResponse) => NextResponse };

/**
 * Guard for every admin API call. Verifies the signed cookie server-side; for mutations also requires
 * same-origin and the CSRF token header. Returns a ready 401/403 response when the request is not allowed.
 */
export async function requireAdmin(req: Request, opts: { mutate: boolean }): Promise<AdminCtx | NextResponse> {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (opts.mutate) {
    if (!originOk(req.headers.get("origin"), req.headers.get("host"))) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    if (!csrfOk(session, req.headers.get("x-csrf-token"))) return NextResponse.json({ error: "Bad CSRF token" }, { status: 403 });
  }
  return {
    session,
    // Sliding rotation: hand out a fresh token (same CSRF value) once the old one is over an hour old.
    rotate: (res) => {
      if (needsRotation(session)) startSession(res, session.csrf);
      return res;
    },
  };
}
