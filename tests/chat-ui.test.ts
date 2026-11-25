import { describe, expect, it } from "vitest";
import { parseBlocks, splitFences } from "@/components/tutor/Message";
import { groupByAge } from "@/lib/tutor/history";
import { MODULES, CHAPTERS } from "@/lib/course";

describe("chat message blocks", () => {
  it("turns headings, bullets, numbered lists and tables into blocks", () => {
    const b = parseBlocks("## Quiz 1\n\nInstructions here.\n\n1. First\n2. Second\n\n- a\n- b\n\n| Q | Marks |\n|---|---|\n| 1 | 2 |\n| 2 | 3 |");
    expect(b.map((x) => x.k)).toEqual(["h", "p", "ol", "ul", "table"]);
    expect(b[2]).toMatchObject({ items: ["First", "Second"] });
    expect(b[4]).toMatchObject({ head: ["Q", "Marks"], rows: [["1", "2"], ["2", "3"]] });
  });
  it("keeps plain text, never HTML, and still finds code fences", () => {
    expect(parseBlocks("<script>alert(1)</script>")).toEqual([{ k: "p", text: "<script>alert(1)</script>" }]);
    expect(splitFences("a\n```cpp\nint x;\n```\nb").map((p) => p.kind)).toEqual(["text", "code", "text"]);
  });
});

describe("sidebar grouping", () => {
  it("splits chats into Today, Previous 7 days and Older", () => {
    const now = new Date("2026-11-25T15:00:00").getTime(), day = 86_400_000;
    const g = groupByAge([{ updatedAt: now - 3600_000 }, { updatedAt: now - 3 * day }, { updatedAt: now - 30 * day }], now);
    expect(g.map((x) => [x.label, x.items.length])).toEqual([["Today", 1], ["Previous 7 days", 1], ["Older", 1]]);
    expect(groupByAge([], now)).toEqual([]);
  });
});

describe("modules", () => {
  it("cover all 16 weeks exactly once: 6 modules before the Mid-term, 4 after", () => {
    const weeks = MODULES.flatMap((m) => m.weeks).sort((a, b) => a - b);
    expect(weeks).toEqual(CHAPTERS.map((c) => c.week));
    expect(MODULES.filter((m) => m.phase === "pre")).toHaveLength(6);
    expect(MODULES.filter((m) => m.phase === "post")).toHaveLength(4);
    for (const m of MODULES) expect(m.phase).toBe(m.weeks.every((w) => w <= 8) ? "pre" : "post");
  });
});

import { SHORT_TITLE_KEYS, shortTitle } from "@/lib/short-titles";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("short sub-topic titles", () => {
  it("every lesson has a one-line name of at most four words", () => {
    const keys = readdirSync("content").flatMap((d) => readdirSync(join("content", d)).filter((f) => f.endsWith(".json")).map((f) => { const t = JSON.parse(readFileSync(join("content", d, f), "utf8")); return `w${t.week}/${t.slug}`; }));
    expect(keys.filter((k) => !SHORT_TITLE_KEYS.includes(k))).toEqual([]);
    for (const k of keys) { const s = shortTitle(k, "x"); expect(s.length, k).toBeLessThanOrEqual(28); expect(s.split(/\s+/).length, k).toBeLessThanOrEqual(5); expect(s, k).not.toContain(":"); }
  });
  it("falls back to the text before the colon for a new lesson", () => expect(shortTitle("w99/new", "Sets: unique values")).toBe("Sets"));
});

import { detectLangRequest } from "@/lib/tutor/lang";
describe("a student can ask for a language and only that student gets it", () => {
  it("detects English, Roman and Urdu-script requests, and nothing else", () => {
    for (const t of ["please answer in English", "English mein batao loops kya hain", "explain pointers in english", "انگریزی میں سمجھائیں"]) expect(detectLangRequest(t), t).toBe("en");
    for (const t of ["roman urdu mein samjhao", "Urdu mein batao", "answer in Roman English"]) expect(detectLangRequest(t), t).toBe("roman");
    for (const t of ["answer in urdu script", "اردو میں بتائیں"]) expect(detectLangRequest(t), t).toBe("ur");
    for (const t of ["What is a for loop?", "pointer kya hota hai", "my english teacher gave this assignment", "English alphabet program"]) expect(detectLangRequest(t), t).toBeNull();
  });
});

import { hasUrduScript } from "@/components/tutor/Message";
describe("Urdu script is detected per paragraph", () => {
  it("only Arabic-script text switches to right-to-left", () => {
    expect(hasUrduScript("لوپ کیا ہے؟")).toBe(true);
    expect(hasUrduScript("loop kya hota hai")).toBe(false);
    expect(hasUrduScript("The `for` loop")).toBe(false);
  });
});

import { plainMath } from "@/components/tutor/Message";
describe("chat rendering never shows raw rules or maths", () => {
  it("turns --- into a rule block and keeps list dashes as lists", () => {
    expect(parseBlocks("Intro\n\n---\n\n- a\n- b").map((b) => b.k)).toEqual(["p", "hr", "ul"]);
    expect(parseBlocks("***").map((b) => b.k)).toEqual(["hr"]);
  });
  it("turns LaTeX into plain text", () => {
    expect(plainMath("n \\times m")).toBe("n × m");
    expect(plainMath("O(n \\cdot \\log n)")).toBe("O(n · log n)");
    expect(plainMath("0")).toBe("0");
  });
});
