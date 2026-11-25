import { expect, test } from "@playwright/test";

// The top bar must never overlap itself, in any language, from a small phone to a wide laptop (the audit found overlaps at 768 and 1036 px).
for (const lang of ["en", "roman", "ur"]) {
  test(`header controls never overlap or leave the screen, 320 to 1600 px, ${lang}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.addInitScript((l) => localStorage.setItem("cc111.settings.v1", JSON.stringify({ lang: l })), lang);
    await page.goto("/", { waitUntil: "networkidle" });
    const problems: string[] = [];
    for (let w = 320; w <= 1600; w += 20) {
      await page.setViewportSize({ width: w, height: 800 });
      const boxes = await page.evaluate(() => {
        const items = [...document.querySelectorAll("header a, header button, header select")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden"; });
        return items.map((e) => { const r = e.getBoundingClientRect(); return { n: (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 24), x: r.left, y: r.top, r: r.right, b: r.bottom }; });
      });
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        if (a.r > w + 1 || a.x < -1) problems.push(`${w}px: "${a.n}" leaves the screen`);
        for (let j = i + 1; j < boxes.length; j++) {
          const b = boxes[j];
          const ox = Math.min(a.r, b.r) - Math.max(a.x, b.x), oy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
          if (ox > 2 && oy > 2) problems.push(`${w}px: "${a.n}" overlaps "${b.n}"`);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${w}px sideways scroll`).toBeLessThanOrEqual(1);
    }
    expect([...new Set(problems)]).toEqual([]);
  });
}
