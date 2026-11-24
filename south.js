/* ================= THE SOUTH (24 Nov 2026, his ask) =================
   Walk down the road at the bottom of the town and it fades into a new part of the map: the market square, the Blacksmith's
   shop, the gold mine, and the road out to the race track. Same method as the town (his rule): the GROUND is a picture on its
   own (assets/south/day.png, Nano Banana Pro) and every building / entrance / prop is its own picture placed on top
   (tools/make_south.py cuts them all). It is a "place" like the Tavern or the lake: loc 100 + its spot in HALLS.
     SOUTH  = the outdoors (800 x 992, the same scale as the town; the road at the top lines up with the town's road out)
     SMITHY, MINE = their places are registered here (the South's doors need them); everything inside them is mine.js
     the market stalls = market.js */

/* ---------- the places ---------- */
const SOUTH = 100 + HALLS.length;
HALLS.push({k: 'south', name: 'The South', step: 'snow', door: [-999, -999], spawn: [400, 24, 'front'], out: true, spots: [],
  hint: 'Walk up the road to go back to the town', back: [280, 976]});
const SMITHY = 100 + HALLS.length;
HALLS.push({k: 'smithy', name: 'The Blacksmith', step: 'stone', door: [155, 218], spawn: [155, 204], spots: [], exit: SOUTH});   // exit: its door opens onto the South
const MINE = 100 + HALLS.length;
HALLS.push({k: 'mine', name: 'The Mine', step: 'stone', door: [154, 222], spawn: [154, 204], spots: [], exit: SOUTH});

/* ---------- the South's layout: x, y = top left of the picture; base = where its feet are (for sorting); solid = the part you
   cannot walk through [x0, y0, x1, y1]. Edit these numbers to move things. ---------- */
const S_BLD = {k: 'blacksmith', x: 60, y: 175, door: [191, 338]};          // the Blacksmith's shop (206 x 155); his door is right of middle
const S_MINE = {x: 100, y: 590, door: [168, 718]};                          // the mine entrance (131 x 123)
const S_SIGN = {x: 430, y: 198};                                              // the signpost by the road into the square
const S_STALLS = [[284, 285], [334, 285], [422, 285], [472, 285], [284, 415], [334, 415], [422, 415], [472, 415]];   // the market plots (49 x 56)
const S_STALL_COL = ['red', 'blue', 'green'];
const S_RACE = {x: 784, y0: 345, y1: 428};                                    // the road out to the right: the race track (built next)

/* ---------- pictures ---------- */
function southLoad() {
  const L = (k, src) => load(k, src).catch(() => {});
  const jobs = [L('hall/south', 'assets/south/day.png'), L('swalk', 'assets/south/day-walk.png'), L('bld/blacksmith', 'assets/buildings/blacksmith.png'),
    L('s/mine', 'assets/south/mine.png'), L('s/sign', 'assets/south/signpost.png'), ...S_STALL_COL.map(c => L('s/stall-' + c, `assets/south/stall-${c}.png`)),
  ];
  // the Blacksmith + the Mine live in mine.js, the market stalls in market.js: loaded from here (so index.html's boot line stays as it is)
  const side = ['mine.js', 'market.js'].map(f => addScript(f).then(() => { const fn = window[f.replace('.js', 'Load')]; return fn && fn(); }).catch(e => console.warn(e)));
  return Promise.all([...jobs, ...side]).then(southMasks);
}
function addScript(src) { return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src + '?v=' + BUILD; sc.onload = res; sc.onerror = () => rej(new Error('missing ' + src)); document.head.appendChild(sc); }); }

/* walk masks (white = floor), made here so the furniture lists below are the only thing to edit */
function maskCanvas(w, h, floor, blocks, base) {
  const c = mk(w, h), x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  if (base) x.drawImage(base, 0, 0); else { x.fillStyle = '#fff'; for (const r of floor) x.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); }
  x.fillStyle = '#000'; for (const r of blocks) x.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); return c;
}
function southMasks() {
  const g = IMG.swalk; if (!g) return;
  const blocks = [[S_BLD.x + 4, S_BLD.y + 46, S_BLD.x + 202, S_BLD.y + 152], [S_MINE.x + 6, S_MINE.y + 30, S_MINE.x + 125, S_MINE.y + 112],
    [S_SIGN.x + 15, S_SIGN.y + 48, S_SIGN.x + 22, S_SIGN.y + 55], ...S_STALLS.map(([x, y]) => [x + 2, y + 34, x + 47, y + 55])];
  IMG['hallw/south'] = maskCanvas(g.width, g.height, null, blocks, g);
  HALLS[SOUTH - 100].g = null;   // rebuilt from the new mask on first use
}

/* ---------- the town end: down the road at the bottom of the map ---------- */
const TOWN_ROAD = [264, 296];   // the town's road out (x), at the very bottom of the map
function southGate(m, J) {
  if (J.y > .5 && m.y > MAPH - 18 && m.x > TOWN_ROAD[0] && m.x < TOWN_ROAD[1]) { wlDoor(SOUTH); return true; }
  return false;
}
function southTownTap(m, x, y) {
  if (y > MAPH - 40 && x > TOWN_ROAD[0] - 6 && x < TOWN_ROAD[1] + 6) { wlGo(m, 280, MAPH - 10, () => wlDoor(SOUTH)); return true; }
  return false;
}

/* ---------- THE SOUTH, outdoors ---------- */
const SH = HALLS[SOUTH - 100];
SH.from = was => was === SMITHY ? [S_BLD.door[0], S_BLD.door[1], 'front'] : was === MINE ? [S_MINE.door[0], S_MINE.door[1] + 4, 'front'] : null;
function southObjs(m, dt) {
  const out = [], b = IMG['bld/blacksmith'];
  if (b) { const o = {img: b, x: S_BLD.x, y: S_BLD.y, base: S_BLD.y + 100};   /* sorts by the middle of its solid footprint: anyone in front of the wall is drawn over it, anyone behind it under */ const hid = m.y < S_BLD.y + 46 && m.y > S_BLD.y + 6 && m.x > S_BLD.x + 3 && m.x < S_BLD.x + b.width - 3;   /* only when you are really behind it (his catch: walking up to the front wall made it see-through) */
    S_BLD.a = clamp((S_BLD.a ?? 1) + (hid ? -1 : 1) * dt * 4, .45, 1); if (S_BLD.a < 1) o.alpha = S_BLD.a; o.after = () => chimneySmoke(dt); out.push(o); }
  const mi = IMG['s/mine']; if (mi) out.push({img: mi, x: S_MINE.x, y: S_MINE.y, base: S_MINE.y + mi.height - 2});
  const sg = IMG['s/sign']; if (sg) out.push({img: sg, x: S_SIGN.x, y: S_SIGN.y, base: S_SIGN.y + sg.height - 2});
  S_STALLS.forEach(([x, y], i) => { const im = IMG['s/stall-' + S_STALL_COL[window.marketCol ? marketCol(i) : i % 3]]; /* the colour its keeper picked (market.js) */ if (im) out.push({img: im, x, y, base: y + im.height - 2, after: () => stallAfter(i, x, y)}); });
  return out;
}
/* CHIMNEY SMOKE (his ask, 24 Nov): soft grey puffs out of the forge chimney, rising, drifting a little with the wind, growing and fading.
   Solid pixel squares (no blur), drawn over the roof. The chimney's mouth is at (54, 4) in the shop's picture. */
const SMOKE = {p: [], t: 0}, CHIMNEY = [54, 4];
function chimneySmoke(dt) {
  SMOKE.t -= dt; if (SMOKE.t <= 0) { SMOKE.t = .32 + Math.random() * .25; SMOKE.p.push({x: S_BLD.x + CHIMNEY[0] + (Math.random() * 8 - 4), y: S_BLD.y + CHIMNEY[1], age: 0, life: 3 + Math.random() * 1.5, vx: 2 + Math.random() * 3, vy: -(9 + Math.random() * 5), ph: Math.random() * 6.28}); }
  for (let i = SMOKE.p.length - 1; i >= 0; i--) {
    const q = SMOKE.p[i]; q.age += dt; if (q.age > q.life) { SMOKE.p.splice(i, 1); continue; }
    q.x += (q.vx + Math.sin(q.age * 1.7 + q.ph) * 3) * dt; q.y += q.vy * dt; q.vy *= 1 - dt * .15;
    const k = q.age / q.life, sz = Math.round(2 + k * 5), a = k < .15 ? k / .15 * .8 : .8 * (1 - (k - .15) / .85);
    lx.globalAlpha = a; lx.fillStyle = k < .35 ? '#5f6678' : '#7f879a';   /* dark enough to show against the snow */ lx.fillRect(Math.round(X(q.x) - sz / 2), Math.round(Y(q.y) - sz / 2), sz, sz);
    lx.fillStyle = '#9da5b6'; if (sz > 3) lx.fillRect(Math.round(X(q.x) - sz / 2) + 1, Math.round(Y(q.y) - sz / 2), sz - 2, 1);   // a lighter top edge
  }
  lx.globalAlpha = 1;
}
function stallAfter(i, x, y) { if (window.marketStallDraw) marketStallDraw(i, x, y); }
SH.frame = (m, people, dt, t, H, img) => {
  const tp = $('#townHud #hallBar'), r = tp && tp.getBoundingClientRect(), cr = cv.getBoundingClientRect();
  view(img, m.x, m.y + 24, 190, {loose: r && r.height ? clamp((r.top - cr.top + 6) / cr.height, .6, 1) : .8, hi: true});
  if (WL.sel && WL.sel.loc === m.loc) { const q = Math.floor(t / 200) % 2; lx.strokeStyle = q ? '#ffd25e' : '#fff2a8'; lx.lineWidth = 1; lx.beginPath(); lx.ellipse(X(WL.sel.x) + .5, Y(WL.sel.y) + .5, 9 + q, 3 + q * .5, 0, 0, 7); lx.stroke(); }
  const hits = drawScene(people, null, img, southObjs(m, dt)); wlFx(dt, m.loc); drawPuffs(dt); wlCases(dt, m.loc);
  // a tag over the road out to the race track, like the FISH tag over the jetty
  const tag = (wx, wy, txt, col) => { const w = txt.length * 4 + 1, fx0 = X(wx) - Math.floor(w / 2), fy0 = Y(wy) + Math.round(Math.sin(t * .005) * 1.5);
    lx.fillStyle = '#1a1430'; lx.fillRect(fx0 - 1, fy0 - 1, w + 2, 9); lx.fillRect(fx0 + Math.floor(w / 2) - 1, fy0 + 8, 3, 2); lx.fillStyle = col; lx.fillRect(fx0, fy0, w, 7); lx.fillStyle = '#fff'; pxText(lx, txt, fx0 + 1, fy0 + 1); };
  tag(S_RACE.x - 14, S_RACE.y0 - 12, 'RACE', '#4f9be0');   // only the road out gets a tag: the shop sign and the mine say what they are
  lx.fillStyle = 'rgba(255,236,190,.06)'; lx.fillRect(0, 0, cam.lw, cam.lh);
  return hits;
};
const nearDoor = (m, d, r) => Math.abs(m.x - d[0]) < (r || 11) && Math.abs(m.y - d[1]) < 9;
SH.joy = (m, J) => {
  if (J.y < -.5 && m.y < 12 && m.x > 380 && m.x < 420) { wlDoor(-1); return true; }                // back up the road to the town
  if (J.y < -.5 && nearDoor(m, S_BLD.door)) { wlDoor(SMITHY); return true; }
  if (J.y < -.5 && nearDoor(m, S_MINE.door, 16)) { wlDoor(MINE); return true; }
  if (J.x > .5 && m.x > S_RACE.x - 8 && m.y > S_RACE.y0 && m.y < S_RACE.y1) { raceGate(); return true; }
  return true;   // (never fall through to the town-building door check)
};
SH.tap = (e, m, x, y) => {
  if (m.seat) { wlUp(m); return true; }
  if (y < 30 && x > 370 && x < 430) { wlGo(m, 400, 4, () => wlDoor(-1)); return true; }
  const b = IMG['bld/blacksmith']; if (b && x > S_BLD.x + 12 && x < S_BLD.x + b.width - 12 && y > S_BLD.y + 50 && y < S_BLD.y + b.height + 2) { wlGo(m, S_BLD.door[0], S_BLD.door[1], () => wlDoor(SMITHY)); return true; }
  const mi = IMG['s/mine']; if (mi && x > S_MINE.x + 10 && x < S_MINE.x + mi.width - 10 && y > S_MINE.y + 20 && y < S_MINE.y + mi.height + 4) { wlGo(m, S_MINE.door[0], S_MINE.door[1], () => wlDoor(MINE)); return true; }
  const si = S_STALLS.findIndex(([sx, sy]) => x > sx && x < sx + 49 && y > sy && y < sy + 58);
  if (si >= 0) { const [sx, sy] = S_STALLS[si]; wlGo(m, sx + 24, sy + 64, () => { m.dir = 'back'; if (window.marketOpen) marketOpen(si); else wlSay('The market opens soon.'); }); return true; }
  if (x > S_RACE.x - 30 && y > S_RACE.y0 && y < S_RACE.y1) { wlGo(m, S_RACE.x - 2, (S_RACE.y0 + S_RACE.y1) / 2, raceGate); return true; }
  wlGo(m, x, y + 6); holdWalk(e, scenes.town, (x, y) => { const m = WL.me; if (m.loc === SOUTH && !m.ko) wlGo(m, x, y + 6); });
  return true;
};
function raceGate() { if (window.raceOpen) raceOpen(); else wlSay('The race track is being built.'); }
