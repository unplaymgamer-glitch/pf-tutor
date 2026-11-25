// Detects C++ features that the small built-in interpreter (Basic mode, Tier 2) cannot run, so the Playground can
// suggest the full compiler instead of showing a confusing interpreter error. Pure and unit-tested.
export type Unsupported = { feature: string; why: string };

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/"(?:\\.|[^"\\\n])*"/g, '""').replace(/'(?:\\.|[^'\\\n])+'/g, "'x'");

export function unsupportedInBasicMode(source: string): Unsupported[] {
  const code = strip(source);
  const found: Unsupported[] = [];
  const add = (feature: string, why: string) => found.push({ feature, why });
  for (const lib of ["string", "vector", "fstream", "algorithm", "map", "set", "queue", "stack", "sstream", "chrono", "memory", "functional"]) {
    if (new RegExp(`#\\s*include\\s*<${lib}>`).test(source)) add(`<${lib}>`, `Basic mode does not have the ${lib} library.`);
  }
  if (/\bstruct\s+\w+\s*\{/.test(code) || /\bclass\s+\w+/.test(code)) add("struct / class", "Basic mode cannot define your own types.");
  if (/\bnew\b|\bdelete\b/.test(code)) add("new / delete", "Basic mode has no dynamic memory.");
  if (/\w\s*&\s*\w+\s*[,)]/.test(code.replace(/&&/g, "  ")) && /\([^)]*\b(?:int|double|float|char|bool)\s*&/.test(code)) add("reference parameter (&)", "Basic mode cannot pass by reference.");
  if (/\b(?:try|catch|throw)\b/.test(code)) add("try / catch", "Exceptions are not supported.");
  if (/\btemplate\s*</.test(code)) add("templates", "Templates are not supported.");
  if (/\b(?:ifstream|ofstream|fstream)\b/.test(code)) add("file streams", "Files are not available in Basic mode.");
  if (/\bstring\b/.test(code)) add("string class", "Basic mode has no string class (use char arrays).");
  if (/\bauto\b|\bnullptr\b|\bstatic_cast\b|\bnamespace\s+\w+\s*\{/.test(code)) add("modern C++ (auto / nullptr / static_cast)", "Only simple C++ is supported in Basic mode.");
  return found;
}
