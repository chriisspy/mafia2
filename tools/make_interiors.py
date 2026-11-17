"""THE INSIDE OF THE TAVERN AND THE CASINO (17 Nov 2026, his ask: "actual interiors").
Drawn by Nano Banana from his own cabin room as the style reference (sources kept in
Dropbox/Documents/claude chrispy/mafia2-art/interiors/<name>-src.png , 4800 x 3584, one art pixel = 15 picture pixels).
This turns each into real game pixels (the middle of every 15 px cell, a small palette, the black round it cut off) ->
  assets/interiors/<name>.png        the room, about 320 x 240
  assets/interiors/<name>-walk.png   where you can walk: WHITE = floor. Found from the floor's own colour (grey flagstones
                                     in the Tavern, red carpet in the Casino), tidied, and only the part joined to the door.
                                     A copy goes to mafia2-art/interiors/ for him to touch up (white = walk, black = no).
Everything that is not floor is solid, so people only ever stand in front of furniture (never half behind it).
Run:  python -I tools/make_interiors.py   (from the game folder)"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
SRC = '../mafia2-art/interiors/'; OUT = 'assets/interiors/'; CELL = 15; COLOURS = 110
os.makedirs(OUT, exist_ok=True)
# worked out by eye on the finished pictures (x0, y0, x1, y1 in room pixels):
BOUNDS = {'tavern': (12, 80, 294, 230), 'casino': (13, 79, 294, 209)}                 # the floor is inside this
FREE = {'tavern': [(118, 95, 196, 136), (134, 203, 172, 215), (144, 214, 161, 229)],   # the rug and the fire-lit stones, the door mat, the doorway
        'casino': [(137, 200, 169, 214), (145, 213, 161, 226)]}
BLOCK = {'tavern': [],
         'casino': [(12, 100, 49, 121), (77, 100, 169, 121), (257, 100, 294, 121), (161, 78, 170, 101),      # the velvet ropes
                    (8, 120, 26, 152), (281, 118, 298, 152), (8, 177, 27, 209), (103, 186, 122, 209), (185, 185, 203, 209),   # plants
                    (123, 160, 131, 209), (174, 140, 183, 209),                                             # the two ropes by the door
                    (25, 150, 111, 192), (201, 150, 270, 192), (266, 160, 298, 209),                        # the blackjack tables and stools, the big tree
                    (247, 79, 298, 94), (8, 79, 27, 92)]}                                                   # the cashier desk, the little tree

def phase(a):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 60).sum(axis=0 if axis == 1 else 1)
        out.append(int(np.argmax([d[o::CELL].sum() for o in range(CELL)]) + 1) % CELL)
    return out

def floor_of(name, s):
    r, g, b = s[..., 0], s[..., 1], s[..., 2]
    if name == 'tavern': return (abs(r - g) < 16) & (abs(g - b) < 22) & (r > 70) & (r < 175)                      # grey flagstones (and their darker joints)
    return ((r > 95) & (g < 70) & (b < 70) & (r > g + 60)) | ((r > 170) & (g > 110) & (g < 200) & (b < 80))          # red carpet and its little gold diamonds

for name in ('tavern', 'casino'):
    a = np.asarray(Image.open(f'{SRC}{name}-src.png').convert('RGB'))
    ox, oy = phase(a); H, W = (a.shape[0] - oy) // CELL, (a.shape[1] - ox) // CELL
    small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        row = a[oy + y * CELL + 4:oy + (y + 1) * CELL - 4]
        for x in range(W): small[y, x] = np.median(row[:, ox + x * CELL + 4:ox + (x + 1) * CELL - 4].reshape(-1, 3), axis=0)
    dark = small.astype(int).sum(-1) < 40                                # the black outside the room
    ys, xs = np.nonzero(~dark); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    small = small[y0:y1, x0:x1]
    img = Image.fromarray(small).quantize(COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    px = np.asarray(img).copy(); px[small.astype(int).sum(-1) < 40] = 0   # the outside stays pure black
    img = Image.fromarray(px); img.save(f'{OUT}{name}.png', optimize=True)
    s = px.astype(int); h, w = s.shape[:2]
    if name == 'tavern':
        fl = floor_of(name, s); fl = nd.binary_closing(fl, iterations=1); fl = nd.binary_opening(fl, iterations=2)
        fl = nd.binary_erosion(fl, iterations=1)                          # a pixel clear of every table leg and wall
    else: fl = np.ones((h, w), bool)                                      # the Casino: red ropes and red plants look like carpet, so its floor is drawn by hand below
    bx0, by0, bx1, by1 = BOUNDS[name]; inb = np.zeros((h, w), bool); inb[by0:by1, bx0:bx1] = True; fl &= inb
    for x0_, y0_, x1_, y1_ in BLOCK[name]: fl[y0_:y1_, x0_:x1_] = False
    for x0_, y0_, x1_, y1_ in FREE[name]: fl[y0_:y1_, x0_:x1_] = True
    lab, n = nd.label(fl)
    door = lab[h - 30:h - 8, w // 2 - 8:w // 2 + 8]; door = door[door > 0]
    keep = np.bincount(door).argmax() if len(door) else np.bincount(lab[lab > 0]).argmax()
    fl = lab == keep
    m = Image.fromarray((fl * 255).astype(np.uint8)); m.save(f'{OUT}{name}-walk.png', optimize=True); m.save(f'{SRC}{name}-walk.png')
    print(name, 'grid offset', (ox, oy), '->', img.size, 'floor', int(fl.sum()), 'px')
