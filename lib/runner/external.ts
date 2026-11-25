// Tier 3: last-resort deep link to a reputable free online compiler (Compiler Explorer, godbolt.org) with the code, input
// and C++17 preselected. The compiler id is re-verified against https://godbolt.org/api/compilers/c++ (last checked 2026-11-24);
// if the id ever disappears, Compiler Explorer falls back to its default compiler, and the code is also copied to the clipboard.
export const EXTERNAL_COMPILER_ID = "g162"; // x86-64 gcc 16.2

export function externalCompilerUrl(code: string, stdin: string): string {
  const compiler = { id: EXTERNAL_COMPILER_ID, libs: [], options: "-std=c++17 -O0", filters: { binary: false, execute: false, intel: true, demangle: true, labels: true, libraryCode: true, directives: true, commentOnly: true, trim: false } };
  const state = {
    sessions: [
      {
        id: 1,
        language: "c++",
        source: code,
        compilers: [],
        executors: [{ compiler: { id: EXTERNAL_COMPILER_ID, libs: [], options: compiler.options, overrides: [], runtimeTools: [] }, stdin, arguments: "", argumentsVisible: false, stdinVisible: true, compilationPanelShown: true, compilerOutShown: true, wrap: false }],
      },
    ],
  };
  const json = JSON.stringify(state);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return `https://godbolt.org/clientstate/${encodeURIComponent(b64)}`;
}
