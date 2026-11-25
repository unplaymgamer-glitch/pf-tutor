/*
 * In-browser C++ compiler/runner core (Tier 1).
 *
 * Derived from binji/wasm-clang (shared.js), Copyright 2020 WebAssembly Community Group participants,
 * licensed under the Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
 * Modified for CC111: stdout/stderr are separated, stdin is supplied up front, output is capped,
 * clock_time_get/random_get are implemented, the canvas imports are removed, errors are returned instead of thrown.
 * The compiler binaries themselves (clang, lld, memfs, sysroot.tar) are NOT part of this repository:
 * they are downloaded at runtime and rejected unless their SHA-256 matches the pinned values in runner-manifest.json.
 *
 * Runs in a Web Worker (browser) and in Node (tests): no DOM access here.
 */

const ESUCCESS = 0;

class ProcExit extends Error {
  constructor(code) { super(`process exited with code ${code}.`); this.code = code; }
}
class OutputLimit extends Error {}

const readStr = (u8, o, len = -1) => {
  let end = len === -1 ? u8.length : o + len;
  let s = "";
  for (let i = o; i < end && u8[i] !== 0; ++i) s += String.fromCharCode(u8[i]);
  return s;
};

class Memory {
  constructor(memory) { this.memory = memory; this.refresh(); }
  refresh() { this.buffer = this.memory.buffer; this.u8 = new Uint8Array(this.buffer); this.u32 = new Uint32Array(this.buffer); }
  check() { if (this.buffer.byteLength === 0 || this.buffer !== this.memory.buffer) this.refresh(); }
  read32(o) { return this.u32[o >> 2]; }
  write8(o, v) { this.u8[o] = v; }
  write32(o, v) { this.u32[o >> 2] = v; }
  write64(o, lo, hi = 0) { this.write32(o, lo); this.write32(o + 4, hi); }
  readStr(o, len) { return readStr(this.u8, o, len); }
  write(o, buf) {
    if (buf instanceof ArrayBuffer) buf = new Uint8Array(buf);
    else if (typeof buf === "string") buf = Uint8Array.from(buf, (c) => c.charCodeAt(0) & 255);
    new Uint8Array(this.buffer, o, buf.length).set(buf);
    return buf.length;
  }
  writeStr(o, str) { o += this.write(o, str); this.write8(o, 0); return str.length + 1; }
}

const bind = (obj, names) => Object.fromEntries(names.map((n) => [n, obj[n].bind(obj)]));

class MemFS {
  constructor(memfsModule, io) {
    this.io = io; // { write(fd, bytes), stdin: Uint8Array, stdinPos }
    this.stdin = new Uint8Array(0);
    this.stdinPos = 0;
    const env = bind(this, ["abort", "host_write", "host_read", "memfs_log", "copy_in", "copy_out"]);
    this.ready = WebAssembly.instantiate(memfsModule, { env }).then((instance) => {
      this.exports = instance.exports;
      this.mem = new Memory(this.exports.memory);
      this.exports.init();
    });
  }
  setStdin(text) { this.stdin = new TextEncoder().encode(text); this.stdinPos = 0; }
  addDirectory(path) { this.mem.check(); this.mem.write(this.exports.GetPathBuf(), path); this.exports.AddDirectoryNode(path.length); }
  addFile(path, contents) {
    const length = contents.byteLength ?? contents.length;
    this.mem.check();
    this.mem.write(this.exports.GetPathBuf(), path);
    const inode = this.exports.AddFileNode(path.length, length);
    const addr = this.exports.GetFileNodeAddress(inode);
    this.mem.check();
    this.mem.write(addr, contents);
  }
  getFileContents(path) {
    this.mem.check();
    this.mem.write(this.exports.GetPathBuf(), path);
    const inode = this.exports.FindNode(path.length);
    const addr = this.exports.GetFileNodeAddress(inode);
    const size = this.exports.GetFileNodeSize(inode);
    return new Uint8Array(this.mem.buffer, addr, size).slice();
  }
  abort() { throw new Error("memfs abort"); }
  host_write(fd, iovs, iovsLen, nwrittenOut) {
    this.hostMem.check();
    let size = 0;
    const chunks = [];
    for (let i = 0; i < iovsLen; ++i) {
      const buf = this.hostMem.read32(iovs); iovs += 4;
      const len = this.hostMem.read32(iovs); iovs += 4;
      chunks.push(this.hostMem.u8.slice(buf, buf + len));
      size += len;
    }
    this.hostMem.write32(nwrittenOut, size);
    for (const c of chunks) this.io.write(fd, c);
    return ESUCCESS;
  }
  host_read(fd, iovs, iovsLen, nread) {
    this.hostMem.check();
    let size = 0;
    for (let i = 0; i < iovsLen; ++i) {
      const buf = this.hostMem.read32(iovs); iovs += 4;
      const len = this.hostMem.read32(iovs); iovs += 4;
      const n = Math.min(len, this.stdin.length - this.stdinPos);
      if (n === 0) break;
      this.hostMem.u8.set(this.stdin.subarray(this.stdinPos, this.stdinPos + n), buf);
      this.stdinPos += n; size += n;
      if (n !== len) break;
    }
    this.hostMem.write32(nread, size);
    return ESUCCESS;
  }
  memfs_log() {}
  copy_out(dst, src, size) { this.hostMem.check(); this.mem.check(); new Uint8Array(this.hostMem.buffer, dst, size).set(new Uint8Array(this.mem.buffer, src, size)); }
  copy_in(dst, src, size) { this.mem.check(); this.hostMem.check(); new Uint8Array(this.mem.buffer, dst, size).set(new Uint8Array(this.hostMem.buffer, src, size)); }
}

class App {
  constructor(module, memfs, argv, env = {}) {
    this.argv = argv;
    this.memfs = memfs;
    const wasi = bind(this, ["proc_exit", "environ_sizes_get", "environ_get", "args_sizes_get", "args_get", "random_get", "clock_time_get", "poll_oneoff"]);
    Object.assign(wasi, memfs.exports);
    this.ready = WebAssembly.instantiate(module, { wasi_unstable: wasi, env }).then((inst) => {
      this.exports = inst.exports;
      this.mem = new Memory(this.exports.memory);
      memfs.hostMem = this.mem;
    });
  }
  async run() {
    await this.ready;
    try { this.exports._start(); return 0; }
    catch (e) { if (e instanceof ProcExit) return e.code; throw e; }
  }
  proc_exit(code) { throw new ProcExit(code); }
  environ_sizes_get(c, s) { this.mem.check(); this.mem.write64(c, 0); this.mem.write64(s, 0); return ESUCCESS; }
  environ_get() { return ESUCCESS; }
  args_sizes_get(argcOut, sizeOut) {
    this.mem.check();
    this.mem.write64(argcOut, this.argv.length);
    this.mem.write64(sizeOut, this.argv.reduce((n, a) => n + a.length + 1, 0));
    return ESUCCESS;
  }
  args_get(ptrs, buf) {
    this.mem.check();
    for (const a of this.argv) { this.mem.write32(ptrs, buf); ptrs += 4; buf += this.mem.writeStr(buf, a); }
    this.mem.write32(ptrs, 0);
    return ESUCCESS;
  }
  random_get(buf, len) {
    this.mem.check();
    const d = new Uint8Array(this.mem.buffer, buf, len);
    for (let i = 0; i < len; ++i) d[i] = (Math.random() * 256) | 0;
    return ESUCCESS;
  }
  clock_time_get(_id, _prec, out) {
    this.mem.check();
    const ns = BigInt(Date.now()) * 1000000n;
    this.mem.write32(out, Number(ns & 0xffffffffn));
    this.mem.write32(out + 4, Number(ns >> 32n));
    return ESUCCESS;
  }
  poll_oneoff() { return 52; /* ENOSYS */ }
}

class Tar {
  constructor(buffer) { this.u8 = new Uint8Array(buffer); this.offset = 0; }
  str(len) { const s = readStr(this.u8, this.offset, len); this.offset += len; return s; }
  oct(len) { return parseInt(this.str(len), 8); }
  align() { this.offset = (this.offset + 511) & ~511; }
  entry() {
    if (this.offset + 512 > this.u8.length) return null;
    const e = { name: this.str(100), mode: this.oct(8), owner: this.oct(8), group: this.oct(8), size: this.oct(12), mtim: this.oct(12), checksum: this.oct(8), type: this.str(1), link: this.str(100) };
    if (this.str(8) !== "ustar  ") return null;
    this.str(32); this.str(32); this.str(8); this.str(8); this.str(155);
    this.align();
    if (e.type === "0") { e.contents = this.u8.subarray(this.offset, this.offset + e.size); this.offset += e.size; this.align(); }
    else if (e.type !== "5") throw new Error("unsupported tar entry " + e.type);
    return e;
  }
  untar(fs) {
    let e;
    while ((e = this.entry())) { if (e.type === "0") fs.addFile(e.name, e.contents); else fs.addDirectory(e.name); }
  }
}

export const sha256Hex = async (buf) =>
  [...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", buf))].map((b) => b.toString(16).padStart(2, "0")).join("");

const SOFT_FLOAT = /^__(?:[a-z]+tf[23]?|float[a-z]*tf|fix[a-z]*tf[a-z]*|extend[a-z]*tf2|trunc[a-z]*tf[a-z]*|unord[a-z]*tf2|powi[a-z]*)$/;
const CLANG_ARGS = [
  "-disable-free", "-isysroot", "/", "-internal-isystem", "/include/c++/v1", "-internal-isystem", "/include",
  "-internal-isystem", "/lib/clang/8.0.1/include", "-ferror-limit", "10", "-fmessage-length", "0", "-std=c++17", "-Wall",
];

export class ClangRunner {
  /**
   * @param {{ files: {clang:ArrayBuffer, lld:ArrayBuffer, memfs:ArrayBuffer, sysroot:ArrayBuffer} }} opts
   *   The buffers must already have passed hash verification (see fetchVerified in the worker).
   */
  constructor(opts) {
    this.opts = opts;
    this.current = { out: () => {} };
    this.io = { write: (fd, bytes) => this.current.out(fd, bytes) };
  }
  async init(progress = () => {}) {
    progress("Preparing compiler…");
    const memfsModule = await WebAssembly.compile(this.opts.files.memfs);
    this.memfs = new MemFS(memfsModule, this.io);
    await this.memfs.ready;
    progress("Unpacking C++ library…");
    new Tar(this.opts.files.sysroot).untar(this.memfs);
    progress("Compiling clang…");
    this.clang = await WebAssembly.compile(this.opts.files.clang);
    progress("Compiling linker…");
    this.lld = await WebAssembly.compile(this.opts.files.lld);
    // The raw buffers are no longer needed once compiled; free the memory.
    this.opts.files = { memfs: null, sysroot: null, clang: null, lld: null };
  }
  async _exec(module, ...argv) {
    // Unresolved symbols (e.g. long-double helpers pulled in by <algorithm>) are linked as imports. Programs for this
    // course never call them, so each one becomes a stub that stops the program with a clear message if it ever runs.
    const env = {};
    for (const i of WebAssembly.Module.imports(module)) {
      if (i.module === "env" && i.kind === "function") env[i.name] = () => { throw new Error(`unsupported feature in browser mode: ${i.name}`); };
    }
    const app = new App(module, this.memfs, argv, env);
    return app.run();
  }
  /** Compile + link. Returns { ok, wasm, diagnostics } (diagnostics = compiler text for the error explainer). */
  async build(source) {
    let diag = "";
    this.current = { out: (fd, b) => { diag += new TextDecoder().decode(b); } };
    this.memfs.addFile("main.cpp", new TextEncoder().encode(source));
    const rc = await this._exec(this.clang, "clang", "-cc1", "-emit-obj", ...CLANG_ARGS, "-O0", "-o", "main.o", "-x", "c++", "main.cpp");
    if (rc !== 0) return { ok: false, wasm: null, diagnostics: diag };
    const rl = await this._exec(this.lld, "wasm-ld", "--no-threads", "--export-dynamic", "--allow-undefined", "-z", `stack-size=${1024 * 1024}`, "-Llib/wasm32-wasi", "lib/wasm32-wasi/crt1.o", "main.o", "-lc", "-lc++", "-lc++abi", "-o", "main.wasm");
    if (rl !== 0) return { ok: false, wasm: null, diagnostics: diag || "link failed" };
    const wasm = this.memfs.getFileContents("main.wasm");
    // --allow-undefined turns every missing symbol into an import. Soft-float helpers (pulled in by <algorithm>) are harmless;
    // anything else is a real "undefined reference" and must be reported like a normal linker error.
    const missing = WebAssembly.Module.imports(await WebAssembly.compile(wasm))
      .filter((i) => i.module === "env" && i.kind === "function" && !SOFT_FLOAT.test(i.name)).map((i) => i.name);
    if (missing.length) {
      const pretty = (n) => { const m = /^_Z(\d+)(.+)/.exec(n); return m ? m[2].slice(0, Number(m[1])) : n; };
      const lines = missing.map((n) => (n === "main" ? "error: undefined reference to 'main' (every program needs int main())" : `error: undefined reference to '${pretty(n)}' (the function is declared or called but never defined)`));
      return { ok: false, wasm: null, diagnostics: diag + lines.join("\n") + "\n" };
    }
    return { ok: true, wasm, diagnostics: diag };
  }
  /** Run a built program. onOut(fd, text) is called as output arrives; output is capped. */
  async runProgram(wasm, stdin, onOut, maxOutput = 200_000) {
    let total = 0;
    const dec = new TextDecoder();
    this.current = {
      out: (fd, bytes) => {
        total += bytes.length;
        if (total > maxOutput) throw new OutputLimit("Output limit reached");
        onOut(fd, dec.decode(bytes));
      },
    };
    this.memfs.setStdin(stdin ?? "");
    const progModule = await WebAssembly.compile(wasm);
    try {
      const code = await this._exec(progModule, "main.wasm");
      return { exitCode: code, truncated: false };
    } catch (e) {
      if (e instanceof OutputLimit) return { exitCode: -1, truncated: true };
      if (e instanceof WebAssembly.RuntimeError) return { exitCode: -2, truncated: false, trap: String(e.message) };
      if (e instanceof Error && e.message.startsWith("unsupported feature")) return { exitCode: -3, truncated: false, trap: e.message };
      throw e;
    }
  }
}
