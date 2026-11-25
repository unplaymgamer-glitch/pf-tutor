import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Footer() {
  const a = "inline-flex min-h-11 items-center px-2 text-sm no-underline hover:text-primary";
  return (
    <footer className="border-t border-border print:hidden">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-2 px-4 py-3 text-sm text-muted">
        <span>{SITE_NAME} · built for UMT CC111 students</span>
        <nav aria-label="Footer" className="ms-auto flex flex-wrap">
          <Link className={a} href="/revision/mid">Mid-term hub</Link>
          <Link className={a} href="/revision/final">Final hub</Link>
          <Link className={a} href="/playground">Playground</Link>
          <Link className={a} href="/privacy">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
