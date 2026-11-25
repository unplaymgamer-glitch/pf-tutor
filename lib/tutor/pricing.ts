// Model table for the tutor. Prices are USD per million tokens (first-party API list prices, checked against the Claude API
// reference on 2026-11-25). RE-VERIFY before launch and whenever Anthropic changes prices; spend tracking and the
// monthly cap depend on these numbers. Note: 1 USD/MTok == 1 micro-dollar per token, so cost in micro-dollars = tokens x price.
export type ModelKey = "haiku" | "sonnet";
export type ModelInfo = { id: string; label: string; in: number; out: number; cacheRead: number; cacheWrite: number };

export const MODELS: Record<ModelKey, ModelInfo> = {
  haiku: { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  sonnet: { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", in: 2, out: 10, cacheRead: 0.1, cacheWrite: 2.5 },
};

export type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

/** Cost of one request in micro-dollars (1,000,000 = 1 USD). Unknown/missing token fields count as 0. */
export function costMicros(model: ModelKey, u: Usage): number {
  const m = MODELS[model];
  const n = (x: number | null | undefined) => (typeof x === "number" && x > 0 ? x : 0);
  return Math.ceil(n(u.input_tokens) * m.in + n(u.output_tokens) * m.out + n(u.cache_read_input_tokens) * m.cacheRead + n(u.cache_creation_input_tokens) * m.cacheWrite);
}

/** Pessimistic pre-flight estimate (used to refuse a request that would blow the budget): input chars/3 tokens + max output. */
export function estimateMicros(model: ModelKey, inputChars: number, maxOutputTokens: number): number {
  return costMicros(model, { input_tokens: Math.ceil(inputChars / 3), output_tokens: maxOutputTokens });
}

export const microsToUSD = (m: number) => m / 1_000_000;
export const monthKey = (d: Date) => d.toISOString().slice(0, 7);
