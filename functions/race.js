// THE RACE TRACK (24 Nov 2026): the Mechanic's parts for your race car, and your best lap. The phone's side is race.js.
//   wallet.kit.race = { own: { paint: { p0: 1, p3: 1 }, wheels: {...}, exhaust, spoiler, engine }, set: { paint: 3, ... }, best: ms }
//   (part keys are 'p' + number: plain numbers would come back from the database as a list with holes in it)
// Hooked into index.js with ONE line after the OPS table:   Object.assign(OPS, require('./race.js')({ tx, spend, bad }));
// PRICES: the same table as RPARTS in race.js (the phone only shows them; this is what is charged).
const PRICE = {
  paint: [0, 150, 150, 150, 200, 200, 250, 250, 300, 900],
  wheels: [0, 300, 700, 1500],
  exhaust: [0, 250, 600, 1200],
  spoiler: [0, 200, 650, 1400],
  engine: [0, 500, 1200, 2500],
};
const CATS = Object.keys(PRICE);
module.exports = ({ tx, spend, bad }) => {
  const norm = w => {   // fill in what an older wallet lacks (the database drops empty objects)
    const K = w.kit = w.kit || {}, R = K.race = K.race || {}; R.own = R.own || {}; R.set = R.set || {};
    for (const c of CATS) { R.own[c] = R.own[c] || {}; R.own[c].p0 = 1; R.set[c] = R.set[c] | 0; if (!R.own[c]['p' + R.set[c]]) R.set[c] = 0; }
    return R;
  };
  const part = d => { const c = String(d.cat || ''), i = Math.floor(+d.id); if (!Object.prototype.hasOwnProperty.call(PRICE, c) || !(i >= 0 && i < PRICE[c].length)) bad('No such part.'); return [c, i]; };
  return {
    // buy a part (and fit it). Buying one you own just fits it: never charged twice.
    rbuy: (uid, d) => tx(uid, w => { const R = norm(w), [c, i] = part(d); if (!R.own[c]['p' + i]) { spend(w, PRICE[c][i]); R.own[c]['p' + i] = 1; } R.set[c] = i; return { race: R }; }),
    // fit a part you already own
    rset: (uid, d) => tx(uid, w => { const R = norm(w), [c, i] = part(d); if (!R.own[c]['p' + i]) bad('You do not own that part.'); R.set[c] = i; return { race: R }; }),
    // a lap time, kept if it is your best. It comes from the phone (the race runs there) and pays nothing, so there is nothing to cheat for.
    rlap: (uid, d) => tx(uid, w => { const R = norm(w), ms = Math.floor(+d.ms); if (!(ms >= 6000 && ms < 600000)) bad('Bad lap.'); if (!R.best || ms < R.best) R.best = ms; return { best: R.best }; }),
  };
};
