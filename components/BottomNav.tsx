"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/#roadmap", label: "Learn", icon: "🗺️" },
  { href: "/practice", label: "Practice", icon: "✍️" },
  { href: "/playground", label: "Playground", icon: "▶️" },
  { href: "/more", label: "More", icon: "☰" },
];

/** Phone-only bottom navigation (thumb reach). Desktop uses the top bar. */
export function BottomNav() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : it.href.startsWith("/#") ? false : path.startsWith(it.href);
          return (
            <li key={it.label}>
              <Link href={it.href} aria-current={active ? "page" : undefined} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs no-underline" style={active ? { color: "var(--primary)", fontWeight: 700, boxShadow: "inset 0 3px 0 var(--primary)" } : undefined}>
                <span aria-hidden className="text-lg leading-none">{it.icon}</span>{it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
