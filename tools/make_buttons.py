"""THE BUTTONS (27 Nov 2026, his art: mafia2-art/buttons/*.png, 16 x 16, and his ask: "replicate that button style and update ours").
This writes the whole button stylesheet into index.html, between /*BTN-CSS*/ and /*END-BTN-CSS*/. NOTHING in it is fetched from a file:
  - (his catch, three times: "the buttons are disappearing") a button whose look hangs on a picture file loses it whenever that file is slow or fails to
    load. So the skin every button wears is drawn in plain CSS (solid blocks laid in his shape), and his own art buttons are written INTO the stylesheet
    (data: pictures). There is nothing left to load, so nothing can go missing.
  1. EVERY BUTTON (.btn .hbig .tbtn .coinbtn .gbtn .bprice) takes his button's shape and shading over its own colour: cut to his stepped pixel outline
     (clip-path), his dark outline, his bottom lip (a see-through dark band, 2 art pixels), and a faint highlight on the last row of the face.
     One art pixel = 3 screen pixels. Pressed: the top edge comes down 3 px, the lip thins to one row, the bottom edge stays; the words ride down.
  2. HIS OWN ART at 48 px, each one picture holding its up half and its pressed half: menu, people, chat (top left), shop, collection, rewards, coins
     (the town's square buttons), decorate (the Decorate button). The stroke versions (*-stroke.png: the icon has its own dark outline).
  python -I tools/make_buttons.py      (from the game folder; run it again whenever he changes a picture in mafia2-art/buttons)"""
import base64, io, os
from PIL import Image
SRC, OUT, PAGE = '../mafia2-art/buttons/', 'assets/buttons/', 'index.html'
os.makedirs(OUT, exist_ok=True)
HL = 28                                                   # the highlight: white at HL / 255 (his note: "more subtle")
FACE = {(0x3a, 0x44, 0x67), (0x3b, 0x43, 0x67), (0xff, 0xd2, 0x5e)}   # his navy face (and the gold one below)
# (28 Nov 2026, his ask) THE COIN SHOP BUTTON IS YELLOW: his navy button recoloured to the game's gold (the Get coins button's colours); his coin and outline untouched
GOLD = {(0x3a, 0x44, 0x67): (0xff, 0xd2, 0x5e), (0x3b, 0x43, 0x67): (0xff, 0xd2, 0x5e), (0x25, 0x2b, 0x43): (0xd3, 0x9b, 0x2a), (0x26, 0x2b, 0x41): (0xd3, 0x9b, 0x2a), (0x50, 0x59, 0x78): (0xe8, 0xb2, 0x3e)}
def gold(im):
    for y in range(16):
        for x in range(16):
            r, g, b, a = im.getpixel((x, y))
            if a and (r, g, b) in GOLD: im.putpixel((x, y), GOLD[(r, g, b)] + (a,))
    return im
ART = (('menu-stroke', 'menu'), ('people-stroke', 'people'), ('chat-stroke', 'chat'), ('shop-stroke', 'shop'), ('collection-stroke', 'collection'),
       ('rewards-stroke', 'rewards'), ('coins-stroke', 'coins'), ('decorate-or-edit-stroke', 'decorate'))

def pressed(im):
    """the top edge one art pixel lower (top row clear), face and icon ride down, the lip loses one of its two rows; the bottom edge stays"""
    o = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y in range(12): o.paste(im.crop((0, y, 16, y + 1)), (0, y + 1))
    o.paste(im.crop((0, 12, 16, 13)), (0, 13)); o.paste(im.crop((0, 14, 16, 16)), (0, 14))
    return o

def trophy():
    """THE LEADERBOARD BUTTON (board.js): his own picture if he has drawn one (mafia2-art/buttons/leaderboard-stroke.png). Until then: his menu button with
    the icon wiped off its face, and a little gold cup with a dark outline drawn on it (mine, in his coin's golds: he may want to redraw it)."""
    if os.path.exists(SRC + 'leaderboard-stroke.png'): return Image.open(SRC + 'leaderboard-stroke.png').convert('RGBA')
    im = Image.open(SRC + 'menu-stroke.png').convert('RGBA'); F = (0x3a, 0x44, 0x67, 255)
    for y in range(1, 13):
        for x in (range(2, 14) if y in (1, 2, 12) else range(1, 15)): im.putpixel((x, y), F)
    K, G, Y, S = (0x18, 0x14, 0x25, 255), (0xfd, 0xd5, 0x31, 255), (0xff, 0xfb, 0xe0, 255), (0xe5, 0xae, 0x58, 255)
    for yy, row in enumerate(['..KKKKKK..', '.KGGGGGGK.', 'KKGYGGGSKK', 'KGKYGGGSKG', '.KKGGGGSK.', '..KKGGKK..', '...KGSK...', '..KGGGSK..', '..KKKKKK..']):
        for xx, ch in enumerate(row):
            if ch != '.': im.putpixel((3 + xx, 2 + yy), {'K': K, 'G': G, 'Y': Y, 'S': S}[ch])
    im.putpixel((12, 5), K)   # the right handle's outer edge, to match the left one
    return im
uris = {}
for a, b in ART + (('', 'leaderboard'),):
    im = trophy() if b == 'leaderboard' else Image.open(SRC + a + '.png').convert('RGBA')
    if b == 'coins': im = gold(im)
    for x in range(2, 14):                                # the faint highlight on the bare face only: never over his icon
        r, g, bl, al = im.getpixel((x, 12))
        if (r, g, bl) in FACE: im.putpixel((x, 12), tuple(round(c + (255 - c) * HL / 255) for c in (r, g, bl)) + (255,))
    two = Image.new('RGBA', (16, 32), (0, 0, 0, 0)); two.paste(im, (0, 0)); two.paste(pressed(im), (0, 16))
    two.save(OUT + b + '-2.png', optimize=True); im.save(OUT + b + '.png', optimize=True)       # kept as files too, for looking at
    buf = io.BytesIO(); two.save(buf, 'PNG', optimize=True); uris[b] = 'url(data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode() + ')'
for f in ('skin.png', 'skin-down.png'):                   # the old picture skins: no longer used
    if os.path.exists(OUT + f): os.remove(OUT + f)

A3, A6 = 'calc(100% - 3px)', 'calc(100% - 6px)'
def poly(t):   # his stepped outline; t = how far down the top edge sits (0 up, 3 pressed)
    pts = [('6px', f'{t}px'), (A6, f'{t}px'), (A6, f'{t+3}px'), (A3, f'{t+3}px'), (A3, f'{t+9}px'), ('100%', f'{t+9}px'), ('100%', A6), (A3, A6), (A3, A3), (A6, A3), (A6, '100%'),
           ('6px', '100%'), ('6px', A3), ('3px', A3), ('3px', A6), ('0', A6), ('0', f'{t+9}px'), ('3px', f'{t+9}px'), ('3px', f'{t+3}px'), ('6px', f'{t+3}px')]
    return 'polygon(' + ','.join(x + ' ' + y for x, y in pts) + ')'
def skin(t):
    """the layers of the skin, top-most first: [colour, size, position]. t = 0 up, 3 pressed (lip one row, everything at the top 3 px lower)"""
    lip = 9 - t            # the lip band's height from the bottom edge (it includes the outline's bottom row)
    # MIND: in background-position a percentage lines the block's OWN far edge up with the box's far edge, so a 3 px block that must END 3 px from the
    # right (or the bottom) sits at calc(100% - 3px), not calc(100% - 6px). (27 Nov: I had the 6, and every right and bottom corner pixel sat 3 px inside.)
    O, L, H = 'var(--bo)', 'var(--bl)', 'var(--bh)'
    return [(O, '100% 3px', f'0 {t}px'), (O, '100% 3px', '0 100%'), (O, '3px 100%', '0 0'), (O, '3px 100%', '100% 0'),           # the outline's four sides
            (O, '3px 6px', f'3px {t+3}px'), (O, '3px 6px', f'{A3} {t+3}px'),                                                       # its stepped top corners
            (O, '3px 3px', f'3px {A3}'), (O, '3px 3px', f'{A3} {A3}'),                                                             # its stepped bottom corners
            (L, '3px 3px', f'3px calc(100% - {lip}px)'), (L, '3px 3px', f'{A3} calc(100% - {lip}px)'),                           # the lip's two raised ends
            (L, f'100% {lip}px', '0 100%'),                                                                                         # the lip
            (H, 'calc(100% - 12px) 3px', f'6px calc(100% - {lip}px)')]                                                             # the highlight
def layers(t):
    S = skin(t)
    return ('background-image:' + ','.join(f'linear-gradient({c},{c})' for c, _, _ in S) + '!important;background-size:' + ','.join(z for _, z, _ in S)
            + '!important;background-position:' + ','.join(p for _, _, p in S) + '!important')
SK = '#phone :is(.btn,.hbig,.tbtn,.coinbtn,.gbtn,.bprice)'
ARTLIST = ('#phone #menuBtn,#phone #playersBtn,#phone #chatBtn,#phone #boardBtn,'
           '#phone:not(.land) #townHud .tpanel .tbtn:is(.shop,.coll,.daily,.coinshop,.deco),#phone.land #townHud.tmini .tbtn:is(.shop,.coll,.daily,.coinshop,.deco)')
css = f'''/*BTN-CSS*/
/* HIS BUTTONS: this whole block is written by tools/make_buttons.py (read its top). Do not edit it here: change that file and run it. */
#phone{{--bo:#181425;--bl:rgba(20,14,36,.376);--bh:rgba(255,255,255,{HL/255:.3f});{''.join(f'--art-{k}:{v};' for k, v in uris.items())}}}
{SK}{{border:3px solid transparent!important;border-radius:0!important;box-shadow:none!important;
  background-origin:border-box!important;background-clip:border-box!important;background-repeat:no-repeat!important;
  {layers(0)};
  clip-path:{poly(0)}}}
#phone .btn.dark,#phone .btn:has(>img[data-a=cross]:only-child){{background-color:#3a4467;color:#fff}}   /* his navy; a button that is only his close X is navy too, like his close.png */
{SK}:active:not(:disabled),#phone .bpack:active:not(:disabled) .bprice{{transform:none!important;border-width:6px 3px 0!important;
  {layers(3)};
  clip-path:{poly(3)}}}
#phone .bpack:active:not(:disabled){{transform:none!important}}
:is({ARTLIST}){{width:48px;height:48px;flex:0 0 48px;padding:0!important;border:0!important;background:0 0/48px 96px no-repeat!important;background-origin:border-box!important;background-clip:border-box!important;clip-path:none!important;image-rendering:pixelated;font-size:0!important}}
:is({ARTLIST})>:is(img,canvas){{display:none!important}}
#phone #menuBtn#menuBtn{{background-image:var(--art-menu)!important}}#phone #playersBtn#playersBtn{{background-image:var(--art-people)!important}}#phone #chatBtn#chatBtn{{background-image:var(--art-chat)!important}}#phone #boardBtn#boardBtn{{background-image:var(--art-leaderboard)!important}}
#phone:not(.land) #townHud .tpanel .tbtn.shop.shop,#phone.land #townHud.tmini .tbtn.shop.shop{{background-image:var(--art-shop)!important}}
#phone:not(.land) #townHud .tpanel .tbtn.coll.coll,#phone.land #townHud.tmini .tbtn.coll.coll{{background-image:var(--art-collection)!important}}
#phone:not(.land) #townHud .tpanel .tbtn.daily.daily,#phone.land #townHud.tmini .tbtn.daily.daily{{background-image:var(--art-rewards)!important}}
#phone:not(.land) #townHud .tpanel .tbtn.deco.deco,#phone.land #townHud.tmini .tbtn.deco.deco{{background-image:var(--art-decorate)!important}}
#phone:not(.land) #townHud .tpanel .tbtn.coinshop.coinshop,#phone.land #townHud.tmini .tbtn.coinshop.coinshop{{background-image:var(--art-coins)!important}}
:is({ARTLIST}):active:active{{border:0!important;clip-path:none!important;background-position:0 -48px!important;background-size:48px 96px!important}}
#homeHud .btn.lob{{min-height:42px}}#phone .btn.lob.gold{{background-color:#ffd25e;color:#4a2a00}}
/*END-BTN-CSS*/
'''
s = open(PAGE, encoding='utf-8', newline='').read()
if '/*BTN-CSS*/' in s: i = s.index('/*BTN-CSS*/'); j = s.index('/*END-BTN-CSS*/') + len('/*END-BTN-CSS*/\n')
else: i = s.index('/* ================= HIS BUTTONS (27 Nov 2026) ================='); j = s.index('</style>', i)   # the first run: the hand-written block goes
s = s[:i] + css + s[j:]
s = s.replace('<div id="xfade"></div><div id="btnWarm"></div>', '<div id="xfade"></div>')
open(PAGE, 'w', encoding='utf-8', newline='').write(s)
print('buttons:', len(ART), 'art +', len(skin(0)), 'skin layers, css', len(css), 'bytes')
