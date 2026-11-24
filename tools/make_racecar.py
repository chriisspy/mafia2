"""THE RACE CAR and its parts (24 Nov 2026, his ask: "a whole car modding system ... a cool 3D car editing image").
The Godfather's car (tools/make_car.py) taken apart into LAYERS, every one a sprite-stack strip of its own, so the game can
swap a part and build the car again while it runs (race.js: raceBuildCar):
  body                 the shell: an open engine bay under the bonnet, a helmet at the wheel
  bonnet  x4           the lid, shut -> wide open (hinged at the windscreen: the bonnet OPENS in the editor)
  engine  x4           what sits in the bay (the big one pokes a blower through the lid)
  wheels  x4, exhaust x4, spoiler x4
Paint is not a layer: the four black-paint colours below are KEYS the game repaints (PAINT_KEYS).

Run from the mafia2 folder:  python -I tools/make_racecar.py [check.png]
Writes assets/race/car.png (one row a layer, N slices of S x S, ground slice on the left, NOSE DOWN) and assets/race/car.json.
RULE (his note, 21 Nov): every detail at least 2 pixels thick in every direction, or it blinks out at some angles.
"""
import json, math, os, sys
from PIL import Image

S, N, SQUASH = 37, 16, 0.55
C = S // 2
NAVY = (1, 3, 46, 255)
BODY = [(18, 16, 36), (46, 44, 82), (78, 78, 124), (130, 134, 182)]     # the paint keys: deep, side, top, shine
TYRE, WALL, HUB = (12, 10, 22), (226, 220, 204), (150, 156, 180)
CHROME = [(120, 130, 160), (196, 206, 230), (240, 244, 255)]
GLASS, GLASS_D = (132, 184, 224), (72, 108, 160)
LAMP, TAIL = (255, 228, 104), (214, 60, 66)
BOARD = (52, 48, 78)
BAY = (30, 30, 44)
IRON = [(70, 74, 92), (104, 110, 132)]
RED = [(150, 34, 44), (214, 60, 66), (255, 120, 110)]
GOLD = [(176, 120, 36), (232, 177, 58), (255, 226, 130)]
BLUE = [(40, 70, 150), (79, 155, 224)]
CARBON = [(26, 26, 36), (48, 50, 64)]
HELMET = [(214, 60, 66), (240, 240, 250)]


def blank():
    return [[None] * S for _ in range(S)]


def put(sl, x, y, col):
    if 0 <= C + y < S and 0 <= C + x < S:
        sl[C + y][C + x] = tuple(col) + (255,)


def box(sl, x0, x1, y0, y1, side, top=None, rnd=True):
    top = top or side
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if rnd and (x in (x0, x1)) and (y in (y0, y1)) and x1 - x0 >= 3 and y1 - y0 >= 3:
                continue
            put(sl, x, y, side if (x in (x0, x1) or y in (y0, y1)) else top)


def ring(sl, x0, x1, y0, y1, col, t=2):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x - x0 < t or x1 - x < t or y - y0 < t or y1 - y < t:
                put(sl, x, y, col)


def body():
    """17 wide (x -8..8), 33 long (y -16..16, nose at +16). The Godfather's car with the bonnet lid, wheels and driver taken off."""
    sl = [blank() for _ in range(N)]
    box(sl[1], -5, 5, -15, 14, BODY[0])
    box(sl[2], -5, 5, -16, 15, BODY[0], BODY[1])
    box(sl[2], -8, 8, -6, 6, BOARD, BODY[1], rnd=False)
    box(sl[3], -8, 8, -6, 6, BOARD, BODY[1], rnd=False)
    box(sl[3], -6, 6, -16, 15, BODY[1], BODY[1])
    box(sl[3], -2, 2, 6, 12, BAY, BAY, rnd=False)                 # the floor of the engine bay
    for z in (2, 3):                                             # bumpers
        for x in range(-6, 7):
            for d in (0, 1):
                put(sl[z], x, 16 - d, CHROME[1]); put(sl[z], x, -16 + d, CHROME[0] if z == 2 else TAIL if abs(x) in (4, 5) else CHROME[0])
    for sx in (-1, 1):                                           # fenders and headlights
        for z in (4, 5):
            g = z - 4
            box(sl[z], min(sx * 5, sx * 8), max(sx * 5, sx * 8), 6 + g, 14 - g, BODY[1], BODY[2], rnd=False)
            box(sl[z], min(sx * 5, sx * 8), max(sx * 5, sx * 8), -14 + g, -6 - g, BODY[1], BODY[2], rnd=False)
            for x in (sx * 6, sx * 7):
                for y in (13, 14):
                    put(sl[z], x, y - (z - 4), LAMP)
    for z in (4, 5):
        ring(sl[z], -4, 4, 4, 15, BODY[1])                       # the nose is a tub now: walls 2 thick round the bay
        for x in (-4, 4):
            put(sl[z], x, 15, None) if False else None
        box(sl[z], -6, 6, -11, 4, BODY[1], BODY[1] if z == 4 else BODY[0])
        box(sl[z], -5, 5, -16 + (z - 4), -11, BODY[1], BODY[2])
    ring(sl[6], -4, 4, 12, 14, BODY[1])                          # the front lip the lid shuts on
    for z in (4, 5, 6):                                          # the chrome grille
        for x in range(-2, 3):
            for d in (0, 1):
                put(sl[z], x, (15 if z < 6 else 14) - d, CHROME[(x + z) % 2 + (z == 6)])
    for z in (6, 7, 8):                                          # windows and pillars
        box(sl[z], -6, 6, -11, 4, BODY[0], BODY[0], rnd=False)
        ring(sl[z], -6, 6, -11, 4, GLASS if z < 8 else GLASS_D)
        for px in (-6, -5, 5, 6):
            for py in (4, 3, -11, -10, -3, -4):
                put(sl[z], px, py, BODY[1])
        for x in range(-6, 7):
            if abs(x) > 2:
                put(sl[z], x, -11, BODY[1]); put(sl[z], x, -10, BODY[1])
    for x in (-1, 0, 1):                                         # the driver: a racing helmet behind the windscreen
        for d in (0, 1, 2):
            put(sl[7], x, 4 - d, HELMET[0] if d else GLASS_D); put(sl[8], x, 4 - d, HELMET[1] if x == 0 else HELMET[0])
    box(sl[9], -6, 6, -11, 4, BODY[1], BODY[2])
    box(sl[10], -5, 5, -10, 3, BODY[2], BODY[2])
    for y in range(-8, 1):
        put(sl[10], -3, y, BODY[3]); put(sl[10], -2, y, BODY[3])
    return sl


def bonnet(deg):
    """the lid: 9 wide, 8 long, 2 thick (dark underneath, paint on top), swung up about its back edge (the windscreen end)"""
    sl = [blank() for _ in range(N)]
    a = math.radians(deg); L = 8
    if deg == 0:
        box(sl[6], -4, 4, 4, 11, BODY[1], BODY[2])
        for y in range(5, 11):
            put(sl[6], 0, y, BODY[3]); put(sl[6], -1, y, BODY[3])
        return sl
    k = 0
    while k <= L * 4:
        d = k / 4
        for n, lay in ((0, 0), (.5, 0), (1, 1), (1.5, 1)):
            y = 4 + d * math.cos(a) - n * math.sin(a); z = 6 + d * math.sin(a) + n * math.cos(a)
            yi, zi = int(round(y)), int(round(z))
            if 0 <= zi < N:
                for x in range(-4, 5):
                    edge = abs(x) == 4 or d < .6 or d > L - .6
                    col = BODY[0] if lay == 0 else BODY[3] if x in (-1, 0) and not edge else BODY[1] if edge else BODY[2]
                    cur = sl[zi][C + yi][C + x]
                    if cur is None or lay == 1:
                        put(sl[zi], x, yi, col)
        k += 1
    for z in range(4, 14):                                       # the prop rod that holds it up
        y = 12 - (z - 4) * (12 - (4 + (L - 1) * math.cos(a))) / max(1, (6 + (L - 1) * math.sin(a)) - 4)
        if z < 6 + (L - 1) * math.sin(a):
            put(sl[z], 3, int(round(y)), CHROME[1]); put(sl[z], 2, int(round(y)), CHROME[0])
    return sl


def engine(v):
    """in the bay: x -2..2, y 6..12, sitting on z 4 and 5 (z 6+ only shows with the lid up; the blower stands through it)"""
    sl = [blank() for _ in range(N)]
    if v == 0:                                                   # stock: a plain iron block, a dark cover, a round air filter
        for z in (4, 5):
            box(sl[z], -2, 2, 6, 12, IRON[0], IRON[1] if z == 5 else IRON[0], rnd=False)
        for y in range(7, 12):
            put(sl[5], -1, y, BOARD); put(sl[5], 0, y, BOARD)
        for x in (1, 2):
            for y in (10, 11):
                put(sl[5], x, y, TYRE)
    elif v == 1:                                                 # tuned: red rocker covers, chrome down the middle
        for z in (4, 5):
            box(sl[z], -2, 2, 6, 12, IRON[0], IRON[1], rnd=False)
        for y in range(6, 13):
            for x in (-2, -1, 1, 2):
                put(sl[5], x, y, RED[1] if y % 3 else RED[2])
            put(sl[5], 0, y, CHROME[1])
    elif v == 2:                                                 # V8: blue block, gold covers, eight chrome stacks standing up
        for z in (4, 5):
            box(sl[z], -2, 2, 6, 12, BLUE[0], BLUE[1], rnd=False)
        for y in range(6, 13):
            for x in (-2, 2):
                put(sl[5], x, y, GOLD[1])
        for y in (7, 8, 10, 11):
            for x in (-1, 0, 1):
                put(sl[5], x, y, CHROME[0]); put(sl[6], x, y, CHROME[2] if x == 0 else CHROME[1])
    else:                                                        # supercharged: a chrome blower through the lid, a red scoop on top
        for z in (4, 5):
            box(sl[z], -2, 2, 6, 12, CARBON[0], CARBON[1], rnd=False)
        for y in range(6, 13):
            for x in (-2, 2):
                put(sl[5], x, y, RED[1])
        for z in (5, 6, 7):
            box(sl[z], -1, 1, 7, 11, CHROME[0], CHROME[1], rnd=False)
            for y in (8, 10):
                for x in (-1, 0, 1):
                    put(sl[z], x, y, CHROME[2])
        box(sl[8], -1, 1, 7, 11, RED[0], RED[1], rnd=False)
        box(sl[9], -1, 1, 7, 10, RED[1], RED[2], rnd=False)
        for x in (-1, 0, 1):
            put(sl[8], x, 11, TYRE); put(sl[9], x, 11, TYRE)     # the scoop's mouth
    return sl


def wheels(v):
    sl = [blank() for _ in range(N)]
    wide = v == 3
    wall, hub, tyre = [(WALL, HUB, TYRE), (RED[1], CHROME[2], TYRE), (GOLD[1], GOLD[2], TYRE), (CHROME[1], RED[1], (20, 18, 30))][v]
    for z in (0, 1, 2, 3):
        for sx, wy in ((-1, 7), (1, 7), (-1, -13), (1, -13)):
            x0, x1 = (-8 - wide, -6) if sx < 0 else (6, 8 + wide)
            y0, y1 = wy - wide * (wy < 0), wy + 5 + wide * (wy < 0)   # slicks: fatter all round at the back
            box(sl[z], x0, x1, y0 + (z in (0, 3)), y1 - (z in (0, 3)), tyre, rnd=False)
            if z in (1, 2):
                for o in ((x0, x0 + 1) if sx < 0 else (x1 - 1, x1)):
                    for y in range(y0 + 1, y1):
                        mid = y in (wy + 2, wy + 3)
                        put(sl[z], o, y, hub if (z == 1 and mid) or (v >= 2 and mid) else wall)
    return sl


def exhaust(v):
    sl = [blank() for _ in range(N)]
    def pipe(x0, w, zs, col, tip=None):
        for z in zs:
            for x in range(x0, x0 + w):
                for y in (-17, -18):
                    put(sl[z], x, y, tip if (tip and y == -18) else col)
    if v == 0:
        pipe(3, 2, (1, 2), IRON[0])
    elif v == 1:
        pipe(-5, 2, (1, 2), CHROME[1]); pipe(4, 2, (1, 2), CHROME[1])
    elif v == 2:
        for x0 in (-6, 4):
            pipe(x0, 3, (1, 2, 3), CHROME[1], CHROME[2])
            put(sl[2], x0 + 1, -18, TYRE)
    else:
        for x0 in (-6, -3, 2, 5):
            pipe(x0, 2, (1, 2), GOLD[1], GOLD[2])
        for x in range(-6, 7):                                   # a red diffuser under the bumper
            for y in (-16, -17):
                put(sl[1], x, y, RED[0])
    return sl


def spoiler(v):
    sl = [blank() for _ in range(N)]
    if v == 1:                                                   # ducktail: a lip standing on the boot's edge
        for z in (6, 7):
            box(sl[z], -5, 5, -16 + (z - 6), -14 + (z - 6) - (z == 7), BODY[1], BODY[2], rnd=False)
    elif v == 2:                                                 # a wing on two posts
        for z in (6, 7, 8):
            for sx in (-4, 3):
                for x in (sx, sx + 1):
                    for y in (-15, -14):
                        put(sl[z], x, y, CHROME[0])
        box(sl[9], -7, 7, -17, -13, BODY[1], BODY[2], rnd=False)
        box(sl[10], -7, 7, -17, -14, BODY[2], BODY[3], rnd=False)
        for z in (9, 10, 11):
            for x in (-8, -7, 7, 8):
                for y in range(-17, -12):
                    put(sl[z], x, y, BODY[1])
    elif v == 3:                                                 # the big GT wing: carbon, tall, red end plates
        for z in (6, 7, 8, 9, 10):
            for sx in (-4, 3):
                for x in (sx, sx + 1):
                    for y in (-15, -14):
                        put(sl[z], x, y, CHROME[1])
        box(sl[11], -8, 8, -18, -13, CARBON[0], CARBON[1], rnd=False)
        box(sl[12], -8, 8, -18, -14, CARBON[1], CARBON[1], rnd=False)
        for x in range(-6, 7):
            put(sl[12], x, -16, RED[1]); put(sl[12], x, -15, RED[1])
        for z in (10, 11, 12, 13):
            for x in (-9, -8, 8, 9):
                for y in range(-18, -11):
                    put(sl[z], x, y, RED[1] if z < 13 else RED[2])
    return sl


ROWS = [('body', body, [None]), ('bonnet', bonnet, [0, 22, 44, 66]), ('engine', engine, [0, 1, 2, 3]), ('wheels', wheels, [0, 1, 2, 3]),
        ('exhaust', exhaust, [0, 1, 2, 3]), ('spoiler', spoiler, [0, 1, 2, 3])]


def to_img(sl):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            if sl[y][x]:
                im.putpixel((x, y), sl[y][x])
    return im


def merge(layers):
    out = [blank() for _ in range(N)]
    for L in layers:
        for z in range(N):
            for y in range(S):
                for x in range(S):
                    if L[z][y][x]:
                        out[z][y][x] = L[z][y][x]
    return out


def render(slices, turn_deg, squash=SQUASH):
    h = round(S * squash); W, H = S + 8, h + N + 6
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for z, im in enumerate(slices):
        r = im.rotate(-turn_deg, Image.NEAREST).resize((S, h), Image.NEAREST)
        out.alpha_composite(r, (4, H - 3 - h - z))
    px = out.load(); edge = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 60 and any(0 <= x + a < W and 0 <= y + b < H and px[x + a, y + b][3] >= 60 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                edge.append((x, y))
    for x, y in edge:
        px[x, y] = NAVY
    return out


def main():
    os.makedirs('assets/race', exist_ok=True)
    rows, index = [], {}
    for name, fn, vs in ROWS:
        index[name] = []
        for v in vs:
            index[name].append(len(rows)); rows.append(fn() if v is None else fn(v))
    strip = Image.new('RGBA', (S * N, S * len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for z in range(N):
            strip.paste(to_img(row[z]), (z * S, r * S))
    strip.save('assets/race/car.png', optimize=True)
    json.dump({'s': S, 'n': N, 'squash': SQUASH, 'rows': index, 'paint': ['#%02x%02x%02x' % c for c in BODY]}, open('assets/race/car.json', 'w'))
    if len(sys.argv) > 1:
        R = lambda n, i: rows[index[n][i]]
        cars = [merge([R('body', 0), R('engine', i), R('wheels', i), R('exhaust', i), R('spoiler', i), R('bonnet', 0)]) for i in range(4)]
        opened = [merge([R('body', 0), R('engine', i), R('wheels', 0), R('exhaust', 0), R('spoiler', 0), R('bonnet', b)]) for i, b in ((0, 1), (1, 2), (2, 3), (3, 3))]
        angs = [0, 45, 90, 135, 180, 225, 270, 315]
        fr = [[render([to_img(s) for s in car], a) for a in angs] for car in cars + opened]
        w, h = fr[0][0].size
        sheet = Image.new('RGBA', (w * 8, h * len(fr)), (96, 140, 84, 255))
        for r in range(len(fr)):
            for i, f in enumerate(fr[r]):
                sheet.alpha_composite(f, (i * w, r * h))
        sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(sys.argv[1])
    print('race car: %d rows, %d slices of %dx%d' % (len(rows), N, S, S))


main()
