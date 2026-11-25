import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/game/ProgressDashboard";

export const metadata: Metadata = { title: "My progress", description: "Your XP, level, streak, badges and review cards. Stored on your device." };

export default function ProgressPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold">My progress</h1>
      <p className="text-muted">Everything here is stored on this device. No login needed.</p>
      <ProgressDashboard />
    </div>
  );
}
