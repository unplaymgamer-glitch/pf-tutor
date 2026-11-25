import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { fetchVerified } from "../public/runner/verified-fetch.mjs";
import manifest from "../public/runner/runner-manifest.json";

const sha = async (b: ArrayBuffer) => createHash("sha256").update(Buffer.from(b)).digest("hex");
const good = new TextEncoder().encode("trusted compiler bytes");
const evil = new TextEncoder().encode("EVIL compiler bytes!!");
const spec = (urls: string[]) => ({ sha256: createHash("sha256").update(good).digest("hex"), bytes: good.length, urls });

function fakeCache() {
  const m = new Map<string, Response>();
  return { m, match: async (k: string) => m.get(k)?.clone(), put: async (k: string, r: Response) => { m.set(k, r); }, delete: async (k: string) => m.delete(k) };
}
const body = (u8: Uint8Array) => ({ ok: true, status: 200, body: new Response(u8 as unknown as BodyInit).body });
const fakeFetch = (table: Record<string, Uint8Array | number>) => async (url: string) => {
  const v = table[url];
  if (v === undefined) throw new Error("network down");
  return typeof v === "number" ? { ok: false, status: v, body: null } : body(v);
};

describe("hash-pinned download", () => {
  it("accepts the right bytes and caches them", async () => {
    const cache = fakeCache();
    const buf = await fetchVerified("x", spec(["a"]), { cache, key: "k", fetchFn: fakeFetch({ a: good }), sha256Hex: sha });
    expect(new Uint8Array(buf)).toEqual(good);
    expect(cache.m.has("k")).toBe(true);
  });
  it("REJECTS tampered bytes from a mirror and falls through to the next good one", async () => {
    const cache = fakeCache();
    const buf = await fetchVerified("x", spec(["bad", "ok"]), { cache, key: "k", fetchFn: fakeFetch({ bad: evil, ok: good }), sha256Hex: sha });
    expect(new Uint8Array(buf)).toEqual(good);
  });
  it("throws and caches NOTHING when every mirror serves tampered, missing or failing files", async () => {
    const cache = fakeCache();
    await expect(fetchVerified("x", spec(["bad", "gone", "down"]), { cache, key: "k", fetchFn: fakeFetch({ bad: evil, gone: 404 }), sha256Hex: sha })).rejects.toThrow(/checksum mismatch.*HTTP 404.*network down/);
    expect(cache.m.size).toBe(0);
  });
  it("ignores and replaces a tampered cache entry", async () => {
    const cache = fakeCache();
    cache.m.set("k", new Response(evil as unknown as BodyInit));
    const buf = await fetchVerified("x", spec(["ok"]), { cache, key: "k", fetchFn: fakeFetch({ ok: good }), sha256Hex: sha });
    expect(new Uint8Array(buf)).toEqual(good);
    expect(new Uint8Array(await cache.m.get("k")!.arrayBuffer())).toEqual(good);
  });
  it("uses a valid cache entry without touching the network", async () => {
    const cache = fakeCache();
    cache.m.set("k", new Response(good as unknown as BodyInit));
    const buf = await fetchVerified("x", spec(["never-called"]), { cache, key: "k", fetchFn: fakeFetch({}), sha256Hex: sha });
    expect(new Uint8Array(buf)).toEqual(good);
  });
});

describe("runner manifest", () => {
  it("pins 4 files with 64-hex hashes, https mirrors and the pinned commit", () => {
    expect(Object.keys(manifest.files).sort()).toEqual(["clang", "lld", "memfs", "sysroot"]);
    for (const f of Object.values(manifest.files)) {
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(f.urls.length).toBeGreaterThanOrEqual(2);
      for (const u of f.urls) expect(u.startsWith("https://")).toBe(true);
    }
    expect(manifest.files.clang.urls[0]).toContain(manifest.pinnedCommit);
  });
  it("hashes match the real files when CC111_RUNNER_DIR points at them (skipped otherwise)", async () => {
    const dir = process.env.CC111_RUNNER_DIR;
    if (!dir) return;
    const { readFileSync } = await import("node:fs");
    for (const [name, f] of Object.entries(manifest.files)) {
      const file = name === "sysroot" ? "sysroot.tar" : name;
      expect(createHash("sha256").update(readFileSync(`${dir}/${file}`)).digest("hex"), name).toBe(f.sha256);
    }
  });
});
