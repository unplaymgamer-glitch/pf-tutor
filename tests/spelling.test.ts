import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// One spelling everywhere: American (as in Gaddis's textbook and compiler messages).
const BRITISH = /\b(initialis\w*|practis(e|es|ed|ing)|colour\w*|behaviour\w*|centre\w*|centred|organis\w*|recognis\w*|favourite\w*|optimis\w*|summaris\w*|visualis\w*|minimis\w*|maximis\w*|customis\w*|normalis\w*)\b/i;
describe("lesson text spelling", () => {
  it("has no British spellings", () => {
    const bad: string[] = [];
    for (const d of readdirSync("content")) for (const f of readdirSync(join("content", d)).filter((x) => x.endsWith(".json"))) {
      const m = readFileSync(join("content", d, f), "utf8").match(BRITISH);
      if (m) bad.push(`${d}/${f}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });
});
