"""The four corner forests (18 Nov 2026, his ask: "design edge forests for each corner of the map in our style").
The SHAPE of each corner forest on the 800 x 1000 map: thick in the corner, thinning along the two map edges, never over a
path, the grass, the lake/pond, the Tavern/Casino or the front of a cabin. Used by tools/rebuild_trees.py (the forests are
painted on the ground, solid) and to ask Nano Banana for the art.  BOXES: name -> (x0, y0, x1, y1) of the picture."""
import numpy as np
from scipy import ndimage as nd
H, W, OX = 1000, 800, 120
BOXES = {'tl': (0, 0, 320, 320), 'tr': (480, 0, 800, 320), 'bl': (0, 680, 320, 1000), 'br': (480, 680, 800, 1000)}   # 18 Nov: the corner pictures the painter was shown (no shapes any more, his call)
CABINS = [[0, 212, -12], [1, 83, 56], [2, 341, 56], [3, 10, 190], [4, 414, 190], [5, 10, 356], [6, 414, 356], [7, 56, 522], [8, 368, 522], [9, 212, 576]]
BUILD = [(66, 743, 174, 134), (546, 743, 174, 134)]
def shape(name, avoid):
    """avoid: map-size bool of things a forest must not cover (paths, grass, water)"""
    yy, xx = np.mgrid[0:H, 0:W].astype(float); x0, y0, x1, y1 = BOXES[name]
    fx = xx if name[1] == 'l' else (W - 1 - xx)                       # distance from the corner's side edge
    fy = yy if name[0] == 't' else (H - 1 - yy)                       # ... and from its top/bottom edge
    bw, bh = x1 - x0, y1 - y0
    rng = np.random.RandomState({'tl': 1, 'tr': 2, 'bl': 3, 'br': 4}[name])
    wob = nd.gaussian_filter(rng.rand(H, W), 7); wob = (wob - wob.mean()) / wob.std() * 9   # a ragged, natural edge
    top_d = 30 + (150 if name[0] == 't' else 95) * np.clip(1 - fx / bw, 0, 1) ** 1.6
    side_d = 30 + (130 if name[0] == 't' else 80) * np.clip(1 - fy / bh, 0, 1) ** 1.6
    m = ((fy < top_d + wob) | (fx < side_d + wob) | ((fx / (200 if name[0] == 't' else 160)) ** 2 + (fy / (175 if name[0] == 't' else 140)) ** 2 < 1)) & (fx < bw) & (fy < bh)
    for i, cx, cy in CABINS:                                            # a cabin's front yard stays clear
        X0 = cx + OX - 68; Y0 = cy - 90 + 154 - 70; m[max(0, Y0):Y0 + 90, max(0, X0 - 8):X0 + 134] = False
    for bx, by, bw_, bh_ in BUILD: m[by - 10:by + bh_ + 34, bx - 14:bx + bw_ + 14] = False
    m &= ~avoid
    m = nd.binary_opening(m, iterations=3); m = nd.binary_fill_holes(m)
    l, k = nd.label(m); s = nd.sum(m, l, range(1, k + 1))
    return np.isin(l, [i + 1 for i, z in enumerate(s) if z > 600])
