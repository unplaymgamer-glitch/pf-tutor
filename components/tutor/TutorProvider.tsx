"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";
import { setHandoff } from "@/lib/tutor/handoff";

/** `topic` is a human label; `topicKey` ("w3/for-loop") pins the lesson so the tutor answers inside it. */
export type AskContext = { code?: string; diagnostics?: string; stdin?: string; topic?: string; topicKey?: string; text?: string; autoSend?: boolean };
const Ctx = createContext<{ open: (c?: AskContext) => void }>({ open: () => {} });
export const useTutor = () => useContext(Ctx);

/** Every "ask the tutor" button opens the full-screen chat. What the student was looking at (lesson, code, error) travels with it. */
export function TutorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname() ?? "";
  const hidden = path === "/admin" || path.startsWith("/admin/") || path === "/chat" || path === "/"; // no floating button on the instructor page, in the chat itself, or on the home page
  const open = useCallback((c?: AskContext) => {
    // Inside a lesson workspace the topic tutor is already on screen: hand the question to it instead of leaving the page.
    if (c && location.pathname.endsWith("/workspace")) { window.dispatchEvent(new CustomEvent("cc111:ask", { detail: c })); return; }
    if (c) setHandoff({ text: c.text, autoSend: !!(c.text && (c.code || c.diagnostics)), topic: c.topic, topicKey: c.topicKey, code: c.code, diagnostics: c.diagnostics, stdin: c.stdin });
    router.push(c?.topicKey ? `/chat?topic=${c.topicKey}` : "/chat");
  }, [router]);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {!hidden && (
        <aside aria-label="Tutor shortcut"><Link href="/chat" className="btn btn-primary fixed bottom-20 right-4 z-40 inline-flex items-center rounded-full px-5 no-underline shadow-lg md:bottom-4 !min-h-12" aria-label="Open the CC111 tutor chat">💬 Tutor</Link></aside>
      )}
    </Ctx.Provider>
  );
}
