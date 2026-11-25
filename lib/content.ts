// Server-only content loader (reads content/week-XX/*.json at build time).
import "server-only";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Topic } from "./content-schema";

const ROOT = join(process.cwd(), "content");
const dirFor = (week: number) => join(ROOT, `week-${String(week).padStart(2, "0")}`);

export function getTopics(week: number): Topic[] {
  const dir = dirFor(week);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => Topic.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function getTopic(week: number, slug: string): Topic | undefined {
  return getTopics(week).find((t) => t.slug === slug);
}

export function allTopics(): Topic[] {
  return Array.from({ length: 16 }, (_, i) => getTopics(i + 1)).flat();
}
