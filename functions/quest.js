// THE GLIMMERKIN (25 Nov 2026, his secret hunt): one quest a player, kept on the wallet and moved on ONLY here, one step at a time.
//   wallet: q = { s: step }   (later batches add what they need beside s: keystone flags and so on)
//   THE STEPS (s)                                             the op that moves you ON TO that step
//     0  nothing found yet
//     1  the crack on mine level 12 is broken open            qcrack   (you must be on level 12)
//     2  met Pip; you carry the Moon Snips                    qpip     (you must be on level 12)
//     3  Moonmoss cut in the Forgotten Forest                 (batch 2)
//     4  Pip is healed; you carry the torn map and Glow Bait  (batch 2)
//     5  all four Keystones found (Moon, Fang, Hearth, Ember) (batch 3: each one its own flag, any order)
//     6  the temple is open                                   (batch 4)
//     7  the King has thanked you; the reward is yours        (batch 5)
// An op asked for again after its step is done changes nothing and gives nothing; asked for too early it is refused.
const MINE_BOTTOM = 12;   // MR.levels in functions/mine.js
module.exports = ({ tx, bad }) => {
  const quest = w => { const Q = w.q && typeof w.q === 'object' ? w.q : (w.q = { s: 0 }); Q.s = Math.max(0, Q.s | 0); return Q; };
  const atBottom = w => { if (!w.mine || (w.mine.lv | 0) !== MINE_BOTTOM) bad('You are not there.'); };
  return {
    qcrack: (uid) => tx(uid, w => { const Q = quest(w); atBottom(w); if (Q.s < 1) Q.s = 1; return { s: Q.s }; }),
    // Pip's first talk is over: he hands you the Moon Snips, once
    qpip: (uid) => tx(uid, w => { const Q = quest(w); atBottom(w); if (Q.s < 1) bad('Not yet.'); const got = Q.s === 1; if (got) Q.s = 2; return { s: Q.s, got }; }),
  };
};
