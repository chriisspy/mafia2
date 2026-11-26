// THE GLIMMERKIN (25 Nov 2026, his secret hunt): one quest a player, kept on the wallet and moved on ONLY here, one step at a time.
//   wallet: q = { s: step, moon, fang, hc, hearth, ember }   (batch 3: a 1 beside s for each Keystone you hold; hc = the Hearth stone, still cracked)
//   THE STEPS (s)                                             the op that moves you ON TO that step
//     0  nothing found yet
//     1  the crack on mine level 12 is broken open            qcrack   (you must be on level 12)
//     2  met Pip; you carry the Moon Snips                    qpip     (you must be on level 12)
//     3  Moonmoss cut in the Forgotten Forest                 qmoss    (asked from the forest: d.at = 107)
//     4  Pip is healed; you carry the torn map and Glow Bait  qheal    (you must be on level 12)
//     5  all four Keystones found (Moon, Fang, Hearth, Ember) the last of the four, in any order (all of them need step 4):
//          moon    fished up off the end of the lake's jetty      qmoon    (asked from the lake: d.at = 102)
//          fang    the firefly path in the forest's glade         qfang    (asked from the forest: d.at = 107)
//          hc      the Hearth stone, picked up CRACKED            qhcrack  (asked from the forest: d.at = 107)
//          hearth  the Blacksmith's forge mends it                qforge   (asked from the smithy: d.at = 104; you must hold hc)
//          ember   across the lava on mine level 11               qember   (you must be on level 11)
//     6  the temple is open                                   qopen    (asked from the temple's hollow: d.at = 108; the four stones set in the mural's order)
//     7  the King has thanked you; the reward is yours        qking    (asked from the throne hall: d.at = 109). That once it puts the three rewards in the wallet:
//          own.stag (the Forest Warden outfit, rarity Secret), own.r_temple (the Temple cabin: room and hut), dec.keystoneplaque (the wall plaque)
//        Nothing else anywhere gives these: no case, wheel, shop or stall (catalog.json: rar 'secret', decor quest).
// An op asked for again after its step is done changes nothing and gives nothing; asked for too early it is refused.
const MINE_BOTTOM = 12;   // MR.levels in functions/mine.js
const FOREST = 107;       // the Forgotten Forest's place in the game (forest.js: 100 + its spot in HALLS)
const LAKE = 102, SMITHY = 104, EMBER_LV = 11;   // the lake (index.html), the Blacksmith's (south.js), the lava level the Ember stone is on
const HOLLOW = 108;       // the hollow the temple stands in (temple.js: the place after the forest)
const THRONE = 109;       // the throne hall inside the temple (temple.js: the place after the hollow)
const REWARD = { own: ['stag', 'r_temple'], dec: ['keystoneplaque'] };   // what the King gives: an outfit and a cabin (wallet.own), a decoration (wallet.dec)
const STONES = ['moon', 'fang', 'hearth', 'ember'];
module.exports = ({ tx, bad }) => {
  const quest = w => { const Q = w.q && typeof w.q === 'object' ? w.q : (w.q = { s: 0 }); Q.s = Math.max(0, Q.s | 0); return Q; };
  const atBottom = w => { if (!w.mine || (w.mine.lv | 0) !== MINE_BOTTOM) bad('You are not there.'); };
  // batch 3, one Keystone: the place is checked first, then the order (nothing before Pip is mended, and whatever else that stone needs);
  // the flag is set once (got), and the fourth one held moves the hunt on to step 5. k = what you hold now, for the game to draw
  const stone = (flag, here, need) => (uid, d) => tx(uid, w => { const Q = quest(w); if (!here(w, d || {})) bad('You are not there.'); if (Q.s < 4 || (need && !Q[need])) bad('Not yet.');
    const got = !Q[flag] && !(flag === 'hc' && Q.hearth); if (got) Q[flag] = 1; if (Q.s === 4 && STONES.every(k => Q[k])) Q.s = 5;
    return { s: Q.s, got, k: { moon: Q.moon ? 1 : 0, fang: Q.fang ? 1 : 0, hc: Q.hc ? 1 : 0, hearth: Q.hearth ? 1 : 0, ember: Q.ember ? 1 : 0 } }; });
  const at = n => (w, d) => (d.at | 0) === n;
  return {
    qcrack: (uid) => tx(uid, w => { const Q = quest(w); atBottom(w); if (Q.s < 1) Q.s = 1; return { s: Q.s }; }),
    // Pip's first talk is over: he hands you the Moon Snips, once
    qpip: (uid) => tx(uid, w => { const Q = quest(w); atBottom(w); if (Q.s < 1) bad('Not yet.'); const got = Q.s === 1; if (got) Q.s = 2; return { s: Q.s, got }; }),
    // Moonmoss, cut with the snips. Where you stand in the town and its places is not on the wallet (it lives in the lobby), so the game
    // says which place it asks from; what is really checked here is the order: no snips, no moss
    qmoss: (uid, d) => tx(uid, w => { const Q = quest(w); if (((d && d.at) | 0) !== FOREST) bad('You are not there.'); if (Q.s < 2) bad('Not yet.'); const got = Q.s === 2; if (got) Q.s = 3; return { s: Q.s, got }; }),
    // back down to Pip with the moss: he is mended, and hands over the torn map and the Glow Bait, once
    qheal: (uid) => tx(uid, w => { const Q = quest(w); atBottom(w); if (Q.s < 3) bad('Not yet.'); const got = Q.s === 3; if (got) Q.s = 4; return { s: Q.s, got }; }),
    // THE FOUR KEYSTONES. Like the moss, the lake, the forest and the smithy are not on the wallet: the game says where it asks from
    qmoon: stone('moon', at(LAKE)),
    qfang: stone('fang', at(FOREST)),
    qhcrack: stone('hc', at(FOREST)),            // the Hearth stone as you find it: cracked. Not one of the four until it is mended
    qforge: stone('hearth', at(SMITHY), 'hc'),   // no cracked stone, nothing for the forge to mend
    qember: stone('ember', w => !!w.mine && (w.mine.lv | 0) === EMBER_LV),
    // batch 4, THE TEMPLE: the four stones are set on the altar in the mural's order (the game plays that out; the order is no secret worth guarding,
    // it is carved on the mural). What is checked here is the hunt's own order: no doors before all four stones are held. Once open, open for good
    qopen: (uid, d) => tx(uid, w => { const Q = quest(w); if (((d && d.at) | 0) !== HOLLOW) bad('You are not there.'); if (Q.s < 5) bad('Not yet.'); const got = Q.s === 5; if (got) Q.s = 6; return { s: Q.s, got }; }),
    // batch 5, THE REWARD: the King's last line is put away. Asked from the throne hall, never before the doors are open; the step moves 6 -> 7 once, and only
    // that once are the three things put in the wallet (in the same transaction as the step, so they can never be given twice or half given)
    qking: (uid, d) => tx(uid, w => { const Q = quest(w); if (((d && d.at) | 0) !== THRONE) bad('You are not there.'); if (Q.s < 6) bad('Not yet.'); const got = Q.s === 6;
      if (got) { Q.s = 7; for (const id of REWARD.own) w.own[id] = 1; w.dec = w.dec || {}; for (const id of REWARD.dec) w.dec[id] = (w.dec[id] || 0) + 1; }
      return { s: Q.s, got }; }),
  };
};
