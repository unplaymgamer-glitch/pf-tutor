import "server-only";
import { AnthropicProvider } from "../tutor/anthropic-provider";
import { FallbackProvider, OpenAICompatProvider } from "../tutor/openai-compat-provider";
import type { AIProvider } from "../tutor/provider";

// Keys are read from the server environment only and never reach the browser (this file is server-only).
// Claude is used when its account has credit; a free OpenAI-compatible model (Google Gemini by default) answers when it has none, or when it is the only key.
const freeKey = () => process.env.FREE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
export const anthropicConfigured = () => !!process.env.ANTHROPIC_API_KEY || !!freeKey();

function free(): OpenAICompatProvider | null {
  const k = freeKey();
  if (!k) return null;
  // Several names, tried in order: model names change and a busy model returns 503 for a while.
  const model = process.env.FREE_AI_MODEL || "gemini-flash-latest,gemini-3.8-flash,gemini-flash-lite-latest";
  return new OpenAICompatProvider(process.env.FREE_AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai", k, model, process.env.FREE_AI_LABEL || `${model.split(",")[0].trim()} (free)`);
}

let cached: { key: string; p: AIProvider | null } | null = null;
/** One provider per server instance, so the "Claude has no credit" memory survives between questions. */
export function makeProvider(): AIProvider | null {
  const key = `${process.env.ANTHROPIC_API_KEY ?? ""}|${freeKey()}|${process.env.FREE_AI_MODEL ?? ""}|${process.env.FREE_AI_BASE_URL ?? ""}`;
  if (!cached || cached.key !== key) cached = { key, p: build() };
  return cached.p;
}

function build(): AIProvider | null {
  const f = free();
  const a = process.env.ANTHROPIC_API_KEY ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY) : null;
  if (a && f) return new FallbackProvider(a, f);
  return a ?? f;
}
