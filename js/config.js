// bit:hub — átjáró: beállítások EGY helyen.
// (A bit:plot tanulsága: verziók és útvonalak sose szóródjanak szét.)

export const CONFIG = {
    // --- soros port ---
    BAUD: 115200,

    // --- protokoll ---
    MAX_LINE: 19,          // a rádiókeret; ennél hosszabb sor gyanús
    TIME_MOD: 65536,       // a futásidő-mező körbefordulása másodpercben
    MAX_MODULES: 8,

    // --- élőség ---
    // Az eszköz 10 mp-enként életjelet ad, ha más forgalma nincs.
    // Ennek háromszorosa után tekintjük offline-nak — így egy-két
    // elveszett csomag még nem villogtatja a felületet.
    OFFLINE_AFTER_MS: 35000,
    TICK_MS: 1000,         // a felület frissítési üteme

    // --- napló ---
    LOG_MAX_LINES: 500,

    // --- szimulátor (eszköz nélküli próbához) ---
    SIM_DEVICES: 3,
    SIM_TICK_MS: 250
};
