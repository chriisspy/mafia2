"""EVERYTHING THE FISHING GAME DRAWS, apart from the lake itself (that is tools/make_fishing.py). 17 Nov 2026.
All of it is PixelLab's (his call: "use pixellabs for the animations, effects"), kept as it came in
Dropbox/Documents/claude chrispy/mafia2-art/fishing/pl/ and packed here into assets/fishing/:
  fish.png         the 12 things you can catch, one 48 x 32 cell each, all facing left (order = FISH_ORDER below)
  water.webp       the lake's ripple: 8 frames side by side, only the water (see water.json for where it sits on the lake).
                   PixelLab animated one 128 x 128 patch of open water into a loop; the CHANGE in each frame is laid over
                   the whole lake (four overlapping copies, so no tile edge shows) and added to the painted water.
  beanie.png       Beanie fishing, 64 x 64 cells: 0-8 the cast, 9-10 pulling on the rod. beanie.json: the rod tip in each.
  splash.png       the splash, 48 x 48 cells
  lake-walk.png    WHITE = where you can walk: the jetty planks and the snowy bank below it
Run:  python -I tools/make_fishing_art.py   (from the game folder, after make_fishing.py)"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC = '../mafia2-art/fishing/pl/'; OUT = 'assets/fishing/'
FISH_ORDER = ['boot', 'can', 'minnow', 'perch', 'carp', 'sunfish', 'trout', 'pike', 'catfish', 'koi', 'eel', 'gold', 'cod']
FLIP = {'minnow', 'cod'}                       # these two came out facing right

def hard(im):                                  # no half see-through pixels
    a = np.asarray(im.convert('RGBA')).copy(); a[..., 3] = np.where(a[..., 3] > 127, 255, 0); a[a[..., 3] == 0] = 0; return a

# ---- the fish
sheet = np.zeros((32, 48 * len(FISH_ORDER), 4), np.uint8)
for i, k in enumerate(FISH_ORDER):
    a = hard(Image.open(f'{SRC}{k}.png'))
    if k == 'boot':                            # the boot came with a puddle: keep the boot only
        lab, n = nd.label(a[..., 3] > 0); a[lab != np.bincount(lab[lab > 0]).argmax()] = 0
    if k in FLIP: a = a[:, ::-1]
    sheet[:, i * 48:(i + 1) * 48] = a
Image.fromarray(sheet).save(OUT + 'fish.png', optimize=True)

# ---- the ripple
lake = np.asarray(Image.open(OUT + 'lake.png').convert('RGB')).astype(np.float32); H, W = lake.shape[:2]
water = np.asarray(Image.open(OUT + 'lake-water.png').convert('L')) > 127
water = nd.binary_dilation(water, iterations=2)
f0 = np.asarray(Image.open(SRC + 'w2_0.png').convert('RGB')).astype(np.float32); N = 128
frames = [np.asarray(Image.open(f'{SRC}w2_{i}.png').convert('RGB')).astype(np.float32) - f0 for i in range(8)]
frames = [d - d.mean((0, 1)) for d in frames]  # the brightness never drifts: only the pattern moves
ramp = np.abs((np.arange(N) + .5) / N * 2 - 1); win = 1 - ramp       # 0 at the patch edge, 1 in its middle
yy, xx = np.mgrid[0:H, 0:W]
ys, xs = np.nonzero(water); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
out = np.zeros((y1 - y0, (x1 - x0) * 8, 4), np.uint8)
for i, d in enumerate(frames):
    acc = np.zeros((H, W, 3), np.float32); wsum = np.zeros((H, W), np.float32)
    for oy in (0, N // 2):
        for ox in (0, N // 2):
            u, v = (xx + ox) % N, (yy + oy) % N; w = win[u] * win[v]
            acc += d[v, u] * w[..., None]; wsum += w
    f = np.clip(lake + acc / np.maximum(wsum, 1e-3)[..., None] * 1.5, 0, 255)
    cell = np.zeros((H, W, 4), np.uint8); cell[..., :3] = f.round(); cell[..., 3] = water * 255
    out[:, i * (x1 - x0):(i + 1) * (x1 - x0)] = cell[y0:y1, x0:x1]
Image.fromarray(out).save(OUT + 'water.webp', lossless=True, quality=100, method=6)
json.dump({'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'n': 8}, open(OUT + 'water.json', 'w'))

# ---- Beanie with the rod
cells = [f'cast_{i}' for i in range(9)] + ['reel_4', 'reel_5']
sh = np.zeros((64, 64 * len(cells), 4), np.uint8); tips = []
for i, k in enumerate(cells):
    a = hard(Image.open(f'{SRC}{k}.png'))
    lab, n = nd.label(a[..., 3] > 0)
    if n > 1: a[lab != np.bincount(lab[lab > 0]).argmax()] = 0       # loose crumbs
    ys, xs = np.nonzero(a[..., 3]); far = np.argmax((xs - 32) ** 2 + (ys - 46) ** 2)   # the rod tip: the pixel furthest from the body
    tips.append([int(xs[far]) - 32, int(ys[far]) - 56])               # measured from the middle of the feet
    sh[:, i * 64:(i + 1) * 64] = a
Image.fromarray(sh).save(OUT + 'beanie.png', optimize=True)
json.dump({'cell': 64, 'feet': [32, 56], 'tips': tips}, open(OUT + 'beanie.json', 'w'))

# ---- the splash
sp = sorted(f for f in os.listdir(SRC) if f.startswith('splash_'))
if sp:
    s = np.zeros((48, 48 * len(sp), 4), np.uint8)
    for i, f in enumerate(sp): s[:, i * 48:(i + 1) * 48] = hard(Image.open(SRC + f))
    Image.fromarray(s).save(OUT + 'splash.png', optimize=True)

# ---- where you can walk
s = lake.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
wood = (r > 70) & (r > b + 35) & (g < r)
box = np.zeros((H, W), bool); box[318:424, 108:172] = True
jetty = nd.binary_closing(wood & box, iterations=3); jetty = nd.binary_fill_holes(jetty); jetty = nd.binary_erosion(jetty, iterations=3)
snow = (r > 185) & (g > 205) & (b > 225)
bank = np.zeros((H, W), bool); bank[416:476, 84:226] = True
bank &= nd.binary_opening(snow, iterations=1)
walk = jetty | bank
walk[410:426, 124:158] = True                   # the step from the bank onto the planks
lab, n = nd.label(walk); walk = lab == lab[452, 140]
Image.fromarray((walk * 255).astype(np.uint8)).save(OUT + 'lake-walk.png', optimize=True)
print('fish', len(FISH_ORDER), '| water', out.shape, os.path.getsize(OUT + 'water.webp') // 1024, 'KB | tips', tips, '| walk', int(walk.sum()), '| splash frames', len(sp))
