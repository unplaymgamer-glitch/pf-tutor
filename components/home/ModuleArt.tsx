import type { CourseModule } from "@/lib/course";

const T = { fill: "var(--muted)", fontSize: 9, fontFamily: "ui-monospace, monospace" } as const;

/** One small animated picture per module. Pure SVG + CSS; the animations stop when the student pauses motion. */
export function ModuleArt({ art }: { art: CourseModule["art"] }) {
  const c = "var(--wk)";
  const box = (x: number, y: number, w: number, h: number, o = 0.18) => <rect x={x} y={y} width={w} height={h} rx={6} fill={c} fillOpacity={o} stroke={c} strokeWidth={1.5} />;
  return (
    <svg viewBox="0 0 240 120" className="h-full w-full" role="img" aria-label={`${art} illustration`} preserveAspectRatio="xMidYMid meet">
      {art === "flow" && <>
        <line x1="40" y1="60" x2="200" y2="60" stroke={c} strokeWidth="2" className="art-dash" />
        {box(22, 44, 32, 32)}{box(94, 34, 52, 52, 0.3)}{box(186, 44, 32, 32)}
        <text x="38" y="94" textAnchor="middle" {...T}>IN</text><text x="120" y="102" textAnchor="middle" {...T}>ALGORITHM</text><text x="202" y="94" textAnchor="middle" {...T}>OUT</text>
        <circle cx="52" cy="60" r="4" fill={c} className="art-run" />
      </>}
      {art === "branch" && <>
        <path d="M120 22 L158 54 L120 86 L82 54 Z" fill={c} fillOpacity=".2" stroke={c} strokeWidth="2" />
        <text x="120" y="58" textAnchor="middle" {...T}>x &gt; 0 ?</text>
        <path d="M82 54 H40 V100 M158 54 H200 V100" fill="none" stroke={c} strokeWidth="2" className="art-dash" />
        <text x="36" y="112" {...T}>no</text><text x="192" y="112" {...T}>yes</text>
        <circle cx="120" cy="22" r="4" fill={c} className="art-hop" />
      </>}
      {art === "loop" && <>
        <g className="art-spin"><path d="M120 24 A36 36 0 1 1 84 60" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" /><path d="M76 52 L84 64 L94 54" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" /></g>
        <text x="120" y="64" textAnchor="middle" {...T} fontSize="11">i++</text>
        <text x="120" y="110" textAnchor="middle" {...T}>init · check · update</text>
      </>}
      {art === "bars" && [0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={34 + i * 32} y={30 + (i % 3) * 8} width="20" height={70 - (i % 3) * 8} rx="3" fill={c} fillOpacity={0.45 + (i % 3) * 0.2} className="art-bar" style={{ animationDelay: `${i * 0.25}s` }} />)}
      {art === "grid" && [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((k) => <rect key={`${r}${k}`} x={72 + k * 24} y={18 + r * 24} width="20" height="20" rx="4" fill={c} fillOpacity={(r + k) % 2 ? 0.45 : 0.18} stroke={c} strokeOpacity=".6" className={(r * 4 + k) % 5 === 0 ? "art-glow" : ""} style={{ animationDelay: `${(r + k) * 0.2}s` }} />))}
      {art === "func" && <>
        {box(88, 34, 64, 52, 0.28)}<text x="120" y="66" textAnchor="middle" {...T} fontSize="13">f(x)</text>
        <path d="M24 60 H84 M156 60 H214" stroke={c} strokeWidth="2" className="art-dash" /><text x="30" y="52" {...T}>in</text><text x="196" y="52" {...T}>out</text>
        <circle cx="30" cy="60" r="4" fill={c} className="art-run" />
      </>}
      {art === "pointer" && <>
        {[0, 1, 2, 3, 4].map((i) => <g key={i}>{box(26 + i * 38, 70, 34, 30, i === 2 ? 0.4 : 0.15)}<text x={43 + i * 38} y="89" textAnchor="middle" {...T}>{[7, 3, 9, 4, 1][i]}</text></g>)}
        <g className="art-hop"><rect x="84" y="20" width="72" height="22" rx="11" fill={c} fillOpacity=".25" stroke={c} /><text x="120" y="35" textAnchor="middle" {...T}>p → 0x2A</text><path d="M120 44 V66" stroke={c} strokeWidth="2.5" /><path d="M114 60 L120 68 L126 60" fill="none" stroke={c} strokeWidth="2.5" /></g>
      </>}
      {art === "stack" && [0, 1, 2, 3].map((i) => <g key={i} className="art-glow" style={{ animationDelay: `${(3 - i) * 0.45}s` }}>{box(80, 86 - i * 22, 80, 18, 0.2 + i * 0.1)}<text x="120" y={99 - i * 22} textAnchor="middle" {...T}>f({4 - i})</text></g>)}
      {art === "struct" && <>
        {box(70, 16, 100, 90, 0.12)}
        {[["name", "Ayesha"], ["id", "2401"], ["gpa", "3.7"]].map(([k, v], i) => <g key={k}><text x="82" y={44 + i * 26} {...T} fontSize="11">{k}</text><text x="158" y={44 + i * 26} textAnchor="end" {...T} fontSize="11" fill={c}>{v}</text><line x1="80" x2="160" y1={52 + i * 26} y2={52 + i * 26} stroke={c} strokeOpacity=".4" /></g>)}
      </>}
      {art === "files" && <>
        <path d="M70 16 H130 L158 44 V104 H70 Z" fill={c} fillOpacity=".15" stroke={c} strokeWidth="2" />
        {[0, 1, 2, 3].map((i) => <line key={i} x1="84" x2={140 - (i % 2) * 18} y1={58 + i * 12} y2={58 + i * 12} stroke={c} strokeWidth="3" strokeLinecap="round" className="art-glow" style={{ animationDelay: `${i * 0.3}s` }} />)}
        <path d="M168 60 H214" stroke={c} strokeWidth="2" className="art-dash" /><text x="172" y="52" {...T}>read</text>
      </>}
    </svg>
  );
}
