/* ================= THE BLACKSMITH + THE MINE (24 Nov 2026, his asks) =================
   SMITHY and MINE (their loc numbers) are registered in south.js; this file is everything inside them.
   THE MINE (rebuilt the same day, his words: "a lot better ... pickaxe swing animations, the cave and rocks are the 3d sprite stack
   style, you are actually mining these rocks or mining the walls ... different levels of cave, the deeper you go the harder the rocks
   ... diamond rocks, emerald rocks ... a new currency called Crystals ... only broken by a gold pickaxe"):
     - a cave is a grid of 16 px cells. Every wall block and every rock is a SPRITE STACK (tools/make_mine.py makes the slice strips:
       assets/mine/rocks.png, walls.png, floor.png). Any wall beside the floor can be dug out, so you tunnel where you like.
     - 5 levels, each with its own stone. A ladder shaft goes down. Deeper = more hits, more gold in the rocks.
     - crystal rocks (emerald, ruby, diamond) are found under a rock or wall you break on levels 4 and 5, rarely. Gold pickaxe only.
   THE BLACKSMITH: a chibi like the cast (tools/make_smith.py). He smelts gold (10 chunks = 15 coins, his numbers 25 Nov), sells pickaxes
   and swaps crystals for gold chunks.
   Server ops (functions/mine.js): mgo, mbreak, mpick, mcry, smelt, smeltGet. The server decides what is in every rock, so nothing here can be
   faked. mineLocal() = the same rules on this computer only (the ?lab on localhost, or while the ops are not deployed).
   MR = the numbers. THE SAME NUMBERS LIVE IN functions/mine.js: change both. */

const MR = {
  picks: [{id: 'wood', name: 'Wooden pickaxe', price: 0, pow: 1}, {id: 'stone', name: 'Stone pickaxe', price: 50, pow: 2}, {id: 'iron', name: 'Iron pickaxe', price: 200, pow: 3},
    {id: 'steel', name: 'Steel pickaxe', price: 700, pow: 5}, {id: 'gold', name: 'Gold pickaxe', price: 2500, pow: 8}],   // pickaxe n digs down to level n + 1; only the last one breaks crystal
  levels: 5, lvmul: [1, 1.6, 2.4, 3.6, 5],                                  // how much harder each level's stone is
  hp: {s: 3, g: 4, r: 6, w: 4, G: 5, R: 7, e: 30, u: 36, d: 44},            // s stone, g gold rock, r rich rock, w plain wall, G gold vein, R rich vein, e emerald, u ruby, d diamond
  rocks: 16, veins: 8, rockOdds: [[70, 28, 2], [58, 36, 6], [48, 40, 12], [40, 42, 18], [32, 44, 24]],   // per level: stone, gold, rich (out of 100)
  cryOdds: [0, 0, 0, .003, .008], cryMix: [0, 0, 0, [75, 25, 0], [60, 30, 10]], cryYield: {e: 1, u: 2, d: 4}, cryKeep: 3,   // a crystal rock under a break: the chance, which one, how many crystals
  goldMul: [1, 1.5, 2, 3, 4],                                                // round 3, his note: "the lower you go ... the more gold chunks there are in each rock": gold rocks and veins pay this many times more per level
  dayGold: 400, dayCry: 6, cryGold: 150, smeltIn: 10, smeltOut: 15, smeltMs: 300000, swingMs: 520};   // smeltMs: he takes 5 minutes over your gold
const mHits = (k, lv, pick) => Math.max(1, Math.ceil(MR.hp[k] * ('eud'.includes(k) ? 1 : MR.lvmul[lv - 1]) / MR.picks[pick].pow));
const isCry = k => 'eud'.includes(k);
const CRY_NAME = {e: 'emerald', u: 'ruby', d: 'diamond'}, CRY_GLOW = {e: '90,255,170', u: '255,110,120', d: '150,225,255'};

function mineLoad() {
  const L = (k, src) => load(k, src).catch(() => {});
  return Promise.all([L('hall/smithy', 'assets/interiors/smithy.png'), L('smith/front', 'assets/final/smith/front.png'),
    L('mine/rocks', 'assets/mine/rocks.png'), L('mine/props', 'assets/mine/props.png'), L('smith/work', 'assets/final/smith/work.png'),
    fetch('assets/final/smith/work.json?v=' + BUILD).then(r => r.json()).then(j => { SMW.rows = j.rows; SMW.cell = j.cell; }).catch(() => {}), L('mine/walls', 'assets/mine/walls.png'), L('mine/floor', 'assets/mine/floor.png'),
    ...['forge', 'anvil', 'counter', 'toolrack', 'barrel', 'coal', 'grindstone', 'coins'].map(k => L('sm/' + k, `assets/smithy/${k}.png`))]).then(mineMasks);
}
function mineMasks() {
  const sm = IMG['hall/smithy']; if (sm) IMG['hallw/smithy'] = maskCanvas(sm.width, sm.height, [[14, 82, 296, 214], [146, 212, 165, 226]], SMITHY_OBJS.filter(o => o.solid).map(o => o.solid));
  HALLS[SMITHY - 100].g = null; mineGeo(1); mineFill('');   // a first cave, so the place always has a floor to stand on
}

/* ---------- WHAT YOU CARRY: gold chunks, crystals, your best pickaxe ---------- */
const GOLD = {n: 0, cry: 0, pick: 0, job: null, local: false};   // job = your gold at the Blacksmith's: {c: coins it makes, t: when he started}
const pxIcon = (rows, C) => { const c = mk(rows[0].length, rows.length), x = c.getContext('2d'); rows.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return c; };
const GOLD_ICON = pxIcon(['..KKKK...', '.KYYWYK..', 'KYYYYYgK.', 'KYGYYYgK.', 'KGGYYggK.', '.KgggggK.', '..KKKKK..'], {K: '#1a1430', Y: '#ffd25e', W: '#fff6cf', G: '#e8b13a', g: '#b9781f'});
const CRY_ICON = pxIcon(['...KKK...', '..KWCCK..', '.KWCCCDK.', 'KWCCCCDDK', 'KCCCCDDDK', '.KCCDDDK.', '..KCDDK..', '...KDK...', '....K....'], {K: '#1a1430', W: '#ffffff', C: '#8fe6ff', D: '#3d9fe0'});
const iconImg = (ic, sc) => { const c = mk(ic.width * sc, ic.height * sc), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(ic, 0, 0, c.width, c.height); return `<img src="${c.toDataURL()}" style="width:${c.width}px;height:${c.height}px;image-rendering:pixelated;vertical-align:-2px" alt="">`; };
const goldImg = sc => iconImg(GOLD_ICON, sc), cryImg = sc => iconImg(CRY_ICON, sc);
{ const _wa = walletApply; walletApply = function (w) { _wa(w); if (!GOLD.local) { const k = (w && w.kit) || {}; GOLD.n = k.gold | 0; GOLD.cry = k.cry | 0; GOLD.pick = clamp(k.pick | 0, 0, MR.picks.length - 1); GOLD.job = k.sm && k.sm.t ? {c: k.sm.c | 0, t: +k.sm.t} : null; } goldChip(); if ($('#smithModal').classList.contains('on')) smithUI(); if ($('#pickModal').classList.contains('on')) pickUI(); }; }
function goldChip() {   // gold and crystals beside the coins, in the Blacksmith and the Mine
  const row = $('#hallBar .lrow'); if (!row) return; let c = $('#goldChip'), d = $('#cryChip');
  if (!c) { c = document.createElement('span'); c.className = 'lchip'; c.id = 'goldChip'; row.appendChild(c); d = document.createElement('span'); d.className = 'lchip'; d.id = 'cryChip'; row.appendChild(d); }
  const m = WL.me, on = !!m && (m.loc === SMITHY || m.loc === MINE); c.style.display = d.style.display = on ? '' : 'none'; if (!on) return;
  const sig = GOLD.n + '|' + GOLD.cry; if (goldChip.sig === sig) return; goldChip.sig = sig;
  c.innerHTML = goldImg(2) + ' <span>' + GOLD.n + '</span>'; d.innerHTML = cryImg(2) + ' <span>' + GOLD.cry + '</span>';
}

/* ---------- the server, or this computer standing in for it ---------- */
const LABM = (() => { try { return JSON.parse(localStorage.getItem('m2lab_mine') || 'null') || {}; } catch (e) { return {}; } })();
function mineLocal(op, d) {
  d = d || {}; const W = LABM, bad = m => { throw new Error(m); }, save = () => { try { localStorage.setItem('m2lab_mine', JSON.stringify(W)); } catch (e) {} };
  if (!GOLD.local) { GOLD.local = true; if (W.gold == null) { W.gold = GOLD.n; W.cry = GOLD.cry; W.pick = GOLD.pick; } }
  W.gold |= 0; W.cry |= 0; W.pick |= 0; W.cs = W.cs || ''; const day = new Date().toDateString(); if (W.dk !== day) { W.dk = day; W.m = 0; W.c = 0; }
  const sync = () => { GOLD.n = W.gold; GOLD.cry = W.cry; GOLD.pick = W.pick; GOLD.job = W.sm || null; goldChip(); save(); };
  const roll = odds => { let r = Math.random() * 100; for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r < 0) return i; } return 0; };
  if (op === 'mgo') { const lv = d.lv | 0; if (lv < 1 || lv > MR.levels) bad('No such level.'); if (W.pick < lv - 1) bad('You need a better pickaxe to go deeper.');
    let k = ''; for (let i = 0; i < MR.rocks; i++) k += 'sgr'[roll(MR.rockOdds[lv - 1])]; for (let i = 0; i < MR.veins; i++) k += Math.random() * 100 < 10 + lv * 10 ? 'R' : 'G';
    if (lv >= 4) k += W.cs; W.mine = {lv, k, t: Date.now()}; sync(); return {lv, k}; }
  if (op === 'mbreak') { const M = W.mine; if (!M) bad('You are not in the mine.'); const i = d.i | 0, lv = M.lv; let k = 'w';
    if (i >= 0) { k = M.k[i]; if (!k || k === '.') bad('That is already dug out.'); }
    if (isCry(k) && W.pick < 4) bad('Only a gold pickaxe can break crystal.');
    if (i >= 0) M.k = M.k.slice(0, i) + '.' + M.k.slice(i + 1);
    const r = Math.random(); let got = 0, gc = 0;
    if (isCry(k)) { gc = Math.min(MR.cryYield[k], MR.dayCry - W.c); W.cs = W.cs.replace(k, ''); }
    else got = k === 's' ? (r < .2 ? 1 : 0) : k === 'w' ? (r < .08 ? 1 : 0) : k === 'g' ? 1 + (r < .35) : k === 'r' ? 2 + Math.floor(r * 3) : k === 'G' ? 2 + (r < .3) : 3 + Math.floor(r * 3);
    if ('grGR'.includes(k)) got = Math.floor(got * MR.goldMul[lv - 1] + Math.random());
    got = Math.max(0, Math.min(got, MR.dayGold - W.m)); W.m += got; W.gold += got; W.c += gc; W.cry += gc;
    let grow = null; const lab = typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.cryAlways ? LABM.cryAlways : '';   // the lab only: LABM.cryAlways = 'e' | 'u' | 'd' puts a crystal under every break, to look at them
    if (!isCry(k) && lv >= 4 && W.cs.length < MR.cryKeep && (lab || Math.random() < MR.cryOdds[lv - 1])) { const c = lab || 'eud'[roll(MR.cryMix[lv - 1])]; W.cs += c; grow = {i: M.k.length, k: c}; M.k += c; }
    sync(); return {got, gc, gold: W.gold, cry: W.cry, grow, cap: W.m >= MR.dayGold}; }
  if (op === 'mpick') { const t = MR.picks.findIndex(p => p.id === d.id); if (t < 0) bad('No such pickaxe.'); if (W.pick >= t) return {pick: W.pick}; if (coins < MR.picks[t].price) bad('Not enough coins.'); coins -= MR.picks[t].price; paintCoins(); W.pick = t; sync(); return {pick: t}; }
  if (op === 'mcry') { const n = d.n | 0; if (n < 1 || n > W.cry) bad('You have no crystals.'); W.cry -= n; W.gold += n * MR.cryGold; sync(); return {gold: W.gold, cry: W.cry, got: n * MR.cryGold}; }
  if (op === 'smelt') { if (W.sm) bad('He is still working on your gold.'); const lots = Math.floor(W.gold / MR.smeltIn); if (!lots) bad('You need ' + MR.smeltIn + ' gold chunks.'); W.gold -= lots * MR.smeltIn; W.sm = {c: lots * MR.smeltOut, t: Date.now()}; sync(); return {job: W.sm, gold: W.gold}; }
  if (op === 'smeltGet') { const J = W.sm; if (!J) bad('He has nothing of yours.'); if (Date.now() - J.t < smeltMs()) bad('Your coins are not ready yet.'); coins += J.c; paintCoins(); delete W.sm; sync(); return {coins: J.c}; }
  bad('Unknown action.');
}
if (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.gold != null) { GOLD.local = true; GOLD.n = LABM.gold | 0; GOLD.cry = LABM.cry | 0; GOLD.pick = clamp(LABM.pick | 0, 0, 4); GOLD.job = LABM.sm || null; }   // the lab remembers what you dug
const smeltMs = () => (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.smeltMs) || MR.smeltMs;   // the lab only: LABM.smeltMs = 30000 makes his five minutes half a minute, to watch the whole job
async function mop(op, d) {
  if ((typeof LABLOCAL !== 'undefined' && LABLOCAL) || GOLD.local) return mineLocal(op, d);
  try { return await srv(op, d); } catch (e) { if (/Unknown action/i.test(String(e && e.message))) return mineLocal(op, d); throw e; }
}

/* ---------- THE BLACKSMITH'S, inside ---------- */
const SMITH_AT = [240, 119];   // where he stands, behind his counter
const PICKWALL = {x: 98, y: 27, w: 94, h: 40};   // the pickaxe wall (round 2: where the sword shelf was): all five, and where you buy the next one
const SMITHY_OBJS = [
  {k: 'pickwall', x: PICKWALL.x, y: PICKWALL.y, wall: true}, {k: 'toolrack', x: 212, y: 30, wall: true},   // his hammers and pliers hang behind him now (his note)
  {k: 'forge', x: 18, y: 6, solid: [20, 80, 94, 122]},
  {k: 'barrel', x: 22, y: 150, solid: [24, 182, 55, 198]}, {k: 'anvil', x: 104, y: 128, solid: [108, 160, 148, 178]},
  {k: 'coal', x: 62, y: 158, solid: [64, 186, 95, 201]}, {k: 'counter', x: 190, y: 92, solid: [190, 120, 290, 148], smith: true},
  {k: 'grindstone', x: 248, y: 150, solid: [252, 186, 296, 205]}];
const SMH = HALLS[SMITHY - 100];
/* HIS BREATHING (round 2, his note: "its extending his gloves as well"): the game stretches everybody at a line three quarters of the
   way down, which runs through his big gloves. His own frames stretch at row 28, under the gloves and the apron: only his legs give. */
function smithSet() {
  if (SP.smith || !IMG['smith/front']) return; const ds = makeDir(IMG['smith/front'], false, [[10, 8, 2, 3], [17, 8, 2, 3]]), w = ds.w, h = ds.h - PAD, waist = 28;   // his eyes: tools/make_smith.py prints them
  const pose = (src, o) => { const c = mk(w, h + PAD), x = c.getContext('2d'); x.drawImage(src, 0, PAD + waist, w, h - waist, 0, PAD + waist, w, h - waist);
    if (o < 0) for (let k = 0; k < -o; k++) x.drawImage(src, 0, PAD + waist - 1, w, 1, 0, PAD + waist - 1 - k, w, 1);
    x.drawImage(src, 0, PAD, w, waist, 0, PAD + o, w, waist); return c; };
  const b0 = ds.frames[0]; for (const o of [-2, -1, 1]) ds.frames[o] = [pose(b0[0], o), pose(b0[1], o)];
  SP.smith = {front: ds};
}
/* the pickaxe wall: a board with the five hanging on it. Yours and the ones under it in full colour, the next one too (it blinks), the rest dark. */
function pickWall() {
  const sig = GOLD.pick; if (pickWall.c && pickWall.sig === sig) return pickWall.c; pickWall.sig = sig;
  const W = PICKWALL.w, H = PICKWALL.h, c = pickWall.c || (pickWall.c = mk(W, H)), x = c.getContext('2d'), F = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); }; x.clearRect(0, 0, W, H);
  F('#01032e', 0, 0, W, H - 3); F('#8a4a22', 1, 1, W - 2, H - 5); F('#a85f2c', 1, 1, W - 2, 1); F('#6b3718', 1, H - 6, W - 2, 2);
  for (let i = 1; i < 5; i++) F('#6b3718', Math.round(i * W / 5), 2, 1, H - 8);                       // the planks
  for (const [a, b] of [[3, 3], [W - 5, 3], [3, H - 9], [W - 5, H - 9]]) F('#3a1f12', a, b, 2, 2);     // nails
  F('rgba(18,28,58,.38)', 1, H - 3, W - 2, 2);                                                         // its flat shadow on the wall
  for (let t = 0; t < 5; t++) { const cx = Math.round((t + .5) * W / 5), s = pickSprite(t, 48);
    F('#3a1f12', cx - 5, 9, 2, 2); F('#3a1f12', cx + 4, 9, 2, 2);                                      // two pegs under the head
    if (t <= GOLD.pick + 1) x.drawImage(s, cx - 20, 24 - 20);
    else { const d = mk(41, 41), dx = d.getContext('2d'); dx.drawImage(s, 0, 0); dx.globalCompositeOperation = 'source-in'; dx.fillStyle = '#4a2812'; dx.fillRect(0, 0, 41, 41); x.drawImage(d, cx - 20, 24 - 20); } }
  return c;
}
function pickWallAfter(t) {   // the next one to buy: yellow corners blinking round it
  const n = GOLD.pick + 1; if (n > 4 || Math.floor(t / 450) % 2) return; const cx = X(PICKWALL.x + Math.round((n + .5) * PICKWALL.w / 5)), y = Y(PICKWALL.y + 5); lx.fillStyle = '#ffd25e';
  for (const [a, b, sx, sy] of [[-8, 0, 1, 1], [8, 0, -1, 1], [-8, 26, 1, -1], [8, 26, -1, -1]]) { lx.fillRect(cx + a, y + b, 1, 1); lx.fillRect(cx + a + sx, y + b, 1, 1); lx.fillRect(cx + a, y + b + sy, 1, 1); }
}

/* ---------- SMELTING IS A JOB (round 2, his ask): "the blacksmith moves around the blacksmith interior realistically crafting/smelting the
   gold to make coins, this process should take 5 minutes ... to the fire and look like he is pouring gold in, then ... to the water ...
   then moves to the anvil to hammer the gold, then the gold coins are done. the players can leave and come back ... each player sees
   whatever they are up to". So where he is and what he does comes ONLY from your own job's start time (GOLD.job.t): nothing is sent
   between phones. No job = he stands behind his counter. His frames are PixelLab's (tools/make_smith.py work -> assets/final/smith/work.png). */
const SMW = {rows: null, cell: 64, fr: {}};   // 64 px cells, his feet on row 52
const SM_AT = {forge: [57, 127], barrel: [40, 148], anvil: [94, 172]};
const SM_P1 = [SMITH_AT, [176, 114], [70, 128], SM_AT.forge], SM_P2 = [SM_AT.forge, SM_AT.barrel], SM_P3 = [SM_AT.barrel, [84, 152], SM_AT.anvil], SM_P4 = [SM_AT.anvil, [176, 152], [176, 114], SMITH_AT];
// the five minutes, in seconds: walk to the forge, melt, carry to the water, quench, walk to the anvil, hammer, walk back
const SM_T = {forge: 7, carry: 100, barrel: 102, toAnvil: 170, anvil: 173, home: 292, done: 300};
function pathAt(P, f) { const L = []; let tot = 0; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); tot += d; }
  let d = clamp(f, 0, 1) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = L[i] ? Math.min(1, d / L[i]) : 1, a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    return {x: a[0] + dx * k, y: a[1] + dy * k, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north'}; } d -= L[i]; } }
function smithNow() {
  const J = GOLD.job; if (!J) return {home: true}; const e = (Date.now() - J.t) / smeltMs() * SM_T.done; if (e >= SM_T.done) return {home: true, ready: true}; if (e < 0) return {home: true};
  const walk = (P, a, b, st) => ({...pathAt(P, (e - a) / (b - a)), anim: 'walk', st, e, se: e - a}), T = SM_T;
  if (e < T.forge) return walk(SM_P1, 0, T.forge, 'go');
  if (e < T.carry) { const se = e - T.forge, c = se % 9; return {x: SM_AT.forge[0], y: SM_AT.forge[1], dir: 'north', anim: c < 3.2 ? 'pour' : 'idle', k: c / 3.2, st: 'forge', e, se}; }
  if (e < T.barrel) return walk(SM_P2, T.carry, T.barrel, 'carry');
  if (e < T.toAnvil) { const se = e - T.barrel; return {x: SM_AT.barrel[0], y: SM_AT.barrel[1], dir: 'south', anim: se < 26 ? 'pour' : 'idle', k: (se % 3.2) / 3.2, st: 'barrel', e, se}; }
  if (e < T.anvil) return walk(SM_P3, T.toAnvil, T.anvil, 'bar');
  if (e < T.home) { const se = e - T.anvil, c = se % 1.1; return {x: SM_AT.anvil[0], y: SM_AT.anvil[1], dir: 'east', anim: c < .72 ? 'hammer' : 'idle', k: c / .72, st: 'anvil', e, se}; }
  return walk(SM_P4, T.home, T.done, 'back');
}
function smithFrame(anim, dir, k, t) {   // one of PixelLab's frames; null = not loaded (then he is drawn standing, as before)
  const im = IMG['smith/work'], R = SMW.rows; if (!im || !R) return null; let row = R[anim + '_' + dir] || R['idle_' + dir]; if (!row) return null;
  const n = row[1], i = anim === 'walk' ? Math.floor(t / 110) % n : anim === 'idle' ? 0 : Math.min(n - 1, Math.floor(clamp(k, 0, .999) * n)), key = row[0] + '|' + i; if (SMW.fr[key]) return SMW.fr[key];
  const c = mk(SMW.cell, SMW.cell); c.getContext('2d').drawImage(im, i * SMW.cell, row[0] * SMW.cell, SMW.cell, SMW.cell, 0, 0, SMW.cell, SMW.cell); return SMW.fr[key] = c;
}
const P1 = (col, x, y, w, h) => { lx.fillStyle = col; lx.fillRect(X(x), Y(y), w || 1, h || 1); };
function crucible(x, y) { P1('#01032e', x - 3, y - 1, 7, 5); P1('#4a4658', x - 2, y, 5, 3); P1('#ffb24a', x - 2, y - 1, 5, 1); P1('#fff0a0', x - 1, y - 1, 2, 1); }
function smithProps(S, t) {   // the little things round him, drawn in code: the gold going in, the crucible, the pour, the steam, the sparks
  const q = Math.floor(t / 90);
  if (S.st === 'forge') { if (S.anim === 'pour' && S.k > .35 && S.k < .8) { const f = (S.k - .35) / .45; for (let i = 0; i < 3; i++) { const g = clamp(f * 1.4 - i * .2, 0, 1); if (g > 0 && g < 1) P1(i % 2 ? '#ffd25e' : '#e8b13a', 54 + i * 3, 104 - g * 26 - Math.sin(g * 3.14) * 6, 2, 2); } }
    if (S.se > 3) for (let i = 0; i < 3; i++) P1(i % 2 ? '#fff0a0' : '#ffb24a', 50 + ((q * 3 + i * 5) % 14), 70 - ((q + i * 4) % 7)); }   // the gold glowing in the fire
  if (S.st === 'carry') crucible(S.x, S.y - 13);
  if (S.st === 'barrel') { if (S.anim === 'pour') { crucible(S.x, S.y - 11); if (S.k > .3 && S.k < .85) { for (let y = S.y - 7; y < S.y + 9; y++) P1((y + q) % 3 ? '#ffb24a' : '#fff0a0', S.x, y); } }
    const a = S.se < 26 ? 1 : clamp(1 - (S.se - 26) / 20, 0, 1); if (a > 0) for (let i = 0; i < 5; i++) { const ph = ((t / 900 + i * .21) % 1); lx.globalAlpha = (1 - ph) * .8 * a; P1('#e8f0ff', S.x - 6 + i * 3 + Math.round(Math.sin(ph * 5 + i) * 2), S.y + 8 - ph * 22, 2, 2); } lx.globalAlpha = 1; }   // steam off the water
  if (S.st === 'bar') { P1('#01032e', S.x + 3, S.y - 13, 7, 4); P1('#ffb24a', S.x + 4, S.y - 12, 5, 2); }
}
/* (25 Nov, his note) THE GOLD ON THE ANVIL rests ON its flat top, drawn right after the anvil so the anvil never covers it */
const ANVIL_TOP = [116, 132];
function anvilGold(t) { const S = smithNow(); if (S.home || S.st !== 'anvil') return;
  const q = Math.floor(t / 90), coinsK = clamp((S.se - 30) / 80, 0, 1), bx = ANVIL_TOP[0], by = ANVIL_TOP[1];   // a glowing bar that turns, blow by blow, into coins
  if (coinsK < 1) { P1('#01032e', bx, by - 1, 9, 4); P1(S.se < 40 ? '#ffb24a' : '#e8b13a', bx + 1, by, 7, 2); P1('#fff0a0', bx + 2, by, 3, 1); }
  for (let i = 0; i < Math.floor(coinsK * 4); i++) { P1('#01032e', bx + 9 + i * 4, by - 1 - (i % 2), 5, 4); P1('#ffd25e', bx + 10 + i * 4, by - (i % 2), 3, 2); P1('#fff6cf', bx + 10 + i * 4, by - (i % 2), 1, 1); }
  if (S.anim === 'hammer' && S.k > .5 && S.k < .8) { for (let i = 0; i < 5; i++) { const a = i * 1.3 + q, r = 3 + (S.k - .5) * 30; P1(i % 2 ? '#fff0a0' : '#ffb24a', bx + 4 + Math.cos(a) * r, by - 1 - Math.abs(Math.sin(a)) * r * .8); } }
}
function smithObj(t) {   // him, out on the floor at work
  const S = smithNow(); smithSound(S); if (S.home) return null; const fr = smithFrame(S.anim, S.dir, S.k || 0, t);
  if (fr) return {img: fr, x: Math.round(S.x) - SMW.cell / 2, y: Math.round(S.y) - 52, base: S.y, after: () => smithProps(S, t)};
  return {img: PX1, x: S.x, y: S.y, base: S.y, after: () => { smithSet(); if (SP.smith) drawChar({name: 'smith', dir: 'front', x: S.x, y: S.y, t: performance.now(), phase: 400, walk: S.anim === 'walk'}); smithProps(S, t); }};
}
const PX1 = mk(1, 1);
const COIN_PILE = [212, 121];   // the pile's bottom middle, on the counter's flat top
function smithSound(S) {   // only while you are in his shop: the hammer rings, the water hisses
  const m = WL.me; if (!m || m.loc !== SMITHY || S.home) { smithSound.h = 0; return; }
  if (S.st === 'anvil' && S.anim === 'hammer') { const hit = S.k > .55; if (hit && !smithSound.h) sfx('anvil'); smithSound.h = hit; } else smithSound.h = 0;
  if (S.st === 'barrel' && S.anim === 'pour' && S.k > .3) { if (!smithSound.q || performance.now() - smithSound.q > 3000) { smithSound.q = performance.now(); sfx('quench'); } }
}
SMH.objs = (t) => SMITHY_OBJS.map(o => {
  const im = o.k === 'pickwall' ? pickWall() : IMG['sm/' + o.k]; if (!im) return null;
  const r = {img: im, x: o.x, y: o.y, base: o.wall ? 0 : o.y + im.height - 2};
  if (o.k === 'pickwall') r.after = () => pickWallAfter(t);
  if (o.smith) r.after = () => { smithSet(); const S = smithNow();
    if (SP.smith && S.home) { drawChar({name: 'smith', dir: 'front', x: SMITH_AT[0], y: SMITH_AT[1], t: performance.now(), phase: 400, noShadow: true}); lx.drawImage(im, X(o.x), Y(o.y)); }   // he stands behind his counter: counter drawn again over his legs
    const cp = IMG['sm/coins']; if (S.ready && cp) lx.drawImage(cp, X(COIN_PILE[0] - (cp.width >> 1)), Y(COIN_PILE[1] - cp.height)); };   // your coins, waiting ON the counter top (PixelLab pile, 25 Nov)
  if (o.k === 'forge') r.after = () => forgeFire(t);
  if (o.k === 'anvil') r.after = () => anvilGold(t);
  return r; }).filter(Boolean).concat(smithObj(t) || []);
function forgeFire(t) {   // a few solid embers hopping in the forge's mouth
  const k = Math.floor(t / 110); for (let i = 0; i < 5; i++) { const ph = (k + i * 7) % 9; lx.fillStyle = ph % 3 ? '#ffb24a' : '#ffe9a8'; lx.fillRect(X(46 + ((i * 7 + k) % 22)), Y(72 - ph), 1, 1); }
}
SMH.lights = (fl) => { const S = smithNow(), L = [[57, 66, 58, '255,140,60', .24 + .14 * fl + (S.st === 'forge' ? .1 : 0), 1], [240, 104, 30, '255,210,140', .08, 2], [70, 18, 16, '255,214,130', .12, 3], [240, 18, 16, '255,214,130', .12, 4]];
  if (S.st === 'anvil' && S.se < 60) L.push([ANVIL_TOP[0] + 4, ANVIL_TOP[1], 14, '255,170,70', .25, 5]); if (S.st === 'carry' || (S.st === 'barrel' && S.anim === 'pour')) L.push([S.x, S.y - 12, 12, '255,170,70', .25, 6]); return L; };
SMH.enter = () => { goldChip.sig = ''; goldChip(); $('#hallLine').textContent = ''; };
SMH.spots = [{k: 'smith', hit: [196, 78, 290, 148], stand: [240, 156], dir: 'back', use: () => smithOpen()},
  {k: 'picks', hit: [PICKWALL.x, PICKWALL.y - 4, PICKWALL.x + PICKWALL.w, PICKWALL.y + PICKWALL.h + 6], stand: [PICKWALL.x + PICKWALL.w / 2, 88], dir: 'back', use: () => pickOpen()}];
SMH.ambT = 0;
SMH.joy = (m, J) => { if (J.y > .5 && m.y >= SMH.door[1] - 1 && Math.abs(m.x - SMH.door[0]) < 10) { wlDoor(SOUTH); return true; } return false; };
SMH.tap = (e, m, x, y) => { if (y > SMH.door[1] - 6 && Math.abs(x - SMH.door[0]) < 18) { wlGo(m, SMH.door[0], SMH.door[1] + 4, () => wlDoor(SOUTH)); return true; } return false; };

/* HIS COUNTER: hand him your gold (10 chunks -> 15 coins, his numbers; ready in 5 minutes), collect the coins, swap crystals for gold.
   THE PICKAXE WALL: buy the next pickaxe. The server does all of it. */
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function smithUI() {
  const n = GOLD.n, lots = Math.floor(n / MR.smeltIn), b = $('#smeltYes'), J = GOLD.job, left = J ? J.t + smeltMs() - Date.now() : 0;
  $('#smithGold').innerHTML = goldImg(2) + ' ' + n; $('#smithCry').innerHTML = cryImg(2) + ' ' + GOLD.cry;
  const html = J ? (left > 0 ? `Ready in ${mmss(left)}` : `Collect ${ic('coin', 2)} ${J.c}`) : lots ? `Smelt ${lots * MR.smeltIn} ${goldImg(2)} for ${ic('coin', 2)} ${lots * MR.smeltOut}` : `Need ${MR.smeltIn} gold chunks`;
  b.disabled = J ? left > 0 : lots < 1; if (b.dataset.h !== html) { b.dataset.h = html; b.innerHTML = html; }
  const c = $('#cryYes'), ch = GOLD.cry ? `Trade ${GOLD.cry} ${cryImg(2)} for ${goldImg(2)} ${GOLD.cry * MR.cryGold}` : `1 ${cryImg(2)} = ${goldImg(2)} ${MR.cryGold}`; c.disabled = GOLD.cry < 1; if (c.dataset.h !== ch) { c.dataset.h = ch; c.innerHTML = ch; }
}
function pickUI() {
  $('#pickPicks').innerHTML = MR.picks.map((p, t) => { const own = GOLD.pick >= t, on = GOLD.pick === t, next = t === GOLD.pick + 1;
    return `<div class="jrod${on ? ' on' : ''}"><img class="jimg" src="${pickIcon(t)}" alt=""${own || next ? '' : ' style="filter:brightness(.35)"'}><div class="jt"><b>${p.name}</b><div class="small">${t === 4 ? 'Level 5. Breaks crystal.' : 'Level ' + (t + 1)}</div></div>` +
      `<button class="btn${own ? '' : ' go'}" data-p="${p.id}"${own || !next || coins < p.price ? ' disabled' : ''}>${on ? 'Yours' : own ? 'Owned' : ic('coin', 2) + ' ' + p.price}</button></div>`; }).join('');
  for (const q of $('#pickPicks').querySelectorAll('button[data-p]')) q.onclick = () => pickBuy(q.dataset.p);
}
function smithOpen() { sfx('click'); document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); paintCoins(); smithUI(); $('#smithModal').classList.add('on'); }
function pickOpen() { sfx('click'); document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); paintCoins(); pickUI(); $('#pickModal').classList.add('on'); }
async function smeltGo() {
  const b = $('#smeltYes'); if (b.disabled) return; b.disabled = true;
  try { if (GOLD.job) { const r = await mop('smeltGet'); GOLD.job = null; sfx('coin'); wlSay(`The Blacksmith paid you ${r.coins} coins.`, 'good'); }
    else { const r = await mop('smelt'); if (r.job) GOLD.job = {c: r.job.c | 0, t: Date.now()}; sfx('click'); forgeBurst(); $('#smithModal').classList.remove('on'); } }   // off he goes to the forge
  catch (e) { wlSay(e.message, 'bad'); }
  smithUI();
}
async function pickBuy(id) {
  try { await mop('mpick', {id}); sfx('rare'); } catch (e) { wlSay(e.message, 'bad'); }
  pickUI();
}
async function cryGo() {
  const b = $('#cryYes'); if (b.disabled) return; b.disabled = true;
  try { await mop('mcry', {n: GOLD.cry}); sfx('coin'); } catch (e) { wlSay(e.message, 'bad'); }
  smithUI();
}
function forgeBurst() { if (WL.fx) for (let i = 0; i < 4; i++) WL.fx.push({k: 'spark', x: 46 + Math.random() * 24, y: 64 + Math.random() * 10, t: i * -.12, loc: SMITHY}); }

/* ================= THE MINE ================= */
const MGW = 22, MGH = 17, CS = 16;                       // the cave: 22 x 17 cells of 16 px
const RS = 20, RZ = 14, WS = 16, WZ = 24;              // the slice strips: rocks 14 slices of 20, walls 24 slices of 16 (tools/make_mine.py)
const R_SQ = .7;                                       // how flat a rock's slices are drawn (the camera's tilt)
const MNH = HALLS[MINE - 100]; MNH.door = [-999, -999];
const MN = {lv: 1, cell: new Uint8Array(MGW * MGH), dist: new Uint8Array(MGW * MGH), rocks: [], veins: new Map(), wdmg: new Map(), lamps: [], keep: new Set(),
  entry: [11, 14], shaft: null, bg: null, wobj: [], dirty: true, busy: false, shake: 0, fx: [], cache: {}, pushT: 0, said: 0};
const DIG = {on: null, ask: false};
const mci = (x, y) => y * MGW + x, inCave = (x, y) => x >= 2 && x <= MGW - 3 && y >= 3 && y <= MGH - 3;
const isFloor = (x, y) => x >= 0 && y >= 0 && x < MGW && y < MGH && !MN.cell[mci(x, y)];
const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };
const rockAt = (x, y) => MN.rocks.find(r => r.gx === x && r.gy === y);
const blocked = (x, y) => !isFloor(x, y) || !!rockAt(x, y) || (MN.shaft && MN.shaft[0] === x && MN.shaft[1] === y);

/* the shape of a level: a wandering dig from where you come in. Level 1 has the way out at the bottom; the others a ladder up. */
function mineGeo(lv) {
  const M = MN; M.lv = lv; M.cell.fill(1); M.rocks = []; M.veins = new Map(); M.wdmg = new Map(); M.lamps = []; M.keep = new Set(); M.fx = []; M.shaft = null; DIG.on = null;
  const R = n => Math.floor(Math.random() * n); let ex, ey;
  if (lv === 1) { ex = 11; ey = MGH - 3; M.cell[mci(ex, MGH - 2)] = 0; M.cell[mci(ex, MGH - 1)] = 0; M.keep.add(mci(ex - 1, MGH - 2)).add(mci(ex + 1, MGH - 2)); }
  else { ex = 5 + R(MGW - 10); ey = 7 + R(MGH - 11); M.keep.add(mci(ex, ey - 1)).add(mci(ex, ey - 2)).add(mci(ex, ey - 3)); }   // the ladder's wall stays a full wall: nothing dug behind it
  M.entry = [ex, ey];
  let x = ex, y = ey, dx = 0, dy = -1, n = 0; const want = 92 + lv * 4;
  const carve = (cx, cy) => { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const X0 = cx + a, Y0 = cy + b; if (inCave(X0, Y0) && !M.keep.has(mci(X0, Y0)) && M.cell[mci(X0, Y0)]) { M.cell[mci(X0, Y0)] = 0; n++; } } };
  M.cell[mci(ex, ey)] = 0; n++;
  for (let it = 0; it < 4000 && n < want; it++) { carve(x, y); if (Math.random() < .42) [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][R(4)];
    const nx = x + dx, ny = y + dy; if (inCave(nx, ny) && inCave(nx + 1, ny + 1)) { x = nx; y = ny; } else [dx, dy] = [-dx, -dy];
    if (it % 90 === 89) { const f = []; for (let i = 0; i < MGW * MGH; i++) if (!M.cell[i]) f.push(i); const c = f[R(f.length)]; x = c % MGW; y = (c / MGW) | 0; } }
  if (lv > 1) M.cell[mci(ex, ey - 1)] = 1;
  // ONE CAVE: the ladder's wall can cut where you land off from the rest. Any floor you cannot walk to gets a tunnel dug to it (never through the ladder's wall).
  for (let guard = 0; guard < 12; guard++) { const d = mineFlood(ex, ey, () => false); let lost = false; for (let i = 0; i < MGW * MGH; i++) if (!M.cell[i] && d[i] < 0) { lost = true; break; } if (!lost) break;
    const prev = new Int32Array(MGW * MGH).fill(-1), q = []; for (let i = 0; i < MGW * MGH; i++) if (d[i] >= 0) { prev[i] = i; q.push(i); } let hit = -1;
    for (let h = 0; h < q.length && hit < 0; h++) { const c = q[h], cx = c % MGW, cy = (c / MGW) | 0; for (const [a2, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X0 = cx + a2, Y0 = cy + b2, i = mci(X0, Y0); if (!inCave(X0, Y0) || prev[i] >= 0 || M.keep.has(i)) continue; prev[i] = c; if (!M.cell[i]) { hit = i; break; } q.push(i); } }
    if (hit < 0) break; for (let c = prev[hit]; d[c] < 0; c = prev[c]) M.cell[c] = 0; }
  // the shaft down: the floor cell furthest from where you came in
  if (lv < MR.levels) { const d = mineFlood(ex, ey, () => false); let best = -1, bd = -1; for (let i = 0; i < MGW * MGH; i++) if (d[i] > bd && !(lv === 1 && ((i / MGW) | 0) >= MGH - 2) && Math.max(Math.abs(i % MGW - ex), Math.abs(((i / MGW) | 0) - ey)) >= 4) { bd = d[i]; best = i; } if (best >= 0) M.shaft = [best % MGW, (best / MGW) | 0]; }
  // NOTHING ON OR ROUND A LADDER (round 3, his note): the cells round the shaft, and in front of and beside the ladder up, are open floor
  for (const [cx, cy, top] of [M.shaft ? [M.shaft[0], M.shaft[1], -1] : null, lv > 1 ? [ex, ey, 0] : null].filter(Boolean)) for (let b = top; b <= 1; b++) for (let a = -1; a <= 1; a++) { const X0 = cx + a, Y0 = cy + b; if (inCave(X0, Y0) && !M.keep.has(mci(X0, Y0))) M.cell[mci(X0, Y0)] = 0; }
  M.dirty = true;
}
const nearLadder = (x, y) => (MN.shaft && Math.max(Math.abs(MN.shaft[0] - x), Math.abs(MN.shaft[1] - y)) <= 1) || Math.max(Math.abs(MN.entry[0] - x), Math.abs(MN.entry[1] - y)) <= 1;   // on a ladder or one of the 8 cells round it
function mineFlood(sx, sy, stop) {   // steps from (sx, sy) over the open floor; -1 = cannot be reached
  const d = new Int16Array(MGW * MGH).fill(-1), q = [mci(sx, sy)]; d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) { const c = q[h], cx = c % MGW, cy = (c / MGW) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X0 = cx + a, Y0 = cy + b; if (X0 < 0 || Y0 < 0 || X0 >= MGW || Y0 >= MGH) continue; const i = mci(X0, Y0); if (d[i] >= 0 || MN.cell[i] || stop(X0, Y0)) continue; d[i] = d[c] + 1; q.push(i); } }
  return d;
}
/* what is in it: k = the server's list (16 rocks, 8 wall veins, then any crystal rocks still waiting for you) */
function mineFill(k) {
  const M = MN, [ex, ey] = M.entry, R = n => Math.floor(Math.random() * n); M.rocks = []; M.veins = new Map(); M.lamps = [];
  const stop = (x, y) => !!rockAt(x, y) || (M.shaft && M.shaft[0] === x && M.shaft[1] === y);
  const okAll = () => { const d = mineFlood(ex, ey, stop), near = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X0 = x + a, Y0 = y + b; return X0 >= 0 && Y0 >= 0 && X0 < MGW && Y0 < MGH && d[mci(X0, Y0)] >= 0; });
    return M.rocks.every(r => near(r.gx, r.gy)) && (!M.shaft || near(M.shaft[0], M.shaft[1])); };
  const free = []; for (let y = 3; y <= MGH - 3; y++) for (let x = 2; x <= MGW - 3; x++) if (!M.cell[mci(x, y)] && !nearLadder(x, y)) free.push([x, y]);
  free.sort(() => Math.random() - .5);
  const put = (kind, i) => { while (free.length) { const [x, y] = free.pop(); const r = mkRock(x, y, kind, i); M.rocks.push(r); if (okAll()) return r; M.rocks.pop(); } return null; };
  for (let i = 0; i < k.length; i++) { const ch = k[i]; if ('sgr'.includes(ch) || isCry(ch)) put(ch, i); }
  // veins: walls whose face you can see (floor to the south of them)
  const faces = []; for (let y = 3; y <= MGH - 3; y++) for (let x = 2; x <= MGW - 3; x++) if (M.cell[mci(x, y)] && !M.keep.has(mci(x, y)) && isFloor(x, y + 1) && !rockAt(x, y + 1)) faces.push(mci(x, y));
  faces.sort(() => Math.random() - .5);
  { const more = []; for (let y = 3; y <= MGH - 3; y++) for (let x = 2; x <= MGW - 3; x++) if (mineable(x, y) && !faces.includes(mci(x, y))) more.push(mci(x, y)); more.sort(() => Math.random() - .5); faces.unshift(...more); }   // not enough faces: the rest go in walls you see from the side or from above
  for (let i = 0; i < k.length; i++) if ('GR'.includes(k[i]) && faces.length) M.veins.set(faces.pop(), {k: k[i], i});
  for (let n = 0; n < 3 && faces.length; n++) { const i = faces.pop(); if (isFloor(i % MGW, ((i / MGW) | 0) + 1)) M.lamps.push(i); }
  M.dirty = true;
}
function mkRock(gx, gy, k, i) { return {gx, gy, k, i, hp: 0, max: 0, st: 0, a: Math.floor(Math.random() * 16), shake: 0, flash: 0, born: 0}; }

/* ---------- drawing the stacks ---------- */
function rockRow(r) { return (isCry(r.k) ? 45 + 'eud'.indexOf(r.k) * 3 : (MN.lv - 1) * 9 + 'sgr'.indexOf(r.k) * 3) + r.st; }
function wallRow(idx) { const v = MN.veins.get(idx), d = MN.wdmg.get(idx), st = d ? d.st : 0; return (MN.lv - 1) * 12 + (v ? (v.k === 'G' ? 2 : 3) : hash(idx * 7 + MN.lv) % 2) * 3 + st; }
/* a rock at one of 16 turns: slices bottom to top, each turned, squashed and one pixel higher; ONE navy line round the lot; a flat 2 px shadow under it */
function rockSprite(row, a, white) {
  const key = 'r' + row + '|' + a + (white ? 'w' : ''); if (MN.cache[key]) return MN.cache[key];
  const im = IMG['mine/rocks']; if (!im) return null; const h = Math.round(RS * R_SQ), W = RS + 6, H = h + RZ + 6, c = mk(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; const ang = a / 16 * Math.PI * 2;
  for (let z = 0; z < RZ; z++) { x.setTransform(1, 0, 0, R_SQ, W / 2, H - 4 - h / 2 - z); x.rotate(ang); x.drawImage(im, z * RS, row * RS, RS, RS, -RS / 2, -RS / 2, RS, RS); }
  x.setTransform(1, 0, 0, 1, 0, 0);
  const d = x.getImageData(0, 0, W, H), p = d.data, A = (X0, Y0) => X0 >= 0 && Y0 >= 0 && X0 < W && Y0 < H && p[(Y0 * W + X0) * 4 + 3] >= 60, edge = [], low = [];
  for (let Y0 = 0; Y0 < H; Y0++) for (let X0 = 0; X0 < W; X0++) { if (A(X0, Y0)) { low[X0] = Y0; if (white) { const i = (Y0 * W + X0) * 4; p[i] = p[i + 1] = p[i + 2] = 255; } } else if (A(X0 + 1, Y0) || A(X0 - 1, Y0) || A(X0, Y0 + 1) || A(X0, Y0 - 1)) edge.push((Y0 * W + X0) * 4); }
  for (const i of edge) { p[i] = 1; p[i + 1] = 3; p[i + 2] = 46; p[i + 3] = 255; }
  for (let X0 = 0; X0 < W; X0++) if (low[X0] != null && low[X0] > H - 12) for (let k = 2; k <= 3; k++) { const i = ((low[X0] + k) * W + X0) * 4; if (low[X0] + k < H && !p[i + 3]) { p[i] = 18; p[i + 1] = 28; p[i + 2] = 58; p[i + 3] = 96; } }
  x.putImageData(d, 0, 0); c.gy = H - 4 - h / 2; return MN.cache[key] = c;
}
/* a wall block: h slices tall (the top slice of the strip is always its lid), straight on; dark = how far it sits from the open floor */
function wallSprite(row, h, dark) {
  const key = 'w' + row + '|' + h + '|' + dark; if (MN.cache[key]) return MN.cache[key];
  const im = IMG['mine/walls']; if (!im) return null; const c = mk(WS, WS + h - 1), x = c.getContext('2d');
  for (let z = 0; z < h - 1; z++) x.drawImage(im, z * WS, row * WS, WS, WS, 0, h - 1 - z, WS, WS);
  x.drawImage(im, (WZ - 1) * WS, row * WS, WS, WS, 0, 0, WS, WS);
  if (dark) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(7,6,15,${[0, .5, .8][dark]})`; x.fillRect(0, 0, c.width, c.height); }
  return MN.cache[key] = c;
}
const wallH = (x, y) => isFloor(x, y - 1) ? 6 : isFloor(x, y - 2) ? 14 : WZ;
/* THE LADDERS (round 2, his note: "improve the ladders ... to look better"): stacks like the rest of the cave (assets/mine/props.png, 30 slices of 20).
   The shaft down = a dark hole, a ring of the level's own stones round it, and a ladder standing up out of it. The way up = a tall ladder against
   the wall, up to a hatch in the rock. One navy line round each, like the rocks. */
const PS = 20;
function propStack(x, row, n, cx, gy, from) { const im = IMG['mine/props']; for (let z = from || 0; z < n; z++) { x.setTransform(1, 0, 0, R_SQ, cx, gy - z); x.drawImage(im, z * PS, row * PS, PS, PS, -PS / 2, -PS / 2, PS, PS); } x.setTransform(1, 0, 0, 1, 0, 0); }
function navyEdge(c) { const x = c.getContext('2d'), W = c.width, H = c.height, d = x.getImageData(0, 0, W, H), p = d.data, A = (X0, Y0) => X0 >= 0 && Y0 >= 0 && X0 < W && Y0 < H && p[(Y0 * W + X0) * 4 + 3] >= 60, edge = [];
  for (let Y0 = 0; Y0 < H; Y0++) for (let X0 = 0; X0 < W; X0++) if (!A(X0, Y0) && (A(X0 + 1, Y0) || A(X0 - 1, Y0) || A(X0, Y0 + 1) || A(X0, Y0 - 1))) edge.push((Y0 * W + X0) * 4);
  for (const i of edge) { p[i] = 1; p[i + 1] = 3; p[i + 2] = 46; p[i + 3] = 255; } x.putImageData(d, 0, 0); }
function shaftSprite(lv) {
  const key = 'sh' + lv; if (MN.cache[key]) return MN.cache[key]; if (!IMG['mine/props']) return null;
  const W = 28, H = 44, cx = 14, gy = 32, c = mk(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const l = mk(W, H), q = l.getContext('2d'); q.imageSmoothingEnabled = false; propStack(q, 5, 19, cx, gy - 1); navyEdge(l);   // the ladder
  const o = mk(W, H), ox = o.getContext('2d');
  for (let dy = -5; dy <= 5; dy++) { const hw = Math.round(7.6 * Math.sqrt(1 - (dy / 5.6) ** 2)); ox.fillStyle = dy < -2 ? '#0e0b18' : '#07060f'; ox.fillRect(cx - hw, gy + dy, hw * 2, 1); }   // the hole
  // the ladder comes up out of the dark (24 Nov, his note): it sits deeper in the hole, its foot is cut off inside it, and it darkens the
  // closer it gets to the hole, as if the light does not reach down there
  const SINK = 9, t = mk(W, H), tx = t.getContext('2d'); tx.drawImage(l, 0, SINK);
  tx.clearRect(0, gy + 3, W, H);                                                                   // nothing below the hole's front lip
  tx.globalCompositeOperation = 'source-atop'; const gr = tx.createLinearGradient(0, gy - 13, 0, gy + 2);
  gr.addColorStop(0, 'rgba(7,6,15,0)'); gr.addColorStop(.55, 'rgba(7,6,15,.45)'); gr.addColorStop(1, 'rgba(7,6,15,.92)'); tx.fillStyle = gr; tx.fillRect(0, gy - 13, W, 16);
  for (let yy = gy - 13; yy < gy + 3; yy++) { const d = tx.getImageData(0, yy, W, 1); for (let i = 3; i < d.data.length; i += 4) if (d.data[i]) d.data[i] = 255; tx.putImageData(d, 0, yy); }   // keep it solid pixels (no see-through edge)
  ox.drawImage(t, 0, 0);
  // (24 Nov, his note: "remove the whole stone thing, it should just be a ladder going down a hole": no ring of stones at all)
  o.gy = gy; return MN.cache[key] = o;
}
function ladderSprite() {
  const key = 'lu'; if (MN.cache[key]) return MN.cache[key]; if (!IMG['mine/props']) return null;
  const W = 24, H = 46, cx = 12, gy = 40, c = mk(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  propStack(x, 5, 30, cx, gy); navyEdge(c);
  x.globalCompositeOperation = 'destination-over';                                                // the hatch it goes up through, behind its top
  for (let dy = -4; dy <= 4; dy++) { const hw = Math.round(8 * Math.sqrt(1 - (dy / 4.5) ** 2)); x.fillStyle = '#07060f'; x.fillRect(cx - hw, gy - 29 + dy, hw * 2, 1); }
  for (let dy = -5; dy <= 5; dy++) { const hw = Math.round(9 * Math.sqrt(1 - (dy / 5.5) ** 2)); x.fillStyle = '#01032e'; x.fillRect(cx - hw, gy - 29 + dy, hw * 2, 1); }
  x.globalCompositeOperation = 'source-over'; c.gy = gy; return MN.cache[key] = c;
}
const LAMP = pxIcon(['..KKK..', '.KwwwK.', '.KKKKK.', 'KYWWYYK', 'KYWWYYK', 'KYYYYgK', '.KKKKK.', '..KKK..'], {K: '#1a1430', w: '#8a5a2b', Y: '#ffd25e', W: '#fff6cf', g: '#e8b13a'});

/* the ground picture, the walk mask and the list of wall blocks: made again whenever a wall is dug out */
function mineBake() {
  const M = MN, W = MGW * CS, H = MGH * CS; M.dirty = false;
  // how far each cell is from open floor (8 ways), up to 4
  M.dist.fill(9); let q = []; for (let i = 0; i < MGW * MGH; i++) if (!M.cell[i]) { M.dist[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const c = q[h], cx = c % MGW, cy = (c / MGW) | 0; if (M.dist[c] >= 4) continue; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const X0 = cx + a, Y0 = cy + b; if (X0 < 0 || Y0 < 0 || X0 >= MGW || Y0 >= MGH) continue; const i = mci(X0, Y0); if (M.dist[i] > M.dist[c] + 1) { M.dist[i] = M.dist[c] + 1; q.push(i); } } }
  const bg = M.bg && M.bg.width === W ? M.bg : (M.bg = mk(W, H)), x = bg.getContext('2d'), fl = IMG['mine/floor']; x.fillStyle = '#07060f'; x.fillRect(0, 0, W, H);
  const mask = mk(W, H), mx = mask.getContext('2d'); mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H); mx.fillStyle = '#fff';
  for (let gy = 0; gy < MGH; gy++) for (let gx = 0; gx < MGW; gx++) { if (M.cell[mci(gx, gy)]) continue; const X0 = gx * CS, Y0 = gy * CS, hh = hash(mci(gx, gy) * 13 + M.lv);
    if (fl) x.drawImage(fl, (hh % 8 < 5 ? 0 : 1 + hh % 3) * CS, (M.lv - 1) * CS, CS, CS, X0, Y0, CS, CS);
    if (!isFloor(gx, gy - 1)) { x.fillStyle = 'rgba(7,6,15,.45)'; x.fillRect(X0, Y0, CS, 2); x.fillStyle = 'rgba(7,6,15,.22)'; x.fillRect(X0, Y0 + 2, CS, 2); }   // the wall's shade on the ground at its foot
    const l = isFloor(gx - 1, gy) ? 0 : 5, r = isFloor(gx + 1, gy) ? 0 : 5, t = isFloor(gx, gy - 1) ? 0 : 1, b = isFloor(gx, gy + 1) || gy === MGH - 1 ? 0 : 4;
    mx.fillRect(X0 + l, Y0 + t, CS - l - r, CS - t - b); }
  if (M.lv === 1) { const X0 = M.entry[0] * CS; for (let i = 0; i < 20; i++) { x.fillStyle = `rgba(255,226,170,${.03 + i * .014})`; x.fillRect(X0, H - 20 + i, CS, 1); } }   // daylight at the way out
  mx.fillStyle = '#000';
  for (const r of M.rocks) mx.fillRect(r.gx * CS - 1, r.gy * CS + 2, CS + 2, CS - 1);
  M.wobj = [];
  if (M.shaft) { const [sx, sy] = M.shaft, im = shaftSprite(M.lv); mx.fillRect(sx * CS - 1, sy * CS + 1, CS + 2, CS); if (im) M.wobj.push({img: im, x: sx * CS + 8 - 14, y: sy * CS + 9 - im.gy, base: sy * CS + 12}); }
  for (let gy = 0; gy < MGH; gy++) for (let gx = 0; gx < MGW; gx++) { const i = mci(gx, gy); if (!M.cell[i] || M.dist[i] > 3) continue; const h = wallH(gx, gy), im = wallSprite(wallRow(i), h, M.dist[i] - 1); if (!im) continue;
    M.wobj.push({img: im, x: gx * CS, y: gy * CS - (h - 1), base: gy * CS + CS, i}); }
  M.lamps = M.lamps.filter(i => M.cell[i] && wallH(i % MGW, (i / MGW) | 0) === WZ && isFloor(i % MGW, ((i / MGW) | 0) + 1));   // a lamp hangs on a full wall face only
  for (const i of M.lamps) { const gx = i % MGW, gy = (i / MGW) | 0; M.wobj.push({img: LAMP, x: gx * CS + 4, y: gy * CS - 2, base: gy * CS + CS + .2}); }
  if (M.lv > 1) { const [ex, ey] = M.entry, im = ladderSprite(); if (im) M.wobj.push({img: im, x: ex * CS + 8 - 12, y: ey * CS + 2 - im.gy, base: ey * CS + .3}); }
  IMG['hall/mine'] = bg; IMG['hallw/mine'] = mask; MNH.g = null;
}

/* ---------- coming and going ---------- */
const mineSpawn = () => MN.lv === 1 ? [MN.entry[0] * CS + 8, (MGH - 2) * CS + 6, 'back'] : [MN.entry[0] * CS + 8, MN.entry[1] * CS + 9, 'front'];
function mineHead() { wlHead('The Mine', 'Tap a rock or a wall to dig'); $('#hallLine').textContent = 'LEVEL ' + MN.lv; }
MNH.from = () => { mineGeo(1); mineFill(''); mineBake(); return mineSpawn(); };
MNH.enter = () => { goldChip.sig = ''; goldChip(); mineHead(); mineStock(1); };
/* ask the server what is in this level; the screen stays dark until it answers */
function mineStock(lv, then) {
  const xf = $('#xfade'); let done = false; MN.busy = true;
  Promise.resolve().then(() => mop('mgo', {lv})).then(r => { done = true; if (WL.me && WL.me.loc === MINE && MN.lv === lv) { mineFill(r.k || ''); mineBake(); } }, e => { done = true; wlSay(e.message, 'bad'); })
    .then(() => { MN.busy = false; xf.classList.remove('on'); if (then) then(); });
  setTimeout(() => { if (!done) xf.classList.add('on'); }, 0);
}
function mineTo(lv, viaShaft) {   // down the shaft, or back up the ladder
  const m = WL.me; if (MN.busy || WL.fading || !m) return;
  if (lv > MN.lv && GOLD.pick < lv - 1) { if (performance.now() - MN.said > 1500) { MN.said = performance.now(); wlSay(`You need a ${MR.picks[lv - 1].name.toLowerCase()} to go deeper.`, 'bad'); } return; }
  MN.busy = true; WL.fading = true; DIG.on = null; sfx('door'); const xf = $('#xfade'); xf.classList.add('on');
  setTimeout(() => { const up = lv < MN.lv; mineGeo(lv); mineFill(''); mineBake(); m.path = []; m.todo = null; m.walk = false;
    let sp = mineSpawn(); if (up && MN.shaft) { const [sx, sy] = MN.shaft, n = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([a, b]) => [sx + a, sy + b]).find(([a, b]) => isFloor(a, b)); if (n) sp = [n[0] * CS + 8, n[1] * CS + 9, 'front']; }
    m.x = sp[0]; m.y = sp[1]; m.dir = sp[2]; mineHead(); netMove(); WL.fading = false; mineStock(lv); }, 240);
}
function mineLeave() { DIG.on = null; wlDoor(SOUTH); }

/* ---------- what you can hit ---------- */
const mineable = (x, y) => inCave(x, y) && MN.cell[mci(x, y)] && !MN.keep.has(mci(x, y)) && (isFloor(x + 1, y) || isFloor(x - 1, y) || isFloor(x, y + 1) || isFloor(x, y - 1));
const tgtOf = (x, y) => { const r = rockAt(x, y); return r ? {r, gx: x, gy: y} : mineable(x, y) ? {w: mci(x, y), gx: x, gy: y} : null; };
const tgtPt = T => T.r ? [T.gx * CS + 8, T.gy * CS + 2] : [T.gx * CS + 8, T.gy * CS + CS - (isFloor(T.gx, T.gy + 1) ? 10 : 2)];   // the spot the pick lands on
function tgtInfo(T) {   // its kind, the server's number for it, and how hurt it is
  if (T.r) return {k: T.r.k, i: T.r.i, o: T.r};
  const v = MN.veins.get(T.w); let d = MN.wdmg.get(T.w); if (!d) { d = {hp: 0, max: 0, st: 0, shake: 0}; MN.wdmg.set(T.w, d); } return {k: v ? v.k : 'w', i: v ? v.i : -1, o: d};
}
/* where to stand to hit it: beside a rock if you can (you see the swing best side on); under a wall's face */
function tgtStands(T) {
  const X0 = T.gx * CS, Y0 = T.gy * CS, c = [];
  const E = [X0 + CS + 11, Y0 + CS - 3, 'left'], Wd = [X0 - 11, Y0 + CS - 3, 'right'], S = [[X0 - 1, Y0 + CS + 5, 'back'], [X0 + CS + 1, Y0 + CS + 5, 'back'], [X0 + 8, Y0 + CS + 5, 'back']], N = [[X0 - 1, Y0 - 5, 'front'], [X0 + CS + 1, Y0 - 5, 'front'], [X0 + 8, Y0 - 5, 'front']];
  for (const p of T.r ? [E, Wd, ...S, ...N] : [...S, E, Wd, ...N]) if (hallOk(MINE, p[0], p[1])) c.push(p);
  return c;
}
MNH.tap = (e, m, x, y) => {
  if (MN.busy) return true; if (MN.dirty) mineBake();
  const gx = Math.floor(x / CS); let T = null;
  if (MN.lv === 1 && y > (MGH - 2) * CS + 4 && Math.abs(x - (MN.entry[0] * CS + 8)) < 16) { DIG.on = null; wlGo(m, MN.entry[0] * CS + 8, MGH * CS - 3, mineLeave); return true; }
  if (MN.shaft && Math.abs(x - (MN.shaft[0] * CS + 8)) < 10 && y > MN.shaft[1] * CS - 6 && y < MN.shaft[1] * CS + 17) { const [sx, sy] = MN.shaft; DIG.on = null; mineWalk(m, [[sx * CS + 8, sy * CS + CS + 4], [sx * CS + CS + 6, sy * CS + 10], [sx * CS - 6, sy * CS + 10], [sx * CS + 8, sy * CS - 4]], () => mineTo(MN.lv + 1)); return true; }
  if (MN.lv > 1 && Math.abs(x - (MN.entry[0] * CS + 8)) < 8 && y > MN.entry[1] * CS - 30 && y < MN.entry[1] * CS + 4) { DIG.on = null; wlGo(m, MN.entry[0] * CS + 8, MN.entry[1] * CS + 4, () => mineTo(MN.lv - 1)); return true; }
  const r = MN.rocks.find(r => Math.abs(x - (r.gx * CS + 8)) < 11 && y > r.gy * CS - 12 && y < r.gy * CS + 17); if (r) T = {r, gx: r.gx, gy: r.gy};
  if (!T) for (let gy = Math.min(MGH - 1, Math.floor(y / CS) + 2); gy >= Math.floor(y / CS); gy--) if (gx >= 0 && gx < MGW && MN.cell[mci(gx, gy)] && y >= gy * CS - (wallH(gx, gy) - 1)) { if (mineable(gx, gy)) T = {w: mci(gx, gy), gx, gy}; break; }   // the wall block drawn over that spot
  if (!T) { DIG.on = null; return false; }
  DIG.on = null; mineWalk(m, tgtStands(T), () => digStart(T)); return true;
};
function mineWalk(m, spots, todo) {   // the nearest of these you can walk to
  let best = null, bl = 1e9; for (const s of spots) { if (!hallOk(MINE, s[0], s[1])) continue; const p = hallPath(MINE, m.x, m.y, s[0], s[1]); if (p && p.length < bl) { bl = p.length; best = s; } }
  if (best) wlGo(m, best[0], best[1], todo);
}
MNH.joy = (m, J) => {
  if (MN.busy) return true; const now = performance.now(), ax = Math.abs(J.x) > Math.abs(J.y), dx = ax ? Math.sign(J.x) : 0, dy = ax ? 0 : Math.sign(J.y);
  if (MN.lv === 1 && J.y > .5 && m.y > MGH * CS - 9) { mineLeave(); return true; }
  const gx = Math.floor((m.x + dx * 12) / CS), gy = Math.floor((m.y - 3 + dy * 10) / CS);
  if (MN.shaft && MN.shaft[0] === gx && MN.shaft[1] === gy && !m.walk) { mineTo(MN.lv + 1); return true; }
  if (MN.lv > 1 && dy < 0 && gx === MN.entry[0] && gy === MN.entry[1] - 1 && !m.walk) { mineTo(MN.lv - 1); return true; }
  if (DIG.on) { if (m.walk && !PICK.held && !DIG.on.air) DIG.on = null; return true; }
  const T = !m.walk && Math.max(Math.abs(J.x), Math.abs(J.y)) > .6 ? tgtOf(gx, gy) : null;   // pushing into a rock or a wall: dig it
  if (!T) { MN.pushT = now; return true; }
  if (now - MN.pushT > 160) digStart(T);
  return true;
};

/* ---------- THE DIG: swing, hit, break ---------- */
const SW = MR.swingMs / 1000, HIT_AT = .6;
function digStart(T) {
  const m = WL.me; if (!m || m.loc !== MINE || DIG.ask || MN.busy) return; const inf = tgtInfo(T);
  if (T.r && !MN.rocks.includes(T.r)) return; if (T.w != null && !MN.cell[T.w]) return;
  if (isCry(inf.k) && GOLD.pick < 4) { if (performance.now() - MN.said > 1500) { MN.said = performance.now(); wlSay('Only a gold pickaxe can break crystal.', 'bad'); } return; }
  if (!inf.o.max) { inf.o.max = mHits(inf.k, MN.lv, GOLD.pick); inf.o.hp = inf.o.max; }
  const [tx, ty] = tgtPt(T), ddx = tx - m.x, ddy = ty + 4 - m.y;
  m.dir = Math.abs(ddx) > Math.abs(ddy) + 4 ? (ddx > 0 ? 'right' : 'left') : ddy > 0 ? 'front' : 'back'; m.path = []; m.todo = null; m.walk = false;
  DIG.on = {T, t: 0, hit: false, x: m.x, y: m.y, n: 0};
}
function digTick(dt) {
  const M = MN; M.shake = Math.max(0, M.shake - dt);
  for (const r of M.rocks) { if (r.shake > 0) r.shake -= dt; if (r.flash > 0) r.flash -= dt; if (r.born > 0) r.born -= dt; }
  for (const d of M.wdmg.values()) if (d.shake > 0) d.shake -= dt;
  const m = WL.me; if (!m) return;
  if (!DIG.on && PICK.held && !DIG.ask && !MN.busy && m.loc === MINE && !document.querySelector('.modal.on')) pickSwing();   // held: the next swing starts as soon as the last one ends
  const d = DIG.on; if (!d) return;
  const free = PICK.held || d.air;   // (25 Nov, his ask) a held or button swing may walk; a tap or a push into a rock stops if you move off
  if (m.loc !== MINE || (!free && (Math.hypot(m.x - d.x, m.y - d.y) > 2 || (m.path && m.path.length))) || document.querySelector('.modal.on')) { DIG.on = null; return; }
  d.t += dt;
  if (!d.hit && d.t >= SW * HIT_AT) { d.hit = true; if (free) d.T = pickAim(m);   // whatever is in front of you at the moment the pick lands
    if (d.T) digHit(d.T); else { sfx('swish'); puffAt(airPt(m)[0], airPt(m)[1] + 4, 2); } }
  if (d.t >= SW) { if (!DIG.on) return; d.t = 0; d.hit = false; d.n++; if (free && !PICK.held) DIG.on = null; }   // one press = one swing; holding keeps swinging
}
function digHit(T) {
  const inf = tgtInfo(T), o = inf.o, [tx, ty] = tgtPt(T); o.hp--; o.shake = .2; if (T.r) T.r.flash = .07; MN.shake = .1;
  const st = o.hp <= 0 ? 2 : o.hp <= o.max / 3 ? 2 : o.hp <= o.max * 2 / 3 ? 1 : 0; if (st !== o.st) { o.st = st; if (T.w != null) MN.dirty = true; }
  sfx(isCry(inf.k) ? 'mgem' : 'pick'); mineChips(tx, ty, inf.k, 7);
  if (o.hp <= 0) digBreak(T, inf);
}
function mineChips(x, y, k, n) {
  const P = MINE_COL[MN.lv - 1], gold = 'grGR'.includes(k), gem = isCry(k);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 20 + Math.random() * 45; MN.fx.push({k: 'chip', x: x + Math.cos(a) * 3, y: y + 4, z: 4 + Math.random() * 8, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .5, vz: 40 + Math.random() * 60,
    col: gem && i % 2 ? GEM_COL[k][i % 3] : gold && i % 3 === 0 ? ['#ffd25e', '#fff6cf', '#e8b13a'][i % 3] : P[i % 3], sz: i % 4 ? 1 : 2, t: 0, l: .5 + Math.random() * .3}); }
  puffAt(x, y + 2, 3);
}
const MINE_COL = [['#5c4034', '#805c46', '#a47c5c'], ['#484a5c', '#686c7c', '#8c929e'], ['#303e62', '#465c84', '#627ea4'], ['#422a5c', '#603e7c', '#825a9c'], ['#202838', '#323c50', '#4a586e']];
const GEM_COL = {e: ['#36c878', '#82f0aa', '#e0ffec'], u: ['#e43c48', '#ff8282', '#ffe0e0'], d: ['#78cdf5', '#bef0ff', '#ffffff']};
function digBreak(T, inf) {
  const M = MN, [tx, ty] = tgtPt(T), row = T.r ? rockRow(T.r) : wallRow(T.w); DIG.on = null; M.shake = .22; sfx('mbreak'); mineChips(tx, ty, inf.k, 14); puffAt(tx, ty + 4, 10);
  // the stack flies apart, slice by slice
  if (T.r) { const r = T.r, cx = r.gx * CS + 8, cy = r.gy * CS + 11; for (let z = 0; z < RZ; z += 1) M.fx.push({k: 'slice', rock: 1, row, z, x: cx, y: cy, h: z, vx: (Math.random() - .5) * 70, vy: (Math.random() - .5) * 26, vh: 30 + Math.random() * 70 + z * 3, a: r.a / 16 * 6.283, va: (Math.random() - .5) * 9, t: 0, l: .45 + Math.random() * .2});
    M.rocks.splice(M.rocks.indexOf(r), 1); }
  else { const X0 = T.gx * CS + 8, Y0 = T.gy * CS + 8, h = wallH(T.gx, T.gy); for (let z = 0; z < h; z += 2) M.fx.push({k: 'slice', row, z: z === h - 1 ? WZ - 1 : z, x: X0, y: Y0, h: z, vx: (Math.random() - .5) * 46, vy: 8 + Math.random() * 22, vh: 10 + Math.random() * 50, a: 0, va: (Math.random() - .5) * 3, t: 0, l: .4 + Math.random() * .25});
    M.cell[T.w] = 0; M.veins.delete(T.w); M.wdmg.delete(T.w); }
  M.dirty = true; DIG.ask = true;
  mop('mbreak', {i: inf.i}).then(res => { DIG.ask = false; const m = WL.me;
    if (res.got > 0) { sfx('coin'); for (let i = 0; i < Math.min(5, res.got); i++) M.fx.push({k: 'fly', img: GOLD_ICON, x: tx, y: ty, t: -i * .07, l: .5}); headSay(m, `${goldImg(2)} <b>+${res.got}</b>`, {t: 2, cls: 'res'}); }
    if (res.gc > 0) { sfx('rare'); for (let i = 0; i < Math.min(6, res.gc + 2); i++) M.fx.push({k: 'fly', img: CRY_ICON, x: tx, y: ty, t: -i * .08, l: .6}); headSay(m, `${cryImg(2)} <b>+${res.gc}</b>`, {t: 3, cls: 'res'}); if (WL.fx) for (let i = 0; i < 3; i++) WL.fx.push({k: 'spark', x: tx + (Math.random() - .5) * 16, y: ty - 4 + (Math.random() - .5) * 12, t: -i * .1, loc: MINE}); }
    if (res.cap && !res.got && !res.gc && !isCry(inf.k) && performance.now() - MN.said > 20000) { MN.said = performance.now(); wlSay('No more gold today. The mine fills up again tomorrow.'); }
    if (res.grow && !blocked(T.gx, T.gy) && !nearLadder(T.gx, T.gy) && m.loc === MINE) { const r = mkRock(T.gx, T.gy, res.grow.k, res.grow.i);   // (beside a ladder it waits for your next visit instead: nothing may stand there) r.born = .5; M.rocks.push(r); M.dirty = true; sfx('rare'); M.shake = .3;   // a crystal rock under it
      if (WL.fx) for (let i = 0; i < 4; i++) WL.fx.push({k: 'spark', x: tx + (Math.random() - .5) * 18, y: ty + (Math.random() - .5) * 14, t: -i * .12, loc: MINE}); }
  }, e => { DIG.ask = false; wlSay(e.message, 'bad'); });
}

/* THE PICKAXE: drawn in code at any angle, on the art's own pixels (so every outfit can swing every pickaxe). Angle 0 = pointing right. */
const PICK_COL = [['#96683e', '#be8c5a'], ['#787c8c', '#aab0bc'], ['#b0bacc', '#e2e8f0'], ['#568cc4', '#96c8f0'], ['#e8b13a', '#fff0a0']];
function pickSprite(tier, step) {
  const key = 'p' + tier + '|' + step; if (MN.cache[key]) return MN.cache[key];
  const N = 41, C = 20, c = mk(N, N), x = c.getContext('2d'), a = step / 64 * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, P = (col, fx, fy) => { x.fillStyle = col; x.fillRect(Math.round(C + fx), Math.round(C + fy), 1, 1); };
  for (let s = -3; s <= 13; s += .5) { P('#8a5a2b', ux * s + px * .5, uy * s + py * .5); P('#b98343', ux * s - px * .5, uy * s - py * .5); }
  const [dk, lt] = PICK_COL[tier];
  for (let s = -7; s <= 7; s += .4) { const back = s * s * .07; for (const [o, col] of [[0, dk], [1, lt], [1.9, dk]]) P(Math.abs(s) > 6.2 ? lt : col, ux * (12.5 + o - back) + px * s, uy * (12.5 + o - back) + py * s); }
  const d = x.getImageData(0, 0, N, N), p = d.data, A = (X0, Y0) => X0 >= 0 && Y0 >= 0 && X0 < N && Y0 < N && p[(Y0 * N + X0) * 4 + 3] > 0 && !(p[(Y0 * N + X0) * 4] === 1 && p[(Y0 * N + X0) * 4 + 2] === 46), edge = [];
  for (let Y0 = 0; Y0 < N; Y0++) for (let X0 = 0; X0 < N; X0++) if (!A(X0, Y0) && (A(X0 + 1, Y0) || A(X0 - 1, Y0) || A(X0, Y0 + 1) || A(X0, Y0 - 1))) edge.push((Y0 * N + X0) * 4);
  for (const i of edge) { p[i] = 1; p[i + 1] = 3; p[i + 2] = 46; p[i + 3] = 255; } x.putImageData(d, 0, 0); return MN.cache[key] = c;
}
function pickIcon(tier) { const k = 'pi' + tier; if (MN.cache[k]) return MN.cache[k]; const s = pickSprite(tier, 56), c = mk(64, 64), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 15, 3, 21, 21, 0, 0, 63, 63); return MN.cache[k] = c.toDataURL(); }
/* one swing, k = 0..1: the pick goes up and back, comes down hard, bounces off, settles. Returns how the body moves and where the pick is. */
function swingPose(m, d) {
  const [tx, ty] = d.T ? tgtPt(d.T) : airPt(m), k = d.t / SW, side = tx >= m.x ? 1 : -1, hx = m.x + side * 6, hy0 = m.y - 11;
  const a1 = Math.atan2(ty - hy0, (tx - hx) * side), up = Math.min(a1 - 2.2, -1.95), rest = a1 - .9, eo = q => 1 - (1 - q) * (1 - q), ei = q => q * q * q;
  let a, lift = 0, lunge = 0;
  if (k < .46) { const q = eo(k / .46); a = rest + (up - rest) * q; lift = 2 * q; lunge = -1 * q; }
  else if (k < HIT_AT) { const q = ei((k - .46) / (HIT_AT - .46)); a = up + (a1 - up) * q; lift = 2 * (1 - q); lunge = -1 + 3 * q; }
  else if (k < .74) { const q = (k - HIT_AT) / (.74 - HIT_AT); a = a1 - .35 * Math.sin(q * Math.PI); lunge = 2 - q; }
  else { const q = (k - .74) / .26; a = a1 + (rest - a1) * q; lunge = 1 - q; }
  const L = Math.hypot(tx - m.x, ty + 6 - m.y) || 1, ox = (tx - m.x) / L * lunge, oy = (ty + 6 - m.y) / L * lunge * .6;
  if (side < 0) a = Math.PI - a;
  return {a, lift, ox, oy, hx: hx + ox, hy: hy0 + oy - lift, side, k};
}

/* ---------- every frame ---------- */
MNH.frame = (m, people, dt, t, H, img) => {
  const M = MN; if (M.dirty) { mineBake(); hallGrid(MNH); }
  const d = DIG.on, sw = d ? swingPose(m, d) : null, sh = M.shake > 0 ? M.shake * 14 : 0, shx = sh ? Math.round(Math.sin(t * .09) * sh) : 0, shy = sh ? Math.round(Math.cos(t * .11) * sh * .6) : 0;
  const tp = $('#townHud #hallBar'), br = tp && tp.getBoundingClientRect(), cr = cv.getBoundingClientRect();
  view(M.bg, m.x + shx, m.y - 8 + shy, 190, {hi: true, void: '#07060f', loose: br && br.height ? clamp((br.top - cr.top + 6) / cr.height, .6, 1) : .85});
  const mine = people.filter(p => p.e === m).map(p => sw ? {...p, x: p.x + sw.ox, y: p.y + sw.oy, lift: (p.lift || 0) + sw.lift, walk: false} : p);   // every level is your own cave: only you are in it
  const objs = M.wobj.map(o => { const dm = o.i != null && M.wdmg.get(o.i); return dm && dm.shake > 0 ? {...o, x: o.x + Math.round(Math.sin(dm.shake * 70) * 1.2)} : o; });
  for (const r of M.rocks) { const im = rockSprite(rockRow(r), r.a, r.flash > 0); if (!im) continue; const cx = r.gx * CS + 8, cy = r.gy * CS + 11, sx = r.shake > 0 ? Math.round(Math.sin(r.shake * 70) * 1.4) : 0, up = r.born > 0 ? Math.round(r.born * 12) : 0;
    objs.push({img: im, x: cx - im.width / 2 + sx, y: cy - im.gy + up, base: r.gy * CS + 13, after: isCry(r.k) ? () => gemTwinkle(cx, cy, t, r) : null}); }
  const hits = drawScene(mine, null, M.bg, objs);
  if (sw) { const st = ((Math.round(sw.a / (Math.PI * 2) * 64) % 64) + 64) % 64, im = pickSprite(GOLD.pick, st); lx.drawImage(im, X(sw.hx) - 20, Y(sw.hy) - 20);
    if (sw.k > .5 && sw.k < HIT_AT + .04) { lx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 1; i <= 3; i++) { const a = sw.a - sw.side * i * .22; lx.fillRect(X(sw.hx + Math.cos(a) * 14), Y(sw.hy + Math.sin(a) * 14), 1, 1); } } }   // a streak behind the head on the way down
  mineFx(dt, m); wlFx(dt, m.loc); drawPuffs(dt);
  const L = [[m.x, m.y - 14, 52, '255,206,140', .13, 1]];
  for (const i of M.lamps) if (M.cell[i]) L.push([(i % MGW) * CS + 8, ((i / MGW) | 0) * CS + 4, 38, '255,190,110', .24, i]);
  for (const r of M.rocks) if (isCry(r.k)) L.push([r.gx * CS + 8, r.gy * CS + 2, 26, CRY_GLOW[r.k], .3, r.gx * 31 + r.gy]);
  lights(L, t); vignette(.3 + .06 * M.lv);
  return hits;
};
function gemTwinkle(cx, cy, t, r) { const k = Math.floor(t / 140 + r.gx * 3) % 9; if (k > 2) return; const px = X(cx + [-5, 4, 0][k]), py = Y(cy - [9, 11, 17][k]); lx.fillStyle = '#fff'; lx.fillRect(px - 1, py, 3, 1); lx.fillRect(px, py - 1, 1, 3); }
function mineFx(dt, m) {
  const F = MN.fx, rk = IMG['mine/rocks'], wl = IMG['mine/walls'];
  for (let i = F.length - 1; i >= 0; i--) { const f = F[i]; f.t += dt; if (f.t < 0) continue; if (f.t > f.l) { F.splice(i, 1); continue; } const k = f.t / f.l;
    if (f.k === 'chip') { f.vz -= 320 * dt; f.z += f.vz * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.z < 0) { f.z = 0; f.vz *= -.35; f.vx *= .5; f.vy *= .5; } lx.globalAlpha = k > .7 ? 1 - (k - .7) / .3 : 1; lx.fillStyle = f.col; lx.fillRect(X(f.x), Y(f.y - f.z), f.sz, f.sz); lx.globalAlpha = 1; }
    else if (f.k === 'slice') { f.vh -= 300 * dt; f.h += f.vh * dt; if (f.h < 0) { f.h = 0; f.vh *= -.3; f.vx *= .6; f.vy *= .6; f.va *= .5; } f.x += f.vx * dt; f.y += f.vy * dt; f.a += f.va * dt;
      const S0 = f.rock ? RS : WS, im = f.rock ? rk : wl; if (!im) continue; lx.save(); lx.globalAlpha = k > .6 ? 1 - (k - .6) / .4 : 1; lx.translate(X(f.x), Y(f.y - f.h)); lx.scale(1, f.rock ? R_SQ : .8); lx.rotate(f.a); const sc = 1 - k * .35; lx.scale(sc, sc);
      lx.drawImage(im, f.z * S0, f.row * S0, S0, S0, -S0 / 2, -S0 / 2, S0, S0); lx.restore(); }
    else if (f.k === 'fly') { const q = k * k, x = f.x + (m.x - f.x) * q, y = f.y + (m.y - 30 - f.y) * q - Math.sin(k * Math.PI) * 16; lx.drawImage(f.img, X(x) - 4, Y(y) - 4); } }
}
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { digTick(dt); return fr.call(this, dt, t); }; }
setInterval(() => { goldChip(); if ($('#smithModal').classList.contains('on')) smithUI(); }, 1000);

/* ---------- sounds ---------- */
SFX.pick = () => { tone(1500, .04, {type: 'square', vol: .07, to: 900}); tone(260, .06, {type: 'triangle', vol: .12, to: 120, at: .005}); hiss(.05, {vol: .07, bp: 3000}); };
SFX.mgem = () => { tone(2400, .05, {type: 'square', vol: .05, to: 1800}); tone(3200, .09, {type: 'sine', vol: .07, to: 2600, at: .01}); hiss(.04, {vol: .05, bp: 5000}); };
SFX.mbreak = () => { tone(180, .16, {type: 'triangle', vol: .16, to: 60}); hiss(.22, {vol: .14, lp: 900}); hiss(.1, {vol: .08, bp: 2600, at: .03}); tone(900, .05, {type: 'square', vol: .05, to: 400, at: .02}); };

SFX.anvil = () => { tone(1900, .05, {type: 'square', vol: .06, to: 1500}); tone(2850, .12, {type: 'sine', vol: .05, to: 2700, at: .005}); tone(240, .05, {type: 'triangle', vol: .1, to: 120}); };
SFX.quench = () => { hiss(.9, {vol: .1, hp: 2500}); hiss(.4, {vol: .08, bp: 1200, at: .05}); };

/* ---------- the pop-ups: the Blacksmith's counter, and the pickaxe wall ---------- */
(() => {
  const ref = $('#beerModal'), d = document.createElement('div'); d.className = 'modal big panel'; d.id = 'smithModal';
  d.innerHTML = `<div class="mhead"><b>BLACKSMITH</b><span class="wal">${ic('coin', 2, 'solo')}<span class="coinN">0</span></span><span class="wal" id="smithGold"></span><span class="wal" id="smithCry"></span><button class="btn" id="smithX">${ic('cross', 2, 'solo')}</button></div>
    <div class="small"><b>SMELT</b> · ${MR.smeltIn} gold chunks make ${MR.smeltOut} coins. It takes him 5 minutes.</div><button class="btn go wide" id="smeltYes"></button>
    <div class="small" style="margin-top:14px"><b>CRYSTALS</b> · he pays in gold chunks.</div><button class="btn go wide" id="cryYes"></button>`;
  ref.parentNode.insertBefore(d, ref);
  const p = document.createElement('div'); p.className = 'modal big panel'; p.id = 'pickModal';
  p.innerHTML = `<div class="mhead"><b>PICKAXES</b><span class="wal">${ic('coin', 2, 'solo')}<span class="coinN">0</span></span><button class="btn" id="pickX">${ic('cross', 2, 'solo')}</button></div>
    <div class="small">A better one breaks rock faster and digs deeper.</div><div id="pickPicks"></div>`;
  ref.parentNode.insertBefore(p, ref);
  const st = document.createElement('style'); st.textContent = '#smithModal .btn.wide{display:flex;width:100%;justify-content:center;align-items:center;gap:6px;font-size:17px;padding:8px 8px 11px;margin-top:6px}#smithModal .btn:disabled,#pickModal .btn:disabled{opacity:.5}#smithModal .mhead{gap:8px}#smithModal .mhead b{font-size:19px}#smithModal .mhead .wal{font-size:15px}#pickModal .jimg{width:48px;height:48px;margin:0}#smithModal,#pickModal{bottom:auto}'; document.head.appendChild(st);
  $('#smeltYes').onclick = smeltGo; $('#cryYes').onclick = cryGo; $('#smithX').onclick = () => $('#smithModal').classList.remove('on'); $('#pickX').onclick = () => $('#pickModal').classList.remove('on');
})();

/* ---------- THE PICKAXE BUTTON (24 Nov 2026, his ask): "a button exactly like the fishing button across from the joystick that is a
   pickaxe to mine whatever the character is looking at when pressed". The same see-through pixel disc as #fishRodBtn (its CSS is copied
   rule for rule, landscape spot included), shown in the mine whenever the joystick is; grey when nothing diggable is in front of you. ---------- */
const PICK_ICON = pxIcon([
  '....KKKKKKK.....',
  '..KKSSSSSSSKK...',
  '.KSSWWSSSSSSSK..',
  'KSSKKKKKKKKSSSK.',
  'KSK....KWK..KSK.',
  'KK.....KbK...KK.',
  '.......KbK......',
  '.......KbK......',
  '.......KbK......',
  '.......KbK......',
  '.......KbK......',
  '.......KbK......',
  '.......KbK......',
  '.......KBK......',
  '.......KBK......',
  '........K.......'], {K: '#1a1430', S: '#b8c2d4', W: '#eef2fa', b: '#a8723a', B: '#7a4a2a'});
(() => {
  const b = document.createElement('button'); b.id = 'pickBtn'; b.title = 'Mine';
  const c = mk(48, 48), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(PICK_ICON, 0, 0, 48, 48);
  b.innerHTML = `<img src="${c.toDataURL()}" alt="Mine">`; $('#fishRodBtn').after(b);
  const st = document.createElement('style');
  st.textContent = '#pickBtn{position:absolute;right:22px;bottom:143px;width:84px;height:84px;z-index:8;display:none;align-items:center;justify-content:center;border:0;padding:0;background:none;touch-action:none;pointer-events:auto;cursor:pointer}'
    + '#pickBtn::before{content:"";position:absolute;inset:0;background:var(--pb) 0 0/100% 100%;image-rendering:pixelated;opacity:.72}'
    + '#pickBtn img{position:relative;width:48px;height:48px;image-rendering:pixelated}#pickBtn.on{display:flex}#pickBtn:active:not(:disabled){transform:scale(.94)}'
    + '#pickBtn:disabled{cursor:default}#pickBtn:disabled::before{filter:grayscale(1);opacity:.45}#pickBtn:disabled img{filter:grayscale(1);opacity:.4}'
    + '#phone.land #pickBtn{right:var(--abR,calc(22px + var(--sr)));bottom:var(--abB,calc(var(--lb) + 14px))!important}';
  document.head.appendChild(st);
  const up = () => { PICK.held = false; };
  b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (_) {} PICK.held = true; if (!DIG.on) pickSwing(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, up);
  b.addEventListener('contextmenu', e => e.preventDefault());
})();
// what you are looking at: the cell in front of you, the way you face (the same cell the joystick digs when you push into it)
function pickTarget() {
  const m = WL.me; if (!m || m.loc !== MINE || MN.busy || DIG.on || m.walk) return null;
  const d = {right: [1, 0], left: [-1, 0], back: [0, -1], front: [0, 1]}[m.dir] || [0, 1];
  return tgtOf(Math.floor((m.x + d[0] * 12) / CS), Math.floor((m.y - 3 + d[1] * 10) / CS));
}
function pickBtnTick() {
  const b = $('#pickBtn'), m = WL.me; if (!b) return;
  const show = !!m && m.loc === MINE && scene === scenes.town && $('#joy').classList.contains('on') && !document.querySelector('.modal.on');
  if (show) { if (!b.style.getPropertyValue('--pb')) { const v = $('#punchBtn').style.getPropertyValue('--pb'); if (v) b.style.setProperty('--pb', v); }
    b.style.bottom = (parseFloat($('#joy').style.bottom) + 23) + 'px';   // level with the joystick, like the fishing rod button
    if (b.disabled) b.disabled = false; }   /* (25 Nov) always pressable: it swings at nothing when nothing is in front */
  if (b.classList.contains('on') !== show) b.classList.toggle('on', show);
}
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { const r = fr.call(this, dt, t); pickBtnTick(); return r; }; }
setInterval(() => { const b = $('#pickBtn'); if (b && scene !== scenes.town) b.classList.remove('on'); }, 400);   // never left showing outside the walking scene

/* (25 Nov 2026, his ask) THE PICKAXE BUTTON, HELD: press it anywhere and you swing; whatever diggable thing is in front of you when the pick
   lands takes the hit (nothing there = a swing at the air). Hold it and the swings keep coming, and you can walk while swinging. */
const PICK = {held: false};
function airPt(m) { const d = {right: [12, -6], left: [-12, -6], back: [2, -15], front: [2, 4]}[m.dir] || [2, 4]; return [m.x + d[0], m.y + d[1]]; }
function pickAim(m) {   // the diggable thing in front of you, ready to be hit (crystal needs the gold pickaxe)
  const d = {right: [1, 0], left: [-1, 0], back: [0, -1], front: [0, 1]}[m.dir] || [0, 1], [ax, ay] = airPt(m);
  let T = null, bd = 13;   // a rock close to where the pick lands counts, even if you are not lined up on its square
  for (const r of MN.rocks) { const dd = Math.hypot(r.gx * CS + 8 - ax, r.gy * CS + 6 - ay); if (dd < bd) { bd = dd; T = {r, gx: r.gx, gy: r.gy}; } }
  if (!T) T = tgtOf(Math.floor((m.x + d[0] * 12) / CS), Math.floor((m.y - 3 + d[1] * 10) / CS));
  if (!T) return null; if (T.r && !MN.rocks.includes(T.r)) return null; if (T.w != null && !MN.cell[T.w]) return null;
  const inf = tgtInfo(T); if (isCry(inf.k) && GOLD.pick < 4) { if (performance.now() - MN.said > 1500) { MN.said = performance.now(); wlSay('Only a gold pickaxe can break crystal.', 'bad'); } return null; }
  if (!inf.o.max) { inf.o.max = mHits(inf.k, MN.lv, GOLD.pick); inf.o.hp = inf.o.max; } return T;
}
function pickSwing() { const m = WL.me; if (!m || m.loc !== MINE || DIG.ask || MN.busy || DIG.on) return; DIG.on = {T: null, air: true, t: 0, hit: false, x: m.x, y: m.y, n: 0}; }
