"""HIS OWN TREES, PUT BACK WHERE THEY STOOD (17 Nov 2026, his plan).
He drew the cut-outs:  mafia2-art/plants-and-trees-cut-out-smaller.png  (plant, wide bush, small pine, round bush, tall pine,
each with a grey shadow). This:
  1. shrinks each to the size the trees are on the map (his file is ~15% bigger than game size; "now shrink them") by taking
     the middle of every art-pixel cell, and turns its grey shadow see-through ("make the shadows transparent");
  2. puts the right one on each of the 77 spots where a tree was lifted off the map (mafia2-art/bigmap/trees-spots.json),
     standing on the same foot. Which one goes where was decided by eye (KIND below, the numbers of mafia2-art/bigmap/tree-spots.png).
     Spots his sheet has no cut-out for (the round trees with bows, the frosty trees, bits of the edge forest) are NOT lifted:
     the ground there is put back exactly as it was (day and night), so they stay painted on the map and solid, as before;
  3. writes  assets/xmas/trees.png , trees-night.png (the same sheet in night colours) and trees.json
     [sheet x, sheet y, w, h, map x, map y, base y (the foot, not the shadow), foot x, foot half-width, kind]
     and copies the tree-less grounds in:  assets/xmas/day-big.webp , night-big.webp  (from tools/make_notrees.py).
Run:  python -I tools/place_trees.py   (from the game folder).  Add  preview  to only write mafia2-art/bigmap/placed-preview.png"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
ART = '../mafia2-art/'; BIG = ART + 'bigmap/'; X = 'assets/xmas/'
PREVIEW = len(sys.argv) > 1 and sys.argv[1] == 'preview'
NAMES = ['plant', 'widebush', 'smallpine', 'roundbush', 'tallpine']          # left to right on his sheet
SHADOW = (18, 28, 58, 96)                                                    # what his grey shadow becomes: dark and see-through
GAME_H = {'tallpine': 82}                                                    # the tall pines on the map are 82 px: everything is shrunk by the same amount
# spot number -> what stands there. A list = two things side by side in one spot (left part, right part).
KIND = {**{k: 'plant' for k in (8, 9, 13, 24, 28, 33, 37, 48, 51, 52, 63, 64)},
        **{k: 'roundbush' for k in (47, 59, 60, 62, 75)},
        **{k: 'widebush' for k in (18, 19, 30, 31, 36, 45, 58)},
        **{k: 'smallpine' for k in (39, 67)},
        **{k: 'tallpine' for k in (17, 23, 25, 38, 44, 49, 74, 76)},
        42: ['plant', 'widebush'], 77: ['widebush', 'plant'], 50: ['roundbush', 'roundbush'], 66: ['roundbush', 'roundbush'],
        # 18 Nov his call "just replace all of them with these new ones": the round trees with bows become his tall pines too
        **{k: 'tallpine' for k in (3, 4, 11, 14, 21, 22, 26, 29, 32, 35, 43, 54, 55, 61, 65)}, 34: 'widebush', 57: ['widebush', 'roundbush']}
# everything else on the list is a piece of the edge forest: it stays painted on exactly as it was ("edge forest stays the same")

# ---- 1. his cut-outs at game size ----
src = np.asarray(Image.open(ART + 'plants-and-trees-cut-out-smaller.png').convert('RGBA')).astype(int)
lab, n = nd.label(src[..., 3] > 0); boxes = sorted([sl for i, sl in enumerate(nd.find_objects(lab), 1) if (lab[sl] == i).sum() > 20], key=lambda s: s[1].start)
P = (boxes[NAMES.index('tallpine')][0].stop - boxes[NAMES.index('tallpine')][0].start) / GAME_H['tallpine']
def cells(a, ph_x, ph_y):
    h, w = a.shape[:2]; gw, gh = int(round((w - ph_x) / P)), int(round((h - ph_y) / P)); out = np.zeros((gh, gw, 4), np.uint8)
    for gy in range(gh):
        for gx in range(gw):
            cy = min(h - 1, int(ph_y + (gy + .5) * P)); cx = min(w - 1, int(ph_x + (gx + .5) * P)); out[gy, gx] = a[cy, cx]
    return out
VAR = {}
for name, sl in zip(NAMES, boxes):
    a = src[sl]; o = cells(a, 0, 0); o[..., 3] = np.where(o[..., 3] > 127, 255, 0)
    ys, xs = np.nonzero(o[..., 3]); o = o[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgb = o[..., :3].astype(int); h, w = o.shape[:2]
    grey = (o[..., 3] > 0) & (np.abs(rgb - (162, 164, 179)).sum(-1) < 45); grey[:int(h * .7)] = False        # his shadow: that flat grey, at the bottom
    solid = (o[..., 3] > 0) & ~grey
    o[grey] = SHADOW
    sy, sx = np.nonzero(solid); base = sy.max() + 1; foot = np.nonzero(solid[max(0, base - 5):base].any(0))[0]
    VAR[name] = dict(img=o, base=int(base), fx=int(round(foot.mean())), fw=int(np.clip((foot.max() - foot.min()) / 2, 3, 11)), w=w, h=h)
    print(name, w, 'x', h)

def shadow_for(w):
    """a see-through shadow for one of his own map trees (their painted shadow went with the ground)"""
    rx, ry = max(5, w * .32), 3.2; c = np.zeros((9, int(2 * rx) + 3, 4), np.uint8); yy, xx = np.mgrid[0:9, 0:c.shape[1]]
    c[((xx - c.shape[1] / 2 + .5) / rx) ** 2 + ((yy - 4) / ry) ** 2 <= 1] = SHADOW; return c

# ---- 2. what stands on each spot ----
old = np.asarray(Image.open(BIG + 'trees-sheet.png').convert('RGBA')); spots = json.load(open(BIG + 'trees-spots.json'))
H, W = 1000, 800; YY, XX = np.mgrid[0:H, 0:W]; OWN = []; REP = []
def feet(m, parts):
    """the foot of each part of a spot: the middle of its bottom rows (a spot of two things is split at its narrowest column)"""
    h, w = m.shape
    if parts == 1: cols = [range(w)]
    else:
        mass = m.sum(0).astype(float); lo, hi = int(w * .3), int(w * .7); cut = lo + int(np.argmin(mass[lo:hi])); cols = [range(0, cut), range(cut, w)]
    out = []
    for cr in cols:
        sub = np.zeros_like(m); sub[:, list(cr)] = m[:, list(cr)]; ys, xs = np.nonzero(sub)
        base = ys.max() + 1; b = np.nonzero(sub[max(0, base - 4):base].any(0))[0]; out.append((int(round(b.mean())), int(base)))
    return out
items = []                                                              # (img, map x, map y, base, foot x, foot half-w, kind)
for k, (sx, sy, w, h, x, y, base, fx, fw) in enumerate(spots, 1):
    kind = KIND.get(k, 'own'); spr = old[sy:sy + h, sx:sx + w]; m = spr[..., 3] > 0
    hole = np.zeros((H, W), bool); hole[y:y + h, x:x + w] |= m                          # the hole tools/make_notrees.py cut for this spot
    hole |= ((XX - fx) / max(9, w * .42)) ** 2 + ((YY - (base - 2)) / 6.) ** 2 < 1
    if kind == 'own': OWN.append(hole); continue
    REP.append(hole)
    kinds = kind if isinstance(kind, list) else [kind]
    for kd, (ffx, fbase) in zip(kinds, feet(m, len(kinds))):
        v = VAR[kd]; items.append((v['img'], x + ffx - v['fx'], y + fbase - v['base'], y + fbase, x + ffx, v['fw'], kd))
print({q: sum(1 for it in items if it[6] == q) for q in NAMES}, 'kept painted on:', len(OWN))
# the grounds: tree-less, except round the trees that stay painted on, where his map comes back exactly as it was
OX, W0, H0 = 120, 560, 750; centre = np.zeros((H, W), bool); centre[:H0, OX:OX + W0] = True
rep_core = nd.binary_dilation(np.any(REP, 0), iterations=1) if REP else np.zeros((H, W), bool)
own_d = nd.binary_dilation(np.any(OWN, 0), iterations=4) & ~rep_core
day_with = np.asarray(Image.open(BIG + 'day-big-with-trees.png').convert('RGB')); day_g = np.asarray(Image.open(BIG + 'day-no-trees.png').convert('RGB')).copy()
day_g[own_d] = day_with[own_d]
night_g = np.asarray(Image.open(BIG + 'night-no-trees.png').convert('RGB')).copy(); his_n = np.zeros_like(night_g); his_n[:H0, OX:OX + W0] = np.asarray(Image.open(X + 'night.png').convert('RGB'))
own_n = nd.binary_dilation(np.any(OWN, 0), iterations=10) & ~rep_core
night_g[own_n & centre] = his_n[own_n & centre]                                       # in his town: his own night trees
# THE JOIN (18 Nov, his note: "i dont want to see the harsh line from the map expansion"): along the edge of his picture the
# painter's version of the same place is mixed in, in little blobs that thin out over SEAM px, so there is no straight line.
# Only where both show the same kind of ground (snow and snow, forest and forest...). Night: a soft fade (his night is soft).
SEAM = 34
def kind_of(a):
    a = a.astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]; k = np.zeros(a.shape[:2], np.uint8)
    k[(r > 140) & (g > 175) & (b > 205)] = 1                                                   # snow
    k[(g > r + 30) & (g > b + 30) & (g > 100)] = 2                                             # grass
    k[(r < 70) & (g < 110) & (b < 110) & ~((g > r + 30) & (g > b + 30) & (g > 100))] = 3       # forest, dark
    k[(r > 120) & (r > b + 18) & (g > b) & (r - g < 45) & (r + g + b > 330)] = 4               # cobbles, dirt
    k[(b > g + 25) & (g > r + 15) & (r < 125) & (b > 120)] = 5                                 # water
    return k
def shrink(path, cache):
    try: return np.asarray(Image.open(cache).convert('RGB'))
    except FileNotFoundError: pass
    a = np.asarray(Image.open(path).convert('RGB')); sy, sx = a.shape[0] / H, a.shape[1] / W
    xs = [(int(round((x + .3) * sx)), int(round((x + .7) * sx)) + 1) for x in range(W)]
    ys = [(int(round((y + .3) * sy)), int(round((y + .7) * sy)) + 1) for y in range(H)]
    out = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        row = a[ys[y][0]:ys[y][1]]
        for x in range(W): out[y, x] = np.median(row[:, xs[x][0]:xs[x][1]].reshape(-1, 3), axis=0)
    Image.fromarray(out).save(cache); return out
dist_in = np.minimum.reduce([XX - OX, OX + W0 - 1 - XX, (H0 - 1 - YY) + 0 * XX]).astype(float)   # how far inside his picture (his top edge is the map's top edge: no join there)
band = centre & (dist_in < SEAM)
rng = np.random.RandomState(11); blob = nd.gaussian_filter(rng.rand(H, W), 1.3); blob = (blob - blob.min()) / (blob.max() - blob.min())
AI_D = shrink(BIG + 'bigmap-src.png', BIG + 'bigmap-src-800.png')
same = kind_of(AI_D) == kind_of(day_g)
take = band & same & (blob < 1 - dist_in / SEAM) & ~nd.binary_dilation(np.any(REP, 0), iterations=3)
day_g[take] = AI_D[take]
# little leftovers in the open (a shadow or a stump that was just outside a lifted tree's hole): back to the snow round them
k = kind_of(day_g); grey = (np.abs(day_g.astype(int) - day_g.astype(int).mean(-1, keepdims=True)).max(-1) < 22) & (day_g.mean(-1) > 105) & (day_g.mean(-1) < 212)
odd = (k == 0) | (k == 3) | grey
lab_, n_ = nd.label(odd); sz = nd.sum(odd, lab_, range(1, n_ + 1)); small = np.isin(lab_, [i + 1 for i, z in enumerate(sz) if z < 70])
ring = nd.binary_dilation(small, iterations=3) & ~small
snowy_ring = nd.uniform_filter((k == 1).astype(float), 9) > .6
SNOWMAN = (40, 470, 100, 520)                                                                # (map picture px) his snowman stays
keep_box = np.zeros((H, W), bool); keep_box[SNOWMAN[1]:SNOWMAN[3], SNOWMAN[0]:SNOWMAN[2]] = True
fix = small & snowy_ring & ~keep_box & ~nd.binary_dilation(own_d, iterations=2)
ix = nd.distance_transform_edt(fix | ~(k == 1), return_distances=False, return_indices=True)
day_g[fix] = day_g[ix[0], ix[1]][fix]
# night: the painter's whole night, its colours fitted once to his (the same fit everywhere, so it makes no line of its own),
# outside his picture; and a soft fade from his into it over the last NSEAM px inside his edge
NSEAM = 56
NI = shrink(BIG + 'night-notrees-src.png', BIG + 'night-notrees-800.png').astype(float)
fitm = centre & (dist_in > 4) & (dist_in < 120) & ~nd.binary_dilation(np.any(OWN, 0) | np.any(REP, 0), iterations=6)
A_ = np.c_[NI[fitm], np.ones(fitm.sum())]; coef = np.linalg.lstsq(A_, night_g[fitm].astype(float), rcond=None)[0]
NIc = np.clip(np.c_[NI.reshape(-1, 3), np.ones(H * W)] @ coef, 0, 255).reshape(H, W, 3)
w_ = np.where(centre, np.clip(1 - dist_in / NSEAM, 0, 1), 1.)[..., None]
night_g = np.round(night_g * (1 - w_) + NIc * w_).astype(np.uint8)
BLOCK_FULL = np.asarray(Image.open(BIG + 'block-big.png').convert('L')) > 127              # his mask + the new ground's, trees and all
block = BLOCK_FULL & ~(nd.binary_dilation(np.any(REP, 0), iterations=2) if REP else False)  # the lifted trees are not solid any more (only their feet, in the game)

# ---- 3. one sheet, the list, the grounds ----
def nightify(a):
    """a day tree at night: deep navy, the little lights left glowing, shadows left as they are"""
    o = a.astype(float).copy(); r, g, b = o[..., 0], o[..., 1], o[..., 2]; mx = o[..., :3].max(-1); mn = o[..., :3].min(-1)
    bulb = (((r > 190) & (g < 120)) | ((b > 190) & (r < 120) & (g < 170)) | ((r > 200) & (g > 170) & (b < 110))) & (a[..., 3] == 255)   # red, blue and gold bulbs only (not the bright leaves)
    dark = np.stack([r * .22 + 4, g * .30 + 10, b * .46 + 30], -1)
    o[..., :3] = np.where(bulb[..., None], o[..., :3] * .9, dark); o[a[..., 3] < 255] = a[a[..., 3] < 255]
    return o.clip(0, 255).astype(np.uint8)
SW = 512; px = py = rowh = 0; tiles = []; pos_of = {}
def put(img):
    global px, py, rowh
    key = id(img)
    if key in pos_of: return pos_of[key]
    h, w = img.shape[:2]
    if px + w + 1 > SW: px = 0; py += rowh + 1; rowh = 0
    pos = (px, py); tiles.append((pos, img)); px += w + 1; rowh = max(rowh, h); pos_of[key] = pos; return pos
out = []
for img, mx_, my_, base, ffx, ffw, kind in items:
    sx_, sy_ = put(img); out.append([sx_, sy_, img.shape[1], img.shape[0], int(mx_), int(my_), int(base), int(ffx), int(ffw), kind])
sheet = np.zeros((py + rowh, SW, 4), np.uint8)
for (tx, ty), img in tiles: sheet[ty:ty + img.shape[0], tx:tx + img.shape[1]] = img
out.sort(key=lambda t: (t[6], t[9] != 'shadow'))
def compose(ground, sh):
    c = Image.open(ground).convert('RGBA'); s = Image.fromarray(sh)
    for sx_, sy_, w, h, x, y, base, fx, fw, kind in out:
        c.alpha_composite(s.crop((sx_, sy_, sx_ + w, sy_ + h)), (max(0, x), max(0, y)), (max(0, -x), max(0, -y), w, h))
    return c.convert('RGB')
Image.fromarray(day_g).save(BIG + 'day-ground.png'); Image.fromarray(night_g).save(BIG + 'night-ground.png')
d = compose(BIG + 'day-ground.png', sheet); nt = compose(BIG + 'night-ground.png', nightify(sheet))
W, H = d.size; o = Image.new('RGB', (W * 2 + 10, H)); o.paste(d, (0, 0)); o.paste(nt, (W + 10, 0)); o.save(BIG + 'placed-preview.png')
if PREVIEW: sys.exit()
Image.fromarray(sheet).save(X + 'trees.png', optimize=True); Image.fromarray(nightify(sheet)).save(X + 'trees-night.png', optimize=True)
json.dump(out, open(X + 'trees.json', 'w'), separators=(',', ':'))
Image.fromarray(day_g).save(X + 'day-big.webp', lossless=True, quality=100, method=6)
Image.fromarray(night_g).save(X + 'night-big.webp', lossless=True, quality=100, method=6)
Image.fromarray((block * 255).astype(np.uint8)).save(X + 'block-big.png', optimize=True)
print('written:', len(out), 'pieces, sheet', sheet.shape[1], 'x', sheet.shape[0])
