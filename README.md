# bit:hub — szerver és dashboard

A **bit:hub** IoT-platform webes fele. Testvérprojekt: a
[bit-hub](https://github.com/gaalben/bit-hub) MakeCode-bővítmény (eszközoldal).

## Állapot

| Rész | Állapot |
|---|---|
| Átjáró lap (`atjaro.html`) | ✅ 2. lépés — olvas, értelmez, mutat |
| PHP API | ⬜ 3. lépés |
| Dashboard | ⬜ 3. lépés |

## Átjáró lap

A tanári gép böngészőjében fut. Web Serial-lel olvassa az USB-re kötött
hub micro:bitet, értelmezi a bit:hub protokollt, és táblázatban mutatja az
eszközöket és a moduljaikat. A 3. lépéstől ez fog a szerverre POST-olni.

Indítás:

```bash
python -m http.server 8000
```

Majd `http://localhost:8000/atjaro.html`. A Web Serialhoz **Chrome vagy Edge**
kell, és `localhost` vagy `https` (a `localhost` biztonságos kontextusnak számít).

**Hardver nélkül is kipróbálható:** a *Szimuláció indítása* gomb három virtuális
eszközt indít, amelyek a valódi bővítmény viselkedését utánozzák (fázisos
indulás, bemutatkozás a nyugtáig, jelentés változásra vagy lejárt időközre,
életjel) — élethű rádióterheléssel, 1-3 üzenet/mp körül.

## Felépítés

| Fájl | Mit csinál |
|---|---|
| `js/config.js` | minden beállítás egy helyen |
| `js/protocol.js` | a bit:hub protokoll: sor → objektum, és üzenetépítők |
| `js/transport.js` | `SerialTransport` (Web Serial) és `SimTransport`, közös felülettel |
| `js/gateway.js` | állapot: eszközök, modulok, óraszinkron, statisztika |
| `js/atjaro.js` | az EGYETLEN fájl, ami a DOM-hoz nyúl |

A rétegek szándékosan nem tudnak egymásról: a protokoll nem tud hálózatról,
az állapot nem tud a felületről. Ezért illeszthető majd be a szerverre küldés
anélkül, hogy a meglévőt át kéne írni — és ezért fér be a BLE-átjáró a
10. lépésben ugyanabba a `Transport` felületbe.

## Licenc

MIT
