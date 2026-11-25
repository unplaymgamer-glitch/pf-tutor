import { NextResponse } from "next/server";
import { allTopics } from "@/lib/content";
import { topicAccess } from "@/lib/gate-logic";
import { getSiteState } from "@/lib/server/store";
import { pickDaily, type PoolQuestion } from "@/lib/game/pool";

export const dynamic = "force-dynamic";

// Question pool for the daily challenge, spaced review, practice hub and mock exams.
// Built from UNLOCKED lessons only, and switched off completely during exam mode or maintenance
// (this endpoint contains answers, so it must obey the same rules as the lesson pages).
export async function GET(req: Request) {
  // ?daily=YYYY-MM-DD returns only that day's single challenge question (the home page must not download every question).
  const dailyParam = new URL(req.url).searchParams.get("daily");
  const daily = dailyParam && /^\d{4}-\d{2}-\d{2}$/.test(dailyParam) ? dailyParam : null;
  const state = await getSiteState();
  const headers = { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "s-maxage=10, stale-while-revalidate=30" };
  if (state.maintenance) return NextResponse.json({ disabled: "maintenance" }, { headers });
  if (state.examMode) return NextResponse.json({ disabled: "exam-mode" }, { headers });
  const now = new Date();
  const questions: PoolQuestion[] = [];
  for (const t of allTopics()) {
    if (!topicAccess(state, t.week, t.slug, now).allowed) continue;
    const topicKey = `w${t.week}/${t.slug}`;
    for (const q of [...t.quiz, ...t.practice]) {
      questions.push({ key: `${topicKey}#${q.id}`, topicKey, week: t.week, topicTitle: t.title, type: q.type, difficulty: q.difficulty, prompt: q.prompt, options: q.options, answer: q.answer, hint: q.hint, explanation: q.explanation });
    }
  }
  if (daily) {
    const pick = pickDaily(questions, daily);
    return NextResponse.json({ questions: pick ? [pick] : [] }, { headers });
  }
  return NextResponse.json({ questions }, { headers });
}
