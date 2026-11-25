import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { WEEK_HUES } from "@/lib/course";

// V2 design system: every text/UI pair that the new palette introduces must meet WCAG AA, in dark and light.
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hsl = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
};

const css = readFileSync("app/globals.css", "utf8");
const block = (re: RegExp) => css.match(re)![1];
const parse = (b: string) => ({
  hex: Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((x) => [x[1], x[2]])) as Record<string, string>,
  s: Number(b.match(/--wk-s:\s*(\d+)%/)![1]), l: Number(b.match(/--wk-l:\s*(\d+)%/)![1]),
});
const dark = parse(block(/^:root \{([\s\S]*?)\n\}/m));
const lightRaw = parse(block(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/));
const themes = { dark, light: { ...lightRaw, hex: { ...dark.hex, ...lightRaw.hex } } } as const;

for (const [name, t] of Object.entries(themes)) {
  describe(`V2 palette contrast (${name})`, () => {
    it("info colour is readable on page and card surfaces", () => {
      for (const bg of [t.hex.bg, t.hex.surface, t.hex["surface-2"]]) expect(ratio(t.hex.info, bg)).toBeGreaterThanOrEqual(4.5);
    });
    it("muted text stays readable on raised surfaces", () => expect(ratio(t.hex.muted, t.hex["surface-2"])).toBeGreaterThanOrEqual(4.5));
    it("gradient button text is readable on BOTH gradient ends", () => {
      expect(ratio(t.hex["on-primary"], t.hex["grad-a"])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.hex["on-primary"], t.hex["grad-b"])).toBeGreaterThanOrEqual(4.5);
    });
    it("gradient headline text is readable on the page background", () => {
      expect(ratio(t.hex["grad-a"], t.hex.bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.hex["grad-b"], t.hex.bg)).toBeGreaterThanOrEqual(4.5);
    });
    it("each of the 16 week accents is readable as text on page, card and raised surfaces", () => {
      expect(WEEK_HUES).toHaveLength(16);
      for (const h of WEEK_HUES) {
        const c = hsl(h, t.s, t.l);
        for (const bg of [t.hex.bg, t.hex.surface, t.hex["surface-2"]]) expect(ratio(c, bg), `hue ${h} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
    it("week accents are distinct enough to tell apart (no two neighbouring weeks share a hue)", () => {
      for (let i = 1; i < WEEK_HUES.length; i++) expect(Math.abs(WEEK_HUES[i] - WEEK_HUES[i - 1])).toBeGreaterThanOrEqual(10);
    });
  });
}
