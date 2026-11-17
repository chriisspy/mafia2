"""HIS DAY GROUND WITH NO PAINTED SINGLE TREES (18 Nov 2026, his rule: "the only stand alone trees on the map should be our
own trees and plants placed individually").
His FLOOR-NEW.png (mafia2-art) still has painted trees along the top (Christmas bow trees, snowy pines, round teal bushes).
Nano Banana painted them out of the whole map (mafia2-art/notrees/nt-1.png). This keeps HIS picture everywhere and takes the
painter's pixels only where a painted tree was, then snows over any round bush still standing on its own (one not touching the
dark forest: the bushes touching it are the forest's edge). Every tree or bush it takes away is listed with its foot, so
tools/rebuild_trees.py stands one of his cut-outs there.
Writes  mafia2-art/ground/his-day.png  (+ his-day-changes.png: where it differs from the old tree-less ground)
   and  mafia2-art/ground/his-day-trees.json  [[kind, foot x, foot y], ...]   (map-picture px)
Run:  python -I tools/make_his_day.py   (from the game folder), then tools/rebuild_trees.py"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
ART = '../mafia2-art/'

def big(m, n): return nd.binary_dilation(m, iterations=n) if n else m
def keep_big(m, n):
    l, k = nd.label(m); s = nd.sum(m, l, range(1, k + 1)); return np.isin(l, [i + 1 for i, z in enumerate(s) if z >= n])
def shrink(path, w, h):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int); cy, cx = a.shape[0] / h, a.shape[1] / w; out = np.zeros((h, w, 3), np.uint8)
    for y in range(h):
        for x in range(w):
            blk = a[int((y + .3) * cy):int((y + .7) * cy) + 1, int((x + .3) * cx):int((x + .7) * cx) + 1].reshape(-1, 3)
            out[y, x] = np.median(blk, axis=0)
    return out

his = np.asarray(Image.open(ART + 'FLOOR-NEW.png').convert('RGB')).copy(); H, W = his.shape[:2]
ai = shrink(ART + 'notrees/nt-1.png', W, H)
# the painter's picture sits a few pixels off his (taller by ~1%, 4 px lower): line it up first, or the trees' outlines stay
import cv2
g1 = cv2.GaussianBlur(np.asarray(Image.fromarray(his).convert('L')).astype(np.float32), (0, 0), 2)
g2 = cv2.GaussianBlur(np.asarray(Image.fromarray(ai).convert('L')).astype(np.float32), (0, 0), 2)
_, M_ = cv2.findTransformECC(g1, g2, np.eye(2, 3, dtype=np.float32), cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), None, 5)
ai = cv2.warpAffine(ai, M_, (W, H), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)

def parts(a):
    a = a.astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    trunk = (r > g + 22) & (g > b + 12) & (r > 70) & (r < 215) & (b < 120)
    bow = (r > 150) & (g < 80) & (b < 80)
    needle = (b > r + 20) & (r < 110) & (g < 160) & (b < 200)          # the pines' blue-green and the teal bushes
    leaf = (g > r + 15) & (g > b) & (r < 120) & (g < 170)               # the bow trees' green (not his bright grass)
    wall = keep_big(nd.binary_opening((r < 48) & (g < 82) & (b < 80), iterations=4), 3000)
    return trunk, bow, needle, leaf, wall

trunk, bow, needle, leaf, wall = parts(his)
grass = keep_big(nd.binary_opening((his[..., 1].astype(int) > his[..., 0] + 40) & (his[..., 1] > 150), iterations=2), 3000)   # the town's big lawns, not a tree's leaves
lake = keep_big(nd.binary_opening((his[..., 2].astype(int) > his[..., 0] + 60) & (his[..., 2] > 150) & (his[..., 0] < 120), iterations=2), 3000)
safe = big(grass, 3) | big(lake, 3)                                     # the town's grass and the lake are never touched
tree = (trunk | bow | needle | leaf) & ~wall & ~safe

# 1. his painted trees, picked out by eye on FLOOR-NEW (18 Nov): [kind of his cut-out, foot x, foot y, box round the tree and
# its shadow]. In each box every pixel the painter changed is taken from the painter (so no outline or shadow is left); the
# dark forest and the round bushes on its edge stay his.
PAINTED = [
    ('tallpine', 6, 116, (0, 0, 28, 122)), ('plant', 36, 90, (28, 64, 47, 93)), ('tallpine', 190, 106, (158, 30, 220, 112)),
    ('tallpine', 35, 196, (12, 106, 63, 202)), ('plant', 8, 152, (1, 131, 17, 155)), ('tallpine', 95, 196, (71, 117, 119, 203)),
    ('roundbush', 132, 186, (112, 147, 153, 191)), ('tallpine', 67, 240, (41, 157, 93, 247)), ('tallpine', 10, 240, (0, 162, 31, 247)),
    ('tallpine', 487, 53, (454, 0, 513, 61)), ('tallpine', 607, 134, (580, 57, 634, 141)), ('tallpine', 748, 94, (725, 10, 773, 101)),
    ('tallpine', 776, 179, (757, 36, 800, 186)), ('roundbush', 748, 181, (726, 144, 769, 186)), ('tallpine', 706, 254, (681, 166, 729, 263)),
]
out = his.copy(); feet = []; taken = np.zeros((H, W), bool)
dai = np.abs(ai.astype(int) - his.astype(int)).sum(-1)
for kind, fx, fy, (x0, y0, x1, y1) in PAINTED:                         # the whole box from the painter, but his dark forest
    box = np.zeros((H, W), bool); box[y0:y1, x0:x1] = True
    m = box & ~big(wall, 1); out[m] = ai[m]; taken |= m; feet.append([kind, fx, fy])
# bits of trunk or outline the painter left in a box (still as his were): the plain snow round them
o_ = out.astype(int); snowy = (o_.min(-1) > 140) & (o_[..., 2] >= o_[..., 0])
lawn = (o_[..., 1] > o_[..., 0] + 40) & (o_[..., 1] > 150)            # the town's grass, kept
hm = his.astype(int).mean(-1)
for kind, fx, fy, (x0, y0, x1, y1) in PAINTED:
    box = np.zeros((H, W), bool); box[y0:y1, x0:x1] = True
    bad = box & ~snowy & ~big(wall, 1) & ~lawn                         # anything in the box that is not snow
    bad = big(bad, 1) & box & ~snowy & ~big(wall, 1) & ~lawn
    lb_, nb_ = nd.label(bad)
    for j, sl in enumerate(nd.find_objects(lb_), 1):
        mm = np.zeros((H, W), bool); mm[sl] = lb_[sl] == j
        if (mm & parts(out)[2]).sum() > 150: continue                    # a whole bush the painter kept: his forest's edge
        ring = big(mm, 3) & ~mm & snowy
        if ring.sum() < 3: continue
        cols, cnt = np.unique(o_[ring].reshape(-1, 3), axis=0, return_counts=True); out[mm] = cols[cnt.argmax()]

# 2. round bushes still standing alone on the snow (not touching the dark forest): snow over them, his bush stands there
trunk2, bow2, needle2, leaf2, wall2 = parts(out)
bush = keep_big(nd.binary_fill_holes(nd.binary_closing(needle2 & ~wall2 & ~safe, iterations=2)), 80)
lb, nb = nd.label(bush); fringe = set(np.unique(lb[big(wall2, 3) & (lb > 0)])) - {0}
a = out.astype(int); snow = (a.min(-1) > 200)
for i, sl in enumerate(nd.find_objects(lb), 1):
    if i in fringe: continue
    m = lb[sl] == i; ys, xs = np.nonzero(m); ww = xs.max() - xs.min() + 1
    full = np.zeros((H, W), bool); full[sl] = m; full = big(full, 2)
    shade = big(full, 6) & ~full & (a.min(-1) > 140) & (a.min(-1) <= 200) & ~safe     # its grey-blue shadow on the snow
    full |= keep_big(shade, 1) & big(full, 6)
    ring = big(full, 4) & ~full & snow
    if ring.sum() < 10: continue
    cols, cnt = np.unique(a[ring].reshape(-1, 3), axis=0, return_counts=True)
    out[full & ~safe] = cols[cnt.argmax()]
    feet.append(['widebush' if ww >= 38 else 'roundbush' if ww >= 20 else 'plant', sl[1].start + int(round(xs.mean())), sl[0].start + int(ys.max()) + 1])
    taken |= full

Image.fromarray(out).save(ART + 'ground/his-day.png')
base = np.asarray(Image.open(ART + 'ground/base-no-trees-day.png').convert('RGB')).astype(int)
ch = nd.binary_opening(np.abs(out.astype(int) - base).sum(-1) > 30, iterations=1)
Image.fromarray((ch * 255).astype(np.uint8)).save(ART + 'ground/his-day-changes.png')
Image.fromarray((big(taken, 2) * 255).astype(np.uint8)).save(ART + 'ground/his-day-taken.png')
json.dump(feet, open(ART + 'ground/his-day-trees.json', 'w'))
print('painted trees taken off and listed for his cut-outs:', len(feet), {k: sum(f[0] == k for f in feet) for k in set(f[0] for f in feet)})
