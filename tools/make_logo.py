# bit:hub logo generalasa a bit:plot vizualis nyelveben:
# feher fogaskerekek rez kontorral, rez szinatmenettel, osszekoto karokkal.
#
# Geometria: a fogaskerekek NEM erhetnek a kozepso korhoz, kulonben
# osszefolyik a rajz; a karoknak latszaniuk kell a ket alakzat kozott.

import math
import pathlib

# A rajzteret a KULSO burkolobol szamoljuk, kulonben a felso
# fogaskerek lelog: CY >= DIST + R_GEAR_OUT + keret.
W, H = 248, 232
CX, CY = 124, 138

R_HUB = 42          # kozepso kor sugara
R_GEAR_OUT = 34     # fogaskerek kulso sugara
R_GEAR_IN = 26
DIST = 96           # kozeppont -> fogaskerek kozeppont
# ellenorzes: DIST - R_GEAR_OUT = 62 > R_HUB = 42  -> 20 egysegnyi lathato kar

ANGLES = [-90, 30, 150]


def gear_path(cx, cy, r_out, r_in, teeth=10, ratio=0.5):
    pts = []
    step = 2 * math.pi / teeth
    half = step * ratio / 2
    for i in range(teeth):
        a = i * step
        for ang, r in ((a - half, r_out), (a + half, r_out),
                       (a + step / 2 - half, r_in), (a + step / 2 + half, r_in)):
            pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"


GLYPHS = [
    # homero
    '<path d="M0 -12a4 4 0 0 0-4 4v12a7 7 0 1 0 8 0v-12a4 4 0 0 0-4-4z"'
    ' fill="none" stroke="url(#cu)" stroke-width="3"/>'
    '<circle cy="8" r="3.8" fill="url(#cu)"/>'
    '<rect x="-1.5" y="-4" width="3" height="12" rx="1.5" fill="url(#cu)"/>',

    # kozlekedesi lampa
    '<rect x="-7" y="-13" width="14" height="26" rx="4.5" fill="none"'
    ' stroke="url(#cu)" stroke-width="3"/>'
    '<circle cy="-7" r="2.8" fill="url(#cu)"/>'
    '<circle cy="0" r="2.8" fill="url(#cu)" opacity="0.4"/>'
    '<circle cy="7" r="2.8" fill="url(#cu)" opacity="0.4"/>',

    # vizcsepp
    '<path d="M0 -13s9 10 9 15a9 9 0 0 1-18 0c0-5 9-15 9-15z"'
    ' fill="none" stroke="url(#cu)" stroke-width="3"/>',
]

arms, gears = [], []
for i, deg in enumerate(ANGLES):
    a = math.radians(deg)
    gx, gy = CX + math.cos(a) * DIST, CY + math.sin(a) * DIST
    arms.append(
        f'<line x1="{CX + math.cos(a) * (R_HUB - 6):.1f}"'
        f' y1="{CY + math.sin(a) * (R_HUB - 6):.1f}"'
        f' x2="{gx:.1f}" y2="{gy:.1f}"'
        f' stroke="url(#cu)" stroke-width="8" stroke-linecap="round"/>')
    gears.append(
        f'<path d="{gear_path(gx, gy, R_GEAR_OUT, R_GEAR_IN)}" fill="#fff"'
        f' stroke="url(#cu)" stroke-width="4.5" stroke-linejoin="round"/>'
        f'<g transform="translate({gx:.1f} {gy:.1f})">{GLYPHS[i]}</g>')

# Kozep: radio-adas jel. Kis meretben is felismerheto, es pont azt mondja,
# ami a bit:hub dolga — ez a csomopont, ami mindenkit hall.
hub = (
    '<circle r="5.5" fill="url(#cu)"/>'
    '<path d="M-11 -9a14 14 0 0 0 0 18M-19 -16a24 24 0 0 0 0 32"'
    ' fill="none" stroke="url(#cu)" stroke-width="3.6" stroke-linecap="round"/>'
    '<path d="M11 -9a14 14 0 0 1 0 18M19 -16a24 24 0 0 1 0 32"'
    ' fill="none" stroke="url(#cu)" stroke-width="3.6" stroke-linecap="round"/>'
)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img"
     aria-label="bit:hub">
  <defs>
    <linearGradient id="cu" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c2723a"/>
      <stop offset="0.55" stop-color="#9a4f28"/>
      <stop offset="1" stop-color="#6f3618"/>
    </linearGradient>
  </defs>

  {"".join(arms)}
  {"".join(gears)}

  <circle cx="{CX}" cy="{CY}" r="{R_HUB}" fill="#fff" stroke="url(#cu)" stroke-width="5"/>
  <g transform="translate({CX} {CY})">{hub}</g>
</svg>
'''

out = pathlib.Path(r"C:\Users\gaalb\OneDrive - Eotvos Lorand Tudomanyegyetem Informatikai Kar\ELTE-Munka\IoT_rendszer\bit-hub-server\img\bit-hub-logo.svg")
out.write_text(svg, encoding="utf-8")
print("kesz:", out.name, len(svg), "bajt")
print("lathato kar hossza:", DIST - R_GEAR_OUT - R_HUB, "egyseg")
