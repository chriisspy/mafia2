/* ================= THE TEMPLE (26 Nov 2026, the Glimmerkin hunt, batch 4) =================
   With all four Keystones (QUEST.s = 5, keystones.js) and not a moment before, the cleft in the snowy boulders beside the South's race
   road lets you through (until then it is a crack in a rock: no way in, nothing said). Past it is a place of its own, a night hollow
   (HOLLOW, loc 108) with the temple in it, and inside the temple the throne hall (THRONE, loc 109).
     THE TEMPLE'S OUTSIDE is a sprite stack (his call), drawn in code by tools/make_temple.py and baked ONCE by the game's own stack loop
     (index.html stackFrame) at turn 0: doors facing down the screen. Its two door leaves are a small stack of their own, laid over the
     doorway and slid apart. THE ALTAR (assets/quest/altar.png, tools/make_altar.py) is the same kind of stack, in front of the doors.
     THE ORDER: tap the altar, pick one of the stones you hold (pictures only). Each stone goes to its own socket. The next one of the
     mural's order (Moon, Fang, Hearth, Ember) stays in; any other hops straight back out with a thud, and takes every stone set so far
     with it. The fourth right one asks the server (op qopen, functions/quest.js: 5 -> 6) and only its yes plays THE OPENING: the stones
     light one by one, the altar blazes, light runs along the ground and up the door frame, the hollow shakes, dust falls, the doors
     slide apart, a beam comes out. From then on (QUEST.s >= 6) the temple stands open with the stones set, for that player.
     THE KING (assets/final/king, tools/make_glimmerkin.py) sits on the throne and talks like Pip does, a line a tap. kingDone() is
     called after his last line: BATCH 5 hangs the reward there (and step 7).
   Nothing on the screen tracks or explains any of it (his rule). Loaded after keystones.js (index.html). */

/* ---------- the places ---------- */
const HOLLOW = 100 + HALLS.length;   // 108: functions/quest.js checks this number (HOLLOW there)
HALLS.push({k: 'hollow', name: 'The Hidden Temple', step: 'grass', door: [-999, -999], spawn: [200, 500, 'back'], out: true, spots: [], hint: ' ', back: [280, 436]});
const THRONE = 100 + HALLS.length;   // 109
HALLS.push({k: 'throne', name: 'The Throne Hall', step: 'stone', door: [110, 534], spawn: [110, 516, 'back'], spots: [], exit: HOLLOW, hint: '\u00a0'});
const HOL = HALLS[HOLLOW - 100], THR = HALLS[THRONE - 100];
STACK.q_temple = {s: 120, n: 114, squash: .55, px: 1};   // assets/quest/temple.json. px: 1 = at the world's own pixel size, like the Godfather
STACK.q_tdoor = {s: 16, n: 42, squash: .55, px: 1};      // rows: the left leaf, the right leaf; then the same two awake
STACK.q_altar = {s: 48, n: 19, squash: .55, px: 1};      // rows: 0 empty, 1..4 that many stones set, 5 blazing

const S_ROCK = {x: 598, y: 262};                 // the boulders' top left on the South's map (120 x 87): just above the race road
const rockDoor = () => [S_ROCK.x + 60, S_ROCK.y + 91];
const T_AT = {x: 138, y: -1, foot: 178};         // the temple's baked picture: its top left in the hollow, and the row its steps end on
const A_AT = {x: 174, y: 186, foot: 228};        // the altar's
const SOCK = [-14, -5, 4, 13], STONES4 = ['moon', 'fang', 'hearth', 'ember'];   // the sockets, from the altar's middle: the mural's order, left to right
const sockAt = i => [A_AT.x + 26 + SOCK[i], A_AT.y + 16];
const T_DOORWAY = [200, 187], T_STAND = [200, 239];   // where you stand to go in | to use the altar
/* THE OPENING, in seconds from the server's yes */
const TT = {stone: .5, gap: .62, blaze: 3.2, line: 4, lineD: 3, awake: 7.2, rumble: 7.6, door: 8.8, doorD: 5.4, beam: 14.9, hold: 3.4, end: 19.6};   // (26 Nov: slower and heavier. The doors take 5.4 s: the grind is timed to them)
const TPL = {set: 0, anim: null, fly: null, pop: [], dust: [], ask: false, b: null, key: '', lines: null, camY: null, dustT: 0, hum: 0};
const tplOpen = () => QUEST.s >= 6 && !TPL.anim;

function templeLoad() {
  const L = (k, src) => load(k, src).catch(() => {});
  return Promise.all([L('stack/q_temple', 'assets/quest/temple.png'), L('stack/q_tdoor', 'assets/quest/tdoor.png'), L('stack/q_altar', 'assets/quest/altar.png'),
    L('hall/hollow', 'assets/quest/hollow.png'), L('hwalk', 'assets/quest/hollow-walk.png'), L('hall/throne', 'assets/interiors/throne.png'), L('s/rocks', 'assets/south/rocks.png'), ...['dais', 'throne', 'pillar', 'stand', 'crys'].map(k => L('stack/q_h' + k, `assets/quest/h${k}.png`)),
    ...['front', 'right', 'back', 'left'].map(d => L('king/' + d, `assets/final/king/${d}.png`))]).then(templeMasks);
}
function templeMasks() {
  const g = IMG.hwalk; if (g) { IMG['hallw/hollow'] = maskCanvas(g.width, g.height, null, [[142, 132, 258, 176], [168, 176, 232, 181], [178, 211, 222, 230]], g); HOL.g = null; }   // the temple, its steps, the altar
  hallMask(); tsLoad();
}

/* ---------- the South end: the boulders by the race road ---------- */
function rocksMask() { const c = IMG['hallw/south']; if (!c || c.trk) return; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(S_ROCK.x + 6, S_ROCK.y + 34, 108, 52); c.trk = 1; SH.g = null; }   // solid, on whatever mask the South has built
{ const so = southObjs; southObjs = function (m, dt) { const out = so(m, dt), r = IMG['s/rocks']; rocksMask(); if (r) out.push({img: r, x: S_ROCK.x, y: S_ROCK.y, base: S_ROCK.y + r.height - 2, prof: true}); return out; }; }
{ const fr = SH.from; SH.from = was => was === HOLLOW ? [rockDoor()[0], rockDoor()[1] + 3, 'front'] : fr(was); }
{ const j = SH.joy; SH.joy = (m, J) => { if (QUEST.s >= 5 && J.y < -.5 && nearDoor(m, rockDoor(), 8)) { wlDoor(HOLLOW); return true; } return j(m, J); }; }   // pushed up into the cleft: only with all four stones
{ const tp = SH.tap; SH.tap = (e, m, x, y) => { if (QUEST.s >= 5 && !m.seat && x > S_ROCK.x + 34 && x < S_ROCK.x + 86 && y > S_ROCK.y + 20 && y < S_ROCK.y + 96) { const d = rockDoor(); wlGo(m, d[0], d[1], () => wlDoor(HOLLOW)); return true; } return tp(e, m, x, y); }; }

/* ---------- the baked pictures ---------- */
function tplBake() {   // once: the temple asleep and awake, where its doorway is (found by the doorway's own colour, tools/make_temple.py VOID), the four door leaves without their navy line
  if (TPL.b) return TPL.b; const f = [stackFrame('q_temple', 0, 0), stackFrame('q_temple', 1, 0)]; if (!f[0] || !f[1]) return null;
  const W = f[0].width, H = f[0].height, d = f[0].getContext('2d').getImageData(0, 0, W, H).data; let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i] === 8 && d[i + 1] === 10 && d[i + 2] === 34 && d[i + 3] === 255) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return null;
  const leaf = r => { const c = stackFrame('q_tdoor', r, 0), w = c.width, h = c.height, p = c.getContext('2d').getImageData(0, 0, w, h).data; let a = w, b = -1, t = h, u = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p[(y * w + x) * 4 + 3]) { if (x < a) a = x; if (x > b) b = x; if (y < t) t = y; if (y > u) u = y; }
    const o = mk(b - a - 1, u - t - 1); o.getContext('2d').drawImage(c, a + 1, t + 1, b - a - 1, u - t - 1, 0, 0, b - a - 1, u - t - 1); return o; };
  return TPL.b = {f, door: {x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1}, leaf: [0, 1, 2, 3].map(leaf), cv: mk(W, H)};
}
function tplImg(row, slide) {   // the temple as it stands now: redrawn only when its row or its doors move a whole pixel
  const B = tplBake(); if (!B) return null; const key = row + '|' + slide; if (TPL.key === key) return B.cv; TPL.key = key;
  const x = B.cv.getContext('2d'), D = B.door, mid = D.x + (D.w >> 1), lw = B.leaf[0].width; x.clearRect(0, 0, B.cv.width, B.cv.height); x.drawImage(B.f[row], 0, 0);
  x.save(); x.beginPath(); x.rect(D.x, D.y, D.w, D.h); x.clip();   // the leaves slide into the wall: nothing of them shows outside the doorway
  if (slide > 0) { x.fillStyle = '#6ec8ff'; x.fillRect(mid - slide, D.y, slide * 2, D.h); if (slide > 1) { x.fillStyle = '#e8fbff'; x.fillRect(mid - slide + 1, D.y, slide * 2 - 2, D.h); } }   // the light inside, solid
  for (const r of [0, 1]) { const im = B.leaf[r + row * 2]; x.drawImage(im, r ? mid + slide : mid - lw - slide, D.y + D.h - im.height); }
  x.restore(); return B.cv;
}
const tplSlide = () => { const A = TPL.anim, B = TPL.b, full = B ? B.door.w >> 1 : 14; return tplOpen() ? full : A ? Math.round(clamp((A.t - TT.door) / TT.doorD, 0, 1) * full) : 0; };
const tplRow = () => tplOpen() || (TPL.anim && TPL.anim.t >= TT.awake) ? 1 : 0;
const altarRow = () => tplOpen() ? 5 : TPL.anim ? (TPL.anim.t >= TT.blaze ? 5 : 4) : TPL.set;

/* ---------- the light that runs from the altar to the doors: three lines of solid pixels, 2 wide ---------- */
function tplLines() {
  if (TPL.lines) return TPL.lines; const walk = P => { const o = []; for (let i = 1; i < P.length; i++) { let [x, y] = P[i - 1]; const [bx, by] = P[i]; while (x !== bx || y !== by) { o.push([x, y]); x += Math.sign(bx - x); y += Math.sign(by - y); } } o.push(P[P.length - 1]); return o; };
  const A = [[177, 221], [166, 221], [166, 189], [183, 189], [183, 104], [198, 104]];   // out of the altar's side, round to the steps, up the door's jamb, across its lintel
  return TPL.lines = [walk(A), walk(A.map(([x, y]) => [398 - x, y])), walk([[199, 196], [199, 152]])];
}
function tplLineDraw(onTemple, t) {   // the ground's part is drawn under everyone, the temple's part straight after the temple
  const A = TPL.anim, open = tplOpen(); if (!open && !(A && A.t > TT.line)) return; const L = tplLines(), n = open ? 1e9 : (A.t - TT.line) / TT.lineD * L[0].length, q = Math.floor(t / 260) % 2;
  for (const P of L) { const m = Math.min(P.length, Math.floor(n));
    for (let i = 0; i < m; i++) { const [x, y] = P[i]; if ((y < T_AT.foot) !== onTemple) continue; lx.fillStyle = !open && i > n - 5 ? '#ffffff' : (i + q * 3) % 6 < 3 ? '#6ee2ff' : '#b8f2ff'; lx.fillRect(X(x), Y(y), 2, 2); } }
}
function tplBeam(onTemple, t) {   // out of the open doors, down the steps and away over the ground: three solid bands
  const A = TPL.anim; if (!A || A.t < TT.beam) return; const e = A.t - TT.beam, out = clamp(e / .45, 0, 1), fade = clamp((e - TT.hold) / 1, 0, 1), q = Math.floor(t / 110) % 2;
  const y0 = 152, y1 = y0 + Math.round(out * 420), band = (col, hw0, grow) => { const cut = Math.round(fade * (hw0 + 8)); lx.fillStyle = col;
    for (let y = y0; y <= y1; y++) { if ((y < T_AT.foot) !== onTemple) continue; const hw = hw0 + Math.round(Math.max(0, y - T_AT.foot) * grow) + (y > T_AT.foot ? q : 0) - cut; if (hw > 0) lx.fillRect(X(200) - hw, Y(y), hw * 2, 1); } };
  band('#3f86e0', 14, .2); band('#8fd6ff', 10, .15); band('#e8fbff', 5, .09);
}
function tplSky(t) {   // and one straight up out of the crystal on the roof
  const A = TPL.anim; if (!A || A.t < TT.beam) return; const e = A.t - TT.beam, fade = clamp((e - TT.hold) / 1, 0, 1), q = Math.floor(t / 110) % 2, top = T_AT.y + 38, h = Math.round(clamp(e / .3, 0, 1) * 60);
  for (const [col, hw] of [['#3f86e0', 4], ['#8fd6ff', 3], ['#e8fbff', 1]]) { const w = hw + q - Math.round(fade * 6); if (w > 0) { lx.fillStyle = col; lx.fillRect(X(200) - w, Y(top - h), w * 2, h); } }
}

/* ---------- the altar: setting the stones ---------- */
function ksChip(x, y, i, lit) {   // a stone on its way to its socket, or hopping back out: a little grey block with its shape's light on it
  lx.fillStyle = '#01032e'; lx.fillRect(x - 4, y - 4, 9, 9); lx.fillStyle = '#96a0be'; lx.fillRect(x - 3, y - 3, 7, 7); lx.fillStyle = '#c4cce0'; lx.fillRect(x - 3, y - 3, 7, 1);
  lx.fillStyle = lit ? '#e8fbff' : '#6ee2ff'; if (i === 0) { lx.fillRect(x - 1, y - 2, 3, 5); lx.fillRect(x - 2, y - 1, 5, 3); } else if (i === 1) { lx.fillRect(x, y - 2, 1, 1); lx.fillRect(x - 1, y - 1, 3, 2); lx.fillRect(x - 2, y + 1, 5, 2); } else if (i === 2) lx.fillRect(x - 2, y - 2, 5, 5); else { lx.fillRect(x, y - 2, 1, 5); lx.fillRect(x - 1, y - 1, 3, 3); lx.fillRect(x - 2, y, 5, 1); }
}
function ksOpen() {   // the stones you still hold, as pictures: tap one to set it
  const m = WL.me; if (!m || m.loc !== HOLLOW || QUEST.s !== 5 || TPL.anim || TPL.ask || TPL.fly || TPL.pop.length) return;
  const row = $('#ksRow'); row.innerHTML = '';
  STONES4.forEach((k, i) => { if (i < TPL.set) return; const im = ksImg(k); if (!im) return; const c = mk(im.width * 2, im.height * 2), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, c.width, c.height);
    const b = document.createElement('button'); b.className = 'ksB'; b.appendChild(c); b.onclick = () => ksPlace(i); row.appendChild(b); });
  document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); $('#ksModal').classList.add('on'); sfx('click');
}
function ksPlace(i) { const m = WL.me; $('#ksModal').classList.remove('on'); if (!m || TPL.fly || TPL.anim || TPL.ask) return; m.dir = 'back'; TPL.fly = {i, t: 0, x0: m.x, y0: m.y - 22}; TSN.i = i; sfx('kslide'); }   // stone sliding on stone, a clunk as it seats (or does not: the wrong one hops straight back out)
function ksPopAll(extra) {   // wrong: it will not sit, and it shakes every other stone loose
  const out = [...Array(TPL.set).keys()]; if (extra != null) out.push(extra); TPL.set = 0; sfx('thud'); sfx('kfizz');
  for (const i of out) { const [x, y] = sockAt(i); TPL.pop.push({i, x, y, h: 0, vx: (i - 1.5) * 9 + (Math.random() * 10 - 5), vy: 34 + Math.random() * 10, vh: 95 + Math.random() * 25, t: 0, hit: 0}); }
}
function ksLand(i) {
  if (i !== TPL.set) { ksPopAll(i); return; }
  TPL.set++; const [x, y] = sockAt(i); for (let k = 0; k < 6; k++) KEYS.fx.push({x: x + Math.random() * 6 - 3, y: y - 1, vx: Math.random() * 24 - 12, vy: -14 - Math.random() * 18, g: 60, t: 0, l: .4, c: '#e8fbff', d: '#6ee2ff'});
  if (TPL.set < 4) return; TPL.ask = true;   // all four, in the mural's order: the server opens it (and remembers), or it does not open
  qop('qopen', {at: HOLLOW}).then(r => { TPL.ask = false; if (r && r.s >= 6) { TPL.anim = {t: 0, k: {}}; WL.sel = null; wlMenu(); } else ksPopAll(); }, e => { TPL.ask = false; ksPopAll(); wlSay(e.message, 'bad'); });
}
function ksTick(dt, m) {
  const F = TPL.fly; if (F) { F.t += dt; if (F.t >= .42) { TPL.fly = null; ksLand(F.i); } }
  for (let n = TPL.pop.length - 1; n >= 0; n--) { const p = TPL.pop[n]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt; p.vh -= 330 * dt;
    if (p.h <= -19 && p.vh < 0) { if (p.hit) { TPL.pop.splice(n, 1); continue; } p.hit = 1; p.h = -19; p.vh = 46; p.vx *= .5; p.vy *= .4; sfx('step_stone'); puffAt(p.x, p.y + 20, 4); } }   // off the altar's top (19 high), one small bounce on the ground, and it is back in your pocket
}
function ksDraw(t) {   // called straight after the altar is drawn
  const A = TPL.anim; if (A && A.t < TT.blaze) for (let i = 0; i < 4; i++) { const e = A.t - TT.stone - i * TT.gap; if (e < 0) continue; const [x, y] = sockAt(i), q = e < .16 ? 3 : 1;   // the four light one by one: a hard white flash, then they stay lit
    lx.fillStyle = e < .16 ? '#ffffff' : '#b8f2ff'; lx.fillRect(X(x) - q, Y(y) - 1, q * 2 + 1, 2); if (e < .16) { lx.fillRect(X(x), Y(y) - 5, 1, 9); lx.fillRect(X(x) - 5, Y(y), 11, 1); } }
  if (A && A.t >= TT.blaze && A.t < TT.blaze + .5) { const e = (A.t - TT.blaze) / .5, rx = Math.round(10 + e * 34), ry = Math.round(rx * .55); lx.fillStyle = e < .5 ? '#ffffff' : '#8fd6ff';   // the blaze: one hard ring of pixels thrown out along the ground
    for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283; lx.fillRect(X(200 + Math.cos(a) * rx), Y(A_AT.foot - 9 + Math.sin(a) * ry), 2, 1); } }
  const F = TPL.fly; if (F) { const k = F.t / .42, [sx, sy] = sockAt(F.i); ksChip(Math.round(lerp(X(F.x0), X(sx), k)), Math.round(lerp(Y(F.y0), Y(sy), k) - Math.sin(k * Math.PI) * 16), F.i, false); }
  for (const p of TPL.pop) ksChip(X(p.x), Y(p.y) - Math.round(p.h), p.i, false);
}

/* ---------- THE OPENING ---------- */
function tplTick(dt, t, m) {
  ksTick(dt, m); const A = TPL.anim;
  for (let i = TPL.dust.length - 1; i >= 0; i--) { const p = TPL.dust[i]; p.t += dt; p.vy += 190 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y >= p.fl) { if (p.b) { p.b = 0; p.y = p.fl; p.vy *= -.3; p.vx *= .5; } else TPL.dust.splice(i, 1); } }
  if (!A) return; A.t += dt; m.path = []; m.todo = null; m.walk = false; m.dir = 'back';   // you stand and watch
  const once = (k, at, fn) => { if (A.t >= at && !A.k[k]) { A.k[k] = 1; fn(); } };
  for (let i = 0; i < 4; i++) once('s' + i, TT.stone + i * TT.gap, () => { TSN.i = i; sfx('tstone'); });
  once('blaze', TT.blaze, () => sfx('tblaze')); once('line', TT.line, () => { TSN.dur = TT.rumble - TT.line; sfx('tbuild'); }); once('awake', TT.awake, () => sfx('tawake'));   // the rumble builds under the running light
  once('rumble', TT.rumble, () => { sfx('tquake'); try { navigator.vibrate && navigator.vibrate([120, 60, 240]); } catch (e) {} }); once('door', TT.door, () => { TSN.dur = TT.doorD; sfx('tdoors'); }); once('settle', TT.door + TT.doorD, () => { puffAt(186, 152, 10); puffAt(214, 152, 10); try { navigator.vibrate && navigator.vibrate(160); } catch (e) {} }); once('beam', TT.beam, () => { sfx('tbeam'); puffAt(200, 176, 18); });
  if (A.t > TT.rumble && A.t < TT.beam + .6) {
    TPL.dustT -= dt; while (TPL.dustT <= 0) { TPL.dustT += A.t < TT.door ? .035 : .06;   // dust and grit off the lintel and the door's head, solid specks; a few bigger bits that bounce
      const door = Math.random() < .35, big = Math.random() < .18; TPL.dust.push({x: door ? 186 + Math.random() * 28 : 148 + Math.random() * 104, y: door ? 108 : 99 + Math.random() * 3, vx: Math.random() * 14 - 7, vy: 10 + Math.random() * 30, fl: door ? 152 + Math.random() * 22 : (Math.random() < .5 ? 152 : 178) + Math.random() * 4, t: 0, b: big ? 1 : 0, s: big ? 2 : 1, c: ['#cfe0f4', '#9fb4d6', '#6a7fae'][Math.floor(Math.random() * 3)]}); } }
  if (A.t >= TT.end) { TPL.anim = null; TPL.set = 0; }
}
const tplShake = () => { const A = TPL.anim; if (!A || A.t < TT.line) return 0; const t = A.t, ds = TT.door + TT.doorD;   // builds under the light, a jolt as the doors break free, a steady grind, a jolt as they settle, the beam's blast dying away
  return t < TT.rumble ? (t - TT.line) / (TT.rumble - TT.line) * 1.4 : t < TT.door ? 2.6 : t < TT.door + .35 ? 4.5 : t < ds ? 1.5 : t < ds + .4 ? 5 : t < TT.beam ? .6 : t < TT.beam + 1.6 ? 4 * (1 - (t - TT.beam) / 1.6) : 0; };
/* ---------- SOUND (26 Nov, his asks: "grand and epic"; stone doors grinding, a stone sliding home, a shine from the doors, a choir hum in the hall) ----------
   Made here with Web Audio like every sound in the game, through the game's own switch (sfx() and SND.on) and its own output (SND.out).
   A REAL CLIP WINS when there is one: name it in TSN.clips and put assets/sfx/quest/<name>.ogg there (doors, keystone, shimmer, hum, whoosh);
   it is loaded once and played in place of the synthesis, which stays as the fallback. (None yet: PixelLab would not make them on his plan.)
   Everything big goes through one generated reverb (a ConvolverNode, 3.6 s of decaying noise): the sound of a lot of stone. */
const TSN = {verb: null, imp: null, buf: {}, clips: [], i: 0, dur: 5};
function tsImpulse() { const c = SND.ctx; if (TSN.imp) return TSN.imp; const len = Math.floor(c.sampleRate * 3.6), b = c.createBuffer(2, len, c.sampleRate), at = c.sampleRate * .012;
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const k = i / len; lp += (Math.random() * 2 - 1 - lp) * (.55 - .4 * k); d[i] = lp * Math.pow(1 - k, 2.4) * (i < at ? i / at : 1); } }   // darker as it dies away
  return TSN.imp = b; }
function tsVerb() { const c = SND.ctx; if (TSN.verb) return TSN.verb; const cv = c.createConvolver(), g = c.createGain(); cv.buffer = tsImpulse(); g.gain.value = .6; cv.connect(g); g.connect(SND.out); return TSN.verb = cv; }
function tsOut(node, wet) { node.connect(SND.out); if (wet) { const s = SND.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(tsVerb()); } }
function tTone(f, dur, o = {}) { const c = SND.ctx, t = c.currentTime + (o.at || 0), os = c.createOscillator(), g = c.createGain(), v = o.vol ?? .1; os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.att ?? .006)); if (o.hold) g.gain.setValueAtTime(v, t + o.hold); g.gain.exponentialRampToValueAtTime(.0001, t + dur); os.connect(g); tsOut(g, o.wet); os.start(t); os.stop(t + dur + .05); }
function tNoise(dur, o = {}) {   // filtered noise with a drawn loudness: env = [[seconds, level 0..1], ...]; trem = a rough flutter (grit), in Hz
  const c = SND.ctx, t = c.currentTime + (o.at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), v = o.vol ?? .1; s.buffer = SND.nb; s.loop = true; f.type = o.type || 'lowpass'; f.Q.value = o.q || .7;
  f.frequency.setValueAtTime(o.f || 300, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur); g.gain.setValueAtTime(.0001, t); for (const [et, ev] of o.env || [[.01, 1], [dur, 0]]) g.gain.linearRampToValueAtTime(Math.max(.0001, v * ev), t + et);
  s.connect(f); let last = f; if (o.trem) { const tg = c.createGain(), l = c.createOscillator(), lg = c.createGain(), d = o.tremD ?? .5; l.type = 'sawtooth'; l.frequency.value = o.trem; lg.gain.value = d; tg.gain.value = 1 - d; l.connect(lg); lg.connect(tg.gain); f.connect(tg); last = tg; l.start(t); l.stop(t + dur + .1); }
  last.connect(g); tsOut(g, o.wet); s.start(t, Math.random() * .5); s.stop(t + dur + .1); }
function tsClip(name, o = {}) { const b = TSN.buf[name], c = SND.ctx; if (!b || !c) return false; const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = o.rate || 1; g.gain.value = o.vol ?? .8; s.connect(g); tsOut(g, o.wet); s.start(c.currentTime + (o.at || 0)); return true; }
function tsLoad() { for (const k of TSN.clips) fetch(`assets/sfx/quest/${k}.ogg?v=${BUILD}`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => { const c = SND.on && sndCtx(); return c ? c.decodeAudioData(a) : null; }).then(b => { if (b) TSN.buf[k] = b; }).catch(() => {}); }
const KS_PITCH = [1, .9, 1.08, .82];   // each stone its own weight: Moon, Fang, Hearth, Ember
/* a keystone going home: a short gritty slide of stone on stone, then a solid clunk as it seats (timed to land with the stone: it flies for .42 s) */
SFX.kslide = () => { const p = KS_PITCH[TSN.i] || 1; if (tsClip('keystone', {rate: p, at: .1, wet: .25})) return;
  tNoise(.3, {type: 'bandpass', f: 1500 * p, f1: 620 * p, q: 1.6, vol: .2, at: .12, trem: 46 * p, tremD: .7, env: [[.03, .7], [.2, 1], [.3, 0]], wet: .2}); tNoise(.3, {type: 'highpass', f: 3600, vol: .035, at: .12, trem: 31, tremD: .8, env: [[.04, 1], [.3, 0]]});
  tTone(118 * p, .3, {type: 'triangle', vol: .42, to: 62 * p, at: .41, wet: .35}); tTone(236 * p, .09, {type: 'square', vol: .06, to: 150 * p, at: .41}); tNoise(.14, {f: 900 * p, vol: .22, at: .41, env: [[.005, 1], [.14, 0]], wet: .3}); };
/* the four stones lighting: a struck stone bell each, climbing, in the reverb */
SFX.tstone = () => { const f = [293.66, 349.23, 440, 587.33][TSN.i] || 440; for (const [m, v, d] of [[1, .16, 1.9], [2.01, .07, 1.3], [3.02, .035, .9], [.5, .1, 1.4]]) tTone(f * m, d, {vol: v, wet: .7}); tNoise(.08, {type: 'bandpass', f: f * 4, q: 3, vol: .06, wet: .6}); };
SFX.tblaze = () => { tTone(46, 1.8, {type: 'sine', vol: .5, to: 30, wet: .3}); tNoise(1.2, {f: 220, vol: .25, env: [[.01, 1], [1.2, 0]], wet: .5}); for (const [f, a] of [[146.83, 0], [220, .05], [293.66, .1], [440, .15], [587.33, .2], [880, .26]]) tTone(f, 2.6, {type: 'triangle', vol: .075, at: a, wet: .8}); };
/* under the running light: a rumble that builds, and a thin rising shine */
SFX.tbuild = () => { const d = TSN.dur; tNoise(d, {f: 70, f1: 240, vol: .5, env: [[d * .15, .12], [d * .7, .55], [d, 1], [d + .5, .3]], wet: .3}); tTone(34, d + .4, {type: 'sine', vol: .34, to: 44, att: d * .8});
  tTone(440, d, {type: 'sine', vol: .04, to: 1760, att: d * .6, wet: .7}); tTone(220, d, {type: 'triangle', vol: .035, to: 880, att: d * .6, wet: .7}); };
SFX.tawake = () => { for (const [f, a] of [[293.66, 0], [440, .07], [587.33, .14], [880, .21], [1174.7, .28]]) tTone(f, 2.2, {type: 'sine', vol: .08, at: a, wet: .9}); tTone(58, 1.2, {type: 'sine', vol: .35, to: 40}); };
SFX.tquake = () => { tNoise(1.3, {f: 110, vol: .6, env: [[.02, 1], [.5, .5], [1.3, .25]], wet: .4, trem: 11, tremD: .35}); tTone(40, 1.2, {type: 'sine', vol: .5, to: 27}); };
/* THE STONE DOORS: a deep sub thump as they break free, a long low grind of stone rolling on stone with grit crumbling off it, a heavy thud as they settle. TSN.dur = the slide */
SFX.tdoors = () => { const d = TSN.dur; if (tsClip('doors', {rate: TSN.buf.doors ? TSN.buf.doors.duration / (d + .6) : 1, vol: .9, wet: .3})) return;
  tTone(52, .9, {type: 'sine', vol: .7, to: 26, wet: .3}); tNoise(.5, {f: 160, vol: .55, env: [[.01, 1], [.5, 0]], wet: .4});                                                              // breaking free
  tNoise(d, {f: 150, f1: 115, vol: .62, at: .15, trem: 8.5, tremD: .42, env: [[.3, .8], [d * .5, 1], [d - .3, .85], [d, .1]], wet: .35});                                                // the weight of it
  tNoise(d, {type: 'bandpass', f: 380, f1: 300, q: 1.1, vol: .3, at: .15, trem: 17, tremD: .65, env: [[.4, .7], [d - .4, 1], [d, 0]], wet: .3});                                         // the grind
  tNoise(d, {type: 'bandpass', f: 1250, q: 2.2, vol: .075, at: .15, trem: 29, tremD: .85, env: [[.4, 1], [d - .2, .8], [d, 0]], wet: .2});                                                // stone teeth
  tTone(31, d, {type: 'sine', vol: .32, at: .15, att: .5, hold: d - .5});
  for (let i = 0; i < 46; i++) { const at = .3 + Math.random() * (d + .4); tNoise(.03 + Math.random() * .07, {type: 'highpass', f: 2200 + Math.random() * 3800, vol: .03 + Math.random() * .06, at, env: [[.003, 1], [.08, 0]], wet: .25}); }   // grit crumbling off the lintel
  tTone(64, 1.5, {type: 'sine', vol: .85, to: 24, at: d + .12, wet: .5}); tNoise(.9, {f: 240, f1: 80, vol: .7, at: d + .12, env: [[.008, 1], [.9, 0]], wet: .6}); tNoise(.12, {type: 'bandpass', f: 700, vol: .2, at: d + .12, env: [[.004, 1], [.12, 0]]}); };   // settled
SFX.tbeam = () => { tTone(82, 3.4, {type: 'sine', vol: .6, to: 36, wet: .4}); tNoise(2.8, {type: 'highpass', f: 1800, f1: 5200, vol: .12, env: [[.05, 1], [1, .5], [2.8, 0]], wet: .7}); tNoise(1.6, {f: 300, vol: .4, env: [[.01, 1], [1.6, 0]], wet: .5});
  for (const [f, a, v] of [[73.42, 0, .14], [146.83, 0, .12], [220, .04, .1], [293.66, .08, .1], [440, .12, .09], [587.33, .16, .08], [880, .2, .06], [1174.7, .26, .05], [1760, .34, .03]]) { tTone(f, 4.4, {type: 'triangle', vol: v, at: a, att: .05, hold: 1.6, wet: .9}); tTone(f * 1.006, 4.4, {type: 'sine', vol: v * .6, at: a, att: .05, hold: 1.6, wet: .9}); } };
SFX.king = () => { tone(196, .09, {type: 'triangle', vol: .09, to: 175}); tone(262, .12, {type: 'sine', vol: .06, to: 233, at: .08}); };
SFX.hwhoosh = () => { if (tsClip('whoosh', {vol: .7, wet: .5, rate: .9 + Math.random() * .2})) return; tNoise(.7, {type: 'bandpass', f: 260, f1: 1900, q: .9, vol: .34, env: [[.12, 1], [.3, .5], [.7, 0]], wet: .6}); tTone(70, .5, {type: 'sine', vol: .3, to: 150, wet: .4}); tNoise(.5, {type: 'highpass', f: 3000, vol: .05, at: .12, trem: 23, tremD: .8, env: [[.02, 1], [.5, 0]], wet: .5}); };
SFX.hflare = () => { tNoise(2.2, {type: 'bandpass', f: 500, f1: 2600, q: .8, vol: .3, env: [[.3, 1], [1.2, .6], [2.2, 0]], wet: .7}); tTone(55, 2, {type: 'sine', vol: .4, to: 38, wet: .4}); };
SFX.hcry2 = () => SFX.hcry(); SFX.hcry = () => { const f = [1174.7, 1318.5, 1568, 1760, 2093, 2349.3][TSN.i % 6]; tTone(f, 1.6, {vol: .07, wet: .9}); tTone(f * 2.01, 1, {vol: .03, wet: .9}); };
SFX.hcrown = () => { tTone(49, 2.6, {type: 'sine', vol: .5, to: 32, wet: .4}); for (const [f, a] of [[293.66, 0], [369.99, .06], [440, .12], [587.33, .18], [739.99, .24], [880, .3], [1174.7, .38], [1760, .5]]) tTone(f, 3.6, {type: 'triangle', vol: .08, at: a, att: .04, hold: 1, wet: 1}); tNoise(1.6, {type: 'highpass', f: 5000, vol: .06, env: [[.05, 1], [1.6, 0]], wet: .8}); };

/* THE TWO AMBIENCES, each a small standing patch of oscillators that is built when wanted and faded out and thrown away when not (checked five
   times a second, so they also stop when the game leaves the walking scene or the sound is switched off).
     the SHINE from the temple's open doors, in the hollow: high glassy partials beating slowly against each other, a breath of bright noise, and
       single sparkles; louder the nearer the doors, nothing from far off. ONLY ONCE THE TEMPLE IS OPEN (it comes in with the beam).
     the HUM of the throne hall: five low voices (saw pairs through "oo" formants, a slow vibrato, each swelling in its own time) into the reverb
       and a feedback echo: a choir with its mouth shut in a huge stone room. Under the entrance and the King's talk; fades when you leave. */
const AMB = {sh: null, hum: null};
function ambEnd(o, tc) { const c = SND.ctx; if (!o || !c) return; try { o.g.gain.cancelScheduledValues(c.currentTime); o.g.gain.setTargetAtTime(0, c.currentTime, tc); } catch (e) {} setTimeout(() => { for (const n of o.src) { try { n.stop(); } catch (e) {} } try { o.g.disconnect(); } catch (e) {} }, tc * 6000 + 300); }
function shimmerOn() { const c = sndCtx(); if (!c) return null; const g = c.createGain(), src = []; g.gain.value = 0; g.connect(SND.out); const wet = c.createGain(); wet.gain.value = .8; g.connect(wet); wet.connect(tsVerb());
  if (TSN.buf.shimmer) { const s = c.createBufferSource(); s.buffer = TSN.buf.shimmer; s.loop = true; s.connect(g); s.start(); return {g, src: [s], k: 1}; }
  [[1318.5, .5, .11], [1322.4, .5, .17], [1975.5, .32, .13], [1981, .3, .23], [2637, .2, .19], [3520, .12, .29], [3531, .1, .07]].forEach(([f, v, lf]) => { const o = c.createOscillator(), a = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.frequency.value = f; a.gain.value = v * .5; l.frequency.value = lf; lg.gain.value = v * .5; l.connect(lg); lg.connect(a.gain); o.connect(a); a.connect(g); o.start(); l.start(); src.push(o, l); });
  const n = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain(), l = c.createOscillator(), lg = c.createGain(); n.buffer = SND.nb; n.loop = true; f.type = 'bandpass'; f.frequency.value = 7200; f.Q.value = 3; a.gain.value = .25; l.frequency.value = .37; lg.gain.value = .2; l.connect(lg); lg.connect(a.gain); n.connect(f); f.connect(a); a.connect(g); n.start(); l.start(); src.push(n, l);
  return {g, src, k: .22}; }
function humOn() { const c = sndCtx(); if (!c) return null; const g = c.createGain(), src = [], mix = c.createGain(), cv = c.createConvolver(), wet = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), dry = c.createGain(); g.gain.value = 0; g.connect(SND.out);
  cv.buffer = tsImpulse(); wet.gain.value = 1.3; dry.gain.value = .3; dl.delayTime.value = .41; fb.gain.value = .42; mix.connect(dry); dry.connect(g); mix.connect(cv); cv.connect(wet); wet.connect(g); mix.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(cv);
  if (TSN.buf.hum) { const s = c.createBufferSource(); s.buffer = TSN.buf.hum; s.loop = true; s.connect(mix); s.start(); return {g, src: [s], k: 1}; }
  const form = [[330, 1, 3], [680, .5, 4], [2500, .09, 6]].map(([f, v, q]) => { const b = c.createBiquadFilter(), a = c.createGain(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; a.gain.value = v; b.connect(a); a.connect(mix); return b; });
  [[73.42, .9, .061], [110, .8, .083], [146.83, .7, .047], [220, .45, .071], [293.66, .22, .053]].forEach(([f, v, sw], i) => { const a = c.createGain(), l = c.createOscillator(), lg = c.createGain(), vb = c.createOscillator(), vg = c.createGain(); a.gain.value = v * .55; l.frequency.value = sw; lg.gain.value = v * .45; l.connect(lg); lg.connect(a.gain); vb.frequency.value = 4.3 + i * .37; vg.gain.value = f * .004; l.start(); vb.start(); src.push(l, vb);
    for (const dt of [-5, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; vb.connect(vg); vg.connect(o.frequency); o.connect(a); o.start(); src.push(o); } for (const b of form) a.connect(b); });
  return {g, src, k: .5}; }
setInterval(() => {
  const m = WL.me, c = SND.ctx, on = SND.on && scene === scenes.town && !!m, hall = on && m.loc === THRONE;
  if (hall && !AMB.hum) { AMB.hum = humOn(); if (AMB.hum) AMB.hum.g.gain.setTargetAtTime(AMB.hum.k * .2, SND.ctx.currentTime, 1.2); } else if (!hall && AMB.hum) { ambEnd(AMB.hum, on ? .5 : .08); AMB.hum = null; }
  const A = TPL.anim, lit = on && m.loc === HOLLOW && (A ? A.t > TT.beam : QUEST.s >= 6), lv = lit ? Math.pow(clamp(1 - (Math.hypot(m.x - 200, m.y - 160) - 30) / 250, 0, 1), 1.5) : 0;   // how much of it reaches you
  if (lv > 0 && !AMB.sh) AMB.sh = shimmerOn(); if (!AMB.sh) return;
  if (!lit) { ambEnd(AMB.sh, on ? .3 : .08); AMB.sh = null; return; }
  AMB.sh.g.gain.setTargetAtTime(AMB.sh.k * lv * .22, c.currentTime, .3); if (!TSN.buf.shimmer && lv > .05 && Math.random() < .3) tTone(2300 + Math.random() * 3400, .5, {vol: .02 * lv, wet: .9});   // a sparkle
}, 200);

/* ---------- the hollow ---------- */
function hollowObjs(m, dt, t) {
  const out = [{img: PX1, x: 0, y: 0, base: 0, after: () => { tplBeam(false, t); tplLineDraw(false, t); }}];   // on the ground, under everyone
  const im = tplImg(tplRow(), tplSlide()); if (im) out.push({img: im, x: T_AT.x, y: T_AT.y, base: T_AT.foot, after: () => { tplBeam(true, t); tplLineDraw(true, t); tplSky(t); }});
  const al = stackFrame('q_altar', altarRow(), 0); if (al) out.push({img: al, x: A_AT.x, y: A_AT.y, base: A_AT.foot, after: () => ksDraw(t)});
  return out;
}
HOL.from = was => was === THRONE ? [T_DOORWAY[0], T_DOORWAY[1], 'front'] : null;
HOL.enter = () => { TPL.set = 0; TPL.fly = null; TPL.pop.length = 0; TPL.dust.length = 0; TPL.camY = null; if (TPL.anim) TPL.anim = null; };   // (walked out mid-way: nothing is half set)
HOL.frame = (m, people, dt, t, H, img) => {
  tplTick(dt, t, m); const A = TPL.anim, sh = tplShake(), want = A ? 170 : m.y + (LAND ? 2 : 24) - clamp((340 - m.y) / 90, 0, 1) * (LAND ? 40 : 96);   // near the temple the camera looks up at it (it is as tall as the screen); for the opening it lifts all the way, and comes back
  TPL.camY = TPL.camY == null || (!A && Math.abs(TPL.camY - want) < 1) ? want : TPL.camY + (want - TPL.camY) * Math.min(1, dt * 2.2);
  view(img, m.x + (sh ? Math.round((Math.random() - .5) * sh * 2) : 0), TPL.camY + (sh ? Math.round((Math.random() - .5) * sh * 2) : 0), 190, {hi: true});
  if (WL.sel && WL.sel.loc === m.loc) { const q = Math.floor(t / 200) % 2; lx.strokeStyle = q ? '#ffd25e' : '#fff2a8'; lx.lineWidth = 1; lx.beginPath(); lx.ellipse(X(WL.sel.x) + .5, Y(WL.sel.y) + .5, 9 + q, 3 + q * .5, 0, 0, 7); lx.stroke(); }
  const hits = drawScene(people, null, img, hollowObjs(m, dt, t)); wlFx(dt, m.loc); drawPuffs(dt); wlCases(dt, m.loc);
  for (let i = KEYS.fx.length - 1; i >= 0; i--) { const p = KEYS.fx[i]; p.t += dt; if (p.t > p.l) { KEYS.fx.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; lx.fillStyle = p.t / p.l < .5 ? p.c : p.d; lx.fillRect(X(p.x), Y(p.y), 1, 1); }   // sparks off a stone that sat (keystones.js's own list)
  for (const p of TPL.dust) { lx.fillStyle = p.c; lx.fillRect(X(p.x), Y(p.y), p.s, p.s); }
  const row = altarRow(), open = tplOpen(), wake = tplRow(), sl = tplSlide(), L = [[200, 132, 34, '120,200,255', wake ? .2 : .08, 1], [200, T_AT.y + 42, 14, '150,225,255', wake ? .5 : .14, 2], [200, A_AT.y + 16, 24, KS_GLOW, row === 5 ? .5 : .1 + row * .06, 3]];
  if (sl > 0) L.push([200, 132, 46, '170,225,255', .25 + sl * .03, 4]); if (A && A.t > TT.beam) L.push([200, 200, 90, '150,215,255', .3 * (1 - clamp((A.t - TT.beam - TT.hold) / 1, 0, 1)), 5]);
  lights(L, t); lx.fillStyle = 'rgba(70,120,255,.05)'; lx.fillRect(0, 0, cam.lw, cam.lh); vignette(.5);   // the forest's own cold moon
  return hits;
};
HOL.joy = (m, J) => {
  if (TPL.anim) return true;
  if (J.y > .5 && m.y > 516 && Math.abs(m.x - 200) < 16) wlDoor(SOUTH);                                              // back down the path, out through the cleft
  else if (J.y < -.5 && tplOpen() && Math.abs(m.x - T_DOORWAY[0]) < 16 && m.y < T_DOORWAY[1] + 5) wlDoor(THRONE);    // up the steps, in through the open doors
  return true;
};
HOL.tap = (e, m, x, y) => {
  if (TPL.anim) return true; if (m.seat) { wlUp(m); return true; }
  if (y > 496 && Math.abs(x - 200) < 34) { wlGo(m, 200, 522, () => wlDoor(SOUTH)); return true; }
  if (x > A_AT.x && x < A_AT.x + 52 && y > A_AT.y + 4 && y < A_AT.foot + 4) { wlGo(m, T_STAND[0], T_STAND[1], () => { m.dir = 'back'; ksOpen(); }); return true; }
  if (x > 142 && x < 258 && y > 40 && y < 184) { const open = tplOpen(); wlGo(m, T_DOORWAY[0], T_DOORWAY[1], open ? () => wlDoor(THRONE) : () => { m.dir = 'back'; }); return true; }
  wlGo(m, x, y + 6); holdWalk(e, scenes.town, (x, y) => { const m = WL.me; if (m.loc === HOLLOW && !m.ko && !TPL.anim) wlGo(m, x, y + 6); });
  return true;
};
(() => {   // the picker: a small panel of pictures, no words
  const ref = $('#beerModal'), d = document.createElement('div'); d.className = 'modal'; d.id = 'ksModal'; d.innerHTML = '<div id="ksRow"></div>'; ref.parentNode.insertBefore(d, ref);
  d.onclick = e => { if (e.target === d || e.target.id === 'ksRow') { d.classList.remove('on'); sfx('close'); } };
  const st = document.createElement('style');
  st.textContent = '#ksModal{padding:12px;z-index:10;top:auto;bottom:calc(120px + env(safe-area-inset-bottom));background:#16233f;border:3px solid #6ec8ff;border-radius:6px;box-shadow:inset 0 0 0 3px #1a1430,0 5px 0 #0009}'
    + '#ksRow{display:flex;justify-content:center;gap:10px}.ksB{padding:8px 9px;border:3px solid #1a1430;border-radius:6px;background:#24365e;box-shadow:0 3px 0 #0009;cursor:pointer;line-height:0}.ksB canvas{image-rendering:pixelated;display:block}.ksB:active{transform:scale(.94)}'
    + '#phone.land #ksModal{top:10px;left:0;right:0;margin:0 auto;width:min(360px,60vw)}';
  document.head.appendChild(st);
})();
setInterval(() => { const d = $('#ksModal'); if (d && d.classList.contains('on') && (scene !== scenes.town || !WL.me || WL.me.loc !== HOLLOW)) d.classList.remove('on'); }, 400);

/* ---------- THE THRONE HALL (v4, 26 Nov, his calls: "copy ref-hall-b 1:1", the 3D parts as sprite stacks, longer, CRYSTAL WATER) ----------
   The flat picture (assets/interiors/throne.png, 220 x 537) is the Nano Banana Pro reference itself, cut to the game's pixels, cleaned and
   stretched by two more pairs of pillars (tools/make_temple.py). Everything that stands is a sprite stack, baked once by stackFrame at
   turn 0 like the temple outside, and drawn as a sorted object so you walk behind and in front of it: the stepped DAIS and its stair, the
   THRONE on it, six pairs of PILLARS, the BRAZIER stands (their blue fire is drawn on them), the corner CRYSTALS.
   THE WATER (it was "blue lava"; his call: glowing crystal water) pours out of the two fountains at the top corners and runs down the
   channel along each wall: falling streaks, a churning splash where it lands, bands of ripple moving down the channels, hard little glints.
   All solid pixels over the reference's own water.
   THE ENTRANCE (once a player, kept on this phone: localStorage m2_qhall): black bars, the camera close in and gliding up the hall ahead
   of you as you walk the carpet, the braziers catching a pair at a time, the falls flaring, the crystals lighting, the camera reaching
   the throne, the King's crown flaring; then he speaks. A tap skips it. Until it has played the hall is asleep: cold braziers, dark
   crystals, a dim room. */
STACK.q_hdais = {s: 128, n: 12, squash: .55, px: 1};
STACK.q_hthrone = {s: 40, n: 56, squash: .55, px: 1};   // rows: its crystal asleep, lit
STACK.q_hpillar = {s: 24, n: 46, squash: .55, px: 1};
STACK.q_hstand = {s: 16, n: 14, squash: .55, px: 1};    // rows: cold, burning
STACK.q_hcrys = {s: 24, n: 28, squash: .55, px: 1};     // rows: asleep, lit
const KING = {talk: null, p: null, coolT: 0};
const KING_AT = [110, 77], KING_STAND = [110, 129];
const TH_DAIS = [44, 46], TH_THRONE = [88, 1];                                                                          // where the two baked pictures go (the numbers of make_temple.py's check sheet)
const TH_PILLARS = [165, 223, 296, 368, 440, 509].flatMap(y => [[58, y], [162, y]]);                                    // the foot of each
const TH_STANDS = [440, 368, 296, 227, 165, 122].flatMap(y => [[79, y], [141, y]]);                                     // in the order they catch: from the doors to the throne, a pair at a time
const TH_CRYS = [[23, 520], [197, 520], [20, 76], [200, 76]];                                                           // the corner clusters, in the order they light
const TH_WATER = [[14, 74, 28, 496], [192, 74, 206, 496]], TH_FALLS = [[31, 27, 44, 75], [176, 27, 189, 75]], TH_POOL = [[14, 74, 52, 86], [168, 74, 206, 86]];
/* the entrance, in seconds: the walk and the glide, when each pair of braziers catches (as you reach it), the falls, the crystals, the crown, the end */
const HC = {go: .8, walk: 9.6, cam: 8.8, fire: [1.9, 3.7, 5.4, 7.1, 8.6, 9.7], falls: 10.4, cry: 11.1, cryGap: .22, crown: 12.5, end: 14.1};
const HALL = {cut: null, sparks: [], seen: false, was: 0};
try { HALL.seen = localStorage.getItem('m2_qhall') === '1'; } catch (e) {}
function hallMask() { const th = IMG['hall/throne']; if (!th) return;
  IMG['hallw/throne'] = maskCanvas(th.width, th.height, [[34, 90, 186, 522], [104, 522, 117, 537]],   // the floor between the water's kerbs, the doorway
    [[64, 56, 156, 109], [86, 104, 134, 122], ...TH_PILLARS.map(([x, y]) => [x - 10, y - 11, x + 10, y + 1]), ...TH_STANDS.map(([x, y]) => [x - 4, y - 5, x + 4, y + 1])]); THR.g = null; }   // the dais, its stair, the pillars' feet, the stands'
/* how far the hall has woken: before the entrance nothing; during it, whatever its clock has reached; after it, everything */
const hallT = () => HALL.cut ? HALL.cut.t : HALL.seen ? 1e9 : -1;
const standLit = i => hallT() >= HC.fire[i >> 1], fallsLit = () => hallT() >= HC.falls, crysLit = i => hallT() >= HC.cry + (i >> 1) * HC.cryGap, crownLit = () => hallT() >= HC.crown;

function kingSet() { if (SP.king || !IMG['king/front']) return SP.king; const D = d => makeDir(IMG['king/' + d] || IMG['king/front'], false, []); return SP.king = {front: D('front'), back: D('back'), right: D('right'), left: D('left')}; }   // [] = no blink painted on him, like Pip
/* King Olloran: old, warm, grand but kind. Short lines. */
const KING_LINES = ['So. The old doors remember how to open.', 'Come closer, tall one. Let an old king look at you.', 'I am Olloran, King of the Glimmerkin. I have sat in the dark a very long time.',
  'Little Pip told me everything. The moss. The leg. All four of my stones.', 'You owed us nothing. You helped him anyway.', 'The lights are lit. The old paths are safe again.',
  'You have brought peace to The Forgotten Forest.', 'Thank you, friend of the Glimmerkin.'];
function kingTalk() { const m = WL.me, now = performance.now(); if (KING.talk || HALL.cut || now < KING.coolT || !m || m.loc !== THRONE || QUEST.s < 6) return; m.path = []; m.todo = null; m.walk = false; m.dir = 'back'; KING.talk = {L: KING_LINES, i: 0}; sfx('king'); sayLine(KING_LINES[0]); }
function kingNext() { const T = KING.talk; if (!T) return; if (sayTyping()) { sayFinish(); return; } if (++T.i < T.L.length) { sfx('king'); sayLine(T.L[T.i]); return; } kingHush(); kingDone(); }   // a tap while it types finishes the line; the next tap turns it
function kingHush() { KING.talk = null; KING.coolT = performance.now() + 700; sayOff(); }
/* BATCH 5 STARTS HERE: called once his last line is put away, every time you hear him out. The reward (the spirit stag skin, the temple
   cabin, the plaque) and the op that moves the hunt on to step 7 hang off this; until then it does nothing. */
function kingDone() { if (typeof kingReward === 'function') kingReward(); }
/* BATCH 5, THE REWARD (26 Nov 2026). His last line is put away: the server moves the hunt on to step 7 (op qking, asked from this hall) and, that once, puts the
   three things in your wallet: THE FOREST WARDEN (the spirit stag outfit, rarity Secret), THE TEMPLE CABIN (the Temple room, and with it the temple hut in the
   town) and THE KEYSTONE PLAQUE (a wall decoration). Each gets its own YOU GOT card, one after the other. Heard out again later he gives nothing: the server
   answers got = false, and nothing is shown. */
load('cab/temple-i', 'assets/cabins/temple-i.png').catch(() => {});   // the hut, small, for its card
function kingReward() { if (QUEST.s >= 7 || KING.giving) return; KING.giving = true;
  qop('qking', {at: THRONE}).then(r => { KING.giving = false; if (!r || !r.got) return;
    for (const id of ['stag', 'r_temple']) { OWNED.add(id); if (WALLET.own) WALLET.own[id] = 1; } WALLET.dec = WALLET.dec || {}; if (!WALLET.dec.keystoneplaque) WALLET.dec.keystoneplaque = 1;
    const stag = SP.stag && SP.stag.front && SP.stag.front.frames ? (typeof wardIcon === 'function' ? wardIcon('stag') : SP.stag.front.frames[0][0]) : PX1, hut = IMG['cab/temple-i'] || PX1, plq = IMG['decor/keystoneplaque'] || PX1;
    itemGot('THE FOREST WARDEN', stag, '120,200,255', () => itemGot('THE TEMPLE CABIN', hut, '150,215,255', () => itemGot('THE KEYSTONE PLAQUE', plq, '150,215,255')));
  }, e => { KING.giving = false; wlSay(e.message, 'bad'); }); }
function kingWatch() { const m = WL.me; if (KING.talk && (m.loc !== THRONE || Math.hypot(m.x - KING_AT[0], m.y - KING_AT[1]) > 90)) kingHush(); }   // his words are the night films' subtitles (mine.js sayLine); walking off ends the talk

/* ---------- what moves ---------- */
function flameDraw(cx, cy, t, i, big) {   // blue fire: three solid colours, a new shape every tenth of a second; big = just caught
  const f = Math.floor(t / 110 + i * 3), R = [[3, 4, 4, 3, 3, 2, 2, 1, 1], [4, 4, 3, 3, 2, 2, 1, 1, 0], [3, 4, 4, 4, 3, 2, 1, 1, 1]][f % 3], lean = [0, 1, 0, -1][f % 4], k = big ? 2 : 1;
  for (let r = 0; r < R.length * k; r++) { const hw = R[Math.floor(r / k)] + (big ? 1 : 0); if (!hw) continue; const ox = r > 4 * k ? lean : 0, y = Y(cy) - r, x = X(cx) + ox; lx.fillStyle = '#2f6fe0'; lx.fillRect(x - hw, y, hw * 2 + 1, 1);
    if (hw > 1 && r < 7 * k) { lx.fillStyle = '#6ec8ff'; lx.fillRect(x - hw + 1, y, hw * 2 - 1, 1); } if (hw > 2 && r < 4 * k) { lx.fillStyle = '#e8fbff'; lx.fillRect(x - hw + 2, y, hw * 2 - 3, 1); } }
  const s = (f + i * 5) % 9; if (s < 5) { lx.fillStyle = s < 3 ? '#b8f2ff' : '#6ec8ff'; lx.fillRect(X(cx) + [2, -3, 1, -1, 3][s], Y(cy) - 10 - s * 2, 1, 1); }   // a spark going up
}
function hallWater(t) {   // THE CRYSTAL WATER: solid pixels over the picture's own water
  const flare = fallsLit(), hot = flare && hallT() - HC.falls < 1.8, q = Math.floor(t / 90);
  TH_FALLS.forEach(([x0, y0, x1, y1], c) => { if (hot) { lx.fillStyle = '#9ff0ff'; lx.fillRect(X(x0), Y(y0), x1 - x0, y1 - y0); }                                  // the falls: bright streaks dropping, faster and whiter when they flare
    for (let i = 0; i < 10; i++) { const x = x0 + 1 + (i * 5 + c * 2) % (x1 - x0 - 2), h = 4 + i % 4 * 3, y = y0 + ((t * (flare ? .11 : .07) * (1 + i % 3 * .3) + i * 23) % (y1 - y0 + h)) - h, a = Math.max(y0, y), b = Math.min(y1, y + h); if (b > a) { lx.fillStyle = i % 3 === 0 ? '#ffffff' : flare ? '#d8faff' : '#8fe8ff'; lx.fillRect(X(x), Y(a), i % 4 ? 1 : 2, Math.round(b - a)); } }
    const cx = (x0 + x1) >> 1; for (let i = 0; i < 12; i++) { const a = (i * 2.4 + q * .9 + c), r = 3 + (i + q) % 5; lx.fillStyle = (i + q) % 3 ? '#e8fbff' : '#ffffff'; lx.fillRect(X(cx + Math.round(Math.cos(a) * r * 1.6)), Y(y1 + 2 + Math.round(Math.sin(a) * r * .5)), 1 + i % 2, 1); }   // where it lands: it churns
    for (let k = 0; k < 2; k++) { const r = 4 + ((t * .012 + k * 7) % 14), w = Math.round(r * 1.5); lx.fillStyle = '#bff4ff'; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, px = cx + Math.cos(a) * w, py = y1 + 4 + Math.sin(a) * r * .45; if (py > y1 - 1 && py < y1 + 11 && px > Math.min(x0, TH_POOL[c][0]) && px < TH_POOL[c][2]) lx.fillRect(X(px), Y(py), 1, 1); } } });   // rings running out from it over the pool
  TH_WATER.forEach(([x0, y0, x1, y1], c) => { const w = x1 - x0, off = (t * .022) % 14;                                                                                  // the channels: bands of ripple moving down, each a shallow chevron
    for (let y = y0 + 14 + off; y < y1 - 2; y += 14) { const n = Math.floor((y - off) / 14) + c; lx.fillStyle = n % 3 ? '#7fe6ff' : '#c8f6ff'; for (let x = 1; x < w - 1; x++) { if ((x + n) % 5 === 4) continue; lx.fillRect(X(x0 + x), Y(y + Math.round(Math.abs(x - w / 2) * .35)), 1, 1); } }
    for (let i = 0; i < 9; i++) { const life = (t * .0016 + i * .37 + c * .5) % 1, n = Math.floor(t * .0016 + i * .37 + c * .5), px = x0 + 2 + (n * 7 + i * 5) % (w - 4), py = y0 + 6 + (n * 53 + i * 97) % (y1 - y0 - 12) + life * 9;   // glints, drifting with it
      if (life < .5) { lx.fillStyle = '#ffffff'; lx.fillRect(X(px), Y(py), 1, 1); if (life > .12 && life < .38) { lx.fillRect(X(px) - 1, Y(py), 3, 1); lx.fillRect(X(px), Y(py) - 1, 1, 3); } } } });
}
function hallGround(t) {   // under everyone: the water, and the light on the dais
  hallWater(t);
}
function hallObjs(m, dt, t) {
  const out = [{img: PX1, x: 0, y: 0, base: 0, after: () => hallGround(t)}], F = (k, row) => stackFrame(k, row, 0);
  const D = F('q_hdais', 0); if (D) out.push({img: D, x: TH_DAIS[0], y: TH_DAIS[1], base: 60});                                                      // the dais and its stair: you are always in front of it, or beside it
  const Th = F('q_hthrone', crownLit() ? 1 : 0); if (Th) out.push({img: Th, x: TH_THRONE[0], y: TH_THRONE[1], base: 74});                             // the throne on it; the King sorts just in front of the throne
  TH_PILLARS.forEach(([x, y], i) => { const im = F('q_hpillar', 0); if (!im) return; const o = {img: im, x: x - 14, y: y - 59, base: y};
    const P = HALL.pa || (HALL.pa = []), hid = m.y < y - 3 && m.y > y - 48 && Math.abs(m.x - x) < 13; P[i] = clamp((P[i] ?? 1) + (hid ? -1 : 1) * dt * 4, .4, 1); if (P[i] < 1) o.alpha = P[i]; out.push(o); });   // behind one: it fades, like the town's trees
  TH_STANDS.forEach(([x, y], i) => { const lit = standLit(i), im = F('q_hstand', lit ? 1 : 0); if (!im) return; const young = lit && HALL.cut && HALL.cut.t - HC.fire[i >> 1] < .5;
    out.push({img: im, x: x - 10, y: y - 25, base: y, after: lit ? () => flameDraw(x, y - 17, t, i, young) : null}); });
  TH_CRYS.forEach(([x, y], i) => { const lit = crysLit(i), im = F('q_hcrys', lit ? 1 : 0); if (im) out.push({img: im, x: x - 14, y: y - 41, base: y, after: lit ? () => { const q = Math.floor(t / 180 + i * 3) % 9; if (q < 4) { const px = X(x + [-7, 6, -3, 7][q]), py = Y(y - [26, 14, 34, 22][q]); lx.fillStyle = '#fff'; lx.fillRect(px - 1, py, 3, 1); lx.fillRect(px, py - 1, 1, 3); } } : null}); });
  return out;
}
function crownDraw(h, t) {   // the King's crown flaring: a hard four-point star of pixels that opens and closes over his head, then a steady glint
  const e = hallT() - HC.crown; if (e < 0 || !h) return; const cx = Math.round(h.cx), cy = Math.round(h.top) + 5, r = e < 1.2 ? Math.round(Math.sin(e / 1.2 * Math.PI) * 26) : Math.floor(t / 400) % 2 ? 3 : 2;
  lx.fillStyle = '#8fd6ff'; lx.fillRect(cx - r, cy - 1, r * 2 + 1, 3); lx.fillRect(cx - 1, cy - r, 3, r * 2 + 1); lx.fillStyle = '#ffffff'; lx.fillRect(cx - r + 2, cy, Math.max(1, r * 2 - 3), 1); lx.fillRect(cx, cy - r + 2, 1, Math.max(1, r * 2 - 3));
  if (e < 1.2) { const d = Math.round(r * .5); for (let k = 1; k <= d; k++) for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) lx.fillRect(cx + a * k, cy + b * k, 1, 1); }
}
/* ---------- THE ENTRANCE ---------- */
function hallBars(on) { let a = $('#hbarT'); if (!a) { for (const k of ['T', 'B']) { const d = document.createElement('div'); d.className = 'bar ' + k.toLowerCase(); d.id = 'hbar' + k; d.style.zIndex = 20; $('#townHud').appendChild(d); } a = $('#hbarT'); void a.offsetWidth; }
  a.classList.toggle('on', on); $('#hbarB').classList.toggle('on', on); for (const id of ['#joy', '#mapBtn']) { const e = $(id); if (e) e.style.visibility = on ? 'hidden' : ''; } }   // nothing on the picture but the picture
function hallCutEnd(skip) { const m = WL.me, C = HALL.cut; if (!C) return; HALL.cut = null; HALL.seen = true; try { localStorage.setItem('m2_qhall', '1'); } catch (e) {} hallBars(false);
  const xf = $('#xfade'); xf.classList.add('on'); setTimeout(() => xf.classList.remove('on'), 260);   // the close-up lets go under a blink
  if (m) { m.x = KING_STAND[0]; m.y = KING_STAND[1]; m.dir = 'back'; m.walk = false; m.path = []; m.todo = null; netMove(); } HALL.camY = null; if (!skip) setTimeout(kingTalk, 500); }   // control is yours again, and he speaks (skipped: he waits to be asked)
function hallCutTick(dt, m) {
  const C = HALL.cut; C.t += dt; const once = (k, at, fn) => { if (C.t >= at && !C.k[k]) { C.k[k] = 1; fn(); } }, u = clamp((C.t - HC.go) / HC.walk, 0, 1);
  m.x = KING_STAND[0]; m.y = lerp(516, KING_STAND[1], u); m.dir = 'back'; m.walk = u > 0 && u < 1; m.path = []; m.todo = null;   // you walk up the carpet by yourself
  HC.fire.forEach((at, i) => once('f' + i, at, () => { sfx('hwhoosh'); for (const j of [i * 2, i * 2 + 1]) { const [x, y] = TH_STANDS[j]; for (let k = 0; k < 12; k++) HALL.sparks.push({x: x + Math.random() * 8 - 4, y: y - 18, vx: Math.random() * 40 - 20, vy: -30 - Math.random() * 50, t: 0, l: .4 + Math.random() * .4}); } }));
  once('falls', HC.falls, () => sfx('hflare')); TH_CRYS.forEach((q, i) => { if (i % 2 === 0) once('c' + i, HC.cry + (i >> 1) * HC.cryGap, () => { TSN.i = i; sfx('hcry'); TSN.i = i + 3; sfx('hcry2'); }); });
  once('crown', HC.crown, () => { sfx('hcrown'); try { navigator.vibrate && navigator.vibrate(80); } catch (e) {} });
  if (C.t >= HC.end) hallCutEnd(false);
}
THR.enter = () => { HALL.sparks.length = 0; HALL.camY = null; HALL.pa = null; if (!HALL.seen && QUEST.s >= 6) { HALL.cut = {t: 0, k: {}}; hallBars(true); WL.sel = null; wlMenu(); } };
THR.frame = (m, people, dt, t, H, img) => {
  const C = HALL.cut; if (C) hallCutTick(dt, m); kingWatch();
  const cy = HALL.cut ? lerp(500, 64, ease(clamp((HALL.cut.t - HC.go) / HC.cam, 0, 1))) : m.y - (KING.talk ? 40 : 0);   // the entrance: the camera glides up the hall ahead of you, to the throne. Talking: it lifts to show him
  HALL.camY = HALL.camY == null || HALL.cut ? cy : HALL.camY + (cy - HALL.camY) * Math.min(1, dt * 5);
  const o = {hi: true, topCss: 96, void: '#000'}; if (HALL.cut) o.s = Math.max(2, Math.round(Math.max(1, Math.round(VW() / 190)) * 1.5));   // the entrance is shot close in: half as big again, so the glide has a hall to travel
  view(img, HALL.cut ? 110 : m.x, HALL.camY, 190, o);
  const K = kingSet() ? (KING.p = {name: 'king', dir: 'front', x: KING_AT[0], y: KING_AT[1], sortY: KING_AT[1], t, phase: 400, walk: false, noShadow: true}) : null;
  const hits = drawScene(K ? people.concat(K) : people, null, img, hallObjs(m, dt, t)); if (K) { crownDraw(hits.get(K), t); hits.delete(K); } wlFx(dt, m.loc); drawPuffs(dt); wlCases(dt, m.loc);
  for (let i = HALL.sparks.length - 1; i >= 0; i--) { const p = HALL.sparks[i]; p.t += dt; if (p.t > p.l) { HALL.sparks.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; lx.fillStyle = p.t / p.l < .5 ? '#e8fbff' : '#6ec8ff'; lx.fillRect(X(p.x), Y(p.y), 1, 1); }
  const T = hallT(), nlit = HC.fire.filter(a => T >= a).length, dark = T < 0 ? .5 : [.5, .44, .37, .3, .22, .12, 0][nlit]; if (dark > 0) { lx.fillStyle = `rgba(4,8,34,${dark})`; lx.fillRect(0, 0, cam.lw, cam.lh); }   // asleep: a dim room; each pair of fires takes some of the dark away
  const fl = .5 + .5 * noise(t * 1.7, 2), L = []; TH_STANDS.forEach(([x, y], i) => { if (standLit(i)) L.push([x, y - 20, 22, '110,190,255', .22 + .1 * fl, i + 1]); });
  TH_FALLS.forEach(([x0, y0, x1, y1], c) => L.push([(x0 + x1) / 2, y1, 30, '90,210,255', fallsLit() ? .3 : .12, 20 + c])); TH_CRYS.forEach(([x, y], i) => { if (crysLit(i)) L.push([x, y - 16, 20, '150,225,255', .3, 30 + i]); });
  if (crownLit()) L.push([KING_AT[0], KING_AT[1] - 36, 26, '170,230,255', .3, 41]); lights(L, t);
  return hits;
};
THR.spots = [{k: 'king', hit: [88, 8, 132, 122], stand: KING_STAND, dir: 'back', use: () => kingTalk()}];
THR.joy = (m, J) => !!HALL.cut;   // nothing moves you during the entrance
THR.tap = (e, m, x, y) => {
  if (HALL.cut) { if (HALL.cut.t > .6) hallCutEnd(true); return true; }   // a tap skips the entrance
  if (KING.talk) { kingNext(); return true; }                              // he is talking: a tap anywhere finishes the line, or turns to the next
  if (y > THR.door[1] - 22 && Math.abs(x - THR.door[0]) < 18) { wlGo(m, THR.door[0], THR.door[1] + 1, () => wlDoor(HOLLOW)); return true; }
  return false;
};
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { const m = WL.me; if (KING.talk && (!m || m.loc !== THRONE)) kingHush(); if (HALL.cut && (!m || m.loc !== THRONE)) { HALL.cut = null; hallBars(false); } return fr.call(this, dt, t); }; }
setInterval(() => { if (HALL.cut && scene !== scenes.town) { HALL.cut = null; hallBars(false); } }, 400);   // (left the walking scene mid-way: it plays again next time)
