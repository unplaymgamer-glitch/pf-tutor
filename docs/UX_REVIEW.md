# UX review (beginner on a phone)

**How this was done, honestly:** the builder walked the site as a first-year student at 375 × 812 (and 768 / 1440) in a real Chrome via Playwright and the in-app browser: home → roadmap → a lesson → animation → quiz → tutor → playground → progress → hubs, in light and dark mode. This is a careful self-review with automated accessibility and layout checks. It is **not** a test with real beginners; please watch two or three students use it in the first week and adjust.

## Found and fixed
| # | Problem a beginner would hit | Fix |
|---|---|---|
| 1 | After the Revision link was added, the top menu squeezed its words on top of each other on a phone ("PracticeReview…") | Menu items no longer shrink; the menu scrolls sideways |
| 2 | The "On this page" jump links (Goal, Warm-up…) were squashed and overlapped each other on phones, so the first link was hard to tap | Same fix: links keep their size; the strip scrolls |
| 3 | Code blocks that scroll sideways could not be reached with the keyboard | They are now focusable and announced as a group |
| 4 | "Copy" and "Try it" buttons were announced with different words than they show (confusing for screen-reader users, and voice control) | The spoken name now starts with the visible word |
| 5 | Lesson section titles were not real headings, so screen-reader users could not jump between sections | Titles are now level-2 headings |
| 6 | Some green and teal text on tinted boxes was hard to read in light mode (below the 4.5:1 contrast rule) | Light-theme green and teal are darker |
| 7 | Greyed-out "not reached yet" items used see-through text that failed contrast | They use a dashed border and muted colour instead |
| 8 | No privacy information and no footer | Plain-language Privacy page and a footer with the key links |
| 9 | "What is a variable?" in the tutor opened the Week 7 scope lesson once more lessons existed | The tutor prefers the lesson where a concept first appears |

## Still confusing, slow or risky (not fixed — decide with real students)
1. **First-load speed on a slow phone.** The Lighthouse mobile performance score is 70–84 on the builder's slow laptop (target 90). Content appears fast (LCP about 1 s, no layout shift) but the page needs about 1–2 s of JavaScript work on a throttled phone before buttons respond. Already done: the home page no longer downloads every question (525 KB to 578 bytes), the tutor chat panel and the heavy animations load only when needed. A server-component rewrite of the lesson view was tried and measured: no change in CPU time, because the framework and shared shell (not the lesson content) cost most of the load, so it was not kept. Check the real score on pagespeed.web.dev after deployment before spending more time here.
2. **The two revision hubs are very long pages** (47 and 76 lessons). They are meant for printing or Ctrl+F, but a phone user must scroll a lot. The jump buttons at the top help; a search box would help more.
3. **The 60 MB compiler download is a choice the student must understand.** The wording explains it, but students on mobile data may still press it by mistake. The Basic mode works without it for simple programs.
4. **Week 15 graphics is a simulation.** Every lesson says so, but a student may still try to run `graphics.h` code in the Playground and get an error. The error explainer does mention it.
5. **Urdu-script lesson text is not written yet.** The interface and tutor can answer in Urdu script; lesson bodies are English with Roman Urdu summaries.
6. **Daily challenge and streak messages are English only.**
7. **Large quizzes at the end of long lessons** are not paginated; a student must scroll. Acceptable for now.

## Intrusive UI check
No autoplay audio or video. No pop-ups that block reading (the tutor is a panel the student opens; Escape closes it). Layout shift while loading is near zero (CLS 0.00–0.006 in Lighthouse).
