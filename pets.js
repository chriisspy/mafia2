/* ================= PETS (28 Nov 2026, his ask; batch 2 of the keep-playing plan) =================
   A pet follows you wherever you walk. It does nothing else (his pick: for showing off only, no boosts).
   The four are SPRITE STACKS (his call: "the sprite stack 3D style", "in our style and shading"), modelled in code by tools/make_pets.py and
   drawn by the game's own stackFrame, so they turn in real 3D like the Alien and the Getaway Car. assets/pets/<id>.png, pets.json.
   You buy one with CRYSTALS (his rule: buying pets costs crystals) in the Collection, under the sets. The server keeps what you own and which
   one is out (functions/keep.js: petBuy, petSet; wallet.pets = {id: 1}, wallet.pet = the one following you).
   Other players see your pet: its id rides in what you already send about yourself (index.html netM: pt), and each phone walks it after you itself.
   EGGS (28 Nov, his ask): a rock you break in the mine, or a fish you land at the lake, may now and then leave a PET EGG (the server rolls: functions/
   keep.js eggRoll). You carry one at a time. It sits first in the PETS row with how long is left; after an hour, tap Hatch: a pet you do not have yet
   (the rarer ones less often), or 2 crystals if you have all four. */
(() => {
  /* id: [name, crystals]. The prices are mine (he gave none): the same list as the server's PETS. */
  const PETS = {alien: ['Blob', 2], chicken: ['Don Cluck', 3], golem: ['Crag', 8], dragon: ['Shard', 12]};   // (the flame skull was made, then taken out: his word, "looks bad")
  const P = {id: null, own: {}, x: 0, y: 0, loc: null, a: 0, moving: false, last: 0, ready: {}, egg: null};
  const EGG_MS = 60 * 60000;   // the server's own (functions/keep.js)
  const EGG = (() => { const R = ['...KKKK...', '..KWWWWK..', '.KWWYYWWK.', '.KWYYWWWK.', 'KWWWWWPPWK', 'KWPPWWWPWK', 'KWWPWWWWWK', 'KSWWWWYYSK', '.KSWWWYSK.', '.KSSWWSSK.', '..KKSSKK..', '....KK....'],
      C = {K: '#181425', W: '#fff7e6', Y: '#ffd25e', P: '#c79bff', S: '#d9c9a8'}, c = mk(10, R.length), x = c.getContext('2d'); R.forEach((r, y) => [...r].forEach((ch, i) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(i, y, 1, 1); } })); return c; })();   // a speckled egg, in the style of his icons
  const eggLeft = () => P.egg ? Math.max(0, (+P.egg.t || 0) + EGG_MS - Date.now()) : 0;
  const key = id => 'pet_' + id;

  // the strips: each one is registered as a stack the moment its picture is in (px: 1 = at the cast's own pixel size)
  fetch('assets/pets/pets.json?v=' + BUILD).then(r => r.json()).then(M => { for (const id in M) { if (!PETS[id]) continue; const m = M[id];
    STACK[key(id)] = {s: m.s, n: m.n, squash: m.squash, hover: 0, ground: 1, px: 1, rows: m.rows || 1};
    load('stack/' + key(id), 'assets/pets/' + id + '.png').then(() => { P.ready[id] = true; petsPaint(); }).catch(() => {}); } }).catch(() => {});

  /* HOW EACH ONE MOVES (his asks, 28 Nov). The strips carry the pictures (tools/make_pets.py: FRAMES); this says which one, and where it is drawn.
       Blob HOPS: an arc up and down as he goes, squashed flat the moment he lands.
       Don Cluck WADDLES: one foot then the other, his whole body rocking left and right as he turns a little each step.
       Crag walks on his hands and feet LIKE A GORILLA: fist and far foot forward together, then the other pair.
       Shard FLIES: held above the ground, wings beating all the time (slower when it hangs still), its shadow on the ground under it.
     Each returns {row, lift (px off the ground), yaw (a turn added to its heading, in 48ths), sway (px sideways), shadow (true = draw one)}. */
  const MOVE = {
    alien: (t, mv) => { if (!mv) return {row: 0, lift: 0}; const p = (t * .009) % Math.PI, up = Math.sin(p); return {row: up < .22 ? 1 : 0, lift: Math.round(up * 8), shadow: true}; },
    chicken: (t, mv) => { if (!mv) return {row: 0, lift: 0}; const k = Math.sin(t * .016); return {row: k > 0 ? 1 : 2, lift: Math.abs(k) > .8 ? 1 : 0, yaw: Math.round(k * 3), sway: Math.round(k * 1.5)}; },
    golem: (t, mv) => mv ? {row: [1, 0, 2, 0][Math.floor(t / 150) % 4], lift: Math.floor(t / 150) % 2 ? 0 : 1} : {row: 0, lift: 0},
    dragon: (t, mv) => ({row: [0, 1, 2, 1][Math.floor(t / (mv ? 85 : 130)) % 4], lift: 10 + Math.round(Math.sin(t * .004) * 2), shadow: true})};
  const frame = (id, row, ai) => { const D = STACK[key(id)]; return D && P.ready[id] ? stackFrame(key(id), Math.min(row | 0, (D.rows || 1) - 1), ai) : null; };
  const SHADOW = (() => { const c = mk(15, 6), x = c.getContext('2d'); x.fillStyle = 'rgba(15,11,30,.38)'; x.fillRect(3, 0, 9, 6); x.fillRect(1, 1, 13, 4); x.fillRect(0, 2, 15, 2); return c; })();   // a small solid oval (no blur: the game's shadows are hard-edged)

  /* FOLLOWING: it trots after you and stops a little way behind; it turns to face the way it is going. If you leave the place it is in
     (a door, the South) it is simply beside you again on the other side. */
  /* (his note, 28 Nov: "a slight delay in the pets following you and the walk start and stop") It does not move the instant you do: it notices you have
     gone (GO further than it likes), waits a beat (WAIT), then picks up speed; and when you stop it runs on a little and slows down to a halt beside you,
     never dead on the spot. S.v = how fast it is going now, eased towards how fast it wants to go.
     (28 Nov, his ask: "make other players see your pet") S is kept on whoever it follows (e.pf), so every player in the place has their own. */
  function step(S, m, t) { const dt = Math.min(.05, (t - (S.last || t)) / 1000 || 0); S.last = t;
    if (S.loc !== m.loc || Math.hypot(S.x - m.x, S.y - m.y) > 150) { S.loc = m.loc; S.x = m.x - 14; S.y = m.y + 2; S.v = 0; S.go = false; S.wait = 0; S.a = S.a || 0; }
    const dx = m.x - S.x, dy = m.y - S.y, d = Math.hypot(dx, dy) || 1, KEEP = 20, GO = 30, WAIT = .32;
    if (!S.go) { if (d > GO) { S.wait = (S.wait || 0) + dt; if (S.wait >= WAIT) S.go = true; } else S.wait = 0; }
    else if (d <= KEEP) { S.go = false; S.wait = 0; }
    const want = S.go ? Math.min(105, 34 + (d - KEEP) * 3.2) : 0;                 // further behind = faster, so it always catches up
    S.v = (S.v || 0) + (want - (S.v || 0)) * Math.min(1, dt * (S.go ? 4.5 : 6));   // ease in, ease out
    if (S.v < 2) S.v = 0;
    if (S.v > 0 && d > 14) { const k = Math.min(S.v * dt, d - 14);   /* never closer than 14: it stops beside you, not on you */ S.x += dx / d * k; S.y += dy / d * k; if (S.go) S.a = Math.atan2(dy, dx) - Math.PI / 2; }
    S.moving = S.v > 14; }
  function objs2(id, m, t) { if (!id || !PETS[id] || !m) return []; const S = m.pf || (m.pf = {}); step(S, m, t);
    const M = MOVE[id](t + (m.i | 0) * 137, S.moving), ai = ((Math.round(S.a / (Math.PI * 2) * 48) + (M.yaw | 0)) % 48 + 48) % 48, im = frame(id, M.row, ai); if (!im) return [];
    const D = STACK[key(id)], h = Math.round(D.s * D.squash), out = [];
    if (M.shadow) out.push({img: SHADOW, x: Math.round(S.x - 7), y: Math.round(S.y - 4), base: Math.round(S.y) - 1});   // under it, drawn first
    out.push({img: im, x: Math.round(S.x - im.width / 2 + (M.sway | 0)), y: Math.round(S.y - im.height + 2 + h / 2 - (M.lift | 0)), base: Math.round(S.y)});
    return out; }
  // each pet is one more thing in whatever scene is being drawn, sorted with the people: yours, and the pet of every other player in the same place
  { const ds = drawScene; drawScene = function (people, occ, img, objs) { const m = WL.me;
      if (m && people && people.includes && scene === scenes.town) { const t = performance.now(), add = [];
        if (P.id) add.push(...objs2(P.id, m, t));
        for (const e of WL.bots || []) if (e && e.remote && e.pet && e.loc === m.loc && !e.car) add.push(...objs2(e.pet, e, t));
        if (add.length) objs = [...(objs || []), ...add]; }
      return ds.call(this, people, occ, img, objs); }; }
  window.petOut = () => P.id;   // what netM() tells the others (index.html)

  // the wallet says what you own and which one is out
  { const wa = walletApply; walletApply = function (w) { wa(w); P.own = (w && w.pets) || {}; const had = !!P.egg; P.egg = (w && w.kit && w.kit.egg) || null;
      if (P.egg && !had && P.seen && window.itemGot) itemGot('A PET EGG', EGG, '255,210,94');   /* you just found one (not on the first wallet of the session) */ P.seen = true; const was = P.id; P.id = w && w.pet && PETS[w.pet] ? w.pet : null; petsPaint(); if (was !== P.id && typeof netMove === 'function') netMove(); }; }   // tell the others the moment it changes

  /* ---------- the Collection: PETS, under the sets ---------- */
  const st = document.createElement('style');
  st.textContent = `#kpPets{margin:14px 0 4px}.ptG{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px}
.ptC{display:flex;flex-direction:column;align-items:center;gap:3px;background:#fff6df;border:3px solid var(--wood);border-radius:6px;padding:6px 4px 7px;min-width:0}
.ptC canvas{width:66px;height:84px;image-rendering:pixelated}.ptC b{font:700 13px 'Pixelify Sans';white-space:nowrap}
.ptC .btn{width:100%;font-size:13px;padding:3px 2px 7px;display:inline-flex;align-items:center;justify-content:center;gap:3px;--accent:#5fc46f}
.ptC.out{background:#e6f3dc;border-color:#3e8948}.ptC.egg{border-color:#ffd25e}.ptC.no canvas{filter:brightness(.25) saturate(0)}`;
  document.head.appendChild(st);
  const host = $('#kpSets') || $('#collGrid') || $('#collModal .mhead'); host.insertAdjacentHTML('afterend', '<div id="kpPets"></div>');
  const cryIc = () => typeof CRY_ICON !== 'undefined' ? `<img src="${CRY_ICON.toDataURL()}" alt="" style="width:${CRY_ICON.width * 2}px;height:${CRY_ICON.height * 2}px;image-rendering:pixelated">` : 'crystals';
  function petsPaint() { const box = $('#kpPets'); if (!box) return; const cry = typeof GOLD !== 'undefined' ? GOLD.cry | 0 : 0;
    const left = eggLeft(), mins = Math.ceil(left / 60000), egg = P.egg ? `<div class="ptC egg"><canvas width="33" height="42" data-egg="1"></canvas><b>Egg</b><button class="btn go" data-a="hatch" ${left ? 'disabled' : ''}>${left ? (mins >= 60 ? '1h' : mins + 'm') : 'Hatch'}</button></div>` : '';
    box.innerHTML = '<div class="small"><b>PETS</b> · one follows you.</div><div class="ptG">' + egg + Object.keys(PETS).map(id => { const [n, c] = PETS[id], own = !!P.own[id], out = P.id === id;
      return `<div class="ptC${out ? ' out' : ''}${own ? '' : ' no'}"><canvas width="33" height="42" data-p="${id}"></canvas><b>${own ? n : '???'}</b>
<button class="btn go" data-p="${id}" data-a="${own ? (out ? 'off' : 'on') : 'buy'}" ${own || cry >= c ? '' : 'disabled'}>${own ? (out ? 'Following' : 'Follow') : c + ' ' + cryIc()}</button></div>`; }).join('') + '</div>'; }
  // the little turntables: only while the Collection is open
  setInterval(() => { if (!$('#collModal').classList.contains('on')) return; const t = performance.now(), ai = Math.floor(t / 90) % 48;
    document.querySelectorAll('#kpPets canvas').forEach(c => { if (c.dataset.egg) { const x = c.getContext('2d'), wob = eggLeft() ? 0 : Math.round(Math.sin(t * .02) * 1.5); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height); x.drawImage(EGG, 6 + wob, 12, 20, 24); return; }   /* the egg rocks when it is ready */
      const im = frame(c.dataset.p, MOVE[c.dataset.p](t, true).row, ai); if (!im) return; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height); x.drawImage(im, Math.round((c.width - im.width) / 2), c.height - im.height); }); }, 90);
  $('#kpPets').addEventListener('click', async e => { const h = e.target.closest('button[data-a=hatch]');
    if (h) { if (h.disabled) return; const done = btnBusy(h, '…'); try { const r = await srv('eggHatch'); sfx('rare'); P.egg = null;
        if (r.pet && PETS[r.pet] && window.itemGot && frame(r.pet, 0, 0)) itemGot(PETS[r.pet][0].toUpperCase(), frame(r.pet, 0, 0), '140,220,255'); else if (r.cry) wlSay('+' + r.cry + ' crystals', 'good'); }
      catch (er) { wlSay(er.message, 'bad'); } done(); petsPaint(); return; }
    const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; const id = b.dataset.p, a = b.dataset.a, done = btnBusy(b, '…');
    try { if (a === 'buy') { await srv('petBuy', {id}); sfx('rare'); if (window.itemGot && frame(id, 0, 0)) itemGot(PETS[id][0].toUpperCase(), frame(id, 0, 0), '140,220,255'); } else { await srv('petSet', {id: a === 'on' ? id : ''}); sfx('click'); } }
    catch (er) { wlSay(er.message, 'bad'); } done(); petsPaint(); });
  { const oc = openColl; openColl = function () { const r = oc.apply(this, arguments); petsPaint(); return r; };
    document.querySelectorAll('button').forEach(b => { if (b.onclick === oc) b.onclick = () => openColl(); }); }
  setInterval(() => { if (P.egg && $('#collModal').classList.contains('on')) { const b = $('#kpPets button[data-a=hatch]'); if (b && !b.classList.contains('busy') && !!eggLeft() !== b.disabled) petsPaint(); else if (b && b.disabled) { const m = Math.ceil(eggLeft() / 60000); b.textContent = m >= 60 ? '1h' : m + 'm'; } } }, 5000);
  window.eggLab = ago => { P.egg = ago == null ? null : {t: Date.now() - ago}; petsPaint(); };   // the lab: an egg found `ago` ms ago
  window.petsLab = (id, own) => { P.own = own || {alien: 1, chicken: 1, golem: 1, dragon: 1}; P.id = id || null; petsPaint(); if (typeof netMove === 'function') netMove(); };   // the lab: try a pet without buying it
})();
