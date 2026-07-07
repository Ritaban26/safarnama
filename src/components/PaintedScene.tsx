import { useId } from "react";

export type SceneVariant =
  | "meadow"
  | "dusk"
  | "sea"
  | "forest"
  | "lantern"
  | "mountain"
  | "ember"
  | "valley";

const LABELS: Record<SceneVariant, string> = {
  meadow: "Painted meadow under a summer sky",
  dusk: "Painted dusk sky over rolling hills",
  sea: "Painted lake with flowering islands and snow mountains",
  forest: "Painted forest path with morning light",
  lantern: "Painted night scene with warm lantern light on water",
  mountain: "Painted blue mountains over a still lake",
  ember: "Painted warm hearth glow",
  valley: "Painted river valley with terraced fields",
};

interface Fx {
  /** turbulence displacement — roughens landform edges */
  f: string;
  /** soft blur (distance haze, cloud shading) */
  s1: string;
  /** heavy blur (bloom, god rays) */
  s2: string;
}

/**
 * Anime-grade SVG scenery in the key-frame background tradition:
 * multi-stop skies, cumulus with cool shaded undersides, aerial
 * perspective on distant landforms, gaussian bloom on light sources,
 * and a final grade pass (warm highlights / cool shadows) + grain.
 */
export default function PaintedScene({
  variant,
  className = "",
}: {
  variant: SceneVariant;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fx: Fx = { f: `pf${uid}`, s1: `s1${uid}`, s2: `s2${uid}` };
  const nz = `nz${uid}`;
  const vg = `vg${uid}`;
  const grade = `gr${uid}`;

  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full ${className}`}
      role="img"
      aria-label={LABELS[variant]}
    >
      <defs>
        <filter id={fx.f} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="3" seed="7" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="9" />
        </filter>
        <filter id={fx.s1} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={fx.s2} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={nz}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.1" />
          </feComponentTransfer>
          <feComposite operator="over" in2="SourceGraphic" />
        </filter>
        <radialGradient id={vg} cx="50%" cy="40%" r="78%">
          <stop offset="58%" stopColor="#1d2433" stopOpacity="0" />
          <stop offset="100%" stopColor="#1d2433" stopOpacity="0.3" />
        </radialGradient>
        <linearGradient id={grade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9c4" stopOpacity="0.1" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#2b3a55" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      {variant === "meadow" && <Meadow fx={fx} uid={uid} />}
      {variant === "dusk" && <Dusk fx={fx} uid={uid} />}
      {variant === "sea" && <Sea fx={fx} uid={uid} />}
      {variant === "forest" && <Forest fx={fx} uid={uid} />}
      {variant === "lantern" && <Lantern fx={fx} uid={uid} />}
      {variant === "mountain" && <Mountain fx={fx} uid={uid} />}
      {variant === "ember" && <Ember fx={fx} uid={uid} />}
      {variant === "valley" && <Valley fx={fx} uid={uid} />}

      {/* grade pass: warm key light from above, cool shadow floor */}
      <rect width="800" height="600" fill={`url(#${grade})`} style={{ mixBlendMode: "soft-light" }} />
      <rect width="800" height="600" filter={`url(#${nz})`} opacity="0.5" fill="transparent" />
      <rect width="800" height="600" fill={`url(#${vg})`} />
    </svg>
  );
}

/* ============ shared painterly elements ============ */

/** Cumulus with a lit crown and a cool shaded underside. */
function Cloud({
  x, y, s, fx, tone = "day", distant = false,
}: {
  x: number; y: number; s: number; fx: Fx;
  tone?: "day" | "dusk" | "night";
  distant?: boolean;
}) {
  const lit = tone === "day" ? "#fefdf8" : tone === "dusk" ? "#ffe3b8" : "#aebbd2";
  const mid = tone === "day" ? "#eef0ee" : tone === "dusk" ? "#f3b988" : "#8194b3";
  const shade = tone === "day" ? "#c3cfdd" : tone === "dusk" ? "#b97f74" : "#5b6c8c";
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      filter={distant ? `url(#${fx.s1})` : undefined}
      opacity={distant ? 0.85 : 1}
    >
      {/* shaded base */}
      <ellipse cx="2" cy="20" rx="78" ry="16" fill={shade} opacity="0.9" />
      <ellipse cx="-30" cy="16" rx="44" ry="14" fill={shade} opacity="0.75" />
      {/* body */}
      <ellipse cx="0" cy="2" rx="60" ry="26" fill={mid} />
      <ellipse cx="-44" cy="12" rx="38" ry="18" fill={mid} />
      <ellipse cx="46" cy="10" rx="42" ry="20" fill={mid} />
      {/* lit crown */}
      <ellipse cx="6" cy="-16" rx="38" ry="19" fill={lit} />
      <ellipse cx="-24" cy="-6" rx="26" ry="14" fill={lit} opacity="0.95" />
      <ellipse cx="34" cy="-8" rx="24" ry="12" fill={lit} opacity="0.9" />
    </g>
  );
}

/** Horizontal atmospheric haze band — the aerial-perspective trick. */
function Haze({ y, h, color, o = 0.3, fx }: { y: number; h: number; color: string; o?: number; fx: Fx }) {
  return (
    <rect x="-20" y={y} width="840" height={h} fill={color} opacity={o} filter={`url(#${fx.s2})`} />
  );
}

function Flowers({ seed, y0, y1, colors, n = 70 }: { seed: number; y0: number; y1: number; colors: string[]; n?: number }) {
  const dots = [];
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < n; i++) {
    const x = rnd() * 800;
    const y = y0 + rnd() * (y1 - y0);
    const r = 1.2 + rnd() * 2;
    dots.push(
      <circle key={i} cx={x} cy={y} r={r} fill={colors[i % colors.length]} opacity={0.4 + rnd() * 0.5} />
    );
  }
  return <g>{dots}</g>;
}

function Birds({ x, y, color = "#3a4a55" }: { x: number; y: number; color?: string }) {
  return (
    <g stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7">
      <path d={`M${x} ${y} q 7 -8 14 0 q 7 -8 14 0`} />
      <path d={`M${x + 52} ${y - 18} q 5 -6 10 0 q 5 -6 10 0`} />
      <path d={`M${x - 40} ${y + 14} q 4 -5 8 0 q 4 -5 8 0`} />
    </g>
  );
}

/* ============ scenes ============ */

function SkyGrad({ id, stops }: { id: string; stops: [string, string][] }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {stops.map(([off, c], i) => (
        <stop key={i} offset={off} stopColor={c} />
      ))}
    </linearGradient>
  );
}

function Meadow({ fx, uid }: { fx: Fx; uid: string }) {
  const sky = `msky${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad id={sky} stops={[["0%", "#4f8fc0"], ["38%", "#7fb4d6"], ["72%", "#b9d9e4"], ["100%", "#eef3da"]]} />
      </defs>
      <rect width="800" height="600" fill={`url(#${sky})`} />
      <Cloud x={620} y={70} s={0.55} fx={fx} distant />
      <Cloud x={160} y={120} s={1.35} fx={fx} />
      <Cloud x={560} y={170} s={0.8} fx={fx} distant />
      {/* far hills, desaturated by distance */}
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 372 Q 180 318 400 360 T 820 340 V 620 H -20 Z" fill="#9eb39a" />
      </g>
      <Haze y={330} h={70} color="#dceadd" o={0.5} fx={fx} />
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 430 Q 240 366 520 430 T 820 415 V 620 H -20 Z" fill="#83a263" />
        <path d="M-20 525 Q 300 455 820 512 V 620 H -20 Z" fill="#65893f" />
        {/* tree: clumped canopy in three values */}
        <g transform="translate(596 300)">
          <path d="M-7 64 Q -2 22 0 0 Q 3 22 7 64 Z" fill="#4c3a2a" />
          <path d="M-4 40 Q -16 30 -26 26" stroke="#4c3a2a" strokeWidth="4" fill="none" />
          <ellipse cx="-6" cy="-16" rx="62" ry="40" fill="#3f5c38" />
          <ellipse cx="-36" cy="2" rx="34" ry="22" fill="#4c6c41" />
          <ellipse cx="36" cy="-4" rx="34" ry="22" fill="#4c6c41" />
          <ellipse cx="-2" cy="-36" rx="36" ry="20" fill="#5d8150" />
          <ellipse cx="20" cy="-28" rx="20" ry="11" fill="#76995f" />
        </g>
        {/* sunlit patches on the grass */}
        <ellipse cx="240" cy="500" rx="120" ry="22" fill="#8fb45f" opacity="0.8" />
        <ellipse cx="560" cy="545" rx="150" ry="24" fill="#79a04c" opacity="0.7" />
      </g>
      <Flowers seed={11} y0={470} y1={595} colors={["#f3f0e2", "#cf8295", "#d9a441", "#e8e3c8"]} />
      <Birds x={300} y={140} color="#48657d" />
    </g>
  );
}

function Dusk({ fx, uid }: { fx: Fx; uid: string }) {
  const sky = `dsky${uid}`;
  const sun = `dsun${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad
          id={sky}
          stops={[["0%", "#1f2f52"], ["30%", "#3d4e74"], ["55%", "#8a647a"], ["74%", "#d8845e"], ["88%", "#f2b269"], ["100%", "#f9dc9c"]]}
        />
        <radialGradient id={sun} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity="1" />
          <stop offset="40%" stopColor="#ffd382" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffb35c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill={`url(#${sky})`} />
      {/* sun + bloom */}
      <circle cx="430" cy="392" r="34" fill="#fff0c4" filter={`url(#${fx.s1})`} />
      <circle cx="430" cy="390" r="150" fill={`url(#${sun})`} />
      {/* god rays */}
      <g filter={`url(#${fx.s2})`} opacity="0.4">
        <path d="M430 390 L 240 80 L 320 70 Z" fill="#ffd382" />
        <path d="M430 390 L 560 60 L 640 90 Z" fill="#ffce73" />
      </g>
      {/* cloud decks: lit from below */}
      <Cloud x={150} y={180} s={0.7} fx={fx} tone="dusk" distant />
      <Cloud x={640} y={130} s={0.9} fx={fx} tone="dusk" />
      <Cloud x={300} y={250} s={1.15} fx={fx} tone="dusk" />
      <g fill="#e99a6d" opacity="0.75" filter={`url(#${fx.s1})`}>
        <ellipse cx="120" cy="330" rx="120" ry="10" />
        <ellipse cx="600" cy="300" rx="160" ry="12" />
        <ellipse cx="380" cy="350" rx="200" ry="9" opacity="0.8" />
      </g>
      {/* landforms with aerial perspective */}
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 432 Q 180 386 400 422 T 820 402 V 620 H -20 Z" fill="#6d6354" opacity="0.85" />
      </g>
      <Haze y={410} h={50} color="#f2b269" o={0.35} fx={fx} />
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 492 Q 260 434 540 482 T 820 470 V 620 H -20 Z" fill="#46453a" />
        <path d="M-20 562 Q 300 512 820 556 V 620 H -20 Z" fill="#2d2f27" />
      </g>
      <Birds x={520} y={150} color="#1c2236" />
    </g>
  );
}

function Sea({ fx, uid }: { fx: Fx; uid: string }) {
  const sky = `ssky${uid}`;
  const water = `swat${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad id={sky} stops={[["0%", "#5e9cc4"], ["60%", "#a7cfe2"], ["100%", "#dcebe9"]]} />
        <SkyGrad id={water} stops={[["0%", "#5d9cc0"], ["45%", "#3c7ca6"], ["100%", "#2c5f86"]]} />
      </defs>
      <rect width="800" height="600" fill={`url(#${sky})`} />
      <Cloud x={620} y={100} s={1.1} fx={fx} />
      <Cloud x={140} y={70} s={0.7} fx={fx} distant />
      {/* mountains with haze foot */}
      <g filter={`url(#${fx.f})`}>
        <path d="M460 232 L 580 92 L 700 232 Z" fill="#8b9cb4" />
        <path d="M580 92 L 545 137 L 565 132 L 580 152 L 600 130 L 615 135 Z" fill="#f6f8f4" />
        <path d="M620 232 L 730 122 L 830 232 Z" fill="#9caec2" />
        <path d="M730 122 L 705 154 L 722 149 L 733 164 L 748 147 Z" fill="#f6f8f4" />
      </g>
      <Haze y={205} h={45} color="#dcebe9" o={0.55} fx={fx} />
      {/* water */}
      <rect y="228" width="800" height="372" fill={`url(#${water})`} />
      {/* mountain reflection */}
      <g opacity="0.18" filter={`url(#${fx.s1})`}>
        <path d="M460 235 L 580 360 L 700 235 Z" fill="#2c4a66" />
      </g>
      <g filter={`url(#${fx.f})`}>
        <ellipse cx="180" cy="330" rx="95" ry="18" fill="#6f9852" />
        <ellipse cx="180" cy="324" rx="88" ry="12" fill="#82ab60" />
        <ellipse cx="480" cy="300" rx="60" ry="12" fill="#7aa35c" />
        <ellipse cx="640" cy="380" rx="110" ry="20" fill="#638c48" />
        <ellipse cx="640" cy="373" rx="100" ry="13" fill="#76a058" />
        <ellipse cx="330" cy="430" rx="80" ry="15" fill="#6f9852" />
        <path d="M-20 480 Q 300 432 820 470 V 620 H -20 Z" fill="#7da25a" />
      </g>
      <Flowers seed={29} y0={500} y1={595} colors={["#cf8295", "#d9a441", "#f3f0e2", "#b86b80"]} />
      <Flowers seed={53} y0={316} y1={332} colors={["#cf8295", "#d9a441"]} n={40} />
      {/* sun glints */}
      <g stroke="#e9f3f4" strokeLinecap="round" opacity="0.65">
        <path d="M120 410 h 70" strokeWidth="2.5" />
        <path d="M520 470 h 90" strokeWidth="2" />
        <path d="M260 530 h 60" strokeWidth="2" />
        <path d="M430 350 h 44" strokeWidth="1.5" />
      </g>
    </g>
  );
}

function Forest({ fx, uid }: { fx: Fx; uid: string }) {
  const sky = `fsky${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad id={sky} stops={[["0%", "#22351f"], ["55%", "#33502f"], ["100%", "#42603a"]]} />
      </defs>
      <rect width="800" height="600" fill={`url(#${sky})`} />
      <g filter={`url(#${fx.f})`}>
        <ellipse cx="120" cy="70" rx="240" ry="160" fill="#1d2f1c" />
        <ellipse cx="700" cy="50" rx="260" ry="180" fill="#192a18" />
        <ellipse cx="420" cy="-50" rx="280" ry="160" fill="#243c22" />
        <ellipse cx="-40" cy="320" rx="180" ry="240" fill="#1c301a" />
        <ellipse cx="840" cy="360" rx="200" ry="260" fill="#162616" />
      </g>
      {/* god rays — properly bloomed */}
      <g filter={`url(#${fx.s2})`}>
        <path d="M430 -20 L 620 -20 L 480 620 L 330 620 Z" fill="#e9e3b9" opacity="0.3" />
        <path d="M470 -20 L 555 -20 L 445 620 L 390 620 Z" fill="#f5efcd" opacity="0.32" />
      </g>
      <g filter={`url(#${fx.f})`}>
        {/* path catching the light */}
        <path d="M340 620 Q 400 480 420 380 Q 430 320 410 270 L 470 270 Q 480 350 470 420 Q 455 520 480 620 Z" fill="#8a7a5e" />
        <path d="M380 620 Q 420 500 432 400 L 452 400 Q 448 510 460 620 Z" fill="#a8966f" opacity="0.8" />
        <ellipse cx="300" cy="470" rx="55" ry="28" fill="#41592f" />
        <ellipse cx="540" cy="510" rx="70" ry="34" fill="#3a512b" />
        <ellipse cx="350" cy="350" rx="34" ry="18" fill="#4b6535" />
        {/* dappled light on moss */}
        <ellipse cx="320" cy="455" rx="20" ry="8" fill="#8aa05b" opacity="0.8" />
        <ellipse cx="555" cy="495" rx="26" ry="9" fill="#7e9551" opacity="0.7" />
        {/* trunks, lit edge on the shaft side */}
        <path d="M150 620 L 165 240 Q 168 200 160 170 L 200 170 Q 196 220 200 280 L 215 620 Z" fill="#3a2d22" />
        <path d="M196 240 L 200 280 L 212 580 L 204 580 Z" fill="#5e4c38" opacity="0.9" />
        <path d="M640 620 L 652 280 Q 655 230 648 200 L 690 200 Q 685 260 690 320 L 705 620 Z" fill="#332821" />
        <path d="M652 300 L 648 240 L 658 240 L 660 300 Z" fill="#55432f" opacity="0.85" />
      </g>
      {/* ground mist */}
      <Haze y={520} h={60} color="#aebd9a" o={0.22} fx={fx} />
      <Flowers seed={71} y0={530} y1={595} colors={["#d9a441", "#cf8295", "#9fb86a"]} n={40} />
      {/* drifting motes */}
      <g fill="#f2eccb">
        <circle cx="420" cy="200" r="2.6" opacity="0.8" />
        <circle cx="460" cy="320" r="2" opacity="0.6" />
        <circle cx="390" cy="430" r="1.7" opacity="0.7" />
        <circle cx="500" cy="150" r="2.2" opacity="0.5" />
        <circle cx="445" cy="520" r="1.5" opacity="0.6" />
      </g>
    </g>
  );
}

function Lantern({ fx, uid }: { fx: Fx; uid: string }) {
  const sky = `lsky${uid}`;
  const water = `lwat${uid}`;
  const glow = `lglo${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad id={sky} stops={[["0%", "#0d1a30"], ["55%", "#1d3048"], ["100%", "#2c4258"]]} />
        <SkyGrad id={water} stops={[["0%", "#13243a"], ["100%", "#0a1626"]]} />
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#f2a85c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f2a85c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill={`url(#${sky})`} />
      {/* milky way band */}
      <g filter={`url(#${fx.s2})`} opacity="0.3">
        <path d="M-20 40 L 300 -20 L 860 180 L 600 260 Z" fill="#9db3d6" />
      </g>
      <g fill="#f3f0e2">
        <circle cx="90" cy="60" r="1.6" /><circle cx="220" cy="110" r="1.2" />
        <circle cx="340" cy="50" r="1.5" /><circle cx="520" cy="90" r="1.1" />
        <circle cx="640" cy="40" r="1.7" /><circle cx="730" cy="130" r="1.3" />
        <circle cx="430" cy="140" r="1.1" /><circle cx="160" cy="170" r="1.1" />
        <circle cx="280" cy="80" r="0.9" opacity="0.8" /><circle cx="580" cy="150" r="0.9" opacity="0.8" />
      </g>
      {/* moon with halo */}
      <circle cx="660" cy="100" r="48" fill="#f4ecc9" opacity="0.25" filter={`url(#${fx.s2})`} />
      <circle cx="660" cy="100" r="32" fill="#f4ecc9" />
      <circle cx="650" cy="93" r="28" fill="#1d3048" opacity="0.22" />
      <Cloud x={200} y={210} s={0.8} fx={fx} tone="night" distant />
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 300 H 820 V 360 H -20 Z" fill="#0f1d30" />
        <g fill="#1c2d44">
          <rect x="480" y="180" width="180" height="125" rx="6" />
          <rect x="500" y="150" width="140" height="40" rx="8" />
          <rect x="540" y="120" width="60" height="36" rx="6" />
        </g>
        <g fill="#f2b04e">
          <rect x="495" y="200" width="16" height="22" rx="2" />
          <rect x="523" y="200" width="16" height="22" rx="2" />
          <rect x="551" y="200" width="16" height="22" rx="2" />
          <rect x="579" y="200" width="16" height="22" rx="2" />
          <rect x="607" y="200" width="16" height="22" rx="2" />
          <rect x="509" y="240" width="16" height="22" rx="2" opacity="0.9" />
          <rect x="565" y="240" width="16" height="22" rx="2" opacity="0.9" />
          <rect x="621" y="240" width="16" height="22" rx="2" opacity="0.9" />
          <rect x="552" y="128" width="14" height="18" rx="2" opacity="0.95" />
        </g>
        {/* building glow spill */}
        <rect x="480" y="180" width="180" height="130" fill="#f2b04e" opacity="0.18" filter={`url(#${fx.s2})`} />
        <rect y="355" width="800" height="245" fill={`url(#${water})`} />
        <rect x="186" y="240" width="8" height="150" fill="#091322" />
        <rect x="170" y="206" width="40" height="44" rx="8" fill="#22344c" />
        <rect x="178" y="214" width="24" height="28" rx="4" fill="#ffce73" />
      </g>
      {/* lantern bloom */}
      <circle cx="190" cy="228" r="26" fill="#ffe7ae" filter={`url(#${fx.s1})`} opacity="0.9" />
      <circle cx="190" cy="228" r="95" fill={`url(#${glow})`} />
      {/* reflections — blurred streaks */}
      <g strokeLinecap="round" filter={`url(#${fx.s1})`}>
        <path d="M178 400 h 26" stroke="#f2b04e" strokeWidth="5" opacity="0.85" />
        <path d="M184 432 h 16" stroke="#f2b04e" strokeWidth="4" opacity="0.65" />
        <path d="M180 466 h 22" stroke="#e89a3c" strokeWidth="4" opacity="0.45" />
        <path d="M186 510 h 12" stroke="#e89a3c" strokeWidth="3" opacity="0.3" />
        <path d="M520 392 h 30" stroke="#f2b04e" strokeWidth="4" opacity="0.55" />
        <path d="M590 414 h 24" stroke="#f2b04e" strokeWidth="4" opacity="0.45" />
        <path d="M646 450 h 30" stroke="#e8b765" strokeWidth="4" opacity="0.35" />
        <path d="M640 380 h 40" stroke="#f4ecc9" strokeWidth="3" opacity="0.45" />
      </g>
    </g>
  );
}

function Mountain({ fx, uid }: { fx: Fx; uid: string }) {
  const sky = `mtsky${uid}`;
  const lake = `mtlk${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad id={sky} stops={[["0%", "#6ba3c8"], ["55%", "#9cc4da"], ["100%", "#cfe2e2"]]} />
        <SkyGrad id={lake} stops={[["0%", "#6699b5"], ["100%", "#41758f"]]} />
      </defs>
      <rect width="800" height="600" fill={`url(#${sky})`} />
      <Cloud x={200} y={130} s={1.05} fx={fx} />
      <Cloud x={600} y={85} s={0.7} fx={fx} distant />
      <g filter={`url(#${fx.f})`}>
        {/* far ridge — palest */}
        <path d="M-20 330 L 150 142 L 320 330 Z" fill="#8fa5bd" />
        <path d="M150 142 L 118 182 L 140 174 L 152 197 L 172 172 L 186 180 Z" fill="#f4f7f3" />
        {/* hero peak with shadow face */}
        <path d="M220 330 L 430 92 L 650 330 Z" fill="#5c7894" />
        <path d="M430 92 L 650 330 L 430 330 Z" fill="#49627c" />
        <path d="M430 92 L 392 142 L 416 134 L 430 160 L 452 132 L 472 142 Z" fill="#f8faf6" />
        <path d="M430 92 L 472 142 L 452 132 L 430 160 L 430 92 Z" fill="#d8e2e4" />
        {/* near ridge */}
        <path d="M540 330 L 700 162 L 850 330 Z" fill="#74899f" />
        <path d="M700 162 L 672 197 L 690 190 L 700 210 L 716 192 L 730 198 Z" fill="#f4f7f3" />
      </g>
      <Haze y={300} h={50} color="#cfe2e2" o={0.5} fx={fx} />
      <rect y="325" width="800" height="275" fill={`url(#${lake})`} />
      {/* reflection, softened */}
      <g opacity="0.2" filter={`url(#${fx.s1})`}>
        <path d="M220 330 L 430 545 L 650 330 Z" fill="#27415c" />
        <path d="M-20 330 L 150 470 L 320 330 Z" fill="#3a526b" opacity="0.7" />
      </g>
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 430 Q 200 392 440 426 T 820 416 V 620 H -20 Z" fill="#5f8950" />
        <path d="M-20 520 Q 300 474 820 512 V 620 H -20 Z" fill="#4c7340" />
      </g>
      <Flowers seed={97} y0={540} y1={595} colors={["#f3f0e2", "#d9a441", "#cf8295"]} />
      <Birds x={520} y={200} color="#33506b" />
    </g>
  );
}

function Ember({ fx, uid }: { fx: Fx; uid: string }) {
  const room = `eroom${uid}`;
  const glow = `eglo${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad id={room} stops={[["0%", "#1c120c"], ["60%", "#2e1c10"], ["100%", "#46260f"]]} />
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#f2a85c" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f2a85c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill={`url(#${room})`} />
      <circle cx="400" cy="370" r="300" fill={`url(#${glow})`} opacity="0.8" />
      <g filter={`url(#${fx.f})`}>
        {/* logs with lit edges */}
        <rect x="220" y="430" width="360" height="34" rx="17" fill="#1f1208" transform="rotate(-4 400 447)" />
        <rect x="226" y="430" width="348" height="10" rx="5" fill="#7c3d14" opacity="0.8" transform="rotate(-4 400 442)" />
        <rect x="260" y="455" width="300" height="30" rx="15" fill="#170c05" transform="rotate(3 410 470)" />
        <rect x="268" y="455" width="284" height="8" rx="4" fill="#6b3413" opacity="0.7" transform="rotate(3 410 460)" />
      </g>
      {/* flame: blurred body, sharp core */}
      <g filter={`url(#${fx.s1})`}>
        <path d="M400 170 Q 478 262 466 348 Q 458 426 400 446 Q 342 426 334 348 Q 322 262 400 170 Z" fill="#d8581f" opacity="0.9" />
      </g>
      <path d="M400 210 Q 456 286 448 354 Q 442 414 400 430 Q 358 414 352 354 Q 344 286 400 210 Z" fill="#f08a32" />
      <path d="M400 262 Q 436 318 430 366 Q 426 406 400 416 Q 374 406 370 366 Q 364 318 400 262 Z" fill="#ffc163" />
      <path d="M400 318 Q 420 352 416 380 Q 413 402 400 408 Q 387 402 384 380 Q 380 352 400 318 Z" fill="#fff0c4" />
      {/* heat shimmer + embers (bokeh) */}
      <g filter={`url(#${fx.s1})`} fill="#ffce73">
        <circle cx="330" cy="240" r="4" opacity="0.8" />
        <circle cx="475" cy="205" r="3" opacity="0.6" />
        <circle cx="448" cy="148" r="2.6" opacity="0.5" />
        <circle cx="362" cy="168" r="3.4" opacity="0.7" />
        <circle cx="502" cy="298" r="2.6" opacity="0.45" />
        <circle cx="296" cy="330" r="2.2" opacity="0.4" />
      </g>
      {/* stone hearth hinted in shadow */}
      <g fill="#0e0804" opacity="0.85">
        <ellipse cx="120" cy="560" rx="160" ry="70" />
        <ellipse cx="690" cy="570" rx="170" ry="76" />
      </g>
    </g>
  );
}

function Valley({ fx, uid }: { fx: Fx; uid: string }) {
  const sky = `vsky${uid}`;
  return (
    <g>
      <defs>
        <SkyGrad id={sky} stops={[["0%", "#74aac8"], ["60%", "#aacdde"], ["100%", "#d8e8e0"]]} />
      </defs>
      <rect width="800" height="600" fill={`url(#${sky})`} />
      <Cloud x={520} y={85} s={1.05} fx={fx} />
      <Cloud x={140} y={140} s={0.7} fx={fx} distant />
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 280 L 160 112 L 360 280 Z" fill="#8fa2b6" />
        <path d="M260 280 L 480 82 L 720 280 Z" fill="#7a8ea4" />
        <path d="M480 82 L 720 280 L 480 280 Z" fill="#69809a" />
        <path d="M480 82 L 448 124 L 470 116 L 482 140 L 502 114 L 518 124 Z" fill="#f6f8f4" />
      </g>
      <Haze y={252} h={48} color="#d8e8e0" o={0.55} fx={fx} />
      <g filter={`url(#${fx.f})`}>
        <path d="M-20 280 H 820 V 620 H -20 Z" fill="#7da25c" />
        {/* terraces: each tread lit, each riser shaded */}
        <path d="M-20 330 Q 400 300 820 335 V 362 Q 400 332 -20 360 Z" fill="#5f8744" />
        <path d="M-20 326 Q 400 296 820 331 V 338 Q 400 308 -20 334 Z" fill="#94b46a" opacity="0.9" />
        <path d="M-20 400 Q 400 365 820 402 V 432 Q 400 398 -20 430 Z" fill="#52793c" />
        <path d="M-20 396 Q 400 361 820 398 V 406 Q 400 371 -20 404 Z" fill="#8aab62" opacity="0.9" />
        <path d="M-20 475 Q 400 438 820 478 V 510 Q 400 472 -20 506 Z" fill="#476b34" />
        <path d="M-20 471 Q 400 434 820 474 V 482 Q 400 444 -20 478 Z" fill="#7fa05a" opacity="0.9" />
        {/* river with sky reflection + highlight */}
        <path d="M370 280 Q 330 360 400 430 Q 470 500 420 620 L 500 620 Q 540 500 470 420 Q 410 350 450 280 Z" fill="#4f88a8" />
        <path d="M395 300 Q 370 360 425 425 Q 480 490 450 600" stroke="#bcdde8" strokeWidth="6" fill="none" opacity="0.75" />
        <g transform="translate(160 420)">
          <rect x="-26" y="0" width="52" height="34" fill="#dccfae" />
          <rect x="-26" y="0" width="52" height="8" fill="#b9a87f" opacity="0.7" />
          <path d="M-34 2 L 0 -26 L 34 2 Z" fill="#94492a" />
          <path d="M0 -26 L 34 2 L 14 2 Z" fill="#7c3a20" />
          <rect x="-7" y="14" width="14" height="20" fill="#4c3a2a" />
        </g>
      </g>
      <Flowers seed={41} y0={520} y1={595} colors={["#d9a441", "#cf8295", "#f3f0e2"]} />
      <Birds x={600} y={180} color="#4a6378" />
    </g>
  );
}
