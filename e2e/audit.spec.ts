import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];
// home, roadmap (chapter list), one lesson per chapter, playground, practice/review/mock/progress/search, hubs, admin login, privacy
const LESSONS = [
  "week-1/hello-world", "week-2/if-else-if-ladder", "week-3/for-loop", "week-4/linear-search", "week-5/bubble-sort", "week-6/matrix-multiplication",
  "week-7/pass-by-value-reference", "week-8/function-overloading", "week-9/what-is-a-pointer", "week-10/dynamic-memory-allocation", "week-11/recursion",
  "week-12/array-of-structures", "week-13/returning-structures", "week-14/reading-files", "week-15/draw-a-house", "week-16/program-structure",
];
const PAGES = ["/", "/week-3", ...LESSONS.map((l) => "/" + l), "/playground", "/practice", "/review", "/mock", "/progress", "/search", "/revision/mid", "/revision/final", "/privacy", "/more", "/how-to-study", "/faq", "/about", "/admin"];

async function open(page: Page, url: string, errors: string[]) {
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${url}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${url}: ${e.message}`));
  await page.goto(url, { waitUntil: "networkidle" });
}

const issues: string[] = [];
test.afterAll(() => { mkdirSync("e2e-results", { recursive: true }); writeFileSync("e2e-results/audit-issues.txt", issues.join("\n") || "none"); });

for (const vp of VIEWPORTS) {
  test(`layout + console at ${vp.name} ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const errors: string[] = [];
    for (const url of PAGES) {
      await open(page, url, errors);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) issues.push(`HORIZONTAL SCROLL ${vp.name} ${url}: +${overflow}px`);
      const status = await page.evaluate(() => /something went wrong|page could not be found/i.test(document.body.innerText));
      if (status) issues.push(`ERROR TEXT ${vp.name} ${url}`);
      // text that is clipped or overlapping is caught by axe (color-contrast) and by the overflow check above
    }
    issues.push(...errors.map((e) => `CONSOLE ${vp.name} ${e}`));
    expect(issues.filter((i) => i.includes(vp.name)), issues.filter((i) => i.includes(vp.name)).join("\n")).toEqual([]);
  });
}

for (const scheme of ["light", "dark"] as const) {
  test(`axe WCAG 2.2 AA (${scheme}) on phone and desktop`, async ({ browser }) => {
    test.setTimeout(900_000);
    const found: string[] = [];
    for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme });
      const page = await ctx.newPage();
      for (const url of PAGES) {
        await page.goto(url, { waitUntil: "networkidle" });
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
        for (const v of r.violations) found.push(`[${v.impact}] ${scheme} ${vp.name} ${url}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
      }
      await ctx.close();
    }
    issues.push(...found.map((f) => `AXE ${f}`));
    expect(found.join("\n")).toBe("");
  });
}
