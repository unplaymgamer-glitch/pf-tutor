import { allTopics } from "@/lib/content";
import { CHAPTERS } from "@/lib/course";
import { topicAccess } from "@/lib/gate-logic";
import { clientKey } from "@/lib/server/admin-auth";
import { getSiteState, getStore } from "@/lib/server/store";
import { anthropicConfigured, makeProvider } from "@/lib/server/tutor-anthropic";
import { MAX_BODY_BYTES, TutorRequest } from "@/lib/tutor/guard";
import { MockProvider, type AIProvider } from "@/lib/tutor/provider";
import { CourseSearch } from "@/lib/tutor/search";
import { runTutor, type TutorEvent } from "@/lib/tutor/service";
import { DEFAULT_TUTOR } from "@/lib/tutor/settings";
import type { Topic } from "@/lib/content-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const noStore = { "Cache-Control": "no-store" };

// One search index per set of open lessons, kept in memory between requests.
const g = globalThis as unknown as { __tutorSearch?: { key: string; s: CourseSearch } };
function searchFor(topics: Topic[]): CourseSearch {
  const key = topics.map((t) => `${t.week}/${t.slug}`).join(",");
  if (g.__tutorSearch?.key !== key) g.__tutorSearch = { key, s: new CourseSearch(topics) };
  return g.__tutorSearch.s;
}

function pickProvider(): AIProvider | null {
  if (process.env.TUTOR_PROVIDER === "mock") return new MockProvider("This is a mock tutor answer (no AI was called).");
  return makeProvider();
}

/** Status for the chat panel: is the tutor on, is an AI connected. Contains no secrets. */
export async function GET() {
  const store = getStore();
  const s = await store.getTutorSettings().catch(() => null);
  return Response.json({ enabled: s?.enabled ?? true, ai: anthropicConfigured() || process.env.TUTOR_PROVIDER === "mock", dailyPerDevice: s?.dailyPerDevice ?? 20 }, { headers: noStore });
}

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return Response.json({ error: "Request too large" }, { status: 413, headers: noStore });
  const parsed = TutorRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400, headers: noStore });

  const state = await getSiteState();
  if (state.maintenance) return Response.json({ error: "maintenance" }, { status: 503, headers: noStore });

  const store = getStore();
  const now = new Date();
  const open = allTopics().filter((t) => topicAccess(state, t.week, t.slug, now).allowed);
  const [settings, instructorAnswers] = await Promise.all([store.getTutorSettings().catch(() => undefined), store.listInstructorAnswers().catch(() => [])]);
  const r = parsed.data;
  // Uploads disabled by the instructor: drop attachments server-side (not just hide the button).
  if (!state.features.upload) { delete r.file; delete r.images; delete r.pdfs; }

  const events = runTutor(
    {
      store, provider: pickProvider(), topics: open, search: searchFor(open),
      chapterTitles: Object.fromEntries(CHAPTERS.map((c) => [c.week, c.title])),
      instructorAnswers: instructorAnswers.map((a) => ({ keywords: a.keywords, answer: a.answer })),
      settings: settings ?? DEFAULT_TUTOR, clientKey: clientKey(req), now,
    },
    r,
  );

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: TutorEvent) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      try { for await (const e of events) send(e); }
      catch { send({ type: "error", code: "provider", message: "The tutor could not answer just now. Please try again in a moment." }); }
      controller.close();
    },
    cancel() { void events.return(undefined); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
