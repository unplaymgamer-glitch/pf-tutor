import type { CourseModule } from "@/lib/course";

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, monospace", fontWeight: 700 } as const;
const C = "var(--wk)";
const OK = "var(--success)", BAD = "var(--error)", WARN = "var(--warning)";

/** A small isometric block: lit top, mid front, dark side, soft shadow underneath. Gives the pictures depth without any 3D library. */
function Block({ x, y, w = 34, h = 22, d = 10, label, tone = C, glow = false, cls = "", delay = 0 }: { x: number; y: number; w?: number; h?: number; d?: number; label?: string; tone?: string; glow?: boolean; cls?: string; delay?: number }) {
  const t = (p: number) => `color-mix(in srgb, ${tone} ${p}%, transparent)`;
  return (
    <g className={cls} style={{ animationDelay: `${delay}s` }} filter={glow ? "url(#ma-glow)" : undefined}>
      <ellipse cx={x + w / 2 + d / 2} cy={y + h + 3} rx={w / 2 + d} ry={4} fill="#000" fillOpacity=".35" />
      <polygon points={`${x},${y} ${x + d},${y - d * 0.7} ${x + w + d},${y - d * 0.7} ${x + w},${y}`} fill={t(70)} stroke={tone} strokeWidth="1" />
      <polygon points={`${x + w},${y} ${x + w + d},${y - d * 0.7} ${x + w + d},${y + h - d * 0.7} ${x + w},${y + h}`} fill={t(22)} stroke={tone} strokeWidth="1" />
      <rect x={x} y={y} width={w} height={h} fill={t(40)} stroke={tone} strokeWidth="1.2" />
      {label && <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle" fontSize="9" fill="var(--text)" {...MONO}>{label}</text>}
    </g>
  );
}

const Token = ({ y, label, delay, tone = WARN }: { y: number; label: string; delay: number; tone?: string }) => (
  <g className="art-run" style={{ animationDelay: `${delay}s` }}>
    <rect x="30" y={y - 8} width="30" height="15" rx="7.5" fill={tone} fillOpacity=".22" stroke={tone} />
    <text x="45" y={y + 3} textAnchor="middle" fontSize="8.5" fill={tone} {...MONO}>{label}</text>
  </g>
);

/** One animated 2.5D picture per module: glowing, layered, and still when the student pauses motion. */
export function ModuleArt({ art }: { art: CourseModule["art"] }) {
  return (
    <svg viewBox="0 0 240 120" className="h-full w-full" role="img" aria-label={`${art} illustration`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="ma-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="ma-beam" x1="0" x2="1"><stop offset="0" stopColor={C} stopOpacity="0" /><stop offset=".5" stopColor={C} stopOpacity=".9" /><stop offset="1" stopColor={C} stopOpacity="0" /></linearGradient>
        <radialGradient id="ma-floor" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={C} stopOpacity=".35" /><stop offset="1" stopColor={C} stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="120" cy="104" rx="104" ry="12" fill="url(#ma-floor)" />

      {art === "flow" && <>
        <path d="M62 62 H188" stroke="url(#ma-beam)" strokeWidth="3" className="art-dash" />
        <Token y={52} label="int" delay={0} /><Token y={52} label="cin" delay={1} tone={C} /><Token y={52} label="cout" delay={2} tone={OK} />
        <Block x={96} y={50} w={42} h={30} d={12} label="g++" glow />
        <g><rect x="176" y="34" width="44" height="40" rx="5" fill="#05080f" stroke={OK} strokeWidth="1.4" filter="url(#ma-glow)" /><text x="182" y="50" fontSize="8" fill={OK} {...MONO}>&gt; Hi</text><text x="182" y="62" fontSize="8" fill={OK} {...MONO}>_</text></g>
        <text x="40" y="96" fontSize="8" fill="var(--muted)" {...MONO}>code</text><text x="104" y="104" fontSize="8" fill="var(--muted)" {...MONO}>compile</text><text x="186" y="92" fontSize="8" fill="var(--muted)" {...MONO}>run</text>
      </>}

      {art === "branch" && <>
        <g filter="url(#ma-glow)"><polygon points="120,14 158,46 120,78 82,46" fill={`color-mix(in srgb, ${C} 28%, transparent)`} stroke={C} strokeWidth="2" /></g>
        <text x="120" y="50" textAnchor="middle" fontSize="10" fill="var(--text)" {...MONO}>x &gt; 0</text>
        <path d="M82 46 H44 V92" fill="none" stroke={BAD} strokeWidth="2.4" className="art-dash" /><path d="M158 46 H196 V92" fill="none" stroke={OK} strokeWidth="2.4" className="art-dash" />
        <circle cx="44" cy="92" r="5" fill={BAD} filter="url(#ma-glow)" className="art-glow" /><circle cx="196" cy="92" r="5" fill={OK} filter="url(#ma-glow)" className="art-glow" style={{ animationDelay: "1.2s" }} />
        <text x="30" y="108" fontSize="9" fill={BAD} {...MONO}>FALSE</text><text x="186" y="108" fontSize="9" fill={OK} {...MONO}>TRUE</text>
        <circle cx="120" cy="12" r="3.5" fill={WARN} className="art-hop" />
      </>}

      {art === "loop" && <>
        <ellipse cx="120" cy="60" rx="54" ry="30" fill="none" stroke={`color-mix(in srgb, ${C} 25%, transparent)`} strokeWidth="9" />
        <g className="art-spin" filter="url(#ma-glow)"><ellipse cx="120" cy="60" rx="54" ry="30" fill="none" stroke={C} strokeWidth="9" strokeLinecap="round" strokeDasharray="70 200" /></g>
        <g className="art-hop"><rect x="92" y="48" width="56" height="24" rx="12" fill="#05080f" fillOpacity=".85" stroke={WARN} strokeWidth="1.4" /><text x="120" y="64" textAnchor="middle" fontSize="10" fill={WARN} {...MONO}>i = 0 → n</text></g>
        <text x="120" y="108" textAnchor="middle" fontSize="8.5" fill="var(--muted)" {...MONO}>init · check · update</text>
      </>}

      {art === "bars" && <>
        {[0, 1, 2, 3, 4].map((i) => <Block key={i} x={26 + i * 36} y={56} w={30} h={26} d={10} label={`[${i}]`} glow={i === 2} cls={i === 2 ? "art-glow" : ""} tone={i === 2 ? WARN : C} delay={i * 0.2} />)}
        <g className="art-hop"><path d="M100 22 V42" stroke={WARN} strokeWidth="2.4" /><polygon points="94,40 106,40 100,50" fill={WARN} /><text x="100" y="16" textAnchor="middle" fontSize="9" fill={WARN} {...MONO}>a[i]</text></g>
      </>}

      {art === "grid" && [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((k) => <Block key={`${r}${k}`} x={52 + k * 34 - r * 6} y={34 + r * 22} w={26} h={12} d={7} tone={(r + k) % 3 === 0 ? WARN : C} glow={(r + k) % 3 === 0} cls={(r + k) % 3 === 0 ? "art-glow" : ""} delay={(r + k) * 0.25} />))}

      {art === "func" && <>
        <path d="M24 60 H96 M144 60 H216" stroke="url(#ma-beam)" strokeWidth="3" className="art-dash" />
        <Token y={50} label="x = 3" delay={0} /><g className="art-run" style={{ animationDelay: "1.4s" }}><rect x="74" y="42" width="38" height="15" rx="7.5" fill={OK} fillOpacity=".22" stroke={OK} /><text x="93" y="53" textAnchor="middle" fontSize="8.5" fill={OK} {...MONO}>return</text></g>
        <Block x={94} y={40} w={52} h={34} d={13} label="f(x)" glow />
        <text x="30" y="86" fontSize="8" fill="var(--muted)" {...MONO}>argument</text><text x="186" y="86" fontSize="8" fill="var(--muted)" {...MONO}>result</text>
      </>}

      {art === "pointer" && <>
        {[0, 1, 2, 3].map((i) => <Block key={i} x={30 + i * 48} y={72} w={38} h={22} d={9} label={["7", "3", "9", "4"][i]} tone={i === 2 ? WARN : C} glow={i === 2} />)}
        {[0, 1, 2, 3].map((i) => <text key={i} x={36 + i * 48} y={108} fontSize="7" fill="var(--muted)" {...MONO}>0x{(0x2a0 + i * 4).toString(16)}</text>)}
        <g className="art-hop"><rect x="46" y="14" width="64" height="22" rx="11" fill={`color-mix(in srgb, ${WARN} 20%, transparent)`} stroke={WARN} filter="url(#ma-glow)" /><text x="78" y="29" textAnchor="middle" fontSize="9" fill={WARN} {...MONO}>p → 0x2a8</text></g>
        <path d="M110 25 C150 8, 160 40, 138 62" fill="none" stroke={WARN} strokeWidth="2.2" className="art-dash" filter="url(#ma-glow)" /><polygon points="132,60 144,58 138,70" fill={WARN} />
      </>}

      {art === "stack" && [0, 1, 2, 3].map((i) => <Block key={i} x={80} y={78 - i * 20} w={70} h={14} d={12} label={`f(${4 - i})`} glow={i === 3} cls="art-glow" delay={(3 - i) * 0.45} tone={i === 3 ? WARN : C} />)}

      {art === "struct" && <>
        <Block x={72} y={30} w={86} h={62} d={14} glow />
        {[["name", "Ayesha"], ["id", "2401"], ["gpa", "3.7"]].map(([k, v], i) => <g key={k}><text x="80" y={50 + i * 17} fontSize="9" fill="var(--muted)" {...MONO}>{k}</text><text x="152" y={50 + i * 17} textAnchor="end" fontSize="9.5" fill={i === 2 ? WARN : "var(--text)"} {...MONO}>{v}</text></g>)}
        <circle cx="192" cy="40" r="4" fill={OK} filter="url(#ma-glow)" className="art-glow" />
      </>}

      {art === "files" && <>
        <g filter="url(#ma-glow)"><path d="M66 18 H124 L152 46 V96 H66 Z" fill={`color-mix(in srgb, ${C} 18%, transparent)`} stroke={C} strokeWidth="2" /><path d="M124 18 V46 H152" fill={`color-mix(in srgb, ${C} 45%, transparent)`} stroke={C} /></g>
        {[0, 1, 2, 3].map((i) => <line key={i} x1="78" x2={136 - (i % 2) * 18} y1={58 + i * 9} y2={58 + i * 9} stroke={WARN} strokeWidth="3" strokeLinecap="round" className="art-glow" style={{ animationDelay: `${i * 0.3}s` }} />)}
        <path d="M164 62 H214" stroke="url(#ma-beam)" strokeWidth="3" className="art-dash" /><text x="168" y="54" fontSize="8.5" fill={OK} {...MONO}>read()</text>
        <rect x="170" y="70" width="42" height="22" rx="4" fill="#05080f" stroke={OK} filter="url(#ma-glow)" /><text x="176" y="85" fontSize="8" fill={OK} {...MONO}>ifstream</text>
      </>}
    </svg>
  );
}
