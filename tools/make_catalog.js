// The server's copy of the game's prices, odds and prizes (18 Nov 2026, phase 2: coins live on the server).
// It is READ OUT OF THE GAME'S OWN FILES, so the two can never drift apart: run this after changing a price, an odds table,
// an outfit, a room, a clicker theme, a fish, a rod or the slots, then deploy the functions.
// usage (from the game folder):  node tools/make_catalog.js   -> functions/catalog.json
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8'), fish = fs.readFileSync('fishing.js', 'utf8'), cas = fs.readFileSync('casino.js', 'utf8');
// the literal after "const NAME=" up to its matching closing bracket
function lit(src, name) {
  const i = src.indexOf('const ' + name + '=');
  if (i < 0) throw new Error('missing ' + name);
  let j = i + ('const ' + name + '=').length; const open = src[j], close = open === '[' ? ']' : '}'; let d = 0, k = j, q = null;
  for (; k < src.length; k++) {
    const ch = src[k];
    if (q) { if (ch === '\\') { k++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === open) d++; else if (ch === close) { d--; if (!d) break; }
  }
  return src.slice(j, k + 1);
}
const ev = s => Function('"use strict";return (' + s + ')')();
const num = (src, name) => { const m = src.match(new RegExp('\\b' + name + '=([0-9.]+)')); if (!m) throw new Error('missing ' + name); return +m[1]; };
const SKINS = ev(lit(html, 'SKINS')).map(s => ({ id: s.id, rar: s.rar }));
const ROOMS = ev(lit(html, 'ROOMS')).map(r => ({ id: r.id, rar: r.rar, base: !!r.base }));
const CK_RAR = ev(lit(html, 'CK_RAR'));
const WHEEL = ev(lit(html, 'WHEEL'));
// CASE_DEF has little functions for its pools: give it what they read
const CASE_DEF = Function('SKINS', 'ROOMS', 'CK_ITEMS', '"use strict";return (' + lit(html, 'CASE_DEF') + ')')(SKINS, ROOMS, Object.keys(CK_RAR).map(k => ({ id: 'ck_' + k, rar: CK_RAR[k] })));
const cases = {}; for (const [k, d] of Object.entries(CASE_DEF)) cases[k] = { price: d.price, odds: d.odds, pool: d.pool().map(s => ({ id: s.id, rar: s.rar })) };
const out = {
  made: new Date().toISOString(),
  skins: SKINS, rooms: ROOMS, ckItems: Object.keys(CK_RAR).map(k => ({ id: 'ck_' + k, rar: CK_RAR[k] })),
  start: SKINS.filter(s => s.rar === 'common').map(s => s.id).concat('r_classic'),
  cases, caseDupe: +(html.match(/const CASE=\{kind:'mafia',dupe:([0-9.]+)/) || [])[1],
  wheel: WHEEL, spinPrice: num(html, 'SPIN_PRICE'), dayCoins: num(html, 'DAY_COINS'),
  flipMax: num(html, 'FLIP_MAX'), flipEvery: ev(html.match(/const FLIP_EVERY=([0-9*]+)/)[1]),
  rods: ev(lit(fish, 'RODS')).map(r => ({ id: r.id, price: r.price, luck: r.luck, pay: r.pay || 1, range: r.range })),
  fishes: ev(lit(fish, 'FISHES')).map(f => ({ id: f.id, rar: f.rar, min: f.min, max: f.max, val: f.val })),
  fishOdds: ev(lit(fish, 'FISH_ODDS')), fishBag: num(fish, 'FISH_BAG'), baitPack: num(fish, 'BAIT_PACK'), baitPrice: num(fish, 'BAIT_PRICE'),
  slots: ev(lit(cas, 'SLOT_SYM')).map(s => ({ w: s.w, p: s.p })),
  decor: JSON.parse(fs.readFileSync('assets/decor/decor.json', 'utf8')).map(d => ({ id: d.id, price: d.price })),
};
if (!out.caseDupe) throw new Error('missing case dupe');
fs.writeFileSync('functions/catalog.json', JSON.stringify(out, null, 1));
console.log('catalog:', out.skins.length, 'outfits,', out.rooms.length, 'rooms,', out.ckItems.length, 'clicker themes,', out.fishes.length, 'fish,', Object.keys(cases).join('/'), 'cases');
