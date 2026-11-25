import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy", description: "What this site stores about you (very little) and where, in plain language." };

export default function PrivacyPage() {
  return (
    <article className="grid gap-4">
      <h1 className="text-3xl font-semibold">Privacy, in plain language</h1>
      <p className="box box-roman">Short version: there are no accounts, we do not ask for your name, email or phone number, and your progress stays on your own device.</p>

      <section className="grid gap-2">
        <h2 className="text-xl font-semibold">What stays on your device</h2>
        <ul className="list-disc ps-5">
          <li>Your progress, XP, streak, badges, settings and review cards (browser storage).</li>
          <li>Your tutor chat history (browser storage). You can export or delete it from the tutor panel.</li>
          <li>The in-browser C++ compiler files, if you choose to download them (browser cache, about 60 MB). You can clear them from your browser settings.</li>
        </ul>
        <p>Clearing your browser data removes all of this. Use the backup code on the My progress page to save a copy you can restore later.</p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xl font-semibold">What is sent to our server</h2>
        <ul className="list-disc ps-5">
          <li><strong>An anonymous device ID</strong> (a random code, not linked to you). It is used to limit how many tutor questions one device can ask per day and, only if you switch it on, to show you on the weekly leaderboard. You can reset it in Settings.</li>
          <li><strong>Leaderboard (optional):</strong> a nickname and avatar you choose, and your weekly XP. You can hide or delete your entry any time.</li>
          <li><strong>Anonymous counts</strong> such as how many students opened a lesson or answered a quiz question. They are totals, not tied to a person.</li>
          <li><strong>Problem reports:</strong> when something breaks, a short error message (no personal data) so the instructor can fix it.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xl font-semibold">The AI tutor</h2>
        <p>Many questions are answered for free from the course notes without any AI. When a question needs the AI, the text you type (and a picture if you attach one) is sent to Anthropic, the company that makes Claude, to write the answer. Do not type personal information into the tutor. Pictures have their location and camera details removed in your browser before sending. We do not store your questions or the answers on our server, only totals used to enforce the daily limits and the monthly budget.</p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xl font-semibold">Cookies</h2>
        <p>Students get no cookies. Only the instructor&apos;s admin page uses a secure cookie to keep the instructor signed in.</p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-xl font-semibold">No ads, no tracking</h2>
        <p>There are no advertisements and no third-party tracking scripts. Fonts and the compiler are served from this site (or, for the compiler, from a verified mirror if the main copy is unavailable).</p>
      </section>

      <p className="text-sm text-muted">Questions about this page? Ask your instructor.</p>
    </article>
  );
}
