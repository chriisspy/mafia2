// BUYING COINS (27 Nov 2026, his ask: "$2.50 = 1,000 coins, $5 = 2,500, $10 = 6,500", AUD, just the three packs, Apple Pay if possible).
// Paid through STRIPE CHECKOUT on MAFIA 2's own Stripe account (his call: a separate business inside his Stripe login, apart from Respond).
// Checkout shows cards, Apple Pay and Google Pay by itself. The money never touches the game: the phone only gets a Stripe page to go to.
//   1. op coinBuy {pack, back}   -> makes a Checkout Session for that pack (price set HERE, never by the phone) and returns its url.
//   2. the player pays on Stripe's page and comes back to the game (back + ?paid=<session id>).
//   3. Stripe calls stripeHook (checkout.session.completed): the signature is checked with the webhook secret, and only then
//      are the coins added, ONCE per session (wallet.buy[sessionId]); every sale is kept at buys/{sessionId}.
// Secrets (he sets them himself, never in the code):  npx.cmd firebase-tools functions:secrets:set STRIPE_SK   and   STRIPE_WH
// Only Google accounts can buy (a guest account is lost with the phone, and the coins with it).
const crypto = require('crypto');
const PACKS = { p1: { aud: 250, coins: 1000 }, p2: { aud: 500, coins: 2500 }, p3: { aud: 1000, coins: 6500 } };   // aud = cents
const BACK_OK = /^(https:\/\/chriisspy\.github\.io\/mafia2\/|http:\/\/(localhost|127\.0\.0\.1):\d+\/)/;   // where Stripe may send the player back to
module.exports = ({ db, bad, tx, SK }) => {
  const stripe = async (path, form) => {
    const r = await fetch('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + String(SK()).trim(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() });
    const j = await r.json(); if (!r.ok) { console.error('stripe', path, j && j.error && j.error.message); bad('The shop is not open right now. Try again later.'); } return j; };
  const ops = {
    coinBuy: async (uid, d) => {
      if (!d._google) bad('Sign in with Google to buy coins.');
      const P = PACKS[d.pack]; if (!P) bad('No such pack.');
      const back = String(d.back || ''); if (!BACK_OK.test(back)) bad('Bad page.');
      const base = back.split(/[?#]/)[0];
      const s = await stripe('checkout/sessions', {
        mode: 'payment', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'aud', 'line_items[0][price_data][unit_amount]': String(P.aud),
        'line_items[0][price_data][product_data][name]': P.coins.toLocaleString('en-AU') + ' MAFIA 2 coins',
        client_reference_id: uid, 'metadata[uid]': uid, 'metadata[pack]': d.pack, 'metadata[coins]': String(P.coins),
        success_url: base + 'checkout-return.html?paid={CHECKOUT_SESSION_ID}', cancel_url: base + 'checkout-return.html?cancel=1'});
      return { url: s.url };
    } };
  // the webhook: Stripe's signature (t=..., v1=...) over "t.rawBody" with the webhook secret, at most 5 minutes old
  const verify = (raw, head, secret) => {
    const p = Object.fromEntries(String(head || '').split(',').map(x => x.split('=')).filter(x => x.length === 2)); const t = +p.t; if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
    const want = crypto.createHmac('sha256', secret).update(t + '.' + raw).digest('hex');
    return String(head).split(',').some(x => { const [k, v] = x.split('='); return k === 'v1' && v && v.length === want.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(want)); }); };
  const hook = async (req, res, WH) => {
    if (req.method !== 'POST' || !verify(req.rawBody, req.get('stripe-signature'), String(WH()).trim())) { res.status(400).send('bad'); return; }
    const ev = JSON.parse(req.rawBody.toString('utf8'));
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      const s = ev.data.object, uid = s.metadata && s.metadata.uid, P = PACKS[s.metadata && s.metadata.pack];
      if (s.payment_status === 'paid' && uid && P && /^[A-Za-z0-9]{10,40}$/.test(uid) && s.amount_total === P.aud && s.currency === 'aud') {
        const id = String(s.id).replace(/[.#$\[\]\/]/g, '_');
        await tx(uid, w => { w.buy = w.buy || {}; if (w.buy[id]) return {}; w.buy[id] = Date.now(); w.c += P.coins; return {}; });
        await db.ref('buys/' + id).set({ uid, pack: s.metadata.pack, coins: P.coins, aud: P.aud, at: Date.now(), live: !!ev.livemode });
      } else console.error('unexpected session', s.id, s.payment_status, s.amount_total, s.currency);
    }
    res.status(200).send('ok'); };
  return { ops, hook, PACKS };
};
