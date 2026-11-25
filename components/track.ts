"use client";
// Fire-and-forget anonymous analytics + error reports. Never throws, never blocks the lesson.
function send(url: string, body: unknown) {
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([data], { type: "application/json" }))) return;
    void fetch(url, { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch { /* ignore */ }
}
export const trackView = (week: number, slug: string) =>
  send("/api/track", { event: "view", week, slug, mobile: window.matchMedia("(max-width: 767px)").matches });
export const trackQuiz = (week: number, slug: string, right: number, total: number, missed: string[]) =>
  send("/api/track", { event: "quiz", week, slug, right, total, missed });
export const reportError = (where: string, message: string) => send("/api/report", { where: where.slice(0, 120), message: message.slice(0, 300) });
