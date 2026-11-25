import type { Metadata } from "next";

// Never indexed, never cached.
export const metadata: Metadata = { title: "Instructor admin", robots: { index: false, follow: false, nocache: true } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}
