// bit:hub — protokoll-értelmező.
//
// Ez a modul CSAK szöveget alakít objektummá és vissza. Nem tud eszközről,
// nem tud hálózatról, nem nyúl a DOM-hoz — ezért egyben ez az, amit
// szimulációval végig lehet tesztelni.
//
// Üzenetalak:  <típusjel><eszközID>,<mezők vesszővel>
// A rádiókeret 19 karakter, ezért minden mező rövidített kód.

import { CONFIG } from "./config.js";

// --- típuskód → ember által olvasható név és mértékegység -----------------
// A rádión csak a 3 betűs kód megy; a beszédes nevet itt tesszük hozzá.
// (A tanár a dashboardon úgyis átnevezheti a csempét.)

export const TYPES = {
    tmp: { name: "hőmérséklet", unit: "°C" },
    lgt: { name: "fény", unit: "" },
    hum: { name: "páratartalom", unit: "%" },
    soi: { name: "talajnedvesség", unit: "" },
    dst: { name: "távolság", unit: "cm" },
    snd: { name: "hang", unit: "" },
    acc: { name: "gyorsulás", unit: "mg" },
    btn: { name: "gomb", unit: "" },
    pot: { name: "potméter", unit: "" },
    led: { name: "LED", unit: "" },
    rly: { name: "relé", unit: "" },
    pmp: { name: "pumpa", unit: "" },
    srv: { name: "szervo", unit: "°" },
    mot: { name: "motor", unit: "" },
    buz: { name: "zsongor", unit: "" },
    mtx: { name: "LED-mátrix", unit: "" },
    oth: { name: "egyéb", unit: "" }
};

export const DIRECTIONS = {
    i: "szenzor",
    o: "digitális kimenet",
    a: "analóg kimenet",
    v: "szervo"
};

export const REASONS = {
    r: "szabály oldotta ki",
    m: "kézi parancs",
    t: "ideiglenes felülírás lejárt",
    b: "visszaállás automatikára"
};

export function typeName(code) {
    return (TYPES[code] && TYPES[code].name) || code;
}

export function typeUnit(code) {
    return (TYPES[code] && TYPES[code].unit) || "";
}

// --- bejövő üzenetek értelmezése ------------------------------------------

/**
 * Egy sort objektummá alakít.
 * Hibás sornál NEM dob kivételt, hanem {kind:"bad"} objektumot ad —
 * a rádión mindig lesz sérült csomag, és attól nem állhat meg az átjáró.
 */
export function parseLine(raw) {
    const line = (raw || "").trim();
    if (!line) return { kind: "bad", raw, error: "üres sor" };

    const mark = line[0];
    const parts = line.slice(1).split(",");
    const id = parseInt(parts[0], 10);

    if (!Number.isFinite(id) || id < 1 || id > 99) {
        return { kind: "bad", raw: line, error: "hiányzó vagy érvénytelen eszközszám" };
    }

    switch (mark) {
        // !id,modulszám,futásidő
        case "!":
            if (parts.length < 3) return bad(line, "hiányos hello");
            return {
                kind: "hello", device: id,
                moduleCount: num(parts[1]),
                t: num(parts[2])
            };

        // #id,slot,típus,irány[,p]
        case "#":
            if (parts.length < 4) return bad(line, "hiányos modul-deklaráció");
            return {
                kind: "declare", device: id,
                slot: num(parts[1]),
                type: parts[2],
                dir: parts[3],
                needsPower: parts.length > 4 && parts[4] === "p"
            };

        // =id,slot,érték,futásidő
        case "=":
            if (parts.length < 4) return bad(line, "hiányos telemetria");
            return {
                kind: "telemetry", device: id,
                slot: num(parts[1]),
                value: num(parts[2]),
                t: num(parts[3])
            };

        // *id,slot,érték,ok,futásidő
        case "*":
            if (parts.length < 5) return bad(line, "hiányos esemény");
            return {
                kind: "event", device: id,
                slot: num(parts[1]),
                value: num(parts[2]),
                reason: parts[3],
                t: num(parts[4])
            };

        // ~id,futásidő,szabályverzió
        case "~":
            if (parts.length < 2) return bad(line, "hiányos életjel");
            return {
                kind: "heartbeat", device: id,
                t: num(parts[1]),
                rulesVersion: parts.length > 2 ? num(parts[2]) : 0
            };

        // ?id — az eszköz újraindult, kéri a szabályait
        case "?":
            return { kind: "request", device: id };

        // A hub→eszköz üzenetek visszhangja (ha a hub kiírja őket)
        case "A": return { kind: "ack", device: id, t: num(parts[1]) };
        case ">": return { kind: "command", device: id };
        case "R": case "Q": return { kind: "rule", device: id };
        case "M": return { kind: "mode", device: id };
        case "X": return { kind: "ruleDelete", device: id };

        default:
            return bad(line, `ismeretlen üzenettípus: "${mark}"`);
    }
}

function bad(raw, error) {
    return { kind: "bad", raw, error };
}

function num(s) {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
}

// --- kimenő üzenetek építése ----------------------------------------------
//
// Mindegyik betartja a 19 karakteres keretet: ahol szám megy, a hívó
// kiszámolja a maradék helyet, és a szám abba formázódik.

/** Szám szöveggé adott szélességbe: 2 tizedes → 1 → egész → vágás. */
export function fitNumber(v, maxLen) {
    if (maxLen < 1) return "0";
    let s = String(round(v, 2));
    if (s.length <= maxLen) return s;
    s = String(round(v, 1));
    if (s.length <= maxLen) return s;
    s = String(Math.round(v));
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen);
}

function round(v, digits) {
    const m = Math.pow(10, digits);
    return Math.round(v * m) / m;
}

/** A>: nyugta a hellóra. */
export function buildAck(device, seconds) {
    return `A${device},${seconds % CONFIG.TIME_MOD}`;
}

/** >id,slot,érték,tartás_mp — kézi parancs egy aktuátorra. */
export function buildCommand(device, slot, value, holdSeconds = 0) {
    const head = `>${device},${slot},`;
    const tail = `,${Math.max(0, Math.round(holdSeconds))}`;
    const room = CONFIG.MAX_LINE - head.length - tail.length;
    return head + fitNumber(value, room) + tail;
}

/** Rid,idx,be,op küszöb[,hiszterézis] — a szabály FELTÉTELE. */
export function buildRuleCondition(device, idx, inSlot, op, threshold, hysteresis = null) {
    const head = `R${device},${idx},${inSlot},${op}`;
    if (hysteresis === null) {
        return head + fitNumber(threshold, CONFIG.MAX_LINE - head.length);
    }
    const h = fitNumber(hysteresis, 4);
    const room = CONFIG.MAX_LINE - head.length - 1 - h.length;
    return `${head}${fitNumber(threshold, room)},${h}`;
}

/** Qid,idx,ki,érték — a szabály AKCIÓJA. */
export function buildRuleAction(device, idx, outSlot, value) {
    const head = `Q${device},${idx},${outSlot},`;
    return head + fitNumber(value, CONFIG.MAX_LINE - head.length);
}

/** Mid,slot,mód — felülírás-mód (h = tartós, t = ideiglenes, o = egyszeri). */
export function buildMode(device, slot, mode) {
    return `M${device},${slot},${mode}`;
}

/** Xid,idx — szabály törlése. */
export function buildRuleDelete(device, idx) {
    return `X${device},${idx}`;
}
