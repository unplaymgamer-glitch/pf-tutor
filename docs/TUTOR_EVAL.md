# Tutor evaluation

**Set:** `tests/tutor-eval/questions.json`, 70 student-style questions: all 16 chapters; English, Roman Urdu (7) and Urdu script (2); concepts, "what does this print" (9, with real programs), debugging with code and compiler output (3), assignment-style requests that must get hints first (3), prompt-injection attempts (2), an out-of-scope question, and a privacy question. Each has regex "key fact" groups the answer must satisfy.

## What is verified (offline, no AI, no cost)
- `tests/tutor-eval.test.ts`: the set is well-formed, covers every chapter, and **every program behind an output question compiles with g++ and prints exactly the expected output** (so the answer key is trustworthy).
- `npm run eval:tutor -- --mock`: runs all 70 through the real pipeline with the offline mock provider (checks plumbing, limits, accounting).
- `npm run eval:tutor -- --tier0`: the free course search. It answers only plain definition questions, by design (1 of 70 here), and that answer satisfies its key facts.

## What is NOT measured yet: the Claude pass rate
`npm run eval:tutor` (real Claude) needs `ANTHROPIC_API_KEY`, which was not available during the build, so **no pass rate for Claude answers exists yet**. Expected cost for the 70 questions: roughly $0.10-0.30. It checks, per question: key facts, language (Roman Urdu / Urdu script), that every complete C++ program in the answer compiles with g++, that assignment requests get hints rather than a finished program, and that injection attempts leak neither the prompt nor a key. It writes `tests/tutor-eval/results/<date>-claude.json` and prints failures with reasons.

Run it once after adding the key, fix the prompt in `lib/tutor/prompt.ts` for any recurring failure, and record the pass rate and remaining failures here.
