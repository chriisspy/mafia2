# The PixelLab decorations (18 Nov 2026): download each object (and its 'loop' animation, if it has one), trim it,
# and write assets/decor/<id>.png (animated ones: every frame side by side, same size) + their entries in decor.json.
# usage (from the game folder): python -I tools/make_decor.py     then node tools/make_catalog.js, deploy, asset_versions.py
import io, json, zipfile, urllib.request, time
import numpy as np
from PIL import Image
# id: (PixelLab object, name, price, animated, the way its own picture faces if it was turned into all directions else None)
# TURNING (18 Nov): the ones that look different from the side were expanded to 8 directions in PixelLab; the game uses south, east,
# north and west only (his rule: never an in-between angle). West is east mirrored (or east is west mirrored, for the car, whose own
# picture faces west), so the two sides always match.
ITEMS = {
 'flowers': ('81bb5715-ce5b-46be-9849-567be18cdc2b', 'Flower pot', 250, 0, None),
 'mailbox': ('5beb52ba-1fab-4627-ba07-130228d0033f', 'Mailbox', 350, 0, 's'),
 'bench': ('1ed971bf-0d1b-4152-9b62-ae2d3493e0c0', 'Bench', 450, 0, 's'),
 'wanted': ('96eb50de-c9a8-4873-a713-aa895021fd36', 'Wanted board', 600, 0, 's'),
 'campfire': ('4e9aab53-c971-4b5b-8139-d502173c499a', 'Campfire', 800, 1, None),
 'firebarrel': ('8a88bcbb-3f13-4ba3-8235-98a1d4584b51', 'Fire barrel', 900, 1, None),
 'poker': ('126ea662-b534-4fa7-ad17-81da63bf5475', 'Poker table', 1200, 0, None),
 'neon': ('3b94e5c2-ff5a-45f5-8e91-0b93995382ab', 'Neon sign', 1500, 1, None),
 'robot': ('c8a50e1d-4651-4cf2-9145-38f9c3513960', 'Robot pal', 2000, 1, 's'),
 'arcade': ('b54826ca-f30d-46f0-b574-c38ab81c71b3', 'Arcade machine', 2500, 1, 's'),
 'fountain': ('fd0c6b3f-3f2e-4369-91cf-52519c031ccc', 'Fountain', 3000, 1, None),
 'safe': ('1ec33faf-05ab-41f5-b862-1be28d1cd6b8', 'The safe', 3500, 0, 's'),
 'teleporter': ('9d2138d5-4192-4de8-8715-0adb393ddcff', 'Teleporter', 4000, 1, None),
 'hologram': ('3c5134c5-a740-42b0-bb4b-90ae40e7a1c4', 'Hologram', 4500, 1, None),
 'chest': ('9570e130-0c3f-4982-b755-7f4c429583c7', 'Treasure chest', 5000, 0, 's'),
 'statue': ('91e95a57-2b0c-4f7b-93c1-98daef52f5a5', 'Golden boss', 6000, 0, 's'),
 'car': ('639c4592-445c-4ca4-93f0-19335df67cc2', 'Getaway car', 9000, 0, 'w'),
}
# SIZE (his note, 18 Nov: "the barrel on fire is huge, the car is slightly too big, the safe is huge"): PixelLab draws everything to fill its
# canvas, so each thing is shrunk here to sit right beside a 24 px tall person. Every view and frame of a thing gets the same shrink.
SCALE = {'flowers': .65, 'mailbox': .7, 'bench': .8, 'wanted': .8, 'campfire': .6, 'firebarrel': .45, 'poker': .8, 'neon': .7, 'robot': .8,
 'arcade': .65, 'fountain': .85, 'safe': .55, 'teleporter': .75, 'hologram': .75, 'chest': .7, 'statue': .85, 'car': .75}
def small(f, sc):
    im = Image.fromarray(f); return np.asarray(im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.NEAREST)).copy()
LONG = {'s': 'south', 'e': 'east', 'n': 'north', 'w': 'west', 'u': 'unknown'}
def get(oid):
    for k in range(4):
        try:
            req = urllib.request.Request(f'https://api.pixellab.ai/mcp/objects/{oid}/download', headers={'User-Agent': 'curl/8.0'})
            return urllib.request.urlopen(req).read()
        except Exception as e: time.sleep(3); err = e
    raise err
def solid(im):
    a = np.asarray(im.convert('RGBA')).copy(); a[a[..., 3] < 128] = 0; a[a[..., 3] >= 128, 3] = 255; return a
def strip(frames, path):
    m = np.zeros(frames[0].shape[:2], bool)
    for f in frames: m |= f[..., 3] > 0
    ys, xs = np.nonzero(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; w, h = x1 - x0, y1 - y0
    sheet = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames): sheet.paste(Image.fromarray(f[y0:y1, x0:x1]), (i * w, 0))
    sheet.save(path); return w, h
cat = json.load(open('assets/decor/decor.json')); by = {d['id']: d for d in cat}
for k, (oid, name, price, anim, face) in ITEMS.items():
    raw = get(oid); views = {}
    if raw[:2] == b'PK':
        z = zipfile.ZipFile(io.BytesIO(raw)); names = z.namelist()
        def view(dk):
            fl = sorted(f for f in names if f.startswith('animations/') and f.split('/')[2] == LONG[dk] and f.endswith('.png'))
            if anim and fl: return [solid(Image.open(io.BytesIO(z.read(f)))) for f in fl]
            r = 'rotations/' + LONG[dk] + '.png'
            return [solid(Image.open(io.BytesIO(z.read(r))))] if r in names else None
        if face:
            for dk in 'senw': views[dk] = view(dk)
            if face == 'w': views['e'] = [f[:, ::-1].copy() for f in views['w']]      # the two sides always match
            else: views['w'] = [f[:, ::-1].copy() for f in views['e']]
        else: views['s'] = view('u') or view('s')
    else: views['s'] = [solid(Image.open(io.BytesIO(raw)))]
    sc = SCALE.get(k, 1); views = {dk: [small(f, sc) for f in fr] for dk, fr in views.items()}
    d = by.get(k) or {'id': k}; d.update(name=name, price=price); d.pop('frames', None); d.pop('dirs', None); d.pop('def', None); out = []
    for dk, fr in views.items():
        w, h = strip(fr, f'assets/decor/{k}{"" if dk == "s" else "_" + dk}.png'); out.append(f'{dk}:{w}x{h}x{len(fr)}')
    if face: d['dirs'] = {dk: len(fr) for dk, fr in views.items()}
    elif len(views['s']) > 1: d['frames'] = len(views['s'])
    if face == 'w': d['def'] = 3
    if k not in by: cat.append(d); by[k] = d
    print(k, ' '.join(out))
cat.sort(key=lambda d: d['price'])
json.dump(cat, open('assets/decor/decor.json', 'w'), indent=1)
