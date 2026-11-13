"""His Christmas town (13 Nov 2026) -> the game's files.   Run:  python -I tools/make_xmas_art.py   (from the game folder)

He drew these in  Dropbox/Documents/chrispy games/town background assets/NEW :
  day-christmas.png, night-christmas.png     the whole ground, 560 x 750, same layout as the normal town
  cabins/christmas/christmas-1..10.png       ten snowy huts, 152 x 152 (christmas-10 is the one with the Santa hat)
What this does (it never repaints his art):
  * copies the two grounds to assets/xmas/
  * puts each hut in the game's hut frame. The Christmas frame is 10 px wider on the LEFT (126 x 154) because the
    Santa hat on hut 10 sticks out past the normal one; the game uses CABIN_FRAME {dx:-68,...} while it is Christmas.
  * hut N goes on spot N, and hut 10 on spot 0 (top middle), as with the normal huts."""
import os
from PIL import Image
SRC = r'C:\Users\Chris\Dropbox\Documents\chrispy games\town background assets\NEW'
OUT = 'assets/xmas'
HUT_DX, HUT_DY, PAD = 17, -3, 10
os.makedirs(OUT + '/cabins', exist_ok=True)
for n, f in (('night', 'night-christmas'), ('day', 'day-christmas')):
    im = Image.open(f'{SRC}/{f}.png'); assert im.size == (560, 750), im.size
    im.convert('RGB').save(f'{OUT}/{n}.png', optimize=True)
for spot in range(10):
    n = 10 if spot == 0 else spot
    im = Image.open(f'{SRC}/cabins/christmas/christmas-{n}.png').convert('RGBA'); assert im.size == (152, 152), im.size
    fr = Image.new('RGBA', (116 + PAD, 154), (0, 0, 0, 0)); fr.paste(im, (PAD - HUT_DX, -HUT_DY))
    bb = fr.getchannel('A').getbbox(); assert bb[0] >= 0 and bb[2] <= fr.width, bb
    fr.save(f'{OUT}/cabins/cabin{spot}.png', optimize=True)
print('christmas town copied')
