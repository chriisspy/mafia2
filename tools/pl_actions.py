# Acting poses for the night films (13 Nov 2026): PixelLab v3 animations of HIS characters, turned into game poses.
#   mafia : stab (east, north, south; a small silver knife), point (east), argue (east)
#   skins : scared (east): jumps back, arms up
# Each frame becomes assets/final/<name>/poses/<anim>_<right|left|back|front>_<i>.png and an entry in poses.json
# (left = right mirrored). Existing poses are left alone: this only ADDS files and keys.
# usage (from the game folder): python -I tools/pl_actions.py <name> [name ...]
import sys, os, io, json, zipfile, urllib.request
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pl_poses import palette, clean, blob
from pl_fetch_ids import IDS
ACTS = {'stab': {'east': 'right', 'north': 'back', 'south': 'front'}, 'point': {'east': 'right'}, 'argue': {'east': 'right'}, 'scared': {'east': 'right'}}
KNIFE = np.array([(236, 242, 250), (176, 196, 216), (120, 140, 168)], np.float32)   # the blade: light, mid, shade
for name in sys.argv[1:]:
    req = urllib.request.Request(f'https://api.pixellab.ai/mcp/characters/{IDS[name]}/download', headers={'User-Agent': 'curl/8.0'})
    z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(req).read()))
    out = f'assets/final/{name}/poses/'; meta = json.load(open(out + 'poses.json')); pal0 = palette(name); n = 0
    for f in sorted(z.namelist()):
        p = f.split('/')
        if not (len(p) == 5 and p[1] == 'animations' and p[2] in ACTS and p[3] in ACTS[p[2]]): continue
        anim, d, i = p[2], ACTS[p[2]][p[3]], int(p[4][6:9])
        pal = np.concatenate([pal0, KNIFE]) if anim == 'stab' else pal0
        a = clean(np.asarray(Image.open(io.BytesIO(z.read(f))).convert('RGBA')), pal)
        if anim != 'stab': a = blob(a)
        if i == 0:                                  # the standing frame gives the ground line and the middle of the feet
            ys, xs = np.nonzero(a[..., 3]); g = ys.max(); fx = np.nonzero(a[g - 1:g + 1, :, 3].any(0))[0]; ax = (fx.min() + fx.max() + 1) / 2
            base = {(anim, d): (g, ax)}
        g, ax = base[(anim, d)]
        ys, xs = np.nonzero(a[..., 3]); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), max(ys.max(), g) + 1
        crop = a[y0:y1, x0:x1]
        Image.fromarray(crop).save(f'{out}{anim}_{d}_{i}.png'); meta[f'{anim}_{d}_{i}'] = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': float(ax - x0)}; n += 1
        if d == 'right':
            Image.fromarray(crop[:, ::-1]).save(f'{out}{anim}_left_{i}.png'); meta[f'{anim}_left_{i}'] = {'w': int(x1 - x0), 'h': int(y1 - y0), 'ax': float((x1 - x0) - (ax - x0))}
    json.dump(meta, open(out + 'poses.json', 'w'), indent=1); print(name, n, 'frames')
