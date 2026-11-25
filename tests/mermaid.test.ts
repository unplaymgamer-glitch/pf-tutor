// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import mermaid from "mermaid";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Topic } from "@/lib/content-schema";

const charts: { id: string; chart: string }[] = [];
for (const wk of readdirSync("content")) {
  for (const f of readdirSync(join("content", wk)).filter((x) => x.endsWith(".json"))) {
    const t = Topic.parse(JSON.parse(readFileSync(join("content", wk, f), "utf8")));
    for (const w of t.worked) if (w.flowchartMermaid) charts.push({ id: `${t.slug}/${w.sample.id}`, chart: w.flowchartMermaid });
  }
}

describe("flowcharts are valid Mermaid", () => {
  it("has charts to check", () => expect(charts.length).toBeGreaterThan(0));
  for (const c of charts) {
    it(c.id, async () => {
      await expect(mermaid.parse(c.chart)).resolves.toBeTruthy();
    });
  }
});
