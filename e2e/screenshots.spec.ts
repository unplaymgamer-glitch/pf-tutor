import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Evidence screenshots for docs/VERIFICATION_REPORT.md (home, a lesson, the animation, the playground and the tutor at the 3 required sizes).
const VPS = [{ n: "375x812", w: 375, h: 812 }, { n: "768x1024", w: 768, h: 1024 }, { n: "1440x900", w: 1440, h: 900 }];
test("capture screenshots", async ({ page }) => {
  mkdirSync("docs/screenshots", { recursive: true });
  for (const v of VPS) {
    await page.setViewportSize({ width: v.w, height: v.h });
    for (const [name, url] of [["home", "/"], ["lesson-for-loop", "/week-3/for-loop"], ["lesson-recursion", "/week-11/recursion"], ["playground", "/playground"], ["final-hub", "/revision/final"]] as const) {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({ path: `docs/screenshots/${name}-${v.n}.png`, fullPage: false });
    }
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open the CC111 tutor chat" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `docs/screenshots/tutor-${v.n}.png` });
  }
});
