import { expect, test, type Page } from "@playwright/test";

// The interface in all three languages: English, Roman Urdu and Urdu script. The page layout must never flip right-to-left.
const setLang = (page: Page, lang: string) => page.addInitScript((l) => localStorage.setItem("cc111.settings.v1", JSON.stringify({ lang: l })), lang);

const CASES = [
  { lang: "en", nav: "Modules", heading: "Choose a module", start: "Start learning", chat: "New chat", hello: "Hello!", tab: "All modules" },
  { lang: "roman", nav: "Poochein", heading: "Module chunein", start: "Seekhna shuru karein", chat: "Nayi chat", hello: "Assalam o Alaikum!", tab: "Tamam modules" },
  { lang: "ur", nav: "ماڈیولز", heading: "ماڈیول منتخب کریں", start: "سیکھنا شروع کریں", chat: "نئی چیٹ", hello: "السلام علیکم!", tab: "تمام ماڈیولز" },
] as const;

for (const c of CASES) {
  test(`home, modules and chat are fully in ${c.lang}`, async ({ page }) => {
    await setLang(page, c.lang);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "ltr");                       // the layout never flips
    const bar = page.getByRole("banner");
    await expect(bar.getByRole("link", { name: c.nav, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: c.start })).toBeVisible();
    await expect(page.getByRole("heading", { name: c.heading })).toBeVisible();
    await expect(page.getByRole("tab", { name: new RegExp(c.tab) })).toBeVisible();
    // navigation order stays left to right: Home is left of More
    const [home, more] = await Promise.all([bar.getByRole("link").filter({ hasText: /^(Home|ہوم)$/ }).first().boundingBox(), bar.getByRole("link", { name: /^(More|Mazeed|مزید)$/ }).first().boundingBox()]);
    expect(home!.x).toBeLessThan(more!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    // a module card: title and sub-topics in the language
    const card = page.locator("#modules ul > li.module-card").nth(2);
    await card.getByRole("button", { name: /\d/ }).first().click();
    const first = await card.getByRole("list").getByRole("link").first().innerText();
    if (c.lang === "ur") expect(first).toMatch(/[\u0600-\u06FF]/);
    // the chat
    await page.goto("/chat", { waitUntil: "networkidle" });
    const chat = page.getByRole("complementary");
    await expect(chat.getByRole("button", { name: new RegExp(c.chat) })).toBeVisible();
    await expect(page.getByRole("heading", { name: c.hello })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("switching the language in the header changes the page at once and is remembered after a reload", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const bar = page.getByRole("banner");
  await bar.getByRole("button", { name: "اردو" }).click();
  await expect(page.getByRole("heading", { name: "ماڈیول منتخب کریں" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "ماڈیول منتخب کریں" })).toBeVisible();
  await bar.getByRole("button", { name: "Roman", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Module chunein" })).toBeVisible();
  await bar.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose a module" })).toBeVisible();
});

test("a lesson page and the workspace follow the language, with Urdu text set right-to-left only where it is Urdu", async ({ page }) => {
  await setLang(page, "ur");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/week-3/for-loop", { waitUntil: "networkidle" });
  await expect(page.getByText("پہلے دیکھیں، پھر پڑھیں")).toBeVisible();
  const urdu = page.locator('[lang="ur"][dir="rtl"]').first();
  await expect(urdu).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.goto("/week-3/for-loop/workspace", { waitUntil: "networkidle" });
  await expect(page.getByRole("region", { name: "نوٹس" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /کوڈ اور ڈرائی رن/ })).toBeVisible();
});

test("Start here works in Roman Urdu and Urdu too", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("cc111.settings.v1", JSON.stringify({ lang: "ur" })));
  await page.goto("/start", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("یہاں سے شروع کریں");
  await expect(page.getByText("سوال 1 / 8")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});
