"""THE BUTTONS (27 Nov 2026, his art: mafia2-art/buttons/*.png, seven 16 x 16 buttons, and his ask: "replicate that button style and update ours").
  1. his seven buttons are copied as they are into assets/buttons/ (menu, people, chat, shop, collection, rewards, coins): the game shows them at 48 px (3x).
  2. skin.png = the SHAPE of his button with no face colour, 3x (48 x 48), for every other button in the game: his dark outline with the stepped
     pixel corners, and his bottom lip as a see-through dark band. The game lays it over each button's own colour as a 9-slice border-image
     (slices 9 9 12 9), so a red button stays red and a gold one gold, in his shape and shading.
  python -I tools/make_buttons.py      (from the game folder)"""
import os
from PIL import Image
SRC, OUT = '../mafia2-art/buttons/', 'assets/buttons/'
os.makedirs(OUT, exist_ok=True)
# THE HIGHLIGHT (27 Nov 2026, his mock-up: "highlights to the bottom edge of the surface of the button... subtle but it adds detail"): the last row of
# the face, just above the lip (art row 12, columns 2..13), is a touch lighter: white at HL / 255 over whatever colour the face is.
HL, FACE = 28, {(0x3a, 0x44, 0x67), (0x3b, 0x43, 0x67)}
for a, b in (('menu', 'menu'), ('People', 'people'), ('Chat', 'chat'), ('shop', 'shop'), ('collection', 'collection'), ('rewards', 'rewards'), ('coins', 'coins')):
    im = Image.open(SRC + a + '.png').convert('RGBA')
    for x in range(2, 14):
        r, g, bl, al = im.getpixel((x, 12))
        if (r, g, bl) in FACE: im.putpixel((x, 12), tuple(round(c + (255 - c) * HL / 255) for c in (r, g, bl)) + (255,))   # only the bare face: never his icon
    im.save(OUT + b + '.png', optimize=True)
m = Image.open(SRC + 'menu.png').convert('RGBA'); skin = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
OUTL = {(0x18, 0x14, 0x25), (0x16, 0x12, 0x21), (0x16, 0x12, 0x20)}     # his outline (three near-identical darks)
LIP = {(0x25, 0x2b, 0x43), (0x26, 0x2b, 0x41)}                            # his bottom lip
for y in range(16):
    for x in range(16):
        r, g, b, a = m.getpixel((x, y))
        if not a: continue
        if (r, g, b) in OUTL: skin.putpixel((x, y), (0x18, 0x14, 0x25, 255))
        elif (r, g, b) in LIP and y >= 12: skin.putpixel((x, y), (0x14, 0x0e, 0x24, 96))   # face x .64 = his lip: a dark band laid over any colour
for x in range(2, 14): skin.putpixel((x, 12), (255, 255, 255, HL))   # the highlight, over any colour
skin.resize((48, 48), Image.NEAREST).save(OUT + 'skin.png', optimize=True)
print('buttons: 7 art + skin.png')

# PRESSED (27 Nov 2026, his ask: "the base/shadow part gets thinner when pressed and the button moves down from the top"): the top edge comes
# down one art pixel (the top row goes clear), the face and its icon ride down with it, and the lip loses one of its two rows. The bottom edge stays put.
def pressed(im):
    o = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y in range(12): o.paste(im.crop((0, y, 16, y + 1)), (0, y + 1))     # rows 0..11 -> 1..12
    o.paste(im.crop((0, 12, 16, 13)), (0, 13)); o.paste(im.crop((0, 14, 16, 16)), (0, 14))   # row 12 -> 13, rows 14..15 stay: lip row 13 is the one that goes
    return o
# (his catch: "the buttons are disappearing") a pressed picture in its OWN file can blink out while the browser fetches / decodes it, so each art
# button is one 16 x 32 picture, up over pressed (<name>-2.png): a press only slides it, nothing new is ever loaded.
for b in ('menu', 'people', 'chat', 'shop', 'collection', 'rewards', 'coins'):
    up = Image.open(OUT + b + '.png').convert('RGBA'); two = Image.new('RGBA', (16, 32), (0, 0, 0, 0)); two.paste(up, (0, 0)); two.paste(pressed(up), (0, 16)); two.save(OUT + b + '-2.png', optimize=True)
    if os.path.exists(OUT + b + '-down.png'): os.remove(OUT + b + '-down.png')
pressed(skin).resize((48, 48), Image.NEAREST).save(OUT + 'skin-down.png', optimize=True)
print('pressed: 7 art + skin-down.png')
