"""The throne hall's pillar, as a sprite stack -> assets/quest/hpillar.png (24 x 24, 46 slices, ground slice first).

   python -I tools/make_pillar.py [check.png]

Measured off mafia2-art/quest/temple/ref-hall-b.png (1 game px = 6.98 of its px): a shaft 12 wide, a round cap 16 wide seen
as an oval, a square plinth 18 wide and 4 high, about 57 tall drawn. The colours are the reference's own.

The game draws it at turn 0, squash .55, 1 px a slice (index.html stackFrame), so the face you see is the FRONT EDGE of each
slice: every slice is painted in vertical bands by x, and the drawn column reads as the reference's fluted shaft.
make_temple.py no longer writes hpillar.png; this does. Give a path to also save the check: the game's render beside the reference.
"""
import sys, math
import numpy as np
from PIL import Image

OUT = 'assets/quest/hpillar.png'
REF = '../mafia2-art/quest/temple/ref-hall-b.png'
S, N, SQUASH = 24, 46, .55
NAVY = (1, 3, 46)
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

LINE = H('24376c')                                  # the dark lines between the rings
TOP, RIM = H('a5d0f0'), H('bce8ff')                 # the cap's flat top, the bright lip along its front
CAP = [H('7798cb'), H('628dc0'), H('5277ab')]       # the cap's side: lit left, body, dark right
RING = [H('8ab0dc'), H('7496c6'), H('5c7eb0')]      # the ring under it, and the foot ring
# the shaft, by x from its left edge (12 wide): edge, band, groove, band, the light middle, groove, band, band, edge
SHAFT = [H(c) for c in ('5270a4', '7aa5d0', '4b74a8', '8ab5df', '8ab5df', 'a1ceef', 'a1ceef', 'a1ceef', '4e77a5', '90bae2', '80a9d5', '5977ab')]
SHADE = [H(c) for c in ('46639a', '5c7eb0', '40659a', '6f97c8', '6f97c8', '7fa8d4', '7fa8d4', '7fa8d4', '426a9a', '7198c6', '628bb8', '4a6a9e')]   # the same, in the cap's shadow
P_TOP, P_RIM, P_FRONT, P_FOOT = H('a9d5f2'), H('c8f3fc'), H('6d98c5'), H('5a82b4')   # the plinth: its top, front lip, front face, the bottom row

def third(dx, r, cols): return cols[0] if dx < -r * .45 else cols[2] if dx > r * .45 else cols[1]

def build():
    V = np.zeros((N, S, S, 4), np.uint8); c0 = (S - 1) / 2
    for z in range(N):
        for y in range(S):
            for x in range(S):
                dx, dy = x - c0, y - c0; d = math.hypot(dx, dy); c = None
                if z < 4:                                           # the square plinth, 18 wide
                    if max(abs(dx), abs(dy)) < 9:
                        if z == 3: c = P_RIM if dy > 7 else LINE if 7.2 <= d < 8.8 and dy > 0 else P_TOP    # its top: a bright front lip, the foot ring's shadow
                        else: c = P_FOOT if z == 0 else P_FRONT
                elif z < 7:                                         # the foot ring, 14 wide, a bright line on its shoulder
                    if d < 7.2: c = RIM if z == 6 and abs(dx) < 5 else third(dx, 7, RING)
                elif z < N - 8:                                      # the shaft, 12 wide
                    if d < 6.2: c = (LINE if z == 7 else SHADE if z >= N - 10 else SHAFT); c = c if c is LINE else c[int(dx + 6)]
                elif z == N - 8 or z == N - 5:                            # the dark lines either side of the neck ring
                    if d < (7.2 if z == N - 8 else 8.2): c = LINE
                elif z < N - 5:                                      # the neck ring, 14 wide
                    if d < 7.2: c = third(dx, 7, RING)
                else:                                               # the cap, 16 wide: flat top, bright front lip
                    if d < 8.2:
                        if z == N - 1: c = RIM if dy > 0 and math.hypot(dx, dy + 2) >= 8.2 else TOP
                        else: c = third(dx, 8, CAP)
                if c: V[z, y, x] = (*c, 255)
    return V

def render(strip):   # index.html stackFrame at turn 0, to the pixel: squash, lift 1 px a slice, then one navy line round the lot
    h = round(S * SQUASH); W, HH = S + 4, h + N + 4; a = np.zeros((HH, W, 4), np.uint8)
    for z in range(N):
        sl = strip[:, z * S:(z + 1) * S]; top = HH - 2 - h / 2 - z - SQUASH * S / 2
        for Y in range(HH):
            sy = math.floor((Y + .5 - top) / SQUASH)
            if 0 <= sy < S:
                row = sl[sy]; m = row[:, 3] > 0; a[Y, 2:2 + S][m] = row[m]
    al = a[..., 3] >= 60; e = np.zeros_like(al)
    e[1:] |= al[:-1]; e[:-1] |= al[1:]; e[:, 1:] |= al[:, :-1]; e[:, :-1] |= al[:, 1:]; a[e & ~al] = (*NAVY, 255)
    return Image.fromarray(a)

V = build(); strip = np.concatenate(list(V), 1)
Image.fromarray(strip).save(OUT, optimize=True)
print('hpillar', S, 'x', S, N, 'slices ->', OUT)
chk = [x for x in sys.argv[1:] if x.endswith('.png')]
if chk:
    K = 8; r = render(strip); big = r.resize((r.width * K, r.height * K), Image.NEAREST)
    ref = Image.open(REF).convert('RGBA').crop((296, 1166, 296 + 28 * 7, 1166 + 63 * 7)).resize((28 * K, 63 * K), Image.NEAREST)   # one of its pillars, at the same scale
    sheet = Image.new('RGBA', (big.width * 2 + 36, big.height + 24), (214, 252, 254, 255))
    sheet.alpha_composite(big, (12, 12)); sheet.alpha_composite(ref, (big.width + 24, 12)); sheet.save(chk[0])
    print('check ->', chk[0], '(left: the game\'s render, right: the reference)')
