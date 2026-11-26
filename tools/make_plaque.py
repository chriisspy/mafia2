"""THE KEYSTONE PLAQUE (26 Nov 2026, the Glimmerkin hunt's reward): a wall decoration, the four Keystones set in one stone plaque.
Copied from the Nano Banana Pro reference mafia2-art/quest/reward/plaque-a.png (a straight-on stone slab: navy line, a light rim on top and
left, a shaded rim below and right, an engraved inner border, the four shapes in a row, a tuft of moss on the top right corner), with its
errors fixed: the four shapes are the game's OWN Keystone pictures (assets/quest/moon|fang|hearth|ember.png, the carved middle of each), in
the mural's order, and the stone is their stone.
Run from the mafia2 folder:  python -I tools/make_plaque.py [check.png]   ->  assets/decor/keystoneplaque.png
"""
import sys
from PIL import Image

NAVY, FACE, LITE, RIM, SHADE, DEEP = (5, 16, 72), (134, 169, 207), (168, 206, 236), (126, 186, 221), (82, 114, 159), (38, 62, 122)
MOSS = ((58, 110, 60), (86, 146, 74), (120, 178, 92))
WIN = (2, 7, 18, 23)                     # the carved middle of a Keystone picture (16 x 16)
B = 4                                    # the border: navy line, rim, face, engraved line


def main():
    n = 4; PAD = 3; w = n * 16 + 2 * B; h = 16 + 2 * B + 2 * PAD          # PAD: bare stone above and below the row, nearer the reference's shape
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); px = im.load()
    def box(x0, y0, x1, y1, c):
        for y in range(y0, y1):
            for x in range(x0, x1): px[x, y] = c + (255,)
    box(0, 0, w, h, NAVY)
    box(1, 1, w - 1, h - 1, FACE)
    box(1, 1, w - 1, 2, LITE); box(1, 1, 2, h - 1, LITE)                       # the light rim: top and left
    box(1, h - 2, w - 1, h - 1, SHADE); box(w - 2, 1, w - 1, h - 1, SHADE)     # the shaded rim: bottom and right
    box(3, 3, w - 3, 4, DEEP); box(3, 3, 4, h - 3, DEEP)                       # the engraved inner border: dark above and left ...
    box(3, h - 4, w - 3, h - 3, RIM); box(w - 4, 3, w - 3, h - 3, RIM)         # ... light below and right, so it reads as cut in
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)): px[x, y] = (0, 0, 0, 0)   # the corners rounded off
    for i, k in enumerate(('moon', 'fang', 'hearth', 'ember')):               # the mural's order
        st = Image.open(f'assets/quest/{k}.png').convert('RGBA').crop(WIN)
        im.paste(st, (B + i * 16, B + PAD))
    # the moss on the top right corner: three flat greens
    moss = ["..............",
            ".......aabb...",
            "...aabbbbccb..",
            "..abbccbbbbba.",
            "...aab.abbcba.",
            "..........abba",
            "...........aba",
            "............a."]
    for y, line in enumerate(moss):
        for x, ch in enumerate(line):
            if ch != '.' and 0 <= w - 14 + x < w and y - 1 >= 0:
                px[w - 14 + x, y - 1] = MOSS['abc'.index(ch)] + (255,)
    im.save('assets/decor/keystoneplaque.png')
    if len(sys.argv) > 1:
        K = 8; ref = Image.open(r'..\mafia2-art\quest\reward\plaque-a.png').convert('RGB').crop((60, 440, 1990, 1600))
        big = im.resize((w * K, h * K), Image.NEAREST); ref = ref.resize((big.width, round(ref.height * big.width / ref.width)), Image.LANCZOS)
        sh = Image.new('RGBA', (big.width + 40, ref.height + big.height + 60), (44, 52, 84, 255))
        sh.paste(ref, (20, 20)); sh.alpha_composite(big, (20, ref.height + 40)); sh.save(sys.argv[1])
    print('plaque', im.size)


main()
