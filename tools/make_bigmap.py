"""THE BIGGER CHRISTMAS TOWN (17 Nov 2026, his ask: wider as well as longer, room for the Tavern and the Casino).
His own 560 x 750 town stays exactly as he drew it. Round it goes new ground drawn by Nano Banana from his map
(source kept in  Dropbox/Documents/claude chrispy/mafia2-art/bigmap/bigmap-src.png , 3712 x 4608 = an 800 x 1000 map):
a snowy forest edge on the left, a frozen lake with a jetty on the right, and below the town a pond with two empty plots.
The new map is 800 x 1000 and his town sits at (120, 0) in it, so every old town coordinate still means the same place.
This makes, in assets/xmas/:
  day-big.webp   the new ground cut down to real game pixels, his day ground pasted over the middle untouched
  night-big.webp the same at night: the new parts recoloured the way HIS night differs from HIS day (learned from the
                 snowy edge of his two pictures), darkened to meet the edge of his night picture, his night pasted over
  block-big.png  what you cannot walk through (white): his own mask in the middle, trees, bushes and water found in
                 the new parts (a copy goes to mafia2-art/bigmap/block-big.png for him to touch up)
Run:  python -I tools/make_bigmap.py   (from the game folder)"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
ART = '../mafia2-art/bigmap/'; X = 'assets/xmas/'; OX, OY, OW, OH = 120, 0, 800, 1000
JETTY = (695, 438, 753, 453)   # the wooden jetty on the lake: you can walk out on it (the fishing spot)

# ---- 1. the source cut down to game pixels: the middle of every art-pixel cell ----
a = np.asarray(Image.open(ART + 'bigmap-src.png').convert('RGB'))
sy, sx = a.shape[0] / OH, a.shape[1] / OW
xs = [(int(round((x + .3) * sx)), int(round((x + .7) * sx)) + 1) for x in range(OW)]
ys = [(int(round((y + .3) * sy)), int(round((y + .7) * sy)) + 1) for y in range(OH)]
small = np.zeros((OH, OW, 3), np.uint8)
for y in range(OH):
    row = a[ys[y][0]:ys[y][1]]
    for x in range(OW): small[y, x] = np.median(row[:, xs[x][0]:xs[x][1]].reshape(-1, 3), axis=0)
small = np.asarray(Image.fromarray(small).quantize(200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))   # a real pixel-art palette (and a far smaller file)
his_day = Image.open(X + 'day.png').convert('RGB'); his_night = Image.open(X + 'night.png').convert('RGB')
W0, H0 = his_day.size
day = Image.fromarray(small); day.paste(his_day, (OX, OY)); day.save(X + 'day-big.webp', lossless=True, quality=100, method=6)   # lossless WebP: a third smaller than PNG, every pixel the same
new = np.ones((OH, OW), bool); new[OY:OY + H0, OX:OX + W0] = False     # True = the new ground

# ---- 2. night: learn day -> night from the snowy edge of his own two pictures ----
d = np.asarray(his_day).astype(float); n = np.asarray(his_night).astype(float); g = small.astype(float)
yy, xx = np.mgrid[0:H0, 0:W0]
ring = (xx < 45) | (xx >= W0 - 45) | (yy >= H0 - 55) | ((yy < 40) & ((xx < 150) | (xx > 410)))
ring &= ~((d[..., 1] > d[..., 0] + 30) & (d[..., 1] > d[..., 2] + 30) & (d[..., 1] > 110))   # not the grass: it is snowed over at night
Q = 8; q = (d[ring] // Q).astype(int); key = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
cnt = np.bincount(key, minlength=32768)
lut = np.stack([np.bincount(key, weights=n[ring][:, c], minlength=32768) for c in range(3)], 1) / np.maximum(cnt, 1)[:, None]
lut = lut.reshape(32, 32, 32, 3); idx = nd.distance_transform_edt(cnt.reshape(32, 32, 32) == 0, return_distances=False, return_indices=True)
lut = lut[idx[0], idx[1], idx[2]]
for c in range(3): lut[..., c] = nd.uniform_filter(lut[..., c], 3, mode='nearest')
q = (g // Q).astype(int); night = lut[q[..., 0], q[..., 1], q[..., 2]]
water = (g[..., 2] > g[..., 1] + 25) & (g[..., 1] > g[..., 0] + 15) & (g[..., 0] < 125) & (g[..., 2] > 120)   # open water is not in his art: plain dark navy
night[water] = g[water] * (.26, .36, .56) + (2, 6, 18)
# darken the new ground so it meets the dark edge of his night picture (his night is lit in the middle, dark at the rim)
full = night.copy(); full[OY:OY + H0, OX:OX + W0] = n
def soft(img, mask, s=14):
    w = nd.gaussian_filter(mask.astype(float), s); return np.stack([nd.gaussian_filter(img[..., c] * mask, s) for c in range(3)], -1) / np.maximum(w, 1e-6)[..., None]
lo_old, lo_new = soft(full, ~new), soft(full, new)
edge = new & nd.binary_dilation(~new, iterations=2)
gain = np.where(edge[..., None], lo_old / np.maximum(lo_new, 1), 0)
idx = nd.distance_transform_edt(~edge, return_distances=False, return_indices=True)
gain = np.clip(gain[idx[0], idx[1]], .35, 1.15)
gain = soft(gain, new, 22)
night = np.clip(night * gain, 0, 255)
night = (np.round(night / 4) * 4).clip(0, 255).astype(np.uint8)
nim = Image.fromarray(night); nim.paste(his_night, (OX, OY)); nim.save(X + 'night-big.webp', lossless=True, quality=100, method=6)

# ---- 3. what blocks you ----
r, gg, b = g[..., 0], g[..., 1], g[..., 2]
snow = (r > 140) & (gg > 175) & (b > 205)
tan = (r > 120) & (r > b + 18) & (gg > b) & (r - gg < 45) & (r + gg + b > 330)        # cobbles, the dirt plots, the jetty planks
free = snow | tan
block = ~free
block = nd.binary_opening(block, iterations=1)                     # sparkles and pebbles do not block
block = nd.binary_closing(block, iterations=3)                     # the snow on top of a tree is still the tree
lab, k = nd.label(block); sz = nd.sum(block, lab, range(1, k + 1))
for i, z in enumerate(sz, 1):
    if z < 40: block[lab == i] = False
block = nd.binary_fill_holes(block)
block[JETTY[1]:JETTY[3], JETTY[0]:JETTY[2]] = False
big = np.zeros((OH, OW), bool); big[new] = block[new]
big[OY:OY + H0, OX:OX + W0] = np.asarray(Image.open(X + 'block.png').convert('L')) > 127
out = Image.fromarray((big * 255).astype(np.uint8)); out.save(X + 'block-big.png', optimize=True); out.save(ART + 'block-big.png')
print('done', day.size)
