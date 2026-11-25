// Optional weekly leaderboard rules (pure, shared by the server route and the panel).
// Honest limit: with no login it cannot be cheat-proof. It is made hard to abuse (plausibility caps, rate limits,
// moderation) and is deliberately low-key: nickname + avatar only, resets every week, never shames low ranks.
export const AVATARS = ["🙂", "😎", "🤓", "🦊", "🐼", "🦁", "🐯", "🐸", "🦉", "🚀", "⚡", "🌟", "🔥", "🎯", "🧠", "💻"] as const;
export const MAX_WEEK_XP = 1500;          // more than this in one week is not plausible
export const MAX_JUMP_PER_SYNC = 250;     // XP a device may gain between two syncs
export const DEFAULT_BANNED = ["admin", "administrator", "instructor", "teacher", "professor", "umt", "fuck", "shit", "bitch", "asshole", "porn", "sex", "gandu", "harami", "kutta", "chutiya", "bhenchod", "madarchod"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

export const squash = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[01345 7@$!]/g, (c) => LEET[c] ?? "").replace(/[^a-z؀-ۿ]/g, "");

export type NickResult = { ok: true; nickname: string } | { ok: false; reason: string };

export function validateNickname(input: string, banned: string[] = []): NickResult {
  const nick = input.normalize("NFC").trim().replace(/\s+/g, " ");
  if (nick.length < 2 || nick.length > 16) return { ok: false, reason: "Use 2 to 16 characters." };
  if (!/^[\p{L}\p{N} _-]+$/u.test(nick)) return { ok: false, reason: "Use only letters, numbers, spaces, - and _." };
  if (/\d{7,}/.test(nick.replace(/\D+/g, "")) ) return { ok: false, reason: "Please do not use phone numbers or ID numbers." };
  const flat = squash(nick);
  for (const w of [...DEFAULT_BANNED, ...banned]) {
    const bw = squash(w);
    if (bw.length >= 3 && flat.includes(bw)) return { ok: false, reason: "That name is not allowed. Please choose another." };
  }
  return { ok: true, nickname: nick };
}

/** Plausibility cap: a device can only rise a limited amount per sync and never above the weekly ceiling. */
export function clampXp(previous: number, submitted: number): number {
  const s = Math.max(0, Math.floor(Number.isFinite(submitted) ? submitted : 0));
  return Math.min(s, previous + MAX_JUMP_PER_SYNC, MAX_WEEK_XP);
}

export const isDeviceId = (s: unknown): s is string => typeof s === "string" && /^[a-f0-9]{32}$/.test(s);
export const newDeviceId = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
