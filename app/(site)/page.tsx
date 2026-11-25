import Link from "next/link";
import { CHAPTERS, WEEK_HUES, WEEK_ICONS } from "@/lib/course";
import { allSamples } from "@/lib/content-schema";
import { getTopics } from "@/lib/content";
import { ContinueCard } from "@/components/topic/ContinueCard";
import { DailyChallenge } from "@/components/game/DailyChallenge";
import { HeroDemo } from "@/components/home/HeroDemo";
import { RoadmapMap } from "@/components/home/RoadmapMap";
import { StatCounters } from "@/components/home/StatCounters";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function Home() {
  const chapters = CHAPTERS.map((c) => ({ c, topics: getTopics(c.week) }));
  const all = chapters.flatMap((x) => x.topics);
  // Every number on the home page is computed from the real lesson files.
  const stats = [
    { label: "Chapters", value: CHAPTERS.length, icon: "📚" },
    { label: "Lessons", value: all.length, icon: "🎓" },
    { label: "Animations and traces", value: all.reduce((n, t) => n + t.visuals.filter((v) => v.kind !== "trace").length + allSamples(t).filter((s) => s.trace).length, 0), icon: "🎬" },
    { label: "Verified code examples", value: all.reduce((n, t) => n + allSamples(t).length, 0), icon: "💻" },
    { label: "Practice and quiz questions", value: all.reduce((n, t) => n + t.practice.length + t.quiz.length, 0), icon: "✍️" },
  ];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Course", name: "CC111 Programming Fundamentals (C++)", description: SITE_DESCRIPTION, inLanguage: "en", isAccessibleForFree: true,
    provider: { "@type": "CollegeOrUniversity", name: "University of Management and Technology, Lahore" },
  };
  return (
    <div className="grid gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="grid items-center gap-6 lg:grid-cols-2" aria-labelledby="hero">
        <div className="grid gap-4 rise">
          <p className="flex flex-wrap gap-2"><span className="pill">🆓 Free</span><span className="pill">🔓 No login</span><span className="pill">🗓️ 16 weeks</span></p>
          <h1 id="hero" className="text-4xl font-bold leading-tight sm:text-5xl">Learn C++ by <span className="gradient-text">seeing it run</span></h1>
          <p className="text-lg text-muted">Pictures and animations first, then simple words, real code and practice. Built for UMT CC111 students.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/week-1" className="btn btn-primary inline-flex items-center px-6 no-underline">Start learning</Link>
            <Link href="/visual-lab" className="btn inline-flex items-center px-6 no-underline">🎬 Open Visual Lab</Link>
          </div>
        </div>
        <div className="rise" style={{ animationDelay: ".12s" }}><HeroDemo /></div>
      </section>

      <ContinueCard />
      <StatCounters stats={stats} />
      <DailyChallenge />

      <section aria-labelledby="road" className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="road" className="text-2xl font-semibold">Course map</h2>
          <p className="text-sm text-muted">Each week has its own colour. The ring fills as you finish lessons.</p>
        </div>
        <RoadmapMap chapters={chapters.map(({ c, topics }) => ({ week: c.week, title: c.title, summary: c.summary, assessment: c.assessment, slugs: topics.map((t) => t.slug), hue: WEEK_HUES[c.week - 1], icon: WEEK_ICONS[c.week - 1] }))} />
      </section>
    </div>
  );
}
