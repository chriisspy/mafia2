# Download a PixelLab character's skeleton animations (walk-sk, sit, pickup-sk, water-sk) into
# assets/poses-src/<name>/ as <anim>_<dir>_<i>.png, then tools/pl_poses.py builds the game poses.
# The PixelLab characters are imports of HIS finished sprites (assets/final), so frames are already his style.
# usage (from mafia2-lab/): python -I tools/pl_fetch.py name=<pixellab id> [name=id ...]
import sys, os, io, zipfile, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pl_fetch_ids import IDS   # one list of ids for every script (and the map builder's tools/pl_ids.json)
MAP = {'walk-sk': 'walk', 'sit': 'sit', 'sit2': 'sit', 'pickup-sk': 'pickup', 'water-sk': 'water'}   # sit2 = the reworded sit (no chair drawn); it wins over sit
for name in sys.argv[1:]:
    req = urllib.request.Request(f'https://api.pixellab.ai/mcp/characters/{IDS[name]}/download', headers={'User-Agent': 'curl/8.0'})
    z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(req).read()))
    out = f'assets/poses-src/{name}/'; os.makedirs(out, exist_ok=True); n = 0
    for f in sorted(z.namelist(), key=lambda f: '/sit2/' in f):
        p = f.split('/')
        if len(p) == 5 and p[1] == 'animations' and p[2] in MAP:
            open(f'{out}{MAP[p[2]]}_{p[3]}_{int(p[4][6:9])}.png', 'wb').write(z.read(f)); n += 1
    print(name, n, 'frames')
