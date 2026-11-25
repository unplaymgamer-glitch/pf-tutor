# Launch checklist

## Before you tell students
- [ ] Deployed and smoke-tested (see `docs/DEPLOY.md` section 4).
- [ ] Admin password is 12+ characters and stored in your password manager.
- [ ] Tutor monthly budget cap set (Admin → Tutor). Daily limits reviewed.
- [ ] Only the weeks you have taught are unlocked (Admin → Weeks). Weeks unlock automatically at a scheduled time if you set one.
- [ ] Instructor answers added for questions you want answered in your own words (Admin → Instructor answers).
- [ ] You opened one lesson on a real phone and ran a program in the Playground (the compiler download is about 60 MB; use Wi-Fi).
- [ ] You read the Privacy page and are happy with it (`/privacy`).

## Search engines (free) — honest expectations
Indexing and ranking take days to weeks and **cannot be guaranteed**. This site has a sitemap, unique titles and descriptions, structured data (Course, LearningResource) and fast pages, which is everything the site itself can do. Locked weeks are not listed in the sitemap until you unlock them.

1. **Google Search Console** (search.google.com/search-console) → Add property → *URL prefix* → your site address.
2. Verify ownership: choose *HTML tag*, copy the `<meta name="google-site-verification" ...>` value, send it to whoever maintains the code (add it to `app/layout.tsx` under `metadata.verification.google`), redeploy, press Verify.
3. Sitemaps → enter `sitemap.xml` → Submit.
4. **Bing Webmaster Tools** (bing.com/webmasters) → Import from Google Search Console (one click), or add the site and submit `https://<site>/sitemap.xml`.
5. After unlocking new weeks, re-submit the sitemap or use *URL Inspection → Request indexing* for the new pages.
6. Check *Pages* and *Performance* in Search Console after two to four weeks.

## During the semester
- [ ] After each class mark the topics you covered as **taught** (students see a badge).
- [ ] Post an announcement before quizzes and the mid-term. Switch on **Exam mode** during a quiz to hide practice answers.
- [ ] Look at Analytics weekly: lessons nobody opens, questions most students miss, top tutor topics.
- [ ] Watch the AI spend line in Admin → Tutor.
- [ ] Use Maintenance mode only for emergencies (it blocks all lessons).

## Known limitations to tell students
- The in-browser compiler runs Basic mode (small interpreter, no pointers or file I/O) until the student downloads the full compiler once; phones with little memory may fail to compile large programs, and then the Compiler Explorer link is the fallback.
- Week 15 graphics programs (`graphics.h`) run only on lab PCs with Turbo C++/WinBGIm; the site shows a simulation.
- Firefox, Safari and iOS were not tested by the builder (see `docs/VERIFICATION_REPORT.md`).
