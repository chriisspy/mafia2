"""Pose atlases (13 Nov 2026): the game used to fetch about 1,300 little pose pictures one by one when it started, which
took forever on a phone. This packs each outfit's poses (assets/final/<outfit>/poses/*.png + poses.json) into ONE picture,
assets/atlas/<outfit>.png, and writes where everything is to assets/atlas/poses.json:  {outfit: {pose: [x, y, w, h, ax]}}
The game cuts the poses back out of the atlas when it loads. The originals are not touched (his Beanie stays as it is).
Run after any pose changes:  python -I tools/pack_poses.py   (from the game folder), then tools/asset_versions.py"""
import os, json
from PIL import Image
SRC, OUT, AW = 'assets/final', 'assets/atlas', 512
os.makedirs(OUT, exist_ok=True)
meta = {}
for skin in sorted(os.listdir(SRC)):
    pj = f'{SRC}/{skin}/poses/poses.json'
    if not os.path.exists(pj): continue
    m = json.load(open(pj))
    items = []
    for k, v in m.items():
        f = f'{SRC}/{skin}/poses/{k}.png'
        if not os.path.exists(f): print('missing', f); continue
        items.append((k, Image.open(f).convert('RGBA'), v.get('ax')))
    items.sort(key=lambda it: (-it[1].height, it[0]))
    x = y = rowh = 0; pos = {}
    for k, im, ax in items:                       # shelves, tallest first, 1 px apart
        if x + im.width > AW: x = 0; y += rowh + 1; rowh = 0
        pos[k] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
    atlas = Image.new('RGBA', (AW, y + rowh), (0, 0, 0, 0)); meta[skin] = {}
    for k, im, ax in items:
        atlas.paste(im, pos[k]); meta[skin][k] = [pos[k][0], pos[k][1], im.width, im.height, ax]
    atlas.save(f'{OUT}/{skin}.png', optimize=True)
    print(skin, len(items), 'poses', atlas.size, os.path.getsize(f'{OUT}/{skin}.png') // 1024, 'KB')
json.dump(meta, open(f'{OUT}/poses.json', 'w'), separators=(',', ':'))
print('poses.json', os.path.getsize(f'{OUT}/poses.json') // 1024, 'KB')
