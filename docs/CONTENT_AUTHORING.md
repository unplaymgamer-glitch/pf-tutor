# Content authoring guide (for writing lesson JSON)

Project: `D:\claude websites projects\cc111-platform` (Next.js site for UMT CC111 Programming Fundamentals, C++).
One lesson = one JSON file `content/week-NN/<slug>.json` that must satisfy `lib/content-schema.ts` (zod). Read that file first.
**Gold-standard reference:** `content/week-01/hello-world.json`. Match its depth and structure, but each lesson needs MORE than it has (see Requirements).

## Audience and voice
First-semester students, many with zero programming background, many reading English as a second language, in Pakistan.
Short sentences. Define every term the first time. Warm-ups use Pakistan-relevant everyday life (rickshaw fare, exam marks, mobile load, cricket scores, utility bills, canteen prices). Never copy text from any website or the textbook; explain in your own words. Use the instructor's notes as the primary source (`content-extracted/CC111_Programming_Fundamentals_Complete_Notes_docx.txt`, grep for your section heading, e.g. `## 2.4`), the lecture slides text in `content-extracted/*_pptx.txt`, and Gaddis (`content-extracted/Gaddis.txt`, large, grep only) to verify facts. Keep the instructor's teaching order: everyday-life warm-up, big idea first, syntax second, flowchart before code, one concept at a time, worked example, common mistakes.
Code style: `#include <iostream>`, `using namespace std;`, `int main()`, `return 0;`, 4-space indent. C++17. Only features students have met up to this week.

## Requirements per lesson (all mandatory)
- `goal` ("After this you can ..."), `warmup`, `definition` (simplest words, no unexplained jargon), `howItWorks`, `syntax` (annotated with `//` comments, a code string).
- `worked`: exactly 3 entries with levels `basic`, `intermediate`, `exam` (exam = typical university exam question). Each has `problem`, `pseudocode` (steps), `flowchartMermaid` (valid Mermaid `flowchart TD`; use `([Start])`, `[/Input or Output/]`, `[Process]`, `{Decision}`; quote labels containing special characters), and a `sample` with real C++ code, `stdin` (only if the program uses cin), `expectedOutput` set to `""` (you fill it with `--record`), and `explanation` (line-by-line, `line` = 1-based line of that code string).
- At least ONE sample per lesson must have a `trace` (hand-authored steps: `line`, `vars` = value of changed variables AFTER that step, `note` plain-language, `out` = text printed by that step). `trace.types` maps each variable to its C++ type (use `{}` if no variables). The concatenation of all `out` must equal the real program output exactly (the verifier fails otherwise). Prefer small, clear traces (5-14 steps).
- `visuals`: 1-2 interactive visuals of the kinds the schema allows (`pipeline`, `decision`, `truth`, `switch`, `match`; do not use `trace`, traces render automatically). Pick what fits the topic (concept topics: `pipeline` or `match`; conditionals: `decision` / `truth` / `switch`). `decision` expressions use only numbers, variable names, `! && || == != < <= > >= + - * / %` and parentheses.
- `variations` table (all forms/ways), `mistakes` (3+ with wrong code, right code and the real compiler message; if you quote a g++ message, confirm it by actually compiling the wrong code), `examTips` (3-5), `romanSummary` (3-5 simple lines of Roman Urdu: Urdu written in English letters, technical terms stay English).
- `practice`: 6-8 questions mixing types `mcq`, `output`, `bug`, `blank`, `write`, difficulties `easy/medium/hard`, each with `hint`, `answer`, `explanation`. For `output` questions the answer MUST be what a real run prints: compile and run the code to get it (do not guess). `blank`/`write`/`bug` answers must be correct, compilable C++ when they are code.
- `quiz`: 4-5 questions, ALL `type: "mcq"` with 3-4 `options` and `answer` equal (exact string) to one option.
- `sources`: the outline topic names this lesson covers (from `docs/CONTENT_MAP.md` / the official outline).
- `order`: number given in your assignment (controls order within the week).
- Slug: lowercase-with-hyphens; filename = `<slug>.json`; `week` matches the folder.

## Workflow
1. Write the JSON with `expectedOutput: ""` everywhere.
2. Record + verify (compiles and runs every sample with g++):
   `CC111_GXX=C:/mingw64/bin/g++.exe npx tsx scripts/verify-content.mts --record --only <slug> [<slug> ...]`
   then re-run WITHOUT `--record` to confirm 0 failures. (On this Windows machine the system g++ cannot link; always set `CC111_GXX` as above. Use the Bash tool.)
3. Quick-check a few `output` practice answers by compiling them yourself in a scratch folder with no spaces in the path, e.g. `C:/cc111t/<yourname>/`, using `C:/mingw64/bin/g++.exe` with relative file names and `cd` into that folder first.
4. `npx vitest run tests/content.test.ts` must pass for your files.
5. Do NOT edit any file except your own lesson JSONs. Do not touch `lib/`, `components/`, `app/`, other agents' lessons, or git (the lead commits).
6. Report: files written, verify output summary, and anything you could not verify or that conflicts between the notes and the textbook.

## Accuracy rules
- Never ship a sample you did not compile. Never invent compiler output. If a mistake-example error message is not verified, describe it generically ("compiler reports a missing semicolon") instead of quoting.
- Mermaid must be syntactically valid; keep node labels short.
- Official outline order and scope win; do not add topics from later weeks.
