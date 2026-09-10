/**
 * Drawn objects in the brand navy, so they read as engravings beside the
 * duotone photographs (docs/BRAND.md §3). Pure markup, no state.
 */
const INK = "#0B1A5C";
const MONO = { fontFamily: "var(--font-plex), monospace" } as const;

function Shade({ id, dir = "h" }: { id: string; dir?: "h" | "v" }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={dir === "h" ? "1" : "0"} y2={dir === "h" ? "0" : "1"}>
      <stop offset="0" stopColor="#B7C5E6" />
      <stop offset="0.28" stopColor="#F8FAFE" />
      <stop offset="0.56" stopColor="#E3EAF7" />
      <stop offset="1" stopColor="#8699CB" />
    </linearGradient>
  );
}

/** A Doric column in three parts, so the shaft can stretch to any height without distorting the capital. */
export function Column() {
  const flutes = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
  return (
    <div className="column-art" aria-hidden="true">
      <svg viewBox="0 0 120 60" className="column-cap">
        <defs><Shade id="col-sh" /></defs>
        <rect x="3" y="3" width="114" height="14" rx="1.5" fill="url(#col-sh)" stroke={INK} strokeOpacity=".55" />
        <path d="M11 17 H109 C105 31 97 39 91 43 H29 C23 39 15 31 11 17 Z" fill="url(#col-sh)" stroke={INK} strokeOpacity=".55" />
        <path d="M22 26 H98" stroke={INK} strokeOpacity=".18" />
        <rect x="25" y="43" width="70" height="6" fill="url(#col-sh)" stroke={INK} strokeOpacity=".45" />
        <rect x="27" y="49" width="66" height="11" fill="url(#col-sh)" stroke={INK} strokeOpacity=".35" />
      </svg>
      <svg viewBox="0 0 120 400" preserveAspectRatio="none" className="column-shaft">
        <rect x="27" y="0" width="66" height="400" fill="url(#col-sh)" />
        {flutes.map((f) => (
          <line key={f} x1={27 + 66 * f} y1="0" x2={27 + 66 * f} y2="400" stroke={INK} strokeOpacity={0.1 + f * 0.22} vectorEffect="non-scaling-stroke" />
        ))}
        {[0.9, 0.93, 0.96].map((f) => (
          <line key={f} x1={27 + 66 * f} y1="0" x2={27 + 66 * f} y2="400" stroke={INK} strokeOpacity=".22" strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1="27" y1="0" x2="27" y2="400" stroke={INK} strokeOpacity=".5" vectorEffect="non-scaling-stroke" />
        <line x1="93" y1="0" x2="93" y2="400" stroke={INK} strokeOpacity=".6" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox="0 0 120 40" className="column-base">
        <rect x="23" y="0" width="74" height="8" rx="4" fill="url(#col-sh)" stroke={INK} strokeOpacity=".45" />
        <rect x="17" y="8" width="86" height="10" rx="5" fill="url(#col-sh)" stroke={INK} strokeOpacity=".5" />
        <rect x="7" y="18" width="106" height="20" rx="1.5" fill="url(#col-sh)" stroke={INK} strokeOpacity=".55" />
      </svg>
    </div>
  );
}

/**
 * The price against the verdict. The beam and pans move together (globals.css
 * .beam / .pan-l / .pan-r): the pans only translate, so the chains stay plumb.
 */
export function Scales({ price = "0.001 USDC", verdict = "VERIFIED" }: { price?: string; verdict?: string }) {
  const chain = { stroke: INK, strokeOpacity: 0.55, strokeDasharray: "3 2.2", strokeWidth: 1.2 } as const;
  const pan = (cx: number) => `M${cx - 68} 300 H${cx + 68} Q${cx + 60} 348 ${cx} 352 Q${cx - 60} 348 ${cx - 68} 300 Z`;
  return (
    <svg viewBox="0 0 520 470" className="scales" role="img" aria-label={`Scales: ${price} on one pan, ${verdict} on the other`}>
      <defs>
        <Shade id="sc-h" />
        <Shade id="sc-v" dir="v" />
        <pattern id="sc-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={INK} strokeOpacity=".22" strokeWidth="1" />
        </pattern>
      </defs>
      {/* pedestal */}
      <ellipse cx="260" cy="452" rx="150" ry="10" fill={INK} opacity=".08" />
      <path d="M186 448 H334 L318 428 H202 Z" fill="url(#sc-v)" stroke={INK} strokeOpacity=".6" />
      <path d="M186 448 H334 L318 428 H202 Z" fill="url(#sc-hatch)" />
      <rect x="210" y="410" width="100" height="18" rx="2" fill="url(#sc-h)" stroke={INK} strokeOpacity=".6" />
      <rect x="251" y="126" width="18" height="286" rx="3" fill="url(#sc-h)" stroke={INK} strokeOpacity=".6" />
      <rect x="244" y="206" width="32" height="9" rx="4.5" fill="url(#sc-h)" stroke={INK} strokeOpacity=".55" />
      <rect x="244" y="318" width="32" height="9" rx="4.5" fill="url(#sc-h)" stroke={INK} strokeOpacity=".55" />
      <path d="M252 108 H268 L265 128 H255 Z" fill="url(#sc-h)" stroke={INK} strokeOpacity=".6" />
      <circle cx="260" cy="98" r="10" fill="url(#sc-h)" stroke={INK} strokeOpacity=".6" />

      {/* left pan: the price */}
      <g className="pan-l">
        <line x1="70" y1="122" x2="6" y2="300" {...chain} />
        <line x1="70" y1="122" x2="134" y2="300" {...chain} />
        <line x1="70" y1="122" x2="70" y2="298" {...chain} strokeOpacity={0.3} />
        <ellipse cx="70" cy="288" rx="32" ry="6" fill="url(#sc-h)" stroke={INK} strokeOpacity=".55" />
        <ellipse cx="70" cy="281" rx="32" ry="6" fill="url(#sc-h)" stroke={INK} strokeOpacity=".55" />
        <ellipse cx="70" cy="274" rx="32" ry="6" fill="url(#sc-h)" stroke={INK} strokeOpacity=".55" />
        <path d={pan(70)} fill="url(#sc-v)" stroke={INK} strokeOpacity=".65" />
        <path d={pan(70)} fill="url(#sc-hatch)" opacity=".7" />
        <ellipse cx="70" cy="300" rx="68" ry="6" fill="#F4F7FC" stroke={INK} strokeOpacity=".6" />
        <g transform="translate(70 324)">
          <rect x="-56" y="-14" width="112" height="28" rx="6" fill={INK} />
          <text textAnchor="middle" dy="4.5" fill="#fff" fontSize="12.5" fontWeight="500" style={MONO}>{price}</text>
        </g>
      </g>

      {/* right pan: the verdict, carved */}
      <g className="pan-r">
        <line x1="450" y1="122" x2="386" y2="300" {...chain} />
        <line x1="450" y1="122" x2="514" y2="300" {...chain} />
        <line x1="450" y1="122" x2="450" y2="298" {...chain} strokeOpacity={0.3} />
        <rect x="414" y="258" width="72" height="38" rx="3" fill="url(#sc-h)" stroke={INK} strokeOpacity=".55" />
        <path d="M420 268 L436 262 M458 290 L476 280" stroke={INK} strokeOpacity=".18" />
        <path d={pan(450)} fill="url(#sc-v)" stroke={INK} strokeOpacity=".65" />
        <path d={pan(450)} fill="url(#sc-hatch)" opacity=".7" />
        <ellipse cx="450" cy="300" rx="68" ry="6" fill="#F4F7FC" stroke={INK} strokeOpacity=".6" />
        <g transform="translate(450 324)">
          <rect x="-54" y="-14" width="108" height="28" rx="6" fill={INK} />
          <circle cx="-38" cy="0" r="4" fill="#22B573" />
          <text x="6" textAnchor="middle" dy="4.5" fill="#fff" fontSize="12.5" fontWeight="500" style={MONO}>{verdict}</text>
        </g>
      </g>

      {/* the beam, over the chains */}
      <g className="beam">
        <path d="M257 118 L260 66 L263 118 Z" fill={INK} opacity=".75" />
        <rect x="66" y="114" width="388" height="8" rx="4" fill="url(#sc-v)" stroke={INK} strokeOpacity=".65" />
        <path d="M110 118 Q185 104 248 116 M272 116 Q335 104 410 118" fill="none" stroke={INK} strokeOpacity=".3" />
        <circle cx="70" cy="118" r="7" fill="url(#sc-h)" stroke={INK} strokeOpacity=".65" />
        <circle cx="450" cy="118" r="7" fill="url(#sc-h)" stroke={INK} strokeOpacity=".65" />
        <circle cx="260" cy="118" r="12" fill="url(#sc-h)" stroke={INK} strokeOpacity=".7" />
        <circle cx="260" cy="118" r="3.5" fill={INK} />
      </g>
    </svg>
  );
}

/** A wax seal with the mark pressed into it. The edge is irregular on purpose; the points are fixed so it renders the same every time. */
export function Seal({ className }: { className?: string }) {
  const edge = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const r = 46 + [1.8, -0.6, 0.9, -1.4, 0.4][i % 5]!;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="seal-wax" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#4A6EF2" />
          <stop offset="0.5" stopColor="#1F3FC4" />
          <stop offset="1" stopColor="#0B1A5C" />
        </radialGradient>
        <radialGradient id="seal-press" cx="0.6" cy="0.65" r="0.7">
          <stop offset="0" stopColor="#2448D8" />
          <stop offset="1" stopColor="#12268F" />
        </radialGradient>
      </defs>
      <polygon points={edge} fill="url(#seal-wax)" />
      <circle cx="50" cy="50" r="33" fill="url(#seal-press)" stroke="#fff" strokeOpacity=".28" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="29" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="1" />
      <g transform="translate(32 32) scale(1.5)" fill="none" stroke="#DCE6FF" strokeOpacity=".92" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" /><path d="M4 7h16" /><path d="M6 7l-3 7a3 3 0 0 0 6 0L6 7z" /><path d="M18 7l-3 7a3 3 0 0 0 6 0l-3-7z" /><path d="M8 21h8" />
      </g>
    </svg>
  );
}

/** The arrow used on every primary action. */
export function Arrow({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" /><path d="M8 7h9v9" />
    </svg>
  );
}

/** The mark: a balance. Drawn in currentColor so it takes the colour of whatever carries it. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18" /><path d="M4 7h16" /><path d="M6 7l-3 7a3 3 0 0 0 6 0L6 7z" /><path d="M18 7l-3 7a3 3 0 0 0 6 0l-3-7z" /><path d="M8 21h8" />
    </svg>
  );
}
