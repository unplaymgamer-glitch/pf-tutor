"use client";
// Tiny event bus for the little "+10 XP" / badge messages. Never blocks the lesson.
import type { Toast } from "@/lib/game/engine";

export type LiveToast = Toast & { id: number };
let nextId = 1;
let list: LiveToast[] = [];
const subs = new Set<() => void>();

export const getToasts = () => list;
export const subscribeToasts = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
const emit = () => subs.forEach((s) => s());

export function pushToasts(ts: Toast[]) {
  if (!ts.length) return;
  const mapped = ts.map((t) => ({ ...t, id: nextId++ }));
  list = [...list, ...mapped].slice(-4);
  emit();
  for (const m of mapped) setTimeout(() => dismissToast(m.id), m.kind === "badge" || m.kind === "level" ? 6000 : 3500);
}
export function dismissToast(id: number) {
  const next = list.filter((t) => t.id !== id);
  if (next.length !== list.length) { list = next; emit(); }
}
