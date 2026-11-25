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
