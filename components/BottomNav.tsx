"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { T } from "./I18n";

const ITEMS = [
  { href: "/", label: "nav.home", icon: "🏠" },
  { href: "/#modules", label: "nav.modules", icon: "🗺️" },
  { href: "/chat", label: "nav.ask", icon: "💬" },
  { href: "/practice", label: "nav.practice", icon: "✍️" },
  { href: "/playground", label: "nav.playground", icon: "▶️" },
  { href: "/more", label: "nav.more", icon: "☰" },
];

/** Phone-only bottom navigation (thumb reach). Desktop uses the top bar. */
export function BottomNav() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : it.href.startsWith("/#") ? false : path.startsWith(it.href);
          return (
            <li key={it.label}>
              <Link href={it.href} aria-current={active ? "page" : undefined} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs no-underline" style={active ? { color: "var(--primary)", fontWeight: 700, boxShadow: "inset 0 3px 0 var(--primary)" } : undefined}>
                <span aria-hidden className="text-lg leading-none">{it.icon}</span><T k={it.label} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
