"use client";
import { useSyncExternalStore } from "react";
import { dismissToast, getToasts, subscribeToasts } from "./toast-bus";

const none: never[] = [];

/** Non-blocking, screen-reader friendly rewards. Animation is a short fade and is switched off by reduced-motion settings (see globals.css). */
export function Toasts() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, () => none);
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className="toast pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2 shadow-lg">
          <span>{t.text}</span>
          <button className="btn !min-h-11 !min-w-11 !px-2 text-sm" aria-label="Dismiss message" onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
