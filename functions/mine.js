// THE MINE + THE BLACKSMITH (24 Nov 2026, his ask): levels, pickaxes, gold chunks, crystals. Cheat-proof like the fishing:
// the server decides what is in a level (mgo hands the phone a list of rocks and wall veins and keeps a copy), every break is
// one roll here, a rock cannot be broken twice, a break cannot come sooner than its swings take, and a day has a top.
//   wallet: kit.gold  gold chunks (the Blacksmith smelts 10 into 5 coins)
//           kit.cry   crystals (the new currency)        kit.pick  your best pickaxe, 0..4 (wood, stone, iron, steel, gold)
//           kit.sm    your gold at the Blacksmith's: { c: coins it makes, t: when he started }; ready 5 minutes later
//           kit.cs    crystal rocks found but not broken yet, up to 3 ("eud" letters): they wait for you on levels 4 and 5
//           mine = { lv, k, t }  the level you are in: k = one letter per thing ('.' = dug out), t = when the last break was
//           day.md / day.m / day.mc   today's date, gold chunks dug today, crystals dug today
// MR = the numbers. THE SAME NUMBERS LIVE IN mine.js (the phone draws the hits from them): change both.
const MR = {
  picks: [{ id: 'wood', price: 0, pow: 1 }, { id: 'stone', price: 50, pow: 2 }, { id: 'iron', price: 200, pow: 3 }, { id: 'steel', price: 700, pow: 5 }, { id: 'gold', price: 2500, pow: 8 }],
  levels: 5, lvmul: [1, 1.6, 2.4, 3.6, 5],
  hp: { s: 3, g: 4, r: 6, w: 4, G: 5, R: 7, e: 30, u: 36, d: 44 },   // s stone, g gold rock, r rich rock, w plain wall, G gold vein, R rich vein, e emerald, u ruby, d diamond
  rocks: 16, veins: 8, rockOdds: [[70, 28, 2], [58, 36, 6], [48, 40, 12], [40, 42, 18], [32, 44, 24]],
  cryOdds: [0, 0, 0, .003, .008], cryMix: [0, 0, 0, [75, 25, 0], [60, 30, 10]], cryYield: { e: 1, u: 2, d: 4 }, cryKeep: 3,
  goldMul: [1, 1.5, 2, 3, 4],   // round 3 (his note): gold rocks and veins pay this many times more per level
  dayGold: 400, dayCry: 6, cryGold: 150, smeltIn: 10, smeltOut: 5, smeltMs: 300000, swingMs: 520,   // smeltMs: the Blacksmith takes 5 minutes over your gold
  quick: .7,          // a break may come this much sooner than its swings take (lag), no sooner
  wallsPerLevel: 140  // plain walls you can dig in one visit to a level (the cave is 22 x 17)
};
const isCry = k => k === 'e' || k === 'u' || k === 'd';
const hits = (k, lv, pick) => Math.max(1, Math.ceil(MR.hp[k] * (isCry(k) ? 1 : MR.lvmul[lv - 1]) / MR.picks[pick].pow));
const roll = odds => { let r = Math.random() * 100; for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r < 0) return i; } return 0; };

module.exports = ({ tx, spend, bad, dayKey, flag }) => {
  const kit = w => { const K = w.kit; K.gold = K.gold | 0; K.cry = K.cry | 0; K.pick = Math.min(MR.picks.length - 1, Math.max(0, K.pick | 0)); K.cs = typeof K.cs === 'string' ? K.cs.replace(/[^eud]/g, '').slice(0, MR.cryKeep) : ''; return K; };
  const today = w => { const k = dayKey(); if (w.day.md !== k) { w.day.md = k; w.day.m = 0; w.day.mc = 0; } w.day.m = w.day.m | 0; w.day.mc = w.day.mc | 0; };
  const quick = uid => async e => { if (e && e.message === 'Too quick.') await flag(uid, 'mined too fast'); throw e; };
  return {
    // into a level (down the shaft, back up the ladder, or in from outside): what is in it
    mgo: (uid, d) => tx(uid, w => {
      const K = kit(w), lv = d.lv | 0; if (!(lv >= 1 && lv <= MR.levels)) bad('No such level.');
      if (K.pick < lv - 1) bad('You need a better pickaxe to go deeper.');
      const now = Date.now(); if (w.mine && now - (w.mine.g || 0) < 700) bad('Slow down.');
      let k = ''; for (let i = 0; i < MR.rocks; i++) k += 'sgr'[roll(MR.rockOdds[lv - 1])];
      for (let i = 0; i < MR.veins; i++) k += Math.random() * 100 < 10 + lv * 10 ? 'R' : 'G';
      if (lv >= 4) k += K.cs;
      w.mine = { lv, k, t: now, g: now, n: 0 }; return { lv, k };
    }),
    // one thing broken: i = its place in the level's list, or -1 = a plain piece of wall
    mbreak: (uid, d) => tx(uid, w => {
      const K = kit(w), M = w.mine; if (!M || typeof M.k !== 'string') bad('You are not in the mine.');
      const lv = M.lv | 0, i = Number.isInteger(d.i) ? d.i : -1; let k = 'w';
      if (i >= 0) { k = M.k[i]; if (!k || k === '.') bad('That is already dug out.'); }
      else { M.n = (M.n | 0) + 1; if (M.n > MR.wallsPerLevel) bad('That is already dug out.'); }
      if (isCry(k) && K.pick < MR.picks.length - 1) bad('Only a gold pickaxe can break crystal.');
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
      if (!isCry(k) && lv >= 4 && K.cs.length < MR.cryKeep && M.k.length < 60 && Math.random() < MR.cryOdds[lv - 1]) { const c = 'eud'[roll(MR.cryMix[lv - 1])]; K.cs += c; grow = { i: M.k.length, k: c }; M.k += c; }
      return { got, gc, gold: K.gold, cry: K.cry, grow, cap: w.day.m >= MR.dayGold };
    }).catch(quick(uid)),
    // the Blacksmith sells pickaxes: you keep the best one you have bought
    mpick: (uid, d) => tx(uid, w => {
      const K = kit(w), t = MR.picks.findIndex(p => p.id === d.id); if (t < 0) bad('No such pickaxe.');
      if (K.pick >= t) return { pick: K.pick };
      spend(w, MR.picks[t].price); K.pick = t; return { pick: t };
    }),
    // crystals for gold chunks at the Blacksmith's
    mcry: (uid, d) => tx(uid, w => {
      const K = kit(w), n = d.n | 0; if (!(n >= 1) || n > K.cry) bad('You have no crystals.');
      K.cry -= n; K.gold += n * MR.cryGold; return { got: n * MR.cryGold, gold: K.gold, cry: K.cry };
    }),
    // SMELTING IS A JOB (round 2, his ask): he takes every 10 chunks you carry now and the coins are ready 5 minutes later (smeltGet).
    // One job at a time. The phone draws him at the forge, the water and the anvil from the job's start time.
    smelt: (uid) => tx(uid, w => {
      const K = kit(w); if (K.sm) bad('He is still working on your gold.');
      const lots = Math.floor(K.gold / MR.smeltIn); if (!lots) bad('You need ' + MR.smeltIn + ' gold chunks.');
      K.gold -= lots * MR.smeltIn; K.sm = { c: lots * MR.smeltOut, t: Date.now() }; return { job: K.sm, gold: K.gold, now: Date.now() };
    }),
    smeltGet: (uid) => tx(uid, w => {
      const K = kit(w), J = K.sm; if (!J) bad('He has nothing of yours.');
      if (Date.now() - (J.t || 0) < MR.smeltMs) bad('Your coins are not ready yet.');
      const c = Math.max(0, J.c | 0); w.c += c; delete K.sm; return { coins: c };
    }),
  };
};
