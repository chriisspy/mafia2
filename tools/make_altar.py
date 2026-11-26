"""THE KEYSTONE ALTAR (25 Nov 2026, his ask: "make the keystone altar in the sprite stacking style"): a strip of flat slices drawn here in code,
ground slice first, read by the game's own STACK renderer (index.html stackFrame: turned, squashed, lifted 1 px a slice, ONE navy line round the lot).
Colours are the stone of the Nano Banana sheet mafia2-art/quest/altar/altar-a.png (its four views did not agree in size, so it is not carved from).
  three tiers: a wide mossy base step, a narrower body with glowing runes on every side, a cap with the four sockets on top
  (circle = Moon, triangle = Fang, square = Hearth, diamond = Ember, left to right: the mural's order).
  rows: 0 = empty, 1..4 = that many stones set (always the right order: a wrong stone pops straight out), 5 = all lit, runes blazing (the temple opens)
The face (front) points DOWN (+y) in the strip, like every stack in the game.
  python -I tools/make_altar.py      (from the game folder)  ->  assets/quest/altar.png + altar.json, and a check sheet in the scratchpad"""
import os, sys, json, math
import numpy as np
from PIL import Image

S = 48                       # each slice is S x S
BASE = (44, 30, 5)           # width, depth, slices
BODY = (34, 20, 10)
CAP = (40, 26, 4)
N = BASE[2] + BODY[2] + CAP[2]
ROWS = 6
OUT = 'assets/quest/'

# the sheet's stone, light to dark, plus moss, rune glow and the empty sockets
HI, LT, MID, DK, DEEP = (176, 210, 240), (152, 192, 228), (135, 168, 207), (102, 133, 177), (64, 84, 132)
MOSS, MOSS2 = (98, 112, 62), (70, 84, 48)
RUNE, RUNE_HI, RUNE_DIM = (120, 200, 255), (210, 245, 255), (84, 128, 190)
HOLE, HOLE2 = (22, 30, 66), (40, 54, 102)
STONE_K, STONE_K2 = (150, 160, 190), (110, 120, 156)   # a keystone's own grey, round its glowing shape
rng = np.random.default_rng(11)

def shape_mask(kind, r):
    """a 2r+1 square mask of one of the four shapes"""
    n = 2 * r + 1; m = np.zeros((n, n), bool); c = r
    for y in range(n):
        for x in range(n):
            dx, dy = x - c, y - c
            if kind == 'circle': m[y, x] = dx * dx + dy * dy <= (r + .35) ** 2
            elif kind == 'square': m[y, x] = abs(dx) <= r - 1 and abs(dy) <= r - 1
            elif kind == 'diamond': m[y, x] = abs(dx) + abs(dy) <= r
            elif kind == 'triangle': m[y, x] = dy >= -r and abs(dx) <= (dy + r) * .5 + .4 and dy <= r - 1
    return m

SOCKETS = ['circle', 'triangle', 'square', 'diamond']
SOCK_X = [-14, -5, 4, 13]    # socket centres along the cap, from the middle
SR = 4

# runes: a tiny 3x5 alphabet of strokes, laid along each side of the body
GLYPHS = [["#.#", "##.", "#.#", "#.#", "#.#"], ["###", "#..", "##.", "#..", "#.."], ["#..", "#.#", "##.", "#.#", "#.."],
          ["#.#", "#.#", ".#.", ".#.", ".#."], ["##.", "#.#", "##.", "#.#", "#.#"], ["#..", "##.", "#.#", "#..", "#.."]]

def rune_face(length, height, seed):
    """which pixels of one side are rune strokes: a row of glyphs centred on the face"""
    g = np.zeros((height, length), bool); r = np.random.default_rng(seed); n = max(1, (length - 4) // 5); x0 = (length - (n * 5 - 2)) // 2; y0 = (height - 5) // 2
    for i in range(n):
        G = GLYPHS[r.integers(len(GLYPHS))]
        for yy in range(5):
            for xx in range(3):
                if G[yy][xx] == '#': g[y0 + yy, x0 + i * 5 + xx] = True
    return g

def tier_slices(w, d, h, z0, kind):
    """the slices of one block: its outer ring is the wall (shaded, seams, runes, moss); the top slice is its lid"""
    out = []
    x0, y0 = (S - w) // 2, (S - d) // 2
    fronts = {'S': rune_face(w, h, 1), 'N': rune_face(w, h, 2), 'E': rune_face(d, h, 3), 'W': rune_face(d, h, 4)} if kind == 'body' else None
    for k in range(h):
        sl = np.zeros((S, S, 4), np.uint8); z = z0 + k; top = k == h - 1
        for y in range(y0, y0 + d):
            for x in range(x0, x0 + w):
                lx, ly = x - x0, y - y0
                edge = lx in (0, w - 1) or ly in (0, d - 1)
                if not top: edge = min(lx, ly, w - 1 - lx, d - 1 - ly) <= 1   # walls 2 px thick: squashed for the camera, two rows become one, and a 1 px wall lost its runes to the stone behind
                if top:   # the lid: light, a highlight on its rim, stone speckle
                    c = HI if edge else (LT if rng.random() > .18 else MID)
                    if kind == 'base' and rng.random() < .12 and (lx < 3 or ly < 3 or lx > w - 4 or ly > d - 4): c = MOSS
                else:      # the wall: darker toward the ground
                    c = MID if k >= h - 2 else (DK if k > 0 else DEEP)
                    if not edge: c = DK
                    if kind == 'base' and edge and ((lx % 11 == 5 and ly not in (0, d - 1)) is False and (lx % 11 == 5 or ly % 11 == 5)): c = DEEP          # block seams down the step
                    if kind == 'base' and edge and k < 2 and rng.random() < .45: c = MOSS if rng.random() < .6 else MOSS2
                    if kind == 'body' and edge:
                        face, i = ('S', lx) if ly >= d - 2 else ('N', w - 1 - lx) if ly <= 1 else ('E', ly) if lx >= w - 2 else ('W', d - 1 - ly)
                        L = fronts[face]
                        if 0 <= i < L.shape[1] and L[h - 1 - k, i]: c = RUNE
                        elif k == 0 and rng.random() < .3: c = MOSS2
                sl[y, x] = (*c, 255)
        out.append(sl)
    return out

def build(row):
    sl = tier_slices(*BASE, 0, 'base') + tier_slices(*BODY, BASE[2], 'body') + tier_slices(*CAP, BASE[2] + BODY[2], 'cap')
    lid = sl[-1]; cx, cy = S // 2, S // 2
    for i, (kind, sx) in enumerate(zip(SOCKETS, SOCK_X)):
        m = shape_mask(kind, SR); X, Y = cx + sx - SR, cy - SR
        ring = np.zeros_like(m); ring[1:] |= m[:-1]; ring[:-1] |= m[1:]; ring[:, 1:] |= m[:, :-1]; ring[:, :-1] |= m[:, 1:]; ring &= ~m
        for y in range(m.shape[0]):
            for x in range(m.shape[1]):
                if ring[y, x]: lid[Y + y, X + x] = (*MID, 255)            # the carved lip round each socket
                if not m[y, x]: continue
                if i < row:   # a stone sits in it: its grey face, its shape glowing
                    inner = m[y, x] and y > 0 and x > 0 and y < m.shape[0] - 1 and x < m.shape[1] - 1 and m[y - 1, x] and m[y + 1, x] and m[y, x - 1] and m[y, x + 1]
                    c = (RUNE_HI if row == 5 else RUNE) if inner else STONE_K
                else:
                    c = HOLE if y > SR - 2 else HOLE2
                lid[Y + y, X + x] = (*c, 255)
    if row == 5:   # the temple opens: every rune blazes
        for s in sl:
            r = (s[..., 0] == RUNE[0]) & (s[..., 1] == RUNE[1]) & (s[..., 2] == RUNE[2]); s[r] = (*RUNE_HI, 255)
    elif row == 0:
        for s in sl:
            r = (s[..., 0] == RUNE[0]) & (s[..., 1] == RUNE[1]) & (s[..., 2] == RUNE[2]); s[r] = (*RUNE_DIM, 255)
    return sl

strip = np.zeros((S * ROWS, S * N, 4), np.uint8)
for row in range(ROWS):
    for z, s in enumerate(build(row)): strip[row * S:(row + 1) * S, z * S:(z + 1) * S] = s
os.makedirs(OUT, exist_ok=True)
Image.fromarray(strip).save(OUT + 'altar.png', optimize=True)
json.dump({'s': S, 'n': N, 'rows': ROWS}, open(OUT + 'altar.json', 'w'))
print('altar', S, 'x', S, N, 'slices', ROWS, 'rows')

# ---- the check sheet: the game's own loop (turn, squash .55, lift 1 px a slice, one navy line), 8 turns x the rows ----
def render(row, ang, squash=.55):
    W, H = S + 8, int(S * squash) + N + 8; im = Image.new('RGBA', (W, H))
    for z in range(N):
        s = Image.fromarray(strip[row * S:(row + 1) * S, z * S:(z + 1) * S]).rotate(-math.degrees(ang), Image.NEAREST)
        s = s.resize((S, max(1, round(S * squash))), Image.NEAREST)
        im.alpha_composite(s, (4, H - 4 - s.height - z))
    a = np.asarray(im).copy(); al = a[..., 3] >= 60
    e = ~al & (np.roll(al, 1, 0) | np.roll(al, -1, 0) | np.roll(al, 1, 1) | np.roll(al, -1, 1)); a[e] = (1, 3, 46, 255)
    return Image.fromarray(a)
if len(sys.argv) > 1:
    tiles = [[render(r, t * math.pi / 4) for t in range(8)] for r in (0, 2, 4, 5)]
    w, h = tiles[0][0].size; sheet = Image.new('RGBA', (w * 8, h * 4), (20, 26, 60, 255))
    for j, rowt in enumerate(tiles):
        for i, t in enumerate(rowt): sheet.alpha_composite(t, (i * w, j * h))
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(sys.argv[1]); print('check', sys.argv[1])
