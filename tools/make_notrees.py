"""THE MAP WITH NO TREES IN THE WAY (17 Nov 2026, his plan: "regenerate the map with no trees or bushes for day and night,
then i give you perfect cut outs ... to place them back in exactly where they were. keep the outer bushes and trees as the
boundary for the map the same").
The 77 single trees and bushes that tools/make_trees.py found (assets/xmas/trees.json) were painted over in magenta (with the
shadow at each foot) and Nano Banana painted bare ground into the holes:
  mafia2-art/bigmap/day-notrees-src.png     the day map, holes filled
  mafia2-art/bigmap/night-notrees-src.png   the night map: holes in his night town filled, and the new ground round it
                                            painted again with no trees in the open (forest only at the edges)
This keeps every pixel that was not a hole exactly as it was (his town, the edge forest, the lake...) and takes ONLY the
holes (day) / the holes and the new ground (night) from the painter, matched in brightness to what is next to them:
  mafia2-art/bigmap/day-no-trees.png , night-no-trees.png   (800 x 1000, his town at 120, 0)
  mafia2-art/bigmap/tree-spots.png                          every removed tree numbered, where its foot stood
Run:  python -I tools/make_notrees.py   (from the game folder)"""
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
ART = '../mafia2-art/bigmap/'; X = 'assets/xmas/'; OX, OY, OW, OH, W0, H0 = 120, 0, 800, 1000, 560, 750

def shrink(path):
    a = np.asarray(Image.open(path).convert('RGB')); sy, sx = a.shape[0] / OH, a.shape[1] / OW
    xs = [(int(round((x + .3) * sx)), int(round((x + .7) * sx)) + 1) for x in range(OW)]
    ys = [(int(round((y + .3) * sy)), int(round((y + .7) * sy)) + 1) for y in range(OH)]
    out = np.zeros((OH, OW, 3), np.uint8)
    for y in range(OH):
        row = a[ys[y][0]:ys[y][1]]
        for x in range(OW): out[y, x] = np.median(row[:, xs[x][0]:xs[x][1]].reshape(-1, 3), axis=0)
    return out.astype(float)
def soft(img, mask, s):
    w = nd.gaussian_filter(mask.astype(float), s); return np.stack([nd.gaussian_filter(img[..., c] * mask, s) for c in range(3)], -1) / np.maximum(w, 1e-6)[..., None]

# ---- the holes: every lifted tree, the shadow at its foot, a few pixels round it ----
sheet = np.asarray(Image.open(ART + 'trees-sheet.png').convert('RGBA')); T = json.load(open(ART + 'trees-spots.json'))
holes = np.zeros((OH, OW), bool); yy, xx = np.mgrid[0:OH, 0:OW]
for sx, sy, w, h, x, y, base, fx, fw in T:
    holes[y:y + h, x:x + w] |= sheet[sy:sy + h, sx:sx + w, 3] > 0
    holes |= ((xx - fx) / max(9, w * .42)) ** 2 + ((yy - (base - 2)) / 6.) ** 2 < 1
holes = nd.binary_dilation(holes, iterations=3)
centre = np.zeros((OH, OW), bool); centre[OY:OY + H0, OX:OX + W0] = True

# clean ground to copy from: not a hole, and not next to anything solid or dark (a tree left standing, an outline, water)
dayrgb = np.asarray(Image.open(ART + 'day-big-with-trees.png').convert('RGB')).astype(float)
r, g, b = dayrgb[..., 0], dayrgb[..., 1], dayrgb[..., 2]
snow = (r > 140) & (g > 175) & (b > 205); tan = (r > 120) & (r > b + 18) & (g > b) & (r - g < 45) & (r + g + b > 330)
grass = (g > r + 30) & (g > b + 30)
block = np.asarray(Image.open(ART + 'block-big.png').convert('L')) > 127
clean = (snow | tan | grass) & ~nd.binary_dilation(block & ~holes, iterations=2)

def fillnear(img, hole, ok, med, blur=0):
    """every hole pixel takes the colour of the nearest clean ground, then a tidy so it is patches of snow, not streaks"""
    ix = nd.distance_transform_edt(~ok, return_distances=False, return_indices=True)
    g2 = img[ix[0], ix[1]]
    g2 = np.stack([nd.median_filter(g2[..., c], size=med) for c in range(3)], -1)
    if blur: g2 = np.stack([nd.gaussian_filter(g2[..., c], blur) for c in range(3)], -1)
    out = img.copy(); out[hole] = g2[hole]; return out

# ---- day: only the holes change, filled from the snow beside them (the painter's holes had smudges and stray trees) ----
# the painter's snow has the right texture, but it left smudges, grey shadows and a few trees of its own in the holes:
# keep its pixels only where they are clean snow (or grass / cobbles), and fill the rest from the clean pixels beside them
G = shrink(ART + 'day-notrees-src.png'); gr, gg, gb = G[..., 0], G[..., 1], G[..., 2]
gsnow = (gr > 150) & (gg > 185) & (gb > 215) & ((gb - gr >= 18) | (G.min(-1) > 236))
ggood = gsnow | ((gg > gr + 30) & (gg > gb + 30)) | ((gr > 120) & (gr > gb + 18) & (gg > gb) & (gr - gg < 45) & (gr + gg + gb > 330))
ggood = nd.binary_opening(ggood, iterations=1) & ~nd.binary_dilation(~ggood, iterations=2)
mix = dayrgb.copy(); mix[holes] = G[holes]
res = fillnear(mix, holes & ~ggood, (holes & ggood) | (clean & ~holes), 5)
q = np.asarray(Image.fromarray(res.astype(np.uint8)).quantize(200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
res = dayrgb.astype(np.uint8).copy(); res[holes] = q[holes]
Image.fromarray(res).save(ART + 'day-no-trees.png')
day = dayrgb

# ---- night: the holes in his night town are filled the same way from his own night snow (smoothed: his night is soft);
# all the new ground round it comes from the painter (no trees in the open, forest only at the edges), matched at the join ----
night = np.zeros((OH, OW, 3)); night[OY:OY + H0, OX:OX + W0] = np.asarray(Image.open(X + 'night.png').convert('RGB'))
nholes = nd.binary_dilation(holes, iterations=6) & centre             # his night trees glow a little wider than the day ones
import cv2
hn = night[OY:OY + H0, OX:OX + W0].astype(np.uint8); hm = (nholes[OY:OY + H0, OX:OX + W0] * 255).astype(np.uint8)
out = night.copy(); out[OY:OY + H0, OX:OX + W0] = cv2.inpaint(hn, hm, 7, cv2.INPAINT_TELEA)   # his night snow is soft and smooth: grow it in from the edges of each hole (inside his picture only)
known = centre
G = shrink(ART + 'night-notrees-src.png')
new = ~centre
rim = known & nd.binary_dilation(new, iterations=70)
ratio = soft(out, rim, 7) / np.maximum(soft(G, rim, 7), 1)
edge = centre & nd.binary_dilation(new, iterations=2)
ix = nd.distance_transform_edt(~edge, return_distances=False, return_indices=True)
gain = soft(np.clip(ratio[ix[0], ix[1]], .3, 1.12), new, 14)
ng = G * gain
inner = centre & nd.binary_dilation(new, iterations=3); outer = new & nd.binary_dilation(centre, iterations=3)
both = ng.copy(); both[centre] = out[centre]
r2 = soft(both, inner, 10) / np.maximum(soft(ng, outer, 10), 1)
dist, ix = nd.distance_transform_edt(~outer, return_indices=True)
r2 = soft(np.clip(r2[ix[0], ix[1]], .45, 1.1), new, 8)
ng = ng * (1 + (r2 - 1) * np.exp(-dist / 34.)[..., None])
out[new] = np.clip(ng, 0, 255)[new]
res = (np.round(out / 4) * 4).clip(0, 255).astype(np.uint8); keep = centre & ~nholes
res[keep] = night.astype(np.uint8)[keep]
Image.fromarray(res).save(ART + 'night-no-trees.png')

# ---- a numbered guide: where every removed tree stood ----
g = Image.fromarray(day.astype(np.uint8)).resize((OW * 2, OH * 2), Image.NEAREST); dr = ImageDraw.Draw(g)
for i, (sx, sy, w, h, x, y, base, fx, fw) in enumerate(T, 1):
    dr.rectangle([x * 2, y * 2, (x + w) * 2, (y + h) * 2], outline=(255, 0, 255)); dr.rectangle([fx * 2 - 3, base * 2 - 3, fx * 2 + 3, base * 2 + 3], fill=(255, 255, 0))
    dr.text((x * 2 + 3, y * 2 + 2), str(i), fill=(255, 255, 0), stroke_width=2, stroke_fill=(0, 0, 0))
g.save(ART + 'tree-spots.png')
print('done:', len(T), 'trees removed')
