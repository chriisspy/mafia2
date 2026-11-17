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
day = Image.fromarray(small); day.paste(his_day, (OX, OY)); day.save(X + 'day-big.webp', lossless=True, quality=100, method=6)
day.save(ART + 'day-big-with-trees.png')   # tools/make_trees.py lifts the trees off this one   # lossless WebP: a third smaller than PNG, every pixel the same
new = np.ones((OH, OW), bool); new[OY:OY + H0, OX:OX + W0] = False     # True = the new ground

# ---- 2. night: its own picture, painted outward from HIS night town by Nano Banana (bignight-src.png) so there is no join
# (17 Nov, his ask: "make night time map SEAMLESS and perfect"; the first try recoloured the day ground and the join showed).
# The trees stay painted on at night (nobody walks under them then), so it does not have to match the day tree for tree. ----
def shrink(path):
    a = np.asarray(Image.open(path).convert('RGB')); sy, sx = a.shape[0] / OH, a.shape[1] / OW
    xs = [(int(round((x + .3) * sx)), int(round((x + .7) * sx)) + 1) for x in range(OW)]
    ys = [(int(round((y + .3) * sy)), int(round((y + .7) * sy)) + 1) for y in range(OH)]
    out = np.zeros((OH, OW, 3), np.uint8)
    for y in range(OH):
        row = a[ys[y][0]:ys[y][1]]
        for x in range(OW): out[y, x] = np.median(row[:, xs[x][0]:xs[x][1]].reshape(-1, 3), axis=0)
    return out
G = shrink(ART + 'bignight-src.png').astype(float); Hn = np.asarray(his_night).astype(float)
# the painter also repainted his town in the middle, a little paler than his own. That middle is the bridge: where both
# show the same place (the rim of his town, away from the cabins it drew in) learn "its colour -> his colour", use that on
# all the new ground, then nudge the brightness along the join so the two meet exactly.
yy, xx = np.mgrid[0:H0, 0:W0]
rim = (xx < 70) | (xx >= W0 - 70) | (yy >= H0 - 70) | ((yy < 60) & ((xx < 150) | (xx > 410)))
for cx, cy in ((212, -12), (83, 56), (341, 56), (10, 190), (414, 190), (10, 356), (414, 356), (56, 522), (368, 522), (212, 576)):
    rim[max(0, cy - 4):cy + 158, max(0, cx - 4):cx + 130] = False                     # the cabins it drew in are not his ground
def soft(img, mask, s):
    w = nd.gaussian_filter(mask.astype(float), s); return np.stack([nd.gaussian_filter(img[..., c] * mask, s) for c in range(3)], -1) / np.maximum(w, 1e-6)[..., None]
rimbig = np.zeros((OH, OW), bool); rimbig[OY:OY + H0, OX:OX + W0] = rim
Hfull = G.copy(); Hfull[OY:OY + H0, OX:OX + W0] = Hn
ratio = soft(Hfull, rimbig, 7) / np.maximum(soft(G, rimbig, 7), 1)                  # his / the painter's, colour by colour, blurred: a smooth "how to turn its light into his"
edge = ~new & nd.binary_dilation(new, iterations=2) & rimbig
ix = nd.distance_transform_edt(~edge, return_distances=False, return_indices=True)
gain = np.clip(ratio[ix[0], ix[1]], .3, 1.12)                                          # carried straight out from the join...
gain = soft(gain, new, 14)                                                            # ...and smoothed, so the new ground keeps the painter's crisp pixels with his brightness
Gm = G
night = Gm * gain
# last touch, right at the join: his outermost pixels against the new pixels beside them (his picture darkens in its last few
# rows; the new ground must start exactly as dark), smoothed along the join and faded out over a few dozen pixels
inner = ~new & nd.binary_dilation(new, iterations=3); outer = new & nd.binary_dilation(~new, iterations=3)
Hf2 = night.copy(); Hf2[OY:OY + H0, OX:OX + W0] = Hn
r2 = soft(Hf2, inner, 10) / np.maximum(soft(night, outer, 10), 1)
dist, ix = nd.distance_transform_edt(~outer, return_indices=True)
r2 = np.clip(r2[ix[0], ix[1]], .45, 1.1)                          # mostly a darkening; never a bright streak where a dark tree of his meets pale new snow
r2 = soft(r2, new, 8)
night = night * (1 + (r2 - 1) * np.exp(-dist / 34.)[..., None])
night = (np.round(np.clip(night, 0, 255) / 4) * 4).clip(0, 255).astype(np.uint8)
nim = Image.fromarray(night); nim.paste(his_night, (OX, OY)); nim.save(X + 'night-big.webp', lossless=True, quality=100, method=6)
g = small.astype(float)

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
