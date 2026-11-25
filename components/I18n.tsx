"use client";
import type { ElementType, ReactNode } from "react";
import { STRINGS, hasUrdu, lessonName, tr, type Lang } from "@/lib/i18n";
import { useSettings } from "./SettingsProvider";

/** The student's language and helpers: t() for plain text (attributes, aria-labels), name() for lesson names. */
export function useT() {
  const { settings } = useSettings();
  const lang = settings.lang as Lang;
  return {
    lang,
    t: (key: string, vars?: Record<string, string | number>) => tr(lang, key, vars),
    name: (key: string, full: string) => lessonName(lang, key, full),
  };
}

/** Wrap Urdu-script text so only that text is right-to-left in the Urdu font; the page layout never flips. */
export function Txt({ children, block = false, className = "" }: { children: string; block?: boolean; className?: string }) {
  if (!hasUrdu(children)) return <>{children}</>;
  return <span lang="ur" dir="rtl" className={`${block ? "urdu-ui-block block" : "urdu-ui"} ${className}`.trim()}>{children}</span>;
}

/** Visible interface text from the dictionary, in the student's language. */
export function T({ k, vars, as: As, className }: { k: keyof typeof STRINGS | string; vars?: Record<string, string | number>; as?: ElementType; className?: string }): ReactNode {
  const { t } = useT();
  const text = t(k, vars);
  if (As) return <As className={className}><Txt block={false}>{text}</Txt></As>;
  return <Txt className={className}>{text}</Txt>;
}
