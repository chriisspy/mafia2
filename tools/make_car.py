"""The Getaway Car outfit (21 Nov 2026): an old-school black mafia car with a driver, built as SPRITE-STACK slices
like the Alien (tools/make_ufo.py), so it turns in real 3D. Modelled on the decoration car (assets/decor/car.png).

Run from the mafia2 folder:  python tools/make_car.py [check.png]

Writes
  assets/car/car.png            the slice strip: N slices of S x S, ground slice on the left.
                                Rows 0 and 1 = headlights on (the game swaps between them; they are the same), row 2 = lights off.
  assets/car/car.json           {s, n, squash}
  assets/final/car/<dir>.png    flat front/back/left/right pictures (face card, lobby, case reel).
The NOSE points DOWN (+y) in every slice. x = across the car, y = along it, z = up. All sizes in slice pixels;
the game doubles the finished picture, so one slice pixel = one of the cast's 2x2 pixels.
"""
import json, os, sys
from PIL import Image

S, N, SQUASH = 37, 11, 0.55
C = S // 2
NAVY = (1, 3, 46, 255)

BODY = [(18, 16, 36), (46, 44, 82), (78, 78, 124), (130, 134, 182)]     # black paint: deep, side, top, shine
TYRE, WALL, HUB = (12, 10, 22), (226, 220, 204), (150, 156, 180)       # tyre, its white wall, the hub
CHROME = [(120, 130, 160), (196, 206, 230), (240, 244, 255)]
GLASS, GLASS_D = (132, 184, 224), (72, 108, 160)
LAMP, LAMP_OFF, TAIL = (255, 228, 104), (92, 90, 120), (214, 60, 66)
SKIN, SKIN_D = (226, 176, 142), (176, 118, 104)
BOARD = (52, 48, 78)
HAIR, MOUST = (98, 100, 124), (150, 152, 170)


def blank():
    return [[None] * S for _ in range(S)]


def box(sl, x0, x1, y0, y1, side, top=None, rnd=True):
    """a block from above: `side` round its rim (what you see from the side), `top` inside. rnd = clip the four corners."""
    top = top or side
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            corner = (x in (x0, x1)) and (y in (y0, y1))
            if rnd and corner and x1 - x0 >= 3 and y1 - y0 >= 3:
                continue
            rim = x in (x0, x1) or y in (y0, y1)
            sl[C + y][C + x] = (side if rim else top) + (255,)


def put(sl, x, y, col):
    sl[C + y][C + x] = col + (255,)


def ring(sl, x0, x1, y0, y1, col, t=2):
    """only the rim of a block, t pixels thick (thin 1px rims drop out when a slice turns: his note, 21 Nov)"""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x - x0 < t or x1 - x < t or y - y0 < t or y1 - y < t:
                sl[C + y][C + x] = col + (255,)


def build(phase):
    """phase 0/1 = headlights on, 2 = off.  17 wide (x -8..8), 33 long (y -16..16, nose at +16), 11 tall.
    RULE: every detail is at least 2 pixels thick in every direction, or it blinks out at some angles."""
    sl = [blank() for _ in range(N)]
    lamp = LAMP if phase < 2 else LAMP_OFF
    wheels = [(-8, 7), (6, 7), (-8, -13), (6, -13)]              # (x of the inner column, y of the back end): 3 wide, 6 long
    for z in (0, 1, 2, 3):                                       # the wheels: 4 slices tall, white walls 2 deep on the outside
        for wx, wy in wheels:
            box(sl[z], wx, wx + 2, wy + (z in (0, 3)), wy + 5 - (z in (0, 3)), TYRE, rnd=False)
            if z in (1, 2):
                for o in ((wx, wx + 1) if wx < 0 else (wx + 1, wx + 2)):
                    for y in range(wy + 1, wy + 5):
                        put(sl[z], o, y, HUB if (z == 1 and y in (wy + 2, wy + 3)) else WALL)
    box(sl[1], -5, 5, -15, 14, BODY[0])                          # the underside
    box(sl[2], -5, 5, -16, 15, BODY[0], BODY[1])                 # the skirt
    box(sl[2], -8, 8, -6, 6, BOARD, BODY[1], rnd=False)          # running boards between the wheels
    box(sl[3], -8, 8, -6, 6, BOARD, BODY[1], rnd=False)
    box(sl[3], -6, 6, -16, 15, BODY[1], BODY[1])
    for z in (2, 3):                                             # bumpers, 2 deep and 2 tall
        for x in range(-6, 7):
            for d in (0, 1):
                put(sl[z], x, 16 - d, CHROME[1]); put(sl[z], x, -16 + d, CHROME[0] if z == 2 else TAIL if abs(x) in (4, 5) else CHROME[0])
    for sx in (-1, 1):                                           # fenders: a lid over each wheel, two slices
        for z in (4, 5):
            g = z - 4
            box(sl[z], min(sx * 5, sx * 8), max(sx * 5, sx * 8), 6 + g, 14 - g, BODY[1], BODY[2], rnd=False)
            box(sl[z], min(sx * 5, sx * 8), max(sx * 5, sx * 8), -14 + g, -6 - g, BODY[1], BODY[2], rnd=False)
        for z in (4, 5):                                         # round headlights: 2 x 2 x 2 on the front of each fender
            for x in (sx * 6, sx * 7):
                for y in (13, 14):
                    put(sl[z], x, y - (z - 4), lamp)
    for z in (4, 5):                                             # the long bonnet, the cabin's lower half, the boot
        box(sl[z], -4, 4, 4, 15, BODY[1], BODY[2])
        box(sl[z], -6, 6, -11, 4, BODY[1], BODY[1] if z == 4 else BODY[0])
        box(sl[z], -5, 5, -16 + (z - 4), -11, BODY[1], BODY[2])
    box(sl[6], -4, 4, 4, 14, BODY[1], BODY[2])                   # the bonnet's top, a shine 2 wide down the middle
    for y in range(5, 13):
        put(sl[6], 0, y, BODY[3]); put(sl[6], -1, y, BODY[3])
    for z in (4, 5, 6):                                          # the chrome grille on the nose: 5 wide, 2 deep, 3 tall
        for x in range(-2, 3):
            for d in (0, 1):
                put(sl[z], x, (15 if z < 6 else 14) - d, CHROME[(x + z) % 2 + (z == 6)])
    for z in (6, 7, 8):                                          # the windows all round: glass 2 thick, black pillars 2 x 2
        box(sl[z], -6, 6, -11, 4, BODY[0], BODY[0], rnd=False)
        ring(sl[z], -6, 6, -11, 4, GLASS if z < 8 else GLASS_D)
        for px in (-6, -5, 5, 6):
            for py in (4, 3, -11, -10, -3, -4):
                put(sl[z], px, py, BODY[1])
        for x in range(-6, 7):                                   # a small back window
            if abs(x) > 2:
                put(sl[z], x, -11, BODY[1]); put(sl[z], x, -10, BODY[1])
    # the driver behind the windscreen: the Godfather. A face 3 wide and 2 deep, a grey moustache under it, grey slicked hair above.
    for x in (-1, 0, 1):
        for d in (0, 1):
            put(sl[6], x, 4 - d, MOUST if d == 0 else SKIN_D); put(sl[7], x, 4 - d, SKIN)
    for x in (-2, -1, 0, 1, 2):
        for d in (0, 1, 2):
            put(sl[8], x, 4 - d, HAIR)
    box(sl[9], -6, 6, -11, 4, BODY[1], BODY[2])                  # the roof, lighter on top, with a shine 2 wide
    box(sl[10], -5, 5, -10, 3, BODY[2], BODY[2])
    for y in range(-8, 1):
        put(sl[10], -3, y, BODY[3]); put(sl[10], -2, y, BODY[3])
    return sl


def to_img(sl):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            if sl[y][x]:
                im.putpixel((x, y), sl[y][x])
    return im


def render(slices, turn_deg, squash=SQUASH):
    """the same loop the game runs: rotate, squash, lift one pixel a slice, bottom to top; then ONE navy outline"""
    h = round(S * squash)
    W, H = S + 4, h + N + 4
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for z, im in enumerate(slices):
        r = im.rotate(-turn_deg, Image.NEAREST).resize((S, h), Image.NEAREST)
        out.alpha_composite(r, (2, H - 2 - h - z))
    px = out.load(); edge = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 60 and any(0 <= x + a < W and 0 <= y + b < H and px[x + a, y + b][3] >= 60 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                edge.append((x, y))
    for x, y in edge:
        px[x, y] = NAVY
    return out


def main():
    os.makedirs('assets/car', exist_ok=True); os.makedirs('assets/final/car', exist_ok=True)
    rows = [[to_img(s) for s in build(p)] for p in range(3)]
    strip = Image.new('RGBA', (S * N, S * 3), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for z, im in enumerate(row):
            strip.paste(im, (z * S, r * S))
    strip.save('assets/car/car.png')
    json.dump({'s': S, 'n': N, 'squash': SQUASH}, open('assets/car/car.json', 'w'))
    for name, deg in (('front', 0), ('left', 90), ('back', 180), ('right', 270)):
        f = render(rows[0], deg); f.crop(f.getbbox()).save(f'assets/final/car/{name}.png')
    if len(sys.argv) > 1:
        angs = [0, 45, 90, 135, 180, 225, 270, 315]
        fr = [[render(row, a) for a in angs] for row in (rows[0], rows[2])]
        w, h = fr[0][0].size
        sheet = Image.new('RGBA', (w * 8, h * 2), (96, 140, 84, 255))
        for r in range(2):
            for i, f in enumerate(fr[r]):
                sheet.alpha_composite(f, (i * w, r * h))
        sheet.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(sys.argv[1])
    print('car: %d slices of %dx%d' % (N, S, S))


main()
