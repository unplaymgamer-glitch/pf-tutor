import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lessonSeo } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

const lessons = readdirSync("content").flatMap((d) => readdirSync(join("content", d)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join("content", d, f), "utf8")) as { week: number; slug: string; title: string }));

describe("lesson search-result text", () => {
  it("every title is 60 characters or fewer with the site name, and unique", () => {
    const titles = lessons.map((t) => `${lessonSeo(t.week, t.slug, t.title).title} | ${SITE_NAME}`);
    expect(titles.filter((x) => x.length > 60)).toEqual([]);
    expect(new Set(titles).size).toBe(titles.length);
  });
  it("every description is 120 to 155 characters, states the benefit and is unique", () => {
    const d = lessons.map((t) => lessonSeo(t.week, t.slug, t.title).description);
    expect(d.filter((x) => x.length < 120 || x.length > 155)).toEqual([]);
    expect(new Set(d).size).toBe(d.length);
    expect(d.every((x) => /C\+\+/.test(x) && /quiz/.test(x))).toBe(true);
  });
  it("the title names the topic and C++", () => expect(lessonSeo(3, "for-loop", "The for loop: x").title).toBe("For Loop in C++ for Beginners"));
});
