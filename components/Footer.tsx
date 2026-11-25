"use client";
import Link from "next/link";
import { T } from "./I18n";
import { SITE_NAME } from "@/lib/site";

export function Footer() {
  const a = "inline-flex min-h-11 items-center px-2 text-sm no-underline hover:text-primary";
  return (
    <footer className="border-t border-border print:hidden">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-2 px-4 py-3 text-sm text-muted">
        <span>{SITE_NAME} · <T k="nav.ofStudents" /></span>
        <nav aria-label="Footer" className="ms-auto flex flex-wrap">
          <Link className={a} href="/visual-lab"><T k="nav.visualLab" /></Link>
          <Link className={a} href="/chat"><T k="nav.ask" /></Link>
          <Link className={a} href="/revision/mid"><T k="foot.midHub" /></Link>
          <Link className={a} href="/revision/final"><T k="foot.finalHub" /></Link>
          <Link className={a} href="/playground"><T k="nav.playground" /></Link>
          <Link className={a} href="/how-to-study"><T k="foot.howToStudy" /></Link>
          <Link className={a} href="/faq"><T k="foot.faq" /></Link>
          <Link className={a} href="/about"><T k="foot.about" /></Link>
          <Link className={a} href="/privacy"><T k="foot.privacy" /></Link>
        </nav>
      </div>
    </footer>
  );
}
