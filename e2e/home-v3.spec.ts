import { expect, test } from "@playwright/test";

test("home first screen: the title and the chat box come first; the demo moves below", async ({ page }) => {
  for (const vp of [{ w: 375, h: 812 }, { w: 1440, h: 900 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto("/", { waitUntil: "networkidle" });
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveText("Programming Fundamentals");
    const box = page.getByLabel("What do you want to learn?");
    await expect(box).toBeVisible();
    expect((await box.boundingBox())!.y).toBeLessThan(vp.h - 100);        // the question box is on the first screen
    await expect(page.getByRole("link", { name: /Start learning/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /AI Tutor/ })).toBeVisible();
    const seeing = page.getByRole("heading", { name: /Learn C\+\+ by seeing it run/ });
    expect((await seeing.boundingBox())!.y).toBeGreaterThan((await h1.boundingBox())!.y + 150);   // lower on the page
    await expect(page.getByText("Free", { exact: true })).toHaveCount(0);                            // the small badges are gone
    await expect(page.getByRole("button", { name: "Open the CC111 tutor chat" })).toHaveCount(0);   // no floating button on home
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("a question typed on the home page opens /chat and is asked there, without putting it in the URL", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByLabel("What do you want to learn?").fill("What is a variable?");
  await page.getByRole("button", { name: "Ask the tutor" }).click();
  await expect(page).toHaveURL(/\/chat$/);
  const chat = page.getByRole("region", { name: "CC111 Tutor chat" });
  await expect(chat.getByText("What is a variable?").first()).toBeVisible({ timeout: 15000 });
  await expect(chat.getByText(/From the lessons \(free\)|AI ·/)).toBeVisible({ timeout: 20000 });
});

test("toolbar buttons are compact and every week card has an icon", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  for (const name of ["Playground: run C++", "Search lessons", "Language", "Switch between dark and light theme", "Pause animations", "Settings"]) {
    const el = page.getByRole("banner").getByRole(name === "Language" ? "combobox" : name === "Playground: run C++" || name === "Search lessons" ? "link" : "button", { name }).first();
    const b = (await el.boundingBox())!;
    expect(b.height, name).toBeLessThanOrEqual(34);
    expect(b.height, name).toBeGreaterThanOrEqual(24);
  }
  const cards = page.locator("#roadmap li.wk");
  await expect(cards).toHaveCount(16);
  expect((await cards.first().locator("span[aria-hidden]").first().innerText()).trim().length).toBeGreaterThan(0);
  await page.goto("/week-3", { waitUntil: "networkidle" });
  await expect(page.locator("ol.wk li").first().locator("span[aria-hidden]").first()).toBeVisible();
});
