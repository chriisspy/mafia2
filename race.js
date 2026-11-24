/* ================= THE RACE TRACK (24 Nov 2026, his ask) =================
   "Add racing game/world. Racing includes a whole track map, a whole car modding system with a mechanic and a cool 3D car
   editing image. If I go to change the exhaust the car spins around and shows the exhaust changing, if I change the engine it
   opens the bonnet and shows the engine, etc. similar to the GTA mechanic system."
   Walk out of the South along its east road and you are here. A "place" like the South (loc 100 + its spot in HALLS):
     THE GROUND   one 2D picture of the whole circuit (assets/race/track.png, Nano Banana Pro; tools/make_race.py cuts it and
                  reads the road, the kerbs and the forest off it into assets/race/mask.png: red = open, green = road, blue = kerb)
     ON TOP       the garage, the pits, the grandstands, the start gantry, the trackside props and the Mechanic are their own
                  pictures; the TYRE BARRIERS and the CARS are sprite stacks (his ask: the 3D sliced style of the Godfather's
                  car), drawn by the game's own stack drawer (STACK)
     THE CAR      tools/make_racecar.py writes every part as a strip of its own; raceBuildCar() puts your parts together
     DRIVING      the Godfather's car feel (index.html "THE GODFATHER'S CAR": revs build, the tail steps out, four gears that
                  drop in pitch, tyre marks, smoke, NO tyre screech), made FAST for a race
     THE EDITOR   talk to the Mechanic: the car on a turntable; every kind of part turns it to show that part
   Coins are the server's (functions/race.js: rbuy, rset, rlap). On localhost ?lab the same rules run here (raceLab).

   ROUND 2 (his notes, 24 Nov): "make the racing track a lot better, it feels bland and boring" -> a new, longer circuit (2400 x 1800:
   a long main straight, an S-bend, a hairpin), gravel, skid marks, a start gantry with real lights, pits, a crowd, billboards,
   floodlights, tyre walls round every bend. "the sense of speed isnt great ... it feels super slow and boring" -> twice the top
   speed, a camera that looks up the road and shakes, speed streaks, kerb rumble, snow spray, a boost out of a clean drift, a tow
   behind another car, four other cars to race, places (1st, 2nd ...), a results card. "remove the christmas themed UI in the car
   editor panel" -> the editor's list is a plain panel. */

/* ---------- the place ---------- */
const RACE = 100 + HALLS.length;
HALLS.push({k: 'race', name: 'The Race Track', step: 'snow', door: [-999, -999], spawn: [16, 1338, 'right'], out: true, spots: [], hint: 'Walk back along the road to leave', back: [280, 976]});
const RH = HALLS[RACE - 100];

/* ---------- the layout (game pixels on the 2400 x 1792 ground). Edit these numbers to move things. ---------- */
const R_GAR = {x: 170, y: 977, door: [256, 1136]};                     // the Mechanic's garage (206 x 153) at the top of the paddock
const R_PITS = {x: 430, y: 1006};                                      // the pit garages (225 x 126) beside it
const R_STANDS = [{x: 1700, y: 992}, {x: 2160, y: 902}];               // the two grandstands (202 x 156), either side of the main straight
const R_GANTRY = {x: 1961, y: 854, lamps: [75, 87, 99, 111, 123], ly: 43};   // the start gantry (198 x 152) over the line; where its five lamps are on the picture
const R_MECH = [344, 1144];                                            // where the Mechanic stands, by his tyres
const R_PARK = [300, 1232, 0];                                         // where your car waits: x, y, the way it points
const R_OUT = {x: 10, y0: 1294, y1: 1382};                             // the road back to the South (left edge)
const R_LINE = {y: 1000, x0: 1990, x1: 2130};                          // the start / finish line across the main straight (you race UP it)
const R_GRIDS = [0, 1, 2, 3, 4].map(i => [i % 2 ? 2090 : 2030, 1085 + i * 56]);   // the grid boxes, front first
const R_GRIDZONE = [1996, 1012, 2124, 1420];                           // stop in here and you can start a race
const R_APRON = [190, 1132, 330, 1205];                                // stop in front of the garage door and the Mechanic comes over
const R_LAPS = 3;
// trackside props: [picture, x, y of its top left]. Each is its own picture (tools/make_race.py props), 2px flat shadow under it.
const R_PROPS = [['board-tyre', 660, 742], ['board-cup', 900, 742], ['board-cup', 1640, 96], ['board-tyre', 1800, 96], ['board-tyre', 1500, 1650], ['board-cup', 1700, 1650],
  ['floodlight', 2200, 250], ['floodlight', 1470, 700], ['floodlight', 150, 560], ['floodlight', 1240, 1480], ['floodlight', 1900, 1250],
  ['flag', 1930, 1030], ['flag', 2152, 1128], ['flag', 780, 1228], ['snowman', 1190, 990], ['snowman', 2230, 1180], ['hay', 540, 728], ['hay', 590, 742], ['hay', 1240, 1262], ['podium', 1790, 1182]];
// the middle of the road in the order you drive it (the plan the ground was painted to: tools/make_race_sketch.py)
const R_CTRL = [[2060, 1300], [2060, 420], [2060, 300], [1950, 220], [1620, 220], [1480, 220], [1380, 320], [1380, 460], [1280, 600], [1120, 620], [520, 620],
  [330, 620], [250, 750], [330, 880], [520, 880], [1100, 880], [1260, 880], [1360, 980], [1360, 1180], [1360, 1420], [1480, 1560], [1920, 1560], [2060, 1470]].map(p => [p[0], p[1] * 1792 / 1800]);
const RLINE = (() => { let p = R_CTRL; for (let k = 0; k < 3; k++) { const q = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } p = q; } return p; })();
/* the same line every 4 pixels, with the way it points, how hard it bends and how far round the lap each point is: the other
   cars drive along this, and it says how far round YOU are (for places and laps) */
const RD = (() => { const pts = [], n = RLINE.length; for (let i = 0; i < n; i++) { const a = RLINE[i], b = RLINE[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(d / 4)); for (let j = 0; j < k; j++) pts.push({x: a[0] + (b[0] - a[0]) * j / k, y: a[1] + (b[1] - a[1]) * j / k}); }
  const m = pts.length, wrapA = a => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI; let s = 0;
  for (let i = 0; i < m; i++) { const p = pts[i], q = pts[(i + 1) % m], a = pts[(i - 8 + m) % m], c = pts[(i + 8) % m], d = Math.hypot(q.x - p.x, q.y - p.y); p.s = s; s += d;
    const t = Math.atan2(c.y - a.y, c.x - a.x); p.tx = Math.cos(t); p.ty = Math.sin(t); p.a = t;
    p.k = wrapA(Math.atan2(c.y - p.y, c.x - p.x) - Math.atan2(p.y - a.y, p.x - a.x)) / (Math.hypot(c.x - a.x, c.y - a.y) / 2 || 1); }
  pts.L = s; let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - 2060, p.y - R_LINE.y); if (d < bd) { bd = d; bi = i; } }); pts.s0 = pts[bi].s; return pts; })();
const rdRel = s => ((s - RD.s0) % RD.L + RD.L) % RD.L;                  // how far past the line a point of the lap is
const R_CPS = [.12, .25, .38, .5, .62, .75, .88].map(f => { const s = (RD.s0 + f * RD.L) % RD.L; return RD.find(p => p.s >= s) || RD[0]; });   // gates you must pass, in order, for a lap to count

/* ---------- THE PARTS (the prices are the server's: functions/race.js has the same table) ----------
   spd / acc / grip = what a part adds. Paint: the four colours the body's paint keys become (deep, side, top, shine). */
const RPARTS = {
  paint: [{n: 'Midnight', p: 0, c: ['#121024', '#2e2c52', '#4e4e7c', '#8286b6']}, {n: 'Racing Red', p: 150, c: ['#5a1020', '#a8202c', '#d8443c', '#ff8a70']},
    {n: 'Lake Blue', p: 150, c: ['#14245c', '#2448a0', '#3f78d8', '#8cc0ff']}, {n: 'Pine Green', p: 150, c: ['#0f3a2a', '#1f6a3f', '#3fa458', '#9fe08a']},
    {n: 'Snow White', p: 200, c: ['#7c84a4', '#c4cce0', '#eef2ff', '#ffffff']}, {n: 'Taxi Yellow', p: 200, c: ['#7a4a10', '#c88a1c', '#f2c230', '#fff29a']},
    {n: 'Sunset', p: 250, c: ['#7a2a10', '#c8501c', '#f28030', '#ffc890']}, {n: 'Bubblegum', p: 250, c: ['#6a1850', '#b83a88', '#f070b0', '#ffc0e0']},
    {n: 'Royal Purple', p: 300, c: ['#2a1460', '#5a2aa8', '#8a54e0', '#c8a0ff']}, {n: 'Solid Gold', p: 900, c: ['#6a4410', '#b9781f', '#e8b13a', '#fff6cf']}],
  wheels: [{n: 'Whitewalls', p: 0}, {n: 'Red Rims', p: 300, grip: 1}, {n: 'Gold Rims', p: 700, grip: 2}, {n: 'Slicks', p: 1500, grip: 3}],
  exhaust: [{n: 'Stock Pipe', p: 0}, {n: 'Twin Pipes', p: 250, acc: 1}, {n: 'Big Bore', p: 600, acc: 2}, {n: 'Gold Quad', p: 1200, acc: 3}],
  spoiler: [{n: 'None', p: 0}, {n: 'Ducktail', p: 200, grip: 1}, {n: 'Wing', p: 650, grip: 2}, {n: 'GT Wing', p: 1400, grip: 3}],
  engine: [{n: 'Stock', p: 0}, {n: 'Tuned', p: 500, spd: 1, acc: 1}, {n: 'V8', p: 1200, spd: 2, acc: 1}, {n: 'Supercharged', p: 2500, spd: 3, acc: 2}]};
const RCATS = ['paint', 'wheels', 'exhaust', 'spoiler', 'engine'], RCAT_NAME = {paint: 'Paint', wheels: 'Wheels', exhaust: 'Exhaust', spoiler: 'Spoiler', engine: 'Engine'};
const RSET = {paint: 0, wheels: 0, exhaust: 0, spoiler: 0, engine: 0};                       // what is on the car
const ROWN = {paint: new Set([0]), wheels: new Set([0]), exhaust: new Set([0]), spoiler: new Set([0]), engine: new Set([0])};
let RBEST = 0;                                                                               // your best lap, ms
function raceStats(set) {   // what a setup is worth, and what that does to the car
  let spd = 0, acc = 0, grip = 0; for (const c of RCATS) { const q = RPARTS[c][set[c]] || {}; spd += q.spd || 0; acc += q.acc || 0; grip += q.grip || 0; }
  return {spd, acc, grip, vmax: 330 * (1 + .07 * spd), accT: 1.7 / (1 + .16 * acc), turn: 2.5 + .25 * grip, loose: 1 - .09 * grip, scrub: 1 - .1 * grip};   // (round 2: twice as fast, quicker off the line)
}

/* ---------- the server's copy / the lab's copy ---------- */
function raceApply(R) {   // R = wallet.kit.race = {own: {paint: {p0: 1, p3: 1}, ...}, set: {paint: 3, ...}, best}
  if (!R) return; let ch = false;
  for (const c of RCATS) { const o = (R.own && R.own[c]) || {}; ROWN[c] = new Set([0, ...Object.keys(o).map(k => +String(k).replace('p', '')).filter(i => i >= 0 && i < RPARTS[c].length)]);
    const s = (R.set && R.set[c]) | 0, v = ROWN[c].has(s) ? s : 0; if (RSET[c] !== v) { RSET[c] = v; ch = true; } }
  RBEST = R.best | 0; if (ch) raceBuildCar(); raceChip(); if (RK.ed.on) raceEdList();
}
{ const _wa = walletApply; walletApply = function (w) { _wa(w); const k = (w && w.kit) || {}; if (k.race) raceApply(k.race); }; }
const raceLabSave = () => { try { localStorage.setItem('m2lab_race', JSON.stringify({own: Object.fromEntries(RCATS.map(c => [c, [...ROWN[c]]])), set: {...RSET}, best: RBEST})); } catch (e) {} };
function raceLabLoad() { if (!(typeof LABLOCAL !== 'undefined' && LABLOCAL)) return; try { const j = JSON.parse(localStorage.getItem('m2lab_race') || 'null'); if (!j) return;
  for (const c of RCATS) { ROWN[c] = new Set([0, ...((j.own && j.own[c]) || [])]); RSET[c] = ROWN[c].has(j.set && j.set[c]) ? j.set[c] : 0; } RBEST = j.best | 0; } catch (e) {} }
/* the local test lab (these ops are not on the server yet): the same rules, kept on this computer only. Only on localhost ?lab. */
function raceLab(op, d, e) {
  if (!(typeof LABLOCAL !== 'undefined' && LABLOCAL)) return null;
  if (op === 'rbuy' || op === 'rset') { const P = RPARTS[d.cat], i = d.id | 0; if (!P || !P[i]) return null;
    if (!ROWN[d.cat].has(i)) { if (op === 'rset') return null; if (coins < P[i].p) { e.message = 'Not enough coins.'; return null; } coins -= P[i].p; paintCoins(); ROWN[d.cat].add(i); }
    RSET[d.cat] = i; raceLabSave(); raceBuildCar(); return {ok: 1}; }
  if (op === 'rlap') { if (!RBEST || d.ms < RBEST) RBEST = d.ms; raceLabSave(); return {best: RBEST}; }
  return null;
}
async function raceSrv(op, d) { try { return await srv(op, d); } catch (e) { const r = raceLab(op, d, e); if (r) return r; throw e; } }

/* ---------- pictures ---------- */
const RK = {car: {x: R_PARK[0], y: R_PARK[1], tv: R_PARK[2], ca: R_PARK[2], slip: 0, rev: 0, kx: 0, ky: 0}, drive: false, mode: 'free', vw: 190, lookx: 0, looky: 0, shake: 0,
  ed: {on: false}, j: null, bars: [], ai: [], streaks: [], lapT: 0, lap: 0, cp: 0, laps: [], msg: '', msgT: 0, hitT: 0, pi: 0, place: 1};
const R_PROP_KEYS = [...new Set(R_PROPS.map(p => p[0]))];
function raceLoad() {
  const L = (k, src) => load(k, src).catch(() => {});
  const jobs = [L('hall/race', 'assets/race/track.webp'), L('race/mask', 'assets/race/mask.png'), L('race/garage', 'assets/race/garage.png'), L('race/stand', 'assets/race/grandstand.png'),
    L('race/gantry', 'assets/race/gantry.png'), L('race/pits', 'assets/race/pits.png'), ...R_PROP_KEYS.map(k => L('race/' + k, `assets/race/${k}.png`)),
    L('race/car', 'assets/race/car.png'), L('stack/tyres', 'assets/race/tyres.png'), ...['front', 'right', 'back', 'left'].map(d => L('mech/' + d, `assets/final/mechanic/${d}.png`)),
    fetch('assets/race/car.json?v=' + BUILD).then(r => r.json()).then(j => { RK.j = j; }).catch(() => {}), fetch('assets/race/tyres.json?v=' + BUILD).then(r => r.json()).then(j => { RK.tj = j; }).catch(() => {})];
  return Promise.all(jobs).then(() => { raceLabLoad(); raceMasks(); raceBuildCar(); raceBuildRivals(); });
}
/* a car, put together from its parts: one strip the game's stack drawer can use (rows 0 and 1 the same: it flips between them) */
function raceStrip(set, bonnet, rows) {
  const J = RK.j, src = IMG['race/car']; if (!J || !src) return null; const S = J.s, N = J.n, c = mk(S * N, S * (rows || 1)), x = c.getContext('2d', {willReadFrequently: true});
  if (src.width !== S * N) console.warn('race car strip: not a whole number of slices');   // (the skill's rule: check the strip against its count)
  for (const [k, i] of [['body', 0], ['engine', set.engine], ['wheels', set.wheels], ['exhaust', set.exhaust], ['spoiler', set.spoiler], ['bonnet', bonnet | 0]]) x.drawImage(src, 0, J.rows[k][i] * S, S * N, S, 0, 0, S * N, S);
  const P = RPARTS.paint[set.paint] || RPARTS.paint[0];
  if (set.paint) { const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), from = J.paint.map(hex), to = P.c.map(hex), d = x.getImageData(0, 0, S * N, S), p = d.data;
    for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; for (let k = 0; k < 4; k++) if (p[i] === from[k][0] && p[i + 1] === from[k][1] && p[i + 2] === from[k][2]) { p[i] = to[k][0]; p[i + 1] = to[k][1]; p[i + 2] = to[k][2]; break; } }
    x.putImageData(d, 0, 0); }
  for (let r = 1; r < (rows || 1); r++) x.drawImage(c, 0, 0, S * N, S, 0, r * S, S * N, S);
  return c;
}
function raceStack(name, set) { const J = RK.j, c = raceStrip(set, 0, 3); if (!c) return; IMG['stack/' + name] = c; STACK[name] = {s: J.s, n: J.n, squash: J.squash, hover: 0, ground: 1, keep: 1, rod: 4}; SP[name] = SP[name] || {stack: 1};
  for (const k of Object.keys(STK.fr)) if (k.startsWith(name + '0') || k.startsWith(name + '1') || k.startsWith(name + '2')) delete STK.fr[k]; }   // every angle is built again from the new parts
function raceBuildCar() { if (!RK.j) return; raceStack('racecar', RSET); RK.stat = raceStats(RSET); }
/* THE OTHER DRIVERS: four cars of their own (paint and parts), each a little quicker than the last. v = top speed, g = how hard they corner. */
const R_RIVALS = [{n: 'Ava', set: {paint: 2, wheels: 1, exhaust: 1, spoiler: 1, engine: 1}, v: 316, g: 380}, {n: 'Leo', set: {paint: 3, wheels: 0, exhaust: 2, spoiler: 2, engine: 1}, v: 328, g: 460},
  {n: 'Mia', set: {paint: 7, wheels: 2, exhaust: 1, spoiler: 2, engine: 2}, v: 340, g: 540}, {n: 'Sam', set: {paint: 6, wheels: 3, exhaust: 3, spoiler: 3, engine: 3}, v: 352, g: 640}];
function raceBuildRivals() { R_RIVALS.forEach((r, i) => raceStack('rival' + 'abcd'[i], r.set)); }

/* ---------- where you can go: read off the mask, plus the buildings, the props and the barriers ---------- */
let RSOLID = null, RROAD = null, RKERB = null, RW = 0, RHT = 0;
const rIdx = (x, y) => { const xi = Math.round(x), yi = Math.round(y); return xi < 0 || yi < 0 || xi >= RW || yi >= RHT ? -1 : yi * RW + xi; };
const rSolid = (x, y) => { const i = rIdx(x, y); return i < 0 || !!RSOLID[i]; }, rRoad = (x, y) => { const i = rIdx(x, y); return i >= 0 && !!RROAD[i]; }, rKerb = (x, y) => { const i = rIdx(x, y); return i >= 0 && !!RKERB[i]; };
function raceMasks() {
  const im = IMG['race/mask']; if (!im) return; RW = im.width; RHT = im.height;
  const c = mk(RW, RHT), x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, RW, RHT).data;
  RSOLID = new Uint8Array(RW * RHT); RROAD = new Uint8Array(RW * RHT); RKERB = new Uint8Array(RW * RHT);
  for (let i = 0; i < RW * RHT; i++) { RSOLID[i] = d[i * 4] > 127 ? 0 : 1; RROAD[i] = d[i * 4 + 1] > 127 ? 1 : 0; RKERB[i] = d[i * 4 + 2] > 127 ? 1 : 0; }
  const rect = (x0, y0, x1, y1) => { for (let y = Math.max(0, y0); y < Math.min(RHT, y1); y++) RSOLID.fill(1, y * RW + Math.max(0, x0), y * RW + Math.min(RW, x1)); };
  rect(R_GAR.x + 3, R_GAR.y + 60, R_GAR.x + 203, R_GAR.y + 150);                              // the garage's walls
  rect(R_PITS.x + 3, R_PITS.y + 50, R_PITS.x + 222, R_PITS.y + 122);                          // the pit garages
  for (const s of R_STANDS) rect(s.x + 3, s.y + 70, s.x + 199, s.y + 154);                    // the grandstands
  rect(R_GANTRY.x, R_GANTRY.y + 134, R_GANTRY.x + 26, R_GANTRY.y + 150); rect(R_GANTRY.x + 172, R_GANTRY.y + 134, R_GANTRY.x + 198, R_GANTRY.y + 150);   // the gantry's two feet
  rect(R_MECH[0] - 7, R_MECH[1] - 5, R_MECH[0] + 8, R_MECH[1] + 2);                           // the Mechanic himself
  for (const [k, px, py] of R_PROPS) { const p = IMG['race/' + k]; if (p) rect(px + Math.round(p.width * .2), py + p.height - 9, px + Math.round(p.width * .8), py + p.height - 2); }
  STACK.tyres = {s: (RK.tj && RK.tj.s) || 29, n: (RK.tj && RK.tj.n) || 10, squash: .55, hover: 0, ground: 1, keep: 1};
  { const t = IMG['stack/tyres']; if (t && t.width !== STACK.tyres.s * STACK.tyres.n) console.warn('tyre strip: not a whole number of slices'); }
  raceBarriers();
  for (const b of RK.bars) for (let k = -1; k <= 1; k++) {                                    // three tyre columns a barrier, each a little oval on the ground
    const cx = b.x + Math.cos(b.g) * 18 * k, cy = b.y + Math.sin(b.g) * 18 * k * .55;
    for (let yy = -7; yy <= 7; yy++) for (let xx = -11; xx <= 11; xx++) if ((xx / 11) ** 2 + (yy / 7) ** 2 <= 1) { const i = rIdx(cx + xx, cy + yy); if (i >= 0) RSOLID[i] = 1; } }
  for (let k = 1; k < RK.bars.length; k++) { const a = RK.bars[k - 1], b = RK.bars[k], d = Math.hypot(b.x - a.x, b.y - a.y); if (d > 96) continue;   // no squeezing through between two barriers of the same run
    for (let s = 0; s <= d; s += 3) { const cx = a.x + (b.x - a.x) * s / d, cy = a.y + (b.y - a.y) * s / d; for (let yy = -5; yy <= 5; yy++) for (let xx = -7; xx <= 7; xx++) { const i = rIdx(cx + xx, cy + yy); if (i >= 0) RSOLID[i] = 1; } } }
  const w = mk(RW, RHT), wx = w.getContext('2d'), wd = wx.createImageData(RW, RHT);
  for (let i = 0; i < RW * RHT; i++) { const v = RSOLID[i] ? 0 : 255; wd.data[i * 4] = wd.data[i * 4 + 1] = wd.data[i * 4 + 2] = v; wd.data[i * 4 + 3] = 255; }
  wx.putImageData(wd, 0, 0); IMG['hallw/race'] = w; RH.g = null;
}
/* THE TYRE BARRIERS (his ask: 3D slices like the Godfather's car; tools/make_tyres.py, made with the sprite-stacking skill).
   They stand round the OUTSIDE of every bend, just off the kerb or the gravel, turned to follow it: walk the middle line, and
   wherever it bends, step out across the road to its edge and stand a barrier there. */
function raceBarriers() {
  const out = [], m = RD.length; let since = 1e9, lastSide = 0;
  for (let i = 0; i < m; i++) { const b = RD[i], turn = b.k * 64;   // how far it turns over the next 64 px
    since += 4; if (Math.abs(turn) < .1) continue;
    const t = b.a, side = turn > 0 ? 1 : -1, nx = Math.sin(t) * side, ny = -Math.cos(t) * side;   // a right-hand bend (clockwise on screen): the outside is on the left
    let r = 20; while (r < 150 && rRoad(b.x + nx * r, b.y + ny * r)) r += 2; if (r >= 150) continue;
    const x = b.x + nx * (r + 13), y = b.y + ny * (r + 9), g = Math.atan2(Math.sin(t) / .55, Math.cos(t));   // g = its angle on the ground (the screen squashes it)
    const need = 56 * Math.hypot(Math.cos(g), .55 * Math.sin(g)) + 2; if (side === lastSide && since < need) continue;
    if (rSolid(x, y) || rRoad(x, y) || out.some(o => Math.hypot(o.x - x, (o.y - y) * 1.6) < need - 4)) continue;
    out.push({x, y, g, ai: ((Math.round((g - Math.PI / 2) / (Math.PI * 2) * 48) % 48) + 48) % 48, sh: 0}); since = 0; lastSide = side;
  }
  RK.bars = out;
}

/* ---------- getting here, and back ---------- */
window.raceOpen = () => { if (IMG['hall/race'] && IMG['hallw/race']) wlDoor(RACE); else wlSay('The race track is still loading.'); };
{ const f = SH.from; SH.from = was => was === RACE ? [S_RACE.x - 16, (S_RACE.y0 + S_RACE.y1) / 2, 'left'] : (f ? f(was) : null); }   // back in the South: on the road you left by
RH.enter = () => { $('#hallLine').textContent = ''; RK.drive = false; raceFree(); RK.vw = 190; const C = RK.car; C.rev = 0; C.slip = 0; C.kx = C.ky = 0; if (typeof goldChip === 'function') goldChip(); raceChip(); };
const raceNear = (m, p, r) => Math.hypot(m.x - p[0], m.y - p[1]) < r;
RH.joy = (m, J) => {
  if (J.x < -.5 && m.x < R_OUT.x && m.y > R_OUT.y0 && m.y < R_OUT.y1) { wlDoor(SOUTH); return true; }
  if (J.y < -.5 && Math.abs(m.x - R_MECH[0]) < 16 && m.y > R_MECH[1] && m.y < R_MECH[1] + 16) { raceEdOpen(); return true; }
  return true;
};
RH.tap = (e, m, x, y) => {
  if (RK.drive) { const C = RK.car;
    if (RK.mode === 'free' && inR(R_GRIDZONE, C.x, C.y)) raceStart();
    else if (RK.mode === 'free' && inR(R_APRON, C.x, C.y) && C.rev < .3) raceEdOpen();
    return true; }
  if (x < 40 && y > R_OUT.y0 - 10 && y < R_OUT.y1 + 10) { wlGo(m, 4, clamp(y, R_OUT.y0 + 6, R_OUT.y1 - 6), () => wlDoor(SOUTH)); return true; }
  const g = IMG['race/garage'];
  if (Math.hypot(x - R_MECH[0], y - (R_MECH[1] - 16)) < 24 || (g && x > R_GAR.x + 10 && x < R_GAR.x + g.width - 10 && y > R_GAR.y + 60 && y < R_GAR.y + g.height + 4)) { wlGo(m, R_MECH[0], R_MECH[1] + 9, () => { m.dir = 'back'; raceEdOpen(); }); return true; }
  const C = RK.car; if (Math.hypot(x - C.x, (y - C.y + 8) * 1.4) < 34) { wlGo(m, C.x, C.y + 20, () => raceIn()); return true; }
  wlGo(m, x, y + 6); holdWalk(e, scenes.town, (x, y) => { const m = WL.me; if (m.loc === RACE && !m.ko && !RK.drive) wlGo(m, x, y + 6); });
  return true;
};

/* ---------- in and out of the car ---------- */
function raceIn() { const m = WL.me; if (!m || m.loc !== RACE || RK.drive || m.ko || m.seat) return; const C = RK.car; if (Math.hypot(m.x - C.x, m.y - C.y) > 70) return;
  RK.drive = true; RK.mode = 'free'; m.path = []; m.todo = null; m.walk = false; C.rev = 0; C.slip = 0; C.tv = C.ca; sfx('door'); carPoof(C.x, C.y, 8); }
function raceOut() { const m = WL.me; if (!m || !RK.drive) return; const C = RK.car; RK.drive = false; raceFree(); C.rev = 0; C.slip = 0; C.ca = C.tv; C.boost = 0;
  const q = nearOk(RACE, C.x - Math.sin(C.tv) * 22, C.y + Math.cos(C.tv) * 16 + 6); m.x = q[0]; m.y = q[1]; m.dir = 'front'; m.walk = false; sfx('door'); netMove(); }
/* the round button across from the joystick (the same pixel disc as the car, fishing and punch buttons): a steering wheel */
$('#phone').insertAdjacentHTML('beforeend', '<button id="raceBtn" title="Car"></button>');
{ const st = document.createElement('style'); st.textContent = `#raceBtn{position:absolute;right:22px;bottom:240px;width:84px;height:84px;z-index:8;display:none;align-items:center;justify-content:center;border:0;padding:0;background:none;touch-action:none;pointer-events:auto;cursor:pointer}
#raceBtn::before{content:'';position:absolute;inset:0;background:var(--pb) 0 0/100% 100%;image-rendering:pixelated;opacity:.72}#raceBtn.sel::before{opacity:1}#raceBtn img{position:relative;image-rendering:pixelated}#raceBtn:active{transform:scale(.94)}
#raceChip{display:none}
#raceEd{position:absolute;inset:0;z-index:30;display:none;flex-direction:column;background:#141024;color:#f6dfae;font-family:"Pixelify Sans",system-ui,sans-serif;font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0;padding:max(10px,env(safe-area-inset-top)) 10px 10px;box-sizing:border-box;touch-action:none}
#raceEd.on{display:flex}
#raceEd .reHead{display:flex;align-items:center;gap:8px;flex:none}#raceEd .reHead b{flex:1;font:700 22px "Pixelify Sans";letter-spacing:.5px;color:#fff}
#raceEd .reHead .btn{padding:4px 8px;display:flex;align-items:center}
#reStage{position:relative;flex:1 1 0;min-height:150px;display:flex;align-items:center;justify-content:center;overflow:hidden}
#reCv{image-rendering:pixelated;touch-action:none;cursor:grab}
#reName{position:absolute;left:0;right:0;bottom:2px;text-align:center;font:700 18px "Pixelify Sans";color:#fff;text-shadow:2px 0 0 #0f0b1e,-2px 0 0 #0f0b1e,0 2px 0 #0f0b1e,0 -2px 0 #0f0b1e;pointer-events:none}
#reStats{flex:none;display:grid;grid-template-columns:auto 1fr;gap:5px 10px;align-items:center;margin:6px 4px 8px;font:700 13px "Pixelify Sans";letter-spacing:.5px}
#reStats .rebar{display:flex;gap:3px}#reStats .rebar span{flex:1;height:10px;background:#2a2346;border:2px solid #0f0b1e}#reStats .rebar span.on{background:#f6dfae}#reStats .rebar span.up{background:#5fc46f}#reStats .rebar span.dn{background:#e4544f}
#reTabs{flex:none;display:flex;gap:5px;margin-bottom:8px}#reTabs .btn{flex:1 1 0;min-width:0;font-size:13px;padding:7px 0 9px;text-align:center}#reTabs .btn.sel{background:#ffd25e;border-color:#1a1430}
#reList{flex:none;height:228px;overflow-y:auto;padding:8px 9px 12px;touch-action:pan-y}
#reList .ro{display:flex;align-items:center;gap:8px;background:#fff6df;border:3px solid var(--wood);border-radius:6px;padding:6px 8px;margin-top:6px;cursor:pointer}#reList .ro:first-child{margin-top:0}
#reList .ro.on{border-color:#1a1430;background:#ffe08a}#reList .ro b{flex:1;font-size:16px}#reList .ro .btn{min-width:86px;font-size:14px;padding:5px 8px 7px;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap}
#reList .ro .sw{width:26px;height:26px;flex:none;border:3px solid #1a1430;box-shadow:inset -6px -6px 0 #0003,inset 4px 4px 0 #fff5}
#reList .ro small{font-size:12px;opacity:.75;margin-right:2px}`; document.head.appendChild(st); }
$('#raceBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (WL.fading || document.querySelector('.modal.on') || RK.ed.on) return; if (RK.drive) { if (RK.car.rev < .35) raceOut(); } else raceIn(); });
function raceBtn() {
  const b = $('#raceBtn'), m = WL.me; if (!b) return;
  if (!b.dataset.pb) { const v = $('#punchBtn').style.getPropertyValue('--pb'); if (v) { b.style.setProperty('--pb', v); b.dataset.pb = 1; b.innerHTML = ic('steer', 5, 'solo'); } }
  const here = !!(m && scene === scenes.town && m.loc === RACE && !WL.fading), show = here && !RK.ed.on && !m.ko && (RK.drive ? RK.mode !== 'count' : raceNear(m, [RK.car.x, RK.car.y + 6], 54)), key = String(show) + (RK.drive ? 1 : 0);
  if (b.dataset.s !== key) { b.dataset.s = key; b.style.display = show ? 'flex' : 'none'; b.classList.toggle('sel', RK.drive); }
  const j = $('#joy'); if (show && j && (raceBtn.n = (raceBtn.n || 0) + 1) % 20 === 1) { const jb = parseFloat(getComputedStyle(j).bottom); if (jb === jb) b.style.bottom = Math.round(jb + (j.offsetHeight - 84) / 2) + 'px'; }
}
/* while you drive (or the editor is open) the joystick steers the car, not your feet */
{ const jv = joyVec; joyVec = function () { const m = WL.me; if (m && m.loc === RACE && scene === scenes.town && (RK.drive || RK.ed.on)) return null; return jv(); }; RK.joy = jv; }

/* ---------- DRIVING: the Godfather's car, made into a race car ----------
   C.tv = the way it travels, C.slip = how far the body has swung past that (the tail steps out), C.ca = tv + slip = where the body points.
   C.rev 0..1 builds while you hold the stick and sets the speed (up to about 330 px a second on the stock car: twice round 1's).
   Ask for more turn than the tyres give and the tail goes. Pull the stick BACK against the way you are going and it brakes.
   HIS NOTE (round 2): "the sense of speed isnt great ... it feels super slow and boring". So: much faster and punchier; hold a drift
   and leave it cleanly and you get a BOOST; sit close behind another car and it tows you along; kerbs rumble; snow sprays off the
   road and holds you to a crawl; anything solid (tyre barriers, trees, buildings) bumps you back and costs speed. */
const RPROBE = [[30, 0], [25, 11], [25, -11], [-28, 11], [-28, -11], [0, 13], [0, -13]];   // the car's edges: ahead, across (ground pixels)
const rWrap = a => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
function raceHitAt(x, y, a) { const c = Math.cos(a), s = Math.sin(a); for (const [f, l] of RPROBE) { const px = x + c * f - s * l, py = y + (s * f + c * l) * .55; if (rSolid(px, py)) return [px, py]; } return null; }
function raceNormal(px, py) { let nx = 0, ny = 0; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; for (const r of [5, 10, 16]) if (!rSolid(px + Math.cos(a) * r, py + Math.sin(a) * r)) { nx += Math.cos(a); ny += Math.sin(a); } } const d = Math.hypot(nx, ny); return d > .01 ? [nx / d, ny / d] : null; }
function raceCarStep(dt, t) {
  const C = RK.car, P = RK.stat || raceStats(RSET);
  let J = RK.drive && (RK.mode === 'free' || RK.mode === 'race') && !RK.ed.on && !WL.fading ? RK.joy() : null;
  const on = rRoad(C.x, C.y); C.on = on; let steer = J;
  if (J) { const d = rWrap(Math.atan2(J.y, J.x) - C.tv); if (Math.abs(d) > 2.25 && C.rev > .22) { C.rev = Math.max(0, C.rev - dt * 2.6); steer = null; C.braking = true; } else C.braking = false; } else C.braking = false;   // stick pulled back: the brakes
  if (J && !C.braking) C.rev = Math.min(1, C.rev + dt / P.accT * (on ? 1 : .5)); else if (!J) C.rev = Math.max(0, C.rev - dt * (RK.drive ? .8 : 2.5));
  if (!on && C.rev > .36) C.rev = Math.max(.36, C.rev - dt * 2.4);
  let turn = 0;
  if (steer) { const d = rWrap(Math.atan2(J.y, J.x) - C.tv), rate = lerp(9, P.turn, Math.min(1, C.rev * 1.1)) * (C.drift ? 1.35 : 1) * (on ? 1 : .8); turn = clamp(d, -rate * dt, rate * dt); C.tv += turn;
    const over = Math.abs(d) - .5; if (over > 0 && C.rev > .45) C.slip = clamp(C.slip + Math.sign(d) * Math.min(1.2, over) * dt * 3.6 * C.rev * P.loose * (on ? 1 : 1.5), -.8, .8); }
  C.slip *= Math.exp(-dt * 2.3); C.tr = dt > 0 ? Math.abs(turn) / dt : 0; C.ca = C.tv + C.slip; C.gas = !!J && !C.braking;
  const was = C.drift; C.drift = !!steer && Math.abs(C.slip) > .36 && C.rev > .5;
  if (C.drift) C.dT = (C.dT || 0) + dt;
  else if (C.dT) { if (C.dT > .5 && on && t - RK.hitT > 1200 && RK.drive) { C.boost = Math.min(1.9, .7 + C.dT * .7); sfx('rboost'); RK.shake = Math.max(RK.shake, .25); }   // a clean drift, held and let go: BOOST
    else if (C.dT > .6) C.rev *= Math.max(.6, 1 - C.dT * .25 * P.scrub); C.dT = 0; }
  if (C.boost > 0) C.boost -= dt;
  // the tow: tucked in close behind another car
  let tow = 0; if (RK.drive && RK.mode === 'race') { const c = Math.cos(C.tv), s = Math.sin(C.tv); for (const a of RK.ai) { const dx = a.x - C.x, dy = (a.y - C.y) / .75, f = dx * c + dy * s, l = Math.abs(-dx * s + dy * c); if (f > 30 && f < 190 && l < 28 && a.v > 120) tow = 1; } }
  C.tow = (C.tow || 0) + (tow - (C.tow || 0)) * Math.min(1, dt * 3);
  const base = 90, top = base + (P.vmax - base) * Math.max(0, (C.rev - .08) / .92);
  const v = (C.rev < .08 ? C.rev / .08 * base : top) * (J && !C.braking ? Math.min(1, .4 + J.m) : .94) * (C.boost > 0 ? 1.2 : 1) * (1 + .08 * C.tow); C.v = v;
  C.kx *= Math.exp(-dt * 6); C.ky *= Math.exp(-dt * 6);
  const vx = Math.cos(C.tv) * v + C.kx, vy = Math.sin(C.tv) * v + C.ky; let nx = C.x + vx * dt, ny = C.y + vy * dt;
  if (v > .5 || Math.abs(C.kx) + Math.abs(C.ky) > 2) {
    const stuck = raceHitAt(C.x, C.y, C.tv), hit = raceHitAt(nx, ny, C.tv);
    if (stuck) { const n = raceNormal(stuck[0], stuck[1]); if (n) { C.x += n[0] * 90 * dt; C.y += n[1] * 90 * dt; } else { C.x = nx; C.y = ny; } }   // wedged in something: ease back out of it
    else if (hit) { const n = raceNormal(hit[0], hit[1]) || [-Math.cos(C.tv), -Math.sin(C.tv)], dot = vx * n[0] + vy * n[1];
      if (dot < 0) { const rx = vx - 1.45 * dot * n[0], ry = vy - 1.45 * dot * n[1], hard = Math.min(1, -dot / 200);
        if (v > 1) C.tv = Math.atan2(ry, rx); C.rev *= 1 - .6 * hard; C.kx = n[0] * (50 + 110 * hard); C.ky = n[1] * (50 + 110 * hard); C.slip *= .4; C.boost = 0;
        if (hard > .15 && t - RK.hitT > 220) { RK.hitT = t; sfx('thud'); RK.shake = Math.max(RK.shake, .3 + .6 * hard); carPoof(hit[0], hit[1] + 6, 3 + Math.round(hard * 6));
          let best = null, bd = 34; for (const b of RK.bars) { const dd = Math.hypot(b.x - hit[0], (b.y - hit[1]) * 1.6); if (dd < bd) { bd = dd; best = b; } } if (best) best.sh = .3; } }
      else { C.x = nx; C.y = ny; } }
    else { C.x = nx; C.y = ny; }
  }
  // door to door with the other cars: a shove, a little speed lost on both sides
  if (RK.drive) for (const a of RK.ai) { const dx = a.x - C.x, dy = (a.y - C.y) / .6, d = Math.hypot(dx, dy); if (d < 34 && d > .01) { const ux = dx / d, uy = dy / d; C.kx = -ux * 95; C.ky = -uy * 60; a.lane += ((a.lane - RK.plane) >= 0 ? 1 : -1) * 70 * dt;
      if (t - (RK.bumpT || 0) > 320) { RK.bumpT = t; C.rev *= .95; a.v *= .93; sfx('shove'); RK.shake = Math.max(RK.shake, .22); } } }
  // the picture pivots about its FRONT axle, so only the back steps out (his note on the town car)
  const F = 15, cx0 = Math.cos(C.ca), sy0 = Math.sin(C.ca); C.cox = (Math.cos(C.tv) - cx0) * F; C.coy = (Math.sin(C.tv) - sy0) * F * .55;
  const cx = C.x + C.cox, cy = C.y + C.coy, rx = cx - cx0 * 21, ry = cy - sy0 * 12, now = performance.now(), px = -sy0 * 13, py = cx0 * 7;
  if ((C.drift || C.braking) && on && v > 60) { CARFX.marks.push({x: rx + px, y: ry + py, t: now}, {x: rx - px, y: ry - py, t: now}); if (CARFX.marks.length > 900) CARFX.marks.splice(0, CARFX.marks.length - 900);
    if (Math.random() < .7) CARFX.puffs.push({x: rx + (Math.random() - .5) * 22, y: ry - 2, vx: (Math.random() - .5) * 16, vy: -6 - Math.random() * 10, t: 0, l: .5 + Math.random() * .4, s: 3}); }
  if (!on && v > 50) for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; CARFX.puffs.push({x: rx + px * sd, y: ry + py * sd, vx: -Math.cos(C.tv) * v * .25 + (Math.random() - .5) * 70, vy: -Math.sin(C.tv) * v * .15 - 50 - Math.random() * 60, t: 0, l: .35 + Math.random() * .3, s: k + Math.floor(now / 40), c: Math.random() < .5 ? '#eef8ff' : '#cfe4ff'}); }   // snow thrown up off the road
  if (C.boost > 0) for (let k = 0; k < 2; k++) CARFX.puffs.push({x: rx - cx0 * 8 + (Math.random() - .5) * 10, y: ry - sy0 * 5 - 4, vx: -Math.cos(C.tv) * 120 + (Math.random() - .5) * 40, vy: -Math.sin(C.tv) * 70 - 30 - Math.random() * 40, t: 0, l: .2 + Math.random() * .2, s: k, c: Math.random() < .5 ? '#ffb24a' : '#ffe9a8'});   // flames out the back
  if (J && v > 20) { C.exT = (C.exT || 0) - dt; if (C.exT <= 0) { C.exT = .07 + .12 * (1 - C.rev); CARFX.puffs.push({x: rx - cx0 * 9, y: ry - sy0 * 5 - 3, vx: -cx0 * 20 + (Math.random() - .5) * 8, vy: -sy0 * 8 - 6 - Math.random() * 8, t: 0, l: .4 + Math.random() * .3, s: 2}); } }
  if (RK.drive && v > 90 && rKerb(C.x, C.y)) { RK.shake = Math.max(RK.shake, .16); if (t - (RK.kerbT || 0) > 85) { RK.kerbT = t; sfx('rkerb'); } }   // the kerbs rumble
  for (const b of RK.bars) if (b.sh > 0) b.sh -= dt;
  if (RK.shake > 0) RK.shake = Math.max(0, RK.shake - dt * 1.8);
}
/* THE ENGINE: his town car's (four gears, each one sits lower than the last, a tiny clutch cut at each change). A bigger engine
   sits deeper; a louder exhaust opens the filter. No tyre screech, ever (his call). */
function raceEngine() {
  const m = WL.me, c = SND.ctx, C = RK.car, on = !!(m && RK.drive && !RK.ed.on && SND.on && c && scene === scenes.town && m.loc === RACE); let E = RK.eng;
  if (!on) { if (E) { try { E.g.gain.setTargetAtTime(0, E.c.currentTime, .05); E.o.stop(E.c.currentTime + .35); E.o2.stop(E.c.currentTime + .35); } catch (x) {} RK.eng = null; } return; }
  if (!E) { const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(SND.out); o.start(); o2.start(); E = RK.eng = {o, o2, g, f, c, gear: 0, cut: 0}; }
  const t = c.currentTime, dE = Math.min(.1, t - (E.lt || t)); E.lt = t; const gas = C.gas && RK.mode !== 'count';
  E.p = clamp((E.p || 0) + (gas ? dE / 1.9 : -dE * 1.6), 0, 4); if (gas && (C.tr || 0) > 1.8 && t > (E.ds || 0) && E.p > .5) { E.p = Math.max(.12, Math.floor(Math.min(E.p, 3.999)) - 1 + .12); E.ds = t + 1.3; }
  const G = Math.min(3, Math.floor(E.p)), k = E.p >= 4 ? 1 : E.p - G; if (E.gear !== G) { E.gear = G; E.cut = t + .12; }
  const cut = t < E.cut, deep = [1, .94, .86, .78][RSET.engine] || 1, open = RSET.exhaust * 90 + (C.boost > 0 ? 500 : 0), chug = Math.sin(performance.now() * .045) * (3 - k * 2), hz = ([78, 70, 62, 56][G] + k * [82, 66, 54, 44][G]) * deep * (C.boost > 0 ? 1.12 : 1) + chug;
  E.o.frequency.setTargetAtTime(hz, t, cut ? .02 : .05); E.o2.frequency.setTargetAtTime(hz / 2, t, cut ? .02 : .05); E.f.frequency.setTargetAtTime(300 + k * 900 + G * 80 + open, t, .07);
  E.g.gain.setTargetAtTime(cut ? .01 : gas ? .05 + k * .045 + G * .004 + RSET.exhaust * .004 : .028, t, cut ? .02 : .07);
}

/* ---------- THE OTHER CARS: they drive the middle line (RD), each in a lane of its own ----------
   Each looks up the road, brakes for the bends (how hard it corners = g), keeps off whoever is in front, and counts its own laps.
   A light rubber band: the ones far ahead of you ease off a touch, the ones far behind push a touch. */
function raceAiStep(dt) {
  const M = RD.length, L = RD.L, go = RK.mode === 'race' || RK.mode === 'done';
  const all = RK.drive ? [...RK.ai, {s: RK.ps || 0, lane: RK.plane || 0, v: RK.car.v || 0, me: 1}] : RK.ai;
  for (const a of RK.ai) {
    if (go) { const i = Math.floor(a.s / L * M) % M, gap = a.prog - (RK.prog || 0); let tgt = a.vmax * (a.fin ? .6 : gap > 500 ? .94 : gap < -400 ? 1.08 : 1);
      for (let d = 0; d <= 260; d += 16) { const p = RD[(i + Math.round(d / 4)) % M], vc = Math.sqrt(a.g / Math.max(Math.abs(p.k), .0004)); tgt = Math.min(tgt, Math.sqrt(vc * vc + 2 * 380 * d)); }
      a.lt2 = (a.lt2 || 0) - dt; if (a.lt2 <= 0) { a.lt2 = 2 + Math.random() * 3; a.lt = (Math.random() - .5) * 64; }
      for (const o of all) { if (o === a) continue; const ds = ((o.s - a.s) % L + L) % L; if (ds > 2 && ds < 80 && Math.abs(o.lane - a.lane) < 28) { a.lt = clamp(o.lane + (o.lane > 0 ? -46 : 46), -38, 38); a.lt2 = 1; if (ds < 50) tgt = Math.min(tgt, o.v * .97 + 4); } }
      a.lane += clamp(a.lt - a.lane, -46 * dt, 46 * dt); a.lane = clamp(a.lane, -42, 42);
      a.v += clamp(tgt - a.v, -430 * dt, a.acc * dt); a.s = (a.s + a.v * dt) % L;
      const rel = rdRel(a.s); if (a.rel > L * .8 && rel < L * .2) { a.lap++; if (a.lap > R_LAPS && !a.fin) a.fin = RK.total; } a.rel = rel; a.prog = (a.lap - 1) * L + rel; }
    const f = a.s / L * M, i0 = Math.floor(f) % M, p = RD[i0], q = RD[(i0 + 1) % M], k = f - Math.floor(f), px = p.x + (q.x - p.x) * k, py = p.y + (q.y - p.y) * k;
    a.x = px - p.ty * a.lane; a.y = py + p.tx * a.lane; a.a = a.a == null ? p.a : a.a + rWrap(p.a - a.a) * Math.min(1, dt * 8);
    if (go && a.v > 150 && Math.abs(p.k) > .005 && Math.random() < .25) CARFX.puffs.push({x: a.x - Math.cos(a.a) * 20, y: a.y - Math.sin(a.a) * 11 - 2, vx: (Math.random() - .5) * 16, vy: -6 - Math.random() * 10, t: 0, l: .4 + Math.random() * .3, s: 3});
  }
}
/* where YOU are round the lap: the nearest point of the middle line, looked for close to where you were last time (so a short
   cut across the infield does not count as progress), and whether you just crossed the line */
function racePos() {
  const C = RK.car, M = RD.length, L = RD.L; let bi = RK.pi, bd = 1e12;
  for (let k = -40; k <= 70; k++) { const i = ((RK.pi + k) % M + M) % M, p = RD[i], d = (p.x - C.x) ** 2 + (p.y - C.y) ** 2; if (d < bd) { bd = d; bi = i; } }
  if (bd > 300 * 300 && RK.mode !== 'race') for (let i = 0; i < M; i++) { const p = RD[i], d = (p.x - C.x) ** 2 + (p.y - C.y) ** 2; if (d < bd) { bd = d; bi = i; } }
  RK.pi = bi; const p = RD[bi]; RK.ps = p.s; RK.plane = (C.x - p.x) * -p.ty + (C.y - p.y) * p.tx; const rel = rdRel(p.s);
  if (RK.mode === 'race') {
    const g = R_CPS[RK.cp]; if (g && Math.hypot(C.x - g.x, C.y - g.y) < 120) RK.cp++;
    if (RK.prel > L * .8 && rel < L * .2) { if (RK.back) RK.back = false; else if (RK.plap === 0) RK.plap = 1; else if (RK.cp >= R_CPS.length) raceLapDone(); }
    else if (RK.prel < L * .2 && rel > L * .8 && RK.plap > 0) RK.back = true;   // rolled back over the line
    RK.prog = (RK.plap - 1 - (RK.back ? 1 : 0)) * L + rel;
  }
  RK.prel = rel;
}
function raceOrder() {   // everyone, first to last: those who have finished by their time, then by how far round they are
  const rows = [{n: 'You', me: 1, prog: RK.prog || 0, fin: RK.fin || 0}, ...RK.ai.map(a => ({n: a.n, prog: a.prog, fin: a.fin || 0}))];
  rows.sort((a, b) => (a.fin && b.fin) ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog); return rows;
}
const raceNth = n => n + (['TH', 'ST', 'ND', 'RD'][n > 3 ? 0 : n] || 'TH');

/* ---------- THE RACE: five lights on the gantry, three laps, four other cars, a results card ---------- */
const raceTime = ms => { ms = Math.max(0, Math.round(ms)); const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100; return m + ':' + String(s).padStart(2, '0') + '.' + String(c).padStart(2, '0'); };
function raceFree() { RK.mode = 'free'; RK.ai = []; RK.fin = 0; RK.prog = 0; const r = $('#raceRes'); if (r) r.classList.remove('on'); }
function raceStart() { const C = RK.car, M = RD.length; if (!RK.drive || RK.mode !== 'free') return;
  const put = (g) => { let bi = 0, bd = 1e12; for (let i = 0; i < M; i++) { const p = RD[i], d = (p.x - g[0]) ** 2 + (p.y - g[1]) ** 2; if (d < bd) { bd = d; bi = i; } } const p = RD[bi]; return {i: bi, s: p.s, lane: (g[0] - p.x) * -p.ty + (g[1] - p.y) * p.tx}; };
  RK.ai = R_RIVALS.map((r, k) => { const q = put(R_GRIDS[k]); return {n: r.n, name: 'rival' + 'abcd'[k], vmax: r.v, g: r.g, acc: 150 + k * 14, s: q.s, lane: q.lane, lt: q.lane, v: 0, lap: 0, rel: rdRel(q.s), prog: rdRel(q.s) - RD.L, fin: 0, x: R_GRIDS[k][0], y: R_GRIDS[k][1], a: -Math.PI / 2}; });
  const g = R_GRIDS[4]; C.x = g[0]; C.y = g[1]; C.tv = C.ca = -Math.PI / 2; C.rev = 0; C.slip = 0; C.kx = C.ky = 0; C.v = 0; C.boost = 0; C.dT = 0;
  const q = put(g); RK.pi = q.i; RK.ps = q.s; RK.plane = q.lane; RK.prel = rdRel(q.s); RK.plap = 0; RK.back = false; RK.prog = RK.prel - RD.L;
  RK.mode = 'count'; RK.ct = 3.8; RK.lit = 0; RK.lap = 1; RK.laps = []; RK.cp = 0; RK.msg = ''; RK.fin = 0; RK.total = 0; RK.lapT = 0; CARFX.marks.length = 0; sfx('click');
  for (const a of RK.ai) carPoof(a.x, a.y, 6); }
function raceTick(dt, t) {
  if (RK.mode === 'count') { RK.ct -= dt; const n = clamp(Math.floor((3.8 - RK.ct) / .6), 0, 5); if (n > RK.lit) { RK.lit = n; sfx('rbeep'); }
    if (RK.ct <= 0) { RK.mode = 'race'; RK.goT = 1.4; sfx('rgo'); } }
  else if (RK.mode === 'race') { RK.lapT += dt * 1000; RK.total += dt * 1000; if (RK.goT > 0) RK.goT -= dt; }
  else if (RK.mode === 'done') { RK.total += dt * 1000; RK.resT = (RK.resT || 0) - dt; if (RK.resT <= 0) { RK.resT = .5; raceResults(); } }
  if (RK.drive || RK.ai.length) racePos();
  if (RK.ai.length) raceAiStep(dt);
  if (RK.mode === 'race') RK.place = raceOrder().findIndex(r => r.me) + 1;
  if (RK.msgT > 0) { RK.msgT -= dt; if (RK.msgT <= 0) RK.msg = ''; }
}
function raceLapDone() {
  const ms = Math.round(RK.lapT), best = !RBEST || ms < RBEST; RK.laps.push(ms); RK.cp = 0; RK.lapT = 0; RK.plap++;
  if (best) { RBEST = ms; raceSrv('rlap', {ms}).catch(() => {}); }
  if (RK.plap > R_LAPS) { RK.fin = RK.total; RK.place = raceOrder().findIndex(r => r.me) + 1; RK.mode = 'done'; RK.resT = 0; RK.newBest = best; sfx(RK.place === 1 ? 'win' : 'rare'); raceResults(); $('#raceRes').classList.add('on'); }
  else { RK.lap = RK.plap; RK.msg = (best ? 'BEST LAP ' : 'LAP ') + raceTime(ms); RK.msgT = 2.2; sfx(best ? 'rare' : 'coin'); }
  raceChip();
}
function raceResults() {   // the card at the end: where everyone came, and your laps
  const rows = raceOrder(), me = rows.findIndex(r => r.me) + 1, bl = Math.min(...RK.laps);
  $('#rrTitle').textContent = raceNth(me) + ' PLACE';
  $('#rrRows').innerHTML = rows.map((r, i) => `<div class="rr${r.me ? ' me' : ''}"><i>${i + 1}</i><b>${r.n}</b><span>${r.fin ? raceTime(r.fin) : ''}</span></div>`).join('') +
    `<div class="rrBest">Best lap <b>${raceTime(bl)}</b></div>`;
}
function raceChip() {   // beside the coins: the lap you are on and its clock; otherwise your best lap
  const row = $('#hallBar .lrow'); if (!row) return; let c = $('#raceChip'); if (!c) { c = document.createElement('span'); c.className = 'lchip'; c.id = 'raceChip'; row.appendChild(c); }
  const m = WL.me, here = !!m && m.loc === RACE, txt = !here ? '' : RK.mode === 'race' ? `LAP ${RK.lap}/${R_LAPS}  ${raceTime(RK.lapT).slice(0, -1)}` : RBEST ? 'BEST ' + raceTime(RBEST) : '';
  if (c.dataset.t !== txt) { c.dataset.t = txt; c.textContent = txt; c.style.display = txt ? 'inline-flex' : 'none'; }
}
function raceLine() {   // the big line over the bottom bar: your place while you race
  const C = RK.car; let s = '';
  if (RK.msg) s = RK.msg; else if (RK.mode === 'race') s = RK.goT > 0 ? 'GO' : raceNth(RK.place); else if (RK.mode !== 'free') s = '';
  else if (RK.drive && inR(R_GRIDZONE, C.x, C.y)) s = 'TAP TO RACE'; else if (RK.drive && inR(R_APRON, C.x, C.y) && C.rev < .3) s = 'TAP FOR THE MECHANIC';
  const e = $('#hallLine'); if (e && e.textContent !== s) e.textContent = s;
}
SFX.rbeep = () => tone(520, .16, {type: 'square', vol: .1});
SFX.rgo = () => { tone(1040, .5, {type: 'square', vol: .11}); tone(1560, .4, {type: 'triangle', vol: .06, at: .02}); };
SFX.rboost = () => { hiss(.5, {vol: .12, bp: 900}); tone(180, .45, {type: 'sawtooth', vol: .07, to: 520}); };
SFX.rkerb = () => tone(84, .05, {type: 'square', vol: .06, to: 60});
SFX.wrench = () => { tone(1900, .03, {type: 'square', vol: .06, to: 1200}); tone(1500, .03, {type: 'square', vol: .06, to: 900, at: .07}); tone(1700, .03, {type: 'square', vol: .06, to: 1000, at: .14}); hiss(.16, {vol: .05, bp: 2600}); };
(() => {   // the results card (a plain panel)
  const d = document.createElement('div'); d.id = 'raceRes';
  d.innerHTML = `<h3 id="rrTitle"></h3><div id="rrRows"></div><div class="row"><button class="btn red" id="rrAgain">Race again</button><button class="btn" id="rrDone">Done</button></div>`;
  $('#phone').appendChild(d); d.addEventListener('pointerdown', e => e.stopPropagation());
  $('#rrAgain').onclick = () => { sfx('click'); raceFree(); if (RK.drive) raceStart(); };
  $('#rrDone').onclick = () => { sfx('close'); raceFree(); };
  const st = document.createElement('style'); st.textContent = `#raceRes{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);z-index:25;display:none;width:min(300px,84%);background:#f6dfae;color:#1a1430;border:4px solid #5a3420;border-radius:6px;box-shadow:inset 0 -6px 0 #e9c88a,0 5px 0 #0008;padding:12px 14px 16px;font-family:"Pixelify Sans",system-ui,sans-serif;font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0}
#raceRes.on{display:block}#raceRes h3{margin:0 0 8px;font:700 24px "Pixelify Sans";text-align:center;letter-spacing:.5px}
#raceRes .rr{display:flex;align-items:center;gap:8px;padding:5px 8px;margin-top:4px;background:#fff6df;border:3px solid #5a3420;border-radius:5px;font-size:16px}#raceRes .rr.me{background:#ffe08a;border-color:#1a1430}
#raceRes .rr i{font-style:normal;font-weight:700;width:18px}#raceRes .rr b{flex:1}#raceRes .rrBest{text-align:center;margin:10px 0 12px;font-size:15px}#raceRes .row{display:flex;gap:8px;justify-content:center}
#reList{background:#f6dfae;color:#1a1430;border:4px solid #5a3420;border-radius:6px;box-shadow:inset 0 -6px 0 #e9c88a}`; document.head.appendChild(st);
})();

/* ---------- drawing the place ---------- */
function raceMechSet() { if (!SP.mechanic && IMG['mech/front']) SP.mechanic = {front: makeDir(IMG['mech/front'], false, [[8, 14, 2, 3], [14, 14, 2, 3]]), back: makeDir(IMG['mech/back'], false, []),
  right: makeDir(IMG['mech/right'], false, []), left: makeDir(IMG['mech/left'], false, [])}; return SP.mechanic; }
/* THE CROWD: the game's own cast, sat along the benches of both grandstands. They bob, and jump when a car goes past. */
const R_SEATS = [[88, 26, 86], [88, 114, 176], [101, 22, 84], [101, 116, 180], [115, 18, 82], [115, 118, 184]];   // the benches on the grandstand picture: feet line, from x, to x
function raceCrowd(st, si, t) {
  if (!RK.fans) RK.fans = Object.keys(SP).filter(n => !STACK[n] && SP[n] && SP[n].front && SP[n].front.frames && SP[n].front.frames[0] && n !== 'mechanic' && n !== 'smith'); const F = RK.fans; if (!F.length) return;
  const img = IMG['race/stand'], cars = [RK.car, ...RK.ai], hot = cars.some(c => Math.abs(c.x - (st.x + 100)) < 260 && Math.abs(c.y - (st.y + 100)) < 260 && (c.v || 0) > 100); let k = si * 97;
  for (const [fy, x0, x1] of R_SEATS) for (let x = x0 + 6; x <= x1 - 4; x += 13) { k++; const d = SP[F[(k * 7 + si * 3) % F.length]].front, ph = (k * 37) % 100 / 100 * 6.28;
    const up = hot ? Math.max(0, Math.sin(t * .012 + ph)) * 4 : Math.max(0, Math.sin(t * .003 + ph) - .8) * 6; lx.drawImage(d.frames[0][0], X(st.x + x) - (d.w >> 1), Y(st.y + fy) - d.h - Math.round(up)); }
  lx.drawImage(img, 0, 119, img.width, img.height - 119, X(st.x), Y(st.y + 119), img.width, img.height - 119);   // the front rail and its garland go back over their legs
}
function raceGantryLights(t) {   // five red lamps come on one by one; all out = GO (then green for a moment)
  const G = R_GANTRY, go = RK.mode === 'race' && RK.goT > 0, n = RK.mode === 'count' ? RK.lit : 0; if (!go && !n) return;
  G.lamps.forEach((lxp, i) => { if (!go && i >= n) return; const cx = X(G.x + lxp), cy = Y(G.y + G.ly); lx.fillStyle = go ? '#5fc46f' : '#e4544f'; lx.fillRect(cx - 3, cy - 4, 7, 9); lx.fillRect(cx - 4, cy - 3, 9, 7);
    lx.fillStyle = go ? '#c8ffd0' : '#ffb0a8'; lx.fillRect(cx - 2, cy - 2, 2, 2); });
}
function raceObjs(m, dt, t) {
  const out = [], fade = (o, R, k) => { const hid = !RK.drive && m.y < o.base - 2 && m.y > o.y + 6 && m.x > o.x + 3 && m.x < o.x + o.img.width - 3; R[k] = clamp((R[k] ?? 1) + (hid ? -1 : 1) * dt * 4, .45, 1); if (R[k] < 1) o.alpha = R[k]; return o; };
  const x0 = cam.x - 60, x1 = cam.x + cam.lw + 60, y0 = cam.y - 30, y1 = cam.y + cam.lh + 170, seen = (x, y, w) => x + w > x0 && x < x1 && y > y0 - 20 && y < y1;
  const g = IMG['race/garage']; if (g && seen(R_GAR.x, R_GAR.y, g.width)) out.push(fade({img: g, x: R_GAR.x, y: R_GAR.y, base: R_GAR.y + g.height - 4}, R_GAR, 'a'));
  const pt = IMG['race/pits']; if (pt && seen(R_PITS.x, R_PITS.y, pt.width)) out.push(fade({img: pt, x: R_PITS.x, y: R_PITS.y, base: R_PITS.y + pt.height - 4}, R_PITS, 'a'));
  const s = IMG['race/stand']; if (s) R_STANDS.forEach((st, i) => { if (seen(st.x, st.y, s.width)) out.push({img: s, x: st.x, y: st.y, base: st.y + s.height - 4, after: () => raceCrowd(st, i, t)}); });
  const ga = IMG['race/gantry']; if (ga && seen(R_GANTRY.x, R_GANTRY.y, ga.width)) out.push({img: ga, x: R_GANTRY.x, y: R_GANTRY.y, base: R_GANTRY.y + ga.height - 4, after: () => raceGantryLights(t)});
  for (const [k, px, py] of R_PROPS) { const im = IMG['race/' + k]; if (im && seen(px, py, im.width)) out.push({img: im, x: px, y: py, base: py + im.height - 3}); }
  for (const b of RK.bars) { if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1) continue; const im = stackFrame('tyres', 0, b.ai); if (!im) continue;
    const sx = b.sh > 0 ? Math.round(Math.sin(b.sh * 70) * 1.5) : 0; out.push({img: im, x: Math.round(b.x) - (im.width >> 1) + sx, y: Math.round(b.y) - im.height + 4 + Math.round(STACK.tyres.s * .55), base: b.y + 5}); }
  return out;
}
/* SPEED STREAKS: thin white lines flying back past the screen the faster you go (gold while you boost). Solid pixels, no blur. */
function raceStreaks(dt) {
  const C = RK.car, f = RK.drive ? clamp(((C.v || 0) - 190) / 170, 0, 1) : 0, want = Math.round(f * 28) + (RK.drive && C.boost > 0 ? 16 : 0) + (RK.drive && C.tow > .5 ? 8 : 0), A = RK.streaks;
  while (A.length < want) A.push({x: Math.random() * cam.lw, y: Math.random() * cam.lh, l: 14 + Math.random() * 30, a: .5 + Math.random() * .4}); if (A.length > want) A.length = want; if (!want) return;
  const dx = -Math.cos(C.tv), dy = -Math.sin(C.tv), sp = (C.v || 0) * 1.5, w = cam.lw, h = cam.lh, cx = X(C.x), cy = Y(C.y);
  for (const s of A) { s.x += dx * sp * dt; s.y += dy * sp * dt; if (s.x < -30) { s.x += w + 60; s.y = Math.random() * h; } else if (s.x > w + 30) { s.x -= w + 60; s.y = Math.random() * h; } if (s.y < -30) { s.y += h + 60; s.x = Math.random() * w; } else if (s.y > h + 30) { s.y -= h + 60; s.x = Math.random() * w; }
    if (Math.abs(s.x - cx) < 46 && Math.abs(s.y - cy) < 40) continue;
    const n = Math.round(s.l * (.6 + f)), al = s.a * (.5 + .5 * f); lx.fillStyle = `rgba(30,44,96,${al * .55})`; for (let k = 0; k < n; k++) lx.fillRect(Math.round(s.x + dx * k - dy), Math.round(s.y + dy * k + dx), 1, 1);   // a dark edge, so they show on the snow too
    lx.fillStyle = C.boost > 0 ? `rgba(255,226,150,${s.a})` : `rgba(255,255,255,${al})`; for (let k = 0; k < n; k++) lx.fillRect(Math.round(s.x + dx * k), Math.round(s.y + dy * k), 1, 1); }
}
RH.frame = (m, people, dt, t, H, img) => {
  const C = RK.car; raceCarStep(dt, t); raceTick(dt, t);
  if (RK.drive) { m.x = C.x; m.y = C.y; m.walk = false; m.path = []; if (NET.on && (C.v || 0) > 1) netMove(); }   // (online, the others see you where the car is; they do not see the car itself yet)
  // the camera: on foot it follows you like anywhere else; in the car it pulls right back, looks up the road the faster you go, and shakes on a bump
  const want = RK.drive ? 375 : 190; RK.vw += (want - RK.vw) * Math.min(1, dt * 3.2); if (Math.abs(RK.vw - want) < 2) RK.vw = want;
  const la = RK.drive ? Math.min(125, (C.v || 0) * .36) : 0; RK.lookx += (Math.cos(C.tv) * la - RK.lookx) * Math.min(1, dt * 2.4); RK.looky += (Math.sin(C.tv) * la - RK.looky) * Math.min(1, dt * 2.4);
  const tp = $('#townHud #hallBar'), r = tp && tp.getBoundingClientRect(), cr = cv.getBoundingClientRect(), loose = r && r.height ? clamp((r.top - cr.top + 6) / cr.height, .6, 1) : .8;
  RK.countUp = (RK.countUp || 0) + ((RK.mode === 'count' ? Math.max(0, (C.y - (R_GANTRY.y + 20)) - cam.lh * .42) : 0) - (RK.countUp || 0)) * Math.min(1, dt * 3);   // on the grid the camera lifts so you can see the lights
  const shx = RK.shake > 0 ? Math.round(Math.sin(t * .11) * 5 * RK.shake) : 0, shy = RK.shake > 0 ? Math.round(Math.cos(t * .13) * 4 * RK.shake) : 0;
  const fx = (RK.drive ? C.x + (C.cox || 0) + RK.lookx : m.x) + shx, fy = (RK.drive ? C.y + (C.coy || 0) + RK.looky + 10 : m.y + 24) + shy - (RK.countUp || 0);
  if (RK.vw === want) view(img, fx, fy, want, {loose, hi: true}); else view(img, fx, fy, RK.vw, {loose, s: W / RK.vw});
  if (CARFX.marks.length) carMarks();
  if (RK.mode === 'free' && RK.drive) { const q = Math.floor(t / 400) % 2; lx.fillStyle = q ? 'rgba(255,210,94,.55)' : 'rgba(255,242,168,.55)';   // the grid, lit up: stop here to race
    for (const g of R_GRIDS) { const bx = X(g[0] - 20), by = Y(g[1] - 30); lx.fillRect(bx, by, 40, 2); lx.fillRect(bx, by, 2, 20); lx.fillRect(bx + 38, by, 2, 20); } }
  if (WL.sel && WL.sel.loc === m.loc) { const q = Math.floor(t / 200) % 2; lx.strokeStyle = q ? '#ffd25e' : '#fff2a8'; lx.lineWidth = 1; lx.beginPath(); lx.ellipse(X(WL.sel.x) + .5, Y(WL.sel.y) + .5, 9 + q, 3 + q * .5, 0, 0, 7); lx.stroke(); }
  const extra = []; if (IMG['stack/racecar']) extra.push({name: 'racecar', ang: C.ca, x: C.x + (C.cox || 0), y: C.y + (C.coy || 0), t, phase: 0, walk: (C.v || 0) > 30, dir: 'front'});
  for (const a of RK.ai) if (IMG['stack/' + a.name]) extra.push({name: a.name, ang: a.a, x: a.x, y: a.y, t, phase: 0, walk: a.v > 30, dir: 'front'});
  if (raceMechSet()) { const dx = m.x - R_MECH[0], dy = m.y - R_MECH[1], near = Math.hypot(dx, dy) < 90; extra.push({name: 'mechanic', dir: near ? dirFrom(dx, dy) : 'front', x: R_MECH[0], y: R_MECH[1], t, phase: 400}); }
  const hits = drawScene((RK.drive ? people.filter(p => p.e !== m) : people).concat(extra), null, img, raceObjs(m, dt, t)); for (const p of extra) hits.delete(p);
  wlFx(dt, m.loc); drawPuffs(dt); carPuffs(dt); wlCases(dt, m.loc);
  if (RK.mode === 'race' || RK.mode === 'done') for (const a of RK.ai) { const w = a.n.length * 4 + 1, fx0 = X(a.x) - (w >> 1), fy0 = Y(a.y) - 34; lx.fillStyle = '#1a1430'; lx.fillRect(fx0 - 1, fy0 - 1, w + 2, 9); lx.fillStyle = '#fff'; pxText(lx, a.n.toUpperCase(), fx0 + 1, fy0 + 1); }   // who is who
  if (RK.mode === 'free' && !RK.drive) { const txt = 'RACE', w = txt.length * 4 + 1, g = R_GRIDS[2], fx0 = X(g[0] + 30) - Math.floor(w / 2), fy0 = Y(g[1] - 46) + Math.round(Math.sin(t * .005) * 1.5);   // a tag over the grid, like FISH over the jetty
    lx.fillStyle = '#1a1430'; lx.fillRect(fx0 - 1, fy0 - 1, w + 2, 9); lx.fillRect(fx0 + Math.floor(w / 2) - 1, fy0 + 8, 3, 2); lx.fillStyle = '#e4544f'; lx.fillRect(fx0, fy0, w, 7); lx.fillStyle = '#fff'; pxText(lx, txt, fx0 + 1, fy0 + 1); }
  raceStreaks(dt);
  lx.fillStyle = 'rgba(255,236,190,.06)'; lx.fillRect(0, 0, cam.lw, cam.lh);
  raceLine(); if (RK.mode === 'race') raceChip();
  return hits;
};

/* ================= THE MECHANIC'S EDITOR (his ask: "similar to the GTA mechanic system") =================
   The whole screen: your car on a turntable, drawn from its slices at any angle. Pick a kind of part and the car TURNS to show it:
   Wheels = side on, Exhaust = the back, Spoiler = the back from higher up, Engine = the front, and the BONNET OPENS on the engine.
   Tap a part and it is on the car straight away (a preview); Buy / Fit makes it yours. Drag the car to spin it yourself. */
const R_VIEW = {paint: {a: .7, sq: .55, spin: .55}, wheels: {a: 1.3, sq: .5}, exhaust: {a: Math.PI - .32, sq: .46}, spoiler: {a: Math.PI + .55, sq: .62}, engine: {a: .3, sq: .7, bon: 3}};
const RBW = 52, RBH = 54;
(() => {
  const d = document.createElement('div'); d.id = 'raceEd';
  d.innerHTML = `<div class="reHead"><b>THE MECHANIC</b><span class="lchip">${ic('coin', 2, 'solo')}<span class="coinN">0</span></span><button class="btn dark" id="reX">${ic('cross', 2, 'solo')}</button></div>
    <div id="reStage"><canvas id="reCv" width="${RBW}" height="${RBH}"></canvas><div id="reName"></div></div>
    <div id="reStats"></div><div id="reTabs">${RCATS.map(c => `<button class="btn" data-c="${c}">${RCAT_NAME[c]}</button>`).join('')}</div><div id="reList"></div>`;
  $('#phone').appendChild(d);
  $('#reX').onclick = () => raceEdClose();
  d.querySelectorAll('#reTabs .btn').forEach(b => b.onclick = () => { sfx('click'); raceEdCat(b.dataset.c); });
  const cvs = $('#reCv'); let drag = null;
  cvs.addEventListener('pointerdown', e => { drag = {x: e.clientX, a: RK.ed.a}; RK.ed.free = true; try { cvs.setPointerCapture(e.pointerId); } catch (_) {} });
  cvs.addEventListener('pointermove', e => { if (drag) { RK.ed.a = drag.a - (e.clientX - drag.x) * .014; RK.ed.ta = RK.ed.a; } });
  const up = () => { drag = null; }; cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
  d.addEventListener('pointerdown', e => e.stopPropagation());
})();
function raceEdOpen() {
  const E = RK.ed, m = WL.me; if (E.on || !RK.j || !m || m.loc !== RACE) return; if (RK.mode !== 'free') return;
  Object.assign(E, {on: true, cat: 'paint', pre: {...RSET}, a: -1.2, ta: R_VIEW.paint.a, sq: .55, bon: 0, hop: 0, free: false, strip: null, key: '', busy: false});
  RK.car.rev = 0; sfx('open'); $('#raceEd').classList.add('on'); paintCoins(); raceEdCat('paint'); raceEdFit();
}
function raceEdClose() { const E = RK.ed; if (!E.on) return; E.on = false; $('#raceEd').classList.remove('on'); sfx('close'); raceBuildCar(); }
function raceEdFit() { const st = $('#reStage'), c = $('#reCv'); if (!st || !c) return; const k = Math.max(2, Math.floor(Math.min(st.clientWidth / RBW, st.clientHeight / RBH))); c.style.width = RBW * k + 'px'; c.style.height = RBH * k + 'px'; }
function raceEdCat(c) { const E = RK.ed; E.cat = c; E.pre = {...RSET}; E.free = false; const V = R_VIEW[c];
  const wrapA = a => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI; E.ta = E.a + wrapA(V.a - E.a);   // turn the short way round
  document.querySelectorAll('#reTabs .btn').forEach(b => b.classList.toggle('sel', b.dataset.c === c)); raceEdList(); }
function raceEdList() {
  const E = RK.ed, c = E.cat, P = RPARTS[c], L = $('#reList'); if (!L) return;
  L.innerHTML = P.map((q, i) => { const own = ROWN[c].has(i), fit = RSET[c] === i, pre = E.pre[c] === i;
    const bits = c === 'paint' ? '' : [['spd', 'SPEED'], ['acc', 'ACCEL'], ['grip', 'GRIP']].filter(([k]) => q[k]).map(([k, n]) => `+${q[k]} ${n}`).join(' ');
    return `<div class="ro${pre ? ' on' : ''}" data-i="${i}">${c === 'paint' ? `<span class="sw" style="background:${q.c[2]}"></span>` : ''}<b>${q.n}${bits ? `<br><small>${bits}</small>` : ''}</b>
      <button class="btn${fit ? '' : own ? ' go' : ' red'}" data-b="${i}"${fit || (!own && coins < q.p) ? ' disabled' : ''}>${fit ? 'Fitted' : own ? 'Fit' : ic('coin', 2, 'solo') + ' ' + q.p}</button></div>`; }).join('');
  L.querySelectorAll('.ro').forEach(r => r.onclick = ev => { const i = +r.dataset.i; if (ev.target.closest('.btn')) return; raceEdPick(i); });
  L.querySelectorAll('.btn').forEach(b => b.onclick = () => raceEdBuy(+b.dataset.b));
  raceEdStats();
}
function raceEdPick(i) { const E = RK.ed; if (E.pre[E.cat] === i) return; E.pre[E.cat] = i; E.hop = .22; E.free = false; { const V = R_VIEW[E.cat], wrapA = a => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI; if (!V.spin) E.ta = E.a + wrapA(V.a - E.a); } sfx('wrench'); raceEdList(); }
async function raceEdBuy(i) {
  const E = RK.ed, c = E.cat, own = ROWN[c].has(i); if (E.busy || RSET[c] === i) return; E.busy = true; if (E.pre[c] !== i) raceEdPick(i);
  try { const r = await raceSrv(own ? 'rset' : 'rbuy', {cat: c, id: i}); if (r && r.race) raceApply(r.race); else { ROWN[c].add(i); RSET[c] = i; raceBuildCar(); }
    sfx(own ? 'wrench' : 'coin'); E.hop = .3; }
  catch (e) { wlSay(e.message, 'bad'); toast(e.message); }
  E.busy = false; paintCoins(); raceEdList();
}
function raceEdStats() {   // three bars: what the car has now, and in green or red what the part you are looking at would change
  const E = RK.ed, a = raceStats(RSET), b = raceStats(E.pre), rows = [['SPEED', 2 + a.spd * 2, 2 + b.spd * 2], ['ACCEL', 2 + a.acc, 2 + b.acc], ['GRIP', 2 + a.grip, 2 + b.grip]];
  $('#reStats').innerHTML = rows.map(([n, v0, v1]) => `<span>${n}</span><span class="rebar">${Array.from({length: 8}, (_, i) => `<span class="${i < Math.min(v0, v1) ? 'on' : i < v1 ? 'up' : i < v0 ? 'dn' : ''}"></span>`).join('')}</span>`).join('');
  const q = RPARTS[E.cat][E.pre[E.cat]]; $('#reName').textContent = q ? q.n : '';
}
/* the car on its turntable: the same loop as the game's stack drawer (turn each slice, squash it for the camera, lift it a pixel a
   slice, bottom to top, ONE navy outline round the lot), but at any angle and any camera height, and bigger */
function raceEdDraw(dt, t) {
  const E = RK.ed, J = RK.j, cvs = $('#reCv'); if (!E.on || !J || !cvs) return; const V = R_VIEW[E.cat], S = J.s, N = J.n;
  if ((raceEdDraw.n = (raceEdDraw.n || 0) + 1) % 30 === 1) raceEdFit();
  if (V.spin && !E.free) E.ta += dt * V.spin;
  E.a += (E.ta - E.a) * Math.min(1, dt * 5); E.sq += (V.sq - E.sq) * Math.min(1, dt * 5);
  const settled = Math.abs(E.ta - E.a) < .35, bonT = V.bon && settled ? V.bon : 0; E.bon += clamp(bonT - E.bon, -dt * 7, dt * 7);   // the bonnet lifts once the nose has come round, and shuts before it turns away
  if (E.hop > 0) E.hop -= dt;
  const bf = Math.round(E.bon), key = RCATS.map(c => E.pre[c]).join('.') + '|' + bf; if (key !== E.key) { E.key = key; E.strip = raceStrip(E.pre, bf, 1); }
  const st = E.strip; if (!st) return;
  if (!E.buf) { E.buf = mk(RBW, RBH); E.bx = E.buf.getContext('2d', {willReadFrequently: true}); }
  const b = E.bx, x = cvs.getContext('2d'), cx = RBW / 2, cy = RBH - 15, hop = E.hop > 0 ? Math.round(Math.sin((E.hop / .25) * Math.PI) * 2) : 0;
  // the garage floor and the turntable (flat pixels, no gradients)
  x.imageSmoothingEnabled = false; x.fillStyle = '#141024'; x.fillRect(0, 0, RBW, RBH);
  const rx = 25, ry = Math.round(rx * E.sq * .86);
  for (let yy = -ry; yy <= ry; yy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2))); x.fillStyle = '#0f0b1e'; x.fillRect(cx - hw - 1, cy + yy + 2, hw * 2 + 2, 1); }
  for (let yy = -ry; yy <= ry; yy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2))); x.fillStyle = '#3a3260'; x.fillRect(cx - hw, cy + yy, hw * 2, 1); if (hw > 3) { x.fillStyle = '#2a2346'; x.fillRect(cx - hw + 2, cy + yy, hw * 2 - 4, 1); } }
  for (let k = 0; k < 12; k++) { const a = E.a + k * Math.PI / 6; x.fillStyle = k % 3 ? '#4a4276' : '#ffd25e'; x.fillRect(Math.round(cx + Math.cos(a) * (rx - 3)) - 1, Math.round(cy + Math.sin(a) * (ry - 2)), 2, 1); }   // marks round the rim turn with the car
  x.fillStyle = 'rgba(8,6,20,.45)'; for (let yy = -8; yy <= 8; yy++) { const hw = Math.round(19 * Math.sqrt(Math.max(0, 1 - (yy / 8) ** 2)) * (.75 + .25 * Math.abs(Math.sin(E.a)))); x.fillRect(cx - hw, cy + yy + 1, hw * 2, 1); }
  // the car
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, RBW, RBH); b.imageSmoothingEnabled = false;
  for (let z = 0; z < N; z++) { b.setTransform(1, 0, 0, E.sq, cx, cy - z - hop); b.rotate(E.a); b.drawImage(st, z * S, 0, S, S, -S / 2, -S / 2, S, S); }
  b.setTransform(1, 0, 0, 1, 0, 0);
  const d = b.getImageData(0, 0, RBW, RBH), p = d.data, edge = [], A = (X0, Y0) => X0 >= 0 && Y0 >= 0 && X0 < RBW && Y0 < RBH && p[(Y0 * RBW + X0) * 4 + 3] >= 60;
  for (let Y0 = 0; Y0 < RBH; Y0++) for (let X0 = 0; X0 < RBW; X0++) { const i = (Y0 * RBW + X0) * 4; if (A(X0, Y0)) p[i + 3] = 255; else { p[i + 3] = 0; if (A(X0 + 1, Y0) || A(X0 - 1, Y0) || A(X0, Y0 + 1) || A(X0, Y0 - 1)) edge.push(i); } }
  for (const i of edge) { p[i] = 1; p[i + 1] = 3; p[i + 2] = 46; p[i + 3] = 255; } b.putImageData(d, 0, 0);
  x.drawImage(E.buf, 0, 0);
}

/* ---------- every frame, in any place ---------- */
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { const m = WL.me; if ((RK.drive || RK.ai.length) && (!m || m.loc !== RACE)) { RK.drive = false; raceFree(); } if (RK.ed.on && (!m || m.loc !== RACE)) raceEdClose();
    const r = fr.call(this, dt, t); raceBtn(); raceEngine(); raceEdDraw(dt, t); return r; };
  const lv = scenes.town.leave; scenes.town.leave = function () { RK.drive = false; raceFree(); if (RK.ed.on) raceEdClose(); raceEngine(); raceBtn(); return lv.apply(this, arguments); }; }
setInterval(raceChip, 1000);
