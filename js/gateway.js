// bit:hub — átjáró: állapotmodell.
//
// Itt él az, amit a rádióról tudunk: milyen eszközök vannak, mi van rajtuk,
// mi a legutóbbi értékük, és mikor hallottuk őket utoljára. Ez a réteg nem
// nyúl a DOM-hoz — a 3. lépésben ugyanez fog a szerverre POST-olni.
//
// A legfontosabb dolga az IDŐ. A micro:bitnek nincs órája: csak a futásidejét
// küldi, másodpercben, 65536-onként körbefordulva. Az abszolút időt itt
// számoljuk ki, és ez lesz a mérés időbélyege — nem az érkezés ideje, mert az
// a rádió- és kötegelési késéseket is belekeverné.

import { CONFIG } from "./config.js";
import { parseLine, typeName, typeUnit } from "./protocol.js";

export class Gateway {
    constructor() {
        this.devices = new Map();     // eszközszám → eszköz
        this.stats = { total: 0, bad: 0, lastSecond: 0, rate: 0 };
        this._rateWindow = [];
        this.listeners = [];
    }

    /** Változásértesítés a felületnek. */
    onChange(cb) { this.listeners.push(cb); }
    notify(kind, payload) { for (const cb of this.listeners) cb(kind, payload); }

    // --- eszköz- és modul-nyilvántartás ---------------------------------

    device(id) {
        let d = this.devices.get(id);
        if (!d) {
            d = {
                id,
                modules: new Map(),
                firstSeen: Date.now(),
                lastSeen: 0,
                // óraszinkron
                offsetMs: null,     // abszolút idő = offsetMs + futásidő
                wraps: 0,           // hányszor fordult körbe a futásidő
                lastT: null,        // az utoljára látott nyers futásidő
                resets: 0,
                rulesVersion: 0,
                messages: 0
            };
            this.devices.set(id, d);
            this.notify("device-added", d);
        }
        return d;
    }

    module(dev, slot) {
        let m = dev.modules.get(slot);
        if (!m) {
            m = {
                slot, type: "oth", dir: "i", needsPower: false,
                value: null, valueAt: null, lastReason: null, declared: false
            };
            dev.modules.set(slot, m);
        }
        return m;
    }

    // --- óraszinkron -----------------------------------------------------

    /**
     * A nyers (körbeforduló) futásidőből abszolút ezredmásodperc.
     *
     * A körbefordulást a SAJÁT óránkkal bontjuk ki: ha a nyers érték
     * visszaugrik, eltelt egy teljes kör. Az eszköz ÚJRAINDULÁSA is
     * visszaugrást okoz — azt viszont a hello jelzi, és ott nullázunk.
     */
    absoluteMs(dev, t) {
        if (dev.lastT !== null && t < dev.lastT - 60) {
            dev.wraps += 1;         // körbefordult
        }
        dev.lastT = t;
        const totalSeconds = dev.wraps * CONFIG.TIME_MOD + t;

        if (dev.offsetMs === null) {
            dev.offsetMs = Date.now() - totalSeconds * 1000;
        }
        return dev.offsetMs + totalSeconds * 1000;
    }

    /** Hello érkezett: az eszköz elölről kezdi az időszámítást. */
    resyncClock(dev, t) {
        if (dev.lastT !== null && t < dev.lastT) dev.resets += 1;
        dev.wraps = 0;
        dev.lastT = t;
        dev.offsetMs = Date.now() - t * 1000;
    }

    // --- a bejövő sor feldolgozása ---------------------------------------

    handleLine(raw) {
        const msg = parseLine(raw);
        this.stats.total += 1;
        this._rateWindow.push(Date.now());

        if (msg.kind === "bad") {
            this.stats.bad += 1;
            this.notify("bad", { raw, error: msg.error });
            return msg;
        }

        // A hub→eszköz üzenetek visszhangját nem dolgozzuk fel állapotként.
        if (["ack", "command", "rule", "mode", "ruleDelete"].includes(msg.kind)) {
            return msg;
        }

        const dev = this.device(msg.device);
        dev.lastSeen = Date.now();
        dev.messages += 1;

        switch (msg.kind) {
            case "hello":
                this.resyncClock(dev, msg.t);
                dev.expectedModules = msg.moduleCount;
                this.notify("hello", dev);
                break;

            case "declare": {
                const m = this.module(dev, msg.slot);
                m.type = msg.type;
                m.dir = msg.dir;
                m.needsPower = msg.needsPower;
                m.declared = true;
                this.notify("declare", { dev, module: m });
                break;
            }

            case "telemetry": {
                const m = this.module(dev, msg.slot);
                m.value = msg.value;
                m.valueAt = this.absoluteMs(dev, msg.t);
                this.notify("telemetry", { dev, module: m });
                break;
            }

            case "event": {
                const m = this.module(dev, msg.slot);
                m.value = msg.value;
                m.valueAt = this.absoluteMs(dev, msg.t);
                m.lastReason = msg.reason;
                this.notify("event", { dev, module: m, reason: msg.reason });
                break;
            }

            case "heartbeat":
                this.absoluteMs(dev, msg.t);
                dev.rulesVersion = msg.rulesVersion;
                break;

            case "request":
                // Az eszköz újraindult és kéri a szabályait — az 5. lépésben
                // itt fogjuk visszatölteni őket.
                this.notify("request", dev);
                break;
        }

        return msg;
    }

    // --- származtatott adatok a felületnek -------------------------------

    isOnline(dev) {
        return Date.now() - dev.lastSeen < CONFIG.OFFLINE_AFTER_MS;
    }

    /** Üzenet/másodperc az utolsó 5 mp-re — ebből látszik a rádióterhelés. */
    updateRate() {
        const cutoff = Date.now() - 5000;
        this._rateWindow = this._rateWindow.filter(t => t > cutoff);
        this.stats.rate = this._rateWindow.length / 5;
        return this.stats.rate;
    }

    /** Lapos lista a táblázathoz: eszköz + modul soronként. */
    rows() {
        const out = [];
        for (const dev of [...this.devices.values()].sort((a, b) => a.id - b.id)) {
            const mods = [...dev.modules.values()].sort((a, b) => a.slot - b.slot);
            if (mods.length === 0) {
                out.push({ dev, module: null });
            } else {
                for (const m of mods) out.push({ dev, module: m });
            }
        }
        return out;
    }

    describe(module) {
        if (!module) return "—";
        const unit = typeUnit(module.type);
        return typeName(module.type) + (unit ? ` (${unit})` : "");
    }

    reset() {
        this.devices.clear();
        this.stats = { total: 0, bad: 0, lastSecond: 0, rate: 0 };
        this._rateWindow = [];
        this.notify("reset", null);
    }
}
