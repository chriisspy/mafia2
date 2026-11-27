// THE WORLD LEADERBOARD (27 Nov 2026, his ask): who made the most coins this month in a world, with the hours they have played, where they spent
// them (fishing, mining, the clicker, the casino, racing), the device they are on and the coins they hold. The winner of each month gets one of every
// case free and 500 coins.
//   lb/{uid} = { mo: 'YYYY-MM' (Sydney), e: coins EARNED this month, mt: minutes played this month,
//                t: minutes played ever, k: {fish, mine, click, casino, race: minutes ever},
//                co: coins held, d: device name, n: username, sk: outfit, bt: time of the last counted minute,
//                pm: {mo, e, mt} the month before (kept when the month turns, for the prize) }
//   Only this server writes it (database.rules.json: lb .write false); everyone signed in can read it.
// EARNED (his pick, over "coins they have" and "hours played") = the net change in coins from PLAYING: fishing sales, smelting, the clicker, the daily
// coins, the game payout, and what the casino games give or take (a loss counts against you). Buying coins with real money, gifts, market trades,
// refunds and anything you spend in a shop are NOT counted: index.js names the ops that count (EARN) and tx() reports their change here.
// TIME: the phone says "one more minute, doing this" (op beat). The server never counts two minutes less than 50 s apart, so nobody can run the clock fast.
// THE PRIZE (his rule: only if at least 4 people in that world played that month, or one person with a world of their own would farm it):
//   op lbClaim {wid}: last month's winner of that world collects once. One prize a world a month (lbwin/{wid}/{mo}), one prize a player a month (wallet.lbw).
module.exports = ({ db, bad, tx, C }) => {
  const MIN_PLAYERS = 4, PRIZE_COINS = 500;
  const CATS = new Set(['fish', 'mine', 'click', 'casino', 'race']);
  const ym = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit' }).format(d);   // '2026-11'
  const monthKey = () => ym(new Date());
  const prevKey = () => { const [y, m] = monthKey().split('-').map(Number); return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); };
  const roll = (s, mo) => { if (s.mo !== mo) { if (s.mo) s.pm = { mo: s.mo, e: s.e | 0, mt: s.mt | 0 }; s.mo = mo; s.e = 0; s.mt = 0; } return s; };
  // coins earned (or lost) by playing: called by tx() in index.js for the ops that count
  const earn = (uid, n) => db.ref('lb/' + uid).transaction(s => { s = roll(s || {}, monthKey()); s.e = (s.e | 0) + n; return s; });
  // what a player made in a given month, wherever that month is kept on their card
  const inMonth = (s, mo) => s && s.mo === mo ? { e: s.e | 0, mt: s.mt | 0 } : s && s.pm && s.pm.mo === mo ? { e: s.pm.e | 0, mt: s.pm.mt | 0 } : { e: 0, mt: 0 };
  const ops = {
    // Members can see coin totals for their world. The wallets themselves stay private.
    lbBalances: async (uid, d) => {
      const wid = String(d.wid || '');
      if (!/^[-\w]{5,40}$/.test(wid)) bad('Bad world.');
      const joined = id => db.ref(`userWorlds/${id}/${wid}`).get();
      const [members, ownMembership] = await Promise.all([db.ref(`worlds/${wid}/members`).get(), joined(uid)]);
      if (!members.child(uid).exists() || !ownMembership.exists()) bad('You are not in that world.');
      const ids = Object.keys(members.val()).slice(0, 12);
      const entries = await Promise.all(ids.map(async id => {
        // A world owner can edit the roster. The member's own join record confirms they joined.
        if (id !== uid && !(await joined(id)).exists()) return [id, null];
        const balance = (await db.ref(`wallet/${id}/c`).get()).val();
        return [id, Number.isSafeInteger(balance) && balance >= 0 ? balance : null];
      }));
      return { balances: Object.fromEntries(entries) };
    },
    // one more minute of play, and what the card shows beside the numbers: device, coins held, username, outfit
    beat: async (uid, d) => {
      const a = CATS.has(d.a) ? d.a : '', sk = /^[a-z0-9_]{1,24}$/.test(String(d.sk || '')) ? String(d.sk) : null;
      const [c, u] = await Promise.all([db.ref('wallet/' + uid + '/c').get(), db.ref('profiles/' + uid + '/u').get()]);
      await db.ref('lb/' + uid).transaction(s => {
        s = roll(s || {}, monthKey()); const now = Date.now();
        s.co = c.val() | 0; s.d = String(d._devName || 'A device').slice(0, 40); if (u.val()) s.n = String(u.val()).slice(0, 16); if (sk) s.sk = sk;
        if (now - (s.bt || 0) >= 50000) { s.bt = now; s.t = (s.t | 0) + 1; s.mt = (s.mt | 0) + 1; if (a) { s.k = s.k || {}; s.k[a] = (s.k[a] | 0) + 1; } }
        return s;
      });
      return {};
    },
    lbClaim: async (uid, d) => {
      const wid = String(d.wid || ''); if (!/^[-\w]{5,40}$/.test(wid)) bad('Bad world.');
      const mem = (await db.ref(`worlds/${wid}/members`).get()).val() || {}; if (!mem[uid]) bad('You are not in that world.');
      const mo = prevKey(), ids = Object.keys(mem).slice(0, 12);
      const rows = (await Promise.all(ids.map(id => db.ref('lb/' + id).get().then(s => ({ id, ...inMonth(s.val(), mo) }))))).sort((a, b) => b.e - a.e);
      if (rows.filter(r => r.mt > 0).length < MIN_PLAYERS) bad('The prize needs ' + MIN_PLAYERS + ' players who played that month.');
      if (!rows.length || rows[0].e <= 0 || rows[0].id !== uid) bad('Only last month\'s winner can collect it.');
      const r = await db.ref(`lbwin/${wid}/${mo}`).transaction(cur => cur === null ? { uid, e: rows[0].e, at: Date.now() } : undefined);
      if (!r.committed) bad('That prize was already collected.');
      let twice = false;
      await tx(uid, w => { if (w.lbw === mo) { twice = true; return {}; } w.lbw = mo; w.c += PRIZE_COINS; w.fc = w.fc || {}; for (const k of Object.keys(C.cases)) w.fc[k] = (w.fc[k] | 0) + 1; return {}; });
      if (twice) { await db.ref(`lbwin/${wid}/${mo}`).remove().catch(() => {}); bad('You already collected a prize for that month in another world.'); }
      return { coins: PRIZE_COINS, cases: Object.keys(C.cases) };
    },
  };
  return { ops, earn };
};
