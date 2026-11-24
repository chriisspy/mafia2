"""THE SOUTH (24 Nov 2026, his ask): the new map section below the town, plus its buildings and the Blacksmith's inside.
Same method as the town (his rule): the GROUND is the bottom layer on its own, and every building / entrance / prop is a
separate picture placed on top. All art is Nano Banana Pro (sources in Dropbox/Documents/claude chrispy/mafia2-art/south/).
This turns each source into real game pixels: finds the AI's pixel grid, takes the middle colour of every cell, cuts the
magenta away (sprites), snaps the colours to a small palette.
  python -I tools/make_south.py [names...]      (from the game folder; no names = all)"""
import os, sys
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SRC = '../mafia2-art/south/'
# name: (source, out file, cell size in source pixels, kind, colours)
JOBS = {
    'blacksmith': ('blacksmith-src.png', 'assets/buildings/blacksmith.png', 20, 'sprite', 64),
    'cave': ('cave-front-a.png', 'assets/south/mine.png', 40.6, 'sprite', 64),   # (24 Nov, his calls) small, simple, STRAIGHT-ON south-facing mine entrance (angled tries rejected: cave-side-*.png, cave-top-*.png unused)
    'smithy': ('smithy-in-src.png', 'assets/interiors/smithy.png', 15, 'room', 110),   # the Tavern's grid
    'minein': ('mine-in-src.png', 'assets/interiors/mine.png', 15, 'room', 110),
    'ground': ('ground2-b.png', 'assets/south/day.png', 4096 / 800, 'ground', 0),   # (24 Nov, his ask) v2: better layout, NO trees (he adds his own), 800 x 800 (was 992 tall). v1 kept as mafia2-art/south/day-v1.png   # the same scale as the town: 800 wide
}

def cell_size(a, lo=6.0, hi=40.0):
    """the AI's pixel size: the spacing whose grid lines catch the most colour edges"""
    best = (0, 0)
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1).astype(float)
        for c in np.arange(lo, hi, .1):
            n = len(d) - 1
            sc = max(d[np.round(np.arange(p, n, c)).astype(int)].mean() for p in np.linspace(0, c, 16, endpoint=False))
            if sc > best[0] * 1.08: best = (sc, round(float(c), 1))   # a bigger cell only wins clearly (multiples tie)
    return best[1]

def phase(a, cell):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        n = len(d) - 1
        sc = [d[np.round(np.arange(p, n, cell)).astype(int)].sum() for p in np.arange(0, cell, .5)]
        out.append((int(np.argmax(sc)) * .5 + 1) % cell)
    return out

def sample(a, cell):
    ox, oy = phase(a, cell); H, W = int((a.shape[0] - oy) // cell), int((a.shape[1] - ox) // cell)
    m = max(1, int(cell * .25)); small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0 = int(round(oy + y * cell)); row = a[y0 + m:int(round(oy + (y + 1) * cell)) - m]
        for x in range(W):
            x0 = int(round(ox + x * cell)); small[y, x] = np.median(row[:, x0 + m:int(round(ox + (x + 1) * cell)) - m].reshape(-1, 3), axis=0)
    return small

def run(name):
    src, out, cell, kind, cols = JOBS[name]
    a = np.asarray(Image.open(SRC + src).convert('RGB'))
    if cell is None: cell = cell_size(a)
    small = sample(a, cell); os.makedirs(os.path.dirname(out), exist_ok=True)
    if kind == 'sprite':
        s = small.astype(int); r_, g_, b_ = s[..., 0], s[..., 1], s[..., 2]
        mag = ((r_ > 150) & (b_ > 150) & (g_ < 110) & (np.abs(r_ - b_) < 90)) | ((b_ > 90) & (r_ > g_ + 35) & (b_ > g_ + 45) & (np.abs(r_ - b_) < 70))   # magenta and the purple fringe it leaves on the edges
        rgb = np.asarray(Image.fromarray(small).quantize(cols, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
        img = np.dstack([rgb, np.where(mag, 0, 255).astype(np.uint8)])
        ys, xs = np.nonzero(img[..., 3]); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(img).save(out, optimize=True)
    elif kind == 'room':
        dark = small.astype(int).sum(-1) < 40; ys, xs = np.nonzero(~dark)
        small = small[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        px = np.asarray(Image.fromarray(small).quantize(cols, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')).copy()
        px[small.astype(int).sum(-1) < 40] = 0; img = px
        Image.fromarray(img).save(out, optimize=True)
    else:   # ground: full colour, no palette squeeze (the town's ground is a lossless webp too)
        img = small; Image.fromarray(img).save(out, optimize=True)
    print(name, 'cell', cell, '->', img.shape[1], 'x', img.shape[0])

for n in (sys.argv[1:] or JOBS):
    if n in JOBS: run(n)

# ---- the south's WALK MASK (white = you can walk): dark forest by colour, plus hand-set shapes for the snowy pines and the pond ----
BLOCK_RECTS = []   # (24 Nov v2 ground: no trees; he paints the rest in the map builder)
POND = (564, 570, 736, 746)
def walk():
    a = np.asarray(Image.open('assets/south/day.png').convert('RGB')).astype(int); h, w = a.shape[:2]
    lum = a.sum(-1) / 3; ok = ~((lum < 95) & (a[..., 1] > a[..., 0] + 6))       # dark green-teal forest (not the grey asphalt)
    from scipy import ndimage as nd
    ok = nd.binary_opening(ok, iterations=3); ok = nd.binary_erosion(ok, iterations=2)
    for x0, y0, x1, y1 in BLOCK_RECTS: ok[y0:y1, x0:x1] = False
    yy, xx = np.mgrid[0:h, 0:w]; cx, cy, rx, ry = (POND[0] + POND[2]) / 2, (POND[1] + POND[3]) / 2, (POND[2] - POND[0]) / 2, (POND[3] - POND[1]) / 2
    ok &= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 > 1
    ok[:, :8] = ok[:, -8:] = False; ok[-6:, :] = False
    lab, n = nd.label(ok); keep = lab == lab[20, 400]                              # only what joins the road in at the top
    Image.fromarray((keep * 255).astype(np.uint8)).save('assets/south/day-walk.png', optimize=True)
    print('walk mask', keep.mean().round(3))
if 'walk' in sys.argv[1:] or not sys.argv[1:]: walk()

# ---- SHEETS: many props on one magenta picture -> one PNG each, in reading order (top row first, left to right) ----
# name: (source, cell, crop box in source px or None, out folder, [names...])
SHEETS = {
    'outdoor': ('outdoor-props-src.png', 21.4, None, 'assets/south/', ['mine', 'stall-red', 'stall-blue', 'stall-green', 'signpost']),   # the tall mine joins both rows, so the blue stall comes up second
    'ore': ('ore-src.png', 27.5, (0, 0, 5504, 1960), 'assets/mine/', ['ore1', 'ore2', 'ore3', 'ore4', 'rubble1', 'rubble2', 'rubble3', 'rubble4']),
    'smithchar': ('smith-char-src.png', 44.8, None, 'assets/final/smith/', ['front', 'right', 'back', 'left']),
    
    # named by where each one sits on the 1/5-size preview (x, y), not by order: the tall forge spans two rows
    'smithprops': ('smithy-props-src.png', 17.7, None, 'assets/smithy/', {'forge': (185, 230), 'anvil': (455, 145), 'counter': (760, 150), 'toolrack': (475, 355),
               'barrel': (690, 380), 'coal': (860, 380), 'grindstone': (165, 575), 'weaponrack': (470, 570), 'bellows': (780, 590)}),
}
def keyed(small):
    s = small.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
    return ((r > 120) & (b > 120) & (g < 110) & (r > g + 70) & (b > g + 70)) | ((b > 90) & (r > g + 35) & (b > g + 45) & (abs(r - b) < 70))   # magenta, and the purple it fades into
def sheet(name):
    src, cell, crop, out, names = SHEETS[name]
    a = np.asarray(Image.open(SRC + src).convert('RGB'))
    if crop: a = a[crop[1]:crop[3], crop[0]:crop[2]]
    small = sample(a, cell); mag = keyed(small)
    from scipy import ndimage as nd
    solid = ~mag; solid = nd.binary_opening(solid, iterations=1) | (solid & nd.binary_erosion(solid, iterations=1))
    lab, n = nd.label(nd.binary_dilation(solid, iterations=2) if name != 'smithchar' else solid, structure=np.ones((3, 3)))   # the four views stand close: no joining for them
    boxes = [(sl, (lab[sl] == i + 1).sum()) for i, sl in enumerate(nd.find_objects(lab))]
    boxes = [sl for sl, area in boxes if area > 40]
    rows = sorted(boxes, key=lambda sl: sl[0].start); out_rows = []
    for sl in rows:   # group into rows by vertical overlap
        for R in out_rows:
            if sl[0].start < R[0][0].stop and sl[0].stop > R[0][0].start: R.append(sl); break
        else: out_rows.append([sl])
    order = [sl for R in out_rows for sl in sorted(R, key=lambda sl: sl[1].start)]
    if isinstance(names, dict):   # by spot: each piece goes to the nearest named spot (the bellows are two pieces: both join it)
        k = cell / 5; groups = {}
        for sl in order:
            cy, cx = (sl[0].start + sl[0].stop) / 2 * k, (sl[1].start + sl[1].stop) / 2 * k
            nm = min(names, key=lambda q: (names[q][0] - cx) ** 2 + (names[q][1] - cy) ** 2); groups.setdefault(nm, []).append(sl)
        order = []; names2 = []
        for nm, L in groups.items():
            order.append((slice(min(q[0].start for q in L), max(q[0].stop for q in L)), slice(min(q[1].start for q in L), max(q[1].stop for q in L)))); names2.append(nm)
        names = names2
    rgb = np.asarray(Image.fromarray(small).quantize(64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    os.makedirs(out, exist_ok=True)
    for k, sl in enumerate(order):
        nm = names[k] if k < len(names) else f'{name}-extra{k}'
        al = (solid[sl] & (lab[sl] == lab[sl][lab[sl] > 0].max() if False else solid[sl])).astype(np.uint8) * 255
        piece = np.asarray(Image.fromarray(np.ascontiguousarray(small[sl])).quantize(40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))   # each prop its own palette (one for the whole sheet turned the blue stall green)
        img = np.dstack([piece, al]); ys, xs = np.nonzero(img[..., 3]); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(img).save(out + nm + '.png', optimize=True); print(name, nm, img.shape[1], 'x', img.shape[0])
for n in sys.argv[1:]:
    if n in SHEETS and SHEETS[n]: sheet(n)

# ---- HIS PROP SHADOW (18 Nov, Joe's stall): "a 2px drop shadow under the bottom ... no angle": two rows of flat (18,28,58,a96) under whatever touches the ground ----
def drop_shadow(path):
    im = np.asarray(Image.open(path).convert('RGBA')).copy(); h, w = im.shape[:2]
    out = np.zeros((h + 2, w, 4), np.uint8); out[:h] = im; a = im[..., 3] > 0
    for x in range(w):
        ys = np.nonzero(a[:, x])[0]
        if len(ys) and ys[-1] >= h - 3:   # this column reaches the ground
            for k in (1, 2):
                if out[ys[-1] + k, x, 3] == 0: out[ys[-1] + k, x] = (18, 28, 58, 96)
    Image.fromarray(out).save(path, optimize=True)
if 'shadows' in sys.argv[1:]:
    for f in ['assets/south/stall-red.png', 'assets/south/stall-blue.png', 'assets/south/stall-green.png', 'assets/south/signpost.png', 'assets/south/mine.png']: drop_shadow(f)
    print('shadows added')
