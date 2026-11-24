// THE MARKET (24 Nov 2026, his ask): players open a stall in a world's market square for 2,500 coins. The world's owner says yes
// or no; the coins are held by the server until then (no = they go back). A stall sells things its keeper owns, at prices the
// keeper sets; the server holds each thing while it is for sale, so nothing can be sold twice. 5% of every sale goes to the
// world's owner (the landlord). Also: THE MAKER unlock (7,500 coins once) for drawing props and wearable cosmetics.
//   worlds/{wid}/mreq/{plot}   = {uid, n, name, kind, col, at}                      a request waiting for the owner
//   worlds/{wid}/market/{plot} = {uid, n, name, kind, col, at, items: {key: item}}  an open stall
//     item = {t: 'dec'|'fish'|'gold'|'skin'|'mk', id, q (how many; -1 = no end, for your own designs), price (each), f (a fish)}
//   wallet: mreq = {wid, plot, amt} (your request's held coins), maker = 1, cos = {designId: 1} (cosmetics you own)
const STALL_PRICE = 2500, PLOTS = 8, MAX_ITEMS = 12, FEE = 0.05, MAKER_PRICE = 7500;
const KINDS = { decor: ['dec'], fish: ['fish'], gold: ['gold'], outfits: ['skin'], made: ['mk'], mixed: ['dec', 'fish', 'gold', 'skin', 'mk'] };

module.exports = ({ db, tx, spend, bad, C }) => {
  const W = wid => { if (!/^[-\w]+$/.test(String(wid || ''))) bad('Bad world.'); return 'worlds/' + wid; };
  const member = async (wid, uid) => { if (!(await db.ref(W(wid) + '/members/' + uid).get()).exists()) bad('You are not in that world.'); };
  const owner = async wid => (await db.ref(W(wid) + '/meta/owner').get()).val();
  const plotOf = p => { const n = p | 0; if (!(n >= 0 && n < PLOTS)) bad('Bad stall.'); return n; };
  const price = v => { const n = Math.floor(+v); if (!(n >= 1 && n <= 1000000)) bad('Pick a price from 1 to 1,000,000.'); return n; };
  const name = async uid => { const p = (await db.ref('profiles/' + uid).get()).val() || {}; return String(p.n || 'Player').slice(0, 10); };
  // give a thing back to (or to) someone's wallet
  const give = (w, it, q) => {
    if (it.t === 'dec') { w.dec = w.dec || {}; w.dec[it.id] = (w.dec[it.id] || 0) + q; }
    else if (it.t === 'gold') w.kit.gold = (w.kit.gold | 0) + q;
    else if (it.t === 'fish') { if (w.kit.bag.length >= (C.fishBag || 99) + 20) bad('Their fish bag is full.'); w.kit.bag.push(it.f); }
    else if (it.t === 'skin') w.own[it.id] = 1;
  };
  const isCos = async id => { const m = /^@([\w-]+):([-\w]+)$/.exec(id); if (!m) return false; return !!(await db.ref('props/' + m[1] + '/' + m[2] + '/cos').get()).val(); };

  const ops = {
    makerUnlock: (uid) => tx(uid, w => { if (w.maker) return { already: true }; spend(w, MAKER_PRICE); w.maker = 1; return {}; }),

    // ask for a stall: the coins are held now
    async mkAsk(uid, d) {
      const wid = d.wid, plot = plotOf(d.plot); await member(wid, uid);
      const nm = String(d.name || '').replace(/[^\w '&!.-]/g, '').trim().slice(0, 16); if (nm.length < 2) bad('Give your stall a name.');
      const kind = KINDS[d.kind] ? d.kind : bad('Pick what you will sell.'), col = (d.col | 0) % 3;
      if ((await db.ref(W(wid) + '/market/' + plot).get()).exists()) bad('That stall is taken.');
      const mk = (await db.ref(W(wid) + '/market').get()).val() || {}; if (Object.values(mk).some(s => s && s.uid === uid)) bad('You already have a stall here.');
      const req = { uid, n: await name(uid), name: nm, kind, col, at: Date.now() };
      const r = await db.ref(W(wid) + '/mreq/' + plot).transaction(cur => cur ? undefined : req); if (!r.committed) bad('Someone already asked for that stall.');
      try { await tx(uid, w => { if (w.mreq) bad('You already asked for a stall. Wait for an answer.'); spend(w, STALL_PRICE); w.mreq = { wid, plot, amt: STALL_PRICE }; return {}; }); }
      catch (e) { await db.ref(W(wid) + '/mreq/' + plot).remove(); throw e; }
      if ((await owner(wid)) === uid) return ops.mkAnswer(uid, { wid, plot, yes: true });   // your own world: yes straight away
      return { asked: true };
    },
    // the owner's answer
    async mkAnswer(uid, d) {
      const wid = d.wid, plot = plotOf(d.plot); if ((await owner(wid)) !== uid) bad('Only the world owner can answer.');
      const ref = db.ref(W(wid) + '/mreq/' + plot), req = (await ref.get()).val(); if (!req) bad('That request is gone.');
      await ref.remove();
      if (d.yes) {
        await tx(req.uid, w => { w.mreq = null; return {}; });
        await db.ref(W(wid) + '/market/' + plot).set({ uid: req.uid, n: req.n, name: req.name, kind: req.kind, col: req.col, at: Date.now() });
        return { opened: true };
      }
      await tx(req.uid, w => { if (w.mreq && w.mreq.wid === wid && w.mreq.plot === plot) { w.c += w.mreq.amt; w.mreq = null; } return {}; });
      return { said: 'no' };
    },
    // take your own request back (coins back)
    async mkCancel(uid, d) {
      let held = null; await tx(uid, w => { held = w.mreq; return {}; }); if (!held) bad('You have no request.');
      const ref = db.ref(W(held.wid) + '/mreq/' + held.plot), req = (await ref.get()).val(); if (req && req.uid === uid) await ref.remove();
      await tx(uid, w => { if (w.mreq) { w.c += w.mreq.amt; w.mreq = null; } return {}; }); return {};
    },
    // close a stall (its keeper, or the world owner): everything still for sale goes back to the keeper; the 2,500 does not come back
    async mkClose(uid, d) {
      const wid = d.wid, plot = plotOf(d.plot), ref = db.ref(W(wid) + '/market/' + plot), s = (await ref.get()).val(); if (!s) bad('That stall is empty.');
      if (s.uid !== uid && (await owner(wid)) !== uid) bad('That is not your stall.');
      await ref.remove();
      const back = Object.values(s.items || {}).filter(it => it.t !== 'mk');
      if (back.length) await tx(s.uid, w => { for (const it of back) give(w, it, it.q); return {}; });
      return {};
    },
    // put something up for sale: it leaves your wallet now
    async mkList(uid, d) {
      const wid = d.wid; await member(wid, uid);
      const mk = (await db.ref(W(wid) + '/market').get()).val() || {}, plot = Object.keys(mk).find(k => mk[k] && mk[k].uid === uid); if (plot == null) bad('You have no stall here.');
      const s = mk[plot], items = s.items || {}; if (Object.keys(items).length >= MAX_ITEMS) bad('Your stall is full (' + MAX_ITEMS + ' things).');
      const t = String(d.t), p = price(d.price); if (!KINDS[s.kind].includes(t)) bad('Your stall does not sell that.');
      let it = null;
      if (t === 'mk') {
        const id = String(d.id || ''); if (!id.startsWith('@' + uid + ':')) bad('You can only sell copies of your own designs.');
        if (!(await db.ref('props/' + uid + '/' + id.split(':')[1]).get()).exists()) bad('No such design.');
        if (Object.values(items).some(x => x.t === 'mk' && x.id === id)) bad('That design is already for sale.');
        it = { t, id, q: -1, price: p };
      } else await tx(uid, w => {
        if (t === 'dec') { const id = String(d.id), q = Math.max(1, d.q | 0); w.dec = w.dec || {}; if ((w.dec[id] || 0) < q) bad('You do not have that many.'); w.dec[id] -= q; if (!w.dec[id]) delete w.dec[id]; it = { t, id, q, price: p }; }
        else if (t === 'gold') { const q = Math.max(1, d.q | 0); if ((w.kit.gold | 0) < q) bad('You do not have that much gold.'); w.kit.gold -= q; it = { t, id: 'gold', q, price: p }; }
        else if (t === 'fish') { const i = d.bag | 0, f = w.kit.bag[i]; if (!f) bad('That fish is gone.'); w.kit.bag.splice(i, 1); it = { t, id: 'fish' + f[0], f, q: 1, price: p }; }
        else if (t === 'skin') { const id = String(d.id); if (!w.own[id]) bad('You do not own that outfit.'); if ((C.start || []).includes(id)) bad('Everyone starts with that one.'); delete w.own[id]; it = { t, id, q: 1, price: p }; }
        else bad('Bad thing.');
        return {};
      });
      const key = db.ref().push().key; await db.ref(W(wid) + '/market/' + plot + '/items/' + key).set(it); return { key };
    },
    // take it back off the stall
    async mkUnlist(uid, d) {
      const wid = d.wid, plot = plotOf(d.plot), key = String(d.key || ''), ref = db.ref(W(wid) + '/market/' + plot);
      const s = (await ref.get()).val(); if (!s || s.uid !== uid) bad('That is not your stall.');
      let it = null; const r = await ref.child('items/' + key).transaction(cur => { it = cur; return null; }); if (!r.committed || !it) bad('That is gone.');
      if (it.t !== 'mk') await tx(uid, w => { give(w, it, it.q); return {}; });
      return {};
    },
    // buy: you pay, the keeper gets 95%, the world owner 5%, and the thing is yours
    async mkBuy(uid, d) {
      const wid = d.wid, plot = plotOf(d.plot), key = String(d.key || ''); await member(wid, uid);
      const sref = db.ref(W(wid) + '/market/' + plot), s = (await sref.child('uid').get()).val(); if (!s) bad('That stall is closed.'); if (s === uid) bad('That is your own stall.');
      const it0 = (await sref.child('items/' + key).get()).val(); if (!it0) bad('Sold out.');
      const q = it0.t === 'gold' || it0.t === 'dec' ? Math.max(1, Math.min(d.q | 0 || 1, it0.q === -1 ? 99 : it0.q)) : 1;
      if (it0.t === 'mk' && (await isCos(it0.id))) { const w = (await db.ref('wallet/' + uid + '/cos/' + it0.id).get()).val(); if (w) bad('You already have that.'); }
      const cost = it0.price * q;
      await tx(uid, w => { spend(w, cost); return {}; });
      let ok = false; const r = await sref.child('items/' + key).transaction(cur => { if (!cur || cur.price !== it0.price) return; if (cur.q === -1) { ok = true; return cur; } if (cur.q < q) return; ok = true; return cur.q === q ? null : { ...cur, q: cur.q - q }; });
      if (!r.committed || !ok) { await tx(uid, w => { w.c += cost; return {}; }); bad('Sold out.'); }
      const cos = it0.t === 'mk' && (await isCos(it0.id));
      await tx(uid, w => { if (it0.t === 'mk') { if (cos) { w.cos = w.cos || {}; w.cos[it0.id] = 1; } else { w.dec = w.dec || {}; w.dec[it0.id] = (w.dec[it0.id] || 0) + q; } } else give(w, it0, q); return {}; });
      const boss = await owner(wid), fee = boss && boss !== s ? Math.floor(cost * FEE) : 0;
      await tx(s, w => { w.c += cost - fee; return {}; });
      if (fee) await tx(boss, w => { w.c += fee; return {}; });
      return { got: q, paid: cost };
    },
  };
  return ops;
};
