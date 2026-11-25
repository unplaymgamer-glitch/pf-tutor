export type Lang = "en" | "roman" | "ur";
export type Entry = { en: string; roman: string; ur: string };

/** Fill "{name}" placeholders. */
export function fill(text: string, vars?: Record<string, string | number>): string {
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}

/** One entry in the chosen language. A missing key shows the key itself (never a blank), and a missing language falls back to English. */
export function pick(table: Record<string, Entry>, lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const e = table[key];
  if (!e) return key;
  return fill(e[lang] || e.en, vars);
}

/** Does the text contain Urdu (Arabic-script) letters? Such text is set right-to-left in the Urdu font. */
export const hasUrdu = (t: string) => /[؀-ۿ]/.test(t);
