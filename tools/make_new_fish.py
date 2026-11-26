"""THE NEW FISH (26 Nov 2026, his list): 19 more catches, the Glimmer Koi, and the Gold Fish Plaque.
Art: Higgsfield Nano Banana Pro, with a sheet of the game's OWN fish (8x, on magenta: ref-fish-8x.png) as the image reference, so it
copies their outline, shading and pixel size. Sources are kept as they came in  ../mafia2-art/fishing/new-fish/  (several catches to a
sheet, on flat magenta). This cuts them the way tools/make_buildings.py cuts Nano Banana's buildings: find the sheet's pixel grid, take the
middle colour of every cell, cut the magenta away; then each catch is its own blob, centred in a 48 x 32 cell like every other fish.
  ../mafia2-art/fishing/pl/<id>.png   one 48 x 32 picture each (where tools/make_fishing_art.py reads its fish from)
  assets/fishing/fish.png             the sheet the game draws from: the old cells are kept AS THEY ARE, the new ones go on the end
  assets/fishing/bait-glim.png        the Glimmer Bait's icon: Joe's bait icon, recoloured pale blue
  assets/decor/goldfishplaque.png     the Gold Fish Plaque (a wall decoration)
Run from the mafia2 folder:  python -I tools/make_new_fish.py [check.png]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = '../mafia2-art/fishing/new-fish/'; PL = '../mafia2-art/fishing/pl/'; OUT = 'assets/fishing/'
OLD = 26                      # the cells already in fish.png before today (boot ... sword): never redrawn here
# the new cells, in the order they are added to FISHES (fishing.js) and FISH_ORDER (make_fishing_art.py). ONLY ADD AT THE END.
NEW = ['bream', 'flathead', 'mackerel', 'snapper', 'murraycod', 'tuna', 'barra', 'trolley', 'thong', 'singbass', 'cannon', 'hammer',
       'duck', 'ravecrab', 'nessie', 'megtooth', 'kraken', 'glimkoi']
# where each one is cut from: id -> (sheet, its middle on the sheet as a share of the width and height, options)
#   P     the sheet's pixel size when it is not the usual 14.15 (Nano Banana drew sheet-e bigger)
#   join  loose bits this close belong to it too (the cannon's smoke)        top   rows shaved off the top (the disco ball's string)
#   half  drawn at twice the size: every 2 x 2 block becomes one pixel, and the dark line is put back round it
#   turn  quarter turns (the thong was drawn toe up; it lies toe left)       crumbs  loose bits smaller than this go (sparkles)
# REJECTED, angled or 3/4 views (his rule): the thong on sheet-b and sheet-g, the tooth on sheet-g, the hammerheads on sheet-b and sheet-f.
PICK = {
    'bream': ('sheet-g', .37, .84, {}), 'flathead': ('sheet-a', .50, .17, {}), 'mackerel': ('sheet-a', .83, .17, {}),
    'snapper': ('sheet-g', .88, .84, {}), 'murraycod': ('sheet-a', .50, .52, {}), 'tuna': ('sheet-g', .62, .84, {}),
    'barra': ('sheet-b', .18, .17, {}), 'trolley': ('sheet-g', .12, .50, {}), 'thong': ('sheet-e', .25, .50, {'P': 21.2, 'half': 1, 'turn': 1}),
    'singbass': ('sheet-g', .62, .50, {}), 'cannon': ('sheet-b', .46, .73, {}), 'hammer': ('sheet-e', .74, .48, {'P': 21.2}),
    'duck': ('sheet-g', .12, .17, {}), 'ravecrab': ('sheet-g', .38, .20, {'join': 4, 'top': 3, 'crumbs': 12}), 'nessie': ('sheet-g', .63, .17, {}),
    'megtooth': ('sheet-d', .16, .50, {}), 'kraken': ('sheet-d', .50, .50, {}), 'glimkoi': ('sheet-d', .84, .50, {}),
    'goldfishplaque': ('sheet-g', .88, .50, {'big': 1})}
FLIP = set()
NAVY = (17, 22, 51)


def is_bg(s):
    s = s.astype(int); r, g, b = s[..., 0], s[..., 1], s[..., 2]
    return (r > 150) & (b > 150) & (g < np.minimum(r, b) - 45)


def pitch_of(a):
    """the sheet's pixel size: the step at which the most colour changes fall on the same phase (make_buildings.py's idea, the step found too)"""
    best = None
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 60).sum(axis=0 if axis == 1 else 1).astype(float)
        for P in np.arange(9, 34, .05):
            ph = np.floor((np.arange(len(d)) % P) / P * 20).astype(int); h = np.bincount(ph, weights=d, minlength=20); sc = h.max() / max(1, h.sum())
            if best is None or sc > best[0] + (.03 if P > best[1] * 1.5 else 0): best = (sc, P)   # a multiple of the true step scores nearly as well: keep the smaller
    return best[1]


def small_of(a, P):
    out = []
    for axis in (1, 0):
        d = (np.abs(np.diff(a.astype(int), axis=axis)).sum(-1) > 60).sum(axis=0 if axis == 1 else 1).astype(float)
        ph = np.floor(((np.arange(len(d)) + 1) % P) / P * 40).astype(int); h = np.bincount(ph, weights=d, minlength=40); out.append(np.argmax(h) / 40 * P)
    ox, oy = out; W = int((a.shape[1] - ox) // P); H = int((a.shape[0] - oy) // P); s = np.zeros((H, W, 3), np.uint8); m = P * .28
    for y in range(H):
        for x in range(W):
            c = a[int(round(oy + y * P + m)):int(round(oy + (y + 1) * P - m)), int(round(ox + x * P + m)):int(round(ox + (x + 1) * P - m))].reshape(-1, 3)
            s[y, x] = np.median(c, axis=0)
    return s


def blob_at(s, fx, fy, join=0):
    """the catch whose middle is nearest (fx, fy) of the sheet -> its rgba crop"""
    fg = ~is_bg(s); lab, n = nd.label(fg, structure=np.ones((3, 3))); H, W = fg.shape; best = None
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < 40: continue
        d = np.hypot((xs.min() + xs.max()) / 2 - fx * W, (ys.min() + ys.max()) / 2 - fy * H)
        if best is None or d < best[0]: best = (d, i)
    m = lab == best[1]
    if join: m = np.isin(lab, np.unique(lab[nd.binary_dilation(m, iterations=join) & fg]))
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    c = np.dstack([s[y0:y1, x0:x1], np.where(m[y0:y1, x0:x1], 255, 0).astype(np.uint8)]); c[c[..., 3] == 0] = 0; return c


def trim(c):
    ys, xs = np.nonzero(c[..., 3]); return c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def crumbs(c, least):
    a = c.copy(); lab, n = nd.label(a[..., 3] > 0)
    for i in range(1, n + 1):
        if (lab == i).sum() < least: a[lab == i] = 0
    return trim(a)


def halve(c):
    """a thing drawn at twice the size: each 2 x 2 block becomes its commonest colour (see-through when half of it is), then the navy line goes back round the edge"""
    h, w = c.shape[0] // 2 * 2, c.shape[1] // 2 * 2; out = np.zeros((h // 2, w // 2, 4), np.uint8)
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            b = c[y:y + 2, x:x + 2].reshape(-1, 4); o = b[b[:, 3] > 0]
            if len(o) >= 2:
                lum = o[:, :3].astype(int).sum(1); out[y // 2, x // 2] = o[np.argsort(lum)[len(o) // 2]]   # the middle one by brightness: the line does not swallow the fill
    m = out[..., 3] > 0; edge = m & ~nd.binary_erosion(m, structure=np.ones((3, 3)), border_value=0); out[edge, :3] = NAVY; return trim(out)


def squeeze(c, w=48, h=32):
    """a few pixels too long or too tall for the cell: the rows and columns that are most like their neighbour are taken out one at a time (never
    the ends), so every pixel left is one Nano Banana drew: nothing is blurred or resampled"""
    a = c.copy(); took = [0, 0]
    for axis, lim in ((1, w), (0, h)):
        while a.shape[axis] > lim:
            v = a.astype(int) if axis == 0 else a.astype(int).transpose(1, 0, 2); n = v.shape[0]
            d = np.abs(v[1:] - v[:-1]).sum((1, 2)).astype(float) + np.abs(v[2:].sum((1, 2)) * 0 if n < 3 else 0)
            d[0] = d[-1] = 1e12; lo = int(n * .12); d[:lo] += 1e6; d[n - 1 - lo:] += 1e6     # heads and tails keep their shape: take from the body
            i = int(np.argmin(d)) + 1; a = np.delete(a, i, axis=axis); took[axis] += 1
    return a, took


def tidy(c, colours=28):
    """hard edges, a small palette (the old fish have 6 to 41 colours), loose crumbs gone"""
    a = c.copy(); m = a[..., 3] > 0
    lab, n = nd.label(m, structure=np.ones((3, 3)))
    if n > 1:
        sz = nd.sum(m, lab, range(1, n + 1))
        for i, v in enumerate(sz):
            if v < 3: a[lab == i + 1] = 0
    m = a[..., 3] > 0; rgb = Image.fromarray(a[..., :3]).quantize(colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    a[..., :3] = np.asarray(rgb); a[~m] = 0; return a


def cell(c, w=48, h=32):
    if c.shape[1] > w or c.shape[0] > h: raise SystemExit(f'too big for a {w} x {h} cell: {c.shape[1]} x {c.shape[0]}')
    out = np.zeros((h, w, 4), np.uint8); x = (w - c.shape[1]) // 2; y = (h - c.shape[0]) // 2; out[y:y + c.shape[0], x:x + c.shape[1]] = c; return out


SMALL = {}
def small(sheet, P):
    if sheet not in SMALL: SMALL[sheet] = small_of(np.asarray(Image.open(SRC + sheet + '.png').convert('RGB')), P)
    return SMALL[sheet]


def main():
    got = {}
    for k, (sheet, fx, fy, o) in PICK.items():
        c = blob_at(small(sheet, o.get('P', 14.15)), fx, fy, o.get('join', 0))
        if o.get('top'): c = trim(c[o['top']:])
        if o.get('crumbs'): c = crumbs(c, o['crumbs'])
        if o.get('half'): c = halve(c)
        if o.get('turn'): c = np.rot90(c, o['turn'])
        was = (c.shape[1], c.shape[0]); took = [0, 0]
        if not o.get('big'): c, took = squeeze(c)
        got[k] = np.ascontiguousarray(c); print(f'{k:15} {sheet}  {was[0]} x {was[1]}' + (f'  -> {c.shape[1]} x {c.shape[0]} (took {took[1]} columns, {took[0]} rows)' if sum(took) else ''))
    old = np.asarray(Image.open(OUT + 'fish.png').convert('RGBA'))[:, :OLD * 48]
    sheet = np.zeros((32, 48 * (OLD + len(NEW)), 4), np.uint8); sheet[:, :OLD * 48] = old
    for i, k in enumerate(NEW):
        c = tidy(got[k]);
        if k in FLIP: c = c[:, ::-1]
        c = cell(c); Image.fromarray(c).save(PL + k + '.png'); sheet[:, (OLD + i) * 48:(OLD + i + 1) * 48] = c
    Image.fromarray(sheet).save(OUT + 'fish.png', optimize=True)
    pq = tidy(got['goldfishplaque'], 24); Image.fromarray(pq).save('assets/decor/goldfishplaque.png', optimize=True); print('plaque', pq.shape[1], 'x', pq.shape[0])
    # the Glimmer Bait: Joe's worm, in the Glimmerkin's pale blue (dark line kept)
    b = np.asarray(Image.open(OUT + 'bait.png').convert('RGBA')).copy(); m = b[..., 3] > 0; lum = b[..., :3].astype(float).mean(-1)
    ramp = np.array([(18, 32, 84), (58, 120, 214), (126, 196, 255), (214, 240, 255), (255, 255, 255)], float)
    v = lum[m]; lo, hi = v.min(), v.max(); t = (lum - lo) / max(1, hi - lo) * (len(ramp) - 1); i0 = np.clip(np.floor(t).astype(int), 0, len(ramp) - 2); f = (t - i0)[..., None]
    b[..., :3] = np.where(m[..., None], (ramp[i0] * (1 - f) + ramp[i0 + 1] * f).round(), 0); Image.fromarray(b).save(OUT + 'bait-glim.png', optimize=True)
    if len(sys.argv) > 1:                                  # every catch, old and new, side by side at game scale x4 on the catch card's blue
        n = OLD + len(NEW); cols = 9; K = 4; rows = (n + cols - 1) // cols
        sh = Image.new('RGBA', (cols * 48 * K, rows * 32 * K + 48 * K), (43, 79, 156, 255)); im = Image.fromarray(sheet)
        for i in range(n): sh.alpha_composite(im.crop((i * 48, 0, i * 48 + 48, 32)).resize((48 * K, 32 * K), Image.NEAREST), ((i % cols) * 48 * K, (i // cols) * 32 * K))
        sh.alpha_composite(Image.fromarray(pq).resize((pq.shape[1] * K, pq.shape[0] * K), Image.NEAREST), (8, rows * 32 * K + 4))
        sh.alpha_composite(Image.fromarray(b).resize((16 * K, 16 * K), Image.NEAREST), (pq.shape[1] * K + 40, rows * 32 * K + 20)); sh.save(sys.argv[1])
    print('fish.png', sheet.shape[1] // 48, 'cells')


if __name__ == '__main__': main()
