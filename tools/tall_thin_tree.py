"""The loader's thin tree (bush6) was short next to the tall one. This makes it taller: the leafy top is stretched to
1.5x its height (whole rows repeated, so the pixels stay square-edged) and the trunk is made twice as long.
Keeps the old one as bush6-short.png. Run once."""
import os
from PIL import Image
f = 'assets/loader/bush6.png'
if not os.path.exists('assets/loader/bush6-short.png'): Image.open(f).save('assets/loader/bush6-short.png')
im = Image.open('assets/loader/bush6-short.png').convert('RGBA')
top = im.crop((0, 0, 16, 21)).resize((16, 32), Image.NEAREST)
trunk = im.crop((0, 21, 16, 29)).resize((16, 16), Image.NEAREST)
foot = im.crop((0, 29, 16, 32))
out = Image.new('RGBA', (16, 51)); out.paste(top, (0, 0)); out.paste(trunk, (0, 32)); out.paste(foot, (0, 48)); out.save(f, optimize=True)
print(out.size)
