/* ================= MATERIALS: STONE AND WOOD (28 Nov 2026, his ask; batch 3 of the keep-playing plan) =================
   World projects will cost coins AND materials. This is the gathering:
     STONE  one for every plain rock or wall you break in the mine (the server adds it: functions/mine.js).
     WOOD   buy an AXE from the Blacksmith (once), then walk up to a tall pine in the South and press the axe button over it: you chop it down,
            it falls and breaks into two or three logs, and walking over a log picks it up (one wood each). It is a stump for five minutes, then
            it has grown back. (Reworked 28 Nov 2026, his ask: see TREE CUTTING below.)
   The server keeps the counts, which of your trees are down and which logs still lie there (functions/build.js: axeBuy, chop, logTake;
   wallet.kit.stone / wood / axe / ch / logs).
   The projects themselves (the catalog, chipping in, the building going up) are the next step: not here yet. */
(() => {
  const AXE_PRICE = 300, REGROW = 5 * 60000;   // the server's own numbers (functions/build.js)
  const M = {stone: 0, wood: 0, axe: false, cut: {}, logs: {}, lab: false};   // cut: tree -> when it has grown back; logs: tree -> pieces still on the ground
  const px = (rows, C) => { const c = mk(rows[0].length, rows.length), x = c.getContext('2d'); rows.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return c; };
  // little pictures in the style of his icons: a dark outline, flat colour, a lighter top and a darker underside
  const ICON = {
    stone: px(['..KKKKK...', '.KLLLMMK..', 'KLLMMMMMK.', 'KLMMMMMMDK', 'KMMMMMMDDK', 'KMMMMDDDDK', '.KDDDDDDK.', '..KKKKKK..'], {K: '#181425', L: '#c0cbdc', M: '#8b9bb4', D: '#5a6988'}),
    wood: px(['..KKKKKKK.', '.KLLLLLLMK', 'KRrKLLLLMK', 'KrRKMMMMDK', 'KRrKMMMMDK', 'KrRKMMDDDK', '.KKKDDDDK.', '...KKKKK..'], {K: '#181425', L: '#e5ae58', M: '#b86f3d', D: '#733e39', R: '#f6dfae', r: '#e5ae58'}),
    axe: px(['....KKKK..', '...KWWWSK.', '..KBWWSSK.', '.KBBKSSK..', 'KBBK.KK...', 'KBK.......', '.K........'], {K: '#181425', W: '#ffffff', S: '#c0cbdc', B: '#b86f3d'})};
  const img = (k, sc) => { const c = ICON[k]; return `<img src="${c.toDataURL()}" alt="" style="width:${c.width * (sc || 2)}px;height:${c.height * (sc || 2)}px;image-rendering:pixelated;vertical-align:-3px">`; };
  window.matIcon = img; window.matHave = () => ({stone: M.stone, wood: M.wood});

  // the wallet says what you carry and which of your trees are down
  { const wa = walletApply; walletApply = function (w) { wa(w); if (M.lab) return; const k = (w && w.kit) || {}; M.stone = k.stone | 0; M.wood = k.wood | 0; M.axe = !!k.axe;
      const now = Date.now(), C = k.ch || {}; M.cut = {}; for (const i in C) if (now - C[i] < REGROW) M.cut[i] = C[i] + REGROW;
      const L = k.logs || {}; M.logs = {}; for (const i in L) if (L[i] > 0) M.logs[i] = L[i] | 0;
      if ($('#smithModal') && $('#smithModal').classList.contains('on') && window.smithUI) smithUI(); }; }

  /* ---------- TREE CUTTING, reworked (28 Nov 2026, his ask) ----------
     "walking up to a tree shows an axe icon/button over the closest tree and pressing it starts the cutting", "a real axe to show in the players
     hands", "a bit slower and it actually shows the chunks flying off the tree", "the tree actually fall over while the shadow is very realistic
     on the floor, then when it hits the floor the logs break up and walking over them collects them with the +X wood above the players head
     like mining". So:
       the button   #chopBtn floats over the closest standing pine while you are near it with an axe (a tap on the pine still works too)
       the chop     you stand BESIDE the trunk and swing a real axe (drawn here, turned without blur) SWINGS times; chips fly on every hit
       the fall     the top of the tree's own picture turns about the top of its stump, away from you, faster and faster; its shadow is the
                    tree's own outline thrown flat on the ground (every row of the picture, as far out as that row has tipped), so it grows
                    out from the foot and the tree comes down exactly onto it. Then a thump, dust, a small shake, and it breaks into logs
       the logs     one piece a wood. The server only fells the tree (op chop: kit.logs[tree] = pieces); the wood is yours when you walk over
                    a piece (op logTake). Pieces you leave are in the wallet, so they are still lying there after a reload.
     Which way a tree falls is fixed by where it stands (the side with open ground), so its logs are in the same place every time. Only you
     see your chopping (each player has their own trees). */
  const tree = q => q && q.lib === 'tallpine', STUMP = new WeakMap(), GEO = new WeakMap(), SHAKE = {i: -1, t: 0};
  const SWINGS = 5, SW = .66, HIT_AT = .6, STEPS = 40, REACH = 21, NEAR = 36, INK = '#181425', NAVY = 'rgb(18,28,58)';   // swings a tree; seconds a swing; when in it the axe lands; pictures in a quarter turn
  const LOGS = {}, TAKE = {}, SIDE = {}, CHIPS = [], FLY = [], FX = {shake: 0, seen: 0, dt: 0}, BL = mk(1, 1);
  let CH = null, pi = null, LOGIMG = null;   // CH: the chop going on {i, q, im, g, dir, ph: 'swing' | 'fall' | 'lie', ...}
  const stump = im => { let s = STUMP.get(im); if (s) return s; const keep = Math.min(im.height, im.height - im.base + 11); s = mk(im.width, im.height); s.getContext('2d').drawImage(im, 0, im.height - keep, im.width, keep, 0, im.height - keep, im.width, keep); s.base = im.base; STUMP.set(im, s); return s; };
  // a picture turned by `a` (clockwise) about (px, py), which lands on C in an N x N picture. No blur: every pixel is read whole from the original
  const spin = (D, px, py, a, N, C) => { const o = new ImageData(N, N), cs = Math.cos(a), sn = Math.sin(a), w = D.width, h = D.height, s = D.data, t = o.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = x + .5 - C[0], dy = y + .5 - C[1], u = Math.floor(px + dx * cs + dy * sn), v = Math.floor(py - dx * sn + dy * cs); if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const j = (v * w + u) * 4; if (s[j + 3] < 128) continue; const k = (y * N + x) * 4; t[k] = s[j]; t[k + 1] = s[j + 1]; t[k + 2] = s[j + 2]; t[k + 3] = 255; }
    const c = mk(N, N); c.getContext('2d').putImageData(o, 0, 0); return c; };
  const rim = c => { const x = c.getContext('2d'), N = c.width, H = c.height, d = x.getImageData(0, 0, N, H), p = d.data, A = (X0, Y0) => X0 >= 0 && Y0 >= 0 && X0 < N && Y0 < H && p[(Y0 * N + X0) * 4 + 3] > 0, e = [];   // the dark outline, put on AFTER the turn so it is always one whole pixel
    for (let Y0 = 0; Y0 < H; Y0++) for (let X0 = 0; X0 < N; X0++) if (!A(X0, Y0) && (A(X0 + 1, Y0) || A(X0 - 1, Y0) || A(X0, Y0 + 1) || A(X0, Y0 - 1))) e.push((Y0 * N + X0) * 4);
    for (const i of e) { p[i] = 0x18; p[i + 1] = 0x14; p[i + 2] = 0x25; p[i + 3] = 255; } x.putImageData(d, 0, 0); return c; };
  /* what a pine's picture says about itself, worked out once: where it is cut (the top of the stump), the middle of the trunk there (the hinge),
     how wide the tree is at every row above the cut (for the shadow), the part that falls, and its own bark and needle colours (for the chips) */
  const geo = im => { let g = GEO.get(im); if (g) return g; const w = im.width, H = im.height, keep = Math.min(H, H - im.base + 11), cut = H - keep, d = im.getContext('2d').getImageData(0, 0, w, H).data, A = (x, y) => d[(y * w + x) * 4 + 3] > 200;
    const span = y => { let a = -1, b = -1; for (let x = 0; x < w; x++) if (A(x, y)) { if (a < 0) a = x; b = x; } return [a, b]; }, P = (x, y) => { const j = (y * w + x) * 4; return [d[j], d[j + 1], d[j + 2]]; };
    const lum = p => p[0] * .3 + p[1] * .59 + p[2] * .11, hex = p => '#' + p.map(v => v.toString(16).padStart(2, '0')).join('');
    const [a0, b0] = span(Math.max(0, cut - 1)), px = a0 < 0 ? w / 2 : (a0 + b0 + 1) / 2, half = []; let wmax = 1;
    for (let r = 0; r < cut; r++) { const [a, b] = span(cut - 1 - r); half[r] = a < 0 ? 0 : Math.max(px - a, b + 1 - px); wmax = Math.max(wmax, half[r]); }
    const bk = []; for (let y = Math.max(0, cut - 10); y < Math.min(H, cut + 6); y++) { const [a, b] = span(y); for (let x = a + 1; x < b; x++) if (a >= 0 && A(x, y)) bk.push(P(x, y)); } bk.sort((p, q) => lum(p) - lum(q));
    const bark = bk.length ? [.15, .5, .88].map(f => hex(bk[Math.floor(f * (bk.length - 1))])) : ['#4a350a', '#5b3f10', '#795521'], leaf = [];
    for (let y = 2; y < cut * .7; y += 3) for (let x = 1; x < w; x += 4) if (A(x, y)) leaf.push(hex(P(x, y))); if (!leaf.length) leaf.push('#2f6b4f', '#ffffff');
    const top = mk(w, Math.max(1, cut)), tx = top.getContext('2d'); tx.drawImage(im, 0, 0, w, cut, 0, 0, w, cut);
    g = {cut, px, half, wmax, bark, leaf, D: tx.getImageData(0, 0, w, Math.max(1, cut)), R: Math.ceil(Math.hypot(Math.max(px, w - px), cut)) + 2, rot: {}}; GEO.set(im, g); return g; };
  const turn = (g, dir, st) => g.rot[dir + '|' + st] || (g.rot[dir + '|' + st] = spin(g.D, g.px, g.cut, dir * st / STEPS * Math.PI / 2, 2 * g.R + 1, [g.R + g.px % 1, g.R]));
  /* THE AXE in your hands: his icon's colours, drawn pointing straight up with the blade to the right, then turned (64 steps a turn) and outlined.
     The hand holds it two rows up from the end of the handle. */
  const AXE = px(['..hH.....', '..hHSSS..', '..hHSSSW.', '.DhHSSSSW', '.DhHSSSSW', '..hHSSSW.', '..hHDDD..', '..hH.....', '..hH.....', '..hH.....', '..hH.....', '..hH.....', '..hH.....', '..hH.....', '..hH.....', '..hH.....'], {h: '#8a5a2b', H: '#b86f3d', S: '#c0cbdc', W: '#ffffff', D: '#8b9bb4'}), AXEC = {};
  const axeImg = (st, flip) => { const k = st + '|' + (flip ? 1 : 0); if (AXEC[k]) return AXEC[k]; const D = AXE.D || (AXE.D = AXE.getContext('2d').getImageData(0, 0, AXE.width, AXE.height)), c = rim(spin(D, 3, 13.5, st / 64 * Math.PI * 2, 37, [18.5, 18.5]));
    if (!flip) return AXEC[k] = c; const f = mk(37, 37), x = f.getContext('2d'); x.translate(37, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return AXEC[k] = f; };
  /* one swing, k = 0..1: back over the shoulder, down hard into the trunk, a bounce off it, back to rest. a = the axe's angle from straight up,
     turning towards the tree; the body rises a little and leans in with it */
  const pose = k => { const eo = q => 1 - (1 - q) * (1 - q), ei = q => q * q * q, REST = .55, UP = -1, HIT = 1.5; let a, lift = 0, ox = 0;
    if (k < .45) { const q = eo(k / .45); a = REST + (UP - REST) * q; lift = 2 * q; ox = -q; }
    else if (k < HIT_AT) { const q = ei((k - .45) / (HIT_AT - .45)); a = UP + (HIT - UP) * q; lift = 2 * (1 - q); ox = -1 + 3 * q; }
    else if (k < .78) { const q = (k - HIT_AT) / (.78 - HIT_AT); a = HIT - .3 * Math.sin(q * Math.PI); ox = 2 - q; }
    else { const q = (k - .78) / .22; a = HIT + (REST - HIT) * q; ox = 1 - q; }
    return {a, lift, ox}; };
  SFX.chop = () => { tone(210, .07, {type: 'triangle', vol: .17, to: 105}); hiss(.05, {vol: .1, bp: 1800}); tone(700, .03, {type: 'square', vol: .04, to: 360}); };
  SFX.treecrack = () => { for (let i = 0; i < 5; i++) hiss(.03, {vol: .09, bp: 2300 - i * 150, at: i * .08 + Math.random() * .02}); tone(150, .5, {type: 'sawtooth', vol: .04, to: 60}); };
  SFX.treefall = () => { tone(88, .32, {type: 'triangle', vol: .26, to: 36}); hiss(.34, {vol: .17, lp: 480}); hiss(.5, {vol: .07, bp: 3200, at: .02}); };
  SFX.logs = () => { [300, 230, 190].forEach((f, i) => tone(f, .05, {type: 'triangle', vol: .13, to: f * .6, at: i * .055})); hiss(.08, {vol: .06, bp: 1500}); };
  { const css = document.createElement('style'); css.textContent = '#chopBtn{position:absolute;display:none;transform:translate(-50%,-100%);z-index:5;width:50px;height:50px;padding:0 0 3px;align-items:center;justify-content:center;background:#2a2346;border-color:#0f0b1e;box-shadow:inset 0 -5px 0 #1b1532,0 3px 0 #0009}'
      + '#chopBtn.on{display:flex;animation:tmPop .16s cubic-bezier(.2,1.5,.4,1)}#chopBtn:active{transform:translate(-50%,-100%) translateY(2px)}#chopBtn img{vertical-align:0!important}'; document.head.appendChild(css); }
  $('#townHud').insertAdjacentHTML('beforeend', '<button class="btn" id="chopBtn">' + img('axe', 3) + '</button>');
  // the server, or (in the lab, matLab) a stand-in that answers the same way
  const call = (op, d) => !M.lab ? srv(op, d) : new Promise(res => setTimeout(() => { if (op === 'chop') res({got: 2 + (Math.random() < .35 ? 1 : 0), i: d.i, until: Date.now() + REGROW, wood: M.wood}); else { const have = M.logs[d.i] | 0, n = Math.min(have, d.n || have); res({got: n, wood: M.wood + n, i: d.i, left: have - n}); } }, 150));

  /* the South's own code (south.js) loads AFTER this file, so its hooks wait for it */
  const wait = setInterval(() => { if (typeof propImg !== 'function' || typeof southObjs !== 'function' || typeof SH === 'undefined' || typeof S_PROPS === 'undefined') return; clearInterval(wait);
  pi = propImg; propImg = function (q) { const im = pi(q); if (!im || !tree(q)) return im; const i = S_PROPS.indexOf(q); return M.cut[i] > Date.now() || (CH && CH.i === i && CH.ph !== 'swing') ? stump(im) : im; };   // a pine that is down (or coming down) shows only its foot
  const foot = (q, im, g) => [q.x + g.px, q.y + im.base];   // where the trunk meets the ground
  const okAt = (x, y) => { const H = hallOf(SOUTH), G = hallGrid(H); return hallOk(SOUTH, x, y) && !!G[Math.floor(y / H.gs) * H.gw + Math.floor(x / H.gs)]; };   // you can walk to exactly here (the path finder works in 4 px squares)
  /* which way tree i falls and where you stand to chop it: you on one side, the logs on the other. Fixed by the ground round the tree. */
  const side = i => { if (SIDE[i]) return SIDE[i]; const q = S_PROPS[i], im = pi(q), g = geo(im), [gx, gy] = foot(q, im, g); let best = null;
    for (const d of (i % 2 ? [1, -1] : [-1, 1])) { const st = [[REACH, 1], [REACH, 4], [REACH - 3, 6], [REACH - 6, 7]].map(([ax, ay]) => [gx - d * ax, gy + ay]), k = st.findIndex(([x, y]) => okAt(x, y)); let sc = k < 0 ? -9 : 4 - k * .5;
      for (let n = 0; n < 3; n++) if (hallOk(SOUTH, gx + d * (16 + n * 15), gy)) sc++; if (!best || sc > best.sc) best = {sc, dir: d, ok: k >= 0, sx: k < 0 ? gx : st[k][0], sy: k < 0 ? gy : st[k][1]}; }
    return SIDE[i] = best; };
  // where tree i's logs lie: along the way it fell, each on ground you can walk on
  const spots = (i, n) => { const q = S_PROPS[i], im = pi(q), g = geo(im), [gx, gy] = foot(q, im, g), s = side(i), out = [];
    for (let k = 0; k < n; k++) { let x = Math.round(gx + s.dir * (16 + (k % 3) * 15 + (i * 7 + k * 5) % 4)), y = gy + [2, -2, 3, 6, -5, 7][k % 6];
      if (!hallOk(SOUTH, x, y)) find: for (let r = 3; r <= 30; r += 3) for (let a = 0; a < 12; a++) { const x1 = Math.round(x + Math.cos(a / 12 * 6.283) * r), y1 = Math.round(y + Math.sin(a / 12 * 6.283) * r * .7); if (hallOk(SOUTH, x1, y1)) { x = x1; y = y1; break find; } }
      out.push([x, y]); } return out; };
  const logImg = g => LOGIMG || (LOGIMG = [['.KKKKKKKKKKK.', 'KEEEKLLLLLLMK', 'KEeEKMLMMLMMK', 'KEeEKMMMMMMDK', 'KEeEKMDMMDDDK', 'KEEEKDDDDDDDK', '.KKKKKKKKKKK.'], ['.KKKKKKKK.', 'KLLLLKEEEK', 'KMLMMKEeEK', 'KMMMDKEeEK', 'KMDDDKEeEK', 'KDDDDKEEEK', '.KKKKKKKK.']].map(r => px(r, {K: INK, E: '#f6dfae', e: '#e5ae58', L: g.bark[2], M: g.bark[1], D: g.bark[0]})));
  // the pieces on the ground are whatever the wallet says is lying there (except round the tree you are felling, or one you are picking up from)
  const lay = () => { for (const i in LOGS) if (!(M.logs[i] > 0) && !TAKE[i]) delete LOGS[i];
    for (const i in M.logs) { if ((CH && CH.i === +i) || TAKE[i] || !tree(S_PROPS[i]) || !pi(S_PROPS[i])) continue; const n = Math.min(6, M.logs[i]), P = LOGS[i]; if (P && P.length === n) continue;
      LOGS[i] = spots(+i, n).map(([x, y], k) => ({x, y, v: (+i + k) % 2, t: 9})); } };
  const chips = (x, y, z, n, cols, dir, sp) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (14 + Math.random() * 34) * (sp || 1);
      CHIPS.push({x, y: y + Math.random() * 2, z: z + Math.random() * 3, vx: Math.cos(a) * s * .6 - dir * (10 + Math.random() * 26), vy: Math.sin(a) * s * .3, vz: 30 + Math.random() * 60, col: cols[(Math.random() * cols.length) | 0], sz: i % 4 ? 1 : 2, t: 0, l: .5 + Math.random() * .4}); } };

  /* ---------- the chop itself ---------- */
  function treeAt(x, y) { for (let i = 0; i < S_PROPS.length; i++) { const q = S_PROPS[i]; if (!tree(q)) continue; const im = IMG['sp/' + q.lib]; if (!im) continue;
      if (x > q.x + im.width * .2 && x < q.x + im.width * .8 && y > q.y + im.height * .25 && y < q.y + im.height + 2) return i; } return -1; }
  const free = i => tree(S_PROPS[i]) && pi(S_PROPS[i]) && !(M.cut[i] > Date.now()) && !(M.logs[i] > 0) && side(i).ok;   // standing, no logs of it left lying, and there is somewhere to stand
  function start(i) { const m = WL.me; if (!m || CH || !M.axe || !free(i)) return; const s = side(i); wlGo(m, s.sx, s.sy, () => begin(i)); }
  function begin(i) { const m = WL.me, q = S_PROPS[i]; if (!m || CH || m.loc !== SOUTH || !free(i)) return; const s = side(i); if (Math.hypot(m.x - s.sx, m.y - s.sy) > 6) return;
    const im = pi(q); CH = {i, q, im, g: geo(im), dir: s.dir, sx: m.x, sy: m.y, n: 0, t: 0, hit: false, ph: 'swing', th: 0, w: 0, lt: 0, pre: 0, res: null, err: null}; m.path = []; m.todo = null; m.walk = false; m.dir = s.dir > 0 ? 'right' : 'left'; }
  function hit(c) { const g = c.g, [gx, gy] = foot(c.q, c.im, g); sfx('chop'); chips(gx - c.dir * (g.half[0] || 4), gy + 1, 10, c.n >= SWINGS ? 12 : 7, ['#f6dfae', '#e5ae58', '#e5ae58', g.bark[1], g.bark[2], g.bark[0]], c.dir);
    if (c.n < SWINGS) { SHAKE.i = c.i; SHAKE.t = performance.now(); return; }
    c.ph = 'fall'; c.th = .02; c.w = .2; sfx('treecrack');   // the last swing: over it goes, and the server is told
    call('chop', {i: c.i}).then(r => { M.cut[c.i] = r.until || Date.now() + REGROW; M.logs[c.i] = r.got | 0; c.res = r; }, e => { c.err = (e && e.message) || 'No connection. Try again.'; }); }
  function land(c) { const g = c.g, [gx, gy] = foot(c.q, c.im, g); sfx('treefall'); FX.shake = .3;
    for (const r of [.2, .45, .7, .92]) { puffAt(gx + c.dir * g.cut * r, gy + 3, 5); chips(gx + c.dir * g.cut * r, gy + 2, 2, 4, g.leaf, 0, .8); } }
  function burst(c) { const g = c.g, [gx, gy] = foot(c.q, c.im, g), n = Math.min(6, c.res.got | 0); sfx('logs'); FX.shake = Math.max(FX.shake, .1); logImg(g);
    LOGS[c.i] = spots(c.i, n).map(([x, y], k) => ({x, y, v: (c.i + k) % 2, t: -k * .05, fx: gx + c.dir * (10 + (k + .5) * (g.cut - 14) / n), fy: gy}));
    for (let r = .12; r < 1; r += .11) { const x = gx + c.dir * g.cut * r; chips(x, gy + 2, 4, r < .35 ? 3 : 5, r < .35 ? g.bark : g.leaf, 0, 1.2); if (r < .5) chips(x, gy + 2, 3, 2, ['#f6dfae', '#e5ae58'], 0); puffAt(x, gy + 2, 2); }
    CH = null; }
  function give(i, T) { const n = T.n, P = LOGS[i] || []; T.busy = true;
    call('logTake', {i, n}).then(r => { M.wood = r.wood | 0; if (r.left > 0) M.logs[i] = r.left; else delete M.logs[i]; LOGS[i] = P.filter(p => !p.tk); if (!LOGS[i].length) delete LOGS[i]; delete TAKE[i];
      sfx('coin'); headSay(WL.me, `${img('wood')} <b>+${r.got}</b>`, {t: 2, cls: 'res'}); if ($('#smithModal') && $('#smithModal').classList.contains('on') && window.smithUI) smithUI(); },
      e => { for (const p of P) if (p.tk) { p.tk = 0; p.t = -2.5; } delete TAKE[i]; wlSay((e && e.message) || 'No connection. Try again.', 'bad'); }); }
  function tick(dt, m) { FX.dt = dt; FX.seen = performance.now(); FX.shake = Math.max(0, FX.shake - dt); lay(); const c = CH;
    if (c && c.ph === 'swing') { if (m.seat || m.ko || Math.hypot(m.x - c.sx, m.y - c.sy) > 2.5 || (m.path && m.path.length) || document.querySelector('.modal.on')) CH = null;   // walked off: the chop is dropped, the tree stands
      else { m.dir = c.dir > 0 ? 'right' : 'left'; m.walk = false; if (c.pre <= STEPS) turn(c.g, c.dir, c.pre++);   /* the fall's pictures are made ready while you swing */ c.t += dt;
        if (!c.hit && c.t >= SW * HIT_AT) { c.hit = true; c.n++; hit(c); } if (c.ph === 'swing' && c.t >= SW + .08) { c.t = 0; c.hit = false; } } }
    else if (c) { if (c.t < SW) c.t = Math.hypot(m.x - c.sx, m.y - c.sy) > 2.5 ? SW : c.t + dt;   // the end of the last swing, unless you step away
      if (c.err) { CH = null; wlSay(c.err, 'bad'); }   // the server said no: the tree stands again
      else if (c.ph === 'fall') { c.w += 10 * Math.sin(Math.max(c.th, .04)) * dt; c.th += c.w * dt; if (c.th >= Math.PI / 2) { c.th = Math.PI / 2; c.ph = 'lie'; land(c); } }   // a real fall: slow to start, then faster and faster
      else { c.lt += dt; if (c.lt > .36 && c.res) burst(c); } }
    for (const i in LOGS) { const T = TAKE[i]; for (const p of LOGS[i]) { p.t += dt; if (p.tk || p.t < .55 || (T && T.busy) || (CH && CH.ph === 'swing') || m.ko || Math.abs(m.x - p.x) > 8 || Math.abs(m.y - p.y) > 6) continue;   // walked over a piece
        p.tk = 1; FLY.push({v: p.v, x: p.x, y: p.y, t: 0}); (TAKE[i] || (TAKE[i] = {n: 0})).n++; TAKE[i].t = performance.now(); } }
    for (const i in TAKE) { const T = TAKE[i]; if (!T.busy && (performance.now() - T.t > 450 || (LOGS[i] || []).every(p => p.tk))) give(+i, T); } }   // pieces picked up together are one "+X"

  /* ---------- drawing ---------- */
  /* THE FALLING TREE'S SHADOW: the sun is overhead, so every row of the tree throws its width straight down onto the ground, as far out from the
     foot as that row has tipped (r sin th). Upright that is a small patch round the foot; as it tips the patch stretches out into the tree's own
     outline lying flat, and the tree lands on it. Flat navy in two tones like the stalls' shadows; one bar a column, so nothing doubles up. */
  function fallShadow(g, gx, gy, dir, th) { const s = Math.sin(th), c = Math.cos(th), F = .42, lo = Math.floor(Math.min(0, dir * g.cut * s) - g.wmax - 1), n = Math.ceil(g.cut * s + 2 * g.wmax + 3), ext = new Float32Array(n);
    for (let r = 0; r < g.cut; r++) { const hw = g.half[r]; if (!hw) continue; const cx = dir * r * s, rx = Math.max(.6, hw * c), ry = hw * F;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const u = (x + .5 - cx) / rx; if (u * u >= 1) continue; const e = ry * Math.sqrt(1 - u * u), j = x - lo; if (j >= 0 && j < n && e > ext[j]) ext[j] = e; } }
    const k = clamp(th / .3, 0, 1), X0 = X(Math.floor(gx) + lo), Y0 = Y(gy); lx.fillStyle = NAVY;
    for (const [inset, al] of [[0, .23], [1, .26]]) { lx.globalAlpha = al * k; for (let j = inset; j < n - inset; j++) { const e = Math.round(ext[j]) - inset; if (ext[j] <= 0 || e < 0 || (inset && !(ext[j - 1] > 0 && ext[j + 1] > 0))) continue; lx.fillRect(X0 + j, Y0 - e, 1, e * 2 + 1); } }
    lx.globalAlpha = 1; }
  function drawLog(p) { const im = LOGIMG[p.v], k = clamp(p.t / .32, 0, 1), x = p.fx != null ? p.fx + (p.x - p.fx) * k : p.x, y = p.fx != null ? p.fy + (p.y - p.fy) * k : p.y;
    const z = p.fx == null || p.t < 0 ? 0 : k < 1 ? Math.round(Math.sin(Math.PI * k) * 9) : p.t < .46 ? Math.round(Math.sin(Math.PI * (p.t - .32) / .14) * 2) : 0, w = im.width, X0 = X(x) - (w >> 1), Y0 = Y(y);   // a hop out of the trunk and one small bounce
    lx.globalAlpha = .38; lx.fillStyle = NAVY; lx.fillRect(X0 + 1, Y0 + 1, w - 2, 2); lx.globalAlpha = 1; lx.drawImage(im, X0, Y0 - im.height + 1 - z); }
  function drawBits(m) { const dt = FX.dt;
    for (let i = CHIPS.length - 1; i >= 0; i--) { const p = CHIPS[i]; p.t += dt; if (p.t > p.l) { CHIPS.splice(i, 1); continue; } if (p.z > 0 || p.vz > 0) { p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 260 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; } }   // up, over, down, then it lies there a moment
      lx.fillStyle = p.col; lx.fillRect(X(p.x), Y(p.y - p.z), p.sz, p.sz); }
    for (let i = FLY.length - 1; i >= 0; i--) { const p = FLY[i]; p.t += dt; if (p.t > .2) { FLY.splice(i, 1); continue; } const k = p.t / .2, im = LOGIMG[p.v]; lx.drawImage(im, X(p.x + (m.x - p.x) * k) - (im.width >> 1), Y(p.y + (m.y - 14 - p.y) * k - Math.sin(Math.PI * k) * 5) - im.height + 1); } }   // a piece you picked up hops to you
  { const so = southObjs; southObjs = function (m, dt) { const out = so(m, dt), c = CH;
      if (SHAKE.i >= 0) { const q = S_PROPS[SHAKE.i], k = performance.now() - SHAKE.t; if (q && k < 220) { const o = out.find(o => o.x === q.x && o.y === q.y && o.img === propImg(q)); if (o) o.x += Math.round(Math.sin(k * .09) * 2); } }   // the tree shudders on each hit
      if (c && c.ph !== 'swing') { const q = c.q, g = c.g, [gx, gy] = foot(q, c.im, g), th = c.ph === 'lie' ? Math.PI / 2 - (c.lt < .24 ? .1 * Math.sin(Math.PI * c.lt / .24) : 0) : c.th, st = clamp(Math.round(th / (Math.PI / 2) * STEPS), 0, STEPS);   // landed: one small bounce
        out.push({img: BL, x: 0, y: 0, base: -1e9, after: () => fallShadow(g, gx, gy, c.dir, th)}, {img: turn(g, c.dir, st), x: q.x + Math.floor(g.px) - g.R, y: q.y + g.cut - g.R, base: gy + .2}); }
      for (const i in LOGS) for (const p of LOGS[i]) if (!p.tk) { logImg(geo(pi(S_PROPS[i]))); out.push({img: BL, x: 0, y: 0, base: p.y, after: () => drawLog(p)}); }
      if (c && (c.ph === 'swing' || c.t < SW)) { const P = pose(Math.min(1, c.t / SW)), st = ((Math.round(P.a / (Math.PI * 2) * 64) % 64) + 64) % 64, hx = m.x + c.dir * (P.ox + 5), hy = m.y - 8 - P.lift;   // the axe, drawn just over you
        out.push({img: BL, x: 0, y: 0, base: m.y + .5, after: () => lx.drawImage(axeImg(st, c.dir < 0), X(hx) - 18, Y(hy) - 18)}); }
      if (CHIPS.length || FLY.length) { if (FLY.length && !LOGIMG) FLY.length = 0; out.push({img: BL, x: 0, y: 0, base: 1e9, after: () => drawBits(m)}); }
      return out; }; }
  // your body in the swing, and the button over the closest pine you could chop
  { const fr = SH.frame; SH.frame = function (m, people, dt, t, H, im) { tick(dt, m); const c = CH;
      if (c && (c.ph === 'swing' || c.t < SW)) { const P = pose(Math.min(1, c.t / SW)); people = people.map(p => p.e === m ? {...p, dir: c.dir > 0 ? 'right' : 'left', x: p.x + c.dir * P.ox, lift: (p.lift || 0) + P.lift, walk: false} : p); }
      const hits = fr.call(this, m, people, dt, t, H, im), b = $('#chopBtn'); let best = -1, bd = NEAR, at = null;
      if (M.axe && !CH && !m.seat && !m.ko && !document.querySelector('.modal.on')) for (let i = 0; i < S_PROPS.length; i++) { const q = S_PROPS[i]; if (!tree(q) || Math.abs(q.x + 20 - m.x) > 60 || !free(i)) continue; const pim = pi(q), [gx, gy] = foot(q, pim, geo(pim)), d = Math.hypot(m.x - gx, (m.y - gy) * 1.2); if (d < bd) { bd = d; best = i; at = [gx, q.y + Math.round(pim.height * .36)]; } }
      if (best < 0) b.classList.remove('on'); else { b.dataset.i = best; b.style.left = clamp((at[0] - cam.x - (cam.fx || 0)) * S / DPR, 30, cv.clientWidth - 30) + 'px'; b.style.top = Math.max(56, (at[1] - cam.y - (cam.fy || 0)) * S / DPR) + 'px'; b.classList.add('on'); }
      return hits; }; }
  $('#chopBtn').onclick = e => { e.stopPropagation(); const b = $('#chopBtn'); b.classList.remove('on'); start(+b.dataset.i); };
  { const tp = SH.tap; SH.tap = (e, m, x, y) => { if (CH && CH.ph === 'swing') CH = null;   // a tap anywhere while you swing: you stop and walk
      if (M.axe && !m.seat && !CH) { const i = treeAt(x, y); if (i >= 0 && free(i)) { start(i); return true; } }
      return tp(e, m, x, y); }; }
  // the thump when it lands: the South's camera shakes a little, for you
  { const vw = view; view = function (im, cx, cy, vW, o) { if (FX.shake > 0 && WL.me && WL.me.loc === SOUTH) { const s = FX.shake * 12, t = performance.now(); cx += Math.round(Math.sin(t * .09) * s); cy += Math.round(Math.cos(t * .11) * s * .6); } return vw.call(this, im, cx, cy, vW, o); }; }
  setInterval(() => { const m = WL.me, away = !m || m.loc !== SOUTH; if (away || performance.now() - FX.seen > 500) $('#chopBtn').classList.remove('on'); if (away && CH) CH = null; }, 400);   // left the South: no button, and a fall you did not stay for is simply over (its logs are in the wallet)
  }, 300);

  /* ---------- the Blacksmith: what you carry, and the axe ---------- */
  const hook = setInterval(() => { if (typeof smithUI !== 'function' || !$('#smithModal') || !$('#cryYes')) return; clearInterval(hook);
    const last = $('#shYes') || $('#cryYes');
    last.insertAdjacentHTML('afterend', '<div class="small" style="margin-top:14px"><b>BUILDING</b> · <span id="smithMat"></span></div><button class="btn go wide" id="axeYes"></button>');
    const su = smithUI; smithUI = function () { su(); $('#smithMat').innerHTML = img('stone') + ' ' + M.stone + ' &nbsp; ' + img('wood') + ' ' + M.wood;
      const b = $('#axeYes'), h = M.axe ? img('axe') + ' You have an axe' : img('axe') + ' Axe · ' + ic('coin', 2) + ' ' + AXE_PRICE; b.disabled = M.axe || coins < AXE_PRICE; if (b.dataset.h !== h) { b.dataset.h = h; b.innerHTML = h; } };
    $('#axeYes').onclick = async () => { const b = $('#axeYes'); if (b.disabled) return; b.disabled = true; try { await srv('axeBuy'); M.axe = true; sfx('rare'); } catch (e) { wlSay(e.message, 'bad'); } smithUI(); };
  }, 500);
  window.matLab = (axe, stone, wood) => { M.lab = true; M.axe = axe !== false; M.stone = stone | 0; M.wood = wood | 0; };   // the lab: try chopping without buying the axe (nothing goes to the server, the wallet is left alone)
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
     5. THE OWNER can MOVE it (the grid again, with the building lifted off the ground) or CANCEL it (tap twice): everyone gets back exactly what
        they put in. A finished building can be moved too: tap its name under TOWN PROJECT in the world's panel.
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
.pjDone span,.pjDone .pjMv{font:700 12px 'Pixelify Sans';color:#0f2a12;background:#63c74d;border:2px solid #0f0b1e;border-radius:4px;padding:1px 6px 2px}.pjDone .pjMv{cursor:pointer}
.pjTools{display:flex;gap:8px;margin-top:10px}.pjTools .btn{flex:1;font-size:13px;padding:3px 6px 7px}.pjTools .btn.sure{background-color:#e43b44;color:#fff}
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

  /* ---------- the owner's Move and Cancel ---------- */
  const tools = () => owner() ? `<div class="pjTools"><button class="btn dark" data-t="move">Move</button><button class="btn dark" data-t="cancel">Cancel</button></div>` : '';
  async function tool(b) { if (!b || !PJ.cur) return; if (b.dataset.t === 'move') { placeStart(PJ.cur.id, true); return; }
    if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Tap again: everyone is refunded'; clearTimeout(b.tm); b.tm = setTimeout(() => { b.classList.remove('sure'); b.textContent = 'Cancel'; }, 3500); return; }
    const done = btnBusy(b, '…'); try { if (PJ.lab) PJ.cur = null; else await srv('projCancel', {wid: NET.world}); sfx('close'); wlSay('Cancelled. Everyone has their things back.', 'good'); } catch (er) { wlSay(er.message, 'bad'); }
    done(); PJ.sig = ''; $('#wmProj').dataset.h = ''; $('#pjPop').dataset.h = ''; sync(); paint(); }

  /* ---------- the world's panel ---------- */
  function paint() { const box = $('#wmProj'); if (!box) return; if (!inWorld()) { box.innerHTML = ''; box.dataset.h = ''; return; }
    const own = owner(), cur = PJ.cur, built = Object.keys(PJ.done).filter(id => PROJECTS[id]); let h = '<h4>TOWN PROJECT</h4>';
    if (cur && PROJECTS[cur.id]) h += `<div class="pjCard"><b>${PROJECTS[cur.id][0]}</b><small>${PROJECTS[cur.id][1]}</small>${rows(cur)}${tools()}</div>`;
    else if (PJ.pick && own) h += Object.keys(PROJECTS).map(id => { const [n, what, C] = PROJECTS[id], done = !!PJ.done[id], im = pim(id);
      return `<div class="pjCard cat${done ? ' built' : ''}">${im ? `<img class="pv" src="${im.src}" alt="">` : ''}<div class="tx"><b>${n}</b><small>${what}</small>${cost(C)}</div><button class="btn go" data-s="${id}" ${done ? 'disabled' : ''}>${done ? 'Built' : 'Place'}</button></div>`; }).join('');
    else h += own ? '<button class="btn go wide" data-p="1">Pick a project</button>' : '<div class="small">The owner has not picked one yet.</div>';
    if (built.length) h += '<div class="pjDone">' + built.map(id => own ? `<button class="pjMv" data-mv="${id}">${PROJECTS[id][0]}</button>` : `<span>${PROJECTS[id][0]}</span>`).join('') + '</div>';
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; } }
  $('#wmProj').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.p) { PJ.pick = true; sfx('click'); paint(); return; }
    if (b.dataset.s) { placeStart(b.dataset.s); return; }
    if (b.dataset.mv) { placeStart(b.dataset.mv, true); return; }
    if (b.dataset.t) { tool(b); return; }
    if (b.dataset.g) give(b); });

  /* ---------- 1. PLACING: the whole town is a grid, the ghost follows your finger ---------- */
  const snap = (x, y) => [Math.round(x / GRID) * GRID, Math.round(y / GRID) * GRID];
  const walkable = (px, py) => { const gx = Math.floor((px + MAPX) / TG), gy = Math.floor(py / TG); return gx >= 0 && gy >= 0 && gx < TGW && gy < TGH && typeof TOWNG !== 'undefined' && TOWNG && TOWNG[gy * TGW + gx] === 1; };
  function fits(id, x, y) { const im = pim(id); if (!im) return false; const w = im.width, h = im.height;
    for (let yy = y + Math.round(h * .45); yy <= y + h + 4; yy += TG) for (let xx = x + 3; xx <= x + w - 3; xx += TG) if (!walkable(xx, yy)) return false;   // its footprint stands on ground you can walk on
    let hit = false; try { for (const o of dayImg('cabins')) if (x < o.x + o.img.width - 6 && x + w > o.x + 6 && y < o.y + o.img.height && y + h > o.y + 20) hit = true; } catch (e) {}
    for (const b of BUILDINGS) if (x < b.x + b.w && x + w > b.x && y < b.y + b.h + 12 && y + h > b.y) hit = true;   // never across a cabin, the Tavern, the Casino or another project
    return !hit; }
  function placeStart(id, move) { const m = WL.me, im = pim(id); if (!m || !im) return; if (m.loc >= 0) { wlSay('Go out into the town first.'); return; }
    document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); const [x, y] = snap(m.x - im.width / 2, m.y + 14 - im.height);
    const at0 = move && (PJ.cur && PJ.cur.id === id ? PJ.cur : PJ.done[id]); PJ.ghost = at0 && at0.x != null ? {id, x: at0.x | 0, y: at0.y | 0, move: true} : {id, x, y, move: !!move}; PJ.sig = ''; sync(); PJ.drag = null; $('#pjBarN').textContent = PROJECTS[id][0]; $('#pjBar').classList.add('on'); $('#townHud').classList.add('decorating'); bar(); sfx('click'); }
  function placeStop() { PJ.ghost = null; PJ.drag = null; $('#pjBar').classList.remove('on'); $('#townHud').classList.remove('decorating'); PJ.sig = ''; sync(); }
  const bar = () => { const g = PJ.ghost; if (g) $('#pjYes').disabled = !fits(g.id, g.x, g.y); };
  $('#pjNo').onclick = () => { sfx('close'); placeStop(); };
  $('#pjYes').onclick = async () => { const g = PJ.ghost; if (!g || !fits(g.id, g.x, g.y)) return; const done = btnBusy($('#pjYes'), '…');
    try { if (g.move) { const t = PJ.cur && PJ.cur.id === g.id ? PJ.cur : PJ.done[g.id]; if (!PJ.lab) await srv('projMove', {wid: NET.world, id: g.id, x: g.x, y: g.y}); if (t && typeof t === 'object') { t.x = g.x; t.y = g.y; } }
      else if (PJ.lab) PJ.cur = {id: g.id, x: g.x, y: g.y, have: {}}; else await srv('projStart', {wid: NET.world, id: g.id, x: g.x, y: g.y}); PJ.pick = false; sfx('rare'); placeStop(); }
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
  function sync() { if (typeof BUILDINGS === 'undefined') return; const want = [], up = PJ.ghost && PJ.ghost.move ? PJ.ghost.id : null;   // up = the one being carried: off the ground
    for (const id of Object.keys(PJ.done)) { const d = PJ.done[id]; if (id !== up && PROJECTS[id] && pim(id) && d && typeof d === 'object') want.push({id, x: d.x | 0, y: d.y | 0, k: 1}); }
    if (PJ.cur && PJ.cur.id !== up && PROJECTS[PJ.cur.id] && pim(PJ.cur.id)) want.push({id: PJ.cur.id, x: PJ.cur.x | 0, y: PJ.cur.y | 0, k: progress(PJ.cur)});
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
    const h = `<b>${PROJECTS[cur.id][0]}</b><small>${PROJECTS[cur.id][1]}</small>${rows(cur)}${tools()}`; if (el.dataset.h !== h && !el.querySelector('.sure')) { el.dataset.h = h; el.innerHTML = h; } el.classList.add('on'); }
  $('#pjPop').addEventListener('click', e => { const t = e.target.closest('button[data-t]'); if (t) tool(t); else give(e.target.closest('button[data-g]')); });
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
