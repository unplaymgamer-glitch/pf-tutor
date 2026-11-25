"use client";
import dynamic from "next/dynamic";
import type { AskContext } from "./TutorProvider";

const Panel = dynamic(() => import("./TutorPanel"), { ssr: false, loading: () => <div className="skeleton mx-auto h-[28rem] max-w-4xl" aria-busy="true" /> });

/** Full-page tutor. Same engine as the floating chat; `initial` pins a lesson when the student came from one. */
export function ChatPage({ initial }: { initial?: AskContext }) {
  return <Panel page onClose={() => {}} initial={initial} />;
}
