"""THE TYRE BARRIERS round the race track (24 Nov 2026, his ask: "tyre barriers should be in the 3D sliced style that we did
for the Godfather. use the skill thats been installed for that"). Made with the sprite-stacking skill, its path (c):
  1. the four flat views (TOP, SIDE, FRONT, BACK) are drawn here, one pixel an art pixel, each with a 1px dark outline
  2. the skill's own slicer (.claude/skills/sprite-stacking/scripts/views_to_slices.py) carves them into slices
  3. the carved strip is fitted to the game's stack drawer (index.html stackFrame: square slices, turning about the middle)
     and the tyre holes, which no flat view can show (the skill's "Holes" rule), are put back by hand in the top slices.
One barrier = three columns of two tyres, strapped together: red, white, red on top, black rubber underneath.
  python -I tools/make_tyres.py [check.png]      (from the game folder)
Writes assets/race/tyres.png (N slices of S x S, ground slice on the left, two rows the same) and assets/race/tyres.json."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image

SKILL = '../.claude/skills/sprite-stacking/scripts/views_to_slices.py'
ART = '../mafia2-art/race/'
D, COLS, TH = 9, 3, 4                       # a tyre: 9 across, 4 tall; three columns, two tyres high
L, Hh = D * COLS, TH * 2
S = 29                                      # the game's slice: square, odd, the barrier in the middle
OUTL = (26, 20, 48)
RUB = [(22, 20, 34), (40, 38, 58), (62, 60, 86)]                 # black rubber: shadow, mid, top
RED = [(150, 34, 44), (214, 60, 66), (255, 132, 120)]
WHT = [(170, 176, 200), (226, 226, 238), (255, 255, 255)]
CIRC = [3, 7, 9, 9, 9, 9, 9, 7, 3]          # a 9px pixel circle, row by row


def views():
    top = np.zeros((L, D, 4), np.uint8); side = np.zeros((Hh, L, 4), np.uint8); front = np.zeros((Hh, D, 4), np.uint8)
    for k in range(COLS):
        col = WHT if k == 1 else RED
        for r, wdt in enumerate(CIRC):                                   # TOP: three painted rings, a dark hole in each
            x0 = (D - wdt) // 2
            for x in range(x0, x0 + wdt):
                hole = 3 <= r <= 5 and 3 <= x <= 5
                rim = r in (0, 8) or x in (x0, x0 + wdt - 1)
                top[k * D + r, x] = (RUB[0] if hole else col[1] if rim else col[2]) + (255,)
        for z in range(Hh):                                              # SIDE: front on the left; painted tyre over a black one
            pal = col if z < TH else RUB
            row = pal[2] if z % TH == 0 else pal[0] if z % TH == TH - 1 else pal[1]
            for x in range(D):
                side[z, k * D + x] = (pal[0] if x in (0, D - 1) else row) + (255,)
    for z in range(Hh):                                                  # FRONT and BACK: one column, a red tyre over a black one
        pal = RED if z < TH else RUB
        row = pal[2] if z % TH == 0 else pal[0] if z % TH == TH - 1 else pal[1]
        for x in range(D):
            front[z, x] = (pal[0] if x in (0, D - 1) else row) + (255,)

    def outlined(a):
        h, w = a.shape[:2]; o = np.zeros((h + 2, w + 2, 4), np.uint8); o[1:-1, 1:-1] = a; s = o[..., 3] > 0
        e = np.zeros_like(s); e[1:] |= s[:-1]; e[:-1] |= s[1:]; e[:, 1:] |= s[:, :-1]; e[:, :-1] |= s[:, 1:]
        o[e & ~s] = OUTL + (255,); return o
    V = [outlined(v) for v in (top, side, front, front)]
    K, gap = 8, 48; W = sum(v.shape[1] * K for v in V) + gap * 5; Ht = max(v.shape[0] * K for v in V) + gap * 2
    sheet = Image.new('RGB', (W, Ht), (255, 255, 255)); x = gap
    for v in V:
        im = Image.fromarray(v).resize((v.shape[1] * K, v.shape[0] * K), Image.NEAREST)
        sheet.paste(im, (x, (Ht - im.height) // 2), im); x += im.width + gap
    sheet.save(ART + 'tyres-views.png')


def main():
    os.makedirs('assets/race', exist_ok=True)
    views()
    cmd = [sys.executable, SKILL, ART + 'tyres-views.png', ART + 'tyres-carved.png', '--slices', str(Hh + 2), '--order', 'reading', '--top-nose', 'down',
           '--shade', '0', '--colours', '0', '--preview', ART + 'tyres-check.png']
    r = subprocess.run(cmd, capture_output=True, text=True); print(r.stdout.strip() or r.stderr.strip()[-800:])
    car = np.asarray(Image.open(ART + 'tyres-carved.png').convert('RGBA')); n = Hh + 2
    sw = car.shape[1] // n; sh = car.shape[0]; assert car.shape[1] % n == 0, 'the carved strip is not a whole number of slices'
    sl = [car[:, i * sw:(i + 1) * sw] for i in range(n)]
    sl = [s for s in sl if (s[..., 3] > 0).any()]; N = len(sl)             # the outline rows carve to nothing: drop the empty slices
    out = np.zeros((S * 2, S * N, 4), np.uint8)
    for z, s in enumerate(sl):
        ys, xs = np.nonzero(s[..., 3]); s = s[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; h, w = s.shape[:2]
        cell = np.zeros((S, S, 4), np.uint8); oy, ox = (S - h) // 2, (S - w) // 2; cell[oy:oy + h, ox:ox + w] = s
        if z >= N - 2:                                                    # the holes down the middle of the top tyres (by hand: the skill's Holes rule)
            for k in range(COLS):
                cy = oy + (h - L) // 2 + k * D + 4; cx = S // 2
                cell[cy - 1:cy + 2, cx - 1:cx + 2] = RUB[0] + (255,)
        out[:S, z * S:(z + 1) * S] = cell; out[S:, z * S:(z + 1) * S] = cell
    Image.fromarray(out).save('assets/race/tyres.png', optimize=True)
    json.dump({'s': S, 'n': N, 'squash': .55}, open('assets/race/tyres.json', 'w'))
    print('tyres: %d slices of %dx%d' % (N, S, S))
    if len(sys.argv) > 1:                                                 # the game's own drawing loop, eight angles
        fr = []
        for a in range(0, 360, 45):
            h = round(S * .55); im = Image.new('RGBA', (S + 4, h + N + 4), (0, 0, 0, 0))
            for z in range(N):
                t = Image.fromarray(out[:S, z * S:(z + 1) * S]).rotate(-a, Image.NEAREST).resize((S, h), Image.NEAREST); im.alpha_composite(t, (2, im.height - 2 - h - z))
            fr.append(im)
        sheet = Image.new('RGBA', (fr[0].width * 8, fr[0].height), (230, 240, 250, 255))
        for i, f in enumerate(fr): sheet.alpha_composite(f, (i * f.width, 0))
        sheet.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(sys.argv[1])


main()
