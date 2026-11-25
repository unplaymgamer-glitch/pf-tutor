// The tutor pipeline: cheapest reliable first.
//   Tier 0a instructor answer -> Tier 0b course notes (free) -> limits and budget -> Tier 2 Claude (Haiku, or Sonnet when hard).
// Pure orchestration with injected dependencies, so every rule is testable without a network or a database.
import type { Topic } from "../content-schema";
import { asData, cleanText, looksLikeInjection, trimHistory, TutorRequest } from "./guard";
import { MODELS, ModelKey, costMicros, estimateMicros, monthKey } from "./pricing";
import { buildSystem } from "./prompt";
import type { AIProvider, ChatBlock, ChatMessage } from "./provider";
import { isOneLiner, routeQuestion } from "./router";
import { CourseSearch, matchInstructorAnswer, notesFor, tier0Answer } from "./search";
import type { TutorSettings } from "./settings";

export type TutorEvent =
  | { type: "meta"; tier: 0 | 2; source: "instructor" | "notes" | "claude"; model?: string; reason?: string; lessonKey?: string }
  | { type: "delta"; text: string }
  | { type: "done"; costMicros: number; leftToday: number | null }
  | { type: "error"; code: "off" | "no-provider" | "limit-device" | "limit-ip" | "limit-deep" | "budget" | "provider" | "refused"; message: string; suggest?: { title: string; href: string }[] };

/** The slice of the store the pipeline needs. */
export interface TutorStore {
  incr(kind: string, key: string): Promise<number>;
  add(kind: string, key: string, amount: number): Promise<number>;
  counters(days: number): Promise<{ day: string; kind: string; key: string; n: number }[]>;
}

export type Deps = {
  store: TutorStore;
  provider: AIProvider | null;
  topics: Topic[];                 // UNLOCKED lessons only
  chapterTitles: Record<number, string>;
  instructorAnswers: { keywords: string; answer: string }[];
  settings: TutorSettings;
  clientKey: string;
  now: Date;
  search?: CourseSearch;
};

const FRIENDLY: Record<string, string> = {
  off: "The tutor is switched off right now. You can still search the lessons.",
  "no-provider": "The AI tutor is not connected yet. I can still show you matching lessons.",
  "limit-device": "You have used today's tutor questions. Come back tomorrow, or search the lessons and try the Review deck.",
  "limit-ip": "Many students are using the tutor from this network right now. Please try again a bit later.",
  "limit-deep": "You have used today's deep explanations. Ask a normal question, or try again tomorrow.",
  budget: "The tutor is resting for now (monthly limit reached). The course search still works.",
  provider: "The tutor could not answer just now. Please try again in a moment.",
  refused: "I cannot help with that request. Ask me something about C++ and your lessons.",
};

const links = (hits: { topic: Topic }[]) => hits.slice(0, 3).map((h) => ({ title: h.topic.title, href: `/week-${h.topic.week}/${h.topic.slug}` }));

export async function* runTutor(d: Deps, req: TutorRequest): AsyncGenerator<TutorEvent> {
  const s = d.settings;
  const search = d.search ?? new CourseSearch(d.topics);
  const history = trimHistory(req.messages.map((m) => ({ role: m.role, content: cleanText(m.content) })));
  const question = history[history.length - 1].content.trim();
  let hits = search.search(question, 3);
  // Per-topic tutor: the lesson the student is studying is always the first source, whatever words they use.
  const pinned = req.context?.topic ? d.topics.find((t) => `w${t.week}/${t.slug}` === req.context!.topic) : undefined;
  if (pinned) hits = [{ topic: pinned, score: 1, confidence: 1 }, ...hits.filter((h) => h.topic !== pinned)].slice(0, 3);
  const suggest = links(hits);
  const fail = (code: Extract<TutorEvent, { type: "error" }>["code"]): TutorEvent => ({ type: "error", code, message: FRIENDLY[code], suggest });

  if (!s.enabled) { yield fail("off"); return; }

  const hasExtras = !!(req.context?.code || req.context?.diagnostics || req.file || req.images?.length || req.pdfs?.length);

  // Tier 0a: the instructor's own answer.
  const ia = matchInstructorAnswer(question, d.instructorAnswers);
  if (ia && !hasExtras) {
    yield { type: "meta", tier: 0, source: "instructor" };
    yield { type: "delta", text: ia };
    yield { type: "done", costMicros: 0, leftToday: null };
    return;
  }
  // Tier 0b: a plain definition question the lessons answer directly. Free and instant.
  if (!hasExtras && !req.deep && !((pinned || isOneLiner(question)) && d.provider)) { // a topic chat goes to the AI when one is connected
    const t0 = tier0Answer(question, hits, req.lang, s.tier0Threshold);
    if (t0) {
      yield { type: "meta", tier: 0, source: "notes", lessonKey: t0.lessonKey };
      yield { type: "delta", text: t0.text };
      yield { type: "done", costMicros: 0, leftToday: null };
      return;
    }
  }

  // Tier 2 needs a provider, limits and budget.
  if (!d.provider) { yield fail("no-provider"); return; }
  if (s.dailyPerDevice <= 0) { yield fail("limit-device"); return; }
  const used = await d.store.incr("tutor-q", req.deviceId);
  if (used > s.dailyPerDevice) { yield fail("limit-device"); return; }
  if ((await d.store.incr("tutor-q-ip", d.clientKey)) > Math.max(30, s.dailyPerDevice * 4)) { yield fail("limit-ip"); return; }
  if (req.deep && (await d.store.incr("tutor-deep", req.deviceId)) > s.maxDeepPerDay) { yield fail("limit-deep"); return; }

  const route = routeQuestion({ text: question, hasCode: !!(req.context?.code || req.file), hasImage: !!(req.images?.length || req.pdfs?.length), lang: req.lang, turns: history.filter((m) => m.role === "user").length, deep: !!req.deep });
  const model: ModelKey = route.model;

  const month = monthKey(d.now);
  const rows = await d.store.counters(35);
  const spent = rows.filter((r) => r.kind === "tutor-micros" && r.key === month).reduce((n, r) => n + r.n, 0);
  const inputChars = history.reduce((n, m) => n + m.content.length, 0) + (req.context?.code?.length ?? 0) + (req.file?.text.length ?? 0) + (req.pdfs ?? []).reduce((n, p) => n + p.data.length / 2, 0) + 6000;
  if (spent + estimateMicros(model, inputChars, route.maxTokens) > s.monthlyBudgetUSD * 1_000_000) { yield fail("budget"); return; }

  // Build the messages. The student's own words are the question; everything pasted is wrapped as data.
  const suspicious = [question, req.context?.code, req.context?.diagnostics, req.file?.text].some((x) => !!x && looksLikeInjection(x));
  const system = buildSystem({ lang: req.lang, hintFirst: s.hintFirst, instructorAnswers: d.instructorAnswers, outline: outlineOf(d), suspicious });
  const msgs: ChatMessage[] = history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  const blocks: ChatBlock[] = [];
  for (const img of req.images ?? []) blocks.push({ type: "image", mediaType: img.mediaType, data: img.data });
  for (const pdf of req.pdfs ?? []) blocks.push({ type: "pdf", data: pdf.data });
  let text = `Student question:\n${question}`;
  if (req.context?.code) text += `\n\n${asData("student_code", req.context.code)}`;
  if (req.context?.stdin) text += `\n\nProgram input used: ${cleanText(req.context.stdin).slice(0, 200)}`;
  if (req.context?.diagnostics) text += `\n\n${asData("error_output", req.context.diagnostics)}`;
  if (req.file) text += `\n\n${asData("student_file", req.file.text, `name="${req.file.name.replace(/[^\w.\-]/g, "_")}"`)}`;
  const notes = notesFor(hits, 3);
  if (notes) text += `\n\n${asData("course_notes", notes)}`;
  blocks.push({ type: "text", text });
  msgs.push({ role: "user", content: blocks.length === 1 ? text : blocks });

  yield { type: "meta", tier: 2, source: "claude", model: MODELS[model].label, reason: route.reason, lessonKey: hits[0] ? `${hits[0].topic.week}/${hits[0].topic.slug}` : undefined };

  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } | null = null;
  let answered = false;
  try {
    for await (const c of d.provider.stream({ model, system, messages: msgs, maxTokens: route.maxTokens, effort: route.effort })) {
      if (c.type === "delta") { answered = true; yield { type: "delta", text: c.text }; }
      else if (c.type === "usage") usage = c.usage;
      else if (c.type === "refusal") { yield fail("refused"); }
    }
  } catch {
    if (!answered) { yield fail("provider"); return; }
    yield { type: "delta", text: "\n\n(The answer was cut short. Ask again if you need the rest.)" };
  }

  const cost = usage ? costMicros(model, usage) : 0;
  try {
    if (cost > 0) await d.store.add("tutor-micros", month, cost);
    await d.store.incr("tutor-model", model);
    if (hits[0]) { await d.store.incr("tutor-topic", `${hits[0].topic.week}/${hits[0].topic.slug}`); await d.store.incr("chat-topic", `week-${hits[0].topic.week}`); }
  } catch { /* accounting must never break the student's answer */ }
  yield { type: "done", costMicros: cost, leftToday: Math.max(0, s.dailyPerDevice - used) };
}

function outlineOf(d: Deps): string {
  const byWeek = new Map<number, string[]>();
  for (const t of d.topics) byWeek.set(t.week, [...(byWeek.get(t.week) ?? []), t.title]);
  return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([w, ts]) => `Week ${w} ${d.chapterTitles[w] ?? ""}: ${ts.join("; ")}`).join("\n");
}
