/* ================= FRIENDS (18 Nov 2026, phase 3 of the worlds plan) =================
   His ask: a friends list that shows their profile picture and name, and giving each other coins. Friends are made by Google
   email (or straight from a world's members); a request is a yes or a no. Sending coins goes through the server (cheat-proof,
   phase 2): only to friends, from a Google account at least a day old. The friend gets a pop-up when the coins arrive.
   Database (written only by the server, functions/index.js): friends/{uid}/{friend} true, freq/{uid}/{from} {n, p, skin},
   gifts/{uid}/{id} {from, n, amt} (the phone deletes a gift once it has shown it). Names and pictures: profiles/{uid}. */
const FR={uid:null,refs:[],list:{},req:{},prof:{},to:null,stake:500};
document.querySelector('#homeFlip').insertAdjacentHTML('afterend',`<button class="btn dark lob" id="homeFriends"><i data-ic="aSocial" data-s="2" data-c="solo"></i>Social<em class="frDot"></em></button>`);
document.querySelector('#menuHow').insertAdjacentHTML('beforebegin',`<button class="btn mrow" id="menuFriends">Social<em class="frDot"></em></button>`);
document.querySelector('#menuModal').insertAdjacentHTML('afterend',`<div class="modal big panel" id="friendsModal">
  <div class="mhead"><b>SOCIAL</b><button class="btn" id="frX"><i data-ic="cross" data-c="solo"></i></button></div>
  <button class="gbtn" id="frSign" style="display:none"><i data-ic="google" data-c="solo"></i><span>Sign in with Google</span></button>
  <div id="frMe"></div>
  <div id="frAddBox"><h4>ADD A FRIEND</h4><div class="wmRow"><span class="unAt"><b>@</b><input id="frUser" maxlength="16" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="username"></span><button class="btn red" id="frAdd">Add</button></div></div>
  <div class="small" id="frMsg"></div>
  <div id="frReq"></div><div id="frList"></div><div id="frDev"></div></div>
<div class="modal panel" id="unameModal"><h3>Create a username</h3><div class="small">Friends add you with it.</div>
  <span class="unAt big"><b>@</b><input id="unIn" maxlength="16" autocomplete="off" autocapitalize="none" spellcheck="false"></span>
  <div class="small bad" id="unMsg"></div><div class="row"><button class="btn" id="unX" style="display:none">Back</button><button class="btn red wide" id="unOk">Create</button></div></div>
<div class="modal panel" id="giftModal"><h3 id="gfTitle">Send coins</h3>
  <div class="stakes" id="gfStakes"><button data-a="100">100</button><button data-a="500">500</button><button data-a="1000">1000</button><input id="gfAmt" type="number" inputmode="numeric" min="1" max="1000000" placeholder="Other"></div>
  <div class="small bad" id="gfMsg"></div>
  <div class="row"><button class="btn" id="gfX">Back</button><button class="btn red" id="gfSend">Send</button></div></div>`);
document.querySelectorAll('#homeFriends [data-ic],#friendsModal [data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+(e.dataset.s||2),e.dataset.c);});
document.head.insertAdjacentHTML('beforeend',`<style>
#friendsModal,#giftModal{z-index:26}#friendsModal{text-align:left;max-height:calc(100% - 90px);overflow:auto;bottom:auto;top:calc(64px + env(safe-area-inset-top))}
#friendsModal h4{margin:12px 0 4px;font-size:13px;letter-spacing:2px;opacity:.75}
#frSign{width:100%;margin:6px 0}
.frow{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:2px solid #0001}
.frow img{width:36px;height:36px;border-radius:5px;image-rendering:pixelated;object-fit:cover;background:#0001}
.frow .fn{flex:1;min-width:0;font:700 17px "Pixelify Sans";overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.frow .fn small{display:block;font:600 12px "Pixelify Sans";opacity:.65}
.frow .btn{font-size:14px;padding:3px 9px 6px;display:inline-flex;align-items:center;gap:4px}
.frDot{display:none;min-width:18px;height:18px;padding:0 4px;margin-left:6px;border-radius:5px;background:#e4544f;border:2px solid #0f0b1e;color:#fff;font:700 12px/14px "Pixelify Sans";font-style:normal;text-align:center}
.frDot.on{display:inline-block}
#frMsg:empty,#gfMsg:empty{display:none}#frMsg{margin-top:6px}#frMsg.bad,#gfMsg{color:#c0392b}
#giftModal #gfStakes{margin:8px 0}
#unameModal{top:50%;bottom:auto!important;transform:translateY(-50%);z-index:40}#unMsg:empty{display:none}#unMsg{color:#c0392b;margin-top:6px}#unOk{margin-top:10px}
.unAt{display:flex;align-items:center;flex:1;min-width:0;border:3px solid var(--wood);border-radius:5px;background:#fff6df;padding:0 8px}
.unAt b{font:700 20px "Pixelify Sans";color:var(--wood);margin-right:2px}.unAt input{flex:1;min-width:0;border:0;background:none;font:700 17px "Pixelify Sans";padding:7px 0;color:var(--text);outline:0}
.unAt.big{margin-top:10px}.unAt.big b{font-size:26px}.unAt.big input{font-size:24px;padding:8px 0}
#frMe:empty{display:none}#frMe .btn{font-size:14px;padding:3px 10px 6px}
#homeName .hnt{display:flex;flex-direction:column;justify-content:center;flex:1;min-width:0;gap:1px}
#homeName .hnt b{font-size:18px;line-height:1.05;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#homeName .hnt small{font-size:9px;letter-spacing:2px;opacity:.65;line-height:1.1}#homeName .hnt small.at{font-size:13px;letter-spacing:0;font-weight:700;opacity:.6}
#homeName .hedit{display:flex;align-items:center;margin-left:auto;flex:none;opacity:.85}
#homeName .hedit img{display:block}#homeName:active .hedit{transform:translateY(1px)}
/* the Friends and World windows share one tidy look (18 Nov): small even buttons, quiet remove crosses, add-a-friend first */
#friendsModal .frow .btn,#worldModal .wmem .btn{height:30px;padding:0 10px 3px;font-size:14px;display:inline-flex;align-items:center;gap:5px;flex:none}
#friendsModal .frow .btn img,#worldModal .wmem .btn img{width:14px;height:14px}
#friendsModal .btn.xb,#worldModal .btn.xb{width:30px;padding:0 0 3px;justify-content:center;background:none;border-color:#0003;box-shadow:none;opacity:.7}
#friendsModal .btn.xb.sure,#worldModal .btn.sure{width:auto;padding:0 8px 3px;opacity:1;border-color:#6b1416;color:#b3261e}
#friendsModal h4,#worldModal h4{margin:14px 0 2px}
.frMeCard{display:flex;align-items:center;gap:8px;padding:6px 10px 8px;border:3px solid var(--wood);border-radius:5px;background:#fff7}
.frMeCard small{display:block;font-size:10px;letter-spacing:2px;opacity:.65}.frMeCard b{font-size:19px}.frMeCard span{flex:1;min-width:0}
.frNone{padding:8px 0;opacity:.6;font-size:14px}
#frDev:empty{display:none}#frDev .btn.sure{border-color:#6b1416;color:#b3261e}
#frAddBox .wmRow .btn,#wmInvite .wmRow .btn{height:40px;padding:0 14px 4px;flex:none}
</style>`);

const frFace=p=>p&&p.p?p.p:face((p&&p.skin)||'beanie');
const frSay=(t,bad)=>{if(scene===scenes.town)wlSay(t,bad?'bad':'good');else toast(t);};
/* who your friends are, who asked you, and coins arriving: live, for whoever is signed in */
function frWatch(){const u=acctUser(),uid=u?u.uid:null;if(uid===FR.uid)return;for(const r of FR.refs)r.off();FR.refs=[];FR.uid=uid;FR.list={};FR.req={};frPaint();
  if(!uid||!NET.db)return;
  NET.db.ref('profiles/'+uid).update({n:myName,p:(u&&u.photoURL)||'',skin:PEOPLE[0].skin}).catch(()=>{});
  const me=NET.db.ref('profiles/'+uid+'/u');me.on('value',s=>{FR.me=s.val()||'';frPaint();if(!FR.me&&FR.uid===uid)unAsk();else{$('#unameModal').classList.remove('on');}nameSync();},()=>{});FR.refs.push(me);
  const a=NET.db.ref('friends/'+uid),b=NET.db.ref('freq/'+uid),g=NET.db.ref('gifts/'+uid);
  a.on('value',s=>{FR.list=s.val()||{};frProfiles();},()=>{});b.on('value',s=>{FR.req=s.val()||{};frPaint();},()=>{});
  g.on('child_added',s=>{const v=s.val()||{};s.ref.remove().catch(()=>{});if(v.amt>0){sfx('rare');for(let k=0;k<3;k++)setTimeout(()=>sfx('coin'),200+k*140);frSay(`${ic('coin',2)} ${esc(v.n||'A friend')} sent you ${v.amt} coins`);}},()=>{});
  FR.refs.push(a,b,g);}
async function frProfiles(){const ids=Object.keys(FR.list).filter(id=>!FR.prof[id]);
  await Promise.all(ids.map(id=>NET.db.ref('profiles/'+id).get().then(s=>{FR.prof[id]=s.val()||{n:'Player'};}).catch(()=>{FR.prof[id]={n:'Player'};})));frPaint();}
function frPaint(){const n=Object.keys(FR.req).length;document.querySelectorAll('.frDot').forEach(e=>{e.textContent=n||'';e.classList.toggle('on',n>0);});
  if(!$('#friendsModal').classList.contains('on'))return;const signed=!!acctUser();$('#frMe').innerHTML=signed&&FR.me?`<div class="frMeCard"><span><small>YOUR USERNAME</small><b>${esc(FR.me)}</b></span><button class="btn" id="frMeEdit">Change</button></div>`:'';
  $('#frSign').style.display=signed?'none':'';$('#frAddBox').style.display=signed?'':'none';
  $('#frReq').innerHTML=n?'<h4>REQUESTS</h4>'+Object.entries(FR.req).map(([id,r])=>`<div class="frow"><img src="${esc(frFace(r))}" alt="" referrerpolicy="no-referrer"><span class="fn">${esc(r.u||r.n||'Player')}</span><button class="btn red" data-yes="${id}">Accept</button><button class="btn xb" data-no="${id}" title="Decline">${ic('cross',2,'solo')}</button></div>`).join(''):'';
  const fl=Object.keys(FR.list);
  $('#frList').innerHTML=signed?`<h4>FRIENDS ${fl.length}</h4>`+fl.map(id=>{const p=FR.prof[id]||{n:'…'};return`<div class="frow"><img src="${esc(frFace(p))}" alt="" referrerpolicy="no-referrer"><span class="fn">${esc(p.u||p.n||'Player')}</span><button class="btn go" data-gift="${id}">${ic('coin',2)}Send coins</button><button class="btn xb" data-rm="${id}" title="Remove friend">${ic('cross',2,'solo')}</button></div>`;}).join('')+(fl.length?'':'<div class="frNone">No friends yet.</div>'):'';
  /* THE DEVICE this account is assigned to (21 Nov, his ask): its name, and Remove (signs this device out, so another one can take the account) */
  const dv=typeof DEV!=='undefined'&&DEV.cur&&DEV.cur.id?DEV.cur:null;$('#frDev').innerHTML=dv?`<h4>DEVICE</h4><div class="frow"><span class="fn">${esc(dv.name||'A device')}<small>${dv.id===DEV.id?'This device':'Another device'}</small></span>${signed&&dv.id===DEV.id?'<button class="btn" data-devoff="1">Remove</button>':''}</div>`:'';}
/* the username pop-up: right after the Google sign-in, until there is one */
function unAsk(rename){if($('#unameModal').classList.contains('on'))return;$('#unIn').value=rename?FR.me:String(myName||'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,16);$('#unMsg').textContent='';
  $('#unameModal h3').textContent=rename?'Change your username':'Create a username';$('#unOk').textContent=rename?'Save':'Create';$('#unX').style.display=rename?'':'none';$('#unameModal').classList.add('on');setTimeout(()=>$('#unIn').focus(),50);}
$('#unX').onclick=()=>$('#unameModal').classList.remove('on');
/* USERNAME ONLY (27 Nov 2026, his call: "players only choose a username and that is shown as their name. no display name").
   Signed in: your name everywhere IS your username (profiles/{uid}/u, unique, set on the server). A guest has no username: they are guest + four
   digits (kept on the phone) until they sign in. Nothing else can be typed as a name. */
function nameSync(){const signed=!!acctUser();let want=myName;
  if(signed&&FR.me)want=FR.me;
  else if(!signed){let g='';try{g=localStorage.getItem('m2_guest')||'';}catch(e){}if(!/^guest\d{4}$/.test(g)){g='guest'+(1000+Math.floor(Math.random()*9000));try{localStorage.setItem('m2_guest',g);}catch(e){}}want=g;}
  if(want!==myName){myName=want;try{localStorage.setItem('m2_name',want);}catch(e){}if(typeof netProfile==='function')netProfile();}
  if(typeof homePaint==='function')homePaint();}
/* THE "PLAYING AS" BOX: your username, and his pencil to change it */
{const hn=$('#homeName');hn.innerHTML=`<img id="homeFace" alt=""><span class="hnt"><b id="homeNameT"></b><small id="homeUser">PLAYING AS</small></span><span class="hedit" title="Change your username">${ic('aPencil',2,'solo')}</span>`;
  hn.onclick=async()=>{sfx('click');if(!acctUser()){await $('#homeAcct').onclick();return;}unAsk(true);};homePaint();}
const unClean=v=>v.toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_]/g,'').slice(0,16);
$('#unIn').addEventListener('input',()=>{const i=$('#unIn'),v=unClean(i.value);if(v!==i.value)i.value=v;$('#unMsg').textContent='';});
$('#frUser').addEventListener('input',()=>{const i=$('#frUser'),v=unClean(i.value);if(v!==i.value)i.value=v;});
$('#unOk').onclick=async()=>{const v=unClean($('#unIn').value);if(v.length<4){$('#unMsg').textContent='At least 4 characters.';return;}
  const done=btnBusy($('#unOk'),'…');try{await srv('setName',{name:v});done();$('#unameModal').classList.remove('on');sfx('rare');}catch(e){done();$('#unMsg').textContent=e.message;}};
$('#unIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#unOk').click();});
function frMsg(t,bad){const e=$('#frMsg');e.textContent=t||'';e.className='small'+(bad?' bad':'');}
function frOpen(){document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));frMsg('');$('#friendsModal').classList.add('on');frWatch();frPaint();}
$('#homeFriends').onclick=()=>{sfx('click');frOpen();};
$('#menuFriends').onclick=()=>{sfx('click');frOpen();};
$('#friendsModal').addEventListener('click',e=>{if(e.target.closest('#frMeEdit'))unAsk(true);});
$('#frX').onclick=()=>$('#friendsModal').classList.remove('on');
$('#friendsModal').addEventListener('click',async e=>{const b=e.target.closest('[data-devoff]');if(!b)return;if(!b.classList.contains('sure')){b.classList.add('sure');b.textContent='Remove?';return;}
  const done=btnBusy(b,'…');try{await srv('devOff');}catch(err){done();frMsg(err.message,true);return;}sfx('close');$('#friendsModal').classList.remove('on');await devSignOut();if(typeof homeMsg==='function')homeMsg('Signed out.');});
$('#frSign').onclick=async()=>{await $('#homeAcct').onclick();frWatch();frPaint();};
$('#frAdd').onclick=async()=>{const e=unClean($('#frUser').value);if(!e)return;const done=btnBusy($('#frAdd'),'…');
  try{const r=await srv('friendAsk',{user:e});$('#frUser').value='';frMsg(r.friends?'You are friends now.':'Request sent.');sfx('copy');}catch(err){frMsg(err.message,true);}done();};
$('#frUser').addEventListener('keydown',e=>{if(e.key==='Enter')$('#frAdd').click();});
$('#friendsModal').addEventListener('click',async e=>{const b=e.target.closest('[data-yes],[data-no],[data-gift],[data-rm]');if(!b)return;
  if(b.dataset.yes){const d=btnBusy(b,'…');try{await srv('friendYes',{uid:b.dataset.yes});sfx('rare');}catch(err){frMsg(err.message,true);d();}return;}
  if(b.dataset.no){srv('friendNo',{uid:b.dataset.no}).catch(err=>frMsg(err.message,true));sfx('close');return;}
  if(b.dataset.rm){if(!b.classList.contains('sure')){b.classList.add('sure');b.textContent='Remove?';return;}srv('friendRemove',{uid:b.dataset.rm}).catch(err=>frMsg(err.message,true));sfx('close');return;}
  if(b.dataset.gift){FR.to=b.dataset.gift;const p=FR.prof[FR.to]||{};$('#gfTitle').textContent='Send coins to '+(p.n||'your friend');$('#gfAmt').value='';$('#gfMsg').textContent='';gfPaint();$('#giftModal').classList.add('on');}});
/* sending coins: the same amount keys as the coin flip */
const gfAmt=()=>{const v=Math.floor(+$('#gfAmt').value);return v>0?Math.min(v,1000000):FR.stake;};
function gfPaint(){const own=Math.floor(+$('#gfAmt').value)>0,a=gfAmt();$('#gfAmt').classList.toggle('sel',own);document.querySelectorAll('#gfStakes button').forEach(b=>b.classList.toggle('sel',!own&&+b.dataset.a===FR.stake));
  $('#gfSend').innerHTML='Send '+ic('coin',2)+' '+a;$('#gfSend').disabled=coins<a;}
$('#gfStakes').onclick=e=>{const b=e.target.closest('button');if(!b)return;FR.stake=+b.dataset.a;$('#gfAmt').value='';sfx('click');gfPaint();};
$('#gfAmt').oninput=gfPaint;
$('#gfX').onclick=()=>$('#giftModal').classList.remove('on');
$('#gfSend').onclick=async()=>{const a=gfAmt(),to=FR.to;if(!to)return;const done=btnBusy($('#gfSend'),'Sending…');
  try{await srv('gift',{uid:to,amt:a});done();$('#giftModal').classList.remove('on');sfx('coin');frMsg('Sent '+a+' coins to '+((FR.prof[to]||{}).n||'your friend')+'.');}catch(err){done();$('#gfMsg').textContent=err.message;}};
/* a world's members: add one as a friend straight from the list */
{const _wp=worldPanel;window.worldPanel=worldPanel=function(){_wp.apply(this,arguments);if(!acctUser())return;
  document.querySelectorAll('#wmMembers .wmem').forEach((row,i)=>{const uid=Object.entries(WORLD.members).sort((a,b)=>(+a[1].s)-(+b[1].s))[i][0];
    if(uid===NET.uid||FR.list[uid]||row.querySelector('[data-fr]'))return;row.querySelector('.wn').insertAdjacentHTML('afterend',`<button class="btn" data-fr="${uid}">Add friend</button>`);});};}
$('#worldModal').addEventListener('click',async e=>{const b=e.target.closest('[data-fr]');if(!b)return;const d=btnBusy(b,'…');
  try{const r=await srv('friendAsk',{uid:b.dataset.fr});b.textContent=r.friends?'Friends':'Sent';b.disabled=true;sfx('copy');}catch(err){d();wmMsg(err.message,true);}});
/* follow whoever is signed in */
{const _a=acctUI;window.acctUI=acctUI=function(){_a.apply(this,arguments);frWatch();nameSync();};}setTimeout(nameSync,2500);   /* a guest who never signs in still gets their guest name */
if(NET.ready)NET.ready.then(frWatch).catch(()=>{});
