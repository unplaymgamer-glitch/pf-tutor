import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Reviewed Roman Urdu and Urdu text for every lesson's opening fields (content-i18n/<lang>/week-NN/<slug>.json).
const FIELDS = ["goal", "warmup", "definition", "howItWorks"] as const;
const lessons = readdirSync("content").flatMap((d) => readdirSync(join("content", d)).filter((f) => f.endsWith(".json")).map((f) => ({ d, f, en: JSON.parse(readFileSync(join("content", d, f), "utf8")) as Record<string, string> })));
const ARABIC = /[\u0600-\u06FF]/g, LATIN = /[A-Za-z]/g;
const ROMAN_WORDS = /\b(hai|hain|aur|ke|ki|ko|mein|se|karein|yeh|woh|jab|tab|kaise|kyun)\b/gi;

describe("lesson translations", () => {
  it("exist for every lesson in both languages (79 x 2)", () => {
    const missing: string[] = [];
    for (const l of lessons) for (const lang of ["roman", "ur"]) if (!existsSync(join("content-i18n", lang, l.d, l.f))) missing.push(`${lang}/${l.d}/${l.f}`);
    expect(missing).toEqual([]);
  });
  for (const lang of ["roman", "ur"] as const) {
    it(`${lang}: valid JSON with the four fields, real translations, right script`, () => {
      const problems: string[] = [];
      for (const l of lessons) {
        const p = join("content-i18n", lang, l.d, l.f);
        if (!existsSync(p)) continue;
        let j: Record<string, string>;
        try { j = JSON.parse(readFileSync(p, "utf8")); } catch { problems.push(`${p}: invalid JSON`); continue; }
        if (Object.keys(j).sort().join() !== [...FIELDS].sort().join()) { problems.push(`${p}: keys ${Object.keys(j).join()}`); continue; }
        for (const k of FIELDS) {
          const t = j[k], en = l.en[k];
          if (typeof t !== "string" || t.trim().length < 15) { problems.push(`${p}.${k}: too short`); continue; }
          if (t.trim() === en.trim()) problems.push(`${p}.${k}: identical to English`);
          const ratio = t.length / en.length;
          if (ratio < 0.45 || ratio > 2.2) problems.push(`${p}.${k}: length ratio ${ratio.toFixed(2)}`);
          const ar = (t.match(ARABIC) ?? []).length, la = (t.match(LATIN) ?? []).length;
          if (lang === "roman") {
            if (ar > 0) problems.push(`${p}.${k}: Arabic script in Roman Urdu`);
            if ((t.match(ROMAN_WORDS) ?? []).length < 1 && t.length > 120) problems.push(`${p}.${k}: does not look like Roman Urdu`);
          } else if (ar / Math.max(1, ar + la) < 0.4) problems.push(`${p}.${k}: not mostly Urdu script (${ar} Urdu vs ${la} Latin letters)`);
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
