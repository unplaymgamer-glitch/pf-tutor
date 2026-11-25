import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "./pricing";
import type { AIProvider, ChatChunk, ChatInput } from "./provider";

/** Claude provider. The key is read from the server environment only and never reaches the browser. */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  label(model: string) { return MODELS[model as keyof typeof MODELS]?.label ?? model; }
  private client: Anthropic;
  constructor(apiKey: string) {
    // maxRetries: the SDK already retries 429/5xx with backoff; keep it small so a student never waits long.
    this.client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
  }

  async *stream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatChunk> {
    const model = MODELS[input.model].id;
    const stream = this.client.messages.stream(
      {
        model,
        max_tokens: input.maxTokens,
        // Stable system prompt first, marked cacheable: identical across requests, so later requests read it at ~10% price.
        system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
        output_config: { effort: input.effort },
        messages: input.messages.map((m) => ({
          role: m.role,
          content:
            typeof m.content === "string"
              ? m.content
              : m.content.map((b) => (b.type === "text" ? { type: "text" as const, text: b.text } : b.type === "pdf" ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: b.data } } : { type: "image" as const, source: { type: "base64" as const, media_type: b.mediaType, data: b.data } })),
        })),
      },
      { signal },
    );
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield { type: "delta", text: ev.delta.text };
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") yield { type: "refusal" };
    yield { type: "usage", usage: final.usage };
  }
}

export const anthropicConfigured = () => !!process.env.ANTHROPIC_API_KEY;
export const makeProvider = (): AIProvider | null => (anthropicConfigured() ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY!) : null);
