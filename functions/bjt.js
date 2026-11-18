// SHARED BLACKJACK (his ask, 18 Nov 2026): everyone sitting at a table in a world plays the same round against one dealer,
// and sees everyone's cards. The whole table lives at bjtx/{wid}/{t} (only this server can read it: it holds the shoe and the
// dealer's hole card); a copy without those goes to worlds/{wid}/bjt/{t} for the phones.
//   T = { ph: 'idle' | 'bet' | 'play' | 'done', dl: when this phase runs out (ms), r: round, v: version, now,
//         seats: { uid: { n, s: stool, bet, gone, hands: [{ cs, bet, dbl, split, res, done }] } },
//         order: [uid] (this round, in stool order), cur: whose turn (index in order), hi: which of their hands,
//         d: dealer's cards, shoe, pay: { uid: { back, net } } }
// Rounds: the first bet starts an 8 s betting window (shorter once everyone sat down has bet); then the deal; each hand gets 20 s;
// then the dealer draws to 17 and everyone is paid; 5 s to see it, then the table is free for the next bets. Nobody's phone keeps
// time for the table: any of them asks for a 'tick' once a deadline has passed, and the server checks it.
const BET_MS = 8000, TURN_MS = 20000, DONE_MS = 5000, SEATS = 4;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const val = r => r === 'A' ? 11 : ['J', 'Q', 'K', '10'].includes(r) ? 10 : +r;
function total(cs) { let t = 0, a = 0; for (const c of cs || []) { t += val(c.r); if (c.r === 'A') a++; } while (t > 21 && a) { t -= 10; a--; } return t; }
const isBJ = cs => (cs || []).length === 2 && total(cs) === 21;
function shoe() { const s = []; for (let k = 0; k < 6; k++) for (const su of 'hdcs') for (const r of RANKS) s.push({ r, su }); for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
function draw(T) { if (!T.shoe || T.shoe.length < 78) T.shoe = shoe(); return T.shoe.pop(); }
class Bad extends Error {}
const bad = m => { throw new Bad(m); };

function norm(T) {   // the database drops empty lists and objects: put them back
  T = T || { ph: 'idle', r: 0, v: 0 };
  T.seats = T.seats || {}; T.d = T.d || []; T.order = T.order || []; T.cur = T.cur | 0; T.hi = T.hi | 0;
  for (const s of Object.values(T.seats)) { s.hands = s.hands || []; for (const h of s.hands) h.cs = h.cs || []; }
  return T;
}
function fresh(T) {   // a new round: the ones who left go, everyone else keeps their stool
  for (const [u, s] of Object.entries(T.seats)) { if (s.gone) delete T.seats[u]; else { s.bet = 0; s.hands = []; } }
  T.ph = 'idle'; T.dl = 0; T.d = []; T.order = []; T.cur = 0; T.hi = 0; T.pay = null;
}
function deal(T) {
  const order = Object.entries(T.seats).filter(([, s]) => s.bet > 0 && !s.gone).sort((a, b) => a[1].s - b[1].s).map(([u]) => u);
  if (!order.length) { fresh(T); return; }
  T.order = order; T.d = []; T.r = (T.r | 0) + 1; T.pay = null;
  for (const u of order) T.seats[u].hands = [{ cs: [], bet: T.seats[u].bet }];
  for (let k = 0; k < 2; k++) { for (const u of order) T.seats[u].hands[0].cs.push(draw(T)); T.d.push(draw(T)); }
  for (const u of order) { const h = T.seats[u].hands[0]; if (isBJ(h.cs)) h.done = true; }
  T.ph = 'play'; T.cur = 0; T.hi = 0;
  if (val(T.d[0].r) >= 10 && isBJ(T.d)) return settle(T);   // the dealer peeks: blackjack ends it at once
  seek(T);
}
function seek(T) {   // on to the next hand that still has to play; when there is none, the dealer
  while (T.cur < T.order.length) {
    const s = T.seats[T.order[T.cur]];
    if (s && !s.gone) {
      const hs = s.hands;
      while (T.hi < hs.length && (hs[T.hi].done || total(hs[T.hi].cs) >= 21)) { hs[T.hi].done = true; T.hi++; }
      if (T.hi < hs.length) { T.dl = Date.now() + TURN_MS; return; }
    } else if (s) for (const h of s.hands) h.done = true;
    T.cur++; T.hi = 0;
  }
  settle(T);
}
function settle(T) {
  const live = T.order.some(u => T.seats[u] && T.seats[u].hands.some(h => total(h.cs) <= 21));
  if (live) while (total(T.d) < 17) T.d.push(draw(T));
  const dt = total(T.d), dbj = isBJ(T.d); T.pay = {};
  for (const u of T.order) {
    const s = T.seats[u]; if (!s) continue; let back = 0, net = 0;
    for (const h of s.hands) {
      const t = total(h.cs), pbj = !h.split && isBJ(h.cs); let r;
      if (t > 21) r = 'bust'; else if (pbj && !dbj) r = 'bj'; else if (dbj && !pbj) r = 'lose'; else if (pbj && dbj) r = 'push'; else if (dt > 21 || t > dt) r = 'win'; else if (t === dt) r = 'push'; else r = 'lose';
      const pay = r === 'bj' ? h.bet + Math.floor(h.bet * 1.5) : r === 'win' ? h.bet * 2 : r === 'push' ? h.bet : 0;
      back += pay; net += pay - h.bet; h.res = r; h.done = true;
    }
    T.pay[u] = { back, net };
  }
  T.ph = 'done'; T.dl = Date.now() + DONE_MS; T.cur = T.order.length;
}
// one move at the table. amt = coins already taken from the player's wallet for a bet, a double or a split
function move(T, uid, a, o) {
  const now = Date.now(), me = T.seats[uid];
  if (a === 'sit') {
    if (!me) { if (Object.keys(T.seats).length >= SEATS) bad('The table is full.'); T.seats[uid] = { n: o.n, s: o.s, bet: 0, hands: [] }; }
    else { me.gone = null; me.n = o.n; me.s = o.s; }
    return;
  }
  if (a === 'leave') {
    if (!me) return;
    if (T.ph === 'play' && T.order.includes(uid)) { me.gone = true; if (T.order[T.cur] === uid) { for (const h of me.hands) h.done = true; seek(T); } }
    else if (T.ph === 'done' && T.order.includes(uid)) me.gone = true;   // keep their cards on the table till the round is cleared
    else delete T.seats[uid];
    return;
  }
  if (a === 'bet') {
    if (!me) bad('Sit down first.');
    if (T.ph === 'play') bad('Wait for this hand to finish.');
    if (T.ph === 'done' || T.ph === 'idle') { fresh(T); T.ph = 'bet'; T.dl = now + BET_MS; }
    if (me.bet) bad('You have already bet.');
    me.bet = o.amt;
    const sat = Object.values(T.seats).filter(s => !s.gone);
    if (sat.length === 1) { deal(T); return; }   // (his call, 19 Nov) on your own at the table: no waiting, it deals at once
    if (sat.every(s => s.bet > 0)) T.dl = Math.min(T.dl, now + 1200);   // everyone is in: deal soon
    return;
  }
  if (a === 'tick') {
    if (T.ph === 'bet' && now >= T.dl) deal(T);
    else if (T.ph === 'play' && now >= T.dl) { const s = T.seats[T.order[T.cur]]; if (s && s.hands[T.hi]) s.hands[T.hi].done = true; seek(T); }   // too slow: they stand
    else if (T.ph === 'done' && now >= T.dl) fresh(T);
    return;
  }
  if (T.ph !== 'play' || T.order[T.cur] !== uid || !me) bad('Not your turn.');
  const h = me.hands[T.hi];
  if (a === 'hit') { h.cs.push(draw(T)); if (total(h.cs) >= 21) h.done = true; }
  else if (a === 'stand') h.done = true;
  else if (a === 'double') { if (h.cs.length !== 2 || o.amt !== h.bet) bad('You can only double on two cards.'); h.bet *= 2; h.dbl = true; h.cs.push(draw(T)); h.done = true; }
  else if (a === 'split') {
    if (me.hands.length !== 1 || h.cs.length !== 2 || val(h.cs[0].r) !== val(h.cs[1].r) || o.amt !== h.bet) bad('You cannot split that.');
    const h2 = { cs: [h.cs.pop()], bet: h.bet, split: true }; h.split = true; h.cs.push(draw(T)); h2.cs.push(draw(T)); me.hands.push(h2);
    if (h.cs[0].r === 'A') h.done = h2.done = true;   // split Aces: one card each
  }
  else bad('Unknown move.');
  seek(T);
}
// what the phones see: no shoe, and the hole card face down until the dealer plays
function pub(T) {
  const out = { ph: T.ph, dl: T.dl || 0, r: T.r | 0, v: T.v | 0, now: Date.now(), cur: T.cur | 0, hi: T.hi | 0, order: T.order, pay: T.pay || null, seats: {} };
  out.d = T.d.map((c, i) => i === 1 && T.ph !== 'done' ? { down: true } : c);
  for (const [u, s] of Object.entries(T.seats)) out.seats[u] = { n: s.n, s: s.s, bet: s.bet || 0, gone: !!s.gone, hands: s.hands.map(h => ({ cs: h.cs, bet: h.bet, dbl: !!h.dbl, split: !!h.split, res: h.res || null, done: !!h.done })) };
  return out;
}
module.exports = { norm, move, pub, total, Bad, BET_MS, TURN_MS, DONE_MS };
