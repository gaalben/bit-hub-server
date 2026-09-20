// bit:hub — átjáró: a felület bekötése.
//
// Ez az egyetlen fájl, ami a DOM-hoz nyúl. A protokoll (protocol.js), az
// állapot (gateway.js) és a forrás (transport.js) nem tud a felületről —
// így a 3. lépésben a szerverre küldés beilleszthető anélkül, hogy ezt
// a fájlt át kéne írni.

import { CONFIG } from "./config.js";
import { Gateway } from "./gateway.js";
import { SerialTransport, SimTransport } from "./transport.js";
import { DIRECTIONS, REASONS, typeName, typeUnit } from "./protocol.js";

const $ = (id) => document.getElementById(id);

const ui = {
    btnSerial: $("btn-serial"),
    btnSim: $("btn-sim"),
    btnStop: $("btn-stop"),
    btnSend: $("btn-send"),
    btnClearLog: $("btn-clear-log"),
    status: $("status"),
    tbody: document.querySelector("#devices tbody"),
    log: $("log"),
    onlyBad: $("only-bad"),
    sendLine: $("send-line"),
    sendHint: $("send-hint"),
    statDevices: $("stat-devices"),
    statRate: $("stat-rate"),
    statTotal: $("stat-total"),
    statBad: $("stat-bad")
};

const gw = new Gateway();
let transport = null;
let tickTimer = null;

// A frissen változott modulok, hogy felvillanjanak a táblázatban.
const flashed = new Set();

// --- naplózás -------------------------------------------------------------

function log(dir, text, isError = false) {
    if (ui.onlyBad.checked && !isError) return;

    const time = new Date().toLocaleTimeString("hu-HU", { hour12: false });
    const line = document.createElement("div");
    const cls = isError ? "err" : (dir === "out" ? "out" : "in");
    const arrow = dir === "out" ? "→" : "←";
    line.innerHTML =
        `<span class="time">${time}</span> <span class="${cls}">${arrow} ${escapeHtml(text)}</span>`;
    ui.log.appendChild(line);

    while (ui.log.childElementCount > CONFIG.LOG_MAX_LINES) {
        ui.log.removeChild(ui.log.firstChild);
    }
    // Csak akkor görgetünk, ha a felhasználó amúgy is a napló alján áll.
    const atBottom = ui.log.scrollHeight - ui.log.scrollTop - ui.log.clientHeight < 60;
    if (atBottom) ui.log.scrollTop = ui.log.scrollHeight;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// --- kapcsolat ------------------------------------------------------------

async function start(kind) {
    await stop();
    gw.reset();

    try {
        transport = kind === "serial" ? new SerialTransport() : new SimTransport();
        transport.onLine(onLine);
        setStatus("idle", kind === "serial" ? "Port megnyitása…" : "Szimuláció indul…");
        await transport.connect();
    } catch (err) {
        // A leggyakoribb eset: a felhasználó bezárta a portválasztót.
        const msg = /No port selected|cancel/i.test(err.message || "")
            ? "Nem választottál portot."
            : err.message;
        setStatus("err", msg);
        log("in", `HIBA: ${msg}`, true);
        transport = null;
        setButtons(false);
        return;
    }

    setStatus(kind === "serial" ? "live" : "sim",
        kind === "serial" ? "Kapcsolódva a hubhoz" : "Szimuláció fut (nincs hardver)");
    setButtons(true);
    tickTimer = setInterval(tick, CONFIG.TICK_MS);
    tick();
}

async function stop() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (transport) {
        await transport.disconnect();
        transport = null;
    }
    setButtons(false);
    setStatus("idle", "Nincs kapcsolat");
}

function setButtons(running) {
    ui.btnSerial.disabled = running;
    ui.btnSim.disabled = running;
    ui.btnStop.disabled = !running;
    ui.btnSend.disabled = !running;
}

function setStatus(cls, text) {
    ui.status.className = `status ${cls}`;
    ui.status.textContent = text;
}

// --- a bejövő sorok útja --------------------------------------------------

function onLine(raw) {
    const msg = gw.handleLine(raw);
    log("in", raw, msg.kind === "bad");

    if (msg.kind === "bad") return;

    // A 19 karakteres keret túllépése nem hiba, de árulkodó — jelezzük.
    if (raw.length > CONFIG.MAX_LINE) {
        log("in", `FIGYELEM: ${raw.length} karakteres sor (a rádiókeret ${CONFIG.MAX_LINE})`, true);
    }

    if (msg.kind === "telemetry" || msg.kind === "event") {
        flashed.add(`${msg.device}:${msg.slot}`);
    }
    if (msg.kind === "hello" || msg.kind === "declare" || msg.kind === "event") {
        render();     // szerkezeti változás — azonnal rajzoljunk
    }
}

// --- rajzolás -------------------------------------------------------------

function tick() {
    gw.updateRate();
    render();
}

function render() {
    ui.statDevices.textContent = gw.devices.size;
    ui.statRate.textContent = gw.stats.rate.toFixed(1);
    // A micro:bit rádiója kb. 8-10 csomag/mp fölött megbízhatatlan. Ha
    // átlépjük, azt látni kell — különben "véletlenszerű" adatvesztésnek
    // tűnik majd, pedig túlterhelés.
    const over = gw.stats.rate > 8;
    ui.statRate.parentElement.classList.toggle("over", over);
    ui.statRate.parentElement.title = over
        ? "Túl sűrű rádióforgalom — ritkítsd a jelentést (jelentési ütem blokk)."
        : "A rádió kb. 8-10 csomag/mp-ig megbízható.";
    ui.statTotal.textContent = gw.stats.total;
    ui.statBad.textContent = gw.stats.bad;

    const rows = gw.rows();
    if (rows.length === 0) {
        ui.tbody.innerHTML =
            `<tr class="empty"><td colspan="7">Még nem hallottunk egyetlen eszközt sem.</td></tr>`;
        return;
    }

    let lastDevice = null;
    const html = rows.map(({ dev, module }) => {
        const isFirst = dev.id !== lastDevice;
        lastDevice = dev.id;

        const online = gw.isOnline(dev);
        const modCount = dev.modules.size;

        // Az eszköz oszlopai csak az első sorában látszanak.
        const devCells = isFirst
            ? `<td rowspan="${Math.max(1, modCount)}"><b>#${dev.id}</b></td>
               <td rowspan="${Math.max(1, modCount)}">
                   <span class="pill ${online ? "on" : "off"}">${online ? "él" : "néma"}</span>
                   <div class="dim" style="font-size:12px;margin-top:4px">
                       ${modCount} modul${dev.resets ? ` · ${dev.resets}× újraindult` : ""}
                   </div>
               </td>`
            : "";

        if (!module) {
            return `<tr class="device-start">${devCells}
                <td colspan="5" class="dim">bemutatkozás folyamatban…</td></tr>`;
        }

        const key = `${dev.id}:${module.slot}`;
        const flash = flashed.has(key) ? " flash" : "";
        flashed.delete(key);

        const unit = typeUnit(module.type);
        const value = module.value === null
            ? "—"
            : `${formatValue(module.value)}${unit ? " " + unit : ""}`;
        const when = module.valueAt
            ? new Date(module.valueAt).toLocaleTimeString("hu-HU", { hour12: false })
            : "—";
        const power = module.needsPower
            ? `<span class="pill power" title="külső tápot igényel">táp</span>` : "";
        // Az okot emberi nyelven írjuk ki: az "m" önmagában semmit nem mond.
        const reason = module.lastReason
            ? `<div class="dim" style="font-size:12px">${REASONS[module.lastReason] || module.lastReason}</div>`
            : "";

        return `<tr class="${isFirst ? "device-start" : ""}">
            ${devCells}
            <td>${module.slot}${power}</td>
            <td>${typeName(module.type)}${reason}</td>
            <td class="dim">${DIRECTIONS[module.dir] || module.dir}</td>
            <td class="num value${flash}">${value}</td>
            <td class="dim">${when}</td>
        </tr>`;
    }).join("");

    ui.tbody.innerHTML = html;
}

function formatValue(v) {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2).replace(/\.?0+$/, "");
}

// --- kézi sorküldés (a 4. lépés előkészítése) -----------------------------

async function sendManual() {
    const line = ui.sendLine.value.trim();
    if (!line || !transport) return;

    if (line.length > CONFIG.MAX_LINE) {
        ui.sendHint.className = "hint bad";
        ui.sendHint.textContent =
            `${line.length} karakter — a rádiókeret ${CONFIG.MAX_LINE}, ez nem menne át.`;
        return;
    }

    await transport.send(line);
    log("out", line);
    ui.sendHint.className = "hint";
    ui.sendHint.textContent = "Elküldve.";
    ui.sendLine.select();
}

// --- események ------------------------------------------------------------

ui.btnSerial.addEventListener("click", () => start("serial"));
ui.btnSim.addEventListener("click", () => start("sim"));
ui.btnStop.addEventListener("click", stop);
ui.btnSend.addEventListener("click", sendManual);
ui.sendLine.addEventListener("keydown", (e) => { if (e.key === "Enter") sendManual(); });
ui.btnClearLog.addEventListener("click", () => { ui.log.innerHTML = ""; });

// Ha a böngésző nem tudja a Web Serialt, mondjuk meg előre, ne kattintáskor.
if (!SerialTransport.supported) {
    ui.btnSerial.disabled = true;
    ui.btnSerial.title =
        "Ehhez Chrome vagy Edge kell, és biztonságos kapcsolat (localhost vagy https).";
    setStatus("err", "A böngésző nem tudja a Web Serialt — a szimuláció viszont megy.");
}

window.addEventListener("beforeunload", () => { transport?.disconnect(); });
