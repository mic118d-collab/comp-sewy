import fs from 'node:fs';
import path from 'node:path';

const OUT_ROOT = path.resolve('public/assets/rff');
const LEAGUES_DIR = path.join(OUT_ROOT, 'leagues');
const CLUBS_DIR = path.join(OUT_ROOT, 'clubs');

fs.mkdirSync(LEAGUES_DIR, { recursive: true });
fs.mkdirSync(CLUBS_DIR, { recursive: true });

// Remove retired Spanish league & club SVGs so zero Spanish division assets remain
const RETIRED_LEAGUE_SVGS = ['primera-division-espanola.svg'];
const RETIRED_CLUB_SVGS = [
  'murcia-sad.svg',
  'cf-lugo.svg',
  'tarragona-cf.svg',
  'valladolid-sd.svg',
  'atletico-gijon.svg',
  'cd-huelvo.svg',
  'hortaleza-fc.svg',
  'cd-zaragoza.svg',
];

for (const file of RETIRED_LEAGUE_SVGS) {
  const target = path.join(LEAGUES_DIR, file);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
for (const file of RETIRED_CLUB_SVGS) {
  const target = path.join(CLUBS_DIR, file);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function soccerBallSvg(cx, cy, r, strokeColor = '#0a0f1d', fillColor = '#ffffff', panelColor = '#0a0f1d') {
  const pentR = r * 0.36;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * pentR).toFixed(1)},${(cy + Math.sin(a) * pentR).toFixed(1)}`);
  }
  const spokes = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const x1 = cx + Math.cos(a) * pentR;
    const y1 = cy + Math.sin(a) * pentR;
    const x2 = cx + Math.cos(a) * (r * 0.92);
    const y2 = cy + Math.sin(a) * (r * 0.92);
    spokes.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${panelColor}" stroke-width="${Math.max(2, r * 0.085).toFixed(1)}" stroke-linecap="round" />`
    );
  }
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${Math.max(3, r * 0.11).toFixed(1)}" />
      ${spokes.join('')}
      <polygon points="${pts.join(' ')}" fill="${panelColor}" />
      <circle cx="${(cx - r * 0.26).toFixed(1)}" cy="${(cy - r * 0.26).toFixed(1)}" r="${(r * 0.18).toFixed(1)}" fill="#ffffff" fill-opacity="0.35" />
    </g>
  `;
}

// 4K (2048x2048) Circular Broadcast Crest Builder
function circleClubBadge4K({
  id,
  ringBgStart,
  ringBgEnd,
  ringStrokeStart,
  ringStrokeEnd,
  innerBgStart,
  innerBgEnd,
  topText,
  botText,
  textColor = '#ffffff',
  botTextColor = '#facc15',
  centerArt,
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="2048" height="2048" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="${id}-ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${ringBgStart}" />
      <stop offset="100%" stop-color="${ringBgEnd}" />
    </linearGradient>
    <linearGradient id="${id}-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${ringStrokeStart}" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.92" />
      <stop offset="100%" stop-color="${ringStrokeEnd}" />
    </linearGradient>
    <radialGradient id="${id}-core" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${innerBgStart}" />
      <stop offset="100%" stop-color="${innerBgEnd}" />
    </radialGradient>
    <path id="${id}-t" d="M 70,256 A 186,186 0 1,1 442,256" />
    <path id="${id}-b" d="M 434,274 A 180,180 0 0,1 78,274" />
    <clipPath id="${id}-c">
      <circle cx="256" cy="256" r="144" />
    </clipPath>
  </defs>
  <!-- Outer Metallic Bezel + Enamel Ring -->
  <circle cx="256" cy="256" r="245" fill="url(#${id}-ring)" stroke="url(#${id}-rim)" stroke-width="12" />
  <circle cx="256" cy="256" r="231" fill="none" stroke="${ringStrokeStart}" stroke-opacity="0.45" stroke-width="2.5" />
  <circle cx="256" cy="256" r="154" fill="none" stroke="${ringStrokeStart}" stroke-opacity="0.3" stroke-width="2" />

  <!-- Core Heraldry Field -->
  <g clip-path="url(#${id}-c)">
    <circle cx="256" cy="256" r="144" fill="url(#${id}-core)" />
    ${centerArt}
    <!-- Split-Half Studio Specular Sheen -->
    <path d="M256,112 A144,144 0 0,1 256,400 Z" fill="#ffffff" fill-opacity="0.065" />
  </g>
  <circle cx="256" cy="256" r="144" fill="none" stroke="url(#${id}-rim)" stroke-width="8" />

  <!-- Side Heraldic Stars -->
  <circle cx="52" cy="256" r="5" fill="${botTextColor}" />
  <circle cx="460" cy="256" r="5" fill="${botTextColor}" />

  <!-- Crisp Circular Typography -->
  <text fill="${textColor}" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="${topText.length > 26 ? '18' : topText.length > 20 ? '20.5' : '23.5'}" font-weight="900" letter-spacing="2.2">
    <textPath href="#${id}-t" startOffset="50%" text-anchor="middle">${esc(topText)}</textPath>
  </text>
  <text fill="${botTextColor}" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="19.5" font-weight="800" letter-spacing="3.5">
    <textPath href="#${id}-b" startOffset="50%" text-anchor="middle">${esc(botText)}</textPath>
  </text>
</svg>`;
}

// 4K (2048x2048) Classic Heraldic Shield Builder (matching R.C. Palmont & RFF elite style)
function shieldClubBadge4K({
  id,
  shieldFillStart,
  shieldFillEnd,
  borderStrokeStart,
  borderStrokeEnd,
  bannerBgStart,
  bannerBgEnd,
  bannerText,
  bannerTextColor = '#ffffff',
  innerArt,
}) {
  const topY = 42;
  const shieldPath = `M 76,${topY + 26} Q 256,${topY - 24} 436,${topY + 26} V 268 C 436,380 256,484 256,484 C 256,484 76,380 76,268 Z`;
  const innerBevelPath = `M 90,${topY + 34} Q 256,${topY - 10} 422,${topY + 34} V 266 C 422,368 256,466 256,466 C 256,466 90,368 90,266 Z`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="2048" height="2048" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="${id}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${shieldFillStart}" />
      <stop offset="100%" stop-color="${shieldFillEnd}" />
    </linearGradient>
    <linearGradient id="${id}-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${borderStrokeStart}" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${borderStrokeEnd}" />
    </linearGradient>
    <linearGradient id="${id}-ban" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${bannerBgStart}" />
      <stop offset="50%" stop-color="${bannerBgEnd}" />
      <stop offset="100%" stop-color="${bannerBgStart}" />
    </linearGradient>
    <clipPath id="${id}-sc">
      <path d="${shieldPath}" />
    </clipPath>
  </defs>
  <g clip-path="url(#${id}-sc)">
    <rect x="60" y="16" width="392" height="480" fill="url(#${id}-bg)" />
    ${innerArt}
    <!-- Curved Enamel Banner Ribbon -->
    <path d="M 56,306 Q 256,282 456,306 L 456,374 Q 256,350 56,374 Z" fill="url(#${id}-ban)" stroke="${borderStrokeStart}" stroke-width="4" />
    <text x="256" y="349" text-anchor="middle" fill="${bannerTextColor}" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="${bannerText.length > 15 ? '25' : bannerText.length > 11 ? '30' : '35'}" font-weight="900" letter-spacing="2.2">${esc(bannerText)}</text>
    <!-- Split-Half Studio Specular Highlight -->
    <rect x="256" y="16" width="200" height="480" fill="#ffffff" fill-opacity="0.065" />
  </g>
  <path d="${innerBevelPath}" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="3" stroke-linejoin="round" />
  <path d="${shieldPath}" fill="none" stroke="url(#${id}-rim)" stroke-width="12" stroke-linejoin="round" />
</svg>`;
}

// 1. 4K Ligue La Premiere Official Division Emblem
function buildLigueLaPremiere4K() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="2048" height="2048" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="llp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1d42" />
      <stop offset="55%" stop-color="#081229" />
      <stop offset="100%" stop-color="#172554" />
    </linearGradient>
    <linearGradient id="llp-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="45%" stop-color="#e11d48" />
      <stop offset="100%" stop-color="#9f1239" />
    </linearGradient>
    <linearGradient id="llp-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#ca8a04" />
    </linearGradient>
    <path id="llp-top" d="M 68,256 A 188,188 0 1,1 444,256" />
    <path id="llp-bot" d="M 434,274 A 180,180 0 0,1 78,274" />
  </defs>
  <!-- 4K Outer Medallion -->
  <circle cx="256" cy="256" r="245" fill="url(#llp-bg)" stroke="url(#llp-rim)" stroke-width="13" />
  <circle cx="256" cy="256" r="229" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3" />
  <circle cx="256" cy="256" r="149" fill="#0d2149" stroke="url(#llp-gold)" stroke-width="7" />

  <!-- Tricolor Subtle Vertical Ribbons Inside Medallion -->
  <clipPath id="llp-shield-clip">
    <path d="M180,140 H332 V254 C332,318 256,368 256,368 C256,368 180,318 180,254 Z" />
  </clipPath>
  <g clip-path="url(#llp-shield-clip)">
    <rect x="180" y="140" width="51" height="232" fill="#1d4ed8" />
    <rect x="231" y="140" width="50" height="232" fill="#0f172a" />
    <rect x="281" y="140" width="51" height="232" fill="#be123c" />
    <rect x="256" y="140" width="76" height="232" fill="#ffffff" fill-opacity="0.08" />
  </g>
  <path d="M180,140 H332 V254 C332,318 256,368 256,368 C256,368 180,318 180,254 Z" fill="none" stroke="#ffffff" stroke-width="6.5" stroke-linejoin="round" />

  <!-- Crowned Championship Star + Gallic Rooster Crest -->
  <polygon points="256,114 262,127 276,128 265,137 269,150 256,143 243,150 247,137 236,128 250,127" fill="url(#llp-gold)" />
  <path d="M250,164 C266,154 286,164 286,182 C298,180 304,193 293,204 L308,211 L290,220 C290,246 273,266 248,270 L260,294 H235 L242,270 C218,266 205,244 212,218 C221,233 238,231 244,216 C237,198 239,175 250,164 Z" fill="url(#llp-gold)" stroke="#081229" stroke-width="3.5" stroke-linejoin="round" />
  ${soccerBallSvg(256, 324, 24, '#081229', '#ffffff', '#0b1d42')}

  <!-- Ring Text -->
  <text fill="#ffffff" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="24.5" font-weight="900" letter-spacing="3.6">
    <textPath href="#llp-top" startOffset="50%" text-anchor="middle">LIGUE LA PREMIERE</textPath>
  </text>
  <text fill="#fda4af" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="19.5" font-weight="800" letter-spacing="4.2">
    <textPath href="#llp-bot" startOffset="50%" text-anchor="middle">★  DIVISION ÉLITE · RFF  ★</textPath>
  </text>
</svg>`;
  fs.writeFileSync(path.join(LEAGUES_DIR, 'ligue-la-premiere.svg'), svg, 'utf-8');
}

// 2. 4K French Division Club Crests (R.C. Palmont uses authentic uploaded /assets/aistudio/image_e34c12dc.png)
function buildFrenchClubCrests4K() {
  const clubs = {
    'as-montsaveur.svg': circleClubBadge4K({
      id: 'asm',
      ringBgStart: '#065f46',
      ringBgEnd: '#022c22',
      ringStrokeStart: '#34d399',
      ringStrokeEnd: '#059669',
      innerBgStart: '#0f172a',
      innerBgEnd: '#020617',
      topText: 'ASSOCIATION SPORTIVE MONTSAVEUR',
      botText: '★  A.S. MONTSAVEUR  ★',
      botTextColor: '#6ee7b7',
      centerArt: `
        <polygon points="134,344 224,158 308,344" fill="#059669" />
        <polygon points="224,158 258,228 228,242 204,218" fill="#a7f3d0" fill-opacity="0.85" />
        <polygon points="204,344 288,180 378,344" fill="#10b981" />
        <polygon points="288,180 318,238 292,248 272,226" fill="#ecfdf5" fill-opacity="0.85" />
        <text x="256" y="308" text-anchor="middle" fill="#ffffff" stroke="#022c22" stroke-width="5" paint-order="stroke" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="78" font-weight="900" letter-spacing="-2">ASM</text>
      `,
    }),

    'saint-roche.svg': circleClubBadge4K({
      id: 'str',
      ringBgStart: '#991b1b',
      ringBgEnd: '#450a0a',
      ringStrokeStart: '#22d3ee',
      ringStrokeEnd: '#0284c7',
      innerBgStart: '#0f172a',
      innerBgEnd: '#082f49',
      topText: 'FOOTBALL CLUB SAINT-ROCHE',
      botText: '★  SAINT-ROCHE · 1924  ★',
      botTextColor: '#67e8f9',
      centerArt: `
        <!-- Maritime Frigate & Waves -->
        <line x1="256" y1="132" x2="256" y2="286" stroke="#ffffff" stroke-width="7" stroke-linecap="round" />
        <polygon points="256,132 292,144 256,154" fill="#ef4444" />
        <path d="M262,152 C308,176 336,216 340,258 H262 Z" fill="#ffffff" />
        <path d="M248,166 C212,188 188,220 182,258 H248 Z" fill="#22d3ee" />
        <path d="M164,272 H348 L318,320 H194 Z" fill="#991b1b" stroke="#ffffff" stroke-width="5.5" stroke-linejoin="round" />
        <path d="M124,344 Q190,322 256,344 T388,344" fill="none" stroke="#22d3ee" stroke-width="11" stroke-linecap="round" />
        <path d="M138,366 Q198,348 256,366 T374,366" fill="none" stroke="#38bdf8" stroke-opacity="0.65" stroke-width="7" stroke-linecap="round" />
      `,
    }),

    'us-verdelac.svg': shieldClubBadge4K({
      id: 'usv',
      shieldFillStart: '#1d4ed8',
      shieldFillEnd: '#172554',
      borderStrokeStart: '#fef08a',
      borderStrokeEnd: '#ca8a04',
      bannerBgStart: '#eab308',
      bannerBgEnd: '#fde047',
      bannerText: 'U.S. VERDELAC',
      bannerTextColor: '#172554',
      innerArt: `
        <!-- Alpine Lake & Twin Golden Pines -->
        <path d="M76,220 Q166,196 256,220 T436,220 V315 H76 Z" fill="#0284c7" fill-opacity="0.45" />
        <polygon points="200,82 250,168 150,168" fill="#facc15" />
        <polygon points="200,132 262,232 138,232" fill="#eab308" />
        <rect x="189" y="232" width="22" height="44" rx="3" fill="#fef08a" />
        <polygon points="314,96 360,178 268,178" fill="#fde047" />
        <polygon points="314,144 370,238 258,238" fill="#facc15" />
        <rect x="303" y="238" width="22" height="38" rx="3" fill="#fef08a" />
        ${soccerBallSvg(256, 418, 29, '#facc15', '#ffffff', '#172554')}
      `,
    }),

    'fc-porteclaire.svg': circleClubBadge4K({
      id: 'fcp',
      ringBgStart: '#0f172a',
      ringBgEnd: '#020617',
      ringStrokeStart: '#7dd3fc',
      ringStrokeEnd: '#0284c7',
      innerBgStart: '#1e293b',
      innerBgEnd: '#090d16',
      topText: 'FOOTBALL CLUB PORTECLAIRE',
      botText: '★  F.C. PORTECLAIRE  ★',
      botTextColor: '#7dd3fc',
      centerArt: `
        <!-- Lighthouse Beacon Rays + Monogram -->
        <polygon points="256,158 128,118 156,96" fill="#38bdf8" fill-opacity="0.28" />
        <polygon points="256,158 384,118 356,96" fill="#38bdf8" fill-opacity="0.28" />
        <circle cx="256" cy="256" r="112" fill="none" stroke="#38bdf8" stroke-width="5.5" />
        <circle cx="256" cy="256" r="98" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2" />
        <text x="256" y="294" text-anchor="middle" fill="#ffffff" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="104" font-weight="900" letter-spacing="-4">FCP</text>
      `,
    }),

    'athletique-beaumont.svg': shieldClubBadge4K({
      id: 'abm',
      shieldFillStart: '#1d4ed8',
      shieldFillEnd: '#1e3a8a',
      borderStrokeStart: '#fef08a',
      borderStrokeEnd: '#ca8a04',
      bannerBgStart: '#be123c',
      bannerBgEnd: '#e11d48',
      bannerText: 'ATH. BEAUMONT',
      innerArt: `
        <!-- Royal Gold & Cobalt Vertical Stripes -->
        <rect x="116" y="24" width="54" height="460" fill="#facc15" />
        <rect x="228" y="24" width="56" height="460" fill="#facc15" />
        <rect x="340" y="24" width="54" height="460" fill="#facc15" />
        <circle cx="256" cy="182" r="64" fill="#0f172a" stroke="#ffffff" stroke-width="7" />
        <circle cx="256" cy="182" r="54" fill="none" stroke="#facc15" stroke-width="2.5" />
        <text x="256" y="203" text-anchor="middle" fill="#facc15" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="56" font-weight="900">AB</text>
        ${soccerBallSvg(256, 420, 27, '#facc15', '#ffffff', '#0f172a')}
      `,
    }),

    'rc-lorient.svg': shieldClubBadge4K({
      id: 'rcl',
      shieldFillStart: '#0f172a',
      shieldFillEnd: '#020617',
      borderStrokeStart: '#7dd3fc',
      borderStrokeEnd: '#0284c7',
      bannerBgStart: '#ea580c',
      bannerBgEnd: '#f97316',
      bannerText: 'R.C. LORIENT',
      innerArt: `
        <!-- Breton Diamond Sash + Atlantic Sea Bird Crest -->
        <polygon points="76,84 436,224 436,274 76,134" fill="#f97316" fill-opacity="0.3" />
        <ellipse cx="246" cy="188" rx="54" ry="70" fill="#1e293b" stroke="#ffffff" stroke-width="6" />
        <ellipse cx="262" cy="190" rx="33" ry="47" fill="#ffffff" />
        <polygon points="286,158 348,180 286,202" fill="#f97316" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
        <circle cx="268" cy="172" r="6.5" fill="#0f172a" />
        ${soccerBallSvg(256, 418, 28, '#38bdf8', '#ffffff', '#0f172a')}
      `,
    }),

    'sc-clairmont.svg': shieldClubBadge4K({
      id: 'scc',
      shieldFillStart: '#111827',
      shieldFillEnd: '#030712',
      borderStrokeStart: '#fde047',
      borderStrokeEnd: '#ca8a04',
      bannerBgStart: '#b91c1c',
      bannerBgEnd: '#ef4444',
      bannerText: 'S.C. CLAIRMONT',
      innerArt: `
        <!-- Quartered Heraldic Arms -->
        <rect x="76" y="34" width="180" height="142" fill="#eab308" />
        <rect x="256" y="34" width="180" height="142" fill="#111827" />
        <rect x="76" y="176" width="180" height="142" fill="#f8fafc" />
        <rect x="256" y="176" width="180" height="142" fill="#dc2626" />
        <circle cx="256" cy="178" r="68" fill="#0f172a" stroke="#eab308" stroke-width="7" />
        <circle cx="256" cy="178" r="57" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2.5" />
        <text x="256" y="201" text-anchor="middle" fill="#ffffff" font-family="'Arial Black', 'Plus Jakarta Sans', sans-serif" font-size="56" font-weight="900">SCC</text>
        ${soccerBallSvg(256, 420, 27, '#eab308', '#ffffff', '#111827')}
      `,
    }),
  };

  for (const [filename, content] of Object.entries(clubs)) {
    fs.writeFileSync(path.join(CLUBS_DIR, filename), content, 'utf-8');
  }
}

buildLigueLaPremiere4K();
buildFrenchClubCrests4K();
console.log('Generated 4K (2048x2048) Ligue La Premiere & 7 French club crests and cleaned retired Spanish SVGs.');
