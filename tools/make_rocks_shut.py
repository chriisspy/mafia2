"""(26 Nov 2026, his ask: "make it look like plain boulders until then") The temple's boulders by the South's race road with the cleft CLOSED:
a Nano Banana Pro edit of our own rocks.png (mafia2-art/quest/temple/rocks-shut-a.png, magenta ground) cut back to the same 120 x 87 frame,
its outline fitted to the open picture's, so swapping the two pictures never jumps. temple.js shows this one until you hold all four Keystones.
  python -I tools/make_rocks_shut.py      (from the game folder)"""
import numpy as np
from PIL import Image
a = np.asarray(Image.open('../mafia2-art/quest/temple/rocks-shut-a.png').convert('RGB')).astype(int)
o = np.asarray(Image.open('assets/south/rocks.png').convert('RGBA'))
mag = (a[..., 0] > 200) & (a[..., 1] < 80) & (a[..., 2] > 200)
ys, xs = np.nonzero(~mag); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
oy, ox = np.nonzero(o[..., 3] > 0); X0, X1, Y0, Y1 = ox.min(), ox.max() + 1, oy.min(), oy.max() + 1
W, H = X1 - X0, Y1 - Y0; cw, ch = (x1 - x0) / W, (y1 - y0) / H
out = np.zeros_like(o)
for y in range(H):
    for x in range(W):
        sx0, sx1 = int(x0 + (x + .3) * cw), int(x0 + (x + .7) * cw) + 1; sy0, sy1 = int(y0 + (y + .3) * ch), int(y0 + (y + .7) * ch) + 1
        blk = a[sy0:sy1, sx0:sx1].reshape(-1, 3); m = mag[sy0:sy1, sx0:sx1].reshape(-1)
        if m.mean() > .5: continue
        out[Y0 + y, X0 + x] = (*np.median(blk[~m], axis=0).astype(int), 255)
Image.fromarray(out.astype(np.uint8)).save('assets/south/rocks-shut.png', optimize=True); print('rocks-shut', o.shape[1], 'x', o.shape[0], 'cell', round(cw, 2), round(ch, 2))
