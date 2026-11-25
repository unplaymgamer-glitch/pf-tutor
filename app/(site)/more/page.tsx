import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "More", description: "Every page of the site in one list." };

const GROUPS: { title: string; items: [string, string, string][] }[] = [
  { title: "Learn", items: [["/#roadmap", "🗺️", "Course map (16 weeks)"], ["/search", "🔍", "Search lessons"], ["/how-to-study", "🧭", "How to study"]] },
  { title: "Practise", items: [["/practice", "✍️", "Practice questions"], ["/review", "🔁", "Daily review"], ["/mock", "⏱️", "Mock exams"], ["/playground", "▶️", "Playground (run C++)"]] },
  { title: "Revise", items: [["/revision/mid", "🏁", "Mid-term hub (Weeks 1–8)"], ["/revision/final", "🏆", "Final hub (Weeks 1–16)"], ["/progress", "📈", "My progress and badges"]] },
  { title: "About", items: [["/faq", "❓", "FAQ"], ["/about", "ℹ️", "About this site"], ["/privacy", "🔒", "Privacy"]] },
];

export default function MorePage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">More</h1>
      {GROUPS.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`} className="grid gap-2">
          <h2 id={`g-${g.title}`} className="text-lg font-semibold text-muted">{g.title}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {g.items.map(([href, icon, label]) => (
              <li key={href}><Link href={href} className="card card-link flex min-h-14 items-center gap-3"><span aria-hidden className="text-xl">{icon}</span>{label}</Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
