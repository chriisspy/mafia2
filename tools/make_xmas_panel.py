"""The Christmas panel frame (13 Nov 2026, v2) -> assets/xmas/panel.svg, used as a CSS border-image on every .panel.
One art pixel = 2 screen pixels. 88 x 40 art pixels: 12 px corners, a 64 px top/bottom edge that repeats, 16 px sides.
  frame: a dark outline, two reds, a green line (4 px), set 3 px in from the picture's edge (5 px at the top, for the snow)
  top:   a lumpy drift of snow lying on the frame, hanging over its front edge
  top corners: a sprig of holly
Run:  python -I tools/make_xmas_panel.py   (from the game folder; writes a preview PNG next to the SVG too)"""
import random
from PIL import Image
W, H, C = 88, 40, 12
TOP, SIDE = 5, 3            # where the frame starts
PAL = {'k': '#2a0d14', 'r': '#b3202f', 'R': '#d8414a', 'd': '#7d1522', 'g': '#1f6b3a', 'G': '#2f8f4e', 'D': '#124526',
       'w': '#ffffff', 's': '#cfe1f7', 'S': '#a9c4e6', 'b': '#e4544f', 'B': '#ffb0a8', 'y': '#ffd25e', 'h': '#000000'}
px = [[None] * W for _ in range(H)]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[y][x] = c
# ---- the frame: rings from the outside in ----
x0, y0, x1, y1 = SIDE, TOP, W - 1 - SIDE, H - 1 - SIDE
for i, c in enumerate('kRrg'):
    for x in range(x0 + i, x1 - i + 1):
        put(x, y0 + i, c); put(x, y1 - i, 'd' if c == 'R' else c)
    for y in range(y0 + i, y1 - i + 1):
        put(x0 + i, y, c); put(x1 - i, y, 'd' if c == 'R' else c)
for cx, cy in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):      # nip the four outer corners
    put(cx, cy, None)
for (cx, cy), (dx, dy) in zip(((x0, y0), (x1, y0), (x0, y1), (x1, y1)), ((1, 1), (-1, 1), (1, -1), (-1, -1))):
    put(cx + dx, cy + dy, 'k')
for x in range(x0 + 1, x1 + 1):                             # the panel's shadow, drawn in: two soft-dark rows under the frame
    put(x, y1 + 1, 'h'); put(x, y1 + 2, 'h')
lite = [row[:] for row in px]      # the plain frame, for small panels (no snow, no holly)
# ---- the snow along the top: the same 64 px drift, so the edge tiles ----
import math
def wave(i, parts, lo, hi):
    v = sum(amp * math.sin(2 * math.pi * i / 64 * f + ph) for amp, f, ph in parts)
    return max(lo, min(hi, round(v)))
up = [wave(i, ((0, 0, 0),), 0, 0) + max(1, min(4, round(2.6 + 1.2 * math.sin(2 * math.pi * i / 64 * 2) + .8 * math.sin(2 * math.pi * i / 64 * 5 + 1)))) for i in range(64)]
down = [max(0, min(3, round(1.1 + 1.3 * math.sin(2 * math.pi * i / 64 * 3 + 2) + .7 * math.sin(2 * math.pi * i / 64 * 7)))) for i in range(64)]   # soft bumps hanging over the front edge
for x in range(x0 + 2, x1 - 1):
    i = (x - C) % 64
    top, bot = TOP - up[i], TOP + down[i]
    put(x, top - 1, 'k')
    for y in range(top, bot + 1): put(x, y, 'w')
    put(x, bot, 's')
for x in (x0 + 1, x1 - 1):                                   # the two ends slope off
    for y in range(TOP - 1, TOP + 1): put(x, y, 'w')
    put(x, TOP - 2, 'k'); put(x, TOP + 1, 's')
# ---- holly on the two top corners ----
HOLLY = ["..D......D..",
         ".DGD....DGD.",
         "DGgGD..DGgGD",
         ".DGgGDDGgGD.",
         "..DGgGGgGD..",
         "...DkbbkD...",
         "..kbbBkbbk..",
         "..kbBbkBbk..",
         "...kkbbkk...",
         "....kBbk....",
         ".....kk....."]
MAPH = {'D': 'D', 'G': 'G', 'g': 'g', 'k': 'k', 'b': 'b', 'B': 'B'}
for flip in (False, True):
    for yy, row in enumerate(HOLLY):
        for xx, ch in enumerate(row):
            if ch == '.': continue
            x = (W - 1 - xx) if flip else xx
            put(x, yy, MAPH[ch])
# ---- write the SVGs (runs of one colour) and a preview ----
def svg(grid, name):
    rects = []
    for y in range(H):
        x = 0
        while x < W:
            c = grid[y][x]
            if c is None: x += 1; continue
            n = 1
            while x + n < W and grid[y][x + n] == c: n += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="{PAL[c]}"' + (' fill-opacity=".5"' if c == 'h' else '') + '/>'); x += n
    open(name, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">' + ''.join(rects) + '</svg>')
    return len(rects)
rects = [0] * svg(px, 'assets/xmas/panel.svg'); svg(lite, 'assets/xmas/panel-lite.svg')
im = Image.new('RGBA', (W, H), (246, 223, 174, 255))
for y in range(H):
    for x in range(W):
        if px[y][x]:
            h = PAL[px[y][x]]; im.putpixel((x, y), (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255))
        elif y < TOP or x < SIDE or x > W - 1 - SIDE or y > H - 1 - SIDE: im.putpixel((x, y), (40, 50, 90, 255))
im.resize((W * 6, H * 6), Image.NEAREST).save('tools/xmas-panel-preview.png')
print('panel.svg', len(rects), 'rects')
