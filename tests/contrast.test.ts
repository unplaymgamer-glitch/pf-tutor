import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function tokens(block: RegExp): Record<string, string> {
  const css = readFileSync("app/globals.css", "utf8");
  const m = css.match(block)!;
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((x) => [x[1], x[2]]));
}
const dark = tokens(/^:root \{([\s\S]*?)\n\}/m);
const light = { ...dark, ...tokens(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/) };

for (const [name, t] of [["dark", dark], ["light", light]] as const) {
  describe(`WCAG AA contrast (${name})`, () => {
    for (const fg of ["text", "muted", "primary", "success", "warning", "error", "accent", "xp"]) {
      it(`${fg} on bg and surface >= 4.5`, () => {
        expect(ratio(t[fg], t.bg)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(t[fg], t.surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
    it("button text on primary >= 4.5", () => expect(ratio(t["on-primary"], t.primary)).toBeGreaterThanOrEqual(4.5));
  });
}
