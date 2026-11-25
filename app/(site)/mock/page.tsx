import type { Metadata } from "next";
import { MockExam } from "@/components/game/MockExam";

export const metadata: Metadata = { title: "Mock exams", description: "Timed Mid-term and Final practice exams with a score by topic." };

export default function MockPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold">Mock exams</h1>
      <MockExam />
    </div>
  );
}
