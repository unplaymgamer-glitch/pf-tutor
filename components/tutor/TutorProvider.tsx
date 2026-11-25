"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";

export type AskContext = { code?: string; diagnostics?: string; stdin?: string; topic?: string; text?: string };
const Ctx = createContext<{ open: (c?: AskContext) => void }>({ open: () => {} });
export const useTutor = () => useContext(Ctx);

// The chat panel (history, voice, upload, markdown) is only downloaded when the student first opens the tutor.
const Panel = dynamic(() => import("./TutorPanel"), { ssr: false });

export function TutorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const path = usePathname() ?? "";
  const onAdmin = path === "/admin" || path.startsWith("/admin/"); // no student tutor button on the instructor page
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
