// Flesch Reading Ease (higher is easier): 206.835 - 1.015 * words/sentence - 84.6 * syllables/word. Used to keep the first lessons easy to read.
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

/** Words that are code, not prose, are ignored so `cout` or `i++` do not distort the score. */
export function prose(text: string): string {
  return text.replace(/`[^`]*`/g, " ").replace(/\b[A-Za-z_]\w*\([^)]*\)/g, " ").replace(/[A-Za-z_]\w*\+\+|\+\+\w+|[<>=!]=?|&&|\|\|/g, " ");
}

export function fleschEase(text: string): { score: number; words: number; sentences: number; longest: number } {
  const t = prose(text);
  const sentences = t.split(/(?<=[.!?:;])\s+|\n+/).map((s) => s.trim()).filter((s) => /[A-Za-z]/.test(s));
  const words = t.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
  if (!words.length || !sentences.length) return { score: 100, words: 0, sentences: 0, longest: 0 };
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const longest = Math.max(...sentences.map((s) => (s.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length));
  return { score: 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syl / words.length), words: words.length, sentences: sentences.length, longest };
}
