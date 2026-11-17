"""THE FOUR CORNER FORESTS (18 Nov 2026, his ask: "design edge forests for each corner of the map in our style using nano
banana pro. then replace the filler trees for the corners").
Nano Banana painted each corner into its shape (tools/corner_shapes.py) in his tree style; the pictures are kept in
mafia2-art/corners/<tl|tr|bl|br>-src.png (a 336 x 336 game-pixel square, flat magenta outside the forest; the bottom two
sit at the bottom of their square). This cuts each to real game pixels (the middle of every cell), keeps only the forest
inside its shape (a pixel of give at the edge), and writes  assets/xmas/corner-<name>.png  : the corner box, transparent
outside the forest. tools/rebuild_trees.py paints them on the day ground (and in night colours on the night ground),
takes away the single trees under them and makes them solid.
Run:  python -I tools/make_corners.py   (from the game folder), then tools/rebuild_trees.py"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, 'tools')
from corner_shapes import shape, BOXES
Image.MAX_IMAGE_PIXELS = None
SRC = '../mafia2-art/corners/'; OUT = 'assets/xmas/'; SQ = 336

def avoid_mask():
    d = np.asarray(Image.open('../mafia2-art/bigmap/day-big-with-trees.png').convert('RGB')).astype(int)
    r, g, b = d[..., 0], d[..., 1], d[..., 2]
    grass = (g > r + 30) & (g > b + 30) & (g > 100)
    cob = (r > 95) & (r > b + 10) & (g > b) & (r - g < 55) & (r - g > 5) & (r + g + b > 250) & (r + g + b < 560)
    paved = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(cob, iterations=1), iterations=3))
    l, k = nd.label(paved); s = nd.sum(paved, l, range(1, k + 1)); paved = np.isin(l, [i + 1 for i, z in enumerate(s) if z > 1500])
    water = nd.binary_closing(nd.binary_opening((b > g + 25) & (g > r + 15) & (r < 125) & (b > 120), iterations=2), iterations=3)
    return nd.binary_dilation(grass, iterations=6) | nd.binary_dilation(paved, iterations=8) | nd.binary_dilation(water, iterations=4)

if __name__ == '__main__':
    avoid = avoid_mask()
    for nm, (x0, y0, x1, y1) in BOXES.items():
        m = shape(nm, avoid)[y0:y1, x0:x1]; h, w = m.shape; oy = 0 if nm[0] == 't' else SQ - h
        a = np.asarray(Image.open(f'{SRC}{nm}-src.png').convert('RGB')).astype(int); c = a.shape[0] / SQ
        out = np.zeros((h, w, 4), np.uint8)
        for y in range(h):
            for x in range(w):
                cy, cx = (y + oy + .5) * c, (x + .5) * c
                blk = a[int(cy - c * .25):int(cy + c * .25) + 1, int(cx - c * .25):int(cx + c * .25) + 1].reshape(-1, 3)
                out[y, x, :3] = np.median(blk, axis=0)
        px = out[..., :3].astype(int)
        mag = (px[..., 0] > 170) & (px[..., 2] > 170) & (px[..., 1] < 110)
        keep = ~mag & nd.binary_dilation(m, iterations=2)
        # the painter put open snow (and tree shadows on it) between some trees: that is ground, not forest. Big patches of
        # snow colour go (snow on the branches is in small patches and stays), and so do the grey shadows touching them
        snowc = (px[..., 0] > 140) & (px[..., 1] > 172) & (px[..., 2] > 200)
        sl_, sk_ = nd.label(snowc); ss_ = nd.sum(snowc, sl_, range(1, sk_ + 1)); ground = np.isin(sl_, [i + 1 for i, z in enumerate(ss_) if z > 110])
        sat = np.abs(px - px.mean(-1, keepdims=True)).max(-1); lum = px.mean(-1)
        shadow = (sat < 30) & (lum > 95) & (lum < 200) & nd.binary_dilation(ground, iterations=3)
        keep &= ~ground & ~shadow
        keep = nd.binary_opening(keep, iterations=1); keep = nd.binary_fill_holes(keep) & ~mag
        lab, k = nd.label(keep); s = nd.sum(keep, lab, range(1, k + 1)); keep = np.isin(lab, [i + 1 for i, z in enumerate(s) if z > 80])
        brown = (px[..., 0] > px[..., 2] + 30) & (px[..., 1] > px[..., 2] + 5) & (px[..., 0] < 200)      # stumps and bare earth left on their own
        lab, k = nd.label(keep)
        for i, sl in enumerate(nd.find_objects(lab), 1):
            mm = lab[sl] == i
            if brown[sl][mm].mean() > .45: keep[sl][mm] = False
        out[..., 3] = keep * 255
        q = Image.fromarray(out[..., :3]).quantize(96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
        out[..., :3] = np.asarray(q)
        Image.fromarray(out).save(f'{OUT}corner-{nm}.png', optimize=True)
        print(nm, w, 'x', h, 'forest px', int(keep.sum()), 'of shape', int(m.sum()))
