"""THE CRYSTAL CABIN (28 Nov 2026, the crystal shop: his pick 19). Made the way the Temple hut was (tools/make_temple_cabin.py): his plain
base hut restyled in Higgsfield (Nano Banana 2.1, 1:1, 1k, the base hut as the reference), kept in mafia2-art/crystal-cabin/cabin-<letter>.png.
This shrinks the picked one back to his 152 grid, takes the white away, stands it on the base hut's own foot and puts it in the game's
116 x 154 hut frame: assets/cabins/crystal.png (crystal-x.png = the same in the 126 wide Christmas frame).
Run from the mafia2 folder:  python -I tools/make_crystal_cabin.py [letter] [check.png]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_temple_cabin as T
from PIL import Image
T.SRC = r'..\mafia2-art\crystal-cabin'; T.OUT_PICK = sys.argv[1] if len(sys.argv) > 1 else 'b'
im, bb = T.cut(152); B = T.BASE_BOX; bw = B[2] - B[0]
k = min(1.0, 116 / im.width, (B[3] - 1) / im.height)
if k < 1: im = im.resize((round(im.width * k), round(im.height * k)), Image.NEAREST)
fr = Image.new('RGBA', (116, 154), (0, 0, 0, 0)); fr.paste(im, (B[0] + (bw - im.width) // 2, B[3] - im.height))
fr.save('assets/cabins/crystal.png', optimize=True)
fx = Image.new('RGBA', (126, 154), (0, 0, 0, 0)); fx.paste(fr, (10, 0)); fx.save('assets/cabins/crystal-x.png', optimize=True)
print(T.OUT_PICK, bb, '->', fr.getbbox())
if len(sys.argv) > 2:
    b = Image.open('assets/town4/cabins/cabin1.png').convert('RGBA'); t = Image.open('assets/cabins/temple.png').convert('RGBA')
    sh = Image.new('RGBA', (116 * 3 + 20, 164), (44, 70, 60, 255)); sh.alpha_composite(b, (5, 5)); sh.alpha_composite(fr, (121, 5)); sh.alpha_composite(t, (237, 5))
    sh.resize((sh.width * 4, sh.height * 4), Image.NEAREST).save(sys.argv[2])
