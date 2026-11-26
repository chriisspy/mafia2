"""THE FOREST WARDEN IN 3D (26 Nov 2026, his ask: "make the warden skin 3d stacked").
The Bark Knight as a sprite stack, made the Godfather's way (tools/make_godfather3d.py): flat slices from the feet up, turned and
stacked by the game (index.html STACK.stag, px:1 = the cast's own pixel size, walk = rows 3 and 4 are the two steps).

NOTHING IS INVENTED HERE. The shape and every colour come from his four flat pictures (assets/final/stag, tools/make_warden.py):
  one slice per picture row (30 rows inside the outline -> 30 slices), so the front of the stack is the front picture, row for row;
  the width of each part at each height is read off the FRONT picture, its depth off the RIGHT picture (the tables below);
  every outside pixel is then coloured from the picture that looks at it: front, back, right or left. Tops take the colour of their own row.
What the four pictures cannot agree on: the SHIELD. Front and back show it facing forward at his left hip, the left picture shows it
facing sideways. It is built facing FORWARD (three of the four pictures), 3 pixels thick, with the front picture's rune.
RULE (from the car): every part at least 2 pixels thick, every painted detail 2 pixels deep, or it blinks while he turns.

Run from the mafia2 folder:  python -I tools/make_warden3d.py [check.png]
Writes assets/stag/stag.png (N slices of S x S; rows: 0 stand, 1 stand, 2 knocked out (eyes dark), 3 step A, 4 step B) and stag.json.
His FACE points DOWN (+y) in every slice. x = across (his left hand, the shield, is +x), y = front/back, z = up.
"""
import json, math, os, sys
from PIL import Image

S, N, SQUASH = 25, 30, 0.55
C = S // 2
NAVY = (1, 3, 46)
BARK, BARK_L, BARK_D = (193, 215, 227), (213, 238, 241), (153, 169, 187)
WOOD, WOOD_D = (185, 153, 133), (132, 104, 95)
GLOW = ((127, 216, 255), (47, 143, 224))

V = {k: Image.open('assets/final/stag/%s.png' % k).convert('RGBA') for k in ('front', 'right', 'back', 'left')}


def px(view, col, row):
    """the colour of a flat picture's pixel; None outside it, on clear, or on its OUTSIDE line (the navy line round the figure)"""
    im = V[view]
    if not (0 <= col < im.width and 0 <= row < im.height):
        return None
    p = im.getpixel((col, row))
    if p[3] < 128:
        return None
    if p[:3] == NAVY:
        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (col + a, row + b)
            if not (0 <= q[0] < im.width and 0 <= q[1] < im.height) or im.getpixel(q)[3] < 128:
                return None
    return p[:3]


def near(view, col, row, navy=True):
    """that pixel, or the nearest one along its row (then the rows next to it) that has a colour. navy=False: never a line"""
    for dr in (0, 1, -1, 2, -2):
        for d in range(0, 7):
            for s in (1, -1):
                p = px(view, col + s * d, row + dr)
                if p is not None and (navy or p != NAVY):
                    return p
    return BARK


ROW = lambda z: 30 - z            # slice z -> the picture row it was read from (row 30 = the feet, row 1 = the horn tips)
FX = lambda x: x + 10             # front picture: column of x
BX = lambda x: 13 - x             # back picture (mirrored)
HY = lambda y: y + 10            # ... and of the head, which sits one pixel further forward in it
RY = lambda y: y + 9              # right picture (seen from his right, -x): column of y
LY = lambda y: 10 - y             # left picture (seen from his left, +x)

# ---- the shape, read off the pictures. The game looks DOWN on him, so a head as deep and flat-topped as the pictures draw it shows
# as a big lid from every side. So, like the Godfather's, the top of the head is rounded off (rows 4-7 are narrower and shallower than
# the pictures; the horns and the side stubs still reach the pictures' outline), and the head sits 2 pixels back (HS) so the mask
# does not hang down over the body. From row 8 down each row is as wide as the front picture.
HS = -2
HEAD = {4: (-6, 6, 1, 3, 9), 5: (-7, 7, -1, 5, 2.5), 6: (-8, 8, -3, 6, 2.8), 7: (-9, 9, -5, 7, 3.2),        # x from, to, y from, to, roundness
        8: (-8, 8, -7, 7, 3.8), 9: (-8, 8, -8, 7, 3.8), 10: (-8, 8, -8, 7, 3.8), 11: (-8, 8, -8, 7, 3.8), 12: (-8, 8, -8, 7, 3.8),
        13: (-7, 7, -8, 7, 3.8), 14: (-7, 7, -8, 7, 3.8), 15: (-7, 7, -7, 7, 3.8), 16: (-6, 6, -5, 7, 3.2), 17: (-5, 5, -3, 7, 3), 18: (-3, 3, 2, 7, 3)}
NOTCH = {4: (8, 12), 5: (8, 12), 6: (8, 11)}                       # the V between the horns: the wood behind the mask shows
TORSO = {18: (-4, 1), 19: (-4, 2), 20: (-4, 3), 21: (-4, 4), 22: (-4, 4), 23: (-4, 4), 24: (-4, 4), 25: (-4, 4)}   # y range; x is -5..5
HIPS = {26: (-3, 4), 27: (-3, 4), 28: (-3, 3)}                     # x is -6..6


def build(pose):
    vox = {}                                                       # (x, y, z) -> part name

    def put(x, y, z, part):
        if -C <= x <= C and -C <= y <= C and 0 <= z < N:
            vox[(x, y, z)] = part

    def oval(z, x0, x1, y0, y1, part, p=2.5):
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0 + 1) / 2, (y1 - y0 + 1) / 2
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                if abs((x - cx) / rx) ** p + abs((y - cy) / ry) ** p <= 1:
                    put(x, y, z, part)

    def box(z, x0, x1, y0, y1, part):
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                put(x, y, z, part)

    step = {'a': 1, 'b': -1}.get(pose, 0)
    # --- legs and feet (rows 29-30), sliding a step; the hips above them
    for sx in (-1, 1):
        dy = 2 * step * sx
        for r in (29, 30):
            box(ROW(r), min(sx * 3, sx * 5), max(sx * 3, sx * 5), -2 + dy, 2 + dy, 'body')
    for r, (y0, y1) in HIPS.items():
        oval(ROW(r), -6, 6, y0, y1, 'body', 3.5)
    # --- torso, shoulders, arms. His right arm (-x) swings against the legs; the left one holds the shield still
    for r, (y0, y1) in TORSO.items():
        oval(ROW(r), -5, 5, y0, y1, 'body', 3.5)
    for sx in (-1, 1):
        part = 'armR' if sx < 0 else 'armL'
        sw = -step if sx < 0 else 0
        X = lambda a, b: (min(sx * a, sx * b), max(sx * a, sx * b))
        box(ROW(18), *X(6, 7), -3, 1, part)
        box(ROW(19), *X(5, 8), -3, 2, part)
        for r in (20, 21, 22):
            box(ROW(r), *X(6, 8), -3 + sw, 0 + sw, part)
        for r in (23, 24, 25, 26):
            box(ROW(r), *X(7, 9), -2 + 2 * sw, (1 if sx < 0 else 2) + 2 * sw, part)
    # --- the shield: the front picture's disc, facing forward at his left hip, 3 thick
    f = V['front']
    for r in range(21, 29):
        for col in range(15, 23):
            p = f.getpixel((col, r))
            if p[3] > 127 and p[:3] in (WOOD, WOOD_D) + GLOW:
                for y in (3, 4, 5):
                    put(col - 10, y, ROW(r), 'shield')
    # --- the head: the helmet dome and the mask are one rounded block per row; the chin hangs in front
    for r, (x0, x1, y0, y1, p) in HEAD.items():
        oval(ROW(r), x0, x1, y0 + HS, y1 + HS, 'head', p)
    for r, (c0, c1) in NOTCH.items():                              # cut the V into the front of the mask, 3 deep
        z = ROW(r)
        for x in range(c0 - 10, c1 - 9):
            ys = sorted(y for (a, y, b) in vox if a == x and b == z)
            for y in [y for y in ys if vox[(x, y, z)] == 'head'][-3:]:
                del vox[(x, y, z)]
    for sx in (-1, 1):
        for r in (1, 2, 3):                                        # the two horns of the mask, 3 by 3
            box(ROW(r), min(sx * 4, sx * 6), max(sx * 4, sx * 6), 1 + HS, 3 + HS, 'horn')
        for r in (3, 4, 5, 6):                                     # the outer stubs at the sides of the helmet
            box(ROW(r), min(sx * 8, sx * 9), max(sx * 8, sx * 9), -1 + HS, 1 + HS, 'nub')
    return paint(vox, pose)


MOSS, MOSS_L, MOSS_H = (52, 98, 58), (86, 140, 62), (132, 180, 88)
WOOD_L = (216, 190, 168)
DASH_BACK = {10: ((-6, -4), (2, 4)), 12: ((-2, 0), (5, 7))}      # row: the x runs of the dark bark marks on the back
DASH_SIDE = {10: ((-7, -5),), 12: ((-4, -2),)}                          # row: their y runs on each side (behind the eye)


def carve(x, y, r, face, c):
    """THE CARVING ON THE HELMET'S TOP, SIDES AND BACK (26 Nov, his note: "improve the texture/detail on the mask ... especially the sides,
    back and top. it looks very bland"). Never the front: that is the front picture. Everything here is placed by hand, in the three bark
    tones the pictures use, at least 2 pixels wide: no noise.
      top (rows 4-7): light bark, the wood crown between the horns running back to a point, a moss clump behind his right horn
      row 8: a carved line right round the dome            rows 10-14: short dark birch marks, staggered
      rows 13-14: a knot of bare wood on each side and on the back      row 15: the dark rim where the helmet meets the body, moss at the back of the neck"""
    bark = c in (BARK, BARK_L, BARK_D)
    side = face in ('left', 'right')
    # --- moss (27 Nov, his note: "add a bit more moss"): three greens, every clump at least 2 by 2
    if r == 5 and y <= 0 and (-7 <= x <= -4 or 4 <= x <= 7):                 # a clump behind the foot of each horn
        return MOSS if abs(x) == 4 else MOSS_H if abs(x) == 6 and y == 0 else MOSS_L
    if r in (5, 6) and x in (-7, -8) and 1 <= y <= 3:                        # ... and round the outside of his right one
        return MOSS_L if r == 5 else MOSS
    if r == 7 and 0 <= x <= 2 and y >= 3 and face == 'top':             # a little in the V between the horns
        return MOSS if x == 0 else MOSS_L
    if face == 'back' and 3 <= x <= 6 and r in (8, 9) and (r == 8 or x in (4, 5)):   # a trail draped over the carved line at the back ...
        return MOSS_H if r == 8 and x in (3, 4) else MOSS_L if r == 8 else MOSS
    if face == 'left' and -7 <= y <= -3 and r in (8, 9) and (r == 8 or y in (-6, -5)):   # ... and over it on his left side
        return MOSS_H if r == 8 and y in (-4, -3) else MOSS_L if r == 8 else MOSS
    if face == 'back' and -1 <= x <= 2 and r in (14, 15):
        return MOSS_L if r == 14 and x <= 1 else MOSS                        # moss at the back of the neck
    # --- the bare wood (his note: "make the brown more detailed ... it looks like a solid colour"): a dark edge where it meets the bark,
    #     a light edge inside that on the lit side, short grain lines running along the strip
    if r <= 7 or (r == 8 and face == 'back' and abs(x) <= 1):
        w = 3 if r <= 6 else 2 if r == 7 else 1
        if abs(x) <= w:
            if abs(x) == w:
                return WOOD_D
            if x == -w + 1 and r <= 6:
                return WOOD_L
            if (x == -1 and y in (-1, 0, 1)) or (x == 1 and y in (-4, -3, -2)) or (x == 0 and y <= -6):
                return WOOD_D
            return WOOD
        return BARK_L if r <= 6 else BARK
    if r == 8:
        return BARK_D
    if not bark:
        return c
    if r >= 15:
        return BARK_D                                          # the rim (rows 16-17 are tucked under it and never seen)
    k = x if face == 'back' else y
    if r in (13, 14) and (face == 'back' and -6 <= x <= -4 or side and -7 <= y <= -5):   # a knot where the bark has come away
        return WOOD_D if r == 14 else WOOD_L if k <= -5 - (side * 1) else WOOD
    if r == 9:
        return BARK
    runs = DASH_BACK.get(r, ()) if face == 'back' else DASH_SIDE.get(r, ()) if side else ()
    return BARK_D if any(a <= k <= b for a, b in runs) else BARK if face != 'back' else c


def paint(vox, pose):
    full = lambda x, y, z: (x, y, z) in vox
    col = {}
    side = {}                                                      # which picture each outside voxel was coloured from
    for (x, y, z), part in vox.items():
        r = ROW(z)
        open4 = [d for d in ((1, 0), (-1, 0), (0, 1), (0, -1)) if not full(x + d[0], y + d[1], z)]
        top = not full(x, y, z + 1)
        if part == 'shield':                                       # the front two layers are the front picture, the back one is its dark back
            c = near('front', FX(x), r) if y >= 4 else WOOD_D
            col[(x, y, z)] = WOOD_D if c == NAVY else c
            continue
        if not open4 and not top:
            continue
        if open4:                                                  # which way does this bit of the surface face?
            nx = ny = 0.0
            for a in range(-2, 3):
                for b in range(-2, 3):
                    if (a or b) and not full(x + a, y + b, z):
                        w = 1 / (a * a + b * b)
                        nx += a * w; ny += b * w
            if abs(ny) >= (.3 if part == 'head' and ny > 0 and y >= 2 + HS else .8) * abs(nx):   # (the mask's face is the FRONT picture right round to its edges: the eyes)
                face = 'front' if ny > 0 else 'back'
            else:
                face = 'left' if nx > 0 else 'right'
        else:
            face = 'top'
        side[(x, y, z)] = face
        if part == 'horn' and face in ('left', 'right'):
            c = near('front', FX(x), r, navy=False)
        elif part == 'nub':
            c = WOOD if face in ('back', 'top') and r == 3 or face == 'back' else near('front', FX(x), r, navy=False)
        elif face == 'top':                                        # seen from above. The helmet's top is the bare wood the front picture shows between the horns
            c = WOOD if part == 'head' and abs(x) <= 3 and r <= 7 else BARK_L if part == 'horn' else BARK
        elif face == 'front':
            fc = FX(x)
            if part == 'armL' or (part == 'body' and fc >= 14 and r >= 20):
                fc = 20 - fc                                       # behind the shield in the picture: the same spot on his other side
            c = near('front', fc, r)
        elif face == 'back':
            bc = BX(x)
            if part == 'armL' or (part == 'body' and bc <= 8 and r >= 20):
                bc = 26 - bc
            c = near('back', bc, r)
        else:
            if part in ('head', 'horn'):
                c = near('left', 19 - HY(y - HS), r) if face == 'left' else near('right', HY(y - HS), r)
            else:                                                  # the side of the body, an arm or a leg: the colour the front picture has at its edge on that row
                c = next((q for q in (px('front', k, r) for k in range(1, 10)) if q and q != NAVY), BARK)
            if c in GLOW:
                c = NAVY                                           # the eyes glow on the FRONT of the mask only: from the side you see into the socket
        if part == 'head' and c == WOOD_D and face == 'front' and r <= 6:
            c = WOOD                                               # (the V is one flat patch of wood: its shaded bottom row sat in the middle of it as a dark blob)
        if part == 'head' and c == NAVY and face in ('left', 'right') and 10 <= r <= 13 and y - HS < 2:
            c = BARK                                               # (the socket in the side pictures is wider than the front one allows)
        if part == 'head' and c in (WOOD, WOOD_D) and face != 'top' and not (face == 'front' and (r <= 6 or r >= 14) or face in ('left', 'right') and r >= 14):
            c = BARK_D                                             # bare wood on the helmet only where the pictures have it: the V between the horns and the cheeks
        if part == 'head' and r <= 9 and face in ('back', 'left', 'right'):
            c = WOOD if abs(x) <= 3 and r <= 7 and face == 'back' else BARK   # the dome is plain bark, with the wood crown the front picture shows between the horns: every slice of it is a step, and the pictures' lines would turn into stripes
        if part == 'head' and face != 'front':
            c = carve(x, y - HS, r, face, c)
        if part == 'horn' and face == 'back':
            c = WOOD_L if r == 1 else WOOD if r == 2 else WOOD_D    # the back of a horn: bare wood, light at the tip, dark at the foot
        if pose == 'out' and c in GLOW:
            c = NAVY                                               # knocked out: the light in his eyes is out
        col[(x, y, z)] = c
    nb = [(a, b, 0) for a in (-1, 0, 1) for b in (-1, 0, 1) if a or b] + [(0, 0, 1), (0, 0, -1)]
    for _ in range(2):                                             # no scattered single pixels: one on its own takes the colour most of its neighbours have
        new = {}
        for (x, y, z), c in col.items():
            if c in GLOW:
                continue
            around = [col[(x + a, y + b, z + d)] for a, b, d in nb if (x + a, y + b, z + d) in col and vox[(x + a, y + b, z + d)] == vox[(x, y, z)]]
            if len(around) >= 3 and c not in around:
                new[(x, y, z)] = max(set(around), key=around.count)
        col.update(new)
    # every detail 2 deep: the voxel just under a side-facing surface voxel takes its colour
    deep = {}
    for (x, y, z), c in col.items():
        f = side.get((x, y, z))
        d = {'front': (0, -1), 'back': (0, 1), 'left': (-1, 0), 'right': (1, 0)}.get(f)
        if d and full(x + d[0], y + d[1], z) and (x + d[0], y + d[1], z) not in col:
            deep[(x + d[0], y + d[1], z)] = c
    col.update(deep)
    # the inside is NOT never seen: looking down, each slice shows a strip two pixels wide along the edge of the one above it.
    # So the colours on the outside soak inwards, slice by slice, until every voxel has the colour of the surface nearest to it.
    todo = [k for k in vox if k not in col]
    while todo:
        new = {}
        for (x, y, z) in todo:
            around = [col[(x + a, y + b, z)] for a, b in ((0, 1), (0, -1), (1, 0), (-1, 0)) if (x + a, y + b, z) in col]
            around = [c for c in around if c != NAVY and c not in GLOW] or around
            if around:
                new[(x, y, z)] = max(set(around), key=around.count)
        if not new:
            for k in todo:
                col[k] = BARK
            break
        col.update(new); todo = [k for k in todo if k not in col]
    sl = [Image.new('RGBA', (S, S), (0, 0, 0, 0)) for _ in range(N)]
    for (x, y, z), c in col.items():
        sl[z].putpixel((C + x, C + y), c + (255,))
    return sl


def render(slices, turn_deg, squash=SQUASH):
    """the game's own loop (index.html stackFrame): turn each slice, squash it, lift it one pixel, then one navy line round the lot"""
    hh = round(S * squash)
    Wd, Ht = S + 4, hh + N + 4
    out = Image.new('RGBA', (Wd, Ht), (0, 0, 0, 0))
    for z, im in enumerate(slices):
        rr = im.rotate(-turn_deg, Image.NEAREST).resize((S, hh), Image.NEAREST)
        out.alpha_composite(rr, (2, Ht - 2 - hh - z))
    p = out.load(); edge = []
    for y in range(Ht):
        for x in range(Wd):
            if p[x, y][3] < 60 and any(0 <= x + a < Wd and 0 <= y + b < Ht and p[x + a, y + b][3] >= 60 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                edge.append((x, y))
    for x, y in edge:
        p[x, y] = NAVY + (255,)
    return out


def main():
    os.makedirs('assets/stag', exist_ok=True)
    rows = [build(p) for p in ('stand', 'stand', 'out', 'a', 'b')]
    strip = Image.new('RGBA', (S * N, S * len(rows)), (0, 0, 0, 0))
    for rI, row in enumerate(rows):
        for z, im in enumerate(row):
            strip.paste(im, (z * S, rI * S))
    strip.save('assets/stag/stag.png')
    json.dump({'s': S, 'n': N, 'squash': SQUASH, 'px': 1}, open('assets/stag/stag.json', 'w'))
    if len(sys.argv) > 1:                                          # the check sheet: 8 angles of each row, and his four flat pictures beside the angle they belong to
        angs = [0, 45, 90, 135, 180, 225, 270, 315]
        use = (rows[0], rows[3], rows[4], rows[2])
        fr = [[render(row, a) for a in angs] for row in use]
        wd, ht = fr[0][0].size
        sheet = Image.new('RGBA', (wd * 8, ht * (len(use) + 1)), (120, 150, 120, 255))
        for a, v in ((0, 'front'), (90, 'left'), (180, 'back'), (270, 'right')):
            im = V[v]; sheet.alpha_composite(im, (angs.index(a) * wd + (wd - im.width) // 2, ht - 2 - im.height))
        for rI in range(len(use)):
            for i, f in enumerate(fr[rI]):
                sheet.alpha_composite(f, (i * wd, (rI + 1) * ht))
        sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(sys.argv[1])
        big = Image.new('RGBA', (wd * 8, ht), (120, 150, 120, 255))   # and close up: each flat picture right beside the stack at its angle
        for i, (a, v) in enumerate(((0, 'front'), (270, 'right'), (180, 'back'), (90, 'left'))):
            im = V[v]; big.alpha_composite(im, (i * 2 * wd + (wd - im.width) // 2, ht - 2 - im.height)); big.alpha_composite(fr[0][angs.index(a)], (i * 2 * wd + wd, 0))
        big.resize((big.width * 10, big.height * 10), Image.NEAREST).save(sys.argv[1].replace('.png', '-pairs.png'))
        hd = [render(rows[0], a).crop((0, 0, wd, 40)) for a in (90, 135, 180, 225, 270)] + [render(rows[0], a, 1.0).crop((0, 0, wd, 40)) for a in (0,)]   # the head close up: side, back, side, and from straight above
        hs = Image.new('RGBA', (wd * len(hd), 40), (120, 150, 120, 255))
        for i, f in enumerate(hd):
            hs.alpha_composite(f, (i * wd, 0))
        hs.resize((hs.width * 14, hs.height * 14), Image.NEAREST).save(sys.argv[1].replace('.png', '-head.png'))
    print('warden 3d: %d slices of %dx%d' % (N, S, S))


main()
