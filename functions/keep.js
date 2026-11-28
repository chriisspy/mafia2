// REASONS TO COME BACK (28 Nov 2026, his ask; batch 1 of the plan): the 7-DAY STREAK and the DAILY TASKS.
//
// THE STREAK takes the place of the flat daily coins. wallet.day.c = the day you last collected (as before), wallet.day.n = which day of the streak that was
//   (1..7). Collect on the day after and it is the next day; miss a day and it is day 1 again (his pick; nothing ever buys a missed day back). After
//   day 7 it starts over. Day 7 also gives one free case (wallet.fc, the same free cases the leaderboard gives).
//
// THE TASKS: three a day, one easy, one middling, one hard (his rule: "it needs to be a little hard to do all 3 if you're getting a crystal"). Which
//   three is fixed by the day and the player, so it cannot be re-rolled. wallet.tk = { k: day, ids: [3 task ids], p: {id: how many done},
//   d: {id: 1 = paid}, b: 1 = the bonus is paid }. A task counts the ops you really do on the server (a fish landed, a rock broken, a slot spin...):
//   bump() is called by tx() in index.js inside the same wallet write as the op itself, so it costs nothing extra and cannot be faked from the phone.
//   Each task pays coins; all three paid = one crystal.
//
// CRYSTAL SHARDS (28 Nov, his idea): kit.sh. A piece of a crystal: the middling task also gives 1, the hard one 2. The Blacksmith puts SHARDS_PER of
//   them together into one whole crystal (op forge). So a day's three tasks = 3 shards + the crystal for doing them all.
//
// SETS (his pick: "a title and an item"): finish a set and you may collect its TITLE (wallet.ti = {set: 1}); wallet.title = the one you wear. The server
//   counts each set itself from what the wallet really holds. The title you wear is also written on your leaderboard card (lb/{uid}/ti) for the others to
//   see. The ITEM each set gives is not here yet: it needs new art, which he approves first.
// The phone carries the same list for the words (keep.js: KEEP_TASKS). Change one, change the other.
module.exports = ({ tx, bad, C, dayKey, db }) => {
  const SHARDS_PER = 5, SHARDS = [0, 1, 2];   // shards in a crystal; shards a task gives, by its level
  const STREAK = [100, 150, 200, 250, 300, 400, 500];   // coins for day 1..7 (1,900 a week; the flat 250 a day was 1,750). Day 7 adds a free case.
  const prevKey = k => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) - 864e5).toISOString().slice(0, 10);
  // id: [op that counts, how many, level 0 easy / 1 middling / 2 hard, coins]
  const TASKS = {
    fish3: ['fland', 3, 0, 40], flip2: ['flip', 2, 0, 40], slot5: ['slot', 5, 0, 40], wheel1: ['wheel', 1, 0, 40], beer1: ['beer', 1, 0, 40], rock15: ['mbreak', 15, 0, 40],
    fish8: ['fland', 8, 1, 90], rock40: ['mbreak', 40, 1, 90], slot15: ['slot', 15, 1, 90], click2: ['ckend', 2, 1, 90], flip5: ['flip', 5, 1, 90],
    fish20: ['fland', 20, 2, 160], rock120: ['mbreak', 120, 2, 160], slot40: ['slot', 40, 2, 160], click5: ['ckend', 5, 2, 160], case1: ['case', 1, 2, 160],
  };
  const BY_LV = [0, 1, 2].map(l => Object.keys(TASKS).filter(k => TASKS[k][2] === l));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16; return h >>> 0; };   // mixed well, so the three picks do not move together
  // today's three: one of each level, never two that count the same thing (or one afternoon's fishing would finish them all)
  const pick = (day, uid) => { const out = [], used = new Set();
    for (let l = 0; l < 3; l++) { const pool = BY_LV[l].filter(k => !used.has(TASKS[k][0])), k = pool[hash(day + '|' + uid + '|' + l) % pool.length]; out.push(k); used.add(TASKS[k][0]); }
    return out; };
  const today = (w, uid) => { const k = dayKey(); if (!w.tk || w.tk.k !== k) w.tk = { k, ids: pick(k, uid), p: {}, d: {} }; w.tk.p = w.tk.p || {}; w.tk.d = w.tk.d || {}; return w.tk; };
  // called by tx() after an op has changed the wallet: one more towards any of today's tasks that count that op
  const OPSET = new Set(Object.values(TASKS).map(t => t[0]));
  const bump = (w, uid, op) => { if (!OPSET.has(op)) return; const T = today(w, uid);
    for (const id of T.ids) { const t = TASKS[id]; if (t && t[0] === op && (T.p[id] | 0) < t[1]) T.p[id] = (T.p[id] | 0) + 1; } };
  // SETS: id: [the title, w => [how many you have, how many there are]]. The phone carries the same names (keep.js: KEEP_SETS).
  const rar = r => w => { const L = C.skins.filter(x => x.rar === r); return [L.filter(x => w.own[x.id]).length, L.length]; };
  const PICK_MAX = 5;   // kit.pick of the diamond pickaxe, the last in functions/mine.js picks
  const SETS = {
    rods: ['Master Angler', w => [C.rods.filter(r => (w.kit.rods || {})[r.id]).length, C.rods.length]],
    fish: ['Fish Whisperer', w => [C.fishes.filter(f => (w.kit.fc || {})[f.id]).length, C.fishes.length]],
    pick: ['Gold Digger', w => [Math.min(w.kit.pick | 0, PICK_MAX), PICK_MAX]],
    common: ['Regular', rar('common')], rare: ['Head Turner', rar('rare')], epic: ['Showstopper', rar('epic')], legendary: ['Legend', rar('legendary')],
  };
  const ops = {
    daily: (uid) => tx(uid, w => { const k = dayKey(); if (w.day.c === k) bad('Already collected today.');
      const n = w.day.c === prevKey(k) ? ((w.day.n | 0) % 7) + 1 : 1, got = STREAK[n - 1]; w.day.c = k; w.day.n = n; w.c += got;
      let kase = null; if (n === 7) { kase = Object.keys(C.cases)[0]; w.fc = w.fc || {}; w.fc[kase] = (w.fc[kase] | 0) + 1; }
      return { got, day: n, kase }; }),
    tkSync: (uid) => tx(uid, w => { today(w, uid); return {}; }),   // makes today's three (the Daily screen asks when it opens)
    tkClaim: (uid, d) => tx(uid, w => { const T = today(w, uid), id = String(d.id || ''), t = TASKS[id]; if (!t || !T.ids.includes(id)) bad('Not one of today\'s tasks.');
      if ((T.p[id] | 0) < t[1]) bad('Not done yet.'); if (T.d[id]) bad('Already collected.'); T.d[id] = 1; w.c += t[3]; const sh = SHARDS[t[2]]; if (sh) w.kit.sh = (w.kit.sh | 0) + sh; return { got: t[3], sh }; }),
    tkBonus: (uid) => tx(uid, w => { const T = today(w, uid); if (T.b) bad('Already collected.'); if (!T.ids.every(id => T.d[id])) bad('Finish all three first.');
      T.b = 1; w.kit.cry = (w.kit.cry | 0) + 1; return { cry: 1 }; }),
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
