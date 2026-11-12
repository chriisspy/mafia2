"""The Cabin Case opening: 13 frames of 96 px built from the one PixelLab picture (assets/case/cabin.png), laid out
like the Mafia case sheet (frames 0-6 shut, 7-12 the lid lifting and falling back so you see inside it)."""
from PIL import Image, ImageDraw
src = Image.open('assets/case/cabin.png').convert('RGBA')
base = Image.new('RGBA', (96, 96)); base.paste(src, (0, 1))          # one pixel down: feet on row 85, seam on row 46
SEAM = 46
lid = base.crop((0, 0, 96, SEAM)); body = base.crop((0, SEAM, 96, 96))
# the latch stays on the body: paint wood over the bit of it that sits on the lid
patch = lid.crop((20, 38, 40, SEAM)); lid.paste(patch, (38, 38))
bb = base.getbbox(); x0, x1 = bb[0] + 2, bb[2] - 2
OUT, IN1, IN2, RIM = (38, 20, 12, 255), (122, 74, 38, 255), (84, 48, 24, 255), (160, 104, 56, 255)
GLOW = [(255, 243, 184, 255), (255, 210, 74, 255)]
sheet = Image.new('RGBA', (96 * 13, 96))
def frame(i):
    f = Image.new('RGBA', (96, 96)); d = ImageDraw.Draw(f)
    if i < 7:
        f.alpha_composite(base); return f
    if i == 7:      # the lid jumps: a bright crack of light under it
        d.rectangle([x0, SEAM - 3, x1, SEAM], fill=GLOW[0]); f.alpha_composite(lid, (0, -3))
    elif i == 8:    # tipping back: the front of the lid gets short, light under it
        d.rectangle([x0, SEAM - 9, x1, SEAM], fill=GLOW[1]); d.rectangle([x0 + 6, SEAM - 6, x1 - 6, SEAM], fill=GLOW[0])
        sq = lid.crop((0, 8, 96, SEAM)).resize((96, 18), Image.NEAREST); f.alpha_composite(sq, (0, SEAM - 9 - 18))
    else:           # open: you look at the inside of the lid
        h = {9: 16, 10: 20, 11: 22, 12: 22}[i]; top = SEAM - h
        d.rectangle([x0 - 1, top, x1 + 1, SEAM], fill=OUT); d.rectangle([x0 + 1, top + 2, x1 - 1, SEAM], fill=IN1)
        d.rectangle([x0 + 1, top + 2, x1 - 1, top + 3], fill=RIM); d.rectangle([x0 + 1, SEAM - h // 3, x1 - 1, SEAM], fill=IN2)
        d.rectangle([44, top - 2, 52, top], fill=OUT); d.rectangle([45, top - 1, 51, top], fill=(190, 150, 70, 255))   # the latch plate on the lid's rim
        if i < 12:
            g = {9: 14, 10: 9, 11: 4}[i]
            d.rectangle([48 - g * 2, SEAM - g, 48 + g * 2, SEAM], fill=GLOW[1]); d.rectangle([48 - g, SEAM - g // 2 - 1, 48 + g, SEAM], fill=GLOW[0])
    f.alpha_composite(body, (0, SEAM))
    if i >= 7: ImageDraw.Draw(f).rectangle([x0 + 1, SEAM, x1 - 1, SEAM + 1], fill=OUT)   # the dark mouth
    return f
for i in range(13): sheet.paste(frame(i), (i * 96, 0))
sheet.save('assets/case/cabin-open.png', optimize=True)
sheet.resize((96 * 13 * 2, 192), Image.NEAREST).save(r'C:\Users\Chris\AppData\Local\Temp\claude\2ae62db04b55ef69\ea95aec9-da3f-4ac9-85a1-11ea2e09cfe8\scratchpad\cabopen.png')
