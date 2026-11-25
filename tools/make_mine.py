"""THE MINE IN 3D (24 Nov 2026, his ask: "the cave and rocks are the 3d sprite stack style, you are actually mining these rocks or
mining the walls ... deeper you go ... diamond rocks, emerald rocks").
Everything here is built as little voxel models and written out as SLICE STRIPS (ground slice on the left), the same idea as the UFO and
the Getaway Car (tools/make_ufo.py). mine.js stacks them: one slice a pixel higher than the last.
  assets/mine/rocks.png   one row per (rock, damage stage); 14 slices of 20 x 20
        rows: for each of the 12 cave levels: stone, gold, rich gold  (x 3 damage stages), then emerald, ruby, diamond (x 3 stages)
  assets/mine/walls.png   one row per (wall, damage stage); 24 slices of 16 x 16 (a wall block is one 16 px cell, 24 px tall)
        rows: for each of the 12 levels: plain A, plain B, gold vein, rich vein  (x 3 stages)
  assets/mine/floor.png   16 x 16 ground tiles: one row per level, 4 tiles each
  ../mafia2-art/mine/mine-check.png   a look at everything stacked (not used by the game)
No AI art in here: all drawn by this script, so the numbers below are the only thing to edit.
Run:  python -I tools/make_mine.py   (from the game folder)"""
import numpy as np
from PIL import Image
rng = np.random.default_rng(2411)
NAVY = (26, 20, 48)
# 5 tones, dark -> light, for each level's stone. (25 Nov 2026, his ask: "around 10 levels ... mysterious colours and wall textures as it
# gets deeper") 12 LEVELS, two to a pickaxe: every pair is one THEME (its own wall texture), the second level of a pair a darker cousin.
STONE = [[(58, 40, 38), (92, 64, 52), (128, 92, 70), (164, 124, 92), (198, 162, 122)],      # 1 brown earth
         [(52, 38, 42), (82, 58, 56), (114, 82, 72), (148, 112, 94), (184, 150, 126)],      # 2 umber
         [(44, 44, 60), (72, 74, 92), (104, 108, 124), (140, 146, 158), (182, 190, 198)],   # 3 grey stone
         [(38, 42, 60), (62, 72, 94), (90, 104, 128), (124, 142, 164), (166, 186, 204)],    # 4 cold grey
         [(30, 38, 66), (48, 62, 98), (70, 92, 132), (98, 126, 164), (142, 170, 200)],      # 5 blue slate
         [(20, 40, 62), (30, 66, 92), (44, 96, 122), (70, 132, 152), (116, 176, 186)],      # 6 deep teal
         [(40, 26, 60), (66, 42, 92), (96, 62, 124), (130, 90, 156), (172, 130, 192)],      # 7 deep purple
         [(38, 20, 54), (64, 32, 82), (94, 46, 108), (130, 66, 136), (176, 104, 170)],      # 8 dark violet
         [(40, 18, 28), (68, 28, 38), (100, 42, 48), (136, 62, 60), (180, 96, 84)],         # 9 maroon
         [(32, 16, 24), (56, 24, 30), (84, 34, 38), (118, 50, 46), (164, 82, 66)],          # 10 charred red
         [(20, 16, 26), (34, 26, 38), (52, 36, 50), (78, 50, 62), (118, 74, 84)],           # 11 obsidian
         [(14, 12, 20), (26, 20, 30), (40, 28, 38), (60, 36, 44), (98, 54, 58)]]            # 12 black rock
LEVELS = len(STONE)
GEM_ROCK = [(18, 22, 34), (32, 40, 56), (50, 60, 80), (74, 88, 110), (112, 130, 152)]      # the dark stone a crystal sits in (the same on every level)
LAVA = [(120, 22, 18), (200, 56, 18), (255, 128, 36), (255, 196, 80), (255, 238, 170)]     # glowing in the joints of the deepest walls
AMETH = [(96, 48, 170), (140, 80, 220), (186, 130, 250), (220, 180, 255), (244, 226, 255)] # little crystals in the purple walls
# a theme's wall: how many stones on a face, and how they are stretched (x, z): cobbles, big blocks, flat slate beds, tall shards, cracked rock, basalt columns
WALL_LOOK = [(9, 1, .9), (6, .8, 1.15), (10, .38, 1.9), (9, 1.5, .5), (7, 1, .9), (8, 1.7, .36)]
GOLD = [(122, 78, 22), (185, 120, 31), (232, 177, 58), (255, 210, 94), (255, 246, 207)]
GEMS = {'emerald': [(10, 84, 62), (22, 140, 90), (54, 200, 120), (130, 240, 170), (224, 255, 236)],
        'ruby': [(110, 16, 40), (176, 28, 52), (228, 60, 72), (255, 130, 130), (255, 224, 224)],
        'diamond': [(40, 96, 150), (70, 150, 210), (120, 205, 245), (190, 240, 255), (255, 255, 255)]}

def shade(solid, light=(-.45, .5, .75)):
    """a tone 0..4 for every voxel from the way its surface faces (chunky: the normal is taken over a 5 voxel box)"""
    f = solid.astype(float); k = 2
    pad = np.pad(f, k)
    box = sum(pad[k + dz:k + dz + f.shape[0], k + dy:k + dy + f.shape[1], k + dx:k + dx + f.shape[2]] for dz in range(-k, k + 1) for dy in range(-k, k + 1) for dx in range(-k, k + 1))
    gz, gy, gx = np.gradient(-box)
    n = np.sqrt(gx ** 2 + gy ** 2 + gz ** 2) + 1e-6
    d = (gx * light[0] + gy * light[1] + gz * light[2]) / n
    return np.clip(np.round(1.2 + d * 2.6), 0, 4).astype(int)

def paint(solid, tone, mat, pals):
    """voxels -> RGBA voxels. A voxel with nothing over it shows its top: one tone lighter."""
    Z, Y, X = solid.shape; out = np.zeros((Z, Y, X, 4), np.uint8)
    above = np.zeros_like(solid); above[:-1] = solid[1:]
    t = np.clip(tone + (~above & solid), 0, 4)
    for m, pal in enumerate(pals):
        P = np.array(pal, np.uint8); sel = solid & (mat == m); out[sel, :3] = P[t[sel]]; out[sel, 3] = 255
    crack = solid & (mat == 9); out[crack, :3] = NAVY; out[crack, 3] = 255
    return out

def strip(vox): return np.concatenate([vox[z] for z in range(vox.shape[0])], axis=1)

def blob(Z, S, r0, h, seed, lumps=6):
    """a lumpy boulder: a squashed ball plus a few smaller balls stuck on it"""
    g = np.random.default_rng(seed); zz, yy, xx = np.mgrid[0:Z, 0:S, 0:S].astype(float); c = (S - 1) / 2
    f = (np.abs(xx - c) / r0) ** 2.6 + (np.abs(yy - c) / (r0 * .9)) ** 2.6 + ((zz + .5) / h) ** 2.4 < 1
    for _ in range(lumps):
        a = g.uniform(0, 6.283); d = g.uniform(.4, .72) * r0; r = g.uniform(.3, .5) * r0; z0 = g.uniform(0, h * .5)
        f |= (xx - c - np.cos(a) * d) ** 2 + (yy - c - np.sin(a) * d) ** 2 + ((zz - z0) * r0 / h * 1.05) ** 2 < r * r
    edge = np.maximum(np.abs(xx - c), np.abs(yy - c)) > c - .6
    return f & ~edge

def surface(solid):
    p = np.pad(solid, 1); inner = p[2:, 1:-1, 1:-1] & p[1:-1, 2:, 1:-1] & p[1:-1, :-2, 1:-1] & p[1:-1, 1:-1, 2:] & p[1:-1, 1:-1, :-2]
    return solid & ~inner

def nuggets(solid, mat, n, seed, size=(1.3, 2.3), m=1):
    """clumps of ore sitting in the surface"""
    g = np.random.default_rng(seed); sf = np.argwhere(surface(solid) & (np.indices(solid.shape)[0] >= 1)); zz, yy, xx = np.indices(solid.shape)
    for _ in range(n):
        z, y, x = sf[g.integers(len(sf))]; r = g.uniform(*size)
        mat[solid & ((xx - x) ** 2 + (yy - y) ** 2 + ((zz - z) * 1.2) ** 2 < r * r)] = m
    return mat

def prism(solid, mat, tone, p0, p1, r, m):
    """a pointed crystal from p0 up to its tip p1 (x, y, z), lit by which side of it you see"""
    zz, yy, xx = np.indices(solid.shape).astype(float); p0 = np.array(p0, float); p1 = np.array(p1, float); ax = p1 - p0; L = np.linalg.norm(ax); ax /= L
    rel = np.stack([xx - p0[0], yy - p0[1], zz - p0[2]], -1); t = rel @ ax; perp = rel - t[..., None] * ax; d = np.abs(perp[..., 0]) + np.abs(perp[..., 1]) * .9 + np.abs(perp[..., 2]) * .3
    rad = np.where(t < L * .62, r, r * (L - t) / (L * .38)); inn = (t >= -1) & (t <= L) & (d <= rad)
    solid |= inn; mat[inn] = m
    side = np.where(perp[..., 0] < -.3, 3, np.where(perp[..., 1] > .3, 2, 1)); side = np.where(t > L * .8, 4, side)
    tone[inn] = side[inn]
    return solid, mat, tone

def damage(solid, mat, stage, seed, face=False):
    """stage 1: cracks and a couple of bites; stage 2: more of both. face = a wall: only its front and top are hit"""
    if not stage: return solid, mat
    g = np.random.default_rng(seed); solid = solid.copy(); mat = mat.copy(); Z, Y, X = solid.shape; zz, yy, xx = np.indices(solid.shape).astype(float)
    sf = np.argwhere(surface(solid) & (zz >= 2) & ((yy >= Y - 4) if face else True))
    for _ in range(2 if stage == 1 else 5):
        z, y, x = sf[g.integers(len(sf))]; r = g.uniform(1.8, 2.6) if stage == 1 else g.uniform(2.2, 3.4)
        solid &= ~((xx - x) ** 2 + (yy - y) ** 2 + (zz - z) ** 2 < r * r)
    cx, cy, cz = (X - 1) / 2 + g.uniform(-2, 2), (Y - 1) / 2 if not face else Y - 1, Z * .5
    for _ in range(2 if stage == 1 else 4):
        a = g.uniform(0, 3.1416); b = g.uniform(-.5, .5); nrm = np.array([np.cos(a), np.sin(a) * (.25 if face else 1), b]); nrm /= np.linalg.norm(nrm)
        d = (xx - cx - g.uniform(-3, 3)) * nrm[0] + (yy - cy) * nrm[1] + (zz - cz - g.uniform(-3, 3)) * nrm[2]
        ox, oz = g.uniform(-3, 3), g.uniform(-4, 4); near = (xx - cx - ox) ** 2 + ((zz - cz - oz) * (.8 if face else 1)) ** 2 < (36 if stage == 1 else 64)
        mat[solid & surface(solid) & (np.abs(d) < .55) & near & ((yy >= Y - 3) & (zz < Z - 1) if face else True)] = 9
    return solid, mat

# ---------------- ROCKS: 20 x 20, 14 slices ----------------
RS, RZ = 20, 14
def rock(level, kind, stage):
    seed = 100 + level * 10 + kind
    solid = blob(RZ, RS, 8.3, 8.6 + kind * .7, seed, 8); mat = np.zeros(solid.shape, int)
    if kind == 1: mat = nuggets(solid, mat, 5, seed + 1, (1.2, 2.0))
    if kind == 2: mat = nuggets(solid, mat, 11, seed + 2, (1.5, 2.7))
    solid, mat = damage(solid, mat, stage, seed + 50 + stage)
    return paint(solid, shade(solid), mat, [STONE[level], GOLD])
def gem(name, gi, stage):
    seed = 900 + gi; g = np.random.default_rng(seed)
    solid = blob(RZ, RS, 7.2, 5.2, seed, 4); mat = np.zeros(solid.shape, int); tone = shade(solid); c = (RS - 1) / 2
    spikes = [((c, c, 1), (c + .5, c - .5, 13.2), 3.1), ((c - 4, c + 1, 1), (c - 6.5, c + 2, 9.5), 2.3), ((c + 4, c + 1.5, 1), (c + 6.5, c + 3, 8.5), 2.2),
              ((c + 1.5, c - 4, 1), (c + 3, c - 6.5, 8), 2.0), ((c - 2, c + 4.5, 1), (c - 2.5, c + 7, 6.5), 1.8)]
    if stage == 2: spikes = spikes[1:]
    for p0, p1, r in spikes[:5 if stage == 0 else 4]: solid, mat, tone = prism(solid, mat, tone, p0, p1, r, 1)
    s2, mat = damage(solid, mat, stage, seed + 60 + stage); gemv = mat == 1; solid = np.where(gemv, solid, s2)      # the bites only come out of the stone
    mat[(mat == 9) & gemv] = 1
    return paint(solid, tone, mat, [GEM_ROCK, GEMS[name]])

rows = [strip(rock(l, k, s)) for l in range(LEVELS) for k in range(3) for s in range(3)] + [strip(gem(n, i, s)) for i, n in enumerate(GEMS) for s in range(3)]
rocks = np.concatenate(rows, axis=0); Image.fromarray(rocks).save('assets/mine/rocks.png', optimize=True)

# ---------------- WALLS: 16 x 16, 24 slices. The front face is a wall of cobbles, set in and out, so the stack has real ledges ----------------
WS, WZ = 16, 24
def wall(level, kind, stage):
    seed = 300 + level * 10 + (kind if kind < 2 else 0) + (5 if kind >= 2 else 0); g = np.random.default_rng(seed)
    th = level // 2; NP, WX, WZS = WALL_LOOK[th]
    pts = np.array([[g.uniform(0, WS), g.uniform(0, WZ)] for _ in range(NP)])                     # cobble middles on the face (x, z); they wrap round in x so blocks tile
    xs, zs = np.meshgrid(np.arange(WS), np.arange(WZ)); d = []
    for px, pz in pts:
        dx = np.abs(xs - px); dx = np.minimum(dx, WS - dx); d.append(np.sqrt((dx * WX) ** 2 + ((zs - pz) * WZS) ** 2))
    d = np.array(d); order = np.sort(d, axis=0); cell = d.argmin(0); gap = order[1] - order[0]
    indent = np.where(gap < 1.1, 2, np.where(gap < 2.4, 1, 0)); indent[-1] = 0                         # the joints between cobbles sit deeper
    base = np.array([g.integers(1, 3) for _ in pts])[cell]                                         # each cobble its own tone
    solid = np.ones((WZ, WS, WS), bool); mat = np.zeros(solid.shape, int); tone = np.full(solid.shape, 1)
    for z in range(WZ):
        for x in range(WS):
            i = indent[z, x]
            if i: solid[z, WS - i:, x] = False
            tone[z, :, x] = base[z, x] - (1 if indent[z, x] == 2 else 0) - (1 if z < 3 else 0)
    # the top of the block: dark rock with a few specks, a lighter lip along the front
    top = g.random((WS, WS)); tone[WZ - 1] = np.where(top > .9, 1, 0); tone[WZ - 2, :, :] = np.minimum(tone[WZ - 2] + 1, 3)
    if kind >= 2:
        n = 3 if kind == 2 else 6; zz, yy, xx = np.indices(solid.shape)
        for _ in range(n):
            x, z, r = g.uniform(2, WS - 2), g.uniform(4, WZ - 4), g.uniform(1.4, 2.2) if kind == 2 else g.uniform(1.8, 3.0)
            dx = np.abs(xx - x); dx = np.minimum(dx, WS - dx); sel = (dx ** 2 + ((zz - z) * 1.0) ** 2 < r * r) & (yy >= WS - 4); mat[sel] = 1
            tone[sel] = np.clip(2 + (zz[sel] > z).astype(int) - (indent[zz[sel], xx[sel]] == 2), 0, 4)
        mat[WZ - 1][g.random((WS, WS)) > (.93 if kind == 3 else .97)] = 1
    if th == 3 and kind == 1:                                                                          # purple: a few small crystals growing out of the face
        zz, yy, xx = np.indices(solid.shape)
        for _ in range(3):
            x, z = g.uniform(2, WS - 2), g.uniform(4, WZ - 5); sel = (np.abs(xx - x) + np.abs(zz - z) * .7 < 1.6) & (yy >= WS - 3); mat[sel] = 2; tone[sel] = np.clip(1 + (zz[sel] - int(z)) + 1, 0, 4)
    if th >= 4 and kind < 2:                                                                            # the deepest: lava glows in some of the joints
        hot = g.choice(len(pts), 2 if th == 4 else 3, replace=False); zz, yy, xx = np.indices(solid.shape)
        j2 = (indent == 2) & np.isin(cell, hot); j2[-2:] = False; j2[:2] = False
        sel = j2[zz, xx] & (yy == WS - 3); mat[sel] = 2; tone[sel] = 2 + ((xx[sel] + zz[sel]) % 3 == 0)
        sel = j2[zz, xx] & (yy == WS - 2) ; solid[sel] = False
    solid, mat = damage(solid, mat, stage, seed + 70 + stage, face=True)
    Zs, Ys, Xs = solid.shape; out = np.zeros((Zs, Ys, Xs, 4), np.uint8); above = np.zeros_like(solid); above[:-1] = solid[1:]; above[-1] = True
    t = np.clip(tone + ((~above) & solid) * 1, 0, 4)
    for m, pal in enumerate([STONE[level], GOLD, AMETH if th == 3 else LAVA]):
        P = np.array(pal, np.uint8); sel = solid & (mat == m); out[sel, :3] = P[(tone if m == 2 else t)[sel]]; out[sel, 3] = 255
    cr = solid & (mat == 9); out[cr, :3] = NAVY; out[cr, 3] = 255
    return out
wrows = [strip(wall(l, k, s)) for l in range(LEVELS) for k in range(4) for s in range(3)]
walls = np.concatenate(wrows, axis=0); Image.fromarray(walls).save('assets/mine/walls.png', optimize=True)

# ---------------- FLOOR: 16 x 16 tiles ----------------
def floor(level, v):
    g = np.random.default_rng(700 + level * 10 + v); P = STONE[level]
    mix = lambda a, b, k: tuple(int(a[i] * (1 - k) + b[i] * k) for i in range(3))
    base, dk, lt = mix(P[0], P[1], .55), mix(P[0], (10, 8, 20), .25), mix(P[1], P[2], .35)
    t = np.zeros((16, 16, 4), np.uint8); t[..., :3] = base; t[..., 3] = 255; r = g.random((16, 16))
    t[r > .93, :3] = dk; t[r < .05, :3] = lt
    if v == 1:
        for _ in range(2): x, y = g.integers(2, 13, 2); t[y, x:x + 2, :3] = P[2]; t[y + 1, x:x + 2, :3] = P[1]; t[y + 2, x:x + 3, :3] = dk
    if v == 2:
        x, y = g.integers(3, 12, 2)
        for i in range(6): t[np.clip(y + i // 2, 0, 15), np.clip(x + i - 3 + (i % 3 == 0), 0, 15), :3] = (96, 26, 26) if level >= 8 and i in (2, 3) else dk   # deep down: a dull ember in the crack
    if v == 3: x, y = g.integers(3, 11, 2); t[y, x, :3] = P[3]; t[y + 1, x, :3] = P[1]
    return t
fl = np.concatenate([np.concatenate([floor(l, v) for v in range(4)], axis=1) for l in range(LEVELS)], axis=0); Image.fromarray(fl).save('assets/mine/floor.png', optimize=True)

# ---------------- PROPS (round 2, his note: "improve the ladders ... same sliced style"): the shaft's stone rim and the ladder, as stacks ----------------
# assets/mine/props.png: 30 slices of 20 x 20 a row. Rows 0-4 = the ring of stones round the shaft, one per level (8 slices used); row 5 = the ladder
# (two rails and a rung every 4th slice: stack as many slices as the ladder is tall).
PS, PZ = 20, 30
def rim(level):
    g = np.random.default_rng(500 + level); zz, yy, xx = np.mgrid[0:8, 0:PS, 0:PS].astype(float); c = (PS - 1) / 2
    solid = np.zeros((8, PS, PS), bool)
    for i in range(11):                                                   # eleven stones in a ring, each a little ball of its own size
        a = i / 11 * 6.283 + g.uniform(-.12, .12); r = g.uniform(2.3, 3.2); h = g.uniform(3.5, 6.5)
        solid |= ((xx - c - np.cos(a) * 7.2) / r) ** 2 + ((yy - c - np.sin(a) * 7.2) / r) ** 2 + ((zz + .5) / h) ** 2 < 1
    out = np.zeros((PZ, PS, PS, 4), np.uint8); out[:8] = paint(solid, shade(solid), np.zeros(solid.shape, int), [STONE[level]]); return out
def ladder():
    out = np.zeros((PZ, PS, PS, 4), np.uint8); W0, W1, W2 = (104, 62, 34), (150, 98, 52), (196, 142, 78)
    for z in range(PZ):
        for x0 in (5, 13): out[z, 9:11, x0:x0 + 2] = (*W1, 255); out[z, 9, x0] = (*W2, 255); out[z, 10, x0 + 1] = (*W0, 255)
        if z % 4 == 2: out[z, 9:11, 7:13] = (*W2, 255); out[z, 10, 7:13] = (*W1, 255)
    return out
props = np.concatenate([strip(rim(l * 2)) for l in range(5)] + [strip(ladder())], axis=0); Image.fromarray(props).save('assets/mine/props.png', optimize=True)

# ---------------- a check picture ----------------
def stackup(st, S, n, squash=1.0, lift=1):
    h = int(round(S * squash)); im = Image.new('RGBA', (S, h + n * lift), (0, 0, 0, 0))
    for z in range(n):
        sl = Image.fromarray(st[:, z * S:(z + 1) * S]).resize((S, h), Image.NEAREST); im.alpha_composite(sl, (0, n * lift - z * lift - 1))
    return im
chk = Image.new('RGBA', (12 * 18 + 9 * 24 + 100, LEVELS * 44 + 60), (20, 16, 30, 255))
for i, r in enumerate(rows):
    im = stackup(r, RS, RZ, .7); chk.alpha_composite(im, (4 + (i % 9) * 24, 4 + (i // 9) * 44))
for i, r in enumerate(wrows):
    im = stackup(r, WS, WZ); chk.alpha_composite(im, (224 + (i % 12) * 18, 4 + (i // 12) * 44))
chk.alpha_composite(Image.fromarray(fl), (224 + 12 * 18 + 8, 4))
try: chk.resize((chk.width * 3, chk.height * 3), Image.NEAREST).save('../mafia2-art/mine/mine-check.png')
except Exception as e: print('no check picture:', e)
print('rocks', rocks.shape, 'walls', walls.shape, 'floor', fl.shape)
