/* ================= THE TOWN MAP (28 Nov 2026, his ask) =================
   The map button in the bottom buttons (where the coin shop button was). It shows the map you are on: the town, or the South.
   The names of the buildings sit above them, your own head shows where you are, and tapping a building tells you what it is,
   what you can do there and what you can get there (with the game's own icons).
   The picture is the game's own art, drawn small: the town's day picture (dayTown: ground, cabins, buildings, trees) or the
   South's ground with its buildings on top (southObjs). Nothing here is saved and nothing talks to the server.
   The Forgotten Forest and the Hidden Temple are secrets: they are never on the map. */
(() => {
  const esc2 = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const pic = (src, w) => `<img src="${src}" alt="" style="width:${w || 32}px;height:${w || 32}px;object-fit:contain;image-rendering:pixelated;flex:none">`;
  const file = p => pic(p + '?v=' + (typeof av === 'function' ? av(p) : BUILD));
  const px = (rows, C, sc) => { const c = mk(rows[0].length, rows.length), x = c.getContext('2d'); rows.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return pic(c.toDataURL(), 32); };
  const coin = n => `<span class="tmC">${ic('coin', 2)}${n}</span>`;
  // little pictures of my own for the things that have none in the game yet
  const his = k => pic(hisIcon(k).toDataURL(), 32);   // the icons drawn in his style (index.html: hisIcon)
  const BEER = () => his('beer'), KNIFE = () => his('knife'), DICE = () => his('cards'), S7 = () => his('slot'), WHL = () => his('wheel'), BIGC = () => ic('aCoin', 2, 'solo'), SCHN = () => his('schnitzel');

  /* what each place is. box = [x0, y0, x1, y1] on its map (where you tap, and the name sits above its top); you = where your head goes while you are inside it */
  const PLACES = {
    town: () => {
      const B = k => BUILDINGS.find(b => b.k === k), out = [];
      const t = B('tavern'), c = B('casino');
      if (t) out.push({k: 'tavern', n: 'TAVERN', box: [t.x, t.y, t.x + t.w, t.y + t.h], you: bldDoor(t), loc: 100,
        d: 'Sit by the fire, have a drink and something to eat, and throw knives at the target.',
        items: [[BEER(), 'Beer', coin(5)], [SCHN(), 'Chicken schnitzel: one hit in the mine costs you no heart', coin(SCHN_PRICE)], [KNIFE(), 'Knife throwing', '']]});
      if (c) out.push({k: 'casino', n: 'CASINO', box: [c.x, c.y, c.x + c.w, c.y + c.h], you: bldDoor(c), loc: 101,
        d: 'Bet your coins. You can win big or lose it all.',
        items: [[S7(), 'Slot machines', ''], [BIGC(), 'Coin flip', ''], [DICE(), 'Blackjack tables', ''], [ic('aCoin', 2, 'solo'), 'ATM: get more coins', '']]});
      out.push({k: 'wheel', n: 'WHEEL', box: [WHEEL_AT[0] - 34, WHEEL_AT[1] - 70, WHEEL_AT[0] + 34, WHEEL_AT[1] + 6],
        d: 'Spin it for a prize. One spin is free every day.', items: [[WHL(), 'A free spin each day', ''], [BIGC(), 'Coins and other prizes', '']]});
      out.push({k: 'lake', n: 'LAKE', box: [JETTY[0] - 40, JETTY[1] - 60, JETTY[0] + 70, JETTY[1] + 16], you: JETTY, loc: LAKE,
        d: 'Walk to the end of the jetty to fish. Sell what you catch for coins. A better rod casts further and catches better fish.',
        items: (typeof RODS !== 'undefined' ? RODS : []).map(r => [file('assets/fishing/rod-' + r.id + '.png'), r.name, r.price ? coin(r.price.toLocaleString()) : 'Free'])});
      const me = NET && NET.world && NET.slot != null && TOWN.cabins[NET.slot];
      if (me) out.push({k: 'home', n: 'HOME', box: [me.cx - 26, me.top - 6, me.cx + 26, me.top + 44], d: 'Your cabin. Walk in to see inside. The owner of the world can decorate the town.', items: []});
      const sb = HALLS[SOUTH - 100].back;
      out.push({k: 'south', n: 'THE SOUTH', box: [sb[0] - 44, sb[1] - 34, sb[0] + 44, sb[1] + 14],
        d: 'Walk down this road to the South: the market, the Blacksmith, the gold mine and the race track.', items: []});
      return out;
    },
    south: () => {
      const out = [], b = IMG['bld/blacksmith'], mi = IMG['s/mine'];
      if (b) out.push({k: 'smithy', n: 'BLACKSMITH', box: [S_BLD.x, S_BLD.y, S_BLD.x + b.width, S_BLD.y + b.height], you: S_BLD.door, loc: SMITHY,
        d: 'Buy a better pickaxe to dig faster, and smelt your gold into coins.',
        items: (typeof MR !== 'undefined' ? MR.picks : []).filter(p => p.price).map(p => [file('assets/mine/picks/' + p.id + '.png'), p.name, coin(p.price.toLocaleString()) + (p.cry ? ' + ' + p.cry + ' crystals' : '')])});
      if (mi) out.push({k: 'mine', n: 'MINE', box: [S_MINE.x, S_MINE.y, S_MINE.x + mi.width, S_MINE.y + mi.height], you: S_MINE.door, loc: MINE,
        d: 'Dig for gold. The deeper you go, the more there is, and the more it hurts. You have 3 hearts.',
        items: [[typeof GOLD_ICON !== 'undefined' ? pic(GOLD_ICON.toDataURL()) : '', 'Gold: smelt it at the Blacksmith', ''], [typeof CRY_ICON !== 'undefined' ? pic(CRY_ICON.toDataURL()) : '', 'Crystals: rare, from level 7 down', '']]});
      const xs = S_STALLS.map(s => s[0]), ys = S_STALLS.map(s => s[1]);
      out.push({k: 'market', n: 'MARKET', box: [Math.min(...xs), Math.min(...ys), Math.max(...xs) + 49, Math.max(...ys) + 56],
        d: 'Eight stalls. Rent one and sell what you own at your own prices, or shop at somebody else\'s.',
        items: [[ic('aShop', 2, 'solo'), 'Your own stall', coin((typeof STALL_PRICE !== 'undefined' ? STALL_PRICE : 2500).toLocaleString())]]});
      out.push({k: 'race', n: 'RACE TRACK', box: [S_RACE.x - 70, S_RACE.y0 - 6, S_RACE.x + 16, S_RACE.y1 + 6], d: 'Take the road out to the right to race.', items: []});
      out.push({k: 'town', n: 'THE TOWN', box: [S_ENTRY.x0 - 30, 0, S_ENTRY.x1 + 30, 40], below: true, d: 'Walk up this road to go back to the town.', items: []});
      return out;
    }};

  const st = document.createElement('style');
  st.textContent = `
#tmapModal{left:0!important;right:0!important;top:0!important;bottom:0!important;max-height:none!important;width:auto;height:auto;margin:0;border-radius:0;z-index:31;overflow:hidden;color:#f6dfae;
  padding:calc(12px + env(safe-area-inset-top)) calc(12px + var(--sr,0px)) calc(10px + env(safe-area-inset-bottom)) calc(12px + var(--sl,0px));background:#1c1538}
#tmapModal.on{display:flex;flex-direction:column}
#tmapModal .mhd{display:flex;justify-content:space-between;align-items:center;flex:none;margin-bottom:8px}
#tmapModal .mhd b{font:700 22px 'Pixelify Sans';letter-spacing:1px;color:#ffd25e;text-shadow:0 2px 0 #0f0b1e}
#tmapX{width:40px;height:40px;padding:0;display:flex;align-items:center;justify-content:center}
#tmapScroll{flex:1;min-height:0;overflow:auto;border:3px solid #0f0b1e;border-radius:6px;background:#0c0919;scrollbar-width:none}
#tmapScroll::-webkit-scrollbar{display:none}
#tmapIn{position:relative;width:100%}#tmapCv{display:block;width:100%;height:auto;image-rendering:pixelated}
.tmP{position:absolute;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tmP.sel{outline:2px solid #ffd25e;outline-offset:1px;border-radius:4px}
.tmN{position:absolute;transform:translate(-50%,-100%);font:700 11px 'Pixelify Sans';letter-spacing:.5px;color:#fff;background:#1a1430;border:2px solid #0f0b1e;border-radius:4px;padding:1px 5px 2px;white-space:nowrap;pointer-events:none}
.tmN.below{transform:translate(-50%,0)}.tmN.sel{background:#ffd25e;color:#1a1430}
#tmapYou{position:absolute;width:26px;height:26px;transform:translate(-50%,-80%);pointer-events:none;image-rendering:pixelated;background:#fff;border:2px solid #0f0b1e;border-radius:4px;object-fit:contain;animation:tmBob 1s steps(2) infinite}
@keyframes tmBob{50%{margin-top:-2px}}
#tmapInfo{flex:none;margin-top:8px;background:#2a2346;border:3px solid #0f0b1e;border-radius:6px;padding:8px 10px 10px;max-height:38%;overflow:auto;display:none;text-align:left}
#tmapInfo.on{display:block}#tmapInfo h4{margin:0 0 3px;font:700 17px 'Pixelify Sans';color:#ffd25e;letter-spacing:.5px}
#tmapInfo p{margin:0 0 6px;font:600 14px 'Pixelify Sans';line-height:1.25}
.tmI{display:flex;align-items:center;gap:8px;font:600 14px 'Pixelify Sans';padding:3px 0;border-top:2px solid #1b1532}
.tmI span.t{flex:1;min-width:0}.tmC{display:inline-flex;align-items:center;gap:3px;color:#ffd25e;white-space:nowrap}
#phone.land #tmapModal.on{flex-direction:row;flex-wrap:wrap;column-gap:10px}#phone.land #tmapModal .mhd{width:100%}
#phone.land #tmapScroll{flex:1;height:calc(100% - 52px)}#phone.land #tmapInfo{flex:1;max-height:calc(100% - 52px);margin-top:0}`;
  document.head.appendChild(st);

  const ref = $('#beerModal'), d = document.createElement('div'); d.className = 'modal'; d.id = 'tmapModal';
  d.innerHTML = `<div class="mhd"><b id="tmapT">MAP</b><button class="btn dark" id="tmapX">${ic('cross', 2, 'solo')}</button></div>
<div id="tmapScroll"><div id="tmapIn"><canvas id="tmapCv" width="8" height="8"></canvas></div></div><div id="tmapInfo"></div>`;
  ref.parentNode.insertBefore(d, ref);
  const TM = {which: 'town', W: 1, H: 1, ox: 0, list: [], sel: null};

  function paint() {
    const cv = $('#tmapCv'), x = cv.getContext('2d');
    if (TM.which === 'south') { const g = IMG['hall/south']; TM.W = g.width; TM.H = g.height; TM.ox = 0; cv.width = TM.W; cv.height = TM.H; x.drawImage(g, 0, 0);
      southObjs({x: -9999, y: -9999}, 0).sort((a, b) => a.base - b.base).forEach(o => { if (o.img) x.drawImage(o.img, o.x, o.y); }); }
    else { const g = dayTown(); TM.W = g.width; TM.H = g.height; TM.ox = g.ox || 0; cv.width = TM.W; cv.height = TM.H; x.drawImage(g, 0, 0);
      try { const w = wheelObj(); if (w && w.img) x.drawImage(w.img, w.x + TM.ox, w.y); } catch (e) {} }
  }
  const pct = (wx, wy) => [(wx + TM.ox) / TM.W * 100, wy / TM.H * 100];
  function youAt() { const m = WL.me; if (!m) return null; const here = TM.which === 'south' ? SOUTH : -1; if (m.loc === here) return [m.x, m.y];
    const p = TM.list.find(q => q.loc === m.loc && q.you); if (p) return p.you;
    if (TM.which === 'town' && m.loc >= 0 && m.loc < 100 && TOWN.cabins[m.loc]) { const c = TOWN.cabins[m.loc]; return [c.cx, c.top + 40]; }   // inside a cabin
    return null; }
  function layout() {
    const box = $('#tmapIn'); box.querySelectorAll('.tmP,.tmN,#tmapYou').forEach(e => e.remove());
    for (const p of TM.list) { const [x0, y0] = pct(p.box[0], p.box[1]), [x1, y1] = pct(p.box[2], p.box[3]);
      const b = document.createElement('button'); b.className = 'tmP'; b.dataset.k = p.k; b.style.cssText = `left:${x0}%;top:${y0}%;width:${x1 - x0}%;height:${y1 - y0}%`; b.onclick = () => pick(p.k); box.appendChild(b);
      const n = document.createElement('div'); n.className = 'tmN' + (p.below ? ' below' : ''); n.dataset.k = p.k; n.textContent = p.n; n.style.cssText = `left:${clamp((x0 + x1) / 2, 12, 88)}%;top:${p.below ? y1 : y0}%`; box.appendChild(n); }
    const at = youAt(), src = at && face(looksLike(0));
    if (at && src) { const [ux, uy] = pct(at[0], at[1]), im = document.createElement('img'); im.id = 'tmapYou'; im.src = src; im.alt = ''; im.style.left = clamp(ux, 4, 96) + '%'; im.style.top = clamp(uy, 5, 100) + '%'; box.appendChild(im);
      requestAnimationFrame(() => { const sc = $('#tmapScroll'); sc.scrollTop = Math.max(0, im.offsetTop - sc.clientHeight / 2); }); }
  }
  function pick(k) { const p = TM.list.find(q => q.k === k), el = $('#tmapInfo'); TM.sel = k; sfx('click');
    $('#tmapIn').querySelectorAll('.tmP,.tmN').forEach(e => e.classList.toggle('sel', e.dataset.k === k));
    el.innerHTML = `<h4>${esc2(p.n)}</h4><p>${esc2(p.d)}</p>` + p.items.filter(i => i).map(([im, t, r]) => `<div class="tmI">${im || ''}<span class="t">${esc2(t)}</span>${r || ''}</div>`).join('');
    el.classList.add('on'); el.scrollTop = 0; }
  window.tmapOpen = () => { const m = WL.me; if (!m) return;
    TM.which = (typeof SOUTH !== 'undefined' && (m.loc === SOUTH || (typeof SMITHY !== 'undefined' && (m.loc === SMITHY || m.loc === MINE)))) && IMG['hall/south'] ? 'south' : 'town';
    document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on'));
    $('#tmapT').textContent = TM.which === 'south' ? 'THE SOUTH' : 'THE TOWN'; TM.sel = null; $('#tmapInfo').classList.remove('on'); $('#tmapInfo').innerHTML = '';
    try { paint(); TM.list = PLACES[TM.which](); } catch (e) { console.error(e); TM.list = []; }
    d.classList.add('on'); layout(); sfx('click'); };
  window.tmapShut = () => { d.classList.remove('on'); sfx('close'); };
  $('#tmapX').onclick = tmapShut;
  const b = $('#townMap'); if (b) b.onclick = tmapOpen;
})();
