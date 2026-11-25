import MiniSearch from "minisearch";
import type { Topic } from "../content-schema";

// Tier 0: free search over the instructor's lessons. Used (a) to answer plain "what is X?" questions without any AI call,
// and (b) to hand the best-matching lesson excerpts to Claude as <course_notes>.
export type Hit = { topic: Topic; score: number; confidence: number };

const STOP = new Set(("a an the is are was were be been being of in on at to for from by with and or but not do does did what whats which who whom whose how why when where " +
  "tell me about explain define meaning mean means simple simply easy please can could would should it its this that these those use used using " +
  "kya hai hain ka ki ke ko se me mein par aur yeh ye wo woh batao bata samjhao samjha detail likho bataye").split(" "));

// Symbols students type instead of words, mapped to the words the lessons use.
const SYMBOLS: [RegExp, string][] = [
  [/&&|\|\|/g, " logical operators "], [/\?[^:?]*:/g, " ternary conditional operator "], [/\+\+|--/g, " increment decrement unary "],
  [/[+\-*/%]=/g, " assignment operators "], [/==|!=|<=|>=/g, " relational operators "], [/<</g, " cout output "], [/>>/g, " cin input "],
  [/%/g, " modulus arithmetic operators "], [/\bcin\b/g, " cin input "], [/\bcout\b/g, " cout output "],
];

export const terms = (q: string): string[] => {
  let s = q.toLowerCase();
  for (const [re, w] of SYMBOLS) s = s.replace(re, w);
  return [...new Set(s.replace(/[^a-z0-9+\-#_ ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && (w.length > 1 || /\d/.test(w))))];
};

const haystack = (t: Topic) => `${t.title} ${t.sources.join(" ")} ${t.slug.replace(/-/g, " ")}`.toLowerCase();

export class CourseSearch {
  private ms: MiniSearch<{ id: string; title: string; goal: string; body: string; sources: string }>;
  private byId = new Map<string, Topic>();
  constructor(topics: Topic[]) {
    this.ms = new MiniSearch({ fields: ["title", "sources", "goal", "body"], storeFields: ["id"], searchOptions: { prefix: true, fuzzy: 0.15, boost: { title: 4, sources: 3, goal: 1.5 }, combineWith: "OR" } });
    this.ms.addAll(topics.map((t) => {
      const id = `${t.week}/${t.slug}`;
      this.byId.set(id, t);
      return { id, title: t.title, goal: t.goal, sources: t.sources.join(" "), body: [t.definition, t.warmup, t.howItWorks, ...t.examTips, ...t.romanSummary, ...t.mistakes.map((m) => m.wrong)].join(" ") };
    }));
  }

  /** Ranked lessons. confidence = share of the question's key words found in the lesson title/sources (precision-oriented). */
  search(query: string, limit = 3): Hit[] {
    const ts = terms(query);
    if (!ts.length) return [];
    const res = this.ms.search(ts.join(" ")).slice(0, Math.max(limit, 15)); // wide pool: the earliest-week tie-break below needs to see lessons that score lower
    const hits = res.map((r) => {
      const t = this.byId.get(r.id as string)!;
      const h = haystack(t);
      const found = ts.filter((w) => h.includes(w)).length;
      return { topic: t, score: r.score, confidence: found / ts.length };
    });
    // A concept is defined where it is first introduced: among equally confident lessons prefer the earliest week
    // (so "what is a variable" opens Variables in Week 1, not the Week 7 lesson on variable scope).
    const top = Math.max(...hits.map((h) => h.score), 0);
    const strong = (h: Hit) => h.score >= top * 0.25;
    return hits.sort((a, b) => b.confidence - a.confidence || (strong(a) && strong(b) ? a.topic.week - b.topic.week : b.score - a.score)).slice(0, limit);
  }
}

/** "What is X / define X / X kya hai" style: a short definitional question. */
export const isDefinitional = (q: string): boolean => {
  const s = q.trim().toLowerCase();
  if (s.length > 90 || /[`{};]/.test(s) || /\n/.test(s)) return false;
  // Questions about a specific program, an error or a "why" need reasoning, not a definition.
  if (/\b(output|prints?|this (program|code|loop|line)|my (code|program|loop)|error|fix|wrong|bug|trace|why|how (do|can|to)|example|show|write)\b/.test(s)) return false;
  return /^(what('| i)?s|what is|what are|define|meaning of|explain|tell me about)\b/.test(s) || /\b(kya hai|kya hota|kya hoti|kya hain|ka matlab|ki definition)\b/.test(s) || terms(s).length <= 3;
};

/**
 * Answer straight from the notes when the question is a short definition question and a lesson title/sources clearly match.
 * Returns null when Claude should answer instead.
 */
export function tier0Answer(query: string, hits: Hit[], lang: "en" | "roman" | "ur", threshold: number): { text: string; lessonKey: string } | null {
  if (!isDefinitional(query) || !hits.length) return null;
  const top = hits[0];
  if (top.confidence < threshold) return null;
  const t = top.topic;
  const link = `/week-${t.week}/${t.slug}`;
  const roman = t.romanSummary.slice(0, 3).map((s) => `- ${s}`).join("\n");
  const body =
    lang === "roman"
      ? `**${t.title}** (Week ${t.week})\n\n${t.definition}\n\nAasaan lafzon mein:\n${roman}\n\nPoora lesson: ${link}`
      : `**${t.title}** (Week ${t.week})\n\n${t.definition}\n\n${lang === "ur" ? "مکمل سبق / Full lesson" : "Full lesson"}: ${link}\n\n_Ask a follow-up or press "Answer more deeply" for an AI explanation._`;
  return { text: body, lessonKey: `${t.week}/${t.slug}` };
}

/** Instructor-written answers win: all comma-separated keywords must appear in the question. */
export function matchInstructorAnswer(question: string, answers: { keywords: string; answer: string }[]): string | null {
  const q = question.toLowerCase();
  let best: { n: number; a: string } | null = null;
  for (const a of answers) {
    const kws = a.keywords.toLowerCase().split(",").map((k) => k.trim()).filter(Boolean);
    if (kws.length && kws.every((k) => q.includes(k)) && (!best || kws.length > best.n)) best = { n: kws.length, a: a.answer };
  }
  return best?.a ?? null;
}

/** Excerpts for Claude (volatile part of the prompt). Short on purpose: cost and focus. */
export function notesFor(hits: Hit[], limit = 3): string {
  return hits.slice(0, limit).filter((h) => h.confidence > 0 || h.score > 5).map((h) => {
    const t = h.topic;
    return `# ${t.title} (Week ${t.week}, /week-${t.week}/${t.slug})\nGoal: ${t.goal}\nDefinition: ${t.definition}\nCommon mistakes: ${t.mistakes.slice(0, 2).map((m) => `${m.wrong} -> ${m.right}`).join(" | ")}\nExam tips: ${t.examTips.slice(0, 3).join(" ")}`;
  }).join("\n\n");
}
