"""THE BLACKSMITH AT WORK (24 Nov 2026, round 2, his ask: he walks to the fire, the water and the anvil while he smelts your gold;
"use pixellab for these animations"). His chibi front (assets/final/smith/front.png) was imported into PixelLab as the character
"M2F smith" (1530550a-8a67-4990-8e23-aa969c39bea7, v3 reference, 4 directions), then animated with skeleton-v3:
  walk   = the template clip "walk", all 4 directions (6 frames)
  hammer = the move "chop" (energy .9), east (8 frames)
  pour   = poses written by hand (both hands out in front, leaning in), south and north (8 frames)
Unzip the character's download into ../mafia2-art/mine/pl/smith/ and run this. It packs every frame into one sheet of cells
(64 x 64 cells in the end: feet on row 52) and tidies the side views: PixelLab gave his bald head a little tuft of hair there.
  -> assets/final/smith/work.png + work.json  ({"cell": 64, "rows": {"walk_east": [row, frames], ...}})
Run:  python -I tools/make_smith_work.py   (from the game folder)"""
import glob, json
import numpy as np
from PIL import Image
SRC = '../mafia2-art/mine/pl/smith/Idle/'
NAVY = (1, 3, 46)
def skin(a): r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int); return (a[..., 3] > 0) & (r > 200) & (g > 150) & (b > 110)
def tidy(a, side):
    a = a.copy(); a[a[..., 3] < 128] = 0; a[..., 3] = np.where(a[..., 3] > 0, 255, 0)
    if side:                                                    # the tuft: everything above the row just over his scalp goes, then the line is closed again
        sk = skin(a); ys = np.nonzero(sk.any(1))[0]
        if len(ys):
            top = ys.min(); a[:max(0, top - 1)] = 0; row = top - 1
            if row >= 0:
                keep = np.zeros(a.shape[1], bool); keep[1:] |= sk[top, :-1]; keep[:-1] |= sk[top, 1:]; keep |= sk[top]      # only the line right over the skin stays
                a[row, ~keep] = 0; a[row, keep & (a[row, :, 3] == 0), :] = (*NAVY, 255); a[row, keep, :3] = NAVY
    dk = (a[..., :3].astype(int).sum(-1) < 110) & (a[..., 3] > 0); a[dk, :3] = NAVY
    return a
rows = [('idle_' + d, [SRC + f'rotations/{d}.png']) for d in ('south', 'east', 'north', 'west')]
rows += [(f'{k}_{d}', sorted(glob.glob(SRC + f'animations/{k}/{d}/*.png'))) for k, ds in (('walk', ('south', 'east', 'north', 'west')), ('pour', ('south', 'north')), ('hammer', ('east',))) for d in ds]
C = 64   # the hammer frames come on a 64 canvas (the swing needs the room); the rest are 48 and sit in the middle of their cell
n = max(len(f) for _, f in rows); sheet = np.zeros((len(rows) * C, n * C, 4), np.uint8); meta = {}
for j, (name, files) in enumerate(rows):
    assert files, name
    for i, f in enumerate(files):
        a = tidy(np.asarray(Image.open(f).convert('RGBA')), name.endswith('east') or name.endswith('west')); o = (C - a.shape[0]) // 2
        sheet[j * C + o:j * C + o + a.shape[0], i * C + o:i * C + o + a.shape[1]] = a
    meta[name] = [j, len(files)]
Image.fromarray(sheet).save('assets/final/smith/work.png', optimize=True)
json.dump({'cell': C, 'rows': meta}, open('assets/final/smith/work.json', 'w'))
Image.fromarray(sheet).resize((sheet.shape[1] * 3, sheet.shape[0] * 3), Image.NEAREST).save('../mafia2-art/mine/smith-work-preview.png')
print(meta)
