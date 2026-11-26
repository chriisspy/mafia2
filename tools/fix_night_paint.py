"""(26 Nov 2026, his note: "the drawing I did on the map builder seems to have discoloured at night time. make it match")
The builder painted the NIGHT ground from the day colour with a fixed formula (nightRGB in tools/builder/index.html), which does not match
his own night art. This finds every night pixel that is exactly that formula of its day pixel (what the builder painted), and repaints it
with the night colour his own art uses for that day colour: a table of day -> night learned from all the other pixels.
  python -I tools/fix_night_paint.py [--dry]      (from the game folder; keeps a copy as mafia2-art/builder-backups/night-big-before-fix.webp)"""
import sys, os, shutil
import numpy as np
from PIL import Image
D, N = 'assets/xmas/day-big.webp', 'assets/xmas/night-big.webp'
if '--base' in sys.argv: D, N = 'assets/builder/layers/town-base-day.png', 'assets/builder/layers/town-base-night.png'   # the builder's own saved base (it rebuilds the night map from it)
d = np.asarray(Image.open(D).convert('RGB')).astype(int); n = np.asarray(Image.open(N).convert('RGB')).astype(int)
r, g, b = d[..., 0], d[..., 1], d[..., 2]
keep = ((r > 190) & (g < 120)) | ((b > 190) & (r < 120) & (g < 170)) | ((r > 200) & (g > 170) & (b < 110))
f = lambda v: np.floor(v + .5)
pred = np.where(keep[..., None], np.stack([f(r * .9), f(g * .9), f(b * .9)], -1), np.stack([f(r * .22 + 4), f(g * .30 + 10), f(b * .46 + 30)], -1))
painted = np.abs(n - pred).max(-1) <= 2
own = ~painted
Q = 8   # day colours grouped in steps of 8
kd = (d[own] // Q); kn = n[own]
keys, inv = np.unique(kd[:, 0] * 1024 + kd[:, 1] * 32 + kd[:, 2], return_inverse=True)
sums = np.zeros((len(keys), 3)); np.add.at(sums, inv, kn); cnt = np.bincount(inv).astype(float)
good = cnt >= 6; keys, table = keys[good], (sums[good] / cnt[good, None])
kc = np.stack([keys // 1024, (keys // 32) % 32, keys % 32], -1) * Q + Q / 2   # bucket centres in day colours
P = d[painted].astype(float); out = np.zeros_like(P)
for i in range(0, len(P), 4096):
    blk = P[i:i + 4096]; dist = ((blk[:, None, :] - kc[None]) ** 2).sum(-1); out[i:i + 4096] = table[dist.argmin(1)]
new = n.copy(); new[painted] = np.clip(np.round(out), 0, 255).astype(int)
print('painted pixels', int(painted.sum()), 'table', len(keys))
if '--dry' in sys.argv:
    Image.fromarray(new.astype(np.uint8)).save(sys.argv[-1] if sys.argv[-1].endswith('.png') else 'night-fixed-preview.png'); sys.exit()
os.makedirs('../mafia2-art/builder-backups', exist_ok=True); shutil.copy(N, '../mafia2-art/builder-backups/' + os.path.basename(N).replace('.', '-before-fix.', 1))
Image.fromarray(new.astype(np.uint8)).save(N, **({'lossless': True} if N.endswith('.webp') else {'optimize': True}))
print('saved', N)
