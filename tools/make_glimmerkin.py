"""THE GLIMMERKIN (25 Nov 2026, the secret quest): Pip and King Olloran as cast characters. Nano Banana (his ask: "make the characters in
nano banana pro, like the blacksmith and mechanic"), four views in a row on magenta, the race cast sheet as the style reference
-> ../mafia2-art/quest/pip-e.png (remade in the King's style, his ask), king-b.png (his pick for the King). Same method as the mechanic (tools/make_race.py): sample the painted cells, key the magenta.
  -> assets/final/pip/{front,right,back,left}.png, assets/final/king/...
Run:  python -I tools/make_glimmerkin.py   (from the game folder)"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
# the mechanic's helpers, copied from tools/make_race.py (importing it would rebuild the whole race track)
def phase(a, cell):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        n = len(d) - 1
        sc = [d[np.round(np.arange(p, n, cell)).astype(int)].sum() for p in np.arange(0, cell, .5)]
        out.append((int(np.argmax(sc)) * .5 + 1) % cell)
    return out

def cell_size(a, lo=10.0, hi=50.0):
    """the AI's pixel size: the spacing whose grid lines catch the most colour edges"""
    best = (0, 0)
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1).astype(float)
        for c in np.arange(lo, hi, .1):
            n = len(d) - 1
            sc = max(d[np.round(np.arange(p, n, c)).astype(int)].mean() for p in np.linspace(0, c, 16, endpoint=False))
            if sc > best[0] * 1.08: best = (sc, round(float(c), 1))
    return best[1]

def sample(a, cell, grid=True):
    ox, oy = phase(a, cell) if grid else (0, 0); H, W = int((a.shape[0] - oy) // cell), int((a.shape[1] - ox) // cell)
    m = max(1, int(cell * .25)) if cell >= 4 else 0; small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0 = int(round(oy + y * cell)); row = a[y0 + m:max(y0 + m + 1, int(round(oy + (y + 1) * cell)) - m)]
        for x in range(W):
            x0 = int(round(ox + x * cell)); small[y, x] = np.median(row[:, x0 + m:max(x0 + m + 1, int(round(ox + (x + 1) * cell)) - m)].reshape(-1, 3), axis=0)
    return small

def keyed(small):
    s = small.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
    return ((r > 120) & (b > 120) & (g < 110) & (r > g + 70) & (b > g + 70)) | ((b > 90) & (r > g + 35) & (b > g + 45) & (abs(r - b) < 70))

# ---- THE GROUND, round 3 (24 Nov, his note: "the race map looks like it lost the pixel art style in some areas. please rework this with
# nano banana pro ... a cool grassy race track full of details that a race track would have") ----
# One 4K picture cannot hold a 2250-pixel-wide map as real pixel art (the AI draws nothing finer than about 4 of its own pixels), which is
# why round 2 went soft. So: ONE master picture of the whole circuit (track2-master.png, painted to layout-sketch-grass.png), then its four
# overlapping quarters each redrawn at 4K as fine pixel art (track2-tl/tr/bl/br.png: 4 source pixels = 1 game pixel, they keep the master's
# layout to the pixel). Each quarter is cut to game pixels, toned to the master, and the four are joined along the paths where they differ least.
TW, TH, OX, OY = 1200, 896, 1050, 784          # a quarter in game pixels; where the right / lower quarters start. The world is 2250 x 1680.
QUARTERS = {'tl': (0, 0), 'tr': (2240, 0), 'bl': (0, 1672), 'br': (2240, 1672)}   # where each quarter was cut from the 4800 x 3584 master (2560 x 1912 each)

for name, src in (('pip', 'pip-e.png'), ('king', 'king-b.png')):   # king-b: his pick
    a = np.asarray(Image.open('../mafia2-art/quest/' + src).convert('RGB'))
    cell = float(sys.argv[1]) if len(sys.argv) > 1 else cell_size(a)
    small = sample(a, cell); solid = ~keyed(small)
    solid = nd.binary_opening(solid, iterations=1) | (solid & nd.binary_erosion(solid, iterations=1))
    lab, n = nd.label(solid, structure=np.ones((3, 3)))
    boxes = sorted([(i + 1, sl) for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 120], key=lambda b: b[1][1].start)
    os.makedirs(f'assets/final/{name}', exist_ok=True)
    print(name, 'cell', round(cell, 2), 'pieces', len(boxes))
    for nm, (li, sl) in zip(['front', 'right', 'back', 'left'], boxes):   # only this view's own pixels (a neighbour's tail can poke into its box)
        piece = np.asarray(Image.fromarray(np.ascontiguousarray(small[sl])).quantize(40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
        img = np.dstack([piece, (lab[sl] == li).astype(np.uint8) * 255]); ys, xs = np.nonzero(img[..., 3]); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(img).save(f'assets/final/{name}/{nm}.png', optimize=True); print(' ', nm, img.shape[1], 'x', img.shape[0])
