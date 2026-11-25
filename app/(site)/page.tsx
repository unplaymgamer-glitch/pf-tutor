import Link from "next/link";
import { CHAPTERS } from "@/lib/course";
import { getTopics } from "@/lib/content";
import { ContinueCard } from "@/components/topic/ContinueCard";
import { DailyChallenge } from "@/components/game/DailyChallenge";
import { ChapterStatus } from "@/components/topic/ChapterStatus";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Course", name: "CC111 Programming Fundamentals (C++)", description: SITE_DESCRIPTION, inLanguage: "en", isAccessibleForFree: true,
    provider: { "@type": "CollegeOrUniversity", name: "University of Management and Technology, Lahore" },
  };
  return (
    <div className="grid gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section>
        <h1 className="text-3xl font-semibold">{SITE_NAME}: Programming Fundamentals</h1>
        <p className="text-muted">Learn C++ step by step. Everything for each topic is in one place. No login needed.</p>
      </section>
      <ContinueCard />
      <DailyChallenge />
      <section aria-labelledby="road">
        <h2 id="road" className="mb-2 text-xl font-semibold">Course roadmap (16 weeks)</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {CHAPTERS.map((c) => {
            const n = getTopics(c.week).length;
            return (
              <li key={c.week}>
                <Link href={`/week-${c.week}`} className="box block h-full no-underline">
                  <span className="text-sm text-muted">Week {c.week}{c.assessment ? ` · ${c.assessment}` : ""}</span>
                  <span className="block font-semibold">{c.title}</span>
                  <span className="block text-sm text-muted">{c.summary}</span>
                  <span className="mt-1 flex justify-between gap-2 text-sm"><span>{n ? `${n} lessons` : "Coming soon"}</span><ChapterStatus week={c.week} /></span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
