"use client";
// Voice uses the free Web Speech API built into the browser. Support varies (Urdu especially), so everything is feature-detected
// and the chat works fully without it. No audio ever leaves the browser except through the browser's own speech service.
type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
type SRCtor = new () => SR;

const recLang = { en: "en-US", roman: "en-IN", ur: "ur-PK" } as const;
const speakLang = { en: "en-US", roman: "en-IN", ur: "ur-PK" } as const;

export function speechInputSupported(): boolean {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}
export const speechOutputSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

/** Starts listening; returns a stop function. Errors are reported in plain words. */
export function listen(lang: keyof typeof recLang, onText: (t: string, final: boolean) => void, onEnd: (err?: string) => void): () => void {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  const C = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!C) { onEnd("Voice input is not supported in this browser."); return () => {}; }
  const r = new C();
  r.lang = recLang[lang]; r.interimResults = true; r.continuous = false;
  let err: string | undefined;
  r.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onText(text, false);
  };
  r.onerror = (e) => { err = e.error === "not-allowed" ? "Microphone permission was denied." : e.error === "no-speech" ? "I did not hear anything." : e.error === "language-not-supported" ? "This browser cannot recognise that language." : "Voice input stopped."; };
  r.onend = () => onEnd(err);
  try { r.start(); } catch { onEnd("Could not start the microphone."); }
  return () => { try { r.stop(); } catch { /* ignore */ } };
}

/** Reads text aloud. Code blocks are skipped. Returns false when no suitable voice exists (so the UI can explain). */
export function speak(text: string, lang: keyof typeof speakLang): boolean {
  if (!speechOutputSupported()) return false;
  const plain = text.replace(/```[\s\S]*?```/g, " (code shown on screen) ").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
  const u = new SpeechSynthesisUtterance(plain.slice(0, 1500));
  u.lang = speakLang[lang];
  const voices = window.speechSynthesis.getVoices();
  const base = speakLang[lang].slice(0, 2);
  const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase() === speakLang[lang].toLowerCase()) ?? voices.find((x) => x.lang.toLowerCase().startsWith(base));
  if (lang === "ur" && !v) return false; // no Urdu voice installed: do not read Urdu text with an English voice
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}
export const stopSpeaking = () => { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } };
