"""THE FISHING LAKE (17 Nov 2026). The picture is Nano Banana's, drawn from a crop of his own town as the style reference
(source kept in Dropbox/Documents/claude chrispy/mafia2-art/fishing/lake-src.png, 1536 x 2752).
This turns it into real game pixels (the middle of every painted cell, a small palette) ->
  assets/fishing/lake.png         the scene
  assets/fishing/lake-water.png   WHITE = open water (where a float can land and fish can swim), found from the water's blue
Run:  python -I tools/make_fishing.py   (from the game folder)"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC = '../mafia2-art/fishing/lake-src.png'; OUT = 'assets/fishing/'; COLOURS = 96
os.makedirs(OUT, exist_ok=True)
a = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
H0, W0 = a.shape[:2]
# how big is one painted pixel? the size whose grid lines catch the most colour changes
ex = (np.abs(np.diff(a, axis=1)).sum(-1) > 50).sum(0).astype(float); ey = (np.abs(np.diff(a, axis=0)).sum(-1) > 50).sum(1).astype(float)
def best(e):
    out = []
    for c100 in range(400, 900, 2):
        c = c100 / 100; sc = max(e[np.round(np.arange(o, len(e), c)).astype(int).clip(0, len(e) - 1)].mean() for o in np.arange(0, c, .5))
        out.append((sc / e.mean(), c))
    return max(out)
(sx, cx), (sy, cy) = best(ex), best(ey)
cell = float(sys.argv[1]) if len(sys.argv) > 1 else (cx if sx > sy else cy)
print('cell', cx, round(sx, 2), cy, round(sy, 2), '-> using', cell)
def off(e):
    return max((e[np.round(np.arange(o, len(e), cell)).astype(int).clip(0, len(e) - 1)].mean(), o) for o in np.arange(0, cell, .5))[1] + 1
ox, oy = off(ex), off(ey)
W, H = int((W0 - ox) // cell), int((H0 - oy) // cell)
small = np.zeros((H, W, 3), np.uint8); m = max(1, int(cell * .25))
for y in range(H):
    y0, y1 = int(round(oy + y * cell)) + m, int(round(oy + (y + 1) * cell)) - m
    for x in range(W):
        x0, x1 = int(round(ox + x * cell)) + m, int(round(ox + (x + 1) * cell)) - m
        small[y, x] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)
img = Image.fromarray(small).quantize(COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
img.save(OUT + 'lake.png', optimize=True)
s = np.asarray(img).astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
water = (b > 105) & (b - r > 62) & (r < 100) & (g < 150)                 # the lake's blue (not the pale ice rim, not the snow)
water = nd.binary_opening(water, iterations=1); water = nd.binary_closing(water, iterations=2)
lab, n = nd.label(water); water = lab == np.bincount(lab[lab > 0]).argmax()
water = nd.binary_fill_holes(water) & ~nd.binary_dilation(~water & ((r > 90) & (g < 110) & (b < 90)), iterations=2)   # not under the boat or the jetty
water = nd.binary_erosion(water, iterations=3)
Image.fromarray((water * 255).astype(np.uint8)).save(OUT + 'lake-water.png', optimize=True)
print('->', img.size, 'water', int(water.sum()), 'px')
