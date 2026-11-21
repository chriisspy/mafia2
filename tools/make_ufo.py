"""The UFO skin (21 Nov 2026): an alien in a flying saucer, built as SPRITE-STACK slices so it turns in real 3D.

Run from the mafia2 folder:  python tools/make_ufo.py [check.png]

Writes
  assets/ufo/ufo.png            the slice strip: N slices of S x S side by side, ground slice on the left.
                                Row 0 = rim lights phase A, row 1 = phase B, row 2 = lights off (knocked out).
  assets/ufo/ufo.json           {s, n, squash}
  assets/final/ufo/<dir>.png    flat front/back/left/right pictures (for the face card, the lobby and the case reel).
The game stacks the slices itself (drawStack in index.html); the flat pictures are only stand-ins.
The front of the saucer (the alien's face) points DOWN (+y) in every slice.
"""
import json, math, os, sys
from PIL import Image

OUT = 0.63                    # how big it is next to the first build (31 wide, 23 tall): he asked for smaller three times
S, N, SQUASH = round(31 * OUT), 23, 0.55
C = (S - 1) / 2
NAVY = (1, 3, 46, 255)

# 3-tone ramps, hue shifted the way his cast is (cool shadows, warm lights)
HULL = [(58, 62, 104), (104, 114, 158), (160, 172, 206), (222, 230, 250)]
BELLY = [(40, 40, 82), (70, 72, 124), (104, 110, 160)]
BAND = [(150, 60, 150), (214, 96, 190), (255, 160, 226)]
SKIN = [(40, 128, 84), (86, 196, 92), (158, 236, 118), (214, 255, 170)]
SUIT = [(60, 50, 120), (110, 90, 190)]
GLASS = (150, 230, 255, 84)
EYE = (1, 3, 46, 255)
GLINT = (240, 252, 255, 190)
CORE = [(40, 190, 230), (150, 250, 255)]
LIGHT_A, LIGHT_B, LIGHT_OFF = (255, 226, 96), (255, 120, 190), (70, 66, 110)


def blank():
    return [[None] * S for _ in range(S)]


def disc(sl, r, edge, top, ring=None, cx=C, cy=C, ry=None):
    """a filled circle: `edge` is what you see from the side, `top` from above; `ring` = (width, colour) just inside the edge"""
    r = r * OUT; ry = ry * OUT if ry else r               # every size below is written for the big build
    for y in range(S):
        for x in range(S):
            d = math.hypot((x - cx) / r, (y - cy) / ry)
            if d > 1:
                continue
            px = edge if d > 1 - 1.15 / r else top
            if ring and 1 - (ring[0] + 1.15) / r < d <= 1 - 1.15 / r:
                px = ring[1]
            sl[y][x] = px + (255,) if len(px) == 3 else px


def build(phase):
    """phase 0/1 = the two rim-light frames, 2 = lights off"""
    sl = [blank() for _ in range(N)]
    disc(sl[0], 3.2, CORE[0], CORE[1] if phase < 2 else BELLY[0])      # the glowing core underneath
    disc(sl[1], 5.5, BELLY[0], BELLY[1])
    disc(sl[2], 8.5, BELLY[0], BELLY[1])                                # the belly widens out to the rim
    disc(sl[3], 11.0, BELLY[1], BELLY[2])
    disc(sl[4], 13.2, BELLY[1], BELLY[2])
    disc(sl[5], 14.6, HULL[0], HULL[1])
    disc(sl[6], 15.0, HULL[1], HULL[2])                                 # the rim: two slices tall, the lights sit on its edge
    disc(sl[7], 15.0, HULL[2], HULL[2])
    disc(sl[8], 13.6, HULL[2], HULL[2], ring=(2, HULL[3]))
    disc(sl[9], 11.4, BAND[0], BAND[1])                                 # a pink band round the top
    disc(sl[10], 9.6, BAND[1], BAND[1], ring=(1, BAND[2]))
    disc(sl[11], 8.4, HULL[1], HULL[2], ring=(1, HULL[3]))              # the cockpit ring
    for k in range(8):                                                  # rim lights: 8 round the edge, two colours taking turns
        a = (k + .5) * math.pi / 4
        col = LIGHT_OFF if phase == 2 else (LIGHT_A, LIGHT_B)[(k + phase) % 2]
        for z in (6, 7):
            for rr in (14.4 * OUT, 13.4 * OUT):
                x, y = round(C + math.cos(a) * rr), round(C + math.sin(a) * rr)
                for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                    if 0 <= x + dx < S and 0 <= y + dy < S and sl[z][y + dy][x + dx]:
                        sl[z][y + dy][x + dx] = col + (255,)
    # the alien: shoulders in the cockpit, then a big head. Face = +y (down).
    disc(sl[11], 4.0, SUIT[0], SUIT[1])
    disc(sl[12], 4.0, SUIT[0], SUIT[1])
    disc(sl[13], 2.8, SKIN[0], SKIN[1])                                 # the neck
    head = {14: 4.6, 15: 5.8, 16: 6.4, 17: 6.6, 18: 6.4, 19: 5.8, 20: 4.8, 21: 3.2}
    for z, r in head.items():
        disc(sl[z], r, SKIN[0] if z < 16 else SKIN[1] if z < 20 else SKIN[2], SKIN[2] if z < 21 else SKIN[3], ry=r * .9)
    skin = {c + (255,) for c in SKIN}
    for z, dxs in ():   # (the eyes are painted AFTER the shrink now, see eyes(): shrinking ate them)         # two big dark eyes on the front of the head, slanted out
        for sx in (-1, 1):
            for dx in dxs:
                x = round(C + sx * dx)
                for y in range(S - 1, -1, -1):                          # the front-most skin pixel in that column
                    if sl[z][y][x] in skin:
                        sl[z][y][x] = EYE if phase < 2 else SKIN[0] + (255,)
                        if sl[z][y - 1][x] in skin:
                            sl[z][y - 1][x] = EYE if phase < 2 else SKIN[0] + (255,)
                        break
    # the glass dome: a thin see-through shell over the cockpit, with a glint on the upper left
    dome = {12: 7.8, 13: 7.8, 14: 7.8, 15: 7.7, 16: 7.6, 17: 7.5, 18: 7.3, 19: 6.9, 20: 6.2, 21: 5.0, 22: 3.4}
    for z, r in dome.items():
        r = r * OUT
        for y in range(S):
            for x in range(S):
                d = math.hypot(x - C, y - C)
                if (r - 1.1 < d <= r or (z == 22 and d <= r)) and not sl[z][y][x]:
                    a = math.degrees(math.atan2(y - C, x - C)) % 360
                    sl[z][y][x] = GLINT if (195 <= a <= 240 and z in (17, 18, 19)) else GLASS
    return sl


def eyes(sl, phase):
    """two big dark eyes on the front of the head (his note: make them obvious): 3 slices tall, 4 deep, a gap between; ALL dark navy, no shine (his call)"""
    skin = {c + (255,) for c in SKIN}
    n, size = len(sl), len(sl[0]); c = (size - 1) / 2
    head = [z for z in range(n) if sum(px in skin for row in sl[z] for px in row) > 12]
    head = sorted(z for z in head if z > n // 2)                         # the head only (the hull has no skin, but be safe)
    mid = len(head) // 2; zs = [head[max(0, mid - 1)], head[mid], head[min(len(head) - 1, mid + 1)]]   # the middle of the head, however many slices it has left
    for i, z in enumerate(zs):
        for sx in (-1, 1):
            for d in ((1.5, 2.5), (1.5, 2.5, 3.5), (2.5, 3.5))[i]:          # HIS PICK (21 Nov, from a picture he sent back): big slanted eyes that reach the edge of the head
                x = int(round(c + sx * d))
                for y in range(size - 1, 0, -1):
                    if sl[z][y][x] in skin:
                        for k in (0, 1, 2, 3):
                            if sl[z][y - k][x] in skin:
                                sl[z][y - k][x] = EYE if phase < 2 else SKIN[0] + (255,)
                        break

    # his note: front on, the eyes were not dark navy. The glass of the dome sat over them (the slices above land on the eye rows) and
    # washed them pale blue. So the dome has no glass in front of the face: from the eyes up, the front of the shell is left open.
    for z in range(zs[0], n):
        for y in range(int(c) + 1, size):
            for x in range(size):
                if abs(x - c) <= 4.6 and sl[z][y][x] in (GLASS, GLINT):
                    sl[z][y][x] = None


def to_img(sl):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for y in range(S):
        for x in range(S):
            if sl[y][x]:
                im.putpixel((x, y), sl[y][x])
    return im


def render(slices, turn_deg, outline=True, squash=SQUASH):
    """the same loop the game runs: rotate, squash, lift one pixel a slice, bottom to top; then ONE navy outline"""
    h = round(S * squash)
    W, H = S + 4, h + N + 4
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for z, im in enumerate(slices):
        r = im.rotate(-turn_deg, Image.NEAREST).resize((S, h), Image.NEAREST)
        out.alpha_composite(r, (2, H - 2 - h - z))
    if outline:
        px = out.load(); edge = []
        for y in range(H):
            for x in range(W):
                if px[x, y][3] < 60 and any(0 <= x + a < W and 0 <= y + b < H and px[x + a, y + b][3] >= 60 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    edge.append((x, y))
        for x, y in edge:
            px[x, y] = NAVY
    return out


def crop(im):
    return im.crop(im.getbbox())


def main():
    os.makedirs('assets/ufo', exist_ok=True); os.makedirs('assets/final/ufo', exist_ok=True)
    global N                                                 # drawn at its real width; the height is shrunk by dropping slices
    big = [build(p) for p in range(3)]
    N2 = round(N * OUT)
    small = [[sl[min(N - 1, int((z + .5) / OUT))] for z in range(N2)] for sl in big]
    N = N2
    for ph, sl in enumerate(small):
        eyes(sl, ph)
    rows = [[to_img(s) for s in sl] for sl in small]
    strip = Image.new('RGBA', (S * N, S * 3), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for z, im in enumerate(row):
            strip.paste(im, (z * S, r * S))
    strip.save('assets/ufo/ufo.png')
    json.dump({'s': S, 'n': N, 'squash': SQUASH}, open('assets/ufo/ufo.json', 'w'))
    for name, deg in (('front', 0), ('left', 90), ('back', 180), ('right', 270)):
        crop(render(rows[0], deg)).save(f'assets/final/ufo/{name}.png')
    if len(sys.argv) > 1:                                     # a sheet to look at: 8 angles of each row, 6x
        angs = [0, 45, 90, 135, 180, 225, 270, 315]
        fr = [[render(row, a) for a in angs] for row in rows]
        w, h = fr[0][0].size
        sheet = Image.new('RGBA', (w * 8, h * 3), (44, 60, 110, 255))
        for r in range(3):
            for i, f in enumerate(fr[r]):
                sheet.alpha_composite(f, (i * w, r * h))
        sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save(sys.argv[1])
    print('ufo: %d slices of %dx%d' % (N, S, S))


main()
