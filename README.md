# PF Tutor — CC111 Programming Fundamentals (C++) for UMT students

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Funplaymgamer-glitch%2Fpf-tutor&project-name=pf-tutor&repository-name=pf-tutor&env=ADMIN_USERNAME,ADMIN_PASSWORD_HASH_B64,SESSION_SECRET,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_SITE_URL&envDescription=Admin%20login%20and%20database%20settings%20for%20your%20own%20copy)

**Open source (MIT).** Click *Deploy with Vercel*, paste the environment values when asked, and your own copy of the site runs. Students use `https://<your-project>.vercel.app/`; the instructor admin is at `/admin` (sign-in, lock/unlock weeks, announcements, and the **website ON/OFF switch** that closes the whole student site).

A free, no-login learning site for the BSCS course **CC111 Programming Fundamentals** (University of Management and Technology, Lahore): 16 weeks, 79 lessons, every code sample compiled and checked, animations, an in-browser C++ runner, an AI tutor, quizzes and revision hubs. A separate protected admin page lets the instructor lock/unlock weeks, mark topics taught, post announcements and read anonymous analytics.

Built with Next.js 16 (App Router), React 19, Tailwind 4 and TypeScript. Hosted on the free tiers of Vercel and Supabase.

## Quick start
```powershell
npm install
npm run dev                       # http://localhost:3000 (all 16 weeks open)
npm test                          # unit tests (set CC111_GXX=<path to g++> to also compile every lesson sample)
npm run verify:content            # compile + run every code sample and compare with the stored output
npm run build && npm start        # production build
npx playwright test               # end-to-end, accessibility and layout tests (uses your installed Chrome)
```

## Documents
| File | What it is |
|---|---|
| `docs/DEPLOY.md` | Exact Vercel deployment steps, environment variables, smoke test, secret rotation |
| `docs/ADMIN_GUIDE.md` | Non-technical guide for the instructor |
| `docs/LAUNCH_CHECKLIST.md` | Before launch, Google/Bing setup, semester routine, known limitations |
| `docs/VERIFICATION_REPORT.md` | Acceptance criteria 1-12 with evidence, limits and next steps |
| `docs/UX_REVIEW.md` | Beginner-on-a-phone review: what was fixed, what is still open |
| `docs/CONTENT_COVERAGE.md` | Outline topic to lesson map (generated: `npx tsx scripts/gen-coverage.mts`) |
| `docs/DECISIONS.md`, `docs/SOURCE_CONFLICTS.md` | Technical choices; where the sources disagreed |
| `docs/CONTENT_AUTHORING*.md` | How to write a new lesson (JSON schema, verification rules) |
| `docs/TUTOR_EVAL.md` | AI tutor evaluation set and how to run it |
| `PROGRESS.md` | Phase-by-phase status, what is verified and what is not |
| `THIRD_PARTY_NOTICES.md` | Licences of bundled third-party code (wasm-clang etc.) |

## Layout
`content/week-NN/*.json` lessons · `lib/` logic (course, gating, game engine, tutor, runner, visual generators) · `components/` UI · `app/` routes and API · `scripts/` verifier, admin hash tool, tutor eval, coverage generator · `tests/` unit tests · `e2e/` Playwright tests · `public/runner/` compiler loader.

Secrets live only in Vercel environment variables or `.env.local` (git-ignored). See `.env.example` for the names.
