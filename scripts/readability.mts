// Reading-ease report for the English lesson text (goal, warm-up, definition, how it works). Run: npx tsx scripts/readability.mts [maxWeek]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fleschEase } from "../lib/readability";

const maxWeek = Number(process.argv[2] ?? 16);
const rows: string[] = [];
for (const d of readdirSync("content").sort()) {
  const w = Number(d.slice(5));
  if (w > maxWeek) continue;
  for (const f of readdirSync(join("content", d)).filter((x) => x.endsWith(".json"))) {
    const t = JSON.parse(readFileSync(join("content", d, f), "utf8"));
    const r = fleschEase([t.goal, t.warmup, t.definition, t.howItWorks].join("\n"));
    rows.push(`${r.score.toFixed(0).padStart(4)}  longest sentence ${String(r.longest).padStart(2)} words  week ${w}  ${f.replace(".json", "")}`);
  }
}
console.log(rows.sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4))).join("\n"));
