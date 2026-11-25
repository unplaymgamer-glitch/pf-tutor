"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { HOME_Q_KEY } from "../home/HomeChatBox";
import type { AskContext } from "./TutorProvider";

const Panel = dynamic(() => import("./TutorPanel"), { ssr: false, loading: () => <div className="skeleton mx-auto h-[28rem] max-w-4xl" aria-busy="true" /> });

/** A question typed on the home page waits in this tab's sessionStorage; it is read once and removed. */
function takeHomeQuestion(): string | undefined {
  try { const q = sessionStorage.getItem(HOME_Q_KEY); if (q) { sessionStorage.removeItem(HOME_Q_KEY); return q; } } catch { /* storage blocked: start empty */ }
  return undefined;
}

/** Full-page tutor. Same engine as the floating chat; `initial` pins a lesson when the student came from one. */
export function ChatPage({ initial }: { initial?: AskContext }) {
  const [start] = useState<AskContext | undefined>(() => {
    const q = typeof window === "undefined" ? undefined : takeHomeQuestion();
    return q ? { ...initial, text: q, autoSend: true } : initial;
  });
  return <Panel page onClose={() => {}} initial={start} />;
}
