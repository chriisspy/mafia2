/* ================= THE FORGOTTEN FOREST (25 Nov 2026, the Glimmerkin hunt, batch 2) =================
   Pip: "Look where the trees forget to grow, at the edge of your town." In the town's WEST tree wall there is one small gap (FGAP). It is
   only a dent in the trees until you carry the Moon Snips (QUEST.s >= 2, mine.js); then you can walk through it, off the edge of the map,
   into a place of its own: the Forgotten Forest. A "place" like the South (loc 100 + its spot in HALLS = 107), made the same way (his
   rule): the GROUND is one picture (assets/forest/night.png, Nano Banana Pro, cut by tools/make_forest.py) with a walk mask
   (night-walk.png, white = walk), and everything standing on it is its own picture: the stone MURAL (the order of the four Keystones:
   circle, triangle, square, diamond), the MOONMOSS, and whatever trees he places in the map builder (assets/forest/layout.json).
   MOONMOSS: stand by a patch with the snips and the "Get Moonmoss" button shows (his rule: only with the snips). A short snip, the
   YOU GOT card, and the server moves the hunt on (op qmoss, functions/quest.js). Nothing on the screen tracks the hunt (his rule).
   BATCH 3 (keystones.js) uses the two spots kept clear here (layout.json): the round glade (F_GLADE: the firefly path, the Fang stone)
   and the bare earth (F_HEARTH: the Hearth stone, cracked). */

/* ---------- the place ---------- */
const FOREST = 100 + HALLS.length;   // 107: loaded after race.js, so the places before it keep their numbers
HALLS.push({k: 'forest', name: 'The Forgotten Forest', step: 'grass', door: [-999, -999], spawn: [770, 394, 'left'], out: true, spots: [], hint: '\u00a0', back: [-94, 469]});   // hint: a blank line (no "walk to the door")
const FRH = HALLS[FOREST - 100];
const F_OUT = {x: 792, y: 394};                      // the path back to the town, off the right edge
const F_MURAL = {x: 354, y: 58};                     // the mural's top left
const F_MOSS = [[128, 470], [640, 172], [556, 726]]; // the foot of each Moonmoss patch
const F_GLADE = {x: 205, y: 280}, F_HEARTH = {x: 605, y: 610};   // the middle of the firefly glade | where the cracked stone stands (keystones.js)
const F_PROPS = [];                                  // his trees: {lib, x, y, flip, shadow, solid, fade}
const FOR = {snip: null, cut: -1, fx: [], g: null, open: null, was: null, mist: null};

/* ---------- the gap in the town's trees ---------- */
const FGAP = {x: -120, y: 457, w: 44, h: 24, at: 469};   // the patch on the town's ground (game x = picture x - 120); at = the row you walk along
function gapPaint() {   // the dent itself: two small patches laid over the town's ground once, before the town is built from it
  if (!XMAS) return;
  for (const [k, p] of [['townDay', 'f/gap-day'], ['townBase', 'f/gap-night']]) { const im = IMG[k], g = IMG[p]; if (!im || !g || im.gap) continue;
    const c = mk(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0); x.drawImage(g, FGAP.x + MAPX, FGAP.y); c.gap = 1; IMG[k] = c; }
}
function gapGrid() {   // the way through is floor only while you carry the snips; the town's own grid is put back as it was the moment you do not
  const open = QUEST.s >= 2; if (!XMAS || !TOWNG || (FOR.g === TOWNG && FOR.open === open)) return;
  if (FOR.g !== TOWNG) { FOR.g = TOWNG; FOR.was = null; }
  const cells = []; for (let gy = Math.floor((FGAP.at - 5) / TG); gy <= Math.floor((FGAP.at + 2) / TG); gy++) for (let gx = 0; gx <= Math.floor((FGAP.x + FGAP.w + 6 + MAPX) / TG); gx++) cells.push(gy * TGW + gx);
  if (!FOR.was) FOR.was = cells.map(i => [TOWNG[i], TOWNC[i]]);
  cells.forEach((i, n) => { TOWNG[i] = open ? 1 : FOR.was[n][0]; TOWNC[i] = FOR.was[n][1]; }); FOR.open = open;
}
function forestGate(m, J) {   // pushed left, out through the gap
  if (XMAS && QUEST.s >= 2 && J.x < -.5 && m.x < FGAP.x + 16 && Math.abs(m.y - FGAP.at) < 9) { wlDoor(FOREST); return true; }
  return false;
}
function forestTownTap(m, x, y) {
  if (XMAS && QUEST.s >= 2 && x < FGAP.x + FGAP.w + 4 && Math.abs(y - FGAP.at) < 14) { wlGo(m, FGAP.x + 10, FGAP.at, () => wlDoor(FOREST)); return true; }
  return false;
}
// the town asks south.js about its edges (index.html: southGate, southTownTap): the forest's gap answers first
{ const g = southGate, tp = southTownTap; southGate = (m, J) => forestGate(m, J) || g(m, J); southTownTap = (m, x, y) => forestTownTap(m, x, y) || tp(m, x, y); }
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { gapGrid(); mapBtnTick(); return fr.call(this, dt, t); }; }
{ const bt = buildTown; buildTown = function () { gapPaint(); return bt.apply(this, arguments); }; }   // the town is built from its ground once every picture is in: the dent goes on just before

/* ---------- pictures ---------- */
function forestLayout(L) {
  if (!L) return; const P = (o, v) => { if (Array.isArray(v)) { o.x = v[0]; o.y = v[1]; } };
  if (Array.isArray(L.spawn)) FRH.spawn = [L.spawn[0], L.spawn[1], 'left']; P(F_OUT, L.door); P(F_MURAL, L.mural); P(F_GLADE, L.glade); P(F_HEARTH, L.hearth);
  if (Array.isArray(L.moss) && L.moss.length) F_MOSS.splice(0, F_MOSS.length, ...L.moss);
  F_PROPS.splice(0, F_PROPS.length, ...(Array.isArray(L.props) ? L.props : []));
}
function forestLoad() {
  const L = (k, src) => load(k, src).catch(() => {});
  const lay = fetch('assets/forest/layout.json?v=' + av('assets/forest/layout.json')).then(r => r.json()).then(J => { forestLayout(J);
    return Promise.all([...new Set(F_PROPS.map(q => q.lib))].map(k => L('sp/' + k, `assets/builder/props/${k}.png`))); }).catch(() => {});
  return Promise.all([lay, L('hall/forest', 'assets/forest/night.png'), L('fwalk', 'assets/forest/night-walk.png'), L('f/mural', 'assets/forest/mural.png'), L('f/map', 'assets/forest/map.png'),
    L('f/gap-day', 'assets/forest/gap-day.png'), L('f/gap-night', 'assets/forest/gap-night.png'), ...[1, 2, 3, 4].map(i => L('f/moss' + i, `assets/forest/moss${i}.png`)),
    ...['front', 'right', 'back', 'left'].map(d => L('pipw/' + d, `assets/final/pip/well-${d}.png`)),   // Pip, mended (mine.js draws him)
  ]).then(forestMask);
}
function forestMask() {   // the walk mask, with the mural and the feet of his trees cut out of it
  const g = IMG.fwalk; if (!g) return; const mu = IMG['f/mural'], mw = mu ? mu.width : 91, mh = mu ? mu.height : 42;
  IMG['hallw/forest'] = maskCanvas(g.width, g.height, null, [[F_MURAL.x - 1, F_MURAL.y, F_MURAL.x + mw + 1, F_MURAL.y + mh + 3], ...F_PROPS.filter(q => q.solid !== false).map(propFoot).filter(Boolean)], g);
  FRH.g = null;
}

/* ---------- the forest ---------- */
const mossImg = i => IMG['f/moss' + (i % 4 + 1)];
function forestObjs(m, dt, t) {
  const out = [], mu = IMG['f/mural']; if (mu) out.push({img: mu, x: F_MURAL.x, y: F_MURAL.y, base: F_MURAL.y + mu.height - 2});
  F_MOSS.forEach(([x, y], i) => { const im = mossImg(i); if (!im || FOR.cut === i) return; const S = FOR.snip && FOR.snip.i === i ? FOR.snip : null;
    out.push({img: im, x: x - (im.width >> 1) + (S && S.t % .34 < .08 ? 1 : 0), y: y - im.height, base: y - im.height + 2, after: () => mossTwinkle(x, y - 6, t, i)}); });   // base: it lies on the ground, you stand over its near edge
  for (const q of F_PROPS) { const im = propImg(q); if (!im) continue; const o = {img: im, x: q.x, y: q.y, base: q.y + im.base};   // his trees: walk behind them, the one you are behind fades (south.js)
    if (q.fade !== false) { const hid = m.y < o.base && m.y > q.y + 6 && m.x > q.x + 3 && m.x < q.x + im.width - 3; q.a = clamp((q.a ?? 1) + (hid ? -1 : 1) * dt * 4, .45, 1); if (q.a < 1) o.alpha = q.a; }
    out.push(o); }
  if (typeof keyForestObjs === 'function') keyForestObjs(out, m, t);   // the Keystones that are found here (keystones.js)
  return out;
}
function mossTwinkle(cx, cy, t, i) { const k = Math.floor(t / 170 + i * 4) % 11; if (k > 3) return; const px = X(cx + [-5, 4, -1, 6][k]), py = Y(cy - [1, 3, -3, -2][k]); lx.fillStyle = '#fff'; lx.fillRect(px - 1, py, 3, 1); lx.fillRect(px, py - 1, 1, 3); }
/* MIST: a few long low wisps of solid pale pixels drifting slowly over everything (pixel rows, no blur) */
function forestMist(dt, t) {
  if (!FOR.mist) FOR.mist = Array.from({length: 9}, (_, i) => ({x: (i * 197) % 900, y: 110 + (i * 83) % 640, w: 60 + (i * 37) % 70, v: 3 + (i % 4) * 1.6, ph: i * 1.7}));
  for (const q of FOR.mist) { q.x += q.v * dt; if (q.x > 860) q.x = -q.w - 20; const a = .1 + .05 * Math.sin(t * .0006 + q.ph);
    for (let r = 0; r < 5; r++) { const inset = [.3, .12, 0, .1, .34][r] * q.w, off = Math.round(Math.sin(t * .0004 + q.ph + r) * 4);
      lx.fillStyle = `rgba(190,220,245,${(a * [.6, .9, 1, .9, .6][r]).toFixed(3)})`; lx.fillRect(X(q.x + inset + off), Y(q.y + r * 2), Math.round(q.w - inset * 2), 2); } }
}
FRH.frame = (m, people, dt, t, H, img) => {
  const S = FOR.snip; if (S) { m.x = S.x; m.y = S.y; m.walk = false; m.path = []; m.dir = S.dir; }   // you kneel still while you cut
  view(img, m.x, m.y + (LAND ? 2 : 24), 190, {hi: true});
  if (WL.sel && WL.sel.loc === m.loc) { const q = Math.floor(t / 200) % 2; lx.strokeStyle = q ? '#ffd25e' : '#fff2a8'; lx.lineWidth = 1; lx.beginPath(); lx.ellipse(X(WL.sel.x) + .5, Y(WL.sel.y) + .5, 9 + q, 3 + q * .5, 0, 0, 7); lx.stroke(); }
  const hits = drawScene(people, null, img, forestObjs(m, dt, t)); wlFx(dt, m.loc); drawPuffs(dt); wlCases(dt, m.loc);
  for (let i = FOR.fx.length - 1; i >= 0; i--) { const p = FOR.fx[i]; p.t += dt; if (p.t > p.l) { FOR.fx.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; lx.fillStyle = p.t / p.l < .5 ? '#eaf8ff' : '#8fd6ff'; lx.fillRect(X(p.x), Y(p.y), 1, 1); }   // snipped moss
  // (25 Nov, his note on the forest look) no mist: forestMist(dt, t) left unused
  const L = [[190, 632, 60, '150,200,255', .16, 3]]; F_MOSS.forEach(([x, y], i) => { if (FOR.cut !== i) L.push([x, y - 6, 22, '140,215,255', .34, i * 7 + 1]); });   // the moon in the pond, the moss
  { const mu = IMG['f/mural']; if (mu) [.15, .385, .615, .85].forEach((k, i) => L.push([F_MURAL.x + mu.width * k, F_MURAL.y + mu.height / 2, 11, '150,220,255', .2, 40 + i])); }
  if (typeof keyForest === 'function') keyForest(dt, t, m, L);   // the fireflies and the two stones: drawn over the scene, lit like the rest (keystones.js)
  lights(L, t); lx.fillStyle = 'rgba(70,120,255,.05)'; lx.fillRect(0, 0, cam.lw, cam.lh); vignette(.5);   // a cold blue moon over all of it
  snipTick(dt, m);
  return hits;
};
FRH.joy = (m, J) => {
  if (!FOR.snip && J.x > .5 && m.x > F_OUT.x - 6 && Math.abs(m.y - F_OUT.y) < 14) wlDoor(-1);   // back along the path to the town
  return true;   // (never fall through to the town-building door check)
};
FRH.tap = (e, m, x, y) => {
  if (FOR.snip) return true; if (m.seat) { wlUp(m); return true; }
  if (x > F_OUT.x - 26 && Math.abs(y - F_OUT.y) < 20) { wlGo(m, F_OUT.x, F_OUT.y, () => wlDoor(-1)); return true; }
  const i = F_MOSS.findIndex(([mx, my], k) => FOR.cut !== k && Math.abs(x - mx) < 12 && y > my - 18 && y < my + 6);
  if (i >= 0) { const [mx, my] = F_MOSS[i], L = m.x < mx; wlGo(m, mx + (L ? -15 : 15), my + 1, () => { m.dir = L ? 'right' : 'left'; }); return true; }   // beside it, so it is not under your feet
  wlGo(m, x, y + 6); holdWalk(e, scenes.town, (x, y) => { const m = WL.me; if (m.loc === FOREST && !m.ko && !FOR.snip) wlGo(m, x, y + 6); });
  return true;
};

/* ---------- MOONMOSS ---------- */
const MOSS_ICON = pxIcon(['....KKKK...KK...', '..KKLLLLK.KLLK..', '.KLLLWLLLKLLWLK.', 'KLLWLLLLLLLLLLLK', 'KLLLLLLWLLLLLLDK', 'KLLLLLLLLLLWLLDK', '.KLLWLLLLLLLLDDK', '.KLLLLLLLWLLLDK.', 'KLLLLLWLLLLLLDDK', 'KLWLLLLLLLLWLLDK', 'KLLLLLLLLLLLLDDK', '.KDLLLWLLLLLDDK.', '..KDDLLLLDDDDK..', '...KKDDDDDKKK...', '.....KKKKK......'],
  {K: '#1a1430', L: '#9fdcff', W: '#ffffff', D: '#5aa8e0'});
const nearMoss = m => F_MOSS.findIndex(([x, y], i) => FOR.cut !== i && Math.hypot(m.x - x, m.y - (y + 2)) < 24);
function snipGo() {
  const m = WL.me, i = m ? nearMoss(m) : -1; if (i < 0 || FOR.snip || QUEST.s !== 2 || m.loc !== FOREST) return;
  const [x, y] = F_MOSS[i]; FOR.snip = {i, t: 0, n: 0, x: m.x, y: m.y, dir: dirFrom(x - m.x, (y - 4) - m.y)}; WL.sel = null; wlMenu();
}
function snipTick(dt, m) {
  const b = $('#mossBtn'), S = FOR.snip, show = !S && QUEST.s === 2 && m.loc === FOREST && !m.ko && !WL.fading && nearMoss(m) >= 0 && !document.querySelector('.modal.on');   // his rule: only with the snips (and only until you have your moss)
  if (b.classList.contains('on') !== show) b.classList.toggle('on', show);
  if (!S) return; S.t += dt; const [x, y] = F_MOSS[S.i];
  if (S.n < 3 && S.t > .12 + S.n * .28) { S.n++; sfx('snip'); for (let k = 0; k < 6; k++) FOR.fx.push({x: x + Math.random() * 12 - 6, y: y - 4 - Math.random() * 6, vx: Math.random() * 30 - 15, vy: -14 - Math.random() * 22, t: 0, l: .45 + Math.random() * .3}); }   // three snips, bits of moss flying
  if (S.t < 1.05 || S.ask) return; S.ask = true;
  qop('qmoss', {at: FOREST}).then(r => { FOR.snip = null; if (r && r.got) { FOR.cut = S.i; itemGot('MOONMOSS', MOSS_ICON, '150,215,255'); } }, e => { FOR.snip = null; wlSay(e.message, 'bad'); });
}
SFX.snip = () => { tone(2300, .035, {type: 'square', vol: .05, to: 1500}); tone(3100, .03, {type: 'square', vol: .04, to: 2200, at: .05}); hiss(.05, {vol: .05, bp: 4200, at: .04}); };
(() => {
  const b = document.createElement('button'); b.id = 'mossBtn'; b.className = 'btn go'; b.textContent = 'Get Moonmoss'; $('#fishRodBtn').after(b);
  b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); snipGo(); });
  const st = document.createElement('style');
  st.textContent = '#mossBtn{position:absolute;left:50%;bottom:calc(250px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:8;display:none;font-size:18px;padding:8px 18px 11px;white-space:nowrap;background:#3f86e0;border-color:#163a78;box-shadow:inset 0 -4px 0 #2a63b8,0 3px 0 #0009;pointer-events:auto;touch-action:none}'
    + '#mossBtn.on{display:block}#mossBtn:active{transform:translateX(-50%) scale(.96)}#phone.land #mossBtn{bottom:calc(var(--lb) + 18px)}'
    + '#mapBtn{position:absolute;left:14px;top:calc(150px + env(safe-area-inset-top));width:46px;height:46px;z-index:7;display:none;align-items:center;justify-content:center;padding:0;border:3px solid #1a1430;border-radius:6px;background:#16233f;box-shadow:0 3px 0 #0009;pointer-events:auto;cursor:pointer}'
    + '#mapBtn.on{display:flex}#mapBtn img{width:32px;height:32px;image-rendering:pixelated}#mapBtn:active{transform:scale(.94)}#phone.land #mapBtn{left:calc(14px + var(--sl));top:64px}'
    + '#mapModal{padding:12px;z-index:10;bottom:auto;top:calc(110px + env(safe-area-inset-top));background:#16233f;border:3px solid #6ec8ff;border-radius:6px;box-shadow:inset 0 0 0 3px #1a1430,0 5px 0 #0009}#mapModal canvas{width:100%;height:auto;image-rendering:pixelated;display:block}'
    + '#phone.land #mapModal{top:10px;left:0;right:0;margin:0 auto;width:min(430px,calc((100vh - 40px) * 1.33))}';
  document.head.appendChild(st);
})();
setInterval(() => { const b = $('#mossBtn'); if (b && (scene !== scenes.town || !WL.me || WL.me.loc !== FOREST)) b.classList.remove('on'); }, 400);   // never left showing outside the forest

/* ---------- THE TORN MAP (Pip's, once he is mended: QUEST.s >= 4) and the GLOW BAIT ----------
   Looking at it again: a small button with the map on it, at the left of the walking screen, from the moment you carry it. Tap it and the
   map opens; tap the map to put it away. No words on it and nothing ticked off (his pick: no journal, only the torn map). */
const MAP_ICON = pxIcon(['.KKK.KKKKK.KKK..', 'KPPPKPPPPPKPPPK.', 'KPbbPPPPPPPtPPK.', 'KPbbPPPdPPtttPK.', '.KPPPPdPdPPtPPK.', 'KPPPPdPPPdPPPPPK', 'KPPdPPPPPPdPPPPK', 'KPPPPPPPPPPdPPK.', 'KPsPsPPPPPrrrPK.', 'KPsssPPPPProrPK.', '.KPsPPPPPPrrrPPK', 'KPPPPPPPPPPPPPPK', 'KPPKKPPPKKPPPKK.', '.KK..KKK..KKK...'],
  {K: '#1a1430', P: '#d9a86a', b: '#7fb4e8', d: '#8a5a2b', t: '#5a3a22', s: '#6c7486', r: '#e8562a', o: '#ffb24a'});
const BAIT_ICON = pxIcon(['......KKKK......', '.....KWWWWK.....', '....KKKKKKKK....', '....KGGGGGGK....', '...KGgWGGGGGK...', '..KGGWWGGgGGGK..', '..KGGWGGGGGGGK..', '..KGGGGGgGGWGK..', '..KGgGGGGGGGGK..', '..KGGGGGWGGGDK..', '..KGGGGGGGGDDK..', '...KGGGGGDDDK...', '....KKKKKKKK....'],
  {K: '#1a1430', W: '#ffffff', G: '#8ff2e0', g: '#eaffd0', D: '#3fb8b0'});
function pipGifts() { itemGot('THE TORN MAP', MAP_ICON, '255,200,120', () => itemGot('GLOW BAIT', BAIT_ICON, '120,255,225')); }   // one card, then the other (mine.js: Pip, once the server says he is mended)
function mapOpen() { const im = IMG['f/map']; if (!im || QUEST.s < 4) return; const c = $('#mapCv'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0);
  document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); $('#mapModal').classList.add('on'); sfx('click'); }
function mapBtnTick() { const b = $('#mapBtn'), m = WL.me, show = QUEST.s >= 4 && !!m && scene === scenes.town && $('#joy').classList.contains('on') && !document.querySelector('.modal.on');
  if (b && b.classList.contains('on') !== show) b.classList.toggle('on', show); }
(() => {
  const b = document.createElement('button'); b.id = 'mapBtn'; const c = mk(32, 32), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(MAP_ICON, 0, 2, 32, 28);
  b.innerHTML = `<img src="${c.toDataURL()}" alt="">`; $('#fishRodBtn').after(b); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); mapOpen(); });
  const ref = $('#beerModal'), d = document.createElement('div'); d.className = 'modal'; d.id = 'mapModal'; d.innerHTML = '<canvas id="mapCv" width="288" height="216"></canvas>';
  ref.parentNode.insertBefore(d, ref); d.onclick = () => { d.classList.remove('on'); sfx('close'); };
})();
setInterval(() => { const b = $('#mapBtn'); if (b && scene !== scenes.town) b.classList.remove('on'); }, 400);
