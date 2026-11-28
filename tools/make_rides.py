"""THE CRYSTAL SHOP'S 3D THINGS (28 Nov 2026, his picks: the Dragon mount, the Jetpack, the Banana Peel).
His rule the same day: "any special or rare thing added to this game MUST be sprite stacked and 3d unless i say so". So these are SPRITE-STACK
slices, modelled in code exactly the way the pets are (tools/make_pets.py: the same Model, the same three-tone shading, the game's one navy line),
and drawn by the game's own stackFrame at the cast's own pixel size (px: 1).

  mount   a BIG Shard you ride (41 px slices): saddle on its back, wings that beat (rows 0-4 = five steps from high up to low down: a slow, grand beat, his ask), row 5 = jaws open, breathing fire
  jet     the jetpack on your back (9 px slices): two tanks, a strap plate, two nozzles
  peel    a banana peel on the ground (11 px slices)

Run from the mafia2 folder:  python -I tools/make_rides.py [check.png]
Writes assets/rides/<name>.png and assets/rides/rides.json {name: {s, n, squash, rows, seat}}   (seat = how high the saddle is, in slices)
The NOSE points DOWN (+y) in every slice. x = across, y = along, z = up.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_pets as mp
from make_pets import Model, hexc, spike, EYE, WHITE
from PIL import Image


def size(s):
    mp.S = s; mp.C = s // 2
    return s // 2


def mount(frame=0):
    C = size(41); m = Model()
    B = hexc('#1c4fa8', '#2f86e0', '#7fd0ff'); D = hexc('#123a80', '#1f62c0', '#5fb0f0'); HORN = hexc('#b9c2d6', '#eef1f7', '#ffffff')
    WING = hexc('#3fa0d8', '#8fe6ff', '#f0ffff'); H = hexc('#2f86e0', '#7fd0ff', '#eaffff'); 
    SAD = hexc('#6b3a1e', '#a8602c', '#d98c4a'); GOLD = hexc('#b8801f', '#ffd25e', '#fff2a8'); FIRE = (160, 244, 255); CLAW = (238, 241, 247)
    Z = 6                                                                         # room under the belly for the wings to beat DOWN
    for x in (14, 25):                                                            # four small legs, tucked up, with claws
        for y in (11, 22):
            m.box(x, x + 1, y, y + 2, Z - 1, Z + 1, D); m.put(x, y + 3, Z - 1, CLAW); m.put(x + 1, y + 3, Z - 1, CLAW)
    m.ball(C, 17, Z + 7, 7.6, 10.0, 6.0, B)                                       # body
    for y, w, h in ((7, 4, 3), (6, 3, 3), (5, 3, 2), (4, 2, 2), (3, 2, 2), (2, 1, 1), (1, 1, 1), (0, 1, 1)):   # a long tail thinning to the back
        m.box(C - w, C + w, y, y, Z + 6 - h, Z + 6 + h, B)
    spike(m, C - 1, 0, Z + 8, 5, HORN, wide=3)                                    # a crystal on its tip
    for k in range(6):                                                            # the neck reaches FORWARD and only a little up: the face must sit under the rider, not behind them
        m.box(C - 3, C + 3, 25 + k, 26 + k, Z + 5 + k // 2, Z + 10 + k // 2, B, rnd=True)
    HZ = Z + 10                                                                   # the middle of the head
    m.ball(C, 33, HZ, 6.0, 5.2, 4.6, H)                                           # the head
    jaw = 2 if frame == 5 else 0
    m.box(C - 3, C + 3, 36, 40, HZ - 1, HZ + 2, H, rnd=True)                      # a long snout
    m.box(C - 3, C + 3, 36, 39, HZ - 3 - jaw, HZ - 2 - jaw, D, rnd=True)          # lower jaw (drops when it breathes fire)
    if frame == 5:
        m.box(C - 2, C + 2, 38, 40, HZ - 3, HZ - 2, [FIRE] * 3)                   # the glow in its throat
    for x in (C - 3, C + 3):
        m.face(x, HZ - 2, CLAW, y_from=40)                                        # two fangs
    m.put(C - 2, 40, HZ + 2, EYE); m.put(C + 2, 40, HZ + 2, EYE); m.put(C - 2, 39, HZ + 2, EYE); m.put(C + 2, 39, HZ + 2, EYE)   # nostrils
    for x0 in (C - 5, C + 4):                                                     # big dark eyes on the front, a glint in each
        for x in (x0, x0 + 1):
            for z in (HZ + 1, HZ + 2, HZ + 3, HZ + 4):
                m.face(x, z, EYE, y_from=37)
        m.face(x0 + (1 if x0 < C else 0), HZ + 4, WHITE, y_from=37)
    for x0 in (C - 6, C + 4):                                                     # BIG eyes, set proud of the head so they read from every side and from above: 3 wide, 3 deep, 3 tall, a glint on the front top corner
        m.box(x0, x0 + 2, 34, 36, HZ + 1, HZ + 3, [EYE] * 3)
        gx = x0 + (2 if x0 < C else 0)
        m.put(gx, 36, HZ + 3, WHITE); m.put(gx, 35, HZ + 3, WHITE); m.put(gx, 36, HZ + 2, WHITE)
    for x in (C - 5, C + 4):                                                      # horns, swept up and back
        for k in range(7):
            m.box(x, x + 1, 31 - k, 32 - k, HZ + 4 + k, HZ + 5 + k, HORN)
    for y, h in ((27, 3), (9, 4), (6, 3), (3, 2)):                                # crystal spines: on the neck and behind the saddle
        t = m.top_of(C, y)
        if t:
            spike(m, C - 1, y, t, h, D, wide=3)
    t = m.top_of(C, 16)                                                           # THE SADDLE: a blanket over the back, a seat, a gold horn in front
    m.box(C - 6, C + 6, 13, 21, t - 2, t, [(150, 40, 60), (200, 60, 80), (232, 96, 110)], rnd=True)
    m.box(C - 3, C + 3, 14, 20, t + 1, t + 1, SAD, rnd=True); m.box(C - 3, C + 3, 13, 14, t + 2, t + 3, SAD); m.box(C - 1, C + 1, 20, 21, t + 2, t + 3, GOLD)
    slope = (1.15, 0.65, 0.1, -0.45, -0.85, 0.5)[frame]                                          # WINGS: a wide slab each side; darker bones; the slope is the beat
    for sx in (-1, 1):
        for k in range(12):
            x = C + sx * (8 + k); z = Z + 10 + round(k * slope); y0 = 8 + (k // 3 if k > 6 else 0); y1 = 23 - k // 2 - (2 if k % 4 == 3 else 0)
            for zz in (z, z + 1):
                m.box(x, x, y0, y1, zz, zz, WING)
                m.put(x, 23 - k // 2, zz, D); m.put(x, 22 - k // 2, zz, D)        # the bone along the front edge
                if k % 4 == 0:
                    m.box(x, x, y0, y1, zz, zz, D)                                # the fingers of the wing
        spike(m, C + sx * 19 - (1 if sx > 0 else 0), 16, Z + 11 + round(11 * slope), 3, HORN)   # a claw on each wing tip
    return m, t + 2


def jet(frame=0):
    C = size(9); m = Model(); R = hexc('#8a1f2b', '#e43b44', '#ff8a8a'); S2 = hexc('#5a6988', '#c0cbdc', '#ffffff'); K = hexc('#181425', '#3a3d5c', '#666b94')
    m.box(1, 3, 2, 4, 1, 4, R, rnd=True); m.box(5, 7, 2, 4, 1, 4, R, rnd=True)     # two short tanks (it sits on a chibi's back: any taller and it is as tall as they are)
    m.box(1, 3, 2, 4, 5, 5, S2, rnd=True); m.box(5, 7, 2, 4, 5, 5, S2, rnd=True)   # their caps
    m.box(2, 6, 4, 5, 2, 4, K)                                                    # the plate that straps to your back
    m.box(1, 3, 2, 4, 0, 0, S2); m.box(5, 7, 2, 4, 0, 0, S2)                       # nozzles
    m.box(3, 5, 3, 3, 3, 3, S2)                                                   # the pipe between
    return m, 0


def peel(frame=0):
    C = size(11); m = Model(); Y = hexc('#c98a1f', '#ffd23e', '#fff2a8'); IN = hexc('#d9c27a', '#fff0b0', '#fffbe0'); T = (107, 70, 30)
    m.box(4, 6, 4, 6, 0, 2, Y, rnd=False); m.put(5, 5, 3, T); m.put(5, 5, 4, T)   # the knot in the middle, its stalk standing up
    for dx, dy in ((0, 1), (1, -1), (-1, -1)):                                    # three flaps lying out on the ground
        for k in range(1, 5):
            x, y = 5 + dx * k + (0 if dx else 0), 5 + dy * k
            for a in (-1, 0, 1):
                px, py = (x + a, y) if dx == 0 else (x, y + a)
                m.put(px, py, 0, Y if k < 4 else IN)
                if k < 3:
                    m.put(px, py, 1, IN if a == 0 else Y)
    return m, 0


THINGS = {'mount': (mount, 6), 'jet': (jet, 1), 'peel': (peel, 1)}


def main():
    os.makedirs('assets/rides', exist_ok=True); meta = {}; rows = []
    for name, (fn, nf) in THINGS.items():
        built = [fn(f) for f in range(nf)]; S = mp.S; frames = [b[0].slices() for b in built]
        n = max(len(f) for f in frames); blank = Image.new('RGBA', (S, S), (0, 0, 0, 0)); frames = [f + [blank] * (n - len(f)) for f in frames]
        strip = Image.new('RGBA', (S * n, S * nf), (0, 0, 0, 0))
        for r, sl in enumerate(frames):
            for z, im in enumerate(sl):
                strip.paste(im, (z * S, r * S))
        strip.save(f'assets/rides/{name}.png', optimize=True); meta[name] = {'s': S, 'n': n, 'squash': mp.SQUASH, 'rows': nf, 'seat': built[0][1]}
        rows += [(name, S, sl) for sl in frames]
    json.dump(meta, open('assets/rides/rides.json', 'w'), indent=1)
    if len(sys.argv) > 1:                                    # the check sheet: each one turned through 8 angles, on the town's snow
        Z, cw, ch = 4, 52, 62; sheet = Image.new('RGBA', (8 * cw * Z, len(rows) * ch * Z), (226, 236, 246, 255))
        for i, (name, S, sl) in enumerate(rows):
            mp.S = S; mp.C = S // 2
            for a in range(8):
                im = mp.render(sl, a * 45); im = im.crop(im.getbbox()); big = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
                sheet.alpha_composite(big, (a * cw * Z + (cw * Z - big.width) // 2, i * ch * Z + ch * Z - big.height - 8))
        sheet.save(sys.argv[1])
    print(meta)


if __name__ == '__main__':
    main()
