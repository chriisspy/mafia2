// WORLD PROJECTS AND THEIR MATERIALS (28 Nov 2026, his ask; batch 3 of the keep-playing plan).
// "the players will need to invest some coins but also gather materials such as stone, wood, gold, etc." and "Mine gives stone, trees give wood".
//
// MATERIALS
//   kit.stone  one for every plain rock or wall you break in the mine (functions/mine.js mbreak adds it: the ore rocks give gold, not stone)
//   kit.wood   from chopping the tall pines in the South with an AXE (kit.axe = 1, bought once from the Blacksmith)
// A tree you chop is a stump for REGROW, then stands again. The server keeps which of YOUR trees are down (kit.ch = {tree: when}), so a tree
// cannot be chopped twice before it grows back, and SWING keeps anyone from chopping faster than the swings take. (Each player has their own trees:
// what you chop is down for you alone. The South is shared and there are 89 pines; nobody should find the wood all gone.)
// (28 Nov 2026, his ask: "when it hits the floor the logs break up and walking over them collects them".) Chopping no longer pays wood by itself:
//   chop    fells the tree and leaves its LOGS on the ground: kit.logs = {tree: pieces}. Two or three pieces, one wood each.
//   logTake {i, n} picks up n of tree i's pieces (all of them if n is left out): only then are they in kit.wood.
// Logs stay until they are taken (they are in the wallet, so the phone shows them again after a reload). A tree that has grown back cannot be
// chopped again while its last logs still lie there.
//
// PROJECTS (he approved this list of six on 28 Nov): the world's OWNER picks one from the catalog; everyone in the world chips in coins and materials;
// one project at a time; when it is paid for it is BUILT, for good.
//   worlds/{wid}/proj = { cur: { id, by, t, x, y, have: {c, stone, wood, gold, cry} } | null, done: { id: { t, x, y } } }     only this server writes it
// (28 Nov, his call) the owner also chooses WHERE: he puts it down anywhere in the town on a grid, like decorating a cabin. x, y = the top left of its
// picture on the town's map. It stands there as a building site from that moment, and everyone walks up to it to drop their coins and materials in.
// Some buildings give the town a PERK ("it shows what it can do for the town before choosing"). A perk is written into the wallet of every member
// when the building is finished (wallet.perk = {id: 1}), and into yours whenever you walk into a world that has it (op perkSync), so the ops that
// pay out can see it without looking the world up every time:
//   bakery   +50 coins on your daily collect            (functions/keep.js daily)
//   fishhut  fish sell for 10% more                      (functions/index.js fsell)
//   miner    10% more gold from the mine                 (functions/mine.js mbreak)
//   monument one crystal shard with your daily collect   (functions/keep.js daily)
// MOVE AND CANCEL (28 Nov, his ask: "make it so the owner can move or cancel it (cancelling refunds the people that donated)"):
//   cur.gave = { uid: {c, stone, wood, gold, cry} }: what each player has put in, kept so a cancel can hand every bit back to the one who gave it.
//   projMove   the owner puts the site, or a finished building, somewhere else.
//   projCancel the owner takes the site away: it is removed FIRST (so nothing can be refunded twice), then each giver gets back exactly what they gave.
// The phone carries the same catalog for the words and the pictures (build.js: PROJECTS). Change one, change the other.
module.exports = ({ tx, bad, spend, db }) => {
  const AXE = 300, REGROW = 5 * 60000, SWING = 2500, TREES = 400;   // coins; ms a stump lasts; least ms between two chops (28 Nov: five slower swings now, so 2500, was 1100); the highest tree number the phone may name
  const logsOf = K => { const L = K.logs && typeof K.logs === 'object' ? K.logs : {}; for (const k of Object.keys(L)) if (!(L[k] > 0)) delete L[k]; return L; };   // tree -> pieces lying there
  // id: what it costs. c = coins. Anything with a perk is in PERKS.
  const PROJECTS = {
    fountain: { c: 1000, stone: 60, wood: 10 },
    bakery: { c: 3000, wood: 80, stone: 60 },
    fishhut: { c: 4000, wood: 120 },
    clock: { c: 5000, stone: 200, wood: 60 },
    miner: { c: 6000, stone: 250, gold: 20 },
    monument: { c: 12000, stone: 300, wood: 150, gold: 100, cry: 5 },
  };
  const PERKS = new Set(['bakery', 'fishhut', 'miner', 'monument']);
  const KINDS = ['c', 'stone', 'wood', 'gold', 'cry'];
  const have = (w, k) => k === 'c' ? w.c | 0 : w.kit[k] | 0;
  const take = (w, k, n) => { if (k === 'c') w.c -= n; else w.kit[k] = (w.kit[k] | 0) - n; };
  const world = async (wid, uid) => { if (!/^[-\w]{5,40}$/.test(wid)) bad('Bad world.'); const [mem, own] = await Promise.all([db.ref(`worlds/${wid}/members/${uid}`).get(), db.ref(`worlds/${wid}/meta/owner`).get()]);
    if (!mem.exists()) bad('You are not in that world.'); return own.val(); };
  const grant = (uid, ids) => tx(uid, w => { w.perk = w.perk || {}; for (const id of ids) if (PERKS.has(id)) w.perk[id] = 1; return {}; });
  const ops = {
    axeBuy: (uid) => tx(uid, w => { if (w.kit.axe) bad('You already have an axe.'); spend(w, AXE); w.kit.axe = 1; return { axe: 1 }; }),
    chop: (uid, d) => tx(uid, w => { const K = w.kit, i = d.i, now = Date.now(); if (!K.axe) bad('You need an axe. The Blacksmith sells one.');
      if (!Number.isInteger(i) || i < 0 || i >= TREES) bad('No such tree.'); if (now - (K.cht || 0) < SWING) bad('Too quick.');
      const C = K.ch && typeof K.ch === 'object' ? K.ch : {}; for (const k of Object.keys(C)) if (now - C[k] >= REGROW) delete C[k];   // the ones that have grown back
      if (C[i]) bad('That tree is still growing back.');
      const L = logsOf(K); if (L[i]) bad('Pick up its logs first.');
      const got = 2 + (Math.random() < .35 ? 1 : 0); C[i] = now; K.ch = C; K.cht = now; L[i] = got; K.logs = L;   // the wood is on the ground, not in the kit: logTake
      return { got, wood: K.wood | 0, i, until: now + REGROW }; }),
    logTake: (uid, d) => tx(uid, w => { const K = w.kit, i = d.i; if (!Number.isInteger(i) || i < 0 || i >= TREES) bad('No such tree.');
      const L = logsOf(K), have = L[i] | 0; if (have <= 0) bad('No logs there.');
      const n = Number.isInteger(d.n) && d.n > 0 ? Math.min(d.n, have) : have; if (have - n > 0) L[i] = have - n; else delete L[i];
      if (Object.keys(L).length) K.logs = L; else delete K.logs; K.wood = (K.wood | 0) + n;
      return { got: n, wood: K.wood, i, left: have - n }; }),
    // the owner starts one: nothing already going, and not one the town already has
    projStart: async (uid, d) => { const wid = String(d.wid || ''), id = String(d.id || ''), x = Math.round(+d.x), y = Math.round(+d.y); if (!PROJECTS[id]) bad('No such building.');
      if (!(x >= -200 && x <= 900 && y >= -50 && y <= 1100)) bad('It cannot go there.');
      if (await world(wid, uid) !== uid) bad('Only the owner of the world picks the project.');
      const r = await db.ref(`worlds/${wid}/proj`).transaction(p => { p = p || {}; if (p.cur || (p.done && p.done[id])) return; p.cur = { id, by: uid, t: Date.now(), x, y, have: {} }; return p; });
      if (!r.committed) bad('There is already a project going, or the town has that one.'); return { id }; },
    // chip in: as much as you offer, up to what it still needs and what you carry. Taken from you first; anything it did not need comes straight back.
    projGive: async (uid, d) => { const wid = String(d.wid || ''), k = String(d.k || ''), ask = Math.floor(+d.n); if (!KINDS.includes(k) || !(ask >= 1)) bad('Bad gift.');
      await world(wid, uid); let gave = 0;
      await tx(uid, w => { gave = Math.min(ask, have(w, k)); if (gave < 1) bad(k === 'c' ? 'You have no coins to give.' : 'You have none of that to give.'); take(w, k, gave); return {}; });
      let used = 0, built = null;
      const r = await db.ref(`worlds/${wid}/proj`).transaction(p => { used = 0; built = null; if (!p || !p.cur) return; const P = PROJECTS[p.cur.id]; if (!P) return;
        p.cur.have = p.cur.have || {}; const need = (P[k] | 0) - (p.cur.have[k] | 0); used = Math.max(0, Math.min(gave, need)); if (!used) return;
        p.cur.have[k] = (p.cur.have[k] | 0) + used; p.cur.gave = p.cur.gave || {}; const g = p.cur.gave[uid] = p.cur.gave[uid] || {}; g[k] = (g[k] | 0) + used;
        if (KINDS.every(q => (p.cur.have[q] | 0) >= (P[q] | 0))) { built = p.cur.id; p.done = p.done || {}; p.done[built] = { t: Date.now(), x: p.cur.x | 0, y: p.cur.y | 0 }; p.cur = null; }
        return p; }).catch(() => ({ committed: false }));
      if (!r.committed) used = 0;
      if (used < gave) await tx(uid, w => { take(w, k, -(gave - used)); return {}; });   // back to you: it did not need it all (or there was no project)
      if (!used) bad('The project does not need that.');
      if (built && PERKS.has(built)) { const mem = (await db.ref(`worlds/${wid}/members`).get()).val() || {}; await Promise.all(Object.keys(mem).slice(0, 12).map(u => grant(u, [built]).catch(() => {}))); }
      return { used, built }; },
    projMove: async (uid, d) => { const wid = String(d.wid || ''), id = String(d.id || ''), x = Math.round(+d.x), y = Math.round(+d.y); if (!PROJECTS[id]) bad('No such building.');
      if (!(x >= -200 && x <= 900 && y >= -50 && y <= 1100)) bad('It cannot go there.'); if (await world(wid, uid) !== uid) bad('Only the owner of the world can move it.');
      const r = await db.ref(`worlds/${wid}/proj`).transaction(p => { if (!p) return; if (p.cur && p.cur.id === id) { p.cur.x = x; p.cur.y = y; return p; }
        if (p.done && p.done[id]) { p.done[id] = typeof p.done[id] === 'object' ? p.done[id] : { t: +p.done[id] || Date.now() }; p.done[id].x = x; p.done[id].y = y; return p; } });
      if (!r.committed) bad('That building is not in this town.'); return { id, x, y }; },
    projCancel: async (uid, d) => { const wid = String(d.wid || ''); if (await world(wid, uid) !== uid) bad('Only the owner of the world can cancel it.');
      let gone = null; const r = await db.ref(`worlds/${wid}/proj`).transaction(p => { gone = null; if (!p || !p.cur) return; gone = p.cur; p.cur = null; return p; });
      if (!r.committed || !gone) bad('There is no project to cancel.');
      const gave = gone.gave || {}, left = Object.assign({}, gone.have || {}); let back = 0;
      for (const u of Object.keys(gave)) { const G = gave[u] || {}; await tx(u, w => { for (const k of KINDS) { const n = G[k] | 0; if (n > 0) take(w, k, -n); } return {}; }).then(() => { back++; for (const k of KINDS) left[k] = (left[k] | 0) - (G[k] | 0); }).catch(() => {}); }
      // anything put in before gifts were written down by name (the first hour this was live) cannot be traced to its giver: it goes to the owner, who is cancelling
      if (KINDS.some(k => (left[k] | 0) > 0) && !Object.keys(gave).length) await tx(uid, w => { for (const k of KINDS) if ((left[k] | 0) > 0) take(w, k, -(left[k] | 0)); return {}; }).catch(() => {});
      return { id: gone.id, back }; },
    // walking into a world: its finished buildings' perks are yours too (someone who joined after it was built)
    perkSync: async (uid, d) => { const wid = String(d.wid || ''); await world(wid, uid); const done = (await db.ref(`worlds/${wid}/proj/done`).get()).val() || {};
      const ids = Object.keys(done).filter(id => PERKS.has(id)); if (ids.length) await grant(uid, ids); return { perks: ids }; },
  };
  return { ops, AXE, REGROW, PROJECTS };
};
