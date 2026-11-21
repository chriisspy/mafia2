"""The Godfather outfit (21 Nov 2026). His reference: a grey-haired don, slicked-back hair, heavy grey brows, a grey
moustache, a black tuxedo with a white shirt and black bow tie, a red rose on the lapel (no cat).

HIS CALL (21 Nov): do NOT reuse the Mafia outfit's body. This is a NEW head and body, drawn pixel by pixel below in the
cast's own style: the cast's proportions (21 wide, 31 tall, a big head), a navy line round the outside, a darker shade
of each part as its inner line, and 2-3 tones per part with the light coming from the top left.

Run from the mafia2 folder:  python tools/make_godfather.py [check.png]
Writes assets/final/godfather/{front,right,back,left}.png  (left = right mirrored, like the cast).
"""
import os, sys
from PIL import Image

KEY = {
    '.': (0, 0, 0, 0),
    'a': (1, 3, 46, 255),                                   # the cast's navy outline; also eyes, bow tie, buttons
    'L': (222, 224, 234, 255), 'H': (184, 186, 200, 255), 'h': (146, 148, 168, 255), 'G': (100, 102, 128, 255),   # grey hair: shine, light, mid, its dark line
    'u': (253, 209, 175, 255), 'v': (240, 184, 158, 255), 'S': (171, 100, 100, 255), 'b': (252, 165, 158, 255),   # skin, skin in shade, skin's line, blush
    'M': (196, 198, 210, 255), 'm': (138, 140, 160, 255),   # moustache
    'P': (41, 40, 61, 255), 'O': (19, 14, 33, 255), 'Q': (70, 70, 104, 255), 'q': (104, 106, 146, 255),            # tuxedo: cloth, its dark line, satin lapel / light edge, shine
    'W': (226, 242, 248, 255), 'w': (186, 214, 226, 255),   # shirt, shirt in shade
    'R': (224, 44, 60, 255), 'r': (146, 18, 54, 255), 'g': (60, 140, 84, 255),                                    # the rose and its leaf
}

FRONT = [
    "......aaaaaaaaa......",
    "....aaHLLHHLHHHaa....",
    "...aHLLHHLHHLHHHHa...",
    "..aHLLHHLHHLHHLHHha..",
    ".aGHLHHLHHLHHLHHHhGa.",
    "aGhHHvvvvvvvvvvvHhhGa",
    "aGhhvuuuuuuuuuuuvhhGa",
    "aGhSuuuuuuuuuuuuuShGa",
    "aGhSuGGGGuuuGGGGvShGa",
    "aGSuuuaauuuuuaauuvSGa",
    "aSuuuuaauuuuuaauuuvSa",
    "aSubuuaauuuuuaauubvSa",
    "aSuuuuuMMMMMMMuuuuvSa",
    ".aSuuuuMmuuumMuuuvSa.",
    "..aSSuuuuuuuuuuvSSa..",
    "...aaSSSSSSSSSSSaa...",
    "..aOqQPQaaOaaQPPPOa..",
    ".aOqQPPQWWaWwQPPPPOa.",
    "aOqQOPPPQWaWQRRPOPPOa",
    "aOQPOPPPPQWQPrRPOPPOa",
    "aOQPOPPPPPQPPgPPOPPOa",
    "aOPPOPPPPPaPPPPPOPPOa",
    "aOPPOPPPPPaPPPPPOPPOa",
    "aOPPOPPPPPaPPPPPOPPOa",
    "auuSOPPPPPaPPPPPOSuva",
    ".aaaOQPPPPOPPPPPOaaa.",
    "...aOQPPPOaOQPPPOa...",
    "...aOQPPPa.aQPPPOa...",
    "...aOQPPPa.aQPPPOa...",
    "...aOqQOOa.aOqQOOa...",
    "...aaaaaaa.aaaaaaa...",
]
SIDE = [   # facing right
    "....aaaaaaaa.....",
    "..aaHLLHHLHHaa...",
    ".aHLLHHLHHLHHHa..",
    "aHLLHHLHHLHHHHHa.",
    "aGHLHHLHHLHHHhva.",
    "aGhHLHHLHHHhvuua.",
    "aGhhHLHHHhSuuuua.",
    "aGhhHHHhhSuuuuua.",
    "aGGhhHhhSuuGGGua.",
    "aGGhhhhSuuuuaaua.",
    ".aGGhhSuuuuuaauua",
    ".aGGhSuuubuuaauua",
    "..aGSuuuuuuMMMMa.",
    "..aSSuuuuuuumMa..",
    "...aSSuuuuuuua...",
    "....aaSSSSSaa....",
    "...aOqQPPPQWa....",
    "..aOqQPPPPQWaa...",
    "..aOQPPOPPPQWa...",
    "..aOQPPOPPPPRa...",
    "..aOPPPOPPPPra...",
    "..aOPPPOPPPPPa...",
    "..aOPPPOPPPPPa...",
    "..aOPPPOPPPPPa...",
    "..aOPPPSuuPPPa...",
    "..aOPPPaaaPPPa...",
    "...aOQPPPPPPa....",
    "...aOQPPPPPa.....",
    "...aOQPPPPPa.....",
    "...aOqQOOOOOa....",
    "...aaaaaaaaaa....",
]
BACK = [
    "......aaaaaaaaa......",
    "....aaHLLHHLHHHaa....",
    "...aHLLHHLHHLHHHHa...",
    "..aHLLHHLHHLHHLHHha..",
    ".aGHLHHLHHLHHLHHHhGa.",
    "aGhHLHHLHHLHHLHHLHhGa",
    "aGhHLHHLHHLHHLHHLHhGa",
    "aGhHLHHLHHLHHLHHLHhGa",
    "aGhHLHHLHHLHHLHHLHhGa",
    "aGhHLHHLHHLHHLHHLHhGa",
    "aGhhLHHLHHLHHLHHLhhGa",
    "aGhhHLHHLHHLHHLHHhhGa",
    "aGhhHLHHLHHLHHLHHhhGa",
    ".aGhhhHHLHHLHHHhhhGa.",
    "..aGGhhhhhhhhhhhGGa..",
    "...aaSuuuuuuuuvSaa...",
    "..aOqQPPPPPPPPPPPOa..",
    ".aOqQPPPPPPPPPPPPPOa.",
    "aOqQOPPPPPPPPPPPOPPOa",
    "aOQPOPPPPPPPPPPPOPPOa",
    "aOQPOPPPPPOPPPPPOPPOa",
    "aOPPOPPPPPOPPPPPOPPOa",
    "aOPPOPPPPPOPPPPPOPPOa",
    "aOPPOPPPPPOPPPPPOPPOa",
    "auuSOPPPPPOPPPPPOSuva",
    ".aaaOQPPPPOPPPPPOaaa.",
    "...aOQPPPOaOQPPPOa...",
    "...aOQPPPa.aQPPPOa...",
    "...aOQPPPa.aQPPPOa...",
    "...aOOOOOa.aOOOOOa...",
    "...aaaaaaa.aaaaaaa...",
]


def fit(rows):
    """the cast's proportions: a taller head (two more rows of hair and forehead), a shorter body and short legs"""
    return rows[:3] + [rows[2]] + rows[3:7] + [rows[6]] + rows[7:21] + rows[23:27] + rows[28:]


def draw(rows):
    rows = fit(rows)
    w = len(rows[0])
    for i, r in enumerate(rows):
        assert len(r) == w, 'row %d is %d wide, not %d: %s' % (i, len(r), w, r)
    im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            im.putpixel((x, y), KEY[ch])
    return im.crop(im.getbbox())


def main():
    os.makedirs('assets/final/godfather', exist_ok=True)
    f, r, b = draw(FRONT), draw(SIDE), draw(BACK)
    views = {'front': f, 'right': r, 'back': b, 'left': r.transpose(Image.FLIP_LEFT_RIGHT)}
    for k, im in views.items():
        im.save('assets/final/godfather/%s.png' % k)
    if len(sys.argv) > 1:                                    # him on top, two of the cast underneath to compare
        sheet = Image.new('RGBA', (4 * 30, 3 * 42), (120, 150, 120, 255))
        for i, k in enumerate(('front', 'right', 'back', 'left')):
            sheet.alpha_composite(views[k], (i * 30 + 3, 4))
            for j, other in enumerate(('redcap', 'alfa')):
                o = Image.open('assets/final/%s/%s.png' % (other, k)).convert('RGBA')
                sheet.alpha_composite(o, (i * 30 + 3, 46 + j * 42))
        sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save(sys.argv[1])
    print('godfather:', {k: v.size for k, v in views.items()})


main()
