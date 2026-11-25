import { getSiteState } from "@/lib/server/store";
import { SiteClosed } from "@/components/SiteClosed";

// Every student page lives in this group. When the instructor switches the website OFF (Admin → ON/OFF switch),
// the page content is never rendered: students only see the "closed" screen. The admin area is outside this group.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const state = await getSiteState();
  if (state.maintenance) return <SiteClosed />;
  return children;
}
