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

/**
 * Kis micro:bit a sorszámmal A SAJÁT KIJELZŐJÉN.
 *
 * Nem dísz: a diák így tudja összepárosítani a képernyőn látott csempét az
 * asztalon fekvő eszközzel. (Érdemes lesz a bővítménybe is betenni, hogy a
 * valódi micro:bit is kiírja a sorszámát a LED-mátrixra.)
 *
 * @param {number} num az eszköz sorszáma (1-99)
 * @param {boolean} online él-e az eszköz — a tábla színe ezt mutatja
 * @param {number} w a rajz szélessége képpontban
 */
export function microbitIcon(num, online = true, w = 44) {
    const label = String(num);
    const fontSize = label.length > 1 ? 9.5 : 12.5;
    const board = online ? "#2f9e5f" : "#9aa7b2";
    const pin = online ? "#d9a441" : "#c3c9ce";

    // Az élcsatlakozó fogai: a három nagy (3V, GND, P0-P2) és a kicsik.
    let pins = "";
    for (let i = 0; i < 12; i++) {
        const big = i === 1 || i === 5 || i === 10;
        const x = 4 + i * 3.4;
        pins += `<rect x="${x}" y="26" width="${big ? 2.6 : 1.5}" height="${big ? 8 : 5}"
                    rx="0.6" fill="${pin}"/>`;
    }

    return `<svg viewBox="0 0 48 36" class="mb" style="width:${w}px" aria-hidden="true">
        <rect x="1.5" y="1.5" width="45" height="25" rx="3.5" fill="${board}"/>
        <circle cx="7.5" cy="14" r="3.4" fill="#1c2530"/>
        <circle cx="40.5" cy="14" r="3.4" fill="#1c2530"/>
        <rect x="15" y="5" width="18" height="18" rx="2" fill="#151c24"/>
        <text x="24" y="14.6" text-anchor="middle" dominant-baseline="middle"
              font-family="ui-monospace, Consolas, monospace"
              font-size="${fontSize}" font-weight="700" fill="#ff5a4e">${label}</text>
        ${pins}
    </svg>`;
}
