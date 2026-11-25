"use client";
import { usePathname } from "next/navigation";

/** The instructor admin page has its own layout: no student menu, banner, footer or tutor button. */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  return path === "/admin" || path.startsWith("/admin/") ? null : <>{children}</>;
}
