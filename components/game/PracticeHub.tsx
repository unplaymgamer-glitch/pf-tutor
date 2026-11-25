"use client";
import Link from "next/link";
import { useState } from "react";
import { CHAPTERS } from "@/lib/course";
import { QuestionCard } from "../topic/Quiz";
import { PoolGate, usePool } from "./usePool";

const TYPES = [["all", "All types"], ["mcq", "Multiple choice"], ["output", "Predict the output"], ["bug", "Fix the bug"], ["blank", "Fill the blank"], ["write", "Write the code"]] as const;

/** All practice questions of the unlocked lessons, filterable by chapter, topic, difficulty and type. */
export function PracticeHub() {
  const pool = usePool();
  const [week, setWeek] = useState("all");
  const [topic, setTopic] = useState("all");
  const [diff, setDiff] = useState("all");
  const [type, setType] = useState("all");
  const [limit, setLimit] = useState(10);

  return (
    <PoolGate pool={pool}>
      {(qs) => {
        const weeks = [...new Set(qs.map((q) => q.week))].sort((a, b) => a - b);
        const topics = [...new Map(qs.filter((q) => week === "all" || q.week === Number(week)).map((q) => [q.topicKey, q.topicTitle])).entries()];
        const list = qs.filter((q) => (week === "all" || q.week === Number(week)) && (topic === "all" || q.topicKey === topic) && (diff === "all" || q.difficulty === diff) && (type === "all" || q.type === type));
        return (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Select label="Chapter" value={week} onChange={(v) => { setWeek(v); setTopic("all"); setLimit(10); }} options={[["all", "All chapters"], ...weeks.map((w) => [String(w), `Week ${w}: ${CHAPTERS[w - 1].title}`] as [string, string])]} />
              <Select label="Topic" value={topic} onChange={(v) => { setTopic(v); setLimit(10); }} options={[["all", "All topics"], ...topics.map(([k, t]) => [k, t] as [string, string])]} />
              <Select label="Difficulty" value={diff} onChange={(v) => { setDiff(v); setLimit(10); }} options={[["all", "Any"], ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]]} />
              <Select label="Type" value={type} onChange={(v) => { setType(v); setLimit(10); }} options={TYPES.map(([a, b]) => [a, b] as [string, string])} />
            </div>
            <p className="text-sm text-muted" role="status">{list.length} question(s)</p>
            <div className="grid gap-3">
              {list.slice(0, limit).map((q) => (
                <div key={q.key}>
                  <p className="mb-1 text-sm text-muted"><Link className="inline-flex min-h-11 items-center" href={`/${q.topicKey.split("/")[0].replace("w", "week-")}/${q.topicKey.split("/")[1]}`}>{q.topicTitle}</Link></p>
                  <ol><QuestionCard q={{ id: q.key.split("#")[1], type: q.type, difficulty: q.difficulty, prompt: q.prompt, options: q.options, answer: q.answer, hint: q.hint, explanation: q.explanation }} k={q.topicKey} /></ol>
                </div>
              ))}
            </div>
            {list.length > limit && <button className="btn w-fit" onClick={() => setLimit(limit + 10)}>Show more</button>}
          </div>
        );
      }}
    </PoolGate>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="grid gap-1 text-sm">{label}
      <select className="btn" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  );
}
