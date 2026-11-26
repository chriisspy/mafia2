/* ================= THE QUEST LAB (26 Nov 2026, his ask: "add all work like cutscenes, environments, etc to the lab so i can see them") =================
   LAB ONLY, AND ONLY ON THIS COMPUTER (?lab on localhost: LABLOCAL). index.html loads this file after temple.js in that case and in no other,
   and everything in it is inside the one check below, so none of it exists on the real site.
   The "Quest" button beside "Films" opens a panel of buttons. Each one sets the hunt up the way that thing needs (the lab's own hunt: LABM.q in
   m2lab_mine, the same one mineLocal moves; the lab's own fishing: m2lab_fish), so a reload keeps it, then takes you there or plays it by
   calling the game's own functions (wlDoor, pipTalk, ksPlace, kingTalk, mendGo, fishStart, itemGot ...). Nothing here is a second copy of a rule. */
if (typeof LABLOCAL !== 'undefined' && LABLOCAL) (() => {
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del = k => { try { localStorage.removeItem(k); } catch (e) {} };
  const saveM = () => put('m2lab_mine', JSON.stringify(LABM)), saveF = () => put('m2lab_fish', JSON.stringify(LABF));
  const own = id => { LABOWN.add(id); OWNED.add(id); put('m2lab_own', JSON.stringify([...LABOWN])); };
  const STONES = ['moon', 'fang', 'hearth', 'ember'];

  /* ---------- the hunt ---------- */
  function setQ(s, k) {   // the step, and beside it the stones held (step 5 and on: all four, as the server would have it)
    const Q = {s}; if (s >= 5) for (const f of STONES) Q[f] = 1; for (const f in k || {}) if (k[f]) Q[f] = 1; else delete Q[f];
    LABM.q = Q; QUEST.s = s; questKeys(Q); saveM();
    if (s >= 7) { own('stag'); own('r_temple'); WALLET.dec = WALLET.dec || {}; if (!WALLET.dec.keystoneplaque) WALLET.dec.keystoneplaque = 1; }   // what the King gives (mineLocal qking)
    if (MN.crack) { MN.crack.open = s >= 1; MN.dirty = true; }   // what is already on the screen follows the step
    TPL.set = 0; TPL.anim = null; TPL.fly = null; TPL.pop.length = 0; KEYS.fang = null; KEYS.mend = null; FOR.cut = -1; FOR.snip = null;
    paint();
  }
  const held = () => ({moon: QUEST.moon, fang: QUEST.fang, hc: QUEST.hc, hearth: QUEST.hearth, ember: QUEST.ember});
  const step4 = k => setQ(4, QUEST.s >= 4 ? {...held(), ...k} : k);   // Pip mended, the other stones as they were, these ones as asked
  const atLeast = s => { if (QUEST.s < s) setQ(s); };
  function resetQ() { setQ(0); for (const k of ['m2_qpeek', 'm2_qhall', 'm2_gbait']) del(k); PK.seen = false; HALL.seen = false; }

  /* ---------- getting there ---------- */
  const wait = (ok, fn, n = 0) => { if (ok()) fn(); else if (n < 200) setTimeout(() => wait(ok, fn, n + 1), 50); };
  const idle = () => scene === scenes.town && !!WL.me && !WL.fading && !MN.busy && !LIFT.ride;
  function hush() {   // whatever is playing stops
    document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on'));
    if (PIP.talk) pipHush(); if (KING.talk) kingHush(); if (HALL.cut) { HALL.cut = null; hallBars(false); } if (PK.t >= 0) { PK.t = -1; hallBars(false); sayOff(); }
    TPL.anim = null; KEYS.mend = null; FOR.snip = null; if (FISH.on) fishStop();
  }
  function walk(fn) { hush(); if (scene === scenes.town && WL.me) wait(idle, fn); else go('town', () => wait(idle, fn)); }   // the walking town first
  const stand = (m, p) => { if (p) { m.x = p[0]; m.y = p[1]; if (p[2]) m.dir = p[2]; } m.path = []; m.todo = null; m.walk = false; netMove(); };
  function to(loc, at, fn, again) {   // through the game's own door (wlDoor), then onto the spot. at = [x, y, dir], or a function that gives it once you are there
    walk(() => { const m = WL.me, was = m.loc, land = () => { stand(m, typeof at === 'function' ? at() : at); if (fn) fn(m); };
      if (was === loc && (!again || loc < 0)) return land();
      wlDoor(loc); wait(() => idle() && WL.me.loc === loc, () => { if (was === LAKE && loc !== LAKE) { lakeOff(); music(SCENE_TUNE.town); } land(); }); });   // (the lake's own way out is the town, which puts its rod away: any other way out has to)
  }
  function mine(lv, den, at, fn) {   // in at the top like anyone, then the level is asked for with the ladders' own op (mgo), as the elevator does it
    to(MINE, null, m => { LABM.pick = Math.max(LABM.pick | 0, mNeed(lv)); MN.busy = true;   // the lab's pickaxe is good enough for that level
      mop('mgo', {lv}).then(r => { if (den) denGeo(); else { mineGeo(lv); mineFill(r.k || ''); } mineBake(); MN.busy = false;
        stand(m, (typeof at === 'function' ? at() : at) || mineSpawn()); mineHead(); if (fn) fn(m); }, e => { MN.busy = false; toast(e.message); }); }, true);
  }
  const den = fn => mine(MR.levels, true, [PIP_STAND[0], PIP_STAND[1], 'back'], fn);
  const liftSpot = () => [MN.lift[0] * CS + 8, (MN.lift[1] + 1) * CS + (isFloor(MN.lift[0], MN.lift[1] + 2) ? 13 : 9), 'back'];
  const crackSpot = () => { const C = MN.crack; return C ? [C.gx * CS + 8, (C.gy + 1) * CS + 9, 'back'] : null; };
  const lavaSpot = () => { const E = MN.ember; if (!E) return null; const i = E.stones[0]; return [(i % MGW) * CS + 8, (((i / MGW) | 0) + 1) * CS + 9, 'back']; };   // the floor in front of the first stepping stone
  function lava(n = 0) { if (QUEST.s < 4 || QUEST.ember) step4({ember: 0}); mine(11, false, lavaSpot, () => { if (!MN.ember && n < 6) lava(n + 1); }); }   // (no room for the pool in this dig: dig another)
  const below = dy => () => { const d = rockDoor(); return [d[0], d[1] + dy, 'back']; };

  /* ---------- the cards ---------- */
  const card = (name, icon, glow) => () => { hush(); itemGot(name, icon || PX1, glow); };
  const stone = (name, k) => () => { hush(); ksGot(name, k); };
  const wardenIcon = () => SP.stag && SP.stag.front && SP.stag.front.frames ? wardIcon('stag') : PX1;
  const koi = () => FISHES.findIndex(f => f.id === 'glimkoi');
  function koiCard() { hush(); const was = JSON.stringify(FISH.log); fishCard(koi(), 72, FISHES[koi()].val); FISH.log = JSON.parse(was); fishSaveLog(); }   // a look at the card: the fish book is left as it was
  function caught(ids) { LABF.fc = LABF.fc || {}; for (const id of ids) { const F = FISHES.find(f => f.id === id), L = FISH.log[id] || (FISH.log[id] = {n: 0, best: 0}); L.n = Math.max(1, L.n); L.best = Math.max(L.best, F.max); LABF.fc[id] = 1; }
    fishSaveLog(); saveF(); to(LAKE, [FISH_ME[0], FISH_ME[1], 'back'], fishBook); }

  /* ---------- the panel ---------- */
  const G = [
    ['QUEST STEP', [
      ...['0 Nothing yet', '1 Crack open', '2 Moon snips', '3 Moonmoss', '4 Pip healed', '5 Four stones', '6 Temple open', '7 King thanked'].map((n, s) => [n, () => { hush(); setQ(s); toast('Quest step ' + s); }, s]),
      ['All 4 keystones', () => { hush(); setQ(Math.max(5, QUEST.s)); toast('All 4 keystones'); }], ['Reset quest', () => { hush(); resetQ(); toast('Quest reset'); }]]],
    ['PLACES', [
      ["Pip's den", () => { atLeast(1); mine(MR.levels, true); }],
      ['Level 12 crack', () => mine(MR.levels, false, crackSpot)],
      ['Level 11 lava stones', () => lava()],
      ['Town: forest gap', () => to(-1, [FGAP.x + 40, FGAP.at, 'left'])],
      ['Forest: way in', () => to(FOREST, null, null, true)],
      ['Forest: glade', () => to(FOREST, () => [F_GLADE.x, F_GLADE.y + 72, 'back'])],
      ['South boulders', () => to(SOUTH, below(46))],
      ['Temple hollow', () => to(HOLLOW, null, null, true)],
      ['Throne hall', () => to(THRONE, null, null, true)],
      ['Lake jetty end', () => to(LAKE, [FISH_ME[0], FISH_ME[1], 'back'])],
      ['Blacksmith', () => to(SMITHY, null, null, true)],
      ['Mine elevator', () => to(MINE, liftSpot, () => { LIFT.coolT = 0; liftOpen(); }, true)]]],
    ['CUTSCENES', [
      ['Pip peek', () => { del('m2_qpeek'); PK.seen = false; hush(); if (QUEST.s >= 5) setQ(4); to(SOUTH, below(14)); }],
      ["Pip's first talk", () => { setQ(1); den(() => { PIP.coolT = 0; pipTalk(); }); }],
      ['Pip healed', () => { setQ(3); den(() => { PIP.coolT = 0; pipTalk(); }); }],
      ["Pip's bait shop", () => { atLeast(4); den(() => { PIP.coolT = 0; pipTalk(); }); }],
      ['Temple opening', () => { setQ(5); to(HOLLOW, [T_STAND[0], T_STAND[1], 'back'], () => { TPL.set = 3; ksPlace(3); }, true); }],   // the fourth stone goes in, and the doors open
      ['Throne hall entrance', () => { atLeast(6); del('m2_qhall'); HALL.seen = false; to(THRONE, null, null, true); }],
      ["King's talk + rewards", () => { setQ(6); HALL.seen = true; put('m2_qhall', '1'); to(THRONE, [KING_STAND[0], KING_STAND[1], 'back'], () => { KING.coolT = 0; KING.giving = false; kingTalk(); }, true); }],
      ['Fang fireflies', () => { step4({fang: 0}); to(FOREST, () => [F_GLADE.x, F_GLADE.y + 72, 'back'], () => { KEYS.fang = null; }, true); }],
      ['Hearth mend', () => { step4({hc: 1, hearth: 0}); to(SMITHY, null, () => mendGo(), true); }],
      ['Moon stone cast', () => { step4({moon: 0}); LABF.night = 1; saveF(); to(LAKE, [FISH_ME[0], FISH_ME[1], 'back'], () => { FISH.want = 'back'; fishStart();
        setTimeout(() => { if (FISH.on && FISH.ph === 'idle') { FISH.px = WL.me.x; FISH.held = true; FISH.press = true; setTimeout(() => { FISH.held = false; }, 650); } }, 500); }, true); }]]],   // a held press and a let-go, as a finger would: the cast is the game's own
    ['CARDS', [
      ['Moon snips', card('MOON SNIPS', SNIPS_ICON, '120,200,255')], ['Moonmoss', card('MOONMOSS', MOSS_ICON, '150,215,255')], ['Torn map', card('THE TORN MAP', MAP_ICON, '255,200,120')], ['Glow bait', card('GLOW BAIT', BAIT_ICON, '120,255,225')],
      ['Moon stone', stone('MOON STONE', 'moon')], ['Fang stone', stone('FANG STONE', 'fang')], ['Hearth stone', stone('HEARTH STONE', 'hearth')], ['Ember stone', stone('EMBER STONE', 'ember')], ['Cracked stone', stone('CRACKED STONE', 'hearth-cracked')],
      ['Forest Warden', () => card('THE FOREST WARDEN', wardenIcon(), '120,200,255')()], ['Temple Cabin', () => card('THE TEMPLE CABIN', IMG['cab/temple-i'], '150,215,255')()], ['Keystone Plaque', () => card('THE KEYSTONE PLAQUE', IMG['decor/keystoneplaque'], '150,215,255')()],
      ['Glimmer Bait', card('GLIMMER BAIT', GBAIT_ICON, '120,200,255')], ['Glimmer Koi', koiCard], ['Gold Fish Plaque', () => card('GOLD FISH PLAQUE', IMG['decor/goldfishplaque'], '255,214,96')()]]],
    ['UNLOCKS', [
      ['Wear Forest Warden', () => { own('stag'); wear('stag'); to(-1); }],
      ['Temple Cabin room', () => { own('r_temple'); setRoom('r_temple'); to(CABIN_OF[0], null, null, true); }],
      ['20 Glimmer Bait', () => { hush(); labBait(MR.bait.max); LABF.night = 1; saveM(); saveF(); glimPaint(); toast(MR.bait.max + ' Glimmer Bait'); }],   // and night at the lake, so it glows whenever he looks
      ['Glimmer Koi caught', () => caught(['glimkoi'])],
      ['All fish caught', () => { LABF.fp = 1; WALLET.dec = WALLET.dec || {}; if (!WALLET.dec.goldfishplaque) WALLET.dec.goldfishplaque = 1; caught(FISHES.map(f => f.id)); }]]],
  ];
  const ACT = [];
  $('#questList').innerHTML = G.map(([h, L]) => `<div class="qh">${h}</div><div class="qg">` + L.map(([n, fn, s]) => { ACT.push(fn); return `<button class="btn" data-q="${ACT.length - 1}"${s != null ? ` data-s="${s}"` : ''}>${n}</button>`; }).join('') + '</div>').join('');
  function paint() { for (const b of document.querySelectorAll('#questList [data-s]')) b.classList.toggle('go', +b.dataset.s === QUEST.s); }   // the step the hunt is on
  $('#questList').onclick = e => { const b = e.target.closest('button[data-q]'); if (!b) return; $('#questModal').classList.remove('on'); sfx('click');
    try { ACT[+b.dataset.q](); } catch (err) { console.error(err); toast(err.message); } };
  $('#labQuest').style.display = ''; $('#labQuest').onclick = () => { document.querySelectorAll('.modal.on').forEach(q => q.classList.remove('on')); paint(); $('#questModal').classList.add('on'); };
  $('#questX').onclick = () => $('#questModal').classList.remove('on');
  const st = document.createElement('style');
  st.textContent = '#questList .qh{font-size:11px;letter-spacing:2px;opacity:.7;margin:10px 0 4px}#questList .qg{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}#questList .btn{font-size:13px;padding:5px 4px 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '#phone.land #questList .qg{grid-template-columns:repeat(4,1fr)}';
  document.head.appendChild(st);

  /* a reload keeps what the lab unlocked: the game reads the outfit and the room you had on before it knows what the lab owns */
  for (const id of LABOWN) OWNED.add(id);
  try { const k = localStorage.getItem('m2_skin'), r = localStorage.getItem('m2_room');
    if (k && LABOWN.has(k) && SKINS.some(q => q.id === k)) { PEOPLE[0].skin = k; skinIdx = SKINS.findIndex(q => q.id === k); }
    if (r && LABOWN.has(r) && ROOM_BY[r] && myRoom !== r) { myRoom = r; if (ROOM_BY[r].hut && IMG.townBase) loadCabins().then(buildTown); } } catch (e) {}
})();
