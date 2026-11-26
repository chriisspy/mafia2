"""THE MINE ELEVATOR (26 Nov 2026, his ask: "a shortcut to travel down the mines ... small pixel size, to match the caves").
A little voxel model, like the rocks and the walls (tools/make_mine.py), drawn out STRAIGHT ON as a stack: one slice a pixel higher than the
last, the slices 0.7 as deep as they are wide (the rocks' and ladders' own tilt, R_SQ in mine.js). It is written out already stacked, in
three layers, so the cage can ride down into its hole and up again between the other two:
  assets/mine/lift.png   13 rows of 70 px, cells of 39 px
        rows 0-11 = the 12 levels (the ring of stones round the hole is the level's own stone):
            cell 0 = everything that stands still (the hole, the stones, the two posts, the beam, the winch wheel)
            cell 1 = the front half of that again (drawn over the cage: the stones in front of it, the posts, the beam, the wheel)
        row 12, cell 0 = the cage (iron, a plank floor, bars at the back)
  ../mafia2-art/mine/lift-check.png   a look at all of it put together at 4x (not used by the game)
Flat shading: three tones and a highlight for each stuff (wood, iron, the level's stone). No AI art: the numbers below are all of it.
Run:  python -I tools/make_lift.py   (from the game folder)"""
import numpy as np
from PIL import Image

STONE = [[(58, 40, 38), (92, 64, 52), (128, 92, 70), (164, 124, 92), (198, 162, 122)], [(52, 38, 42), (82, 58, 56), (114, 82, 72), (148, 112, 94), (184, 150, 126)],   # the same 12 as tools/make_mine.py
         [(44, 44, 60), (72, 74, 92), (104, 108, 124), (140, 146, 158), (182, 190, 198)], [(38, 42, 60), (62, 72, 94), (90, 104, 128), (124, 142, 164), (166, 186, 204)],
         [(30, 38, 66), (48, 62, 98), (70, 92, 132), (98, 126, 164), (142, 170, 200)], [(20, 40, 62), (30, 66, 92), (44, 96, 122), (70, 132, 152), (116, 176, 186)],
         [(40, 26, 60), (66, 42, 92), (96, 62, 124), (130, 90, 156), (172, 130, 192)], [(38, 20, 54), (64, 32, 82), (94, 46, 108), (130, 66, 136), (176, 104, 170)],
         [(40, 18, 28), (68, 28, 38), (100, 42, 48), (136, 62, 60), (180, 96, 84)], [(32, 16, 24), (56, 24, 30), (84, 34, 38), (118, 50, 46), (164, 82, 66)],
         [(20, 16, 26), (34, 26, 38), (52, 36, 50), (78, 50, 62), (118, 74, 84)], [(14, 12, 20), (26, 20, 30), (40, 28, 38), (60, 36, 44), (98, 54, 58)]]
WOOD = [(104, 62, 34), (150, 98, 52), (196, 142, 78), (232, 190, 124)]     # the ladder's three, and a highlight
IRON = [(44, 48, 68), (74, 80, 104), (142, 152, 176), (212, 220, 236)]     # the den's cage bars, and a highlight
ROPE = [(120, 92, 54), (196, 168, 116)]
HOLE = [(7, 6, 15), (14, 11, 24)]
DARK = (12, 10, 24)                                                         # inside the cage
S, Z, SQ = 33, 43, .7                                                       # 33 wide and deep, 43 slices tall
CW, CH, MX, MY = 39, 70, 3, 3                                               # a cell on the sheet; the model sits MX in and MY down
C = 16                                                                      # the middle, x

def empty(): return np.zeros((Z, S, S, 4), np.uint8)
def put(v, z, y, x, col): v[z, y, x, :3] = col; v[z, y, x, 3] = 255

def shade(solid, light=(-.45, .5, .75)):
    f = solid.astype(float); k = 2; pad = np.pad(f, k)
    box = sum(pad[k + dz:k + dz + f.shape[0], k + dy:k + dy + f.shape[1], k + dx:k + dx + f.shape[2]] for dz in range(-k, k + 1) for dy in range(-k, k + 1) for dx in range(-k, k + 1))
    gz, gy, gx = np.gradient(-box); n = np.sqrt(gx ** 2 + gy ** 2 + gz ** 2) + 1e-6
    return (gx * light[0] + gy * light[1] + gz * light[2]) / n

def frame(level):
    """what stands still: the hole, the stones round it, two posts, the beam, the braces, the winch wheel and the rope's top"""
    v = empty(); P = STONE[level]; g = np.random.default_rng(4100 + level // 2)
    yy, xx = np.mgrid[0:S, 0:S].astype(float)
    hole = ((xx - C) / 11.6) ** 2 + ((yy - 15.5) / 6.6) ** 2 < 1
    for y, x in np.argwhere(hole): put(v, 0, y, x, HOLE[1] if y < 13 else HOLE[0])
    zz, yy, xx = np.mgrid[0:6, 0:S, 0:S].astype(float); solid = np.zeros((6, S, S), bool); N = 17
    for i in range(N):                                                     # seventeen stones in a ring, each its own size
        a = (i + .5) / N * 6.283 + g.uniform(-.1, .1); r = g.uniform(2.4, 3.2); h = g.uniform(3.2, 5.6)
        solid |= ((xx - C - np.cos(a) * 14.2) / r) ** 2 + ((yy - 15.5 - np.sin(a) * 9.8) / (r * .95)) ** 2 + ((zz + .5) / h) ** 2 < 1
    d = shade(solid); above = np.zeros_like(solid); above[:-1] = solid[1:]
    tone = np.where(d > .42, 3, np.where(d > -.1, 2, 1)); tone = np.where(solid & ~above & (tone == 3), 4, tone)   # three tones, and a highlight on the lit tops
    for z, y, x in np.argwhere(solid): put(v, z, y, x, P[tone[z, y, x]])
    for x0 in (0, S - 2):                                                  # the posts
        for z in range(0, 40):
            for y in (15, 16): put(v, z, y, x0, WOOD[2]); put(v, z, y, x0 + 1, WOOD[1])
            if z % 9 == 7:
                for y in (15, 16): put(v, z, y, x0, WOOD[1]); put(v, z, y, x0 + 1, WOOD[0])   # a knot ring
    for i in range(6):                                                     # the braces up to the beam
        for y in (15, 16): put(v, 34 + i, y, 2 + i, WOOD[1]); put(v, 34 + i, y, S - 3 - i, WOOD[0])
    for x in range(S):                                                     # the beam: a lit top, three tones down its face
        put(v, 42, 15, x, WOOD[3]); put(v, 42, 16, x, WOOD[2]); put(v, 41, 15, x, WOOD[1]); put(v, 41, 16, x, WOOD[1]); put(v, 40, 15, x, WOOD[0]); put(v, 40, 16, x, WOOD[0])
    for x in (0, 1, S - 2, S - 1): put(v, 41, 16, x, IRON[1]); put(v, 40, 16, x, IRON[0]); put(v, 42, 16, x, IRON[2])   # iron straps where the posts meet it
    cz = 35                                                                # the winch wheel, hanging under the beam
    for z in range(cz - 4, cz + 5):
        for x in range(C - 4, C + 5):
            dx, dz = x - C, z - cz; r = np.hypot(dx, dz); col = None
            if 3.3 <= r <= 4.5: col = IRON[2] if (dz > 0 and dx <= 1) else IRON[0] if (dz < -1 and dx >= 0) else IRON[1]
            elif r < 1.2: col = IRON[2]
            elif dx == 0 or dz == 0: col = IRON[1]
            if col is not None:
                for y in (15, 16): put(v, z, y, x, col)
    put(v, cz + 3, 16, C - 2, IRON[3]); put(v, cz + 3, 16, C - 3, IRON[3])    # the highlight on its rim
    return v

def cage():
    v = empty(); x0, x1, y0, y1 = 5, 27, 10, 21
    for y in range(y0, y1 + 1):                                            # the plank floor
        for x in range(x0, x1 + 1): put(v, 2, y, x, WOOD[0]); put(v, 3, y, x, WOOD[1] if x in (10, 16, 22) else WOOD[2])
    for x in range(x0, x1 + 1): put(v, 3, y1, x, WOOD[1])
    for z in range(4, 28):
        for x in range(x0 + 2, x1 - 1): put(v, z, y0, x, DARK)             # dark inside
        for x in (10, 13, 16, 19, 22): put(v, z, y0 + 1, x, IRON[1] if z > 15 else IRON[0])   # the bars at the back
    for x in range(x0 + 2, x1 - 1): put(v, 15, y0 + 1, x, IRON[1])         # a rail across them
    for z in range(2, 28):                                                 # four corner posts
        for ya in (y0, y1 - 1):
            for yb in (0, 1):
                put(v, z, ya + yb, x0, IRON[2] if ya > y0 else IRON[1]); put(v, z, ya + yb, x0 + 1, IRON[1] if ya > y0 else IRON[0])
                put(v, z, ya + yb, x1 - 1, IRON[2] if ya > y0 else IRON[1]); put(v, z, ya + yb, x1, IRON[1] if ya > y0 else IRON[0])
    for x in range(x0 + 2, x1 - 1): put(v, 27, y1, x, IRON[2]); put(v, 26, y1, x, IRON[1]); put(v, 25, y1, x, IRON[1]); put(v, 24, y1, x, IRON[0])   # the bar over the way in
    for y in range(y0 - 1, y1 + 2):                                        # the roof: a lit lip along the front, a dark edge under it
        for x in range(x0 - 1, x1 + 2):
            put(v, 28, y, x, (30, 32, 48)); edge = x in (x0 - 1, x1 + 1) or y == y0 - 1
            put(v, 29, y, x, IRON[2] if y == y1 + 1 else IRON[1] if edge else IRON[0])
    for x in (x0 + 1, x1 - 1): put(v, 29, y1 - 1, x, IRON[2]); put(v, 29, y0 + 1, x, IRON[1])      # rivets
    for y in (15, 16): put(v, 30, y, C, ROPE[1]); put(v, 29, y, C, IRON[3])   # where the rope is tied
    return v

def render(v, ymin=0):
    """the stack, straight on: every voxel one pixel, a slice one pixel higher than the last, the back rows first"""
    im = np.zeros((CH, CW, 4), np.uint8)
    for z in range(Z):
        for y in range(ymin, S):
            row = MY + (Z - 1 - z) + int(y * SQ); sel = v[z, y, :, 3] > 0
            im[row, MX:MX + S][sel] = v[z, y][sel]
    return im
GY = MY + (Z - 1) + int(15.5 * SQ)                                         # the sheet row the ground's middle lands on (mine.js LIFT.gy)

rows = []
for l in range(12):
    f = frame(l); rows.append(np.concatenate([render(f), render(f, 13)], axis=1))
cg = render(cage()); rows.append(np.concatenate([cg, np.zeros_like(cg)], axis=1))
sheet = np.concatenate(rows, axis=0); Image.fromarray(sheet).save('assets/mine/lift.png', optimize=True)

# ---------------- a check picture: every level's lift on its own floor, the way the game puts it together ----------------
def navy(im):
    a = im[..., 3] > 0; p = np.pad(a, 1); edge = ~a & (p[2:, 1:-1] | p[:-2, 1:-1] | p[1:-1, 2:] | p[1:-1, :-2]); im = im.copy(); im[edge] = (1, 3, 46, 255); return im
try:
    fl = Image.open('assets/mine/floor.png').convert('RGBA'); wl = Image.open('assets/mine/walls.png').convert('RGBA')
    chk = Image.new('RGBA', (6 * 64, 2 * 92), (7, 6, 15, 255))
    for l in range(12):
        ox, oy = (l % 6) * 64, (l // 6) * 92
        for ty in range(6):
            for tx in range(4):
                if ty < 2:                                                  # a wall behind it
                    for z in range(23): chk.alpha_composite(wl.crop((z * 16, l * 12 * 16, z * 16 + 16, l * 12 * 16 + 16)), (ox + tx * 16, oy + 4 + ty * 0 + 23 - z)) if ty == 1 else None
                else: chk.alpha_composite(fl.crop((0, l * 16, 16, l * 16 + 16)), (ox + tx * 16, oy + ty * 16 - 4))
        f = sheet[l * CH:(l + 1) * CH]; im = Image.fromarray(f[:, :CW].copy()); im.alpha_composite(Image.fromarray(cg)); im.alpha_composite(Image.fromarray(f[:, CW:].copy()))
        chk.alpha_composite(Image.fromarray(navy(np.array(im))), (ox + 12, oy + 12))
    chk.resize((chk.width * 4, chk.height * 4), Image.NEAREST).save('../mafia2-art/mine/lift-check.png')
except Exception as e: print('no check picture:', e)
print('lift', sheet.shape, 'gy', GY)
