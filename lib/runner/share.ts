// Share a snippet through the URL hash. The hash is never sent to any server (privacy), and is compressed to stay short.
export type Snippet = { code: string; stdin: string };

const MAX = 20_000; // characters, both ways

const toB64Url = (u8: Uint8Array) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const w = stream.writable.getWriter();
  void w.write(data as unknown as BufferSource);
  void w.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodeSnippet(s: Snippet): Promise<string> {
  const json = JSON.stringify({ c: s.code.slice(0, MAX), i: s.stdin.slice(0, 2000) });
  const raw = new TextEncoder().encode(json);
  if (typeof CompressionStream === "undefined") return "r" + toB64Url(raw);
  return "z" + toB64Url(await pipe(raw, new CompressionStream("deflate-raw")));
}

export async function decodeSnippet(hash: string): Promise<Snippet | null> {
  try {
    const h = hash.replace(/^#?s=/, "");
    if (h.length < 2 || h.length > MAX * 2) return null;
    const bytes = fromB64Url(h.slice(1));
    const raw = h[0] === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : h[0] === "r" ? bytes : null;
    if (!raw) return null;
    const o = JSON.parse(new TextDecoder().decode(raw)) as { c?: unknown; i?: unknown };
    if (typeof o.c !== "string") return null;
    return { code: o.c.slice(0, MAX), stdin: typeof o.i === "string" ? o.i.slice(0, 2000) : "" };
  } catch {
    return null;
  }
}
