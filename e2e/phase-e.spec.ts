import { expect, test } from "@playwright/test";

const chatOf = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "CC111 Tutor chat" });

test("chat app: greeting, starters, a free lesson answer, and the chat appears in the sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/chat", { waitUntil: "networkidle" });
  const chat = chatOf(page);
  await expect(chat.getByRole("heading", { name: /Hello!/ })).toBeVisible();
  await expect(chat.getByRole("group", { name: "Starter questions" }).getByRole("button")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "Open the CC111 tutor chat" })).toHaveCount(0);
  await chat.getByLabel("Your question").fill("What is a variable?");
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByText(/From the lessons \(free\)|AI ·/)).toBeVisible({ timeout: 20000 });
  await expect(chat.getByRole("complementary", { name: "Chats and topics" }).getByRole("button", { name: "What is a variable?", exact: true })).toBeVisible();
  await expect(chat.getByText("Today", { exact: true })).toBeVisible();
});

test("per-topic chat: the lesson button opens it, the Topics tab lists modules, and the topic chat is tagged in Chats", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/week-3/for-loop", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Study .*with AI/ }).click();
  await expect(page).toHaveURL(/\/chat\?topic=w3\/for-loop/);
  const chat = chatOf(page);
  await expect(chat.getByRole("heading", { name: /Studying/ })).toBeVisible();
  await chat.getByLabel("Your question").fill("What is a variable?");
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByText(/From the lessons \(free\)|AI ·|AI part is not connected|not connected/).first()).toBeVisible({ timeout: 20000 });
  await expect(chat.getByText("📘 Topic chat")).toBeVisible();
  await chat.getByRole("tab", { name: "Topics" }).click();
  await expect(chat.getByRole("button", { name: /Module 3/ })).toBeVisible();
  await chat.getByRole("button", { name: /^Module 1 / }).click();
  await chat.getByRole("button", { name: "Comments", exact: true }).click();
  await expect(chat.getByRole("heading", { name: /Studying/ })).toBeVisible();
});

test("composer takes long pasted text, text files and PDFs, and keeps all three answer languages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/chat", { waitUntil: "networkidle" });
  const chat = chatOf(page);
  const lang = chat.getByRole("combobox", { name: "Answer language" });
  await expect(lang.locator("option")).toHaveText(["English", "Roman Urdu", "اردو"]);
  await chat.locator('input[type="file"]').setInputFiles([
    { name: "quiz1.txt", mimeType: "text/plain", buffer: Buffer.from("Q1. Write a loop that prints 1 to 5. (2 marks)") },
    { name: "assignment.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") },
  ]);
  await expect(chat.getByText("📎 quiz1.txt")).toBeVisible();
  await expect(chat.getByText(/📄 assignment\.pdf/)).toBeVisible();
  await chat.getByRole("button", { name: "Remove all" }).click();
  await expect(chat.getByText("📎 quiz1.txt")).toHaveCount(0);
  const big = "Q. Explain loops. ".repeat(1600); // about 29 000 characters
  await chat.getByLabel("Your question").fill(big);
  expect((await chat.getByLabel("Your question").inputValue()).length).toBe(big.length);
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByText("Q. Explain loops.").first()).toBeVisible({ timeout: 15000 });
});

test("phone: the chat fits, the sidebar opens as a drawer, and the composer is usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/chat", { waitUntil: "networkidle" });
  const chat = chatOf(page);
  await expect(chat.getByLabel("Your question")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await chat.getByRole("button", { name: "Open the sidebar" }).click();
  await expect(chat.getByRole("button", { name: /New chat/ })).toBeVisible();
  await chat.getByRole("button", { name: /New chat/ }).click();
  await expect(chat.getByRole("button", { name: /New chat/ })).toBeHidden();
});
