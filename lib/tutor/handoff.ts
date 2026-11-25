// A question or context handed from another page (home, a lesson, the playground, the Visual Lab) to the full-page chat.
// It waits in this tab's sessionStorage, is read once and removed. Nothing is put in the URL, so no student text is logged or shared.
export type Handoff = { text?: string; autoSend?: boolean; topic?: string; topicKey?: string; code?: string; diagnostics?: string; stdin?: string };
const KEY = "cc111-chat-handoff";

export function setHandoff(h: Handoff): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(h)); } catch { /* storage blocked: the chat opens empty */ }
}
export function takeHandoff(): Handoff | undefined {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return undefined;
    sessionStorage.removeItem(KEY);
    const h = JSON.parse(raw) as Handoff;
    return h && typeof h === "object" ? h : undefined;
  } catch { return undefined; }
}
