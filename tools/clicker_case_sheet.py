"""The Clicker Case (13 Nov 2026, his ask: a cool green/neon case): PixelLab object 150eeca7 (a 'Neon arcade' state of the
Mafia case), animation 'open-front' (v3, 12 frames + the still = 13). Downloads the frames and joins them into
assets/case/clicker-open.png, 96 px each, like open.png and cabin-open.png.
Usage: python -I tools/clicker_case_sheet.py 7d18cb8d-6275-4ce3-bfaa-90173f9974ce   (the animation id; from the game folder)"""
import io, json, urllib.request
from PIL import Image
OBJ = '150eeca7-8f39-44af-a94e-aef82214aacf'
BASE = 'https://backblaze.pixellab.ai/file/pixellab-characters/objects/86a357f3-f8dc-4947-92d1-4b46f9125b7f/' + OBJ
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'curl/8.0'})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert('RGBA')
import sys
anim = sys.argv[1] if len(sys.argv) > 1 else None
frames = [get(f'{BASE}/animations/{anim}/unknown/{i}.png') for i in range(13)] if anim else [get(f'{BASE}/rotations/unknown.png')] * 13
sheet = Image.new('RGBA', (96 * 13, 96))
for i, f in enumerate(frames): sheet.paste(f, (i * 96, 0))
sheet.save('assets/case/clicker-open.png', optimize=True)
print('clicker-open.png', 'animated' if anim else 'still only')
