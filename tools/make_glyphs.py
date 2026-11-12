# Pixelify Sans letters that read wrong in the game (his notes, 13 Nov): the 2 looks like an 8, the capital Z like a 2,
# the capital C like an O, the capital H is lumpy. Like make_five.py, this makes four tiny fonts (one per weight) holding
# ONLY these characters, each a clean pixel shape on a 5 x 7 grid. The page lists them under the same family name with
# unicode-range U+32,U+43,U+48,U+5A. Sizes match the 5 (make_five.py).
# usage (from the game folder): python -I tools/make_glyphs.py
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
L, B = 60, -12
W = {400: dict(R=525, T=631, tv=101, th=101, adv=586), 500: dict(R=531, T=633, tv=109, th=112, adv=592),
     600: dict(R=536, T=636, tv=118, th=124, adv=597), 700: dict(R=542, T=638, tv=127, th=137, adv=603)}
GLYPHS = {0x32: ('two', ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX']),
          0x43: ('C',   ['.XXXX', 'X....', 'X....', 'X....', 'X....', 'X....', '.XXXX']),
          0x48: ('H',   ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X']),
          0x5A: ('Z',   ['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'])}
def rect(pen, x0, y0, x1, y1):
    pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
for w, p in W.items():
    R, T, tv, th = p['R'], p['T'], p['tv'], p['th']
    cw, rh = (R - L - tv) / 4, (T - B - th) / 6          # step between pixel columns / rows; each pixel is tv wide, th tall
    glyfs = {'.notdef': TTGlyphPen(None).glyph()}
    for code, (name, grid) in GLYPHS.items():
        pen = TTGlyphPen(None)
        for r, row in enumerate(grid):
            c = 0
            while c < 5:
                if row[c] != 'X': c += 1; continue
                e = c
                while e + 1 < 5 and row[e + 1] == 'X': e += 1
                x0 = round(L + c * cw); x1 = round(L + e * cw + tv); y1 = round(T - r * rh); y0 = round(y1 - th)
                rect(pen, x0, y0, x1, y1); c = e + 1
        glyfs[name] = pen.glyph()
    fb = FontBuilder(1000, isTTF=True)
    names = [n for n, _ in GLYPHS.values()]
    fb.setupGlyphOrder(['.notdef'] + names); fb.setupCharacterMap({c: n for c, (n, _) in GLYPHS.items()})
    fb.setupGlyf(glyfs)
    fb.setupHorizontalMetrics({'.notdef': (p['adv'], 0), **{n: (p['adv'], L) for n in names}})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({'familyName': 'M2 Fix', 'styleName': 'Regular'})
    fb.setupOS2(usWeightClass=w, sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost(); fb.save(f'assets/fonts/fix-{w}.ttf'); print(w, 'ok')
