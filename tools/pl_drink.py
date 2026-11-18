# Drinking a beer (18 Nov 2026, his ask: "make a drink animation in pixellab"). PixelLab v3 animations of HIS characters:
#   drink-sit   (east): sat on a stool, raises a beer mug, tips it, drinks, lowers it (started from the character's own sit frame)
#   drink-stand (east): the same, standing
# Each frame becomes assets/final/<name>/poses/drinksit_<right|left>_<i>.png and drink_<right|left>_<i>.png + entries in poses.json
# (left = right mirrored). Every frame gets the first frame's head pasted back (lock_head): PixelLab redraws faces, his rule is they never change. drinksit frames are lined up on the character's sit_right pose, so they sit exactly where 'sit' does.
# usage (from the game folder): python -I tools/pl_drink.py <name> [name ...]   then tools/pack_poses.py and tools/asset_versions.py
import sys, os, io, json, zipfile, urllib.request
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pl_poses import palette, clean, blob
from pl_fetch_ids import IDS
ACTS = {'drink-sit': 'drinksit', 'drink-stand': 'drink'}
MUG = np.array([(255, 242, 168), (255, 210, 94), (211, 155, 42), (255, 255, 255), (184, 214, 240), (110, 150, 200)], np.float32)   # foam, beer, dark beer, glint, glass, glass shade
def align(a, ref):
    """where ref (the sit pose) sits inside frame a: the shift with the most matching solid pixels"""
    best = (-1, 0, 0); A = a[..., 3] > 0; R = ref[..., 3] > 0; rh, rw = R.shape
    for oy in range(0, a.shape[0] - rh + 1):
        for ox in range(0, a.shape[1] - rw + 1):
            s = (A[oy:oy + rh, ox:ox + rw] & R).sum() - (A[oy:oy + rh, ox:ox + rw] ^ R).sum()
            if s > best[0]: best = (s, ox, oy)
    return best[1], best[2]
HEAD = {'sit': .60, 'stand': .52}
SWAP = {('alfa', 'drinksit'): {3: 2, 4: 5}}   # frames PixelLab spoiled (a beer splash over the face): use a neighbour instead   # how much of the sprite, from the top, is the head (chibi heads are big)
def mug_of(a, palset):
    """the mug: pixels in the mug's own colours (not ones the outfit also uses), biggest blob only"""
    m = np.zeros(a.shape[:2], bool)
    for c in MUG.astype(int):
        if tuple(c) in palset: continue
        m |= (a[..., 0] == c[0]) & (a[..., 1] == c[1]) & (a[..., 2] == c[2]) & (a[..., 3] > 0)
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if not n: return m
    return lab == (np.argmax(ndimage.sum(m, lab, range(1, n + 1))) + 1)
def lock_head(a, ref, frac, palset):
    """HIS RULE: faces never change. Paste the first frame's head back on (lined up where it matches best), then the mug on top."""
    ys, xs = np.nonzero(ref[..., 3]); top = ys.min(); hb = top + int((ys.max() - top + 1) * frac)
    hm = np.zeros(ref.shape[:2], bool); hm[top:hb + 1] = ref[top:hb + 1, :, 3] > 0
    mug = mug_of(a, palset); best = (-1e9, 0, 0); h, w = hm.shape
    for dy in range(-3, 3):
        for dx in range(-3, 4):
            sh = np.zeros_like(hm); y0, y1 = max(0, dy), min(h, h + dy); x0, x1 = max(0, dx), min(w, w + dx)
            sh[y0:y1, x0:x1] = hm[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
            refs = np.zeros_like(ref); refs[y0:y1, x0:x1] = ref[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
            same = sh & (a[..., 3] > 0) & (np.abs(a[..., :3].astype(int) - refs[..., :3].astype(int)).sum(-1) == 0)
            sc = same.sum() - 0.2 * (sh & (a[..., 3] == 0)).sum() - 0.5 * (abs(dx) + abs(dy))
            if sc > best[0]: best = (sc, dx, dy, sh, refs)
    _, dx, dy, sh, refs = best
    rows = np.zeros_like(sh); rows[:max(0, hb + dy + 1)] = True   # clear only up to the chin, never below it (that left a gap across the body)
    back = np.zeros_like(sh); back[:, :np.nonzero(sh.any(0))[0].max() - 2] = True   # behind / above the face: clear wider (the tipped-back head's outline arcs)
    out = a.copy(); clear = ((ndimage.binary_dilation(sh, iterations=2)) | (ndimage.binary_dilation(sh, iterations=5) & back)) & rows & ~mug
    out[clear] = 0; out[sh] = refs[sh]; out[mug] = a[mug]
    return out
for name in sys.argv[1:]:
    req = urllib.request.Request(f'https://api.pixellab.ai/mcp/characters/{IDS[name]}/download', headers={'User-Agent': 'curl/8.0'})
    z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(req).read()))
    out = f'assets/final/{name}/poses/'; meta = json.load(open(out + 'poses.json')); pal0 = palette(name); pal = np.concatenate([pal0, MUG]); palset = {tuple(int(v) for v in c) for c in pal0}; n = 0
    sit = np.asarray(Image.open(out + 'sit_right.png').convert('RGBA')); sm = meta['sit_right']
    frames = {}
    for f in z.namelist():
        p = f.split('/')
        if len(p) == 5 and p[1] == 'animations' and p[2] in ACTS and p[3] == 'east': frames.setdefault(p[2], []).append((int(p[4][6:9]), f))
    for anim, fl in frames.items():
        key = ACTS[anim]; fl.sort(); base = None; done = {}
        sw = SWAP.get((name, key), {}); fl = [(i, f) for i, f in fl if i not in sw] + [(i, None) for i in sw]; fl.sort(key=lambda t: (t[1] is None, t[0]))
        for i, f in fl:
            if f is None: a = done[sw[i]]; f = 'swap'
            else: a = blob(clean(np.asarray(Image.open(io.BytesIO(z.read(f))).convert('RGBA')), pal))
            if f == 'swap': pass
            elif i == 0: ref0 = a
            else: a = lock_head(a, ref0, HEAD['sit' if key == 'drinksit' else 'stand'], palset)
            if f != 'swap': done[i] = a
            if base is None:
                if key == 'drinksit':                      # line the frames up on his sit pose: same bottom, same ax
                    ox, oy = align(a, sit); g = oy + sit.shape[0] - 1; ax = ox + sm['ax']
                else:                                      # standing: the ground line and the middle of the feet, like the other actions
                    ys, xs = np.nonzero(a[..., 3]); g = ys.max(); fx = np.nonzero(a[g - 1:g + 1, :, 3].any(0))[0]; ax = (fx.min() + fx.max() + 1) / 2
                base = (g, ax)
            g, ax = base
            ys, xs = np.nonzero(a[..., 3]); x0, x1, y0 = xs.min(), xs.max() + 1, ys.min(); y1 = g + 1
            crop = a[y0:y1, x0:x1]
            Image.fromarray(crop).save(f'{out}{key}_right_{i}.png'); meta[f'{key}_right_{i}'] = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': float(ax - x0)}
            Image.fromarray(crop[:, ::-1].copy()).save(f'{out}{key}_left_{i}.png'); meta[f'{key}_left_{i}'] = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': float((x1 - x0) - (ax - x0))}
            n += 1
    json.dump(meta, open(out + 'poses.json', 'w'), indent=1); print(name, n, 'frames', {k: len(v) for k, v in frames.items()})
