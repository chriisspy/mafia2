"""FISHERMAN JOE AS ONE OF OUR OWN CHARACTERS (18 Nov 2026, his asks: "make the fisherman character look more like how our characters
do", then, after my hand-recoloured Straw Farmer: "beard looks fake and awful ... just generate him in nano banana to be a new character
but reference our style/character sheet for the style").
Source: Nano Banana 2.1 on Higgsfield, 1:1, with his cast sheet (chrispy games/character sprites/ALL-cast-4x.png on magenta) as the image
reference -> ../mafia2-art/fishing/joe-src.png (his pick of the three tries is copied there; the others are pl/nb-joe-*.png).
This turns the painting into real game pixels (the middle of every painted cell, the flat background keyed out, a small palette) ->
  assets/fishing/joe.png     the whole little man, front view, the size of our characters
and stands him in the stall in place of PixelLab's own fisherman:
  ../mafia2-art/fishing/pl/stall.png  ->  assets/fishing/stall.png
Run:  python -I tools/make_joe.py [cell size]   (from the game folder; make_fishing_art.py calls it)"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
a = np.asarray(Image.open('../mafia2-art/fishing/joe-src.png').convert('RGB')).astype(int); H0, W0 = a.shape[:2]
bgc = np.median(np.concatenate([a[:20, :20].reshape(-1, 3), a[:20, -20:].reshape(-1, 3), a[-20:, :20].reshape(-1, 3)]), axis=0)
fg = np.abs(a - bgc).sum(-1) > 90
lab, n = nd.label(fg); fg = lab == np.bincount(lab[lab > 0]).argmax(); fg = nd.binary_fill_holes(fg)
ys, xs = np.nonzero(fg); X0, X1, Y0, Y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
# how big is one painted pixel? the size whose grid lines catch the most colour changes
ex = (np.abs(np.diff(a[Y0:Y1], axis=1)).sum(-1) > 60).sum(0).astype(float); ey = (np.abs(np.diff(a[:, X0:X1], axis=0)).sum(-1) > 60).sum(1).astype(float)
def best(e):
    out = []
    for c100 in range(700, 2200, 5):
        c = c100 / 100; sc = max(e[np.round(np.arange(o, len(e), c)).astype(int).clip(0, len(e) - 1)].mean() for o in np.arange(0, c, .5))
        out.append((sc / max(e.mean(), 1e-6), c))
    return max(out)
(sx, cx), (sy, cy) = best(ex), best(ey)
cell = float(sys.argv[1]) if len(sys.argv) > 1 else (cx if sx > sy else cy)
def off(e): return max((e[np.round(np.arange(o, len(e), cell)).astype(int).clip(0, len(e) - 1)].mean(), o) for o in np.arange(0, cell, .5))[1] + 1
ox, oy = off(ex), off(ey)
W, H = int((W0 - ox) // cell), int((H0 - oy) // cell); small = np.zeros((H, W, 4), np.uint8); m = max(1, int(cell * .28))
for y in range(H):
    y0, y1 = int(round(oy + y * cell)) + m, int(round(oy + (y + 1) * cell)) - m
    for x in range(W):
        x0, x1 = int(round(ox + x * cell)) + m, int(round(ox + (x + 1) * cell)) - m
        small[y, x, :3] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0); small[y, x, 3] = 255 if fg[y0:y1, x0:x1].mean() > .5 else 0
ys, xs = np.nonzero(small[..., 3]); small = small[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
q = Image.fromarray(small[..., :3]).quantize(24, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
f = np.dstack([np.asarray(q), small[..., 3]]).copy()
dk = (f[..., :3].astype(int).sum(-1) < 150) & (f[..., 3] > 0); f[dk, :3] = (1, 3, 46)        # his outline colour: the cast's navy
f[f[..., 3] == 0] = 0
# THE SAME EYES AS THE CAST (his note on the picked one: "just fix the eyes to be the same as ours"): each eye is a 2 x 3 navy block with the
# cast's one softer pixel top left (53, 34, 51), and nothing under it (the painter put a purple shade below each eye: it becomes skin again)
el, en = nd.label(dk); EYES_AT = []
for q in range(1, en + 1):
    ys, xs = np.nonzero(el == q)
    if len(xs) == 6 and xs.max() - xs.min() == 1 and ys.max() - ys.min() == 2:
        ex0, ey0 = xs.min(), ys.min(); f[ey0, ex0, :3] = (53, 34, 51)
        skin = f[ey0 + 1, ex0 + 3, :3] if ex0 + 3 < f.shape[1] else f[ey0 + 1, ex0 - 2, :3]
        for x in (ex0, ex0 + 1):
            c = f[ey0 + 3, x, :3].astype(int)
            if c.sum() < 330: f[ey0 + 3, x, :3] = skin
        EYES_AT.append([int(ex0), int(ey0), 2, 3])
Image.fromarray(f).save('assets/fishing/joe.png', optimize=True); H, W = f.shape[:2]
print('cell', cx, round(sx, 2), cy, round(sy, 2), '-> using', cell, '| joe', (W, H))

# ---- into the stall. THE ROOMY STALL (18 Nov, his note on the first one: "he cuts off weirdly and theres pixels on his face. let's make a new
# stall where he comfortably sits in there and isnt so crammed ... then also add a shadow under the stall"): a new PixelLab map object in the same
# style, 128 x 112, drawn EMPTY (../mafia2-art/fishing/stall-src.png, object 8add7028; the other try is pl/stall2-b.png). Joe is painted only onto
# the flat dark of its inside, so the counter, the fish, the awning and the posts all stay in front of him and nothing of his is cut by a box.
s = np.asarray(Image.open('../mafia2-art/fishing/stall-src.png').convert('RGBA')).copy(); s[..., 3] = np.where(s[..., 3] > 127, 255, 0); s[s[..., 3] == 0] = 0
SH, SW = s.shape[:2]; rgb = s[..., :3].astype(int)
op = rgb[46:70, 34:90].reshape(-1, 3); cols, cnt = np.unique(op, axis=0, return_counts=True); inside = cols[cnt.argmax()]      # the flat shade inside the stall
room = (np.abs(rgb - inside).sum(-1) < 14) & (s[..., 3] > 0)
lab, n = nd.label(room); room = lab == lab[56, 62]                       # only the opening itself
ys, xs = np.nonzero(room); top, bot = ys.min(), ys.max()                  # the awning's lower edge and the counter top
PX, PY = 62 - W // 2, top - 1                                             # he stands in the middle, his hat just under the awning; the counter hides him from the chest down
# JOE IS ALIVE (his ask, 18 Nov: "animate him to breathe and blink as well"): he is no longer painted into the picture. The game draws the stall,
# then Joe as a real character (breathing and blinking like everyone), then stall-front.png (the stall with its dark inside cut out) over him.
# THE SHADOW (same note: "make the shadow more realistic. its just a circle right now"): the stall's own outline thrown on the ground, the way the
# sun throws it: every bit of the stall casts down and to the right, further the higher up it is, so the wide awning and the rod show in it.
GROW_R, GROW_B = 40, 14
back = np.zeros((SH + GROW_B, SW + GROW_R, 4), np.uint8); back[:SH, :SW] = s
ys, xs = np.nonzero(s[..., 3]); by = ys.max()
shd = np.zeros(back.shape[:2], bool)
# HIS FINAL CALL on the shadow (18 Nov): "just make it a 2px drop shadow under the bottom of the stall please. no angle". So: two rows of shadow
# straight under whatever of the stall touches the ground (each column's lowest pixel, when that is within 8 rows of the feet). No cast, no ellipse.
for x in np.unique(xs):
    low = ys[xs == x].max()
    if low >= by - 8: shd[low + 1:low + 3, x] = True
shd &= back[..., 3] == 0
back[shd] = (18, 28, 58, 96)
front = np.zeros_like(back); front[:SH, :SW] = s; front[:SH, :SW][room] = 0
Image.fromarray(back).save('assets/fishing/stall.png', optimize=True); Image.fromarray(front).save('assets/fishing/stall-front.png', optimize=True)
import json
json.dump({'x': float(PX + W / 2), 'y': int(PY + H), 'eyes': EYES_AT, 'w': back.shape[1], 'h': back.shape[0], 'foot': int(by)}, open('assets/fishing/joe.json', 'w'))
print('stall', back.shape[1], back.shape[0], 'opening rows', int(top), int(bot), 'foot y', int(by), 'joe feet at', (PX + W / 2, PY + H))
