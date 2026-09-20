// bit:hub — csempés nézet.
//
// Ez a gyerekeknek szóló felület magja: EGY PILLANTÁS alatt látszódjon,
// mi történik. Három elv:
//
//  1. Piktogram elöl. A lámpa színe, a forgó motor, a csöpögő pumpa
//     többet mond egy kisiskolásnak, mint a szám.
//  2. Szó a szám mellé. Ahol van értelmes állapotnév ("bekapcsolva",
//     "zöld"), ott az a főszereplő, a szám csak mellette.
//  3. Arány, ne nyers érték. A csík megmutatja, hol tart a szenzor a
//     tartományában — 512 önmagában semmit nem jelent, félúton lenni igen.
//
// A 3. lépésben ez lesz a dashboard alapja; ott jön mellé a kapcsolás és
// az átnevezés.

import { sensorIcon, actuatorIcon, microbitIcon } from "./icons.js";
import { typeName, typeUnit, typeRange, stateLabel, REASONS } from "./protocol.js";

/** Egy modul csempéje. */
export function moduleTile(dev, m, opts = {}) {
    const isSensor = m.dir === "i";
    const hasValue = m.value !== null && m.value !== undefined;
    const label = hasValue ? stateLabel(m.type, m.value) : null;
    const on = hasValue && m.value > 0;

    const icon = isSensor ? sensorIcon(m.type) : actuatorIcon(m.type, m.value);
    const unit = typeUnit(m.type);

    // Fő kijelzés: szó, ha van; különben szám + mértékegység.
    // A közlekedési lámpánál az ÁLLAPOT SZAVA is a lámpa színét kapja:
    // a zölden írt "sárga" pont azt rontaná el, amiért a csempe készült.
    const stateClass = m.type === "tlt"
        ? ` tl-${["dark", "red", "yellow", "green"][Math.round(m.value)] || "dark"}`
        : "";

    const main = !hasValue
        ? `<div class="tile-value dim">nincs jel</div>`
        : label
            ? `<div class="tile-state${stateClass}">${label}</div>`
            : `<div class="tile-value">${fmt(m.value)}<span class="unit">${unit}</span></div>`;

    // Arány-csík: csak ott, ahol a tartomány értelmes (nem ki/be kapcsoló).
    const range = typeRange(m.type);
    const bar = (hasValue && range && range.max - range.min > 1)
        ? barHtml(m.value, range)
        : "";

    const power = m.needsPower
        ? `<span class="chip warn" title="külső tápot igényel">külső táp</span>` : "";
    const reason = m.lastReason
        ? `<span class="chip">${REASONS[m.lastReason] || m.lastReason}</span>` : "";
    const when = m.valueAt
        ? new Date(m.valueAt).toLocaleTimeString("hu-HU", { hour12: false })
        : "—";

    return `
    <article class="tile ${isSensor ? "sensor" : "actuator"} ${on ? "on" : "off"}"
             data-key="${dev.id}:${m.slot}" data-type="${m.type}">
        <div class="tile-icon">${icon}</div>
        <div class="tile-body">
            <div class="tile-name">${typeName(m.type)}</div>
            ${main}
            ${bar}
            <div class="tile-meta">
                <span class="chip dev">${microbitIcon(dev.id, true, 15, "screen")} ${m.slot}. modul</span>
                ${power}${reason}
            </div>
        </div>
        <div class="tile-time">${when}</div>
    </article>`;
}

/** Az eszköz fejléc-csempéje: él-e, hány modulja van. */
export function deviceHeader(dev, online) {
    return `
    <div class="device-head">
        ${microbitIcon(dev.id, online, 46)}
        <span class="device-id">#${dev.id}</span>
        <span class="pill ${online ? "on" : "off"}">${online ? "él" : "néma"}</span>
        <span class="device-meta">${dev.modules.size} modul${
            dev.resets ? ` · ${dev.resets}× újraindult` : ""}</span>
    </div>`;
}

function barHtml(value, range) {
    const span = range.max - range.min;
    const pct = Math.max(0, Math.min(100, ((value - range.min) / span) * 100));
    return `
    <div class="tile-bar" title="${fmt(value)} (${range.min}–${range.max})">
        <div class="tile-bar-fill" style="width:${pct.toFixed(1)}%"></div>
    </div>`;
}

function fmt(v) {
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 10) / 10);
}
