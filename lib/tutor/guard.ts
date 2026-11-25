import { z } from "zod";

// Request validation and prompt-injection hygiene. Everything a student pastes or uploads is DATA, never instructions.
export const MAX_IMAGE_B64 = 4_000_000; // ~3 MB of image bytes
export const MAX_BODY_BYTES = 9_000_000;

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) });
export const TutorRequest = z.object({
  messages: z.array(Msg).min(1).max(20),
  lang: z.enum(["en", "roman", "ur"]).default("en"),
  deviceId: z.string().regex(/^[a-f0-9]{32}$/),
  deep: z.boolean().optional(),
  context: z.object({
    topic: z.string().regex(/^w\d{1,2}\/[a-z0-9-]{1,80}$/).optional(),
    code: z.string().max(12000).optional(),
    diagnostics: z.string().max(3000).optional(),
    stdin: z.string().max(500).optional(),
  }).optional(),
  file: z.object({ name: z.string().max(80), text: z.string().max(20000) }).optional(),
  images: z.array(z.object({ mediaType: z.enum(["image/jpeg", "image/png"]), data: z.string().max(MAX_IMAGE_B64).regex(/^[A-Za-z0-9+/=]+$/) })).max(2).optional(),
}).refine((r) => r.messages.length > 0 && r.messages[r.messages.length - 1].role === "user", { message: "last message must be from the user" });
export type TutorRequest = z.infer<typeof TutorRequest>;

/** Remove control characters (keep newline and tab) and cap run-on whitespace. */
export const cleanText = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\n{4,}/g, "\n\n\n");

const INJECTION = [
  /ignore (?:all |any |the )?(?:previous|prior|above) (?:instructions|rules|prompts?)/i,
  /disregard (?:all |any |the )?(?:previous|prior|above|your) (?:instructions|rules)/i,
  /(?:reveal|show|print|repeat|leak) (?:me )?(?:your|the) (?:system )?(?:prompt|instructions|rules|api[- ]?key|secret)/i,
  /you are now (?:in )?(?:developer|dan|god|jailbreak|unrestricted)/i,
  /\bsystem\s*(?:prompt|message)\s*:/i,
  /<\s*\/?\s*(?:system|assistant|instructions?)\s*>/i,
  /pretend (?:that )?(?:you|there) (?:are|is) no (?:rules|restrictions)/i,
];
export const looksLikeInjection = (s: string) => INJECTION.some((r) => r.test(s));

/** Wrap untrusted material in a tag the system prompt declares as data. A closing tag inside the content is defused. */
export function asData(tag: "student_code" | "student_file" | "error_output" | "course_notes", body: string, attrs = ""): string {
  const safe = cleanText(body).replace(new RegExp(`</\\s*${tag}\\s*>`, "gi"), `</${tag}_>`).replace(new RegExp(`<\\s*${tag}`, "gi"), `<${tag}_`);
  return `<${tag}${attrs ? " " + attrs : ""}>\n${safe}\n</${tag}>`;
}

/** Keep the recent conversation within a size budget (never splitting the last user message). */
export function trimHistory<T extends { role: string; content: string }>(msgs: T[], maxMsgs = 10, maxChars = 16000): T[] {
  let out = msgs.slice(-maxMsgs);
  let total = out.reduce((n, m) => n + m.content.length, 0);
  while (out.length > 1 && total > maxChars) { total -= out[0].content.length; out = out.slice(1); }
  while (out.length > 1 && out[0].role === "assistant") out = out.slice(1); // conversation must start with the student
  return out;
}

export const fileLooksOk = (name: string) => /\.(cpp|cc|cxx|h|hpp|txt)$/i.test(name);
