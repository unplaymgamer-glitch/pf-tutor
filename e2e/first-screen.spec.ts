import { expect, test } from "@playwright/test";

// V2 lesson standard: a picture/animation must be visible on the FIRST screen of every lesson (no scrolling), on phone and desktop.
const LESSONS = ["week-1/hello-world", "week-3/for-loop", "week-5/bubble-sort", "week-9/what-is-a-pointer", "week-11/recursion", "week-15/draw-a-house"];
for (const vp of [{ n: "phone", w: 375, h: 812 }, { n: "desktop", w: 1440, h: 900 }]) {
  test(`animation is on the first screen at ${vp.n}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const l of LESSONS) {
      await page.goto("/" + l, { waitUntil: "networkidle" });
      const panel = page.locator('[role="tabpanel"]').first();
      await expect(panel, l).toBeVisible();
      const box = await panel.boundingBox();
      // the top of the animation area must start inside the first screen with some of it showing (at least 120px visible)
      expect(box!.y, `${l}: animation starts at y=${Math.round(box!.y)} of ${vp.h}`).toBeLessThan(vp.h - 120);
    }
  });
}
