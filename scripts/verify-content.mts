// Compiles and runs every code sample with g++ and compares real stdout to the stored expectedOutput.
// Usage: tsx scripts/verify-content.mts           (check; exit 1 on any failure)
//        tsx scripts/verify-content.mts --record  (fill empty expectedOutput from the real run; never overwrites non-empty)
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { Topic, allSamples, normalizeOutput } from "../lib/content-schema";

const record = process.argv.includes("--record");
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx >= 0 ? process.argv.slice(onlyIdx + 1).filter((a) => !a.startsWith("--")) : []; // e.g. --only variables-datatypes input-output
const root = join(process.cwd(), "content");
let failures = 0, checked = 0;

function runSample(code: string, stdin: string, graphics = false) {
  const dir = mkdtempSync(join(process.env.CC111_TMP ?? (process.platform === "win32" ? "C:\\" : tmpdir()), "cc111-"));
  try {
    // Windows: base dir must have no spaces (default C:\, override with CC111_TMP). Run inside the temp dir with relative names: MinGW's linker breaks on spaces in absolute paths.
    const exeName = process.platform === "win32" ? "a.exe" : "a.out";
    const exe = join(dir, exeName);
    writeFileSync(join(dir, "main.cpp"), code);
    if (graphics) {
      // graphics.h is not standard C++: type-check against stub headers; the Graphics visual draws it (see lib/visuals/graphics.ts)
      for (const h of ["graphics.h", "conio.h"]) writeFileSync(join(dir, h), readFileSync(join(process.cwd(), "scripts", "stubs", h), "utf8"));
      const g = spawnSync(process.env.CC111_GXX ?? "g++", ["-std=c++17", "-Wall", "-fsyntax-only", "-I.", "main.cpp"], { encoding: "utf8", timeout: 60000, cwd: dir });
      return g.status === 0 ? { ok: true as const, out: "" } : { ok: false as const, err: "GRAPHICS TYPE-CHECK ERROR: " + g.stderr };
    }
    const c = spawnSync(process.env.CC111_GXX ?? "g++", ["-std=c++17", "-Wall", "-O0", "main.cpp", "-o", exeName], { encoding: "utf8", timeout: 60000, cwd: dir, env: { ...process.env, TMP: dir, TEMP: dir, TMPDIR: dir } });
    if (c.status !== 0) return { ok: false as const, err: "COMPILE ERROR:\n" + c.stderr };
    const r = spawnSync(exe, [], { input: stdin, encoding: "utf8", timeout: 5000, maxBuffer: 1 << 20, cwd: dir });
    if (r.error || r.status !== 0) return { ok: false as const, err: `RUNTIME ERROR (status ${r.status}) ${r.error ?? ""}` };
    return { ok: true as const, out: r.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const week of existsSync(root) ? readdirSync(root) : []) {
  for (const f of readdirSync(join(root, week)).filter((x) => x.endsWith(".json") && (only.length === 0 || only.some((o) => x.startsWith(o))))) {
    const path = join(root, week, f);
    const parsed = Topic.safeParse(JSON.parse(readFileSync(path, "utf8")));
    if (!parsed.success) { console.error(`SCHEMA FAIL ${path}\n${parsed.error.message}`); failures++; continue; }
    const topic = parsed.data;
    let dirty = false;
    for (const s of allSamples(topic)) {
      checked++;
      const res = runSample(s.code, s.stdin, s.graphics);
      if (!res.ok) { console.error(`FAIL ${topic.slug}/${s.id}: ${res.err}`); failures++; continue; }
      if (record && s.expectedOutput === "") { s.expectedOutput = res.out.replace(/\r\n/g, "\n"); dirty = true; console.log(`recorded ${topic.slug}/${s.id}`); continue; }
      if (s.trace) {
        const traced = s.trace.steps.map((t) => t.out).join("");
        const nl = s.code.split("\n").length;
        if (s.trace.steps.some((t) => t.line > nl)) { console.error(`TRACE FAIL ${topic.slug}/${s.id}: step points past the last code line`); failures++; }
        if (normalizeOutput(traced) !== normalizeOutput(res.out)) {
          console.error(`TRACE MISMATCH ${topic.slug}/${s.id}\n trace out: ${JSON.stringify(traced)}\n real out:  ${JSON.stringify(res.out)}`);
          failures++;
        }
      }
      if (normalizeOutput(res.out) !== normalizeOutput(s.expectedOutput)) {
        console.error(`MISMATCH ${topic.slug}/${s.id}\n expected: ${JSON.stringify(s.expectedOutput)}\n actual:   ${JSON.stringify(res.out)}`);
        failures++;
      }
    }
    if (dirty) writeFileSync(path, JSON.stringify(topic, null, 2) + "\n");
  }
}
console.log(`${checked} code samples checked, ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
