"use client";
// Chat history lives only on the student's device (IndexedDB). No server copy. Falls back to memory when storage is blocked.
export type StoredMessage = { id: string; role: "user" | "assistant"; text: string; meta?: { tier?: 0 | 2; model?: string; source?: string; lessonKey?: string; error?: string }; at: number };
export type Session = { id: string; title: string; updatedAt: number; messages: StoredMessage[] };

const DB = "cc111-tutor", STORE = "sessions";
const mem = new Map<string, Session>();
let dbp: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}

const req = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function listSessions(): Promise<Session[]> {
  const db = await open();
  const all = db ? await req(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<Session[]>).catch(() => [] as Session[]) : [...mem.values()];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function saveSession(s: Session): Promise<void> {
  mem.set(s.id, s);
  const db = await open();
  if (db) await req(db.transaction(STORE, "readwrite").objectStore(STORE).put(s)).catch(() => {});
}
export async function deleteSession(id: string): Promise<void> {
  mem.delete(id);
  const db = await open();
  if (db) await req(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id)).catch(() => {});
}
export async function deleteAllSessions(): Promise<void> {
  mem.clear();
  const db = await open();
  if (db) await req(db.transaction(STORE, "readwrite").objectStore(STORE).clear()).catch(() => {});
}
export const newSession = (): Session => ({ id: crypto.randomUUID(), title: "New chat", updatedAt: Date.now(), messages: [] });
export const titleFrom = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 40) || "New chat";

/** Download every chat as a JSON file (the student owns their history). */
export function exportSessions(sessions: Session[]) {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), sessions }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cc111-tutor-chats.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
