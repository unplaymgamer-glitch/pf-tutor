import { describe, it, expect } from "vitest";
import { Topic, normalizeOutput, allSamples } from "@/lib/content-schema";
import { runGraphics } from "@/lib/visuals/graphics";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const files = readdirSync("content").flatMap((wk) => readdirSync(join("content", wk)).filter((x) => x.endsWith(".json")).map((f) => join("content", wk, f)));
const slugs = new Set<string>();

describe("content files", () => {
  for (const f of files) {
    it(f, () => {
      const r = Topic.safeParse(JSON.parse(readFileSync(f, "utf8")));
      expect(r.success, r.success ? "" : r.error.message).toBe(true);
      if (!r.success) return;
      const t = r.data;
      expect(f.includes(`week-${String(t.week).padStart(2, "0")}`), "file is in the folder of its week").toBe(true);
      expect(f.endsWith(`${t.slug}.json`), "filename equals slug").toBe(true);
      expect(slugs.has(`${t.week}/${t.slug}`), "duplicate slug").toBe(false);
      slugs.add(`${t.week}/${t.slug}`);
      for (const s of allSamples(t)) { if (s.graphics) expect(s.expectedOutput, `${s.id} graphics sample has no console output`).toBe(""); else expect(s.expectedOutput, `${s.id} has recorded output (run verify:content --record)`).not.toBe(""); }
      for (const s of allSamples(t).filter((x) => x.graphics)) {
        const g = runGraphics(s.code);
        expect(g.error, `${s.id}: the graphics simulator must understand this program`).toBeUndefined();
        expect(g.frames.some((fr) => fr.length > 0), `${s.id} draws something`).toBe(true);
      }
      for (const v of t.visuals) if (v.kind === "canvas") expect(allSamples(t).some((s) => s.id === v.sampleId && s.graphics), `canvas ${v.sampleId} refers to a graphics sample`).toBe(true);
      expect(new Set(t.worked.map((w) => w.level)).size, "worked examples cover distinct levels").toBe(t.worked.length);
      for (const q of t.quiz) {
        expect(q.type, `quiz ${q.id} must be MCQ`).toBe("mcq");
        expect(q.options?.includes(q.answer), `quiz ${q.id} answer must be one of the options`).toBe(true);
      }
      for (const q of t.practice.filter((x) => x.type === "mcq")) expect(q.options?.includes(q.answer), `practice ${q.id}`).toBe(true);
    });
  }
});
describe("normalizeOutput", () => {
  it("ignores CRLF and trailing space only", () => {
    expect(normalizeOutput("a \r\nb\n\n")).toBe("a\nb");
    expect(normalizeOutput("a b")).not.toBe(normalizeOutput("ab"));
  });
});
