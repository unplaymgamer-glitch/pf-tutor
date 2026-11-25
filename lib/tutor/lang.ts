export type TutorLang = "en" | "roman" | "ur";

const EN = /\b(in|into|answer in|reply in|explain in|tell me in|speak in|use)\s+english\b|\benglish\s+(me|mein|mai|main|men|may|please|pls|plz|likho|likhein|likhen|bolo|batao|batain|samjhao|samjhain)\b|انگریزی\s+(میں|مين)/i;
const ROMAN = /\broman\s+(urdu|english)\b|\broman\s+(me|mein|mai|main)\b|\b(urdu|hindi)\s+(me|mein|mai|main)\b/i;
const UR = /\bin\s+urdu\s+script\b|\burdu\s+script\b|\bnastaliq\b|اردو\s+(میں|مين)|اردو\s+رسم/i;

/** Did the student ask, in this message, for the answer in a particular language? Returns that language, or null when they did not (then their saved choice applies).
 *  The request belongs to that student only: it is saved in their own browser, never shared. */
export function detectLangRequest(text: string): TutorLang | null {
  const t = text.slice(0, 600);
  if (UR.test(t)) return "ur";
  if (ROMAN.test(t)) return "roman";
  if (EN.test(t)) return "en";
  return null;
}
