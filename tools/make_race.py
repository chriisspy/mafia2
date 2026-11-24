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

WRONG_ARROWS = [(930, 560, 1085, 665), (2005, 880, 2050, 965)]
def ground():
    a = np.asarray(Image.open(SRC + 'track-src.png').convert('RGB'))
    small = sample(a, a.shape[1] / GW, grid=False).copy()
    for x0, y0, x1, y1 in WRONG_ARROWS:                                                         # the AI painted a few arrows pointing against the way you race: asphalt over them
        for y in range(y0, y1): small[y, x0:x1] = small[y, x0 - 3]
    Image.fromarray(small).save(OUT + 'track.png', optimize=True); print('ground', small.shape[1], 'x', small.shape[0])
    # (24 Nov) what the game loads: 256 colours, lossless webp: 1.5 MB instead of 5.2 MB for phones, looks the same (mean change 1.4 of 255)
    Image.fromarray(small).quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB').save(OUT + 'track.webp', lossless=True, method=6)

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
TREES = [(90, 70, 935, 455), (1630, 440, 1840, 775), (415, 722, 478, 775), (935, 1580, 1035, 1650)]   # the snowy pines (and two big rocks) painted on the ground
def masks():
    a = np.asarray(Image.open(OUT + 'track.png').convert('RGB')).astype(int); h, w = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; lum = a.sum(-1) / 3; sat = a.max(-1) - a.min(-1)
    forest = (lum < 100) & (g > r + 6) & (b > r)                                               # the dark teal forest round the edge
    forest = nd.binary_closing(nd.binary_opening(forest, iterations=2), iterations=4)
    ok = ~nd.binary_dilation(forest, iterations=3)
    for x0, y0, x1, y1 in TREES: ok[y0:y1, x0:x1] = False
    ok[:4, :] = ok[-4:, :] = False; ok[:, -4:] = False; ok[:, :2] = False
    lab, n = nd.label(ok); ok = lab == lab[1340, 30]                                            # only what joins the road in from the South
    road = (sat < 34) & (lum > 60) & (lum < 185)                                               # asphalt and the two concrete plots: grey
    road = nd.binary_opening(road, iterations=2); road = nd.binary_closing(road, iterations=9)   # the painted lines and the start line fill in
    lab, n = nd.label(road); sizes = nd.sum(road, lab, range(1, n + 1)); road = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 3000])
    road = nd.binary_dilation(road, iterations=5)                                              # the kerbs count as road
    kerb = nd.binary_dilation((r > 150) & (g < 95) & (b < 95), iterations=4) & nd.binary_dilation(road, iterations=2)          # the red and white kerbs (blue): they rumble
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
if want('grandstand'): sprite('grandstand-src.png', OUT + 'grandstand.png', 20)
if want('gantry'): sprite('gantry-src.png', OUT + 'gantry.png', 20, wipe=(936, 1500, 3888, 3400))
if want('pits'): sprite('pits-src.png', OUT + 'pits.png', 20)
if want('props'): props()
if want('mechanic'): mechanic()
if want('masks'): masks()
if want('shadows'):
    for f in ['garage.png', 'grandstand.png', 'gantry.png', 'pits.png'] + [n + '.png' for n in PROPS if n]: drop_shadow(OUT + f)
    print('shadows added')
