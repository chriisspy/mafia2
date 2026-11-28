/* ================= WORLDS (18 Nov 2026, phase 1) =================
   His plan: like Minecraft realms. You make your own world (free players: 1), it is invite only (you invite Google emails), and it
   saves everything. Up to 10 people, one cabin each (the town's 10 cabins), and each member keeps the same cabin every time.
   Later phases: server coins, friends + gifts, decorating, the prop maker.
   Database (rules in database.rules.json):
     owned/{uid}                    the world you made (one, free)
     userWorlds/{uid}/{wid}         {name, own}   the worlds you are in, for your home screen
     invitesByEmail/{email,key}/{wid} {name, by}  invites waiting for you (only you can read them)
     profiles/{uid}                 {n, p (Google photo), skin}
     worlds/{wid}/meta              {name, owner, ownerName, at}
     worlds/{wid}/members/{uid}     {n, p, e (email), s (cabin '0'-'9'), at}
     worlds/{wid}/slots/{n}         uid    (who owns cabin n: at most 10 members)
     worlds/{wid}/invites/{email,key} {e, at}
     worlds/{wid}/live/...          the town while people are in it (players, ev, game, act, mchat), like the old lobbies */
const WORLD={mine:{},inv:{},owned:null,uid:null,watch:[],wid:null,meta:null,members:{},invites:{},wref:null};
const ekey=e=>String(e||'').trim().toLowerCase().replace(/\./g,',');
const wEmail=()=>{const u=acctUser();return u&&u.email?u.email.toLowerCase():'';};
const wPhoto=()=>{const u=acctUser();return(u&&u.photoURL)||'';};
const wFace=m=>m&&m.p?m.p:face((m&&m.skin)||'beanie');

/* ---- the home screen: your worlds, invites, Create world ---- */
document.querySelector('#homeCreate').parentNode.insertAdjacentHTML('beforebegin','<div id="homeWorlds"></div>');
$('#homeCreate').textContent='Create world';$('#homeJoin').style.display='none';
document.querySelector('#nameModal').insertAdjacentHTML('afterend',`<div class="modal panel" id="worldNewModal"><h3>Name your world</h3><input class="hin" id="worldNewIn" maxlength="20" autocomplete="off"><div class="small bad" id="worldNewErr"></div><div class="row"><button class="btn" id="worldNewX">Back</button><button class="btn red" id="worldNewOk">Create</button></div></div>`);
document.querySelector('#townHud').insertAdjacentHTML('beforeend',`<div class="modal big panel" id="worldModal">
  <div class="mhead"><b id="wmName">WORLD</b><button class="btn" id="wmX"><i data-ic="cross" data-c="solo"></i></button></div>
  <div id="wmMembers"></div>
  <div id="wmInvite"><h4>INVITE</h4><div class="wmRow"><span class="unAt"><b>@</b><input id="wmUser" maxlength="16" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="username"></span><button class="btn red" id="wmSend">Invite</button></div><div id="wmFriends"></div><div id="wmPending"></div></div>
  <div class="small" id="wmMsg"></div>
  <button class="hlink" id="wmLeave">Leave world</button></div>`);
document.querySelectorAll('#worldModal [data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+(e.dataset.s||2),e.dataset.c);});
document.head.insertAdjacentHTML('beforeend',`<style>
#homeWorlds{display:flex;flex-direction:column;gap:6px}#homeWorlds:not(:empty){margin-bottom:8px}
.wcard{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px 10px;border:3px solid var(--wood);border-radius:6px;background:#fff;color:var(--text);box-shadow:inset 0 -5px 0 #0002,0 3px 0 #0009;font:700 19px "Pixelify Sans";text-align:left;cursor:pointer}
.wcard b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wcard small{display:block;font:600 12px "Pixelify Sans";opacity:.7}
.wcard .wt{flex:1;min-width:0}.wcard .wt b{display:block}
.wcard.mine{background:#fff}   /* white (his call, 18 Nov) */.wcard.inv{cursor:default;background:#e8f6ea;border-color:#2f7a45}
.wcard .btn{font-size:15px;padding:4px 10px 7px}
.wcard:active{transform:translateY(2px)}.wcard.inv:active{transform:none}
#homeCreate.gone{display:none}
#wmFriends:not(:empty){margin-top:8px}#wmFriends h4{margin-top:6px}#wmFriends .wmem img{image-rendering:pixelated;background:#f6dfae}#wmFriends .btn{font-size:14px;padding:3px 10px 6px;margin-left:auto}
/* (his ask, 18 Nov) each world's card shows a faded picture of that world behind its name, in the middle */
.wcard.shot{position:relative;overflow:hidden;min-height:118px;flex-direction:column;justify-content:center;gap:7px;text-align:center;isolation:isolate}
.wcard.shot::before{content:'';position:absolute;inset:0;z-index:-1;background:var(--shot) center 30%/cover no-repeat;image-rendering:pixelated;opacity:.5}
.wcard.shot.map::before{background-size:300%;background-position:50% 8%}
.wcard.shot .wt{flex:none;max-width:70%}.wcard.shot .wt b{font-size:22px;text-shadow:0 0 6px #fff,0 0 3px #fff,0 0 2px #fff}.wcard.shot small{opacity:.85;text-shadow:0 0 4px #fff,0 0 2px #fff}
.wcard.shot .wt{max-width:90%}.wcard.shot .wgo{padding:5px 22px 8px}
.wcard .wgo{flex:none;padding:5px 12px 8px;border:3px solid #6b1416;border-radius:5px;background:#e4544f;color:#fff;font:700 15px "Pixelify Sans";box-shadow:inset 0 -4px 0 #a92b2c}
#homeHud .gbtn.in{justify-content:flex-start;padding-left:10px}#homeHud .gbtn.in span{flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#homeHud .gbtn.in small{flex:none;margin:0;padding:2px 7px 4px;border:2px solid #1a1430;border-radius:4px;opacity:1;font-size:12px;white-space:nowrap}
#homeHud .gbtn.in .gph{width:22px;height:22px;border-radius:4px;flex:none}
#menuCode.world b{font-size:20px;letter-spacing:1px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#townCodeBox.world b{font-size:22px;letter-spacing:1px;margin-right:0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#worldModal{text-align:left;max-height:calc(100% - 90px);overflow:auto;z-index:25;bottom:auto;top:calc(64px + env(safe-area-inset-top))}
#worldModal h4{margin:12px 0 4px;font-size:13px;letter-spacing:2px;opacity:.75}
.wmem{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:2px solid #0001}
.wmem img:not(.btn img){width:36px;height:36px;border-radius:5px;image-rendering:pixelated;object-fit:cover;background:#0001}
.wmem .wn{flex:1;min-width:0;font:700 17px "Pixelify Sans"}.wmem .wn small{display:block;font:600 12px "Pixelify Sans";opacity:.65}
.wmem .on{width:9px;height:9px;border-radius:2px;background:#5fc46f;box-shadow:0 0 0 2px #1a1430}
.wmem .btn{font-size:13px;padding:3px 8px 6px}
.wmRow{display:flex;gap:6px;align-items:center}.wmRow .hin{margin-top:0;font-size:16px;text-align:left;flex:1;min-width:0}
#wmLeave{margin-top:16px;color:#b3261e;opacity:.9}#wmLeave.sure{font-weight:700}#wmMsg:empty{display:none}#wmMsg{margin-top:6px}#wmMsg.bad,#worldNewErr{color:#c0392b}
</style>`);

function worldWatch(){const u=acctUser(),uid=u?u.uid:null;if(uid===WORLD.uid)return worldHome();
  for(const r of WORLD.watch)r.off();WORLD.watch=[];WORLD.uid=uid;WORLD.mine={};WORLD.inv={};WORLD.owned=null;
  if(!uid||!NET.db)return worldHome();
  NET.db.ref('profiles/'+uid).update({p:wPhoto(),skin:PEOPLE[0].skin}).catch(()=>{});
  const r1=NET.db.ref('userWorlds/'+uid),r2=NET.db.ref('owned/'+uid);r1.on('value',s=>{WORLD.mine=s.val()||{};worldHome();},()=>{});r2.on('value',s=>{WORLD.owned=s.val();worldHome();},()=>{});WORLD.watch.push(r1,r2);
  WORLD.invE={};WORLD.invU={};const invAll=()=>{WORLD.inv={...WORLD.invE,...WORLD.invU};worldHome();};
  if(wEmail()){const r3=NET.db.ref('invitesByEmail/'+ekey(wEmail()));r3.on('value',s=>{WORLD.invE=s.val()||{};invAll();},()=>{});WORLD.watch.push(r3);}
  {const r4=NET.db.ref('invitesByUid/'+uid);r4.on('value',s=>{WORLD.invU=s.val()||{};invAll();},()=>{});WORLD.watch.push(r4);}   /* invited by your @username or from a friend's list */
  worldHome();}
function worldHome(){const box=$('#homeWorlds');if(!box)return;const u=acctUser();
  const mine=Object.entries(WORLD.mine).sort((a,b)=>(b[1].own?1:0)-(a[1].own?1:0));
  box.innerHTML=Object.entries(WORLD.inv).filter(([w])=>!WORLD.mine[w]).map(([w,v])=>`<div class="wcard inv" data-w="${w}"><span class="wt"><b>${esc(v.name||'A world')}</b><small>${esc(v.by||'A friend')} invited you</small></span><button class="btn red" data-a="yes">Join</button><button class="btn" data-a="no">${ic('cross',2,'solo')}</button></div>`).join('')
    +mine.map(([w,v])=>{const sh=worldShotOf(w);return`<button class="wcard shot${v.own?' mine':''}${sh?'':' map'}" data-w="${w}" style="--shot:url('${sh||(XMAS?'assets/xmas/day-big.webp':'assets/town4/day.png')}')"><span class="wt"><b>${esc(v.name||'World')}</b>${v.own?'':'<small>Member</small>'}</span><span class="wgo">Enter</span></button>`;}).join('');
  $('#homeCreate').classList.toggle('gone',!!(u&&WORLD.owned));}
$('#homeWorlds').onclick=e=>{const c=e.target.closest('.wcard');if(!c||NET.busy)return;const w=c.dataset.w,b=e.target.closest('button[data-a]');
  if(c.classList.contains('inv')){if(!b)return;if(b.dataset.a==='no'){sfx('click');if(wEmail())NET.db.ref('invitesByEmail/'+ekey(wEmail())+'/'+w).remove().catch(()=>{});NET.db.ref('invitesByUid/'+NET.uid+'/'+w).remove().catch(()=>{});return;}
    homeDo(()=>worldAccept(w),null,b,'Joining…');return;}
  homeDo(()=>worldEnter(w),null,c,'Opening…');};
/* Create world: signed out, the Google window comes first */
$('#homeCreate').onclick=async()=>{if(NET.on||NET.busy)return;
  if(!acctUser()){await $('#homeAcct').onclick();if(!acctUser())return;}
  if(WORLD.owned){homeDo(()=>worldEnter(WORLD.owned),null,$('#homeCreate'),'Opening…');return;}
  $('#worldNewIn').value=(myName&&myName!=='You'?myName+"'s town":'');$('#worldNewErr').textContent='';$('#worldNewModal').classList.add('on');$('#worldNewIn').focus();};
$('#worldNewX').onclick=()=>$('#worldNewModal').classList.remove('on');
$('#worldNewOk').onclick=()=>{const n=$('#worldNewIn').value.replace(/[<>]/g,'').trim().slice(0,20);if(!n){$('#worldNewErr').textContent='Give it a name.';return;}
  homeDo(async()=>{await worldCreate(n);$('#worldNewModal').classList.remove('on');},$('#worldNewErr'),$('#worldNewOk'),'Creating…');};
$('#worldNewIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#worldNewOk').click();});

/* ---- making, joining, entering ---- */
async function worldCreate(name){await netLoad();const u=acctUser();if(!u)throw new Error('Sign in with Google first.');
  if(WORLD.owned)throw new Error('You already have a world.');
  const wid=NET.db.ref('worlds').push().key,up={};
  up['owned/'+u.uid]=wid;
  up['worlds/'+wid+'/meta']={name,owner:u.uid,ownerName:myName,at:TS()};
  up['worlds/'+wid+'/slots/0']=u.uid;
  up['worlds/'+wid+'/members/'+u.uid]={n:myName,p:wPhoto(),e:wEmail(),skin:PEOPLE[0].skin,s:'0',at:TS()};
  up['userWorlds/'+u.uid+'/'+wid]={name,own:true};
  await NET.db.ref().update(up);sfx('rare');return worldEnter(wid);}
async function worldAccept(wid){await netLoad();const u=acctUser();if(!u)throw new Error('Sign in with Google first.');
  const w=(await NET.db.ref('worlds/'+wid).get()).val();if(!w||!w.meta)throw new Error('That world is gone.');
  if(!(w.members&&w.members[u.uid])){const used=w.slots||{};let s=0;while(s<10&&used[s])s++;if(s>=10)throw new Error('That world is full.');
    const up={};up['worlds/'+wid+'/slots/'+s]=u.uid;up['worlds/'+wid+'/members/'+u.uid]={n:myName,p:wPhoto(),e:wEmail(),skin:PEOPLE[0].skin,s:String(s),at:TS()};
    up['userWorlds/'+u.uid+'/'+wid]={name:w.meta.name,own:false};if(wEmail())up['invitesByEmail/'+ekey(wEmail())+'/'+wid]=null;if(WORLD.invU&&WORLD.invU[wid])up['invitesByUid/'+u.uid+'/'+wid]=null;
    await NET.db.ref().update(up);sfx('rare');}
  return worldEnter(wid);}
async function worldEnter(wid,back){await netLoad();const u=acctUser();if(!u)throw new Error('Sign in with Google first.');
  let w=null;try{w=(await NET.db.ref('worlds/'+wid).get()).val();}catch(e){}
  if(!w||!w.members||!w.members[u.uid]){NET.db.ref('userWorlds/'+u.uid+'/'+wid).remove().catch(()=>{});throw new Error(w?'You are not in that world any more.':'That world is gone.');}
  const me=w.members[u.uid];NET.db.ref('worlds/'+wid+'/members/'+u.uid).update({n:myName,p:wPhoto(),skin:PEOPLE[0].skin}).catch(()=>{});
  if(back){const g=w.live&&w.live.game;if(!g||!g.roles||!g.pl||!g.pl[NET.uid]||(g.left&&g.left[NET.uid])||Date.now()+NET.off-(g.t0||0)>3600000)return false;}
  WORLD.wid=wid;WORLD.meta=w.meta;WORLD.members=w.members||{};WORLD.invites=w.invites||{};
  await netEnter('w:'+wid,(w.live&&w.live.players)||{},false,{path:'worlds/'+wid+'/live',slot:+me.s||0,world:wid});
  if(WORLD.wref)WORLD.wref.off();WORLD.wref=NET.db.ref('worlds/'+wid);
  WORLD.wref.on('value',s=>{const v=s.val();if(!NET.on||NET.world!==wid)return;
    if(!v||!v.members||!v.members[NET.uid]){netLeave();homeMsg(v?'You were removed from that world.':'That world was deleted.',true);return;}
    WORLD.meta=v.meta;WORLD.members=v.members||{};WORLD.invites=v.invites||{};worldPaint();},()=>{});
  worldPaint();return true;}
function worldOff(){if(WORLD.wref){WORLD.wref.off();WORLD.wref=null;}WORLD.wid=null;$('#worldModal').classList.remove('on');}

/* ---- the world's own box at the top of the town, and its window ---- */
/* THE WORLD'S PICTURE for its card on the home screen: every so often while you walk round the town, the screen is saved (small) on this phone */
function worldShotOf(w){try{return localStorage.getItem('m2shot:'+w)||'';}catch(e){return'';}}
function worldShot(){try{if(!(NET.on&&NET.world&&scene===scenes.town&&WL.me&&WL.me.loc<0&&!GAME.on&&!(typeof DECOR!=='undefined'&&DECOR.on)&&document.visibilityState==='visible'))return;
  /* (his note) the whole cabin, with the cabins beside it: the town is drawn again into a wide picture round your cabin (no people, no tags), then the screen is put back */
  const c=TOWN.cabins[NET.slot],hut=(dayImg('cabins')||[]).find(o=>o.ci===NET.slot);if(!c||!hut)return;const W0=366,H0=132,img=dayImg('ground');   /* the card's own shape */if(!img)return;
  const sv={w:lo.width,h:lo.height,x:cam.x,y:cam.y,fx:cam.fx,fy:cam.fy,lw:cam.lw,lh:cam.lh,hi:cam.hi,img:cam.img,dm:dayMode};let url='';
  try{lo.width=W0;lo.height=H0;lx.setTransform(1,0,0,1,0,0);lx.imageSmoothingEnabled=false;lx.globalAlpha=1;dayMode=true;
    cam.hi=false;cam.lw=W0;cam.lh=H0;cam.fx=cam.fy=0;cam.x=Math.round(c.cx-W0/2);cam.y=Math.max(-(img.oy||0),Math.round(hut.y+cabPeak(hut)-10));
    lx.fillStyle='#07060f';lx.fillRect(0,0,W0,H0);lx.drawImage(img,-cam.x-(img.ox||0),-cam.y);
    drawScene([],TOWN.occ,img,[wheelObj(),...dayImg('cabins'),...bldObjs(WL.me,0),...treeObjs(WL.me,0),...(XMAS?[stallObj()]:[]),...(typeof decorObjs==='function'?decorObjs('out'):[])]);
    const o=mk(W0,H0);o.getContext('2d').drawImage(lo,0,0);url=o.toDataURL('image/jpeg',.8);}
  finally{lo.width=sv.w;lo.height=sv.h;Object.assign(cam,{x:sv.x,y:sv.y,fx:sv.fx,fy:sv.fy,lw:sv.lw,lh:sv.lh,hi:sv.hi,img:sv.img});dayMode=sv.dm;}
  if(url){localStorage.setItem('m2shot:'+NET.world,url);worldHome();}}catch(e){}}
setInterval(worldShot,15000);
function worldPaint(){const box=$('#townCodeBox');if(!box)return;const on=!!(NET.on&&NET.world);box.classList.toggle('world',on);$('#townHud').classList.toggle('inworld',on);   /* (his call, 18 Nov) in a world the name box is in the menu, not on screen */
  box.querySelector('small').textContent=on?'WORLD':'LOBBY CODE';if(on&&!box.classList.contains('ok'))$('#townCodeT').textContent=(WORLD.meta&&WORLD.meta.name)||'';
  if($('#worldModal').classList.contains('on'))worldPanel();}
function worldPanel(){const M=$('#worldModal'),own=WORLD.meta&&WORLD.meta.owner===NET.uid,pl=NET.players||{};
  $('#wmName').textContent=(WORLD.meta&&WORLD.meta.name)||'World';
  const ms=Object.entries(WORLD.members).sort((a,b)=>(+a[1].s)-(+b[1].s));
  $('#wmMembers').innerHTML=`<h4>MEMBERS ${ms.length}/10</h4>`+ms.map(([uid,m])=>`<div class="wmem"><img src="${esc(wFace(m))}" alt="" referrerpolicy="no-referrer"><span class="wn">${esc(m.n||'Player')}${uid===NET.uid?' (you)':''}<small>${uid===WORLD.meta.owner?'Owner · ':''}Cabin ${+m.s+1}</small></span>${pl[uid]?'<i class="on" title="Here now"></i>':''}${own&&uid!==NET.uid?`<button class="btn xb" data-kick="${uid}" title="Remove from world">${ic('cross',2,'solo')}</button>`:''}</div>`).join('');
  $('#wmInvite').style.display=own?'':'none';
  const pend=Object.entries(WORLD.invites).filter(([k])=>!WORLD.members[k]&&!ms.some(([,m])=>ekey(m.e)===k));
  if(own)wmFriends(pend);
  $('#wmPending').innerHTML=(pend.length?'<h4>INVITED</h4>':'')+pend.map(([k,v])=>`<div class="wmem"><span class="wn">${esc(v.n?(v.n+(v.un?' @'+v.un:'')):v.e)}<small>Waiting for them</small></span><button class="btn xb" data-unv="${k}" title="Cancel invite">${ic('cross',2,'solo')}</button></div>`).join('');
  const lb=$('#wmLeave');if(!lb.classList.contains('sure'))lb.textContent=own?'Delete world':'Leave world';
  M.classList.add('on');}
/* YOUR FRIENDS, each with an Invite button (his ask): the ones not in this world and not invited yet */
function wmFriends(pend){const box=$('#wmFriends');if(!box)return;const F=(typeof FR!=='undefined'&&FR.list)||{},inv=new Set(pend.map(([k])=>k));
  const ids=Object.keys(F).filter(id=>!WORLD.members[id]&&!inv.has(id));
  box.innerHTML=ids.length?'<h4>FRIENDS</h4>'+ids.map(id=>{const p=(FR.prof&&FR.prof[id])||{};const img=p.skin&&SP[p.skin]?face(p.skin):(p.p||'');
    return`<div class="wmem"><img src="${esc(img)}" alt="" referrerpolicy="no-referrer"><span class="wn">${esc(p.n||'Friend')}${p.u?`<small>@${esc(p.u)}</small>`:''}</span><button class="btn red" data-finv="${id}">Invite</button></div>`;}).join(''):'';}
/* send an invite to an account (by @username or from your friends) */
async function wInviteUid(uid,n,un){const wid=NET.world;if(!wid||!WORLD.meta)return;if(WORLD.members[uid]){wmMsg('They are already in this world.',true);return;}
  if(Object.keys(WORLD.members).length>=10){wmMsg('This world is full (10).',true);return;}
  const up={};up['worlds/'+wid+'/invites/'+uid]={u:uid,n:n||'',un:un||'',at:TS()};up['invitesByUid/'+uid+'/'+wid]={name:WORLD.meta.name,by:myName,at:TS()};
  await NET.db.ref().update(up);sfx('copy');wmMsg('Invite sent to '+(n||('@'+un))+'.');}
function wmMsg(t,bad){const e=$('#wmMsg');e.textContent=t||'';e.className='small'+(bad?' bad':'');}
$('#wmX').onclick=()=>{$('#worldModal').classList.remove('on');wmMsg('');};
$('#wmSend').onclick=async()=>{const un=$('#wmUser').value.trim().toLowerCase().replace(/^@/,''),wid=NET.world;if(!wid)return;
  if(un.length<4){wmMsg('Type their username.',true);return;}
  const done=btnBusy($('#wmSend'),'…');
  try{const uid=(await NET.db.ref('usernames/'+un).get()).val();if(!uid){wmMsg('No one has the username @'+un+'.',true);done();return;}
    if(uid===NET.uid){wmMsg('That is you.',true);done();return;}
    const pr=(await NET.db.ref('profiles/'+uid).get()).val()||{};await wInviteUid(uid,pr.n,un);$('#wmUser').value='';}catch(err){wmMsg(netWhy(err),true);}done();};
$('#wmFriends').addEventListener('click',async e=>{const b=e.target.closest('[data-finv]');if(!b)return;const id=b.dataset.finv,p=(FR.prof&&FR.prof[id])||{};const done=btnBusy(b,'…');
  try{await wInviteUid(id,p.n,p.u);}catch(err){wmMsg(netWhy(err),true);}done();});
$('#wmUser').addEventListener('keydown',e=>{if(e.key==='Enter')$('#wmSend').click();});


$('#worldModal').addEventListener('click',async e=>{const wid=NET.world;if(!wid)return;
  const kb=e.target.closest('[data-kick]'),ub=e.target.closest('[data-unv]');
  if(kb){if(!kb.classList.contains('sure')){kb.classList.add('sure');kb.textContent='Sure?';return;}const uid=kb.dataset.kick,m=WORLD.members[uid];if(!m)return;
    const up={};up['worlds/'+wid+'/members/'+uid]=null;up['worlds/'+wid+'/slots/'+m.s]=null;if(m.e)up['worlds/'+wid+'/invites/'+ekey(m.e)]=null;up['worlds/'+wid+'/invites/'+uid]=null;
    NET.db.ref().update(up).then(()=>sfx('close')).catch(err=>wmMsg(netWhy(err),true));return;}
  if(ub){const k=ub.dataset.unv,up={};up['worlds/'+wid+'/invites/'+k]=null;if(/[,@]/.test(k))up['invitesByEmail/'+k+'/'+wid]=null;else up['invitesByUid/'+k+'/'+wid]=null;NET.db.ref().update(up).then(()=>sfx('close')).catch(err=>wmMsg(netWhy(err),true));}});
$('#wmLeave').onclick=async()=>{const b=$('#wmLeave'),wid=NET.world,u=acctUser();if(!wid||!u)return;
  if(!b.classList.contains('sure')){b.classList.add('sure');b.textContent='Tap again to be sure';clearTimeout(b.t);b.t=setTimeout(()=>{b.classList.remove('sure');worldPanel();},3000);return;}
  b.classList.remove('sure');const own=WORLD.meta&&WORLD.meta.owner===u.uid,me=WORLD.members[u.uid]||{},up={};
  if(own){up['worlds/'+wid]=null;up['owned/'+u.uid]=null;for(const k of Object.keys(WORLD.invites))up[(/[,@]/.test(k)?'invitesByEmail/':'invitesByUid/')+k+'/'+wid]=null;}
  else{up['worlds/'+wid+'/members/'+u.uid]=null;if(me.s!=null)up['worlds/'+wid+'/slots/'+me.s]=null;}
  up['userWorlds/'+u.uid+'/'+wid]=null;
  netLeave();try{await NET.db.ref().update(up);homeMsg(own?'World deleted.':'You left the world.');}catch(err){homeMsg(netWhy(err),true);}};

/* ---- A CLEAN TOWN PANEL (his call, 18 Nov): the host's game settings are not on the panel any more. One "Mafia" button
   (the host sees it) opens them: the extra roles, how many Mafia, Start the game. The "You are the host / Waiting for the
   host" line is gone too; the line only shows when it has something to say (a game is on, whose cabin this is). ---- */
document.querySelector('#townHud').insertAdjacentHTML('beforeend',`<div class="modal panel" id="mafiaModal"><div class="mhead"><b>MAFIA</b><button class="btn" id="mafiaX">${ic('cross',2,'solo')}</button></div><div id="mafiaBody"></div></div>`);
for(const id of['townRoles','townMaf','townStart','townDev'])$('#mafiaBody').appendChild($('#'+id));
document.querySelector('#townHud .tpanel .thead').insertAdjacentHTML('afterend',`<button class="hbig red" id="townMafia" style="display:none">${ic('mafia',3,'solo')}Mafia</button>`);
document.head.insertAdjacentHTML('beforeend',`<style>
#mafiaModal{z-index:24;text-align:left}#mafiaModal #townStart{margin-top:12px}
#townMafia{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:0;font-size:20px;padding:7px 8px 12px}
#townHud .tpanel .thead.quiet{display:none}#townHud .tpanel .thead:not(.quiet){margin-bottom:8px}
#townHud .tpanel #townMafia+.row{margin-top:10px}#townHud .tpanel .thead.quiet+#townMafia[style*="none"]+.row{margin-top:0!important}
</style>`);
$('#townMafia').onclick=()=>{sfx('click');document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));$('#mafiaModal').classList.add('on');};
$('#mafiaX').onclick=()=>$('#mafiaModal').classList.remove('on');
$('#townStart').addEventListener('click',()=>$('#mafiaModal').classList.remove('on'));$('#townDev').addEventListener('click',()=>$('#mafiaModal').classList.remove('on'));
{const _g=gameLobbyUI;window.gameLobbyUI=gameLobbyUI=function(){_g.apply(this,arguments);const can=$('#townStart').style.display!=='none'||$('#townDev').style.display!=='none';$('#townMafia').style.display=can?'flex':'none';if(!can)$('#mafiaModal').classList.remove('on');};
 const _h=wlHead;window.wlHead=wlHead=function(a,b){_h.apply(this,arguments);document.querySelector('#townHud .tpanel .thead').classList.toggle('quiet',a!=='A game is on');   /* only that one is news; cabin names and "walk to the door" are gone (his call) */};}

/* ================= YOUR LAST WORLD, WHEN THE GAME OPENS (28 Nov 2026, his call) =================
   "it's making players auto join a world when the app opens up. it shouldn't be automatic: it should load the world (we need to build a loader
   showing it is loading a world) then the person can choose to join."
   So: the game opens on the home screen. If you were in a world last time, a card comes up LOADING it (three hopping squares). When it has the
   world it shows its picture, its name and who is in it right now, with JOIN and NOT NOW. Nothing is entered until you tap Join.
   The same loader shows whenever a world is being entered (Join here, or Enter on a world's card on the home screen).
   (A GAME you were in the middle of, m2_game, still takes you straight back: the others are waiting on you.) */
(() => {
  const st = document.createElement('style');
  st.textContent = `#worldBackModal{top:50%;bottom:auto!important;transform:translateY(-50%);left:0;right:0;margin:0 auto;width:min(320px,calc(100% - 32px));z-index:40;padding:12px 12px 16px;
  background:#2a2346;color:#f6dfae;border:3px solid #0f0b1e;border-radius:6px;box-shadow:inset 0 -6px 0 #1b1532,inset 0 2px 0 #3d3466,0 6px 0 #0008}
#wbShot{height:120px;border:3px solid #0f0b1e;border-radius:6px;background:#16112b center/cover no-repeat;image-rendering:pixelated;display:flex;align-items:center;justify-content:center}
#wbShot.load{background-image:none!important}
.wbDots{display:none;gap:8px}#wbShot.load .wbDots{display:flex}
.wbDots i{width:12px;height:12px;background:#ffd25e;border:3px solid #0f0b1e;animation:wbHop .72s steps(4) infinite}.wbDots i:nth-child(2){animation-delay:.12s}.wbDots i:nth-child(3){animation-delay:.24s}
@keyframes wbHop{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-12px)}}
#wbName{font:700 22px 'Pixelify Sans';color:#ffd25e;text-shadow:0 2px 0 #0f0b1e;letter-spacing:.5px;margin:10px 0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#wbSub{font:600 14px 'Pixelify Sans';color:#b9a8e0;min-height:18px;margin-bottom:12px}
#wbRow{display:flex;gap:8px}#wbRow .btn{flex:1;font-size:18px;padding:7px 6px 12px}#wbRow.load{visibility:hidden}`;
  document.head.appendChild(st);
  document.querySelector('#nameModal').insertAdjacentHTML('afterend', `<div class="modal" id="worldBackModal"><div id="wbShot" class="load"><span class="wbDots"><i></i><i></i><i></i></span></div>
<div id="wbName">LOADING WORLD</div><div id="wbSub"></div><div id="wbRow" class="load"><button class="btn red" id="wbYes">Join</button><button class="btn dark" id="wbNo">Not now</button></div></div>`);
  const M = $('#worldBackModal'), B = {wid: null, ask: false};
  const show = (name, sub, loading, shot) => { $('#wbShot').classList.toggle('load', loading); $('#wbShot').style.backgroundImage = !loading && shot ? `url('${shot}')` : '';
    $('#wbName').textContent = name; $('#wbSub').textContent = sub || ''; $('#wbRow').classList.toggle('load', loading || !B.ask); M.classList.add('on'); };
  const hide = () => { M.classList.remove('on'); B.ask = false; };
  const forget = () => { try { localStorage.removeItem('m2_lobby'); } catch (e) {} };
  const shotOf = w => worldShotOf(w) || (XMAS ? 'assets/xmas/day-big.webp' : 'assets/town4/day.png');
  // the game has just opened and you were in this world last time: load it, show it, and wait to be told
  window.worldBack = async wid => { B.wid = wid; B.ask = false; show('LOADING WORLD', '', true);
    try { await netLoad(); let u = acctUser(); for (let i = 0; i < 40 && !u; i++) { await new Promise(r => setTimeout(r, 150)); u = acctUser(); }   // signing back in takes a moment
      if (!u) throw 0;
      const w = (await NET.db.ref('worlds/' + wid).get()).val(); if (!w || !w.members || !w.members[u.uid]) throw 0;
      if (NET.on || B.wid !== wid) { hide(); return; }                               // you went somewhere yourself while it loaded
      const here = Object.keys((w.live && w.live.players) || {}).length;
      B.ask = true; show((w.meta && w.meta.name) || 'Your world', here ? here + (here === 1 ? ' player' : ' players') + ' here now' : 'Nobody here right now', false, shotOf(wid)); }
    catch (e) { forget(); hide(); } };
  $('#wbNo').onclick = () => { sfx('click'); forget(); hide(); };
  $('#wbYes').onclick = () => { if (NET.busy || !B.wid) return; sfx('click'); homeDo(() => worldEnter(B.wid), null, $('#wbYes'), 'Joining…').then(() => { if (!NET.on) forget(); hide(); }); };
  // the loader, whenever a world is being entered
  { const we = worldEnter; worldEnter = async function (wid, back) { const v = (WORLD.mine && WORLD.mine[wid]) || {}, was = B.ask; B.ask = false;
      if (!back) show(B.wid === wid && was ? $('#wbName').textContent : (v.name || 'LOADING WORLD'), 'Loading…', true);
      try { return await we.apply(this, arguments); } finally { if (!back) hide(); } }; }
})();
