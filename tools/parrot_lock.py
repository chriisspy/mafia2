"""Bird Whisperer Matias keeps his two parrots (15 Nov 2026, his rule):
  * in EVERY pose the parrots sit on his shoulders exactly as he drew them (PixelLab redraws or smudges them, so this
    wipes whatever parrot pixels a frame has and pins his own parrots back on, lined up on the frame's head);
  * on the jump (scared_*) the parrots jump too: they lift off his shoulders a beat after him and land after him;
  * dead: he lies down WITHOUT them, and the two parrots lie on top of him.
Run after make_poses.py, pl_poses.py and pl_actions.py (from the game folder):  python -I tools/parrot_lock.py
Then tools/pack_poses.py and tools/asset_versions.py."""
import json, os
import numpy as np
from PIL import Image

NAME = 'matias'; ROOT = f'assets/final/{NAME}/'; NAVY = (1, 3, 46)
PARROT = {(0x6a, 0xc0, 0x54), (0x34, 0x7f, 0x61), (0x01, 0x59, 0x57), (0x32, 0x46, 0x33), (0xd3, 0x33, 0x3c), (0xad, 0x2f, 0x2d),
          (0x28, 0x4c, 0x90), (0x35, 0x70, 0xae), (0x34, 0x56, 0x8f), (0xc9, 0xac, 0x3f), (0xb1, 0x4e, 0x30), (0x20, 0x1d, 0x44)}
HEAD_ROWS = 13                     # rows of his own view used to find where his head is in a frame
JUMP_LIFT = [0, 1, 3, 4, 3, 1, 0]  # scared_* frames: how far the parrots rise above his shoulders (a beat behind him)

def load(p): return np.asarray(Image.open(p).convert('RGBA')).copy()
def is_par(a): return np.array([[tuple(int(c) for c in px[:3]) in PARROT and px[3] > 0 for px in row] for row in a])
def is_navy(a): return (a[..., 3] > 0) & (np.abs(a[..., :3].astype(int) - NAVY).sum(-1) < 30)

def parrots_of(base):
    """his parrots in one view: the parrot colours plus the navy outline touching them"""
    m = is_par(base); ring = np.zeros_like(m)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)): ring |= np.roll(np.roll(m, dy, 0), dx, 1)
    return m | (ring & is_navy(base))

def find_head(frame, base, pmask):
    """the offset that lines his own head (top rows of the view, parrots left out) up with the frame"""
    t = base[:HEAD_ROWS]; tm = (t[..., 3] > 0) & ~pmask[:HEAD_ROWS]; best = (1e18, 0, 0)
    H, W = frame.shape[:2]
    for dy in range(-6, H - HEAD_ROWS + 6):
        for dx in range(-8, W - t.shape[1] + 8):
            ys, xs = np.nonzero(tm); fy, fx = ys + dy, xs + dx; ok = (fy >= 0) & (fy < H) & (fx >= 0) & (fx < W)
            if ok.sum() < tm.sum() * .8: continue
            d = np.abs(frame[fy[ok], fx[ok], :3].astype(int) - t[ys[ok], xs[ok], :3].astype(int)).sum() + (frame[fy[ok], fx[ok], 3] == 0).sum() * 300
            if d < best[0]: best = (d, dy, dx)
    return best[1], best[2]

def grow(m, r=1):
    g = m.copy()
    for _ in range(r):
        n = g.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1): n |= np.roll(np.roll(g, dy, 0), dx, 1)
        g = n
    return g

def wipe(a):
    """PixelLab's own parrots off, and the navy outline left floating where they were (only there: shoes stay)"""
    pm = is_par(a); a[pm] = 0
    nv = is_navy(a); solid = (a[..., 3] > 0) & ~nv
    a[nv & grow(pm, 2) & ~grow(solid)] = 0
    return a

def pin(frame, base, pmask, lift=0):
    P = 6; H, W = frame.shape[:2]; a = np.zeros((H + P, W + 2 * P, 4), np.uint8); a[P:, P:P + W] = frame    # room above and to the sides
    a = wipe(a)
    dy, dx = find_head(frame, base, pmask); dy += P; dx += P
    ys, xs = np.nonzero(pmask); ty, tx = ys + dy - lift, xs + dx; ok = (ty >= 0) & (ty < a.shape[0]) & (tx >= 0) & (tx < a.shape[1])
    a[ty[ok], tx[ok]] = base[ys[ok], xs[ok]]
    return a, P

def view_of(k):
    for v in ('front', 'back', 'right', 'left'):
        if f'_{v}' in k: return v
    return None

def lying_parrots(dead, front, pmask):
    """take the parrots off his dead pose and lay his two front-view parrots on top of him, on their sides"""
    a = wipe(dead.copy())
    pc = is_par(front); ys, xs = np.nonzero(pc); cut = []
    for side in (xs < front.shape[1] / 2, xs >= front.shape[1] / 2):   # each parrot: its own colours, with a fresh navy outline all round
        y0, y1, x0, x1 = ys[side].min(), ys[side].max() + 1, xs[side].min(), xs[side].max() + 1
        p = np.zeros((y1 - y0 + 2, x1 - x0 + 2, 4), np.uint8); p[ys[side] - y0 + 1, xs[side] - x0 + 1] = front[ys[side], xs[side]]
        m = p[..., 3] > 0; ring = grow(m) & ~m; p[ring] = (*NAVY, 255)
        cut.append(np.rot90(p, 1 if len(cut) == 0 else -1))      # lying on their sides, one each way
    from scipy import ndimage as nd                              # crumbs left from the old parrots: gone
    lab, n = nd.label(a[..., 3] > 0); sz = nd.sum(np.ones(lab.shape), lab, range(1, n + 1))
    for i, z in enumerate(sz, 1):
        if z < 6: a[lab == i] = 0
    body = np.nonzero(a[..., 3] > 0); by0, by1, bx0, bx1 = body[0].min(), body[0].max(), body[1].min(), body[1].max()
    P = 2; out = np.zeros((a.shape[0] + 2 * P, a.shape[1] + P, 4), np.uint8); out[P:P + a.shape[0], :a.shape[1]] = a
    cx = bx0 + (bx1 - bx0) * .74; cy = (by0 + by1) / 2 + P              # his chest (his big head lies to the left)
    for k, p in enumerate(cut):                                   # one on the top half of his chest, one on the bottom half
        px = int(round(cx - p.shape[1] / 2)) + (1 if k else -1); py = int(round(cy - p.shape[0])) + 1 if k == 0 else int(round(cy)) - 1
        m = p[..., 3] > 0; yy, xx = np.nonzero(m); out[yy + py, xx + px] = p[yy, xx]
    return out, P

meta = json.load(open(ROOT + 'poses/poses.json')); base = {v: load(ROOT + v + '.png') for v in ('front', 'back', 'right', 'left')}
pm = {v: parrots_of(base[v]) for v in base}; n = 0
for k in sorted(meta):
    f = ROOT + 'poses/' + k + '.png'; fr = load(f)
    if k == 'dead': out, P = lying_parrots(fr, base['front'], pm['front']); lift = None
    else:
        v = view_of(k)
        if not v: continue
        lift = JUMP_LIFT[min(int(k.rsplit('_', 1)[1]), len(JUMP_LIFT) - 1)] if k.startswith('scared_') else 0
        out, P = pin(fr, base[v], pm[v], lift)
    ys, xs = np.nonzero(out[..., 3] > 0); x0, x1, y0 = xs.min(), xs.max() + 1, ys.min()
    out = out[y0:, x0:x1]; Image.fromarray(out).save(f)
    shift = P - x0 if k != 'dead' else -x0
    m = meta[k]; m['w'], m['h'] = int(out.shape[1]), int(out.shape[0]); m['ax'] = float(m['ax'] + shift); n += 1
json.dump(meta, open(ROOT + 'poses/poses.json', 'w'), indent=1)
print(NAME, n, 'poses pinned')
