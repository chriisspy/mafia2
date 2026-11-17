"""WALK UNDER THE TREES (17 Nov 2026, his ask: "remove trees from the map then place them back over so people can walk
under them like the light posts"). Run AFTER tools/make_bigmap.py:   python -I tools/make_trees.py   (from the game folder)

Reads  assets/xmas/day-big.webp  (the day ground with the trees painted on it) and  assets/xmas/block-big.png .
Finds every single tree and bush (the blocked blobs that are leaves, needles or a trunk; not water, ponds, fences, the
presents or the dark forest wall), splits blobs that are several trees into one piece per tree, and then:
  assets/xmas/trees.png + trees.json   every tree as its own little picture (packed on one sheet) with where it stands:
                                       [sheet x, sheet y, w, h, map x, map y, base y, foot x, foot half-width]
                                       (map x counts from the left edge of the big map picture)
  assets/xmas/day-big.webp             the same ground with the trees taken off (the snow under them filled in)
  assets/xmas/block-big.png            the same mask without the trees (the game blocks only each tree's foot)
The game draws the trees in order with the people, so you walk behind a tree and in front of it, like a lamp post.
The night ground keeps its trees painted on (nobody walks under them at night)."""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
X = 'assets/xmas/'; ART = '../mafia2-art/bigmap/'
PREVIEW = len(sys.argv) > 1 and sys.argv[1] == 'preview'
src = Image.open(ART + 'day-big-with-trees.png').convert('RGB')      # kept by make_bigmap.py: the ground before any tree is lifted
d = np.asarray(src).astype(int); H, W = d.shape[:2]
block = np.asarray(Image.open(ART + 'block-big.png').convert('L')) > 127      # the full mask (trees still in it)
r, g, b = d[..., 0], d[..., 1], d[..., 2]

# ---- what is leaf, needle, trunk; what is water, grass, the forest wall ----
leaf = (r < 115) & (g > r + 14) & (g < 170) & (b < 180) & ~(b > g + 45) & ~((g >= 104) & (b <= 40))   # dark green and teal; not the grass or the hedges the cabins stand in; not water
trunk = (r > g + 22) & (g > b + 12) & (r > 85) & (r < 215) & (b < 120)
wall = nd.binary_opening((r < 48) & (g < 82) & (b < 80), iterations=4)        # the solid dark forest in the top corners (a big mass, not the dark heart of a tree)
wl, wn = nd.label(wall); ws = nd.sum(wall, wl, range(1, wn + 1)); wall = np.isin(wl, [i + 1 for i, z in enumerate(ws) if z > 3000])
wall = nd.binary_dilation(wall, iterations=7)
water = nd.binary_opening((b > g + 25) & (g > r + 15) & (r < 125) & (b > 120), iterations=2)
water = nd.binary_dilation(water, iterations=4)
gate = nd.binary_dilation(block, iterations=1) & ~wall & ~water
yy, xx = np.mgrid[0:H, 0:W]; gate &= ((xx - 400) / 70.) ** 2 + ((yy - 372) / 50.) ** 2 > 1     # not the presents round the stage
T = nd.binary_closing((leaf | trunk) & gate, iterations=2) & gate
T = nd.binary_opening(T, iterations=1)
T[:, :4] = False; T[:, -4:] = False; T[:3] = False; T[-3:] = False
# small holes inside a tree (ornaments, snow on the branches) are the tree
holes = nd.binary_fill_holes(T) & ~T; hl, hn = nd.label(holes)
if hn:
    hs = nd.sum(holes, hl, range(1, hn + 1)); T |= np.isin(hl, [i + 1 for i, z in enumerate(hs) if z < 220]) & gate

def simple(m):
    """one tree or one bush: not too big, and it does not touch the edge of the map"""
    ys, xs = np.nonzero(m); w = xs.max() - xs.min() + 1; h = ys.max() - ys.min() + 1
    return 55 <= m.sum() <= 3400 and w <= 72 and h <= 100 and h >= .55 * w and xs.min() > 5 and xs.max() < W - 6 and ys.max() < H - 5

import cv2
bgr = np.ascontiguousarray(d[..., ::-1].astype(np.uint8))
lab, k = nd.label(T); seg = np.zeros((H, W), np.int32); nseg = 0; trees = []; solid = 0
for i, sl in enumerate(nd.find_objects(lab), 1):
    m = lab[sl] == i
    if m.sum() < 55: continue
    full = np.zeros((H, W), bool); full[sl] = m
    parts = []
    if simple(full): parts = [full]
    else:                                      # several trees touching: share the blob out from the middle of each tree
        pad = (slice(max(0, sl[0].start - 2), min(H, sl[0].stop + 2)), slice(max(0, sl[1].start - 2), min(W, sl[1].stop + 2)))
        mm = full[pad]; dist = nd.gaussian_filter(nd.distance_transform_edt(mm), 1.3)
        pk = (dist == nd.maximum_filter(dist, size=17)) & (dist > 3.5)
        mk, n = nd.label(nd.binary_dilation(pk, iterations=1))
        if n >= 2:
            markers = (mk + 1).astype(np.int32); markers[mm & (mk == 0)] = 0
            cv2.watershed(np.ascontiguousarray(bgr[pad]), markers)
            got = markers >= 2; ix = nd.distance_transform_edt(~got, return_distances=False, return_indices=True)
            markers = np.where(mm, markers[ix[0], ix[1]], 0)          # the thin lines between two trees go to the nearer one
            pieces = {q: markers == q for q in range(2, n + 2) if (markers == q).any()}
            # a trunk that was cut from its own tree goes back on it: a small piece joins the piece it touches most (if that still makes one tree)
            for q in sorted(pieces, key=lambda q: pieces[q].sum()):
                pm = pieces[q]
                if pm.sum() >= 420: continue
                ring = nd.binary_dilation(pm, iterations=2) & ~pm; best = None
                for o, om in pieces.items():
                    if o == q or om is None: continue
                    touch = (ring & om).sum()
                    if touch and (best is None or touch > best[0]): best = (touch, o)
                if best:
                    joined = pieces[best[1]] | pm; f2 = np.zeros((H, W), bool); f2[pad] = joined
                    if simple(f2): pieces[best[1]] = joined; pieces[q] = None
            for q, pm in pieces.items():
                if pm is None or pm.sum() < 55: continue
                f2 = np.zeros((H, W), bool); f2[pad] = pm
                if simple(f2): parts.append(f2)
    if not parts: solid += 1; continue
    for pm in parts:
        nseg += 1; seg[pm] = nseg; ys, xs = np.nonzero(pm); sl2 = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        trees.append((nseg, sl2, pm[sl2]))
# a trunk (or a tuft) left standing right under a lifted tree goes back on it
rest, rn0 = nd.label(T & (seg == 0))
for i, sl in enumerate(nd.find_objects(rest), 1):
    m = rest[sl] == i
    if not 8 <= m.sum() < 500: continue
    full = np.zeros((H, W), bool); full[sl] = m
    near = seg[nd.binary_dilation(full, iterations=3) & (seg > 0)]
    if not len(near): continue
    o = int(np.bincount(near).argmax()); joined = (seg == o) | full
    if simple(joined):
        seg[full] = o; ys, xs = np.nonzero(joined); sl2 = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        trees = [(q, s, mm) if q != o else (o, sl2, joined[sl2]) for q, s, mm in trees]
# a trunk that was lifted on its own (a dark gap under the leaves cut it off) goes back under the tree above it
for o in range(1, int(seg.max()) + 1):
    m = seg == o
    if not m.any() or m.sum() >= 450 or trunk[m].mean() < .5: continue
    ys, xs = np.nonzero(m); above = seg[max(0, ys.min() - 16):ys.min(), xs.min():xs.max() + 1]; above = above[(above > 0) & (above != o)]
    if not len(above): continue
    up = int(np.bincount(above).argmax()); joined = (seg == up) | m
    if simple(joined): seg[m] = up
# the rest of each tree: the snow on its top, its outline, the bits of his own mask round it (his mask is the true shape)
OX, W0, H0 = 120, 560, 750
centre = np.zeros((H, W), bool); centre[:H0, OX:OX + W0] = True
snow = (r > 140) & (g > 175) & (b > 205); tan = (r > 120) & (r > b + 18) & (g > b) & (r - g < 45) & (r + g + b > 330)
raw = nd.binary_opening(~(snow | tan), iterations=1)
for zone, cands, far, big in ((centre, block, 9, 450), (~centre, raw, 4, 200)):
    c = cands & zone & (seg == 0) & ~wall & ~water & ~T
    cl, cn = nd.label(c)
    if not cn: continue
    cs = nd.sum(c, cl, range(1, cn + 1)); c = np.isin(cl, [i + 1 for i, z in enumerate(cs) if z < big])
    dd, ix = nd.distance_transform_edt(seg == 0, return_indices=True)
    take = c & (dd <= far); lab2 = seg[ix[0], ix[1]]
    for o in np.unique(lab2[take]):
        joined = (seg == o) | (take & (lab2 == o))
        if simple(joined): seg[take & (lab2 == o)] = o
def whole(m, sl):
    """a real tree or bush, not a shard: big enough, not a sliver, not a piece of the dark forest wall"""
    h, w = m.shape; px = d[sl][m]
    dark = ((px[:, 0] < 48) & (px[:, 1] < 82) & (px[:, 2] < 80)).mean()
    return m.sum() >= 80 and w >= 8 and h >= 10 and m.sum() / (w * h) >= .36 and dark < .5 and trunk[sl][m].mean() < .6
for i, sl in enumerate(nd.find_objects(seg), 1):
    if sl is not None and not whole(seg[sl] == i, sl): seg[seg == i] = 0          # shards go back on the ground (and stay solid)
trees = [(i, sl, seg[sl] == i) for i, sl in enumerate(nd.find_objects(seg), 1) if sl is not None]
print(len(trees), 'trees and bushes lifted;', solid, 'thick clumps left solid')

if PREVIEW:
    out = d.copy().astype(float); rng = np.random.RandomState(3)
    for i, sl, m in trees:
        c = rng.randint(60, 255, 3); out[sl][m] = out[sl][m] * .45 + c * .55
        by = sl[0].stop - 1; out[max(0, by - 1):by + 1, sl[1].start:sl[1].stop] = (255, 0, 255)
    rest = block & ~np.isin(seg, [t[0] for t in trees]); out[rest] = out[rest] * .5 + np.array([255, 0, 0]) * .5
    Image.fromarray(out.astype(np.uint8)).resize((W * 2, H * 2), Image.NEAREST).save(ART + 'trees-preview.png'); sys.exit()

# ---- the sprites, packed on one sheet ----
items = []
for i, sl, m in trees:
    y0, x0 = sl[0].start, sl[1].start; h, w = m.shape
    spr = np.zeros((h, w, 4), np.uint8); spr[..., :3] = d[sl]; spr[..., 3] = m * 255
    rows = np.nonzero(m[max(0, h - 6):].any(0))[0]                       # the foot: the bottom rows
    fx = int(round(rows.mean())) + x0; fw = int(np.clip((rows.max() - rows.min()) / 2, 4, 11))
    items.append(dict(spr=spr, x=x0, y=y0, w=w, h=h, base=y0 + h, fx=fx, fw=fw))
items.sort(key=lambda t: -t['h'])
SW = 1024; px = py = 0; rowh = 0
for t in items:
    if px + t['w'] + 1 > SW: px = 0; py += rowh + 1; rowh = 0
    t['sx'], t['sy'] = px, py; px += t['w'] + 1; rowh = max(rowh, t['h'])
sheet = np.zeros((py + rowh, SW, 4), np.uint8)
for t in items: sheet[t['sy']:t['sy'] + t['h'], t['sx']:t['sx'] + t['w']] = t['spr']
Image.fromarray(sheet).save(X + 'trees.png', optimize=True)
items.sort(key=lambda t: t['base'])
json.dump([[int(v) for v in (t['sx'], t['sy'], t['w'], t['h'], t['x'], t['y'], t['base'], t['fx'], t['fw'])] for t in items], open(X + 'trees.json', 'w'), separators=(',', ':'))

# ---- the ground without them: every lifted pixel takes the colour of the nearest ground beside it, then a tidy ----
lift = np.isin(seg, [t[0] for t in trees])
grow = lift          # exactly the lifted pixels, so ground + trees is the very same picture as before
src_ok = ~grow & ~nd.binary_dilation(block | raw, iterations=2)        # fill from clean ground only: never from an outline, a shadow edge or a neighbour tree
idx = nd.distance_transform_edt(~src_ok, return_distances=False, return_indices=True)
g2 = d[idx[0], idx[1]].astype(np.uint8)
med = np.stack([nd.median_filter(g2[..., c], size=7) for c in range(3)], -1)
ground = d.astype(np.uint8).copy(); ground[grow] = med[grow]
Image.fromarray(ground).save(X + 'day-big.webp', lossless=True, quality=100, method=6)
# what still blocks you: his own mask in the middle (less the lifted trees), and in the new ground the water, the forest wall,
# the thick clumps that were not lifted, and anything else that is not snow, cobbles or dirt
rl, rn = nd.label(raw); rs = nd.sum(raw, rl, range(1, rn + 1)); raw = np.isin(rl, [i + 1 for i, z in enumerate(rs) if z >= 40])
clump = nd.binary_fill_holes(nd.binary_closing(T & ~lift, iterations=3))
newb = (raw & ~nd.binary_dilation(lift, iterations=2)) | clump | water | wall
JETTY = (695, 438, 753, 453); newb[JETTY[1]:JETTY[3], JETTY[0]:JETTY[2]] = False
oldb = nd.binary_opening(block & ~nd.binary_dilation(lift, iterations=3), iterations=1)
final = np.where(centre, oldb, newb)
Image.fromarray((final * 255).astype(np.uint8)).save(X + 'block-big.png', optimize=True)
print('sheet', sheet.shape[1], 'x', sheet.shape[0])
