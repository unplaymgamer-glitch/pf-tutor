import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: "What this site is, who it is for and how it is built." };

export default function AboutPage() {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold">About <span className="gradient-text">{SITE_NAME}</span></h1>
        <p className="text-muted">A free study companion for the BSCS course CC111 Programming Fundamentals (C++) at the University of Management and Technology, Lahore.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li className="card"><h2 className="font-semibold">📚 Follows the course</h2><p className="text-muted">16 weeks in the order of the official outline, with the instructor&apos;s notes and slides as the source.</p></li>
        <li className="card"><h2 className="font-semibold">✅ Checked code</h2><p className="text-muted">Every code example is compiled and run, and the output you see is the real output.</p></li>
        <li className="card"><h2 className="font-semibold">🎬 Learn by seeing</h2><p className="text-muted">Animations, step-by-step traces and tables come before long explanations.</p></li>
        <li className="card"><h2 className="font-semibold">🔓 No login</h2><p className="text-muted">Progress stays on your device. See the <Link href="/privacy">Privacy page</Link>.</p></li>
      </ul>
      <section className="box box-definition grid gap-1">
        <h2 className="text-lg font-semibold">Open source</h2>
        <p>The code is public (MIT licence) at <a href="https://github.com/unplaymgamer-glitch/pf-tutor" rel="noopener noreferrer">github.com/unplaymgamer-glitch/pf-tutor</a>. This site supports your study; it does not replace your lectures or your instructor.</p>
      </section>
    </div>
  );
}
