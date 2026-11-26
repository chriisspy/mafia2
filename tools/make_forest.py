"""THE FORGOTTEN FOREST (25 Nov 2026, the Glimmerkin hunt, batch 2): the secret place past the gap in the town's west trees.
Same method as the South (tools/make_south.py): the GROUND is one Nano Banana Pro picture cut to real game pixels, with a walk
mask (white = walk); the mural, the Moonmoss and the torn map are separate pictures cut off magenta. Sources: ../mafia2-art/forest/.
Also here: Pip mended (his splint painted out of the four views) and the gap in the town's tree wall (two small patches,
painted over the town ground by forest.js: the town's own pictures are never touched).
  python -I tools/make_forest.py [ground] [walk] [props] [map] [pip] [gap]      (from the game folder; no names = all)"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
SRC, OUT = '../mafia2-art/forest/', 'assets/forest/'
ARGS = sys.argv[1:]
want = lambda k: not ARGS or k in ARGS
os.makedirs(OUT, exist_ok=True)

def phase(a, cell):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        n = len(d) - 1
        sc = [d[np.round(np.arange(p, n, cell)).astype(int)].sum() for p in np.arange(0, cell, .5)]
        out.append((int(np.argmax(sc)) * .5 + 1) % cell)
    return out

def cell_size(a, lo=6.0, hi=40.0):
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
    m = max(1, int(cell * .25)); small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0 = int(round(oy + y * cell)); row = a[y0 + m:max(y0 + m + 1, int(round(oy + (y + 1) * cell)) - m)]
        for x in range(W):
            x0 = int(round(ox + x * cell)); small[y, x] = np.median(row[:, x0 + m:max(x0 + m + 1, int(round(ox + (x + 1) * cell)) - m)].reshape(-1, 3), axis=0)
    return small

def keyed(small):
    s = small.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
    return ((r > 120) & (b > 120) & (g < 110) & (r > g + 70) & (b > g + 70)) | ((b > 90) & (r > g + 35) & (b > g + 45) & (abs(r - b) < 70))   # magenta, and the purple it fades into

def cut(small, cols=48):
    """one prop off magenta: its own small palette, a clean edge, cropped"""
    solid = ~keyed(small); solid = nd.binary_opening(solid, iterations=1) | (solid & nd.binary_erosion(solid, iterations=1))
    lab, n = nd.label(solid, structure=np.ones((3, 3)))
    if n > 1: big = 1 + int(np.argmax(nd.sum(solid, lab, range(1, n + 1)))); solid = nd.binary_dilation(lab == big, iterations=3) & solid   # the prop and its own crumbs, not a neighbour's
    px = np.asarray(Image.fromarray(np.ascontiguousarray(small)).quantize(cols, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    img = np.dstack([px, solid.astype(np.uint8) * 255]); ys, xs = np.nonzero(solid)
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# ---- the ground: 4096 -> 800 x 800, the town's scale (ground-a: his rule, straight down; ground-b had a warm cobble strip and smeared mist) ----
# (25 Nov, his note "the map quality looks really weird, use the same pixel style as the main Town") v2: ground-d, redrawn by Nano Banana Pro from
# ground-a with HIS town night picture as the style reference, no mist. Then made to sit beside the town: its grass colour moved onto the town's
# own grass colour (dirt keeps some warmth), and the town's fine one-pixel grass speckle laid over the flat ground (never over roots, stones, outlines, the tree wall)
TOWN_GRASS = (130, 62, 187, 112)   # a plain grass patch on assets/town4/night.png: x0, y0, x1, y1
if want('ground'):
    a = np.asarray(Image.open(SRC + 'ground-d.png').convert('RGB'))
    f = sample(a, a.shape[1] / 800, grid=False).astype(float)
    t = np.asarray(Image.open('assets/town4/night.png').convert('RGB')).astype(float); x0, y0, x1, y1 = TOWN_GRASS; tg = t[y0:y1, x0:x1].reshape(-1, 3)
    fl = f.reshape(-1, 3); L = fl.sum(1); fg = fl[(L > np.percentile(L, 55)) & (L < np.percentile(L, 85))]   # the forest's grass: its lit clearings
    k = tg.mean(0) / fg.mean(0); warm = np.clip((f[..., 0] - f[..., 2] * .55) / 25, 0, 1)[..., None]   # dirt: red near blue
    g = f * (k * (1 - warm * .65) + warm * .65)
    sp = np.random.default_rng(7).random(f.shape[:2]); s = np.zeros(f.shape[:2]); s[sp < .18] = -1; s[sp > .80] = 1; s[sp > .965] = 2.2   # sparse darker / lighter single pixels, a few bright
    T = s[..., None] * tg.std(0).mean() * 1.1 * np.array([.8, 1, 1.15]) * np.clip(g.mean(-1, keepdims=True) / 60, .3, 1.2)
    edge = nd.maximum_filter(np.abs(f - nd.uniform_filter(f, (3, 3, 1))).sum(-1), 3); flat = np.clip(1 - (edge - 12) / 25, 0, 1)
    flat[nd.uniform_filter(f.mean(-1), 11) < 45] = 0
    img = np.clip(g + T * flat[..., None], 0, 255).astype(np.uint8); Image.fromarray(img).save(OUT + 'night.png', optimize=True); print('ground', img.shape[1], 'x', img.shape[0])

# ---- the walk mask (white = walk): the dark tree wall and the pond are solid; he paints the rest in the map builder ----
POND = (112, 566, 276, 700)        # the pond's box on the ground
BLOCK = []                         # extra solid boxes (stumps and the like): [x0, y0, x1, y1]
ENTRY = (790, 392)                 # the path in from the town, on the right edge
TOP = 96                           # nothing above this row is floor (the notch in the top wall leads nowhere)
WALL_LUM = 52                      # the tree wall is the darkest thing on the map
if want('walk'):
    a = np.asarray(Image.open(OUT + 'night.png').convert('RGB')).astype(int); h, w = a.shape[:2]
    lum = a.sum(-1) / 3; dark = nd.binary_opening(nd.uniform_filter(lum, 11) < WALL_LUM, iterations=2)   # dark on the whole (leaves with a few lit tips), not the thin outlines of rocks, roots and ferns
    edge = np.zeros_like(dark); edge[0] = edge[-1] = True; edge[:, 0] = edge[:, -1] = True
    lab, n = nd.label(dark | edge); wall = nd.binary_dilation(lab == lab[0, 0], iterations=2)   # the wall is the dark that reaches the edge of the map
    ok = ~wall
    water = (a[..., 2] - a[..., 1] > 95) | (lum > 150) & (a[..., 2] > a[..., 0] + 12); water[:POND[1]] = False; water[POND[3]:] = False; water[:, :POND[0]] = False; water[:, POND[2]:] = False
    # (v2 ground: the pond is deep saturated blue, not bright)
    ok &= ~nd.binary_dilation(nd.binary_closing(water, iterations=4), iterations=3)
    for x0, y0, x1, y1 in BLOCK: ok[y0:y1, x0:x1] = False
    ok[:TOP] = False; ok[-6:] = False; ok[:, :6] = False; ok[ENTRY[1] - 12:ENTRY[1] + 12, -30:] = True   # the open notch in the top wall is not a way out; the path to the town reaches the very edge
    lab, n = nd.label(ok); keep = lab == lab[ENTRY[1], ENTRY[0]]
    Image.fromarray((keep * 255).astype(np.uint8)).save(OUT + 'night-walk.png', optimize=True); print('walk mask', keep.mean().round(3))

# ---- the mural (props-b: flat, the same bevel all round; props-a's slab showed a front lip = angled, not used) and the Moonmoss (props-a) ----
if want('props'):
    b = np.asarray(Image.open(SRC + 'props-b.png').convert('RGB')); cb = 24; sb = sample(b[:1150], cb)   # its painted cells are 12 wide: every second one, or the slab is as wide as the screen
    m = cut(sb, 40); Image.fromarray(m).save(OUT + 'mural.png', optimize=True); print('mural cell', cb, m.shape[1], 'x', m.shape[0])
    a = np.asarray(Image.open(SRC + 'props-a.png').convert('RGB'))[1230:]; ca = cell_size(a, 8, 30); sa = sample(a, ca)
    solid = ~keyed(sa); lab, n = nd.label(nd.binary_dilation(solid, iterations=2)); boxes = sorted([sl for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 60], key=lambda s: s[1].start)
    for i, sl in enumerate(boxes[:4]):
        s = sa[sl].copy(); q = s.astype(int); s[q[..., 0] > q[..., 1] + 8] = (255, 0, 255)   # moss is never redder than it is green: that is magenta showing through its edge
        p = cut(s, 16); Image.fromarray(p).save(OUT + f'moss{i + 1}.png', optimize=True); print('moss', i + 1, 'cell', ca, p.shape[1], 'x', p.shape[0])

# ---- the torn map: one picture, shown big when you look at it ----
MAP_SRC = 'map-c.png'
if want('map'):
    a = np.asarray(Image.open(SRC + MAP_SRC).convert('RGB')); c = 7.5; m = cut(sample(a, c), 56)   # its painted cells (the finder says 15, twice too big: the fireflies and the planks go)
    print('map cell', c, m.shape[1], 'x', m.shape[0]); m = m.copy()
    for x, y in [(176, 38), (204, 30), (215, 60), (232, 44), (250, 70), (190, 70), (244, 28)]:   # the fireflies among the trees: the cut loses the painted ones (single source cells), so they are set back by hand
        if m[y, x, 3]: m[y - 1:y + 2, x] = m[y, x - 1:x + 2] = (255, 216, 74, 255); m[y, x] = (255, 246, 192, 255)
    Image.fromarray(m).save(OUT + 'map.png', optimize=True)

# ---- the mural's four shapes, set again by hand: at the slab's game size the painted grooves go soft, and the ORDER is the whole point
#      (circle = Moon, triangle = Fang, square = Hearth, diamond = Ember). The stone, its cracks and its moss stay the AI's. ----
if want('props'):
    m = np.asarray(Image.open(OUT + 'mural.png').convert('RGBA')).copy(); h, w = m.shape[:2]; rgb = m[..., :3].astype(int)
    stone = np.median(rgb[12:h - 12, 8:w - 8].reshape(-1, 3), axis=0); mossy = (rgb[..., 0] > rgb[..., 2] - 20)   # the brown-green moss stays where it is
    inner = np.zeros((h, w), bool); inner[10:h - 10, 6:w - 6] = True; wipe = inner & ~mossy
    tex = nd.uniform_filter(rgb.astype(float), (9, 9, 1)); m[wipe, :3] = (tex[wipe] * .35 + stone * .65).astype(np.uint8)   # the old soft grooves, smoothed back into flat stone
    G, L = (38, 62, 112, 255), (190, 236, 255, 255); cy = h // 2
    def ring(test):   # a 2 px groove: dark outside, lit inside
        for y in range(h):
            for x in range(w):
                d = test(x + .5, y + .5)
                if 0 <= d < 1.5: m[y, x] = G
                elif 1.5 <= d < 2.6: m[y, x] = L
    R = 8.5
    for i, cx in enumerate([w * .15, w * .385, w * .615, w * .85]):
        cx = round(cx) + .5
        if i == 0: ring(lambda x, y: R - np.hypot(x - cx, y - cy - .5))
        if i == 1: ring(lambda x, y: min(y - (cy - R + .5), (R + cy - y) * 0 + ((x - cx) * 2 + (y - (cy - R)) ) / 2.236 if x < cx else ((cx - x) * 2 + (y - (cy - R))) / 2.236, (cy + R) - y))
        if i == 2: ring(lambda x, y: R - .5 - max(abs(x - cx), abs(y - cy - .5)))
        if i == 3: ring(lambda x, y: (R + 1.5 - (abs(x - cx) + abs(y - cy - .5))) / 1.414)
    Image.fromarray(m).save(OUT + 'mural.png', optimize=True); print('mural shapes set')

# ---- PIP, MENDED: his own four pictures (tools/make_glimmerkin.py) with the splint painted out of his side and the frown turned up ----
if want('pip'):
    for d in ('front', 'right', 'back', 'left'):
        a = np.asarray(Image.open(f'assets/final/pip/{d}.png').convert('RGBA')).copy(); h, w = a.shape[:2]; q = a.astype(int)
        if d in ('right', 'left'):
            body = np.median(q[20:28][(q[20:28, :, 3] > 200) & (q[20:28, :, 2] >= q[20:28, :, 1]) & (q[20:28, :, 0] > 150)][:, :3], axis=0)
            inside = nd.binary_erosion(q[..., 3] > 200, iterations=2)                 # not his outline: that stays
            for y in range(20, 29):
                for x in range(w):
                    xr = x if d == 'right' else w - 1 - x
                    r, g, b, al = q[y, x]
                    if 10 <= xr <= 20 and inside[y, x] and not (y < 22 and xr < 13 and g > b + 8 and g >= r): a[y, x, :3] = body   # the sticks, their ties and the bandage under them: plain belly again (his ear's tip is left alone)
        if d == 'front':
            ink, skin = a[15, 14].copy(), a[15, 13].copy()
            a[15, 14] = a[15, 15] = skin; a[16, 13] = a[16, 16] = skin; a[15, 13] = a[15, 16] = ink; a[16, 14] = a[16, 15] = ink   # the same mouth, the other way up
        Image.fromarray(a).save(f'assets/final/pip/well-{d}.png', optimize=True)
    print('pip mended')

# ---- THE GAP in the town's west tree wall ("where the trees forget to grow"): a narrow run of trodden snow through the trees to the edge
#      of the map, darker the deeper under them it goes, its sides nibbled by the tips of the trees it passes. Two patches (day, night), the
#      same shape, laid over the town ground at GAP by forest.js when the game loads. The town's own pictures are not changed. ----
GAP = (0, 457, 44, 24)   # (26 Nov) 2 px wider, over a dark speck in the town picture at the gap's mouth   # x, y, w, h on the town picture (the game's x is 120 less)
if want('gap'):
    x0, y0, gw, gh = GAP; mid = gh // 2
    half = lambda x: 4 + round(3 * min(1, x / 34))                                        # a wedge: 8 px at the map's edge, 14 at its mouth
    tooth = lambda x, ph: abs((x + ph) % 6 - 3) - 1                                       # pine tips along both sides, like the wall's own edge
    for name, src in (('day', 'assets/xmas/day-big.webp'), ('night', 'assets/xmas/night-big.webp')):
        t = np.asarray(Image.open(src).convert('RGB')).astype(float); out = np.zeros((gh, gw, 4), np.uint8)
        wall = t[y0 - 30:y0 + gh + 30, 0:30].reshape(-1, 3); lum = wall.sum(1); dark, tip = np.median(wall[lum < np.percentile(lum, 50)], axis=0), np.median(wall[lum > np.percentile(lum, 92)], axis=0)
        for x in range(gw):
            a, b = mid - half(x) + tooth(x, 0), mid + half(x) - tooth(x, 3)
            for y in range(a, b):
                snow = t[y0 + y, x0 + gw + 1 + (x * 7 + y * 3) % 4]   # (26 Nov) the ground RIGHT at the gap's mouth, so the path is the same blue it opens onto                       # the open snow just outside the trees, a little shuffled so it is not a smear
                out[y, x] = (*snow, 255)   # (26 Nov, his note) the SAME blue as the ground it opens onto: no shading toward the edge, no dark rim, no needle tips (they read as black pixels)
        Image.fromarray(out).save(OUT + f'gap-{name}.png', optimize=True)
    print('gap patches', gw, 'x', gh)
