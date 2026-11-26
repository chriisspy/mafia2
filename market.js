/* ================= THE MARKET + COSMETICS (24 Nov 2026, his ask) =================
   THE MARKET: the eight stalls in the South's market square. Tap an empty one to ask for it (2,500 coins, held by the server);
   the world's owner says yes or no (no = the coins come back). Your stall sells what you own, at your prices: decorations, fish,
   gold, outfits, and copies of your own designs (props and cosmetics from the maker). Every sale pays 5% to the world's owner.
   Server: functions/market.js. Data: worlds/{wid}/market/{plot}, worlds/{wid}/mreq/{plot}.
   Outside a world (practice town, the local test lab) the market runs on this phone only, with one test stall to buy from.
   COSMETICS: things you draw on the mannequin in the maker (prop.js) and wear over any outfit; you can sell copies of them. */

const MK = {stalls: {}, reqs: {}, wid: null, refs: [], me: {maker: 0, cos: {}, mreq: null}, plot: null, view: null, sel: null, local: null};
const MK_KINDS = [['mixed', 'A bit of everything'], ['decor', 'Decorations'], ['made', 'My designs'], ['outfits', 'Outfits'], ['fish', 'Fish'], ['gold', 'Gold']];
const MK_ALLOW = {decor: ['dec'], fish: ['fish'], gold: ['gold'], outfits: ['skin'], made: ['mk'], mixed: ['dec', 'fish', 'gold', 'skin', 'mk']};
const MK_COLS = ['red', 'blue', 'green'], MK_HEX = ['#e4544f', '#4a7bd0', '#5fc46f'], STALL_PRICE = 2500, MAKER_PRICE = 7500;
const mkWid = () => NET.on && NET.world && NET.code ? String(NET.code).replace(/^w:/, '') : null;
const mkOwner = () => (typeof WORLD !== 'undefined' && WORLD.meta && WORLD.meta.owner) || null;
const mkLocalOk = () => !mkWid();   // no world: this phone only

function marketLoad() {
  const L = (k, src) => load(k, src).catch(() => {});
  return Promise.all(['front', 'right', 'back'].map(d => L('man/' + d, `assets/maker/man-${d}.png`))).then(() => { manTops(); setInterval(mkWatch, 1000); mkWatch(); });
}

/* ---------- following the world's market ---------- */
function mkWatch() {
  const wid = mkWid(); if (wid === MK.wid && (wid || MK.local)) return;
  for (const [r, f] of MK.refs) r.off('value', f); MK.refs = []; MK.wid = wid; MK.stalls = {}; MK.reqs = {};
  if (!wid) { mkLocalInit(); return; }
  MK.local = null; const on = (path, fn) => { const r = NET.db.ref('worlds/' + wid + '/' + path), f = s => fn(s.val() || {}); r.on('value', f, () => {}); MK.refs.push([r, f]); };
  on('market', v => { MK.stalls = v; mkPaintIfOpen(); });
  on('mreq', v => { const old = MK.reqs; MK.reqs = v; mkPaintIfOpen();
    if (mkOwner() === NET.uid) for (const [p, q] of Object.entries(v)) if (q && !old[p] && q.uid !== NET.uid && MK.seen) { wlSay(`${q.n} wants a stall.`, 'good'); sfx('alert'); }
    MK.seen = true; });
}
function mkPaintIfOpen() { if ($('#mkModal').classList.contains('on')) mkPaint(); }

/* ---------- the same rules on this phone only (no world) ---------- */
function mkLocalInit() {
  MK.local = {coins: 0};
  MK.stalls = {5: {uid: 'npc', n: 'Leo', name: "Leo's Lot", kind: 'mixed', col: 2, items: {a: {t: 'gold', id: 'gold', q: 30, price: 1}, b: {t: 'dec', id: 'snowman', q: 2, price: 120}, c: {t: 'dec', id: 'campfire', q: 1, price: 300}}}};
}
function mkLocal(op, d) {
  const me = NET.uid || 'me', S = MK.stalls, need = n => { if (coins < n) throw new Error('Not enough coins.'); coins -= n; paintCoins(); };
  if (op === 'mkAsk') { if (Object.values(S).some(s => s.uid === me)) throw new Error('You already have a stall here.'); need(STALL_PRICE);
    S[d.plot] = {uid: me, n: myName || 'You', name: d.name, kind: d.kind, col: d.col, items: {}}; return {opened: true}; }
  if (op === 'mkClose') { delete S[d.plot]; return {}; }
  if (op === 'mkList') { const p = Object.keys(S).find(k => S[k].uid === me); if (p == null) throw new Error('You have no stall here.');
    const k = 'k' + Date.now(); S[p].items = S[p].items || {}; S[p].items[k] = {t: d.t, id: d.id, q: d.t === 'mk' ? -1 : (d.q || 1), price: d.price, f: d.f}; return {key: k}; }
  if (op === 'mkUnlist') { delete S[d.plot].items[d.key]; return {}; }
  if (op === 'mkBuy') { const it = S[d.plot].items[d.key]; if (!it) throw new Error('Sold out.'); const q = d.q || 1; need(it.price * q);
    if (it.q !== -1) { it.q -= q; if (it.q <= 0) delete S[d.plot].items[d.key]; } return {got: q, paid: it.price * q}; }
  if (op === 'makerUnlock') { need(MAKER_PRICE); MK.me.maker = 1; return {}; }
  throw new Error('Not here.');
}
async function mkOp(op, d) {
  if (!mkWid() && !(op === 'makerUnlock' && NET.uid && WALLET.ok)) { const r = mkLocal(op, d || {}); mkPaintIfOpen(); return r; }
  try { return await srv(op, {wid: mkWid(), ...(d || {})}); }
  catch (e) { if (/Unknown action/i.test(e.message) && typeof LABLOCAL !== 'undefined' && LABLOCAL) { const r = mkLocal(op, d || {}); mkPaintIfOpen(); return r; } throw e; }
}

/* ---------- what you own (from the wallet) ---------- */
{ const _wa = walletApply; walletApply = function (w) { _wa(w); MK.me.maker = w.maker | 0; MK.me.cos = w.cos || {}; MK.me.mreq = w.mreq || null; for (const id of Object.keys(MK.me.cos)) cosNeed(id); mkPaintIfOpen(); if ($('#collModal').classList.contains('on')) cosPaint(); }; }

/* ---------- drawing on the stalls: the awning colour they picked, a name plate, what is for sale ---------- */
window.marketCol = i => { const s = MK.stalls[i]; return s ? (s.col | 0) % 3 : i % 3; };
function marketStallDraw(i, x, y) {
  const s = MK.stalls[i]; if (!s) return;
  const items = Object.values(s.items || {}).slice(0, 3);
  items.forEach((it, k) => { const im = mkThumb(it); if (!im) return; const sc = Math.min(1, 12 / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * sc)), h = Math.max(1, Math.round(im.height * sc));
    lx.drawImage(im, X(x + 8 + k * 13 + Math.floor((12 - w) / 2)), Y(y + 32 - h), w, h); });   // on the counter
  const nm = String(s.name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 11), w = nm.length * 4 + 3, px = X(x + 24) - Math.floor(w / 2), py = Y(y + 40);
  lx.fillStyle = '#1a1430'; lx.fillRect(px - 1, py - 1, w + 2, 9); lx.fillStyle = '#fff6df'; lx.fillRect(px, py, w, 7); lx.fillStyle = '#1a1430'; pxText(lx, nm, px + 2, py + 1);
}
const THUMB = {};
function mkThumb(it) {
  if (it.t === 'dec') { decorNeed && decorNeed(it.id); return IMG['decor/' + it.id] || null; }
  if (it.t === 'gold') return typeof GOLD_ICON !== 'undefined' ? GOLD_ICON : null;
  if (it.t === 'skin') { const set = SP[it.id]; return set && set.front && set.front.frames ? set.front.frames[0][0] : null; }
  if (it.t === 'fish') { const k = (it.f && it.f[0]) | 0; if (!THUMB['f' + k] && IMG['fish/sheet']) { const c = mk(48, 32); c.getContext('2d').drawImage(IMG['fish/sheet'], k * 48, 0, 48, 32, 0, 0, 48, 32); THUMB['f' + k] = c; } return THUMB['f' + k] || null; }
  if (it.t === 'mk') { const C = COS[it.id]; if (C) return C.front; cosNeed(it.id); decorNeed && decorNeed(it.id); return IMG['decor/' + it.id] || null; }
  return null;
}
const mkName = it => it.t === 'gold' ? 'Gold chunk' : it.t === 'fish' ? ((typeof FISHES !== 'undefined' && FISHES[it.f[0]] && FISHES[it.f[0]].name) || 'Fish') + (it.f[1] ? ` · ${it.f[1]} cm` : '')
  : it.t === 'skin' ? ((SKINS.find(s => s.id === it.id) || {}).name || 'Outfit') : it.t === 'mk' ? ((COS[it.id] && COS[it.id].name) || (DESIGNS[it.id] && DESIGNS[it.id].name) || 'Design')
  : ((typeof DECOR !== 'undefined' && DECOR.by[it.id] && DECOR.by[it.id].name) || (DESIGNS[it.id] && DESIGNS[it.id].name) || 'Decoration');
const thumbHtml = (it, px) => { const im = mkThumb(it); if (!im) return `<span class="mkPic"></span>`; const c = mk(px, px), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const sc = Math.max(1, Math.floor(px / Math.max(im.width, im.height))), w = im.width * sc, h = im.height * sc; g.drawImage(im, Math.floor((px - w) / 2), Math.floor((px - h) / 2), w, h); return `<img class="mkPic" src="${c.toDataURL()}" alt="">`; };

/* ---------- the window ---------- */
document.querySelector('#townHud').insertAdjacentHTML('beforeend', `<div class="modal big panel" id="mkModal">
  <div class="mhead"><b id="mkTitle">STALL</b><span class="wal"><i data-ic="coin" data-c="solo"></i><span class="coinN">0</span></span><button class="btn" id="mkX"><i data-ic="cross" data-c="solo"></i></button></div>
  <div id="mkBody"></div><div class="small bad" id="mkMsg"></div></div>`);
document.querySelectorAll('#mkModal [data-ic]').forEach(e => { e.outerHTML = ic(e.dataset.ic, +(e.dataset.s || 2), e.dataset.c); });
document.head.insertAdjacentHTML('beforeend', `<style>
#mkModal{text-align:left}#mkBody{display:flex;flex-direction:column;gap:9px}#mkMsg:empty{display:none}#mkMsg{color:#c0392b;margin-top:8px}
.mkSub{font:700 14px "Pixelify Sans";opacity:.75}.mkChips{display:flex;flex-wrap:wrap;gap:6px}.mkChips .btn{height:34px;padding:0 10px 3px;font-size:15px}
.mkChips .btn.sel{background:#ffe08a;border-color:#1a1430;box-shadow:inset 0 -4px 0 #d39b2a}.mkCol{width:38px;height:34px;border:3px solid #1a1430;border-radius:4px;cursor:pointer}.mkCol.sel{outline:3px solid #ffd25e;outline-offset:1px}
#mkModal input[type=text],#mkModal input[type=number]{font:600 17px "Pixelify Sans";padding:6px 9px;border:3px solid #1a1430;border-radius:5px;background:#fff;width:100%;box-sizing:border-box}
.mkGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:7px}
.mkCard{background:#fff6df;border:3px solid #1a1430;border-radius:5px;padding:6px 4px;text-align:center;font:600 13px "Pixelify Sans";cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
.mkCard.sel{border-color:#d39b2a;box-shadow:0 0 0 3px #ffd25e}.mkCard b{font-size:14px}.mkCard em{font-style:normal;display:flex;align-items:center;gap:3px}
.mkPic{width:40px;height:40px;image-rendering:pixelated;display:block}.mkRow{display:flex;gap:8px;align-items:center}.mkRow>*{flex:1}
.mkReq{background:#fff6df;border:3px solid #1a1430;border-radius:5px;padding:8px}
</style>`);
$('#mkX').onclick = () => { $('#mkModal').classList.remove('on'); sfx('close'); };
const esc2 = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const coinHtml = n => `${ic('coin', 2)} ${n}`;

function marketOpen(i) { if (!WL.me) return; MK.plot = i; MK.sel = null; MK.ask = {name: '', kind: 'mixed', col: i % 3}; $('#mkMsg').textContent = ''; sfx('click'); mkPaint(); $('#mkModal').classList.add('on'); }
function mkPaint() {
  const i = MK.plot, s = MK.stalls[i], q = MK.reqs[i], me = NET.uid || 'me', boss = mkLocalOk() ? me : mkOwner(), B = $('#mkBody'); paintCoins();
  const mine = s && s.uid === me;
  if (s) { $('#mkTitle').textContent = String(s.name || 'STALL').toUpperCase(); return mine ? mkPaintMine(s, B, boss === me) : mkPaintShop(s, B, boss === me); }
  $('#mkTitle').textContent = 'EMPTY STALL';
  if (q) {   // somebody asked for this one
    if (boss === me && q.uid !== me) { B.innerHTML = `<div class="mkReq"><b>${esc2(q.n)}</b> wants to open <b>${esc2(q.name)}</b><br><span class="mkSub">Selling: ${esc2((MK_KINDS.find(k => k[0] === q.kind) || [, ''])[1])}</span></div>
      <div class="mkRow"><button class="btn red" id="mkYes">Yes</button><button class="btn" id="mkNo">No</button></div>`;
      $('#mkYes').onclick = () => mkDo('mkAnswer', {plot: i, yes: true}, 'The stall is open.'); $('#mkNo').onclick = () => mkDo('mkAnswer', {plot: i, yes: false}, 'Said no.'); return; }
    if (q.uid === me) { B.innerHTML = `<div class="mkReq">Waiting for the world owner to say yes to <b>${esc2(q.name)}</b>.</div><button class="btn" id="mkCancel">Take my request back</button>`;
      $('#mkCancel').onclick = () => mkDo('mkCancel', {}, 'Your coins are back.'); return; }
    B.innerHTML = `<div class="mkReq"><b>${esc2(q.n)}</b> has asked for this stall.</div>`; return;
  }
  const A = MK.ask;
  B.innerHTML = `<div class="mkSub">Stall name</div><input type="text" id="mkName" maxlength="16" value="${esc2(A.name)}">
    <div class="mkSub">What you will sell</div><div class="mkChips" id="mkKinds">${MK_KINDS.map(([k, n]) => `<button class="btn${A.kind === k ? ' sel' : ''}" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="mkSub">Colour</div><div class="mkChips" id="mkColsRow">${MK_HEX.map((h, c) => `<span class="mkCol${A.col === c ? ' sel' : ''}" data-c="${c}" style="background:${h}"></span>`).join('')}</div>
    <button class="btn red wide" id="mkAsk">${mkLocalOk() || boss === me ? 'Open it' : 'Ask the owner'} · ${coinHtml(STALL_PRICE)}</button>`;
  $('#mkName').oninput = e => { A.name = e.target.value; }; $('#mkName').onkeydown = e => e.stopPropagation(); $('#mkName').onkeyup = e => e.stopPropagation();
  $('#mkKinds').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; A.kind = b.dataset.k; sfx('click'); mkPaint(); };
  $('#mkColsRow').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; A.col = +b.dataset.c; sfx('click'); mkPaint(); };
  $('#mkAsk').onclick = () => { if (A.name.trim().length < 2) { $('#mkMsg').textContent = 'Give your stall a name.'; return; }
    mkDo('mkAsk', {plot: i, name: A.name.trim(), kind: A.kind, col: A.col}, mkLocalOk() || boss === me ? 'Your stall is open.' : 'Asked. The owner will say yes or no.'); };
}
async function mkDo(op, d, ok, after) {
  const b = document.activeElement && document.activeElement.tagName === 'BUTTON' ? document.activeElement : null, done = b ? btnBusy(b, '…') : () => {};
  $('#mkMsg').textContent = '';
  try { const r = await mkOp(op, d); done(); if (ok) wlSay(ok, 'good'); sfx('coin'); if (after) after(r); mkPaint(); return r; }
  catch (e) { done(); $('#mkMsg').textContent = e.message; sfx('nope'); return null; }
}
// someone else's stall: buy
function mkPaintShop(s, B, boss) {
  const items = Object.entries(s.items || {});
  B.innerHTML = `<div class="mkSub">${esc2(s.n)}'s stall</div>` + (items.length ? `<div class="mkGrid">${items.map(([k, it]) => `<div class="mkCard" data-k="${k}">${thumbHtml(it, 40)}<b>${esc2(mkName(it))}</b>${it.q > 1 ? `<span class="mkSub">${it.q} left</span>` : ''}<em>${coinHtml(it.price)}</em><button class="btn red" data-buy="${k}" data-q="1">Buy</button>${(it.t === 'gold' || it.t === 'dec') && it.q > 1 ? `<button class="btn" data-buy="${k}" data-q="${it.q}">All ${it.q}</button>` : ''}</div>`).join('')}</div>` : `<div class="mkReq">Nothing for sale yet.</div>`)
    + (boss ? `<button class="btn" id="mkShut">Close this stall</button>` : '');
  B.onclick = e => { const b = e.target.closest('[data-buy]'); if (!b) return; const it = s.items[b.dataset.buy], q = Math.max(1, +b.dataset.q || 1);
    mkDo('mkBuy', {plot: MK.plot, key: b.dataset.buy, q}, `Bought for ${it.price * q} coin${it.price * q === 1 ? '' : 's'}.`); };
  if (boss) $('#mkShut').onclick = () => { if (confirm('Close this stall? Its things go back to its keeper.')) mkDo('mkClose', {plot: MK.plot}, 'Stall closed.'); };
}
// your own stall: what is for sale, and put more up
function mkPaintMine(s, B) {
  const items = Object.entries(s.items || {}), can = MK_ALLOW[s.kind] || [];
  B.innerHTML = `<div class="mkSub">For sale</div>` + (items.length ? `<div class="mkGrid">${items.map(([k, it]) => `<div class="mkCard">${thumbHtml(it, 40)}<b>${esc2(mkName(it))}</b>${it.q > 1 ? `<span class="mkSub">${it.q} left</span>` : it.q === -1 ? '<span class="mkSub">copies</span>' : ''}<em>${coinHtml(it.price)}</em><button class="btn" data-off="${k}">Take back</button></div>`).join('')}</div>` : `<div class="mkReq">Nothing for sale yet.</div>`)
    + `<div class="mkSub">Sell something</div><div class="mkGrid" id="mkInv">${mkInventory(can).map((o, n) => `<div class="mkCard${MK.sel === n ? ' sel' : ''}" data-n="${n}">${thumbHtml(o, 40)}<b>${esc2(mkName(o))}</b>${o.have > 1 ? `<span class="mkSub">you have ${o.have}</span>` : ''}</div>`).join('') || '<div class="mkReq">You have nothing this stall sells.</div>'}</div>`
    + (MK.sel != null ? `<div class="mkRow"><div><div class="mkSub">Price each</div><input type="number" id="mkPrice" min="1" value="${MK.price || 100}"></div>${mkInvSel() && mkInvSel().have > 1 && mkInvSel().t !== 'mk' ? `<div><div class="mkSub">How many</div><input type="number" id="mkQty" min="1" max="${mkInvSel().have}" value="1"></div>` : ''}</div><button class="btn red wide" id="mkSell">Put it on the stall</button>` : '')
    + `<button class="btn" id="mkShut">Close my stall</button>`;
  B.onclick = e => {
    const off = e.target.closest('[data-off]'); if (off) { mkDo('mkUnlist', {plot: MK.plot, key: off.dataset.off}, 'Taken back.'); return; }
    const c = e.target.closest('#mkInv [data-n]'); if (c) { MK.sel = +c.dataset.n; sfx('click'); mkPaint(); return; } };
  for (const id of ['mkPrice', 'mkQty']) { const el = $('#' + id); if (el) { el.onkeydown = e => e.stopPropagation(); el.onkeyup = e => e.stopPropagation(); } }
  if ($('#mkSell')) $('#mkSell').onclick = () => { const o = mkInvSel(), p = Math.floor(+$('#mkPrice').value); if (!(p >= 1)) { $('#mkMsg').textContent = 'Pick a price.'; return; } MK.price = p;
    const q = $('#mkQty') ? clamp(Math.floor(+$('#mkQty').value) || 1, 1, o.have) : 1; mkDo('mkList', {t: o.t, id: o.id, q, price: p, bag: o.bag, f: o.f}, 'On your stall.', () => { MK.sel = null; }); };
  $('#mkShut').onclick = () => { if (confirm('Close your stall? Everything comes back to you. The 2,500 coins do not.')) mkDo('mkClose', {plot: MK.plot}, 'Stall closed.'); };
}
let MK_INV = [];
const mkInvSel = () => MK_INV[MK.sel];
function mkInventory(can) {
  const out = [], me = NET.uid || 'me';
  if (can.includes('dec')) for (const [id, n] of Object.entries((WALLET && WALLET.dec) || {})) if (n > 0 && !((typeof DECOR !== 'undefined' && DECOR.by[id]) || {}).quest) out.push({t: 'dec', id, have: n});   // not the hunt's plaque
  if (can.includes('gold') && typeof GOLD !== 'undefined' && GOLD.n > 0) out.push({t: 'gold', id: 'gold', have: GOLD.n});
  if (can.includes('fish') && typeof KIT !== 'undefined') (KIT.bag || []).forEach((f, bag) => { if (typeof FISHES !== 'undefined' && FISHES[f[0]] && FISHES[f[0]].rar === 'secret') return; out.push({t: 'fish', id: 'fish' + f[0], f, bag, have: 1}); });   // not the Glimmer Koi
  if (can.includes('skin')) for (const s of SKINS) if (OWNED.has(s.id) && s.rar !== 'common' && s.rar !== 'secret' && s.id !== PEOPLE[0].skin) out.push({t: 'skin', id: s.id, have: 1});
  if (can.includes('mk')) for (const id of Object.keys(DESIGNS)) if (id.startsWith('@' + me + ':')) out.push({t: 'mk', id, have: 1});
  return MK_INV = out;
}

/* ---------- your designs (props + cosmetics you made) ---------- */
const DESIGNS = {}, COS = {}, COSNEED = {};
function designsLoad() { const u = NET.uid; if (!u || !NET.db || designsLoad.u === u) return; designsLoad.u = u;
  NET.db.ref('props/' + u).get().then(s => { for (const [k, v] of Object.entries(s.val() || {})) { const id = '@' + u + ':' + k; DESIGNS[id] = {name: v.name || (v.cos ? 'Cosmetic' : 'Prop'), cos: !!v.cos}; if (v.cos) cosNeed(id); } }).catch(() => {}); }
setInterval(designsLoad, 3000);
// a cosmetic's three views (front, side, back: 32 x 40 each, side by side) -> canvases; left = the side flipped
function cosNeed(id) {
  if (COS[id] || COSNEED[id] || id[0] !== '@' || !NET.db) return; COSNEED[id] = 1; const [u, k] = id.slice(1).split(':');
  NET.db.ref('props/' + u + '/' + k).get().then(s => { const v = s.val(); if (!v || !v.cos || !v.png) return; const im = new Image(); im.onload = () => cosMake(id, im, v.slot, v.name); im.src = v.png; }).catch(() => {});
}
function cosMake(id, im, slot, name) {
  const cut = (n, flip) => { const c = mk(32, 40), g = c.getContext('2d'); if (flip) { g.translate(32, 0); g.scale(-1, 1); } g.drawImage(im, n * 32, 0, 32, 40, 0, 0, 32, 40); return c; };
  const tops = {}, firstRow = c => { const a = c.getContext('2d').getImageData(0, 0, 32, 40).data; for (let y = 0; y < 40; y++) for (let x = 0; x < 32; x++) if (a[(y * 32 + x) * 4 + 3]) return y; return 40; };
  const V = {front: cut(0), right: cut(1), left: cut(1, true), back: cut(2)}; for (const k in V) tops[k] = firstRow(V[k]);
  COS[id] = {...V, tops, slot: slot === 'head' ? 'head' : 'body', name: name || 'Cosmetic'};
  DESIGNS[id] = DESIGNS[id] || {name: name || 'Cosmetic', cos: true};
}
const MAN_TOP = {};   // the mannequin's top row in each view (a head cosmetic sits on the top of whatever head wears it)
function manTops() { for (const d of ['front', 'right', 'back']) { const im = IMG['man/' + d]; if (!im) continue; const c = mk(32, 40), g = c.getContext('2d'); g.drawImage(im, 0, 0); const a = g.getImageData(0, 0, 32, 40).data;
  let t = 0; while (t < 40 && ![...Array(32).keys()].some(x => a[(t * 32 + x) * 4 + 3])) t++; MAN_TOP[d] = t; } MAN_TOP.left = MAN_TOP.right; }

/* ---------- wearing one: drawn over the outfit; the choice goes with you online ---------- */
let MY_COS = null; try { MY_COS = localStorage.getItem('m2_cos') || null; } catch (e) {}
const COS_OF = {};   // uid -> the cosmetic they wear (from the live players list)
function cosWear(id) { MY_COS = id || null; try { if (MY_COS) localStorage.setItem('m2_cos', MY_COS); else localStorage.removeItem('m2_cos'); } catch (e) {}
  if (NET.on && NET.me) NET.me.update({cos: MY_COS}).catch(() => {}); if (NET.db && NET.uid) NET.db.ref('users/' + NET.uid).update({cos: MY_COS}).catch(() => {}); }
setInterval(() => {   // keep up with what everyone here wears
  if (!NET.on || !NET.ref) return; if (cosWatch.ref !== NET.ref) { if (cosWatch.ref) cosWatch.ref.off('value', cosWatch.f); cosWatch.ref = NET.ref.child('players'); cosWatch.f = s => { const v = s.val() || {}; for (const [u, p] of Object.entries(v)) { COS_OF[u] = p && p.cos || null; if (COS_OF[u]) cosNeed(COS_OF[u]); } }; cosWatch.ref.on('value', cosWatch.f, () => {}); if (MY_COS) NET.me.update({cos: MY_COS}).catch(() => {}); }
}, 1500);
const cosWatch = {};
{ const _wd = wlDraw; wlDraw = function (e, t) { const o = _wd(e, t); if (o && !o.ghost) o.cos = e === WL.me ? (MY_COS && MK.me.cos[MY_COS] ? MY_COS : (MY_COS && mkLocalOk() && COS[MY_COS] ? MY_COS : null)) : (e.uid ? COS_OF[e.uid] : null); return o; }; }
{ const _dc = drawChar; drawChar = function (c) {
  const r = _dc(c); const id = c && c.cos; if (!r || !id || !COS[id] || STACK[c.name] || FLY[c.name] || (c.pose && c.pose !== 'walk') || !r.box) return r;
  const C = COS[id], dir = c.dir || 'front', im = C[dir] || C.front, bx = r.cx - 16, top = r.box[1] + PAD, bot = r.box[3] - 1;   // top = the sprite's own top row (box[1] is PAD above it)
  const by = C.slot === 'head' ? top - (MAN_TOP[dir] ?? 0) : bot - 37;
  // BREATHING (his ask, 24 Nov): the same as makeDir: standing still, everything above the waist moves by BREATH[...] (feet stay put),
  // and when it rises the row just above the waist stretches to fill the gap. Walking has no breathing (the walk frames bob instead).
  const set = SP[c.name], ds = set && (set[dir] || set.front), still = !c.walk && !c.pose && ds && ds.frames;
  const o = still ? BREATH[Math.floor(((c.t + (c.phase || 0)) % 2600) / 200)] : 0;
  lx.globalAlpha = c.alpha ?? 1;
  if (!o) lx.drawImage(im, bx, by);
  else { const hImg = ds.h - PAD, waistY = top + hImg - Math.round(hImg * .24), cut = clamp(Math.round(waistY - by), 0, 40);
    if (cut < 40) lx.drawImage(im, 0, cut, 32, 40 - cut, bx, by + cut, 32, 40 - cut);
    if (o < 0 && cut > 0) for (let k = 0; k < -o; k++) lx.drawImage(im, 0, cut - 1, 32, 1, bx, by + cut - 1 - k, 32, 1);
    if (cut > 0) lx.drawImage(im, 0, 0, 32, cut, bx, by + o, 32, cut); }
  lx.globalAlpha = 1;
  const t = by + o + (C.tops[dir] ?? 40) + PAD; return t < r.top ? {...r, top: t} : r; }; }   // the name tag goes over a tall hat, not on it

/* ---------- the Collection: your cosmetics (wear / take off) and the maker ---------- */
(() => {
  const all = $('#collAll'), row = all && all.closest('.row'); if (!row) return;
  row.insertAdjacentHTML('beforebegin', `<div class="small" style="margin:14px 0 8px"><b>COSMETICS</b> · worn over any outfit</div><div class="ogrid" id="cosGrid"></div>`);
  $('#cosGrid').onclick = e => { const b = e.target.closest('[data-cos]'); if (!b) return; sfx('click');
    if (b.dataset.cos === 'make') { $('#collModal').classList.remove('on'); if (window.cosmeticOpen) cosmeticOpen(); return; }
    cosWear(MY_COS === b.dataset.cos ? null : b.dataset.cos); cosPaint(); };
  const obs = new MutationObserver(() => { if ($('#collModal').classList.contains('on')) cosPaint(); }); obs.observe($('#collModal'), {attributes: true, attributeFilter: ['class']});
})();
function cosPaint() {
  const g = $('#cosGrid'); if (!g) return; const own = Object.keys(MK.me.cos || {}).concat(mkLocalOk() ? Object.keys(COS).filter(id => !MK.me.cos[id]) : []);
  g.innerHTML = `<div class="ocard" data-cos="make" style="--rc:#d39b2a">${ic('pencil', 4, 'solo')}<span>Make</span><em>${MK.me.maker ? '' : ic('coin', 2) + ' ' + MAKER_PRICE}</em></div>`
    + own.map(id => { const C = COS[id]; if (!C) { cosNeed(id); return ''; } const c = mk(32, 40), x = c.getContext('2d'); const man = IMG['man/front']; if (man) { x.globalAlpha = .35; x.drawImage(man, 0, 0); x.globalAlpha = 1; } x.drawImage(C.front, 0, 0);
      return `<div class="ocard${MY_COS === id ? ' sel' : ''}" data-cos="${id}" style="--rc:#9a48ad"><img src="${c.toDataURL()}" alt="" style="image-rendering:pixelated"><span>${esc2(C.name)}</span></div>`; }).join('');
}
