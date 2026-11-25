import { expect, test } from "@playwright/test";

test("home hero: eyebrow, title, one-line description and two pill buttons; the live demo peeks below", async ({ page }) => {
  for (const vp of [{ w: 375, h: 812 }, { w: 1440, h: 900 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Programming Fundamentals");
    await expect(page.getByText("UMT · CC111")).toBeVisible();
    const start = page.getByRole("link", { name: "Start learning" });
    await expect(start).toBeVisible();
    expect((await start.boundingBox())!.y).toBeLessThan(vp.h);
    await expect(page.getByRole("link", { name: "Open Visual Lab" })).toBeVisible();
    await expect(page.getByText("Free", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open the CC111 tutor chat" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("Start learning opens the full-screen chat and a question gets an answer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Start learning" }).click();
  await expect(page).toHaveURL(/\/chat$/);
  const chat = page.getByRole("region", { name: "CC111 Tutor chat" });
  await expect(chat.getByRole("button", { name: /New chat/ })).toBeVisible();
  await expect(chat.getByRole("tab", { name: "Topics" })).toBeVisible();
  await expect(chat.getByRole("combobox", { name: "Answer language" })).toBeVisible();
  await chat.getByLabel("Your question").fill("What is a variable?");
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByText(/From the lessons \(free\)|AI ·/)).toBeVisible({ timeout: 20000 });
});

test("module cards: ten modules, Pre/Post filter, sub-topics open a lesson, the chat button opens that topic's chat", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const cards = page.locator("#modules ul > li.module-card");
  await expect(cards).toHaveCount(10);
  await page.getByRole("tab", { name: /Pre-Midterm/ }).click();
  await expect(cards).toHaveCount(6);
  await page.getByRole("tab", { name: /Post-Midterm/ }).click();
  await expect(cards).toHaveCount(4);
  await page.getByRole("tab", { name: /All modules/ }).click();
  const loops = cards.filter({ hasText: "Loops" }).first();
  await loops.getByRole("button", { name: /sub-topics/ }).click();
  await expect(loops.getByRole("list").getByRole("link").first()).toBeVisible();
  await loops.getByRole("button", { name: /^Chat: ask the tutor about/ }).first().click();
  await expect(page).toHaveURL(/\/chat\?topic=w3\//);
  await expect(page.getByRole("heading", { name: /Studying/ })).toBeVisible();
  await page.goBack();
  await cards.filter({ hasText: "Loops" }).first().getByRole("button", { name: /sub-topics/ }).click();
  await cards.filter({ hasText: "Loops" }).first().getByRole("list").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/week-3\/[a-z-]+$/);
});

test("one-row header: links, language switch and small icon buttons all sit in the same bar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const bar = page.getByRole("banner");
  const hb = (await bar.boundingBox())!;
  expect(hb.height).toBeLessThan(70);
  for (const n of ["Home", "Modules", "Ask", "Visual Lab"]) await expect(bar.getByRole("link", { name: n, exact: true })).toBeVisible();
  for (const name of ["Search lessons", "Switch between dark and light theme", "Pause animations", "Settings"]) {
    const b = (await bar.getByRole(name === "Search lessons" ? "link" : "button", { name }).first().boundingBox())!;
    expect(b.height, name).toBeLessThanOrEqual(34);
  }
  await bar.getByRole("button", { name: "Roman" }).click();
  await expect(bar.getByRole("button", { name: "Roman" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/week-3", { waitUntil: "networkidle" });
  await expect(page.locator("ol.wk li").first().locator("span[aria-hidden]").first()).toBeVisible();
});
