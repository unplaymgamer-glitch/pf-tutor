// Chooses the cheapest tier that can answer well. Pure heuristics (unit-tested), no model call.
// Tier 0: free course search / instructor answer. Tier 1: free provider slot (not enabled, see docs/DECISIONS.md).
// Tier 2: Claude. "haiku" for medium questions, "sonnet" for hard ones.
import type { ModelKey } from "./pricing";

export type RouteInput = {
  text: string;
  hasCode: boolean;       // code pasted or attached
  hasImage: boolean;
  lang: "en" | "roman" | "ur";
  turns: number;          // user messages so far in this chat
  deep: boolean;          // student pressed "Answer more deeply"
};
export type Route = { model: ModelKey; effort: "low" | "medium"; reason: string; maxTokens: number };

const HARD_WORDS = /\b(why|debug|bug|wrong|error|trace|dry\s*run|step[- ]by[- ]step|compare|difference|versus|vs\.?|optimi[sz]e|complexity|prove|explain (?:deeply|in detail)|segmentation|crash|infinite|memory leak|dangling|pointer arithmetic|recursion tree)\b/i;
const ROMAN_HARD = /\b(kyun|kyon|wajah|farq|samjha|tafseel|detail|masla|galti|nahi chal|kaam nahi)\b/i;

const MAKE = /\b(quiz|quizzes|assignment|exam|paper|mcqs?|worksheet|same format|similar (?:questions|quiz|assignment)|like (?:mine|this|my))\b/i;

const QUESTIONY = /^(what|why|how|when|where|which|who|explain|is|are|can|does|do|did|should|will|write|make|give|show|solve|fix|help|tell)\b/i;
/** A bare topic such as "nested loop" or "2D array" (no question, no code, at most four words): the student wants the whole picture. */
export function isOneLiner(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 60 || /[?;{}()=<>#]/.test(t) || QUESTIONY.test(t)) return false;
  return t.split(/\s+/).length <= 4;
}

export function routeQuestion(i: RouteInput): Route {
  const len = i.text.length;
  if (i.deep) return { model: "sonnet", effort: "medium", reason: "student asked for a deeper answer", maxTokens: 1800 };
  // Making a quiz or assignment in the format of the student's own sample needs a stronger model and room to write.
  if (MAKE.test(i.text) && (i.hasCode || i.hasImage || len > 400)) return { model: "sonnet", effort: "medium", reason: "make material in the format of the student's sample", maxTokens: 4000 };
  if (isOneLiner(i.text) && !i.hasCode && !i.hasImage) return { model: "sonnet", effort: "low", reason: "one-line topic: full exam-ready guide", maxTokens: 3600 };
  const hard = HARD_WORDS.test(i.text) || (i.lang !== "en" && ROMAN_HARD.test(i.text));
  if (i.hasCode && (hard || len > 600)) return { model: "sonnet", effort: "medium", reason: "code that needs debugging or tracing", maxTokens: 1800 };
  if (i.hasImage) return { model: "sonnet", effort: "low", reason: "image of code or an error", maxTokens: 1500 };
  if (i.lang === "ur" && len > 160) return { model: "sonnet", effort: "low", reason: "long Urdu-script answer needs stronger language quality", maxTokens: 1500 };
  if (len > 900 || i.turns >= 8) return { model: "sonnet", effort: "low", reason: "long question or long conversation", maxTokens: 1500 };
  if (hard) return { model: "haiku", effort: "medium", reason: "needs reasoning but is short", maxTokens: 1200 };
  return { model: "haiku", effort: "low", reason: "simple question", maxTokens: 900 };
}
