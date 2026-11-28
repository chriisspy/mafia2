/* ================= MATERIALS: STONE AND WOOD (28 Nov 2026, his ask; batch 3 of the keep-playing plan) =================
   World projects will cost coins AND materials. This is the gathering:
     STONE  one for every plain rock or wall you break in the mine (the server adds it: functions/mine.js).
     WOOD   buy an AXE from the Blacksmith (once), then tap a tall pine in the South: you walk to it, swing three times and it falls. It is a stump
            for five minutes, then it has grown back. Two or three wood a tree.
   The server keeps the counts and which of your trees are down (functions/build.js: axeBuy, chop; wallet.kit.stone / wood / axe / ch).
   The projects themselves (the catalog, chipping in, the building going up) are the next step: not here yet. */
(() => {
  const AXE_PRICE = 300, REGROW = 5 * 60000;   // the server's own numbers (functions/build.js)
  const M = {stone: 0, wood: 0, axe: false, cut: {}, busy: false};
  const px = (rows, C) => { const c = mk(rows[0].length, rows.length), x = c.getContext('2d'); rows.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return c; };
  // little pictures in the style of his icons: a dark outline, flat colour, a lighter top and a darker underside
  const ICON = {
    stone: px(['..KKKKK...', '.KLLLMMK..', 'KLLMMMMMK.', 'KLMMMMMMDK', 'KMMMMMMDDK', 'KMMMMDDDDK', '.KDDDDDDK.', '..KKKKKK..'], {K: '#181425', L: '#c0cbdc', M: '#8b9bb4', D: '#5a6988'}),
    wood: px(['..KKKKKKK.', '.KLLLLLLMK', 'KRrKLLLLMK', 'KrRKMMMMDK', 'KRrKMMMMDK', 'KrRKMMDDDK', '.KKKDDDDK.', '...KKKKK..'], {K: '#181425', L: '#e5ae58', M: '#b86f3d', D: '#733e39', R: '#f6dfae', r: '#e5ae58'}),
    axe: px(['....KKKK..', '...KWWWSK.', '..KBWWSSK.', '.KBBKSSK..', 'KBBK.KK...', 'KBK.......', '.K........'], {K: '#181425', W: '#ffffff', S: '#c0cbdc', B: '#b86f3d'})};
  const img = (k, sc) => { const c = ICON[k]; return `<img src="${c.toDataURL()}" alt="" style="width:${c.width * (sc || 2)}px;height:${c.height * (sc || 2)}px;image-rendering:pixelated;vertical-align:-3px">`; };
  window.matIcon = img; window.matHave = () => ({stone: M.stone, wood: M.wood});

  // the wallet says what you carry and which of your trees are down
  { const wa = walletApply; walletApply = function (w) { wa(w); const k = (w && w.kit) || {}; M.stone = k.stone | 0; M.wood = k.wood | 0; M.axe = !!k.axe;
      const now = Date.now(), C = k.ch || {}; M.cut = {}; for (const i in C) if (now - C[i] < REGROW) M.cut[i] = C[i] + REGROW;
      if ($('#smithModal') && $('#smithModal').classList.contains('on') && window.smithUI) smithUI(); }; }

  /* ---------- the trees: a tall pine that is down shows only its foot (the bottom of its own picture), until it has grown back ---------- */
  const tree = q => q && q.lib === 'tallpine', STUMP = new WeakMap(), SHAKE = {i: -1, t: 0};
  const stump = im => { let s = STUMP.get(im); if (s) return s; const keep = Math.min(im.height, im.height - im.base + 11); s = mk(im.width, im.height); s.getContext('2d').drawImage(im, 0, im.height - keep, im.width, keep, 0, im.height - keep, im.width, keep); s.base = im.base; STUMP.set(im, s); return s; };
  /* the South's own code (south.js) loads AFTER this file, so its hooks wait for it */
  const wait = setInterval(() => { if (typeof propImg !== 'function' || typeof southObjs !== 'function' || typeof SH === 'undefined' || typeof S_PROPS === 'undefined') return; clearInterval(wait);
  { const pi = propImg; propImg = function (q) { const im = pi(q); if (!im || !tree(q)) return im; const i = S_PROPS.indexOf(q); return M.cut[i] > Date.now() ? stump(im) : im; }; }
  // the tree you are chopping shakes: a pixel or two left and right on each swing
  { const so = southObjs; southObjs = function (m, dt) { const out = so(m, dt); if (SHAKE.i >= 0) { const q = S_PROPS[SHAKE.i], k = performance.now() - SHAKE.t; if (q && k < 220) { const o = out.find(o => o.x === q.x && o.y === q.y && o.img === propImg(q)); if (o) o.x += Math.round(Math.sin(k * .09) * 2); } } return out; }; }

  /* ---------- chopping: tap a pine with an axe in your kit ---------- */
  function treeAt(x, y) { for (let i = 0; i < S_PROPS.length; i++) { const q = S_PROPS[i]; if (!tree(q)) continue; const im = IMG['sp/' + q.lib]; if (!im) continue;
      if (x > q.x + im.width * .2 && x < q.x + im.width * .8 && y > q.y + im.height * .25 && y < q.y + im.height + 2) return i; } return -1; }
  function chop(i) { const m = WL.me, q = S_PROPS[i]; if (!m || !q || M.busy) return; if (M.cut[i] > Date.now()) { wlSay('That tree is growing back.'); return; }
    M.busy = true; m.dir = 'back'; let n = 0;
    const swing = () => { if (!WL.me || WL.me.loc !== SOUTH) { M.busy = false; return; } n++; SHAKE.i = i; SHAKE.t = performance.now(); sfx('mbreak'); m.act = {k: 'punch', t: 0};
      if (n < 3) { setTimeout(swing, 420); return; }
      srv('chop', {i}).then(r => { M.cut[i] = r.until || Date.now() + REGROW; M.wood = r.wood | 0; sfx('coin'); wlSay('+' + r.got + ' wood', 'good'); }).catch(e => wlSay(e.message, 'bad')).then(() => { M.busy = false; }); };
    swing(); }
  { const tp = SH.tap; SH.tap = (e, m, x, y) => { if (M.axe && !m.seat && !M.busy) { const i = treeAt(x, y); if (i >= 0) { const q = S_PROPS[i], im = propImg(q), fx = q.x + im.width / 2, fy = q.y + im.base + 6; wlGo(m, fx, fy, () => chop(i)); return true; } }
      return M.busy ? true : tp(e, m, x, y); }; }
  }, 300);

  /* ---------- the Blacksmith: what you carry, and the axe ---------- */
  const hook = setInterval(() => { if (typeof smithUI !== 'function' || !$('#smithModal') || !$('#cryYes')) return; clearInterval(hook);
    const last = $('#shYes') || $('#cryYes');
    last.insertAdjacentHTML('afterend', '<div class="small" style="margin-top:14px"><b>BUILDING</b> · <span id="smithMat"></span></div><button class="btn go wide" id="axeYes"></button>');
    const su = smithUI; smithUI = function () { su(); $('#smithMat').innerHTML = img('stone') + ' ' + M.stone + ' &nbsp; ' + img('wood') + ' ' + M.wood;
      const b = $('#axeYes'), h = M.axe ? img('axe') + ' You have an axe' : img('axe') + ' Axe · ' + ic('coin', 2) + ' ' + AXE_PRICE; b.disabled = M.axe || coins < AXE_PRICE; if (b.dataset.h !== h) { b.dataset.h = h; b.innerHTML = h; } };
    $('#axeYes').onclick = async () => { const b = $('#axeYes'); if (b.disabled) return; b.disabled = true; try { await srv('axeBuy'); M.axe = true; sfx('rare'); } catch (e) { wlSay(e.message, 'bad'); } smithUI(); };
  }, 500);
  window.matLab = (axe, stone, wood) => { M.axe = axe !== false; M.stone = stone | 0; M.wood = wood | 0; };   // the lab: try chopping without buying the axe
})();

/* ================= WORLD PROJECTS (28 Nov 2026, his ask; he approved these six) =================
   His design, in his words: "when the owner of the world chooses what to place for the town the whole town gets a grid, and the owner can choose
   where to put it anywhere in the town, same function as the cabin decoration. then when it's placed there will be a pop up panel when walking up
   to it: you can see all of the materials it needs to be completed and how much progress it has. you can walk up to it and drop stone, wood, etc
   into the build to progress it."
     1. THE OWNER opens the world's panel (tap its name), TOWN PROJECT, Pick a project. The catalog says what each one does for the town BEFORE it
        is picked (his rule) and what it costs. Tapping Place shuts the panel and the WHOLE TOWN shows a grid (8 px, the decorating grid).
        A see-through ghost of the building stands in front of you: drag it anywhere; green = it fits, red = something is in the way.
        Tick puts it down, cross cancels.
     2. It stands there as a BUILDING SITE: the building drawn faint, filling in solid from the ground up as it is paid for. You cannot walk through it.
     3. ANYONE walks up to it: a panel pops up with what it needs, how far along each thing is, and a Give button for each (coins up to 500 a tap;
        stone, wood, gold and crystals all you carry, up to what it still needs). Walk away and the panel goes.
     4. All paid = BUILT, for good, and its perk is on for everyone in the world. Then the owner may pick the next. One at a time.
   The server does all of it (functions/build.js: projStart, projGive, perkSync; worlds/{wid}/proj). PROJECTS mirrors the server's list.
   The pictures: assets/projects/<id>.png (tools/make_projects.py: made the Tavern's way, on the Tavern's own pixel grid). They join BUILDINGS (b.proj),
   so the town's own code draws them, sorts them with the people, and makes them solid. They have no inside. */
(() => {
  const PROJECTS = {   // id: [name, what it does for the town, what it costs]
    fountain: ['Fountain', 'Something lovely for the square', {c: 1000, stone: 60, wood: 10}],
    bakery: ['Bakery', 'Everyone gets 50 more coins a day', {c: 3000, wood: 80, stone: 60}],
    fishhut: ['Fishing Hut', 'Fish sell for 10% more', {c: 4000, wood: 120}],
    clock: ['Clock Tower', 'A grand tower for the town', {c: 5000, stone: 200, wood: 60}],
    miner: ["Miner's Statue", '10% more gold from the mine', {c: 6000, stone: 250, gold: 20}],
    monument: ['Crystal Monument', 'Everyone gets 1 crystal shard a day', {c: 12000, stone: 300, wood: 150, gold: 100, cry: 5}]};
  const KINDS = ['c', 'stone', 'wood', 'gold', 'cry'], GRID = 8;
  const PJ = {wid: null, ref: null, cur: null, done: {}, pick: false, lab: false, ghost: null, drag: null, sig: '', near: false};
  for (const id in PROJECTS) load('proj/' + id, 'assets/projects/' + id + '.png').catch(() => {});
  const pim = id => IMG['proj/' + id];
  const icon = k => k === 'c' ? ic('aCoin', 2, 'solo') : k === 'gold' ? (typeof goldImg === 'function' ? goldImg(2) : '') : k === 'cry' ? (typeof cryImg === 'function' ? cryImg(2) : '') : matIcon(k);
  const mine = k => k === 'c' ? coins : k === 'gold' ? (typeof GOLD !== 'undefined' ? GOLD.n | 0 : 0) : k === 'cry' ? (typeof GOLD !== 'undefined' ? GOLD.cry | 0 : 0) : matHave()[k] | 0;
  const cost = C => KINDS.filter(k => C[k]).map(k => `<span class="pjC">${icon(k)}${C[k].toLocaleString()}</span>`).join('');
  const owner = () => PJ.lab || (typeof WORLD !== 'undefined' && WORLD.meta && WORLD.meta.owner === NET.uid);
  const inWorld = () => PJ.lab || (NET.on && NET.world);
  const progress = cur => { const C = PROJECTS[cur.id][2], H = cur.have || {}; let a = 0, b = 0; for (const k of KINDS) if (C[k]) { a += Math.min(H[k] | 0, C[k]) / C[k]; b++; } return b ? a / b : 0; };

  const st = document.createElement('style');
  st.textContent = `#wmProj{margin:0 0 12px}#wmProj h4{margin:0 0 6px}
.pjCard{background:#332b57;border:3px solid #0f0b1e;border-radius:6px;padding:8px 10px 10px;margin-top:6px;text-align:left}
.pjCard b{display:block;font:700 17px 'Pixelify Sans';color:#ffd25e}.pjCard small{display:block;font:600 13px 'Pixelify Sans';color:#c9c2e6;margin:1px 0 6px}
.pjC{display:inline-flex;align-items:center;gap:3px;font:700 13px 'Pixelify Sans';color:#fff;margin-right:10px;white-space:nowrap}
.pjRow{display:flex;align-items:center;gap:8px;margin-top:6px}.pjRow .ic{flex:none;width:26px;display:flex;justify-content:center}
.pjRow .pjB{flex:1;height:10px;background:#1b1532;border:2px solid #0f0b1e;border-radius:4px;overflow:hidden}.pjRow .pjB i{display:block;height:100%;background:#63c74d}
.pjRow .n{flex:none;font:700 12px 'Pixelify Sans';color:#c9c2e6;min-width:74px;text-align:right;white-space:nowrap}
.pjRow .btn{flex:none;min-width:58px;font-size:13px;padding:2px 6px 6px}
.pjCard.cat{display:flex;align-items:center;gap:8px}.pjCard.cat img.pv{flex:none;width:52px;height:52px;object-fit:contain;image-rendering:pixelated}
.pjCard.cat .tx{flex:1;min-width:0}.pjCard.cat .btn{flex:none;font-size:14px;padding:4px 10px 8px}
.pjCard.built{opacity:.6}.pjDone{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.pjDone span{font:700 12px 'Pixelify Sans';color:#0f2a12;background:#63c74d;border:2px solid #0f0b1e;border-radius:4px;padding:1px 6px 2px}
#pjPop,#pjBar{position:absolute;left:10px;right:10px;bottom:calc(64px + env(safe-area-inset-bottom));z-index:22;display:none;background:#2a2346;color:#fff;border:3px solid #0f0b1e;border-radius:6px;
  box-shadow:inset 0 -6px 0 #1b1532,inset 0 2px 0 #3d3466,0 6px 0 #0008;padding:8px 10px 12px;text-align:left;pointer-events:auto}
#pjPop.on,#pjBar.on{display:block}#pjPop b{font:700 18px 'Pixelify Sans';color:#ffd25e}#pjPop small{display:block;font:600 13px 'Pixelify Sans';color:#c9c2e6}
#pjBar.on{display:flex;align-items:center;gap:8px}#pjBar b{flex:1;font:700 17px 'Pixelify Sans';color:#ffd25e}#pjBar .btn{width:48px;height:44px;padding:0 0 4px;display:flex;align-items:center;justify-content:center}
#phone.land #pjPop,#phone.land #pjBar{left:auto;right:calc(10px + var(--sr,0px));width:min(320px,44%);bottom:calc(var(--lb,60px) + 6px)}`;
  document.head.appendChild(st);
  $('#worldModal .mhead').insertAdjacentHTML('afterend', '<div id="wmProj"></div>');
  $('#townHud').insertAdjacentHTML('beforeend', `<div id="pjPop"></div><div id="pjBar"><b id="pjBarN"></b><button class="btn dark" id="pjNo">${ic('cross', 2, 'solo')}</button><button class="btn go" id="pjYes">${ic('check', 2, 'solo')}</button></div>`);

  /* ---------- the rows of what it needs: the same in the world's panel and in the pop-up by the site ---------- */
  function rows(cur) { const C = PROJECTS[cur.id][2], H = cur.have || {};
    return KINDS.filter(k => C[k]).map(k => { const got = Math.min(H[k] | 0, C[k]), left = C[k] - got, can = Math.min(left, mine(k), k === 'c' ? 500 : 1e9);
      return `<div class="pjRow"><span class="ic">${icon(k)}</span><span class="pjB"><i style="width:${Math.round(got / C[k] * 100)}%"></i></span><span class="n">${got.toLocaleString()}/${C[k].toLocaleString()}</span><button class="btn go" data-g="${k}" data-n="${can}" ${can > 0 ? '' : 'disabled'}>${left ? 'Give' + (can > 0 ? ' ' + can.toLocaleString() : '') : ic('check', 2, 'solo')}</button></div>`; }).join(''); }
  async function give(b) { if (!b || b.disabled) return; const done = btnBusy(b, '…');
    try { if (PJ.lab) { PJ.cur.have = PJ.cur.have || {}; PJ.cur.have[b.dataset.g] = (PJ.cur.have[b.dataset.g] | 0) + (+b.dataset.n); sfx('coin'); }
      else { const r = await srv('projGive', {wid: NET.world, k: b.dataset.g, n: +b.dataset.n}); sfx(r.built ? 'rare' : 'coin'); if (r.built && PROJECTS[r.built]) wlSay(PROJECTS[r.built][0] + ' is built!', 'good'); } }
    catch (er) { wlSay(er.message, 'bad'); } done(); PJ.sig = ''; $('#wmProj').dataset.h = ''; $('#pjPop').dataset.h = ''; paint(); }

  /* ---------- the world's panel ---------- */
  function paint() { const box = $('#wmProj'); if (!box) return; if (!inWorld()) { box.innerHTML = ''; box.dataset.h = ''; return; }
    const own = owner(), cur = PJ.cur, built = Object.keys(PJ.done).filter(id => PROJECTS[id]); let h = '<h4>TOWN PROJECT</h4>';
    if (cur && PROJECTS[cur.id]) h += `<div class="pjCard"><b>${PROJECTS[cur.id][0]}</b><small>${PROJECTS[cur.id][1]}</small>${rows(cur)}</div>`;
    else if (PJ.pick && own) h += Object.keys(PROJECTS).map(id => { const [n, what, C] = PROJECTS[id], done = !!PJ.done[id], im = pim(id);
      return `<div class="pjCard cat${done ? ' built' : ''}">${im ? `<img class="pv" src="${im.src}" alt="">` : ''}<div class="tx"><b>${n}</b><small>${what}</small>${cost(C)}</div><button class="btn go" data-s="${id}" ${done ? 'disabled' : ''}>${done ? 'Built' : 'Place'}</button></div>`; }).join('');
    else h += own ? '<button class="btn go wide" data-p="1">Pick a project</button>' : '<div class="small">The owner has not picked one yet.</div>';
    if (built.length) h += '<div class="pjDone">' + built.map(id => `<span>${PROJECTS[id][0]}</span>`).join('') + '</div>';
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; } }
  $('#wmProj').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.p) { PJ.pick = true; sfx('click'); paint(); return; }
    if (b.dataset.s) { placeStart(b.dataset.s); return; }
    if (b.dataset.g) give(b); });

  /* ---------- 1. PLACING: the whole town is a grid, the ghost follows your finger ---------- */
  const snap = (x, y) => [Math.round(x / GRID) * GRID, Math.round(y / GRID) * GRID];
  const walkable = (px, py) => { const gx = Math.floor((px + MAPX) / TG), gy = Math.floor(py / TG); return gx >= 0 && gy >= 0 && gx < TGW && gy < TGH && typeof TOWNG !== 'undefined' && TOWNG && TOWNG[gy * TGW + gx] === 1; };
  function fits(id, x, y) { const im = pim(id); if (!im) return false; const w = im.width, h = im.height;
    for (let yy = y + Math.round(h * .45); yy <= y + h + 4; yy += TG) for (let xx = x + 3; xx <= x + w - 3; xx += TG) if (!walkable(xx, yy)) return false;   // its footprint stands on ground you can walk on
    let hit = false; try { for (const o of dayImg('cabins')) if (x < o.x + o.img.width - 6 && x + w > o.x + 6 && y < o.y + o.img.height && y + h > o.y + 20) hit = true; } catch (e) {}
    for (const b of BUILDINGS) if (x < b.x + b.w && x + w > b.x && y < b.y + b.h + 12 && y + h > b.y) hit = true;   // never across a cabin, the Tavern, the Casino or another project
    return !hit; }
  function placeStart(id) { const m = WL.me, im = pim(id); if (!m || !im) return; if (m.loc >= 0) { wlSay('Go out into the town first.'); return; }
    document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); const [x, y] = snap(m.x - im.width / 2, m.y + 14 - im.height);
    PJ.ghost = {id, x, y}; PJ.drag = null; $('#pjBarN').textContent = PROJECTS[id][0]; $('#pjBar').classList.add('on'); $('#townHud').classList.add('decorating'); bar(); sfx('click'); }
  function placeStop() { PJ.ghost = null; PJ.drag = null; $('#pjBar').classList.remove('on'); $('#townHud').classList.remove('decorating'); }
  const bar = () => { const g = PJ.ghost; if (g) $('#pjYes').disabled = !fits(g.id, g.x, g.y); };
  $('#pjNo').onclick = () => { sfx('close'); placeStop(); };
  $('#pjYes').onclick = async () => { const g = PJ.ghost; if (!g || !fits(g.id, g.x, g.y)) return; const done = btnBusy($('#pjYes'), '…');
    try { if (PJ.lab) PJ.cur = {id: g.id, x: g.x, y: g.y, have: {}}; else await srv('projStart', {wid: NET.world, id: g.id, x: g.x, y: g.y}); PJ.pick = false; sfx('rare'); placeStop(); }
    catch (er) { wlSay(er.message, 'bad'); } done(); PJ.sig = ''; sync(); };
  const at = e => { const [x, y] = wxy(e), im = pim(PJ.ghost.id); return snap(x - im.width / 2, y - im.height * .7); };   // your finger holds it a little above its foot
  cv.addEventListener('pointerdown', e => { if (!PJ.ghost || scene !== scenes.town) return; e.stopImmediatePropagation(); e.preventDefault(); PJ.drag = e.pointerId; [PJ.ghost.x, PJ.ghost.y] = at(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} bar(); }, true);
  cv.addEventListener('pointermove', e => { if (!PJ.ghost || PJ.drag !== e.pointerId) return; e.stopImmediatePropagation(); [PJ.ghost.x, PJ.ghost.y] = at(e); bar(); }, true);
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { if (PJ.drag === e.pointerId) PJ.drag = null; }, true);

  /* ---------- 2. THE SITE AND THE FINISHED BUILDINGS: they join the town's own BUILDINGS, so it draws them and makes them solid ---------- */
  const SITE = {};   // id -> the canvas the town draws for a building that is not finished yet
  function sitePic(id, k) { const im = pim(id); if (!im) return null; const c = SITE[id] || (SITE[id] = mk(im.width, im.height)), x = c.getContext('2d'), cut = Math.round(im.height * (1 - k));
    x.clearRect(0, 0, c.width, c.height); x.globalAlpha = .3; x.drawImage(im, 0, 0); x.globalAlpha = 1;                     // all of it, faint: the plan
    if (cut < im.height) x.drawImage(im, 0, cut, im.width, im.height - cut, 0, cut, im.width, im.height - cut);              // solid from the ground up, as far as it is paid for
    return c; }
  function sync() { if (typeof BUILDINGS === 'undefined') return; const want = [];
    for (const id of Object.keys(PJ.done)) { const d = PJ.done[id]; if (PROJECTS[id] && pim(id) && d && typeof d === 'object') want.push({id, x: d.x | 0, y: d.y | 0, k: 1}); }
    if (PJ.cur && PROJECTS[PJ.cur.id] && pim(PJ.cur.id)) want.push({id: PJ.cur.id, x: PJ.cur.x | 0, y: PJ.cur.y | 0, k: progress(PJ.cur)});
    const sig = JSON.stringify(want.map(w => [w.id, w.x, w.y, Math.round(w.k * 100)])); if (sig === PJ.sig) return; const moved = JSON.stringify(want.map(w => [w.id, w.x, w.y])) !== PJ.msig;
    PJ.sig = sig; PJ.msig = JSON.stringify(want.map(w => [w.id, w.x, w.y]));
    for (let i = BUILDINGS.length - 1; i >= 0; i--) if (BUILDINGS[i].proj) BUILDINGS.splice(i, 1);
    for (const w of want) { const im = pim(w.id), key = 'p_' + w.id; IMG['bld/' + key] = w.k >= 1 ? im : sitePic(w.id, w.k); BUILDINGS.push({k: key, name: PROJECTS[w.id][0], x: w.x, y: w.y, w: im.width, h: im.height, proj: w.id, fade: 0}); }
    if (moved) { try { if (typeof DAYIMG !== 'undefined') delete DAYIMG.town; if (typeof buildTownGrid === 'function' && typeof TOWNG !== 'undefined' && TOWNG) buildTownGrid(); } catch (e) {} } }

  // the grid and the ghost, drawn over the town while the owner is placing
  { const ds = drawScene; drawScene = function (people, occ, img, objs) { const m = WL.me;
      if (PJ.ghost && m && m.loc < 0 && scene === scenes.town) { const g = PJ.ghost, im = pim(g.id), ok = fits(g.id, g.x, g.y);
        objs = [...(objs || []), {x: 0, y: 0, img: mk(1, 1), base: -1e6, after() { lx.fillStyle = 'rgba(255,255,255,.16)'; const x0 = Math.floor(cam.x / GRID) * GRID, y0 = Math.floor(cam.y / GRID) * GRID;
            for (let x = x0; x <= cam.x + cam.lw; x += GRID) lx.fillRect(X(x), 0, 1, cam.lh); for (let y = y0; y <= cam.y + cam.lh; y += GRID) lx.fillRect(0, Y(y), cam.lw, 1); }},
          {x: g.x, y: g.y, img: im, base: 1e6, alpha: .62, after() { lx.fillStyle = ok ? 'rgba(95,196,111,.4)' : 'rgba(228,84,79,.45)'; lx.fillRect(X(g.x), Y(g.y + Math.round(im.height * .45)), im.width, Math.round(im.height * .55)); }}]; }
      return ds.call(this, people, occ, img, objs); }; }

  /* ---------- 3. WALK UP TO THE SITE: the panel pops up; walk away and it goes ---------- */
  function pop() { const el = $('#pjPop'), m = WL.me, cur = PJ.cur, im = cur && pim(cur.id);
    const near = !!(cur && im && m && m.loc < 0 && scene === scenes.town && inWorld() && !PJ.ghost && !document.querySelector('.modal.on') && !(typeof DECOR !== 'undefined' && DECOR.on) && !(typeof GAME !== 'undefined' && GAME.on)
      && m.x > cur.x - 18 && m.x < cur.x + im.width + 18 && m.y > cur.y + im.height * .4 && m.y < cur.y + im.height + 30);
    if (!near) { if (el.classList.contains('on')) { el.classList.remove('on'); el.dataset.h = ''; } return; }
    const h = `<b>${PROJECTS[cur.id][0]}</b><small>${PROJECTS[cur.id][1]}</small>${rows(cur)}`; if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; } el.classList.add('on'); }
  $('#pjPop').addEventListener('click', e => give(e.target.closest('button[data-g]')));
  // tapping the site walks you up to it
  { const tapWrap = () => { if (typeof cv === 'undefined') return; cv.addEventListener('pointerdown', e => { const cur = PJ.cur, m = WL.me, im = cur && pim(cur.id); if (!cur || !im || !m || PJ.ghost || m.loc >= 0 || scene !== scenes.town || (typeof DECOR !== 'undefined' && DECOR.on)) return;
        const [x, y] = wxy(e); if (x > cur.x + 4 && x < cur.x + im.width - 4 && y > cur.y + 10 && y < cur.y + im.height) { e.stopImmediatePropagation(); e.preventDefault(); wlGo(m, cur.x + im.width / 2, cur.y + im.height + 10); } }, true); }; tapWrap(); }

  // the world's project is watched while you are in that world; walking in also picks up the perks of what it has already built
  setInterval(() => { if (!PJ.lab) { const w = NET.on && NET.world ? NET.world : null;
      if (w !== PJ.wid) { if (PJ.ref) PJ.ref.off(); PJ.ref = null; PJ.wid = w; PJ.cur = null; PJ.done = {}; PJ.pick = false; placeStop();
        if (w) { PJ.ref = NET.db.ref('worlds/' + w + '/proj'); PJ.ref.on('value', s => { const v = s.val() || {}; PJ.cur = v.cur || null; PJ.done = v.done || {}; sync(); paint(); }, () => {}); srv('perkSync', {wid: w}).catch(() => {}); } } }
    sync(); pop(); if (PJ.ghost && (scene !== scenes.town || !WL.me || WL.me.loc >= 0)) placeStop(); if ($('#worldModal').classList.contains('on')) paint(); }, 350);
  window.projLab = (cur, done) => { PJ.lab = true; PJ.cur = cur || null; PJ.done = done || {}; PJ.pick = !cur; PJ.sig = ''; $('#wmProj').dataset.h = ''; sync(); paint(); };   // the lab: a made-up project
  window.projPlace = id => { PJ.lab = true; placeStart(id); };
})();
