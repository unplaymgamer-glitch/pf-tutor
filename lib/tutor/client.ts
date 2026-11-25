"use client";
import type { TutorEvent } from "./service";

export type TutorPayload = {
  messages: { role: "user" | "assistant"; content: string }[];
  lang: "en" | "roman" | "ur";
  deviceId: string;
  deep?: boolean;
  context?: { topic?: string; code?: string; diagnostics?: string; stdin?: string };
  file?: { name: string; text: string };
  pdfs?: { name: string; data: string }[];
  images?: { mediaType: "image/jpeg" | "image/png"; data: string }[];
};

/** Parse a Server-Sent-Events stream into tutor events. Tolerates chunks split anywhere. Pure, unit-tested. */
export function parseSSE(buffer: string): { events: TutorEvent[]; rest: string } {
  const events: TutorEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const p of parts) {
    const line = p.split("\n").find((l) => l.startsWith("data: "));
    if (!line) continue;
    try { events.push(JSON.parse(line.slice(6)) as TutorEvent); } catch { /* ignore a malformed event */ }
  }
  return { events, rest };
}

export async function askTutor(payload: TutorPayload, onEvent: (e: TutorEvent) => void, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onEvent({ type: "error", code: "provider", message: "No connection. Check your internet and try again." });
    return;
  }
  if (!res.ok || !res.body) {
    onEvent({ type: "error", code: res.status === 503 ? "off" : "provider", message: res.status === 503 ? "The site is in maintenance mode. The tutor will be back soon." : "The tutor could not answer just now. Please try again." });
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const r = parseSSE(buf);
      buf = r.rest;
      r.events.forEach(onEvent);
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") onEvent({ type: "error", code: "provider", message: "The connection was interrupted." });
  }
}

/** Anonymous per-device id for rate limiting. Random, resettable, never linked to a person. */
export function tutorDeviceId(): string {
  try {
    const k = "cc111.tutorDevice";
    let v = localStorage.getItem(k) ?? "";
    if (!/^[a-f0-9]{32}$/.test(v)) {
      v = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(k, v);
    }
    return v;
  } catch { return "0".repeat(32); }
}

/** Re-encode an image through a canvas: strips all metadata (EXIF, GPS) and limits size. Returns null when it cannot be read. */
export async function prepareImage(file: File): Promise<{ mediaType: "image/jpeg"; data: string } | null> {
  if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 8_000_000) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
    if (!blob || blob.size > 2_500_000) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { mediaType: "image/jpeg", data: btoa(s) };
  } catch { return null; }
}
