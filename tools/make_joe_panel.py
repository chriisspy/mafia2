"""FISHERMAN JOE'S PANEL FRAME (17 Nov 2026, his ask: "change the theme of the fisherman Joe panel to be blue and white").
The Christmas panel frame (assets/xmas/panel.svg, made by tools/make_xmas_panel.py) with its colours swapped:
every red becomes a blue of the same lightness, every green becomes white or pale blue, the dark outline goes navy,
the snow stays as it is. -> assets/fishing/panel-joe.svg (used only by #joeModal).
Run:  python -I tools/make_joe_panel.py   (from the game folder; again if the Christmas frame is ever redrawn)"""
import re, colorsys
s = open('assets/xmas/panel.svg', encoding='utf-8').read()
def swap(m):
    h = m.group(1); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, l, sat = colorsys.rgb_to_hls(r, g, b)
    if sat < .12 or l > .9: return m.group(0)                                  # snow, greys: leave
    deg = hh * 360
    if deg < 25 or deg > 330:                                                   # red -> blue (dark reds -> navy)
        r, g, b = colorsys.hls_to_rgb(215 / 360, l, min(1, sat * .95))
    elif 70 < deg < 170:                                                        # green -> white / pale blue, lighter the lighter it was
        r, g, b = colorsys.hls_to_rgb(210 / 360, min(.97, .62 + l * .7), .75)
    else: return m.group(0)
    return 'fill="#%02x%02x%02x"' % (round(r * 255), round(g * 255), round(b * 255))
out = re.sub(r'fill="#([0-9a-fA-F]{6})"', swap, s)
open('assets/fishing/panel-joe.svg', 'w', encoding='utf-8', newline='').write(out)
print('panel-joe.svg', len(out), 'bytes,', len(set(re.findall(r'fill="#([0-9a-f]{6})"', out))), 'colours')
