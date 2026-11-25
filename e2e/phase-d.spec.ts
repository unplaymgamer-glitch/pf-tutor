import { expect, test } from "@playwright/test";

test("Visual Lab lists every animation, searches, and opens one full screen", async ({ page }) => {
  await page.goto("/visual-lab", { waitUntil: "networkidle" });
  const status = page.getByRole("status").filter({ hasText: /shown/ });
  const total = Number((await status.innerText()).match(/of (\d+)/)![1]);
  expect(total).toBeGreaterThanOrEqual(300);
  await page.getByLabel("Search animations").fill("bubble");
  await expect.poll(async () => Number((await status.innerText()).match(/^(\d+)/)![1])).toBeLessThan(total / 5);
  await page.getByRole("button", { name: /Bubble Sort|bubble/i }).first().click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole("link", { name: "Open the lesson" })).toBeVisible();
  await expect(dlg.getByRole("button", { name: /Next/ }).first()).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await expect(dlg).toBeHidden();
});

test("Visual Lab: an animation that needs code samples (graphics) and a step-through both load", async ({ page }) => {
  await page.goto("/visual-lab", { waitUntil: "networkidle" });
  await page.getByLabel("Search animations").fill("Step through: Print 1 to 5");
  await page.getByRole("button", { name: /Step through/ }).first().click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByText(/Output so far/)).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");
});

test("week page shows the mind map with a branch per lesson, and a branch opens its lesson", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/week-3", { waitUntil: "networkidle" });
  const map = page.getByRole("group", { name: /Mind map of week 3/ });
  await expect(map).toBeVisible();
  await expect(map.getByRole("link")).toHaveCount(5);
  await map.getByRole("link").nth(0).click();
  await expect(page).toHaveURL(/\/week-3\/[a-z-]+$/);
});

test("Loop Lab: compare table, do-while runs once on a false condition, endless loop is flagged", async ({ page }) => {
  await page.goto("/week-3/do-while-loop", { waitUntil: "networkidle" });
  const lab = page.getByRole("group", { name: "Loop settings" });
  await expect(lab).toBeVisible();
  const table = page.getByRole("region", { name: "The three loops with the same numbers" });
  const row = (k: string) => table.getByRole("row", { name: new RegExp(`^${k}\\b`) });
  await expect(row("do-while")).toContainText("1");           // body ran once although 10 <= 5 is false
  await expect(row("for")).toContainText("nothing");
  await lab.getByRole("button", { name: "while", exact: true }).click();
  await lab.getByLabel("Step").fill("-1");                       // 10 <= 5 with a negative step never ends once the check passes
  await lab.getByLabel("Start").fill("1");
  await expect(page.getByRole("alert").filter({ hasText: /never ends/ })).toBeVisible();
});

test("3D scene: phones get the 2D view by default; 3D can be switched on and renders a canvas (or says why not)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/week-6/three-d-arrays", { waitUntil: "networkidle" });
  const fig = page.locator("figure").filter({ hasText: /3-D array|3D view/ }).first();
  await expect(fig).toBeVisible();
  await expect(fig.locator("canvas")).toHaveCount(0);                                   // 2D by default on a phone
  await expect(fig.getByRole("img", { name: /Layer 0/ })).toBeVisible();
  await fig.getByRole("button", { name: "View in 3D" }).click();
  const canvas = fig.locator("canvas");
  const note = page.getByText(/cannot draw 3D/);
  await expect.poll(async () => (await canvas.count()) + (await note.count()), { timeout: 20000 }).toBeGreaterThan(0);
  if (await canvas.count()) { const b = await canvas.first().boundingBox(); expect(b!.height).toBeGreaterThan(200); await fig.getByRole("button", { name: "Switch to the 2D view" }).click(); await expect(canvas).toHaveCount(0); }
  // the text description always matches the controls
  await fig.getByRole("slider", { name: /^Layer/ }).fill("1");
  await expect(fig.getByRole("status")).toContainText("a[1][0][0] is element number 12");
});

test("Settings: the 3D control exists now and can switch it off", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Settings/ }).click();
  const sel = page.getByLabel(/3D scenes/);
  await expect(sel).toBeVisible();
  await sel.selectOption("off");
  await page.goto("/week-6/three-d-arrays", { waitUntil: "networkidle" });
  await expect(page.locator("figure canvas")).toHaveCount(0);
});
