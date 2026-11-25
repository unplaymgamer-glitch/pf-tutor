// Identity motif: a very faint field of C++ glyphs drifting upward behind the page. Pure CSS, no JavaScript.
// Hidden by CSS in reduce-motion and low-data modes (html[data-motion="reduce"]) and always far below text contrast.
const GLYPHS = ["{ }", ";", "( )", "[ ]", "<<", ">>", "&&", "++", "#", "*p", "::", "->", "//", "0x", "int", "for"];

export function CodeMotif() {
  return (
    <div className="code-motif" aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => {
        const r = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1; // deterministic pseudo-random
        const f = (n: number) => Math.abs(r(n));
        return (
          <span key={i} style={{ left: `${Math.round(f(1) * 96)}%`, fontSize: `${14 + Math.round(f(2) * 26)}px`, animationDuration: `${26 + Math.round(f(3) * 30)}s`, animationDelay: `-${Math.round(f(4) * 40)}s` }}>
            {GLYPHS[i % GLYPHS.length]}
          </span>
        );
      })}
    </div>
  );
}
