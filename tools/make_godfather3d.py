"""The Godfather in 3D (21 Nov 2026, his ask: "make him 3D at the same angle as the car").
The same sprite-stack trick as the Alien and the car: flat slices from the feet up, turned and stacked by the game.
Unlike those two he is drawn at the cast's own pixel size (NOT doubled): one slice pixel = one screen-grid pixel.

Run from the mafia2 folder:  python tools/make_godfather3d.py [check.png]
Writes assets/godfather/godfather.png (N slices of S x S; rows: 0 stand, 1 stand, 2 knocked out (eyes shut), 3 step A, 4 step B)
and assets/godfather/godfather.json. His FACE points DOWN (+y) in every slice. x = across, y = front/back, z = up.
The flat pictures in assets/final/godfather (tools/make_godfather.py) stay: they are his face card and lobby picture.
RULE (from the car): every detail at least 2 pixels deep, or it blinks out at some angles.
"""
import json, math, os, sys
from PIL import Image

S, N, SQUASH = 21, 25, 0.55
C = S // 2
NAVY = (1, 3, 46)
L, H, h, G = (222, 224, 234), (184, 186, 200), (146, 148, 168), (100, 102, 128)          # grey hair
LD, HD, GD = (126, 128, 152), (92, 94, 118), (60, 62, 88)                                # the darker grey on top: streak, hair, its line
U, V, SK = (253, 209, 175), (240, 184, 158), (171, 100, 100)                              # skin, shade, line
M, m = (196, 198, 210), (138, 140, 160)                                                  # moustache
P, O, Q, q = (41, 40, 61), (19, 14, 33), (70, 70, 104), (104, 106, 146)                  # tuxedo
W, w = (226, 242, 248), (186, 214, 226)                                                  # shirt
R, r, LEAF = (224, 44, 60), (146, 18, 54), (60, 140, 84)


def blank():
    return [[None] * S for _ in range(S)]


def put(sl, x, y, col):
    if -C <= x <= C and -C <= y <= C:
        sl[C + y][C + x] = col


def ell(sl, rx, ry, rim, top, cx=0, cy=0, rimw=1.2):
    """a filled oval: `rim` round its edge (what shows from the side), `top` inside (what shows from above)"""
    for y in range(-C, C + 1):
        for x in range(-C, C + 1):
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if d <= 1:
                put(sl, x, y, rim if d > 1 - rimw / max(rx, ry) else top)


def front(sl, x, depth, col, only=None):
    """paint the front-most `depth` pixels of column x (the face is +y)"""
    for y in range(C, -C - 1, -1):
        if sl[C + y][C + x] is not None:
            for k in range(depth):
                if sl[C + y - k][C + x] is not None and (only is None or sl[C + y - k][C + x] in only):
                    sl[C + y - k][C + x] = col
            return


def build(pose):
    """pose: 'stand', 'out' (eyes shut), 'a' / 'b' (the two walking steps).
    Round 2 (his notes, 21 Nov): chibi = a slightly bigger head on a slightly smaller body; the body is NOT a box, the shoulders
    slope down from the neck; the hair is short at the sides; dark grey on top, the lighter grey at the sides (temples)."""
    sl = [blank() for _ in range(N)]
    step = {'a': 1, 'b': -1}.get(pose, 0)
    # --- legs and shoes (z0-3): a walking step slides one foot forward and the other back
    for sx in (-1, 1):
        dy = 2 * step * sx
        for z in range(0, 4):
            for x in range(2, 6):                              # legs apart like the cast's (his note): a 3 pixel gap between them
                for y in range(-2, 2):
                    put(sl[z], sx * x, y + dy, O if z == 0 else P if abs(x) in (2, 5) or y in (-2, 1) else Q if z == 3 else P)
        for x in range(2, 6):                                  # the toe of the shoe
            for y in (2, 3):
                put(sl[0], sx * x, y + dy, O)
            put(sl[1], sx * x, 2 + dy, O)
        put(sl[1], sx * 3, 2 + dy, q)
    # --- the body (z4-11): narrow at the hips, widest at the chest, then the shoulders slope in to the neck
    body = {4: 5.7, 5: 6.0, 6: 6.3, 7: 6.6, 8: 6.9, 9: 7.0, 10: 6.1, 11: 4.5}     # a wider body, like the cast's (his note)
    for z, rx in body.items():
        ell(sl[z], rx, 3.9 if z < 10 else 3.5 if z == 10 else 3.0, P if z > 4 else O, P if z < 9 else Q)   # the slope of the shoulders catches the light
    for z in range(6, 12):                                     # shirt front, satin lapels either side of it
        for x in (-1, 0, 1):
            front(sl[z], x, 2, W if z > 7 else w)
        if z >= 8:
            for x in (-2, 2):
                front(sl[z], x, 2, Q)
    front(sl[5], 0, 1, O)                                      # a jacket button
    for x in (-2, -1, 0, 1, 2):                                # the bow tie
        front(sl[11], x, 2, NAVY)
    front(sl[10], 0, 2, NAVY)
    for z in (10, 9):                                          # the rose on his left lapel (the viewer's right), and its leaf
        for x in (3, 4):
            front(sl[z], x, 2, r if (z == 9 and x == 3) else R)
    front(sl[8], 4, 2, LEAF)
    # --- arms: they hang from the sloping shoulder, a little out from the body lower down; hands at the bottom
    arm = {4: 7, 5: 7, 6: 8, 7: 8, 8: 8, 9: 8, 10: 7}           # the arm's inner column at each height
    for sx in (-1, 1):
        dy = -2 * step * sx
        for z, ax in arm.items():
            for x in (ax, ax + 1):
                if z == 10 and x == ax + 1:
                    continue                                   # the top of the arm is rounded off: no square corner at the shoulder
                for y in range(-2, 2):
                    yy = y + (dy if z < 8 else dy // 2)
                    put(sl[z], sx * x, yy, (U if y > -2 else SK) if z < 6 else (q if (z == 10 and sx < 0) else P if x == ax else O if sx > 0 else P))
    # --- the neck and the big head (z12-24)
    ell(sl[12], 3.0, 2.6, V, V)
    head = {12: 5.2, 13: 7.0, 14: 8.0, 15: 8.6, 16: 8.9, 17: 9.0, 18: 9.0, 19: 8.9, 20: 8.7, 21: 8.2, 22: 7.4, 23: 6.0, 24: 3.8}
    for z, rx in head.items():
        ry = rx * .88
        if z == 12:
            for y in range(-C, C + 1):                          # the chin sits over the neck, towards the front
                for x in range(-C, C + 1):
                    if math.hypot(x / rx, (y - 1) / ry) <= 1 and y >= -2:
                        put(sl[z], x, y, V)
            continue
        ell(sl[z], rx, ry, U if z < 21 else HD, U if z < 21 else HD)
        for y in range(-C, C + 1):                             # hair: the whole top and the back; at the sides only a short band high up
            for x in range(-C, C + 1):
                if sl[z][C + y][C + x] is None or z < 15:
                    continue
                d = math.hypot(x / rx, y / ry)
                back = y <= (-2 if z < 19 else 1 if z < 21 else 99)
                side = abs(x) >= rx - 1.7 and y <= 1 and z >= 18          # short at the sides: from just above the ear up
                if not (back or side or z >= 21):
                    continue
                rim = d > 1 - 1.3 / rx
                temple = abs(x) >= rx - 3.2 and z < 22                  # the lighter grey lives at the sides
                if temple:
                    put(sl[z], x, y, h if rim and z < 19 else L if (y % 3 == 0) else H)
                else:
                    put(sl[z], x, y, GD if rim and z < 21 else LD if (x % 3 == 0) else HD)
        if z < 21:                                             # the side of the face in shade (light from the top left)
            for y in range(-C, C + 1):
                x = int(rx) - 1
                if sl[z][C + y][C + x] == U:
                    sl[z][C + y][C + x] = V
    # the face, on the front of the head: moustache, big navy eyes, heavy grey brows
    for x in range(-3, 4):
        front(sl[14], x, 2, M if abs(x) < 3 else m, only=(U, V))
    for x in (-3, 3):
        front(sl[13], x, 2, m, only=(U, V))
    for z in (15, 16, 17):
        for x in (-4, -3, 3, 4):
            front(sl[z], x, 3, NAVY if pose != 'out' else SK if z == 16 else U, only=(U, V))
    for x in (-5, -4, -3, -2, 2, 3, 4, 5):
        front(sl[18], x, 2, GD, only=(U, V))
    for x in (-6, 6):                                          # a touch of blush on the cheeks
        front(sl[15], x, 1, (252, 165, 158), only=(U, V))
    return sl


def to_img(sl):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            if sl[y][x] is not None:
                im.putpixel((x, y), sl[y][x] + (255,))
    return im


def render(slices, turn_deg, squash=SQUASH):
    hh = round(S * squash)
    Wd, Ht = S + 4, hh + N + 4
    out = Image.new('RGBA', (Wd, Ht), (0, 0, 0, 0))
    for z, im in enumerate(slices):
        rr = im.rotate(-turn_deg, Image.NEAREST).resize((S, hh), Image.NEAREST)
        out.alpha_composite(rr, (2, Ht - 2 - hh - z))
    px = out.load(); edge = []
    for y in range(Ht):
        for x in range(Wd):
            if px[x, y][3] < 60 and any(0 <= x + a < Wd and 0 <= y + b < Ht and px[x + a, y + b][3] >= 60 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                edge.append((x, y))
    for x, y in edge:
        px[x, y] = NAVY + (255,)
    return out


def main():
    os.makedirs('assets/godfather', exist_ok=True)
    rows = [[to_img(s) for s in build(p)] for p in ('stand', 'stand', 'out', 'a', 'b')]
    strip = Image.new('RGBA', (S * N, S * len(rows)), (0, 0, 0, 0))
    for rI, row in enumerate(rows):
        for z, im in enumerate(row):
            strip.paste(im, (z * S, rI * S))
    strip.save('assets/godfather/godfather.png')
    json.dump({'s': S, 'n': N, 'squash': SQUASH, 'px': 1}, open('assets/godfather/godfather.json', 'w'))
    if len(sys.argv) > 1:
        angs = [0, 45, 90, 135, 180, 225, 270, 315]
        fr = [[render(row, a) for a in angs] for row in (rows[0], rows[3], rows[4])]
        wd, ht = fr[0][0].size
        sheet = Image.new('RGBA', (wd * 8, ht * 3), (120, 150, 120, 255))
        for rI in range(3):
            for i, f in enumerate(fr[rI]):
                sheet.alpha_composite(f, (i * wd, rI * ht))
        sheet.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(sys.argv[1])
    print('godfather 3d: %d slices of %dx%d' % (N, S, S))


main()
