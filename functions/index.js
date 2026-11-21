// MAFIA 2's server (18 Nov 2026, phase 2 of the worlds plan: CHEAT-PROOF COINS, his call).
// The wallet lives at wallet/{uid} and only this server can write it (database.rules.json: .write false). Every game that
// pays or costs coins asks this one function, `act`, which decides the result here and changes the wallet in one go.
// The phone only shows what came back. Prices, odds and prizes come from catalog.json, made from the game's own files
// by tools/make_catalog.js, so the two never drift apart.
//   wallet/{uid} = { c: coins, own: {itemId: 1}, kit: {rods: {id: 1}, bait, bag: [[fish, cm, worth]], pend: {k, cm, g, t, z}},
//                    day: {c, s, ckd, ck}, fl: {w, n}, dr: {b, t}, bj: {...}, ck: {t}, paid: {gameId: time}, ts }
// Skill games (the clicker, the fishing fight, the end-of-game payout) cannot be watched from here, so they are capped
// by time and by day instead: a cheat can only squeeze a little out of them.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.database();
const C = require('./catalog.json');
const ADMINS = new Set(['JRLtZMZkMTTJnHgaHmtLNk0V5mc2', 'XAnbqovmaFUIHDkziEIyPO6Yg5m2']);   // his two accounts: @mafia (the lab account) and @chrispy (21 Nov: the lab buttons on the live site did nothing for him as @chrispy)
const GIFT_NOW = new Set(['JRLtZMZkMTTJnHgaHmtLNk0V5mc2', 'XAnbqovmaFUIHDkziEIyPO6Yg5m2']);   // his accounts (@mafia, @chrispy) can send coins on day one (his call, 18 Nov)   // his Google account: the lab's test buttons only work for him
const MIGRATE_MAX = 20000;
const DEV_REQUIRED = true;                                     // every copy of the game says which phone it is since build 11211426; one that does not is an old copy or a script
const FISH_DAY = 10000;                                        // the most coins Fisherman Joe pays one player in a day
const PROP_PRICE = 7500, PROP_MAX = 48;                       // the prop maker (phase 5): what a drawing costs, and its biggest side                                    // coins carried over from a phone, once, at most

const bad = m => { throw new HttpsError('failed-precondition', m); };
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
// the day in Sydney, for the daily coins / free spin (everyone playing is in Australia)
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const ALL_IDS = new Set([...C.skins.map(s => s.id), ...C.rooms.map(r => r.id), ...C.ckItems.map(c => c.id)]);
function fresh(claim) {
  const w = { c: 1200, own: {}, kit: { rods: { twig: 1 }, bait: 10, bag: [] }, day: {}, fl: {}, dr: { b: 0, t: 0 }, paid: {}, ts: Date.now(), born: Date.now() };
  for (const id of C.start) w.own[id] = 1;
  if (claim) {   // what this phone had before the server kept the wallet: carried over once
    const c = Math.floor(+claim.coins); if (c >= 0) w.c = Math.min(c, MIGRATE_MAX);
    for (const id of (Array.isArray(claim.owned) ? claim.owned : [])) if (ALL_IDS.has(id)) w.own[id] = 1;
    const k = claim.kit || {};
    for (const r of (Array.isArray(k.rods) ? k.rods : [])) if (C.rods.some(x => x.id === r)) w.kit.rods[r] = 1;
    if (k.bait >= 0) w.kit.bait = Math.min(Math.floor(k.bait), 200);
  }
  return w;
}
function norm(w) {   // fill in what an older wallet lacks
  w.own = w.own || {}; w.kit = w.kit || {}; w.kit.rods = w.kit.rods || { twig: 1 }; w.kit.bait = w.kit.bait | 0; w.kit.bag = w.kit.bag || [];
  w.day = w.day || {}; w.fl = w.fl || {}; w.dr = w.dr || { b: 0, t: 0 }; w.paid = w.paid || {}; return w;
}
// drunk: how many beers are still in you (one wears off every 90 s), and the little luck it gives (0 -> 1 from the 3rd to the 6th)
const beers = w => Math.max(0, (w.dr.b || 0) - (Date.now() - (w.dr.t || 0)) / 90000);
const luck = w => Math.min(1, Math.max(0, beers(w) - 2) / 4);
function spend(w, n) { if (!(n > 0) || !Number.isFinite(n)) bad('Bad amount.'); if (w.c < n) bad('Not enough coins.'); w.c -= n; }
function rollRar(odds) { let r = Math.random(), rar = Object.keys(odds)[0]; for (const [k, q] of Object.entries(odds)) { if (r < q) { rar = k; break; } r -= q; } return rar; }
// the wallet changes in one transaction: fn(w) changes it and returns what the phone needs to know
async function tx(uid, fn) {
  let out, err;
  const res = await db.ref('wallet/' + uid).transaction(cur => {
    err = null;
    if (cur === null) return { probe: 1 };   // nothing cached yet: this guess never sticks (the wallet exists), the database answers with the real one
    try { const w = norm(cur); out = fn(w); w.ts = Date.now(); delete w.probe; return w; }
    catch (e) { err = e; return; }   // abort: nothing changes
  });
  if (err) throw err;
  if (!res.committed) bad('Try again.');
  return out;
}
// THE TRIPWIRE (21 Nov, after a friend ran a script): things no real phone ever sends are written to flags/{uid} (nobody can read it but him)
const flag = (uid, why) => db.ref('flags/' + uid).push({ why: String(why).slice(0, 120), t: Date.now() }).catch(() => {});
const bet = v => { const n = Math.floor(+v); if (!(n > 0) || n > 1000000) bad('Bad amount.'); return n; };

/* ---- blackjack: six decks, the dealer stands on 17 and peeks on an Ace or a ten; 1:1, blackjack 3:2; double the first two; split once ---- */
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const val = r => r === 'A' ? 11 : ['J', 'Q', 'K', '10'].includes(r) ? 10 : +r;
function total(cs) { let t = 0, a = 0; for (const c of cs) { t += val(c.r); if (c.r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; }
const isBJ = cs => cs.length === 2 && total(cs) === 21;
function shoe() { const s = []; for (let k = 0; k < 6; k++) for (const su of 'hdcs') for (const r of RANKS) s.push({ r, su }); for (let i = s.length - 1; i > 0; i--) { const j = rnd(i + 1); [s[i], s[j]] = [s[j], s[i]]; } return s; }
function draw(B) { if (!B.shoe || B.shoe.length < 78) B.shoe = shoe(); return B.shoe.pop(); }
function lucky(w, B, h) { if (total(h.cs) <= 21 || Math.random() >= .25 * luck(w)) return; const c = h.cs.pop(); B.shoe.unshift(c); h.cs.push(draw(B)); }   // drunk luck: a busting card swapped, once
function bjView(B, done) {   // what the phone sees: the dealer's hole card stays hidden until the end
  return { ph: B.ph, act: B.act, d: B.d.map((c, i) => i === 1 && !done ? { down: true } : c), hands: B.hands.map(h => ({ cs: h.cs, bet: h.bet, dbl: !!h.dbl, split: !!h.split, res: h.res || null })), back: B.back || 0, net: B.net || 0 };
}
function bjFinish(w, B) {
  const alive = B.hands.some(h => total(h.cs) <= 21);
  if (alive) while (total(B.d) < 17) B.d.push(draw(B));
  const dt = total(B.d), dbj = isBJ(B.d); let back = 0, net = 0;
  for (const h of B.hands) {
    const t = total(h.cs), pbj = !h.split && isBJ(h.cs); let r;
    if (t > 21) r = 'bust'; else if (pbj && !dbj) r = 'bj'; else if (dbj && !pbj) r = 'lose'; else if (pbj && dbj) r = 'push'; else if (dt > 21 || t > dt) r = 'win'; else if (t === dt) r = 'push'; else r = 'lose';
    const pay = r === 'bj' ? h.bet + Math.floor(h.bet * 1.5) : r === 'win' ? h.bet * 2 : r === 'push' ? h.bet : 0; back += pay; net += pay - h.bet; h.res = r;
  }
  w.c += back; B.ph = 'done'; B.back = back; B.net = net;
}
function bjNext(w, B) {   // the hand in play is finished: the next one, or the dealer
  B.hands[B.act].done = true; const i = B.hands.findIndex(q => !q.done);
  if (i >= 0) { B.act = i; if (B.hands[i].cs.length < 2) B.hands[i].cs.push(draw(B)); return; }
  bjFinish(w, B);
}
function blackjack(w, a, amt) {
  const B = w.bj = w.bj || { ph: 'done', d: [], hands: [], act: 0 };
  if (a === 'view') return bjView(B, B.ph === 'done');
  if (a === 'deal') {
    if (B.ph === 'play') bad('Finish the hand first.');
    const n = bet(amt); spend(w, n);
    B.d = []; B.hands = [{ cs: [], bet: n }]; B.act = 0; B.back = 0; B.net = 0; B.ph = 'play';
    const P = B.hands[0].cs; P.push(draw(B)); B.d.push(draw(B)); P.push(draw(B)); B.d.push(draw(B));
    if ((val(B.d[0].r) >= 10 && isBJ(B.d)) || isBJ(P)) bjFinish(w, B);
    return bjView(B, B.ph === 'done');
  }
  if (B.ph !== 'play') bad('No hand in play.');
  const h = B.hands[B.act];
  if (a === 'hit') { h.cs.push(draw(B)); if (total(h.cs) >= 21) bjNext(w, B); }
  else if (a === 'stand') bjNext(w, B);
  else if (a === 'double') { if (h.cs.length !== 2) bad('You can only double on two cards.'); spend(w, h.bet); h.bet *= 2; h.dbl = true; h.cs.push(draw(B)); bjNext(w, B); }
  else if (a === 'split') {
    if (!(B.hands.length === 1 && h.cs.length === 2 && val(h.cs[0].r) === val(h.cs[1].r))) bad('You cannot split this.');
    spend(w, h.bet); const h2 = { cs: [h.cs.pop()], bet: h.bet, split: true }; h.split = true; B.hands.push(h2); h.cs.push(draw(B));
    if (h.cs[0].r === 'A') { h2.cs.push(draw(B)); h.done = h2.done = true; bjFinish(w, B); }   // split Aces: one card each, then the dealer
  } else bad('Unknown move.');
  return bjView(B, B.ph === 'done');
}

/* ---- SHARED BLACKJACK (his ask, 18 Nov): the rules are in bjt.js ---- */
const BJT = require('./bjt.js');
async function bjtRun(wid, t, fn) {
  let err; const ref = db.ref(`bjtx/${wid}/${t}`);
  const res = await ref.transaction(cur => {
    err = null; const T = BJT.norm(cur);
    try { fn(T); T.v = (T.v | 0) + 1; T.now = Date.now(); return T; }
    catch (e) { err = e; return cur === null ? { _probe: 1 } : undefined; }   // (his catch: bets said 'Sit down first') the first try sees no table in the cache: guess, so the database answers with the real one
  });
  if (res.committed && res.snapshot.child('_probe').exists()) await ref.remove();   // there really was no table: undo the guess
  if (err) { if (err instanceof BJT.Bad) bad(err.message); throw err; }
  if (!res.committed) bad('Try again.');
  const T = BJT.norm(res.snapshot.val()), P = BJT.pub(T);
  await db.ref(`worlds/${wid}/bjt/${t}`).transaction(cur => (!cur || (cur.v | 0) < P.v) ? P : undefined);   // the copy the phones watch (never an older one)
  if (T.ph === 'done' && T.pay) await Promise.all(Object.entries(T.pay).filter(([, p]) => p.back > 0).map(([u, p]) =>   // pay everyone at the table, once per round
    tx(u, w => { w.bjr = w.bjr || {}; const key = `${wid}_${t}_${T.r}`; if (w.bjr[key]) return {}; w.bjr[key] = Date.now();
      for (const [k, v] of Object.entries(w.bjr)) if (Date.now() - v > 864e5) delete w.bjr[k]; w.c += p.back; return {}; }).catch(() => {})));
  return P;
}

/* ---- everything else ---- */
const OPS = {
  // the shared blackjack table: sit, leave, bet, hit, stand, double, split, tick (a deadline has passed)
  async bjt(uid, d) {
    const wid = String(d.wid || ''), t = d.t | 0, a = String(d.a || '');
    if (!/^[-\w]{5,40}$/.test(wid) || t < 0 || t > 1) bad('Bad table.');
    const mem = (await db.ref(`worlds/${wid}/members/${uid}`).get()).val(); if (!mem) bad('You are not in that world.');
    const o = { n: String(mem.n || 'Player').slice(0, 12), s: Math.max(0, Math.min(3, d.s | 0)), amt: 0 };
    if (a === 'bet') o.amt = bet(d.amt);
    if (a === 'double' || a === 'split') {   // costs the same again as the hand in play
      const T = BJT.norm((await db.ref(`bjtx/${wid}/${t}`).get()).val()), me = T.seats[uid], h = me && T.order[T.cur] === uid && me.hands[T.hi];
      if (!h) bad('Not your turn.'); o.amt = h.bet;
    }
    if (o.amt) await tx(uid, w => { spend(w, o.amt); return {}; });
    try { return { T: await bjtRun(wid, t, T => BJT.move(T, uid, a, o)) }; }
    catch (e) { if (o.amt) await tx(uid, w => { w.c += o.amt; return {}; }).catch(() => {}); throw e; }   // it did not go through: the coins go back
  },
  // first time on the server: what this phone had comes over once (capped). Afterwards it just answers with the wallet.
  async init(uid, d) {
    const ref = db.ref('wallet/' + uid);
    // (21 Nov) the phone's old coins and outfits are no longer carried over: a script could claim 20,000 coins and every item.
    // Everyone who played before the server kept the wallet has had three days to come over.
    const had = (await ref.child('ts').get()).exists();
    await ref.transaction(cur => cur ? undefined : fresh(null));
    const c = d && d.claim; if (!had && c && (+c.coins > 5000 || (Array.isArray(c.owned) && c.owned.length > 12))) await flag(uid, 'init claim ' + (+c.coins | 0) + ' coins, ' + (Array.isArray(c.owned) ? c.owned.length : 0) + ' items');
    return {};
  },
  beer: (uid) => tx(uid, w => { spend(w, 5); w.dr = { b: Math.min(10, beers(w) + 1), t: Date.now() }; return {}; }),
  daily: (uid) => tx(uid, w => { const k = dayKey(); if (w.day.c === k) bad('Already collected today.'); w.day.c = k; w.c += C.dayCoins; return { got: C.dayCoins }; }),
  wheel: (uid) => tx(uid, w => {
    const k0 = dayKey(), free = w.day.s !== k0; if (free) w.day.s = k0; else spend(w, C.spinPrice);
    let r = Math.random() * 100, k = 0; while (k < C.wheel.length - 1 && r >= C.wheel[k][2]) { r -= C.wheel[k][2]; k++; }
    const g = C.wheel[k]; let win = null, dupe = false;
    if (g[0] === 'c') w.c += g[1];
    else { win = pick(C.skins.filter(s => s.rar === g[1])).id; if (w.own[win]) { dupe = true; w.c += Math.round(C.spinPrice * C.caseDupe); } else w.own[win] = 1; }
    return { k, win, dupe, free };
  }),
  case: (uid, d) => tx(uid, w => {
    const D = C.cases[d.kind]; if (!D) bad('No such case.'); spend(w, D.price);
    const rar = rollRar(D.odds), win = pick(D.pool.filter(s => s.rar === rar)).id, dupe = !!w.own[win], back = Math.round(D.price * C.caseDupe);
    if (dupe) w.c += back; else w.own[win] = 1;
    return { win, dupe, back };
  }),
  flip: (uid, d) => tx(uid, w => {
    const side = d.side === 't' ? 't' : 'h', n = bet(d.amt), win0 = Math.floor(Date.now() / C.flipEvery);
    if (w.fl.w !== win0) w.fl = { w: win0, n: 0 };
    if (w.fl.n >= C.flipMax) bad('No flips left.');
    spend(w, n); w.fl.n++;
    const won = Math.random() < .5, res = won ? side : (side === 'h' ? 't' : 'h');
    if (won) w.c += n * 2;
    return { res, won, left: C.flipMax - w.fl.n };
  }),
  slot: (uid, d) => tx(uid, w => {
    const n = bet(d.amt); spend(w, n);
    const tw = C.slots.reduce((a, s) => a + s.w, 0), one = () => { let r = Math.random() * tw; for (let i = 0; i < C.slots.length; i++) { r -= C.slots[i].w; if (r < 0) return i; } return 0; };
    const pays = r => r[0] === r[1] && r[1] === r[2] ? C.slots[r[0]].p : r.filter(i => i === 0).length === 2 ? 3 : 0;
    let res = [one(), one(), one()]; if (!pays(res) && Math.random() < .08 * luck(w)) res = [one(), one(), one()];   // drunk luck
    const m = pays(res), win = n * m; w.c += win;
    return { res, m, win };
  }),
  bj: (uid, d) => tx(uid, w => blackjack(w, d.a, d.amt)),
  // fishing: a cast takes a bait and decides the fish; landing it puts it in the bag; Joe pays for the bag
  fcast: (uid, d) => tx(uid, w => {
    const K = w.kit; if (K.pend) return { k: K.pend.k };   // the same fish waits for you till you land it or lose it (no re-rolling)
    const rod = C.rods.find(r => r.id === d.rod && K.rods[r.id]) || C.rods[0];
    let z = Math.max(0, Math.min(2, d.z | 0)); if (rod.range < .85) z = Math.min(z, 1);   // only the Steel and Golden rods reach the deep water
    if (K.bait <= 0) bad('Out of bait.'); K.bait--;
    const B = C.fishOdds[z], L = rod.luck + .5 * luck(w),   // drunk luck: a touch better fish (his call: slots and fishing only)
     O = { common: B.common - 7 * L, rare: B.rare + 3.5 * L, epic: B.epic + 2.5 * L, legendary: B.legendary + L };
    let r = Math.random() * 100, rar = 'common'; for (const k of ['legendary', 'epic', 'rare', 'common']) { if (r < O[k]) { rar = k; break; } r -= O[k]; }
    const k = pick(C.fishes.map((f, i) => i).filter(i => C.fishes[i].rar === rar));
    K.pend = { k, t: Date.now() }; return { k };
  }),
  // a real catch (wait for the bite, hook it, reel it in) never takes under about 4.5 s, even with the Golden Rod: sooner is a script
  fland: (uid) => tx(uid, w => {
    const K = w.kit, p = K.pend; if (!p) bad('Nothing on the line.');
    if (Date.now() - p.t < 3500) bad('Too quick.'); if (K.bag.length >= C.fishBag) bad('Your bag is full.');
    const F = C.fishes[p.k], pct = Math.random(), cm = Math.round(F.min + (F.max - F.min) * (pct * pct * .6 + pct * .4)), g = F.rar === 'junk' ? F.val : Math.max(1, Math.round(F.val * (.75 + .6 * pct)));
    K.bag.push([p.k, cm, g]); K.pend = null; return { k: p.k, cm, g };
  }).catch(async e => { if (e && e.message === 'Too quick.') await flag(uid, 'fish landed too fast'); throw e; }),
  flose: (uid) => tx(uid, w => { w.kit.pend = null; return {}; }),
  fsell: (uid, d) => tx(uid, w => {
    const K = w.kit, rod = C.rods.find(r => r.id === d.rod && K.rods[r.id]) || C.rods[0];
    if (!K.bag.length) bad('Nothing to sell.');
    // (21 Nov, his call) Joe buys FISH_DAY coins of fish a day at most, so a script cannot farm the lake; fish that do not fit stay in the bag for tomorrow
    const k = dayKey(); if (w.day.fd !== k) { w.day.fd = k; w.day.f = 0; }
    let got = 0; const keep = [];
    for (const b of K.bag) { const v = Math.round(b[2] * rod.pay); if ((w.day.f || 0) + got + v <= FISH_DAY) got += v; else keep.push(b); }
    if (!got) bad('Joe has bought enough fish for today. Come back tomorrow.');
    w.day.f = (w.day.f || 0) + got; w.c += got; K.bag = keep; return { got, kept: keep.length };
  }),
  frod: (uid, d) => tx(uid, w => { const r = C.rods.find(x => x.id === d.id); if (!r) bad('No such rod.'); if (w.kit.rods[r.id]) return {}; spend(w, r.price); w.kit.rods[r.id] = 1; return {}; }),
  fbait: (uid) => tx(uid, w => {
    const K = w.kit;
    if (K.bait <= 0 && w.c < C.baitPrice && !K.bag.length) { K.bait = 5; return { free: true }; }   // Joe gives 5 on the house when you are broke
    spend(w, C.baitPrice); K.bait += C.baitPack; return {};
  }),
  // the clicker: a run starts here; at the end it pays its score, but never faster than a real run could earn it, and 5,000 a day at most
  ckstart: (uid) => tx(uid, w => { w.ck = { t: Date.now() }; return {}; }),
  ckend: (uid, d) => tx(uid, w => {
    if (!w.ck || !w.ck.t) return { pay: 0 };
    const secs = (Date.now() - w.ck.t) / 1000, score = Math.max(0, d.score | 0), claim = score + Math.max(0, d.coins | 0);
    if (claim > secs * 4 + 15) { w.sus = (w.sus || 0) + 1; w.susT = Date.now(); }   // more points than any real run makes in that time: a made-up score (counted, so he can see who)
    let pay = Math.min(claim, Math.floor(secs * 2.5)); if (score >= 50 && secs >= 40) pay += 500;
    const k = dayKey(); if (w.day.ckd !== k) { w.day.ckd = k; w.day.ck = 0; }
    pay = Math.max(0, Math.min(pay, 5000 - (w.day.ck || 0))); w.day.ck += pay; w.c += pay; w.ck = null; return { pay };
  }),
  // the end of a Mafia game: read from the game itself (who won, your role), paid once per game, and the game has to look real
  async gpay(uid, d) {
    const path = String(d.path || ''); if (!/^(lobbies\/[A-Z]{4}|worlds\/[-\w]+\/live)$/.test(path)) bad('Bad game.');
    const g = (await db.ref(path + '/game').get()).val();
    if (!g || !g.id || !g.win || !g.roles || !g.roles[uid] || !g.pl || !g.pl[uid]) bad('No finished game.');
    if (Object.keys(g.pl).length < 4) bad('Too few players.');
    if (Date.now() - (g.t0 || 0) < 120000) bad('Too quick.');
    const r = g.roles[uid], won = g.win === 'town' ? r !== 'mafia' && r !== 'jester' && r !== 'framer' : g.win === 'mafia' ? r === 'mafia' || r === 'framer' : g.win === r;
    const pay = won ? (r === 'jester' ? 1000 : r === 'mafia' ? 500 : 250) : 100;
    return tx(uid, w => {
      if (w.paid[g.id]) return { pay: 0, again: true };
      const recent = Object.values(w.paid).filter(t => Date.now() - t < 180000).length; if (recent) bad('Too quick.');
      for (const [k, t] of Object.entries(w.paid)) if (Date.now() - t > 7 * 864e5) delete w.paid[k];
      w.paid[g.id] = Date.now(); w.c += pay; return { pay, won };
    });
  },
  // 1 v 1 coin flips: the one challenged says yes here first; then the challenger's flip moves the coins between both wallets
  async duelok(uid, d) {
    const from = String(d.from || ''), amt = bet(d.amt); if (!from || from === uid) bad('Bad challenge.');
    const w = (await db.ref('wallet/' + uid + '/c').get()).val() || 0; if (w < amt) bad('Not enough coins.');
    await db.ref('duels/' + from + '/' + uid).set({ amt, t: Date.now() }); return {};
  },
  async duelgo(uid, d) {
    const to = String(d.to || ''), amt = bet(d.amt), ref = db.ref('duels/' + uid + '/' + to), ok = (await ref.get()).val();
    if (!ok || ok.amt !== amt || Date.now() - ok.t > 90000) bad('They have not said yes.');
    await ref.remove();
    const res = Math.random() < .5 ? 'h' : 't', winner = res === 'h' ? uid : to, loser = winner === uid ? to : uid;   // the challenger is always heads
    await tx(loser, w => spend(w, amt));
    await tx(winner, w => { w.c += amt; return {}; });
    return { res };
  },
  // FRIENDS (phase 3): a request by Google email (or straight from a world's members), yes / no, and giving coins to a friend.
  //   freq/{to}/{from} {n, p, at}   friends/{a}/{b} true (both ways)   gifts/{to}/{id} {from, n, amt, at}   all written only here
  // USERNAMES (his ask): unique, more than 3 characters (letters, numbers, _), picked after the Google sign-in. usernames/{name} = uid
  async setName(uid, d) {
    if (!d._google) bad('Sign in with Google first.');
    const name = String(d.name || '').trim().toLowerCase().replace(/^@/, '');
    if (name.length < 4) bad('At least 4 characters.'); if (name.length > 16) bad('16 characters at most.');
    if (!/^[a-z0-9_]+$/.test(name)) bad('Only letters, numbers and _.');
    const old = (await db.ref('profiles/' + uid + '/u').get()).val();
    if (old === name) return { name };
    const r = await db.ref('usernames/' + name).transaction(cur => cur === null || cur === uid ? uid : undefined);
    if (!r.committed) bad('That username is taken.');
    const up = { ['profiles/' + uid + '/u']: name }; if (old) up['usernames/' + old] = null;
    await db.ref().update(up); return { name };
  },
  async friendAsk(uid, d) {
    let to = String(d.uid || '');
    if (!to && d.user) { const n = String(d.user).trim().toLowerCase().replace(/^@/, ''); to = n && (await db.ref('usernames/' + n).get()).val(); if (!to) bad('Nobody has that username.'); }
    if (!to) { const e = String(d.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) bad('That is not an email.');
      try { to = (await admin.auth().getUserByEmail(e)).uid; } catch (err) { bad('Nobody has played with that email yet.'); } }
    if (to === uid) bad('That is you.');
    if ((await db.ref('friends/' + uid + '/' + to).get()).exists()) bad('You are already friends.');
    const me = (await db.ref('profiles/' + uid).get()).val() || {};
    if ((await db.ref('freq/' + uid + '/' + to).get()).exists()) {   // they already asked you: that is a yes
      await db.ref().update({ ['friends/' + uid + '/' + to]: true, ['friends/' + to + '/' + uid]: true, ['freq/' + uid + '/' + to]: null }); return { friends: true };
    }
    await db.ref('freq/' + to + '/' + uid).set({ n: String(me.n || 'Player').slice(0, 10), u: me.u || '', p: me.p || '', skin: me.skin || '', at: Date.now() }); return { sent: true };
  },
  async friendYes(uid, d) {
    const from = String(d.uid || ''); if (!(await db.ref('freq/' + uid + '/' + from).get()).exists()) bad('That request is gone.');
    await db.ref().update({ ['friends/' + uid + '/' + from]: true, ['friends/' + from + '/' + uid]: true, ['freq/' + uid + '/' + from]: null, ['freq/' + from + '/' + uid]: null }); return {};
  },
  async friendNo(uid, d) { await db.ref('freq/' + uid + '/' + String(d.uid || '')).remove(); return {}; },
  async friendRemove(uid, d) { const o = String(d.uid || ''); await db.ref().update({ ['friends/' + uid + '/' + o]: null, ['friends/' + o + '/' + uid]: null }); return {}; },
  async gift(uid, d) {
    const to = String(d.uid || ''), amt = bet(d.amt); if (to === uid) bad('That is you.');
    if (!d._google) bad('Sign in with Google to send coins.');   // no throwaway accounts feeding a main one
    const born = (await db.ref('wallet/' + uid + '/born').get()).val(); if (born && Date.now() - born < 864e5 && !GIFT_NOW.has(uid)) bad('New accounts can send coins after a day.');   // his own account does not wait (his call, 18 Nov)
    if (!(await db.ref('friends/' + uid + '/' + to).get()).exists()) bad('You can only send coins to friends.');
    if (!(await db.ref('wallet/' + to + '/ts').get()).exists()) bad('They have no wallet yet.');
    await tx(uid, w => spend(w, amt));
    await tx(to, w => { w.c += amt; return {}; });
    const me = (await db.ref('profiles/' + uid).get()).val() || {};
    await db.ref('gifts/' + to).push({ from: uid, n: String(me.n || 'A friend').slice(0, 10), amt, at: Date.now() });
    return { sent: amt };
  },
  // DECORATING (phase 4): buy decorations with coins (wallet.dec = how many of each you own), and save where yours stand in a world:
  //   worlds/{wid}/decor/{uid} = {in: [[item, x, y]...], out: [...]}   (in = inside your cabin, out = round it in the town). Only this server writes it.
  decorBuy: (uid, d) => tx(uid, w => { const it = C.decor.find(x => x.id === d.id); if (!it) bad('No such thing.'); spend(w, it.price); w.dec = w.dec || {}; w.dec[it.id] = (w.dec[it.id] || 0) + 1; return {}; }),
  async decorSave(uid, d) {
    const wid = String(d.wid || ''); if (!/^[-\w]+$/.test(wid) || !(await db.ref('worlds/' + wid + '/members/' + uid).get()).exists()) bad('You are not in that world.');
    const own = (await db.ref('wallet/' + uid + '/dec').get()).val() || {}, used = {};
    const clean = (list, x0, x1, y0, y1) => (Array.isArray(list) ? list : []).slice(0, 80).map(p => {
      const k = String(p[0]), x = Math.round(+p[1]), y = Math.round(+p[2]); if (!(C.decor.some(q => q.id === k) || /^@\w+:[-\w]+$/.test(k)) || !(x >= x0 && x <= x1 && y >= y0 && y <= y1)) bad('Bad spot.');
      used[k] = (used[k] || 0) + 1; const r = (p[3] | 0) & 3; return r ? [k, x, y, r] : [k, x, y]; });   // r = which way it faces: 0 south, 1 east, 2 north, 3 west
    const inn = clean(d.in, 0, 200, 10, 215), out = clean(d.out, -200, 3000, -200, 3000);
    for (const k of Object.keys(used)) if (used[k] > (own[k] || 0)) bad('You do not own that many.');
    await db.ref('worlds/' + wid + '/decor/' + uid).set({ in: inn, out }); return {};
  },
  // THE PROP MAKER (phase 5): you draw a prop (a PNG up to 48 x 48, see-through where you did not draw), it costs 7,500 coins,
  // and it becomes a decoration only you own: props/{uid}/{id} = {png, wall, sh (shadow), at}; wallet.dec['@uid:id'] = 1.
  async propMake(uid, d) {
    const png = String(d.png || ''), m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(png); if (!m || png.length > 40000) bad('That drawing is too big.');
    const b = Buffer.from(m[1], 'base64'); if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') bad('That is not a picture.');
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20); if (!(w >= 1 && h >= 1 && w <= PROP_MAX && h <= PROP_MAX)) bad('48 by 48 at most.');
    const id = db.ref('props/' + uid).push().key, key = '@' + uid + ':' + id;
    await tx(uid, w0 => { spend(w0, PROP_PRICE); w0.dec = w0.dec || {}; w0.dec[key] = 1; return {}; });
    await db.ref('props/' + uid + '/' + id).set({ png, w, h, wall: !!d.wall, sh: d.sh !== false, at: Date.now() });
    return { id: key };
  },
  // ONE DEVICE PER ACCOUNT (21 Nov, his call): device/{uid} = {id, name, at}, written only here. The first phone to play gets the
  // account; any other phone is refused by `act` below until it moves the account over (devMove), which shuts the old one out.
  devMove: async (uid, d) => { await db.ref('device/' + uid).set({ id: d._dev, name: d._devName, at: Date.now() }); return {}; },
  devOff: async (uid, d) => { await db.ref('device/' + uid).remove(); return {}; },   // only the assigned phone gets this far
  // the lab's test buttons: his account only
  lab: (uid, d) => { if (!ADMINS.has(uid)) bad('Not allowed.'); return tx(uid, w => {
    if (d.what === 'coins') w.c += 500;
    else if (d.what === 'unlock') for (const id of ALL_IDS) w.own[id] = 1;
    else if (d.what === 'lock') { w.own = {}; for (const id of C.start) w.own[id] = 1; }
    else if (d.what === 'bait') w.kit.bait = 99;
    return {}; }); },
};

exports.act = onCall({ region: 'asia-southeast1', maxInstances: 10 }, async req => {
  const uid = req.auth && req.auth.uid; if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const d = req.data || {}, f = OPS[d.op]; if (!f) throw new HttpsError('invalid-argument', 'Unknown action.');
  // which phone is asking: the account answers to one phone at a time
  d._dev = /^[A-Za-z0-9_-]{8,40}$/.test(String(d.dev || '')) ? String(d.dev) : ''; d._devName = String(d.devName || 'A device').replace(/[^A-Za-z0-9_ .()-]/g, '').slice(0, 40) || 'A device';
  const dref = db.ref('device/' + uid), cur = (await dref.get()).val();
  if (d.op === 'devMove') { if (!d._dev) throw new HttpsError('failed-precondition', 'Update the game first.'); }
  else if (cur && cur.id) { if (cur.id !== d._dev) throw new HttpsError('failed-precondition', 'This account is on another device.'); }
  else if (d._dev) { const r = await dref.transaction(c => c && c.id && c.id !== d._dev ? undefined : (c && c.id ? c : { id: d._dev, name: d._devName, at: Date.now() })); if (!r.committed) throw new HttpsError('failed-precondition', 'This account is on another device.'); }
  else if (DEV_REQUIRED) throw new HttpsError('failed-precondition', 'Update the game first.');
  if (d.op !== 'init') { const has = (await db.ref('wallet/' + uid + '/ts').get()).exists(); if (!has) await OPS.init(uid, {}); }
  d._google = !!(req.auth.token && req.auth.token.firebase && req.auth.token.firebase.sign_in_provider === 'google.com');
  const r = await f(uid, d) || {};
  return r;
});
exports.ping = onCall({ region: 'asia-southeast1' }, req => ({ ok: true, uid: req.auth ? req.auth.uid : null, t: Date.now() }));
