# THE HOME SCREEN CHASE (his ask, 18 Nov 2026): the Mafia with the knife chasing the straw farmer along a country road,
# with the valley going past in layers (parallax). The art is nano banana (Higgsfield), made on flat magenta; this turns it into
# the game's pixels: one art pixel = PX source pixels, magenta keyed out, the long strips cut so they loop with no seam, and the
# sprite sheets split into one picture per thing.
# usage (from the game folder): python -I tools/make_homerun.py [xmas]   (reads ../mafia2-art/homerun/raw[_xmas]/*.png)
import json, os
import numpy as np
from PIL import Image
import sys
SET = sys.argv[1] if len(sys.argv) > 1 else ''          # '' = the normal (after Christmas) scene, 'xmas' = the Christmas one
RAW = '../mafia2-art/homerun/raw' + ('_' + SET if SET else '') + '/'
OUT = 'assets/homerun/' + (SET + '/' if SET else '')
PX = 8                                  # nano banana drew each art pixel about 8 source pixels wide
os.makedirs(OUT, exist_ok=True)

def pixels(name, px=PX):
    """sample the middle of every art pixel (keeps edges crisp), and key out the magenta"""
    a = np.asarray(Image.open(RAW + name + '.png').convert('RGB')).astype(int)
    h, w = a.shape[0] // px, a.shape[1] // px
    s = a[px // 2::px, px // 2::px][:h, :w]
    r, g, b = s[..., 0], s[..., 1], s[..., 2]
    lo = np.minimum(r, b)
    key = ((r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 90)) | ((lo > 70) & (g < lo * .62) & (abs(r - b) < 70)) | ((r > 100) & (r >= b * .95) & (r < b * 1.55) & (b > g * 1.3))   # magenta mixed into the art at its edges and in its gaps   # magenta, and pink fringe (his catch: pink left on the props)
    rgba = np.dstack([s, np.where(key, 0, 255)]).astype(np.uint8)
    return rgba

INK = (36, 24, 32)                                                      # one outline colour for everything
def outline(rgba, passes=2, dark=72):
    """EVEN STROKES (his note: the sign's outline was thicker than the others): peel off the old dark edge (up to 2 pixels deep),
    then draw a fresh 1-pixel outline all round"""
    a = rgba.copy(); al = a[..., 3] > 0
    lum = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    for _ in range(passes):
        p = np.pad(al, 1); edge = al & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
        peel = edge & (lum < dark)
        if not peel.any(): break
        al = al & ~peel
    a[~al, 3] = 0
    a = np.pad(a, ((1, 1), (1, 1), (0, 0))); al = np.pad(al, 1)
    p = np.pad(al, 1); ring = ~al & (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:])
    a[ring, :3] = INK; a[ring, 3] = 255; a[al, 3] = 255
    return a

def loop(rgba, blend=24):
    """make a strip tile: cut where the far end looks most like the start, then fade the last columns into the first ones"""
    w = rgba.shape[1]
    best, bi = 1e18, w
    for e in range(w - 120, w - 4):                                    # which column to end on
        d = np.abs(rgba[:, e].astype(int) - rgba[:, 0].astype(int)).sum()
        if d < best: best, bi = d, e
    t = rgba[:, :bi].copy()
    n = min(blend, bi // 4)
    for k in range(n):                                                  # fade (dithered, so it stays pixel art)
        f = (k + 1) / (n + 1)
        rows = (np.arange(t.shape[0]) * 7 + k * 3) % 8 < f * 8
        t[rows, bi - n + k] = t[rows, k]
    return t

def save(rgba, name):
    Image.fromarray(rgba).save(OUT + name + '.png'); return rgba.shape[1], rgba.shape[0]

def parts(name, px=PX, minpx=40, scale=1.0):
    """split a sheet on magenta into one picture per thing (left to right, top to bottom)"""
    rgba = pixels(name, px)
    if scale != 1.0:
        im = Image.fromarray(rgba); rgba = np.asarray(im.resize((round(im.width * scale), round(im.height * scale)), Image.NEAREST)).copy()
    m = rgba[..., 3] > 0
    from collections import deque
    seen = np.zeros_like(m); out = []
    H, W = m.shape
    for y in range(H):
        for x in range(W):
            if m[y, x] and not seen[y, x]:
                q = deque([(y, x)]); seen[y, x] = 1; ys = [y]; xs = [x]
                while q:
                    cy, cx = q.popleft()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = 1; q.append((ny, nx)); ys.append(ny); xs.append(nx)
                if len(ys) >= minpx: out.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    # merge a box into another only when it sits mostly inside it (two things side by side stay apart)
    merged = True
    while merged:
        merged = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                a, b = out[i], out[j]
                ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
                small = min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]))
                if ix * iy > .5 * small:                                  # only a bit that sits mostly inside another
                    out[i] = (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])); out.pop(j); merged = True; break
            if merged: break
    out.sort(key=lambda b: (round(b[1] / (H / 2)), b[0]))
    return [clean(rgba[b[1]:b[3], b[0]:b[2]]) for b in out]

def clean(a):
    """drop specks: an opaque pixel with no opaque neighbour"""
    al = a[..., 3] > 0; p = np.pad(al, 1); n = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
    a = a.copy(); a[al & (n == 0), 3] = 0; return a

info = {}
for k in ('mountains', 'hills', 'road'):
    t = pixels(k)
    if k == 'road':                                                     # the road was drawn on white: the white above the grass goes
        wh = (t[..., :3].min(axis=2) > 225); keep = np.zeros_like(wh); from collections import deque   # only the white joined to the top edge: snow on the road stays
        q = deque((0, x) for x in range(wh.shape[1]) if wh[0, x])
        for y, x in q: keep[y, x] = 1
        while q:
            y, x = q.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < wh.shape[0] and 0 <= nx < wh.shape[1] and wh[ny, nx] and not keep[ny, nx]: keep[ny, nx] = 1; q.append((ny, nx))
        t[keep.astype(bool), 3] = 0
    rows = np.nonzero((t[..., 3] > 0).any(axis=1))[0]; t = t[rows[0]:]   # trim the empty rows on top
    info[k] = save(loop(t), k)
for k, sc in (('buildings', 1.0), ('trees', 1.0), ('clouds', 1.0), ('props', .5), ('buildings', .5), ('trees', .5)):
    ps = parts(k, scale=sc); n = k + ('F' if k in ('buildings', 'trees') and sc < 1 else ''); info[n] = []   # F = the far-away copies, half size
    for i, p in enumerate(ps):
        if k != 'clouds': p = outline(p)                                 # clouds keep their soft edge
        info[n].append(save(p, f'{n}{i}'))
json.dump(info, open(OUT + 'homerun.json', 'w'), indent=1)
print(json.dumps(info))
