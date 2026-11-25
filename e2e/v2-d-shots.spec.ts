import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Evidence screenshots for Phase D: Visual Lab, mind map, Loop Lab and the three 3D scenes (desktop dark).
test("capture phase D screenshots", async ({ browser }) => {
  test.setTimeout(240000);
  mkdirSync("docs/screenshots/v2", { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto("/visual-lab", { waitUntil: "networkidle" });
  await page.screenshot({ path: "docs/screenshots/v2/d-visual-lab.png" });
  await page.goto("/week-3", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "docs/screenshots/v2/d-mind-map.png" });
  await page.goto("/week-3/break-continue", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Next/ }).first().click();
  await page.locator("#learn").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/v2/d-loop-lab.png" });
  for (const [slug, name] of [["week-6/three-d-arrays", "3d-array"], ["week-10/stack-vs-heap", "3d-stack-heap"], ["week-11/recursion", "3d-call-stack"]] as const) {
    await page.goto("/" + slug, { waitUntil: "networkidle" });
    const fig = page.locator("figure").filter({ hasText: /3D view/ }).first();
    await fig.getByRole("button", { name: /View in 3D|Switch to the 2D view/ }).first().scrollIntoViewIfNeeded();
    const btn = fig.getByRole("button", { name: "View in 3D" });
    if (await btn.count()) await btn.click();
    await page.waitForTimeout(2500);
    const has = await fig.locator("canvas").count();
    console.log(name, "canvas:", has);
    await fig.screenshot({ path: `docs/screenshots/v2/d-${name}.png` });
  }
});
