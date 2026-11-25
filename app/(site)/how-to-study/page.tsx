import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How to study", description: "A simple routine for learning C++ with this site: watch, read, try, practise, review." };

const STEPS: [string, string, string][] = [
  ["👀", "Watch", "Open the lesson and press Play on the animation. Change the numbers and watch what changes."],
  ["📖", "Read", "Read the goal, the everyday example and the short definition. Only 2 or 3 lines each."],
  ["⌨️", "Try", "Press \"Try it\" to run the example in the Playground. Edit one thing and run again."],
  ["✍️", "Practise", "Do the practice questions. Use the hint before you look at the answer."],
  ["⭐", "Quiz", "Finish the 3-question mini-quiz for XP and your next badge."],
  ["🔁", "Review", "Come back each day for the Review cards. Questions you missed return after 1, 3, 7, 14 and 30 days."],
];

export default function HowToStudy() {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold">How to study <span className="gradient-text">C++</span> here</h1>
        <p className="text-muted">Programming is learned by doing, not by reading. Follow these six steps for every lesson.</p>
      </header>
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map(([icon, title, text], i) => (
          <li key={title} className="card flex gap-3"><span aria-hidden className="text-2xl">{icon}</span><div><h2 className="font-semibold">{i + 1}. {title}</h2><p className="text-muted">{text}</p></div></li>
        ))}
      </ol>
      <section className="box box-roman grid gap-1">
        <h2 className="text-lg font-semibold">A good week</h2>
        <p>Three short sessions of 20 minutes beat one long night. Do one lesson per session, then 5 review cards.</p>
      </section>
      <section className="box box-exam grid gap-1">
        <h2 className="text-lg font-semibold">Before an exam</h2>
        <p>Open the <Link href="/revision/mid">Mid-term hub</Link> or the <Link href="/revision/final">Final hub</Link>, then take a <Link href="/mock">mock exam</Link> and review every mistake.</p>
      </section>
      <section className="box box-mistake grid gap-1">
        <h2 className="text-lg font-semibold">When you are stuck</h2>
        <p>Read the error message slowly, check the semicolons and brackets, then use the Tutor button. Do not copy answers: type the code yourself.</p>
      </section>
    </div>
  );
}
