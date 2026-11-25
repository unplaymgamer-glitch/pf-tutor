# DECISIONS (Phase 0) — verified from web search on 2026-11-24

Items marked **RE-VERIFY** must be checked against the official page right before the dependent phase, because only secondary sources were captured.

## Hosting: Vercel Hobby
- Hobby is **non-commercial personal use only**; a free university-course site fits. ~1,000,000 function invocations/month included, 300 s max function duration. Exceeding limits can pause the account for up to 30 days (no surprise bill).
- Fast Origin Transfer 10 GB figure is unclear for Hobby. **RE-VERIFY** at vercel.com/docs/limits/fair-use-guidelines.
- Decision: SSG for all lesson pages (zero function cost), functions only for admin, gating, AI tutor, leaderboard. Cache aggressively. Lock-gated chapters are the only server-rendered content.

## Database: Supabase Free
- 500 MB DB per project, 5 GB egress, 1 GB file storage, 2 active projects, **pauses after 1 week of inactivity** (the existing AoA project already uses a keep-alive cron; CC111 gets its own project + same keep-alive).
- Decision: store only small rows (lock state, taught status, announcements, anonymous aggregates, leaderboard). No lesson content in DB. **RE-VERIFY** exact egress numbers at supabase.com/pricing before launch.

## Code runner (Piston is out)
- Public Piston (emkc.org) restricted from 15 Feb 2026: not used.
- Tier 1 candidates: binji/wasm-clang (~48 MB repo), a "C++ Playground" style Clang+lld+libc++ wasm bundle (~60 MB first load, cached, has stdin for `cin`), Wasmer clang (~100 MB uncompressed, file-based I/O, no stdin). Emception (Emscripten in browser) is another option.
- Decision: prototype Tier 1 on a wasm-clang-style bundle in a Web Worker; measure size, startup and `cin` support in Phase 4 before committing. Opt-in download button only (never auto on mobile data), cached in Cache Storage.
- Tier 2: small in-browser C++ interpreter (JSCPP-style) for basic programs. Tier 3: deep link to an external compiler.
- Risk: COOP/COEP headers (needed for SharedArrayBuffer stdin) can break third-party embeds; the site will have none. Safari/iOS support is **unverified** until tested.

## AI tutor
- Tier 0: free course search over the build-time index (MiniSearch).
- Tier 1 free model: candidates Groq (per-model limits, e.g. gpt-oss-120b 30 RPM / 1,000 RPD / 200k tokens/day), Gemini free tier, OpenRouter free models. **Concern:** Google's free tier may use prompts to improve its products and human reviewers may read them — unsuitable for student data by default. Decision: do not use Gemini free for student questions; evaluate Groq/OpenRouter in Phase 6 and skip Tier 1 if quality for Urdu/Roman Urdu is poor (will be reported).
- Tier 2: Claude API with the instructor's key, server-side only. Cache reads ~0.1x input price, writes 1.25x (5-min TTL). Exact current model IDs and prices **RE-VERIFY** via the Anthropic pricing docs in Phase 6 (search results conflicted on Haiku/Sonnet figures).
- A Claude.ai subscription does not provide an API key; the console key needs separate credits.

## Stack
Next.js (App Router, TS, Tailwind), three/R3F lazily loaded, Framer Motion, Monaco/CodeMirror (measure), MiniSearch, Playwright/Vitest. **The Next.js in this environment has newer-than-training APIs** (the AoA project's AGENTS.md warns of this): read `node_modules/next/dist/docs/` after scaffolding, before writing code.

## Scope decisions needing your OK
1. Week 15 graphics: `graphics.h` cannot run in-browser → labelled canvas simulation of the same functions (circle, line, rectangle, animation).
2. Week order follows the outline, not your folder numbering (see SOURCE_CONFLICTS.md).
3. Weeks 6–16 have no slides: lessons built from the notes + Gaddis, flagged "no slide source" in CONTENT_COVERAGE.md.
4. Project folder: `D:\claude websites projects\cc111-platform` (separate from AoA).

## Phase 4 decisions (code runner) — 2026-11-24
- **Tier 1 chosen and verified:** binji/wasm-clang (clang 8.0.1, C++17 flag, libc++, wasm-ld). Measured in Node and in the browser: compile+link+run 0.7-1.7 s; supports cin (stdin supplied up front, so NO SharedArrayBuffer and NO COOP/COEP headers are needed), strings, structs, pointers, new/delete, recursion, file I/O (in-memory files), sorting. NOT supported: try/catch/throw (exceptions disabled), `<chrono>`-style precise timing, threads. clang 8 is old: modern C++20 features are unavailable (not needed for CC111).
- **Download cost:** about 60 MB, once per device, then cached (Cache Storage). Nothing downloads without the student pressing "Enable"; if the files are already cached, full mode starts silently. A raw 60 MB download measured ~0.3-1 MB/s from raw.githubusercontent.com in this test environment, so expect 1-3 minutes on slow campus Wi-Fi.
- **Hosting:** none of our own. Files load from pinned, hash-verified mirrors (jsDelivr for the three files under its 20 MB limit; raw.githubusercontent.com and binji.github.io as fallbacks; `clang` at 31 MB exceeds jsDelivr's limit). If every mirror is down, full mode cannot start and Basic mode / external link remain. Hash pinning means a compromised mirror cannot run code on students' devices.
- **Safety limits:** 8 s run limit (worker is killed, then restarts from cache), 40 s compile limit, 200 KB output cap, run in a Web Worker so the page never freezes.
- **Tier 2:** JSCPP in a worker. Works for roughly Weeks 1-6 style programs (loops, arrays, 2-D arrays, functions without references, recursion, switch, c-strings). Fails on string class, structs, new/delete, references, files, vector. The Playground detects these and offers full mode instead of showing a confusing error. JSCPP is unmaintained (last release ~4 years ago): acceptable for a fallback.
- **Tier 3:** one-tap Compiler Explorer link (compiler id g162 = gcc 16.2, re-verify against godbolt.org/api/compilers/c++ before launch). The code is copied to the clipboard as well. The UI states that code is sent to godbolt.org.
- **Editor:** CodeMirror 6 (small, mobile-friendly) instead of Monaco.
- **Week 15 opportunity:** the compiler build already contains a canvas import layer (`-lcanvas`) used by its authors' demos; a real graphics simulation for Week 15 may be possible later without graphics.h. Not built yet.

## Phase 6 decisions (AI tutor) — 2026-11-25
- **Models (verified against the Claude API reference on 2026-11-25; re-verify before launch):** Claude Haiku 5.5 `claude-haiku-5-5` ($0.10 in / $0.50 out per million tokens) for simple and medium questions; Claude Sonnet 5.5 `claude-sonnet-5-5` ($2 / $10) for hard ones (code that needs debugging, images, long Urdu-script answers, long chats, and the "Answer more deeply" button). A Claude.ai subscription does NOT work as an API key; the key comes from console.anthropic.com with separate credits. Typical cost: a Haiku answer is a fraction of a cent; a Sonnet answer about 1-2 cents.
- **Tiers:** Tier 0 = instructor answers and a free course-search answer for plain "what is X" questions (no AI call, no cost). Tier 1 (free provider) is **deliberately not enabled**: the `AIProvider` interface has a slot for it, but free tiers need their own keys, send student text to a third party (Google's free Gemini tier may use prompts to improve its products), and I could not verify their Urdu/Roman Urdu quality without keys. Tier 2 = Claude. The router (`lib/tutor/router.ts`) picks Haiku vs Sonnet from question length, reasoning words, attached code or image, language and turn count; the student can always press "Answer more deeply".
- **Cost control:** the stable system prompt is marked cacheable (cache reads cost ~10%); the question and retrieved notes go in the user turn so the prefix never changes; effort is `low` or `medium` (never higher) and answers are capped at 900-1800 tokens; admin monthly budget cap (default $5) checked BEFORE each call with a pessimistic estimate and updated with the real `usage` cost after; per-device daily limit (default 20), per-device deep-answer limit (default 5), per-network limit; when a cap is hit the tutor says it is resting and still offers lesson links; definitions stay free even at a $0 budget.
- **Guardrails:** system prompt = patient CC111 tutor, beginner language, scope limited to the course (anything else is flagged as beyond CC111), never invents syntax/output (suggests compiling in the Playground), hint-first for assignment-like requests (admin can relax), language rules for English / Roman Urdu / Urdu script with code kept in English. Everything the student pastes or uploads (code, files, error text, retrieved notes) is wrapped in data tags, closing tags inside it are defused, obvious injection phrases are detected and the model is told to ignore them for that turn; no secret ever enters a prompt. Replies are rendered as plain text, code blocks, bold and internal links only, never as HTML.
- **Privacy:** chat history lives only in the student's browser (IndexedDB); the server stores nothing but anonymous counters (questions per device id per day, lesson topic counts, spend). Messages go to Anthropic when Tier 2 is used. Images are re-encoded in the browser to strip metadata. The model answers only from lessons that are currently unlocked.
- **Voice and upload:** voice uses the browser's Web Speech API, feature-detected: Urdu recognition and an Urdu voice may be missing on some browsers/devices (the UI says so and never reads Urdu with an English voice). Uploads: .cpp/.txt up to 20 KB or PNG/JPEG screenshots; never executed; the instructor can switch uploads off (enforced server-side).
- **Not Claude Fable/Opus:** cost and speed matter more than peak reasoning for a first-semester tutor; Opus/Fable would cost 20-80x more per answer.
