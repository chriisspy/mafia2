"""THE NAVY THEME (28 Nov 2026, his ask): "make the whole UI the dark navy and white UI instead of the beige and red across the whole app".

The game's screens were built on a cream paper (--paper #f6dfae) with brown wood edges, brown text and, at Christmas, a red and green frame round
every panel. The chat, the leaderboard, the Tavern menu and the map were already the dark navy he likes. This makes everything else match, WITHOUT
rewriting hundreds of rules by hand: it reads every stylesheet rule in index.html and in the .js files (they add their own styles), and for each
rule that paints a cream, white-paper or tan background, or sets brown text, it writes the same selector again with the navy colour. The result is
theme.js: one <style> that is kept LAST in the page, so it wins over the rule it copies (same selector, later in the page).

Run from the mafia2 folder:  python tools/make_theme.py      (run it again whenever a screen with cream on it is added)

What stays as it was: the buttons' own colours (red, green, gold, blue: tools/make_buttons.py), gold "picked" tiles, white speech bubbles, the white
Google button, flashes and other effects, and every picture drawn in code (this only touches CSS rules).
"""
import glob, re

NAVY, NAVY_D, NAVY_L, EDGE, CARD, CARD_OFF, TILE = '#2a2346', '#1b1532', '#3d3466', '#0f0b1e', '#332b57', '#1f1a38', '#3d3466'
BG = {'#fff6df': CARD, '#fffaf0': CARD, '#f1e3bd': CARD, '#fff6cf': CARD, '#efe3c6': CARD_OFF, '#cfc5ae': CARD_OFF, '#e4d6b4': NAVY_D, '#ffe9a8': TILE, '#e9c88a': NAVY_D,
      '#f6dfae': NAVY, 'var(--paper)': NAVY, 'var(--paper2)': NAVY_D}
WHITE_BG = {'.card.sel', '.ocard.sel', '#fishBookModal .fcard', '#joeModal .jrod', '.hwal', '.plr', '.stakes input', '#talkHud .modal input,#talkHud .modal textarea'}   # white paper to recolour (the rest of the whites are effects, bubbles, the Google button)
DARK_TEXT = {'#4a2a14', '#5a3420', '#3a2416', '#4a2a00', '#6b4a2a', '#7a5a3a', '#8a5a2b', '#1f55a8', '#9b1c2e', '#7a1c24', 'var(--text)', 'var(--wood)'}
LIGHT_BG = re.compile(r'background(?:-color)?:\s*(#ffe08a|#ffd25e|#fff2a8|#fff|#ffffff|#ffe9a8|#cfe9c0|#e6f3dc|#e9e0ff)\b', re.I)
SKIP = re.compile(r'(wflash|\.rar\b|\.gbtn|\.hb\.say|#loader|@keyframes|#winFx|#buyFx|\.kpD|\.stT|\.lbRow|#beerModal|#flip|#chat|#board|#tmap|#worldBack|#buyModal|\.bpack)')

RULE = re.compile(r'([^{}`;\n]{1,300})\{([^{}]{1,900})\}')


def rules(text):
    for m in RULE.finditer(text):
        sel, body = m.group(1).strip(), m.group(2)
        sel = re.sub(r'^.*(?:\*/|\$\{[^}]*\}|[`\'"]|=)\s*', '', sel).strip()      # drop a comment, a quote or a `=` in front of it (styles written inside JS)
        if not sel or not re.match(r'^[#.\w\[:*]', sel) or re.search(r'\b(if|for|function|return|const|let|=>)\b', sel) or '(' in sel.split(':')[0]:
            continue
        if not re.search(r'[#.]', sel) and not re.match(r'^(h[1-6]|input|textarea|button)\b', sel):
            continue
        yield sel, body


def main():
    out, seen = [], set()
    srcs = [open('index.html', encoding='utf-8').read().split('/*BTN-CSS*/')[0]] + [open(f, encoding='utf-8').read() for f in sorted(glob.glob('*.js')) if f not in ('theme.js', 'icons.js')]
    for text in srcs:
        for sel, body in rules(text):
            if SKIP.search(sel) or sel in ('.btn', '.panel'):      # those two are set once, by hand, in `base` below
                continue
            dec = []
            bg = re.search(r'background(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|var\(--paper2?\))', body)
            if bg:
                v = bg.group(1).lower()
                if v in BG:
                    dec.append('background-color:' + BG[v])
                elif v in ('#fff', '#ffffff') and sel in WHITE_BG:
                    dec.append('background-color:' + (NAVY_L if 'sel' in sel else CARD))
            col = re.search(r'(?<![-\w])color:\s*(#[0-9a-fA-F]{3,6}|var\(--(?:text|wood)\))', body)
            light = LIGHT_BG.search(body) and not dec
            if col and col.group(1).lower() in DARK_TEXT and not light:
                dec.append('color:#fff')
            elif light and not col:
                dec.append('color:#1a1430')                       # a tile that stays gold or pale keeps dark words (they used to inherit brown; now they would inherit white)
            bd = re.search(r'border(?:-color)?:[^;]*?(#5a3420|#c58a4a|#9b1c2e|var\(--wood2?\))', body)
            if bd and bd.group(1) != 'var(--wood)':
                dec.append('border-color:' + EDGE)
            if dec and (sel, tuple(dec)) not in seen:
                seen.add((sel, tuple(dec))); out.append(sel + '{' + ';'.join(dec) + '}')
    base = f'''#phone{{--paper:{NAVY};--paper2:{NAVY_D};--wood:{EDGE};--wood2:{NAVY_L};--text:#ffffff}}
#phone .panel,#phone.xmas .panel{{background:{NAVY};color:#fff;border:3px solid {EDGE};border-image:none!important;border-radius:6px;box-shadow:inset 0 -6px 0 {NAVY_D},inset 0 2px 0 {NAVY_L},0 6px 0 #0008}}
:where(#phone) .btn{{background-color:#3a4467;color:#fff;text-shadow:none}}
#phone .mhead b,#phone .modal h3,#phone .panel h3,#phone .panel h4{{color:#ffd25e;text-shadow:0 2px 0 {EDGE}}}
#phone .small{{color:#c9c2e6}}#phone .small.bad{{color:#ff8a8a}}
#phone input.hin,#phone .panel input[type=text],#phone .panel input:not([type]),#phone .panel textarea{{background:#16112b;color:#fff;border-color:{EDGE};caret-color:#ffd25e}}
#phone .panel input::placeholder,#phone .panel textarea::placeholder{{color:#8f84b8}}
#phone .ocard.lock,#phone .card.lock{{color:#8d86a8}}
#phone .ocard.sel,#phone .card.sel{{border-color:#ffd25e}}
#phone #homeName{{background:#16112b;color:#fff;border-color:{EDGE}}}#phone #homeName small{{color:#b9a8e0}}
#phone .btn.go,#phone .btn.sel{{color:#1a1430;text-shadow:none}}
#phone .hlink{{color:#c9c2e6}}#phone #wmLeave,#phone .mlbl{{color:#ff8a8a}}
#phone #dawnNote,#phone .lastnote,#phone #winCard{{background:#332b57;color:#fff}}
#phone .modal,#phone .panel{{scrollbar-width:none}}#phone .modal::-webkit-scrollbar,#phone .panel::-webkit-scrollbar{{display:none}}'''
    css = base + '\n' + '\n'.join(out)
    js = ('/* THE NAVY THEME: written by tools/make_theme.py (read its top). Do not edit it here: change that file and run it.\n'
          '   One <style> kept LAST in the page (a watcher moves it back to the end whenever another script adds styles after it). */\n'
          '(() => { const st = document.createElement(\'style\'); st.id = \'navyTheme\'; st.textContent = ' + repr(css).replace('\\n', '\\n') + ';\n'
          '  const last = () => { if (document.head.lastElementChild !== st) document.head.appendChild(st); }; last();\n'
          '  new MutationObserver(last).observe(document.head, {childList: true}); })();\n')
    open('theme.js', 'w', encoding='utf-8', newline='\n').write(js)
    print(len(out), 'rules recoloured,', len(css), 'bytes')


if __name__ == '__main__':
    main()
