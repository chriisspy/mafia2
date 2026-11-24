"""THE BLACKSMITH AS ONE OF OUR OWN CHARACTERS (24 Nov 2026, his ask: "make him exactly the same as the Mafia chibi style characters,
big head small torso"). Source: Nano Banana 2.1 on Higgsfield, 1:1, with the cast sheet on magenta as the image reference
-> ../mafia2-art/mine/smith-chibi-src.png (the other try is smith-b.png). Same method as Fisherman Joe (tools/make_joe.py): the middle of
every painted cell, magenta keyed out, a small palette, the cast's navy outline and the cast's own 2 x 3 eyes. The painting stops at his
knees, so his little navy legs are added here the way the cast's are drawn.
  -> assets/final/smith/front.png   (the old tall one is kept as front-tall.png)
Run:  python -I tools/make_smith.py [cell size]   (from the game folder)"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
a = np.asarray(Image.open('../mafia2-art/mine/smith-chibi-src.png').convert('RGB')).astype(int); H0, W0 = a.shape[:2]
fg = ~((a[..., 0] > 170) & (a[..., 1] < 110) & (a[..., 2] > 170))
lab, n = nd.label(fg); fg = lab == np.bincount(lab[lab > 0]).argmax(); fg = nd.binary_fill_holes(fg)
ys, xs = np.nonzero(fg); X0, X1, Y0, Y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
ex = (np.abs(np.diff(a[Y0:Y1], axis=1)).sum(-1) > 60).sum(0).astype(float); ey = (np.abs(np.diff(a[:, X0:X1], axis=0)).sum(-1) > 60).sum(1).astype(float)
def best(e):
    out = []
    for c100 in range(1200, 4200, 5):
        c = c100 / 100; sc = max(e[np.round(np.arange(o, len(e), c)).astype(int).clip(0, len(e) - 1)].mean() for o in np.arange(0, c, .5))
        out.append((sc / max(e.mean(), 1e-6), c))
    return max(out)
(sx, cx), (sy, cy) = best(ex), best(ey)
cell = float(sys.argv[1]) if len(sys.argv) > 1 else (cx if sx > sy else cy)
def off(e): return max((e[np.round(np.arange(o, len(e), cell)).astype(int).clip(0, len(e) - 1)].mean(), o) for o in np.arange(0, cell, .5))[1] + 1
ox, oy = off(ex) % cell, off(ey) % cell
W, H = int((W0 - ox) // cell), int((H0 - oy) // cell); small = np.zeros((H, W, 4), np.uint8); m = max(1, int(cell * .28))
for y in range(H):
    y0, y1 = int(round(oy + y * cell)) + m, int(round(oy + (y + 1) * cell)) - m
    for x in range(W):
        x0, x1 = int(round(ox + x * cell)) + m, int(round(ox + (x + 1) * cell)) - m
        small[y, x, :3] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0); small[y, x, 3] = 255 if fg[y0:y1, x0:x1].mean() > .5 else 0
ys, xs = np.nonzero(small[..., 3]); small = small[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
q = Image.fromarray(small[..., :3]).quantize(32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
f = np.dstack([np.asarray(q), small[..., 3]]).copy()
dk = (f[..., :3].astype(int).sum(-1) < 150) & (f[..., 3] > 0); f[dk, :3] = (1, 3, 46)
f[f[..., 3] == 0] = 0
# the cast's eyes: 2 x 3 navy, the one softer pixel top left
el, en = nd.label(dk); EYES = []
for k in range(1, en + 1):
    ys, xs = np.nonzero(el == k)
    if len(xs) == 6 and xs.max() - xs.min() == 1 and ys.max() - ys.min() == 2:
        f[ys.min(), xs.min(), :3] = (53, 34, 51); EYES.append([int(xs.min()), int(ys.min()), 2, 3])
# his legs: the painting is cut at the knees. Find the two navy stumps on the last row and finish them like the cast's (2 more rows, feet 1 px wider)
Hh, Ww = f.shape[:2]; last = f[Hh - 1, :, 3] > 0; ll, ln = nd.label(last)
out = np.zeros((Hh + 2, Ww, 4), np.uint8); out[:Hh] = f
for k in range(1, ln + 1):
    xs = np.nonzero(ll == k)[0]
    if len(xs) > 6: continue
    out[Hh, xs.min():xs.max() + 1] = (1, 3, 46, 255); out[Hh + 1, xs.min():xs.max() + 1] = (1, 3, 46, 255)
f = out
if os.path.exists('assets/final/smith/front.png') and not os.path.exists('assets/final/smith/front-tall.png'): os.replace('assets/final/smith/front.png', 'assets/final/smith/front-tall.png')
Image.fromarray(f).save('assets/final/smith/front.png', optimize=True)
print('cell', cx, round(sx, 2), cy, round(sy, 2), '-> using', cell, '| smith', f.shape[1], f.shape[0], 'eyes', json.dumps(sorted(EYES)))
Image.fromarray(f).resize((f.shape[1] * 8, f.shape[0] * 8), Image.NEAREST).save('../mafia2-art/mine/smith-chibi-preview.png')
