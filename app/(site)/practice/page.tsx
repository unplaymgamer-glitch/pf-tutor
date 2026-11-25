import type { Metadata } from "next";
import { PracticeHub } from "@/components/game/PracticeHub";

export const metadata: Metadata = { title: "Practice hub", description: "Practice questions for every open chapter, filtered by topic, difficulty and type." };

export default function PracticePage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold">Practice hub</h1>
      <PracticeHub />
    </div>
  );
}
