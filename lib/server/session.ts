import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Signed, expiring admin session token. Stored in an HttpOnly cookie; never readable by page scripts.
export const SESSION_COOKIE = "cc111_admin";
export const SESSION_TTL_S = 8 * 60 * 60; // 8 hours
export const ROTATE_AFTER_S = 60 * 60; // issue a fresh token when the current one is over an hour old

export type SessionPayload = { sid: string; csrf: string; iat: number; exp: number; born: number };

const b64 = (b: Buffer) => b.toString("base64url");
const mac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest();

export function signSession(secret: string, payload: SessionPayload): string {
  const body = b64(Buffer.from(JSON.stringify(payload)));
  return `${body}.${b(mac(secret, body))}`;
}
const b = (x: Buffer) => b64(x);

export function newSession(now: number = Date.now()): SessionPayload {
  const iat = Math.floor(now / 1000);
  return { sid: randomBytes(16).toString("hex"), csrf: randomBytes(24).toString("base64url"), iat, exp: iat + SESSION_TTL_S, born: now };
}

/** Returns the payload if the signature is valid and the token has not expired; otherwise null. */
export function verifySession(secret: string, token: string | undefined, now: number = Date.now()): SessionPayload | null {
  if (!token || secret.length < 32) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = mac(secret, body);
  let given: Buffer;
  try { given = Buffer.from(sig, "base64url"); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof p.exp !== "number" || typeof p.iat !== "number" || typeof p.csrf !== "string" || typeof p.sid !== "string" || typeof p.born !== "number") return null;
    if (p.exp * 1000 <= now) return null;
    return p;
  } catch {
    return null;
  }
}

/** Logout / password change sets a cut-off time; any session created at or before it is dead, even if its signature is valid. */
export const revoked = (p: SessionPayload, validAfterMs: number) => p.born <= validAfterMs;

export const needsRotation = (p: SessionPayload, now: number = Date.now()) => now / 1000 - p.iat > ROTATE_AFTER_S;

export function csrfOk(session: SessionPayload, header: string | null): boolean {
  if (!header) return false;
  const a = Buffer.from(session.csrf), c = Buffer.from(header);
  return a.length === c.length && timingSafeEqual(a, c);
}

/** Same-origin check for mutations (defence in depth next to SameSite=Strict and the CSRF token). */
export function originOk(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
