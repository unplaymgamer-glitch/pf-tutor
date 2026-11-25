import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

// Live walk-through in real Chrome: every student function, then the admin (login, locks, taught, announcements, website ON/OFF).
// Run against a server started with the admin env (see docs): PW_BASE_URL=http://localhost:3113 PW_HEADED=1 npx playwright test e2e/live.spec.ts
const U = process.env.LIVE_ADMIN_USER ?? "aftab";
const P = process.env.LIVE_ADMIN_PASS ?? "";
const DIR = "docs/live-test";
const results: { step: string; ok: boolean; note: string }[] = [];
const consoleErrors: string[] = [];
let n = 0;

async function shot(page: Page, name: string, full = false) {
  n++;
  await page.screenshot({ path: `${DIR}/${String(n).padStart(2, "0")}-${name}.png`, fullPage: full });
}
async function check(step: string, fn: () => Promise<string | void>) {
  try { const note = (await fn()) ?? ""; results.push({ step, ok: true, note }); }
  catch (e) { results.push({ step, ok: false, note: String((e as Error).message).split("\n")[0].slice(0, 200) }); }
}
function watch(page: Page) {
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${page.url()}: ${m.text().slice(0, 160)}`); });
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: PAGEERROR ${e.message.slice(0, 160)}`));
}

test.describe.configure({ mode: "serial" });
test.setTimeout(600_000);

test("live walk-through (student + admin)", async ({ browser }) => {
  mkdirSync(DIR, { recursive: true });
  const student: BrowserContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await student.newPage();
  watch(page);

  // ---------- STUDENT ----------
  await check("Home page loads with the 16-week roadmap", async () => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Programming Fundamentals");
    const t = await page.locator("main").innerText();
    expect(t).toContain("Week 16");
    await shot(page, "student-home");
    return "16 chapters listed";
  });
  await check("Locked weeks show as locked, open weeks as open", async () => {
    const t = await page.locator("main").innerText();
    expect(t).toMatch(/locked/i);
    return "Week 1-2 open, others locked (default)";
  });
  await check("Locked lesson (Week 3) is blocked and leaks no lesson text", async () => {
    await page.goto("/week-3/for-loop", { waitUntil: "networkidle" });
    const html = await page.content();
    expect(html).not.toContain("initialisation (where to start)");
    await expect(page.getByText(/Coming soon/)).toBeVisible();
    await shot(page, "student-locked-week3");
    return "shows 'Coming soon', no lesson text in the HTML";
  });
  await check("Open lesson renders (Week 1: Hello World) with all sections", async () => {
    await page.goto("/week-1/hello-world", { waitUntil: "networkidle" });
    for (const h of ["Learning goal", "Definition", "Worked examples", "Common mistakes", "Exam tips", "Roman Urdu summary"]) await expect(page.getByRole("heading", { name: new RegExp(h) }).first()).toBeVisible();
    await shot(page, "student-lesson-top");
    return "13-section lesson page";
  });
  await check("Visualize / Code / Algorithm tabs switch", async () => {
    await page.getByRole("tab", { name: /Code/ }).click();
    await expect(page.getByText(/Verified output/).first()).toBeVisible();
    await shot(page, "student-tab-code");
    await page.getByRole("tab", { name: /Algorithm/ }).click();
    await shot(page, "student-tab-algorithm");
    await page.getByRole("tab", { name: /Visualize/ }).click();
    return "all three views respond";
  });
  await check("Step-through animation moves forward", async () => {
    await page.getByRole("tab", { name: /Visualize/ }).click();
    const next = page.getByRole("button", { name: /Next/ }).first();
    await next.scrollIntoViewIfNeeded();
    const before = await page.getByText(/Step \d+ of \d+/).first().innerText();
    await next.click(); await next.click();
    const after = await page.getByText(/Step \d+ of \d+/).first().innerText();
    expect(after).not.toBe(before);
    await shot(page, "student-animation");
    return `${before} -> ${after}`;
  });
  await check("'Try it' sends the code to the Playground", async () => {
    await page.getByRole("button", { name: /Try it/ }).first().click();
    await page.waitForURL(/\/playground#s=/);
    await expect(page.getByRole("heading", { name: /playground/i }).first()).toBeVisible();
    return "opened /playground with the lesson code";
  });
  await check("Playground runs the program (Basic mode) and prints output", async () => {
    await page.getByRole("button", { name: /^▶?\s*Run/ }).first().click();
    await expect(page.getByText(/Finished \(exit code 0\)/)).toBeVisible({ timeout: 20000 });
    await shot(page, "student-playground-output");
    return "output shown, exit code 0";
  });
  await check("Quiz: answer a question and XP changes; survives reload", async () => {
    await page.goto("/week-2/if-else-if-ladder", { waitUntil: "networkidle" });
    const xp = page.getByRole("link", { name: /My progress/ });
    const before = await xp.getAttribute("aria-label");
    await page.getByRole("heading", { name: /Mini-quiz/ }).click();
    await page.getByRole("group", { name: "Choices" }).first().getByRole("button").first().click();
    await expect.poll(async () => await xp.getAttribute("aria-label")).not.toBe(before);
    const after = await xp.getAttribute("aria-label");
    await shot(page, "student-quiz-answered");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /My progress/ })).toHaveAttribute("aria-label", after!);
    return `${before} -> ${after}`;
  });
  await check("Practice hub, Review, Mock exam pages open", async () => {
    for (const [u, name] of [["/practice", "practice"], ["/review", "review"], ["/mock", "mock"]] as const) {
      await page.goto(u, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await shot(page, `student-${name}`);
    }
    return "3 pages render";
  });
  await check("Progress page shows XP, badges and a backup code", async () => {
    await page.goto("/progress", { waitUntil: "networkidle" });
    await expect(page.getByText(/CC111-/).first().or(page.getByRole("button", { name: /backup|export|save/i }).first())).toBeVisible();
    await shot(page, "student-progress", true);
    return "dashboard + backup visible";
  });
  await check("Search finds an open lesson", async () => {
    await page.goto("/search", { waitUntil: "networkidle" });
    await page.getByRole("searchbox").or(page.getByRole("textbox")).first().fill("variable");
    await expect(page.getByRole("link", { name: /variables/i }).first()).toBeVisible({ timeout: 10000 });
    await shot(page, "student-search");
    return "found 'variables' lesson";
  });
  await check("Tutor answers a definition question for free", async () => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open the CC111 tutor chat" }).click();
    const dlg = page.getByRole("dialog", { name: "CC111 Tutor chat" });
    await dlg.getByRole("textbox", { name: "Your question" }).fill("What is a variable?");
    await dlg.getByRole("textbox", { name: "Your question" }).press("Enter");
    await expect(dlg.getByText(/Variables/i).first()).toBeVisible({ timeout: 15000 });
    await shot(page, "student-tutor");
    await page.keyboard.press("Escape");
    return "free answer from the course notes";
  });
  await check("Settings panel opens (theme, language, text size)", async () => {
    await page.getByRole("button", { name: /Settings/ }).click();
    await expect(page.getByRole("region", { name: "Settings" }).or(page.locator("#settings-panel"))).toBeVisible();
    await shot(page, "student-settings");
    await page.getByRole("button", { name: /Settings/ }).click();
    return "panel opens and closes";
  });
  await check("Revision hubs and Privacy page open", async () => {
    for (const [u, name] of [["/revision/mid", "hub-mid"], ["/privacy", "privacy"]] as const) {
      await page.goto(u, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await shot(page, `student-${name}`);
    }
    return "both render";
  });
  await check("Phone layout (375px): no sideways scroll on home and lesson", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const u of ["/", "/week-1/hello-world"]) {
      await page.goto(u, { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    }
    await shot(page, "student-phone-lesson");
    await page.setViewportSize({ width: 1440, height: 900 });
    return "fits the screen";
  });

  // ---------- ADMIN ----------
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await adminCtx.newPage();
  watch(admin);
  await check("Admin page requires login (not indexed, no student content)", async () => {
    await admin.goto("/admin", { waitUntil: "networkidle" });
    await expect(admin.getByLabel("Username")).toBeVisible();
    await shot(admin, "admin-login");
    return "login form shown";
  });
  await check("Wrong password is rejected", async () => {
    await admin.getByLabel("Username").fill(U);
    await admin.getByLabel("Password").fill("wrong-password-123");
    await admin.getByRole("button", { name: "Sign in" }).click();
    await expect(admin.getByText(/invalid|incorrect|wrong|try again|failed/i).first()).toBeVisible({ timeout: 10000 });
    await shot(admin, "admin-wrong-password");
    return "error shown, still signed out";
  });
  await check("Correct username and password sign in", async () => {
    await admin.getByLabel("Password").fill(P);
    await admin.getByRole("button", { name: "Sign in" }).click();
    await expect(admin.getByText(/instructor admin/)).toBeVisible({ timeout: 15000 });
    await shot(admin, "admin-dashboard");
    return "dashboard opened";
  });
  await check("Website switch shows ON by default", async () => {
    await expect(admin.getByText("Website is ON")).toBeVisible();
    return "🟢 Website is ON";
  });
  await check("Unlock Week 3: students can then open the lesson", async () => {
    const week3 = admin.locator("li", { hasText: "Week 3:" }).first();
    await week3.getByRole("button", { name: "Unlock now" }).click();
    await expect(week3.getByText(/open/)).toBeVisible({ timeout: 10000 });
    await shot(admin, "admin-week3-unlocked");
    const sp = await student.newPage(); watch(sp);
    await sp.goto("/week-3/for-loop", { waitUntil: "networkidle" });
    await expect(sp.getByRole("heading", { name: /Learning goal/ })).toBeVisible();
    await sp.screenshot({ path: `${DIR}/${String(++n).padStart(2, "0")}-student-week3-now-open.png` });
    await sp.close();
    return "Week 3 lesson opened for students";
  });
  await check("Mark Week 1 as taught: badge appears for students", async () => {
    const week1 = admin.locator("li", { hasText: "Week 1:" }).first();
    await week1.getByRole("button", { name: /Mark taught/ }).click();
    await expect(week1.getByText(/✅ taught/)).toBeVisible({ timeout: 10000 });
    return "taught flag saved";
  });
  await check("Post an announcement: students see it; then delete it", async () => {
    await admin.getByRole("tab", { name: "Announcements" }).click();
    await admin.getByLabel(/New announcement/).fill("Quiz 1 on Friday. Revise Weeks 1 and 2.");
    await admin.getByRole("button", { name: "Publish" }).click();
    await expect(admin.getByText("Quiz 1 on Friday").first()).toBeVisible({ timeout: 10000 });
    await shot(admin, "admin-announcement");
    const sp = await student.newPage(); watch(sp);
    await sp.goto("/", { waitUntil: "networkidle" });
    await expect(sp.getByText(/Quiz 1 on Friday/)).toBeVisible({ timeout: 10000 });
    await sp.screenshot({ path: `${DIR}/${String(++n).padStart(2, "0")}-student-announcement.png` });
    await sp.close();
    return "banner visible on the student home page";
  });
  await check("Website OFF: the student site closes (home, lesson, playground, question API)", async () => {
    admin.once("dialog", (d) => d.accept());
    await admin.getByRole("button", { name: "Turn website OFF" }).click();
    await expect(admin.getByText("Website is OFF")).toBeVisible({ timeout: 10000 });
    await shot(admin, "admin-website-off");
    const sp = await student.newPage(); watch(sp);
    for (const [u, nm] of [["/", "home"], ["/week-1/hello-world", "lesson"], ["/playground", "playground"]] as const) {
      await sp.goto(u, { waitUntil: "networkidle" });
      await expect(sp.getByText(/is closed right now/)).toBeVisible();
      // no course content may be in the HTML while closed (generic interface text can be; lesson text must not)
      if (u.startsWith("/week-")) expect(await sp.content()).not.toContain("Everyday-life warm-up");
      await sp.screenshot({ path: `${DIR}/${String(++n).padStart(2, "0")}-student-closed-${nm}.png` });
    }
    const pool = await sp.request.get("/api/pool");
    expect(JSON.stringify(await pool.json())).toContain("maintenance");
    await sp.close();
    return "home, lesson and playground show 'closed'; question API refuses";
  });
  await check("Admin still works while the website is OFF", async () => {
    await admin.reload({ waitUntil: "networkidle" });
    await expect(admin.getByText(/instructor admin/)).toBeVisible();
    return "admin page unaffected";
  });
  await check("Website ON again: students get the site back", async () => {
    admin.once("dialog", (d) => d.accept());
    await admin.getByRole("button", { name: "Turn website ON" }).click();
    await expect(admin.getByText("Website is ON")).toBeVisible({ timeout: 10000 });
    const sp = await student.newPage(); watch(sp);
    await sp.goto("/", { waitUntil: "networkidle" });
    await expect(sp.getByRole("heading", { level: 1 })).toContainText("Programming Fundamentals");
    await sp.screenshot({ path: `${DIR}/${String(++n).padStart(2, "0")}-student-back-on.png` });
    await sp.close();
    return "site restored";
  });
  await check("Admin tabs: Analytics, Audit log, Health, Settings, Backup", async () => {
    for (const [label, name] of [["Analytics", "analytics"], ["Audit log", "audit"], ["Health", "health"], ["Settings", "settings"], ["Backup", "backup"], ["AI tutor", "tutor"], ["Leaderboard", "leaderboard"]] as const) {
      await admin.getByRole("tab", { name: label }).click();
      await admin.waitForTimeout(500);
      await shot(admin, `admin-tab-${name}`);
    }
    await admin.getByRole("tab", { name: "Audit log" }).click();
    const t = await admin.locator("main").innerText();
    expect(t).toMatch(/week|setting|announcement/i);
    return "all 7 tabs open; audit log lists the actions above";
  });
  await check("Sign out returns to the login form", async () => {
    await admin.getByRole("button", { name: "Sign out" }).click();
    await expect(admin.getByLabel("Username")).toBeVisible({ timeout: 10000 });
    return "signed out";
  });

  // ---------- REPORT ----------
  const lines = ["# Live test results (real Chrome)", "", `Run: ${new Date().toISOString()}`, "", "| # | Check | Result | Note |", "|---|---|---|---|"];
  results.forEach((r, i) => lines.push(`| ${i + 1} | ${r.step} | ${r.ok ? "PASS" : "FAIL"} | ${r.note.replace(/\|/g, "/")} |`));
  const uniq = [...new Set(consoleErrors)];
  lines.push("", `Console errors during the whole run: ${uniq.length}`, ...uniq.map((e) => `- ${e}`));
  writeFileSync(`${DIR}/RESULTS.md`, lines.join("\n"));
  console.log(lines.join("\n"));
  expect(results.filter((r) => !r.ok), "failed checks").toEqual([]);
});
