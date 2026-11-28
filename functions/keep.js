// REASONS TO COME BACK (28 Nov 2026, his ask; batch 1 of the plan): the 7-DAY STREAK, the DAILY TASKS, CRYSTAL SHARDS and SETS.
//
// THE STREAK takes the place of the flat daily coins. wallet.day.c = the day you last collected (as before), wallet.day.n = which day of the streak that was
//   (1..7). Collect on the day after and it is the next day; miss a day and it is day 1 again (his pick; nothing ever buys a missed day back). After
//   day 7 it starts over. Day 7 also gives one free case (wallet.fc, the same free cases the leaderboard gives).
//
// THE TASKS: three a day, one easy, one middling, one hard, for coins. Which three is fixed by the day and the player, so it cannot be re-rolled.
//   wallet.tk = { k: day, ids: [3 task ids, then the challenge's id], p: {id: how far}, d: {id: 1 = paid}, b: 1 = the bonus is paid }.
//   A task counts what you really do on the server (a fish landed, a rock broken, coins won at the casino...): bump() is called by tx() in index.js
//   inside the same wallet write as the op itself, so it costs nothing extra and cannot be faked from the phone.
//
// THE CRYSTAL CHALLENGE (28 Nov, his rule: "you only get crystals if the daily mission is genuinely hard... crystals should be really high value"):
//   a FOURTH task each day, level 3, and the only thing here that pays a whole crystal. It is meant to take most of a day's play.
//   (He asked for "come 1st in 10 races": there are no races against other players on the server yet, only laps, so that one is laps for now.)
//
// CRYSTAL SHARDS (his idea): kit.sh, a piece of a crystal. The hard task gives 1 and finishing all three ordinary tasks gives 1 more: two a day at the
//   very most. The Blacksmith puts SHARDS_PER of them together into one whole crystal (op forge).
//
// SETS (his pick: "a title and an item"): finish a set and you may collect its TITLE (wallet.ti = {set: 1}); wallet.title = the one you wear. The server
//   counts each set itself from what the wallet really holds. The title you wear is also written on your leaderboard card (lb/{uid}/ti) for the others to
//   see. The ITEM each set gives is not here yet: it needs new art, which he approves first.
// The phone carries the same lists for the words (keep.js: KEEP_TASKS, KEEP_SETS). Change one, change the other.
module.exports = ({ tx, bad, C, dayKey, db }) => {
  const SHARDS_PER = 5, HARD_SHARDS = 1, ALL_SHARDS = 1;   // shards in a crystal; what the hard task gives; what finishing all three gives
  const STREAK = [100, 150, 200, 250, 300, 400, 500];   // coins for day 1..7 (1,900 a week; the flat 250 a day was 1,750). Day 7 adds a free case.
  const prevKey = k => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) - 864e5).toISOString().slice(0, 10);
  const CASINO = ['flip', 'slot', 'bj', 'bjt'], rare = new Set(['rare', 'epic', 'legendary', 'secret']);
  const one = () => 1;
  // id: [ops that count, how much, level 0 easy / 1 middling / 2 hard / 3 THE CRYSTAL CHALLENGE, coins, (d, out, coins gained) => how much this op adds]
  const TASKS = {
    fish3: [['fland'], 3, 0, 40, one], flip2: [['flip'], 2, 0, 40, one], slot5: [['slot'], 5, 0, 40, one], wheel1: [['wheel'], 1, 0, 40, one], beer1: [['beer'], 1, 0, 40, one], rock15: [['mbreak'], 15, 0, 40, one],
    fish8: [['fland'], 8, 1, 90, one], rock40: [['mbreak'], 40, 1, 90, one], slot15: [['slot'], 15, 1, 90, one], click2: [['ckend'], 2, 1, 90, one], flip5: [['flip'], 5, 1, 90, one],
    fish20: [['fland'], 20, 2, 160, one], rock120: [['mbreak'], 120, 2, 160, one], slot40: [['slot'], 40, 2, 160, one], click5: [['ckend'], 5, 2, 160, one], case1: [['case'], 1, 2, 160, one],
    // the crystal challenges
    casino5k: [CASINO, 5000, 3, 0, (d, o, dc) => Math.max(0, dc)],                                   // win 5,000 coins at the casino (every winning hand, flip or spin adds what it won)
    flipwin6: [['flip'], 6, 3, 0, (d, o) => o && o.won ? 1 : 0],                                      // win 6 coin flips (5 flips every 20 minutes: at least two rounds, and luck)
    slotwin20: [['slot'], 20, 3, 0, (d, o) => o && o.win > 0 ? 1 : 0],                                // 20 winning spins
    fish40: [['fland'], 40, 3, 0, one],
    fishrare10: [['fland'], 10, 3, 0, (d, o) => o && C.fishes[o.k] && rare.has(C.fishes[o.k].rar) ? 1 : 0],
    rock300: [['mbreak'], 300, 3, 0, one],
    gold400: [['mbreak'], 400, 3, 0, (d, o) => Math.max(0, (o && o.got) | 0)],                        // gold chunks dug out
    smelt600: [['smeltGet'], 600, 3, 0, (d, o) => Math.max(0, (o && o.coins) | 0)],                   // coins collected from the Blacksmith
    click3: [['ckend'], 3, 3, 0, (d, o) => o && o.pay >= 500 ? 1 : 0],                                // the clicker's big run (50 points, 40 s) three times
    laps10: [['rlap'], 10, 3, 0, one],
    case3: [['case'], 3, 3, 0, one],
  };
  const BY_LV = [0, 1, 2, 3].map(l => Object.keys(TASKS).filter(k => TASKS[k][2] === l));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16; return h >>> 0; };   // mixed well, so the picks do not move together
  // today's three: one of each level, never two that count the same thing (or one afternoon's fishing would finish them all). Then the challenge.
  const pick = (day, uid) => { const out = [], used = new Set();
    for (let l = 0; l < 3; l++) { const pool = BY_LV[l].filter(k => !used.has(TASKS[k][0][0])), k = pool[hash(day + '|' + uid + '|' + l) % pool.length]; out.push(k); used.add(TASKS[k][0][0]); }
    out.push(BY_LV[3][hash(day + '|' + uid + '|c') % BY_LV[3].length]); return out; };
  const today = (w, uid) => { const k = dayKey(); if (!w.tk || w.tk.k !== k) w.tk = { k, ids: pick(k, uid), p: {}, d: {} };
    if (w.tk.ids.length < 4) w.tk.ids = [...w.tk.ids.slice(0, 3), pick(k, uid)[3]];   // a day that began before the challenge existed
    w.tk.p = w.tk.p || {}; w.tk.d = w.tk.d || {}; return w.tk; };
  // called by tx() after an op has changed the wallet: that op counts towards any of today's tasks it belongs to
  const OPSET = new Set(Object.values(TASKS).flatMap(t => t[0]));
  const bump = (w, uid, op, d, out, dc) => { if (!OPSET.has(op)) return; const T = today(w, uid);
    for (const id of T.ids) { const t = TASKS[id]; if (!t || !t[0].includes(op) || (T.p[id] | 0) >= t[1]) continue;
      let add = 0; try { add = t[4](d || {}, out, dc | 0) | 0; } catch (e) {} if (add > 0) T.p[id] = Math.min(t[1], (T.p[id] | 0) + add); } };
  // SETS: id: [the title, w => [how many you have, how many there are]]
  const rar = r => w => { const L = C.skins.filter(x => x.rar === r); return [L.filter(x => w.own[x.id]).length, L.length]; };
  const PICK_MAX = 5;   // kit.pick of the diamond pickaxe, the last in functions/mine.js picks
  const SETS = {
    rods: ['Master Angler', w => [C.rods.filter(r => (w.kit.rods || {})[r.id]).length, C.rods.length]],
    fish: ['Fish Whisperer', w => [C.fishes.filter(f => (w.kit.fc || {})[f.id]).length, C.fishes.length]],
    pick: ['Gold Digger', w => [Math.min(w.kit.pick | 0, PICK_MAX), PICK_MAX]],
    common: ['Regular', rar('common')], rare: ['Head Turner', rar('rare')], epic: ['Showstopper', rar('epic')], legendary: ['Legend', rar('legendary')],
  };
  // PETS (batch 2): bought with crystals (his rule), one follows you. The phone carries the same list (pets.js). The prices are mine.
  const PETS = { alien: 2, chicken: 3, golem: 8, dragon: 12 };
  const ops = {
    petBuy: (uid, d) => tx(uid, w => { const id = String(d.id || ''), c = PETS[id]; if (!c) bad('No such pet.'); w.pets = w.pets || {}; if (w.pets[id]) bad('You already have that pet.');
      if ((w.kit.cry | 0) < c) bad('You need ' + c + ' crystals.'); w.kit.cry -= c; w.pets[id] = 1; w.pet = id; return { pet: id, cry: w.kit.cry }; }),
    petSet: (uid, d) => tx(uid, w => { const id = String(d.id || ''); if (id && !(w.pets && w.pets[id])) bad('You do not have that pet.'); if (id) w.pet = id; else delete w.pet; return { pet: id }; }),
    daily: (uid) => tx(uid, w => { const k = dayKey(); if (w.day.c === k) bad('Already collected today.');
      const n = w.day.c === prevKey(k) ? ((w.day.n | 0) % 7) + 1 : 1, P = w.perk || {}, got = STREAK[n - 1] + (P.bakery ? 50 : 0); w.day.c = k; w.day.n = n; w.c += got;   // +50 with a world's Bakery (functions/build.js)
      if (P.monument) w.kit.sh = (w.kit.sh | 0) + 1;   // a world's Crystal Monument: one shard a day
      let kase = null; if (n === 7) { kase = Object.keys(C.cases)[0]; w.fc = w.fc || {}; w.fc[kase] = (w.fc[kase] | 0) + 1; }
      return { got, day: n, kase }; }),
    tkSync: (uid) => tx(uid, w => { today(w, uid); return {}; }),   // makes today's tasks (the Daily screen asks when it opens)
    tkClaim: (uid, d) => tx(uid, w => { const T = today(w, uid), id = String(d.id || ''), t = TASKS[id]; if (!t || !T.ids.includes(id)) bad('Not one of today\'s tasks.');
      if ((T.p[id] | 0) < t[1]) bad('Not done yet.'); if (T.d[id]) bad('Already collected.'); T.d[id] = 1;
      if (t[2] === 3) { w.kit.cry = (w.kit.cry | 0) + 1; return { cry: 1 }; }   // the challenge: the crystal
      w.c += t[3]; const sh = t[2] === 2 ? HARD_SHARDS : 0; if (sh) w.kit.sh = (w.kit.sh | 0) + sh; return { got: t[3], sh }; }),
    tkBonus: (uid) => tx(uid, w => { const T = today(w, uid); if (T.b) bad('Already collected.'); if (!T.ids.slice(0, 3).every(id => T.d[id])) bad('Finish all three first.');
      T.b = 1; w.kit.sh = (w.kit.sh | 0) + ALL_SHARDS; return { sh: ALL_SHARDS }; }),
    // the Blacksmith puts shards together: every SHARDS_PER you carry become a crystal
    forge: (uid) => tx(uid, w => { const K = w.kit, n = Math.floor((K.sh | 0) / SHARDS_PER); if (!n) bad('You need ' + SHARDS_PER + ' shards.'); K.sh -= n * SHARDS_PER; K.cry = (K.cry | 0) + n; return { cry: n, sh: K.sh }; }),
    sets: (uid) => tx(uid, w => ({ sets: Object.keys(SETS).map(id => { const [n, of] = SETS[id][1](w); return { id, n, of, got: !!(w.ti && w.ti[id]) }; }), title: w.title || '' })),
    setClaim: (uid, d) => tx(uid, w => { const id = String(d.id || ''), S = SETS[id]; if (!S) bad('No such set.'); const [n, of] = S[1](w); if (n < of) bad('Not finished yet.');
      w.ti = w.ti || {}; if (w.ti[id]) bad('Already collected.'); w.ti[id] = 1; return { title: S[0] }; }),
    titleSet: async (uid, d) => { const id = String(d.id || ''); if (id && !SETS[id]) bad('No such title.');
      await tx(uid, w => { if (id && !(w.ti && w.ti[id])) bad('You have not earned that title.'); if (id) w.title = id; else delete w.title; return {}; });
      await db.ref('lb/' + uid + '/ti').set(id ? SETS[id][0] : null).catch(() => {}); return { title: id }; },
  };
  return { ops, bump };
};
