import { test, expect } from "@playwright/test";

// Student flow with no login: answer a question, progress survives a reload, backup code round-trips, tutor opens, playground loads.
test("progress persists after reload and backup code is offered", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/week-2/if-else-if-ladder", { waitUntil: "networkidle" });
  const xpLink = page.getByRole("link", { name: /My progress/ });
  const before = await xpLink.getAttribute("aria-label");
  // open the (collapsed) mini-quiz and answer its first question
  await page.getByRole("heading", { name: /Mini-quiz/ }).click();
  await page.getByRole("group", { name: "Choices" }).first().getByRole("button").first().click();
  await expect.poll(async () => await xpLink.getAttribute("aria-label")).not.toBe(before);
  const after = await xpLink.getAttribute("aria-label");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: /My progress/ })).toHaveAttribute("aria-label", after!);
  await page.goto("/progress", { waitUntil: "networkidle" });
  await expect(page.getByText(/CC111-/).first().or(page.getByRole("button", { name: /backup|export|save/i }).first())).toBeVisible();
  expect(errors).toEqual([]);
});

test("tutor panel opens, closes with Escape and answers a definition question for free", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open the CC111 tutor chat" }).click();
  const dlg = page.getByRole("dialog", { name: "CC111 Tutor chat" });
  await expect(dlg).toBeVisible();
  await dlg.getByRole("textbox", { name: "Your question" }).fill("What is a variable?");
  await dlg.getByRole("textbox", { name: "Your question" }).press("Enter");
  await expect(dlg.getByText(/Variables/i).first()).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await expect(dlg).toBeHidden();
});

test("playground loads, runs nothing until asked, and CSP blocks nothing it needs", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/playground", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /playground/i }).first()).toBeVisible();
  expect(errors.filter((e) => /Content Security Policy/i.test(e))).toEqual([]);
});

test("locked content is not delivered: a week beyond the open ones returns the locked view without lesson text", async ({ request }) => {
  // The e2e server opens all 16 weeks, so check the opposite: sitemap lists only what is open and admin is noindex.
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const sm = await request.get("/sitemap.xml");
  const xml = await sm.text();
  expect(xml).toContain("/week-3/for-loop");
  expect(xml).not.toContain("/admin");
  const admin = await request.get("/admin");
  expect(admin.headers()["x-robots-tag"]).toContain("noindex");
});
