/* ================= THE WORLD LEADERBOARD (27 Nov 2026, his ask) =================
   A button under the chat button (his own button style, a trophy) opens it: everyone in this world, ranked by the COINS THEY EARNED THIS MONTH
   (his pick), each with the hours they have played, their device, the coins they hold and the hours spent fishing, mining, on the clicker, in the
   casino and racing. First is gold, second silver, third bronze. The rows are live: when someone passes someone, the two rows slide past each other
   (each row is moved by transform to its rank, so a change of rank IS the animation), the climber flashes with an arrow.
   THE PRIZE: last month's winner of a world with at least 4 people who played collects 1 of each case (free to open in the Shop) and 500 coins.
   The server supplies play stats from lb/{uid} and current balances from the world members' wallets.
   THE LAB (this computer only) has no world: it shows eight pretend players whose scores keep moving, to look at the board and the swaps. */
(()=>{
const LB={refs:[],rows:{},els:{},rank:{},win:undefined,mock:null,t:0,wid:null,balances:null,balanceTimer:0};
const CATS=[['fish','Fishing'],['mine','Mining'],['click','Chrispy Clicker'],['casino','Casino'],['race','Racing']];
/* (27 Nov 2026, his ask) each is a very small solid icon, not a word: a fish, a pickaxe, the little Chrispy character, a spade, a car. One flat shape each,
   drawn here as a grid, 2 screen pixels a dot, used as a mask so it takes the row's own text colour (dark on gold, light on navy). */
const CATI={fish:['..###...#','.#####.##','#########','#########','.#####.##','..###...#'],
  mine:['..#####..','.#######.','##..#..##','#...#...#','....#....','....#....','....#....','....#....'],            /* a pickaxe stood upright: the curved head, the handle down the middle */
  click:['..####..','.######.','#####.##','########','#####...','########','.######.','..####..'],           /* the Chrispy Clicker's character: a ball with its eye and its open mouth cut out */
  casino:['...#...','..###..','.#####.','#######','#######','##.#.##','...#...','..###..'],
  race:['...######..','..##.##.##.','###########','###########','.##.....##.']};                              /* a car from the side: long and low, windows cut, two wheels */
const CATM={};for(const[k,g]of Object.entries(CATI)){const c=mk(g[0].length*2,g.length*2),x=c.getContext('2d');x.fillStyle='#000';g.forEach((r,y)=>[...r].forEach((ch,i)=>{if(ch==='#')x.fillRect(i*2,y*2,2,2);}));CATM[k]={u:c.toDataURL(),w:c.width,h:c.height};}
const ROWH=86,MONTHS=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const ym=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit'}).format(d);
const monthKey=()=>ym(new Date()),prevKey=()=>{const[y,m]=monthKey().split('-').map(Number);return m===1?(y-1)+'-12':y+'-'+String(m-1).padStart(2,'0');};
const inMonth=(s,mo)=>s&&s.mo===mo?{e:s.e|0,mt:s.mt|0}:s&&s.pm&&s.pm.mo===mo?{e:s.pm.e|0,mt:s.pm.mt|0}:{e:0,mt:0};
const hrs=m=>{const h=(m|0)/60;return h>=100?Math.round(h)+'h':h>=10?h.toFixed(0)+'h':h>=1?h.toFixed(1)+'h':(m|0)+'m';};
const num=n=>(n|0).toLocaleString('en-AU');

$('#phone').insertAdjacentHTML('beforeend',`<button class="btn dark" id="boardBtn" title="Leaderboard" style="display:none"></button>
<div class="modal" id="boardModal">
  <div class="bhead"><span class="lbMonth" id="lbMonth"></span><button class="btn dark" id="boardX">${ic('cross',2,'solo')}</button></div>
  <div id="lbTitle"><canvas class="logoCv" data-word="LEADERBOARD" data-pal="coin" data-calm="1" width="118" height="16"></canvas></div>
  <div id="lbPrize">${ic('coin',2)}<span>1st place each month wins 1 of each case + 500 coins</span></div>
  <div id="lbLast"></div>
  <div id="lbScroll"><div id="lbList"></div></div>
</div>`);
document.head.insertAdjacentHTML('beforeend',`<style>
#boardBtn{position:absolute;left:10px;top:calc(166px + env(safe-area-inset-top));z-index:23}#boardBtn:not([style*=none]){display:flex}
#phone.land #boardBtn{left:calc(10px + var(--sl));top:160px}
#boardModal{left:0!important;right:0!important;top:0!important;bottom:0!important;max-height:none!important;width:auto;height:auto;margin:0;border-radius:0;z-index:31;overflow:hidden;color:#f6dfae;
  padding:calc(12px + env(safe-area-inset-top)) 12px calc(10px + env(safe-area-inset-bottom));background:radial-gradient(120% 70% at 50% 20%,#3a2a66 0,#1c1538 55%,#0c0919 100%)}
#boardModal.on{display:flex;flex-direction:column;align-items:center}
#boardModal .bhead{width:100%;display:flex;justify-content:space-between;align-items:center;flex:none}
.lbMonth{font:700 16px "Pixelify Sans";letter-spacing:2px;color:#b9a6e8;background:#0c0919;border:2px solid #5b4a8a;border-radius:5px;padding:4px 10px}
#boardModal .bhead .btn{padding:5px 8px 8px}
#lbTitle{width:100%;margin:10px 0 10px;flex:none}#lbTitle .logoCv{width:min(250px,70%)}   /* (27 Nov, his note) smaller */
#lbPrize{flex:none;display:flex;align-items:center;justify-content:center;gap:4px;font:600 13px "Pixelify Sans";color:#ffd25e;text-align:center;margin-bottom:22px}#lbPrize img{margin:0;flex:none}
#lbLast{flex:none;width:100%;max-width:420px}#lbLast:empty{display:none}
.lbWon{display:flex;align-items:center;gap:8px;justify-content:center;font:600 14px "Pixelify Sans";color:#f6dfae;background:#0c0919;border:2px solid #5b4a8a;border-radius:5px;padding:6px 10px;margin-bottom:8px}
.lbWon b{color:#ffd25e}.lbWon .btn{font-size:14px;padding:4px 10px 7px}
#lbScroll{flex:1;min-height:0;width:100%;max-width:420px;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;padding:4px 2px}#lbScroll::-webkit-scrollbar{display:none}
#lbList{position:relative;width:100%}
.lbRow{position:absolute;left:0;right:0;top:0;height:${ROWH-8}px;box-sizing:border-box;display:grid;grid-template-columns:38px 40px 1fr auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;
  padding:7px 10px 9px 8px;border:3px solid #181425;background:#2f2757;color:#f6dfae;box-shadow:inset 0 3px 0 #ffffff1c,inset 0 -6px 0 #0000003a;
  transition:transform .7s cubic-bezier(.3,1.3,.5,1);will-change:transform;overflow:hidden}
.lbRow.me{border-color:#8fd6ff}
.lbRank{grid-row:1/3;align-self:center;font:700 26px "Pixelify Sans";text-align:center;color:#b9a6e8;text-shadow:0 2px 0 #0c0919}
.lbFace{grid-row:1/2;width:40px;height:40px;image-rendering:pixelated;background:#0c091966;border:2px solid #181425}
.lbWho{min-width:0;display:flex;flex-direction:column;line-height:1.15;text-align:left}.lbWho b{font:700 18px "Pixelify Sans";white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbWho small{font:600 12px "Pixelify Sans";opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbEarn{text-align:right;line-height:1.1;display:flex;flex-direction:column;align-items:flex-end}.lbEarn b{font:700 21px "Pixelify Sans";display:flex;align-items:center;gap:4px}.lbEarn b img{margin:0}
.lbEarn small{font:600 11px "Pixelify Sans";opacity:.75;letter-spacing:.5px}
.lbCats{grid-column:2/5;display:flex;justify-content:space-between;gap:4px;font:600 11px "Pixelify Sans";opacity:.85;white-space:nowrap;overflow:hidden;margin-top:4px;text-align:left}.lbCats span{display:inline-flex;align-items:center;gap:4px}.lbI{display:inline-block;flex:none;background:currentColor;-webkit-mask:center/100% 100% no-repeat;mask:center/100% 100% no-repeat;opacity:.85}
/* gold, silver, bronze */
.lbRow.r1{background:#ffcf4a;color:#4a2a00;box-shadow:inset 0 3px 0 #fff2a8,inset 0 -6px 0 #d39b2a}.lbRow.r1 .lbRank{color:#7a4a00;text-shadow:0 2px 0 #fff2a8}
.lbRow.r2{background:#cfd8e6;color:#27304a;box-shadow:inset 0 3px 0 #ffffff,inset 0 -6px 0 #8f9bb5}.lbRow.r2 .lbRank{color:#4a5673;text-shadow:0 2px 0 #fff}
.lbRow.r3{background:#dc9a63;color:#43210c;box-shadow:inset 0 3px 0 #f6c79a,inset 0 -6px 0 #a8642e}.lbRow.r3 .lbRank{color:#6b3413;text-shadow:0 2px 0 #f6c79a}
.lbRow.r1::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 44%,rgba(255,255,255,.55) 44% 52%,transparent 52%);transform:translateX(-110%);animation:gshine 4.6s steps(12) infinite}
/* a change of place: the climber rides over the one it passes, flashes, and shows an arrow for a moment */
.lbRow.up{z-index:3;animation:lbUp .9s steps(6)}.lbRow.down{z-index:1}
@keyframes lbUp{0%,40%{filter:brightness(1.6)}100%{filter:none}}
.lbArrow{position:absolute;right:8px;top:4px;font:700 13px "Pixelify Sans";color:#3cf06a;text-shadow:0 2px 0 #0c0919;animation:lbArrow 1.6s steps(8) forwards;pointer-events:none}
.lbRow.r1 .lbArrow,.lbRow.r2 .lbArrow,.lbRow.r3 .lbArrow{color:#0b7a2c;text-shadow:none}
@keyframes lbArrow{0%{opacity:0;transform:translateY(8px)}15%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0}}
.lbNone{text-align:center;font:600 14px "Pixelify Sans";opacity:.7;padding:30px 10px}
#phone.land #boardModal{padding:8px calc(14px + var(--sr)) 8px calc(14px + var(--sl))}#phone.land #lbTitle{margin:2px 0 4px}#phone.land #lbTitle .logoCv{width:min(210px,30%)}#phone.land #lbPrize{margin-bottom:10px}#phone.land #lbScroll{max-width:560px}
</style>`);

/* ---------- who is on the board ---------- */
function people(){   // [{id, n, sk, e, t, d, co, k, me}] : this world's members with their cards, or the lab's pretend players
  if(LB.mock)return LB.mock;
  const mo=monthKey(),M=(typeof WORLD!=='undefined'&&WORLD.members)||{},me=NET.uid;
  return Object.entries(M).map(([id,m])=>{const s=LB.rows[id]||{};return{id,n:s.n||m.n||'Player',sk:s.sk||m.skin||'beanie',e:s.mo===mo?s.e|0:0,t:s.t|0,d:s.d||'',co:LB.balances?.values[id],k:s.k||{},me:id===me};});
}
function mockMake(){const N=['mrmafia','lily_x','big_tom','sunnyd','ava_k','benji','noodle','the_don'],D=['iPhone (Safari)','Desktop (Chrome)','Android (Chrome)','iPad (Safari)','Desktop (Edge)','iPhone (Chrome)'],S=SKINS.filter(s=>SP[s.id]).map(s=>s.id);
  return N.map((n,i)=>({id:'m'+i,n,sk:S[(i*3)%S.length]||'beanie',e:Math.round(4200-i*480+Math.random()*300),t:900-i*90+Math.round(Math.random()*200),d:D[i%D.length],co:Math.round(800+Math.random()*9000),
    k:{fish:Math.round(Math.random()*300),mine:Math.round(Math.random()*240),click:Math.round(Math.random()*120),casino:Math.round(Math.random()*200),race:Math.round(Math.random()*60)},me:i===3,has:true}));}

/* ---------- drawing it ---------- */
function render(){const L=$('#lbList');if(!$('#boardModal').classList.contains('on'))return;
  const P=people().sort((a,b)=>b.e-a.e||b.t-a.t||(a.n<b.n?-1:1));
  $('#lbMonth').textContent=MONTHS[+monthKey().split('-')[1]-1];
  if(!P.length){L.style.height='auto';L.innerHTML='<div class="lbNone">Nobody is here yet.</div>';LB.els={};LB.rank={};return;}
  if(L.querySelector('.lbNone'))L.innerHTML='';
  L.style.height=P.length*ROWH+'px';const seen=new Set();
  P.forEach((p,i)=>{seen.add(p.id);let el=LB.els[p.id];const fresh=!el;
    if(fresh){el=LB.els[p.id]=document.createElement('div');el.className='lbRow';el.style.transform=`translateY(${i*ROWH}px)`;L.appendChild(el);}
    const was=LB.rank[p.id];el.className='lbRow'+(i<3?' r'+(i+1):'')+(p.me?' me':'');
    const cats=CATS.map(([k,n])=>`<span title="${n}"><i class="lbI" style="width:${CATM[k].w}px;height:${CATM[k].h}px;-webkit-mask-image:url(${CATM[k].u});mask-image:url(${CATM[k].u})"></i>${hrs(p.k[k])}</span>`).join('');
    const held=p.co==null
      ? (LB.balances?.loading?'<small aria-label="Loading balance">HAS …</small>':'<small aria-label="Balance unavailable">HAS —</small>')
      : `<small>HAS ${p.co.toLocaleString('en-AU')}</small>`;
    const html=`<span class="lbRank">${i+1}</span><img class="lbFace" src="${face(SP[p.sk]?p.sk:'beanie')}" alt=""><span class="lbWho"><b>${esc(p.n)}</b><small>${esc(p.d||'')}${p.d?' · ':''}${hrs(p.t)} played</small></span>
      <span class="lbEarn"><b>${ic('coin',2,'solo')}${num(p.e)}</b>${held}</span><span class="lbCats">${cats}</span>`;
    if(el._h!==html){el._h=html;el.innerHTML=html;}
    el.style.transform=`translateY(${i*ROWH}px)`;
    if(!fresh&&was!=null&&was!==i){el.classList.add(i<was?'up':'down');if(i<was){el.insertAdjacentHTML('beforeend',`<span class="lbArrow">▲ ${was-i}</span>`);el._h=null;sfx('tick');}
      clearTimeout(el._t);el._t=setTimeout(()=>{el.classList.remove('up','down');const a=el.querySelector('.lbArrow');if(a)a.remove();},1700);}
    LB.rank[p.id]=i;});
  for(const id of Object.keys(LB.els))if(!seen.has(id)){LB.els[id].remove();delete LB.els[id];delete LB.rank[id];}
  last();}
/* last month's winner, and the button for them to collect */
function last(){const el=$('#lbLast');if(LB.mock||!LB.wid){el.innerHTML='';return;}
  const mo=prevKey(),name=MONTHS[+mo.split('-')[1]-1],M=WORLD.members||{};
  const R=Object.keys(M).map(id=>({id,n:(LB.rows[id]&&LB.rows[id].n)||M[id].n||'Player',...inMonth(LB.rows[id],mo)})).sort((a,b)=>b.e-a.e);
  const top=R[0],enough=R.filter(r=>r.mt>0).length>=4,done=LB.win;
  if(!top||top.e<=0||!enough||done===undefined){el.innerHTML='';return;}
  const mine=top.id===NET.uid;
  el.innerHTML=`<div class="lbWon"><span>${name}: <b>${esc(top.n)}</b> won</span>${mine&&!done?'<button class="btn go" id="lbClaim">Collect prize</button>':''}</div>`;
  const b=$('#lbClaim');if(b)b.onclick=async()=>{const fin=btnBusy(b,'…');try{await srv('lbClaim',{wid:LB.wid});fin();LB.win={uid:NET.uid};last();boardShut();if(typeof buyFx==='function')buyFx(500);}catch(e){fin();toast(e.message);}};}

/* ---------- opening and shutting ---------- */
function watchBalances(wid){
  const state=LB.balances={values:{},loading:true,pending:false};
  async function refresh(){
    if(state.pending||NET.world!==wid||document.visibilityState!=='visible'||!$('#boardModal').classList.contains('on'))return;
    state.pending=true;
    try{
      const {balances}=await srv('lbBalances',{wid});
      state.values=balances||{};
    }catch(e){/* Keep any balances already loaded. The next refresh retries. */}
    finally{
      state.pending=state.loading=false;
      if(LB.balances===state&&NET.world===wid)render();
    }
  }
  refresh();
  LB.balanceTimer=setInterval(refresh,15000);
}
function watch(){unwatch();const wid=NET.world;LB.wid=wid||null;LB.rows={};LB.win=undefined;
  if(!wid||!NET.db){if(typeof LABLOCAL!=='undefined'&&LABLOCAL){LB.mock=mockMake();LB.t=setInterval(()=>{const m=LB.mock[Math.floor(Math.random()*LB.mock.length)];m.e+=Math.round(150+Math.random()*900);m.t+=1;m.co+=120;render();},2600);}return;}
  LB.mock=null;
  for(const id of Object.keys(WORLD.members||{})){const r=NET.db.ref('lb/'+id);r.on('value',s=>{const v=s.val();if(v)LB.rows[id]=v;else delete LB.rows[id];render();},()=>{});LB.refs.push(r);}
  const w=NET.db.ref('lbwin/'+wid+'/'+prevKey());w.on('value',s=>{LB.win=s.val()||null;last();},()=>{LB.win=null;});LB.refs.push(w);
  watchBalances(wid);
  lbBeat(true);}
function unwatch(){
  for(const r of LB.refs)r.off();
  LB.refs=[];clearInterval(LB.t);LB.t=0;LB.mock=null;
  clearInterval(LB.balanceTimer);LB.balanceTimer=0;LB.balances=null;LB.wid=null;
}
function boardOpen(){document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));LB.els={};LB.rank={};$('#lbList').innerHTML='';$('#boardModal').classList.add('on');sfx('click');
  {const c=$('#lbTitle canvas');c.style.animation='none';void c.offsetWidth;c.style.animation='';drawLogo(c,performance.now());}
  watch();render();}
function boardShut(){$('#boardModal').classList.remove('on');unwatch();}
$('#boardBtn').onclick=boardOpen;$('#boardX').onclick=boardShut;
window.boardOpen=boardOpen;
/* the button shows with the players button (in a world's town), and in the lab's town */
{const _p=plSync;window.plSync=plSync=function(){_p.apply(this,arguments);const b=$('#boardBtn'),on=!!((NET.on&&NET.world||(typeof LABLOCAL!=='undefined'&&LABLOCAL&&LAB))&&scene===scenes.town);
  if((b.style.display!=='none')!==on)b.style.display=on?'':'none';
  if((LB.wid||LB.mock)&&(!on||!$('#boardModal').classList.contains('on')||(LB.wid&&LB.wid!==NET.world)))boardShut();
};}

/* ---------- THE CLOCK: one more minute of play, and what you are doing (the server counts it, never faster than real time) ---------- */
function doing(){const m=WL&&WL.me,H=m&&m.loc>=100?hallOf(m.loc):null,k=H&&H.k,on=id=>{const e=$(id);return!!(e&&e.classList.contains('on'));};
  if(on('#clk'))return'click';
  if(on('#flipModal')||on('#slotModal')||on('#bjModal')||on('#knifeModal')||k==='casino')return'casino';
  if((typeof FISH!=='undefined'&&FISH.on)||k==='lake')return'fish';
  if(k==='mine'||k==='smithy')return'mine';
  if(k==='race')return'race';
  return'';}
function lbBeat(force){if(typeof LABLOCAL!=='undefined'&&LABLOCAL)return;if(!NET.uid||!WALLET.ok||document.visibilityState!=='visible')return;if(!force&&scene===scenes.home)return;
  srv('beat',{a:doing(),sk:PEOPLE[0].skin}).catch(()=>{});}
setInterval(lbBeat,60000);
})();
