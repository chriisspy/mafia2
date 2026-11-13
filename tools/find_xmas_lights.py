"""Find the lights on his Christmas huts (13 Nov 2026): the glowing cross over each door and the little red, green,
blue and yellow bulbs on the strings. Writes assets/xmas/lights.json: for each hut spot, a list of [x, y, kind] in
the hut frame (kind: 'c' = cross pixel, or the bulb colour as 'r','g','b','y').
How a pixel counts as a light (and why walls and roofs do not):
  * it is bright and strongly coloured, AND
  * it is much brighter than the pixels around it (a 7x7 look round), AND
  * it belongs to a SMALL blob: a bulb is 1-4 pixels, a cross 4-30 pixels in a cross shape. Painted walls, candy
    stripes and lit windows make big blobs, so they are left out.
usage: python -I tools/find_xmas_lights.py [--sheet out.png]"""
import json, sys, colorsys
import numpy as np
from PIL import Image
out = {}; sheet = []
for spot in range(10):
    im = Image.open(f'assets/xmas/cabins/cabin{spot}.png').convert('RGBA'); a = np.asarray(im).astype(float); H, W = a.shape[:2]
    op = a[..., 3] > 0; r, g, b = a[..., 0] / 255, a[..., 1] / 255, a[..., 2] / 255
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); v = mx; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hue = np.zeros_like(v)
    for y in range(H):
        for x in range(W):
            if op[y, x]: hue[y, x] = colorsys.rgb_to_hsv(r[y, x], g[y, x], b[y, x])[0] * 360
    pad = np.pad(np.where(op, v, 0), 3, mode='edge'); loc = np.zeros_like(v)
    for dy in range(7):
        for dx in range(7): loc += pad[dy:dy + H, dx:dx + W]
    loc /= 49
    cand = op & (v > .72) & (s > .38) & (v - loc > .2)
    lab = np.zeros((H, W), int); n = 0; comps = []
    for y in range(H):
        for x in range(W):
            if cand[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n; pts = []
                while st:
                    cy, cx = st.pop(); pts.append((cy, cx))
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < H and 0 <= nx < W and cand[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
                comps.append(pts)
    L = []
    # THE CROSS: every hut has one, centred over its door. Found by sliding a cross-shaped stencil over the middle of
    # the hut and keeping the spot where the stencil is brightest inside and darkest just round it (walls, roofs and
    # window panes do not have that shape). Then its own bright pixels are the light.
    best = None
    for bw in (1, 2):
        for bh in range(6, 11):
            for aw in (5, 7):
                for ar in (1, 2, 3):
                    inside = set((dy, (aw - bw) // 2 + dx) for dy in range(bh) for dx in range(bw)) | set((ar + dy, dx) for dy in range(bw) for dx in range(aw))
                    ring = set()
                    for (dy, dx) in inside:
                        for oy in (-1, 0, 1):
                            for ox in (-1, 0, 1):
                                q = (dy + oy, dx + ox)
                                if q not in inside: ring.add(q)
                    I = np.array(list(inside)); R = np.array(list(ring))
                    for y0 in range(38, 118):
                        for x0 in range(52 - aw // 2, 76 - aw // 2):
                            iy, ix = I[:, 0] + y0, I[:, 1] + x0; ry, rx = R[:, 0] + y0, R[:, 1] + x0
                            if ry.max() >= H or rx.max() >= W or ry.min() < 0 or rx.min() < 0: continue
                            vin = v[iy, ix]; warm = ((hue[iy, ix] >= 25) & (hue[iy, ix] <= 66)) | (s[iy, ix] < .3)
                            sc = vin.mean() - v[ry, rx].mean() + .3 * warm.mean() - (0 if vin.min() > .55 else 1)
                            if best is None or sc > best[0]: best = (sc, [(int(y), int(x)) for y, x in zip(iy, ix) if v[y, x] > .6])
    cross = best[1] if best else []
    L += [[x, y, 'c'] for y, x in cross]
    # THE BULBS (v2, his note: bits of wood were glowing): only true red, green and blue bulbs. No gold/yellow ones
    # (the wood highlights are gold). A bulb is 1-2 pixels, very strongly coloured, and brighter than every pixel
    # touching it.
    for pts in comps:
        if len(pts) > 2: continue
        ys = [p[0] for p in pts]; xs = [p[1] for p in pts]; hh = np.mean([hue[p] for p in pts]); sv = np.mean([s[p] for p in pts]); vv = np.mean([v[p] for p in pts])
        k = 'r' if (hh < 10 or hh > 345) and sv > .6 else 'g' if 95 <= hh <= 165 and sv > .5 else 'b' if 195 <= hh <= 250 and sv > .45 else None
        if not k or vv < .78: continue
        ring = [(y + dy, x + dx) for (y, x) in pts for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (y + dy, x + dx) not in pts and 0 <= y + dy < H and 0 <= x + dx < W]
        if any(v[q] > vv - .12 for q in ring if op[q]): continue
        if any(abs(p[1] - xs[0]) <= 2 and abs(p[0] - ys[0]) <= 2 for p in cross): continue
        L.append([int(round(np.mean(xs))), int(round(np.mean(ys))), k])
    # a real string of lights changes colour bulb to bulb: keep a bulb only if a bulb of ANOTHER colour sits close to it
    # (holly berries and red bows are red next to red, so they drop out)
    B = [q for q in L if q[2] != 'c']
    keep = [q for q in B if any(o is not q and o[2] != q[2] and abs(o[0] - q[0]) <= 7 and abs(o[1] - q[1]) <= 7 for o in B)]
    L = [q for q in L if q[2] == 'c'] + keep
    out[spot] = L
    if '--sheet' in sys.argv:
        m = im.copy(); px = m.load()
        for x, y, k in L: px[x, y] = (255, 0, 255, 255)
        sheet.append(m)
    print(spot, sum(1 for q in L if q[2] == 'c'), 'cross px,', sum(1 for q in L if q[2] != 'c'), 'bulbs')
json.dump(out, open('assets/xmas/lights.json', 'w'))
if sheet:
    w, h = sheet[0].size; s = Image.new('RGBA', (w * 5, h * 2), (40, 40, 60, 255))
    for i, m in enumerate(sheet): s.alpha_composite(m, ((i % 5) * w, (i // 5) * h))
    s.resize((s.width * 3, s.height * 3), Image.NEAREST).save(sys.argv[sys.argv.index('--sheet') + 1])
