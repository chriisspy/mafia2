"""post4 and post6 (the thin posts under the chains) were cut 7 px wide from the old town, so their wide feet stayed in the
old ground and were lost when his new ground went in. This gives them the foot of post7 / post8 (same wood, same light).
Run once; the new pictures are 12 px wide, so they sit 2 px further left in TOWN.occ."""
from PIL import Image
ROWS = 14
for d in ('assets/town3/props', 'assets/town4/props-off'):
    for thin, fat in (('post4', 'post7'), ('post6', 'post8')):
        a = Image.open(f'{d}/{thin}.png').convert('RGBA'); b = Image.open(f'{d}/{fat}.png').convert('RGBA')
        if a.width != 7: print('already done', d, thin); continue
        out = Image.new('RGBA', (12, a.height)); out.paste(a.crop((0, 0, 7, a.height - ROWS)), (2, 0))
        out.paste(b.crop((0, b.height - ROWS, 12, b.height)), (0, a.height - ROWS)); out.save(f'{d}/{thin}.png', optimize=True)
