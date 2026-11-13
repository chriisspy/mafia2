"""His new empty cabin (13 Nov 2026): the stairs and the old door are gone, the door is now flat in the bottom wall.
  * copies his room-empty-flat-door.png in as the base room (the old one is kept in assets/room-objects/_old-room/)
  * the Cabin Case themes (assets/rooms/*.png) were made from the old base, so the same change is made on each of
    them: every pixel that changed in the base is painted in the theme's own colours. Each base colour is matched to
    the colour the theme uses for it (worked out from the rest of the room), so the walls and the door keep the theme.
Run once:  python -I tools/flat_door_rooms.py   (from the game folder)"""
import os, shutil
import numpy as np
from PIL import Image
SRC = r'C:\Users\Chris\Dropbox\Documents\chrispy games\cabin assets\room-empty-flat-door.png'
BASE = 'assets/room-objects/room-empty.png'
os.makedirs('assets/room-objects/_old-room', exist_ok=True)
old_p = 'assets/room-objects/_old-room/room-empty-stairs.png'
if not os.path.exists(old_p):
    shutil.copy(BASE, old_p)
old = np.asarray(Image.open(old_p).convert('RGB')).astype(int)
new = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
assert old.shape == new.shape
changed = np.abs(old - new).sum(2) > 0
print('changed px', int(changed.sum()))
Image.fromarray(new.astype(np.uint8)).save(BASE, optimize=True)
keys = [tuple(c) for c in old.reshape(-1, 3)]
for f in sorted(os.listdir('assets/rooms')):
    if not f.endswith('.png') or f.endswith('-t.png'):
        continue
    p = 'assets/rooms/' + f
    th = np.asarray(Image.open(p).convert('RGB')).astype(int)
    # base colour -> the colour the theme uses there (median over the unchanged room)
    flat_old, flat_th, ok = old.reshape(-1, 3), th.reshape(-1, 3), (~changed).reshape(-1)
    m = {}
    for c in np.unique(flat_old[ok], axis=0):
        sel = ok & np.all(flat_old == c, axis=1)
        m[tuple(c)] = np.median(flat_th[sel], axis=0)
    karr = np.array(list(m.keys())); varr = np.array(list(m.values()))
    out = th.copy()
    ys, xs = np.nonzero(changed)
    for y, x in zip(ys, xs):
        c = new[y, x]
        d = np.abs(karr - c).sum(1); i = int(np.argmin(d))
        out[y, x] = np.clip(varr[i] + (c - karr[i]), 0, 255)   # the theme's colour, nudged by how far off the nearest base colour was
    Image.fromarray(out.astype(np.uint8)).save(p, optimize=True)
    print(f, 'done')
