import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Evidence screenshots of the V2 design (home, a lesson, the phone menu) at the 3 required sizes, dark and light.
const VPS = [{ n: "375x812", w: 375, h: 812 }, { n: "768x1024", w: 768, h: 1024 }, { n: "1440x900", w: 1440, h: 900 }];
test("capture V2 screenshots", async ({ browser }) => {
  test.setTimeout(300000);
  mkdirSync("docs/screenshots/v2", { recursive: true });
  for (const scheme of ["dark", "light"] as const) {
    for (const v of VPS) {
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, colorScheme: scheme });
      const page = await ctx.newPage();
      for (const [name, url, full] of [["home", "/", false], ["home-full", "/", true], ["lesson", "/week-3/for-loop", false], ["more", "/more", false]] as const) {
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(700);
        await page.screenshot({ path: `docs/screenshots/v2/${name}-${scheme}-${v.n}.png`, fullPage: full });
      }
      await ctx.close();
    }
  }
});
