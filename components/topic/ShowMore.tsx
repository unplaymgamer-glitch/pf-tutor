"use client";
import { splitForShowMore } from "@/lib/lesson-meta";

/** Text diet: shows about three short lines, the rest sits behind a keyboard-friendly "Show more". Nothing is removed. */
export function ShowMore({ text, lang }: { text: string; lang?: string }) {
  const { lead, rest } = splitForShowMore(text);
  return (
    <div lang={lang}>
      <p>{lead}</p>
      {rest && (
        <details className="mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">Show more</summary>
          <p className="mt-1">{rest}</p>
        </details>
      )}
    </div>
  );
}
