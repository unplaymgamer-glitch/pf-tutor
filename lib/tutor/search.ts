import MiniSearch from "minisearch";
import type { Topic } from "../content-schema";

// Tier 0: free search over the instructor's lessons. Used (a) to answer plain "what is X?" questions without any AI call,
// and (b) to hand the best-matching lesson excerpts to Claude as <course_notes>.
export type Hit = { topic: Topic; score: number; confidence: number };

const STOP = new Set(("a an the is are was were be been being of in on at to for from by with and or but not do does did what whats which who whom whose how why when where " +
  "tell me about explain define meaning mean means simple simply easy please can could would should it its this that these those use used using " +
  "difference differences between versus vs syntax example examples steps step work works need needs want we you i my your into inside " +
  "kya hai hain hota hoti ka ki ke ko se me mein par aur yeh ye wo woh batao bata samjhao samjha detail likho bataye").split(" "));

// Symbols students type instead of words, mapped to the words the lessons use.
const SYMBOLS: [RegExp, string][] = [
  [/c\+\+/g, " "], [/&&|\|\|/g, " logical operators "], [/\?[^:?]*:/g, " ternary conditional operator "], [/\+\+|--/g, " increment decrement unary "],
  [/[+\-*/%]=/g, " assignment operators "], [/==|!=|<=|>=/g, " relational operators "], [/<</g, " cout output "], [/>>/g, " cin input "],
  [/%/g, " modulus arithmetic operators "], [/\bcin\b/g, " cin input "], [/\bcout\b/g, " cout output "],
];

// Words students use -> words the lessons use (matched after stemming).
const ALIAS: Record<string, string[]> = {
  "2d": ["two", "dimensional"], "3d": ["three", "dimensional"], struct: ["structure"], structs: ["structure"], recursive: ["recursion"], matrices: ["matrix"],
  modulus: ["arithmetic"], modulo: ["arithmetic"], remainder: ["arithmetic"], largest: ["maximum"], smallest: ["minimum"], biggest: ["maximum"], lowest: ["minimum"],
  int: ["data", "type"], double: ["data", "type"], float: ["data", "type"], integer: ["data", "type"], pyramid: ["pattern"], diamond: ["pattern"], triangle: ["pattern"], stars: ["pattern"],
  ofstream: ["writing", "file"], ifstream: ["reading", "file"], fstream: ["file"], delete: ["new"], heap: ["stack"], vector: ["array"],
};

const stem = (w: string): string => (w.length < 4 ? w : w.replace(/(ing|ed|es|s|e)$/, ""));
const words = (text: string): string[] => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);

export const terms = (q: string): string[] => {
  let s = q.toLowerCase();
  for (const [re, w] of SYMBOLS) s = s.replace(re, w);
  return [...new Set(s.replace(/[^a-z0-9+\-#_ ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && (w.length > 1 || /\d/.test(w))))];
};

const haystack = (t: Topic) => `${t.title} ${t.sources.join(" ")} ${t.slug.replace(/-/g, " ")}`.toLowerCase();
const INTRO = /(^|-)(intro|purpose|why|what)(-|$)/;
const INTENT = /^\s*(what|why|define|explain|meaning|introduction)\b|\b(kya hai|kya hota|kya hoti|ka matlab)\b/i;

type Lex = { title: Set<string>; slug: Set<string>; sources: Set<string>; head: Set<string>; slugWords: string[] };

export class CourseSearch {
  private ms: MiniSearch<{ id: string; title: string; goal: string; body: string; sources: string }>;
  private byId = new Map<string, Topic>();
  private lex = new Map<string, Lex>();
  private idf = new Map<string, number>();
  constructor(topics: Topic[]) {
    this.ms = new MiniSearch({ fields: ["title", "sources", "goal", "body"], storeFields: ["id"], searchOptions: { prefix: true, fuzzy: 0.1, boost: { title: 4, sources: 3, goal: 1.5 }, combineWith: "OR" } });
    const df = new Map<string, number>();
    this.ms.addAll(topics.map((t) => {
      const id = `${t.week}/${t.slug}`;
      this.byId.set(id, t);
      const title = new Set(words(t.title).map(stem)), slugWords = words(t.slug), slug = new Set(slugWords.map(stem)), sources = new Set(words(t.sources.join(" ")).map(stem));
      const head = new Set(words(t.title.split(/[:(]/)[0]).map(stem));
      this.lex.set(id, { title, slug, sources, head, slugWords });
      for (const w of new Set([...title, ...slug, ...sources])) df.set(w, (df.get(w) ?? 0) + 1);
      return { id, title: t.title, goal: t.goal, sources: t.sources.join(" "), body: [t.definition, t.warmup, t.howItWorks, ...t.examTips, ...t.romanSummary, ...t.mistakes.map((m) => m.wrong)].join(" ") };
    }));
    for (const [w, n] of df) this.idf.set(w, Math.log(1 + topics.length / n));
  }

  /** Ranked lessons. confidence = share of the question's key words found in the lesson title/sources (precision-oriented). */
  search(query: string, limit = 3): Hit[] {
    const ts = terms(query);
    if (!ts.length) return [];
    // expanded, stemmed query words
    const q = new Set<string>();
    for (const t of ts) { q.add(stem(t)); for (const a of ALIAS[t] ?? []) q.add(stem(a)); }
    const raw = words(query.toLowerCase().replace(/c\+\+/g, " "));
    const intent = INTENT.test(query);
    const ms = new Map(this.ms.search([...q].join(" ")).slice(0, 40).map((r) => [r.id as string, r.score]));
    const hits: Hit[] = [];
    for (const [id, t] of this.byId) {
      const L = this.lex.get(id)!;
      let lexical = 0, matched = 0;
      for (const w of q) {
        const idf = this.idf.get(w) ?? 0;
        if (!idf) continue;
        const s = (L.title.has(w) ? 3 : 0) + (L.slug.has(w) ? 2 : 0) + (L.sources.has(w) ? 2 : 0);
        if (s) { lexical += idf * s; matched++; }
      }
      if (L.head.size) lexical += 4 * ([...L.head].filter((w) => q.has(w)).length / L.head.size);
      // a run of the lesson's slug words appearing in the question ("for loop", "pass by address", "array to function")
      let run = 0;
      for (let i = 0; i < L.slugWords.length; i++) for (let j = i + 1; j <= L.slugWords.length; j++) {
        const phrase = L.slugWords.slice(i, j);
        if (phrase.length >= 2 && phrase.length > run && raw.join(" ").includes(phrase.join(" "))) run = phrase.length;
      }
      lexical += run * 2.5;
      if (intent && INTRO.test(t.slug)) lexical += 2;
      const body = ms.get(id) ?? 0;
      if (lexical === 0 && body === 0) continue;
      const h = haystack(t);
      const found = ts.filter((w) => h.includes(w) || (ALIAS[w] ?? []).some((a) => h.includes(a))).length;
      hits.push({ topic: t, score: lexical + 0.12 * body + (matched ? 0 : 0), confidence: found / ts.length });
    }
    // among near-equal scores prefer the lesson where a concept is first introduced (earliest week)
    hits.sort((a, b) => (Math.abs(a.score - b.score) < 0.03 * Math.max(a.score, b.score) ? a.topic.week - b.topic.week : b.score - a.score));
    return hits.slice(0, limit);
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
