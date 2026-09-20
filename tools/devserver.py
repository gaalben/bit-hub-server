#!/usr/bin/env python3
"""bit:hub — fejlesztői kiszolgáló.

A sima `python -m http.server` engedi a böngészőnek gyorsítótárazni a
fájlokat. Fejlesztés közben ez a leggyakoribb hamis hibaforrás: a RÉGI
HTML és az ÚJ JavaScript keveredik, és olyan hibát látsz, ami a kódban
nincs is benne. (A bit:plotnál is ez volt a visszatérő buktató.)

Ez a kiszolgáló minden válaszra `Cache-Control: no-store`-t tesz, tehát a
böngésző mindig frisset kap. ÉLESBE NEM VALÓ — ott épp fordítva kell.

Használat:
    python tools/devserver.py            # 8000-es port
    python tools/devserver.py 8010       # másik porton
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Csak a hibákat írjuk ki; a 200-ak elfednék a lényeget.
        status = args[1] if len(args) > 1 else ""
        if str(status).startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(NoCacheHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"bit:hub fejlesztői kiszolgáló: http://localhost:{port}/atjaro.html")
        print(f"   gyökér: {ROOT}")
        print("   gyorsítótár kikapcsolva (no-store)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nleállítva")


if __name__ == "__main__":
    main()
