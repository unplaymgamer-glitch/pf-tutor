import type { AIProvider, ChatChunk, ChatInput } from "./provider";

/** Any OpenAI-compatible chat endpoint with streaming. Used for a FREE tier (Google Gemini, Groq, OpenRouter free models) when the Claude account has no credit. */
export class OpenAICompatProvider implements AIProvider {
  readonly name = "free";
  private models: string[];
  /** `modelId` may list several models separated by commas: they are tried in order when one is unknown, rate limited or overloaded. */
  constructor(private baseUrl: string, private apiKey: string, modelId: string, private modelLabel = modelId.split(",")[0].trim()) { this.models = modelId.split(",").map((m) => m.trim()).filter(Boolean); }
  label() { return this.modelLabel; }

  async *stream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatChunk> {
    const messages = [
      { role: "system", content: input.system },
      ...input.messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.content.map((b) =>
          b.type === "text" ? { type: "text", text: b.text }
          : b.type === "image" ? { type: "image_url", image_url: { url: `data:${b.mediaType};base64,${b.data}` } }
          : { type: "text", text: "[A PDF was attached, but the free tutor cannot read PDFs. Ask the student to paste the text.]" }),
      })),
    ];
    const gemini = /generativelanguage\.googleapis\.com/.test(this.baseUrl);
    // Simple questions go to the small, fast model first and skip hidden "thinking"; harder ones start with the stronger model. Either way the others are the fallbacks.
    const fast = input.effort === "low";
    const ranked = [...this.models].sort((a, b) => Number(/lite/i.test(b)) - Number(/lite/i.test(a)) || 0);
    const first = fast ? ranked : this.models;
    // Up to three passes over the model list with a short pause: a "high demand" 503 from the free tier usually clears within seconds.
    const order = [...first, ...first, ...first];
    const started = Date.now();
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` };

    // One streamed request. Returns why the model stopped and which model answered.
    const run = async function* (self: OpenAICompatProvider, msgs: unknown[], models: string[], retry: boolean): AsyncGenerator<ChatChunk, { finish: string; model: string }> {
      let res: Response | null = null, model = models[0];
      for (let i = 0; i < models.length; i++) {
        // Stop retrying after ~28 s so the function (60 s limit) still has time to stream the answer.
        if (retry && i > 0 && Date.now() - started > 28_000) throw Object.assign(new Error("free models busy"), { status: 503 });
        if (retry && i > 0 && i % first.length === 0) await new Promise((ok) => setTimeout(ok, 2000));
        const send = (reasoning: string | null) => fetch(url, {
          method: "POST", headers, signal,
          // Low temperature: steadier, more accurate explanations and traces. max_tokens is raised because this API counts hidden thinking inside it.
          body: JSON.stringify({ model: models[i], messages: msgs, stream: true, temperature: 0.3, max_tokens: Math.round(input.maxTokens * 2.2), ...(gemini && reasoning ? { reasoning_effort: reasoning } : {}) }),
        });
        let r = await send(gemini ? (fast ? "minimal" : "low") : null);
        if (r.status === 400 && gemini) r = await send(null); // a model that does not accept the thinking setting: ask again without it
        if (r.ok && r.body) { res = r; model = models[i]; break; }
        const body = (await r.text().catch(() => "")).slice(0, 300);
        const retryable = [404, 429, 500, 502, 503, 504].includes(r.status);
        if (!retryable || i === models.length - 1) throw Object.assign(new Error(`${r.status} ${body}`), { status: r.status });
        console.error(`[tutor] free model ${models[i]} unavailable (status=${r.status}), trying the next one`);
      }
      if (!res || !res.body) throw Object.assign(new Error("no free model available"), { status: 503 });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", finish = "stop";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data) as { choices?: { delta?: { content?: string }; finish_reason?: string }[] };
            const fin = j.choices?.[0]?.finish_reason;
            if (fin) finish = fin;
            const text = j.choices?.[0]?.delta?.content;
            if (text) yield { type: "delta", text };
          } catch { /* ignore a malformed keep-alive line */ }
        }
      }
      void self;
      return { finish, model };
    };

    // A cut-off answer (stopped for length, or inside an open code block) is continued automatically, so a student never copies half a program.
    let msgs: unknown[] = messages, text = "", model = "";
    for (let round = 0; round < 3; round++) {
      const it = run(this, msgs, round === 0 ? order : [model], round === 0);
      let result: { finish: string; model: string };
      for (;;) {
        const n = await it.next();
        if (n.done) { result = n.value; break; }
        if (n.value.type === "delta") text += n.value.text;
        yield n.value;
      }
      model = result.model;
      const openFence = (text.match(/```/g) ?? []).length % 2 === 1;
      if (result.finish !== "length" && !openFence) break;
      console.error(`[tutor] answer cut off (finish=${result.finish}, openFence=${openFence}); continuing (round ${round + 1})`);
      msgs = [...messages, { role: "assistant", content: text }, { role: "user", content: "Continue exactly where you stopped. Do not repeat anything you already wrote. If you were inside a code block, continue the code and close the block." }];
    }
    // The free tier costs nothing, so it must not count against the monthly Claude budget.
    yield { type: "usage", usage: { input_tokens: 0, output_tokens: 0 } };
  }
}

/** Tries the first provider; if it fails before answering anything (no credit, rate limit, outage) the second one answers. Remembers a hard failure for a while. */
export class FallbackProvider implements AIProvider {
  readonly name = "fallback";
  private skipUntil = 0;
  constructor(private primary: AIProvider & { label?(m: string): string }, private secondary: AIProvider & { label?(m: string): string }, private skipMs = 10 * 60_000, private now: () => number = Date.now) {}
  label(model: string): string { const p = this.now() < this.skipUntil ? this.secondary : this.primary; return p.label?.(model) ?? model; }

  async *stream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatChunk> {
    if (this.now() < this.skipUntil) { yield* this.secondary.stream(input, signal); return; }
    let started = false;
    try {
      for await (const c of this.primary.stream(input, signal)) { started = true; yield c; }
      return;
    } catch (e) {
      if (started || signal?.aborted) throw e;
      const err = e as { status?: number; message?: string };
      console.error(`[tutor] primary provider failed (status=${err.status ?? "?"}), using the free provider: ${String(err.message ?? e).slice(0, 160)}`);
      if (err.status === 400 || err.status === 401 || err.status === 402 || err.status === 403) this.skipUntil = this.now() + this.skipMs; // credit or key problem: do not retry every question
    }
    yield* this.secondary.stream(input, signal);
  }
}
