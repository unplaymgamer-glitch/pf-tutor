import { shortTitle } from "../short-titles";
import { CHAT } from "./chat";
import { pick, type Entry, type Lang } from "./core";
import { TITLES } from "./titles";
import { UI } from "./ui";

export type { Entry, Lang } from "./core";
export { hasUrdu } from "./core";
export const STRINGS: Record<string, Entry> = { ...UI, ...CHAT };

/** Interface text in the chosen language ("{n}" placeholders filled from vars). */
export const tr = (lang: Lang, key: string, vars?: Record<string, string | number>) => pick(STRINGS, lang, key, vars);

/** A lesson's one-line name in the chosen language. */
export function lessonName(lang: Lang, key: string, full: string): string {
  if (lang === "en") return shortTitle(key, full);
  return TITLES[key]?.[lang] ?? shortTitle(key, full);
}
export const TITLE_KEYS = Object.keys(TITLES);
