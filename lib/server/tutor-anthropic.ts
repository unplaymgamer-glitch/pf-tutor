import "server-only";
import { AnthropicProvider } from "../tutor/anthropic-provider";
import type { AIProvider } from "../tutor/provider";

// The key is read from the server environment only and never reaches the browser (this file is server-only).
export const anthropicConfigured = () => !!process.env.ANTHROPIC_API_KEY;
export const makeProvider = (): AIProvider | null => (anthropicConfigured() ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY!) : null);
