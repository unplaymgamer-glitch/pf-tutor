import Link from "next/link";
import { CHAPTERS, MODULES } from "@/lib/course";
import { allSamples } from "@/lib/content-schema";
import { getTopics } from "@/lib/content";
import { ContinueCard } from "@/components/topic/ContinueCard";
import { DailyChallenge } from "@/components/game/DailyChallenge";
import { HeroDemo } from "@/components/home/HeroDemo";
import { ModuleGrid, type ModuleCard } from "@/components/home/ModuleGrid";
import { StatCounters } from "@/components/home/StatCounters";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function Home() {
  const chapters = CHAPTERS.map((c) => ({ c, topics: getTopics(c.week) }));
  const all = chapters.flatMap((x) => x.topics);
  const cards: ModuleCard[] = MODULES.map((m) => ({
    ...m,
    label: m.weeks.length === 1 ? `WEEK ${m.weeks[0]}` : `WEEKS ${m.weeks[0]}–${m.weeks[m.weeks.length - 1]}`,
    lessons: m.weeks.flatMap((w) => getTopics(w).map((t) => ({ key: `w${w}/${t.slug}`, slug: t.slug, title: t.title, week: w }))),
  }));
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
    <div className="grid gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="dot-grid -mx-4 grid justify-items-center gap-6 px-4 pb-6 pt-10 text-center sm:pt-16" aria-labelledby="hero">
        <p className="rise text-sm font-bold uppercase tracking-[.35em] text-primary">UMT · CC111</p>
        <h1 id="hero" className="rise text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">Programming <span className="gradient-text">Fundamentals</span></h1>
        <p className="rise font-mono text-2xl sm:text-4xl" style={{ color: "var(--warning)" }} aria-hidden>cout &lt;&lt; &quot;Hello, UMT!&quot;;<span className="caret" /></p>
        <div className="rise h-0.5 w-40 rounded-full" style={{ background: "linear-gradient(90deg, transparent, var(--warning), transparent)" }} aria-hidden />
        <p className="rise max-w-2xl text-lg text-muted sm:text-xl">Every topic first as a <strong className="text-text">picture</strong>, then in simple words. Ask the tutor, watch the animation, check yourself with a quiz. Answers come from your course lessons.</p>
        <div className="rise flex flex-wrap justify-center gap-3">
          <Link href="/chat" className="pill-btn pill-btn-solid">Start learning</Link>
          <Link href="/visual-lab" className="pill-btn pill-btn-line">Open Visual Lab</Link>
        </div>
        <div className="mt-4 w-full max-w-3xl text-start"><HeroDemo /></div>
      </section>

      <ContinueCard />

      <section aria-labelledby="road" className="grid gap-4" id="modules">
        <span id="roadmap" aria-hidden />
        <div className="grid gap-1">
          <h2 id="road" className="text-3xl font-bold">Choose a module</h2>
          <p className="max-w-3xl text-muted">The 16 weeks are split into {MODULES.length} modules: Pre-Midterm (weeks 1–8) and Post-Midterm (weeks 9–16). Open any sub-topic to learn it, press Lab to practise it in its workspace, or Chat to ask the tutor about just that lesson.</p>
        </div>
        <ModuleGrid modules={cards} />
      </section>

      <StatCounters stats={stats} />
      <DailyChallenge />
    </div>
  );
}
