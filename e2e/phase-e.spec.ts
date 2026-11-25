import { expect, test } from "@playwright/test";

test("full-page chat: starters, a free lesson answer, history, no floating button", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/chat", { waitUntil: "networkidle" });
  const chat = page.getByRole("region", { name: "CC111 Tutor chat" });
  await expect(chat).toBeVisible();
  await expect(page.getByRole("button", { name: "Open the CC111 tutor chat" })).toHaveCount(0);
  await expect(chat.getByRole("group", { name: "Starter questions" }).getByRole("button")).toHaveCount(4);
  await chat.getByLabel("Your question").fill("What is a variable?");
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByText(/From the lessons \(free\)|AI ·/)).toBeVisible({ timeout: 20000 });
  await expect(chat.getByRole("button", { name: /History \(1\)/ })).toBeVisible();
});

test("per-topic tutor: Study with AI on a lesson pins that lesson and /chat?topic= does too", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/week-3/for-loop", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Study .*with AI/ }).click();
  const dlg = page.getByRole("dialog", { name: "CC111 Tutor chat" });
  await expect(dlg.getByText(/studying: .*for/i)).toBeVisible();
  await dlg.getByRole("link", { name: "Full page" }).click();
  await expect(page).toHaveURL(/\/chat\?topic=w3\/for-loop/);
  await expect(page.getByText(/studying: .*Week 3/)).toBeVisible();
  await page.getByRole("button", { name: "Any topic" }).click();
  await expect(page.getByText(/studying:/)).toHaveCount(0);
});

test("full-page chat fits a phone with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/chat", { waitUntil: "networkidle" });
  await expect(page.getByLabel("Your question")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
