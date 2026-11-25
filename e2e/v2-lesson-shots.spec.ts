import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Evidence screenshots of the V2 lesson page (hero, animation first, sidebar, open practice) at 3 sizes, dark and light.
const VPS = [{ n: "375x812", w: 375, h: 812 }, { n: "768x1024", w: 768, h: 1024 }, { n: "1440x900", w: 1440, h: 900 }];
test("capture V2 lesson screenshots", async ({ browser }) => {
  test.setTimeout(300000);
  mkdirSync("docs/screenshots/v2", { recursive: true });
  for (const scheme of ["dark", "light"] as const) {
    for (const v of VPS) {
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, colorScheme: scheme });
      const page = await ctx.newPage();
      for (const [name, url, full] of [["lesson-top", "/week-3/for-loop", false], ["lesson-full", "/week-3/for-loop", true], ["lesson-recursion", "/week-11/recursion", false]] as const) {
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(800);
        await page.screenshot({ path: `docs/screenshots/v2/c-${name}-${scheme}-${v.n}.png`, fullPage: full });
      }
      await ctx.close();
    }
  }
});
