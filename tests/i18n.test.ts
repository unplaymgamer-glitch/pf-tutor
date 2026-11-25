import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STRINGS, TITLE_KEYS, lessonName, tr } from "@/lib/i18n";
import { SHORT_TITLE_KEYS } from "@/lib/short-titles";

const URDU = /[\u0600-\u06FF]/;

describe("every interface string exists in all three languages", () => {
  it("English, Roman Urdu and Urdu are all filled in", () => {
    for (const [k, e] of Object.entries(STRINGS)) {
      expect(e.en.trim(), `${k} en`).not.toBe("");
      expect(e.roman.trim(), `${k} roman`).not.toBe("");
      expect(e.ur.trim(), `${k} ur`).not.toBe("");
    }
  });
  it("Urdu entries use Urdu script (or are pure symbols/names), Roman entries never do, English never does", () => {
    for (const [k, e] of Object.entries(STRINGS)) {
      expect(URDU.test(e.en), `${k} en has Urdu letters`).toBe(false);
      expect(URDU.test(e.roman), `${k} roman has Urdu letters`).toBe(false);
      if (/[A-Za-z]{4,}/.test(e.en.replace(/\{\w+\}/g, "")) && !/^(UMT|CC111|XP|FAQ|Lab|Chat|Code|Syntax)/i.test(e.en)) expect(URDU.test(e.ur), `${k} ur should be Urdu script: ${e.ur}`).toBe(true);
    }
  });
  it("placeholders match across the three languages", () => {
    for (const [k, e] of Object.entries(STRINGS)) {
      const ph = (x: string) => [...x.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
      expect(ph(e.roman), `${k} roman`).toBe(ph(e.en));
      expect(ph(e.ur), `${k} ur`).toBe(ph(e.en));
    }
  });
});

describe("lookups", () => {
  it("fill placeholders and fall back to the key, never a blank", () => {
    expect(tr("roman", "mod.subtopics", { n: 8 })).toBe("8 sub-topics");
    expect(tr("ur", "mod.subtopics", { n: 8 })).toContain("8");
    expect(tr("en", "no.such.key")).toBe("no.such.key");
  });
  it("lesson names exist in all three languages for every lesson", () => {
    expect([...SHORT_TITLE_KEYS].filter((k) => !TITLE_KEYS.includes(k))).toEqual([]);
    for (const k of SHORT_TITLE_KEYS) { expect(URDU.test(lessonName("ur", k, "x")), k).toBe(true); expect(lessonName("roman", k, "x").length).toBeGreaterThan(2); }
  });
});

describe("components only use keys that exist", () => {
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (!["node_modules", ".next"].includes(f)) walk(p); } else if (/\.tsx$/.test(f)) files.push(p); } };
  walk("components"); walk("app");
  it("every t(\"…\") / <T k=\"…\" /> key is defined", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/\b(?:t|tx)\(\s*"([a-z]\w*\.\w+)"/g)) if (!STRINGS[m[1]]) missing.push(`${f}: ${m[1]}`);
      for (const m of src.matchAll(/<T k="([^"]+)"/g)) if (!STRINGS[m[1]]) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
});
