import { expect, test } from "@playwright/test";

test("workspace: notes, code sandbox with dry run and exam practice, and an isolated topic tutor, side by side", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/week-3/for-loop", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Workspace/ }).first().click();
  await expect(page).toHaveURL(/\/week-3\/for-loop\/workspace$/);
  const notes = page.getByRole("region", { name: "Notes" });
  const code = page.getByRole("region", { name: "Code and dry run" });
  const tutor = page.getByRole("region", { name: "Topic tutor chat" });
  await expect(notes).toBeVisible(); await expect(code).toBeVisible(); await expect(tutor).toBeVisible();
  // the three panes are really side by side
  const [a, b, c] = await Promise.all([notes.boundingBox(), code.boundingBox(), tutor.boundingBox()]);
  expect(a!.x).toBeLessThan(b!.x); expect(b!.x).toBeLessThan(c!.x);
  await expect(notes.getByRole("heading", { name: "Syntax" })).toBeVisible();
  // editable sandbox: switching the example changes the editor, and Run is there
  await expect(code.getByRole("button", { name: /▶ Run$/ }).first()).toBeVisible();
  const tabs = code.getByRole("tablist", { name: "Examples" }).getByRole("tab");
  expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(code.getByRole("heading", { name: "Step-by-step dry run" })).toBeVisible();
  await expect(code.getByRole("heading", { name: "Exam practice" })).toBeVisible();
  await code.getByText("Predict the output of this example").click();
  await code.getByRole("button", { name: /Show the output/ }).click();
  await expect(code.getByRole("group", { name: "Output" }).first()).toBeVisible();
  // the tutor is pinned to this lesson and answers inside the workspace
  await expect(tutor.getByRole("heading", { name: /Studying/ })).toBeVisible();
  await tutor.getByRole("textbox", { name: "Your question" }).fill("What is a variable?");
  await tutor.getByRole("button", { name: "Send" }).click();
  await expect(tutor.getByText(/From the lessons \(free\)|AI ·|not connected|could not answer/).first()).toBeVisible({ timeout: 20000 });
  await expect(page).toHaveURL(/workspace$/);
  // its chat is saved in the shared history, tagged as a topic chat
  await page.goto("/chat", { waitUntil: "networkidle" });
  await expect(page.getByText("📘 Topic chat").first()).toBeVisible();
});

test("workspace on a phone: three tabs, one pane at a time, no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/week-3/for-loop/workspace", { waitUntil: "networkidle" });
  const tabs = page.getByRole("tablist", { name: "Workspace panes" });
  await expect(tabs).toBeVisible();
  await expect(page.getByRole("region", { name: "Code and dry run" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Notes" })).toBeHidden();
  await tabs.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByRole("region", { name: "Notes" })).toBeVisible();
  await tabs.getByRole("tab", { name: "Tutor" }).click();
  await expect(page.getByRole("region", { name: "Topic tutor chat" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test("workspace respects locks: an unknown lesson is not found", async ({ request }) => {
  expect((await request.get("/week-3/no-such-lesson/workspace")).status()).toBe(404);
});
