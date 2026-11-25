"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const HOME_Q_KEY = "cc111-home-question";
const IDEAS = ["Explain pointers with a picture", "How does a for loop work?", "Why does my program print garbage?", "Help me revise for the mid-term"];

/** The first thing a student sees: ask anything, or start the course. The question is handed to /chat (kept in this browser tab only, never in the URL). */
export function HomeChatBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const go = (q: string) => {
    const v = q.trim().slice(0, 1000);
    if (v) { try { sessionStorage.setItem(HOME_Q_KEY, v); } catch { /* the chat page still opens, just empty */ } }
    router.push("/chat");
  };
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <form className="card grid gap-2 !p-3" onSubmit={(e) => { e.preventDefault(); go(text); }}>
        <label htmlFor="home-q" className="sr-only">What do you want to learn?</label>
        <textarea id="home-q" rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(text); } }}
          placeholder="What do you want to learn today? e.g. “Explain arrays with a picture”"
          className="w-full resize-none rounded-lg bg-transparent p-2 text-lg outline-none" />
        <div className="flex items-center justify-between gap-2">
          <Link href="/chat" className="inline-flex min-h-11 items-center px-2 text-sm text-muted no-underline hover:text-primary">📎 Attach<span className="hidden sm:inline">&nbsp;code or a screenshot</span></Link>
          <button type="submit" className="btn btn-primary whitespace-nowrap" aria-label="Ask the tutor">Ask ➤</button>
        </div>
      </form>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/week-1" className="btn btn-primary inline-flex items-center px-6 no-underline">📚 Start learning</Link>
        <Link href="/chat" className="btn inline-flex items-center px-6 no-underline">💬 AI Tutor</Link>
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Ideas to ask">
        {IDEAS.map((q) => <button key={q} type="button" className="btn !min-h-11 text-sm" onClick={() => go(q)}>{q}</button>)}
      </div>
    </div>
  );
}
