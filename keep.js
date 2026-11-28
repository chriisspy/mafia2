/* ================= REASONS TO COME BACK (28 Nov 2026, his ask; batch 1) =================
   THE 7-DAY STREAK and THE DAILY TASKS, both on the Daily screen (his pick: the streak takes the place of the flat daily coins).
   The server decides everything (functions/keep.js, read its top): which day of the streak it is, today's three tasks, how far along each one
   is, and what it pays. This file only draws them and sends "collect".
     WALLET.day.c = the day you last collected, WALLET.day.n = which day of the streak that was (1..7)
     WALLET.tk    = { k: day, ids: [three task ids], p: {id: done so far}, d: {id: 1 paid}, b: 1 bonus paid }
   KEEP_STREAK and KEEP_TASKS mirror the server's lists (for the words and the numbers on the screen). Change one, change the other. */
(() => {
  const KEEP_STREAK = [100, 150, 200, 250, 300, 400, 500];   // day 7 also gives a free case
  const KEEP_TASKS = {   // id: [what it says, how many, coins]
    /* the hard task also gives 1 crystal shard; all three done gives 1 more (the server's HARD_SHARDS, ALL_SHARDS) */
    fish3: ['Catch 3 fish', 3, 40], flip2: ['Flip the coin 2 times', 2, 40], slot5: ['Spin the slots 5 times', 5, 40], wheel1: ['Spin the town wheel', 1, 40], beer1: ['Have a beer', 1, 40], rock15: ['Break 15 rocks', 15, 40],
    fish8: ['Catch 8 fish', 8, 90], rock40: ['Break 40 rocks', 40, 90], slot15: ['Spin the slots 15 times', 15, 90], click2: ['Play Chrispy Clicker 2 times', 2, 90], flip5: ['Flip the coin 5 times', 5, 90],
    fish20: ['Catch 20 fish', 20, 160], rock120: ['Break 120 rocks', 120, 160], slot40: ['Spin the slots 40 times', 40, 160], click5: ['Play Chrispy Clicker 5 times', 5, 160], case1: ['Open a case', 1, 160],
    /* THE CRYSTAL CHALLENGE (his rule: a crystal only for something genuinely hard): the fourth task of the day, the only one that pays a crystal */
    casino5k: ['Win 5,000 coins at the casino', 5000, 0], flipwin6: ['Win 6 coin flips', 6, 0], slotwin20: ['Win on the slots 20 times', 20, 0], fish40: ['Catch 40 fish', 40, 0],
    fishrare10: ['Catch 10 rare fish', 10, 0], rock300: ['Break 300 rocks', 300, 0], gold400: ['Mine 400 gold', 400, 0], smelt600: ['Collect 600 coins from the Blacksmith', 600, 0],
    click3: ['Score 50 in Chrispy Clicker 3 times', 3, 0], laps10: ['Drive 10 laps at the race track', 10, 0], case3: ['Open 3 cases', 3, 0]};
  const prevKey = k => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) - 864e5).toISOString().slice(0, 10);
  const coin = n => ic('aCoin', 2, 'solo') + '<span>' + n + '</span>';
  const SHARD = (() => { const R = ['..KK.', '.KWCK', 'KWCDK', 'KCDK.', '.KK..'], C = {K: '#1a1430', W: '#eaffff', C: '#6fe3ff', D: '#2f9fd6'}, c = mk(5, 5), x = c.getContext('2d'); R.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return c.toDataURL(); })();
  const shard = (sc) => `<img src="${SHARD}" alt="" style="width:${5 * (sc || 3)}px;height:${5 * (sc || 3)}px;image-rendering:pixelated;vertical-align:-2px">`;   // a crystal shard: a chip of the crystal's own blues
  const cry = () => typeof CRY_ICON !== 'undefined' ? `<img src="${CRY_ICON.toDataURL()}" alt="" style="width:${CRY_ICON.width * 2}px;height:${CRY_ICON.height * 2}px;image-rendering:pixelated">` : '';

  const st = document.createElement('style');
  st.textContent = `
#dailyModal{max-height:calc(100% - 24px);overflow:auto;scrollbar-width:none}#dailyModal::-webkit-scrollbar{display:none}
#kpCal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px}
.kpD{display:flex;flex-direction:column;align-items:center;gap:2px;background:#fff6df;border:3px solid var(--wood);border-radius:6px;padding:4px 0 5px;font:700 11px 'Pixelify Sans';color:var(--text);min-width:0}
.kpD small{font:700 9px 'Pixelify Sans';letter-spacing:.5px;opacity:.7}.kpD b{font:700 12px 'Pixelify Sans'}
.kpD .pic{height:22px;display:flex;align-items:center;justify-content:center}
.kpD.done{background:#cfe9c0;border-color:#3e8948}.kpD.now{background:#ffe08a;border-color:#1a1430;box-shadow:0 0 0 2px #ffd25e}
.kpD.lock{opacity:.55}
.kpH{font:700 13px 'Pixelify Sans';letter-spacing:1.5px;text-align:left;margin:12px 2px 0;opacity:.75}
.kpT{display:flex;align-items:center;gap:8px;background:#fff6df;border:3px solid var(--wood);border-radius:6px;padding:6px 8px 7px;margin-top:6px;text-align:left}
.kpT .tx{flex:1;min-width:0}.kpT .tx b{display:block;font:700 15px 'Pixelify Sans';line-height:1.1}
.kpT .kpB{height:8px;margin-top:5px;background:#e4d6b4;border:2px solid var(--wood);border-radius:4px;overflow:hidden}.kpT .kpB i{display:block;height:100%;background:#5fc46f}
.kpT .n{font:700 12px 'Pixelify Sans';opacity:.7;white-space:nowrap}
.kpT .btn{flex:none;min-width:86px;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:15px;padding:4px 8px 8px;--accent:#5fc46f}
.kpT.paid{background:#efe3c6}.kpT.paid .tx{opacity:.6}
.kpT.all{background:#e9e0ff;border-color:#4b3a8a}.kpT.all .pic{flex:none;width:30px;display:flex;justify-content:center}`;
  document.head.appendChild(st);

  // the Daily screen's new parts: the calendar above the coins card, the tasks under the free spin
  $('#dcCoins').insertAdjacentHTML('beforebegin', '<div id="kpCal"></div>');
  $('#dcSpin').insertAdjacentHTML('afterend', '<div class="kpH">TODAY\'S TASKS</div><div id="kpTasks"></div>');

  const streak = () => { const t = dayKey(), c = WALLET.day.c, n = WALLET.day.n | 0; return c === t ? {day: n || 1, got: true} : c === prevKey(t) ? {day: (n % 7) + 1, got: false} : {day: 1, got: false}; };
  const tasks = () => { const T = WALLET.tk; return T && T.k === dayKey() && Array.isArray(T.ids) ? T : null; };
  const ready = () => { const T = tasks(); if (!T) return 0; const p = T.p || {}, d = T.d || {}; let n = T.ids.filter(id => KEEP_TASKS[id] && (p[id] | 0) >= KEEP_TASKS[id][1] && !d[id]).length; if (!T.b && T.ids.slice(0, 3).every(id => d[id])) n++; return n; };

  function paint() {
    const S = streak(), T = tasks(), sig = JSON.stringify([S, T, coins > 0]);
    { const n = (dayCoins() ? 1 : 0) + (daySpin() ? 1 : 0) + ready(); $('#townDaily').classList.toggle('new', n > 0); $('#dailyDot').textContent = n || ''; }   // the red dot counts tasks ready to collect too
    if (sig === paint.sig) return; paint.sig = sig;
    $('#kpCal').innerHTML = KEEP_STREAK.map((c, i) => { const d = i + 1, done = d < S.day || (d === S.day && S.got), now = d === S.day && !S.got;
      return `<div class="kpD${done ? ' done' : now ? ' now' : ' lock'}"><small>DAY ${d}</small><span class="pic">${done ? ic('check', 2, 'solo') : d === 7 ? ic('case', 2, 'solo') : ic('aCoin', 2, 'solo')}</span><b>${c}</b></div>`; }).join('');
    $('#dcCoins .dtx b').textContent = 'Day ' + S.day + (S.got ? '' : ' · ' + KEEP_STREAK[S.day - 1] + ' coins' + (S.day === 7 ? ' + a case' : ''));
    const box = $('#kpTasks'); if (!T) { box.innerHTML = ''; return; }
    const p = T.p || {}, d = T.d || {};
    const row = (id, big) => { const k = KEEP_TASKS[id]; if (!k) return ''; const n = Math.min(p[id] | 0, k[1]), ok = n >= k[1], paid = !!d[id];
      return `<div class="kpT${paid ? ' paid' : ''}${big ? ' all' : ''}">${big ? `<span class="pic">${cry()}</span>` : ''}<div class="tx"><b>${k[0]}</b><div class="kpB"><i style="width:${Math.round(n / k[1] * 100)}%"></i></div></div><span class="n">${n.toLocaleString()}/${k[1].toLocaleString()}</span>
<button class="btn go" data-t="${id}" ${ok && !paid ? '' : 'disabled'}>${paid ? ic('check', 2, 'solo') : big ? '1 ' + cry() : coin(k[2]) + (k[2] >= 160 ? ' ' + shard() : '')}</button></div>`; };
    const three = T.ids.slice(0, 3), ch = T.ids[3];
    box.innerHTML = three.map(id => row(id)).join('')
      + `<div class="kpT${T.b ? ' paid' : ''}"><div class="tx"><b>All three</b></div><button class="btn go" data-t="*" ${!T.b && three.every(id => d[id]) ? '' : 'disabled'}>${T.b ? ic('check', 2, 'solo') : '1 ' + shard()}</button></div>`
      + (ch && KEEP_TASKS[ch] ? '<div class="kpH">CRYSTAL CHALLENGE</div>' + row(ch, true) : '');
  }
  $('#kpTasks').addEventListener('click', async e => { const b = e.target.closest('button[data-t]'); if (!b || b.disabled) return; const id = b.dataset.t, done = btnBusy(b, '…');
    try { await srv(id === '*' ? 'tkBonus' : 'tkClaim', {id}); sfx(KEEP_TASKS[id] && !KEEP_TASKS[id][2] ? 'rare' : 'coin'); } catch (er) { wlSay(er.message, 'bad'); } done(); paint.sig = null; paint(); });

  // the Daily screen paints these with its own cards, and asks the server for today's three the first time it opens each day
  const dp = dayPaint; dayPaint = function () { dp(); paint(); }; dayPaint.sig = null;
  $('#townDaily').addEventListener('click', () => { paint.sig = null; paint(); if ((!tasks() || tasks().ids.length < 4) && !paint.ask) { paint.ask = true; srv('tkSync').catch(() => {}).then(() => { paint.ask = false; }); } });
  setInterval(() => { if ($('#dailyModal').classList.contains('on') || !paint.sig) paint(); }, 1000);
  window.keepPaint = paint;

  /* ---------- CRYSTAL SHARDS at the Blacksmith (his idea): he puts every 5 you carry together into a crystal ---------- */
  const PER = 5; let SH = 0;
  { const wa = walletApply; walletApply = function (w) { wa(w); SH = ((w && w.kit && w.kit.sh) | 0); if (window.smithUI && $('#smithModal') && $('#smithModal').classList.contains('on')) smithUI(); }; }
  const hook = setInterval(() => { if (typeof smithUI !== 'function' || !$('#cryYes')) return; clearInterval(hook);
    $('#cryYes').insertAdjacentHTML('afterend', '<div class="small" style="margin-top:14px"><b>SHARDS</b> · <span id="smithSh"></span> · ' + PER + ' make a crystal.</div><button class="btn go wide" id="shYes"></button>');
    const su = smithUI; smithUI = function () { su(); const n = Math.floor(SH / PER), b = $('#shYes'), h = n ? `Forge ${n * PER} ${shard()} into ${n} ${cryImg(2)}` : `${SH} of ${PER} ${shard()}`;
      $('#smithSh').innerHTML = 'you have ' + SH + ' ' + shard(2); b.disabled = !n; if (b.dataset.h !== h) { b.dataset.h = h; b.innerHTML = h; } };
    $('#shYes').onclick = async () => { const b = $('#shYes'); if (b.disabled) return; b.disabled = true; try { await srv('forge'); sfx('rare'); } catch (e) { wlSay(e.message, 'bad'); } smithUI(); };
  }, 500);

  /* ---------- SETS, at the top of the Collection: how far along each one is, its title to collect, and the title you wear ---------- */
  const KEEP_SETS = {rods: ['Fishing rods', 'Master Angler'], fish: ['Every fish', 'Fish Whisperer'], pick: ['Pickaxes', 'Gold Digger'], common: ['Common outfits', 'Regular'], rare: ['Rare outfits', 'Head Turner'], epic: ['Epic outfits', 'Showstopper'], legendary: ['Legendary outfits', 'Legend']};
  const st2 = document.createElement('style');
  st2.textContent = `#kpSets{margin-bottom:12px}#kpSets .kpT{margin-top:5px;padding:5px 8px 6px}#kpSets .tx b{font-size:14px}#kpSets .tx b em{font-style:normal;font-size:11px;letter-spacing:.5px;color:#4a2a00;background:#ffd25e;border:2px solid #0f0b1e;border-radius:4px;padding:0 4px 1px;margin-left:5px;white-space:nowrap}
#kpSets .kpT.got{background:#e6f3dc;border-color:#3e8948}#kpSets .btn{min-width:82px;font-size:14px}`;
  document.head.appendChild(st2);
  $('#collModal .mhead').insertAdjacentHTML('afterend', '<div id="kpSets"></div>');
  let SETS = null;
  function setsPaint() { const box = $('#kpSets'); if (!SETS) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="kpH" style="margin-top:0">SETS</div>' + SETS.sets.map(s => { const k = KEEP_SETS[s.id]; if (!k) return ''; const full = s.n >= s.of, worn = SETS.title === s.id;
      return `<div class="kpT${s.got ? ' got' : ''}"><div class="tx"><b>${k[0]}<em>${k[1]}</em></b><div class="kpB"><i style="width:${Math.round(s.n / s.of * 100)}%"></i></div></div><span class="n">${s.n}/${s.of}</span>
<button class="btn go" data-s="${s.id}" data-a="${s.got ? (worn ? 'off' : 'wear') : 'claim'}" ${s.got || full ? '' : 'disabled'}>${s.got ? (worn ? 'Wearing' : 'Wear') : 'Collect'}</button></div>`; }).join(''); }
  async function setsLoad() { try { SETS = await srv('sets'); } catch (e) { SETS = null; } setsPaint(); }
  $('#kpSets').addEventListener('click', async e => { const b = e.target.closest('button[data-s]'); if (!b || b.disabled) return; const id = b.dataset.s, a = b.dataset.a, done = btnBusy(b, '…');
    try { if (a === 'claim') { await srv('setClaim', {id}); sfx('rare'); await srv('titleSet', {id}); } else await srv('titleSet', {id: a === 'wear' ? id : ''}); sfx('click'); } catch (er) { wlSay(er.message, 'bad'); } done(); setsLoad(); });
  { const oc = openColl; openColl = function () { const r = oc.apply(this, arguments); setsPaint(); setsLoad(); return r; };
    document.querySelectorAll('button').forEach(b => { if (b.onclick === oc) b.onclick = () => openColl(); }); }   // buttons that were handed the old function itself
  window.keepSets = v => { SETS = v; setsPaint(); };   // the lab: show a made-up set list
})();
