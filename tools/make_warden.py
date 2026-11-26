"""THE FOREST WARDEN AS A CHIBI BARK KNIGHT (26 Nov 2026, his pick "B, the Bark Knight ... make it the chibi style and same size head
and torso"). It replaces the sprite-stacked stag; the outfit keeps the id 'stag'.
Source: Nano Banana Pro on Higgsfield, 16:9, image references = his concept (warden-B.png) + a sheet of Beanie and Batman at 14x on magenta
-> ../mafia2-art/quest/reward/warden/warden-chibi-src.png (two rows came back; the TOP row is used: front, right, back, left).
Same method as the Blacksmith and Fisherman Joe (tools/make_smith.py): the middle of every painted cell, magenta keyed out, a small
palette shared by the four views, the cast's navy outline. The feet of all four views sit on the bottom row.
  -> assets/final/stag/{front,right,back,left}.png
Run:  python -I tools/make_warden.py [cell size]   (from the game folder)"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC = '../mafia2-art/quest/reward/warden/warden-chibi-src.png'
a = np.asarray(Image.open(SRC).convert('RGB')).astype(int); a = a[:a.shape[0] // 2 + 10]; H0, W0 = a.shape[:2]   # the top row only
fg = ~((a[..., 0] > 170) & (a[..., 1] < 110) & (a[..., 2] > 170))
lab, n = nd.label(fg); big = [k for k in range(1, n + 1) if (lab == k).sum() > 20000]
big.sort(key=lambda k: np.nonzero(lab == k)[1].min()); assert len(big) == 4, len(big)
ex = (np.abs(np.diff(a, axis=1)).sum(-1) > 60).sum(0).astype(float); ey = (np.abs(np.diff(a, axis=0)).sum(-1) > 60).sum(1).astype(float)
def best(e):
    out = []
    for c100 in range(1500, 3000, 2):
        c = c100 / 100; sc = max(e[np.round(np.arange(o, len(e), c)).astype(int).clip(0, len(e) - 1)].mean() for o in np.arange(0, c, .5))
        out.append((sc / max(e.mean(), 1e-6), c))
    return max(out)
(sx, cx), (sy, cy) = best(ex), best(ey)
cell = float(sys.argv[1]) if len(sys.argv) > 1 else (cx if sx > sy else cy)
def off(e): return max((e[np.round(np.arange(o, len(e), cell)).astype(int).clip(0, len(e) - 1)].mean(), o) for o in np.arange(0, cell, .5))[1] + 1
ox, oy = off(ex) % cell, off(ey) % cell
W, H = int((W0 - ox) // cell), int((H0 - oy) // cell); who = np.zeros((H, W), int); kind = np.zeros((H, W), int); mean = np.zeros((H, W, 3))
# The painting's inside detail is finer than its own pixel grid (half-cell glints, thin moss lines), so a plain median loses the eyes and the moss.
# Each cell is sorted first: navy line (mostly dark), eye/rune glow (enough saturated blue), moss (enough green), otherwise bark or wood = the mean of what is left.
R, G, B = a[..., 0], a[..., 1], a[..., 2]; dark = (R + G + B < 170) & fg; blue = (B > 170) & (B - R > 90) & fg; green = (G - R > 12) & (G - B > 25) & (G < 170) & fg
for y in range(H):
    y0, y1 = int(round(oy + y * cell)), int(round(oy + (y + 1) * cell))
    for x in range(W):
        x0, x1 = int(round(ox + x * cell)), int(round(ox + (x + 1) * cell)); n = (y1 - y0) * (x1 - x0)
        l = lab[y0:y1, x0:x1].ravel(); l = l[l > 0]
        if len(l) <= .5 * n: continue
        who[y, x] = np.bincount(l).argmax(); d, b, g = dark[y0:y1, x0:x1], blue[y0:y1, x0:x1], green[y0:y1, x0:x1]
        if b.mean() > .22: kind[y, x] = 2; mean[y, x] = a[y0:y1, x0:x1][b].mean(0)
        elif d.mean() > .5: kind[y, x] = 1
        elif g.mean() > .3: kind[y, x] = 3; mean[y, x] = a[y0:y1, x0:x1][g].mean(0)
        else: rest = fg[y0:y1, x0:x1] & ~d & ~g & ~b; kind[y, x] = 4; mean[y, x] = a[y0:y1, x0:x1][rest].mean(0) if rest.any() else (1, 3, 46)
op = kind > 0
f = np.zeros((H, W, 4), np.uint8); f[op, 3] = 255; f[kind == 1, :3] = (1, 3, 46)
# flat shading like the cast: the bark and the wood share a small palette (median cut over those cells only), the glow and the moss have two tones each
body = kind == 4; tan = body & (mean[..., 0] - mean[..., 2] > 22); pale = body & ~tan
for part, ncol in ((pale, 3), (tan, 2)):   # the birch: light, mid, shade. The bare wood (horns, cheeks, shield): two tones
    q = Image.fromarray(mean[part].astype(np.uint8)[None]).quantize(ncol, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'); f[part, :3] = np.asarray(q)[0]
for _ in range(2):   # no speckles: a bark pixel that none of its four neighbours agree with takes the colour most of them have
    g = f.copy()
    for y, x in zip(*np.nonzero(body)):
        nb = [tuple(f[y + dy, x + dx, :3]) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)) if 0 <= y + dy < H and 0 <= x + dx < W and body[y + dy, x + dx]]
        if len(nb) >= 2 and tuple(f[y, x, :3]) not in nb: g[y, x, :3] = max(set(nb), key=nb.count)
    f = g
lum = mean.sum(-1)
f[kind == 2, :3] = (47, 143, 224)
bl, bn = nd.label(kind == 2)
for k in range(1, bn + 1): ys, xs = np.nonzero(bl == k); t = ys == ys.min(); f[ys.min(), xs[t].min(), :3] = (127, 216, 255)   # each glow (an eye, the rune) gets one lighter pixel, top left
f[(kind == 3) & (lum >= 270), :3] = (86, 140, 62); f[(kind == 3) & (lum < 270), :3] = (52, 98, 58)
os.makedirs('assets/final/stag', exist_ok=True); prev = []
for k, v in zip(big, ('front', 'right', 'back', 'left')):
    g = f.copy(); g[who != k] = 0; ys, xs = np.nonzero(g[..., 3]); g = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(g).save(f'assets/final/stag/{v}.png', optimize=True); prev.append(g); print(v, g.shape[1], g.shape[0])
print('cell', cx, round(sx, 2), cy, round(sy, 2), '-> using', cell)
