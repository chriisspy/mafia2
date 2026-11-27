"""THE CASINO'S ATM (27 Nov 2026, his ask: "add an ATM to the casino as well as a funny thing to buy coins"). Drawn here in code, straight on
(his rule: never angled), in the casino machines' own colours, 16 x 47 so it fits the bit of wall between the coin flip machines and the cashier.
It has a FACE: the screen is two eyes with $ for pupils that blink, the cash slot is its mouth, and a green note slides in and out like a tongue.
  frames (side by side): 0 eyes open, tongue in | 1 eyes open, tongue half | 2 eyes open, tongue out | 3 blink, tongue out | 4 eyes open, tongue half
  python -I tools/make_atm.py            (from the game folder)  ->  assets/casino/atm.png  (+ a 6x check picture if a path is given)"""
import os, sys
from PIL import Image

W, H, N = 16, 47, 5
K = (42, 22, 40)            # outline (the machines' dark plum)
B1, B2, B3, B4 = (140, 128, 160), (112, 100, 134), (84, 72, 108), (60, 50, 82)   # steel body: light, mid, dark, deep
GOLD, GOLD2, GOLD3 = (255, 210, 94), (211, 155, 42), (255, 242, 168)
SCR, SCR2, SCRK = (98, 201, 160), (64, 160, 124), (22, 60, 48)   # the flip machines' teal screen
RED, GRN, GRN2, GRN3 = (228, 84, 79), (110, 200, 110), (60, 140, 70), (190, 240, 180)
BLK = (24, 14, 28)

def frame(tongue, blink):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
    def rect(x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < W and 0 <= y < H: p[x, y] = (*c, 255)
    # the sign on top: a gold plate that says ATM
    rect(1, 0, 14, 8, K); rect(2, 1, 13, 7, GOLD2); rect(2, 1, 13, 1, GOLD3); rect(2, 2, 13, 6, GOLD)
    for x, col in ((3, ['.#.', '#.#', '###', '#.#']), (7, ['###', '.#.', '.#.', '.#.']), (11, ['#.#', '###', '###', '#.#'])):
        for yy, row in enumerate(col):
            for xx, ch in enumerate(row):
                if ch == '#' and x + xx <= 13: p[x + xx, 3 + yy] = (*K, 255)
    # the body
    rect(0, 8, 15, 46, K); rect(1, 9, 14, 45, B2); rect(1, 9, 14, 9, B1); rect(1, 9, 1, 44, B1); rect(14, 10, 14, 45, B3); rect(1, 45, 14, 45, B4)
    # the screen = its eyes
    rect(2, 11, 13, 21, K); rect(3, 12, 12, 20, SCR); rect(3, 12, 12, 12, GRN3); rect(3, 20, 12, 20, SCR2)
    for ex in (4, 9):
        if blink: rect(ex, 16, ex + 2, 16, SCRK)
        else:
            for yy, row in enumerate(['.##', '#..', '.#.', '..#', '##.']):   # a tiny $
                for xx, ch in enumerate(row):
                    if ch == '#': p[ex + xx, 14 + yy] = (*SCRK, 255)
            p[ex + 1, 13] = (*SCRK, 255); p[ex + 1, 19] = (*SCRK, 255)
    # card slot with its light, and the keypad
    rect(2, 23, 9, 24, K); rect(3, 23, 8, 23, BLK); p[11, 23] = (*(GRN if not blink else RED), 255); p[12, 23] = (*K, 255)
    for ky in (26, 28, 30):
        for kx in (3, 6, 9): rect(kx, ky, kx + 1, ky, B1); p[kx, ky + 1] = (*B4, 255); p[kx + 1, ky + 1] = (*B4, 255)
    p[12, 26] = (*RED, 255); p[12, 28] = (*GOLD, 255); p[12, 30] = (*GRN, 255)
    # the cash slot = its mouth, and the note = its tongue
    rect(2, 34, 13, 37, K); rect(3, 35, 12, 36, BLK)
    if tongue:
        L = 2 if tongue == 1 else 5
        rect(5, 36, 10, 36 + L, GRN2); rect(6, 36, 9, 35 + L, GRN); rect(5, 36 + L, 10, 36 + L, GRN2)
        if L > 2: p[7, 38] = (*GRN3, 255); p[8, 38] = (*GRN3, 255); p[7, 39] = (*GRN2, 255); p[8, 39] = (*GRN2, 255)
    # its feet
    rect(1, 43, 14, 44, B3); rect(0, 45, 15, 46, K); rect(1, 45, 14, 45, B4)
    return im

FR = [(0, 0), (1, 0), (2, 0), (2, 1), (1, 0)]
strip = Image.new('RGBA', (W * N, H))
for i, (t, b) in enumerate(FR): strip.alpha_composite(frame(t, b), (i * W, 0))
os.makedirs('assets/casino', exist_ok=True); strip.save('assets/casino/atm.png', optimize=True); print('atm', W, 'x', H, N, 'frames')
if len(sys.argv) > 1:
    room = Image.open('assets/interiors/casino.png').convert('RGBA'); room.alpha_composite(frame(2, 0), (232, 32))
    room.crop((170, 16, 306, 110)).resize((136 * 6, 94 * 6), Image.NEAREST).save(sys.argv[1]); print('check', sys.argv[1])
