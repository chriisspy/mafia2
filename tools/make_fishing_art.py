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
# THE ROD IN THE HAND, ONE FOR EACH TIER (his ask, 17 Nov: "make on-hand items for each rod ... look really good and work with each
# character"). PixelLab's own rod is taken off every frame and a clean one is drawn in its place, from where it leaves the body to
# its tip: a 1 px core in the tier's colours inside a navy outline, so it is the same crisp rod on all 19 outfits and never bends
# or doubles. Where the rod crosses IN FRONT of the body its pixels are recoloured (only when the outfit has no colour of its own
# near PixelLab's rod brown, so a brown coat is never touched). -> assets/fishing/rods/<outfit>-<tier>.png
NAVY = (17, 36, 50)
TIERS = {   # len = how much of the length it keeps; core / hi = the two shades down its length; bands = [where, colour]; tip = colours of the last pixels
    'twig':  {'len': .8, 'core': (146, 94, 52), 'hi': (176, 122, 72), 'bands': [], 'tip': [(176, 122, 72)], 'nub': True},
    'oak':   {'len': 1, 'core': (186, 108, 50), 'hi': (222, 150, 80), 'bands': [(.3, (244, 204, 96)), (.65, (244, 204, 96))], 'tip': [(244, 204, 96), (244, 204, 96)]},
    'steel': {'len': 1, 'core': (150, 172, 204), 'hi': (228, 238, 250), 'bands': [(.0, (64, 72, 100)), (.08, (64, 72, 100)), (.16, (64, 72, 100))], 'tip': [(228, 84, 79), (228, 84, 79)]},
    'gold':  {'len': 1, 'core': (238, 182, 50), 'hi': (255, 240, 164), 'bands': [(.5, (255, 252, 226))], 'tip': [(126, 214, 255), (240, 252, 255)]}}
def line_px(x0, y0, x1, y1):
    n = int(max(abs(x1 - x0), abs(y1 - y0))); return [(int(round(x0 + (x1 - x0) * k / max(1, n))), int(round(y0 + (y1 - y0) * k / max(1, n)))) for k in range(n + 1)]
for f in sorted(os.listdir(RSRC)):
    if not f.endswith('-cast_8.png'): continue
    name = f[:-11]; back = np.asarray(Image.open(f'assets/final/{name}/back.png').convert('RGBA')); body0 = back[..., 3] > 0
    own = np.unique(back[body0][:, :3].reshape(-1, 3), axis=0).astype(int)                    # the outfit's own colours
    bw, bh = body0.shape[1], body0.shape[0]; box = np.zeros((64, 64), bool); box[max(0, 56 - bh - 1):60, max(0, 32 - bw // 2 - 3):min(64, 32 + bw // 2 + 4)] = True
    sheets = {t: np.zeros((64, 64 * 9, 4), np.uint8) for t in TIERS}; tips = {t: [] for t in TIERS}
    for i in range(9):
        a = hard(Image.open(f'{RSRC}{name}-cast_{i}.png')); m = a[..., 3] > 0
        thick = nd.binary_opening(m, structure=np.ones((2, 2), bool)); thick = nd.binary_dilation(thick, iterations=1) & m
        m2 = np.where(box, m, thick & ~(a[..., :3].min(-1) > 150))   # outside the body: only what is 2 px thick and not pale (PixelLab's fishing line is thin and white)
        lab, n = nd.label(m2)
        if n > 1: m2 = lab == np.bincount(lab[lab > 0]).argmax()
        a[~m2] = 0
        rod = (a[..., 3] > 0) & ~box; ys, xs = np.nonzero(rod)
        if len(xs) < 3:                                              # the rod is hidden behind him in this frame
            for t in TIERS: sheets[t][:, i * 64:(i + 1) * 64] = a; tips[t].append(tips[t][-1] if tips[t] else [8, -36])
            continue
        rl, rn = nd.label(rod, structure=np.ones((3, 3), bool)); edge = nd.binary_dilation(box, iterations=2)   # PixelLab sometimes draws two rods, or a loose one: keep the biggest piece that touches him
        best = max(range(1, rn + 1), key=lambda q: ((rl == q) & edge).any() * 1000 + (rl == q).sum()); ys, xs = np.nonzero(rl == best)
        hd = (xs - 34) ** 2 + (ys - 46) ** 2                         # measured from his hands
        far = np.argmax(hd); tx, ty = int(xs[far]), int(ys[far])     # its tip
        near = np.argmin(hd); ex, ey = int(xs[near]), int(ys[near])  # where it leaves the body
        wood = rod & (a[..., :3].astype(int).sum(-1) > 150); wcol = np.median(a[wood][:, :3], axis=0) if wood.sum() > 2 else np.array([150, 96, 52])
        clash = (np.abs(own - wcol).sum(-1) < 60).any()             # does the outfit wear a brown like the rod's?
        body = a.copy(); body[rod] = 0
        L = np.hypot(tx - ex, ty - ey); ux, uy = (tx - ex) / max(L, 1), (ty - ey) / max(L, 1)
        for t, T in TIERS.items():
            c = body.copy(); x1, y1 = ex + ux * L * T['len'], ey + uy * L * T['len']; px = line_px(ex, ey, x1, y1)
            for (x, y) in px:                                        # the navy outline first...
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    X_, Y_ = x + dx, y + dy
                    if 0 <= X_ < 64 and 0 <= Y_ < 64 and (not box[Y_, X_] or c[Y_, X_, 3] == 0): c[Y_, X_] = (*NAVY, 255)
            if T.get('nub') and len(px) > 8:                         # the twig has a little stump where a branch was
                x, y = px[int(len(px) * .45)]; nx, ny = int(round(x - uy * 2)), int(round(y + ux * 2))
                for X_, Y_ in ((nx, ny), (int(round(x - uy)), int(round(y + ux)))):
                    if 0 <= X_ < 64 and 0 <= Y_ < 64 and not box[Y_, X_]:
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (0, 0)):
                            if 0 <= X_ + dx < 64 and 0 <= Y_ + dy < 64 and c[Y_ + dy, X_ + dx, 3] == 0: c[Y_ + dy, X_ + dx] = (*NAVY, 255)
                        c[Y_, X_] = (*T['core'], 255)
            for k, (x, y) in enumerate(px):                          # ...then the core in the tier's colours
                if box[y, x] and body[y, x, 3]: continue
                col = T['hi'] if k % 3 == 1 else T['core']
                for at, bc in T['bands']:
                    if abs(k - at * (len(px) - 1)) < .75: col = bc
                if k >= len(px) - len(T['tip']): col = T['tip'][k - (len(px) - len(T['tip']))]
                c[y, x] = (*col, 255)
            # PixelLab's own rod where it shows INSIDE the body's box (beside the head, or lying across him) takes the tier's colour too, so no
            # brown wood is left on a steel or golden rod (his note: "remove the wood and make it all gold"). A pixel counts as rod when it is
            # on the rod's line, about PixelLab's wood colour, and has the dark outline on both sides of it: a brown coat never has that.
            yy, xx = np.nonzero(box & (c[..., 3] > 0)); col = c[yy, xx, :3].astype(int)
            tt = (xx - ex) * ux + (yy - ey) * uy; dist = np.abs((xx - ex) * uy - (yy - ey) * ux)
            dark = c[..., :3].astype(int).sum(-1) < 190
            def flank(sg):
                X_ = np.clip(np.round(xx + sg * -uy * 1.2).astype(int), 0, 63); Y_ = np.clip(np.round(yy + sg * ux * 1.2).astype(int), 0, 63)
                return dark[Y_, X_] | (c[Y_, X_, 3] == 0)
            woody = (col[:, 0] > col[:, 2] + 30) & (np.abs(col - wcol).sum(-1) < 80)
            hit = (dist < 1.6) & (tt < 2) & (tt > -22) & woody & flank(1) & flank(-1) & (not clash or ((dist < 1.1) & (tt > -6)))   # an outfit that wears the rod's brown: only right where the rod enters
            for k_ in np.nonzero(hit)[0]: c[yy[k_], xx[k_], :3] = T['hi'] if int(round(-tt[k_])) % 3 == 1 else T['core']
            sheets[t][:, i * 64:(i + 1) * 64] = c; tips[t].append([int(round(x1)) - 32, int(round(y1)) - 56])   # the tip, measured from the middle of the feet
    for t in TIERS: Image.fromarray(sheets[t]).save(f'{OUT}rods/{name}-{t}.png', optimize=True)
    if os.path.exists(f'{OUT}rods/{name}.png'): os.remove(f'{OUT}rods/{name}.png')
    rods[name] = tips
json.dump(rods, open(OUT + 'rods.json', 'w'))
for old in ('beanie.png', 'beanie.json'):
    if os.path.exists(OUT + old): os.remove(OUT + old)

# ---- Fisherman Joe's stall (PixelLab map object 477e4fd3)
Image.fromarray(hard(Image.open(SRC + 'stall.png'))).save(OUT + 'stall.png', optimize=True)
# ---- a picture of each rod for Joe's shop (PixelLab map objects, 64 x 64: his ask, "images for the rods like we did for the case")
for k in ('twig', 'oak', 'steel', 'gold'): Image.fromarray(hard(Image.open(f'{SRC}rod-{k}.png'))).save(f'{OUT}rod-{k}.png', optimize=True)
# ---- the bait icon (PixelLab create_image_pixen, 16 x 16: a fat pink worm (his pick: the first of three); his ask: an icon for buying bait and for the bait counter, at the small pixel scale)
Image.fromarray(hard(Image.open(SRC + 'bait-a.png'))).save(OUT + 'bait.png', optimize=True)
# ---- the rod on the lake's Fish button (PixelLab create_image_pixen, 16 x 16)
Image.fromarray(hard(Image.open(SRC + 'rod-icon.png'))).save(OUT + 'rod-icon.png', optimize=True)

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
