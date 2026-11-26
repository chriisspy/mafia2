// THE MINE + THE BLACKSMITH (24 Nov 2026, his ask): levels, pickaxes, gold chunks, crystals. Cheat-proof like the fishing:
// the server decides what is in a level (mgo hands the phone a list of rocks and wall veins and keeps a copy), every break is
// one roll here, a rock cannot be broken twice, a break cannot come sooner than its swings take, and a day has a top.
//   wallet: kit.gold  gold chunks (the Blacksmith smelts 10 into 15 coins (25 Nov, his ask: 1.5 a chunk))
//           kit.cry   crystals (the new currency)        kit.pick  your best pickaxe, 0..4 (wood, stone, iron, steel, gold)
//           kit.sm    your gold at the Blacksmith's: { c: coins it makes, t: when he started, d: how long it takes (ms) }; ready d later
//           kit.smd   when his last job was DONE (start + d): a new one cannot start for 10 minutes after that (26 Nov, his ask)
//           kit.cs    crystal rocks found but not broken yet, up to 3 ("eud" letters): they wait for you from level 7 down
//           kit.gb    Glimmer Bait you carry (bought from Pip with gbuy; the lake's fishing spends it)
//           mine = { lv, k, t }  the level you are in: k = one letter per thing ('.' = dug out), t = when the last break was
//           day.md / day.m / day.mc   this hour's key, gold chunks dug this hour, crystals dug this hour (the mine refills every hour)
// MR = the numbers. THE SAME NUMBERS LIVE IN mine.js (the phone draws the hits from them): change both.
const MR = {
  picks: [{ id: 'wood', price: 0, pow: 1 }, { id: 'stone', price: 50, pow: 2 }, { id: 'iron', price: 200, pow: 3 }, { id: 'steel', price: 700, pow: 5 }, { id: 'gold', price: 2500, pow: 8 }, { id: 'diamond', price: 3500, cry: 5, pow: 12 }],   // (25 Nov, his ask) the diamond pickaxe is CRAFTED: 3500 coins + 5 crystals
  levels: 12, lvmul: [1, 1.3, 1.7, 2.2, 2.8, 3.5, 4.4, 5.4, 6.6, 8, 9.6, 11.5],   // (25 Nov, his ask) 12 levels, two to a pickaxe (need)
  hp: { s: 3, g: 4, r: 6, w: 4, G: 5, R: 7, e: 30, u: 36, d: 44 },   // s stone, g gold rock, r rich rock, w plain wall, G gold vein, R rich vein, e emerald, u ruby, d diamond
  rocks: 16, veins: 8, rockOdds: [[70, 28, 2], [64, 32, 4], [58, 36, 6], [53, 38, 9], [48, 40, 12], [44, 41, 15], [40, 42, 18], [36, 43, 21], [32, 44, 24], [28, 45, 27], [24, 45, 31], [20, 45, 35]],
  cryFrom: 7, cryOdds: [0, 0, 0, 0, 0, 0, .002, .003, .005, .007, .011, .015], cryMix: [0, 0, 0, 0, 0, 0, [90, 10, 0], [80, 20, 0], [70, 25, 5], [62, 30, 8], [50, 35, 15], [40, 38, 22]], cryYield: { e: 1, u: 2, d: 4 }, cryKeep: 3,
  goldMul: [1, 1.25, 1.5, 1.8, 2.1, 2.5, 3, 3.5, 4, 4.6, 5.3, 6],   // round 3 (his note): gold rocks and veins pay this many times more per level
  bait: { n: 5, price: 150, max: 20 },   // (26 Nov) GLIMMER BAIT, sold by Pip once he is mended (gbuy): this many for this many coins, and the most you can carry
  fallLoss: .2,       // (25 Nov) passing out in the mine (mfall) costs this share of the gold chunks you carry
  dayGold: 1000, dayCry: 10,   /* (26 Nov, his call) the mine fills up again every HOUR, not every day, and holds more: was 600 gold a day */ cryGold: 150, smeltIn: 10, smeltOut: 15, smeltMs: 300000, smeltPer: 60000, smeltMax: 1800000, smeltCool: 600000, swingMs: 520,   // smeltMs: the Blacksmith takes 5 minutes over 10 chunks, smeltPer more for every 10 after that, never over smeltMax; smeltCool: his rest after a job is done (26 Nov)
  quick: .7,          // a break may come this much sooner than its swings take (lag), no sooner
  wallsPerLevel: 140  // plain walls you can dig in one visit to a level (the cave is 22 x 17)
};
const isCry = k => k === 'e' || k === 'u' || k === 'd';
const smeltDur = lots => Math.min(MR.smeltMax, MR.smeltMs + (lots - 1) * MR.smeltPer);   // how long he takes over this many lots of 10
const need = lv => (lv - 1) >> 1;   // the pickaxe a level asks for: wood 1-2, stone 3-4, iron 5-6, steel 7-8, gold 9-10, diamond 11-12
const hits = (k, lv, pick) => Math.max(1, Math.ceil(MR.hp[k] * (isCry(k) ? 1 : MR.lvmul[lv - 1]) / MR.picks[pick].pow));
const roll = odds => { let r = Math.random() * 100; for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r < 0) return i; } return 0; };

module.exports = ({ tx, spend, bad, dayKey, flag }) => {
  const kit = w => { const K = w.kit; K.gold = K.gold | 0; K.cry = K.cry | 0; K.pick = Math.min(MR.picks.length - 1, Math.max(0, K.pick | 0)); K.cs = typeof K.cs === 'string' ? K.cs.replace(/[^eud]/g, '').slice(0, MR.cryKeep) : ''; return K; };
  const hourKey = () => 'h' + Math.floor(Date.now() / 3600000);   // the mine's limits run per clock hour (26 Nov, his call)
  const today = w => { const k = hourKey(); if (w.day.md !== k) { w.day.md = k; w.day.m = 0; w.day.mc = 0; } w.day.m = w.day.m | 0; w.day.mc = w.day.mc | 0; };
  const quick = uid => async e => { if (e && e.message === 'Too quick.') await flag(uid, 'mined too fast'); throw e; };
  return {
    // into a level (down the shaft, back up the ladder, or in from outside): what is in it
    mgo: (uid, d) => tx(uid, w => {
      const K = kit(w), lv = d.lv | 0; if (!(lv >= 1 && lv <= MR.levels)) bad('No such level.');
      if (K.pick < need(lv)) bad('You need a better pickaxe to go deeper.');
      const now = Date.now(); if (w.mine && now - (w.mine.g || 0) < 700) bad('Slow down.');
      let k = ''; for (let i = 0; i < MR.rocks; i++) k += 'sgr'[roll(MR.rockOdds[lv - 1])];
      for (let i = 0; i < MR.veins; i++) k += Math.random() * 100 < 10 + lv * 6 ? 'R' : 'G';
      if (lv >= MR.cryFrom) k += K.cs;
      w.mine = { lv, k, t: now, g: now, n: 0 }; return { lv, k };
    }),
    // one thing broken: i = its place in the level's list, or -1 = a plain piece of wall
    mbreak: (uid, d) => tx(uid, w => {
      const K = kit(w), M = w.mine; if (!M || typeof M.k !== 'string') bad('You are not in the mine.');
      const lv = M.lv | 0, i = Number.isInteger(d.i) ? d.i : -1; let k = 'w';
      if (!(lv >= 1 && lv <= MR.levels) || K.pick < need(lv)) bad('You are not in the mine.');   // a level remembered from the old 5 can never be one your pickaxe does not reach
      if (i >= 0) { k = M.k[i]; if (!k || k === '.') bad('That is already dug out.'); }
      else { M.n = (M.n | 0) + 1; if (M.n > MR.wallsPerLevel) bad('That is already dug out.'); }
      if (isCry(k) && K.pick < 4) bad('Only a gold pickaxe can break crystal.');   // gold or better
      const now = Date.now(); if (now - (M.t || 0) < hits(k, lv, K.pick) * MR.swingMs * MR.quick) bad('Too quick.'); M.t = now;
      if (i >= 0) M.k = M.k.slice(0, i) + '.' + M.k.slice(i + 1);
      today(w); const r = Math.random(); let got = 0, gc = 0;
      if (isCry(k)) { gc = Math.max(0, Math.min(MR.cryYield[k], MR.dayCry - w.day.mc)); K.cs = K.cs.replace(k, ''); }
      else {
        got = k === 's' ? (r < .2 ? 1 : 0) : k === 'w' ? (r < .08 ? 1 : 0) : k === 'g' ? 1 + (r < .35 ? 1 : 0) : k === 'r' ? 2 + Math.floor(r * 3) : k === 'G' ? 2 + (r < .3 ? 1 : 0) : 3 + Math.floor(r * 3);
        if ('grGR'.includes(k)) got = Math.floor(got * MR.goldMul[lv - 1] + Math.random());   // deeper: more in the same rock
        got = Math.max(0, Math.min(got, MR.dayGold - w.day.m));
      }
      w.day.m += got; K.gold += got; w.day.mc += gc; K.cry += gc;
      // now and then, deep down, a crystal rock sits under what you broke. It is kept for you (kit.cs) until you break it.
      let grow = null;
      if (!isCry(k) && lv >= MR.cryFrom && K.cs.length < MR.cryKeep && M.k.length < 60 && Math.random() < MR.cryOdds[lv - 1]) { const c = 'eud'[roll(MR.cryMix[lv - 1])]; K.cs += c; grow = { i: M.k.length, k: c }; M.k += c; }
      return { got, gc, gold: K.gold, cry: K.cry, grow, cap: w.day.m >= MR.dayGold };
    }).catch(quick(uid)),
    // PASSED OUT (25 Nov, his ask: risk in the deep levels): no hearts left, so you drop a fifth of the gold chunks you carry (never
    // crystals, never coins) and are outside again. The phone only says that it happened: how much goes is worked out here.
    mfall: (uid) => tx(uid, w => {
      const K = kit(w); if (!w.mine) bad('You are not in the mine.');
      const lost = Math.floor(K.gold * MR.fallLoss); K.gold -= lost; delete w.mine; return { lost, gold: K.gold };
    }),
    // GLIMMER BAIT (26 Nov 2026): Pip sells it once he is mended (quest step 4, functions/quest.js). Asked from level 12, where his den is
    // (the same rule as qheal); never more than you can carry; the coins go with the game's own spend
    gbuy: (uid) => tx(uid, w => {
      const K = kit(w), B = MR.bait; if (!w.q || (w.q.s | 0) < 4) bad('Not yet.');
      if (!w.mine || (w.mine.lv | 0) !== MR.levels) bad('You are not there.');
      const have = Math.max(0, K.gb | 0); if (have + B.n > B.max) bad('You cannot carry more bait.');
      spend(w, B.price); K.gb = have + B.n; return { gb: K.gb };
    }),
    // the Blacksmith sells pickaxes: you keep the best one you have bought
    mpick: (uid, d) => tx(uid, w => {
      const K = kit(w), t = MR.picks.findIndex(p => p.id === d.id); if (t < 0) bad('No such pickaxe.');
      if (K.pick >= t) return { pick: K.pick };
      const P = MR.picks[t]; if (P.cry && K.cry < P.cry) bad('You need ' + P.cry + ' crystals.');
      spend(w, P.price); if (P.cry) K.cry -= P.cry; K.pick = t; return { pick: t, cry: K.cry };
    }),
    // crystals for gold chunks at the Blacksmith's
    mcry: (uid, d) => tx(uid, w => {
      const K = kit(w), n = d.n | 0; if (!(n >= 1) || n > K.cry) bad('You have no crystals.');
      K.cry -= n; K.gold += n * MR.cryGold; return { got: n * MR.cryGold, gold: K.gold, cry: K.cry };
    }),
    // SMELTING IS A JOB (round 2, his ask): he takes every 10 chunks you carry now and the coins are ready 5 minutes later (smeltGet).
    // One job at a time. The phone draws him at the forge, the water and the anvil from the job's start time.
    // (26 Nov, his asks) d.n = how many lots of 10 you hand him (nothing sent = all you carry, as before); a bigger job takes longer
    // (smeltDur); and he rests for smeltCool after a job is DONE (start + its time, not when you collect) before he takes another.
    smelt: (uid, d) => tx(uid, w => {
      const K = kit(w), now = Date.now(); if (K.sm) bad('He is still working on your gold.');
      const wait = (+K.smd || 0) + MR.smeltCool - now; if (wait > 0) bad('He is resting. Come back in ' + Math.ceil(wait / 60000) + ' min.');
      const max = Math.floor(K.gold / MR.smeltIn); if (!max) bad('You need ' + MR.smeltIn + ' gold chunks.');
      const lots = d && d.n != null ? d.n : max; if (!Number.isInteger(lots) || lots < 1 || lots > max) bad('You do not have that much gold.');
      K.gold -= lots * MR.smeltIn; K.sm = { c: lots * MR.smeltOut, t: now, d: smeltDur(lots) }; return { job: K.sm, gold: K.gold, now };
    }),
    smeltGet: (uid) => tx(uid, w => {
      const K = kit(w), J = K.sm; if (!J) bad('He has nothing of yours.');
      const dur = J.d > 0 ? +J.d : MR.smeltMs, done = (+J.t || 0) + dur;
      if (Date.now() < done) bad('Your coins are not ready yet.');
      const c = Math.max(0, J.c | 0); w.c += c; delete K.sm; K.smd = done; return { coins: c, smd: done };
    }),
  };
};
