"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { takeHandoff, type Handoff } from "@/lib/tutor/handoff";
import type { ModuleNav } from "./ChatApp";

const ChatApp = dynamic(() => import("./ChatApp"), { ssr: false, loading: () => <div className="skeleton fixed inset-0 z-[100]" aria-busy="true" /> });

/** Full-screen tutor. `initial` pins a lesson when the student came from one (?topic=); a question or code handed over by another page is read once here. */
export function ChatPage({ initial, modules }: { initial?: Handoff; modules: ModuleNav[] }) {
  const [start] = useState<Handoff | undefined>(() => {
    const h = typeof window === "undefined" ? undefined : takeHandoff();
    return h ? { ...initial, ...h, topicKey: h.topicKey ?? initial?.topicKey } : initial;
  });
  return <ChatApp initial={start} modules={modules} />;
}
