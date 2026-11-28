"""THE WORLD PROJECTS' BUILDINGS (28 Nov 2026, his ask: "redo these images to match the top down / front on-ish style of our game and the
pixel detail. match them exactly").
Made the way the Tavern and the Casino were (tools/make_buildings.py): Nano Banana 2.1 on Higgsfield, with his own cabin + the Tavern + the
Casino as the style reference (mafia2-art/buildings/tavern-casino-next-to-cabin.png), on flat magenta. Sources: mafia2-art/projects/src/<name>-src.png.
This turns each one into real game pixels the way tools/make_south.py does: finds the AI's pixel grid, takes the middle colour of every cell,
cuts the magenta away, snaps the colours to a small palette. Then each is brought to the size it should stand at beside the town's own buildings
(the Tavern is 174 x 134, a cabin about 100 wide): WIDE = how many game pixels wide it should be.
The Fountain is his own picture (mafia2-art/buildings/water-fountain.png), only brought to size.

Run from the mafia2 folder:  python -I tools/make_projects.py [check.png]
Writes assets/projects/<name>.png
"""
import os, sys
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SRC, OUT = '../mafia2-art/projects/src/', 'assets/projects/'
# PIXEL SIZE (his rule: "match the pixel detail exactly"). A picture made on its own comes back at whatever pixel size the AI chose (the first hut was
# 212 px wide, the first statue taller than the Tavern), and shrinking pixel art ruins it. So four of them were made as an EDIT of _anchor.png: the game's
# own Tavern at 8 screen px to the game px, with empty magenta beside it. The AI draws the new one on the Tavern's grid, at the right size beside it;
# every 8 x 8 cell is then exactly one game pixel and nothing is ever resized. The Bakery came back on a clean 12 px grid at the Tavern's own size.
# name: (source, 'own' = find its grid | 'anchor' = the Tavern's 8 px grid, keep what is right of the Tavern; colours)
ANCHOR, KEEP_FROM = 8, 181
JOBS = {'bakery': ('bakery-src.png', 'own', 64), 'fishhut': ('fishhut-a2.png', 'anchor', 56), 'clock': ('clock-a2.png', 'anchor', 64),
        'miner': ('miner-a2.png', 'anchor', 40), 'monument': ('monument-a2.png', 'anchor', 48)}


def cell_size(a, lo=6.0, hi=40.0):
    """the AI's pixel size: the spacing whose grid lines catch the most colour edges"""
    best = (0, 0)
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1).astype(float)
        for c in np.arange(lo, hi, .1):
            n = len(d) - 1
            sc = max(d[np.round(np.arange(p, n, c)).astype(int)].mean() for p in np.linspace(0, c, 16, endpoint=False))
            if sc > best[0] * 1.08: best = (sc, round(float(c), 1))
    return best[1]


def phase(a, cell):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 40).sum(axis=0 if axis == 1 else 1)
        n = len(d) - 1
        sc = [d[np.round(np.arange(p, n, cell)).astype(int)].sum() for p in np.arange(0, cell, .5)]
        out.append((int(np.argmax(sc)) * .5 + 1) % cell)
    return out


def sample(a, cell):
    ox, oy = phase(a, cell); H, W = int((a.shape[0] - oy) // cell), int((a.shape[1] - ox) // cell)
    m = max(1, int(cell * .25)); small = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        y0 = int(round(oy + y * cell)); row = a[y0 + m:int(round(oy + (y + 1) * cell)) - m]
        for x in range(W):
            x0 = int(round(ox + x * cell)); small[y, x] = np.median(row[:, x0 + m:int(round(ox + (x + 1) * cell)) - m].reshape(-1, 3), axis=0)
    return small


def cut(small, cols):
    s = small.astype(int); r_, g_, b_ = s[..., 0], s[..., 1], s[..., 2]
    mag = ((r_ > 150) & (b_ > 150) & (g_ < 110) & (np.abs(r_ - b_) < 90)) | ((b_ > 90) & (r_ > g_ + 35) & (b_ > g_ + 45) & (np.abs(r_ - b_) < 70))
    rgb = np.asarray(Image.fromarray(small).quantize(cols, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    img = np.dstack([rgb, np.where(mag, 0, 255).astype(np.uint8)])
    ys, xs = np.nonzero(img[..., 3]); return Image.fromarray(img[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def main():
    os.makedirs(OUT, exist_ok=True); made = {}
    for name, (src, kind, cols) in JOBS.items():
        a = np.asarray(Image.open(SRC + src).convert('RGB'))
        if kind == 'anchor':
            H, W = a.shape[0] // ANCHOR, a.shape[1] // ANCHOR; m = 2
            small = np.array([[np.median(a[y * ANCHOR + m:(y + 1) * ANCHOR - m, x * ANCHOR + m:(x + 1) * ANCHOR - m].reshape(-1, 3), axis=0) for x in range(KEEP_FROM, W)] for y in range(H)], np.uint8)
            cell = ANCHOR
        else:
            cell = cell_size(a); small = sample(a, cell)
        im = cut(small, cols); im.save(OUT + name + '.png', optimize=True); made[name] = im; print(name, 'cell', cell, '->', im.size)
    f = Image.open('../mafia2-art/buildings/water-fountain.png').convert('RGBA'); f = f.crop(f.getbbox())
    f = f.resize((72, round(f.height * 72 / f.width)), Image.NEAREST); f.save(OUT + 'fountain.png', optimize=True); made['fountain'] = f; print('fountain (his own) ->', f.size)
    if len(sys.argv) > 1:                                          # the check: every one beside the game's own Tavern, at the game's scale, on the town's snow
        ref = [Image.open('assets/buildings/tavern.png').convert('RGBA'), Image.open('assets/buildings/casino.png').convert('RGBA')]
        row = [ref[0]] + [made[k] for k in ('bakery', 'fishhut', 'clock', 'miner', 'monument', 'fountain')] + [ref[1]]
        W = sum(i.width for i in row) + 12 * (len(row) + 1); H = max(i.height for i in row) + 24
        sheet = Image.new('RGBA', (W, H), (226, 236, 246, 255)); x = 12
        for i in row:
            sheet.alpha_composite(i, (x, H - 12 - i.height)); x += i.width + 12
        sheet.resize((W * 2, H * 2), Image.NEAREST).save(sys.argv[1])


if __name__ == '__main__':
    main()
