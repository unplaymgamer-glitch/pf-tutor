// Download a file from a list of mirrors and accept it ONLY if its SHA-256 matches the pinned value.
// Dependencies are injected so the same code runs in the worker and in unit tests.
export async function fetchVerified(name, spec, deps) {
  const { cache, key, fetchFn, sha256Hex, onProgress = () => {} } = deps;
  const hit = await cache.match(key);
  if (hit) {
    const buf = await hit.arrayBuffer();
    if ((await sha256Hex(buf)) === spec.sha256) { onProgress({ text: `${name} (cached)`, loaded: buf.byteLength, total: spec.bytes, file: name, cached: true }); return buf; }
    await cache.delete(key); // corrupted or tampered cache entry: forget it and download again
  }
  const problems = [];
  for (const url of spec.urls) {
    try {
      const res = await fetchFn(url, { credentials: "omit", mode: "cors" });
      if (!res.ok || !res.body) { problems.push(`${url}: HTTP ${res.status}`); continue; }
      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); loaded += value.length;
        onProgress({ text: `Downloading ${name}`, loaded, total: spec.bytes, file: name });
      }
      const buf = new Uint8Array(loaded);
      let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
      if ((await sha256Hex(buf.buffer)) !== spec.sha256) { problems.push(`${url}: checksum mismatch (file rejected)`); continue; }
      await cache.put(key, new Response(buf, { headers: { "Content-Type": "application/octet-stream" } }));
      return buf.buffer;
    } catch (e) { problems.push(`${url}: ${e && e.message}`); }
  }
  throw new Error(`Could not download ${name}: ${problems.join("; ")}`);
}
