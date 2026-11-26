"""THE FOREST WARDEN'S LEFT SIDE (26 Nov 2026). tools/pl_poses.py makes every left-facing pose by mirroring the right one. That is right for the
cast, but the Bark Knight carries a shield on his left arm: facing left its rune faces us, facing right it is hidden behind him. So PixelLab
animated his walk and his sit to the WEST as well, and this puts those real frames in place of the mirrored ones:
  walk_left_0..7 and sit_left   (cut exactly the way pl_poses.py cuts the right-facing ones)
Run after pl_fetch.py + pl_poses.py, before pack_poses.py:   python -I tools/warden_left.py   (from the game folder)"""
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pl_poses import palette, clean, blob
NAME = 'stag'; src = f'assets/poses-src/{NAME}/'; d = f'assets/final/{NAME}/poses/'
pal = palette(NAME)
pal = np.array(sorted({tuple(c) for c in pal.astype(int)} | {tuple(int(v) for v in p[:3]) for p in np.asarray(Image.open(f'assets/final/{NAME}/left.png').convert('RGBA')).reshape(-1, 4) if p[3]}), np.float32)
F = lambda k, i: clean(np.asarray(Image.open(f'{src}{k}_{i}.png').convert('RGBA')), pal)
meta = json.load(open(d + 'poses.json'))
def put(key, a, ax):
    a = blob(np.ascontiguousarray(a)); Image.fromarray(a).save(d + key + '.png'); meta[key] = {'w': int(a.shape[1]), 'h': int(a.shape[0]), 'ax': round(float(ax), 1)}
# walking: one shared box, the standing frame's middle is the anchor
fr = [F('walk_west', i) for i in range(8)]; al = np.any([a[..., 3] > 0 for a in fr], 0); ys, xs = np.nonzero(al)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; b0 = np.nonzero(fr[0][..., 3].any(0))[0]; ax = (b0.min() + b0.max() + 1) / 2 - x0
for i, a in enumerate(fr): put(f'walk_left_{i}', a[y0:y1, x0:x1], ax)
# sitting: the latest frame that is still just him
f0 = F('sit_west', 0); ys, xs = np.nonzero(f0[..., 3]); g = ys.max(); fx = np.nonzero(f0[g - 1:g + 1, :, 3].any(0))[0]; ax = (fx.min() + fx.max() + 1) / 2
n0 = (f0[..., 3] > 0).sum(); w0 = np.nonzero(f0[..., 3].any(0))[0]
ok = [i for i in range(2, 8) if (F('sit_west', i)[..., 3] > 0).sum() <= n0 * 1.06 and np.ptp(np.nonzero(F('sit_west', i)[..., 3].any(0))[0]) <= np.ptp(w0) + 4]
a = F('sit_west', max(ok) if ok else 3); ys, xs = np.nonzero(a[..., 3]); x0, x1, y0 = xs.min(), xs.max() + 1, ys.min(); y1 = max(ys.max(), g) + 1
put('sit_left', a[y0:y1, x0:x1], ax - x0)
json.dump(meta, open(d + 'poses.json', 'w'), indent=1); print('walk_left x8 + sit_left from the west frames')
