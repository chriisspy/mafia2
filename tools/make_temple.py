"""THE TEMPLE (26 Nov 2026, the Glimmerkin hunt, batch 4). Sources: ../mafia2-art/quest/temple/ (Nano Banana Pro).
  stack    the temple's OUTSIDE as a sprite stack, drawn here in code like the altar (tools/make_altar.py): the 4-view sheet temple-sheet-a.png
           did not agree with itself (its "top" view is seen at an angle, its steps are a different width in every view), so it is the colour
           and design reference only. -> assets/quest/temple.png (one row of S x S slices, ground slice first, the front faces DOWN) + temple.json,
           and its two sliding doors as a small stack of their own: assets/quest/tdoor.png (row 0 = the left leaf, row 1 = the right leaf).
           Read by the game's own STACK renderer (index.html stackFrame) at turn 0. A check sheet goes to the path given after "stack".
  hall     the throne hall, v2: its floor and walls drawn in code (ref-hall-b.png is the look) -> assets/interiors/throne.png, and its pillars and
           brazier stands as sprite stacks -> assets/quest/hpillar.png, hstand.png
  hollow   the hollow the temple stands in (hollow-a.png), put on the town's night grass like the forest -> assets/quest/hollow.png + hollow-walk.png
  rocks    the snowy boulders by the South's race road, with the cleft (rocks-a.png) -> assets/south/rocks.png
  python -I tools/make_temple.py [stack <check.png>] [hall] [hollow] [rocks]      (from the game folder; no names = all)"""
import os, sys, json, math
import numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC, OUT = '../mafia2-art/quest/temple/', 'assets/quest/'
ARGS = sys.argv[1:]
want = lambda k: not ARGS or k in ARGS
NAVY = (1, 3, 46)

# the forest's helpers (tools/make_forest.py; importing it would rebuild the forest)
def phase(a, cell):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        n = len(d) - 1
        sc = [d[np.round(np.arange(p, n, cell)).astype(int)].sum() for p in np.arange(0, cell, .5)]
        out.append((int(np.argmax(sc)) * .5 + 1) % cell)
    return out

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
    return ((r > 120) & (b > 120) & (g < 110) & (r > g + 70) & (b > g + 70)) | ((b > 90) & (r > g + 35) & (b > g + 45) & (abs(r - b) < 70))

# (the throne hall is built at the foot of this file: v2, in code. hall-a.png, its first floor, is no longer used)

# ---- the hollow: 1792 -> 400 wide, the town's scale; grass moved onto the town's own night grass + its fine speckle, as the forest's was ----
TOWN_GRASS = (130, 62, 187, 112)
if want('hollow'):
    a = np.asarray(Image.open(SRC + 'hollow-a.png').convert('RGB'))
    f = sample(a, a.shape[1] / 400, grid=False).astype(float)
    t = np.asarray(Image.open('assets/town4/night.png').convert('RGB')).astype(float); x0, y0, x1, y1 = TOWN_GRASS; tg = t[y0:y1, x0:x1].reshape(-1, 3)
    sat = f.max(-1) - f.min(-1); stone = (f.mean(-1) > 105) & (sat < 75)   # the court's pale slabs keep their own colour
    stone = nd.binary_dilation(nd.binary_closing(stone, iterations=2), iterations=1)
    fl = f[~stone]; L = fl.sum(1); fg = fl[(L > np.percentile(L, 45)) & (L < np.percentile(L, 80))]
    k = tg.mean(0) / fg.mean(0); warm = np.clip((f[..., 0] - f[..., 2] * .55) / 25, 0, 1)[..., None]
    g = f * (k * (1 - warm * .65) + warm * .65); g[stone] = f[stone]
    sp = np.random.default_rng(7).random(f.shape[:2]); s = np.zeros(f.shape[:2]); s[sp < .18] = -1; s[sp > .80] = 1; s[sp > .965] = 2.2
    T = s[..., None] * tg.std(0).mean() * 1.1 * np.array([.8, 1, 1.15]) * np.clip(g.mean(-1, keepdims=True) / 60, .3, 1.2)
    edge = nd.maximum_filter(np.abs(f - nd.uniform_filter(f, (3, 3, 1))).sum(-1), 3); flat = np.clip(1 - (edge - 12) / 25, 0, 1)
    flat[nd.uniform_filter(f.mean(-1), 11) < 45] = 0; flat[stone] = 0
    img = np.clip(g + T * flat[..., None], 0, 255).astype(np.uint8); Image.fromarray(img).save(OUT + 'hollow.png', optimize=True); print('hollow', img.shape[1], 'x', img.shape[0])
    # its walk mask (white = walk), the forest's way: the dark tree wall that reaches the edge is solid; the path runs off the bottom edge
    a = img.astype(int); h, w = a.shape[:2]; lum = a.sum(-1) / 3; dark = nd.binary_opening(nd.uniform_filter(lum, 9) < 46, iterations=2)
    edge = np.zeros_like(dark); edge[0] = edge[-1] = True; edge[:, 0] = edge[:, -1] = True
    lab, n = nd.label(dark | edge); wall = nd.binary_dilation(lab == lab[0, 0], iterations=2); ok = ~wall
    ok[:70] = False; ok[:, :34] = False; ok[:, -34:] = False; ok[-40:] = False; ok[-60:, 186:214] = True   # the trees' own trunks round the rim; the path out
    lab, n = nd.label(ok); keep = lab == lab[h - 4, 200]
    ys, xs = np.nonzero(stone & (np.arange(h)[:, None] < 260)); print('court', xs.min(), ys.min(), xs.max(), ys.max())
    Image.fromarray((keep * 255).astype(np.uint8)).save(OUT + 'hollow-walk.png', optimize=True); print('hollow walk', keep.mean().round(3))

# ---- the boulders: cells of 20 ----
if want('rocks'):
    a = np.asarray(Image.open(SRC + 'rocks-a.png').convert('RGB')); s = sample(a, 20)
    solid = ~keyed(s); solid = nd.binary_opening(solid, iterations=1) | (solid & nd.binary_erosion(solid, iterations=1))
    lab, n = nd.label(solid, structure=np.ones((3, 3))); big = 1 + int(np.argmax(nd.sum(solid, lab, range(1, n + 1)))); solid = lab == big
    px = np.asarray(Image.fromarray(np.ascontiguousarray(s)).quantize(40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    img = np.dstack([px, solid.astype(np.uint8) * 255]); ys, xs = np.nonzero(solid); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(img).save('assets/south/rocks.png', optimize=True); print('rocks', img.shape[1], 'x', img.shape[0])

# ---- THE TEMPLE, a sprite stack (v2, his notes on the first check sheet: better doors, real block stone, moss in clumps and drapes).
#      Its look is copied from two straight front-on Nano Banana Pro pictures, ref-front-a.png and ref-detail-a.png: the heavy panelled doors
#      with a glowing ring across their join and a rune on every block of the frame, big dressed blocks with a lit top edge, a dark foot,
#      rounded corners, cracks and chips, moss sat on the ledges and draped over their edges, vines down the pillars.
#      At turn 0 the front of every slice is one row of the facade, so the facade is drawn like a flat picture, z up. ----
S, N = 120, 114              # each slice is S x S; N slices
SEAM, DEEP, DK, MID, LT, HI = (38, 50, 102), (66, 84, 146), (100, 128, 182), (132, 166, 210), (158, 196, 232), (190, 224, 244)   # the altar's stone, shadows pushed cool
MOSS_HI, MOSS, MOSS_DK, VINE = (124, 146, 70), (88, 112, 58), (56, 80, 52), (42, 66, 58)
RUNE, RUNE_HI, RUNE_DIM = (120, 200, 255), (210, 245, 255), (84, 128, 190)
VOID = (8, 10, 34)           # the doorway. The game finds the doorway in the baked picture BY THIS COLOUR (temple.js): nothing else may use it
DOOR = (46, 74, 10, 52)      # the doorway in the front wall: x0, x1, z0, z1  (two leaves of 14 x 42)
FRONT = 82                   # the front wall's y
GLYPHS = [["#.#", "##.", "#.#", "#.#", "#.#"], ["###", "#..", "##.", "#..", "#.."], ["#..", "#.#", "##.", "#.#", "#.."],
          ["#.#", "#.#", ".#.", ".#.", ".#."], ["##.", "#.#", "##.", "#.#", "#.#"], ["#..", "##.", "#.#", "#..", "#.."]]
shade = lambda c, k: tuple(int(max(0, min(255, v * k + (6 if k < 1 and i == 2 else 0)))) for i, v in enumerate(c))

def shape(kind, x, y, r=4):   # the mural's four: is (x, y) from its middle on the carved line?
    if kind == 0: d = math.hypot(x, y); return r - .6 <= d <= r + .45
    if kind == 1: return (y == r and abs(x) <= r) or (-r <= y < r and abs(abs(x) - (y + r) / 2) < .6)
    if kind == 2: return max(abs(x), abs(y)) == r
    return abs(x) + abs(y) == r

def wall(w, h, seed, bh=8, bw=(11, 19), dark=0):
    """a wall of big dressed blocks, [z][x], z up: every block its own tone, a lit top edge, a dark foot, rounded corners, some cracked, some chipped"""
    r = np.random.default_rng(seed); T = np.zeros((h, w, 3), np.uint8); T[:] = SEAM
    z0 = 0; row = 0
    while z0 < h:
        hh = min(bh, h - z0); x0 = -int(r.integers(0, bw[0])) if row % 2 else 0
        while x0 < w:
            ww = int(r.integers(bw[0], bw[1] + 1)); a, b = max(0, x0), min(w, x0 + ww - 1)   # one column of seam between blocks, one row under each
            tone = [MID, MID, LT, shade(MID, .92), shade(MID, 1.06)][int(r.integers(5))]
            if z0 < dark: tone = shade(tone, .8)
            if b > a and hh > 2:
                T[z0 + 1:z0 + hh, a:b] = tone; T[z0 + hh - 1, a:b] = shade(tone, 1.16) if tone != LT else HI; T[z0 + 1, a:b] = shade(tone, .78)
                T[z0 + 1:z0 + hh, b - 1] = np.minimum(T[z0 + 1:z0 + hh, b - 1], shade(tone, .88))                                                # its right side, a touch darker
                for cz, cx in ((z0 + 1, a), (z0 + 1, b - 1), (z0 + hh - 1, a), (z0 + hh - 1, b - 1)):                                              # rounded corners
                    if x0 >= 0 or cx != a: T[cz, cx] = SEAM
                k = r.random()
                if k < .34 and b - a > 6:   # a crack: a jagged dark line in from an edge, a lit pixel beside it
                    cx, cz = int(r.integers(a + 2, b - 2)), z0 + hh - 1; dx = 1 if r.random() < .5 else -1
                    for i in range(int(r.integers(3, hh))):
                        if not (a < cx < b - 1) or cz <= z0: break
                        T[cz, cx] = DEEP
                        if a < cx + dx < b - 1 and i % 2: T[cz, cx + dx] = shade(tone, 1.14)
                        cz -= 1; cx += dx if r.random() < .55 else 0
                elif k < .5:                # a chip knocked off a corner
                    cx = a if r.random() < .5 else b - 3; cz = z0 + hh - 2 if r.random() < .6 else z0 + 1
                    if b - a > 5: T[cz:cz + 2, cx:cx + 3] = SEAM; T[cz, cx + 1] = DEEP
            x0 += ww
        z0 += hh; row += 1
    return T

def leaf_face(right, awake=False):
    """one door leaf as a flat picture [z][x], 14 x 42 (ref-detail-a's door): a stile and rail frame, two raised panels with a carved lozenge,
    half of the round boss with the glowing ring on its meeting edge, the lintel's shadow across its top"""
    w, h = 14, 42; T = np.zeros((h, w, 3), np.uint8); T[:] = LT
    T[:, 0] = T[:, w - 1] = DK; T[0] = DEEP; T[h - 1] = DK; T[1:h - 1, 1] = HI; T[h - 2, 1:w - 1] = HI; T[1, 1:w - 1] = MID; T[1:h - 1, w - 2] = MID
    def panel(z0, z1, x0=3, x1=11):
        T[z0:z1, x0:x1] = MID; T[z1 - 1, x0:x1] = HI; T[z0:z1, x0] = HI; T[z0, x0:x1] = DEEP; T[z0:z1, x1 - 1] = DEEP        # raised: lit above and left, dark below and right
        T[z0 + 1:z1 - 1, x0 + 1:x1 - 1] = DK; T[z0 + 1, x0 + 1:x1 - 1] = MID; T[z1 - 2, x0 + 1:x1 - 1] = DEEP    # sunk inside its raised edge: shadow under the top, light on the sill
        T[z1 - 3, x0 + 2:x1 - 2] = DEEP; T[z1 - 3, x0 + 1] = T[z1 - 3, x1 - 2] = DEEP; T[z1 - 2, x0 + 1] = T[z1 - 2, x1 - 2] = MID   # an arched head
    panel(3, 15); panel(27, 39)
    g = RUNE_HI if awake else RUNE
    for kind, zc in ((2 if not right else 3, 8), (0 if not right else 1, 32)):       # one of the mural's four in each panel: circle, triangle above; square, diamond below
        for dz in range(-2, 3):
            for dx in range(-2, 3):
                on = (abs(math.hypot(dx, dz) - 2) < .6) if kind == 0 else (dz == -2 or abs(abs(dx) - (2 - dz) / 2) < .6) if kind == 1 else max(abs(dx), abs(dz)) == 2 if kind == 2 else abs(dx) + abs(dz) == 2
                if on: T[zc + dz, 7 + dx - (0 if right else 1) + (0 if right else 1)] = g
    mx = -0.5 if right else w - .5                                           # the join: the boss is a disc cut in two by it
    for z in range(14, 28):
        for x in range(w):
            d = math.hypot(x - mx, z - 20.5)
            if d < 6.6: T[z, x] = DK if d > 5.7 else HI if d > 4.7 else DEEP if d > 3.9 else g if d > 2.7 else DEEP if d > 1.8 else MID
    T[:, 0 if right else w - 1] = DEEP                                         # the dark line where the two leaves meet
    T[h - 3:h - 1, 1:w - 1] = [shade(tuple(int(v) for v in T[h - 3, x]), .8) for x in range(1, w - 1)]   # under the lintel
    return T

def build(awake):
    V = np.zeros((N, S, S, 4), np.uint8); rng = np.random.default_rng(5)
    glow = RUNE_HI if awake else RUNE_DIM
    def put(z, y, x, c): V[z, y, x, :3] = c; V[z, y, x, 3] = 255
    def lid_of(x0, x1, y0, y1, z):   # a top: big slabs with seams, a lit rim, a crack or two
        w, d = x1 - x0, y1 - y0
        for y in range(y0, y1):
            for x in range(x0, x1):
                xl, yl = x - x0, y - y0; rim = min(xl, yl, w - 1 - xl, d - 1 - yl)
                put(z, y, x, HI if rim == 0 else shade(MID, .96) if (yl % 12 == 6 or (xl + (yl // 12 % 2) * 9) % 18 == 9) and rim > 1 else LT if (xl // 18 + yl // 12) % 3 else shade(LT, .94))
    def box(x0, x1, y0, y1, z0, z1, tex=None, face=None):
        w, d, h = x1 - x0, y1 - y0, z1 - z0
        for z in range(z0, z1):
            zl = z - z0; V[z, y0:y1, x0:x1] = (*DK, 255)
            for x in range(x0, x1): V[z, y1 - 2:y1, x] = (*(face(x - x0, zl, w, h) if face else tex[zl, x - x0]), 255)        # the front (2 px thick: squashed for the camera two rows become one)
            V[z, y0:y1 - 2, x0:x0 + 2] = (*(DK if zl % 8 else DEEP), 255); V[z, y0:y1 - 2, x1 - 2:x1] = (*(DK if zl % 8 else DEEP), 255); V[z, y0:y0 + 2, x0:x1] = (*DEEP, 255)
        lid_of(x0, x1, y0, y1, z1 - 1)
    WALL = wall(88, 60, 3, 8, (11, 18), dark=8)
    def cella(xl, zl, w, h):
        x, z = xl + 16, zl + 10; D0, D1, _, DT = DOOR
        if D0 <= x < D1 and z < DT: return VOID
        if D0 - 6 <= x < D1 + 6 and z < DT + 8:      # THE DOOR'S FRAME: a jamb of five big blocks each side, a rune glowing on every one; a deep lintel over, a row of dentils under its lip
            if z >= DT:
                k = z - DT
                if k == 7: return HI
                if k == 6: return LT
                if k == 5: return DEEP if (x - D0) % 4 == 3 else MID          # dentils
                if k == 4: return SEAM
                if k == 0: return SEAM if D0 <= x < D1 else DEEP                # the shadow the lintel throws on the doors
                return DK if x in (D0 - 6, D1 + 5) else LT if k == 3 else MID
            jx = x - (D0 - 6) if x < D0 else D1 + 5 - x; bz = (z - 10) % 8; bi = (z - 10) // 8     # jx: 0 = its outer edge, 5 = beside the doors
            if bz == 0 or jx == 0: return SEAM
            if jx == 5: return DEEP                                                              # the reveal: the doors sit back in the wall
            if bz == 7: return HI
            g = GLYPHS[(bi * 2 + (x > 60) * 3) % 6]; gr, gx = 6 - bz, (jx - 1 if x < D0 else 4 - jx) - 0
            if 1 <= gx + 1 <= 3 and 0 <= gr < 5 and g[gr][gx] == '#': return glow
            return LT if bz == 6 else MID
        return tuple(int(v) for v in WALL[zl, xl])
    def lintel(xl, zl, w, h):   # the great stone over the pillars: a lip top and bottom, the mural's four shapes carved across it (dark groove, lit inner edge), cracks
        if zl == h - 1: return HI
        if zl == h - 2: return LT
        if zl == 0: return SEAM
        if zl == 1: return DK
        for i, cx in enumerate((w // 2 - 33, w // 2 - 11, w // 2 + 11, w // 2 + 33)):
            dx, dz = xl - cx, (h // 2) - zl
            if abs(dx) <= 5 and abs(dz) <= 5:
                if shape(i, dx, dz, 4): return glow
        c = MID if (xl // 26) % 2 else shade(MID, 1.05)
        if xl % 26 == 0: c = SEAM
        if (xl, zl) in {(7, 9), (8, 8), (8, 7), (9, 6), (10, 5), (9, 4), (97, 9), (96, 8), (95, 7), (95, 6), (94, 5), (52, 2), (53, 3), (53, 4), (30, 9), (31, 8), (31, 7)}: c = DEEP   # cracks
        return c
    def pillar(cx, seed):   # drums with a seam ring between them, a wide two-step foot, a carved capital; round: lit left of middle
        cols = [DEEP, DK, MID, LT, HI, LT, MID, DK]; r = np.random.default_rng(seed)
        for z in range(10, 70):
            foot, cap = z < 15, z >= 64; wide = foot or cap
            for dy in range(-5, 5):
                for dx in range(-5, 5):
                    big = z < 12 or z >= 67
                    if wide and not big and not (-5 <= dx < 5 and -5 <= dy < 5 and abs(dx + .5) + abs(dy + .5) < 8.5): continue
                    if not wide and not (-4 <= dx < 4 and -4 <= dy < 4 and abs(dx + .5) + abs(dy + .5) < 7): continue
                    c = cols[min(7, max(0, dx + 4))]
                    if foot: c = (HI if dx < 3 else MID) if z in (11, 14) else SEAM if z == 12 else DK if dx >= 3 or dx < -4 else MID
                    elif cap: c = HI if z == 69 else SEAM if z == 64 else (LT if (dx + 5) % 3 == 1 else DEEP if (dx + 5) % 3 == 2 else MID) if z < 67 else (LT if dx < 3 else DK)   # carved leaves
                    elif (z - 15) % 12 == 11: c = SEAM if abs(dx + .5) < 3.6 else DEEP
                    elif (z - 15) % 12 == 10 and dx < 3: c = shade(c, 1.08)
                    elif (z - 15) % 12 == 0: c = shade(c, .86)
                    put(z, 90 + dy, cx + dx, c)
        for _ in range(2):   # a crack down one drum
            x, z = cx + int(r.integers(-2, 2)), int(r.integers(22, 58))
            for i in range(5): put(z - i, 93, x, DEEP); put(z - i, 92, x, DEEP); x += int(r.integers(-1, 2)); x = max(cx - 3, min(cx + 2, x))
    box(4, 116, 34, 98, 0, 10, wall(112, 10, 11, 5, (14, 22), dark=3))                                                                       # the plinth
    for k in range(5): box(36, 84, 98, 113 - k * 3, k * 2, k * 2 + 2, face=lambda xl, zl, w, h: DK if xl % 16 == 5 else MID if zl == 0 else HI)   # five steps
    for x0 in (30, 84): box(x0, x0 + 6, 96, 115, 0, 12, face=lambda xl, zl, w, h: SEAM if xl in (0, 5) or zl in (0, 6) else DK if zl < 2 else HI if zl == 11 else MID)   # their cheek blocks
    box(16, 104, 40, FRONT, 10, 70, face=cella)
    for i, cx in enumerate((22, 37, 83, 98)): pillar(cx, 20 + i)
    box(8, 112, 36, 97, 70, 82, face=lintel)
    for i, (x0, x1, y0, y1, z0, z1) in enumerate([(12, 108, 40, 92, 82, 88), (22, 98, 45, 86, 88, 94), (34, 86, 50, 80, 94, 99), (46, 74, 55, 74, 99, 103)]):   # the stepped roof
        box(x0, x1, y0, y1, z0, z1, wall(x1 - x0, z1 - z0, 30 + i, z1 - z0, (14, 22)))
    cb, cl, ch = ((150, 225, 255), (235, 250, 255), (255, 255, 255)) if awake else ((52, 104, 196), (104, 168, 236), (170, 220, 255))                 # the blue crystal on its top: a stone seat, then the gem
    for z in range(103, 114):
        r = [3, 2, 3, 4, 5, 5, 4, 3, 2, 1, 1][z - 103]
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if abs(dx) + abs(dy) <= r: put(z, 64 + dy, 60 + dx, (MID if dx > 0 else LT) if z == 103 else ch if dx == -1 and 107 <= z <= 110 else cl if dx < 0 or z > 111 else cb)
    # MOSS: thick clumps sat on the ledges, draped over their edges in ragged tongues; and VINES, real hanging strands (voxels of their own in front of the wall)
    def clump(xc, yf, z, wd, drop, lidz=None):
        """sat on the lid at height z (its front edge at yf), hanging down the face below it: wd wide, its longest tongue drop long"""
        prof = [max(1, int(round(drop * (.35 + .65 * math.sin(math.pi * (i + .5) / wd)) * (.55 + rng.random() * .6)))) for i in range(wd)]
        for i in (int(rng.integers(1, wd - 1)), int(rng.integers(1, wd - 1))): prof[i] = int(drop * (1 + rng.random() * .5))        # two long tongues
        for i, n in enumerate(prof):
            x = xc - wd // 2 + i
            if not 0 <= x < S: continue
            for k in range(n):
                zz = z - k
                if zz < 0 or tuple(V[zz, yf - 1, x, :3]) in (VOID, RUNE_DIM, RUNE_HI, RUNE): break
                c = MOSS_HI if k == 0 else MOSS_DK if k >= n - 1 and n > 2 else MOSS if (x + k) % 5 else MOSS_HI
                if V[zz, yf - 1, x, 3] == 0 and zz < z - 1: V[zz, yf - 2:yf, x] = (*c, 255)   # past the foot of the ledge it hangs in the air: a strand of its own
                else: V[zz, yf - 2:yf, x] = (*c, 255)
            dp = 2 + int(3 * math.sin(math.pi * (i + .5) / wd) + rng.random() * 2)                                                # the part of it that sits on top
            for j in range(dp):
                yy = yf - 1 - j
                if V[z, yy, x, 3]: put(z, yy, x, MOSS_HI if j == dp - 1 or (x + j) % 4 == 0 else MOSS)
    def vine(x, yf, ztop, n, sway=1):   # a strand hanging in the air, 2 px thick front to back so it survives the camera's squash; a leaf pair every few pixels
        xx = x
        for k in range(n):
            z = ztop - k
            if z < 0: break
            if k and k % 5 == 0: xx += sway * (1 if (k // 5) % 2 else -1)
            for yy in (yf - 2, yf - 1):
                put(z, yy, xx, VINE if k % 4 else MOSS_DK)
                if k % 6 == 3 and k < n - 1: put(z, yy, xx + (1 if (k // 6) % 2 else -1), MOSS)
        for yy in (yf - 2, yf - 1): put(max(0, ztop - n), yy, xx, MOSS_HI)
    # (26 Nov, his marks on the front view: "too spotty, more moss, more of it hanging") no scattered dots: a few big connected masses, each in three
    # tones (lit on top, mid, dark under), and everything that hangs is at least 2 px wide
    def tone3(k, n): return MOSS_HI if k == 0 else MOSS_DK if k >= n - 2 and n > 3 else MOSS
    def drape(x0, x1, yf, ztop, lo, hi, seed):
        """moss over an edge: hangs down the face at yf from ztop, columns in PAIRS of ragged length lo..hi (on the stone, or in the air past its foot)"""
        r = np.random.default_rng(seed); n = 0
        for x in range(x0, x1):
            if (x - x0) % 2 == 0: u = (x - x0 + 1) / max(1, x1 - x0); n = int(round(lo + (hi - lo) * (.45 + .55 * math.sin(math.pi * u)) * (.5 + r.random() * .7)))
            for k in range(n):
                z = ztop - k
                if z < 0 or tuple(V[z, yf - 1, x, :3]) in (VOID,): break
                V[z, yf - 2:yf, x] = (*(MOSS_HI if k < 2 and (x - x0) % 4 < 2 else tone3(k, n)), 255)
    def mass(x0, x1, yf, z, depth, seed):
        """moss lying on a top at height z, from its front edge yf back: one solid shape with a ragged far edge, darker round its rim"""
        r = np.random.default_rng(seed); d = depth
        for x in range(x0, x1):
            if (x - x0) % 2 == 0: u = (x - x0 + 1) / max(1, x1 - x0); d = max(2, int(round(depth * (.72 + .28 * math.sin(math.pi * u)) + r.integers(-2, 3))))
            for j in range(d):
                if V[z, yf - 1 - j, x, 3]: put(z, yf - 1 - j, x, MOSS_DK if j >= d - 2 or (d > 12 and (x // 4 + j // 3) % 4 == 0 and 2 < j < d - 4) else MOSS if j < 2 or (x // 3 + j // 2) % 3 == 0 else MOSS_HI)   # dark round its far rim and in its hollows, lit on its humps
    def swag(xa, xb, yf, ztop, sag, seed):
        """a garland hung between two points: four rows thick (lit, mid, dark), sagging in the middle, a 2 px strand dropping off it every few pixels"""
        r = np.random.default_rng(seed)
        n = 4
        for x in range(xa, xb + 1):
            u = (x - xa) / (xb - xa); zc = int(round(ztop - sag * (1 - abs(2 * u - 1) ** 2.6)))   # a hanging rope: steep only at its two ends, a long soft belly
            for k, c in enumerate((MOSS_HI, MOSS, MOSS, MOSS_DK)): V[zc - k, yf - 2:yf, x] = (*c, 255)
            if (x - xa) % 9 in (4, 5) and .12 < u < .88:
                if (x - xa) % 9 == 4: n = int(r.integers(3, 7))
                for k in range(n): V[zc - 4 - k, yf - 2:yf, x] = (*(MOSS_DK if k >= n - 2 else MOSS), 255)
    def band(cx, dx0, dx1, ztop, lo, hi, seed, yf=None):
        """moss down a pillar's shaft: columns in pairs, wrapped on its round face"""
        r = np.random.default_rng(seed); n = 0
        for dx in range(dx0, dx1):
            if (dx - dx0) % 2 == 0: n = int(r.integers(lo, hi + 1))
            yy = yf if yf else 90 + [1, 2, 3, 3, 3, 3, 2, 1][max(0, min(7, dx + 4))]
            for k in range(n): c = tone3(k, n); c = MOSS_HI if dx == dx0 and k < n - 2 else MOSS_DK if dx == dx1 - 1 and k else c; put(ztop - k, yy, cx + dx, c); put(ztop - k, yy - 1, cx + dx, c)   # round: lit down its left side, dark down its right
    mass(8, 28, 97, 81, 9, 1); drape(8, 26, 97, 81, 4, 12, 2)                    # 1. the lintel's left end: a thick mass along its top, drips off its front edge
    swag(31, 67, 97, 78, 9, 3)                                                    # 2. a garland from the circle to the square, sagging under the triangle, below the lintel's foot
    mass(98, 112, 97, 81, 6, 4); drape(100, 110, 97, 81, 4, 9, 5)                # 3. the lintel's right corner: a short drip
    band(83, -5, 5, 69, 3, 5, 6, 95); band(83, -2, 2, 65, 12, 17, 7)             # 4. the right inner pillar: spilled over its capital, then down the shaft (a T)
    band(98, -1, 3, 54, 10, 14, 8)                                               # 5. the right outer pillar: a short streak
    band(37, -3, 1, 52, 24, 30, 9)                                               # 6. the left inner pillar: a longer band down the shaft
    mass(5, 31, 98, 9, 36, 10); drape(5, 30, 98, 9, 7, 9, 11)                     # 7. the plinth wall left of the steps: most of its face, draped from the top
    mass(86, 108, 92, 87, 7, 12); drape(88, 104, 92, 87, 2, 5, 13)               # on the roof's steps: two masses, not a scatter
    mass(22, 42, 86, 93, 6, 14); drape(24, 38, 86, 93, 2, 4, 15)
    mass(96, 115, 98, 9, 5, 16); drape(100, 112, 98, 9, 2, 5, 17)                # and the plinth's right corner
    for x, n in [(18, 16), (29, 30), (90, 34), (100, 14)]:                       # vines hung from under the lintel, 2 px wide, a leaf pair every few pixels
        for k in range(n):
            z = 71 - k; xx = x + (1 if (k // 6) % 2 else 0)
            for yy in (95, 96):
                put(z, yy, xx, VINE if k % 4 else MOSS_DK); put(z, yy, xx + 1, MOSS_DK if k % 4 else MOSS)
                if k % 6 == 3: put(z, yy, xx - 1, MOSS); put(z, yy, xx + 2, MOSS_HI)
    return V

def leaf(right, awake=False):   # one door leaf as slices: 14 wide, 42 tall, 3 thick
    s, n = 16, 42; V = np.zeros((n, s, s, 4), np.uint8); T = leaf_face(right, awake)
    for z in range(n):
        for x in range(14): V[z, 7:10, 1 + x] = (*T[z, x], 255)
    return V

def strip_of(rows):
    n, s = rows[0].shape[0], rows[0].shape[1]; out = np.zeros((s * len(rows), s * n, 4), np.uint8)
    for r, V in enumerate(rows):
        for z in range(n): out[r * s:(r + 1) * s, z * s:(z + 1) * s] = V[z]
    return out

def render(strip, s, n, row, ang, squash=.55):   # the game's own loop (index.html stackFrame): turn, squash, lift 1 px a slice, one navy line
    h = round(s * squash); W, H = s + 4, h + n + 4; im = Image.new('RGBA', (W, H))
    for z in range(n):
        t = Image.fromarray(strip[row * s:(row + 1) * s, z * s:(z + 1) * s]).rotate(-math.degrees(ang), Image.NEAREST).resize((s, h), Image.NEAREST)
        im.alpha_composite(t, (2, H - 2 - h - z))
    a = np.asarray(im).copy(); al = a[..., 3] >= 60
    e = ~al & (np.roll(al, 1, 0) | np.roll(al, -1, 0) | np.roll(al, 1, 1) | np.roll(al, -1, 1)); a[e] = (*NAVY, 255)
    return Image.fromarray(a)

if want('stack'):
    T = strip_of([build(False), build(True)]); D = strip_of([leaf(False), leaf(True), leaf(False, True), leaf(True, True)]); DN = 42   # rows: left, right asleep; left, right awake
    Image.fromarray(T).save(OUT + 'temple.png', optimize=True); Image.fromarray(D).save(OUT + 'tdoor.png', optimize=True)
    json.dump({'s': S, 'n': N, 'rows': 2, 'door': {'s': 16, 'n': DN, 'rows': 4, 'w': 14}}, open(OUT + 'temple.json', 'w'))
    print('temple', S, 'x', S, N, 'slices, 2 rows (asleep, awake); doors 16 x 16,', DN, 'slices, 2 rows')
    chk = [a for a in ARGS if a.endswith('.png')]
    if chk:   # the check sheet: front-on as it stands in the game (asleep, doors shut | awake, doors part open | awake, open), then the turntable
        def stand(row, slide):
            im = render(T, S, N, row, 0); a = np.asarray(im); ys, xs = np.nonzero((a[..., :3] == VOID).all(-1)); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            hole = Image.new('RGBA', (x1 - x0, y1 - y0), (*VOID, 255)); mid = (x1 - x0) // 2
            if slide: hole.paste((232, 251, 255, 255), (mid - slide, 0, mid + slide, y1 - y0))
            for r in (0, 1):
                d = render(D, 16, DN, r + row * 2, 0); b = np.asarray(d); yy, xx = np.nonzero(b[..., 3] > 0); d = d.crop((xx.min() + 1, yy.min() + 1, xx.max(), yy.max()))
                hole.alpha_composite(d, (mid - 14 - slide if r == 0 else mid + slide, y1 - y0 - d.height))
            im.alpha_composite(hole, (x0, y0)); return im
        big = [stand(0, 0), stand(1, 7), stand(1, 14)]; w, h = big[0].size
        turn = [render(T, S, N, 0, t * math.pi / 4) for t in range(8)]
        sheet = Image.new('RGBA', (w * 4, h * 3), (20, 26, 60, 255))
        for i, t in enumerate(big): sheet.alpha_composite(t, (i * w, 0))
        for i, t in enumerate(turn): sheet.alpha_composite(t, ((i % 4) * w, h * (1 + i // 4)))
        sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(chk[0]); big[0].resize((w * 6, h * 6), Image.NEAREST).save(chk[0].replace('.png', '-front.png')); print('check', chk[0])

# ---- THE THRONE HALL, v4 (26 Nov, his calls: "copy ref-hall-b 1:1", the 3D parts as sprite stacks, the hall longer, the lava is CRYSTAL WATER).
#      ref-hall-b.png is a straight top-down Nano Banana Pro picture. Its painted cells are 6.975 wide: sampled, it is the hall at the game's own
#      pixel size, 220 x 393. The FLAT parts are that picture itself: walls, banners, the two fountains, the water channels, the carpet.
#      Cleaned up: the floor's tiles are laid again in its own two colours (so nothing is left where a pillar or the dais was painted), the rune
#      rings and the small shapes are drawn again with OUR four keystone shapes, the throne and the corner crystals are painted off the walls.
#      LONGER (his ask): a band of the middle (walls, channels, carpet) is laid in twice more: two more pairs of pillars' worth of hall.
#      The 3D parts are sprite stacks, each drawn here to look like the reference's, read by the game's own stack loop at turn 0 (temple.js):
#        assets/quest/hdais.png    the stepped dais and its stair (128 x 128 slices, 12)
#        assets/quest/hthrone.png  the throne (40 x 40, 56; rows: its crystals asleep, lit)
#        assets/quest/hpillar.png  a pillar (24 x 24, 42)
#        assets/quest/hstand.png   a brazier on its stand (16 x 16, 14; rows: cold, burning)
#        assets/quest/hcrys.png    a cluster of crystals for the corners (24 x 24, 28; rows: asleep, lit)
#      -> assets/interiors/throne.png (220 x 537) + the stacks. The water, the fire and the light move in temple.js. ----
if want('hall'):
    BAND0, BAND, REPS = 236, 72, 2       # the rows of the reference laid in again (72 = nine turns of the carpet's gold edge), and how many times
    ref = np.asarray(Image.open(SRC + 'ref-hall-b.png').convert('RGB')); R0 = sample(ref, 27.9 / 4)
    rows = list(range(BAND0 + BAND)) + [BAND0 + i % BAND for i in range(BAND * REPS)] + list(range(BAND0 + BAND, R0.shape[0]))
    A = R0[rows].copy(); HH, HW = A.shape[:2]; ADD = BAND * REPS
    P_HI, P_LT, P_MID, P_DK, P_DEEP, P_LINE, INK = (206, 226, 246), (170, 194, 226), (136, 160, 202), (104, 128, 176), (76, 96, 146), (40, 54, 100), (24, 34, 74)   # the reference's standing stone: blue-grey
    CRY, CRY_LT, CRY_DK = (40, 150, 240), (150, 226, 255), (20, 90, 196)
    RING = (60, 176, 240)
    F_LT = tuple(int(v) for v in np.median(R0[130:150, 100 - 64:100 - 50].reshape(-1, 3), axis=0)); F_SEAM = (170, 206, 236); F_MD = tuple(int(v * .965) for v in F_LT)
    WALL = tuple(int(v) for v in np.median(R0[30:50, 78:92].reshape(-1, 3), axis=0))
    def shape4(cx, cy, kind, r, c):
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                if shape(kind, x, y, r): A[cy + y, cx + x] = c
    # the floor, laid again: the reference's tiles (24 px, its two colours), between the water's kerbs, from the back wall to the bottom wall; not under the carpet
    for y in range(88, 378 + ADD):
        for x in range(34, 186):
            if 93 <= x < 127 and y >= 121: continue
            A[y, x] = F_SEAM if (x - 110) % 24 == 12 or (y - 122) % 24 == 0 else F_MD if (((x - 110 + 12) // 24) * 5 + ((y - 122) // 24) * 3) % 4 == 0 else F_LT
    A[78:88, 54:166] = F_LT; A[87, 54:166] = F_SEAM                                               # under the dais, up to the wall
    for y in range(20, 58):                                                                         # the throne painted off the back wall (it is a stack now)
        for x in range(94, 126): A[y, x] = WALL if 20 < y else A[y, x]
    for (x0, x1, y0, y1, sx) in ((10, 30, 46, 73, 46), (190, 210, 46, 73, 173)):                  # the top corner crystals off the wall (stacks): the wall beside them, copied across
        for y in range(y0, y1): A[y, x0:x1] = A[y, sx]
    for x0, x1 in ((10, 36), (184, 210)):                                                          # the bottom corner crystals off the floor: the channel ends in a kerb, floor below it
        yb = 352 + ADD
        for y in range(yb - 14, yb): A[y, x0:x1] = A[yb - 20, x0:x1]
        A[yb:378 + ADD, x0 + 3:x1 - 3 if x0 < 100 else x1 - 3] = F_LT; A[yb:yb + 2, x0 + 3:x1 - 3] = P_LT; A[yb + 2, x0 + 3:x1 - 3] = P_LINE
    # the rune rings between the pillars and the small shapes by the carpet, clean, with our four shapes in the mural's order
    FEET = [165, 223, 296, 368, 440, 509]                                                           # the pillars' feet (the reference's three, two more, its last)
    for i, fy in enumerate(FEET[2:]):
        for j, cx in enumerate((58, 162)):
            cy = fy - 56
            for a in range(0, 360, 2):
                for rr in (11, 7): A[int(round(cy + math.sin(math.radians(a)) * rr)), int(round(cx + math.cos(math.radians(a)) * rr))] = RING
            for k in range(8): a = math.radians(k * 45 + 22); A[int(round(cy + math.sin(a) * 9)), int(round(cx + math.cos(a) * 9))] = RING
            shape4(cx, cy, (i * 2 + j) % 4, 3, RING)
    for i, (cx, cy) in enumerate([(87, 188), (133, 188), (87, 241), (133, 241)]):
        for rr in (4, 5): shape4(cx, cy, i, rr, (96, 130, 190) if rr == 4 else F_LT)
        shape4(cx, cy, i, 4, (96, 130, 190))
    Image.fromarray(A).save('assets/interiors/throne.png', optimize=True); print('hall', HW, 'x', HH, 'floor', F_LT, 'wall', WALL)

    def V0(s, n): return np.zeros((n, s, s, 4), np.uint8)
    def fill(V, z0, z1, x0, x1, y0, y1, face, lid, side=P_DK):
        """a block: its front (the 2 rows nearest the camera) painted by face(xl, zl), its top slice by lid(xl, yl), the rest dark"""
        for z in range(z0, z1):
            V[z, y0:y1, x0:x1] = (*side, 255)
            for x in range(x0, x1): V[z, y1 - 2:y1, x] = (*face(x - x0, z - z0), 255)
        for y in range(y0, y1):
            for x in range(x0, x1): V[z1 - 1, y, x] = (*lid(x - x0, y - y0), 255)
    # THE DAIS: the reference's stepped pyramid (five steps down its front and both sides) with the stair of ten treads out of the middle, between two low walls
    def dais_stack():
        s, n = 128, 12; V = V0(s, n); TOP, EDGE, RISE, RISE_DK = (196, 226, 246), (222, 242, 254), (128, 158, 204), (96, 124, 176)   # the reference's: pale treads, blue-grey risers
        for k in range(5):   # tier k (0 = the lowest, widest): 4 px in from the last each time, 2 high. Front risers face the camera; the side ones show as the darker stripes of the pyramid's flanks
            x0, x1, y1 = 20 + k * 4, 108 - k * 4, 80 - k * 4
            for z in (k * 2, k * 2 + 1):
                V[z, 10:y1, x0:x1] = (*RISE, 255); V[z, y1 - 2:y1, x0:x1] = (*(RISE_DK if z % 2 == 0 else RISE), 255)
            zt = k * 2 + 1
            V[zt, 10:y1, x0:x1] = (*TOP, 255); V[zt, y1 - 1, x0:x1] = (*EDGE, 255)
            V[zt, 10:y1, x0:x0 + 2] = (*RISE, 255); V[zt, 10:y1, x1 - 2:x1] = (*RISE_DK, 255); V[zt, 10:y1, x0 + 2] = (*EDGE, 255); V[zt, 10:y1, x1 - 3] = (*EDGE, 255)   # each step of the flanks: a dark riser, a lit edge
        for y in range(10, 64):                                                                                                  # the top: its own big tiles
            for x in range(40, 88):
                if (x - 64) % 24 == 12 or y % 24 == 16: V[9, y, x] = (*F_SEAM, 255)
        for k in range(10):  # the stair: ten treads, 1 high, 5 deep
            y1 = 114 - k * 5
            V[k, 60:y1, 47:81] = (*TOP, 255); V[k, y1 - 3:y1 - 2, 47:81] = (*EDGE, 255); V[k, y1 - 2:y1, 47:81] = (*RISE, 255); V[k, y1 - 1, 47:81] = (*RISE_DK, 255)
        for x0 in (43, 81):  # its two side walls, stepping down with it; a block at the foot of each
            for k in range(10):
                y1 = 116 - k * 5; top = min(12, k + 3)
                for z in range(top):
                    V[z, 62:y1, x0:x0 + 4] = (*RISE, 255); V[z, y1 - 2:y1, x0:x0 + 4] = (*(P_LINE if z == 0 else RISE_DK), 255)
                V[top - 1, 62:y1, x0:x0 + 4] = (*EDGE, 255); V[top - 1, 62:y1, x0] = (*P_LINE, 255); V[top - 1, 62:y1, x0 + 3] = (*P_LINE, 255)
            fill(V, 0, 5, x0 - 2, x0 + 6, 110, 118, lambda xl, zl: P_LINE if xl in (0, 7) or zl == 0 else P_HI if zl == 4 else P_MID, lambda xl, yl: P_LINE if min(xl, yl, 7 - xl, 7 - yl) == 0 else P_LT)
        return V
    # THE THRONE: the reference's tall carved back with a three-pointed head and a blue crystal set in it; arms; the seat
    def throne_stack(lit):
        s, n = 40, 56; V = V0(s, n); cb, cl, ch = ((120, 216, 255), (225, 248, 255), (255, 255, 255)) if lit else (CRY, CRY_LT, (200, 238, 255))
        def back(xl, zl):
            if xl in (0, 27) or zl == 0: return P_LINE
            if xl in (1, 26): return P_HI if xl == 1 else P_DK
            if 6 <= xl < 22 and 16 <= zl < 42:
                if xl in (6, 21) or zl in (16, 41): return P_DEEP
                d = abs(xl - 13.5) * 1.5 + abs(zl - 29) * .75
                return ch if d < 2 and xl < 14 else cl if d < 7 and xl < 14 else cb if d < 7 else INK if d < 8.5 else P_DK                # the crystal set in its back
            return P_MID
        fill(V, 0, 44, 6, 34, 8, 14, back, lambda xl, yl: P_HI)
        for k in range(12):                                                                                                           # its head: one clean point, like the reference's (a gable, a pixel in from each side every row)
            x0, x1 = 6 + k + (k > 9) , 34 - k - (k > 9)
            if x1 - x0 >= 2: V[44 + k, 8:14, x0:x1] = (*P_MID, 255); V[44 + k, 8:14, x0] = (*P_LINE, 255); V[44 + k, 8:14, x1 - 1] = (*P_LINE, 255)
            if x1 - x0 >= 4: V[44 + k, 8:14, x0 + 1] = (*P_HI, 255)
        fill(V, 0, 10, 9, 31, 14, 30, lambda xl, zl: P_LINE if xl in (0, 21) or zl == 0 else P_HI if zl == 9 else P_DK if zl < 3 else P_MID, lambda xl, yl: P_HI if min(xl, 21 - xl) < 2 or yl > 13 else P_LT)
        for x0 in (4, 30):                                                                                                            # the arms
            fill(V, 0, 18, x0, x0 + 6, 12, 30, lambda xl, zl: P_LINE if xl in (0, 5) or zl == 0 else P_HI if zl == 17 else P_MID, lambda xl, yl: P_HI if xl in (0, 5) or yl > 15 else P_LT)
        return V
    def pillar_stack(lit=False):   # the reference's: a square foot, a plain round shaft lit down its left, a wide round head
        s, n = 24, 42; V = V0(s, n); cols = [P_DEEP, P_DK, P_MID, P_LT, P_HI, P_LT, P_MID, P_MID, P_DK, P_DK, P_DK, P_DEEP, P_DEEP, P_LINE]
        for z in range(n):
            for y in range(s):
                for x in range(s):
                    dx, dy = x - 11.5, y - 11.5
                    if z < 6:
                        r = 10.5 if z < 3 else 8.5
                        if max(abs(dx), abs(dy)) > r: continue
                        c = P_MID if z in (2, 5) else P_DK                                                                    # a darker base step
                    elif z >= 35:
                        r = [7.5, 8.5, 9.5, 9.5, 9.5, 9.5, 9.5][z - 35]
                        if math.hypot(dx, dy) > r: continue
                        c = P_HI if z == n - 1 else P_LT if dx < 4 else P_MID                                                 # a lighter top cap
                    else:
                        if math.hypot(dx, dy) > 6.6: continue
                        c = P_LT if dx < -3 else P_MID if dx < 3 else P_DK                                                    # (his note: SIMPLE, like the reference) three flat bands: lit left, body, dark right
                    V[z, y, x] = (*c, 255)
        return V
    def stand_stack(lit):   # the reference's: a small foot, a short stem, a bowl
        s, n = 16, 14; V = V0(s, n)
        for z in range(n):
            for y in range(s):
                for x in range(s):
                    dx, dy = x - 7.5, y - 7.5
                    if z < 3: ok = max(abs(dx), abs(dy)) < (4.6 if z < 2 else 3.6); c = P_MID if z == 2 else P_DK
                    elif z < 9: ok = max(abs(dx), abs(dy)) < 2; c = P_LT if dx < -1 else P_MID if dx < 1 else P_DK
                    else:
                        r = [2.8, 3.8, 4.8, 5.2, 5.2][z - 9]; d = math.hypot(dx, dy); ok = d < r
                        c = (P_LT if dx < -2 else P_MID if dx < 2 else P_DK) if z < 13 else (P_HI if d > 3.9 else ((150, 226, 255) if lit else INK))
                    if ok: V[z, y, x] = (*c, 255)
        return V
    def crys_stack(lit):    # a cluster of three crystals: six-sided, pointed; lit down the left, dark down the right
        s, n = 24, 28; V = V0(s, n); cb, cl, cd = ((70, 190, 255), (190, 240, 255), (24, 120, 226)) if lit else ((40, 110, 200), (96, 160, 226), (22, 70, 160))
        for cx, cy, r, h in ((12, 11, 4.4, 27), (6, 14, 3.4, 17), (18, 14, 3.4, 14), (11, 18, 2.6, 9)):
            for z in range(h):
                rr = r * min(1, (h - z) / (h * .34))
                for y in range(s):
                    for x in range(s):
                        dx, dy = x - cx, y - cy
                        if abs(dx) + abs(dy) * .6 <= rr + .3 and abs(dy) <= rr + .3: V[z, y, x] = (*(cl if dx < -.5 else cb if dx < 1.5 else cd), 255)
        return V
    ST = {'hdais': (strip_of([dais_stack()]), 128, 12), 'hthrone': (strip_of([throne_stack(False), throne_stack(True)]), 40, 56), 'hpillar': (strip_of([pillar_stack()]), 24, 42),
          'hstand': (strip_of([stand_stack(False), stand_stack(True)]), 16, 14), 'hcrys': (strip_of([crys_stack(False), crys_stack(True)]), 24, 28)}
    for k, v in ST.items(): k == 'hpillar' or Image.fromarray(v[0]).save(OUT + k + '.png', optimize=True)   # the pillar is tools/make_pillar.py's now
    json.dump({'w': HW, 'h': HH, 'add': ADD, 'feet': FEET, 'stacks': {k: [24, 46] if k == 'hpillar' else [v[1], v[2]] for k, v in ST.items()}}, open(OUT + 'hall.json', 'w'))
    print('hall stacks:', {k: (v[1], v[2]) for k, v in ST.items()})
    chk = [a for a in ARGS if a.endswith('.png')]
    if chk:   # the check sheet: the hall laid out as the game lays it out (temple.js has the same numbers), beside the stretched reference; then each stack turned
        R = lambda k, row=0, t=0: render(ST[k][0], ST[k][1], ST[k][2], row, t * math.pi / 4)
        hall = Image.fromarray(A).convert('RGBA')
        for cx, by in ((20, 76), (200, 76), (23, 376 + ADD), (197, 376 + ADD)): hall.alpha_composite(R('hcrys', 1), (cx - 14, by - 41))
        hall.alpha_composite(R('hdais'), (44, 46)); hall.alpha_composite(R('hthrone', 1), (88, 1))
        for fy in FEET:
            for px in (58, 162): hall.alpha_composite(R('hpillar'), (px - 14, fy - 55))
        for fy in (122, 165, 227, 296, 368, 440):
            for px in (79, 141): hall.alpha_composite(R('hstand', 1), (px - 10, fy - 25))
        refl = Image.fromarray(R0[rows]).convert('RGBA')
        turn = Image.new('RGBA', (HW + 40, HH), (20, 26, 60, 255)); y = 4
        for k in ST:
            x = 4
            for t in ((1, 7) if k == 'hdais' else (1, 2, 3, 5, 7)):
                im = R(k, 0, t)
                if x + im.width <= turn.width: turn.alpha_composite(im, (x, y))
                x += im.width + 2
            y += R(k, 0, 1).height + 6
        sheet = Image.new('RGBA', (HW * 2 + turn.width + 16, HH), (20, 26, 60, 255)); sheet.alpha_composite(hall, (0, 0)); sheet.alpha_composite(refl, (HW + 8, 0)); sheet.alpha_composite(turn, (HW * 2 + 16, 0))
        sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(chk[0].replace('.png', '-hall.png')); print('hall check', chk[0].replace('.png', '-hall.png'))
