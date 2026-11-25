"use client";
import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_PROGRESS, PROGRESS_KEY, Progress, sanitizeProgress } from "@/lib/progress";
import { GameEvent, applyEvent } from "@/lib/game/engine";
import { pushToasts } from "./toast-bus";

let current: Progress | null = null;
const listeners = new Set<() => void>();
const read = (): Progress => {
  try { const s = localStorage.getItem(PROGRESS_KEY); return sanitizeProgress(s ? JSON.parse(s) : null); } catch { return EMPTY_PROGRESS; }
};
const getSnapshot = () => (current ??= read());
const getServerSnapshot = () => EMPTY_PROGRESS;
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

function commit(next: Progress) {
  current = next;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* storage blocked: progress lasts for this tab only */ }
  listeners.forEach((l) => l());
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const update = useCallback((fn: (p: Progress) => Progress) => commit(fn(getSnapshot())), []);
  /** Apply a learning event through the game engine (XP, streak, badges, quests, review) and show friendly messages. */
  const dispatch = useCallback((e: GameEvent, weekTopics: Record<number, string[]> = {}) => {
    const r = applyEvent(getSnapshot(), e, { now: new Date(), badges: { weekTopics } });
    commit(r.progress);
    pushToasts(r.toasts);
  }, []);
  /** Replace everything (backup restore). */
  const replace = useCallback((p: Progress) => commit(p), []);
  return { progress, update, dispatch, replace };
}
