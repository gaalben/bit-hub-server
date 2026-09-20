// bit:hub — transzport-réteg.
//
// A terv 2.2 pontja: a szerver API-ja NEM tudhatja, honnan jön az adat.
// Ezért minden forrás ugyanazt a felületet adja:
//
//     connect() / disconnect() / send(line) / onLine(cb) / kind
//
// Ma két megvalósítás van:
//   SerialTransport — a hub micro:bit USB-n (Web Serial)
//   SimTransport    — szimulált eszközök, hardver nélküli próbához
// A 10. lépésben jön a BleTransport, ugyanezzel a felülettel.

import { CONFIG } from "./config.js";

/** Chunkokból teljes sorok: a soros porton a csomaghatár nem sorhatár. */
export class LineSplitter {
    constructor(onLine) {
        this.buffer = "";
        this.onLine = onLine;
    }
    push(text) {
        this.buffer += text;
        // CRLF és LF is előfordul — a bit:plot tanulsága.
        const parts = this.buffer.split(/\r\n|\n|\r/);
        this.buffer = parts.pop();          // az utolsó darab még csonka
        for (const line of parts) {
            const t = line.trim();
            if (t) this.onLine(t);
        }
    }
    reset() {
        this.buffer = "";
    }
}

// --- Web Serial (a hub micro:bit) -----------------------------------------

export class SerialTransport {
    constructor() {
        this.kind = "serial";
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.running = false;
        this.handlers = [];
        this.splitter = new LineSplitter((line) => this.emit(line));
    }

    static get supported() {
        return typeof navigator !== "undefined" && "serial" in navigator;
    }

    onLine(cb) { this.handlers.push(cb); }
    emit(line) { for (const h of this.handlers) h(line); }

    async connect() {
        if (!SerialTransport.supported) {
            throw new Error(
                "Ez a böngésző nem tudja a Web Serial API-t. " +
                "Chrome vagy Edge kell hozzá, és biztonságos kapcsolat (https vagy localhost)."
            );
        }
        // A portválasztó csak felhasználói kattintásra nyílhat meg.
        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: CONFIG.BAUD });

        const decoder = new TextDecoderStream();
        this.port.readable.pipeTo(decoder.writable).catch(() => { /* lezáráskor normális */ });
        this.reader = decoder.readable.getReader();

        const encoder = new TextEncoderStream();
        encoder.readable.pipeTo(this.port.writable).catch(() => { });
        this.writer = encoder.writable.getWriter();

        this.running = true;
        this.splitter.reset();
        this.readLoop();
    }

    async readLoop() {
        while (this.running) {
            try {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) this.splitter.push(value);
            } catch {
                break;      // a port lezárult vagy kihúzták
            }
        }
        this.running = false;
    }

    async send(line) {
        if (!this.writer) return;
        await this.writer.write(line + "\n");
    }

    async disconnect() {
        this.running = false;
        try { await this.reader?.cancel(); } catch { }
        try { await this.writer?.close(); } catch { }
        try { await this.port?.close(); } catch { }
        this.port = this.reader = this.writer = null;
    }
}

// --- Szimulátor (hardver nélküli próbához) --------------------------------
//
// Nem csak "random számokat ont": a bővítmény VALÓDI viselkedését utánozza —
// fázisos indulás, hello + deklarációk a nyugtáig, jelentés változásra vagy
// lejárt időközre, életjel. Így az átjáró logikája élesben is ugyanazt látja.

export class SimTransport {
    constructor(deviceCount = CONFIG.SIM_DEVICES) {
        this.kind = "sim";
        this.handlers = [];
        this.timer = null;
        this.t0 = 0;
        this.devices = [];
        this.deviceCount = deviceCount;
    }

    onLine(cb) { this.handlers.push(cb); }
    emit(line) { for (const h of this.handlers) h(line); }

    async connect() {
        this.t0 = Date.now();
        this.devices = [];

        // A küszöbök (minChange) a valódi bővítmény "report by exception"
        // viselkedését utánozzák. Enélkül a szimulátor sokszorosát ontaná
        // annak, amit a rádió elbír — és hamis képet adna a terhelésről.
        const plans = [
            { id: 1, modules: [
                { slot: 1, type: "tmp", dir: "i", base: 22, amp: 3, noise: 0.08, minChange: 0.5 },
                { slot: 2, type: "lgt", dir: "i", base: 130, amp: 90, noise: 4, minChange: 20 },
                { slot: 3, type: "rly", dir: "o", base: 0, amp: 0, noise: 0, minChange: 1 }
            ]},
            { id: 2, modules: [
                { slot: 1, type: "soi", dir: "i", base: 480, amp: 60, noise: 5, minChange: 20 },
                { slot: 2, type: "pmp", dir: "o", base: 0, amp: 0, noise: 0, minChange: 1, power: true }
            ]},
            { id: 3, modules: [
                { slot: 1, type: "tmp", dir: "i", base: 19, amp: 1.5, noise: 0.05, minChange: 0.3 },
                { slot: 2, type: "hum", dir: "i", base: 55, amp: 10, noise: 0.8, minChange: 2 },
                { slot: 3, type: "dst", dir: "i", base: 40, amp: 25, noise: 1.5, minChange: 4 }
            ]}
        ];

        for (const plan of plans.slice(0, this.deviceCount)) {
            this.devices.push({
                ...plan,
                acked: false,
                announcedAt: 0,
                // Fázis az azonosítóból, ahogy a bővítmény is csinálja
                startDelay: (plan.id * 137) % 2000,
                lastTx: 0,
                modules: plan.modules.map(m => ({
                    ...m, sent: null, sentAt: 0, value: m.base
                }))
            });
        }

        this.timer = setInterval(() => this.tick(), CONFIG.SIM_TICK_MS);
    }

    /** Az eszköz futásideje másodpercben, körbefordulással. */
    seconds() {
        return Math.floor((Date.now() - this.t0) / 1000) % CONFIG.TIME_MOD;
    }

    tick() {
        const now = Date.now() - this.t0;
        const t = this.seconds();

        for (const dev of this.devices) {
            if (now < dev.startDelay) continue;

            // --- bemutatkozás, amíg nincs nyugta ---
            if (!dev.acked) {
                if (now - dev.announcedAt < 1500) continue;
                dev.announcedAt = now;
                this.emit(`!${dev.id},${dev.modules.length},${t}`);
                for (const m of dev.modules) {
                    const p = m.power ? ",p" : "";
                    this.emit(`#${dev.id},${m.slot},${m.type},${m.dir}${p}`);
                }
                // A hub helyben nyugtáz — ezt utánozzuk.
                setTimeout(() => {
                    dev.acked = true;
                    this.emit(`A${dev.id},${this.seconds()}`);
                }, 250);
                continue;
            }

            // --- jelentés: változásra vagy lejárt időközre ---
            for (const m of dev.modules) {
                if (m.dir !== "i") continue;
                m.value = this.simulate(m, now);
                const rounded = Math.round(m.value * 100) / 100;
                const changed = m.sent === null || Math.abs(rounded - m.sent) >= m.minChange;
                const overdue = now - m.sentAt >= 5000;
                if (changed || overdue) {
                    this.emit(`=${dev.id},${m.slot},${rounded},${t}`);
                    m.sent = rounded;
                    m.sentAt = now;
                    dev.lastTx = now;
                }
            }

            // --- életjel, ha 10 mp-ig nem volt más forgalom ---
            if (now - dev.lastTx >= 10000) {
                this.emit(`~${dev.id},${t},0`);
                dev.lastTx = now;
            }
        }
    }

    /** Lassú szinuszos alapjel + zaj — hihetően mozgó, de nem ugráló érték. */
    simulate(m, now) {
        const phase = (now / 1000) * (2 * Math.PI / 90);   // 90 mp-es periódus
        const wave = Math.sin(phase + m.slot) * m.amp;
        const noise = (Math.random() - 0.5) * 2 * m.noise;
        return m.base + wave + noise;
    }

    /**
     * A szimulált eszköz reagál a parancsra: átállítja az aktuátort,
     * és eseménnyel visszajelez — pont, ahogy az igazi tenné.
     */
    async send(line) {
        const m = /^>(\d+),(\d+),([-\d.]+)/.exec(line);
        if (!m) return;
        const [, idS, slotS, valS] = m;
        const dev = this.devices.find(d => d.id === Number(idS));
        if (!dev) return;
        const mod = dev.modules.find(x => x.slot === Number(slotS));
        if (!mod) return;
        setTimeout(() => {
            this.emit(`*${dev.id},${mod.slot},${Number(valS)},m,${this.seconds()}`);
        }, 120);
    }

    async disconnect() {
        clearInterval(this.timer);
        this.timer = null;
        this.devices = [];
    }
}
