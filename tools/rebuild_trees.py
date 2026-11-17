"""EVERY TREE IS ONE OF HIS (18 Nov 2026, his note: "fix all of the harsh cut outs of the trees ... and replace them with the
trees i made", "edge forest stays the same", "the pathway cuts off abruptly, lets fix that to be a straight edge line",
"remove the big tree that i am standing on and make that a smaller tree").
The earlier tools lifted 77 trees and left pieces of others half cut. This starts again from the whole map:
  1. finds EVERY tree and bush on the day map (leaves, pine needles, trunks, the snow on them, and their grey shadows), except
     the dark forest in the top corners and whatever grows into it (that stays painted on, exactly as it is);
  2. takes them all off the ground, day and night, and fills the ground in (snow stays snow, in his snow colours);
  3. blends the joins of the bigger map (day: the painter's version mixed in, in thinning blobs; night: one colour fit + a fade),
     straightens the top of the pond path, and tidies little leftovers;
  4. puts one of HIS cut-outs (mafia2-art/plants-and-trees-cut-out-smaller.png, shrunk to map size, see-through shadows) on every
     tree it took off: a trunk = a pine (tall or small by how tall the tree was), no trunk = a bush (by its width); anything big
     still uncovered gets one more. No tall tree in front of the Tavern or Casino doors, nothing on the buildings.
Writes assets/xmas/day-big.webp, night-big.webp, block-big.png, trees.png, trees-night.png, trees.json
[sheet x, sheet y, w, h, map x, map y, base y, foot x, foot half-width, kind]  (map picture px; his town at 120, 0).
Run:  python -I tools/rebuild_trees.py   (from the game folder).  Add  preview  to only write mafia2-art/bigmap/rebuild-preview.png"""
import json, sys
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
ART = '../mafia2-art/'; BIG = ART + 'bigmap/'; X = 'assets/xmas/'
PREVIEW = len(sys.argv) > 1 and sys.argv[1] == 'preview'
H, W, OX, W0, H0 = 1000, 800, 120, 560, 750
YY, XX = np.mgrid[0:H, 0:W]
centre = np.zeros((H, W), bool); centre[:H0, OX:OX + W0] = True
BUILDINGS = [(-54 + OX, 743, 174, 134), (426 + OX, 743, 174, 134)]          # the Tavern and the Casino (map picture px)
SHADOW = (18, 28, 58, 96)
rng = np.random.RandomState(7)

def shrink(path, cache):
    try: return np.asarray(Image.open(cache).convert('RGB'))
    except FileNotFoundError: pass
    a = np.asarray(Image.open(path).convert('RGB')); sy, sx = a.shape[0] / H, a.shape[1] / W
    xs = [(int(round((x + .3) * sx)), int(round((x + .7) * sx)) + 1) for x in range(W)]
    ys = [(int(round((y + .3) * sy)), int(round((y + .7) * sy)) + 1) for y in range(H)]
    out = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        row = a[ys[y][0]:ys[y][1]]
        for x in range(W): out[y, x] = np.median(row[:, xs[x][0]:xs[x][1]].reshape(-1, 3), axis=0)
    Image.fromarray(out).save(cache); return out
def big(m, s): return nd.binary_dilation(m, iterations=s) if s > 0 else m
def keep_big(m, n):
    l, k = nd.label(m); s = nd.sum(m, l, range(1, k + 1)); return np.isin(l, [i + 1 for i, z in enumerate(s) if z >= n])

# ================= 1. every tree on the day map =================
day = np.asarray(Image.open(BIG + 'day-big-with-trees.png').convert('RGB')); d = day.astype(int)
r, g, b = d[..., 0], d[..., 1], d[..., 2]
grass = (g > r + 30) & (g > b + 30) & (g > 100)
water = nd.binary_closing(nd.binary_opening((b > g + 25) & (g > r + 15) & (r < 125) & (b > 120), iterations=2), iterations=3); water = keep_big(water, 400)
wall = keep_big(nd.binary_opening((r < 48) & (g < 82) & (b < 80), iterations=4), 3000)       # the dark forest in the top corners
cob = (r > 95) & (r > b + 10) & (g > b) & (r - g < 55) & (r - g > 5) & (r + g + b > 250) & (r + g + b < 560)
paved = keep_big(nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(cob, iterations=1), iterations=3)), 1500)
leaf = (r < 130) & (g > r + 10) & (b < 200) & ~grass
trunk = (r > g + 22) & (g > b + 12) & (r > 70) & (r < 215) & (b < 120)
needle = (b > r + 20) & (r < 90) & (g < 140)
stage = ((XX - 400) / 62.) ** 2 + ((YY - 376) / 42.) ** 2 < 1
ex = paved | stage | water; ex[430:462, 690:762] = True; ex[465:525, 45:95] = True          # cobbles, the stage, water, the jetty, the snowman
T = nd.binary_fill_holes(nd.binary_closing((leaf | trunk | needle) & ~big(wall, 2) & ~ex, iterations=2))
T &= ~big(ex, 1); T = keep_big(nd.binary_opening(T, iterations=1), 40)
l, k = nd.label(T)                                                     # the brown rims of the puddles are not trees
for i, sl in enumerate(nd.find_objects(l), 1):
    m = l[sl] == i
    if (leaf | needle)[sl][m].mean() < .25 and m.sum() < 400: T[sl][m] = False
# whatever touches the dark corner forest is part of it: stays painted on, as it is
l, k = nd.label(T); touch = set(np.unique(l[big(wall, 4) & (l > 0)]))
KEEP = big(wall, 2) | np.isin(l, list(touch - {0}))
REM = T & ~KEEP
lum = d.mean(-1); sat = np.abs(d - d.mean(-1, keepdims=True)).max(-1)
shadowpx = (sat < 26) & (lum > 95) & (lum < 215) & big(REM, 12) & ~big(KEEP, 2) & ~ex      # the grey shadows under them
R = (big(REM, 1) | shadowpx) & ~ex & ~KEEP
R = nd.binary_closing(R, iterations=1) & ~ex & ~KEEP
print('tree pixels to take off:', int(R.sum()))

# ================= 2. the day ground without them =================
snow = (r > 140) & (g > 175) & (b > 205)
pal_src = Image.fromarray(day[~big(R, 2)].reshape(-1, 1, 3)).quantize(48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
fill = cv2.inpaint(day, (R * 255).astype(np.uint8), 6, cv2.INPAINT_TELEA)
fill = cv2.medianBlur(fill, 5)
snapped = np.asarray(Image.fromarray(fill).quantize(palette=pal_src, dither=Image.Dither.NONE).convert('RGB'))
day_g = day.copy(); day_g[R] = snapped[R]

# ================= 3a. the joins (day), the pond path, little leftovers =================
SEAM = 34
dist_in = np.minimum.reduce([XX - OX, OX + W0 - 1 - XX, (H0 - 1 - YY) + 0 * XX]).astype(float)
def kind_of(a):
    a = a.astype(int); r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]; k_ = np.zeros(a.shape[:2], np.uint8)
    k_[(r_ > 140) & (g_ > 175) & (b_ > 205)] = 1; k_[(g_ > r_ + 30) & (g_ > b_ + 30) & (g_ > 100)] = 2
    k_[(r_ < 70) & (g_ < 110) & (b_ < 110)] = 3; k_[(r_ > 120) & (r_ > b_ + 18) & (g_ > b_) & (r_ - g_ < 45) & (r_ + g_ + b_ > 330)] = 4
    return k_
AI_D = shrink(BIG + 'bigmap-src.png', BIG + 'bigmap-src-800.png')
blob = nd.gaussian_filter(rng.rand(H, W), 1.3); blob = (blob - blob.min()) / (blob.max() - blob.min())
take = centre & (dist_in < SEAM) & (kind_of(AI_D) == kind_of(day_g)) & (kind_of(day_g) == 1) & (blob < 1 - dist_in / SEAM) & ~big(T, 3)
day_g[take] = AI_D[take]
def straighten(img):
    """the top of the pond path: a straight edge (his note); the stub of cobbles and the grass tongue above it become snow"""
    img[716:754, 386:414] = img[716:754, 360:388]
    return img
day_g = straighten(day_g)
k_ = kind_of(day_g); grey = (np.abs(day_g.astype(int) - day_g.astype(int).mean(-1, keepdims=True)).max(-1) < 22) & (day_g.mean(-1) > 105) & (day_g.mean(-1) < 212)
odd = ((k_ == 0) | (k_ == 3) | grey) & ~ex & ~KEEP
small = keep_big(odd, 1) & ~keep_big(odd, 70)
fix = small & (nd.uniform_filter((k_ == 1).astype(float), 9) > .6)
ix = nd.distance_transform_edt(fix | ~(k_ == 1), return_distances=False, return_indices=True)
day_g[fix] = day_g[ix[0], ix[1]][fix]

# ================= 2b + 3b. night =================
his_n = np.asarray(Image.open(X + 'night.png').convert('RGB'))
NI = shrink(BIG + 'night-notrees-src.png', BIG + 'night-notrees-800.png')
night = NI.copy(); night[:H0, OX:OX + W0] = his_n
nl = night.astype(int).mean(-1)
water_n = big(water, 6)
ground_n = big(water, 6) | big(paved, 4) | big(keep_big(kind_of(day) == 4, 300), 4) | big(ex, 3)     # the lake, paths, dirt plots, jetty: dark at night, not trees
dark_out = ~centre & (nl < 78) & ~ground_n & ~big(KEEP, 6)
dark_out = keep_big(nd.binary_fill_holes(nd.binary_closing(dark_out, iterations=2)), 60)
Rn = ((big(R, 3) & centre & ~big(KEEP, 1)) | big(dark_out, 2) | (big(R, 2) & ~centre)) & ~(ground_n & ~big(R, 2))
Rn &= ~(big(KEEP, 1) & centre)
night_c = cv2.inpaint(night, (Rn * 255).astype(np.uint8), 9, cv2.INPAINT_TELEA)
night_c = straighten(night_c)
NSEAM = 56
fitm = centre & (dist_in > 4) & (dist_in < 120) & ~big(Rn | KEEP, 4)
NIc = night_c.astype(float)
coef = np.linalg.lstsq(np.c_[NIc[fitm] * 0 + NI[fitm], np.ones(fitm.sum())], night_c[fitm].astype(float), rcond=None)[0]
NI_clean = cv2.inpaint(NI, ((Rn | big(dark_out, 2)) * 255).astype(np.uint8), 9, cv2.INPAINT_TELEA)
NIfit = np.clip(np.c_[NI_clean.reshape(-1, 3), np.ones(H * W)] @ coef, 0, 255).reshape(H, W, 3)
w_ = np.where(centre, np.clip(1 - dist_in / NSEAM, 0, 1), 1.)[..., None]
w_ = w_ * ~(big(KEEP, 2) & centre)[..., None]
night_g = np.round(night_c * (1 - w_) + NIfit * w_).astype(np.uint8)

# ================= 4. his trees on every tree that was taken off =================
src = np.asarray(Image.open(ART + 'plants-and-trees-cut-out-smaller.png').convert('RGBA')).astype(int)
lab, n = nd.label(src[..., 3] > 0); boxes = sorted([sl for i, sl in enumerate(nd.find_objects(lab), 1) if (lab[sl] == i).sum() > 20], key=lambda s: s[1].start)
NAMES = ['plant', 'widebush', 'smallpine', 'roundbush', 'tallpine']
P = (boxes[4][0].stop - boxes[4][0].start) / 82.
VAR = {}
for name, sl in zip(NAMES, boxes):
    a = src[sl]; h, w = a.shape[:2]; gh, gw = int(round(h / P)), int(round(w / P)); o = np.zeros((gh, gw, 4), np.uint8)
    for gy in range(gh):
        for gx in range(gw): o[gy, gx] = a[min(h - 1, int((gy + .5) * P)), min(w - 1, int((gx + .5) * P))]
    o[..., 3] = np.where(o[..., 3] > 127, 255, 0); ys, xs = np.nonzero(o[..., 3]); o = o[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    hh = o.shape[0]; grey = (o[..., 3] > 0) & (np.abs(o[..., :3].astype(int) - (162, 164, 179)).sum(-1) < 45); grey[:int(hh * .7)] = False
    solid = (o[..., 3] > 0) & ~grey; o[grey] = SHADOW
    sy, sx = np.nonzero(solid); base = sy.max() + 1; foot = np.nonzero(solid[max(0, base - 5):base].any(0))[0]
    VAR[name] = dict(img=o, solid=solid, base=int(base), fx=int(round(foot.mean())), fw=int(np.clip((foot.max() - foot.min()) / 2, 3, 11)))

placed = []                                                            # (kind, foot x, base y)
lr, kr = nd.label(REM)
tk = nd.binary_opening(trunk & REM, iterations=1)
for i, sl in enumerate(nd.find_objects(lr), 1):
    m = lr[sl] == i
    if m.sum() < 60: continue
    tl, tn = nd.label(tk[sl] & m); feet = []
    for j, s2 in enumerate(nd.find_objects(tl), 1):
        mm = tl[s2] == j
        if mm.sum() < 10: continue
        ys, xs = np.nonzero(mm); feet.append((int(round(xs.mean())) + s2[1].start + sl[1].start, int(ys.max()) + s2[0].start + sl[0].start + 1))
    feet.sort()
    merged = []                                                        # two trunk bits a few px apart are one tree
    for f in feet:
        if merged and abs(f[0] - merged[-1][0]) < 9: merged[-1] = (merged[-1][0], max(merged[-1][1], f[1]))
        else: merged.append(f)
    if merged:
        for fx, fb in merged:
            col = m[:, max(0, fx - sl[1].start - 7):fx - sl[1].start + 8]; rows = np.nonzero(col.any(1))[0]
            hgt = fb - (rows.min() + sl[0].start) if len(rows) else 40
            placed.append(('tallpine' if hgt >= 52 else 'smallpine', fx, fb))
    else:
        ys, xs = np.nonzero(m); x0, x1 = xs.min(), xs.max() + 1; wd = x1 - x0; parts = max(1, int(round(wd / 44)))
        for p_ in range(parts):
            a0 = x0 + wd * p_ // parts; a1 = x0 + wd * (p_ + 1) // parts; cm = m[:, a0:a1]; rows = np.nonzero(cm.any(1))[0]
            if not len(rows): continue
            fb = rows.max() + sl[0].start + 1; pw = a1 - a0
            placed.append(('widebush' if pw >= 38 else 'roundbush' if pw >= 22 else 'plant', (a0 + a1) // 2 + sl[1].start, fb))
def cover():
    c = np.zeros((H, W), bool)
    for kd, fx, fb in placed:
        v = VAR[kd]; x, y = fx - v['fx'], fb - v['base']; h, w = v['solid'].shape
        ys, xs = np.nonzero(v['solid']); ty, tx = ys + y, xs + x; ok = (ty >= 0) & (ty < H) & (tx >= 0) & (tx < W); c[ty[ok], tx[ok]] = True
    return c
for _ in range(3):                                                     # big pieces of a tree still uncovered: one more
    left = nd.binary_opening(REM & ~big(cover(), 2), iterations=2); ll, lk = nd.label(left); added = 0
    for i, sl in enumerate(nd.find_objects(ll), 1):
        m = ll[sl] == i
        if m.sum() < 260: continue
        ys, xs = np.nonzero(m); fx = int(round(xs.mean())) + sl[1].start; fb = ys.max() + sl[0].start + 1; hh = ys.max() - ys.min()
        edge = fx < 135 or fx > 665 or fb > 880
        placed.append(('tallpine' if (edge or hh > 50) else 'widebush' if xs.max() - xs.min() > 34 else 'roundbush', fx, fb)); added += 1
    if not added: break
# nothing on the buildings; no tall tree in front of their doors (his note: the big tree he stood on at the Tavern)
out = []
for kd, fx, fb in placed:
    if any(bx + 4 < fx < bx + bw - 4 and by + 20 < fb < by + bh + 2 for bx, by, bw, bh in BUILDINGS): continue
    for bx, by, bw, bh in BUILDINGS:
        if kd == 'tallpine' and abs(fx - (bx + 87)) < 52 and by + bh < fb < by + bh + 90: kd = 'smallpine'
    out.append((kd, fx, fb))
placed = out
print('trees placed:', {q: sum(1 for p in placed if p[0] == q) for q in NAMES})

# ================= sheets, the list, the walls =================
def nightify(a):
    o = a.astype(float).copy(); r_, g_, b_ = o[..., 0], o[..., 1], o[..., 2]
    bulb = (((r_ > 190) & (g_ < 120)) | ((b_ > 190) & (r_ < 120) & (g_ < 170)) | ((r_ > 200) & (g_ > 170) & (b_ < 110))) & (a[..., 3] == 255)
    dark = np.stack([r_ * .22 + 4, g_ * .30 + 10, b_ * .46 + 30], -1)
    o[..., :3] = np.where(bulb[..., None], o[..., :3] * .9, dark); o[a[..., 3] < 255] = a[a[..., 3] < 255]
    return o.clip(0, 255).astype(np.uint8)
pos = {}; px_ = 0; sh_h = max(v['img'].shape[0] for v in VAR.values())
sheet = np.zeros((sh_h, sum(v['img'].shape[1] + 1 for v in VAR.values()), 4), np.uint8)
for nm, v in VAR.items():
    h, w = v['img'].shape[:2]; sheet[:h, px_:px_ + w] = v['img']; pos[nm] = (px_, 0); px_ += w + 1
items = []
for kd, fx, fb in placed:
    v = VAR[kd]; h, w = v['img'].shape[:2]
    items.append([pos[kd][0], 0, w, h, int(fx - v['fx']), int(fb - v['base']), int(fb), int(fx), v['fw'], kd])
items.sort(key=lambda t: t[6])
def compose(ground, sh):
    c = Image.fromarray(ground).convert('RGBA'); s = Image.fromarray(sh)
    for sx_, sy_, w, h, x, y, base, fx, fw, kd in items:
        c.alpha_composite(s.crop((sx_, sy_, sx_ + w, sy_ + h)), (max(0, x), max(0, y)), (max(0, -x), max(0, -y), w, h))
    return c.convert('RGB')
dp = compose(day_g, sheet); npv = compose(night_g, nightify(sheet))
o = Image.new('RGB', (W * 2 + 10, H)); o.paste(dp, (0, 0)); o.paste(npv, (W + 10, 0)); o.save(BIG + 'rebuild-preview.png')
if PREVIEW: sys.exit()
# THE WALK MASK (18 Nov, his note: "a lot that stops walking annoyingly ... make sure its clean"). Only real things block:
# the lake and the pond, the dark corner forest, his picket fences and the presents by the stage (from his own mask),
# never a puddle, never an old tree shape (each of his trees blocks only its foot, in the game, like a lamp post).
his_m = np.zeros((H, W), bool); his_m[:H0, OX:OX + W0] = np.asarray(Image.open(X + 'block.png').convert('L')) > 127
hl, hk = nd.label(his_m); keep_his = np.zeros((H, W), bool)
for i, sl in enumerate(nd.find_objects(hl), 1):
    m = hl[sl] == i; px = d[sl][m]; n_ = m.sum()
    treey = R[sl][m].mean() > .25 or KEEP[sl][m].mean() > .25
    icy = ((px[:, 2] > 190) & (px[:, 0] > 120)).mean() > .45 or (((px[:, 0] > px[:, 2] + 18) & (px[:, 1] > px[:, 2])).mean() > .3 and n_ > 150)   # a puddle: ice, or its brown rim
    hh = sl[0].stop - sl[0].start; ww = sl[1].stop - sl[1].start
    fence = hh <= 16 and ww >= 2 * hh                                   # the picket fences: long and low
    near_stage = ((sl[1].start + sl[1].stop) / 2 - 400) ** 2 / 90 ** 2 + ((sl[0].start + sl[0].stop) / 2 - 380) ** 2 / 60 ** 2 < 1
    if (fence or near_stage) and not treey: keep_his[sl] |= m
    elif not treey and not icy and n_ < 120: keep_his[sl] |= m          # small odd bits he painted on purpose
block = keep_his | KEEP | nd.binary_erosion(water, iterations=2)
block = keep_big(block, 12)                                             # no single stray pixels
# little closed-in pockets you could never walk out of become solid; little holes in a wall too
free = ~block; fl, fk = nd.label(free); fs = nd.sum(free, fl, range(1, fk + 1)); main = 1 + int(np.argmax(fs))
block |= free & (fl != main) & np.isin(fl, [i + 1 for i, z in enumerate(fs) if z < 400])
block[430:462, 690:762] = False                                         # the jetty
Image.fromarray(sheet).save(X + 'trees.png', optimize=True); Image.fromarray(nightify(sheet)).save(X + 'trees-night.png', optimize=True)
json.dump(items, open(X + 'trees.json', 'w'), separators=(',', ':'))
Image.fromarray(day_g).save(X + 'day-big.webp', lossless=True, quality=100, method=6)
Image.fromarray(night_g).save(X + 'night-big.webp', lossless=True, quality=100, method=6)
Image.fromarray((block * 255).astype(np.uint8)).save(X + 'block-big.png', optimize=True)
print('written:', len(items), 'trees')
