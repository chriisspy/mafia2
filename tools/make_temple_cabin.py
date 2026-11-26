"""THE TEMPLE CABIN (26 Nov 2026, the Glimmerkin hunt's reward): outside and inside, made HIS way.
Outside: his plain base hut (152 x 152) restyled in Higgsfield (nano_banana_2, 1:1, 1k, his short "change the theme of this cabin" prompt),
         kept in mafia2-art/quest/reward/cabin-<letter>.png. This shrinks it back to his 152 grid (one colour a square, the middle colour of
         each square), takes the white away, stands it on the base hut's own foot and puts it in the game's 116 x 154 hut frame
         (assets/cabins/temple.png; temple-x.png = the same in the 126 wide Christmas frame).
Inside:  the base room (mafia2-art/cabin-interiors/0-original.png) restyled the same way (room-<letter>.png) and shrunk to the game's
         195 x 242 room grid exactly as tools/make_rooms.py does it (assets/rooms/temple.png + temple-t.png).
Run from the mafia2 folder:  python -I tools/make_temple_cabin.py [check.png]
"""
import os, sys
import numpy as np
from PIL import Image
from collections import deque
SRC = r'..\mafia2-art\quest\reward'
OUT_PICK, IN_PICK = 'c', 'a'                 # which of the four options (a-d) is used
BASE_BOX = (10, 11, 106, 147)                # where every one of his huts sits in the 116 x 154 frame


def shrink(a, W, H):
    h, w = a.shape[:2]; out = np.zeros((H, W, 3), int)
    for y in range(H):
        y0 = int((y + .3) * h / H); y1 = max(y0 + 1, int((y + .7) * h / H))
        for x in range(W):
            x0 = int((x + .3) * w / W); x1 = max(x0 + 1, int((x + .7) * w / W))
            out[y, x] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)
    return out


def cut(G):
    """the picked hut shrunk to a G x G grid, the white (and the crystal's halo on it) taken away, trimmed"""
    a = np.asarray(Image.open(os.path.join(SRC, f'cabin-{OUT_PICK}.png')).convert('RGB')).astype(int)
    s = shrink(a, G, G)
    white = ((s.min(2) > 232) & (s.max(2) - s.min(2) < 16)) | ((s[..., 0] > 190) & (s[..., 1] > 215) & (s[..., 2] > 228))   # the white, and the pale halo the crystal's glow left on it
    bg = np.zeros(white.shape, bool); q = deque()
    for x in range(G):
        for y in (0, G - 1): q.append((y, x))
    for y in range(G):
        for x in (0, G - 1): q.append((y, x))
    while q:                                   # only the white that reaches the edge is background
        y, x = q.popleft()
        if not (0 <= y < G and 0 <= x < G) or bg[y, x] or not white[y, x]: continue
        bg[y, x] = True; q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    rgba = np.dstack([s, np.where(bg, 0, 255)]).astype('uint8')
    im = Image.fromarray(rgba); bb = im.getbbox(); return im.crop(bb), bb


def outside():
    im, bb = cut(152)
    # the same foot as his huts: bottom edge on the base's bottom row, centred on the base's middle; never taller or wider than the frame
    bw, bh = BASE_BOX[2] - BASE_BOX[0], BASE_BOX[3] - BASE_BOX[1]
    k = min(1.0, 116 / im.width, (BASE_BOX[3] - 1) / im.height)
    if k < 1: im = im.resize((round(im.width * k), round(im.height * k)), Image.NEAREST)
    fr = Image.new('RGBA', (116, 154), (0, 0, 0, 0))
    fr.paste(im, (BASE_BOX[0] + (bw - im.width) // 2, BASE_BOX[3] - im.height))
    os.makedirs('assets/cabins', exist_ok=True); fr.save('assets/cabins/temple.png', optimize=True)
    fx = Image.new('RGBA', (126, 154), (0, 0, 0, 0)); fx.paste(fr, (10, 0)); fx.save('assets/cabins/temple-x.png', optimize=True)
    cut(66)[0].save('assets/cabins/temple-i.png', optimize=True)      # small, for its YOU GOT card: shrunk straight from the big picture, so it stays crisp
    print('outside', bb, '->', fr.getbbox())
    return fr


def inside():
    base = np.asarray(Image.open('assets/room-objects/room-empty.png').convert('RGB')).astype(int)
    H, W = base.shape[:2]; void = base[0, 0]; is_void = np.abs(base - void).sum(2) < 30
    a = np.asarray(Image.open(os.path.join(SRC, f'room-{IN_PICK}.png')).convert('RGB')).astype(int)
    out = shrink(a, W, H)
    near = (np.abs(out - void).sum(2) < 34) & ~is_void
    out[near] = np.maximum(out[near], [14, 12, 16]); out[is_void] = void
    im = Image.fromarray(out.astype('uint8')); im.save('assets/rooms/temple.png', optimize=True)
    im.crop((60, 52, 136, 128)).save('assets/rooms/temple-t.png', optimize=True)
    return im


if __name__ == '__main__':
    fr = outside(); rm = inside()
    if len(sys.argv) > 1:
        K = 4; b = Image.open('assets/town4/cabins/cabin1.png').convert('RGBA'); c = Image.open('assets/rooms/classic.png').convert('RGBA')
        sh = Image.new('RGBA', (116 * 2 + 195 * 2 + 50, 242), (44, 70, 60, 255))
        sh.alpha_composite(b, (5, 40)); sh.alpha_composite(fr, (126, 40)); sh.paste(c, (252, 0)); sh.paste(rm, (452, 0))
        sh.resize((sh.width * K, sh.height * K), Image.NEAREST).save(sys.argv[1])
