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
  const model = process.env.FREE_AI_MODEL || "gemini-3.8-flash";
  return new OpenAICompatProvider(process.env.FREE_AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai", k, model, process.env.FREE_AI_LABEL || `${model} (free)`);
}

export function makeProvider(): AIProvider | null {
  const f = free();
  const a = process.env.ANTHROPIC_API_KEY ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY) : null;
  if (a && f) return new FallbackProvider(a, f);
  return a ?? f;
}
