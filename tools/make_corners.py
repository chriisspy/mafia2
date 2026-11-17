"""THE FOUR CORNER FORESTS (18 Nov 2026, his call: no shapes of mine, just "show it the corners and prompt it to change the
forest corners").
Each corner of the map as it is (320 x 320 game px, cabins and buildings in it: mafia2-art/corners/input-map.png) went to
Nano Banana with his original dark forest as the reference: "make the forest in this corner better" (top corners) /
"replace the trees in the corner with a proper forest corner" (bottom corners, they never had one). Its pictures are kept
in mafia2-art/corners/<tl|tr|bl|br>-src.png. This cuts a picture to game pixels and keeps ONLY what it changed (the forest),
never the cabins, the Tavern/Casino or the paths, and writes  assets/xmas/corner-<name>.png  (the 320 x 320 box,
transparent where nothing changed). tools/rebuild_trees.py paints them on the day ground (night colours on the night
ground), drops the single trees standing in them and makes the forest solid.
Run:  python -I tools/make_corners.py [tag out_dir]   (from the game folder), then tools/rebuild_trees.py
  with a tag it cuts mafia2-art/corners/<name>-<tag>.png into out_dir (to try options without touching the game)"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, 'tools')
from corner_shapes import BOXES
Image.MAX_IMAGE_PIXELS = None
SRC = '../mafia2-art/corners/'; OUT = 'assets/xmas/'; TAG = '-src'
if len(sys.argv) > 2: TAG, OUT = '-' + sys.argv[1], sys.argv[2].rstrip('/') + '/'
REF = SRC + 'input-map.png'
OX = 120
CABINS = [[0, 212, -12], [1, 83, 56], [2, 341, 56], [3, 10, 190], [4, 414, 190], [5, 10, 356], [6, 414, 356], [7, 56, 522], [8, 368, 522], [9, 212, 576]]
BUILD = [(66, 743, 174, 134), (546, 743, 174, 134)]

def shrink(path, n):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int); c = a.shape[0] / n; out = np.zeros((n, n, 3), np.uint8)
    for y in range(n):
        for x in range(n):
            blk = a[int((y + .3) * c):int((y + .7) * c) + 1, int((x + .3) * c):int((x + .7) * c) + 1].reshape(-1, 3)
            out[y, x] = np.median(blk, axis=0)
    return out

if __name__ == '__main__':
    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    H, W = ref.shape[:2]; protect = np.zeros((H, W), bool)
    for i, cx, cy in CABINS: protect[max(0, cy - 4):cy + 158, cx + OX - 4:cx + OX + 130] = True
    for bx, by, bw, bh in BUILD: protect[by - 4:by + bh + 6, bx - 4:bx + bw + 4] = True
    r, g, b = ref[..., 0], ref[..., 1], ref[..., 2]
    cob = (r > 95) & (r > b + 10) & (g > b) & (r - g < 55) & (r - g > 5) & (r + g + b > 250) & (r + g + b < 560)
    paved = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(cob, iterations=1), iterations=3))
    l, k = nd.label(paved); s = nd.sum(paved, l, range(1, k + 1)); paved = np.isin(l, [i + 1 for i, z in enumerate(s) if z > 1500])
    protect |= nd.binary_dilation(paved, iterations=3)
    for nm, (x0, y0, x1, y1) in BOXES.items():
        try: new = shrink(f'{SRC}{nm}{TAG}.png', x1 - x0).astype(int)
        except FileNotFoundError: continue
        old = ref[y0:y1, x0:x1]
        diff = np.abs(new - old).sum(-1) > 90
        diff = nd.binary_closing(nd.binary_opening(diff, iterations=1), iterations=3)
        diff = nd.binary_fill_holes(diff)
        lab, n = nd.label(diff); s = nd.sum(diff, lab, range(1, n + 1)); diff = np.isin(lab, [i + 1 for i, z in enumerate(s) if z > 150])
        # only the FOREST it painted, not the snow it slightly recoloured round it (that showed the square edge of the picture)
        lum = new.mean(-1); sat = new.max(-1) - new.min(-1)
        forest = (lum < 150) | ((new[..., 1] > new[..., 0] + 25) & (lum < 190))
        keep = nd.binary_fill_holes(nd.binary_closing(diff & forest, iterations=2))
        keep = (nd.binary_dilation(keep, iterations=1) & diff) | keep         # its outline and the shadow at its foot
        lab, n = nd.label(keep); s = nd.sum(keep, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i, z in enumerate(s) if z > 120])
        # where the picture ends inside the map, the forest stops on a ragged line, not a straight one
        hh, ww = keep.shape; yy, xx = np.mgrid[0:hh, 0:ww].astype(float); inner = []
        inner.append(ww - 1 - xx if nm[1] == 'l' else xx)                    # its side that faces the middle of the map
        inner.append(hh - 1 - yy if nm[0] == 't' else yy)
        dist = np.minimum(*inner)
        rng = np.random.RandomState({'tl': 1, 'tr': 2, 'bl': 3, 'br': 4}[nm]); wob = nd.gaussian_filter(rng.rand(hh, ww), 5); wob = (wob - wob.mean()) / wob.std() * 6
        keep &= dist > 16 + wob
        keep = nd.binary_opening(keep, iterations=1)
        diff = keep & ~protect[y0:y1, x0:x1]
        out = np.zeros(new.shape[:2] + (4,), np.uint8); out[..., :3] = new; out[..., 3] = diff * 255
        Image.fromarray(out).save(f'{OUT}corner-{nm}.png', optimize=True)
        print(nm, 'changed', int(diff.sum()), 'px')
