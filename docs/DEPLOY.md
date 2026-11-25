# Deploying to Vercel (free Hobby plan) — exact steps

Everything here is free: Vercel Hobby, the Supabase free project, and (optional) pay-as-you-go Anthropic credits for the AI tutor.
**Status:** the app is deploy-ready (production build passes, 0 npm audit findings). It has NOT been deployed from this machine because that needs your Vercel and GitHub accounts.

## 1. Put the code on GitHub
1. Create an empty **private** repository on GitHub (for example `cc111-pf-hub`).
2. In the project folder run:
   ```powershell
   git remote add origin https://github.com/<your-user>/cc111-pf-hub.git
   git push -u origin main
   ```
   (`.env.local` is git-ignored, so no secrets are uploaded.)

## 2. Create the admin password hash (on your own computer)
```powershell
npm run admin:hash
```
Type a password of 12+ characters twice (hidden). It prints `ADMIN_PASSWORD_HASH=...` and `SESSION_SECRET=...`. Keep that window private. Never paste the password, the hash, or any key into chat, email or git.

## 3. Import the project in Vercel
1. vercel.com → Add New → Project → pick the repository → Framework preset **Next.js** (auto). Do not change the build settings.
2. Before pressing Deploy, open **Environment Variables** and add (Production, Preview optional):

| Name | Value | Needed for |
|---|---|---|
| `ADMIN_USERNAME` | `admin` (or your choice) | admin login |
| `ADMIN_PASSWORD_HASH` | from step 2 | admin login |
| `SESSION_SECRET` | from step 2 | admin session cookie |
| `SUPABASE_URL` | `https://kyjoqfzadxmzumqtfkdz.supabase.co` | lock/unlock, announcements, analytics, leaderboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret | same (server only; never in the browser) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (needs credits; a Claude.ai subscription is not an API key) | AI answers (the tutor still answers definitions for free without it) |
| `NEXT_PUBLIC_SITE_URL` | your final address, e.g. `https://cc111.vercel.app` | canonical links, sitemap, social cards |

3. Press **Deploy**. The first deploy takes about a minute.

## 4. Check the live site (post-deploy smoke test, 5 minutes)
Replace `<site>` with your address.
1. `https://<site>/` loads; all 16 weeks are open (nothing is locked unless you lock it in the admin).
2. `https://<site>/week-1/hello-world` loads; press Next a few times in the animation.
3. `https://<site>/robots.txt` lists `Disallow: /admin`; `https://<site>/sitemap.xml` lists only open lessons.
4. `https://<site>/admin` → log in → lock Week 3 → reload the student site within ~10 seconds: Week 3 shows "Coming soon". Unlock it again.
5. Post a test announcement; it appears on the student site; delete it.
6. Open the tutor (💬) and ask "What is a variable?" (answers for free); ask a harder question to test the AI (needs the key).
7. Open `/playground`, press Run (Basic mode) or download the compiler once (about 60 MB) and run a program.
8. Admin → Health/Audit log shows your actions.
Optional automated check against the live site:
```powershell
$env:PW_BASE_URL="https://<site>"; npx playwright test e2e/flows.spec.ts
```

## 5. What the free tiers mean in practice
- **Supabase free** pauses a project after 7 days without activity. `vercel.json` adds a daily call to `/api/state` (a database read) so it stays awake. This project shares the Supabase project `aoa-tutor` with another site; tables here are prefixed `cc111_`.
- **Vercel Hobby** is for non-commercial use, has a 100 GB/month bandwidth soft limit and a 10 s function limit on the free plan for most routes (tutor answers stream, and long answers are cut by the model's output limit). Lesson pages are rendered on demand and cached 10 s at the edge.
- **Anthropic** costs only when the AI answers. Set the monthly budget cap in Admin → Tutor (default is small) before the semester starts.

## 6. Updating the site
Push to `main` on GitHub; Vercel redeploys automatically. New lessons go in `content/week-NN/<slug>.json` (see `docs/CONTENT_AUTHORING.md`); run `npm run verify:content` and `npm test` first.

## 7. Rotating secrets
- **Admin password:** run `npm run admin:hash` again, replace `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` in Vercel, redeploy. All admin sessions end.
- **Anthropic key:** create a new key, replace `ANTHROPIC_API_KEY`, redeploy, delete the old key in the Anthropic console.
- **Supabase service key:** Supabase → Project Settings → API → regenerate; replace `SUPABASE_SERVICE_ROLE_KEY`; redeploy.

## 8. Local development
```powershell
npm install
npm run dev          # http://localhost:3000, in-memory data if no Supabase key is set (all 16 weeks open)
npm test             # unit tests (set CC111_GXX to your g++ path to also compile every lesson sample)
npm run verify:content
npm run build
npx playwright test  # end-to-end tests (uses your installed Chrome)
```
