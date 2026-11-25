"""THE WIDER FISHING LAKE (25 Nov 2026, his new base map: mafia2-art/fishing/Lake-Map.png, 850 x 474, the same pixel scale as the old
266 x 478 lake; the jetty and the boat sit at old + (292, -2)). Copies the picture in and builds what the game needs from it:
  assets/fishing/lake.png         his picture, untouched
  assets/fishing/lake-water.png   WHITE = open water (floats land and fish swim here), the same recipe as tools/make_fishing.py
  assets/fishing/lake-walk.png    WHITE = where you can walk: the snow and the jetty planks; not the water, the icy cliffs, rocks, posts, the boat
  assets/fishing/water.webp/.json the ripple, laid over the new water (the same recipe as tools/make_fishing_art.py)
The MAP BUILDER ('The Lake') edits lake-walk.png after this; running this again overwrites his edits (pass --keep-walk to leave it alone).
Run:  python -I tools/make_lake.py   (from the game folder)"""
import json, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC = '../mafia2-art/fishing/Lake-Map.png'; PL = '../mafia2-art/fishing/pl/'; OUT = 'assets/fishing/'
SPAWN = (432, 450)
shutil.copyfile(SRC, OUT + 'lake.png')
lake = np.asarray(Image.open(SRC).convert('RGB')); H, W = lake.shape[:2]
s = lake.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]

# ---- the water
blue = (b > 105) & (b - r > 62) & (r < 100) & (g < 150)
water = nd.binary_closing(nd.binary_opening(blue, iterations=1), iterations=2)
lab, n = nd.label(water); pond = lab == np.bincount(lab[lab > 0]).argmax()
wood = (r > 70) & (r > b + 35) & (g < r)
water = nd.binary_fill_holes(pond) & ~nd.binary_dilation(wood, iterations=2)          # not under the boat, the posts or the jetty
water = nd.binary_erosion(water, iterations=3)
lab, n = nd.label(water); water = lab == np.bincount(lab[lab > 0]).argmax()
Image.fromarray((water * 255).astype(np.uint8)).save(OUT + 'lake-water.png', optimize=True)

# ---- where you can walk
if '--keep-walk' not in sys.argv:
    box = np.zeros((H, W), bool); box[316:422, 400:464] = True
    jetty = nd.binary_erosion(nd.binary_fill_holes(nd.binary_closing(wood & box, iterations=3)), iterations=3)
    dark = r < 150                                                                       # the lake, the icy cliff faces, rocks, posts, the boat
    lab, n = nd.label(nd.binary_closing(dark, iterations=1)); size = np.bincount(lab.ravel())
    solid = (size[lab] >= 14) & (lab > 0)                                                # (a speck of snow shading is not a rock)
    wet = nd.binary_dilation(nd.binary_fill_holes(pond), iterations=2)
    walk = ~nd.binary_dilation(solid, iterations=2) & ~wet
    walk = nd.binary_opening(walk, iterations=1)
    walk |= jetty; walk[408:424, 416:450] = True                                         # the step from the bank onto the planks
    walk[:3] = False; walk[:, :3] = False; walk[:, -3:] = False                          # (the bottom edge stays: the path out)
    lab, n = nd.label(walk); walk = lab == lab[SPAWN[1], SPAWN[0]]
    Image.fromarray((walk * 255).astype(np.uint8)).save(OUT + 'lake-walk.png', optimize=True)

# ---- the ripple
wet2 = nd.binary_dilation(water, iterations=2); lf = lake.astype(np.float32)
f0 = np.asarray(Image.open(PL + 'w2_0.png').convert('RGB')).astype(np.float32); N = 128
frames = [np.asarray(Image.open(f'{PL}w2_{i}.png').convert('RGB')).astype(np.float32) - f0 for i in range(8)]
frames = [d - d.mean((0, 1)) for d in frames]
win = 1 - np.abs((np.arange(N) + .5) / N * 2 - 1)
yy, xx = np.mgrid[0:H, 0:W]
ys, xs = np.nonzero(wet2); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
out = np.zeros((y1 - y0, (x1 - x0) * 8, 4), np.uint8)
for i, d in enumerate(frames):
    acc = np.zeros((H, W, 3), np.float32); wsum = np.zeros((H, W), np.float32)
    for oy in (0, N // 2):
        for ox in (0, N // 2):
            u, v = (xx + ox) % N, (yy + oy) % N; w = win[u] * win[v]
            acc += d[v, u] * w[..., None]; wsum += w
    f = np.clip(lf + acc / np.maximum(wsum, 1e-3)[..., None] * 1.5, 0, 255)
    cell = np.zeros((H, W, 4), np.uint8); cell[..., :3] = f.round(); cell[..., 3] = wet2 * 255
    out[:, i * (x1 - x0):(i + 1) * (x1 - x0)] = cell[y0:y1, x0:x1]
Image.fromarray(out).save(OUT + 'water.webp', lossless=True, quality=100, method=6)
json.dump({'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'n': 8}, open(OUT + 'water.json', 'w'))
print('lake', (W, H), '| water', int(water.sum()), 'px, ripple at', (int(x0), int(y0), int(x1 - x0), int(y1 - y0)))
