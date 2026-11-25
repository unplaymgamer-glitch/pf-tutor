# Third-party notices

## binji/wasm-clang (in-browser C++ compiler, "full mode")
- Source: https://github.com/binji/wasm-clang, pinned commit `648c4a89997a351eef75cdaec3ef5b89d4937dec`. License: Apache-2.0 (LLVM components under Apache-2.0 with LLVM exceptions).
- `public/runner/clang-core.mjs` is adapted from that project's `shared.js` (Copyright 2020 WebAssembly Community Group participants, Apache-2.0) with the changes listed in its header.
- The compiler binaries (`clang`, `lld`, `memfs`, `sysroot.tar`, about 60 MB) are not stored in this repository. Browsers download them on request from the mirrors listed in `public/runner/runner-manifest.json` and refuse any file whose SHA-256 differs from the pinned value.

## JSCPP (Basic mode interpreter)
- https://github.com/felixhao28/JSCPP, npm package `JSCPP` 2.0.9, MIT-style license (see its package).

## Compiler Explorer (Tier 3 link)
- Used only as an optional external link to https://godbolt.org. Nothing is embedded. Students are told that their code is sent to its servers.
