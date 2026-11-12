"""The Cabin Case opening: PixelLab object 46ba23fc (the wooden state of the Mafia case), animation 'open-front'
(v3, 12 frames + the still = 13). Joins the 13 frames into assets/case/cabin-open.png, 96 px each, like open.png.
Usage: python tools/cabin_case_sheet.py <folder with 0.png .. 12.png>"""
import sys
import numpy as np
from PIL import Image
src = sys.argv[1]
fr = [Image.open(f'{src}/{i}.png').convert('RGBA') for i in range(13)]
sheet = Image.new('RGBA', (96 * 13, 96))
for i, f in enumerate(fr): sheet.paste(f, (i * 96, 0))
sheet.save('assets/case/cabin-open.png', optimize=True)
for i in (0, 7, 12):
    a = np.asarray(fr[i])[..., 3] > 0; ys = np.where(a.any(1))[0]; xs = np.where(a.any(0))[0]
    print(i, 'box', xs[0], ys[0], xs[-1], ys[-1])
