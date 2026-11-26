/* ================= THE FOUR KEYSTONES (25 Nov 2026, the Glimmerkin hunt, batch 3) =================
   Pip, mended, hands over the torn map and the Glow Bait (QUEST.s = 4). From then on, and not a moment before, four carved stones can be
   found, in any order. Each is its own flag on the wallet beside the step (QUEST.moon / fang / hearth / ember; functions/quest.js has the
   ops), and the fourth one moves the hunt on to step 5. The pictures are assets/quest/*.png (tools/make_keystones.py): the mural's four
   shapes. Every one ends with the YOU GOT card (mine.js itemGot). Nothing on the screen tracks any of it (his rule).
     MOON   (circle)    the lake. Cast up the lake from the END OF THE JETTY and the Glow Bait goes on the hook by itself: no fish comes,
                        a pale round light rises under the float, it bites, you tap, the stone comes up. (fishing.js calls moon*.)
     FANG   (triangle)  the forest's round glade. Five rings of pale caps in the grass, fireflies over each. The fireflies flare one ring
                        at a time, in an order; walk the rings in that order and the stone rises in the middle. A wrong ring: a small
                        fizzle, and you start again. The order is new every time you walk into the forest.
     HEARTH (square)    stands CRACKED on the forest's bare earth: walk up to it and it is yours (the cracked one). At the Blacksmith's
                        counter there is then one more button; he walks to his anvil, four blows, and it is whole.
     EMBER  (diamond)   mine level 11. One lava pool (4 x 3 squares, walled in) has a ledge at its far side with the stone on it. Six of
                        its squares are stepping stones just under the lava: a faint darker patch from far off, a plain slab when you
                        are within two squares of one. Off the stones the lava burns as it always does (hearts, mine.js). The joystick only: a tapped
                        walk never crosses lava.
   Loaded after forest.js (index.html), so everything in mine.js, fishing.js and forest.js is already there. */
const KEYS = {fang: null, fx: [], sp: [], mend: null, ask: {}};   // fx = bits flying in the forest, sp = sparks off the anvil
const KS_GLOW = '120,210,255';
const ksImg = k => IMG['q/' + k];
function keysLoad() { return Promise.all(['moon', 'fang', 'hearth', 'hearth-cracked', 'ember'].map(k => load('q/' + k, `assets/quest/${k}.png`).catch(() => {}))); }
const ksGot = (name, k) => itemGot(name, ksImg(k) || PX1, KS_GLOW);
function ksTwinkle(cx, cy, t, i) { const k = Math.floor(t / 170 + i * 4) % 11; if (k > 3) return; const px = X(cx + [-6, 5, -2, 6][k]), py = Y(cy - [2, 9, 16, 21][k]); lx.fillStyle = '#fff'; lx.fillRect(px - 1, py, 3, 1); lx.fillRect(px, py - 1, 1, 3); }
// one ask at a time for each stone; the server's answer sets the flags (mine.js qop), and the card comes up only when it really was handed over
function ksAsk(op, d, name, k, then) { const now = performance.now(); if (KEYS.ask[op] === true || now < KEYS.ask[op]) return; KEYS.ask[op] = true;   // (refused or no signal: not asked again for a few seconds, however long you stand there)
  qop(op, d).then(r => { KEYS.ask[op] = 0; if (then) then(r); if (r && r.got) ksGot(name, k); }, e => { KEYS.ask[op] = performance.now() + 4000; if (then) then(null); wlSay(e.message, 'bad'); }); }

/* ---------- MOON: the Glow Bait, off the end of the lake's jetty ---------- */
function moonReady(m) { return QUEST.s >= 4 && !QUEST.moon && !!m && m.loc === LAKE && FISH.face === 'back' && Math.abs(m.x - FISH_ME[0]) < 22 && m.y < FISH_ME[1] + 16; }
function moonCast(m, B) { if (!moonReady(m)) return false; FISH.moon = {t: 0, up: null, ask: false}; return true; }   // the float has landed: this cast is the Glow Bait's
function moonTick(dt, t, m, press) {   // true = this step of the fishing was the Moon stone's (fishing.js does nothing more with it)
  const F = FISH, M = F.moon, B = F.bob; M.t += dt;
  if (F.ph === 'wait') { if (press) { F.bob = null; F.moon = null; fishPh('idle'); return true; }   // pulled in before anything came up
    if (M.t > 3.4) { F.dip = 2.2; sfx('fish_bite'); fishSplash(B.x, B.y); fishRipple(B.x, B.y, 10, .7); try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} fishPh('bite'); }
    else if (M.t > 2 && Math.random() < dt * 2.5) fishRipple(B.x, B.y, 6, .6);
    return true; }
  if (F.ph === 'bite') { F.dip = Math.max(F.dip, 1.2);
    if (press) { M.up = {x0: B.x, y0: B.y, t: 0}; F.bob = null; F.ph = 'moon'; F.t = 0; fishSay(''); fishSplash(M.up.x0, M.up.y0); sfx('fish_up'); }
    else if (F.t > 2.4) { fishRipple(B.x, B.y, 8, .7); F.bob = null; F.moon = null; fishPh('idle'); }   // too slow: it sinks back without a word. Cast again
    return true; }
  if (F.ph === 'moon') { M.up.t += dt; if (M.up.t >= .8 && !M.ask) { M.ask = true; ksAsk('qmoon', {at: LAKE}, 'MOON STONE', 'moon', r => { if (r) fishStop(); else { F.moon = null; fishPh('idle'); } }); } return true; }
  return false;
}
function moonDraw(t, m, px, py) {
  const F = FISH, M = F.moon, B = F.bob, q = Math.floor(t / 120) % 2;
  if (B && F.ph !== 'fly') { const bx = X(B.x), by = Y(B.y) + 4, k = clamp((M.t - 2) / 1.4, 0, 1), r = F.ph === 'bite' ? 6 + q : Math.round(k * 6);
    if (r > 0) { lx.globalAlpha = F.ph === 'bite' ? .6 : .2 + k * .3; lx.fillStyle = '#bfe9ff'; for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); lx.fillRect(bx - w, by + dy, w * 2 + 1, 1); } lx.globalAlpha = 1; }   // the round stone, coming up under the float
    lx.fillStyle = '#8ff2e0'; lx.fillRect(bx - 1, by - 1, 3, 1); lx.fillRect(bx, by - 2, 1, 3); if (q) { lx.fillStyle = '#eaffd0'; lx.fillRect(bx, by - 1, 1, 1); } }   // the bait's own glow, just under the float
  const U = M.up, im = ksImg('moon'); if (U && im) { const k = Math.min(1, U.t / .8), fx = lerp(X(U.x0), px, k), fy = lerp(Y(U.y0), py - 46, k) - Math.sin(k * Math.PI) * 26; lx.drawImage(im, Math.round(fx) - (im.width >> 1), Math.round(fy) - (im.height >> 1)); }
}

/* ---------- FANG: the firefly path in the forest's glade ---------- */
const FANG = {n: 5, r: 48, hit: 8, lit: .5, gap: .22, rest: 1.9, rise: 1.8};   // rings, how far they are from the middle, how close counts as standing on one | the show: seconds a ring flares, the dark between two, the wait before it plays again | seconds the stone takes to come up
const fangSpot = i => { const a = -Math.PI / 2 + i * Math.PI * 2 / FANG.n; return [Math.round(F_GLADE.x + Math.cos(a) * FANG.r), Math.round(F_GLADE.y + Math.sin(a) * FANG.r)]; };
const fangOn = () => QUEST.s >= 4 && !QUEST.fang;
function fangNew() { const seq = [...Array(FANG.n).keys()]; for (let i = seq.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [seq[i], seq[j]] = [seq[j], seq[i]]; }
  return {seq, n: 0, on: -1, t: -1.2, rise: null}; }   // n = how many rings of the order you have walked; on = the ring under your feet; rise = seconds since the stone began to come up
function fangRing() { if (fangRing.c) return fangRing.c; const c = mk(17, 17), x = c.getContext('2d');   // straight down: eight little pale caps in a circle, a dark foot under each
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .2, px = Math.round(8 + Math.cos(a) * 7), py = Math.round(8 + Math.sin(a) * 7); x.fillStyle = '#16245a'; x.fillRect(px - 1, py, 3, 2); x.fillStyle = i % 2 ? '#a9c9f6' : '#7fa6e6'; x.fillRect(px - 1, py - 1, 2, 2); x.fillStyle = '#e6f2ff'; x.fillRect(px - 1, py - 1, 1, 1); }
  return fangRing.c = c; }
function fangShown(G) { const step = FANG.lit + FANG.gap, cyc = FANG.n * step + FANG.rest; if (G.t < 0) return -1; const u = G.t % cyc, i = Math.floor(u / step); return i < FANG.n && u - i * step < FANG.lit ? G.seq[i] : -1; }   // the ring flaring right now (-1: none)
function keyForestObjs(out, m, t) {
  if (QUEST.s < 4) return;
  const hc = ksImg('hearth-cracked'); if (hc && !QUEST.hc && !QUEST.hearth) out.push({img: hc, x: F_HEARTH.x - (hc.width >> 1), y: F_HEARTH.y - hc.height, base: F_HEARTH.y - 1, after: () => ksTwinkle(F_HEARTH.x, F_HEARTH.y, t, 3)});
  const G = KEYS.fang; if (!G || !fangOn()) return;
  for (let i = 0; i < FANG.n; i++) { const [x, y] = fangSpot(i); out.push({img: fangRing(), x: x - 8, y: y - 8, base: 0}); }
  const im = ksImg('fang'); if (G.rise == null || !im) return; const k = clamp(G.rise / FANG.rise, 0, 1), h = Math.max(1, Math.round(k * im.height)), cx = F_GLADE.x, fy = F_GLADE.y;
  out.push({img: PX1, x: cx, y: fy - 1, base: fy - 1, after: () => { const sx = k < 1 ? Math.round(Math.sin(t * .05) * 1) : 0;   // it comes up out of the ground top first, shaking a little; broken earth round its foot
    lx.fillStyle = '#131d4a'; for (let dy = -2; dy <= 2; dy++) { const w = Math.round(13 * Math.sqrt(1 - (dy / 2.6) ** 2)); lx.fillRect(X(cx) - w, Y(fy) + dy, w * 2, 1); }
    lx.drawImage(im, 0, 0, im.width, h, X(cx - (im.width >> 1)) + sx, Y(fy - h), im.width, h);
    lx.fillStyle = '#2a3a78'; for (const [a, b] of [[-11, 0], [-7, 1], [7, 1], [10, 0], [-3, 2], [4, 2]]) lx.fillRect(X(cx + a), Y(fy + b) - 1, 2, 2);
    if (k >= 1) ksTwinkle(cx, fy, t, 1); }});
}
function keyForest(dt, t, m, L) {   // called by the forest's frame once the scene is drawn: the rules, the fireflies, the light
  if (QUEST.s < 4) return;
  if (!QUEST.hc && !QUEST.hearth) { L.push([F_HEARTH.x, F_HEARTH.y - 14, 18, KS_GLOW, .2, 51]); if (Math.hypot(m.x - F_HEARTH.x, m.y - F_HEARTH.y) < 16 && !document.querySelector('.modal.on')) ksAsk('qhcrack', {at: FOREST}, 'CRACKED STONE', 'hearth-cracked'); }
  for (let i = KEYS.fx.length - 1; i >= 0; i--) { const p = KEYS.fx[i]; p.t += dt; if (p.t > p.l) { KEYS.fx.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; if (p.t >= 0) { lx.fillStyle = p.t / p.l < .5 ? p.c : p.d; lx.fillRect(X(p.x), Y(p.y), 1, 1); } }
  if (!fangOn()) { KEYS.fang = null; return; }
  const G = KEYS.fang || (KEYS.fang = fangNew()); G.t += dt;
  if (G.rise != null) { const was = G.rise; G.rise += dt; if (G.rise < FANG.rise) { if (Math.random() < dt * 22) KEYS.fx.push({x: F_GLADE.x + Math.random() * 22 - 11, y: F_GLADE.y - 1, vx: Math.random() * 30 - 15, vy: -18 - Math.random() * 26, g: 90, t: 0, l: .5, c: '#5a78c8', d: '#2a3a78'}); }
    else { if (was < FANG.rise) sfx('rare'); L.push([F_GLADE.x, F_GLADE.y - 14, 20, KS_GLOW, .3, 52]);
      if (Math.hypot(m.x - F_GLADE.x, m.y - F_GLADE.y) < 16 && !document.querySelector('.modal.on')) ksAsk('qfang', {at: FOREST}, 'FANG STONE', 'fang'); } }
  let on = -1; for (let i = 0; i < FANG.n; i++) { const [x, y] = fangSpot(i); if (Math.hypot(m.x - x, m.y - y) < FANG.hit) on = i; }
  if (on !== G.on) { G.on = on; const at = G.seq.indexOf(on);
    if (on < 0 || G.rise != null || at < G.n) {}   // off a ring, the puzzle done, or a ring you have already lit (you may cross those)
    else if (at === G.n) { G.n++; sfx('fang' + G.n); if (G.n === FANG.n) { G.rise = 0; sfx('krise'); } }
    else { G.n = 0; G.t = -1.2; sfx('kfizz'); for (let i = 0; i < FANG.n; i++) { const [x, y] = fangSpot(i); for (let k = 0; k < 4; k++) KEYS.fx.push({x: x + Math.random() * 10 - 5, y: y - 5 - Math.random() * 6, vx: Math.random() * 16 - 8, vy: 6 + Math.random() * 12, g: 50, t: 0, l: .45 + Math.random() * .2, c: '#b8c0d8', d: '#5a6488'}); } } }   // wrong: the lights drop out of the air, and the show starts over
  const show = G.rise == null ? fangShown(G) : -1;
  for (let i = 0; i < FANG.n; i++) { const [x, y] = fangSpot(i), done = G.seq.indexOf(i) < G.n, hot = show === i, bright = done || hot;
    if (bright) L.push([x, y - 7, hot ? 20 : 15, '255,238,140', hot ? .42 : .26, 60 + i]);
    for (let f = 0; f < (hot ? 5 : 3); f++) { const ph = i * 2.1 + f * 2.4, a = t * .0016 * (f % 2 ? 1 : -1.3) + ph, fx = X(x + Math.cos(a) * (4 + f)), fy = Y(y - 7 + Math.sin(a * 1.3) * 3 - f);
      if (!bright && (G.t < 0 || Math.floor(t / 260 + ph * 3) % 5 < 2)) continue;   // idle ones wink; none at all for a breath after a wrong ring
      lx.fillStyle = bright ? '#fff6a8' : '#c2cc6a'; lx.fillRect(fx, fy, 1, 1); if (bright) { lx.fillStyle = hot ? '#ffe46a' : '#d8c050'; lx.fillRect(fx - 1, fy, 1, 1); lx.fillRect(fx + 1, fy, 1, 1); lx.fillRect(fx, fy - 1, 1, 1); lx.fillRect(fx, fy + 1, 1, 1); } } }
}
for (let n = 1; n <= 5; n++) SFX['fang' + n] = () => { const f = [660, 784, 880, 988, 1175][n - 1]; tone(f, .16, {type: 'sine', vol: .07, to: f * 1.01}); tone(f * 2, .1, {type: 'sine', vol: .03, at: .02}); };
SFX.kfizz = () => { hiss(.18, {vol: .05, bp: 2600}); tone(300, .12, {type: 'sine', vol: .04, to: 170}); };
SFX.krise = () => { tone(90, .9, {type: 'triangle', vol: .12, to: 60}); hiss(.9, {vol: .06, lp: 700}); };

/* ---------- HEARTH: the Blacksmith mends the cracked stone ---------- */
const MEND = {walk: 2.6, blows: 4, beat: .9, home: 2.6, in: [SMITH_AT, [176, 114], [176, 152], SM_AT.anvil], watch: [140, 196]};   // seconds to the anvil, blows, seconds a blow, seconds back | his way there (his way back is the smelting job's own: SM_P4) | where you stand to watch
function mendGo() { const m = WL.me; if (KEYS.mend || !QUEST.hc || QUEST.hearth || !m) return; sfx('click'); $('#smithModal').classList.remove('on'); KEYS.mend = {t: 0, n: 0, h: false, ask: false, done: null};
  wlGo(m, MEND.watch[0], MEND.watch[1], () => { m.dir = 'back'; }); }   // you follow him over: from his counter the anvil is off the edge of the screen
function mendNow() {   // where he is and what he does while he mends it (stands in for smithNow, which knows only the smelting job)
  const D = KEYS.mend, e = D.t, A = SM_AT.anvil;
  if (e < MEND.walk) return {...pathAt(MEND.in, e / MEND.walk), anim: 'walk', st: 'mendgo', e, se: e};
  if (D.done == null) { const se = e - MEND.walk, c = se % MEND.beat; return {x: A[0], y: A[1], dir: 'east', anim: se < MEND.blows * MEND.beat && c < .6 ? 'hammer' : 'idle', k: c / .6, st: 'mend', e, se}; }
  return {...pathAt(SM_P4, (e - D.done) / MEND.home), anim: 'walk', st: 'back', e, se: 0};
}
function mendTick(dt) {
  const D = KEYS.mend, m = WL.me; if (!D) { KEYS.sp.length = 0; return; } if (!m || m.loc !== SMITHY) { KEYS.mend = null; return; }   // walked out on him: nothing was mended, ask again
  for (let i = KEYS.sp.length - 1; i >= 0; i--) { const p = KEYS.sp[i]; p.t += dt; if (p.t > p.l) { KEYS.sp.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }
  D.t += dt; const se = D.t - MEND.walk;
  if (D.done != null) { if (D.t - D.done > MEND.home) KEYS.mend = null; return; }
  if (se < 0) return; const hit = D.n < MEND.blows && (se % MEND.beat) / .6 > .55 && (se % MEND.beat) < .6;
  if (hit && !D.h) { D.n++; sfx('anvil'); for (let i = 0; i < 7; i++) KEYS.sp.push({x: ANVIL_TOP[0] + 5, y: ANVIL_TOP[1], vx: Math.random() * 60 - 30, vy: -20 - Math.random() * 40, t: 0, l: .3 + Math.random() * .25}); } D.h = hit;
  if (D.n >= MEND.blows && se > MEND.blows * MEND.beat && !D.ask) { D.ask = true; ksAsk('qforge', {at: SMITHY}, 'HEARTH STONE', 'hearth', r => { if (r) { D.done = D.t; sfx('quench'); } else KEYS.mend = null; }); }
}
function mendDraw(t) {   // on the anvil's flat top: the stone lying there, its crack closing blow by blow; blue sparks off the hammer
  const D = KEYS.mend; if (!D) return; const bx = ANVIL_TOP[0], by = ANVIL_TOP[1] - 2;
  if (D.t >= MEND.walk && D.done == null) { P1('#01032e', bx, by - 1, 11, 7); P1('#86a2d0', bx + 1, by, 9, 5); P1('#b9d2f4', bx + 1, by, 9, 1); P1('#5f7cb4', bx + 1, by + 4, 9, 1);
    P1(D.n >= MEND.blows ? '#e8fbff' : '#6ee2ff', bx + 4, by + 1, 3, 3); P1('#86a2d0', bx + 5, by + 2);                                    // its square
    [[5, 0], [6, 1], [5, 2], [4, 3], [5, 4]].forEach(([a, b], i) => { if (i * MEND.blows >= D.n * 5) P1('#01032e', bx + a, by + b); }); }   // the crack: a bit less of it with every blow
  for (const p of KEYS.sp) P1(p.t / p.l < .5 ? '#e8fbff' : '#6ee2ff', p.x, p.y);
}
{ const sn = smithNow; smithNow = function () { return KEYS.mend ? mendNow() : sn(); }; }
{ const sp = smithProps; smithProps = function (S, t) { sp(S, t); if (S.st === 'mendgo') { P1('#01032e', S.x + 3, S.y - 14, 7, 6); P1('#86a2d0', S.x + 4, S.y - 13, 5, 4); P1('#01032e', S.x + 6, S.y - 13, 1, 4); } }; }   // the cracked stone in his hands on the way over
{ const so = SMH.objs; SMH.objs = t => { const L = so(t), an = IMG['sm/anvil']; if (KEYS.mend) for (const o of L) if (o.img === an) { const a = o.after; o.after = () => { if (a) a(); mendDraw(t); }; } return L; }; }
{ const sl = SMH.lights; SMH.lights = fl => { const L = sl(fl), D = KEYS.mend; if (D && D.t >= MEND.walk && D.done == null) L.push([ANVIL_TOP[0] + 5, ANVIL_TOP[1], 16, KS_GLOW, .2 + D.n * .05, 7]); return L; }; }
{ const su = smithUI; smithUI = function () { su(); const b = $('#mendYes'); if (b) b.style.display = QUEST.s >= 4 && QUEST.hc && !QUEST.hearth && !KEYS.mend ? '' : 'none'; }; }
(() => { const b = document.createElement('button'); b.className = 'btn go wide'; b.id = 'mendYes'; b.textContent = 'Mend the cracked stone'; b.style.display = 'none'; b.style.marginTop = '14px'; $('#smithModal').appendChild(b); b.onclick = mendGo; })();

/* ---------- EMBER: hidden stepping stones across a lava pool on mine level 11 ---------- */
const EMB = {lv: 11, w: 4, h: 3, path: [[0, 2], [0, 1], [1, 1], [2, 1], [2, 0], [3, 0]], near: 40};   // the pool, in squares | the stones, from the near side to the ledge (col, row; the ledge is above the last one) | how close (px) a stone shows plainly: two squares, since the one right in front of you is behind your own head
const emberOn = () => { const E = MN.ember; return !!E && MN.lv === EMB.lv && !MN.den && MN.haz.has(E.li); };
/* called by mineHaz (mine.js) before any other danger is laid: finds room for the pool, walls it in on three sides (rock that cannot be dug:
   the only way to the ledge is over the lava), and opens the floor along its near side. The cave stays one cave: every other bit of
   floor can still be walked to without it. No room anywhere (about 1 level in 1000): no pool this visit, the next visit digs a new level. */
function emberLay() {
  const M = MN; M.ember = null; if (M.lv !== EMB.lv || QUEST.s < 4 || QUEST.ember) return;
  const [ex, ey] = M.entry, W = EMB.w, H = EMB.h;
  for (const gap of [2, 1]) { const close = (x, y, p) => !!p && Math.max(Math.abs(x - p[0]), Math.abs(y - p[1])) <= gap, C = [];   // two squares clear of both ladders if it can be, one if it must
  for (let y0 = 4; y0 + H <= MGH - 3; y0++) for (let x0 = 2; x0 + W - 1 <= MGW - 3; x0++) { let bad = false, n = 0;
    for (let y = y0 - 2; y <= y0 + H && !bad; y++) for (let x = x0 - 1; x <= x0 + W; x++) { if (close(x, y, M.entry) || close(x, y, M.shaft) || M.keep.has(mci(x, y))) { bad = true; break; } if (y < y0 + H && isFloor(x, y)) n++; }
    if (!bad) C.push([n + Math.random(), x0, y0]); }
  C.sort((a, b) => a[0] - b[0]);   // where the least open floor has to be walled up
  for (const [, x0, y0] of C) { const was = M.cell.slice(), flip = Math.random() < .5, col = c => x0 + (flip ? W - 1 - c : c), lx0 = col(EMB.path[EMB.path.length - 1][0]), ly0 = y0 - 1;
    const inPool = (x, y) => x >= x0 && x < x0 + W && y >= y0 && y < y0 + H, ring = [];
    for (let y = y0 - 2; y < y0 + H; y++) for (let x = x0 - 1; x <= x0 + W; x++) { const open = inPool(x, y) || (x === lx0 && y === ly0); M.cell[mci(x, y)] = open ? 0 : 1; if (!open) ring.push(mci(x, y)); }
    for (let x = x0; x < x0 + W; x++) M.cell[mci(x, y0 + H)] = 0;
    const d = mineFlood(ex, ey, (x, y) => inPool(x, y) || (x === lx0 && y === ly0)); let ok = true;
    for (let i = 0; i < MGW * MGH && ok; i++) if (!M.cell[i] && d[i] < 0 && !inPool(i % MGW, (i / MGW) | 0) && i !== mci(lx0, ly0)) ok = false;
    if (!ok) { M.cell.set(was); continue; }
    for (const i of ring) M.keep.add(i);
    for (let y = y0; y < y0 + H; y++) for (let x = x0; x < x0 + W; x++) M.haz.set(mci(x, y), {k: 'lava'});
    const stones = EMB.path.map(([c, r]) => mci(col(c), y0 + r)); for (const i of stones) M.haz.set(i, {k: 'lava', ok: 1});   // ok: it does not burn, and it is never in the way (mine.js hazStop)
    const li = mci(lx0, ly0); M.haz.set(li, {k: 'ledge', ok: 1}); M.pools.push([x0 * CS + W * 8, y0 * CS + H * 8, 6]);
    M.ember = {li, gx: lx0, gy: ly0, stones, shown: false}; return; } }
}
function emberSlab(full) {   // straight down: a flat dark slab | from far off only a patch a little darker than the lava round it
  const key = 'eslab' + full; if (MN.cache[key]) return MN.cache[key]; const c = mk(12, 10), x = c.getContext('2d'), P = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  if (full) { P('#2a0a12', 1, 0, 10, 10); P('#2a0a12', 0, 1, 12, 8); P('#5a4650', 1, 1, 10, 8); P('#7a6470', 1, 1, 10, 2); P('#8e7a86', 2, 1, 4, 1); P('#463640', 1, 7, 10, 2); P('#463640', 7, 4, 2, 1); P('#463640', 3, 5, 1, 2); }
  else { P('#c2401a', 1, 1, 10, 8); P('#c2401a', 2, 0, 8, 10); P('#d8561e', 2, 1, 8, 2); P('#9c2a16', 2, 7, 8, 2); }   // the lava's own darker reds, but it holds still while the lava round it moves
  return MN.cache[key] = c;
}
{ const mh = mineHazObjs; mineHazObjs = function (objs, t) { mh(objs, t); if (!emberOn()) return; const E = MN.ember, m = WL.me, all = E.shown || QUEST.ember;
    for (const i of E.stones) { const gx = i % MGW, gy = (i / MGW) | 0, near = all || (!!m && Math.hypot(m.x - gx * CS - 8, m.y - 3 - gy * CS - 8) < EMB.near); objs.push({img: emberSlab(near ? 1 : 0), x: gx * CS + 2, y: gy * CS + 3, base: .05}); }
    const im = ksImg('ember'), cx = E.gx * CS + 8, fy = E.gy * CS + 9; if (im && !QUEST.ember) objs.push({img: im, x: cx - (im.width >> 1), y: fy - im.height, base: fy, after: () => ksTwinkle(cx, fy, t, 2)}); }; }
{ const mg = mineGlow; mineGlow = function (L, t) { mg(L, t); if (emberOn() && !QUEST.ember) L.push([MN.ember.gx * CS + 8, MN.ember.gy * CS - 5, 20, KS_GLOW, .34, 91]); }; }
function emberTick() {   // on the ledge: the stone is yours, and the way back shows itself
  const m = WL.me; if (!m || m.loc !== MINE || !emberOn() || QUEST.ember || MN.busy || MN.out) return; const E = MN.ember;
  if (Math.floor(m.x / CS) === E.gx && Math.floor((m.y - 3) / CS) === E.gy) ksAsk('qember', undefined, 'EMBER STONE', 'ember', r => { if (r) E.shown = true; });
}
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { mendTick(dt); emberTick(); const m = WL.me; if (KEYS.fang && (!m || m.loc !== FOREST)) KEYS.fang = null; return fr.call(this, dt, t); }; }   // the firefly order is forgotten when you leave the forest
