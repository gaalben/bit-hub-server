// bit:hub — piktogramok.
//
// Minden ikon BEÁGYAZOTT SVG: nincs betűtípus-készlet, nincs CDN, nincs
// külső kérés. Offline is megjelenik, és az ELTE-tárhelyen sem tud eltörni.
//
// Az ikonok a szín öröklését használják (currentColor), így a csempe
// állapota (be/ki, néma) a CSS-ből vezérli a színt.
//
// Az aktuátorok ikonja NEM statikus: az ÁLLAPOTOT rajzolja le. Egy kisiskolás
// a lámpa színéből és a motor forgásából ért, nem a "1" számból.

const wrap = (body, extra = "") =>
    `<svg viewBox="0 0 48 48" class="icon" ${extra} aria-hidden="true">${body}</svg>`;

// --- szenzorok ------------------------------------------------------------

const SENSOR_ICONS = {
    // hőmérő, higanyszállal
    tmp: `<path d="M24 6a5 5 0 0 0-5 5v17a9 9 0 1 0 10 0V11a5 5 0 0 0-5-5z"
             fill="none" stroke="currentColor" stroke-width="3"/>
          <circle cx="24" cy="35" r="5" fill="currentColor"/>
          <rect x="22" y="16" width="4" height="16" rx="2" fill="currentColor"/>`,

    // nap / fény
    lgt: `<circle cx="24" cy="24" r="8" fill="currentColor"/>
          <g stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <path d="M24 4v6M24 38v6M4 24h6M38 24h6
                     M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/>
          </g>`,

    // vízcsepp
    hum: `<path d="M24 6s12 14 12 21a12 12 0 0 1-24 0c0-7 12-21 12-21z"
             fill="none" stroke="currentColor" stroke-width="3"/>
          <path d="M18 28a6 6 0 0 0 6 6" fill="none" stroke="currentColor"
             stroke-width="3" stroke-linecap="round"/>`,

    // palánta a földben
    soi: `<path d="M24 34V20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M24 22c0-5-4-8-8-8 0 5 3 8 8 8zM24 26c0-5 4-9 9-9 0 6-4 9-9 9z"
             fill="currentColor"/>
          <path d="M8 36h32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M12 41h8M24 41h12" stroke="currentColor" stroke-width="3"
             stroke-linecap="round" opacity="0.5"/>`,

    // távolság: nyíl két fal között
    dst: `<path d="M8 12v24M40 12v24" stroke="currentColor" stroke-width="3"
             stroke-linecap="round"/>
          <path d="M14 24h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M14 24l5-5M14 24l5 5M34 24l-5-5M34 24l-5 5"
             stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>`,

    // hang: hangszóró hullámokkal
    snd: `<path d="M10 19h7l9-7v24l-9-7h-7z" fill="currentColor"/>
          <path d="M31 18a9 9 0 0 1 0 12M36 13a16 16 0 0 1 0 22"
             fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,

    // gyorsulás: mozgó test
    acc: `<circle cx="30" cy="24" r="7" fill="currentColor"/>
          <path d="M6 18h12M4 24h10M6 30h12" stroke="currentColor"
             stroke-width="3" stroke-linecap="round"/>`,

    // nyomógomb
    btn: `<rect x="8" y="26" width="32" height="12" rx="4"
             fill="none" stroke="currentColor" stroke-width="3"/>
          <rect x="16" y="14" width="16" height="12" rx="4" fill="currentColor"/>`,

    // potméter: tekerőgomb
    pot: `<circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" stroke-width="3"/>
          <path d="M24 24l7-7" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          <circle cx="24" cy="24" r="3" fill="currentColor"/>`,

    oth: `<circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" stroke-width="3"/>
          <path d="M24 30v-3c0-3 4-3 4-7a4 4 0 0 0-8 0" fill="none"
             stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <circle cx="24" cy="35" r="2" fill="currentColor"/>`
};

export function sensorIcon(type) {
    return wrap(SENSOR_ICONS[type] || SENSOR_ICONS.oth);
}

// --- aktuátorok: az ÁLLAPOTOT rajzoljuk ----------------------------------

/** Közlekedési lámpa: 0 = sötét, 1 = piros, 2 = sárga, 3 = zöld. */
function trafficLight(value) {
    const v = Math.round(value || 0);
    const lamp = (cy, on, color) => `
        <circle cx="24" cy="${cy}" r="5.4"
            fill="${on ? color : "#2b3440"}"
            ${on ? `filter="url(#glow)"` : ""}/>`;
    return wrap(`
        <defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <rect x="12" y="4" width="24" height="40" rx="6" fill="#1c2530"/>
        ${lamp(14, v === 1, "#e3453c")}
        ${lamp(24, v === 2, "#f0b429")}
        ${lamp(34, v === 3, "#37b45e")}
    `, 'class="icon icon-wide"');
}

/** Motor: forgó lapát, a sebesség a fordulatszámmal látszik. */
function motor(value) {
    const on = value > 0;
    // 0-1023 → 0.35-2 mp körülfordulás; a lassú motor lassan forog.
    const dur = on ? Math.max(0.35, 2 - (Math.min(value, 1023) / 1023) * 1.65) : 0;
    const spin = on
        ? `<animateTransform attributeName="transform" type="rotate"
              from="0 24 24" to="360 24 24" dur="${dur.toFixed(2)}s"
              repeatCount="indefinite"/>`
        : "";
    return wrap(`
        <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor"
            stroke-width="3" opacity="0.35"/>
        <g>${spin}
          <path d="M24 24c0-8 3-11 7-9s2 9-7 9zM24 24c8 0 11 3 9 7s-9 2-9-7z
                   M24 24c0 8-3 11-7 9s-2-9 7-9zM24 24c-8 0-11-3-9-7s9-2 9 7z"
             fill="currentColor"/>
        </g>
        <circle cx="24" cy="24" r="3.5" fill="currentColor"/>
    `);
}

/** Pumpa: vízcseppek folynak, ha jár. */
function pump(value) {
    const on = value > 0;
    const drops = on ? `
        <g fill="currentColor">
          <circle cx="24" cy="32" r="2.4">
            <animate attributeName="cy" from="30" to="44" dur="0.9s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="1" to="0" dur="0.9s" repeatCount="indefinite"/>
          </circle>
          <circle cx="24" cy="32" r="2.4">
            <animate attributeName="cy" from="30" to="44" dur="0.9s" begin="0.45s"
                repeatCount="indefinite"/>
            <animate attributeName="opacity" from="1" to="0" dur="0.9s" begin="0.45s"
                repeatCount="indefinite"/>
          </circle>
        </g>` : "";
    return wrap(`
        <rect x="10" y="8" width="28" height="20" rx="5" fill="none"
            stroke="currentColor" stroke-width="3"/>
        <circle cx="24" cy="18" r="5" fill="currentColor" opacity="${on ? 1 : 0.35}"/>
        <path d="M24 28v3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        ${drops}
    `);
}

/** Relé: billenőkapcsoló, ami tényleg átbillen. */
function relay(value) {
    const on = value > 0;
    return wrap(`
        <rect x="6" y="16" width="36" height="16" rx="8" fill="none"
            stroke="currentColor" stroke-width="3"/>
        <circle cx="${on ? 34 : 14}" cy="24" r="5.5" fill="currentColor"/>
    `);
}

/** LED: világít vagy sem. */
function led(value) {
    const on = value > 0;
    return wrap(`
        <path d="M24 8a11 11 0 0 0-6 20v4h12v-4a11 11 0 0 0-6-20z"
            fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="3"/>
        <path d="M19 38h10M21 42h6" stroke="currentColor" stroke-width="3"
            stroke-linecap="round"/>
        ${on ? `<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                   opacity="0.7">
                  <path d="M8 12l4 3M40 12l-4 3M6 24h4M38 24h4"/>
                </g>` : ""}
    `);
}

/** Szervo: a mutató a szöghöz áll (0-180 fok). */
function servo(value) {
    const angle = Math.max(0, Math.min(180, value || 0));
    const rad = (180 - angle) * Math.PI / 180;
    const x = 24 + Math.cos(rad) * 15;
    const y = 32 - Math.sin(rad) * 15;
    return wrap(`
        <path d="M6 32a18 18 0 0 1 36 0" fill="none" stroke="currentColor"
            stroke-width="3" opacity="0.35"/>
        <path d="M24 32L${x.toFixed(1)} ${y.toFixed(1)}" stroke="currentColor"
            stroke-width="4" stroke-linecap="round"/>
        <circle cx="24" cy="32" r="4" fill="currentColor"/>
    `);
}

/** Zsongor: hanghullámok, ha szól. */
function buzzer(value) {
    const on = value > 0;
    return wrap(`
        <path d="M10 19h7l9-7v24l-9-7h-7z" fill="currentColor"/>
        ${on ? `<path d="M31 18a9 9 0 0 1 0 12M36 13a16 16 0 0 1 0 22"
                   fill="none" stroke="currentColor" stroke-width="3"
                   stroke-linecap="round">
                   <animate attributeName="opacity" values="0.2;1;0.2" dur="1s"
                      repeatCount="indefinite"/>
                </path>` : ""}
    `);
}

/** LED-mátrix: 5x5 pontháló. */
function matrix(value) {
    const on = value > 0;
    let dots = "";
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const lit = on && (r + c) % 2 === 0;
            dots += `<rect x="${8 + c * 7}" y="${8 + r * 7}" width="5" height="5" rx="1"
                fill="currentColor" opacity="${lit ? 1 : 0.25}"/>`;
        }
    }
    return wrap(dots);
}

const ACTUATORS = {
    tlt: trafficLight,
    mot: motor,
    pmp: pump,
    rly: relay,
    led: led,
    srv: servo,
    buz: buzzer,
    mtx: matrix
};

/**
 * Aktuátor-ikon az AKTUÁLIS állapottal.
 * Ismeretlen típusnál a relé billenőkapcsolója az alapértelmezés — az
 * legalább a be/ki állapotot hűen mutatja.
 */
export function actuatorIcon(type, value) {
    const fn = ACTUATORS[type] || relay;
    return fn(value === null || value === undefined ? 0 : value);
}

export function isTrafficLight(type) {
    return type === "tlt";
}

// --- micro:bit tábla ------------------------------------------------------
//
// SAJÁT rajz, nem a hivatalos logó: a micro:bit védjegy, és a Foundation
// arculati irányelve kéri, hogy ne keltsük hivatalos termék látszatát.
// (Ráadásul a részletes logó 18 képpontnál olvashatatlan volna.)
//
// A szám nem betűként van ráírva, hanem IGAZI LED-PONTOKBÓL kirakva, a
// micro:bit 5x5-ös kijelzőjének mintájára — úgy, ahogy a valódi eszközön
// is megjelenne.

/** 3x5-ös számjegy-betűkészlet, a micro:bit saját kijelzőjének arányaival. */
const DIGITS = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"]
};

/**
 * Az 5x5-ös kijelző pontjai. Egy számjegy középre kerül; két számjegynél
 * nincs hely a rácson, ott a szám szövegként jelenik meg a kijelzőn
 * (a valódi micro:bit ilyenkor végiggörgetné).
 */
function screenDots(num, x0, y0, step, r, onBoard = false) {
    const offColor = onBoard ? "#7a2f2a" : "#41262a";
    const label = String(num);
    const glyph = label.length === 1 ? DIGITS[label] : null;
    let out = "";

    if (!glyph) {
        const cx = x0 + step * 2;
        const cy = y0 + step * 2;
        return `<text x="${cx}" y="${cy}" text-anchor="middle"
                    dominant-baseline="central"
                    font-family="ui-monospace, Consolas, monospace"
                    font-size="${step * 2.6}" font-weight="700"
                    fill="#ff4b3e">${label}</text>`;
    }

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            // A 3 széles számjegy középre, egy-egy üres oszloppal a szélén.
            const lit = col >= 1 && col <= 3 && glyph[row][col - 1] === "1";
            out += `<circle cx="${x0 + col * step}" cy="${y0 + row * step}" r="${r}"
                fill="${lit ? "#ff4b3e" : offColor}"/>`;
        }
    }
    return out;
}

/**
 * Kis micro:bit a sorszámával.
 *
 * Nem dísz: a diák így tudja összepárosítani a képernyőn látott csempét az
 * asztalon fekvő eszközzel.
 *
 * @param {number} num az eszköz sorszáma (1-99)
 * @param {boolean} online él-e az eszköz — a panel színe ezt mutatja
 * @param {number} w a rajz szélessége képpontban
 * @param {"board"|"screen"} variant teljes panel, vagy csak a kijelző
 */
export function microbitIcon(num, online = true, w = 46, variant = "board") {
    // Kis méretben a panel részletei csak kásásak lennének — ott a
    // kijelző önmagában is félreismerhetetlen.
    if (variant === "screen") {
        return `<svg viewBox="0 0 40 40" class="mb mb-screen" style="width:${w}px"
                     aria-hidden="true">
            <rect width="40" height="40" rx="6" fill="#151c24"
                  opacity="${online ? 1 : 0.55}"/>
            ${screenDots(num, 8, 8, 6, 2.3)}
        </svg>`;
    }

    const board = online ? "#38a04a" : "#9aa7b2";
    const gold = online ? "#e0b341" : "#c6ccd1";

    // Az élcsatlakozó: öt nagy érintkező-fül, köztük BEVÁGÁSOKKAL. A panel
    // maga fut le a fülekbe — ez a micro:bit legjellegzetesebb éle, és a
    // korábbi rajz épp ezt hibázta el (a lábak külön lógtak a panel alatt).
    const tabs = [[5, 21], [24.5, 40.5], [44, 60], [63.5, 79.5], [83, 99]];
    const cut = 58;      // meddig ér fel a bevágás
    const bottom = 76;   // a fülek alja

    let edge = `M9 1 H91 A8 8 0 0 1 99 9 V${cut} `;
    for (let i = tabs.length - 1; i >= 0; i--) {
        const [l, r] = tabs[i];
        edge += `H${r} V${bottom} H${l} V${cut} `;
    }
    edge += `H1 V9 A8 8 0 0 1 9 1 Z`;

    // Aranyozás a füleken, furattal; fölöttük a keskeny lábak nyomai.
    let pads = "";
    for (const [l, r] of tabs) {
        const cx = (l + r) / 2;
        pads += `<rect x="${l + 1.5}" y="${cut + 2}" width="${r - l - 3}"
                    height="${bottom - cut - 3}" rx="1.2" fill="${gold}"/>
                 <circle cx="${cx}" cy="${cut + 9}" r="3" fill="#151c24" opacity="0.8"/>`;
    }
    for (let i = 0; i < tabs.length - 1; i++) {
        const from = tabs[i][1] + 0.5;
        const to = tabs[i + 1][0] - 0.5;
        const gap = (to - from) / 4;
        for (let k = 1; k <= 3; k++) {
            pads += `<rect x="${(from + gap * k - 0.9).toFixed(1)}" y="50"
                        width="1.8" height="8" rx="0.6" fill="${gold}"/>`;
        }
    }

    return `<svg viewBox="0 0 100 80" class="mb" style="width:${w}px" aria-hidden="true">
        <path d="${edge}" fill="${board}"/>

        <!-- USB-csatlakozó és elemcsatlakozó a felső élen -->
        <rect x="41" y="0" width="18" height="6" rx="1.5" fill="#b9c2c9"/>
        <rect x="9" y="0" width="10" height="5" rx="1.5" fill="#f2f4f6"/>

        <!-- A és B gomb -->
        <rect x="7" y="25" width="16" height="16" rx="3" fill="#23272b"/>
        <circle cx="15" cy="33" r="4.4" fill="#41494f"/>
        <rect x="77" y="25" width="16" height="16" rx="3" fill="#23272b"/>
        <circle cx="85" cy="33" r="4.4" fill="#41494f"/>

        <!-- a sorszám LED-pontokból, KÖZVETLENÜL a panelen (mint az igazin) -->
        ${screenDots(num, 38, 24, 6, 2.5, true)}

        ${pads}
    </svg>`;
}
