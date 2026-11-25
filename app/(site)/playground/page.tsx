import type { Metadata } from "next";
import { Playground } from "@/components/playground/Playground";

export const metadata: Metadata = {
  title: "Playground: run C++ in your browser",
  description: "Write and run C++ programs in your browser with plain-language error help. No installation needed.",
};

export default function PlaygroundPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold">Playground</h1>
      <p className="text-muted">Write C++, press Run, and see the output. Nothing is installed and nothing is uploaded: your code runs on your own device.</p>
      <Playground />
    </div>
  );
}
