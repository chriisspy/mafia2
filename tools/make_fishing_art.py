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

# ---- every outfit casting the rod (PixelLab animate_image on his back sprite with a rod drawn IN FRONT of the body: the rod
#      pokes up beside the head; his note on the first try: "the rod is behind Beanie's back"). Sources: ../mafia2-art/fishing/rods/
#      <outfit>-cast_0..8.png (0 = the frame that was sent). Cleaning: PixelLab likes to draw a thin fishing line; outside the
#      standing body only blobs at least 2 px thick stay (the rod is 3 px thick, a line is 1), and loose crumbs go.
RSRC = '../mafia2-art/fishing/rods/'; os.makedirs(OUT + 'rods', exist_ok=True); rods = {}
for f in sorted(os.listdir(RSRC)):
    if not f.endswith('-cast_8.png'): continue
    name = f[:-11]; body0 = np.asarray(Image.open(f'assets/final/{name}/back.png').convert('RGBA'))[..., 3] > 0
    bw, bh = body0.shape[1], body0.shape[0]; box = np.zeros((64, 64), bool); box[max(0, 56 - bh - 3):60, max(0, 32 - bw // 2 - 4):min(64, 32 + bw // 2 + 5)] = True
    sh = np.zeros((64, 64 * 9, 4), np.uint8); tips = []
    for i in range(9):
        a = hard(Image.open(f'{RSRC}{name}-cast_{i}.png')); m = a[..., 3] > 0
        thick = nd.binary_opening(m, structure=np.ones((2, 2), bool)); thick = nd.binary_dilation(thick, iterations=1) & m
        m2 = np.where(box, m, thick & ~(a[..., :3].min(-1) > 150))   # and nothing pale out there: the rod is brown, a white streak is the line again
        lab, n = nd.label(m2)
        if n > 1: m2 = lab == np.bincount(lab[lab > 0]).argmax()
        a[~m2] = 0
        ys, xs = np.nonzero(a[..., 3]); out_ = ~box[ys, xs]
        if out_.any(): ys, xs = ys[out_], xs[out_]
        far = np.argmax((xs - 32) ** 2 + (ys - 46) ** 2)             # the rod tip: the pixel furthest from the body
        tips.append([int(xs[far]) - 32, int(ys[far]) - 56])           # measured from the middle of the feet
        sh[:, i * 64:(i + 1) * 64] = a
    Image.fromarray(sh).save(f'{OUT}rods/{name}.png', optimize=True); rods[name] = tips
json.dump(rods, open(OUT + 'rods.json', 'w'))
for old in ('beanie.png', 'beanie.json'):
    if os.path.exists(OUT + old): os.remove(OUT + old)

# ---- Fisherman Joe's stall (PixelLab map object 477e4fd3)
Image.fromarray(hard(Image.open(SRC + 'stall.png'))).save(OUT + 'stall.png', optimize=True)
# ---- a picture of each rod for Joe's shop (PixelLab map objects, 64 x 64: his ask, "images for the rods like we did for the case")
for k in ('twig', 'oak', 'steel', 'gold'): Image.fromarray(hard(Image.open(f'{SRC}rod-{k}.png'))).save(f'{OUT}rod-{k}.png', optimize=True)

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
print('fish', len(FISH_ORDER), '| water', out.shape, os.path.getsize(OUT + 'water.webp') // 1024, 'KB | rods', sorted(rods), '| walk', int(walk.sum()), '| splash frames', len(sp))
