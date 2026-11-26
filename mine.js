/* ================= THE BLACKSMITH + THE MINE (24 Nov 2026, his asks) =================
   SMITHY and MINE (their loc numbers) are registered in south.js; this file is everything inside them.
   THE MINE (rebuilt the same day, his words: "a lot better ... pickaxe swing animations, the cave and rocks are the 3d sprite stack
   style, you are actually mining these rocks or mining the walls ... different levels of cave, the deeper you go the harder the rocks
   ... diamond rocks, emerald rocks ... a new currency called Crystals ... only broken by a gold pickaxe"):
     - a cave is a grid of 16 px cells. Every wall block and every rock is a SPRITE STACK (tools/make_mine.py makes the slice strips:
       assets/mine/rocks.png, walls.png, floor.png). Any wall beside the floor can be dug out, so you tunnel where you like.
     - 12 levels (25 Nov: two to a pickaxe), every pair with its own stone. A ladder shaft goes down. Deeper = more hits, more gold in the rocks,
       and from level 5 down it is dangerous (see DEEPER AND DARKER, further down).
     - crystal rocks (emerald, ruby, diamond) are found under a rock or wall you break from level 7 down, rarely. Gold pickaxe or better.
   THE BLACKSMITH: a chibi like the cast (tools/make_smith.py). He smelts gold (10 chunks = 15 coins, his numbers 25 Nov), sells pickaxes
   and swaps crystals for gold chunks.
   Server ops (functions/mine.js): mgo, mbreak, mfall, mpick, mcry, smelt, smeltGet. The server decides what is in every rock, so nothing here can be
   faked. mineLocal() = the same rules on this computer only (the ?lab on localhost, or while the ops are not deployed).
   MR = the numbers. THE SAME NUMBERS LIVE IN functions/mine.js: change both. */

const MR = {
  picks: [{id: 'wood', name: 'Wooden pickaxe', price: 0, pow: 1}, {id: 'stone', name: 'Stone pickaxe', price: 50, pow: 2}, {id: 'iron', name: 'Iron pickaxe', price: 200, pow: 3},
    {id: 'steel', name: 'Steel pickaxe', price: 700, pow: 5}, {id: 'gold', name: 'Gold pickaxe', price: 2500, pow: 8},
    {id: 'diamond', name: 'Diamond pickaxe', price: 3500, cry: 5, pow: 12}],   // (25 Nov, his ask) crafted: 3500 coins + 5 crystals   // pickaxe n digs down to level n + 1; only the last one breaks crystal
  levels: 12, lvmul: [1, 1.3, 1.7, 2.2, 2.8, 3.5, 4.4, 5.4, 6.6, 8, 9.6, 11.5],   // (25 Nov, his ask) 12 levels, two to a pickaxe (mNeed); lvmul = how much harder each level's stone is
  hp: {s: 3, g: 4, r: 6, w: 4, G: 5, R: 7, e: 30, u: 36, d: 44},            // s stone, g gold rock, r rich rock, w plain wall, G gold vein, R rich vein, e emerald, u ruby, d diamond
  rocks: 16, veins: 8, rockOdds: [[70, 28, 2], [64, 32, 4], [58, 36, 6], [53, 38, 9], [48, 40, 12], [44, 41, 15], [40, 42, 18], [36, 43, 21], [32, 44, 24], [28, 45, 27], [24, 45, 31], [20, 45, 35]],   // per level: stone, gold, rich (out of 100)
  cryFrom: 7, cryOdds: [0, 0, 0, 0, 0, 0, .002, .003, .005, .007, .011, .015], cryMix: [0, 0, 0, 0, 0, 0, [90, 10, 0], [80, 20, 0], [70, 25, 5], [62, 30, 8], [50, 35, 15], [40, 38, 22]], cryYield: {e: 1, u: 2, d: 4}, cryKeep: 3,   // a crystal rock under a break: the chance, which one, how many crystals
  goldMul: [1, 1.25, 1.5, 1.8, 2.1, 2.5, 3, 3.5, 4, 4.6, 5.3, 6],                                                // round 3, his note: "the lower you go ... the more gold chunks there are in each rock": gold rocks and veins pay this many times more per level
  bait: {n: 5, price: 150, max: 20},                                          // (26 Nov) GLIMMER BAIT, sold by Pip once he is mended: this many for this many coins, and the most you can carry (op gbuy)
  crackHits: 5,                                                               // (25 Nov) the cracked wall on level 12 (THE GLIMMERKIN, further down): this many swings with any pickaxe
  hearts: 3, fallLoss: .2,                                                    // (25 Nov) 3 hearts in the mine; passing out costs this share of the gold chunks you carry
  dayGold: 1000, dayCry: 10,   /* (26 Nov, his call) per HOUR now, was 600 a day: the same numbers as functions/mine.js */ cryGold: 150, smeltIn: 10, smeltOut: 15, smeltMs: 300000, smeltPer: 60000, smeltMax: 1800000, smeltCool: 600000, swingMs: 520};   // smeltMs: he takes 5 minutes over 10 chunks, smeltPer more for every 10 after that, never over smeltMax; smeltCool: his rest after a job is done (26 Nov, his asks)
const mHits = (k, lv, pick) => k === 'c' ? MR.crackHits : Math.max(1, Math.ceil(MR.hp[k] * ('eud'.includes(k) ? 1 : MR.lvmul[lv - 1]) / MR.picks[pick].pow));
const isCry = k => 'eud'.includes(k);
const mNeed = lv => (lv - 1) >> 1;   // the pickaxe a level asks for: wood 1-2, stone 3-4, iron 5-6, steel 7-8, gold 9-10, diamond 11-12
const CRY_NAME = {e: 'emerald', u: 'ruby', d: 'diamond'}, CRY_GLOW = {e: '90,255,170', u: '255,110,120', d: '150,225,255'};

function mineLoad() {
  const L = (k, src) => load(k, src).catch(() => {});
  return Promise.all([L('hall/smithy', 'assets/interiors/smithy.png'), L('smith/front', 'assets/final/smith/front.png'),
    L('mine/rocks', 'assets/mine/rocks.png'), L('mine/props', 'assets/mine/props.png'), L('smith/work', 'assets/final/smith/work.png'),
    fetch('assets/final/smith/work.json?v=' + BUILD).then(r => r.json()).then(j => { SMW.rows = j.rows; SMW.cell = j.cell; }).catch(() => {}), L('mine/walls', 'assets/mine/walls.png'), L('mine/floor', 'assets/mine/floor.png'), L('mine/lift', 'assets/mine/lift.png'),
    ...['forge', 'anvil', 'counter', 'toolrack', 'barrel', 'coal', 'grindstone', 'coins'].map(k => L('sm/' + k, `assets/smithy/${k}.png`)),
    ...['front', 'right', 'back', 'left'].map(d => L('pip/' + d, `assets/final/pip/${d}.png`)),
    ...['wood', 'stone', 'iron', 'steel', 'gold', 'diamond'].flatMap(k => [L('pick/' + k, `assets/mine/picks/${k}.png`), L('pick/' + k + '-swing', `assets/mine/picks/${k}-swing.png`)])]).then(mineMasks);
}
function mineMasks() {
  const sm = IMG['hall/smithy']; if (sm) IMG['hallw/smithy'] = maskCanvas(sm.width, sm.height, [[14, 82, 296, 214], [146, 212, 165, 226]], SMITHY_OBJS.filter(o => o.solid).map(o => o.solid));
  HALLS[SMITHY - 100].g = null; mineGeo(1); mineFill('');   // a first cave, so the place always has a floor to stand on
}

/* ---------- WHAT YOU CARRY: gold chunks, crystals, your best pickaxe ---------- */
const GOLD = {n: 0, cry: 0, pick: 0, gb: 0, job: null, local: false};   // job = your gold at the Blacksmith's: {c: coins it makes, t: when he started}
const pxIcon = (rows, C) => { const c = mk(rows[0].length, rows.length), x = c.getContext('2d'); rows.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return c; };
const GOLD_ICON = pxIcon(['..KKKK...', '.KYYWYK..', 'KYYYYYgK.', 'KYGYYYgK.', 'KGGYYggK.', '.KgggggK.', '..KKKKK..'], {K: '#1a1430', Y: '#ffd25e', W: '#fff6cf', G: '#e8b13a', g: '#b9781f'});
const CRY_ICON = pxIcon(['...KKK...', '..KWCCK..', '.KWCCCDK.', 'KWCCCCDDK', 'KCCCCDDDK', '.KCCDDDK.', '..KCDDK..', '...KDK...', '....K....'], {K: '#1a1430', W: '#ffffff', C: '#8fe6ff', D: '#3d9fe0'});
const iconImg = (ic, sc) => { const c = mk(ic.width * sc, ic.height * sc), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(ic, 0, 0, c.width, c.height); return `<img src="${c.toDataURL()}" style="width:${c.width}px;height:${c.height}px;image-rendering:pixelated;vertical-align:-2px" alt="">`; };
const goldImg = sc => iconImg(GOLD_ICON, sc), cryImg = sc => iconImg(CRY_ICON, sc);
{ const _wa = walletApply; walletApply = function (w) { _wa(w); if (!GOLD.local) { const k = (w && w.kit) || {}; GOLD.n = k.gold | 0; GOLD.cry = k.cry | 0; GOLD.pick = clamp(k.pick | 0, 0, MR.picks.length - 1); GOLD.gb = Math.max(0, k.gb | 0); GOLD.job = k.sm && k.sm.t ? {c: k.sm.c | 0, t: +k.sm.t, d: +k.sm.d || 0} : null; GOLD.smd = +k.smd || 0; } goldChip(); if ($('#baitModal') && $('#baitModal').classList.contains('on')) baitUI(); if ($('#smithModal').classList.contains('on')) smithUI(); if ($('#pickModal').classList.contains('on')) pickUI(); }; }
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
  W.gold |= 0; W.cry |= 0; W.pick |= 0; W.cs = W.cs || ''; const day = 'h' + Math.floor(Date.now() / 3600000); if (W.dk !== day) { W.dk = day; W.m = 0; W.c = 0; }
  const sync = () => { GOLD.n = W.gold; GOLD.cry = W.cry; GOLD.pick = W.pick; GOLD.job = W.sm || null; GOLD.smd = +W.smd || 0; goldChip(); save(); };
  const roll = odds => { let r = Math.random() * 100; for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r < 0) return i; } return 0; };
  if (op === 'mgo') { const lv = d.lv | 0; if (lv < 1 || lv > MR.levels) bad('No such level.'); if (W.pick < mNeed(lv)) bad('You need a better pickaxe to go deeper.');
    let k = ''; for (let i = 0; i < MR.rocks; i++) k += 'sgr'[roll(MR.rockOdds[lv - 1])]; for (let i = 0; i < MR.veins; i++) k += Math.random() * 100 < 10 + lv * 6 ? 'R' : 'G';
    if (lv >= MR.cryFrom) k += W.cs; W.mine = {lv, k, t: Date.now()}; sync(); return {lv, k}; }
  if (op === 'mbreak') { const M = W.mine; if (!M) bad('You are not in the mine.'); const i = d.i | 0, lv = M.lv; let k = 'w'; if (!(lv >= 1 && lv <= MR.levels) || W.pick < mNeed(lv)) bad('You are not in the mine.');
    if (i >= 0) { k = M.k[i]; if (!k || k === '.') bad('That is already dug out.'); }
    if (isCry(k) && W.pick < 4) bad('Only a gold pickaxe can break crystal.');
    if (i >= 0) M.k = M.k.slice(0, i) + '.' + M.k.slice(i + 1);
    const r = Math.random(); let got = 0, gc = 0;
    if (isCry(k)) { gc = Math.min(MR.cryYield[k], MR.dayCry - W.c); W.cs = W.cs.replace(k, ''); }
    else got = k === 's' ? (r < .2 ? 1 : 0) : k === 'w' ? (r < .08 ? 1 : 0) : k === 'g' ? 1 + (r < .35) : k === 'r' ? 2 + Math.floor(r * 3) : k === 'G' ? 2 + (r < .3) : 3 + Math.floor(r * 3);
    if ('grGR'.includes(k)) got = Math.floor(got * MR.goldMul[lv - 1] + Math.random());
    got = Math.max(0, Math.min(got, MR.dayGold - W.m)); W.m += got; W.gold += got; W.c += gc; W.cry += gc;
    let grow = null; const lab = typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.cryAlways ? LABM.cryAlways : '';   // the lab only: LABM.cryAlways = 'e' | 'u' | 'd' puts a crystal under every break, to look at them
    if (!isCry(k) && lv >= MR.cryFrom && W.cs.length < MR.cryKeep && (lab || Math.random() < MR.cryOdds[lv - 1])) { const c = lab || 'eud'[roll(MR.cryMix[lv - 1])]; W.cs += c; grow = {i: M.k.length, k: c}; M.k += c; }
    sync(); return {got, gc, gold: W.gold, cry: W.cry, grow, cap: W.m >= MR.dayGold}; }
  if (op === 'qcrack' || op === 'qpip') { const Q = W.q || (W.q = {s: 0}); if (!W.mine || W.mine.lv !== MR.levels) bad('You are not there.');   // the same order as functions/quest.js
    if (op === 'qcrack') { if (Q.s < 1) Q.s = 1; QUEST.s = Q.s; save(); return {s: Q.s}; }
    if (Q.s < 1) bad('Not yet.'); const got = Q.s === 1; if (got) Q.s = 2; QUEST.s = Q.s; save(); return {s: Q.s, got}; }
  if (op === 'qmoss' || op === 'qheal') { const Q = W.q || (W.q = {s: 0}), heal = op === 'qheal';   // batch 2, the same order as functions/quest.js: the moss is cut in the forest (107), Pip is mended on level 12
    if (heal ? !W.mine || W.mine.lv !== MR.levels : (d.at | 0) !== 107) bad('You are not there.'); if (Q.s < (heal ? 3 : 2)) bad('Not yet.');
    const got = Q.s === (heal ? 3 : 2); if (got) Q.s++; QUEST.s = Q.s; save(); return {s: Q.s, got}; }
  if (/^q(moon|fang|hcrack|forge|ember)$/.test(op)) { const Q = W.q || (W.q = {s: 0}), at = d.at | 0;   // batch 3, THE FOUR KEYSTONES, the same order as functions/quest.js: the place, then Pip mended (and the cracked stone, for the forge); each flag set once; all four = step 5
    const [flag, here, need] = {qmoon: ['moon', at === 102], qfang: ['fang', at === 107], qhcrack: ['hc', at === 107], qforge: ['hearth', at === 104, 'hc'], qember: ['ember', !!W.mine && W.mine.lv === 11]}[op];
    if (!here) bad('You are not there.'); if ((Q.s | 0) < 4 || (need && !Q[need])) bad('Not yet.'); const got = !Q[flag] && !(flag === 'hc' && Q.hearth); if (got) Q[flag] = 1;
    if (Q.s === 4 && ['moon', 'fang', 'hearth', 'ember'].every(k => Q[k])) Q.s = 5; QUEST.s = Q.s; save(); return {s: Q.s, got, k: {moon: Q.moon ? 1 : 0, fang: Q.fang ? 1 : 0, hc: Q.hc ? 1 : 0, hearth: Q.hearth ? 1 : 0, ember: Q.ember ? 1 : 0}}; }
  if (op === 'qopen') { const Q = W.q || (W.q = {s: 0}); if ((d.at | 0) !== 108) bad('You are not there.'); if ((Q.s | 0) < 5) bad('Not yet.'); const got = Q.s === 5; if (got) Q.s = 6; QUEST.s = Q.s; save(); return {s: Q.s, got}; }   // batch 4, THE TEMPLE, the same order as functions/quest.js: asked from the hollow (108), never before all four stones
  if (op === 'qking') { const Q = W.q || (W.q = {s: 0}); if ((d.at | 0) !== 109) bad('You are not there.'); if ((Q.s | 0) < 6) bad('Not yet.'); const got = Q.s === 6;   // batch 5, THE REWARD, the same order as functions/quest.js: asked from the throne hall (109), never before the doors are open, once
    if (got) { Q.s = 7; if (typeof LABOWN !== 'undefined') { for (const id of ['stag', 'r_temple']) { LABOWN.add(id); OWNED.add(id); } try { localStorage.setItem('m2lab_own', JSON.stringify([...LABOWN])); } catch (e) {} } WALLET.dec = WALLET.dec || {}; WALLET.dec.keystoneplaque = (WALLET.dec.keystoneplaque || 0) + 1; }
    QUEST.s = Q.s; save(); return {s: Q.s, got}; }
  if (op === 'gbuy') { const Q = W.q || {s: 0}, B = MR.bait; if ((Q.s | 0) < 4) bad('Not yet.'); if (!W.mine || W.mine.lv !== MR.levels) bad('You are not there.');   // GLIMMER BAIT, the same order as functions/mine.js: Pip mended, asked from level 12 (his den), room to carry it, then the coins
    const have = labBait(); if (have + B.n > B.max) bad('You cannot carry more bait.'); if (coins < B.price) bad('Not enough coins.'); coins -= B.price; paintCoins(); W.gb = have + B.n; labBait(W.gb); save(); return {gb: W.gb}; }
  if (op === 'mfall') { if (!W.mine) bad('You are not in the mine.'); const lost = Math.floor(W.gold * MR.fallLoss); W.gold -= lost; delete W.mine; sync(); return {lost, gold: W.gold}; }
  if (op === 'mpick') { const t = MR.picks.findIndex(p => p.id === d.id); if (t < 0) bad('No such pickaxe.'); if (W.pick >= t) return {pick: W.pick}; const P = MR.picks[t]; if (P.cry && W.cry < P.cry) bad('You need ' + P.cry + ' crystals.'); if (coins < P.price) bad('Not enough coins.'); coins -= P.price; if (P.cry) W.cry -= P.cry; paintCoins(); W.pick = t; sync(); return {pick: t}; }
  if (op === 'mcry') { const n = d.n | 0; if (n < 1 || n > W.cry) bad('You have no crystals.'); W.cry -= n; W.gold += n * MR.cryGold; sync(); return {gold: W.gold, cry: W.cry, got: n * MR.cryGold}; }
  if (op === 'smelt') { const now = Date.now(); if (W.sm) bad('He is still working on your gold.');   // the same order as functions/mine.js: one job, his rest, the gold you carry, the amount you chose
    const wait = (+W.smd || 0) + smeltCool() - now; if (wait > 0) bad('He is resting. Come back in ' + Math.ceil(wait / 60000) + ' min.');
    const max = Math.floor(W.gold / MR.smeltIn); if (!max) bad('You need ' + MR.smeltIn + ' gold chunks.');
    const lots = d.n != null ? d.n : max; if (!Number.isInteger(lots) || lots < 1 || lots > max) bad('You do not have that much gold.');
    W.gold -= lots * MR.smeltIn; W.sm = {c: lots * MR.smeltOut, t: now, d: smeltDur(lots)}; sync(); return {job: W.sm, gold: W.gold}; }
  if (op === 'smeltGet') { const J = W.sm; if (!J) bad('He has nothing of yours.'); const done = J.t + jobDur(J); if (Date.now() < done) bad('Your coins are not ready yet.'); coins += J.c; paintCoins(); delete W.sm; W.smd = done; sync(); return {coins: J.c, smd: done}; }
  bad('Unknown action.');
}
if (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.gold != null) { GOLD.local = true; GOLD.n = LABM.gold | 0; GOLD.cry = LABM.cry | 0; GOLD.pick = clamp(LABM.pick | 0, 0, MR.picks.length - 1); GOLD.job = LABM.sm || null; GOLD.smd = +LABM.smd || 0; }   // the lab remembers what you dug
/* the lab's Glimmer Bait: the server keeps it in wallet.kit.gb (the lake reads it there), so the lab keeps its own count in the same place (and in m2lab_mine.gb, to remember it) */
function labBait(n) { const K = WALLET.kit || (WALLET.kit = {}); if (n == null) return Math.max(0, (K.gb != null ? K.gb : LABM.gb) | 0); K.gb = LABM.gb = GOLD.gb = n; return n; }
if (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.gb != null) labBait(LABM.gb | 0);
const smeltMs = () => (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.smeltMs) || MR.smeltMs;   // the lab only: LABM.smeltMs = 30000 makes his five minutes half a minute, to watch the whole job
/* (26 Nov, his asks) YOU CHOOSE HOW MUCH, AND HE RESTS AFTER. smeltDur = how long he takes over this many lots of 10 (the same sum as
   functions/mine.js); a job carries its own time (J.d); GOLD.smd = when his last job was done, and for smeltCool after that he takes
   no new one. The lab only: LABM.smeltCool = 20000 makes his ten minutes' rest twenty seconds. */
const smeltDur = lots => Math.round(Math.min(MR.smeltMax, MR.smeltMs + (lots - 1) * MR.smeltPer) * smeltMs() / MR.smeltMs);
const jobDur = J => J && J.d > 0 ? +J.d : smeltMs();
const smeltCool = () => (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.smeltCool) || MR.smeltCool;
const coolLeft = () => GOLD.job ? 0 : Math.max(0, (+GOLD.smd || 0) + smeltCool() - Date.now());
async function mop(op, d) {
  if ((typeof LABLOCAL !== 'undefined' && LABLOCAL) || GOLD.local) return mineLocal(op, d);
  try { return await srv(op, d); } catch (e) { if (/Unknown action/i.test(String(e && e.message))) return mineLocal(op, d); throw e; }
}

/* ---------- THE BLACKSMITH'S, inside ---------- */
const SMITH_AT = [240, 119];   // where he stands, behind his counter
const PICKWALL = {x: 98, y: 25, w: 94, h: 50};   // (25 Nov) taller: the six new pickaxes hang in two rows of three   // the pickaxe wall (round 2: where the sword shelf was): all five, and where you buy the next one
const SMITHY_OBJS = [
  {k: 'pickwall', x: PICKWALL.x, y: PICKWALL.y, wall: true}, {k: 'toolrack', x: 212, y: 30, wall: true},   // his hammers and pliers hang behind him now (his note)
  {k: 'forge', x: 18, y: 6, solid: [20, 80, 94, 122]},
  {k: 'barrel', x: 22, y: 150, solid: [24, 182, 55, 198]}, {k: 'anvil', x: 98, y: 158, solid: [110, 171, 137, 184]},   // (26 Nov, his note) only the anvil now, no log under it: it stands on the floor
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
const pickSlot = t => [Math.round(((t % 3) + .5) * PICKWALL.w / 3) - 12, 2 + Math.floor(t / 3) * 22];   // where pickaxe t hangs on the board (its 24 x 24 picture's corner)
function pickWall() {
  const sig = GOLD.pick + '|' + !!IMG['pick/diamond']; if (pickWall.c && pickWall.sig === sig) return pickWall.c; pickWall.sig = sig;
  const W = PICKWALL.w, H = PICKWALL.h, c = pickWall.c || (pickWall.c = mk(W, H)), x = c.getContext('2d'), F = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); }; x.clearRect(0, 0, W, H);
  /* (25 Nov, his note) the same wood as the tool rack beside it: wide flat planks lying across, a light top edge on each, dark seams, grain streaks */
  const BH = H - 3, R = n => { n = Math.sin(n * 12.9898) * 43758.5453; return n - Math.floor(n); };
  F('#3e162b', 0, 0, W, BH); F('#0c0321', 0, BH - 1, W, 1);
  for (let y = 1, row = 0; y < BH - 1; y += 12, row++) { const h = Math.min(11, BH - 1 - y);
    F('#7f3c2b', 1, y, W - 2, h); F('#9c4d2c', 1, y, W - 2, Math.min(2, h)); if (y + 11 < BH - 1) F('#4c202d', 1, y + 11, W - 2, 1);
    for (let k = 0; k < 9; k++) { const gy = y + 3 + Math.floor(R(row * 31 + k) * (h - 4)), gx = 1 + Math.floor(R(row * 57 + k * 3) * (W - 12)), gw = 3 + Math.floor(R(k * 7 + row) * 9);
      F(k % 3 ? '#59242d' : '#662c2c', gx, gy, gw, 1); if (k % 2) F('#833e2b', gx + 2, gy - 1, Math.max(1, gw - 4), 1); } }
  F('rgba(18,28,58,.38)', 1, H - 3, W - 2, 2);                                                         // its flat shadow on the wall
  for (let t = 0; t < 6; t++) { const [px, py] = pickSlot(t), s = IMG['pick/' + PICK_ART[t]]; if (!s) continue;
    F('#3a1f12', px + 12, py + 7, 2, 2);                                                               // the peg it hangs on, under the head
    if (t <= GOLD.pick + 1) x.drawImage(s, px, py);
    else { const d = mk(24, 24), dx = d.getContext('2d'); dx.drawImage(s, 0, 0); dx.globalCompositeOperation = 'source-in'; dx.fillStyle = '#4a2812'; dx.fillRect(0, 0, 24, 24); x.drawImage(d, px, py); } }
  return c;
}
function pickWallAfter(t) {   // the next one to buy: yellow corners blinking round it
  const n = GOLD.pick + 1; if (n > 5 || Math.floor(t / 450) % 2) return; const [qx, qy] = pickSlot(n), cx = X(PICKWALL.x + qx + 12), y = Y(PICKWALL.y + qy + 1); lx.fillStyle = '#ffd25e';
  for (const [a, b, sx, sy] of [[-11, 0, 1, 1], [11, 0, -1, 1], [-11, 22, 1, -1], [11, 22, -1, -1]]) { lx.fillRect(cx + a, y + b, 1, 1); lx.fillRect(cx + a + sx, y + b, 1, 1); lx.fillRect(cx + a, y + b + sy, 1, 1); }
}

/* ---------- SMELTING IS A JOB (round 2, his ask): "the blacksmith moves around the blacksmith interior realistically crafting/smelting the
   gold to make coins, this process should take 5 minutes ... to the fire and look like he is pouring gold in, then ... to the water ...
   then moves to the anvil to hammer the gold, then the gold coins are done. the players can leave and come back ... each player sees
   whatever they are up to". So where he is and what he does comes ONLY from your own job's start time (GOLD.job.t): nothing is sent
   between phones. No job = he stands behind his counter. His frames are PixelLab's (tools/make_smith.py work -> assets/final/smith/work.png). */
const SMW = {rows: null, cell: 64, fr: {}};   // 64 px cells, his feet on row 52
const SM_AT = {forge: [57, 127], barrel: [40, 148], anvil: [94, 166]};
const SM_P1 = [SMITH_AT, [176, 114], [70, 128], SM_AT.forge], SM_P2 = [SM_AT.forge, SM_AT.barrel], SM_P3 = [SM_AT.barrel, [84, 152], SM_AT.anvil], SM_P4 = [SM_AT.anvil, [100, 150], [176, 150], [176, 114], SMITH_AT];   // back round behind the anvil, not through it
// the five minutes, in seconds: walk to the forge, melt, carry to the water, quench, walk to the anvil, hammer, walk back
const SM_T = {forge: 7, carry: 100, barrel: 102, toAnvil: 170, anvil: 173, home: 292, done: 300};
function pathAt(P, f) { const L = []; let tot = 0; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); tot += d; }
  let d = clamp(f, 0, 1) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = L[i] ? Math.min(1, d / L[i]) : 1, a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    return {x: a[0] + dx * k, y: a[1] + dy * k, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north'}; } d -= L[i]; } }
/* (26 Nov) a bigger job takes longer: his WALKS keep their own pace and only the work at the forge, the water and the anvil stretches.
   el = seconds since he started, D = the whole job in seconds; back comes the place on the five-minute plan above (SM_T). */
function smithClock(el, D) {
  const T = SM_T; if (D <= T.done) return el / D * T.done; if (el >= D) return T.done; if (el < 0) return -1;
  const seg = [[0, T.forge, 0], [T.forge, T.carry, 1], [T.carry, T.barrel, 0], [T.barrel, T.toAnvil, 1], [T.toAnvil, T.anvil, 0], [T.anvil, T.home, 1], [T.home, T.done, 0]];
  let walk = 0; for (const [a, b, w] of seg) if (!w) walk += b - a; const k = (D - walk) / (T.done - walk);
  for (const [a, b, w] of seg) { const len = (b - a) * (w ? k : 1); if (el < len) return a + el / len * (b - a); el -= len; } return T.done;
}
function smithNow() {
  const J = GOLD.job; if (!J) return {home: true}; const e = smithClock((Date.now() - J.t) / 1000, jobDur(J) / 1000); if (e >= SM_T.done) return {home: true, ready: true}; if (e < 0) return {home: true};
  const D = jobDur(J) / 1000, sk = D > SM_T.done ? (D - 20) / (SM_T.done - 20) : 1;   // sk: how much his work is stretched, so each pour and each hammer blow still takes its own real time
  const walk = (P, a, b, st) => ({...pathAt(P, (e - a) / (b - a)), anim: 'walk', st, e, se: e - a}), T = SM_T;
  if (e < T.forge) return walk(SM_P1, 0, T.forge, 'go');
  if (e < T.carry) { const se = e - T.forge, c = (se * sk) % 9; return {x: SM_AT.forge[0], y: SM_AT.forge[1], dir: 'north', anim: c < 3.2 ? 'pour' : 'idle', k: c / 3.2, st: 'forge', e, se}; }
  if (e < T.barrel) return walk(SM_P2, T.carry, T.barrel, 'carry');
  if (e < T.toAnvil) { const se = e - T.barrel; return {x: SM_AT.barrel[0], y: SM_AT.barrel[1], dir: 'south', anim: se < 26 ? 'pour' : 'idle', k: ((se * sk) % 3.2) / 3.2, st: 'barrel', e, se}; }
  if (e < T.anvil) return walk(SM_P3, T.toAnvil, T.anvil, 'bar');
  if (e < T.home) { const se = e - T.anvil, c = (se * sk) % 1.1; return {x: SM_AT.anvil[0], y: SM_AT.anvil[1], dir: 'east', anim: c < .72 ? 'hammer' : 'idle', k: c / .72, st: 'anvil', e, se}; }
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
const ANVIL_TOP = [112, 161], ANVIL_BASE = 158 + 26 - 2;   // the anvil's flat top, where his hammer lands; ANVIL_BASE = its feet on the floor
function anvilGold(t) { const S = smithNow(); if (S.home || S.st !== 'anvil') return;
  const q = Math.floor(t / 90), coinsK = clamp((S.se - 30) / 80, 0, 1), bx = ANVIL_TOP[0], by = ANVIL_TOP[1];   // a glowing bar that turns, blow by blow, into coins
  if (coinsK < 1) { P1('#01032e', bx, by - 1, 9, 4); P1(S.se < 40 ? '#ffb24a' : '#e8b13a', bx + 1, by, 7, 2); P1('#fff0a0', bx + 2, by, 3, 1); }
  for (let i = 0; i < Math.floor(coinsK * 4); i++) { P1('#01032e', bx + 9 + i * 4, by - 1 - (i % 2), 5, 4); P1('#ffd25e', bx + 10 + i * 4, by - (i % 2), 3, 2); P1('#fff6cf', bx + 10 + i * 4, by - (i % 2), 1, 1); }
  if (S.anim === 'hammer' && S.k > .5 && S.k < .8) { for (let i = 0; i < 5; i++) { const a = i * 1.3 + q, r = 3 + (S.k - .5) * 30; P1(i % 2 ? '#fff0a0' : '#ffb24a', bx + 4 + Math.cos(a) * r, by - 1 - Math.abs(Math.sin(a)) * r * .8); } }
}
function smithObj(t) {   // him, out on the floor at work
  const S = smithNow(); smithSound(S); if (S.home) return null; const fr = smithFrame(S.anim, S.dir, S.k || 0, t);
  if (fr) return {img: fr, x: Math.round(S.x) - SMW.cell / 2, y: Math.round(S.y) - 52, base: S.st === 'anvil' ? ANVIL_BASE + .5 : S.y, after: () => smithProps(S, t)};
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
  const n = GOLD.n, max = Math.floor(n / MR.smeltIn), b = $('#smeltYes'), J = GOLD.job, left = J ? J.t + jobDur(J) - Date.now() : 0, cool = coolLeft();
  if (GOLD.lots == null || GOLD.lotsMax !== max) GOLD.lots = max; GOLD.lotsMax = max; const lots = GOLD.lots = clamp(GOLD.lots | 0, max ? 1 : 0, max);   // how many lots of 10 you hand him: all of it until you pick less
  const pick = $('#smeltPick'), show = !J && !cool && max > 1; pick.style.display = show ? '' : 'none';
  if (show) { const r = $('#smeltN'); if (+r.max !== max) r.max = max; if (+r.value !== lots) r.value = lots; $('#smeltLess').disabled = lots <= 1; $('#smeltMore').disabled = lots >= max; }
  $('#smithGold').innerHTML = goldImg(2) + ' ' + n; $('#smithCry').innerHTML = cryImg(2) + ' ' + GOLD.cry;
  const html = J ? (left > 0 ? `Ready in ${mmss(left)}` : `Collect ${ic('coin', 2)} ${J.c}`) : cool ? `Next smelt in ${mmss(cool)}` : lots ? `Smelt ${lots * MR.smeltIn} ${goldImg(2)} for ${ic('coin', 2)} ${lots * MR.smeltOut} <span class="smT">${mmss(smeltDur(lots))}</span>` : `Need ${MR.smeltIn} gold chunks`;
  b.disabled = J ? left > 0 : cool > 0 || lots < 1; if (b.dataset.h !== html) { b.dataset.h = html; b.innerHTML = html; }
  const c = $('#cryYes'), ch = GOLD.cry ? `Trade ${GOLD.cry} ${cryImg(2)} for ${goldImg(2)} ${GOLD.cry * MR.cryGold}` : `1 ${cryImg(2)} = ${goldImg(2)} ${MR.cryGold}`; c.disabled = GOLD.cry < 1; if (c.dataset.h !== ch) { c.dataset.h = ch; c.innerHTML = ch; }
}
function pickUI() {
  $('#pickPicks').innerHTML = MR.picks.map((p, t) => { const own = GOLD.pick >= t, on = GOLD.pick === t, next = t === GOLD.pick + 1;
    return `<div class="jrod${on ? ' on' : ''}"><img class="jimg" src="${pickIcon(t)}" alt=""${own || next ? '' : ' style="filter:brightness(.35)"'}><div class="jt"><b>${p.name}</b><div class="small">${t === 5 ? 'Levels 11-12. Crafted.' : t === 4 ? 'Levels 9-10. Breaks crystal.' : 'Levels ' + (t * 2 + 1) + '-' + (t * 2 + 2)}</div></div>` +
      `<button class="btn${own ? '' : ' go'}" data-p="${p.id}"${own || !next || coins < p.price || (p.cry && GOLD.cry < p.cry) ? ' disabled' : ''}>${on ? 'Yours' : own ? 'Owned' : ic('coin', 2) + ' ' + p.price + (p.cry ? '<br>' + cryImg(2) + ' ' + p.cry : '')}</button></div>`; }).join('');
  for (const q of $('#pickPicks').querySelectorAll('button[data-p]')) q.onclick = () => pickBuy(q.dataset.p);
}
function smithOpen() { sfx('click'); document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); paintCoins(); smithUI(); $('#smithModal').classList.add('on'); }
function pickOpen() { sfx('click'); document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); paintCoins(); pickUI(); $('#pickModal').classList.add('on'); }
async function smeltGo() {
  const b = $('#smeltYes'); if (b.disabled) return; b.disabled = true;
  try { if (GOLD.job) { const r = await mop('smeltGet'); GOLD.job = null; if (r.smd) GOLD.smd = +r.smd; sfx('coin'); wlSay(`The Blacksmith paid you ${r.coins} coins.`, 'good'); }
    else { const r = await mop('smelt', {n: GOLD.lots}); if (r.job) GOLD.job = {c: r.job.c | 0, t: Date.now(), d: +r.job.d || 0}; sfx('click'); forgeBurst(); $('#smithModal').classList.remove('on'); } }   // off he goes to the forge
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
const HZ = {spike: 5, pop: 6, fall: 8, lava: 9, inv: 1.5};   // DEEPER AND DARKER (further down): the level each danger starts on; inv = seconds nothing can hurt you after a hit
Object.assign(MN, {haz: new Map(), hzc: {}, pools: [], falls: [], emb: [], eyes: [], drips: [], shrooms: [], hp: MR.hearts, inv: 0, flash: 0, out: false, safe: null, fallT: 5, rumT: 20, seed: 1});
const mci = (x, y) => y * MGW + x, inCave = (x, y) => x >= 2 && x <= MGW - 3 && y >= 3 && y <= MGH - 3;
const isFloor = (x, y) => x >= 0 && y >= 0 && x < MGW && y < MGH && !MN.cell[mci(x, y)];
const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };
const rockAt = (x, y) => MN.rocks.find(r => r.gx === x && r.gy === y);
const blocked = (x, y) => !isFloor(x, y) || !!rockAt(x, y) || (MN.shaft && MN.shaft[0] === x && MN.shaft[1] === y);

/* the shape of a level: a wandering dig from where you come in. Level 1 has the way out at the bottom; the others a ladder up. */
function mineGeo(lv) {
  const M = MN; M.den = false; M.crack = null; M.lift = null; M.lv = lv; M.cell.fill(1); M.rocks = []; M.veins = new Map(); M.wdmg = new Map(); M.lamps = []; M.keep = new Set(); M.fx = []; M.shaft = null; DIG.on = null;
  const R = n => Math.floor(Math.random() * n); let ex, ey;
  if (lv === 1) { ex = 11; ey = MGH - 3; M.cell[mci(ex, MGH - 2)] = 0; M.cell[mci(ex, MGH - 1)] = 0; M.keep.add(mci(ex - 1, MGH - 2)).add(mci(ex + 1, MGH - 2)); }
  else { ex = 5 + R(MGW - 10); ey = 7 + R(MGH - 11); M.keep.add(mci(ex, ey - 1)).add(mci(ex, ey - 2)).add(mci(ex, ey - 3)); }   // the ladder's wall stays a full wall: nothing dug behind it
  M.entry = [ex, ey];
  let x = ex, y = ey, dx = 0, dy = -1, n = 0; const want = 92 + lv * 3;
  const carve = (cx, cy) => { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const X0 = cx + a, Y0 = cy + b; if (inCave(X0, Y0) && !M.keep.has(mci(X0, Y0)) && M.cell[mci(X0, Y0)]) { M.cell[mci(X0, Y0)] = 0; n++; } } };
  M.cell[mci(ex, ey)] = 0; n++;
  for (let it = 0; it < 4000 && n < want; it++) { carve(x, y); if (Math.random() < .42) [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][R(4)];
    const nx = x + dx, ny = y + dy; if (inCave(nx, ny) && inCave(nx + 1, ny + 1)) { x = nx; y = ny; } else [dx, dy] = [-dx, -dy];
    if (it % 90 === 89) { const f = []; for (let i = 0; i < MGW * MGH; i++) if (!M.cell[i]) f.push(i); const c = f[R(f.length)]; x = c % MGW; y = (c / MGW) | 0; } }
  if (lv > 1) M.cell[mci(ex, ey - 1)] = 1;
  { const lx0 = ex + 2, ly0 = ey - 1; M.lift = [lx0, ly0]; M.cell[mci(lx0, ly0)] = 1; M.keep.add(mci(lx0, ly0));   // THE ELEVATOR (26 Nov): two squares along from where you arrive. Its square counts as rock (nothing dug, nothing walked through); the floor in front of it is open
    for (const a of [-1, 0, 1]) { const X0 = lx0 + a, Y0 = ly0 + 1; if (inCave(X0, Y0) && !M.keep.has(mci(X0, Y0))) M.cell[mci(X0, Y0)] = 0; } }
  // ONE CAVE: the ladder's wall can cut where you land off from the rest. Any floor you cannot walk to gets a tunnel dug to it (never through the ladder's wall).
  for (let guard = 0; guard < 12; guard++) { const d = mineFlood(ex, ey, () => false); let lost = false; for (let i = 0; i < MGW * MGH; i++) if (!M.cell[i] && d[i] < 0) { lost = true; break; } if (!lost) break;
    const prev = new Int32Array(MGW * MGH).fill(-1), q = []; for (let i = 0; i < MGW * MGH; i++) if (d[i] >= 0) { prev[i] = i; q.push(i); } let hit = -1;
    for (let h = 0; h < q.length && hit < 0; h++) { const c = q[h], cx = c % MGW, cy = (c / MGW) | 0; for (const [a2, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X0 = cx + a2, Y0 = cy + b2, i = mci(X0, Y0); if (!inCave(X0, Y0) || prev[i] >= 0 || M.keep.has(i)) continue; prev[i] = c; if (!M.cell[i]) { hit = i; break; } q.push(i); } }
    if (hit < 0) break; for (let c = prev[hit]; d[c] < 0; c = prev[c]) M.cell[c] = 0; }
  // the shaft down: the floor cell furthest from where you came in
  if (lv < MR.levels) { const d = mineFlood(ex, ey, () => false); let best = -1, bd = -1; for (let i = 0; i < MGW * MGH; i++) if (d[i] > bd && !(lv === 1 && ((i / MGW) | 0) >= MGH - 2) && Math.max(Math.abs(i % MGW - ex), Math.abs(((i / MGW) | 0) - ey)) >= 4) { bd = d[i]; best = i; } if (best >= 0) M.shaft = [best % MGW, (best / MGW) | 0]; }
  // NOTHING ON OR ROUND A LADDER (round 3, his note): the cells round the shaft, and in front of and beside the ladder up, are open floor
  for (const [cx, cy, top] of [M.shaft ? [M.shaft[0], M.shaft[1], -1] : null, lv > 1 ? [ex, ey, 0] : null].filter(Boolean)) for (let b = top; b <= 1; b++) for (let a = -1; a <= 1; a++) { const X0 = cx + a, Y0 = cy + b; if (inCave(X0, Y0) && !M.keep.has(mci(X0, Y0))) M.cell[mci(X0, Y0)] = 0; }
  if (lv === MR.levels) crackPick(); mineHaz(); M.dirty = true;
}
const nearLadder = (x, y) => (MN.shaft && Math.max(Math.abs(MN.shaft[0] - x), Math.abs(MN.shaft[1] - y)) <= 1) || Math.max(Math.abs(MN.entry[0] - x), Math.abs(MN.entry[1] - y)) <= 1 || nearCrack(x, y, 1) || nearLift(x, y);   // on a ladder or one of the 8 cells round it (and the floor in front of level 12's crack)
const liftAt = (x, y) => !!MN.lift && MN.lift[0] === x && MN.lift[1] === y, nearLift = (x, y) => !!MN.lift && Math.abs(x - MN.lift[0]) <= 1 && Math.abs(y - MN.lift[1]) <= 1;   // the elevator's square | the squares round it: no rock, no danger
function mineFlood(sx, sy, stop) {   // steps from (sx, sy) over the open floor; -1 = cannot be reached
  const d = new Int16Array(MGW * MGH).fill(-1), q = [mci(sx, sy)]; d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) { const c = q[h], cx = c % MGW, cy = (c / MGW) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X0 = cx + a, Y0 = cy + b; if (X0 < 0 || Y0 < 0 || X0 >= MGW || Y0 >= MGH) continue; const i = mci(X0, Y0); if (d[i] >= 0 || MN.cell[i] || stop(X0, Y0)) continue; d[i] = d[c] + 1; q.push(i); } }
  return d;
}
/* what is in it: k = the server's list (16 rocks, 8 wall veins, then any crystal rocks still waiting for you) */
function mineFill(k) {
  const M = MN, [ex, ey] = M.entry, R = n => Math.floor(Math.random() * n); M.rocks = []; M.veins = new Map(); M.lamps = [];
  const ck = M.crack && !M.keep.has(M.crack.i) ? M.crack.i : -1; if (ck >= 0) M.keep.add(ck);   // no vein and no lamp on the cracked wall
  const stop = (x, y) => !!rockAt(x, y) || (M.shaft && M.shaft[0] === x && M.shaft[1] === y) || hazStop(x, y);
  const okAll = () => { const d = mineFlood(ex, ey, stop), near = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X0 = x + a, Y0 = y + b; return X0 >= 0 && Y0 >= 0 && X0 < MGW && Y0 < MGH && d[mci(X0, Y0)] >= 0; });
    return M.rocks.every(r => near(r.gx, r.gy)) && (!M.shaft || near(M.shaft[0], M.shaft[1])); };
  const free = []; for (let y = 3; y <= MGH - 3; y++) for (let x = 2; x <= MGW - 3; x++) if (!M.cell[mci(x, y)] && !nearLadder(x, y) && !M.haz.has(mci(x, y))) free.push([x, y]);
  free.sort(() => Math.random() - .5);
  const put = (kind, i) => { while (free.length) { const [x, y] = free.pop(); const r = mkRock(x, y, kind, i); M.rocks.push(r); if (okAll()) return r; M.rocks.pop(); } return null; };
  for (let i = 0; i < k.length; i++) { const ch = k[i]; if ('sgr'.includes(ch) || isCry(ch)) put(ch, i); }
  // veins: walls whose face you can see (floor to the south of them)
  const faces = []; for (let y = 3; y <= MGH - 3; y++) for (let x = 2; x <= MGW - 3; x++) if (M.cell[mci(x, y)] && !M.keep.has(mci(x, y)) && isFloor(x, y + 1) && !rockAt(x, y + 1)) faces.push(mci(x, y));
  faces.sort(() => Math.random() - .5);
  { const more = []; for (let y = 3; y <= MGH - 3; y++) for (let x = 2; x <= MGW - 3; x++) if (mineable(x, y) && !faces.includes(mci(x, y))) more.push(mci(x, y)); more.sort(() => Math.random() - .5); faces.unshift(...more); }   // not enough faces: the rest go in walls you see from the side or from above
  for (let i = 0; i < k.length; i++) if ('GR'.includes(k[i]) && faces.length) M.veins.set(faces.pop(), {k: k[i], i});
  for (let n = 0; n < 3 && faces.length; n++) { const i = faces.pop(); if (isFloor(i % MGW, ((i / MGW) | 0) + 1)) M.lamps.push(i); }
  if (ck >= 0) M.keep.delete(ck);
  M.dirty = true;
}
function mkRock(gx, gy, k, i) { return {gx, gy, k, i, hp: 0, max: 0, st: 0, a: Math.floor(Math.random() * 16), shake: 0, flash: 0, born: 0}; }

/* ---------- drawing the stacks ---------- */
function rockRow(r) { return (isCry(r.k) ? MR.levels * 9 + 'eud'.indexOf(r.k) * 3 : (MN.lv - 1) * 9 + 'sgr'.indexOf(r.k) * 3) + r.st; }
function wallRow(idx) { const v = MN.veins.get(idx), d = MN.wdmg.get(idx), st = d ? d.st : 0; return (mArt() - 1) * 12 + (v ? (v.k === 'G' ? 2 : 3) : hash(idx * 7 + MN.lv) % 2) * 3 + st; }
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
  for (let gy = 0; gy < MGH; gy++) for (let gx = 0; gx < MGW; gx++) { const lf = liftAt(gx, gy); if (M.cell[mci(gx, gy)] && !lf) continue; const X0 = gx * CS, Y0 = gy * CS, hh = hash(mci(gx, gy) * 13 + M.lv);
    if (fl) x.drawImage(fl, (hh % 8 < 5 ? 0 : 1 + hh % 3) * CS, (mArt() - 1) * CS, CS, CS, X0, Y0, CS, CS); if (lf) continue;   // the elevator stands on floor, but nobody walks on its square
    if (!isFloor(gx, gy - 1)) { x.fillStyle = 'rgba(7,6,15,.45)'; x.fillRect(X0, Y0, CS, 2); x.fillStyle = 'rgba(7,6,15,.22)'; x.fillRect(X0, Y0 + 2, CS, 2); }   // the wall's shade on the ground at its foot
    const l = isFloor(gx - 1, gy) ? 0 : 5, r = isFloor(gx + 1, gy) ? 0 : 5, t = isFloor(gx, gy - 1) ? 0 : 1, b = isFloor(gx, gy + 1) || gy === MGH - 1 ? 0 : 4;
    mx.fillRect(X0 + l, Y0 + t, CS - l - r, CS - t - b); }
  if (M.lv === 1) { const X0 = M.entry[0] * CS; for (let i = 0; i < 20; i++) { x.fillStyle = `rgba(255,226,170,${.03 + i * .014})`; x.fillRect(X0, H - 20 + i, CS, 1); } }   // daylight at the way out
  mineDeco(x);
  mx.fillStyle = '#000';
  for (const r of M.rocks) mx.fillRect(r.gx * CS - 1, r.gy * CS + 2, CS + 2, CS - 1);
  if (M.den) denMask(mx);
  M.wobj = [];
  if (M.shaft) { const [sx, sy] = M.shaft, im = shaftSprite(M.lv); mx.fillRect(sx * CS - 1, sy * CS + 1, CS + 2, CS); if (im) M.wobj.push({img: im, x: sx * CS + 8 - 14, y: sy * CS + 9 - im.gy, base: sy * CS + 12}); }
  for (let gy = 0; gy < MGH; gy++) for (let gx = 0; gx < MGW; gx++) { const i = mci(gx, gy); if (!M.cell[i] || M.dist[i] > 3 || liftAt(gx, gy)) continue; const h = wallH(gx, gy), im = wallSprite(wallRow(i), h, M.dist[i] - 1); if (!im) continue;
    M.wobj.push({img: im, x: gx * CS, y: gy * CS - (h - 1), base: gy * CS + CS, i}); }
  M.lamps = M.lamps.filter(i => M.cell[i] && wallH(i % MGW, (i / MGW) | 0) === WZ && isFloor(i % MGW, ((i / MGW) | 0) + 1));   // a lamp hangs on a full wall face only
  for (const i of M.lamps) { const gx = i % MGW, gy = (i / MGW) | 0; M.wobj.push({img: lampSprite(), x: gx * CS + 4, y: gy * CS - 2, base: gy * CS + CS + .2}); }
  if (M.lv > 1 && !M.den) { const [ex, ey] = M.entry, im = ladderSprite(); if (im) M.wobj.push({img: im, x: ex * CS + 8 - 12, y: ey * CS + 2 - im.gy, base: ey * CS + .3}); }
  IMG['hall/mine'] = bg; IMG['hallw/mine'] = mask; MNH.g = null; mineGridHaz();
}

/* ---------- coming and going ---------- */
const mineSpawn = () => MN.lv === 1 || MN.den ? [MN.entry[0] * CS + 8, (MGH - 2) * CS + 6, 'back'] : [MN.entry[0] * CS + 8, MN.entry[1] * CS + 9, 'front'];
function mineHead() { wlHead('The Mine', 'Tap a rock or a wall to dig'); $('#hallLine').innerHTML = 'LEVEL ' + MN.lv + '<span id="mineHp" style="display:inline-flex;gap:2px;margin-left:8px;vertical-align:-1px"></span>'; mineHearts(); }
MNH.from = () => { mineGeo(1); mineFill(''); mineBake(); return mineSpawn(); };
MNH.enter = () => { LIFT.ride = null; mineHeal(); goldChip.sig = ''; goldChip(); mineHead(); mineStock(1); };   // your hearts are full again every time you walk in
/* ask the server what is in this level; the screen stays dark until it answers */
function mineStock(lv, then) {
  const xf = $('#xfade'); let done = false; MN.busy = true;
  Promise.resolve().then(() => mop('mgo', {lv})).then(r => { done = true; if (WL.me && WL.me.loc === MINE && MN.lv === lv) { mineFill(r.k || ''); mineBake(); } }, e => { done = true; wlSay(e.message, 'bad'); })
    .then(() => { MN.busy = false; xf.classList.remove('on'); if (then) then(); });
  setTimeout(() => { if (!done) xf.classList.add('on'); }, 0);
}
function mineTo(lv, viaShaft) {   // down the shaft, or back up the ladder
  const m = WL.me; if (MN.busy || WL.fading || !m) return;
  if (lv > MN.lv && GOLD.pick < mNeed(lv)) { if (performance.now() - MN.said > 1500) { MN.said = performance.now(); const pn = MR.picks[mNeed(lv)].name.toLowerCase(); wlSay(`You need a${/^[aeiou]/.test(pn) ? 'n' : ''} ${pn} to go deeper.`, 'bad'); } return; }
  MN.busy = true; WL.fading = true; DIG.on = null; sfx('door'); const xf = $('#xfade'); xf.classList.add('on');
  setTimeout(() => { const up = lv < MN.lv; mineGeo(lv); mineFill(''); mineBake(); m.path = []; m.todo = null; m.walk = false;
    let sp = mineSpawn(); if (up && MN.shaft) { const [sx, sy] = MN.shaft, n = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([a, b]) => [sx + a, sy + b]).find(([a, b]) => isFloor(a, b)); if (n) sp = [n[0] * CS + 8, n[1] * CS + 9, 'front']; }
    m.x = sp[0]; m.y = sp[1]; m.dir = sp[2]; mineHead(); netMove(); WL.fading = false; mineStock(lv); }, 240);
}
function mineLeave() { DIG.on = null; wlDoor(SOUTH); }

/* ---------- what you can hit ---------- */
const mineable = (x, y) => !MN.den && inCave(x, y) && MN.cell[mci(x, y)] && !MN.keep.has(mci(x, y)) && !(crackAt(mci(x, y)) && MN.crack.open) && (isFloor(x + 1, y) || isFloor(x - 1, y) || isFloor(x, y + 1) || isFloor(x, y - 1));
const tgtOf = (x, y) => { const r = rockAt(x, y); return r ? {r, gx: x, gy: y} : mineable(x, y) ? {w: mci(x, y), gx: x, gy: y} : null; };
const tgtPt = T => T.r ? [T.gx * CS + 8, T.gy * CS + 2] : [T.gx * CS + 8, T.gy * CS + CS - (isFloor(T.gx, T.gy + 1) ? 10 : 2)];   // the spot the pick lands on
function tgtInfo(T) {   // its kind, the server's number for it, and how hurt it is
  if (T.r) return {k: T.r.k, i: T.r.i, o: T.r};
  const v = MN.veins.get(T.w); let d = MN.wdmg.get(T.w); if (!d) { d = {hp: 0, max: 0, st: 0, shake: 0}; MN.wdmg.set(T.w, d); } return {k: crackShut(T.w) ? 'c' : v ? v.k : 'w', i: v ? v.i : -1, o: d};   // 'c' = level 12's cracked wall
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
  if (PIP.talk) { pipNext(); return true; }   // Pip is talking: a tap anywhere is the next line
  if (MN.lift && Math.abs(x - (MN.lift[0] * CS + 8)) < 17 && y > MN.lift[1] * CS - 50 && y < MN.lift[1] * CS + 19) { const [a, b] = MN.lift; DIG.on = null; wlGo(m, a * CS + 8, (b + 1) * CS + 6, liftOpen); return true; }   // the elevator
  if (MN.den && Math.abs(x - PIP_AT[0]) < 16 && y > PIP_AT[1] - 40 && y < PIP_AT[1] + 8) { wlGo(m, PIP_STAND[0], PIP_STAND[1], pipTalk); return true; }
  { const C = MN.crack; if (C && C.open && Math.abs(x - (C.gx * CS + 8)) < 9 && y > C.gy * CS - 8 && y < C.gy * CS + 18) { DIG.on = null; wlGo(m, C.gx * CS + 8, (C.gy + 1) * CS + 5, denGo); return true; } }
  if ((MN.lv === 1 || MN.den) && y > (MGH - 2) * CS + 4 && Math.abs(x - (MN.entry[0] * CS + 8)) < 16) { DIG.on = null; wlGo(m, MN.entry[0] * CS + 8, MGH * CS - 3, MN.den ? denLeave : mineLeave); return true; }
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
  if (PIP.talk) return true;
  if (MN.den && dy < 0 && !m.walk && Math.abs(m.x - PIP_AT[0]) < 15 && m.y > PIP_AT[1] && m.y < PIP_AT[1] + 40) { pipTalk(); return true; }   // walked up to Pip
  if ((MN.lv === 1 || MN.den) && J.y > .5 && m.y > MGH * CS - 9) { if (MN.den) denLeave(); else mineLeave(); return true; }
  const gx = Math.floor((m.x + dx * 12) / CS), gy = Math.floor((m.y - 3 + dy * 10) / CS);
  if (dy < 0 && liftAt(gx, gy) && !m.walk) { liftOpen(); return true; }   // walked into the elevator
  if (MN.shaft && MN.shaft[0] === gx && MN.shaft[1] === gy && !m.walk) { mineTo(MN.lv + 1); return true; }
  if (MN.crack && MN.crack.open && dy < 0 && gx === MN.crack.gx && gy === MN.crack.gy && !m.walk) { denGo(); return true; }   // into the hole in level 12's wall
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
  if (o.hp <= 0) { if (inf.k === 'c') crackBreak(T); else digBreak(T, inf); }
}
function mineChips(x, y, k, n) {
  const P = MINE_COL[MN.lv - 1], gold = 'grGR'.includes(k), gem = isCry(k);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 20 + Math.random() * 45; MN.fx.push({k: 'chip', x: x + Math.cos(a) * 3, y: y + 4, z: 4 + Math.random() * 8, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .5, vz: 40 + Math.random() * 60,
    col: gem && i % 2 ? GEM_COL[k][i % 3] : gold && i % 3 === 0 ? ['#ffd25e', '#fff6cf', '#e8b13a'][i % 3] : P[i % 3], sz: i % 4 ? 1 : 2, t: 0, l: .5 + Math.random() * .3}); }
  puffAt(x, y + 2, 3);
}
const MINE_COL = [['#5c4034', '#805c46', '#a47c5c'], ['#523a38', '#725248', '#94705e'], ['#484a5c', '#686c7c', '#8c929e'], ['#3e485e', '#5a6880', '#7c8ea4'], ['#303e62', '#465c84', '#627ea4'], ['#1e425c', '#2c607a', '#468498'],
  ['#422a5c', '#603e7c', '#825a9c'], ['#402052', '#5e2e6c', '#824288'], ['#441c26', '#642a30', '#883e3c'], ['#38181e', '#542226', '#76322e'], ['#221a26', '#342432', '#4e323e'], ['#1a141e', '#281c26', '#3c242c']];   // each level's stone (STONE in tools/make_mine.py)
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
    if (res.cap && !res.got && !res.gc && !isCry(inf.k) && performance.now() - MN.said > 20000) { MN.said = performance.now(); wlSay(`No more gold for now. The mine fills up again in ${Math.max(1, Math.ceil((3600000 - Date.now() % 3600000) / 60000))} min.`); }
    if (res.grow && !blocked(T.gx, T.gy) && !nearLadder(T.gx, T.gy) && m.loc === MINE) { const r = mkRock(T.gx, T.gy, res.grow.k, res.grow.i);   // (beside a ladder it waits for your next visit instead: nothing may stand there) r.born = .5; M.rocks.push(r); M.dirty = true; sfx('rare'); M.shake = .3;   // a crystal rock under it
      if (WL.fx) for (let i = 0; i < 4; i++) WL.fx.push({k: 'spark', x: tx + (Math.random() - .5) * 18, y: ty + (Math.random() - .5) * 14, t: -i * .12, loc: MINE}); }
  }, e => { DIG.ask = false; wlSay(e.message, 'bad'); });
}

/* THE PICKAXE: drawn in code at any angle, on the art's own pixels (so every outfit can swing every pickaxe). Angle 0 = pointing right. */
const PICK_COL = [['#96683e', '#be8c5a'], ['#787c8c', '#aab0bc'], ['#b0bacc', '#e2e8f0'], ['#568cc4', '#96c8f0'], ['#e8b13a', '#fff0a0']];
/* THE PICKAXES (25 Nov, his ask: "normal and look good when they are small"): PixelLab art, 24 x 24, plain, no outline (his pick, A).
   Drawn head top-right, handle bottom-left; the hand holds PICK_GRIP. For the swing the picture is TURNED without blur: blown up 8 times,
   turned, then each 8 x 8 block read from its middle, so every pixel stays a hard square in the picture's own colours. */
const PICK_ART = ['wood', 'stone', 'iron', 'steel', 'gold', 'diamond'], PICK_GRIP = [7, 16], PICK_NAT = Math.atan2(6 - 16, 15 - 7);
function pickRot(tier, step, flip) {
  const key = 'r' + tier + '|' + step + '|' + (flip ? 1 : 0); if (MN.cache[key]) return MN.cache[key];
  const im = IMG['pick/' + PICK_ART[tier]]; if (!im) return null;
  const N = 41, C = 20, U = 8, a = step / 64 * Math.PI * 2, big = mk(N * U, N * U), bx = big.getContext('2d'); bx.imageSmoothingEnabled = false;
  bx.translate((C + .5) * U, (C + .5) * U); bx.rotate(a - (flip ? Math.PI - PICK_NAT : PICK_NAT)); if (flip) bx.scale(-1, 1);
  bx.drawImage(im, -(PICK_GRIP[0] + .5) * U, -(PICK_GRIP[1] + .5) * U, im.width * U, im.height * U);
  const B = bx.getImageData(0, 0, N * U, N * U).data, c = mk(N, N), x = c.getContext('2d'), o = x.createImageData(N, N), d = o.data;
  for (let y = 0; y < N; y++) for (let X0 = 0; X0 < N; X0++) { const i = ((y * U + (U >> 1)) * N * U + X0 * U + (U >> 1)) * 4, j = (y * N + X0) * 4; if (B[i + 3] > 127) { d[j] = B[i]; d[j + 1] = B[i + 1]; d[j + 2] = B[i + 2]; d[j + 3] = 255; } }
  x.putImageData(o, 0, 0); return MN.cache[key] = c;
}
/* THE SWING (25 Nov, his ask): PixelLab drew each pickaxe's swing, 9 frames of 48 x 48 (assets/mine/picks/<name>-swing.png), the hand at
   SWING_GRIP, the blow landing straight out to the right. The frames follow the swing's own timing, are turned (without blur, like pickRot) to
   aim at the rock, and mirrored when you face left. The white streak is see-through (his note), done in the pictures. */
const SWING_GRIP = [18, 30];
function crispTurn(src, sx, sy, sw, sh, gx, gy, ang, flip, N) {   // a part of a picture turned round (gx, gy) without blur; (gx, gy) lands in the middle of an N x N canvas
  const C = N >> 1, U = 8, big = mk(N * U, N * U), bx = big.getContext('2d'); bx.imageSmoothingEnabled = false;
  bx.translate((C + .5) * U, (C + .5) * U); bx.rotate(ang); if (flip) bx.scale(-1, 1);
  bx.drawImage(src, sx, sy, sw, sh, -(gx + .5) * U, -(gy + .5) * U, sw * U, sh * U);
  const B = bx.getImageData(0, 0, N * U, N * U).data, c = mk(N, N), x = c.getContext('2d'), o = x.createImageData(N, N), d = o.data;
  for (let y = 0; y < N; y++) for (let X0 = 0; X0 < N; X0++) { const i = ((y * U + (U >> 1)) * N * U + X0 * U + (U >> 1)) * 4, j = (y * N + X0) * 4; if (B[i + 3] > 40) { d[j] = B[i]; d[j + 1] = B[i + 1]; d[j + 2] = B[i + 2]; d[j + 3] = B[i + 3] > 200 ? 255 : B[i + 3]; } }
  x.putImageData(o, 0, 0); return c;
}
function swingFrame(tier, k, aim, flip) {
  const src = IMG['pick/' + PICK_ART[tier] + '-swing']; if (!src) return null;
  const f = k < .46 ? Math.min(2, Math.floor(k / .46 * 3)) : k < HIT_AT ? 3 : k < .74 ? (k < (HIT_AT + .74) / 2 ? 4 : 5) : Math.min(8, 6 + Math.floor((k - .74) / .26 * 3)),
    st = ((Math.round(aim / (Math.PI * 2) * 32) % 32) + 32) % 32, key = 'sw' + tier + '|' + f + '|' + st + '|' + (flip ? 1 : 0);
  if (MN.cache[key]) return MN.cache[key];
  const a = st / 32 * Math.PI * 2; return MN.cache[key] = crispTurn(src, f * 48, 0, 48, 48, SWING_GRIP[0], SWING_GRIP[1], flip ? -a : a, flip, 65);
}
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
function pickIcon(tier) { const k = 'pi' + tier; if (MN.cache[k]) return MN.cache[k]; const A = IMG['pick/' + PICK_ART[tier]]; if (A) { const c = mk(48, 48), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(A, 0, 0, 48, 48); return MN.cache[k] = c.toDataURL(); } const s = pickSprite(tier, 56), c = mk(64, 64), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 15, 3, 21, 21, 0, 0, 63, 63); return MN.cache[k] = c.toDataURL(); }
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
  const face = Math.abs(ty - (m.y - 6)) > Math.abs(tx - m.x) ? (ty < m.y - 6 ? 'back' : 'front') : (side > 0 ? 'right' : 'left');   // which way the body faces for its own swing (up, down or sideways)
  return {a, lift, ox, oy, hx: hx + ox, hy: hy0 + oy - lift, side, k, aim: a1, face};
}

/* ---------- every frame ---------- */
MNH.frame = (m, people, dt, t, H, img) => {
  const M = MN; if (M.dirty) { mineBake(); hallGrid(MNH); }
  const d = DIG.on, sw = d ? swingPose(m, d) : null, sh = M.shake > 0 ? M.shake * 14 : 0, shx = sh ? Math.round(Math.sin(t * .09) * sh) : 0, shy = sh ? Math.round(Math.cos(t * .11) * sh * .6) : 0;
  const tp = $('#townHud #hallBar'), br = tp && tp.getBoundingClientRect(), cr = cv.getBoundingClientRect();
  view(M.bg, m.x + shx, m.y - 8 + shy, 190, {hi: true, void: '#07060f', loose: br && br.height ? clamp((br.top - cr.top + 6) / cr.height, .6, 1) : .85});
  /* (25 Nov, his ask) an outfit with its own swing (mine<tier>_right_<n>, PixelLab) swings the pickaxe itself: no separate pickaxe drawn over it */
  const swingStep = k => k < .46 ? (k < .23 ? 1 : 2) : k < HIT_AT ? 3 : k < .74 ? (k < (HIT_AT + .74) / 2 ? 4 : 5) : Math.min(8, 6 + Math.floor((k - .74) / .26 * 3));
  let own = false;
  const mine = people.filter(p => p.e === m).map(p => { if (!sw) return p; const S0 = SP[p.name], has = d => S0 && S0.poses && S0.poses[`mine${GOLD.pick}_${d}_0`], sd = has(sw.face) ? sw.face : sw.side > 0 ? 'right' : 'left';
    if (has(sd)) { own = true; return {...p, dir: sd, pose: 'mine', tier: GOLD.pick, step: swingStep(sw.k), walk: false}; }
    return {...p, x: p.x + sw.ox, y: p.y + sw.oy, lift: (p.lift || 0) + sw.lift, walk: false}; });   // every level is your own cave: only you are in it
  const objs = M.wobj.map(o => { const dm = o.i != null && M.wdmg.get(o.i); return dm && dm.shake > 0 ? {...o, x: o.x + Math.round(Math.sin(dm.shake * 70) * 1.2)} : o; });
  for (const r of M.rocks) { const im = rockSprite(rockRow(r), r.a, r.flash > 0); if (!im) continue; const cx = r.gx * CS + 8, cy = r.gy * CS + 11, sx = r.shake > 0 ? Math.round(Math.sin(r.shake * 70) * 1.4) : 0, up = r.born > 0 ? Math.round(r.born * 12) : 0;
    objs.push({img: im, x: cx - im.width / 2 + sx, y: cy - im.gy + up, base: r.gy * CS + 13, after: isCry(r.k) ? () => gemTwinkle(cx, cy, t, r) : null}); }
  crackObjs(objs, t); if (M.den) denObjs(objs, t); mineHazObjs(objs, t); liftObjs(objs, dt);
  const hits = drawScene((LIFT.ride || (M.inv > 0 && Math.floor(t / 80) % 2) ? [] : mine).concat(M.den ? denPeople(m, t) : []), null, M.bg, objs); if (M.den || PIP.talk) pipBubble(hits);   // just hurt: you blink
  const sf = sw && !own && swingFrame(GOLD.pick, sw.k, sw.aim, sw.side < 0); if (own) {} else if (sf) lx.drawImage(sf, X(sw.hx) - 32, Y(sw.hy) - 32);
  else if (sw) { const st = ((Math.round(sw.a / (Math.PI * 2) * 64) % 64) + 64) % 64, im = pickRot(GOLD.pick, st, sw.side < 0) || pickSprite(GOLD.pick, st); lx.drawImage(im, X(sw.hx) - 20, Y(sw.hy) - 20);
    if (sw.k > .5 && sw.k < HIT_AT + .04) { lx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 1; i <= 3; i++) { const a = sw.a - sw.side * i * .22; lx.fillRect(X(sw.hx + Math.cos(a) * 14), Y(sw.hy + Math.sin(a) * 14), 1, 1); } } }   // a streak behind the head on the way down
  mineFx(dt, m); wlFx(dt, m.loc); drawPuffs(dt); mineAmb(dt, t, m);
  const LK = mLook(), L = [[m.x, m.y - 14, 52, LK.me, .13, 1]];   // the light changes colour with the depth
  for (const i of M.lamps) if (M.cell[i]) L.push([(i % MGW) * CS + 8, ((i / MGW) | 0) * CS + 4, 38, LK.lt, .24, i]);
  for (const r of M.rocks) if (isCry(r.k)) L.push([r.gx * CS + 8, r.gy * CS + 2, 26, CRY_GLOW[r.k], .3, r.gx * 31 + r.gy]);
  mineGlow(L, t); lights(L, t); mineDark(); liftOver(t);
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

/* ================= DEEPER AND DARKER (25 Nov 2026, his ask): "multiple levels available per pickaxe tier ... as it gets closer to the
   lower levels things start to get a bit freaky, scary and dangerous ... lava, spike rocks ... risk to the lower levels, but it gives
   greater reward ... mysterious colours and wall textures as it gets deeper. lights can turn blue, purple, red" =================
   12 LEVELS, two to a pickaxe (mNeed). Every pair has its own stone, wall texture and light (tools/make_mine.py, MLOOK).
   DANGER (HZ = the level each thing starts on), all of it on this phone only, laid out when a level is dug (mineHaz):
     - spike rocks: stand in the floor, hurt when you walk into them
     - pop spikes: come up out of holes on a beat: holes, then the tips show (the warning), then up
     - lava: glowing pools, hurt when you step in
     - falling rock: a shadow grows on the floor near you, then a stalactite lands on it
   Nothing dangerous is ever within 2 cells of a ladder or the way in, and spike rocks and lava never cut any floor off (ok() in mineHaz).
   A tapped walk goes round them (mineGridHaz); the joystick can walk into them.
   3 HEARTS (MR.hearts), full again every time you walk in. A hit: a heart, a knock back, a red flash, a blink while nothing can hurt you.
   None left: you pass out, wake up outside the mine, and the server takes a fifth of the gold chunks you carry (op mfall: it decides how
   much; never crystals, never coins). No words about any of it on the screen (his rule): the hearts sit beside the LEVEL line. */
const MLOOK = [   // one per pair of levels: the lamps' light, your own light, the lamp's flame
  {lt: '255,190,110', me: '255,206,140', fl: ['#ffd25e', '#fff6cf', '#e8b13a']},   // 1-2 warm
  {lt: '236,214,170', me: '236,220,190', fl: ['#f4e0a0', '#fffdf0', '#c8a860']},   // 3-4 pale
  {lt: '96,170,255', me: '170,205,255', fl: ['#6ec0ff', '#e6f6ff', '#3a86e0']},    // 5-6 blue
  {lt: '186,110,255', me: '205,170,255', fl: ['#c88cff', '#f4e4ff', '#8a4ee0']},   // 7-8 purple
  {lt: '255,92,52', me: '255,170,140', fl: ['#ff7a3c', '#ffe0a8', '#d83a20']},     // 9-10 red
  {lt: '255,40,48', me: '255,140,130', fl: ['#ff4040', '#ffc0b0', '#b01828']}];    // 11-12 blood red
const mLook = () => MLOOK[(mArt() - 1) >> 1];
function lampSprite() { const th = (mArt() - 1) >> 1, key = 'lamp' + th; if (MN.cache[key]) return MN.cache[key]; const f = MLOOK[th].fl;
  return MN.cache[key] = pxIcon(['..KKK..', '.KwwwK.', '.KKKKK.', 'KYWWYYK', 'KYWWYYK', 'KYYYYgK', '.KKKKK.', '..KKK..'], {K: '#1a1430', w: '#8a5a2b', Y: f[0], W: f[1], g: f[2]}); }
const mixHex = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const hazAt = (x, y) => x >= 0 && y >= 0 && x < MGW && y < MGH ? MN.haz.get(mci(x, y)) : undefined;
const hazStop = (x, y) => { const h = hazAt(x, y); return !!h && !h.ok && (h.k !== 'pop' || h.block); };   // ok = a stepping stone in the lava, or the ledge they lead to (keystones.js): never in the way
const lavaAt = (x, y) => { const h = hazAt(x, y); return !!h && h.k === 'lava'; };

/* where the danger goes: called at the end of mineGeo, before any rock is put down (rocks never sit on it: mineFill) */
function mineHaz() {
  const M = MN, lv = M.lv, [ex, ey] = M.entry, R = n => Math.floor(Math.random() * n);
  M.haz = new Map(); M.hzc = {}; M.falls = []; M.emb = []; M.pools = []; M.fallT = 4 + Math.random() * 3; M.rumT = 12 + Math.random() * 16; M.seed = R(1e6); M.safe = null;
  if (lv < HZ.spike || M.den) return;
  if (typeof emberLay === 'function') emberLay();   // level 11, once Pip is mended: the pool with the hidden stones goes in first, so the rest is laid out round it (keystones.js)
  const far = (x, y) => Math.max(Math.abs(x - ex), Math.abs(y - ey)) > 2 && !nearCrack(x, y, 2) && !nearLift(x, y) && !(M.shaft && Math.max(Math.abs(x - M.shaft[0]), Math.abs(y - M.shaft[1])) <= 2);
  const open = (x, y) => inCave(x, y) && !M.cell[mci(x, y)] && !M.haz.has(mci(x, y)) && far(x, y);
  const cells = []; for (let y = 3; y <= MGH - 3; y++) for (let x = 2; x <= MGW - 3; x++) if (open(x, y)) cells.push([x, y]);
  cells.sort(() => Math.random() - .5);
  const ok = () => { const d = mineFlood(ex, ey, hazStop); for (let i = 0; i < MGW * MGH; i++) if (!M.cell[i] && d[i] < 0 && !hazStop(i % MGW, (i / MGW) | 0)) return false; return true; };   // every bit of floor can still be walked to
  const put = (x, y, h) => { if (!open(x, y)) return false; const i = mci(x, y); M.haz.set(i, h); if (ok()) return true; M.haz.delete(i); return false; };
  if (lv >= HZ.lava) { const pools = lv >= 12 ? 4 : lv >= 11 ? 3 : 2, size = lv >= 11 ? 5 : lv >= 10 ? 4 : 3;
    for (let p = 0, tries = 0; p < pools && tries < 40 && cells.length; tries++) { const [sx, sy] = cells.pop(); if (!put(sx, sy, {k: 'lava'})) continue; const cur = [[sx, sy]];
      for (let n = 1, g = 0, want = size - R(2); n < want && g < 24; g++) { const [cx, cy] = cur[R(cur.length)], [a, b] = [[1, 0], [-1, 0], [0, 1], [0, -1]][R(4)]; if (put(cx + a, cy + b, {k: 'lava'})) { cur.push([cx + a, cy + b]); n++; } }
      M.pools.push([cur.reduce((s, c) => s + c[0], 0) / cur.length * CS + 8, cur.reduce((s, c) => s + c[1], 0) / cur.length * CS + 8, cur.length]); p++; } }
  for (let n = Math.min(10, lv - 1), tries = 0; n > 0 && tries < 60 && cells.length; tries++) { const [x, y] = cells.pop(); if (put(x, y, {k: 'sp', v: R(3)})) n--; }
  if (lv >= HZ.pop) { for (let n = Math.min(8, lv - 3), tries = 0; n > 0 && tries < 60 && cells.length; tries++) { const [x, y] = cells.pop(); if (!open(x, y)) continue; const ph = Math.random(); M.haz.set(mci(x, y), {k: 'pop', ph, block: false}); n--;
      const [a, b] = [[1, 0], [0, 1]][R(2)]; if (n > 0 && open(x + a, y + b)) { M.haz.set(mci(x + a, y + b), {k: 'pop', ph, block: false}); n--; } }   // two side by side on the same beat: a little gate
    for (const h of M.haz.values()) if (h.k === 'pop') { h.block = true; if (!ok()) h.block = false; } }   // block = a tapped walk can go round it; the ones in a narrow way cannot be gone round, you time them
}
/* a tapped walk never crosses spike rocks or lava (and goes round the pop spikes it can): the path grid only, the joystick is free */
function mineGridHaz() {
  const M = MN; if (!M.haz.size || !IMG['hallw/mine']) return; hallGrid(MNH); const G = MNH.g, gw = MNH.gw, n = CS / MNH.gs;
  for (const [i, h] of M.haz) { if (h.k === 'pop' && !h.block) continue; const gx = (i % MGW) * n, gy = ((i / MGW) | 0) * n; for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) G[(gy + b) * gw + gx + a] = 0; }
}
const popState = (h, t) => { const P = Math.max(2.2, 3.4 - MN.lv * .1), u = ((t / 1000 / P + h.ph) % 1); return u < .5 ? 0 : u < .68 ? 1 : 2; };   // 0 holes, 1 the tips show, 2 up

/* ---------- the dangerous things, drawn in code (straight on, like everything else) ---------- */
function spikeArt(c, list, cols, tip) { const x = c.getContext('2d'), H = c.height - 1;
  for (const [cx, h, w] of list) { for (let r = 0; r < h; r++) { const hw = Math.max(0, Math.round((r + 1) / h * w) - 1), y = H - h + r; x.fillStyle = cols[1]; x.fillRect(cx - hw, y, hw * 2 + 1, 1); if (hw > 0) { x.fillStyle = cols[2]; x.fillRect(cx - hw, y, hw, 1); x.fillStyle = cols[0]; x.fillRect(cx + hw, y, 1, 1); } }
    x.fillStyle = tip; x.fillRect(cx, H - h, 1, Math.min(2, h)); } }
function spikeCols() { const P = MINE_COL[MN.lv - 1]; return [mixHex(P[1], '#b8b0c8', .2), mixHex(P[2], '#d8d0e0', .3), mixHex(P[2], '#f0ecf8', .62)]; }   // the level's own stone, paler so it reads on the dark floor
function spikeSprite(v) {
  const key = 'sp' + MN.lv + '|' + v; if (MN.cache[key]) return MN.cache[key]; const c = mk(18, 14);
  spikeArt(c, [[[4, 7, 3], [13, 6, 3], [9, 11, 4]], [[13, 8, 3], [4, 6, 3], [8, 10, 4]], [[4, 8, 3], [14, 5, 2], [10, 11, 4]]][v], spikeCols(), '#ffffff'); navyEdge(c); return MN.cache[key] = c;
}
function popSprite(st) {
  const key = 'pop' + st; if (MN.cache[key]) return MN.cache[key]; const c = mk(18, 14), x = c.getContext('2d'), s = mk(18, 14);
  if (st) { spikeArt(s, [4, 9, 14].map(cx => [cx, st === 1 ? 3 : 10, 2]), ['#6a7088', '#a8b0c4', '#e6eaf2'], '#ffffff'); if (st === 2) navyEdge(s); }
  for (const cx of [4, 9, 14]) { x.fillStyle = '#1a1430'; x.fillRect(cx - 2, 10, 5, 4); x.fillStyle = '#8a8ca4'; x.fillRect(cx - 1, 11, 3, 1); x.fillStyle = '#07060f'; x.fillRect(cx - 1, 12, 3, 2); }   // the holes they live in
  x.drawImage(s, 0, 0); return MN.cache[key] = c;
}
function stalSprite() {
  const key = 'stal' + MN.lv; if (MN.cache[key]) return MN.cache[key]; const u = mk(11, 16); spikeArt(u, [[5, 13, 3]], spikeCols(), '#ffffff'); navyEdge(u);
  const c = mk(11, 16), x = c.getContext('2d'); x.translate(0, 16); x.scale(1, -1); x.drawImage(u, 0, 0); return MN.cache[key] = c;   // the same spike, point down
}
function lavaTile(gx, gy, fr) {   // one cell of a pool, 4 frames; the pattern runs across the cells, a dark crust where the pool ends
  const key = gx + '|' + gy + '|' + fr, C = MN.hzc; if (C[key]) return C[key];
  const c = mk(CS, CS), x = c.getContext('2d'), n = lavaAt(gx, gy - 1), s = lavaAt(gx, gy + 1), w = lavaAt(gx - 1, gy), e = lavaAt(gx + 1, gy), ph = fr / 4 * 6.283;
  for (let py = 0; py < CS; py++) for (let px = 0; px < CS; px++) { const dx = Math.min(w ? 9 : px, e ? 9 : 15 - px), dy = Math.min(n ? 9 : py, s ? 9 : 15 - py), d = Math.min(dx, dy); if (dx + dy < 2) continue;
    const X0 = gx * CS + px, Y0 = gy * CS + py, v = Math.sin(X0 * .55 + ph) + Math.sin(Y0 * .7 - ph) + Math.sin((X0 + Y0) * .33 + ph * 2);
    x.fillStyle = d === 0 ? '#2a0a12' : d === 1 ? '#a8241a' : v > 1.5 ? '#fff0a0' : v > .7 ? '#ffc23c' : v < -1.4 ? '#b8321a' : v < -.7 ? '#e85a1c' : '#ff8a22'; x.fillRect(px, py, 1, 1); }
  return C[key] = c;
}
function fallShadow(f) {   // the warning: a shadow that grows where the rock will land, a pale rim so it shows on the black floors too, grit trickling down onto it
  const k = clamp(f.t / f.l, 0, 1), hw = Math.round(2 + k * 5), cx = X(f.x), cy = Y(f.y);
  for (let dy = -2; dy <= 2; dy++) { const w = Math.round(hw * Math.sqrt(1 - (dy / 2.7) ** 2)); lx.fillStyle = `rgba(4,3,10,${(.4 + k * .4).toFixed(2)})`; lx.fillRect(cx - w, cy + dy, w * 2, 1);
    lx.fillStyle = `rgba(255,236,214,${(.18 + k * .3).toFixed(2)})`; if (Math.abs(dy) === 2) lx.fillRect(cx - w, cy + dy, w * 2, 1); else { lx.fillRect(cx - w - 1, cy + dy, 1, 1); lx.fillRect(cx + w, cy + dy, 1, 1); } }
  lx.fillStyle = '#d8d0c8'; for (let i = 0; i < 3; i++) { const q = (f.t * 2.2 + i * .37) % 1; lx.fillRect(cx - 3 + i * 3, cy - Math.round((1 - q) * 34), 1, 1); } }
function mineHazObjs(objs, t) {
  const M = MN; if (!M.haz.size && !M.falls.length) return; const fr = Math.floor(t / 240) % 4;
  for (const [i, h] of M.haz) { const gx = i % MGW, gy = (i / MGW) | 0;
    if (h.k === 'lava') objs.push({img: lavaTile(gx, gy, fr), x: gx * CS, y: gy * CS, base: 0});
    else if (h.k === 'ledge') continue;
    else if (h.k === 'sp') objs.push({img: spikeSprite(h.v), x: gx * CS - 1, y: gy * CS, base: gy * CS + 12});
    else { const st = popState(h, t); objs.push({img: popSprite(st), x: gx * CS - 1, y: gy * CS, base: st === 2 ? gy * CS + 12 : 0}); } }
  for (const f of M.falls) objs.push({img: PX1, x: f.x, y: f.y, base: .5, after: () => fallShadow(f)});
}

/* ---------- getting hurt ---------- */
const HEART_ROWS = ['.KK.KK.', 'KRRKRRK', 'KRWRRRK', 'KRRRRRK', '.KRRRK.', '..KRK..', '...K...'];
const HEART = [pxIcon(HEART_ROWS, {K: '#1a1430', R: '#ff4a5a', W: '#ffd0d6'}), pxIcon(HEART_ROWS, {K: '#1a1430', R: '#3a2a4a', W: '#3a2a4a'})];
function mineHearts() { const el = $('#mineHp'); if (!el || el.dataset.n === String(MN.hp)) return; el.dataset.n = String(MN.hp); let s = ''; for (let i = 0; i < MR.hearts; i++) s += iconImg(HEART[i < MN.hp ? 0 : 1], 2); el.innerHTML = s; }
function mineHeal() { MN.hp = MR.hearts; MN.inv = 0; MN.flash = 0; MN.out = false; }
function mineHurt(hx, hy, kind) {
  const M = MN, m = WL.me; if (M.inv > 0 || M.out || !m) return;
  M.hp = Math.max(0, M.hp - 1); M.inv = HZ.inv; M.flash = .3; M.shake = .25; sfx(kind === 'lava' ? 'mburn' : 'mhurt'); DIG.on = null; PICK.held = false; m.path = []; m.todo = null; m.walk = false;
  let dx, dy; if (kind !== 'fall' && M.safe) { dx = M.safe[0] - m.x; dy = M.safe[1] - m.y; } else { dx = m.x - hx; dy = m.y - 3 - hy; }   // back the way you came; a falling rock throws you off it
  let L = Math.hypot(dx, dy); if (L < .5) { dx = 0; dy = 1; L = 1; } const far = kind === 'fall' ? 12 : clamp(L + 3, 8, 22);
  m.nudge = {t: 0, vx: dx / L * far * 10, vy: dy / L * far * 10};   // wlStep slides you (never through a wall)
  mineHearts(); if (M.hp <= 0) minePassOut();
}
function minePassOut() {   // out cold: the server takes its fifth, you wake up outside
  const M = MN; M.out = true; M.busy = true; sfx('mfall'); $('#xfade').classList.add('on');
  // not through mop(): an old server without this op must not switch the whole mine over to this phone's own rules
  const ask = Promise.resolve().then(() => (typeof LABLOCAL !== 'undefined' && LABLOCAL) || GOLD.local ? mineLocal('mfall') : srv('mfall')).catch(() => null);
  setTimeout(() => { M.busy = false; WL.fading = false; wlDoor(SOUTH);
    ask.then(r => setTimeout(() => { const m = WL.me; if (r && r.lost > 0 && m && m.loc === SOUTH) headSay(m, `${goldImg(2)} <b>-${r.lost}</b>`, {t: 3, cls: 'res'}); }, 700)); }, 520);
}
function mineDanger(dt, t) {
  const M = MN, m = WL.me; if (!m || m.loc !== MINE) return;
  if (M.inv > 0) M.inv -= dt; if (M.flash > 0) M.flash -= dt;
  if (M.busy || M.out || WL.fading) return;
  const fx = m.x, fy = m.y - 3, gx = Math.floor(fx / CS), gy = Math.floor(fy / CS), h = hazAt(gx, gy);
  if (!h || h.ok) M.safe = [m.x, m.y];   // a stepping stone is as safe as the floor: a burn throws you back onto the last one
  else { const cx = gx * CS + 8, cy = gy * CS + 8, px = fx - gx * CS, py = fy - gy * CS; let hit;
    if (h.k === 'lava') hit = (px >= 3 || lavaAt(gx - 1, gy)) && (px <= 12 || lavaAt(gx + 1, gy)) && (py >= 3 || lavaAt(gx, gy - 1)) && (py <= 12 || lavaAt(gx, gy + 1));
    else hit = (h.k === 'sp' || popState(h, t) === 2) && Math.abs(fx - cx) < 6 && Math.abs(fy - cy) < 5;
    if (hit) mineHurt(cx, cy, h.k); }
  for (const [i, q] of M.haz) if (q.k === 'pop') { const st = popState(q, t); if (st === 2 && q.ls !== 2 && Math.hypot((i % MGW) * CS + 8 - fx, ((i / MGW) | 0) * CS + 8 - fy) < 56) sfx('mspike'); q.ls = st; }
  if (M.lv >= HZ.fall && !M.den) { M.fallT -= dt;
    if (M.fallT <= 0) { M.fallT = Math.max(2.5, 9 - (M.lv - HZ.fall) * 1.5) * (.7 + Math.random() * .6);
      const a = Math.random() * 6.283, r = Math.random() * 26, x = Math.round(fx + Math.cos(a) * r), y = Math.round(fy + Math.sin(a) * r * .8), cx = Math.floor(x / CS), cy = Math.floor(y / CS);
      if (inCave(cx, cy) && isFloor(cx, cy) && !rockAt(cx, cy) && !nearLadder(cx, cy) && !nearLadder(gx, gy) && !(h && h.ok) && !document.querySelector('.modal.on')) { M.falls.push({x, y, t: 0, l: 1.15}); sfx('mcrack'); } } }
  for (let i = M.falls.length - 1; i >= 0; i--) { const f = M.falls[i]; f.t += dt; if (f.t < f.l) continue; M.falls.splice(i, 1); mineChips(f.x, f.y - 4, 's', 9); M.shake = .2; sfx('mbreak'); if (Math.hypot(m.x - f.x, (m.y - 3 - f.y) * 1.3) < 7.5) mineHurt(f.x, f.y, 'fall'); }
  if (M.lv >= 7 && !M.den) { M.rumT -= dt; if (M.rumT <= 0) { M.rumT = 18 + Math.random() * 22; sfx('mrumble'); M.shake = Math.max(M.shake, .3); } }   // the deep groans now and then
}
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { mineDanger(dt, t); return fr.call(this, dt, t); }; }

/* ---------- THE MOOD: things lying about (baked into the ground picture), eyes in the dark, drips, embers ---------- */
const SKULL = pxIcon(['.KKKKK.', 'KWWWWWK', 'KWKWKWK', 'KWWWWWK', '.KwKwK.', '..KKK..'], {K: '#1a1430', W: '#e6e0d0', w: '#b8b0a0'});
const BONE = pxIcon(['.K....K.', 'KWKKKKWK', 'KWWWWWwK', 'KWKKKKWK', '.K....K.'], {K: '#1a1430', W: '#e6e0d0', w: '#b8b0a0'});
function webSprite(flip) { const key = 'web' + flip; if (MN.cache[key]) return MN.cache[key]; const c = mk(9, 9), x = c.getContext('2d'); x.fillStyle = 'rgba(214,220,238,.5)';
  const ln = (a, b, c2, d) => { const n = Math.max(Math.abs(c2 - a), Math.abs(d - b)) || 1; for (let i = 0; i <= n; i++) x.fillRect(Math.round(a + (c2 - a) * i / n), Math.round(b + (d - b) * i / n), 1, 1); };
  if (flip) { x.translate(9, 0); x.scale(-1, 1); }
  ln(0, 0, 8, 0); ln(0, 0, 0, 8); ln(0, 0, 5, 5); for (const r of [3, 6]) { const d = Math.round(r * .62); ln(r, 0, d, d); ln(d, d, 0, r); } return MN.cache[key] = c; }
function shroomSprite(th) { const key = 'shroom' + th; if (MN.cache[key]) return MN.cache[key];
  return MN.cache[key] = pxIcon(['.CCC....', 'CWCCC...', '..S..CC.', '..S.CWCC', '......S.'], th === 2 ? {C: '#3ed8c4', W: '#d8fff6', S: '#cfe8e4'} : {C: '#c060f0', W: '#f6dcff', S: '#e0d0e8'}); }
function mineDeco(x) {   // called by mineBake with the ground picture; the same cells get the same things every time (M.seed)
  const M = MN, lv = M.lv, th = (lv - 1) >> 1; M.shrooms = []; M.eyes = []; M.drips = []; if (M.den) { denDeco(x); return; }
  for (let gy = 3; gy <= MGH - 3; gy++) for (let gx = 2; gx <= MGW - 3; gx++) { const i = mci(gx, gy); if (M.cell[i] || M.haz.has(i) || nearLadder(gx, gy)) continue;
    const h = hash(i * 31 + M.seed), r = h % 1000, X0 = gx * CS, Y0 = gy * CS, wN = !isFloor(gx, gy - 1), wW = !isFloor(gx - 1, gy), wE = !isFloor(gx + 1, gy);
    if (lv >= 3 && wN && (wW || wE) && r < 150 + lv * 25) x.drawImage(webSprite(wW ? 0 : 1), wW ? X0 + 5 : X0 + 2, Y0 + 1);   // a cobweb in the corner
    else if ((th === 2 || th === 3) && wN && r >= 500 && r < 580) { x.drawImage(shroomSprite(th), X0 + 3 + (h >> 10) % 4, Y0 + 3); if (M.shrooms.length < 3) M.shrooms.push([X0 + 7 + (h >> 10) % 4, Y0 + 5]); }   // glowing mushrooms at the foot of a wall
    else if (lv >= 6 && r >= 1000 - (lv - 5) * 9) { const im = (h >> 12) % 3 ? BONE : SKULL; x.drawImage(im, X0 + 3 + (h >> 14) % 4, Y0 + 5 + (h >> 16) % 4); } }
  if (lv >= 6) { const c = []; for (let gy = 3; gy <= MGH - 2; gy++) for (let gx = 1; gx <= MGW - 2; gx++) if (M.dist[mci(gx, gy)] >= 3) c.push(mci(gx, gy));   // eyes: only where the rock is deep and dark
    c.sort((a, b) => hash(a * 17 + M.seed) - hash(b * 17 + M.seed));
    for (const i of c.slice(0, lv >= 12 ? 6 : lv >= 10 ? 4 : lv >= 8 ? 3 : 2)) { const s = hash(i * 5 + M.seed); M.eyes.push({x: (i % MGW) * CS + 4 + s % 6, y: ((i / MGW) | 0) * CS - 10 - (s >> 4) % 7, s}); } }
  if (th === 2 || th === 3) { const c = []; for (let gy = 3; gy <= MGH - 4; gy++) for (let gx = 2; gx <= MGW - 3; gx++) if (M.cell[mci(gx, gy)] && isFloor(gx, gy + 1) && !isFloor(gx, gy - 1)) c.push(mci(gx, gy));
    c.sort((a, b) => hash(a * 23 + M.seed) - hash(b * 23 + M.seed)); for (const i of c.slice(0, 3)) M.drips.push({x: (i % MGW) * CS + 3 + hash(i) % 10, y: ((i / MGW) | 0) * CS + 4, s: hash(i * 3 + M.seed)}); }
}
function mineAmb(dt, t, m) {   // drawn over the cave, every frame: a handful of single pixels
  const M = MN, lv = mArt(), s = t / 1000;
  for (const e of M.eyes) { const cyc = 6 + e.s % 5, p = (s + e.s % 97) % cyc; if (p > 2.8 || (p > 1.3 && p < 1.42) || Math.hypot(m.x - e.x, m.y - 10 - e.y) < 44) continue;   // they open, blink once, close; and shut when you come near
    const small = e.s % 3 === 0; lx.fillStyle = p < .12 || p > 2.68 ? (lv >= 9 ? '#7a1c1c' : '#6a6048') : lv >= 9 ? '#ff4a3a' : lv >= 7 ? '#ecd6ff' : '#ffe9a0';
    lx.fillRect(X(e.x), Y(e.y), small ? 1 : 2, 1); lx.fillRect(X(e.x) + (small ? 2 : 4), Y(e.y), small ? 1 : 2, 1); }
  for (const d of M.drips) { const p = (s + d.s % 53) % (3.1 + d.s % 3); lx.fillStyle = lv >= 7 ? '#d2b0ff' : '#9fd4ff';
    if (p < .5) lx.fillRect(X(d.x), Y(d.y + p * p * 4 * 22), 1, 2); else if (p < .7) { const q = Math.round((p - .5) * 20); lx.fillRect(X(d.x - q), Y(d.y + 22), 1, 1); lx.fillRect(X(d.x + q), Y(d.y + 22), 1, 1); } }
  if (M.pools.length) { if (M.emb.length < 14 && Math.random() < dt * 1.6 * M.pools.length) { const P = M.pools[Math.floor(Math.random() * M.pools.length)]; M.emb.push({x: P[0] + (Math.random() - .5) * 22, y: P[1] + (Math.random() - .5) * 10, t: 0, l: .8 + Math.random() * .7, w: Math.random() * 6}); }
    for (let i = M.emb.length - 1; i >= 0; i--) { const e = M.emb[i]; e.t += dt; if (e.t > e.l) { M.emb.splice(i, 1); continue; } const k = e.t / e.l; lx.fillStyle = k < .4 ? '#fff0a0' : k < .75 ? '#ffb24a' : '#c8361a'; lx.fillRect(X(e.x + Math.sin(e.t * 5 + e.w) * 2), Y(e.y - e.t * 16), 1, 1); } }   // embers off the lava
  for (const f of M.falls) if (f.t > f.l - .2) { const q = (f.t - (f.l - .2)) / .2, im = stalSprite(); lx.drawImage(im, X(f.x) - 5, Y(f.y - (1 - q) * 120) - 14); }   // the rock itself, the last moment
}
function mineGlow(L, t) {   // the lava and the mushrooms light the cave
  const M = MN; for (const [x, y, n] of M.pools) L.push([x, y, 26 + n * 4, '255,104,36', .3, x + y]);
  if (M.den) denGlow(L); if (M.lift) L.push([M.lift[0] * CS + 23, M.lift[1] * CS - 17, 30, mLook().lt, .22, 91]); const C = M.crack; if (C && M.cell[C.i]) L.push([C.gx * CS + 8, C.gy * CS + 8, C.open ? 22 : 14, '110,190,255', C.open ? .26 : .2, 80]);   // the crack's cold light
  const c = mArt() >= 7 ? '200,110,255' : '70,230,205'; for (const [x, y] of M.shrooms) L.push([x, y, 14, c, .26, x * 3 + y]);
}
function mineDark() { const M = MN; vignette(M.den ? .44 : Math.min(.74, .3 + .038 * M.lv)); if (M.flash > 0) { lx.fillStyle = `rgba(255,36,36,${Math.min(.34, M.flash * 1.2).toFixed(2)})`; lx.fillRect(0, 0, cam.lw, cam.lh); } }
SFX.mhurt = () => { tone(220, .12, {type: 'square', vol: .1, to: 90}); tone(140, .18, {type: 'triangle', vol: .14, to: 60, at: .02}); hiss(.08, {vol: .08, bp: 1800}); };
SFX.mburn = () => { hiss(.35, {vol: .12, hp: 3000}); tone(200, .14, {type: 'square', vol: .09, to: 80}); };
SFX.mfall = () => { tone(300, .5, {type: 'triangle', vol: .14, to: 50}); tone(150, .6, {type: 'sine', vol: .1, to: 40, at: .1}); };
SFX.mcrack = () => { tone(900, .03, {type: 'square', vol: .04, to: 500}); hiss(.12, {vol: .05, bp: 2200, at: .02}); };
SFX.mrumble = () => { hiss(1.1, {vol: .13, lp: 160}); tone(48, .9, {type: 'sine', vol: .12, to: 36}); };
SFX.mspike = () => { tone(2600, .03, {type: 'square', vol: .03, to: 1800}); };

/* ================= THE GLIMMERKIN (25 Nov 2026, his secret hunt), BATCH 1: finding Pip =================
   On level 12 one wall always has a thin blue CRACK. Any pickaxe breaks it open (MR.crackHits swings); the server remembers (op qcrack),
   so it is an open hole on every later visit. Through it: THE DEN (MN.den), a fixed map on the same grid as a level (DEN_SPANS), drawn in
   the cold teal stone: a quiet tunnel (no danger of any kind, nothing to dig), an iron cage with two bars bent apart, and Pip's round room.
   PIP (assets/final/pip/front|right|back|left.png, like the mechanic) talks in a speech bubble over his head, a line at a time: tap, or
   press the pickaxe button, for the next one. After his first talk the server hands over the MOON SNIPS (op qpip).
   QUEST.s = the step, kept by the server on the wallet (w.q.s, functions/quest.js has the table). Nothing on the screen tracks it (his rule). */
const QUEST = {s: 0};
const questKeys = q => { for (const k of ['moon', 'fang', 'hc', 'hearth', 'ember']) QUEST[k] = q && q[k] ? 1 : 0; };   // batch 3: the Keystones you hold (hc = the Hearth stone, still cracked), beside the step
{ const _wa = walletApply; walletApply = function (w) { _wa(w); if (!GOLD.local) { QUEST.s = (w && w.q && w.q.s) | 0; questKeys(w && w.q); } labPlaque(); }; }
function labPlaque() { if (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.q && LABM.q.s >= 7) { WALLET.dec = WALLET.dec || {}; if (!WALLET.dec.keystoneplaque) WALLET.dec.keystoneplaque = 1; } }   // the lab only: the plaque the lab's own King gave is kept with the lab's hunt
questKeys(null); if (typeof LABLOCAL !== 'undefined' && LABLOCAL && LABM.q) { QUEST.s = LABM.q.s | 0; questKeys(LABM.q); labPlaque(); }
// not through mop(): an old server without these ops must not switch the whole mine over to this phone's own rules
const qop = (op, d) => Promise.resolve().then(() => (typeof LABLOCAL !== 'undefined' && LABLOCAL) || GOLD.local ? mineLocal(op, d) : srv(op, d)).then(r => { if (r && r.s != null) QUEST.s = Math.max(QUEST.s, r.s | 0); if (r && r.k) questKeys(r.k); return r; });
const mArt = () => MN.den ? 6 : MN.lv;   // the stone a place is drawn in: the den is cold teal, not level 12's black rock

/* ---------- the crack, on level 12 ---------- */
const crackAt = i => !!MN.crack && MN.crack.i === i, crackShut = i => crackAt(i) && !MN.crack.open;
function crackPick() {   // called by mineGeo before the danger is laid out: a tall wall face you can walk up to, away from the ladder
  const M = MN, [ex, ey] = M.entry, W = (x, y) => x < 0 || y < 0 || x >= MGW || y >= MGH || !!M.cell[mci(x, y)], c = [], d = [];
  for (let y = 4; y <= MGH - 4; y++) for (let x = 3; x <= MGW - 4; x++) { if (!M.cell[mci(x, y)] || M.keep.has(mci(x, y)) || !isFloor(x, y + 1) || !W(x, y - 1) || !W(x, y - 2)) continue;
    if (Math.max(Math.abs(x - ex), Math.abs(y + 1 - ey)) <= 3) continue; (W(x - 1, y) && W(x + 1, y) ? c : d).push([x, y]); }
  const L = c.length ? c : d; if (!L.length) return; const [gx, gy] = L[Math.floor(Math.random() * L.length)];
  M.crack = {i: mci(gx, gy), gx, gy, open: QUEST.s >= 1}; M.keep.add(mci(gx, gy - 1)).add(mci(gx, gy - 2));   // the rock over it stays, so its face stays tall
}
const nearCrack = (x, y, r) => !!MN.crack && Math.max(Math.abs(x - MN.crack.gx), Math.abs(y - MN.crack.gy - 1)) <= r;   // the floor in front of it
function crackSprite(open, fr) {
  const key = 'crack' + (open ? 'o' : fr); if (MN.cache[key]) return MN.cache[key]; const c = mk(16, 22), x = c.getContext('2d'), P = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w || 1, h || 1); };
  if (open) { for (let r = 0; r < 19; r++) { const hw = r < 5 ? 2 + r : 6; P('#01032e', 8 - hw - 1, 3 + r, hw * 2 + 2, 1); P(r > 15 ? '#123a6e' : r > 12 ? '#0c2148' : '#07060f', 8 - hw, 3 + r, hw * 2, 1); }
    P('#01032e', 5, 2, 6, 1); P('#2c607a', 1, 20, 3, 2); P('#468498', 12, 20, 3, 2); P('#1e425c', 4, 21, 2, 1); }   // the hole, a cold light low inside it, two bits of rubble
  else { const xs = [8, 8, 7, 7, 8, 9, 9, 8, 7, 7, 8, 8, 9, 8, 8, 7]; xs.forEach((cx, r) => { P('#01032e', cx - 1, 3 + r, 3, 1); });
    xs.forEach((cx, r) => P(fr && r % 5 === 2 ? '#e8f8ff' : r < 2 || r > 13 ? '#3a86e0' : '#8fd6ff', cx, 3 + r)); P('#01032e', 9, 7, 2, 1); P('#3a86e0', 10, 7); P('#01032e', 5, 12, 2, 1); P('#3a86e0', 5, 12); }   // a thin split with light behind it
  return MN.cache[key] = c;
}
function crackBreak(T) {   // the last swing: the wall falls in, the server is told
  const M = MN, C = M.crack, [tx, ty] = tgtPt(T), row = wallRow(T.w); DIG.on = null; M.shake = .3; sfx('mbreak'); mineChips(tx, ty, 'w', 16); puffAt(tx, ty + 4, 14);
  for (let z = 0; z < 12; z += 2) M.fx.push({k: 'slice', row, z, x: C.gx * CS + 8, y: C.gy * CS + 10, h: z, vx: (Math.random() - .5) * 46, vy: 8 + Math.random() * 22, vh: 10 + Math.random() * 50, a: 0, va: (Math.random() - .5) * 3, t: 0, l: .4 + Math.random() * .25});
  C.open = true; M.wdmg.delete(C.i); M.dirty = true; DIG.ask = true; sfx('rare');
  qop('qcrack').then(() => { DIG.ask = false; }, e => { DIG.ask = false; C.open = false; M.dirty = true; wlSay(e.message, 'bad'); });
}
function crackObjs(objs, t) { const C = MN.crack; if (!C || !MN.cell[C.i]) return;
  objs.push({img: crackSprite(C.open, Math.floor(t / 420) % 3 === 0 ? 1 : 0), x: C.gx * CS, y: C.gy * CS - 6, base: C.gy * CS + CS + .1}); }

/* ---------- the den: the tunnel, the cage, Pip's room ---------- */
const DEN_SPANS = {3: [15, 17], 4: [13, 19], 5: [13, 19], 6: [13, 19], 7: [14, 18], 8: [15, 17], 9: [15, 17], 10: [7, 16], 11: [7, 8], 12: [3, 8], 13: [3, 4], 14: [3, 3], 15: [3, 3], 16: [3, 3]};   // row: the first and last open cell
const DEN_LIFT = [12, 9];   // (26 Nov) the elevator's nook in the tunnel wall, just short of the bars
const DEN_CAGE = [15, 8], PIP_AT = [264, 76], PIP_STAND = [264, 120], DEN_GEMS = [[13, 4, 3], [19, 6, 9], [17, 3, 14]], DEN_PUDDLE = [226, 104];
const DEN_SHROOMS = [[52, 211], [98, 195], [134, 178], [170, 163], [214, 164], [246, 150], [298, 118]];
function denGeo() {
  const M = MN; M.lv = MR.levels; M.cell.fill(1); M.rocks = []; M.veins = new Map(); M.wdmg = new Map(); M.lamps = []; M.keep = new Set(); M.fx = []; M.shaft = null; M.crack = null; DIG.on = null;
  for (const y in DEN_SPANS) for (let x = DEN_SPANS[y][0]; x <= DEN_SPANS[y][1]; x++) M.cell[mci(x, +y)] = 0;
  M.den = true; M.entry = [3, MGH - 3]; M.lift = DEN_LIFT.slice(); mineHaz(); M.dirty = true;
}
function denGo() {   // through the hole
  const m = WL.me; if (MN.busy || WL.fading || !m) return; MN.busy = true; WL.fading = true; DIG.on = null; sfx('door'); $('#xfade').classList.add('on');
  setTimeout(() => { MN.den = true; denGeo(); mineBake(); m.path = []; m.todo = null; m.walk = false; const sp = mineSpawn(); m.x = sp[0]; m.y = sp[1]; m.dir = sp[2]; netMove(); WL.fading = false; MN.busy = false; $('#xfade').classList.remove('on'); }, 260);
}
function denLeave() {   // back out to level 12, in front of the hole
  const m = WL.me; if (MN.busy || WL.fading || !m) return; MN.busy = true; WL.fading = true; pipHush(); sfx('door'); $('#xfade').classList.add('on');
  setTimeout(() => { mineGeo(MR.levels); mineFill(''); mineBake(); m.path = []; m.todo = null; m.walk = false; const C = MN.crack, sp = C ? [C.gx * CS + 8, (C.gy + 1) * CS + 9, 'front'] : mineSpawn();
    m.x = sp[0]; m.y = sp[1]; m.dir = sp[2]; netMove(); WL.fading = false; mineStock(MR.levels); }, 260);
}
function barsSprite() {   // straight on: a rail, twelve iron bars, the two in the middle bent apart at the foot
  const key = 'bars'; if (MN.cache[key]) return MN.cache[key]; const c = mk(50, 30), x = c.getContext('2d'), P = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w || 1, h || 1); };
  for (let i = 0; i < 12; i++) { const bx = 2 + i * 4, L = i === 5, R = i === 6;
    for (let y = 3; y < 29; y++) { const k = y - 15, off = (L || R) && k > 0 ? Math.min(3, Math.round(k * .45)) * (L ? -1 : 1) : 0; if ((L || R) && y > 25) continue; P('#4a5068', bx + off, y, 2, 1); P('#8e98b0', bx + off, y); } }
  P('#4a5068', 1, 1, 48, 3); P('#8e98b0', 1, 1, 48, 1); P('#2c3044', 1, 3, 48, 1); P('#4a5068', 1, 27, 18, 2); P('#4a5068', 31, 27, 18, 2); P('#8e98b0', 1, 27, 18, 1); P('#8e98b0', 31, 27, 18, 1);
  navyEdge(c); return MN.cache[key] = c;
}
const SHARD = pxIcon(['..K..', '.KWK.', '.KCK.', 'KWCDK', 'KCCDK', 'KCDDK', '.KKK.'], {K: '#1a1430', W: '#ffffff', C: '#8fe6ff', D: '#3d9fe0'});
function denDeco(x) {   // baked into the den's ground: mushrooms, little crystals, his nest, the puddle, the red of level 12 at the way out
  const M = MN; for (const [a, b] of DEN_SHROOMS) x.drawImage(shroomSprite(2), a - 4, b - 2); M.shrooms = DEN_SHROOMS.slice(0, 7);
  for (const [a, b] of [[84, 200], [150, 168], [270, 150], [228, 72], [300, 74]]) x.drawImage(SHARD, a, b);
  const E = (cx, cy, rx, ry, col) => { x.fillStyle = col; for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy / (ry + .5)) ** 2)); x.fillRect(cx - w, cy + dy, w * 2, 1); } };
  E(PIP_AT[0], PIP_AT[1] - 1, 15, 7, '#1a1430'); E(PIP_AT[0], PIP_AT[1] - 1, 14, 6, '#6b5a34'); E(PIP_AT[0], PIP_AT[1] - 2, 11, 4, '#3f6a3c'); E(PIP_AT[0], PIP_AT[1] - 2, 8, 3, '#578a4a');   // the nest: twigs round a bed of moss
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; x.fillStyle = i % 2 ? '#8a7444' : '#4a3d22'; x.fillRect(Math.round(PIP_AT[0] + Math.cos(a) * 13), Math.round(PIP_AT[1] - 1 + Math.sin(a) * 5.5), 2, 1); }
  E(DEN_PUDDLE[0], DEN_PUDDLE[1], 8, 3, '#0e2a5c'); E(DEN_PUDDLE[0], DEN_PUDDLE[1], 7, 2, '#1f58a8'); x.fillStyle = '#7fc4ff'; x.fillRect(DEN_PUDDLE[0] - 4, DEN_PUDDLE[1] - 1, 3, 1);
  M.drips.push({x: DEN_PUDDLE[0], y: DEN_PUDDLE[1] - 22, s: 7});
  const X0 = M.entry[0] * CS; for (let i = 0; i < 20; i++) { x.fillStyle = `rgba(255,96,40,${(.02 + i * .011).toFixed(3)})`; x.fillRect(X0, MGH * CS - 20 + i, CS, 1); }
}
function denMask(mx) {   // what you cannot walk through: the bars either side of the gap, the crystals, Pip on his nest
  const [cx, cy] = DEN_CAGE; mx.fillRect(cx * CS, cy * CS + 2, CS + 3, CS - 4); mx.fillRect(cx * CS + 2 * CS - 3, cy * CS + 2, CS + 3, CS - 4);
  for (const [gx, gy] of DEN_GEMS) mx.fillRect(gx * CS, gy * CS + 2, CS, CS - 2); mx.fillRect(PIP_AT[0] - 13, PIP_AT[1] - 9, 26, 33);   // and the floor right under him: you stand back, so you never cover him
}
function denObjs(objs, t) {
  const [cx, cy] = DEN_CAGE, b = barsSprite(); objs.push({img: b, x: cx * CS - 1, y: cy * CS + 14 - b.height, base: cy * CS + 9});
  for (const [gx, gy, a] of DEN_GEMS) { const im = rockSprite(MR.levels * 9 + 6, a); if (!im) continue; const X0 = gx * CS + 8, Y0 = gy * CS + 11; objs.push({img: im, x: X0 - im.width / 2, y: Y0 - im.gy, base: gy * CS + 13, after: () => gemTwinkle(X0, Y0, t, {gx})}); }
}
function denGlow(L) { for (const [gx, gy] of DEN_GEMS) L.push([gx * CS + 8, gy * CS + 2, 26, CRY_GLOW.d, .3, gx * 31 + gy]);
  L.push([PIP_AT[0] + 10, PIP_AT[1] - 6, 18, '150,215,255', .22, 77], [DEN_PUDDLE[0], DEN_PUDDLE[1], 14, '90,160,255', .14, 78], [DEN_CAGE[0] * CS + 24, DEN_CAGE[1] * CS + 4, 30, '110,180,255', .1, 79]); }

/* ---------- Pip ---------- */
const PIP = {talk: null, el: null, p: null, held: false, coolT: 0};
const PIP_FIRST = ['Oh! A big one! Nobody has ever come down this far. Ever.', "I'm Pip. I slipped on the hot rocks and my leg went crack.", "There's a moss that mends bones. Moonmoss. It only grows in the Forgotten Forest.",
  'Nobody remembers the way anymore. Look where the trees forget to grow, at the edge of your town.', "Take my moon snips. Moonmoss won't let anything else cut it."];
const PIP_WAIT = ['The forest. Where the trees forget to grow. Please hurry, it hurts.'];
/* BATCH 2: you come back with the Moonmoss (QUEST.s 3). He is mended part way through these (PIP_UP: the line he gets up on), and at the end the
   server (op qheal) hands over the torn map and the Glow Bait (forest.js pipGifts). After that he only ever points you at the map. */
const PIP_HEAL = ['You came back! Is that... it is! Moonmoss!', 'Hold still, leg. This might tingle.', "Oh. Oh! It doesn't hurt. Look, look, I can hop!", "I'm not meant to tell a big one this. But you helped me. So.",
  'Four Keystones got lost up top. My King cannot open his door without them.', 'I drew where I think they fell. It tore a bit. Sorry.', 'And take my glow bait. One of them sank where your people fish. It only comes up for something shiny.'], PIP_UP = 2;
const PIP_BAIT = ['I grow glimmer bait now. Something shy in your lake loves it.'];   // (26 Nov) mended, he sells it: this line, then the little shop (baitOpen, further down)
const PIP_MAP = ['Did you look at my map? Four drawings, four stones. I will keep hopping till you are back.'];
const pipWell = () => QUEST.s >= 4 || (!!PIP.talk && PIP.talk.give === 'qheal' && PIP.talk.i >= PIP_UP);
function pipSet() { const D = (d, k = 'pip') => makeDir(IMG[k + '/' + d] || IMG[k + '/front'], false, []);   // [] = no blink painted on him: his eyes are in the picture
  if (!SP.pipw && IMG['pipw/front']) SP.pipw = {front: D('front', 'pipw'), back: D('back', 'pipw'), right: D('right', 'pipw'), left: D('left', 'pipw')};   // mended: no splint, and a smile (tools/make_forest.py; forest.js loads them)
  if (SP.pip || !IMG['pip/front']) return SP.pip; return SP.pip = {front: D('front'), back: D('back'), right: D('right'), left: D('left')}; }
function denPeople(m, t) { if (!pipSet()) return []; const dx = m.x - PIP_AT[0], dy = m.y - PIP_AT[1];
  const well = pipWell() && !!SP.pipw, T = PIP.talk, k = t % 2400, hop = well && (!T || T.i === PIP_UP) && k < 760 ? Math.round(Math.abs(Math.sin(k / 380 * Math.PI)) * 4) : 0;   // mended: two little hops, then a rest (never while his words are up, but for the line he gets up on)
  return [PIP.p = {name: well ? 'pipw' : 'pip', dir: Math.hypot(dx, dy) < 90 ? dirFrom(dx, dy) : 'front', x: PIP_AT[0], y: PIP_AT[1] - hop, sortY: PIP_AT[1], t, phase: 400, walk: false, noShadow: true}]; }
function pipTalk() { const m = WL.me, now = performance.now(); if (PIP.talk || now < PIP.coolT || !MN.den || QUEST.s < 1) return; m.path = []; m.todo = null; m.walk = false; m.dir = dirFrom(PIP_AT[0] - m.x, PIP_AT[1] - m.y);
  const s = QUEST.s; PIP.talk = {L: s >= 4 ? PIP_MAP.concat(PIP_BAIT) : s === 3 ? PIP_HEAL : s >= 2 ? PIP_WAIT : PIP_FIRST, i: 0, give: s === 1 ? 'qpip' : s === 3 ? 'qheal' : null, shop: s >= 4}; sfx('pip'); sayLine(PIP.talk.L[0]); }
function pipNext() { const T = PIP.talk; if (!T) return; if (sayTyping()) { sayFinish(); return; }   // (26 Nov) a tap while a line is still typing finishes it; the next tap is the next line
  if (++T.i < T.L.length) { sfx('pip'); sayLine(T.L[T.i]); return; } pipHush(); if (T.shop) baitOpen();
  if (T.give === 'qpip') qop('qpip').then(r => { if (r && r.got) itemGot('MOON SNIPS', SNIPS_ICON, '120,200,255'); }, e => wlSay(e.message, 'bad'));
  if (T.give === 'qheal') qop('qheal').then(r => { if (r && r.got && typeof pipGifts === 'function') pipGifts(); }, e => wlSay(e.message, 'bad')); }   // the torn map, then the Glow Bait (forest.js)
function pipHush() { PIP.talk = null; PIP.coolT = performance.now() + 700; sayOff(); }
function pipBubble(hits) {   // (26 Nov: his words are the night films' subtitles now, sayLine below) what is left of the bubble: walking off ends the talk
  const T = PIP.talk, m = WL.me; if (T && (!MN.den || m.loc !== MINE || Math.hypot(m.x - PIP_AT[0], m.y - PIP_AT[1]) > 58)) pipHush();
}
/* SUBTITLES (26 Nov 2026, his ask: "the night-film subtitles, not speech bubbles"): Pip and the King (temple.js) speak in the night films' own plate,
   typed out with their own tick (index.html caption()). The films' plate lives in the night screen, so the walking screen has a twin of it
   (#talkCap, the same .cap class: the same look, and the same place sideways). No name on it: the films have no style for one. */
const SAY = {el: null, txt: '', end: 0};
function sayEl() { if (SAY.el) return SAY.el; const d = document.createElement('div'); d.className = 'cap'; d.id = 'talkCap'; $('#heads').after(d);
  const st = document.createElement('style'); st.textContent = '#townHud #talkCap{bottom:calc(20% + 34px);z-index:9}#phone.land #townHud #talkCap{bottom:calc(var(--lb) + 14px)}'; document.head.appendChild(st); return SAY.el = d; }   // clear of the joystick and the bottom bar
function sayLine(txt) { SAY.txt = txt; SAY.end = performance.now() + txt.length * 34 + 60; caption(sayEl(), txt); }
const sayTyping = () => !!SAY.txt && performance.now() < SAY.end;
function sayFinish() { clearInterval(capTimer); SAY.end = 0; const sp = SAY.el && SAY.el.firstChild; if (sp) sp.textContent = SAY.txt; }   // the whole sentence at once
function sayOff() { if (!SAY.txt) return; SAY.txt = ''; SAY.end = 0; clearInterval(capTimer); if (SAY.el) SAY.el.textContent = ''; }
function denTick() {   // the pickaxe button also turns his page (for thumbs on the joystick); walking off ends the talk
  const m = WL.me; if (!m || m.loc !== MINE || !MN.den) { if (PIP.talk) pipHush(); return; }
  if (PIP.talk) { if (PICK.held && !PIP.held) pipNext(); DIG.on = null; } PIP.held = PICK.held;
}
{ const fr = scenes.town.frame; scenes.town.frame = function (dt, t) { denTick(); return fr.call(this, dt, t); }; }

/* ---------- a thing handed to you: the same card as a fish you caught ---------- */
const SNIPS_ICON = pxIcon(['.....K....K.....', '....KWK..KWK....', '....KWK..KWK....', '....KWSKKSWK....', '.....KWSSWK.....', '.....KWSSWK.....', '......KWWK......', '......KBBK......', '.....KSKKSK.....', '....KSK..KSK....', '...KSK....KSK...',
  '..KSSK....KSSK..', '.KS..SK..KS..SK.', '.KS..SK..KS..SK.', '..KSSK....KSSK..', '...KK......KK...'], {K: '#1a1430', W: '#ffffff', S: '#b8c2d4', B: '#6ec8ff'});
function itemGot(name, icon, glow, next) {   // next: what happens when the card is put away (a second thing handed over)
  const tall = icon.height > 32 && icon.height <= 56 && icon.width <= 48, H = tall ? icon.height * 2 + 12 : 64;   // (26 Nov) the 3D Warden stands taller than the card: the card grows for him, so he is shown at the same double size as the flat outfits were
  const c = $('#itCv'), x = c.getContext('2d'), sc = tall ? 2 : icon.height > 32 || icon.width > 48 ? 1 : icon.height > 21 ? 2 : 3; if (c.height !== H) c.height = H; c.style.height = H * 2 + 'px'; x.clearRect(0, 0, c.width, c.height); const g = x.createRadialGradient(48, H / 2, 2, 48, H / 2, 34 + (H - 64) / 2); g.addColorStop(0, `rgba(${glow},.55)`); g.addColorStop(1, `rgba(${glow},0)`); x.fillStyle = g; x.fillRect(0, 0, 96, H);
  x.imageSmoothingEnabled = false; x.drawImage(icon, Math.round(48 - icon.width * sc / 2), Math.round(H / 2 - icon.height * sc / 2), icon.width * sc, icon.height * sc);
  itemGot.next = next || null; $('#itName').textContent = name; document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); $('#itemModal').classList.add('on'); sfx('rare');
}
(() => {
  const ref = $('#beerModal'), d = document.createElement('div'); d.className = 'modal panel'; d.id = 'itemModal';
  d.innerHTML = '<div class="mhead"><b>YOU GOT</b></div><div id="itStage"><canvas id="itCv" width="96" height="64"></canvas></div><h3 id="itName"></h3><div class="row"><button class="btn go" id="itOk">OK</button></div>';
  ref.parentNode.insertBefore(d, ref); $('#itOk').onclick = () => { d.classList.remove('on'); sfx('close'); const n = itemGot.next; itemGot.next = null; if (n) n(); };
  const st = document.createElement('style'); st.textContent = '#itemModal{text-align:center;padding:12px;z-index:10}#itemModal .mhead{text-align:left}#itemModal .btn{font-size:17px;padding:8px 22px 11px}#itemModal .row{justify-content:center}'
    + '#itStage{position:relative;width:240px;max-width:100%;margin:2px auto 8px;padding:14px 0;border:3px solid #6ec8ff;border-radius:6px;background:#16233f;box-shadow:inset 0 0 0 3px #1a1430}#itCv{width:192px;height:128px;image-rendering:pixelated;display:block;margin:0 auto}'
    + '.hb.say.side::after{display:none}'
    /* (26 Nov, his note) the card wears the temple's colours, never the Christmas paper: pale moon stone round a deep night-blue face, glowing blue words */
    + '#phone #itemModal,#phone.xmas #itemModal{background:#1b2650;color:#dff3ff;border:4px solid #8fb0d8;border-image:none;border-radius:6px;box-shadow:inset 0 0 0 3px #4a6494,inset 0 -8px 0 #131b3d,0 5px 0 #0009}'
    + '#phone #itemModal .mhead b,#phone.xmas #itemModal .mhead b{color:#9fe4ff;text-shadow:0 2px 0 #0b1030}'
    + '#itemModal #itStage{border-color:#7fd8ff;background:#0f1633;box-shadow:inset 0 0 0 3px #2e3f6e,0 0 0 3px #0b1030}'
    + '#itemModal #itName{color:#eaf8ff;text-shadow:0 2px 0 #0b1030}'
    + '#phone #itemModal .btn.go{background:#3a8fd6;color:#fff;border-color:#0b1030;box-shadow:inset 0 -4px 0 #1d5a9e,0 3px 0 #0009}';
  document.head.appendChild(st);
})();
SFX.pip = () => { tone(1250, .05, {type: 'sine', vol: .06, to: 1700}); tone(1900, .06, {type: 'sine', vol: .05, to: 1500, at: .06}); };

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
    <div class="small"><b>SMELT</b> · ${MR.smeltIn} gold chunks make ${MR.smeltOut} coins.</div>
    <div id="smeltPick"><button class="btn" id="smeltLess">-</button><input type="range" id="smeltN" min="1" max="1" step="1" value="1"><button class="btn" id="smeltMore">+</button></div><button class="btn go wide" id="smeltYes"></button>
    <div class="small" style="margin-top:14px"><b>CRYSTALS</b> · he pays in gold chunks.</div><button class="btn go wide" id="cryYes"></button>`;
  ref.parentNode.insertBefore(d, ref);
  const p = document.createElement('div'); p.className = 'modal big panel'; p.id = 'pickModal';
  p.innerHTML = `<div class="mhead"><b>PICKAXES</b><span class="wal">${ic('coin', 2, 'solo')}<span class="coinN">0</span></span><button class="btn" id="pickX">${ic('cross', 2, 'solo')}</button></div>
    <div class="small">A better one breaks rock faster and digs deeper.</div><div id="pickPicks"></div>`;
  ref.parentNode.insertBefore(p, ref);
  const st = document.createElement('style'); st.textContent = '#smithModal .btn.wide{display:flex;width:100%;justify-content:center;align-items:center;gap:6px;font-size:17px;padding:8px 8px 11px;margin-top:6px}#smithModal .btn:disabled,#pickModal .btn:disabled{opacity:.5}#smithModal .mhead{gap:8px}#smithModal .mhead b{font-size:19px}#smithModal .mhead .wal{font-size:15px}#pickModal .jimg{width:48px;height:48px;margin:0}#smithModal,#pickModal{bottom:auto}'
    + '#smeltPick{display:flex;align-items:center;gap:8px;margin-top:8px}#smeltPick .btn{flex:none;width:40px;font-size:20px;line-height:1;padding:5px 0 8px}#smeltYes .smT{font-size:13px;opacity:.75;margin-left:4px}'
    + '#smeltN{flex:1;min-width:0;height:28px;margin:0;background:none;-webkit-appearance:none;appearance:none;touch-action:none}#smeltN::-webkit-slider-runnable-track{height:8px;background:#1a1430;border-radius:0;box-shadow:inset 0 0 0 2px #1a1430,inset 0 3px 0 #3a3052}#smeltN::-moz-range-track{height:8px;background:#1a1430}'
    + '#smeltN::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:24px;margin-top:-8px;background:#ffd25e;border:3px solid #1a1430;border-radius:2px}#smeltN::-moz-range-thumb{width:12px;height:18px;background:#ffd25e;border:3px solid #1a1430;border-radius:2px}'; document.head.appendChild(st);
  $('#smeltYes').onclick = smeltGo; $('#smeltN').oninput = e => { GOLD.lots = +e.target.value | 0; smithUI(); }; $('#smeltLess').onclick = () => { GOLD.lots--; sfx('click'); smithUI(); }; $('#smeltMore').onclick = () => { GOLD.lots++; sfx('click'); smithUI(); }; $('#cryYes').onclick = cryGo; $('#smithX').onclick = () => $('#smithModal').classList.remove('on'); $('#pickX').onclick = () => $('#pickModal').classList.remove('on');
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

/* ================= THE MINE ELEVATOR (26 Nov 2026, his ask: "a shortcut to travel down the mines") =================
   One on every level, two squares along from where you arrive (MN.lift, laid out by mineGeo), and one in a nook of Pip's tunnel (DEN_LIFT).
   Tap it or walk into it: a panel with Surface, every level your pickaxe reaches (mNeed, the game's own rule) and, once you have met Pip
   (QUEST.s >= 2), Pip's Cave. A level is asked for with the same op as the ladders (mgo), so the server rolls it and can refuse it.
   THE ART (tools/make_lift.py, assets/mine/lift.png): a stack drawn straight on, in three layers, so the cage can move between the other two.
   THE RIDE: the cage sinks into its hole (or lifts away), the screen goes dark, the shaft runs past (the levels' own wall blocks), the LEVEL
   line counts, a rumble and creaks (Web Audio, like every other sound here); then you step out in front of the elevator down there. */
const LIFT = {ride: null, coolT: 0, W: 39, H: 70, gx: 19, gy: 55, tmp: null};   // W, H, gx, gy: a cell on the sheet, and where the middle of the ground is in it (make_lift.py)
const liftLamp = th => { const key = 'lamp' + th; if (MN.cache[key]) return MN.cache[key]; const f = MLOOK[th].fl;   // the caves' own wall lamp, in the level's light
  return MN.cache[key] = pxIcon(['..KKK..', '.KwwwK.', '.KKKKK.', 'KYWWYYK', 'KYWWYYK', 'KYYYYgK', '.KKKKK.', '..KKK..'], {K: '#1a1430', w: '#8a5a2b', Y: f[0], W: f[1], g: f[2]}); };
/* the elevator in the level's stone; dy = how far the cage has moved (down = into the hole, clipped at its lip; up = behind the wheel and the beam) */
function liftDraw(art, dy) {
  const im = IMG['mine/lift']; if (!im) return null; const still = !dy, key = 'lift' + art, W = LIFT.W, H = LIFT.H; if (still && MN.cache[key]) return MN.cache[key];
  const c = still ? mk(W, H) : (LIFT.tmp || (LIFT.tmp = mk(W, H))), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, W, H);
  x.drawImage(im, 0, (art - 1) * H, W, H, 0, 0, W, H);
  if (dy > 0) { x.fillStyle = '#c4a874'; x.fillRect(LIFT.gx, 26, 1, dy + 1); }                                 // the rope pays out
  x.save(); if (dy > 0) { x.beginPath(); x.rect(0, 0, W, LIFT.gy + 4); x.clip(); } x.drawImage(im, 0, 12 * H, W, H, 0, dy, W, H); x.restore();
  x.drawImage(im, W, (art - 1) * H, W, H, 0, 0, W, H); x.drawImage(liftLamp((art - 1) >> 1), 31, 27);
  navyEdge(c); return still ? (MN.cache[key] = c) : c;
}
function liftCage() {   // the cage alone, for the ride
  const key = 'liftcage'; if (MN.cache[key]) return MN.cache[key]; const im = IMG['mine/lift']; if (!im) return null; const c = mk(LIFT.W, LIFT.H), x = c.getContext('2d');
  x.drawImage(im, 0, 12 * LIFT.H, LIFT.W, LIFT.H, 0, 0, LIFT.W, LIFT.H); navyEdge(c); return MN.cache[key] = c;
}
function liftObjs(objs, dt) {
  const M = MN; liftTick(dt); if (!M.lift) return; const R = LIFT.ride; let dy = 0, sx = 0;
  if (R) { if (R.ph === 0) { const k = clamp((R.t - .14) / .42, 0, 1); dy = Math.round(k * k * 26) * R.dir; if (R.t < .14) sx = Math.round(Math.sin(R.t * 90)); }
    else if (R.ph === 3) { const k = 1 - clamp(R.t / .36, 0, 1); dy = -Math.round(k * k * 22) * R.adir; } else dy = 99 * R.dir; }
  const im = liftDraw(mArt(), dy); if (im) objs.push({img: im, x: M.lift[0] * CS + 8 - LIFT.gx + sx, y: M.lift[1] * CS + 7 - LIFT.gy, base: M.lift[1] * CS + CS + .5});
}
const liftHere = () => MN.den ? 13 : MN.lv;   // the stops, top to bottom: 0 the surface, 1-12 the levels, 13 Pip's cave
function liftLabel(n) { const el = $('#hallLine'); if (el && el.firstChild) el.firstChild.nodeValue = n <= 0 ? 'SURFACE' : n >= 13 ? "PIP'S CAVE" : 'LEVEL ' + n; }
function liftGo(to) {
  const m = WL.me, from = liftHere(); $('#liftModal').classList.remove('on'); if (!m || m.loc !== MINE || MN.busy || WL.fading || LIFT.ride || to === from) return;
  MN.busy = true; DIG.on = null; if (PIP.talk) pipHush(); m.path = []; m.todo = null; m.walk = false;
  const R = LIFT.ride = {from, to, dir: to > from ? 1 : -1, adir: 1, ph: 0, t: 0, pos: from, tick: from, dur: Math.min(2.6, .9 + .17 * Math.abs(to - from)), runT: 0, res: null, err: null};
  sfx('liftgo');   // the surface asks the server nothing (like walking out); a level is the ladders' own op, so it is rolled and checked as ever
  (to === 0 ? Promise.resolve({}) : Promise.resolve().then(() => mop('mgo', {lv: to === 13 ? MR.levels : to}))).then(r => { R.res = r || {}; }, e => { R.err = e || new Error('Try again.'); });
}
function liftTick(dt) {
  const R = LIFT.ride; if (!R) return; R.t += dt;
  if (R.ph === 0) { if (R.t >= .62) { R.ph = 1; R.t = 0; } return; }
  if (R.ph === 1) { const k = clamp(R.t / R.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k); R.pos = R.from + (R.to - R.from) * e;
    const n = Math.round(R.pos); if (n !== R.tick) { R.tick = n; liftLabel(n); sfx('ltick'); }
    R.runT -= dt; if (R.runT <= 0 && k < 1) { R.runT = 1.05; sfx('liftrun'); }
    if (k >= 1 && (R.res || R.err)) liftLand(); return; }
  if (R.ph === 3 && R.t >= .46) { LIFT.ride = null; MN.busy = false; LIFT.coolT = performance.now() + 500; }
}
function liftLand() {
  const R = LIFT.ride, m = WL.me;
  if (R.err) { wlSay(R.err.message || 'Try again.', 'bad'); mineHead(); R.ph = 3; R.t = 0; R.adir = -R.dir; return; }   // refused: the cage comes back to where it was
  if (R.to === 0) { R.ph = 2; mineLeave(); setTimeout(() => { if (LIFT.ride === R) { LIFT.ride = null; MN.busy = false; } }, 600); return; }
  if (R.to === 13) denGeo(); else { mineGeo(R.to); mineFill(R.res.k || ''); } mineBake();
  m.path = []; m.todo = null; m.walk = false; m.x = MN.lift[0] * CS + 8; m.y = (MN.lift[1] + 1) * CS + (isFloor(MN.lift[0], MN.lift[1] + 2) ? 13 : 9); m.dir = 'front'; mineHead(); netMove(); sfx('liftstop'); R.ph = 3; R.t = 0; R.adir = R.dir;
}
/* over the cave: the dark closing in as the cage leaves, the shaft while it travels, the dark lifting where you get out */
function liftOver(t) {
  const R = LIFT.ride; if (!R) return; const dark = a => { if (a > 0) { lx.fillStyle = `rgba(7,6,15,${Math.min(1, a).toFixed(2)})`; lx.fillRect(0, 0, cam.lw, cam.lh); } };
  if (R.ph === 0) { dark((R.t - .32) / .28); return; } if (R.ph === 3) { dark(1 - R.t / .3); return; }
  liftScene(R, t); if (R.ph === 1) dark(1 - R.t / .2);
}
function liftScene(R, t) {
  const W = cam.lw, H = cam.lh, cx = Math.round(W / 2), cy = Math.round(H / 2) + 4, BL = WZ - 1, BAND = BL * 4, S0 = R.pos * BAND, go = R.ph === 1 && R.t < R.dur;
  const jx = go ? Math.round(Math.sin(t * .06) * .7) : 0, jy = go ? Math.round(Math.cos(t * .083) * .7) : 0, artOf = li => li <= 0 ? 1 : li >= 13 ? 6 : li;
  lx.fillStyle = '#07060f'; lx.fillRect(0, 0, W, H); lx.fillStyle = '#0d0a1a'; lx.fillRect(cx - 32, 0, 64, H);
  for (let b = Math.floor((S0 - cy) / BL) - 1, b1 = Math.floor((S0 + H - cy) / BL) + 1; b <= b1; b++) {   // the rock either side: each level's own wall blocks, a level four blocks deep
    const art = artOf(clamp(Math.floor((b * BL + BL / 2) / BAND + .5), 0, 13)), sy = Math.round(b * BL - S0) + cy + jy;
    for (let c = 0; cx - 32 - c * WS > -WS; c++) for (const sd of [-1, 1]) { const im = wallSprite((art - 1) * 12 + (hash(b * 31 + c * 7 + sd + 99) % 2) * 3, WZ, Math.min(2, c)); if (im) lx.drawImage(im, 0, WS, WS, BL, (sd < 0 ? cx - 32 - (c + 1) * WS : cx + 32 + c * WS) + jx, sy, WS, BL); }
    if (((b % 2) + 2) % 2 === 0) for (const sd of [-1, 1]) { const X0 = sd < 0 ? cx - 32 + jx : cx + 22 + jx; lx.fillStyle = '#683e22'; lx.fillRect(X0, sy + 10, 10, 3); lx.fillStyle = '#966234'; lx.fillRect(X0, sy + 10, 10, 1); }   // the struts that hold the guide rails
  }
  for (const sd of [-1, 1]) { lx.fillStyle = '#2c3044'; lx.fillRect(cx + sd * 22 + (sd < 0 ? -1 : 0) + jx, 0, 2, H); lx.fillStyle = '#4a5068'; lx.fillRect(cx + sd * 22 + (sd < 0 ? -1 : 0) + jx, 0, 1, H); }   // the guide rails
  if (R.pos < 1.2) { const a = clamp(1 - R.pos / 1.2, 0, 1); for (let i = 0; i < 7; i++) { lx.fillStyle = `rgba(255,232,180,${(a * (.42 - i * .06)).toFixed(3)})`; lx.fillRect(0, i * 8, W, 8); } }   // daylight, near the top
  const top = cy - LIFT.gy + 26; lx.fillStyle = '#c4a874'; lx.fillRect(cx, 0, 1, top); lx.fillStyle = '#78603a'; for (let y = (Math.floor(-S0 * 0) % 4); y < top; y += 4) lx.fillRect(cx, y, 1, 1);   // the rope
  const cg = liftCage(), th = (artOf(clamp(Math.round(R.pos), 0, 13)) - 1) >> 1; if (cg) lx.drawImage(cg, cx - LIFT.gx, cy - LIFT.gy);
  lx.drawImage(liftLamp(th), cx + 8, cy - 24);
  lights([[cam.x + cx + 10, cam.y + cy - 18, 46, MLOOK[th].lt, .3, 91], [cam.x + cx, cam.y + cy - 10, 60, MLOOK[th].me, .1, 92]], t); vignette(.6);
}
function liftUI() {
  const here = liftHere(), B = (to, label, wide) => `<button class="btn${wide ? ' wide' : ''}" data-to="${to}"${to === here ? ' disabled' : ''}>${label}</button>`;
  let h = B(0, 'Surface', true); for (let lv = 1; lv <= MR.levels; lv++) if (GOLD.pick >= mNeed(lv)) h += B(lv, 'Level ' + lv);
  if (QUEST.s >= 2) h += B(13, "Pip's Cave", true); $('#liftList').innerHTML = h;
}
function liftOpen() {
  const m = WL.me; if (!m || m.loc !== MINE || !MN.lift || MN.busy || WL.fading || LIFT.ride || PIP.talk || performance.now() < LIFT.coolT || $('#liftModal').classList.contains('on')) return;
  m.path = []; m.todo = null; m.walk = false; m.dir = 'back'; DIG.on = null; sfx('click'); document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); liftUI(); $('#liftModal').classList.add('on');
}
(() => {
  const ref = $('#beerModal'), d = document.createElement('div'); d.className = 'modal big panel'; d.id = 'liftModal';
  d.innerHTML = `<div class="mhead"><b>ELEVATOR</b><button class="btn" id="liftX">${ic('cross', 2, 'solo')}</button></div><div id="liftList"></div>`;
  ref.parentNode.insertBefore(d, ref);
  const st = document.createElement('style'); st.textContent = '#liftModal{bottom:auto}#liftList{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#liftList .btn{font-size:16px;padding:8px 2px 11px;white-space:nowrap}#liftList .btn.wide{grid-column:1/-1}#liftList .btn:disabled{opacity:.45}'
    + '#phone.land #liftList{grid-template-columns:repeat(6,1fr)}'; document.head.appendChild(st);
  $('#liftX').onclick = () => { d.classList.remove('on'); sfx('close'); LIFT.coolT = performance.now() + 500; };
  $('#liftList').onclick = e => { const b = e.target.closest('button[data-to]'); if (b && !b.disabled) liftGo(+b.dataset.to); };
})();
SFX.liftgo = () => { tone(1300, .03, {type: 'square', vol: .05, to: 700}); tone(170, .1, {type: 'triangle', vol: .13, to: 80, at: .01}); hiss(.7, {vol: .1, lp: 170, at: .12}); tone(330, .11, {type: 'sawtooth', vol: .028, to: 262, at: .16}); tone(250, .14, {type: 'sawtooth', vol: .026, to: 318, at: .34}); };   // the latch, the first lurch, a creak
SFX.liftrun = () => { hiss(1.15, {vol: .11, lp: 150}); tone(50, 1.1, {type: 'sine', vol: .09, to: 42}); tone(296, .1, {type: 'sawtooth', vol: .022, to: 244, at: .28}); tone(236, .13, {type: 'sawtooth', vol: .02, to: 290, at: .74}); for (let i = 0; i < 5; i++) tone(1700, .012, {type: 'square', vol: .012, at: .1 + i * .21}); };   // the rumble, the frame creaking, the chain
SFX.ltick = () => { tone(940, .028, {type: 'square', vol: .04, to: 700}); };
SFX.liftstop = () => { tone(150, .13, {type: 'triangle', vol: .15, to: 62}); hiss(.14, {vol: .1, lp: 700}); tone(310, .12, {type: 'sawtooth', vol: .024, to: 250, at: .1}); tone(1976, .22, {type: 'sine', vol: .045, at: .16}); };   // it lands, settles, and a little bell

/* ================= GLIMMER BAIT (26 Nov 2026): Pip sells it once he is mended =================
   After his waiting line he says one more (PIP_BAIT) and this little shop opens. MR.bait = the numbers (the same in functions/mine.js).
   The server's op gbuy takes the coins and adds to wallet.kit.gb; it only answers a player who has mended Pip, from level 12 (his den is
   level 12 to the server, the same rule as qheal). What the bait is FOR is the lake's business (fishing.js reads kit.gb): nothing here. */
const GBAIT_ICON = pxIcon(['..........KKKK..', '.........KWWCCK.', '........KWCCCCBK', '.....KKKKCCKCCBK', '....KWWCKCCCCBDK', '...KWCCCBKBBBDK.', '..KKCCCBBDKDDK..', '.KWCKBBBDDKKK...', 'KWCCBKDDDKK.....', 'KCCBBDKKK.......', 'KBBDDK..........', '.KDDK...........', '..KK............'],
  {K: '#1a1430', W: '#ffffff', C: '#8fe6ff', B: '#3d9fe0', D: '#2a6cb8'});
const BAIT = {ask: false};
function baitUI() {
  const B = MR.bait; $('#gbHave').textContent = GOLD.gb + ' / ' + B.max; $('#gbBuy').disabled = BAIT.ask || GOLD.gb + B.n > B.max; paintCoins();
  const c = $('#gbCv'), x = c.getContext('2d'); x.clearRect(0, 0, 96, 64); const g = x.createRadialGradient(48, 32, 2, 48, 32, 34); g.addColorStop(0, 'rgba(120,200,255,.5)'); g.addColorStop(1, 'rgba(120,200,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 96, 64);
  x.imageSmoothingEnabled = false; x.drawImage(GBAIT_ICON, 48 - 24, 32 - 19, 48, 39);
}
function baitOpen() { if (!MN.den || QUEST.s < 4 || !WL.me || WL.me.loc !== MINE) return; document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); baitUI(); $('#baitModal').classList.add('on'); }
function baitBuy() {
  if (BAIT.ask) return; BAIT.ask = true; baitUI();
  qop('gbuy').then(r => { BAIT.ask = false; GOLD.gb = Math.max(0, r.gb | 0); sfx('coin'); let seen = false; try { seen = !!localStorage.getItem('m2_gbait'); localStorage.setItem('m2_gbait', '1'); } catch (e) {}
    if (seen) baitUI(); else itemGot('GLIMMER BAIT', GBAIT_ICON, '120,200,255', baitOpen);   // the first time: the card, then back to the shop
  }, e => { BAIT.ask = false; baitUI(); wlSay(e.message, 'bad'); });
}
(() => {
  const ref = $('#beerModal'), d = document.createElement('div'); d.className = 'modal panel'; d.id = 'baitModal'; const B = MR.bait;
  d.innerHTML = `<div class="mhead"><b>GLIMMER BAIT</b><span class="wal">${ic('coin', 2, 'solo')}<span class="coinN">0</span></span><button class="btn" id="gbX">${ic('cross', 2, 'solo')}</button></div>
    <div id="gbStage"><canvas id="gbCv" width="96" height="64"></canvas><span id="gbHave"></span></div><div class="row"><button class="btn go" id="gbBuy">Buy ${B.n} · ${ic('coin', 2, 'solo')} ${B.price}</button></div>`;
  ref.parentNode.insertBefore(d, ref); $('#gbX').onclick = () => { d.classList.remove('on'); sfx('close'); }; $('#gbBuy').onclick = baitBuy;
  const st = document.createElement('style');   // the YOU GOT card's own colours (the temple's, never the Christmas paper)
  st.textContent = '#baitModal{text-align:center;padding:12px;z-index:10}#baitModal .mhead{text-align:left}#baitModal .mhead b{font-size:19px}#baitModal .btn.go{font-size:17px;padding:8px 18px 11px;display:inline-flex;align-items:center;gap:6px}#baitModal .btn:disabled{opacity:.5}#baitModal .row{justify-content:center}'
    + '#phone #baitModal,#phone.xmas #baitModal{background:#1b2650;color:#dff3ff;border:4px solid #8fb0d8;border-image:none;border-radius:6px;box-shadow:inset 0 0 0 3px #4a6494,inset 0 -8px 0 #131b3d,0 5px 0 #0009}'
    + '#phone #baitModal .mhead b,#phone.xmas #baitModal .mhead b{color:#9fe4ff;text-shadow:0 2px 0 #0b1030}#baitModal .mhead .wal{color:#eaf8ff;font-size:15px}'
    + '#gbStage{position:relative;width:240px;max-width:100%;margin:2px auto 8px;padding:14px 0;border:3px solid #7fd8ff;border-radius:6px;background:#0f1633;box-shadow:inset 0 0 0 3px #2e3f6e,0 0 0 3px #0b1030}#gbCv{width:192px;height:128px;image-rendering:pixelated;display:block;margin:0 auto}'
    + '#gbHave{position:absolute;right:10px;bottom:6px;font-size:16px;font-weight:700;color:#9fe4ff;text-shadow:0 2px 0 #0b1030}'
    + '#phone #baitModal .btn.go{background:#3a8fd6;color:#fff;border-color:#0b1030;box-shadow:inset 0 -4px 0 #1d5a9e,0 3px 0 #0009}';
  document.head.appendChild(st);
})();
