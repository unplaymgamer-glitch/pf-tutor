import { SITE_NAME } from "@/lib/site";

/** Full-screen notice shown to students while the website is switched OFF. Covers the whole page, contains no course content. */
export function SiteClosed() {
  return (
    <div role="status" className="fixed inset-0 z-[100] grid place-items-center overflow-auto bg-bg p-6 text-center">
      <div className="grid max-w-md gap-3">
        <p className="text-5xl" aria-hidden>🔒</p>
        <h1 className="text-3xl font-semibold">{SITE_NAME} is closed right now</h1>
        <p className="text-muted">Your instructor has switched the website off for the moment. Please check again later, or ask your instructor when it will open.</p>
      </div>
    </div>
  );
}
