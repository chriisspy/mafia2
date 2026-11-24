"""THE RACE TRACK (24 Nov 2026, his ask): the map out of the South's east road. Same method as the town and the South (his rule):
the GROUND is one 2D picture on its own (Nano Banana Pro, painted to tools/make_race_sketch.py's plan), and the garage, the
grandstand and the Mechanic are separate pictures placed on top. Sources: Dropbox/Documents/claude chrispy/mafia2-art/race/.
This turns each source into real game pixels (the AI's pixel grid -> the middle colour of every cell; magenta cut away).
The tyre barriers and the car are NOT pictures: they are sprite stacks (tools/make_tyres.py, tools/make_racecar.py).
  python -I tools/make_race.py [ground] [garage] [grandstand] [mechanic] [masks] [shadows]      (from the game folder; none = all)"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
SRC = '../mafia2-art/race/'
OUT = 'assets/race/'
PROP_CELL = 22.9
GW = 2400                                     # round 2: the track is 2400 x 1800 game pixels (the South is 800 wide): the same scale as the town, a much longer lap

def phase(a, cell):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        n = len(d) - 1
        sc = [d[np.round(np.arange(p, n, cell)).astype(int)].sum() for p in np.arange(0, cell, .5)]
        out.append((int(np.argmax(sc)) * .5 + 1) % cell)
    return out

def cell_size(a, lo=10.0, hi=50.0):
    """the AI's pixel size: the spacing whose grid lines catch the most colour edges"""
    best = (0, 0)
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1).astype(float)
        for c in np.arange(lo, hi, .1):
            n = len(d) - 1
            sc = max(d[np.round(np.arange(p, n, c)).astype(int)].mean() for p in np.linspace(0, c, 16, endpoint=False))
            if sc > best[0] * 1.08: best = (sc, round(float(c), 1))
    return best[1]

def sample(a, cell, grid=True):
    ox, oy = phase(a, cell) if grid else (0, 0); H, W = int((a.shape[0] - oy) // cell), int((a.shape[1] - ox) // cell)
    m = max(1, int(cell * .25)) if cell >= 4 else 0; small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0 = int(round(oy + y * cell)); row = a[y0 + m:max(y0 + m + 1, int(round(oy + (y + 1) * cell)) - m)]
        for x in range(W):
            x0 = int(round(ox + x * cell)); small[y, x] = np.median(row[:, x0 + m:max(x0 + m + 1, int(round(ox + (x + 1) * cell)) - m)].reshape(-1, 3), axis=0)
    return small

def keyed(small):
    s = small.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
    return ((r > 120) & (b > 120) & (g < 110) & (r > g + 70) & (b > g + 70)) | ((b > 90) & (r > g + 35) & (b > g + 45) & (abs(r - b) < 70))

# ---- THE GROUND, round 3 (24 Nov, his note: "the race map looks like it lost the pixel art style in some areas. please rework this with
# nano banana pro ... a cool grassy race track full of details that a race track would have") ----
# One 4K picture cannot hold a 2250-pixel-wide map as real pixel art (the AI draws nothing finer than about 4 of its own pixels), which is
# why round 2 went soft. So: ONE master picture of the whole circuit (track2-master.png, painted to layout-sketch-grass.png), then its four
# overlapping quarters each redrawn at 4K as fine pixel art (track2-tl/tr/bl/br.png: 4 source pixels = 1 game pixel, they keep the master's
# layout to the pixel). Each quarter is cut to game pixels, toned to the master, and the four are joined along the paths where they differ least.
TW, TH, OX, OY = 1200, 896, 1050, 784          # a quarter in game pixels; where the right / lower quarters start. The world is 2250 x 1680.
QUARTERS = {'tl': (0, 0), 'tr': (2240, 0), 'bl': (0, 1672), 'br': (2240, 1672)}   # where each quarter was cut from the 4800 x 3584 master (2560 x 1912 each)
def cut4(path):
    """a 4800 x 3584 quarter -> 1200 x 896: every 4 x 4 cell becomes the real pixel nearest the median of its middle (no blended colours)"""
    a = np.asarray(Image.open(path).convert('RGB')).astype(int); H, W = a.shape[0] // 4, a.shape[1] // 4
    c = a[:H * 4, :W * 4].reshape(H, 4, W, 4, 3).transpose(0, 2, 1, 3, 4)[:, :, 1:3, 1:3].reshape(H, W, 4, 3); med = np.median(c, axis=2)
    k = np.abs(c - med[:, :, None, :]).sum(-1).argmin(-1); return np.take_along_axis(c, k[:, :, None, None], axis=2)[:, :, 0, :].astype(float)
def tone(t, ref):
    """one gain and one offset a channel, so the four quarters agree with the master (flat colours stay flat)"""
    out = t.copy()
    for ch in range(3):
        g = np.clip(ref[..., ch].std() / max(1e-6, t[..., ch].std()), .85, 1.18); out[..., ch] = (t[..., ch] - t[..., ch].mean()) * g + ref[..., ch].mean()
    return np.clip(out, 0, 255)
def seam(A, B):
    """A and B cover the same strip: the top-to-bottom path where they differ least; left of it is A, right of it is B"""
    d = np.abs(A - B).sum(-1); d = d + np.roll(d, 1, 1) + np.roll(d, -1, 1); h, w = d.shape; acc = d.copy(); back = np.zeros((h, w), int)
    for y in range(1, h):
        p = acc[y - 1]; c = np.stack([np.r_[1e18, p[:-1]], p, np.r_[p[1:], 1e18]]); k = c.argmin(0); acc[y] += c[k, np.arange(w)]; back[y] = k - 1
    xs = np.zeros(h, int); xs[-1] = acc[-1].argmin()
    for y in range(h - 1, 0, -1): xs[y - 1] = np.clip(xs[y] + back[y, xs[y]], 0, w - 1)
    return xs
def join_lr(L, R):
    ov = TW - OX; xs = seam(L[:, OX:], R[:, :ov]); out = np.zeros((L.shape[0], OX + TW, 3)); out[:, :TW] = L; out[:, TW:] = R[:, ov:]
    for y in range(L.shape[0]): out[y, OX + xs[y]:TW] = R[y, xs[y]:ov]
    return out
def join_tb(T, B):
    ov = TH - OY; ys = seam(T[OY:].transpose(1, 0, 2), B[:ov].transpose(1, 0, 2)); out = np.zeros((OY + TH, T.shape[1], 3)); out[:TH] = T; out[TH:] = B[ov:]
    for x in range(T.shape[1]): out[OY + ys[x]:TH, x] = B[ys[x]:ov, x]
    return out

# THE ADVERT BOARDS painted on the grass came back with made-up words on them: each gets a plain wordless logo instead (game pixels).
BOARDS = [((737, 1161, 827, 1192), 'bars'), ((839, 1161, 929, 1192), 'stripes'), ((935, 1161, 1026, 1192), 'ring'), ((1038, 1161, 1128, 1192), 'diamond'),
          ((1799, 716, 1829, 847), 'chevrons'), ((1799, 863, 1829, 970), 'dots')]
def boards(g):
    for (x0, y0, x1, y1), kind in BOARDS:
        r = g[y0:y1, x0:x1].astype(int); notgrass = ~((r[..., 1] > r[..., 0] + 25) & (r[..., 1] > r[..., 2] + 25) & (r[..., 1] > 120))
        ys, xs = np.nonzero(nd.binary_opening(notgrass, iterations=2)); bx0, bx1, by0, by1 = x0 + xs.min() + 3, x0 + xs.max() - 2, y0 + ys.min() + 3, y0 + ys.max() - 2   # inside its dark outline
        inner = g[by0:by1, bx0:bx1]; cols, n = np.unique(inner.reshape(-1, 3), axis=0, return_counts=True); bg = cols[n.argmax()]; inner[:] = bg
        h, w = inner.shape[:2]; cy, cx = h // 2, w // 2
        def box(xa, ya, xb, yb, c): inner[max(0, ya):max(0, yb), max(0, xa):max(0, xb)] = c
        if kind == 'bars':
            for k in range(3): box(cx - 14 + k * 11, cy - 6, cx - 8 + k * 11, cy + 6, (240, 240, 246))
        elif kind == 'stripes':
            for k in range(6): box(cx - 20 + k * 3, cy + 5 - k * 2, cx + 2 + k * 3, cy + 7 - k * 2, (20, 150, 130))
            box(cx - 20, cy + 9, cx + 20, cy + 11, (200, 60, 60))
        elif kind == 'ring':
            yy, xx = np.mgrid[0:h, 0:w]; d = np.hypot(xx - (cx - 16), yy - cy); inner[(d < 8) & (d >= 5)] = (110, 190, 80); box(cx - 2, cy - 2, cx + 24, cy + 2, (110, 190, 80))
        elif kind == 'diamond':
            box(cx - 24, cy - 7, cx + 24, cy + 7, (220, 110, 50)); yy, xx = np.mgrid[0:h, 0:w]; inner[np.abs(xx - cx) + np.abs(yy - cy) < 6] = (250, 210, 90)
        elif kind == 'chevrons':
            yy, xx = np.mgrid[0:h, 0:w]
            for k in range(4): v = yy - (18 + k * 26) + (7 - np.abs(xx - cx)); inner[(v >= 0) & (v < 4) & (np.abs(xx - cx) < 8)] = (250, 250, 250)
        elif kind == 'dots':
            yy, xx = np.mgrid[0:h, 0:w]
            for k in range(3): inner[np.hypot(xx - cx, yy - (20 + k * 30)) < 7] = (60, 110, 200)

def ground():
    m = Image.open(SRC + 'track2-master.png').convert('RGB'); t = {}
    for n, (x, y) in QUARTERS.items():
        ref = np.asarray(m.crop((x, y, x + 2560, y + 1912)).resize((TW, TH), Image.BOX)).astype(float); t[n] = tone(cut4(SRC + f'track2-{n}.png'), ref)
    small = np.clip(join_tb(join_lr(t['tl'], t['tr']), join_lr(t['bl'], t['br'])), 0, 255).round().astype(np.uint8); boards(small)
    Image.fromarray(small).save(OUT + 'track.png', optimize=True); print('ground', small.shape[1], 'x', small.shape[0])
    # what the game loads: 256 colours, lossless webp (small for phones). libimagequant-style palette (FASTOCTREE then k-means), so the small bright
    # things (kerbs, cones, flowers) keep their colour; median cut greyed them.
    q = Image.fromarray(small).quantize(256, method=Image.Quantize.FASTOCTREE, kmeans=2, dither=Image.Dither.NONE).convert('RGB')
    q.save(OUT + 'track.webp', lossless=True, method=6); print('webp: mean change', np.abs(np.asarray(q).astype(int) - small).mean().round(2))

def sprite(src, out, cell, cols=64, wipe=None):
    a = np.asarray(Image.open(SRC + src).convert('RGB'))
    if wipe: a = a.copy(); a[wipe[1]:wipe[3], wipe[0]:wipe[2]] = (255, 0, 255)   # (the gantry came back with the reference building painted inside its arch: cut that out)
    if cell is None: cell = cell_size(a)
    small = sample(a, cell); mag = keyed(small); solid = ~mag
    solid = nd.binary_opening(solid, iterations=1) | (solid & nd.binary_erosion(solid, iterations=1))
    lab, n = nd.label(solid, structure=np.ones((3, 3))); sizes = nd.sum(solid, lab, range(1, n + 1))
    solid = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 30])                       # stray specks go
    rgb = np.asarray(Image.fromarray(small).quantize(cols, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    img = np.dstack([rgb, np.where(solid, 255, 0).astype(np.uint8)])
    ys, xs = np.nonzero(img[..., 3]); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    os.makedirs(os.path.dirname(out), exist_ok=True); Image.fromarray(img).save(out, optimize=True); print(out, 'cell', cell, '->', img.shape[1], 'x', img.shape[0])

def mechanic():
    """the four views in a row -> assets/final/mechanic/{front,right,back,left}.png (the Blacksmith's method)"""
    a = np.asarray(Image.open(SRC + 'mechanic-src.png').convert('RGB')); cell = 45.8
    small = sample(a, cell); solid = ~keyed(small)
    solid = nd.binary_opening(solid, iterations=1) | (solid & nd.binary_erosion(solid, iterations=1))
    lab, n = nd.label(solid, structure=np.ones((3, 3)))
    boxes = sorted([sl for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 200], key=lambda sl: sl[1].start)
    os.makedirs('assets/final/mechanic', exist_ok=True)
    for nm, sl in zip(['front', 'right', 'back', 'left'], boxes):
        piece = np.asarray(Image.fromarray(np.ascontiguousarray(small[sl])).quantize(40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
        img = np.dstack([piece, (solid[sl] & (lab[sl] == lab[sl][solid[sl]].max() if False else solid[sl])).astype(np.uint8) * 255])
        ys, xs = np.nonzero(img[..., 3]); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(img).save(f'assets/final/mechanic/{nm}.png', optimize=True); print('mechanic', nm, img.shape[1], 'x', img.shape[0])

# ---- the small trackside props: eight on one magenta sheet, two rows of four -> one PNG each (the angled hut is left out: his rule, nothing on an angle) ----
PROPS = ['board-tyre', 'board-cup', 'floodlight', 'flag', '', 'snowman', 'hay', 'podium']
def props():
    a = np.asarray(Image.open(SRC + 'props-src.png').convert('RGB')); cell = PROP_CELL
    small = sample(a, cell); solid = ~keyed(small)
    solid = nd.binary_opening(solid, iterations=1) | (solid & nd.binary_erosion(solid, iterations=1))
    lab, n = nd.label(nd.binary_dilation(solid, iterations=3), structure=np.ones((3, 3)))
    boxes = [sl for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 150]
    mid = small.shape[0] / 2; rows = [sorted([b for b in boxes if (b[0].start + b[0].stop) / 2 < mid], key=lambda b: b[1].start), sorted([b for b in boxes if (b[0].start + b[0].stop) / 2 >= mid], key=lambda b: b[1].start)]
    for nm, sl in zip(PROPS, rows[0] + rows[1]):
        if not nm: continue
        piece = np.asarray(Image.fromarray(np.ascontiguousarray(small[sl])).quantize(40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
        img = np.dstack([piece, solid[sl].astype(np.uint8) * 255]); ys, xs = np.nonzero(img[..., 3]); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(img).save(OUT + nm + '.png', optimize=True); print('prop', nm, img.shape[1], 'x', img.shape[0])

# ---- MASKS, read off the finished ground: where you can go at all (red), and where the road is (green: fast; off it a car is slow) ----
PADDOCK = (132, 1050, 606, 1474)                 # the concrete plot (game pixels): it drives like road
YARD = (40, 900, 1290, 1500)                     # the paddock's corner of the map (the pond, the pit lane, the advert boards): all of it is open
def masks():
    a = np.asarray(Image.open(OUT + 'track.png').convert('RGB')).astype(int); h, w = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; lum = a.sum(-1) / 3; sat = a.max(-1) - a.min(-1)
    leaf = (g > r + 12) & (lum < 75)                                                           # the trees' and bushes' dark leaves and outlines (the grass, even in shade, is lighter)
    forest = nd.gaussian_filter(leaf.astype(float), 5) > .16
    forest = nd.binary_closing(nd.binary_opening(forest, iterations=2), iterations=4)
    water = nd.binary_opening((b > 170) & (b > r + 60), iterations=2)                          # the pond
    wood = (r > 90) & (r < 190) & (g > 60) & (g < 140) & (b < 105) & (r > g + 10) & (g > b + 12)   # the wooden fences (and the flower beds' soil)
    wood = nd.binary_dilation(nd.binary_opening(wood, iterations=1), iterations=2)
    ok = ~(nd.binary_dilation(forest, iterations=2) | water | wood)
    lab, n = nd.label(~ok); sizes = nd.sum(~ok, lab, range(1, n + 1)); ok |= np.isin(lab, [i + 1 for i, z in enumerate(sizes) if z < 150])   # a flower is not a wall
    road = (sat < 34) & (lum > 55) & (lum < 128)                                               # asphalt (the service roads and the fences are lighter)
    road = nd.binary_opening(road, iterations=3); road = nd.binary_closing(road, iterations=9)   # the painted lines and the start line fill in
    lab, n = nd.label(road); sizes = nd.sum(road, lab, range(1, n + 1)); road = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 3000])
    road[PADDOCK[1]:PADDOCK[3], PADDOCK[0]:PADDOCK[2]] = True
    road[918:954, 1873:1998] = True                                                            # the chequered start line is road too
    # the catch fence round the outside stops you: nothing further than 95 px out from the road is open (that is about where the fence is
    # painted), except the infield and the paddock's corner of the map
    near = nd.distance_transform_edt(~road) < 95; near |= nd.binary_fill_holes(nd.binary_dilation(road, iterations=8)); near[YARD[1]:YARD[3], YARD[0]:YARD[2]] = True; ok &= near
    ok[:4, :] = ok[-4:, :] = False; ok[:, -4:] = False; ok[:, :2] = False
    lab, n = nd.label(ok); ok = lab == lab[1250, 30]                                            # only what joins the road in from the South
    road = nd.binary_dilation(road, iterations=5)                                              # the kerbs count as road
    kerb = nd.binary_dilation((r > 150) & (g < 110) & (b < 110), iterations=4) & nd.binary_dilation(road, iterations=2)          # the red and white kerbs (blue): they rumble
    out = np.zeros((h, w, 3), np.uint8); out[..., 0] = ok * 255; out[..., 1] = (road & ok) * 255; out[..., 2] = (kerb & ok) * 255
    Image.fromarray(out).save(OUT + 'mask.png', optimize=True); print('masks: open', ok.mean().round(3), 'road', road.mean().round(3))

def drop_shadow(path):
    """HIS PROP SHADOW (18 Nov): two rows of flat (18,28,58,a96) under whatever touches the ground, no angle"""
    im = np.asarray(Image.open(path).convert('RGBA')).copy(); h, w = im.shape[:2]
    if (im[-1, :, :3] == (18, 28, 58)).all(-1).any(): return
    out = np.zeros((h + 2, w, 4), np.uint8); out[:h] = im; a = im[..., 3] > 0
    for x in range(w):
        ys = np.nonzero(a[:, x])[0]
        if len(ys) and ys[-1] >= h - 3:
            for k in (1, 2):
                if out[ys[-1] + k, x, 3] == 0: out[ys[-1] + k, x] = (18, 28, 58, 96)
    Image.fromarray(out).save(path, optimize=True)

os.makedirs(OUT, exist_ok=True)
A = sys.argv[1:]; want = lambda k: not A or k in A
if want('ground'): ground()
if want('garage'): sprite('garage-src.png', OUT + 'garage.png', 20)
if want('gantry'): sprite('gantry-src.png', OUT + 'gantry.png', 20, wipe=(936, 1500, 3888, 3400))
if want('pits'): sprite('pits-src.png', OUT + 'pits.png', 20)
if want('props'): props()
if want('mechanic'): mechanic()
if want('masks'): masks()
if want('shadows'):
    for f in ['garage.png', 'grandstand.png', 'gantry.png', 'pits.png'] + [n + '.png' for n in PROPS if n]: drop_shadow(OUT + f)
    print('shadows added')
