import type { Metadata } from "next";
import { ReviewDeck } from "@/components/game/ReviewDeck";

export const metadata: Metadata = { title: "Review today", description: "Spaced review of the questions you missed." };

export default function ReviewPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold">Review today</h1>
      <p className="text-muted">Questions you missed come back after 1, 3, 7, 14 and 30 days, so they stick.</p>
      <ReviewDeck />
    </div>
  );
}
