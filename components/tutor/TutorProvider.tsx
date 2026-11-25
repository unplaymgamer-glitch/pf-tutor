"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";

/** `topic` is a human label; `topicKey` ("w3/for-loop") pins the lesson so the tutor answers inside it. */
export type AskContext = { code?: string; diagnostics?: string; stdin?: string; topic?: string; topicKey?: string; text?: string; autoSend?: boolean };
const Ctx = createContext<{ open: (c?: AskContext) => void }>({ open: () => {} });
export const useTutor = () => useContext(Ctx);

// The chat panel (history, voice, upload, markdown) is only downloaded when the student first opens the tutor.
const Panel = dynamic(() => import("./TutorPanel"), { ssr: false });

export function TutorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const path = usePathname() ?? "";
  const onAdmin = path === "/admin" || path.startsWith("/admin/") || path === "/chat" || path === "/"; // no floating button on the instructor page or on the full-page chat
  const [ctx, setCtx] = useState<AskContext | undefined>();
  const open = useCallback((c?: AskContext) => { setCtx(c); setOpen(true); }, []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {!isOpen && !onAdmin && (
        <button className="btn btn-primary fixed bottom-20 right-4 z-40 md:bottom-4 !min-h-12 rounded-full px-5 shadow-lg" onClick={() => open()} aria-label="Open the CC111 tutor chat">💬 Tutor</button>
      )}
      {isOpen && <Panel onClose={() => setOpen(false)} initial={ctx} />}
    </Ctx.Provider>
  );
}
