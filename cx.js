/* ================= THE CRYSTAL SHOP (28 Nov 2026, his ask; the keep-playing plan's "things only crystals buy") =================
   Things coins can never buy, only crystals: so every crystal is worth chasing. They are all things OTHER PLAYERS SEE on you.
     TRAILS        little pixel sparks left behind you as you walk (drawn in code: solid squares, nothing soft)
     NAME COLOURS  the colour of your name over your head
   (Pets are bought with crystals too: pets.js, in the Collection.)
   It sits at the top of the Shop. Tap a thing to buy it; tap one you own to use it, tap again to take it off.
   The server keeps what you own and what is on (functions/keep.js: cxBuy, cxSet; wallet.cx = {id: 1}, wallet.trail, wallet.nc).
   The others see them: both ride in what you already send about yourself (index.html netM: tr, nc).
   THE BIG ONES (28 Nov, his ask: "WAY more worth it... like how the Godfather has a car and the Alien can abduct people"; his picks):
     POWERS      Banana Peel, Shrink Ray, Jetpack, Dragon (a ride). You own them; you use them out in the town (powers.js).
     ENTRANCES   how you arrive in a world: a lightning bolt, a UFO's beam, or falling out of the sky.
     CABIN       a Crystal Cabin (shown once its picture is in: powers.js says so).
   This file is the shop and what you own; powers.js is everything they DO. */
(() => {
  /* id: [name, crystals, ...]. The prices are mine (he gave none): the same list as the server's CX. */
  const TRAILS = {sparkle: ['Sparkle', 3], frost: ['Frost', 4], hearts: ['Hearts', 4], ember: ['Ember', 6], rainbow: ['Rainbow', 10]};
  const NAMES = {gold: ['Gold', 2, '#ffd25e'], ice: ['Ice', 2, '#7fe3ff'], pink: ['Pink', 2, '#ff8ad0'], lime: ['Lime', 2, '#8dff8a'], ruby: ['Ruby', 3, '#ff5a6a']};
  const POWERS = {peel: ['Banana Peel', 4], shrink: ['Shrink Ray', 6], jet: ['Jetpack', 10], mount: ['Dragon', 15]};
  const ENTS = {bolt: ['Lightning', 5], beam: ['UFO Beam', 5], fall: ['Sky Fall', 5]}, CABS = {crystal: ['Crystal Cabin', 12]};
  const DEF = {t: TRAILS, n: NAMES, p: POWERS, e: ENTS, c: CABS}, FLD = {t: 'trail', n: 'nc', e: 'ent', c: 'cab'};   // FLD: the kinds you switch on, and where the wallet keeps the one that is on
  const CX = {own: {}, trail: null, nc: null, ent: null, cab: null};
  window.cxOwn = key => !!CX.own[key]; window.cxSel = f => CX[f] || null;   // powers.js asks these
  const cryIc = () => typeof CRY_ICON !== 'undefined' ? `<img src="${CRY_ICON.toDataURL()}" alt="" style="width:${CRY_ICON.width * 2}px;height:${CRY_ICON.height * 2}px;image-rendering:pixelated">` : 'crystals';
  const cryHave = () => typeof GOLD !== 'undefined' ? GOLD.cry | 0 : 0;
  window.cxOut = () => ({t: CX.trail, n: CX.nc});   // what netM() tells the others

  /* ---------- TRAILS: each walker keeps its own sparks (e.tp); one is dropped every few steps while it moves ---------- */
  const RAIN = ['#ff5a6a', '#ffb24a', '#ffe45c', '#7dff9a', '#7fe3ff', '#b78cff'];
  const MAKE = {   // (x, y at the feet, n = a counter) -> a spark {x, y, vx, vy, life, c: colours it goes through, s: size, h: 1 = a heart}
    sparkle: (x, y, n) => ({x: x + (n * 7 % 9) - 4, y: y - (n * 5 % 6), vx: 0, vy: -7, life: .7, c: ['#ffffff', '#ffe45c', '#e5ae58'], s: n % 3 ? 1 : 2}),
    frost: (x, y, n) => ({x: x + (n * 7 % 11) - 5, y: y - 6 - (n * 3 % 5), vx: ((n * 13 % 7) - 3) * 2, vy: 9, life: .9, c: ['#ffffff', '#c8f4ff', '#7fe3ff'], s: n % 4 ? 1 : 2}),
    ember: (x, y, n) => ({x: x + (n * 5 % 7) - 3, y: y - 1, vx: ((n * 11 % 5) - 2) * 3, vy: -16, life: .8, c: ['#fff2a8', '#ffb24a', '#e8562a', '#9e2835'], s: n % 3 ? 1 : 2}),
    hearts: (x, y, n) => ({x: x + (n * 7 % 9) - 4, y: y - 4, vx: ((n * 3 % 3) - 1) * 3, vy: -11, life: 1, c: ['#ff8ad0', '#ff5a9a'], s: 1, h: 1}),
    rainbow: (x, y, n) => ({x: x + (n * 5 % 5) - 2, y: y - 1 - (n % 3), vx: 0, vy: -3, life: .85, c: [RAIN[n % 6]], s: 2})};
  function trailObj(e, kind, t) { const mk1 = MAKE[kind]; if (!mk1) return null; const tp = e.tp || (e.tp = []), dt = Math.min(.05, (t - (e.tpT || t)) / 1000 || 0); e.tpT = t;
    const moved = Math.hypot(e.x - (e.tpX ?? e.x), e.y - (e.tpY ?? e.y)); e.tpD = (e.tpD || 0) + moved; e.tpX = e.x; e.tpY = e.y;
    if (moved > 40) { tp.length = 0; e.tpD = 0; }                                    // it went through a door: no sparks drawn across the map
    while (e.tpD >= 3.5 && tp.length < 28) { e.tpD -= 3.5; e.tpN = (e.tpN | 0) + 1; tp.push(Object.assign(mk1(e.x, e.y, e.tpN), {t: 0})); }
    for (let i = tp.length - 1; i >= 0; i--) { const p = tp[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t >= p.life) tp.splice(i, 1); }
    if (!tp.length) return null;
    return {x: 0, y: 0, img: BLANK, base: Math.round(e.y) - 2, after() { for (const p of tp) { const k = p.t / p.life; lx.fillStyle = p.c[Math.min(p.c.length - 1, Math.floor(k * p.c.length))]; const sx = Math.round(X(p.x)), sy = Math.round(Y(p.y));
        if (p.h) { lx.fillRect(sx - 1, sy - 1, 1, 1); lx.fillRect(sx + 1, sy - 1, 1, 1); lx.fillRect(sx - 1, sy, 3, 1); lx.fillRect(sx, sy + 1, 1, 1); } else if (k < .85 || p.s === 1) lx.fillRect(sx, sy, p.s, p.s); else lx.fillRect(sx, sy, 1, 1); } }}; }
  const BLANK = mk(1, 1);
  { const ds = drawScene; drawScene = function (people, occ, img, objs) { const m = WL.me;
      if (m && people && people.includes && scene === scenes.town) { const t = performance.now(), add = [];
        if (CX.trail) { const o = trailObj(m, CX.trail, t); if (o) add.push(o); }
        for (const e of WL.bots || []) if (e && e.remote && e.tr && e.loc === m.loc) { const o = trailObj(e, e.tr, t); if (o) add.push(o); }
        if (add.length) objs = [...(objs || []), ...add]; }
      return ds.call(this, people, occ, img, objs); }; }

  /* ---------- NAME COLOURS: your name over your head, and each other player's over theirs ---------- */
  { const nt = nameTag; nameTag = function (hit, txt, col) { let c = col;
      if (txt === 'You') { if (CX.nc && NAMES[CX.nc]) c = NAMES[CX.nc][2]; }
      else { const e = (WL.bots || []).find(b => b && b.remote && b.nc && b.n === txt); if (e && NAMES[e.nc]) c = NAMES[e.nc][2]; }
      return nt.call(this, hit, txt, c); }; }

  // the wallet says what you own and what is on
  { const wa = walletApply; walletApply = function (w) { wa(w); const was = [CX.trail, CX.nc, CX.ent, CX.cab].join(); CX.own = (w && w.cx) || {}; for (const k in FLD) CX[FLD[k]] = w && DEF[k][w[FLD[k]]] ? w[FLD[k]] : null; paint();
      if (was !== [CX.trail, CX.nc, CX.ent, CX.cab].join()) { if (window.pwChanged) pwChanged(); if (typeof netMove === 'function') netMove(); } }; }

  /* ---------- the shop: a block at the top of the Shop ---------- */
  const st = document.createElement('style');
  st.textContent = `#cxShop{background:#1b1532;border:3px solid #0f0b1e;border-radius:6px;padding:8px 8px 10px;margin-bottom:12px;text-align:left}
#cxShop .cxH{display:flex;align-items:center;gap:6px;margin-bottom:6px}#cxShop .cxH b{flex:1;font:700 17px 'Pixelify Sans';color:#7fe3ff;letter-spacing:1px;text-shadow:0 2px 0 #0f0b1e}
#cxShop .cxW{display:inline-flex;align-items:center;gap:5px;font:700 15px 'Pixelify Sans';color:#fff;background:#16112b;border:3px solid #0f0b1e;border-radius:6px;padding:2px 8px 3px}
#cxShop .cxL{font:700 11px 'Pixelify Sans';letter-spacing:1.5px;color:#b9a8e0;margin:8px 0 4px}
.cxG{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.cxC{display:flex;flex-direction:column;align-items:center;gap:3px;background:#332b57;border:3px solid #0f0b1e;border-radius:6px;padding:5px 2px 6px;min-width:0;font-family:'Pixelify Sans';color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cxC canvas{width:44px;height:36px;image-rendering:pixelated;background:#16112b;border-radius:4px}.cxC .sw{width:44px;height:36px;display:flex;align-items:center;justify-content:center;background:#16112b;border-radius:4px;font:700 15px 'Pixelify Sans'}
.cxC b{font:700 11px 'Pixelify Sans';white-space:nowrap}.cxC small{display:inline-flex;align-items:center;gap:2px;font:700 12px 'Pixelify Sans';color:#7fe3ff;min-height:16px}
.cxG2{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.cxC.big canvas{width:120px;height:92px}.cxC.big b{font-size:14px}.cxC.big small{font-size:14px}
.cxC.own small{color:#c9c2e6}.cxC.on{border-color:#ffe45c;box-shadow:0 0 0 2px #ffe45c}.cxC.poor{opacity:.5;cursor:default}`;
  document.head.appendChild(st);
  $('#shopModal .mhead').insertAdjacentHTML('afterend', '<div id="cxShop"></div>');
  function paint() { const box = $('#cxShop'); if (!box) return; const have = cryHave();
    const card = (kind, id, D) => { const own = !!CX.own[kind + '_' + id], on = FLD[kind] ? CX[FLD[kind]] === id : false, big = kind === 'p';
      const pic = kind === 't' ? `<canvas width="22" height="18" data-tr="${id}"></canvas>` : kind === 'n' ? `<span class="sw" style="color:${D[2]}">Name</span>` : `<canvas width="${big ? 60 : 22}" height="${big ? 46 : 18}" data-pw="${kind}_${id}"></canvas>`;
      return `<button class="cxC${big ? ' big' : ''}${own ? ' own' : have < D[1] ? ' poor' : ''}${on ? ' on' : ''}" data-k="${kind}" data-id="${id}">${pic}<b>${D[0]}</b><small>${own ? (big ? 'Yours' : on ? 'On' : 'Use') : D[1] + ' ' + cryIc()}</small></button>`; };
    const row = (kind, L) => Object.keys(L).map(id => card(kind, id, L[id])).join(''), cab = window.pwCabin ? row('c', CABS) : '';   // the cabin only once its picture is in
    const h = `<div class="cxH"><b>CRYSTAL SHOP</b><span class="cxW">${cryIc()}<span>${have}</span></span></div><div class="cxL">POWERS</div><div class="cxG2">${row('p', POWERS)}</div><div class="cxL">${cab ? 'ENTRANCES AND CABIN' : 'ENTRANCES'}</div><div class="cxG">${row('e', ENTS)}${cab}</div><div class="cxL">TRAILS</div><div class="cxG">${row('t', TRAILS)}</div><div class="cxL">NAME COLOURS</div><div class="cxG">${row('n', NAMES)}</div>`;
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; } }
  // the little previews: a spark trail running across each card, only while the Shop is open
  const PV = {};
  setInterval(() => { if (!$('#shopModal').classList.contains('on')) return; paint(); const t = performance.now();
    if (window.pwCard) document.querySelectorAll('#cxShop canvas[data-pw]').forEach(c => pwCard(c, c.dataset.pw, t));   /* the powers' own pictures, turning (powers.js) */
    document.querySelectorAll('#cxShop canvas[data-tr]').forEach(c => { const id = c.dataset.tr, S2 = PV[id] || (PV[id] = {tp: [], n: 0, d: 0, x: 0}), x = c.getContext('2d'), mk1 = MAKE[id];
      S2.x = (t * .012) % 30 - 4; S2.d += .8; while (S2.d >= 3.5) { S2.d -= 3.5; S2.n++; S2.tp.push(Object.assign(mk1(S2.x, 14, S2.n), {t: 0})); }   /* drawn small and shown double, so the sparks are easy to see */
      x.clearRect(0, 0, 22, 18); for (let i = S2.tp.length - 1; i >= 0; i--) { const p = S2.tp[i]; p.t += .06; p.x += p.vx * .06; p.y += p.vy * .06; if (p.t >= p.life) { S2.tp.splice(i, 1); continue; }
        x.fillStyle = p.c[Math.min(p.c.length - 1, Math.floor(p.t / p.life * p.c.length))]; const sx = Math.round(p.x), sy = Math.round(p.y);
        if (p.h) { x.fillRect(sx - 1, sy - 1, 1, 1); x.fillRect(sx + 1, sy - 1, 1, 1); x.fillRect(sx - 1, sy, 3, 1); x.fillRect(sx, sy + 1, 1, 1); } else x.fillRect(sx, sy, p.s, p.s); } }); }, 60);
  let sendQ = Promise.resolve();
  $('#cxShop').addEventListener('click', e => { const b = e.target.closest('.cxC'); if (!b || b.dataset.busy) return; const kind = b.dataset.k, id = b.dataset.id, key = kind + '_' + id, D = DEF[kind][id], f = FLD[kind], redo = () => { $('#cxShop').dataset.h = ''; paint(); if (window.pwChanged) pwChanged(); if (typeof netMove === 'function') netMove(); };
    if (CX.own[key]) { if (!f) return;   /* a power: nothing to switch, you use it in the town */ const nv = CX[f] === id ? null : id; CX[f] = nv; sfx('click'); redo();   // shown at once, the server told after
      if (!CX.lab) sendQ = sendQ.then(() => srv('cxSet', {k: kind, id: nv || ''}).catch(er => wlSay(er.message, 'bad'))); return; }
    if (cryHave() < D[1]) { wlSay('You need ' + D[1] + ' crystals.', 'bad'); return; }
    b.dataset.busy = '1'; srv('cxBuy', {k: kind, id}).then(() => { CX.own[key] = 1; if (f) CX[f] = id; sfx('rare'); }).catch(er => wlSay(er.message, 'bad')).then(redo); });
  paint();
  window.cxLab = (trail, nc) => { CX.lab = true; for (const id in TRAILS) CX.own['t_' + id] = 1; for (const k in DEF) for (const id in DEF[k]) CX.own[k + '_' + id] = 1; CX.trail = trail || null; CX.nc = nc || null; $('#cxShop').dataset.h = ''; paint(); };   // the lab: try them without buying
})();
