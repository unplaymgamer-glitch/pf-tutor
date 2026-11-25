import type { ModelKey, Usage } from "./pricing";

// One interface for every AI backend, so providers can be swapped (Claude today; a free provider could slot in as Tier 1).
export type ChatBlock = { type: "text"; text: string } | { type: "image"; mediaType: "image/jpeg" | "image/png"; data: string } | { type: "pdf"; data: string };
export type ChatMessage = { role: "user" | "assistant"; content: string | ChatBlock[] };
export type ChatInput = { model: ModelKey; system: string; messages: ChatMessage[]; maxTokens: number; effort: "low" | "medium" };
export type ChatChunk = { type: "delta"; text: string } | { type: "usage"; usage: Usage } | { type: "refusal" };

export interface AIProvider {
  readonly name: string;
  /** The name shown to the student for the model that will answer (optional). */
  label?(model: string): string;
  stream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatChunk>;
}

/** Deterministic offline provider for tests and for running the app without any API key. It never calls the network. */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  calls: ChatInput[] = [];
  constructor(private reply = "Mock tutor answer.", private usage: Usage = { input_tokens: 1000, output_tokens: 200 }) {}
  async *stream(input: ChatInput): AsyncGenerator<ChatChunk> {
    this.calls.push(input);
    for (const part of this.reply.split(/(?<=\s)/)) yield { type: "delta", text: part };
    yield { type: "usage", usage: this.usage };
  }
}
