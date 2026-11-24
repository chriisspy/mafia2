"""THE RACE TRACK's layout sketch (24 Nov 2026, round 2: "make the racing track a lot better"): the plan handed to Nano Banana Pro
next to the South's ground, so the track it paints sits where the game expects it. 2400 x 1800 game pixels.
A long main straight up the right side (start line + grid), a left-hander, an S-bend, a straight into a hairpin, a back straight,
a right-left down to the bottom straight. The paddock (garage, pits) is bottom left with a pit lane to the track.
   python -I tools/make_race_sketch.py"""
from PIL import Image, ImageDraw
import json
W, H = 2400, 1800
# the middle line of the circuit in the order you drive it, from the bottom of the main straight (game pixels). race.js has the same list (R_CTRL).
CTRL = [(2060, 1300), (2060, 420), (2060, 300), (1950, 220), (1620, 220), (1480, 220), (1380, 320), (1380, 460), (1280, 600), (1120, 620), (520, 620),
        (330, 620), (250, 750), (330, 880), (520, 880), (1100, 880), (1260, 880), (1360, 980), (1360, 1180), (1360, 1420), (1480, 1560), (1920, 1560), (2060, 1470)]
ROAD = 124
def chaikin(p, n=3):
    for _ in range(n):
        q = []
        for i in range(len(p)):
            a, b = p[i], p[(i + 1) % len(p)]
            q += [(a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25), (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)]
        p = q
    return p
LINE = chaikin(CTRL)
if __name__ == '__main__':
    im = Image.new('RGB', (W, H), (240, 246, 255)); d = ImageDraw.Draw(im)
    G = (20, 60, 50); d.rectangle([0, 0, W, 40], fill=G); d.rectangle([0, H - 40, W, H], fill=G); d.rectangle([W - 14, 0, W, H], fill=G)
    d.rectangle([0, 0, 44, 1270], fill=G); d.rectangle([0, 1410, 44, H], fill=G)
    d.rectangle([0, 1290, 150, 1390], fill=(90, 90, 100))                         # the road in from the South
    d.rectangle([140, 1060, 760, 1640], fill=(150, 150, 160))                     # the paddock: flat concrete
    d.rectangle([760, 1290, 1310, 1390], fill=(90, 90, 100))                      # the pit lane out to the track
    d.rectangle([1650, 960, 1950, 1170], fill=(150, 150, 160))                    # grandstand plot, inside the main straight
    d.rectangle([2150, 880, 2372, 1110], fill=(150, 150, 160))                    # grandstand plot, outside it
    d.ellipse([820, 1010, 1160, 1240], fill=(120, 170, 230))                      # a frozen pond in the infield
    pts = LINE + LINE[:2]
    d.line(pts, fill=(200, 40, 40), width=ROAD + 14, joint='curve'); d.line(pts, fill=(90, 90, 100), width=ROAD, joint='curve')
    for i in range(10):                                                           # start / finish line across the main straight
        for j in range(2):
            x = 1998 + i * 12.4; d.rectangle([x, 992 + j * 9, x + 12.4, 1001 + j * 9], fill=(255, 255, 255) if (i + j) % 2 else (10, 10, 10))
    for i in range(6):                                                            # grid boxes below the line
        x = 2030 if i % 2 == 0 else 2090; y = 1060 + i * 56
        d.line([(x - 18, y), (x + 18, y)], fill=(255, 255, 255), width=5); d.line([(x - 18, y), (x - 18, y + 20)], fill=(255, 255, 255), width=5); d.line([(x + 18, y), (x + 18, y + 20)], fill=(255, 255, 255), width=5)
    im.save('../mafia2-art/race/layout-sketch.png')
    json.dump([[round(x), round(y)] for x, y in LINE], open('../mafia2-art/race/line.json', 'w'))
    print(len(LINE), 'points')
