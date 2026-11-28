/* ================= PETS (28 Nov 2026, his ask; batch 2 of the keep-playing plan) =================
   A pet follows you wherever you walk. It does nothing else (his pick: for showing off only, no boosts).
   The four are SPRITE STACKS (his call: "the sprite stack 3D style", "in our style and shading"), modelled in code by tools/make_pets.py and
   drawn by the game's own stackFrame, so they turn in real 3D like the Alien and the Getaway Car. assets/pets/<id>.png, pets.json.
   You buy one with CRYSTALS (his rule: buying pets costs crystals) in the Collection, under the sets. The server keeps what you own and which
   one is out (functions/keep.js: petBuy, petSet; wallet.pets = {id: 1}, wallet.pet = the one following you).
   NOT HERE YET: finding eggs in the mine and at the lake, and other players seeing your pet (it needs the world's presence data). */
(() => {
  /* id: [name, crystals]. The prices are mine (he gave none): the same list as the server's PETS. */
  const PETS = {alien: ['Blob', 2], chicken: ['Don Cluck', 3], golem: ['Crag', 8], dragon: ['Shard', 12]};   // (the flame skull was made, then taken out: his word, "looks bad")
  const P = {id: null, own: {}, x: 0, y: 0, loc: null, a: 0, moving: false, last: 0, ready: {}};
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
     never dead on the spot. P.v = how fast it is going now, eased towards how fast it wants to go. */
  function step(m, t) { const dt = Math.min(.05, (t - P.last) / 1000 || 0); P.last = t;
    if (P.loc !== m.loc || Math.hypot(P.x - m.x, P.y - m.y) > 150) { P.loc = m.loc; P.x = m.x - 14; P.y = m.y + 2; P.v = 0; P.go = false; P.wait = 0; }
    const dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy) || 1, KEEP = 20, GO = 30, WAIT = .32;
    if (!P.go) { if (d > GO) { P.wait = (P.wait || 0) + dt; if (P.wait >= WAIT) P.go = true; } else P.wait = 0; }
    else if (d <= KEEP) { P.go = false; P.wait = 0; }
    const want = P.go ? Math.min(105, 34 + (d - KEEP) * 3.2) : 0;                 // further behind = faster, so it always catches up
    P.v = (P.v || 0) + (want - (P.v || 0)) * Math.min(1, dt * (P.go ? 4.5 : 6));   // ease in, ease out
    if (P.v < 2) P.v = 0;
    if (P.v > 0 && d > 14) { const s = Math.min(P.v * dt, d - 14);   /* never closer than 14: it stops beside you, not on you */ P.x += dx / d * s; P.y += dy / d * s; if (P.go) P.a = Math.atan2(dy, dx) - Math.PI / 2; }
    P.moving = P.v > 14; }
  function objs2(m, t) { if (!P.id || !m) return []; step(m, t);
    const M = MOVE[P.id](t, P.moving), ai = ((Math.round(P.a / (Math.PI * 2) * 48) + (M.yaw | 0)) % 48 + 48) % 48, im = frame(P.id, M.row, ai); if (!im) return [];
    const D = STACK[key(P.id)], h = Math.round(D.s * D.squash), out = [];
    if (M.shadow) out.push({img: SHADOW, x: Math.round(P.x - 7), y: Math.round(P.y - 4), base: Math.round(P.y) - 1});   // under it, drawn first
    out.push({img: im, x: Math.round(P.x - im.width / 2 + (M.sway | 0)), y: Math.round(P.y - im.height + 2 + h / 2 - (M.lift | 0)), base: Math.round(P.y)});
    return out; }
  // it is one more thing in whatever scene is being drawn, sorted with the people (in front of you when it is nearer the camera)
  { const ds = drawScene; drawScene = function (people, occ, img, objs) { const m = WL.me;
      if (P.id && m && people && people.includes && scene === scenes.town) { const o = objs2(m, performance.now()); if (o.length) objs = [...(objs || []), ...o]; }
      return ds.call(this, people, occ, img, objs); }; }

  // the wallet says what you own and which one is out
  { const wa = walletApply; walletApply = function (w) { wa(w); P.own = (w && w.pets) || {}; P.id = w && w.pet && PETS[w.pet] ? w.pet : null; petsPaint(); }; }

  /* ---------- the Collection: PETS, under the sets ---------- */
  const st = document.createElement('style');
  st.textContent = `#kpPets{margin-bottom:12px}.ptG{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px}
.ptC{display:flex;flex-direction:column;align-items:center;gap:3px;background:#fff6df;border:3px solid var(--wood);border-radius:6px;padding:6px 4px 7px;min-width:0}
.ptC canvas{width:66px;height:84px;image-rendering:pixelated}.ptC b{font:700 13px 'Pixelify Sans';white-space:nowrap}
.ptC .btn{width:100%;font-size:13px;padding:3px 2px 7px;display:inline-flex;align-items:center;justify-content:center;gap:3px;--accent:#5fc46f}
.ptC.out{background:#e6f3dc;border-color:#3e8948}.ptC.no canvas{filter:brightness(.25) saturate(0)}`;
  document.head.appendChild(st);
  const host = $('#kpSets') || $('#collModal .mhead'); host.insertAdjacentHTML('afterend', '<div id="kpPets"></div>');
  const cryIc = () => typeof CRY_ICON !== 'undefined' ? `<img src="${CRY_ICON.toDataURL()}" alt="" style="width:${CRY_ICON.width * 2}px;height:${CRY_ICON.height * 2}px;image-rendering:pixelated">` : 'crystals';
  function petsPaint() { const box = $('#kpPets'); if (!box) return; const cry = typeof GOLD !== 'undefined' ? GOLD.cry | 0 : 0;
    box.innerHTML = '<div class="kpH" style="margin-top:0">PETS</div><div class="ptG">' + Object.keys(PETS).map(id => { const [n, c] = PETS[id], own = !!P.own[id], out = P.id === id;
      return `<div class="ptC${out ? ' out' : ''}${own ? '' : ' no'}"><canvas width="33" height="42" data-p="${id}"></canvas><b>${own ? n : '???'}</b>
<button class="btn go" data-p="${id}" data-a="${own ? (out ? 'off' : 'on') : 'buy'}" ${own || cry >= c ? '' : 'disabled'}>${own ? (out ? 'Following' : 'Follow') : c + ' ' + cryIc()}</button></div>`; }).join('') + '</div>'; }
  // the little turntables: only while the Collection is open
  setInterval(() => { if (!$('#collModal').classList.contains('on')) return; const t = performance.now(), ai = Math.floor(t / 90) % 48;
    document.querySelectorAll('#kpPets canvas').forEach(c => { const im = frame(c.dataset.p, MOVE[c.dataset.p](t, true).row, ai); if (!im) return; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height); x.drawImage(im, Math.round((c.width - im.width) / 2), c.height - im.height); }); }, 90);
  $('#kpPets').addEventListener('click', async e => { const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return; const id = b.dataset.p, a = b.dataset.a, done = btnBusy(b, '…');
    try { if (a === 'buy') { await srv('petBuy', {id}); sfx('rare'); if (window.itemGot && frame(id, 0, 0)) itemGot(PETS[id][0].toUpperCase(), frame(id, 0, 0), '140,220,255'); } else { await srv('petSet', {id: a === 'on' ? id : ''}); sfx('click'); } }
    catch (er) { wlSay(er.message, 'bad'); } done(); petsPaint(); });
  { const oc = openColl; openColl = function () { const r = oc.apply(this, arguments); petsPaint(); return r; };
    document.querySelectorAll('button').forEach(b => { if (b.onclick === oc) b.onclick = () => openColl(); }); }
  window.petsLab = (id, own) => { P.own = own || {alien: 1, chicken: 1, golem: 1, dragon: 1}; P.id = id || null; petsPaint(); };   // the lab: try a pet without buying it
})();
