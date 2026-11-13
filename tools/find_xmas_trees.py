"""The trees and bushes on his Christmas town (13 Nov 2026) -> assets/xmas/block.png, where you cannot walk.
They are painted into the ground picture, so they are found from it: anything that is not snow and is not part of
the big lawn + square, plus the blue-green bushes. Run:  python -I tools/find_xmas_trees.py   (from the game folder)"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
im = np.asarray(Image.open('assets/xmas/day.png').convert('RGB')).astype(int)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
lum = (r + g + b) / 3
snow = ((np.minimum(np.minimum(r, g), b) > 165) & (b >= r - 6)) | ((b > r + 12) & (lum > 135))
non = nd.binary_closing(~snow, iterations=1)
# shrink first so a tree touching the lawn comes apart from it, then grow each piece back
er = nd.binary_erosion(non, iterations=3)
lab0, n = nd.label(er)
dist, idx = nd.distance_transform_edt(lab0 == 0, return_indices=True)
lab = np.where(non & (dist <= 4), lab0[idx[0], idx[1]], 0)
sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
big = np.argmax(sizes) + 1          # the lawn and the square
keep = np.zeros_like(non)
for i, s in enumerate(sizes, 1):
    if i != big and s >= 60:
        keep |= lab == i
# the blue-green bushes (they can sit right on the lawn's edge)
teal = nd.binary_closing((~snow) & (b > r + 10) & (b >= g - 20) & (lum < 125), iterations=2)
tl, tn = nd.label(teal)
ts = nd.sum(np.ones_like(tl), tl, range(1, tn + 1))
for i, s in enumerate(ts, 1):
    if s >= 30:
        keep |= tl == i
keep = nd.binary_fill_holes(nd.binary_closing(keep, iterations=2))
Image.fromarray((keep * 255).astype(np.uint8)).convert('1').save('assets/xmas/block.png', optimize=True)
print('blocked px', int(keep.sum()))
