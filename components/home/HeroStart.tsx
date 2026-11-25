"use client";
import Link from "next/link";
import { T } from "../I18n";
import { useProgress } from "../useProgress";

/** The hero buttons. A new visitor starts at Lesson 1; a returning visitor continues where they stopped. The AI tutor is its own button. */
export function HeroStart() {
  const { progress } = useProgress();
  const last = progress.last;
  const href = last ? `/week-${last.week}/${last.slug}` : "/week-1/pdlc";
  return (
    <>
      <div className="rise flex flex-wrap justify-center gap-3">
        <Link href={href} className="pill-btn pill-btn-solid"><T k={last ? "home.continue" : "home.start"} /></Link>
        <Link href="/chat" className="pill-btn pill-btn-line"><T k="home.ask" /></Link>
        <Link href="/visual-lab" className="pill-btn pill-btn-line"><T k="home.openLab" /></Link>
      </div>
      <p className="rise text-sm">
        <Link href="/start" className="underline"><T k="home.placement" /></Link>
      </p>
    </>
  );
}
