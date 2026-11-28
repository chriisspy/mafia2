/* ================= THE CRYSTAL SHOP'S POWERS (28 Nov 2026, his ask) =================
   "we need to make the items in the crystal shop be WAY more worth it... like how the Godfather has a car and the Alien can abduct people."
   His picks from my list: 2, 8, 11, 14, 18, 19. cx.js is the shop and what you own; this file is what they DO.
     SHRINK RAY    tap a player: a new button zaps them tiny for 10 seconds.
     BANANA PEEL   tap YOURSELF: drop a peel at your feet. Whoever walks on it goes flying. (Yours never trips you.)
     JETPACK       tap yourself: put it on. A BOOST button shows: hold it and you climb higher and higher, let go and you fall. In the air you go over
                   everything, the way the Alien does, quicker than walking.
     DRAGON        tap yourself: ride a big Shard. It flies too, and breathes blue fire that knocks people flat.
     ENTRANCES     how you arrive in a world: a lightning bolt, a UFO's beam, or falling out of the sky.
     CRYSTAL CABIN your hut in the ring, in crystal (a CABIN_THEMES entry, once its picture is in assets/cabins/crystal.png).
   His rule the same day: "any special or rare thing added to this game MUST be sprite stacked and 3d": the dragon, the jetpack and the peel are
   sprite stacks (tools/make_rides.py -> assets/rides), drawn by the game's own stackFrame.
   Everyone sees them. What you are riding, your entrance and your cabin ride in what you already send about yourself (index.html netM: pw);
   a zap, a peel, a slip and a breath of fire are events like a punch (pwshr, pwpeel, pwslip, pwfire). Every phone works out for itself whether
   ITS player slipped or got burnt, the same as the Getaway Car's hits. All of it is off during a round of Mafia. The waits are mine. */
(() => {
  const PW = {peels: [], fx: [], cd: {}, joinT: performance.now(), ready: {}, self: false};
  const NOW = () => performance.now(), TAU = Math.PI * 2, own = id => !!(window.cxOwn && cxOwn('p_' + id)), inRound = () => typeof GAME !== 'undefined' && !!GAME.on;
  const MOUNT_H = 32, ALT_MAX = 150, JET_UP = 95, JET_G = 330;   // how high the dragon holds itself; how high a jetpack can climb, how fast, and how hard it falls (px, px a second)
  const AIR = 1e5;   // somebody in the air is drawn over everything on the ground (a roof never hides them); flyers still sort among themselves
  const SHR_T = 10, CD = {shrink: 45000, peel: 20000, fire: 6000}, cdLeft = k => Math.max(0, (PW.cd[k] || 0) - NOW());
  const DIRA = {front: 0, back: Math.PI, right: -Math.PI / 2, left: Math.PI / 2}, DIRV = {front: [0, 1], back: [0, -1], right: [1, 0], left: [-1, 0]};
  const pxArt = (R, C) => { const c = mk(R[0].length, R.length), x = c.getContext('2d'); R.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return c; };
  const K = '#181425';
  const GUN = pxArt(['..KKKKKKK....', '.KCCCCCCCKK..', 'KWCCCCCCCGGK.', '.KCCCCCCCKK..', '..KKKPPKK....', '....KPPK.....', '....KPPK.....', '....KKKK.....'], {K, C: '#7fe3ff', W: '#ffffff', G: '#8dff8a', P: '#8f4fd8'});
  const FLAME = pxArt(['....K....', '...KBK...', '..KBBK...', '..KBCBK..', '.KBCCBK..', '.KBCWCBK.', 'KBCWWCBK.', 'KBCWWWCBK', 'KBCCWCCBK', '.KBCCCBK.', '..KKKKK..'], {K, B: '#2f8fe0', C: '#7fd8ff', W: '#eaffff'});
  const BOLT = pxArt(['....KKKK.', '...KYYYK.', '..KYYYK..', '.KYYYK...', 'KYYYYKKK.', 'KKKYYYYK.', '..KYYYK..', '.KYYYK...', '.KYYK....', 'KYYK.....', 'KYK......', 'KK.......'], {K, Y: '#ffe45c'});
  const FALL = pxArt(['.C..C..C.', '.C..C..C.', '....C....', '....K....', '...KYK...', 'KKKKYKKKK', 'KYYYYYYYK', '.KYYYYYK.', '.KYYKYYK.', 'KYYK.KYYK', 'KKK...KKK'], {K, Y: '#ffe45c', C: '#c0cbdc'});
  const BEAM = pxArt(['...KKKKK...', '..KGGGGGK..', '.KKKKKKKKK.', 'KSSSSSSSSSK', '.KKKKKKKKK.', '...CCCCC...', '...CCCCC...', '..CCCCCCC..', '..CCCCCCC..', '.CCCCCCCCC.', '.CCCCCCCCC.', 'CCCCCCCCCCC'], {K, G: '#8dff8a', S: '#c0cbdc', C: '#8cffe1'});
  const HEAD = pxArt(['KK.......KK', 'KWK.....KWK', '.KWKKKKKWK.', '.KBBBBBBBK.', 'KBBBBBBBBBK', 'KBKWBBBKWBK', 'KBKKBBBKKBK', 'KBBBBBBBBBK', '.KBBKBKBBK.', '..KKKKKKK..'], {K, B: '#2f86e0', W: '#ffffff'});
  const PACK = pxArt(['.KK...KK.', 'KSSK.KSSK', 'KRRKKKRRK', 'KRRKSKRRK', 'KRRKKKRRK', 'KRRK.KRRK', 'KSSK.KSSK', '.KK...KK.', '.YY...YY.', '.OY...YO.', '..O...O..'], {K, R: '#e43b44', S: '#c0cbdc', Y: '#ffe45c', O: '#ffb24a'});
  const NANA = pxArt(['.....KK....', '....KBBK...', '....KYYK...', '...KYYYK...', '..KYYWYYK..', '.KYYKKKYYK.', 'KYYK...KYYK', 'KYK.....KYK', 'KK.......KK'], {K, Y: '#ffd23e', W: '#fff2a8', B: '#6b461e'});
  const BLANK = mk(1, 1);
  const SHADOW = (() => { const c = mk(57, 22), x = c.getContext('2d'); x.fillStyle = 'rgba(15,11,30,.36)'; for (let y = 0; y < 22; y++) { const hw = Math.round(28 * Math.sqrt(Math.max(0, 1 - ((y - 10.5) / 11) ** 2))); x.fillRect(28 - hw, y, hw * 2 + 1, 1); } return c; })();   // a solid oval under the dragon (the game's shadows are hard-edged)

  SFX.pwzap = () => { tone(1400, .22, {type: 'sawtooth', vol: .09, to: 300}); tone(2100, .12, {type: 'sine', vol: .07, to: 900, at: .02}); };
  SFX.pwslip = () => { tone(520, .28, {type: 'sine', vol: .14, to: 1300}); hiss(.1, {vol: .12, lp: 2500}); };
  SFX.pwbolt = () => { hiss(.5, {vol: .3, lp: 900}); tone(90, .5, {type: 'sawtooth', vol: .2, to: 40}); tone(1800, .06, {type: 'square', vol: .1}); };
  SFX.pwjet = () => { hiss(.45, {vol: .16, lp: 1800}); tone(140, .4, {type: 'triangle', vol: .1, to: 320}); };
  SFX.pwfire = () => { hiss(.8, {vol: .22, lp: 1400}); tone(110, .7, {type: 'sawtooth', vol: .12, to: 70}); };
  SFX.pwwing = () => { hiss(.42, {vol: .2, lp: 520}); hiss(.2, {vol: .09, lp: 1500, at: .05}); tone(150, .4, {type: 'sine', vol: .07, to: 62}); };   // one beat of big wings: a low rush of air
  SFX.pwburn = () => { hiss(.2, {vol: .11, lp: 1700}); tone(95, .18, {type: 'sawtooth', vol: .035, to: 120}); };   // the jetpack burning (played over and over while the boost is held)

  // the 3D things: each one is registered as a stack the moment its picture is in (px: 1 = at the cast's own pixel size)
  fetch('assets/rides/rides.json?v=' + BUILD).then(r => r.json()).then(M => { for (const id in M) { const m = M[id];
    STACK['ride_' + id] = {s: m.s, n: m.n, squash: m.squash, hover: 0, ground: 1, px: id === 'mount' ? 0 : 1, rows: m.rows || 1, seat: m.seat | 0};   /* the dragon is drawn DOUBLED, like the Alien's saucer and the Getaway Car: it has to be big enough to ride */
    load('stack/ride_' + id, 'assets/rides/' + id + '.png').then(im => { PW.ready[id] = true; if (id === 'mount') { STACK.ride_mount1 = Object.assign({}, STACK.ride_mount, {px: 1}); IMG['stack/ride_mount1'] = IMG['stack/ride_mount']; } }).catch(() => {}); } }).catch(() => {});
  const frame = (id, row, ai) => PW.ready[id] ? stackFrame('ride_' + id, row, ((ai % 48) + 48) % 48) : null;
  const aiOf = a => Math.round(a / TAU * 48);

  /* ---------- telling the others ---------- */
  function ev(k, to, more) { if (typeof NET === 'undefined' || !NET.on) return; const m = WL.me; NET.ref.child('ev').push(Object.assign({k, by: NET.uid, to: to || null, x: Math.round(m.x), y: Math.round(m.y), loc: m.loc, ts: TS()}, more || {})).catch(() => {}); }
  window.pwOut = () => { const m = WL.me, f = m && m.fly, e = window.cxSel && cxSel('ent'), c = window.pwCabin && window.cxSel && cxSel('cab'); return f || e || c ? {f: f || null, b: f === 'j' && PW.boost ? 1 : null, e: e || null, c: c || null} : null; };
  window.pwIn = (e, pw) => { pw = pw || {}; const first = !e.pwSeen; e.pwSeen = 1; const f = pw.f === 'j' || pw.f === 'm' ? pw.f : 0;
    if ((e.fly || 0) !== f) { e.fly = f; e.air = f === 'm' ? 1 : 0; e.alt = 0; e.jv = 0; if (WL.me && e.loc === WL.me.loc) puffAt(e.x, e.y - 4, 8); } e.boost = f === 'j' && !!pw.b;
    if (first && ENTS[pw.e] && NOW() - PW.joinT > 4000) e.ent = {k: pw.e, t0: NOW() + 150};   // somebody walked into the world you are already in: their entrance plays
    const cb = pw.c === 'crystal' ? 'crystal' : null; if (cb !== (e.cab || null)) { e.cab = cb; cabRefresh(); } };
  window.pwNet = (v, e) => {   // index.html netEvent hands every event here first; true = it was one of these
    if (v.k === 'pwshr') { const tg = v.to === NET.uid ? WL.me : NET.ents.get(v.to); if (tg) shrink(e, tg); return true; }
    if (v.k === 'pwpeel') { PW.peels.push({x: +v.x || 0, y: +v.y || 0, loc: v.loc, by: v.by, t0: NOW(), r: (v.x * 7 + v.y * 3 | 0) % 48}); return true; }
    if (v.k === 'pwslip') { peelTake(+v.px, +v.py, v.loc); if (!e.ko) { e.path = []; e.todo = null; e.act = null; e.walk = false; e.x = +v.x || e.x; e.y = +v.y || e.y; e.ko = {t: 0, vx: +v.vx || 0, vy: +v.vy || 0, fly: 1}; if (WL.me && e.loc === WL.me.loc) sfx('pwslip'); } return true; }
    if (v.k === 'pwfire') { e.x = +v.x || e.x; e.y = +v.y || e.y; fire(e, +v.a || 0); return true; }
    return false; };

  /* ---------- SHRINK RAY ---------- */
  function shrink(by, tg, send) { if (!tg || tg.car || tg.loc !== by.loc) return; tg.shr = {t0: NOW()}; PW.fx.push({k: 'zap', a: by, b: tg, t0: NOW(), loc: by.loc});
    by.dir = dirFrom(tg.x - by.x, tg.y - by.y); if (WL.me && by.loc === WL.me.loc) sfx('pwzap'); if (tg === WL.me) WL.shake = .15; if (send) ev('pwshr', tg.uid); }
  function shrinkTap(tg) { const m = WL.me; if (!own('shrink') || inRound() || cdLeft('shrink') || !tg || m.ko) return;
    const go = () => { if (tg.loc !== m.loc || Math.hypot(tg.x - m.x, tg.y - m.y) > 130 || cdLeft('shrink')) return; PW.cd.shrink = NOW() + CD.shrink; shrink(m, tg, true); };
    const d = Math.hypot(tg.x - m.x, tg.y - m.y); if (d <= 110) go(); else { const a = Math.atan2(m.y - tg.y, m.x - tg.x); wlGo(m, tg.x + Math.cos(a) * 70, tg.y + Math.sin(a) * 40, go); } }   // too far for the ray: walk into range first

  /* ---------- BANANA PEEL ---------- */
  function peelDrop() { const m = WL.me; if (!own('peel') || inRound() || cdLeft('peel') || m.ko || m.fly || m.car || m.seat) return; PW.cd.peel = NOW() + CD.peel;
    PW.peels.push({x: Math.round(m.x), y: Math.round(m.y), loc: m.loc, by: null, mine: true, t0: NOW(), r: (m.x * 7 + m.y * 3 | 0) % 48}); sfx('shove'); ev('pwpeel'); }
  function peelTake(x, y, loc) { let bi = -1, bd = 14; PW.peels.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (p.loc === loc && d < bd) { bd = d; bi = i; } }); if (bi >= 0) PW.peels.splice(bi, 1); }
  function slip(e, p) { const v = DIRV[e.dir] || [0, 1], vx = v[0] * 250, vy = v[1] * 250; e.path = []; e.todo = null; e.act = null; e.walk = false; e.ko = {t: 0, vx, vy, fly: 1};
    if (WL.me && e.loc === WL.me.loc) sfx('pwslip'); if (e === WL.me) { WL.shake = .3; WL.sel = null; wlMenu(); selfShow(false); ev('pwslip', null, {px: p.x, py: p.y, vx, vy}); } }

  /* ---------- JETPACK and DRAGON: e.fly = 'j' | 'm'. index.html treats a flyer the way it treats the Alien (isFly): over trees, cabins and the lake ---------- */
  function flySet(m, k) { k = k || 0; if ((m.fly || 0) === k) return; if (k && (m.loc >= 0 || m.seat || m.ko || m.ab || m.abTg || m.car || inRound() || isUfo(m) || !own(k === 'm' ? 'mount' : 'jet'))) return;
    if (!k && m.air) { const q = nearOk(m.loc, m.x, m.y); m.x = q[0]; m.y = q[1]; }   // landed in the middle of a tree: step to the nearest clear ground
    m.fly = k; m.air = k === 'm' ? 1 : 0; m.alt = 0; m.jv = 0; PW.boost = false; m.fire = null; m.path = []; m.todo = null; puffAt(m.x, m.y - 4, 12); sfx(k === 'm' ? 'pwwing' : k ? 'pwjet' : 'door'); if (typeof netMove === 'function') netMove(); }
  function fire(e, a) { e.fire = {t0: NOW(), a}; if (WL.me && e.loc === WL.me.loc) sfx('pwfire'); }
  function fireTap() { const m = WL.me; if (m.fly !== 'm' || cdLeft('fire') || inRound()) return; PW.cd.fire = NOW() + CD.fire; const a = (m.ma || 0) + Math.PI / 2; fire(m, a); ev('pwfire', null, {a: +a.toFixed(2)}); }
  function fireHits(e) { const a = e.fire.a, hx = Math.cos(a), hy = Math.sin(a);   // every phone: is one of MY people in the fire? (dragon's mouth out to 80, a cone)
    for (const p of [WL.me, ...(WL.bots || [])]) { if (!p || p === e || p.remote || p.loc !== e.loc || p.ko || p.car || p.seat || p.ab) continue;
      const dx = p.x - e.x, dy = (p.y - e.y) / .55, d = Math.hypot(dx, dy); if (d < 30 || d > 125) continue; if ((dx * hx + dy * hy) / d < .8) continue;
      p.path = []; p.todo = null; p.act = null; p.walk = false; p.ko = {t: 0, vx: hx * 300, vy: hy * 300 * .55, fly: 1}; WL.fx.push({k: 'pow', x: p.x, y: p.y - 18, t: 0, loc: p.loc}); if (p === WL.me) { WL.shake = .35; WL.sel = null; wlMenu(); } } }

  /* ---------- how each of them changes the way a person is drawn (wlDraw's record) ---------- */
  const back = p => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;
  function deco(e, o, t) { const n = NOW();
    if (e.shr) { const el = (n - e.shr.t0) / 1000; if (el >= SHR_T) e.shr = null; else if (!e.car) o.shr = el < .3 ? 1 - .5 * back(el / .3) : el > SHR_T - .3 ? .5 + .5 * (el - (SHR_T - .3)) / .3 : .5; }
    if (e.fly && !e.car) {
      if (e.fly === 'm') { const dx = e.x - (e.mpx ?? e.x), dy = e.y - (e.mpy ?? e.y), mv = Math.hypot(dx, dy); e.mpx = e.x; e.mpy = e.y; e.mmv = mv > .05 && mv < 14;
        if (e.ma == null) e.ma = DIRA[e.dir] || 0; if (e.fire && n - e.fire.t0 < 900) e.ma = e.fire.a - Math.PI / 2; else if (e.mmv) { const ta = Math.atan2(dy, dx) - Math.PI / 2; e.ma += (((ta - e.ma) % TAU + TAU * 1.5) % TAU - Math.PI) * .2; }
        /* THE WING BEAT (his ask: "slower, and more grand", with a whoosh): one beat takes a second and a half. The wings come UP slowly (0 to .6 of the beat),
           then sweep DOWN fast: that push lifts the whole dragon, and it sinks again as they rise. e.mf = where in the beat it is; e.mrow = the picture. */
        { const dt = Math.min(.05, (n - (e.mfT || n)) / 1000), p0 = e.mf || 0, p = (p0 + dt / (e.mmv ? 1.35 : 1.7)) % 1; e.mfT = n; e.mf = p;
          e.mrow = p < .6 ? 4 - Math.min(4, Math.floor(p / .6 * 5)) : Math.min(4, Math.floor(((p - .6) / .4) ** .7 * 5));
          if (p0 < .6 && p >= .6 && WL.me && e.loc === WL.me.loc) sfx('pwwing'); }
        e.air = 1; const D = STACK.ride_mount, hov = MOUNT_H + Math.round(Math.sin((e.mf - .82) * TAU) * 5), hx = Math.cos(e.ma + Math.PI / 2), hy = Math.sin(e.ma + Math.PI / 2); e.mh = hov;
        o.x -= hx * 6; o.y -= hy * 6 * .55; o.lift = (o.lift || 0) + hov + (D ? D.seat : 21) * 2 - 5; o.walk = false; o.noShadow = true;   /* (his note) one shadow only: the dragon's big one */ o.sortY = AIR + e.y + .5; }   // sat in the saddle, a little behind the middle of its back
      else { const dt = Math.min(.05, (n - (e.jT || n)) / 1000), b = e === WL.me ? PW.boost : e.boost, was = e.alt || 0; e.jT = n; e.jv = e.jv || 0;   // THE JETPACK (his ask): hold the boost button and you climb, higher and higher; let go and you fall
        if (b) e.jv = Math.min(JET_UP, e.jv + 420 * dt); else e.jv -= JET_G * dt;
        e.alt = was + e.jv * dt; if (e.alt >= ALT_MAX) { e.alt = ALT_MAX; e.jv = Math.min(e.jv, 0); }
        if (e.alt <= 0) { if (was > 0) { const hard = e.jv < -150, near = WL.me && e.loc === WL.me.loc; if (near) { puffAt(e.x, e.y - 2, hard ? 16 : 6); if (hard) sfx('shove'); } if (e === WL.me) { if (hard) WL.shake = .2; if (!wlOk(e.loc, e.x, e.y)) { const q = nearOk(e.loc, e.x, e.y); e.x = q[0]; e.y = q[1]; } if (typeof netMove === 'function') netMove(); } }   /* came down on a roof or in a tree: step to the nearest clear ground */
          e.alt = 0; e.jv = Math.max(0, e.jv); }
        e.air = e.alt > 2; e.jh = Math.round(e.alt); if (e.alt > 0) { o.lift = (o.lift || 0) + e.jh; o.walk = false; if (e.air) o.sortY = AIR + e.y; }
        if (b && e === WL.me && n - (PW.burnT || 0) > 170) { PW.burnT = n; sfx('pwburn'); } } }
    if (e.ent) { const el = (n - e.ent.t0) / 1000, k = e.ent.k, near = WL.me && e.loc === WL.me.loc;
      if (el < 0) o.alpha = 0;
      else if (k === 'bolt') { if (!e.ent.s) { e.ent.s = 1; if (near) sfx('pwbolt'); if (e === WL.me) WL.shake = .3; } if (el < .1) o.alpha = 0; if (el > .9) e.ent = null; }
      else if (k === 'beam') { if (!e.ent.s) { e.ent.s = 1; if (near) sfx('abduct'); } if (el < 1.3) { const p = el / 1.3; o.lift = (o.lift || 0) + Math.round(58 * (1 - p * p * (3 - 2 * p))); o.walk = false; } if (el > 1.9) e.ent = null; }
      else { const T = .55; if (el < T) { const p = el / T; o.lift = (o.lift || 0) + Math.round(230 * (1 - p * p)); o.walk = false; } else { if (!e.ent.s) { e.ent.s = 1; puffAt(e.x, e.y - 2, 20); if (near) sfx('punch'); if (e === WL.me) WL.shake = .4; } if (el > T + .5) e.ent = null; } } } }
  { const wd = wlDraw; wlDraw = function (e, t) { const o = wd(e, t); try { deco(e, o, t); } catch (er) {} return o; }; }
  // SHRUNK: the whole person (their shadow too) is drawn at half size about their feet
  { const dc = drawChar; drawChar = function (c) { const k = c && c.shr; if (!k || k === 1) return dc(c); const fx = XP(c.x), fy = YP(c.y); lx.save(); lx.translate(fx, fy); lx.scale(k, k); lx.translate(-fx, -fy); let r; try { r = dc(c); } finally { lx.restore(); }
      if (r) { if (r.top != null) r.top = fy - (fy - r.top) * k; if (r.box) r.box = [fx - (fx - r.box[0]) * k, fy - (fy - r.box[1]) * k, fx - (fx - r.box[2]) * k, fy - (fy - r.box[3]) * k]; } return r; }; }

  /* ---------- the things drawn beside them: the dragon, the pack and its fire, the peels, a zap, an entrance ---------- */
  const FIRE_C = ['#eaffff', '#7fd8ff', '#2f8fe0', '#1b4fa8'];
  function things(e, t, add) { const n = NOW();
    if (e.fly === 'm' && !e.car) { const on = e.fire && n - e.fire.t0 < 900, row = on ? 5 : e.mrow | 0, im = frame('mount', row, aiOf(e.ma || 0));
      if (im) { const D = STACK.ride_mount, h = Math.round(D.s * D.squash), hov = e.mh || MOUNT_H;
        add.push({img: SHADOW, x: Math.round(e.x - 28), y: Math.round(e.y - 11), base: e.y - 2});
        add.push({img: im, x: Math.round(e.x - im.width / 2), y: Math.round(e.y - im.height + 4 + h - hov), base: AIR + e.y - 1}); }
      if (e.fire && !e.fire.hit && n - e.fire.t0 > 250) { e.fire.hit = 1; fireHits(e); }
      if (on) { const el = (n - e.fire.t0) / 1000, a = e.fire.a, hov = (e.mh || MOUNT_H) + 28, mx = e.x + Math.cos(a) * 40, my = e.y + Math.sin(a) * 40 * .55;
        add.push({img: BLANK, x: 0, y: 0, base: AIR + e.y + (Math.sin(a) >= 0 ? Math.sin(a) * 60 + 2 : -3), after() { for (let i = 0; i < 46; i++) { const p = (el * 2.4 + i * .137) % 1; if (p > el * 2.4) continue;
            const sp = (((i * 7919) % 101) / 101 - .5) * .7 * (.3 + p), d = 4 + p * 78, wx = mx + Math.cos(a + sp) * d, wy = my + Math.sin(a + sp) * d * .55, hh = hov * (1 - p * .75), s = p < .3 ? 4 : p < .7 ? 3 : 2;
            lx.fillStyle = FIRE_C[Math.min(3, Math.floor(p * 4 + ((i + Math.floor(t / 60)) % 2) * .6))]; lx.fillRect(Math.round(X(wx)) - (s >> 1), Math.round(Y(wy) - hh) - (s >> 1), s, s); } }}); } }
    if (e.fly === 'j' && !e.car) { const v = DIRV[e.dir] || [0, 1], bk = e.dir === 'back', lift = e.jh | 0, burn = e === WL.me ? PW.boost : e.boost, up = e.air ? AIR : 0, bx = e.x - v[0] * 4, by = e.y - v[1] * 2, im = frame('jet', 0, aiOf(DIRA[e.dir] || 0)), side = v[0] !== 0;
      const sm = e.js || (e.js = []); if (burn && n - (e.jsT || 0) > 55 && sm.length < 18) { e.jsT = n; sm.push({x: bx + (Math.random() - .5) * 3, y: by, h: lift + 2, t0: n}); }
      while (sm.length && n - sm[0].t0 > 650) sm.shift();
      if (im) add.push({img: im, x: Math.round(bx - im.width / 2), y: Math.round(by - im.height + 4 - lift - 6), base: up + e.y + (bk ? 1 : -1)});
      add.push({img: BLANK, x: 0, y: 0, base: up + e.y + (bk ? 1.1 : -1.1), after() { const sx = Math.round(X(bx)), sy = Math.round(Y(by) - lift - 5), f = Math.floor(t / 55);
          for (const p of sm) { const k = (n - p.t0) / 650, s = k < .5 ? 2 : 3; lx.fillStyle = k < .35 ? '#eef1f7' : k < .7 ? '#c0cbdc' : '#8b9bb4'; lx.fillRect(Math.round(X(p.x)) - 1, Math.round(Y(p.y) - p.h + k * 9), s, s); }
          if (burn) for (const dx of side ? [0] : [-2, 2]) { const L = 6 + ((f + dx) & 1) * 2 + ((f >> 1) & 1) * 2;   /* fire only while the boost is held */ lx.fillStyle = '#fff2a8'; lx.fillRect(sx + dx, sy, 1, 2); lx.fillStyle = '#ffb24a'; lx.fillRect(sx + dx, sy + 2, 1, L - 1); lx.fillStyle = '#e8562a'; lx.fillRect(sx + dx, sy + 1 + L, 1, 1); } }}); }
    if (e.ent) { const el = (n - e.ent.t0) / 1000, k = e.ent.k; if (el < 0) return;
      if (k === 'bolt') add.push({img: BLANK, x: 0, y: 0, base: e.y + 3, after() { const fx = Math.round(X(e.x)), fy = Math.round(Y(e.y));
          if (el < .22) { let x = fx; const seed = (e.i | 0) * 31 + Math.floor(el / .06) * 17; for (let y = fy; y > -4; y -= 6) { const j = ((Math.sin(y * 12.9 + seed) * 43758.5) % 1) * 7; const nx = fx + Math.round(j * Math.min(1, (fy - y) / 30)); lx.fillStyle = '#ffe45c'; lx.fillRect(Math.min(x, nx) - 2, y - 6, Math.abs(nx - x) + 4, 6); lx.fillStyle = '#ffffff'; lx.fillRect(Math.min(x, nx) - 1, y - 6, Math.abs(nx - x) + 2, 6); x = nx; }
            lx.fillStyle = '#ffffff'; lx.fillRect(fx - 9, fy - 2, 19, 3); lx.fillRect(fx - 5, fy - 4, 11, 7); }
          else { const p = (el - .22) / .68; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, d = 6 + p * 26; lx.fillStyle = p < .5 ? '#ffffff' : '#ffe45c'; const s = p < .6 ? 2 : 1; lx.fillRect(Math.round(fx + Math.cos(a) * d), Math.round(fy - 2 + Math.sin(a) * d * .5 - Math.sin(p * Math.PI) * 6), s, s); } } }});
      else if (k === 'beam') { const ufo = STACK.ufo && IMG['stack/ufo'] ? stackFrame('ufo', Math.floor(t / 320) % 2, 0) : null, up = el > 1.3 ? ((el - 1.3) / .6) ** 2 * 260 : 0, top = e.y - 62 - up;
        if (el < 1.3) add.push({img: BLANK, x: 0, y: 0, base: e.y - 3, after() { stackBeam(Math.round(X(e.x)), Math.round(Y(e.y)), Math.round(Y(e.y)) - 62, Math.min(1, el * 4, (1.3 - el) * 5), t); }});
        if (ufo) add.push({img: ufo, x: Math.round(e.x - ufo.width / 2), y: Math.round(top - ufo.height + 12), base: e.y + 4}); } }
  }
  function extras(m, t, add) { const n = NOW();
    for (const p of PW.peels) { if (p.loc !== m.loc) continue; const im = frame('peel', 0, p.r); if (!im) continue; const D = STACK.ride_peel, h = Math.round(D.s * D.squash); add.push({img: im, x: Math.round(p.x - im.width / 2), y: Math.round(p.y - im.height + 2 + h / 2), base: p.y - 3}); }
    for (let i = PW.fx.length - 1; i >= 0; i--) { const f = PW.fx[i], el = (n - f.t0) / 1000; if (el > .4) { PW.fx.splice(i, 1); continue; } if (f.loc !== m.loc) continue;
      add.push({img: BLANK, x: 0, y: 0, base: Math.max(f.a.y, f.b.y) + 2, after() { const ax = X(f.a.x), ay = Y(f.a.y) - 12, bx = X(f.b.x), by = Y(f.b.y) - 8, N = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay) / 2)), fl = Math.floor(t / 40);
          for (let j = 0; j <= N * Math.min(1, el * 8); j++) { const k = j / N, w = ((j + fl) % 3) - 1; lx.fillStyle = (j + fl) % 2 ? '#7fe3ff' : '#ffffff'; lx.fillRect(Math.round(ax + (bx - ax) * k), Math.round(ay + (by - ay) * k) + w, 2, 2); }
          for (let j = 0; j < 8; j++) { const a = j / 8 * TAU + el * 6, d = 5 + el * 22; lx.fillStyle = '#8dff8a'; lx.fillRect(Math.round(bx + Math.cos(a) * d), Math.round(by + Math.sin(a) * d * .7), 1, 1); } }}); } }

  /* ---------- every frame: who must land, who slipped; and where your own menu sits ---------- */
  function tick(t) { const m = WL.me, all = [m, ...(WL.bots || [])], n = NOW();
    for (const e of all) { if (!e || !e.fly) continue; if (e.loc >= 0 || e.seat || e.ko || e.ab || e.car || inRound()) { if (e === m) flySet(m, 0); else if (!e.remote) { e.fly = 0; e.air = 0; } } else if (e.air) e.hitT = n; }
    jetBtn(m);   // (e.hitT: a car on the ground never hits somebody in the air)
    for (let i = PW.peels.length - 1; i >= 0; i--) { const p = PW.peels[i]; if (n - p.t0 > 60000) { PW.peels.splice(i, 1); continue; } if (n - p.t0 < 500) continue;
      for (const e of all) { if (!e || e.remote || e.loc !== p.loc || e.ko || e.air || e.car || e.seat || e.ab || (p.mine && e === m)) continue;
        if (Math.hypot(e.x - p.x, (e.y - p.y) * 1.4) < 7) { PW.peels.splice(i, 1); slip(e, p); break; } } }
    if (PW.self) { const q = WL.pos.get(m), mn = $('#pwMenu'); if (!q || m.ko || !selfHas()) selfShow(false); else { mn.style.left = clamp(q.x, 60, cv.clientWidth - 60) + 'px'; mn.style.top = (q.y - TAG - 10) + 'px'; } } }
  { const ds = drawScene; drawScene = function (people, occ, img, objs) { const m = WL.me;
      if (m && people && people.includes && scene === scenes.town) { const t = NOW(), add = []; try { tick(t); for (const e of [m, ...(WL.bots || [])]) if (e && e.loc === m.loc) things(e, t, add); extras(m, t, add); } catch (er) {}
        if (add.length) objs = [...(objs || []), ...add]; }
      return ds.call(this, people, occ, img, objs); }; }

  /* ---------- the buttons: one more over a player you tap (the ray); and a menu over YOURSELF when you tap yourself ---------- */
  const st = document.createElement('style');
  st.textContent = `#pwMenu{position:absolute;display:none;gap:8px;transform:translate(-50%,-100%);z-index:5}#pwMenu.on{display:flex;animation:tmPop .16s cubic-bezier(.2,1.5,.4,1)}
#pwMenu .btn{width:50px;height:50px;padding:0 0 3px;display:flex;align-items:center;justify-content:center;background:#2a2346;border-color:#0f0b1e;box-shadow:inset 0 -5px 0 #1b1532,0 3px 0 #0009}#pwMenu .btn:active{transform:translateY(2px)}
#pwMenu .btn.sel{background:#1b1532;box-shadow:inset 0 4px 0 #0f0b1e;padding:3px 0 0}#pwMenu .btn.wait,#townMenu .btn.wait{opacity:.4}#pwMenu img,#townMenu img.pw{image-rendering:pixelated;pointer-events:none}`;
  document.head.appendChild(st);
  const pic = (im, s, cls) => `<img class="${cls || ''}" src="${im.toDataURL()}" style="width:${im.width * s}px;height:${im.height * s}px" alt="">`;
  $('#townMenu').insertAdjacentHTML('beforeend', `<button class="btn" data-a="shrink" style="display:none">${pic(GUN, 3, 'pw')}</button>`);
  $('#townMenu [data-a=shrink]').onclick = () => { const tg = WL.sel; if (!tg || WL.me.ko) return; WL.sel = null; wlMenu(); shrinkTap(tg); };
  { const wm = wlMenu; wlMenu = function () { wm.apply(this, arguments); const b = $('#townMenu [data-a=shrink]'), m = WL.me, s = WL.sel; if (!b) return;
      b.style.display = own('shrink') && !inRound() && m && s && !m.abTg && !s.car && !s.shr ? '' : 'none'; b.classList.toggle('wait', !!cdLeft('shrink')); if (s) selfShow(false); }; }
  $('#townMenu').insertAdjacentHTML('afterend', '<div id="pwMenu"></div>');
  function menuBuild() { $('#pwMenu').innerHTML = `<button class="btn" data-a="peel">${pic(NANA, 3)}</button><button class="btn" data-a="jet">${pic(PACK, 3)}</button><button class="btn" data-a="mount">${pic(HEAD, 3)}</button><button class="btn" data-a="fire">${pic(FLAME, 3)}</button>`; }
  menuBuild();
  const selfHas = () => !inRound() && (own('peel') || own('jet') || own('mount'));
  function selfShow(on) { const m = WL.me, mn = $('#pwMenu'); on = !!(on && m && selfHas()); PW.self = on; mn.classList.toggle('on', on); if (!on) return; const out = m.loc < 0 && !m.car && !m.seat && !isUfo(m);
    for (const b of mn.children) { const a = b.dataset.a; b.style.display = (a === 'peel' ? own('peel') && !m.fly && !m.car : a === 'jet' ? own('jet') && out && m.fly !== 'm' : a === 'mount' ? own('mount') && out && m.fly !== 'j' : m.fly === 'm') ? '' : 'none';
      b.classList.toggle('sel', (a === 'jet' && m.fly === 'j') || (a === 'mount' && m.fly === 'm')); b.classList.toggle('wait', (a === 'peel' && !!cdLeft('peel')) || (a === 'fire' && !!cdLeft('fire'))); } }
  $('#pwMenu').addEventListener('click', e => { const b = e.target.closest('.btn'), m = WL.me; if (!b || !m || m.ko) return; const a = b.dataset.a;
    if (a === 'peel') peelDrop(); else if (a === 'jet') flySet(m, m.fly === 'j' ? 0 : 'j'); else if (a === 'mount') flySet(m, m.fly === 'm' ? 0 : 'm'); else if (a === 'fire') fireTap();
    selfShow(a === 'mount' && m.fly === 'm'); });   // getting on the dragon leaves the menu up: its fire button is there now
  cv.addEventListener('pointerdown', e => { if (scene !== scenes.town || WL.fading || document.querySelector('.modal.on')) return; const m = WL.me; if (!m || m.ko || !selfHas()) { selfShow(false); return; }
    const q = WL.pos.get(m); if (!q) return; const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (Math.hypot(q.x - px, q.y + 18 - py) >= 22) { selfShow(false); return; }
    for (const [o, p] of WL.pos) if (o !== m && Math.hypot(p.x - px, p.y + 18 - py) < 22) { selfShow(false); return; }   // somebody else is under your finger: it is their menu
    e.stopImmediatePropagation(); WL.sel = null; wlMenu(); selfShow(!PW.self); }, true);

  /* ---------- THE JETPACK'S BOOST BUTTON (his ask): a round button across from the joystick, the Getaway Car's own look. HOLD it to climb; let go and you fall ---------- */
  { const st2 = document.createElement('style'); st2.textContent = `#jetBtn{position:absolute;right:22px;bottom:240px;width:84px;height:84px;z-index:8;display:none;align-items:center;justify-content:center;border:0;padding:0;background:none;touch-action:none;pointer-events:auto;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#jetBtn::before{content:'';position:absolute;inset:0;background:var(--pb) 0 0/100% 100%;image-rendering:pixelated;opacity:.72}#jetBtn.sel::before{opacity:1}#jetBtn.sel{transform:scale(.94)}#jetBtn img{position:relative;image-rendering:pixelated;pointer-events:none}
#phone.land #jetBtn{right:calc(var(--abR,calc(22px + var(--sr))) + 94px);bottom:var(--abB,calc(var(--lb) + 14px))!important}`; document.head.appendChild(st2); }
  $('#phone').insertAdjacentHTML('beforeend', `<button id="jetBtn">${pic(PACK, 5)}</button>`);
  function boostSet(on) { const m = WL.me; on = !!(on && m && m.fly === 'j' && !m.ko); if (PW.boost === on) return; PW.boost = on; $('#jetBtn').classList.toggle('sel', on); if (on) sfx('pwjet'); if (typeof netMove === 'function') netMove(); }
  { const b = $('#jetBtn'); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (er) {} boostSet(true); });
    for (const k of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(k, () => boostSet(false)); b.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('keydown', e => { if (e.code === 'Space' && WL.me && WL.me.fly === 'j' && scene === scenes.town && !/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); boostSet(true); } });   // on a computer: hold Space
    addEventListener('keyup', e => { if (e.code === 'Space') boostSet(false); }); addEventListener('blur', () => boostSet(false)); }
  function jetBtn(m) { const b = $('#jetBtn'), show = !!(m && m.fly === 'j' && scene === scenes.town && m.loc < 0 && !m.ko); if (!show && PW.boost) boostSet(false);
    if (!b.dataset.pb) { const v = $('#punchBtn') && $('#punchBtn').style.getPropertyValue('--pb'); if (v) { b.style.setProperty('--pb', v); b.dataset.pb = 1; } }
    if (b.dataset.s !== String(show)) { b.dataset.s = String(show); b.style.display = show ? 'flex' : 'none'; }
    const j = $('#joy'); if (show && j && (jetBtn.n = (jetBtn.n || 0) + 1) % 20 === 1) { const jb = parseFloat(getComputedStyle(j).bottom); if (jb === jb) b.style.bottom = Math.round(jb + (j.offsetHeight - 84) / 2) + 'px'; } }   // level with the middle of the joystick

  /* ---------- GRAND ENTRANCE: yours plays as you walk into a world ---------- */
  const ENTS = {bolt: 1, beam: 1, fall: 1};
  function arrive() { PW.joinT = NOW(); const k = window.cxSel && cxSel('ent'), m = WL.me; if (m && ENTS[k] && scene === scenes.town) m.ent = {k, t0: NOW() + 350}; }
  { const we = worldEnter; worldEnter = async function () { const r = await we.apply(this, arguments); try { if (typeof NET !== 'undefined' && NET.on) arrive(); } catch (er) {} return r; }; }

  /* ---------- CRYSTAL CABIN: one more CABIN_THEMES entry, worn by whoever has it on ---------- */
  function cabRefresh() { if (!window.pwCabin) return; clearTimeout(PW.cabT); PW.cabT = setTimeout(() => { try { loadCabins().then(() => { if (scene === scenes.town) buildTown(); }); } catch (er) {} }, 50); }
  { const ct = cabinTheme; cabinTheme = function (ci) { if (window.pwCabin) { const p = CABIN_OF.indexOf(ci);
        if (p === 0 && window.cxSel && cxSel('cab') === 'crystal' && CABIN_THEMES.crystal) return 'crystal';
        if (p > 0) { const e = (WL.bots || []).find(b => b && b.i === p); if (e && e.cab === 'crystal' && CABIN_THEMES.crystal) return 'crystal'; } }
      return ct(ci); }; }
  { const im = new Image(); im.onload = () => { CABIN_THEMES.crystal = {name: 'Crystal Cabin', rarity: 'secret', art: () => (typeof XMAS !== 'undefined' && XMAS ? 'assets/cabins/crystal-x.png' : 'assets/cabins/crystal.png')}; window.pwCabin = true; cabRefresh(); }; im.src = 'assets/cabins/crystal.png?v=' + BUILD; }
  window.pwChanged = () => { cabRefresh(); };   // cx.js: something was switched on or off

  /* ---------- the shop's pictures (cx.js calls this for every card, many times a second) ---------- */
  const ICON = {e_bolt: BOLT, e_beam: BEAM, e_fall: FALL};
  window.pwCard = (c, key, t) => { const x = c.getContext('2d'), W = c.width, H = c.height; x.imageSmoothingEnabled = false; x.clearRect(0, 0, W, H); const ai = Math.floor(t / 110) % 48;
    const mid = (im, s, dy) => { if (im) x.drawImage(im, Math.round((W - im.width * s) / 2), Math.round((H - im.height * s) / 2) + (dy | 0), im.width * s, im.height * s); };
    if (key === 'p_mount') mid(PW.ready.mount && STACK.ride_mount1 ? stackFrame('ride_mount1', [4, 3, 2, 1, 0, 0, 2, 4][Math.floor(t / 190) % 8], ai) : null, 1, -4);
    else if (key === 'p_jet') { mid(frame('jet', 0, ai), 2, -3); }
    else if (key === 'p_peel') mid(frame('peel', 0, ai), 3);
    else if (key === 'p_shrink') { mid(GUN, 2, 0); const f = Math.floor(t / 90) % 6; x.fillStyle = f % 2 ? '#7fe3ff' : '#ffffff'; for (let i = 0; i <= f; i++) x.fillRect(W / 2 + 14 + i * 3, H / 2 - 6 + (i % 2), 2, 2); }
    else if (key === 'c_crystal') { const im = IMG['cab/crystal']; if (im) { const s = Math.min(W / im.width, H / im.height); x.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s); } }
    else mid(ICON[key], 1); };

  // the lab: pwLab('bolt' | 'beam' | 'fall') plays an entrance on you; pwLab('j' | 'm' | 0) flies; pwLab('peel', x, y) drops a peel; pwLab('shrink') shrinks you
  window.pwLab = (k, a, b) => { const m = WL.me; if (!m) return; if (ENTS[k]) m.ent = {k, t0: NOW() + 100}; else if (k === 'peel') PW.peels.push({x: a ?? m.x + 20, y: b ?? m.y, loc: m.loc, t0: NOW() - 600, r: 5}); else if (k === 'shrink') m.shr = {t0: NOW()}; else if (k === 'fire') fire(m, (m.ma || 0) + Math.PI / 2); else { m.fly = k || 0; m.path = []; } return PW; };
})();
