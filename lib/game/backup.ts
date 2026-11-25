// Backup code: restore progress on another device without any account. Text format:  CC111-<base64url(deflate(json))>.<crc32>
import { Progress, sanitizeProgress } from "../progress";

const PREFIX = "CC111-";
const MAX_CODE = 200_000;

const b64 = (u8: Uint8Array) => { let s = ""; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function crc32(u8: Uint8Array): string {
  let c = ~0;
  for (const b of u8) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ((~c) >>> 0).toString(16).padStart(8, "0");
}

async function pipe(data: Uint8Array, s: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const w = s.writable.getWriter();
  void w.write(data as unknown as BufferSource);
  void w.close();
  return new Uint8Array(await new Response(s.readable).arrayBuffer());
}

export async function makeBackupCode(p: Progress): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ v: 2, p }));
  const packed = typeof CompressionStream === "undefined" ? raw : await pipe(raw, new CompressionStream("deflate-raw"));
  const tag = typeof CompressionStream === "undefined" ? "r" : "z";
  return `${PREFIX}${tag}${b64(packed)}.${crc32(packed)}`;
}

/** Returns the repaired progress, or an error message. Never trusts the input: everything goes through sanitizeProgress. */
export async function readBackupCode(code: string): Promise<{ ok: true; progress: Progress } | { ok: false; error: string }> {
  try {
    const t = code.trim().replace(/\s+/g, "");
    if (!t.startsWith(PREFIX) || t.length > MAX_CODE) return { ok: false, error: "This is not a CC111 backup code." };
    const [body, crc] = t.slice(PREFIX.length).split(".");
    if (!body || !crc) return { ok: false, error: "The code looks incomplete. Copy the whole text." };
    const tag = body[0];
    const bytes = unb64(body.slice(1));
    if (crc32(bytes) !== crc) return { ok: false, error: "The code is damaged (checksum does not match). Copy it again." };
    const raw = tag === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : tag === "r" ? bytes : null;
    if (!raw) return { ok: false, error: "Unknown backup format." };
    const j = JSON.parse(new TextDecoder().decode(raw)) as { p?: unknown };
    return { ok: true, progress: sanitizeProgress(j.p) };
  } catch {
    return { ok: false, error: "Could not read this backup code." };
  }
}

/** Merge two progress records (used when restoring onto a device that already has progress): keep the best of both. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const topics = { ...a.topics };
  for (const [k, t] of Object.entries(b.topics)) {
    const x = topics[k];
    if (!x) { topics[k] = t; continue; }
    const bestA = x.quizTotal ? (x.quizBest ?? 0) / x.quizTotal : 0, bestB = t.quizTotal ? (t.quizBest ?? 0) / t.quizTotal : 0;
    const better = bestB > bestA ? t : x;
    topics[k] = { ...x, visited: x.visited || t.visited, done: x.done || t.done, quizBest: better.quizBest, quizTotal: better.quizTotal, quizLastPct: x.quizLastPct ?? t.quizLastPct, answered: { ...t.answered, ...x.answered } };
  }
  const review = { ...b.review, ...a.review };
  const badges = { ...b.badges, ...a.badges };
  return {
    ...a, xp: Math.max(a.xp, b.xp), topics, badges, review,
    streak: a.streak.best >= b.streak.best ? { ...a.streak, best: Math.max(a.streak.best, b.streak.best) } : { ...b.streak, best: Math.max(a.streak.best, b.streak.best) },
    stats: { runs: Math.max(a.stats.runs, b.stats.runs), bugsFixed: Math.max(a.stats.bugsFixed, b.stats.bugsFixed), perfectQuizzes: Math.max(a.stats.perfectQuizzes, b.stats.perfectQuizzes), reviews: Math.max(a.stats.reviews, b.stats.reviews), mocks: Math.max(a.stats.mocks, b.stats.mocks), night: a.stats.night || b.stats.night, early: a.stats.early || b.stats.early, correctFirstTry: Math.max(a.stats.correctFirstTry, b.stats.correctFirstTry) },
    mocks: [...a.mocks, ...b.mocks.filter((m) => !a.mocks.some((x) => x.id === m.id))].slice(-30),
    last: a.last ?? b.last,
  };
}
