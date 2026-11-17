"""The Tavern and the Casino (17 Nov 2026, his ask): two new town buildings, drawn by Nano Banana from his own Christmas
cabins as the style reference (sources kept in  Dropbox/Documents/claude chrispy/mafia2-art/buildings/<name>-src.png ,
2400 x 1792 on flat magenta, one art pixel = 12 picture pixels).
This turns each one into real game pixels: finds the 12 px grid, takes the commonest colour of every cell, cuts the
magenta away, snaps the colours to a small palette, and saves  assets/buildings/<name>.png  at the cabins' own scale
(the cabins are 135 px tall; these come out 135 tall and wider).
Run:  python -I tools/make_buildings.py   (from the game folder)"""
import os
import numpy as np
from PIL import Image
SRC = '../mafia2-art/buildings/'; OUT = 'assets/buildings/'; CELL = 12; COLOURS = 56
os.makedirs(OUT, exist_ok=True)

def phase(a):
    """where the 12 px grid starts: the offset at which the most colour changes fall on cell edges"""
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        out.append(int(np.argmax([d[o::CELL].sum() for o in range(CELL)]) + 1) % CELL)
    return out   # [x offset, y offset]

for name in ('tavern', 'casino'):
    a = np.asarray(Image.open(f'{SRC}{name}-src.png').convert('RGB'))
    ox, oy = phase(a); H, W = (a.shape[0] - oy) // CELL, (a.shape[1] - ox) // CELL
    small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        for x in range(W):
            c = a[oy + y * CELL + 2:oy + (y + 1) * CELL - 2, ox + x * CELL + 2:ox + (x + 1) * CELL - 2].reshape(-1, 3)   # the middle of the cell: no edge blur
            small[y, x] = np.median(c, axis=0)
    s = small.astype(int); mag = (s[..., 0] > 150) & (s[..., 2] > 150) & (s[..., 1] < 110) & (np.abs(s[..., 0] - s[..., 2]) < 90)
    rgb = Image.fromarray(small).quantize(COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.asarray(rgb), np.where(mag, 0, 255).astype(np.uint8)])
    ys, xs = np.nonzero(out[..., 3]); out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(out).save(f'{OUT}{name}.png', optimize=True)
    print(name, 'grid offset', (ox, oy), '->', out.shape[1], 'x', out.shape[0], 'px')
