import Link from "next/link";
import type { Access } from "@/lib/gate-logic";

/** Shown instead of a lesson. Contains only the week number and chapter title, never lesson content. */
export function Locked({ reason, week, chapterTitle }: { reason: Access["reason"]; week: number; chapterTitle: string }) {
  const maintenance = reason === "maintenance";
  return (
    <div className="box box-definition grid gap-2" role="status">
      <h1 className="text-2xl font-semibold">{maintenance ? "Site is in maintenance" : "Coming soon 🔒"}</h1>
      <p>
        {maintenance
          ? "Lessons are paused for a short time. Please check again soon."
          : `Week ${week}${chapterTitle ? ` (${chapterTitle})` : ""} will open after it is taught in class. You will see it here as soon as your instructor opens it.`}
      </p>
      <p><Link className="btn btn-primary inline-flex items-center" href="/">Back to home</Link></p>
    </div>
  );
}
