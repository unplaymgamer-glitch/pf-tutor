import { describe, it, expect } from "vitest";
import { parseSSE } from "@/lib/tutor/client";
import { splitFences } from "@/components/tutor/Message";

describe("SSE parsing", () => {
  const ev = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
  it("parses complete events and keeps a partial tail", () => {
    const a = parseSSE(ev({ type: "delta", text: "Hi" }) + ev({ type: "done", costMicros: 5, leftToday: 3 }) + 'data: {"type":"del');
    expect(a.events.map((e) => e.type)).toEqual(["delta", "done"]);
    expect(a.rest).toBe('data: {"type":"del');
    const b = parseSSE(a.rest + 'ta","text":"x"}\n\n');
    expect(b.events).toEqual([{ type: "delta", text: "x" }]);
  });
  it("works when the stream is cut at any byte", () => {
    const full = ev({ type: "meta", tier: 2, source: "claude" }) + ev({ type: "delta", text: "ünïcode ✓" }) + ev({ type: "done", costMicros: 1, leftToday: null });
    for (let cut = 1; cut < full.length; cut += 7) {
      const first = parseSSE(full.slice(0, cut));
      const second = parseSSE(first.rest + full.slice(cut));
      expect([...first.events, ...second.events].length).toBe(3);
    }
  });
  it("ignores malformed events instead of throwing", () => {
    expect(parseSSE("data: {not json}\n\n" + ev({ type: "delta", text: "ok" })).events).toEqual([{ type: "delta", text: "ok" }]);
    expect(parseSSE(": comment\n\n").events).toEqual([]);
  });
});

describe("tutor message rendering (safe text, code fences)", () => {
  it("splits text and code, including an unfinished fence while streaming", () => {
    const p = splitFences("Here:\n```cpp\nint main(){}\n```\nDone.");
    expect(p.map((x) => x.kind)).toEqual(["text", "code", "text"]);
    expect((p[1] as { code: string }).code).toBe("int main(){}");
    const streaming = splitFences("Try this:\n```cpp\nint x = 1;");
    expect(streaming.map((x) => x.kind)).toEqual(["text", "code"]);
    expect((streaming[1] as { code: string }).code).toBe("int x = 1;");
  });
  it("never produces HTML: markup stays plain text parts", () => {
    const p = splitFences("<script>alert(1)</script> and <img src=x onerror=alert(1)>");
    expect(p).toEqual([{ kind: "text", text: "<script>alert(1)</script> and <img src=x onerror=alert(1)>" }]);
  });
});
