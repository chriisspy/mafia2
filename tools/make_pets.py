"""THE PETS (28 Nov 2026, his ask): small creatures that follow you, built as SPRITE-STACK slices like the Alien and the Getaway Car
(tools/make_ufo.py, tools/make_car.py), so they turn in real 3D. His picks from the PixelLab concept sheet (mafia2-art/pets/concepts):
the crystal dragon, the alien blob, the crystal golem and the mafia chicken (the flame skull was made and then taken out: his word, "looks bad"). His words: "the pets should look CRAZY" and
"PLEASE make sure it is in our style and shading": so these are modelled here, in code, the way the game's other stacks are, with the same
simple shading (three tones a colour: a light top, a mid side, a dark underside) and the game's one navy outline round the finished picture.
Pass 2 (his call: "yes, bigger"): 21 px slices, so there is room for faces, horns, wings and fire.

Run from the mafia2 folder:  python tools/make_pets.py [check.png]

Writes
  assets/pets/<name>.png    the slice strip: N slices of S x S, ground slice on the left
  assets/pets/pets.json     {name: {s, n, squash}}
The NOSE points DOWN (+y) in every slice. x = across, y = along, z = up.
"""
import json, os, sys
from PIL import Image

S, SQUASH = 21, 0.55
C = S // 2
NAVY = (1, 3, 46, 255)


class Model:
    def __init__(self):
        self.v = {}     # (x, y, z) -> ramp [dark, mid, light] or a fixed colour (r, g, b)

    def put(self, x, y, z, col):
        if 0 <= x < S and 0 <= y < S and z >= 0:
            self.v[(x, y, z)] = col

    def ball(self, cx, cy, cz, rx, ry, rz, col):
        for z in range(int(cz - rz - 1), int(cz + rz + 2)):
            for y in range(S):
                for x in range(S):
                    if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1.0:
                        self.put(x, y, z, col)

    def box(self, x0, x1, y0, y1, z0, z1, col, rnd=False):
        for z in range(z0, z1 + 1):
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    if rnd and x in (x0, x1) and y in (y0, y1) and (x1 - x0) > 1 and (y1 - y0) > 1:
                        continue
                    self.put(x, y, z, col)

    def face(self, x, z, col, y_from=S - 1):
        """paint the front-most voxel (largest y) of column (x, z): eyes, beaks, teeth go on the surface"""
        for y in range(y_from, -1, -1):
            if (x, y, z) in self.v:
                self.v[(x, y, z)] = col
                if (x, y - 1, z) in self.v:                  # TWO deep: the squash to 55% drops every other row, so one voxel alone is skipped half the time
                    self.v[(x, y - 1, z)] = col
                return

    def side(self, y, z, col, sx):
        """paint the outer-most voxel of row (y, z) on one side (sx = -1 left, +1 right): the eye you see as it turns"""
        for x in (range(S) if sx < 0 else range(S - 1, -1, -1)):
            if (x, y, z) in self.v:
                self.v[(x, y, z)] = col
                return

    def top_of(self, x, y):
        zs = [z for (a, b, z) in self.v if a == x and b == y]
        return max(zs) + 1 if zs else None

    def height(self):
        return max(z for _, _, z in self.v) + 1

    def slices(self):
        """THE SHADING (the game's stacks: three tones, nothing soft): a voxel with nothing over it shows its top = light; one in the bottom
        third of its own colour's height = dark; the rest = mid."""
        n = self.height(); zs = {}
        for (x, y, z), col in self.v.items():
            if isinstance(col, list):
                a = zs.setdefault(id(col), [z, z]); a[0] = min(a[0], z); a[1] = max(a[1], z)
        out = []
        for z in range(n):
            im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); px = im.load()
            for y in range(S):
                for x in range(S):
                    col = self.v.get((x, y, z))
                    if col is None:
                        continue
                    if isinstance(col, list):
                        lo, hi = zs[id(col)]; top = (x, y, z + 1) not in self.v
                        low = hi > lo and (z - lo) / (hi - lo) < .34
                        col = col[2] if top else col[0] if low else col[1]
                    px[x, y] = tuple(col) + (255,)
            out.append(im)
        return out


def hexc(*hs):
    return [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in hs]


INK, WHITE, EYE = (24, 20, 37), (255, 255, 255), (22, 18, 40)


def spike(m, x, y, z0, h, R, wide=2):
    """a crystal: `wide` square at the foot, one thinner near the tip, dark low, light at the very top"""
    for k in range(h):
        w = wide if k < h - 2 else max(1, wide - 1)
        col = R[0] if k < h * .34 else R[2] if k >= h - 1 else R[1]
        for a in range(w):
            for b in range(w):
                m.put(x + a, y + b, z0 + k, col)


def alien(frame=0):
    """frame 0 = as he stands (and in the air), 1 = squashed wide and low: the beat he lands a hop"""
    m = Model(); P = hexc('#5a2a9a', '#8f4fd8', '#c79bff'); G = hexc('#3e8948', '#63c74d', '#d8ff7a'); SPOT = (70, 30, 128)
    m.box(6, 8, 10, 13, 0, 1, P); m.box(12, 14, 10, 13, 0, 1, P)                 # two stubby feet
    if frame == 1:
        m.ball(C, C, 6.0, 7.2, 7.0, 5.2, P)                                      # squashed
    else:
        m.ball(C, C, 7.2, 6.3, 6.3, 6.3, P)                                      # the blob
    m.box(2, 4, 9, 11, 4, 6, P); m.box(16, 18, 9, 11, 4, 6, P)                  # little arms
    for z in range(5, 12):                                                        # ONE huge eye on the front: a wide white, a small dark pupil
        for x in range(6, 15):
            if (x, z) not in ((6, 5), (14, 5), (6, 11), (14, 11), (6, 6), (14, 6), (6, 10), (14, 10)):
                m.face(x, z, WHITE)
    for z in (7, 8, 9):
        for x in (9, 10, 11, 12):
            m.face(x, z, G[1])                                                    # a bright green iris (green reads on purple; a dark pupil alone did not)
    m.face(10, 8, (0, 0, 0)); m.face(11, 8, (0, 0, 0))                            # the pupil
    m.face(12, 9, WHITE)                                                          # the glint
    for x in (9, 10, 11):
        m.face(x, 2, EYE)                                                         # a little mouth
    m.face(10, 2, WHITE)                                                          # and its one tooth
    for x, z in ((6, 9), (7, 10), (13, 6), (14, 7), (10, 11), (12, 10)):          # darker spots down its back
        for y in range(S):
            if (x, y, z) in m.v:
                m.v[(x, y, z)] = SPOT; break
    for x in (7, 12):                                                             # two antennae with glowing bobbles
        z0 = m.top_of(x, 9)
        m.box(x, x + 1, 9, 10, z0, z0 + 1, P); m.box(x - 1 if x < C else x, x + 1 if x < C else x + 2, 8, 10, z0 + 2, z0 + 3, G, rnd=False)
    return m


def chicken(frame=0):
    """frame 0 = standing, 1 and 2 = left foot forward, right foot forward: a waddle (pets.js rocks him as well)"""
    a, b = {0: (0, 0), 1: (2, -1), 2: (-1, 2)}[frame]
    m = Model(); W = hexc('#b9c2d6', '#eef1f7', '#ffffff'); O = hexc('#b8601f', '#f0902e', '#ffc45e'); R = hexc('#9e2835', '#e43b44', '#ff7a7a')
    HAT = hexc('#16121f', '#2b2638', '#4a4460'); BAND = (190, 196, 214); CIGAR, EMBER = (120, 78, 48), (255, 150, 40)
    m.box(8, 9, 9 + a, 10 + a, 0, 2, O); m.box(11, 12, 9 + b, 10 + b, 0, 2, O)   # legs
    m.box(7, 9, 10 + a, 12 + a, 0, 0, O); m.box(11, 13, 10 + b, 12 + b, 0, 0, O) # feet
    m.ball(C, 9, 6.6, 4.9, 6.2, 4.3, W)                                          # body
    m.box(9, 11, 1, 3, 7, 11, W); m.box(9, 10, 0, 1, 9, 13, W)                  # tail feathers, up at the back
    m.box(4, 5, 6, 11, 5, 8, W); m.box(15, 16, 6, 11, 5, 8, W)                  # wings
    m.ball(C, 14.5, 11.6, 3.5, 3.3, 3.3, W)                                      # head, forward and up
    m.box(9, 11, 18, 19, 10, 11, O)                                              # beak
    m.box(10, 10, 17, 18, 8, 9, R); m.box(9, 9, 17, 17, 8, 9, R)                # wattle
    for x in (8, 12):                                                             # eyes: on the front, and on each side as it turns
        m.face(x, 12, EYE, y_from=17); m.face(x, 13, EYE, y_from=17)
    for sx in (-1, 1):
        m.side(15, 12, EYE, sx); m.side(15, 13, EYE, sx)
    m.box(12, 13, 19, 20, 10, 10, [CIGAR] * 3); m.put(13, 20, 10, EMBER)          # a cigar in the corner of his beak
    top = m.height()
    m.box(5, 15, 10, 19, top, top, HAT, rnd=True)                                 # the fedora: brim
    m.box(7, 13, 12, 17, top + 1, top + 1, [BAND] * 3)                            # its band
    m.box(7, 13, 12, 17, top + 2, top + 3, HAT, rnd=True)                         # crown
    return m


def golem(frame=0):
    """THE GOLEM WALKS ON HIS HANDS AND FEET, LIKE A GORILLA (his ask): a low back, short legs behind, long arms planted in front on his fists.
    frame 0 = standing on all four, 1 = left fist and right foot forward, 2 = the other pair."""
    m = Model(); R = hexc('#3a3d5c', '#666b94', '#a3a9cf'); K = hexc('#1f6fd0', '#5fd0ff', '#eaffff'); GLOW = (160, 244, 255); CRACK = (34, 36, 58)
    la, ra = {0: (0, 0), 1: (2, -2), 2: (-2, 2)}[frame]        # how far each fist is ahead (+) or behind
    ll, rl = -ra // 2, -la // 2                                # the legs go the other way: the foot on the far side steps with the fist
    m.box(5, 8, 3 + ll, 7 + ll, 0, 3, R); m.box(12, 15, 3 + rl, 7 + rl, 0, 3, R)                 # short back legs
    m.box(4, 16, 3, 9, 3, 8, R, rnd=True)                                                        # the hips and the low back
    m.box(3, 17, 8, 14, 5, 11, R, rnd=True)                                                      # a huge chest, higher than the hips
    m.box(1, 5, 9, 14, 9, 12, R, rnd=True); m.box(15, 19, 9, 14, 9, 12, R, rnd=True)             # shoulders
    m.box(1, 3, 12 + la, 15 + la, 2, 9, R); m.box(17, 19, 12 + ra, 15 + ra, 2, 9, R)             # long arms, straight down in front
    m.box(0, 4, 13 + la, 17 + la, 0, 2, R, rnd=True); m.box(16, 20, 13 + ra, 17 + ra, 0, 2, R, rnd=True)   # fists on the ground: he walks on his knuckles
    m.box(6, 14, 12, 19, 9, 14, R, rnd=True)                                                     # a big square head, low and forward
    for x in range(7, 14):
        m.face(x, 13, CRACK)                                                      # a heavy brow
    for x0 in (7, 11):
        for x in (x0, x0 + 1, x0 + 2):
            m.face(x, 12, GLOW); m.face(x, 11, GLOW)                              # two big glowing eyes
        m.face(x0 + 1, 11, WHITE)
    for x in range(8, 13):
        m.face(x, 9, CRACK)                                                       # a wide mouth
    m.face(9, 10, CRACK); m.face(11, 10, CRACK)                                   # with two stone teeth standing up in it
    for x, z in ((6, 7), (7, 6), (14, 7), (13, 6)):
        m.face(x, z, CRACK, y_from=14)                                            # cracks in the stone
    for x, y, h in ((2, 10, 6), (17, 11, 7), (8, 5, 8), (12, 6, 6), (5, 4, 5), (14, 9, 4), (9, 9, 5), (11, 3, 4)):   # crystals growing out of his shoulders and all down his back
        spike(m, x, y, m.top_of(x, y) or 9, h, K)
    return m


def dragon(frame=0):
    """THE DRAGON FLIES (his ask): legs tucked up, wings beating. frame 0 = wings up, 1 = level, 2 = down. pets.js holds it off the ground."""
    m = Model(); B = hexc('#1c4fa8', '#2f86e0', '#7fd0ff'); D = hexc('#123a80', '#1f62c0', '#5fb0f0'); HORN = hexc('#b9c2d6', '#eef1f7', '#ffffff')
    WING = hexc('#3fa0d8', '#8fe6ff', '#f0ffff'); H = hexc('#2f86e0', '#7fd0ff', '#eaffff')   # the head a shade lighter than the body, so it never melts into the neck
    Z = 3                                                                         # everything sits 3 up, so the wings have room to beat DOWN past the belly
    for x in (6, 13):
        m.box(x, x + 1, 5, 6, Z, Z, D); m.box(x, x + 1, 11, 12, Z, Z, D)        # four legs, tucked up under it
    m.ball(C, 8.5, Z + 4.0, 4.6, 6.0, 3.6, B)                                    # body
    m.box(9, 11, 1, 3, Z + 3, Z + 5, B); m.box(9, 10, 0, 0, Z + 3, Z + 4, B)    # tail, thinning to the back
    spike(m, 9, 0, Z + 5, 3, HORN)                                                # with a crystal on its tip
    m.box(8, 12, 12, 14, Z + 5, Z + 9, B)                                        # neck
    m.ball(C, 15.5, Z + 10.0, 3.7, 3.7, 3.1, H)                                  # head, up and forward
    m.box(8, 12, 18, 20, Z + 8, Z + 10, H, rnd=True)                             # snout
    m.face(9, Z + 10, EYE); m.face(11, Z + 10, EYE)                               # nostrils
    for x in (7, 12):                                                             # eyes on the front, with a glint
        m.face(x, Z + 11, EYE, y_from=19); m.face(x + 1, Z + 11, EYE, y_from=19); m.face(x, Z + 12, EYE, y_from=19); m.face(x + 1, Z + 12, WHITE, y_from=19)
    for sx in (-1, 1):
        m.side(16, Z + 11, EYE, sx); m.side(16, Z + 12, EYE, sx)
    top = m.height()
    for x in (7, 12):
        m.box(x, x + 1, 13, 14, top - 1, top + 2, HORN)                           # horns, swept back
    for y, h in ((10, 2), (7, 3), (4, 2)):                                        # crystal spines down the back
        spike(m, 10, y, m.top_of(10, y), h, D, wide=2)
    slope = (1.0, 0.1, -0.9)[frame]                                               # WINGS: a slab each side, a darker bone along the front edge; the slope is the beat
    for sx in (-1, 1):
        for k in range(6):
            x = C + sx * (5 + k); z = Z + 6 + round(k * slope); y1 = 11 - k // 2
            for zz in (z, z + 1):
                m.box(x, x, 5, y1, zz, zz, WING); m.put(x - sx, 5 if k else 6, zz, WING)
                m.put(x, y1, zz, D)
    return m


PETS = {'alien': alien, 'chicken': chicken, 'golem': golem, 'dragon': dragon}
FRAMES = {'alien': 2, 'chicken': 3, 'golem': 3, 'dragon': 3}   # how many rows each strip has: the pictures the game flicks between (pets.js MOVE says when)


def render(slices, turn_deg, squash=SQUASH):
    """the same loop the game runs (index.html stackFrame): rotate, squash, lift one pixel a slice, bottom to top; then ONE navy outline"""
    n = len(slices); h = round(S * squash); W, H = S + 4, h + n + 4
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for z, im in enumerate(slices):
        big = Image.new('RGBA', (S + 2, S + 2), (0, 0, 0, 0)); big.paste(im, (1, 1))
        r = big.rotate(-turn_deg, Image.NEAREST).resize((S + 2, round((S + 2) * squash)), Image.NEAREST)
        out.alpha_composite(r, (1, H - 2 - h - z))
    px = out.load(); edge = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 60 and any(0 <= x + a < W and 0 <= y + b < H and px[x + a, y + b][3] >= 60 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                edge.append((x, y))
    for x, y in edge:
        px[x, y] = NAVY
    return out


def main():
    os.makedirs('assets/pets', exist_ok=True); meta = {}; rows = []
    for name, fn in PETS.items():
        frames = [fn(f).slices() for f in range(FRAMES[name])] if name in FRAMES else [fn().slices()]
        n = max(len(f) for f in frames); blank = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        frames = [f + [blank] * (n - len(f)) for f in frames]
        strip = Image.new('RGBA', (S * n, S * len(frames)), (0, 0, 0, 0))
        for r, sl in enumerate(frames):
            for z, im in enumerate(sl):
                strip.paste(im, (z * S, r * S))
        strip.save(f'assets/pets/{name}.png', optimize=True); meta[name] = {'s': S, 'n': n, 'squash': SQUASH, 'rows': len(frames)}
        for r, sl in enumerate(frames):
            rows.append((name, sl))
    json.dump(meta, open('assets/pets/pets.json', 'w'), indent=1)
    if len(sys.argv) > 1:                                    # the check sheet: every pet turned through 8 angles, on the town's grass and on its snow
        Z, cw, ch = 5, 31, 42; sheet = Image.new('RGBA', (8 * cw * Z, len(rows) * ch * Z), (90, 168, 78, 255))
        for i, (name, sl) in enumerate(rows):
            if i % 2:
                sheet.paste((226, 236, 246, 255), (0, i * ch * Z, sheet.width, (i + 1) * ch * Z))
            for a in range(8):
                im = render(sl, a * 45); im = im.crop(im.getbbox())
                big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
                sheet.alpha_composite(big, (a * cw * Z + (cw * Z - big.width) // 2, i * ch * Z + ch * Z - big.height - 8))
        sheet.save(sys.argv[1])
    print({k: v['n'] for k, v in meta.items()})


if __name__ == '__main__':
    main()
