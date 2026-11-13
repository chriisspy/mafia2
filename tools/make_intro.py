"""The intro film's art (13 Nov 2026). Backgrounds: Nano Banana 2.1 on Higgsfield, with the town art as the style
reference (sources in mafia2-art/intro). This shrinks each to the game's pixel grid (a light median filter, then the
middle pixel of each cell, so edges stay crisp) and trims the colours to 160 so the files stay small.
The bus: PixelLab map object d3064420 (side view). It gets the same 1 px dark navy outline the characters have.
usage (from the game folder): python -I tools/make_intro.py"""
import numpy as np
from PIL import Image, ImageFilter
SRC = r"C:\Users\Chris\Dropbox\Documents\claude chrispy\mafia2-art\intro"
OUT = "assets/intro"
for name, src, w, h in (("stop", "1-busstop", 360, 482), ("road", "2-road", 990, 420), ("forest", "3-forest", 990, 420), ("town", "4-town", 300, 538)):
    im = Image.open(f"{SRC}/{src}.png").convert("RGB").filter(ImageFilter.MedianFilter(3))
    a = np.asarray(im); H, W = a.shape[:2]
    ys = ((np.arange(h) + .5) * H / h).astype(int); xs = ((np.arange(w) + .5) * W / w).astype(int)
    small = Image.fromarray(a[ys][:, xs])
    small.quantize(160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(f"{OUT}/{name}.png", optimize=True)
    print(name, small.size)
# THE COACH (13 Nov, his call: a big commercial coach, nobody visible in the driver's seat, players behind tinted glass).
# PixelLab map object 7daf1fba (176x80, side view, facing right) saved as coachD.png. The pale driver's window is
# painted the same dark tint as the passenger glass, and a navy outline goes only where the edge is not already dark
# (so no outline gets thicker).
b = np.asarray(Image.open(f"{SRC}/coachD.png").convert("RGBA")).copy()
b[b[..., 3] < 128] = 0; b[b[..., 3] >= 128, 3] = 255
ys, xs = np.nonzero(b[..., 3]); b = b[ys.min() - 1:ys.max() + 2, xs.min() - 1:xs.max() + 2]
rgb = b[..., :3].astype(int); lum = rgb.sum(2) / 3
pale = (b[..., 3] > 0) & (rgb[..., 2] > rgb[..., 0] + 12) & (lum > 120)            # the light blue driver's glass
pale[:, :b.shape[1] * 2 // 3] = False
pale[40:] = False                                                               # (not the wheel hubs)
b[pale] = (34, 44, 70, 255)
op = b[..., 3] > 0; light = op & (lum > 70); edge = np.zeros_like(op)
edge[1:] |= light[:-1]; edge[:-1] |= light[1:]; edge[:, 1:] |= light[:, :-1]; edge[:, :-1] |= light[:, 1:]; edge &= ~op
b[edge] = (26, 20, 48, 255)
Image.fromarray(b).save(f"{OUT}/bus.png", optimize=True); print("bus", b.shape[1], b.shape[0])
