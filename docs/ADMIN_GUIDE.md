# Instructor admin guide (non-technical)

Your admin page is at `https://<your-site>.vercel.app/admin` (locally: `http://localhost:3000/admin`).
It is not linked anywhere, is hidden from search engines, and needs your username and password.

## First-time setup (once)
1. In the project folder run `npm run admin:hash`. Type a password (12+ characters) twice. It is hidden while you type and is never saved or shown.
2. The command prints two lines: `ADMIN_PASSWORD_HASH=...` and `SESSION_SECRET=...`. Copy them.
3. Create `.env.local` (copy `.env.example`), set `ADMIN_USERNAME=admin`, and paste the two lines. Also set `SUPABASE_SERVICE_ROLE_KEY` from Supabase > Project Settings > API (the `service_role` secret).
4. On Vercel: Project > Settings > Environment Variables, add the same five names (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), then redeploy.
Never paste the password or these values into chat, email or git. `.env.local` is already git-ignored.

## Daily use
- **Lock / unlock a week:** Weeks & topics > "Lock" or "Unlock now". A locked week shows students only "Coming soon". Its lesson text is not sent to their browser at all.
- **Open a week automatically:** pick "Open at" date and time, press "Schedule".
- **Mark a week taught:** "Mark taught". Students see "Taught in class ✅" on the roadmap.
- **One topic only:** press "Topics" under a week and choose Follow week / Always open / Locked.
- **Announcement:** Announcements tab, type the message (and optionally start/end time), Publish. It shows as a small dismissible banner.
- **Emergency:** Settings > Maintenance mode ON blocks every lesson immediately.
- **Exam mode:** Settings > Exam mode removes practice solutions from the pages (on the server) until you turn it off.
- **Analytics:** anonymous counts only (visits per chapter, most viewed lessons, mobile vs desktop, average quiz score, most missed questions).
- **Audit log:** every admin action with time.
- **Backup:** Backup tab downloads settings and analytics.
- Changes reach students within about 10 to 40 seconds (CDN cache).

## AI tutor
Admin > AI tutor shows whether Claude is connected, this month's spend against your cap, questions today, the most asked lessons, and these controls: on/off, monthly budget, questions per student per day, deep answers per student per day, hints-first, and how sure the lessons must be to answer a definition for free.
- **Instructor answers:** add keywords (all must appear in the question) and an answer. Matching questions get your answer instantly at no cost, and the AI is told to prefer them.
- **Getting the API key:** console.anthropic.com > API keys > create key; add credits there (your Claude.ai subscription does not work for this). Put it in `.env.local` and in Vercel as `ANTHROPIC_API_KEY`, then redeploy. To rotate: create a new key, replace the Vercel value, redeploy, then delete the old key in the console.
- Set a low monthly cap first (for example $5) and watch the first week.

## Security you should know
- Five wrong passwords lock the login for 15 minutes (with growing delays). Sign out ends every admin session on every device.
- Sessions last 8 hours. Change the password by running `npm run admin:hash` again and updating the Vercel variable; then press Sign out once to end old sessions.
- To rotate the session secret, change `SESSION_SECRET` in Vercel and redeploy (everyone is signed out).

## Not done yet (later phases)
"Upload new material" instructions. The 3D feature toggle is stored but no 3D scenes exist yet (leaderboard, voice, uploads and the code runner toggles are live).
