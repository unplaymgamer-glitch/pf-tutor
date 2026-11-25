import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about the site, the compiler, progress and the tutor." };

const FAQ: [string, React.ReactNode][] = [
  ["Do I need an account?", "No. Open the link and learn. Your progress is saved on your own device. Use the backup code on the My progress page to move it to another device."],
  ["Is it free?", "Yes. There are no ads and no payments."],
  ["Can I run C++ here?", <>Yes. The <Link href="/playground">Playground</Link> runs simple programs instantly (Basic mode). For strings, structures, pointers and files, turn on full mode: a one-time download of about 60 MB, saved on your device afterwards. Use Wi-Fi.</>],
  ["Why does graphics.h not run?", "Programs that use graphics.h need Turbo C++ or WinBGIm on a lab PC. Week 15 shows a simulation of the same calls so you can see what they draw."],
  ["How does the tutor work?", "Many questions are answered for free straight from the course notes. When the instructor connects the AI service, harder questions get a deeper, step-by-step answer. The tutor can make mistakes: check important answers with your lesson or instructor."],
  ["Which language are the explanations in?", "English, with a Roman Urdu summary on every lesson. Use the language switch at the top for Roman Urdu or Urdu script."],
  ["Will my streak break if I miss a day?", "You get one free pass each week. There is no penalty beyond the streak number."],
  ["Is my data collected?", <>Almost nothing. See the <Link href="/privacy">Privacy page</Link> for exactly what is stored and where.</>],
  ["Something is wrong or confusing. What should I do?", "Tell your instructor. If a page shows an error, reload once; the site records a short error message (no personal data) so it can be fixed."],
];

export default function FaqPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Frequently asked questions</h1>
      <div className="grid gap-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{q}</summary>
            <p className="mt-2 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
