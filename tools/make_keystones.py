"""THE FOUR KEYSTONES (25 Nov 2026, the Glimmerkin hunt, batch 3): Moon (circle), Fang (triangle), Hearth (square), Ember (diamond),
and the Hearth stone as you find it, cracked. One Nano Banana Pro sheet (../mafia2-art/quest/keystones-b.png: the mural, Pip and the
town's night picture as its references), five tablets in a row, straight on, on magenta. Cut the same way as the forest's props
(tools/make_forest.py: sample / cut), to assets/quest/<name>.png.
The carved shapes are set again by hand, like the mural's: at game size the painted grooves go soft, and the shape IS the stone.
  python -I tools/make_keystones.py      (from the game folder)"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC, OUT = '../mafia2-art/quest/keystones-b.png', 'assets/quest/'
NAMES = ['moon', 'fang', 'hearth', 'hearth-cracked', 'ember']
os.makedirs(OUT, exist_ok=True)

def phase(a, cell):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        n = len(d) - 1
        sc = [d[np.round(np.arange(p, n, cell)).astype(int)].sum() for p in np.arange(0, cell, .5)]
        out.append((int(np.argmax(sc)) * .5 + 1) % cell)
    return out

def cell_size(a, lo=6.0, hi=40.0):
    """the AI's pixel size: the spacing whose grid lines catch the most colour edges"""
    best = (0, 0)
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1).astype(float)
        for c in np.arange(lo, hi, .1):
            n = len(d) - 1
            sc = max(d[np.round(np.arange(p, n, c)).astype(int)].mean() for p in np.linspace(0, c, 16, endpoint=False))
            if sc > best[0] * 1.08: best = (sc, round(float(c), 1))
    return best[1]

def sample(a, cell):
    ox, oy = phase(a, cell); H, W = int((a.shape[0] - oy) // cell), int((a.shape[1] - ox) // cell)
    m = max(1, int(cell * .25)); small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0 = int(round(oy + y * cell)); row = a[y0 + m:max(y0 + m + 1, int(round(oy + (y + 1) * cell)) - m)]
        for x in range(W):
            x0 = int(round(ox + x * cell)); small[y, x] = np.median(row[:, x0 + m:max(x0 + m + 1, int(round(ox + (x + 1) * cell)) - m)].reshape(-1, 3), axis=0)
    return small

def keyed(small):
    s = small.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
    return (r > 120) & (b > 120) & (g < 110) & (r > g + 70) & (b > g + 70)

a = np.asarray(Image.open(SRC).convert('RGB'))
c = cell_size(a, 6, 30); s = sample(a, c); print('cell', c, 'sheet', s.shape[1], 'x', s.shape[0])

# ---- five tablets, left to right: each its own picture, one small palette for all of them, a clean edge ----
solid = ~keyed(s); solid = nd.binary_opening(solid, iterations=1)
lab, n = nd.label(solid); boxes = sorted([sl for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 150], key=lambda b: b[1].start)
assert len(boxes) == 5, len(boxes)
px = np.asarray(Image.fromarray(np.ascontiguousarray(s)).quantize(40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
h = max(b[0].stop - b[0].start for b in boxes); w = max(b[1].stop - b[1].start for b in boxes)
NAVY, BAND, GLOW, CORE = (1, 3, 46), (38, 62, 122), (110, 226, 255), (232, 251, 255)
yy, xx = np.mgrid[-6:7, -6:7]
SHAPE = {'moon': xx ** 2 + yy ** 2 <= 30, 'fang': (yy >= -5) & (yy <= 5) & (np.abs(xx) <= (yy + 5) * .6 + .3),   # 11 across: circle, triangle (point up), square, diamond: the mural's four
         'hearth': (np.abs(xx) <= 5) & (np.abs(yy) <= 5), 'ember': np.abs(xx) + np.abs(yy) <= 6}
for name, b in zip(NAMES, boxes):
    m = lab[b] == lab[b][(b[0].stop - b[0].start) // 2, 2:].max()   # this tablet only (the cracked one's fallen chips are left behind)
    m = nd.binary_fill_holes(m) if name != 'hearth-cracked' else m
    img = np.dstack([px[b], m.astype(np.uint8) * 255]); img[~m] = 0
    q = img[..., :3].astype(int); img[m & (q[..., 0] > q[..., 1] + 20) & (q[..., 2] > q[..., 1] + 20)] = (*NAVY, 255)   # magenta showing through the outline
    out = np.zeros((h, w, 4), np.uint8); oy, ox = h - img.shape[0], (w - img.shape[1]) // 2; out[oy:oy + img.shape[0], ox:ox + img.shape[1]] = img   # all five the same size, standing on the same line
    if name in SHAPE:   # the shape, set by hand in the middle of the face: a dark carved band, a line of light inside it
        cy, cx = h // 2 + 1, w // 2; f = SHAPE[name]; face = np.median(out[cy - 9:cy + 10, cx - 8:cx + 9, :3].reshape(-1, 3), axis=0).astype(np.uint8)
        v = out[cy - 9:cy + 10, cx - 8:cx + 9]; v[..., :3] = face                                   # the AI's soft shape goes; the stone's own colour in its place
        v = out[cy - 6:cy + 7, cx - 6:cx + 7]
        big = out[cy - 7:cy + 8, cx - 7:cx + 8]; fb = np.pad(f, 1); bb = nd.binary_dilation(fb, structure=np.ones((3, 3)) if name in ('hearth', 'moon') else None) & ~fb; big[bb, :3] = BAND
        line = f & ~nd.binary_erosion(f); v[line, :3] = GLOW; v[f & ~line, :3] = (face * .7 + np.array(GLOW) * .3).astype(np.uint8)   # inside the line: the stone, a little lit
        v[line & (yy < -1) & (xx < 1), :3] = CORE                                                  # the light is whitest up its top left, like the stone's own top edge
    Image.fromarray(out).save(OUT + name + '.png', optimize=True); print(name, out.shape[1], 'x', out.shape[0])
