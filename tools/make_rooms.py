"""Cabin Case rooms: shrink each themed picture (made in Higgsfield from the base room) to the game's 195x242 room grid.
The game cuts the furniture out of each picture itself, using the masks of the pieces in assets/room-objects, so the
cut-outs are exactly the same for every theme. The black outside the room is forced to match the base room's."""
import os, sys
import numpy as np
from PIL import Image
SRC = r"C:\Users\Chris\Dropbox\Documents\claude chrispy\mafia2-art\cabin-interiors"
OUT = "assets/rooms"
THEMES = {"eggshell": "1-eggshell", "midnight": "2-midnight", "christmas": "3-christmas", "candy": "4-candy", "haunted": "5-haunted", "royal": "6-royal"}
base = np.asarray(Image.open("assets/room-objects/room-empty.png").convert("RGB")).astype(int)
H, W = base.shape[:2]
void = base[0, 0]
is_void = np.abs(base - void).sum(2) < 30
for tid, fn in THEMES.items():
    a = np.asarray(Image.open(os.path.join(SRC, fn + ".png")).convert("RGB")).astype(int)
    h, w = a.shape[:2]
    out = np.zeros((H, W, 3), int)
    for y in range(H):
        y0 = int((y + .3) * h / H); y1 = max(y0 + 1, int((y + .7) * h / H))
        for x in range(W):
            x0 = int((x + .3) * w / W); x1 = max(x0 + 1, int((x + .7) * w / W))
            out[y, x] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)
    near = (np.abs(out - void).sum(2) < 34) & ~is_void
    out[near] = np.maximum(out[near], [14, 12, 16])
    out[is_void] = void
    Image.fromarray(out.astype("uint8")).save(os.path.join(OUT, tid + ".png"), optimize=True)
    print(tid, os.path.getsize(os.path.join(OUT, tid + ".png")))
# the little pictures for cards and the case reel: a square zoomed in on the bed (his call, 12 Nov)
for tid in list(THEMES) + ["classic"]:
    Image.open(os.path.join(OUT, tid + ".png")).crop((60, 52, 136, 128)).save(os.path.join(OUT, tid + "-t.png"), optimize=True)
