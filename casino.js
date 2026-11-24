/* ================= THE CASINO'S GAMES (18 Nov 2026) =================
   BLACKJACK at the two green tables (his picks: solo against the dealer first, a shared table later; you choose what to put up like the coin
   flip, 100 / 500 / 1000 / 2500 or your own number, no daily limit; the payouts are blackjack's own).
   Rules, the usual ones: six decks, the dealer stands on every 17 and peeks for blackjack when he shows an Ace or a ten. A win pays 1 to 1,
   a blackjack 3 to 2, a draw gives your bet back. You can double on your first two cards (one more card, then you stand) and split a pair
   once (split Aces get one card each, and 21 after a split is not a blackjack). The bet leaves your wallet when the cards are dealt.
   Everything is drawn here in code: the felt, the cards, the dealer (the Mafia outfit, in a casino), so it stays on the game's pixel grid. */
const BJ={ph:'bet',shoe:[],hands:[],act:0,d:[],stake:500,amt:500,cards:[],t:0,word:'',raf:0,last:0,busy:false};
try{const v=+localStorage.getItem('m2_bj_stake');if(v>0)BJ.stake=v;}catch(e){}
Object.assign(SFX,{
  bj_card(){hiss(.05,{vol:.09,bp:3200});tone(240,.03,{type:'triangle',vol:.05,at:.02,to:160});},
  bj_flip(){hiss(.035,{vol:.08,bp:4200});hiss(.03,{vol:.05,bp:2200,at:.05});},
  bj_bust(){tone(220,.12,{type:'square',vol:.07,to:110});tone(150,.2,{type:'square',vol:.06,at:.1,to:70});},
  bj_bj(){[659,784,988,1319].forEach((f,i)=>tone(f,.12,{type:'square',vol:.07,at:i*.08}));}});

/* ---- the window ---- */
document.querySelector('#flipModal').insertAdjacentHTML('afterend',`<div class="modal panel" id="bjModal">
  <div class="mhead"><b>BLACKJACK</b><span class="wal"><i data-ic="coin" data-c="solo"></i><span class="coinN">0</span></span><button class="btn" id="bjX"><i data-ic="cross" data-c="solo"></i></button></div>
  <div id="bjStage"><canvas id="bjCv" width="152" height="128"></canvas><div id="bjWord"></div></div>
  <div id="bjCtl"><div class="stakes" id="bjStakes"><button data-a="100">100</button><button data-a="500">500</button><button data-a="1000">1000</button><button data-a="2500">2500</button><input id="bjAmt" type="number" inputmode="numeric" min="1" max="1000000" placeholder="Other"></div>
  <div class="frow" id="bjActs"><button class="btn" data-a="hit"><i data-ic="bjhit" data-s="3"></i>Hit</button><button class="btn" data-a="stand"><i data-ic="hand" data-s="3"></i>Stand</button><button class="btn" data-a="double"><i data-ic="bjdouble" data-s="3"></i>Double</button><button class="btn" data-a="split"><i data-ic="bjsplit" data-s="3"></i>Split</button></div>
  <button class="btn red wide" id="bjDeal">Deal</button>
  <div class="small" id="bjSub"></div></div></div>`);
document.head.insertAdjacentHTML('beforeend',`<style>
/* FULL SCREEN (his call, 18 Nov): the table scene fills the whole screen; the coins and the X float on top, the bets and the buttons over the carpet */
#bjModal{position:absolute;inset:0;z-index:30;padding:0;border:0!important;border-image:none!important;border-radius:0;box-shadow:none!important;background:#10301f;text-align:center}
#bjModal.on{display:block}
#bjModal .mhead{position:absolute;left:0;right:0;top:0;z-index:2;margin:0;padding:calc(10px + env(safe-area-inset-top)) 12px 8px;text-align:left;background:linear-gradient(#0f0b1ecc,#0f0b1e00)}
#bjModal .mhead b{color:#fff6cf!important;text-shadow:0 2px 0 #0f0b1e;font-size:24px}#bjModal .mhead .wal{color:#fff6cf;text-shadow:0 2px 0 #0f0b1e}
#bjStage{position:absolute;inset:0;overflow:hidden;background:#10301f}
#bjCv{position:absolute;left:0;top:0;image-rendering:pixelated}
#bjWord{position:absolute;left:0;right:0;top:40%;pointer-events:none}
#bjCtl{position:absolute;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2}
#bjModal #bjSub{color:#fff6cf;opacity:.85;text-shadow:0 1px 0 #0f0b1e}
#bjActs{display:none;margin:0 0 8px}#bjActs .btn{flex:1;font-size:15px;padding:6px 2px 9px;justify-content:center;flex-direction:column;gap:3px}#bjActs .btn:disabled{opacity:.45}
#bjModal.play #bjActs{display:flex}#bjModal.play #bjStakes,#bjModal.play #bjDeal{display:none}#bjModal.watch #bjStakes,#bjModal.watch #bjDeal{display:none}
#bjDeal{font-size:20px;padding:9px 8px 12px}#bjSub{margin-top:8px;min-height:15px}
</style>`);
document.querySelectorAll('#bjModal [data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+(e.dataset.s||2));});

/* ---- the cards ---- */
const BJ_SUIT={h:['.#.#.','#####','#####','.###.','..#..'],d:['..#..','.###.','#####','.###.','..#..'],c:['..#..','.###.','#####','#.#.#','..#..'],s:['..#..','.###.','#####','#####','.#.#.']};
const BJ_RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const bjRed=s=>s==='h'||s==='d';
function bjShoe(){const s=[];for(let k=0;k<6;k++)for(const su of'hdcs')for(const r of BJ_RANKS)s.push({r,su});for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];}BJ.shoe=s;}
function bjDraw(){if(BJ.shoe.length<78)bjShoe();return BJ.shoe.pop();}
const bjVal=r=>r==='A'?11:['J','Q','K','10'].includes(r)?10:+r;
function bjTotal(cs){let t=0,a=0;for(const c of cs){if(c.down)continue;t+=bjVal(c.r);if(c.r==='A')a++;}while(t>21&&a){t-=10;a--;}return{t,soft:a>0};}
const bjIsBJ=cs=>cs.length===2&&bjTotal(cs).t===21;
/* one card picture, made once and kept: 15 x 21, cream face, navy edge, the rank top left and a big suit in the middle */
const BJC={};
function bjCard(c){const k=c.down?'back':c.r+c.su;if(BJC[k])return BJC[k];const cv=mk(15,21),x=cv.getContext('2d');
  x.fillStyle='#1a1430';x.fillRect(1,0,13,21);x.fillRect(0,1,15,19);
  if(c.down){x.fillStyle='#b52b3a';x.fillRect(1,1,13,19);x.fillStyle='#e0b04a';x.fillRect(2,2,11,1);x.fillRect(2,18,11,1);x.fillRect(2,2,1,17);x.fillRect(12,2,1,17);
    x.fillStyle='#d9505c';for(let yy=4;yy<17;yy++)for(let xx=4;xx<11;xx++)if((xx+yy)%3===0)x.fillRect(xx,yy,1,1);return BJC[k]=cv;}
  x.fillStyle='#fff6e6';x.fillRect(1,1,13,19);x.fillStyle='#e9dcc2';x.fillRect(1,19,13,1);
  const col=bjRed(c.su)?'#cf2f3c':'#1a1430';x.fillStyle=col;pxText(x,c.r==='10'?'10':c.r,2,2);
  const g=BJ_SUIT[c.su];for(let yy=0;yy<5;yy++)for(let xx=0;xx<5;xx++)if(g[yy][xx]==='#')x.fillRect(3+xx*2,9+yy*2,2,2);
  return BJC[k]=cv;}

/* ---- where every card sits; each card glides there from the shoe ---- */
function bjLay(){const W=152,out=[];const row=(cs,y,cx)=>{const w=15+(cs.length-1)*11;cs.forEach((c,i)=>{c.tx=Math.round(cx-w/2+i*11);c.ty=y;out.push(c);});};
  row(BJ.d,47,W/2);const n=BJ.hands.length;BJ.hands.forEach((h,i)=>row(h.cs,72,n===1?W/2:i===0?W*.3:W*.7));return out;}
function bjGive(cs,down){const c={...bjDraw(),down:!!down,a:0,t0:BJ.t+BJ.q*.22};BJ.q++;cs.push(c);setTimeout(()=>sfx('bj_card'),BJ.q*220-200);return c;}

/* ---- a round ---- */
function bjAmt(){const v=Math.floor(+$('#bjAmt').value);return v>0?Math.min(v,1000000):BJ.stake;}
/* BLACKJACK ON THE SERVER (18 Nov 2026, phase 2: cheat-proof coins). The server holds the shoe and the dealer's hole card;
   each move (deal, hit, stand, double, split) goes there and comes back as the table: the phone only deals out the cards it
   has not shown yet (each glides in from the shoe like before) and turns the hole card over at the end. */
function bjDeal(){const amt=bjAmt();if(BJ.ph!=='bet'&&BJ.ph!=='done')return;if(coins<amt){sfx('nope');return;}
  try{localStorage.setItem('m2_bj_stake',String(amt));}catch(e){}BJ.amt=amt;
  BJ.d=[];BJ.hands=[{cs:[],bet:amt,done:false,dbl:false,split:false}];BJ.act=0;BJ.q=0;$('#bjWord').innerHTML='';BJ.word='';sfx('cas_chips');BJ.ph='wait';bjUI();
  bjSrv('deal',amt,true);}
function bjHand(){return BJ.hands[BJ.act];}
function bjAct(a){if(BJ.ph!=='play')return;const h=bjHand();
  if(a==='double'&&(h.cs.length!==2||coins<h.bet))return;if(a==='split'&&!bjCanSplit())return;
  if(a==='double'||a==='split')sfx('cas_chips');BJ.ph='wait';bjUI();bjSrv(a);}
async function bjSrv(a,amt,deal){let S;try{S=await srv('bj',{a,amt});}catch(e){BJ.ph=deal?'bet':'play';if(deal){BJ.d=[];BJ.hands=[];}$('#bjWord').innerHTML=pxWord('TRY AGAIN',4,'bad');bjUI();return;}
  bjApply(S);}
/* bring the table up to what the server says, dealing out only the new cards, in the order they would have come */
function bjApply(S){BJ.q=0;
  if(S.hands.length>BJ.hands.length&&BJ.hands.length===1){const h=BJ.hands[0],c2=h.cs.pop();h.split=true;BJ.hands.push({cs:c2?[c2]:[],bet:h.bet,done:false,dbl:false,split:true});}   /* a split: the second card moves over */
  const give=(arr,c)=>{const x={r:c.r,su:c.su,down:!!c.down,a:0,t0:BJ.t+BJ.q*.22};BJ.q++;arr.push(x);setTimeout(()=>sfx('bj_card'),BJ.q*220-200);};
  const deal=!BJ.d.length&&!BJ.hands[0].cs.length;
  if(deal){const P=BJ.hands[0].cs,H=S.hands[0].cs;give(P,H[0]);give(BJ.d,S.d[0]);give(P,H[1]);give(BJ.d,S.d[1]);}   /* the deal: you, the dealer, you, the dealer (face down) */
  S.hands.forEach((h,i)=>{const L=BJ.hands[i];L.bet=h.bet;L.dbl=h.dbl;L.split=h.split;for(let k=L.cs.length;k<h.cs.length;k++)give(L.cs,h.cs[k]);
    if(L.cs.length>h.cs.length)L.cs.length=h.cs.length;});   /* a swapped card (drunk luck) */
  const done=S.ph==='done',wait=BJ.q*220+120;
  if(!done){BJ.act=S.act;BJ.hands.forEach((h,i)=>h.done=i<S.act);setTimeout(()=>{BJ.ph='play';if(bjTotal(bjHand().cs).t>21)sfx('bj_bust');bjUI();},wait);bjUI();return;}
  /* the end: the hole card turns over, the dealer draws, then the result */
  setTimeout(()=>{const c=BJ.d[1];if(c&&c.down){c.r=S.d[1].r;c.su=S.d[1].su;c.down=false;c.flip=BJ.t;sfx('bj_flip');}BJ.ph='dealer';bjUI();
    let k=2;const step=()=>{if(k<S.d.length){BJ.q=0;give(BJ.d,S.d[k++]);bjUI();setTimeout(step,560);}else setTimeout(()=>bjEnd(S),350);};setTimeout(step,deal?400:520);},wait);}
function bjCanSplit(){const h=bjHand();return BJ.hands.length===1&&h.cs.length===2&&bjVal(h.cs[0].r)===bjVal(h.cs[1].r)&&coins>=h.bet;}
function bjEnd(S){const res=S.hands.map(h=>h.res),net=S.net|0;brag('bj',{n:net});S.hands.forEach((h,i)=>{if(BJ.hands[i])BJ.hands[i].res=h.res;});BJ.ph='done';
  const W=res.includes('bj')?'BLACKJACK':net>0?'YOU WIN':net===0&&res.some(r=>r==='push')?'PUSH':res.every(r=>r==='bust')?'BUST':'DEALER WINS';
  $('#bjWord').innerHTML=pxWord(W,W.length>8?5:6,net>0?'legendary':net===0?'sub':'bad')+(net?pxWord((net>0?'+':'-')+Math.abs(net),5,net>0?'good':'bad',.35):'');
  if(res.includes('bj'))sfx('bj_bj');else if(net>0){sfx('cas_win');for(let k=0;k<3;k++)setTimeout(()=>sfx('coin'),300+k*140);}else if(net<0)sfx('nope');
  bjUI();}

/* ---- buttons ---- */
function bjUI(){const M=$('#bjModal'),play=BJ.ph==='play'||BJ.ph==='wait'||BJ.ph==='deal'||BJ.ph==='dealer';M.classList.toggle('play',play);M.classList.toggle('done',BJ.ph==='done');M.classList.remove('placed');paintCoins();
  const own=Math.floor(+$('#bjAmt').value)>0;$('#bjAmt').classList.toggle('sel',own);document.querySelectorAll('#bjStakes button').forEach(b=>b.classList.toggle('sel',!own&&+b.dataset.a===BJ.stake));
  const amt=bjAmt(),h=bjHand(),go=BJ.ph==='play';$('#bjDeal').innerHTML=(BJ.ph==='done'?'Deal again':'Deal')+' · '+ic('coin',2)+' '+amt;$('#bjDeal').disabled=coins<amt;
  document.querySelectorAll('#bjActs .btn').forEach(b=>{const a=b.dataset.a;b.disabled=!go||(a==='double'&&!(h&&h.cs.length===2&&coins>=h.bet))||(a==='split'&&!(h&&bjCanSplit()));});
  const tot=h?bjTotal(h.cs):null;
  $('#bjSub').textContent=BJ.ph==='bet'?(coins<amt?'You need '+amt+' coins to play.':'Blackjack pays 3 to 2. The dealer stands on 17.'):BJ.ph==='done'?'':BJ.hands.length>1?'Hand '+(BJ.act+1)+' of 2 · '+(h.bet)+' coins':(h&&h.dbl?'Doubled: '+h.bet+' coins':'');}
$('#bjStakes').onclick=e=>{const b=e.target.closest('button');if(!b||(!BJ.sh&&BJ.ph==='play'))return;BJ.stake=+b.dataset.a;$('#bjAmt').value='';sfx('click');BJ.sh?bjShUI():bjUI();};
$('#bjAmt').oninput=()=>BJ.sh?bjShUI():bjUI();
$('#bjDeal').onclick=()=>BJ.sh?bjShBet():bjDeal();
$('#bjActs').onclick=e=>{const b=e.target.closest('button');if(b&&!b.disabled){sfx('click');if(BJ.sh)bjShAct(b.dataset.a);else bjAct(b.dataset.a);}};
$('#bjX').onclick=()=>{if(BJ.sh){if(bjShMyTurn()){wlSay('Finish your hand first.');return;}bjClose();return;}if(BJ.ph==='play'||BJ.ph==='deal'||BJ.ph==='wait'||BJ.ph==='dealer'){wlSay('Finish the hand first.');return;}bjClose();};
function bjOpen(){{const m=WL.me,k=m&&m.seat&&!m.seat.out&&m.seat.k;if(NET.on&&NET.world&&k&&/^bj\d_\d$/.test(k)){const[ti,j]=k.slice(2).split('_').map(Number);return bjShOpen(ti,j);}}document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));srv('bj',{a:'view'}).then(S=>{if(S&&S.ph==='play'&&!BJ.hands.length){BJ.d=[];BJ.hands=[{cs:[],bet:S.hands[0].bet,done:false,dbl:false,split:false}];bjApply(S);}}).catch(()=>{});if(BJ.ph!=='done'&&BJ.ph!=='bet')BJ.ph='bet';if(BJ.ph==='done'){BJ.ph='bet';BJ.d=[];BJ.hands=[];$('#bjWord').innerHTML='';}
  $('#bjModal').classList.add('on');sfx('cas_chips');bjUI();BJ.last=performance.now();cancelAnimationFrame(BJ.raf);bjFit();const loop=now=>{if(!$('#bjModal').classList.contains('on'))return;bjFrame(Math.min(.05,(now-BJ.last)/1000));BJ.last=now;BJ.raf=requestAnimationFrame(loop);};BJ.raf=requestAnimationFrame(loop);}
function bjClose(){$('#bjModal').classList.remove('on');cancelAnimationFrame(BJ.raf);sfx('close');if(BJ.sh)bjShLeave();}

/* ---- the picture ----
   THE TABLE IN 3D (his note, 18 Nov: "make it look more like a 3d pixel art table ... and have the dealer behind the table"). Layers, back to
   front: the Casino's back wall (assets/casino/bj-wall.png, PixelLab), the dealer (the Mafia outfit, breathing and blinking), the table
   (assets/casino/bj-table.png, PixelLab, its far edge in front of his waist), then the cards on the felt, dealt from his hands. */
load('bj/wall','assets/casino/bj-wall.png').catch(()=>{});load('bj/room','assets/casino/bj-room.png').catch(()=>{});load('bj/table','assets/casino/bj-table.png').catch(()=>{});
const BJ_TY=28,BJ_FROM=[69,30];
const BJV={S:2,W:152,H:128,ox:0,oy:0,scene:null};
/* SIDEWAYS (24 Nov): the four games zoom by the screen's SHORT side when the phone is held sideways, so each still fits its height */
const landW=(cw,ch)=>LAND?Math.min(cw,ch):cw;
function bjFit(){const st=$('#bjStage'),cv=$('#bjCv'),cw=st.clientWidth,ch=st.clientHeight;if(!cw||!ch)return;const S=Math.max(1,Math.floor(LAND?Math.min(cw/190,ch/96):cw/120)),   /* sideways (his mockup, 24 Nov): the half-moon table big, in the middle, filling the height; the bets sit on the felt, the moves in the two bottom corners */
      /* zoomed in (his call): on a phone the table is a little wider than the screen, its empty ends cut off */
    W=Math.ceil(cw/S),H=Math.ceil(ch/S);
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}cv.style.width=W*S+'px';cv.style.height=H*S+'px';
  const top=Math.ceil((LAND?40:56)/S);if(BJ.ph==='bet'||BJ.ph==='done'||!BJV.botPx)BJV.botPx=Math.max(BJV.botPx||0,$('#bjCtl').offsetHeight+18);const bot=LAND?0:Math.ceil(BJV.botPx/S);BJV.S=S;BJV.W=W;BJV.H=H;BJV.ox=Math.round((W-152)/2);BJV.oy=LAND?Math.round(H/2-77):Math.max(top,top+Math.round((H-top-bot-128)/2));   /* the game in the middle of the screen, the buttons below (his call) */
  $('#bjWord').style.top=((BJV.oy+44)*S)+'px';}
addEventListener('resize',()=>{if($('#bjModal').classList.contains('on'))bjFit();});
function bjFrame(dt){BJ.t+=dt;bjFit();if(!BJV.scene)BJV.scene=mk(152,128);const cv=BJV.scene,x=cv.getContext('2d'),W=152,H=128;x.imageSmoothingEnabled=false;
  x.clearRect(0,0,W,H);
  const D=SP.mafia&&SP.mafia.front;if(D){const ms=BJ.t*1000,o=BREATH[Math.floor((ms%2600)/200)],b=(ms%4300)<130?1:0,fr=D.frames[o][b];x.drawImage(fr,Math.round(W/2-D.w/2),BJ_TY+8-D.h+4);   /* stood behind the table: it hides him from the waist down */}
  if(IMG['bj/table'])x.drawImage(IMG['bj/table'],0,BJ_TY);
  for(const c of(BJ.sh?bjShLay():bjLay())){const k=clamp((BJ.t-c.t0)/.28,0,1),e=1-Math.pow(1-k,3);if(k<=0)continue;const cx=lerp(BJ_FROM[0],c.tx,e),cy=lerp(BJ_FROM[1],c.ty,e);
    x.globalAlpha=.35;x.fillStyle='#04140a';x.fillRect(Math.round(cx)+1,Math.round(cy)+2,15,21);x.globalAlpha=1;   /* a little shadow under each card */
    let im=bjCard(c);if(c.flip!=null){const f=clamp((BJ.t-c.flip)/.22,0,1),w=Math.max(1,Math.round(15*Math.abs(1-2*f)));if(f<.5)im=bjCard({down:true});x.drawImage(im,0,0,15,21,Math.round(cx+(15-w)/2),Math.round(cy),w,21);if(f>=1)c.flip=null;}
    else x.drawImage(im,Math.round(cx),Math.round(cy));}
  const tag=(str,cx,y,col)=>{const w=str.length*4+3;x.fillStyle='#0f0b1e';x.fillRect(Math.round(cx-w/2),y,w,9);x.fillStyle=col;pxText(x,str,Math.round(cx-w/2)+2,y+2);};
  if(BJ.sh){bjShTags(x,tag,W);bjRoom(cv);return;}
  if(BJ.d.length){const T=bjTotal(BJ.d),r=BJ.d[BJ.d.length-1];tag(String(T.t),(r.tx||W/2)+15+8,53,'#fff6cf');}   /* the dealer's total sits beside his cards */
  BJ.hands.forEach((h,i)=>{const T=bjTotal(h.cs),cx=BJ.hands.length===1?W/2:i===0?W*.3:W*.7,on=BJ.hands.length>1&&i===BJ.act&&BJ.ph==='play';
    const s=T.t>21?'BUST':(T.soft&&T.t<21&&BJ.ph!=='done'?(T.t-10)+'/'+T.t:String(T.t));if(h.cs.length)tag(s,cx,95,h.res==='bust'||T.t>21?'#ff7a7a':on?'#ffd25e':'#fff6cf');
    if(on){x.fillStyle='#ffd25e';x.fillRect(Math.round(cx)-1,106,3,2);}});
  bjRoom(cv);}
/* ================= THE SHARED TABLE (his ask, 18 Nov) =================
   In a world, everyone sitting at a table plays the same round against one dealer and sees everyone's cards. The server keeps the table
   (functions/bjt.js) and writes a copy to worlds/{wid}/bjt/{t}; this watches it. You bet, the round deals when the betting time runs out
   (sooner when everyone sitting has bet), then each player in turn, then the dealer. Any phone asks for a 'tick' when a deadline passes. */
function bjShOpen(ti,j){document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));if(BJ.sh)bjShLeave(true);
  const wid=NET.world,ref=NET.db.ref('worlds/'+wid+'/bjt/'+ti);BJ.sh={wid,ti,j,ref,T:null,skew:0,seen:{},shown:0,tickAt:0,busy:false};BJ.ph='bet';$('#bjWord').innerHTML='';
  ref.on('value',sn=>{const T=sn.val();if(!BJ.sh||BJ.sh.ref!==ref)return;if(T&&T.now)BJ.sh.skew=T.now-Date.now();BJ.sh.T=T;bjShUI();},()=>{});
  srv('bjt',{wid,t:ti,a:'sit',s:j}).catch(e=>{$('#bjSub').textContent=e.message;});
  clearInterval(BJ.tk);BJ.tk=setInterval(bjShTick,400);
  $('#bjModal').classList.add('on','shared');sfx('cas_chips');BJ.last=performance.now();cancelAnimationFrame(BJ.raf);bjFit();bjShUI();
  const loop=now=>{if(!$('#bjModal').classList.contains('on'))return;bjFrame(Math.min(.05,(now-BJ.last)/1000));BJ.last=now;BJ.raf=requestAnimationFrame(loop);};BJ.raf=requestAnimationFrame(loop);}
function bjShLeave(quiet){const S=BJ.sh;if(!S)return;S.ref.off();clearInterval(BJ.tk);BJ.sh=null;$('#bjModal').classList.remove('shared');if(!quiet)srv('bjt',{wid:S.wid,t:S.ti,a:'leave'}).catch(()=>{});}
const bjShNow=()=>Date.now()+(BJ.sh?BJ.sh.skew:0);
function bjShMe(){const T=BJ.sh&&BJ.sh.T;return T&&T.seats&&T.seats[NET.uid];}
function bjShMyTurn(){const T=BJ.sh&&BJ.sh.T;return!!(T&&T.ph==='play'&&(T.order||[])[T.cur|0]===NET.uid);}
function bjShTick(){const S=BJ.sh,T=S&&S.T;if(!T||!T.dl||!/^(bet|play|done)$/.test(T.ph))return;const n=Date.now();
  if(bjShNow()>=T.dl+250&&n-S.tickAt>1500){S.tickAt=n;srv('bjt',{wid:S.wid,t:S.ti,a:'tick'}).catch(()=>{});}
  if($('#bjModal').classList.contains('on'))bjShUI();}
async function bjShCall(a,amt){const S=BJ.sh;if(!S||S.busy)return;S.busy=true;bjShUI();try{await srv('bjt',{wid:S.wid,t:S.ti,a,amt});S.err=null;}catch(e){S.err={m:e.message,t:Date.now()};sfx('nope');}if(BJ.sh===S)S.busy=false;bjShUI();}
function bjShBet(){const amt=bjAmt();if(coins<amt){sfx('nope');return;}try{localStorage.setItem('m2_bj_stake',String(amt));}catch(e){}sfx('cas_chips');$('#bjWord').innerHTML='';bjShCall('bet',amt);}
function bjShAct(a){if(!bjShMyTurn())return;if(a==='double'||a==='split')sfx('cas_chips');bjShCall(a);}
/* where every card goes: the dealer along the top, the players along the bottom in stool order, each new card slides out from the dealer */
function bjShSeats(){const T=BJ.sh&&BJ.sh.T;if(!T||!T.seats)return[];return Object.entries(T.seats).map(([u,s])=>({u,...s,hands:s.hands||[]})).sort((a,b)=>a.s-b.s);}
function bjShLay(){const S=BJ.sh,T=S.T,W=152,out=[];if(!T)return out;let q=0;
  const put=(key,c,x,y)=>{let o=S.seen[key];if(!o||o.r!==T.r){o=S.seen[key]={r:T.r,t0:BJ.t+(q++)*.18,down:!!c.down};setTimeout(()=>sfx('bj_card'),(q-1)*180);}
    if(o.down&&!c.down){o.down=false;o.flip=BJ.t;sfx('bj_flip');}out.push({r:c.r,su:c.su,down:!!c.down,tx:Math.round(x),ty:y,t0:o.t0,flip:o.flip!=null&&BJ.t-o.flip<.25?o.flip:null});};
  const d=T.d||[],dw=15+(d.length-1)*11;d.forEach((c,i)=>put('d'+i,c,W/2-dw/2+i*11,47));
  const seats=bjShSeats(),n=Math.max(1,seats.length),step=n<=2?11:n===3?7:5;
  seats.forEach((st,k)=>{const cx=W*(k+.5)/n,hs=st.hands;hs.forEach((h,hi)=>{const hx=hs.length>1?cx+(hi?1:-1)*W/n*.22:cx,cs=h.cs||[],w=15+(cs.length-1)*step;cs.forEach((c,i)=>put(st.u+':'+hi+':'+i,c,hx-w/2+i*step,72));});});
  return out;}
function bjShTags(x,tag,W){const T=BJ.sh.T;if(!T)return;const d=T.d||[];
  if(d.length&&!d.some(c=>c.down)){const t=bjTotal(d).t;tag(String(t),W/2,38,t>21?'#ff7a7a':'#fff6cf');}
  const seats=bjShSeats(),n=Math.max(1,seats.length),cur=T.ph==='play'?(T.order||[])[T.cur|0]:null;
  seats.forEach((st,k)=>{const cx=W*(k+.5)/n,me=st.u===NET.uid,hs=st.hands;
    hs.forEach((h,hi)=>{const cs=h.cs||[];if(!cs.length)return;const hx=hs.length>1?cx+(hi?1:-1)*W/n*.22:cx,Tt=bjTotal(cs),on=st.u===cur&&hi===(T.hi|0);
      const str=h.res?{bj:'BJ',win:'WIN',push:'PUSH',lose:'LOSE',bust:'BUST'}[h.res]:Tt.t>21?'BUST':String(Tt.t);
      tag(str,hx,95,h.res==='win'||h.res==='bj'?'#7dff9c':h.res==='lose'||h.res==='bust'||Tt.t>21?'#ff7a7a':on?'#ffd25e':'#fff6cf');});
    const nm=(me?'YOU':String(st.n||'').toUpperCase()).slice(0,7)+(st.bet&&T.ph==='bet'?' '+st.bet:'');
    tag(nm,cx,106,me?'#ffd25e':st.u===cur?'#ffd25e':st.gone?'#8a8a9a':'#fff6cf');
    if(st.u===cur&&Math.floor(BJ.t*3)%2===0){x.fillStyle='#ffd25e';x.fillRect(Math.round(cx)-1,117,3,2);}});}
/* the buttons and the words under the table */
function bjShUI(){const S=BJ.sh;if(!S)return;const T=S.T,M=$('#bjModal'),me=bjShMe(),ph=T?T.ph:'idle',left=T&&T.dl?Math.max(0,Math.ceil((T.dl-bjShNow())/1000)):0,inRound=!!(T&&(T.order||[]).includes(NET.uid)),myTurn=bjShMyTurn();
  const playing=ph==='play'&&inRound;M.classList.toggle('play',playing);M.classList.toggle('watch',ph==='play'&&!inRound);M.classList.toggle('done',ph==='done');M.classList.toggle('placed',!!(ph==='bet'&&me&&me.bet));paintCoins();
  const own=Math.floor(+$('#bjAmt').value)>0;$('#bjAmt').classList.toggle('sel',own);document.querySelectorAll('#bjStakes button').forEach(b=>b.classList.toggle('sel',!own&&+b.dataset.a===BJ.stake));
  const amt=bjAmt(),bet=ph==='bet'&&me&&me.bet;$('#bjDeal').innerHTML=bet?'Bet placed · '+ic('coin',2)+' '+me.bet:'Bet · '+ic('coin',2)+' '+amt;$('#bjDeal').disabled=!!bet||S.busy||coins<amt||!me;
  const h=myTurn&&me&&me.hands&&me.hands[T.hi|0];
  document.querySelectorAll('#bjActs .btn').forEach(b=>{const a=b.dataset.a;b.disabled=!myTurn||S.busy||(a==='double'&&!(h&&(h.cs||[]).length===2&&coins>=h.bet))||(a==='split'&&!(h&&me.hands.length===1&&(h.cs||[]).length===2&&bjVal(h.cs[0].r)===bjVal(h.cs[1].r)&&coins>=h.bet));});
  const who=T&&ph==='play'&&T.seats&&T.seats[(T.order||[])[T.cur|0]];
  if(S.err&&Date.now()-S.err.t<3500){$('#bjSub').textContent=S.err.m;}else   /* a move that did not go through says why for a few seconds */
  $('#bjSub').textContent=!me?'Sitting down...':ph==='bet'?(bet?'Dealing in '+left:'Bet now · dealing in '+left):ph==='play'?(myTurn?'Your turn · '+left:who?who.n+"'s turn":''):ph==='done'?'':(coins<amt?'You need '+amt+' coins to play.':'Bet to start a hand. Anyone sitting here can join in.');
  /* the end of a round: your result, once */
  if(T&&ph==='done'&&T.pay&&T.pay[NET.uid]&&S.shown!==T.r){S.shown=T.r;const net=T.pay[NET.uid].net|0,res=(me&&me.hands||[]).map(h=>h.res);
    const Wd=res.includes('bj')?'BLACKJACK':net>0?'YOU WIN':net===0?'PUSH':res.length&&res.every(r=>r==='bust')?'BUST':'DEALER WINS';
    setTimeout(()=>{$('#bjWord').innerHTML=pxWord(Wd,Wd.length>8?5:6,net>0?'legendary':net===0?'sub':'bad')+(net?pxWord((net>0?'+':'-')+Math.abs(net),5,net>0?'good':'bad',.35):'');
      if(res.includes('bj'))sfx('bj_bj');else if(net>0){sfx('cas_win');for(let k=0;k<3;k++)setTimeout(()=>sfx('coin'),300+k*140);}else if(net<0)sfx('nope');brag('bj',{n:net});},700);}
}
/* the room round the table on the full screen: the wall carries on to the sides (mirrored), the dark wall above, the casino's red carpet below */
/* THE ROOM (his call, 18 Nov: "make it full screen"): a tall Christmas casino room made for the phone's shape (assets/casino/bj-room.png, PixelLab,
   200 x 400: chandelier, garland round a glowing card sign, wood panels, red carpet). It is lined up so the table's far edge sits against the
   wood panels; above it the ceiling's colour carries on, below it the carpet does (mirrored), and it is centred left to right. */
function bjRoom(scene){const c=$('#bjCv'),x=c.getContext('2d'),{W,H,ox,oy}=BJV,room=IMG['bj/room'];x.imageSmoothingEnabled=false;
  x.fillStyle='#120c0c';x.fillRect(0,0,W,H);
  if(room){const rx=Math.round((W-room.width)/2),ry=oy+123-290;   /* the table's feet on the room's floor */x.drawImage(room,rx,ry);
    if(ry>0)x.drawImage(room,0,0,room.width,1,rx,0,room.width,ry);
    for(let y=ry+room.height,k=0;y<H;y+=40,k++){x.save();x.translate(0,y+(k%2?0:40));x.scale(1,k%2?1:-1);x.drawImage(room,0,room.height-40,room.width,40,rx,0,room.width,40);x.restore();}
    if(rx>0){x.drawImage(room,0,0,1,room.height,0,ry,rx,room.height);x.drawImage(room,room.width-1,0,1,room.height,rx+room.width,ry,W-rx-room.width,room.height);}}
  x.globalAlpha=.32;x.fillStyle='#05030a';x.fillRect(ox+4,oy+120,144,5);x.globalAlpha=1;   /* the table's shadow on the carpet */
  x.drawImage(scene,ox,oy);}
/* ================= THE COIN FLIP MACHINE, UP CLOSE (his call, 18 Nov) =================
   The front of the machine fills the screen at a whole number of screen pixels per art pixel; its screen is a hole (see-through pixels in
   flip-machine.png), and the coin's own canvas (#flipCv, at the same pixel size) sits behind it, centred in the hole. */
const FM={j:null};load('fm/mach','assets/casino/flip-machine.png').catch(()=>{});fetch('assets/casino/flip-machine.json?v='+BUILD).then(r=>r.json()).then(j=>{FM.j=j;flipFit();}).catch(()=>{});
function flipFit(){const M=$('#flipModal'),J=FM.j,im=IMG['fm/mach'];if(!J||!im||!M.classList.contains('on'))return;const cw=M.clientWidth,ch=M.clientHeight;if(!cw)return;
  const ctl=LAND?$('#flipCtl').offsetWidth+24:0,S=Math.max(1,Math.floor(LAND?Math.min((cw-ctl)/92,ch/118):cw/92)),W=Math.ceil(cw/S),H=Math.ceil(ch/S),ox=Math.round((W-ctl/S-J.w)/2),oy=LAND?Math.round((H+44/S)/2-(J.hy+J.hh/2)):Math.round(H*.47-(J.hy+J.hh*.62)),c=$('#flipMach');   /* sideways: the machine in the open part, its screen in the middle, the buttons in a column on the right */   /* standing right at the machine (his call): about 4 screen pixels per art pixel, the screen a little above the middle, the cabinet's edges and sign cut off */
  if(c.width!==W||c.height!==H){c.width=W;c.height=H;}c.style.width=W*S+'px';c.style.height=H*S+'px';c.style.left='0';c.style.top='0';
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,W,H);x.fillStyle='#0e0b1a';x.fillRect(0,0,W,Math.max(0,oy));x.fillRect(0,oy+J.h,W,H);x.drawImage(im,ox,oy);
  const st=$('#flipStage');st.style.left=(ox+J.hx)*S+'px';st.style.top=(oy+J.hy)*S+'px';st.style.width=J.hw*S+'px';st.style.height=J.hh*S+'px';
  const fc=$('#flipCv');fc.style.width=fc.width*S+'px';fc.style.height=fc.height*S+'px';fc.style.left=Math.round((J.hw-fc.width)/2)*S+'px';fc.style.top=Math.round((J.hh-fc.height)/2)*S+'px';}
{const _fs=flipShow;flipShow=function(){_fs.apply(this,arguments);flipFit();requestAnimationFrame(flipFit);};}
addEventListener('resize',()=>flipFit());

/* PIXEL-ART ARCADE BUTTONS (his note, 18 Nov: "PIXEL ART for the buttons please. make them pixelated circle buttons"). Each is drawn here on an
   18 x 20 grid and shown 4x like the machine: a round cap with a navy outline, a light rim top left, a darker side under it (the button's
   height), a white glint; pressed = the cap sits 2 px lower; picked = a gold ring of light round it. */
function arcBtn(c0,cl,cd,cs,pressed,lit){const W=22,H=24,cv=mk(W,H),x=cv.getContext('2d'),cx=10.5,R=8,dy=pressed?2:0;
  const disc=(cy,r,fn)=>{for(let y=0;y<H;y++)for(let i=0;i<W;i++){const d=Math.hypot(i-cx,(y-cy)*1.08);if(d<=r+.35){const c=fn(i-cx,y-cy,d);if(c){x.fillStyle=c;x.fillRect(i,y,1,1);}}}};
  if(lit){const up=h=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(h.slice(i,i+2),16)*1.18+18)).toString(16).padStart(2,'0')).join('');c0=up(c0);cd=up(cd);}   /* picked: pressed in and a little brighter (his call) */
  disc(13,R+1,(dx,dy_,d)=>d>R?'#1a1430':cs);                 /* the side (its height) */
  disc(10+dy,R+1,(dx,dy_,d)=>d>R?'#1a1430':d>R-1.6&&dx+dy_<-2?cl:d>R-1.6?cd:dx+dy_<-6?cl:c0);   /* the cap */
  x.fillStyle='#ffffff';x.fillRect(Math.round(cx-4),7+dy,2,1);x.fillRect(Math.round(cx-5),8+dy,1,1);   /* the glint */
  return cv.toDataURL();}
const ARC={h:{c0:'#e4544f',cl:'#ff9a8f',cd:'#a92b2c',cs:'#6b1416'},t:{c0:'#4a7bd0',cl:'#9fd0ff',cd:'#2b4a8a',cs:'#14254a'}};
for(const k in ARC){const A=ARC[k];A.up=arcBtn(A.c0,A.cl,A.cd,A.cs,false,false);A.dn=arcBtn(A.c0,A.cl,A.cd,A.cs,true,false);A.lit=arcBtn(A.c0,A.cl,A.cd,A.cs,true,true);A.litdn=arcBtn(A.c0,A.cl,A.cd,A.cs,true,true);}
document.head.insertAdjacentHTML('beforeend',`<style>
#flipModal .fside .ab{width:88px;height:96px;border:0!important;border-radius:0;outline:0!important;box-shadow:none!important;background-color:transparent!important;background-position:center!important;background-size:88px 96px!important;background-repeat:no-repeat!important;image-rendering:pixelated;display:block;padding:0;transition:none;position:relative}
#flipModal .fside .ab img{position:absolute;left:24px}
#flipModal .fside[data-s=h] .ab img{top:18px}#flipModal .fside[data-s=t] .ab img{top:20px}   /* each icon's middle on the cap's middle (the hat's grid has an empty top row) */
#flipModal .fside[data-s=h] .ab{background-image:url(${ARC.h.up})}#flipModal .fside[data-s=t] .ab{background-image:url(${ARC.t.up})}
#flipModal .fside[data-s=h].sel .ab{background-image:url(${ARC.h.lit})}#flipModal .fside[data-s=t].sel .ab{background-image:url(${ARC.t.lit})}
#flipModal .fside[data-s=h]:active .ab{background-image:url(${ARC.h.dn})}#flipModal .fside[data-s=t]:active .ab{background-image:url(${ARC.t.dn})}
#flipModal .fside.sel .ab img,#flipModal .fside:active .ab img{transform:translateY(8px)}
#flipModal .fside:active .ab{transform:none}
#flipModal .fside .ab img{filter:none}
/* the bet keys and Flip as pixel keys: square, with the corners stepped off like pixel art */
#flipModal .stakes button,#flipModal .stakes input,#flipModal #flipGo{border-radius:0!important;clip-path:polygon(4px 0,calc(100% - 4px) 0,calc(100% - 4px) 4px,100% 4px,100% calc(100% - 4px),calc(100% - 4px) calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 4px),0 calc(100% - 4px),0 4px,4px 4px)}
</style>`);
/* Heads and Tails as round arcade buttons, just the hat or the sword on them (his ask, 18 Nov) */
document.querySelectorAll('#flipSides .fside').forEach(b=>{const h=b.dataset.s==='h';b.innerHTML=`<span class="ab">${ic(h?'tophat':'knife',4)}</span>${h?'Heads':'Tails'}`;});

/* ================= THE SLOT MACHINES, UP CLOSE (18 Nov 2026) =================
   His ask: "the same principles as the coin flip. machine frame, custom UI/buttons. make it so the lever is actually pullable, and the
   amount to put in is the custom UI". So: the machine's front (assets/casino/slot-machine.png, PixelLab; its screen is see-through and its
   painted lever was wiped off) fills the screen at a whole number of screen pixels per art pixel, and EVERYTHING else is drawn here on the
   same pixel grid, on one canvas: the three reels behind the glass, the lever on the right (grab the red knob and pull it down; a tap pulls
   it for you; Space works on a computer), the LED window under the reels (your bet, what happened, the pay table running along the bottom;
   tap it to type your own bet) and four pixel bet keys on the plinth (100, 500, 1K, 2.5K). No daily limit, like Blackjack.
   PAYS (for one bet): three cherries 10, lemons 12, bells 18, bars 25, coins 40, knives 80, hats 150, sevens 300; any two cherries 3.
   Each reel lands on its own (weights below), which gives back about 93 coins in every 100 put in, and something pays about 1 spin in 5. */
const SLOT_SYM=[{n:'CHERRIES',ic:'slotcherry',w:8,p:10},{n:'LEMONS',ic:'slotlemon',w:7,p:12},{n:'BELLS',ic:'slotbell',w:5,p:18},{n:'BARS',ic:'slotbar',w:4,p:25},
  {n:'COINS',ic:'coinbig',w:3,p:40},{n:'KNIVES',ic:'slotknife',w:2,p:80},{n:'HATS',ic:'slothat',w:1.5,p:150},{n:'SEVENS',ic:'slot7',w:1,p:300}];
const SLOT_TW=SLOT_SYM.reduce((a,s)=>a+s.w,0),SLOT_KEYS=[[100,'100'],[500,'500'],[1000,'1K'],[2500,'2.5K']];
const SLOT={stake:500,own:0,busy:false,t:0,last:0,raf:0,res:null,bet:0,win:0,end:null,msg:null,th:0,thv:0,drag:null,auto:false,fired:false,parts:[],flash:0,press:null,typing:false,keys:[],sym:null,shade:null,j:null};
try{const v=+localStorage.getItem('m2_slot_stake');if(v>0)SLOT.stake=v;}catch(e){}
const SLV={S:3,W:130,H:260,ox:0,oy:0};
CK_FONT['?']=CK_FONT['?']||[6,1,2,0,2];CK_FONT[':']=CK_FONT[':']||[0,2,0,2,0];
Object.assign(SFX,{
  sl_pull(){tone(140,.09,{type:'triangle',vol:.2,to:70});hiss(.05,{vol:.08,lp:900,at:.02});},
  sl_spin(){for(let i=0;i<24;i++)tone(600+((i*53)%6)*45,.02,{type:'square',vol:.028,at:.06+i*.068});},
  sl_stop(){tone(210,.05,{type:'square',vol:.07,to:120});hiss(.03,{vol:.06,bp:2500});},
  sl_key(){tone(520,.03,{type:'square',vol:.05});hiss(.02,{vol:.04,bp:3000});}});
function slotStrip(){const a=[];[[0,5],[1,4],[2,3],[3,3],[4,2],[5,1],[6,1],[7,1]].forEach(([i,n])=>{for(let k=0;k<n;k++)a.push(i);});
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
SLOT.reels=[0,1,2].map(()=>({strip:slotStrip(),p:Math.floor(Math.random()*20),v:0,done:true}));
function slotPick(){let r=Math.random()*SLOT_TW;for(let i=0;i<SLOT_SYM.length;i++){r-=SLOT_SYM[i].w;if(r<0)return i;}return 0;}
function slotPays(r){if(r[0]===r[1]&&r[1]===r[2])return SLOT_SYM[r[0]].p;return r.filter(i=>i===0).length===2?3:0;}
function slotAmt(){return SLOT.own>0?SLOT.own:SLOT.stake;}
function slotSyms(){if(SLOT.sym)return SLOT.sym;if(!window.M2_ICONS||!window.M2_PAL)return null;
  SLOT.sym=SLOT_SYM.map(s=>{const g=M2_ICONS[s.ic],c=mk(16,16),x=c.getContext('2d');g.forEach((row,y)=>[...row].forEach((ch,i)=>{if(ch!=='.'){x.fillStyle=M2_PAL[ch]||'#f0f';x.fillRect(i,y,1,1);}}));return c;});
  return SLOT.sym;}
load('sl/mach','assets/casino/slot-machine.png').catch(()=>{});fetch('assets/casino/slot-machine.json?v='+BUILD).then(r=>r.json()).then(j=>{SLOT.j=j;}).catch(()=>{});

/* ---- the window: a title, the wallet and a cross on top; the rest is the canvas ---- */
document.querySelector('#bjModal').insertAdjacentHTML('afterend',`<div class="modal panel" id="slotModal">
  <div class="mhead"><b>SLOTS</b><span class="wal"><i data-ic="coin" data-c="solo"></i><span class="coinN">0</span></span><button class="btn" id="slotX"><i data-ic="cross" data-c="solo"></i></button></div>
  <canvas id="slotCv" width="130" height="260"></canvas><div id="slotWord"></div>
  <input id="slotAmt" type="number" inputmode="numeric" min="1" max="1000000" aria-label="Your own bet"></div>`);
document.querySelectorAll('#slotModal [data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+(e.dataset.s||2));});
document.head.insertAdjacentHTML('beforeend',`<style>
#slotModal{position:absolute;inset:0;z-index:30;padding:0;border:0!important;border-image:none!important;border-radius:0;box-shadow:none!important;background:#350524;text-align:center;overflow:hidden}
#slotModal.on{display:block}
#slotModal .mhead{position:absolute;left:0;right:0;top:0;z-index:3;margin:0;padding:calc(10px + env(safe-area-inset-top)) 12px 8px;text-align:left}
#slotModal .mhead b{color:#fff6cf!important;text-shadow:0 2px 0 #0f0b1e;font-size:24px}#slotModal .mhead .wal{color:#fff6cf;text-shadow:0 2px 0 #0f0b1e}
#slotCv{position:absolute;left:0;top:0;image-rendering:pixelated;touch-action:none;cursor:default}
#slotWord{position:absolute;left:0;right:0;pointer-events:none;z-index:2}
#slotAmt{position:absolute;z-index:2;opacity:0;border:0;padding:0;margin:0;font-size:16px;background:none;color:transparent;caret-color:transparent;cursor:pointer}
</style>`);

/* ---- sizes: the reels a little above the middle, the keys on the plinth, the lever always on screen ---- */
function slotFit(){const M=$('#slotModal'),cv=$('#slotCv'),J=SLOT.j,cw=M.clientWidth,ch=M.clientHeight;if(!J||!cw||!ch)return false;
  const S=LAND?Math.max(2,Math.floor(Math.min(ch/88,cw/205))):Math.max(1,Math.floor(cw/Math.max(104,J.w-6))),W=Math.ceil(cw/S),H=Math.ceil(ch/S);   /* standing at the machine: 3 or 4 screen pixels per art pixel on a phone */
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}cv.style.width=W*S+'px';cv.style.height=H*S+'px';
  const ox=LAND?13-J.hx:Math.min(Math.round((W-J.w)/2),W-J.w),oy=LAND?Math.round(H/2-(J.hy+J.hh/2)):Math.min(H-244-Math.ceil(16/S),Math.round(H*.44-(J.hy+J.hh/2)));   /* sideways (his mockup, 24 Nov): the machine big on the left, cut by the screen's edges, the reels in the middle of the height */   /* on a narrow phone the left edge is cut, never the lever */
  let lx=ox+J.lx,ly=oy+J.ly,kw=0,kx0=0,ky0=0;
  if(LAND){const sr=(parseFloat(getComputedStyle(M.querySelector('.mhead')).paddingRight)||12)-12,p0=ox+J.w+5,p1=W-Math.ceil(sr/S)-3,pc=(p0+p1)/2;   /* on the right: the LED panel, the bet keys under it */
    lx=Math.round(pc-J.lw/2);ly=Math.round(H*.24);kw=Math.max(15,Math.min(22,Math.floor((p1-p0-9)/4)));kx0=Math.round(pc-(4*kw+9)/2);ky0=Math.max(ly+J.lh+12,Math.round(H*.68));}
  Object.assign(SLV,{S,W,H,ox,oy,lx,ly,kw,kx0,ky0});$('#slotWord').style.right=LAND?Math.max(0,W-(ox+J.w))*S+'px':'';
  const a=$('#slotAmt');a.style.left=lx*S+'px';a.style.top=ly*S+'px';a.style.width=J.lw*S+'px';a.style.height=J.lh*S+'px';
  $('#slotWord').style.top=Math.max(52,(oy+J.hy-50)*S)+'px';return true;}   /* the win words over the 7 sign, so the reels that won stay in view */
addEventListener('resize',()=>{if($('#slotModal').classList.contains('on'))slotFit();});
function slotLever(){const{ox,oy}=SLV,px=ox+121,py=oy+132,len=31;return{px,py,len,kx:px,ky:py-len*Math.cos(SLOT.th)};}

/* ---- spinning ---- */
async function slotSpin(){const a=slotAmt();if(SLOT.busy||SLOT.ask)return;
  if(coins<a){SLOT.msg={s:'NEED '+a,c:'#ff7a7a',until:SLOT.t+2.2};sfx('nope');return;}
  SLOT.ask=true;let R;try{R=await srv('slot',{amt:a});}catch(e){SLOT.ask=false;SLOT.msg={s:'TRY AGAIN',c:'#ff7a7a',until:SLOT.t+2.2};sfx('nope');return;}SLOT.ask=false;   /* the server spins it */
  SLOT.bet=a;SLOT.res=R.res;SLOT.srvWin=R.win|0;SLOT.busy=true;SLOT.win=0;SLOT.end=null;SLOT.msg=null;$('#slotWord').innerHTML='';
  try{localStorage.setItem('m2_slot_stake',String(a));}catch(e){}
  sfx('sl_spin');
  SLOT.reels.forEach((r,i)=>{const n=r.strip.length;let j=Math.round(r.p)+16+i*7;while(r.strip[((j%n)+n)%n]!==SLOT.res[i])j++;r.p=Math.round(r.p);r.p0=r.p;r.p1=j;r.t0=SLOT.t;r.T=.95+i*.45;r.done=false;});}
function slotEnd(){const m=slotPays(SLOT.res),w=SLOT.srvWin|0;SLOT.busy=false;SLOT.win=w;SLOT.end={t:SLOT.t,m};brag('slot',{n:w-(SLOT.bet|0)});
  if(w){sfx('cas_win');if(m>=80)sfx('bj_bj');SLOT.flash=m>=80?.6:.3;const{ox,oy}=SLV,J=SLOT.j;
    for(let k=0;k<(m>=80?70:30);k++){const a=-Math.PI*(.15+.7*Math.random()),sp=40+Math.random()*70;SLOT.parts.push({x:ox+J.hx+J.hw/2,y:oy+J.hy+J.hh-6,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l:1+Math.random()*.8,t:0,c:k%3});}
    for(let k=0;k<Math.min(6,2+m/40);k++)setTimeout(()=>sfx('coin'),300+k*140);
    $('#slotWord').innerHTML=pxWord(m>=150?'JACKPOT':m>=40?'BIG WIN':'YOU WIN',6,'legendary')+pxWord('+'+w,6,'good',.35);}
  else sfx('nope');}
function slotPull(){if(SLOT.busy||SLOT.drag||SLOT.auto||SLOT.th>.1)return;SLOT.auto=true;}
function slotFire(){if(SLOT.fired)return;SLOT.fired=true;sfx('sl_pull');slotSpin();}

/* ---- the picture ---- */
function slotRR(x,X,y,w,h,c){x.fillStyle=c;x.fillRect(X+1,y,w-2,h);x.fillRect(X,y+1,w,h-2);}
function slotFrame(dt){const T=SLOT;T.t+=dt;if(!slotFit())return;const cv=$('#slotCv'),x=cv.getContext('2d'),{W,H,ox,oy}=SLV,J=T.j,im=IMG['sl/mach'],sym=slotSyms();x.imageSmoothingEnabled=false;
  /* the lever: held, pulled for you, or springing back */
  if(T.auto){T.th=Math.min(Math.PI,T.th+dt*11);if(T.th>=Math.PI){slotFire();T.auto=false;}}
  else if(!T.drag){T.thv+=(-110*T.th-13*T.thv)*dt;T.th+=T.thv*dt;if(T.th<0){T.th=0;T.thv=-T.thv*.25;}}
  if(T.th<.3&&!T.drag&&!T.auto)T.fired=false;
  /* the reels */
  for(const r of T.reels){const p0=r.p;if(!r.done){const u=(T.t-r.t0)/r.T;if(u>=1){r.p=r.p1%r.strip.length;r.done=true;sfx('sl_stop');if(T.reels.every(q=>q.done))slotEnd();}
      else{const s=.55,e=1+(s+1)*Math.pow(u-1,3)+s*Math.pow(u-1,2);r.p=r.p0+(r.p1-r.p0)*e;}}
    r.v=r.done?0:(r.p-p0)/Math.max(dt,.001);}
  x.fillStyle='#350524';x.fillRect(0,0,W,H);
  if(!J||!im||!sym)return;
  const hx=ox+J.hx,hy=oy+J.hy,mid=hy+20;
  x.fillStyle='#1a1430';x.fillRect(hx,hy,J.hw,J.hh);
  x.save();x.beginPath();x.rect(hx,hy,J.hw,J.hh);x.clip();
  const won=T.end&&T.end.m?T.end.m===3?[0,1,2].filter(i=>T.res[i]===0):[0,1,2]:[];
  T.reels.forEach((r,i)=>{const rx=hx+1+i*26,n=r.strip.length;
    x.fillStyle='#fff6df';x.fillRect(rx,hy,24,J.hh);x.fillStyle='#e9c88a';x.fillRect(rx,hy,1,J.hh);x.fillRect(rx+23,hy,1,J.hh);
    x.fillStyle='#e4544f';x.fillRect(rx,mid+9,24,1);   /* the pay line */
    const f=Math.floor(r.p),fast=Math.abs(r.v)>14;
    for(let j=f-2;j<=f+3;j++){const y=Math.round(mid+(r.p-j)*20)+2,im2=sym[r.strip[((j%n)+n)%n]];
      if(fast){x.globalAlpha=.3;x.drawImage(im2,rx+4,y-6);x.drawImage(im2,rx+4,y+6);x.globalAlpha=.75;}x.drawImage(im2,rx+4,y);x.globalAlpha=1;}
    if(won.includes(i)&&r.done&&((T.t-T.end.t)%.5)<.32){x.strokeStyle='#ffd25e';x.lineWidth=1;x.strokeRect(rx+1.5,mid+.5,21,19);x.strokeStyle='#d39b2a';x.strokeRect(rx+2.5,mid+1.5,19,17);}});
  if(!T.shade){T.shade=mk(J.hw,J.hh);const s=T.shade.getContext('2d');for(let yy=0;yy<J.hh;yy++){s.fillStyle=`rgba(26,20,48,${(Math.pow(Math.abs(yy+.5-J.hh/2)/(J.hh/2),2)*.62).toFixed(3)})`;s.fillRect(0,yy,J.hw,1);}}
  x.drawImage(T.shade,hx,hy);   /* the drums curve away at the top and the bottom */
  x.restore();
  /* the machine, its screen see-through */
  x.drawImage(im,ox,oy);
  if(T.flash>0){x.globalCompositeOperation='lighter';x.globalAlpha=Math.min(1,T.flash)*.5*(Math.sin(T.t*30)>0?1:.4);x.drawImage(im,ox,oy);x.globalAlpha=1;x.globalCompositeOperation='source-over';T.flash=Math.max(0,T.flash-dt*.5);}
  /* the LED window: your bet, then what happened, then the pay table running along */
  const lx=SLV.lx,ly=SLV.ly,lw=J.lw,blink=(T.t%1)<.6;
  if(LAND){const fx=lx-7,fy=ly-7,fw=lw+14,fh=J.lh+14;slotRR(x,fx,fy,fw,fh,'#1a0a14');slotRR(x,fx+1,fy+1,fw-2,fh-2,'#4a0f24');slotRR(x,fx+4,fy+4,fw-8,fh-8,'#e4544f');x.fillStyle='#ffd25e';x.fillRect(fx+5,fy+4,3,1);x.fillRect(fx+fw-8,fy+4,3,1);x.fillRect(fx+5,fy+fh-5,3,1);x.fillRect(fx+fw-8,fy+fh-5,3,1);x.fillStyle='#0b0612';x.fillRect(fx+5,fy+5,fw-10,fh-10);}   /* the LED panel in its own frame */
  const line=(s,y,c)=>{x.fillStyle=c;pxText(x,s,Math.round(lx+(lw-(s.length*4-1))/2),y);};
  const amt=slotAmt(),bs='BET '+amt;line(bs,ly+5,'#ffd25e');
  if(T.typing&&blink){x.fillStyle='#ffd25e';x.fillRect(Math.round(lx+(lw-(bs.length*4-1))/2)+bs.length*4,ly+9,3,1);}
  let s2,c2='#fff6cf';
  if(T.msg&&T.t<T.msg.until){s2=T.msg.s;c2=T.msg.c;}
  else if(T.busy)s2='GOOD LUCK';   /* a nice touch: stays (his call) */
  else if(T.end&&T.end.m){s2='WIN '+T.win;c2=blink?'#ffd25e':'#fff2a8';}
  else if(T.end&&T.t-T.end.t<2.5){s2='NO WIN';c2='#ff7a7a';}
  else if(coins<amt){s2='NEED '+amt;c2='#ff7a7a';}
  else{s2=blink?'PULL THE LEVER':'';}   /* how to start the game: stays (his rule) */
  if(s2)line(s2,ly+15,c2);
  const pay=SLOT_SYM.slice().reverse().map(s=>'3 '+s.n+' X'+s.p).join('   ')+'   2 CHERRIES X3   ',pw=pay.length*4;
  if(LAND){const ps=SLOT_SYM.slice().reverse().map(s=>'3 '+s.n+' X'+s.p).concat('2 CHERRIES X3').filter(q=>q.length*4-1<=lw-4),q=ps[Math.floor(T.t/1.8)%ps.length];x.fillStyle='#e4544f';pxText(x,q,Math.round(lx+(lw-(q.length*4-1))/2),ly+25);}   /* sideways (his catch, 24 Nov): one whole pay line at a time, never a line cut in half */
  else{x.save();x.beginPath();x.rect(lx+2,ly+24,lw-4,7);x.clip();x.fillStyle='#e4544f';const px0=lx+lw-Math.floor((T.t*14)%(pw+lw));pxText(x,pay,px0,ly+25);x.restore();}
  /* the lever: a chrome box bolted to the cabinet's side, the arm, the red knob (it swings toward you as it comes down) */
  const L=slotLever();
  slotRR(x,L.px-6,L.py-8,13,17,'#1a1430');slotRR(x,L.px-5,L.py-7,11,15,'#b8c2d4');x.fillStyle='#6f7b92';x.fillRect(L.px-5,L.py+4,11,3);x.fillRect(L.px+4,L.py-6,2,11);
  x.fillStyle='#ffffff';x.fillRect(L.px-4,L.py-6,4,1);x.fillRect(L.px-4,L.py-5,1,2);x.fillStyle='#1a1430';x.fillRect(L.px-3,L.py-3,1,1);x.fillRect(L.px+2,L.py-3,1,1);x.fillRect(L.px-3,L.py+2,1,1);x.fillRect(L.px+2,L.py+2,1,1);
  const ky=Math.round(L.ky),top=Math.min(ky,L.py),bot=Math.max(ky,L.py);x.fillStyle='#1a1430';x.fillRect(L.px-2,top,5,bot-top+1);x.fillStyle='#ffffff';x.fillRect(L.px-1,top,1,bot-top+1);x.fillStyle='#b8c2d4';x.fillRect(L.px,top,1,bot-top+1);x.fillStyle='#6f7b92';x.fillRect(L.px+1,top,1,bot-top+1);
  x.fillStyle='#1a1430';x.fillRect(L.px-3,L.py-2,7,5);x.fillStyle='#6f7b92';x.fillRect(L.px-2,L.py-1,5,3);x.fillStyle='#b8c2d4';x.fillRect(L.px-2,L.py-1,4,1);   /* the hub the arm turns on */
  const kr=5+Math.round(1.8*Math.sin(T.th));
  for(let yy=-kr-1;yy<=kr+1;yy++)for(let xx=-kr-1;xx<=kr+1;xx++){const d=Math.hypot(xx,yy);if(d>kr+.45)continue;x.fillStyle=d>kr-.6?'#1a1430':xx+yy<-kr*.6?'#ff9a8f':xx+yy>kr*.5?'#a92b2c':'#e4544f';x.fillRect(L.px+xx,ky+yy,1,1);}
  x.fillStyle='#ffffff';x.fillRect(L.px-Math.round(kr*.5),ky-Math.round(kr*.5),1,1);
  if(!T.busy&&T.th<.05&&!T.drag&&blink){const ay=ky+kr+3+Math.round(Math.sin(T.t*6));x.fillStyle='#1a1430';x.fillRect(L.px-3,ay-1,7,4);x.fillStyle='#ffd25e';x.fillRect(L.px-2,ay,5,1);x.fillRect(L.px-1,ay+1,3,1);x.fillRect(L.px,ay+2,1,1);}   /* a little arrow: pull me */
  /* the bet keys on the plinth */
  const kw=LAND?SLV.kw:Math.min(22,Math.floor((W-8-9)/4)),kt=4*kw+9,kx0=LAND?SLV.kx0:clamp(Math.round(ox+J.w/2-kt/2),2,W-2-kt),ky0=LAND?SLV.ky0:oy+227;T.keys=[];
  SLOT_KEYS.forEach(([v,lab],i)=>{const X=kx0+i*(kw+3),sel=!T.own&&T.stake===v,d=sel||T.press===v?2:0;T.keys.push({x:X,y:ky0,w:kw,h:16,a:v});
    if(T.busy)x.globalAlpha=.6;
    slotRR(x,X,ky0+d,kw,16-d,'#1a1430');slotRR(x,X+1,ky0+1+d,kw-2,10,sel?'#ffd25e':'#fff6df');x.fillStyle=sel?'#d39b2a':'#c9a46a';x.fillRect(X+1,ky0+11+d,kw-2,4-d);
    x.fillStyle=sel?'#fff2a8':'#ffffff';x.fillRect(X+2,ky0+1+d,kw-4,1);x.fillStyle='#1a1430';pxText(x,lab,Math.round(X+(kw-(lab.length*4-1))/2),ky0+4+d);x.globalAlpha=1;});
  /* coins flying out on a win */
  T.parts=T.parts.filter(p=>(p.t+=dt)<p.l);for(const p of T.parts){p.vy+=140*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;x.fillStyle=['#ffd25e','#fff2a8','#d39b2a'][p.c];x.fillRect(Math.round(p.x),Math.round(p.y),2,2);}}

/* ---- touch: the keys, the lever ---- */
function slotPt(e){const r=$('#slotCv').getBoundingClientRect();return{x:(e.clientX-r.left)/SLV.S,y:(e.clientY-r.top)/SLV.S};}
$('#slotCv').addEventListener('pointerdown',e=>{const T=SLOT,p=slotPt(e);
  const k=T.keys.find(k=>p.x>=k.x-1&&p.x<k.x+k.w+1&&p.y>=k.y-2&&p.y<k.y+k.h+2);
  if(k){if(T.busy)return;T.stake=k.a;T.own=0;$('#slotAmt').value='';$('#slotAmt').blur();T.press=k.a;T.msg=null;sfx('sl_key');return;}
  const L=slotLever();if(T.busy||T.auto)return;
  if(Math.hypot(p.x-L.kx,p.y-L.ky)<11||(Math.abs(p.x-L.px)<9&&p.y>L.ky-8&&p.y<L.py+L.len+8)){T.drag={y0:p.y,ky0:L.ky,moved:false};T.thv=0;try{$('#slotCv').setPointerCapture(e.pointerId);}catch(_){}}});
$('#slotCv').addEventListener('pointermove',e=>{const T=SLOT;if(!T.drag)return;const p=slotPt(e),L=slotLever(),dy=p.y-T.drag.y0;if(Math.abs(dy)>2)T.drag.moved=true;
  T.th=Math.acos(clamp((L.py-(T.drag.ky0+dy))/L.len,-1,1));if(T.th>2.55&&!T.busy)slotFire();});
const slotUp=()=>{const T=SLOT;T.press=null;if(!T.drag)return;const g=T.drag;T.drag=null;if(!g.moved&&T.th<.2)slotPull();};
$('#slotCv').addEventListener('pointerup',slotUp);$('#slotCv').addEventListener('pointercancel',slotUp);
$('#slotAmt').addEventListener('focus',()=>{if(SLOT.busy){$('#slotAmt').blur();return;}SLOT.typing=true;sfx('sl_key');});
$('#slotAmt').addEventListener('blur',()=>{SLOT.typing=false;});
$('#slotAmt').addEventListener('input',()=>{const v=Math.floor(+$('#slotAmt').value);SLOT.own=v>0?Math.min(v,1000000):0;SLOT.msg=null;});
$('#slotAmt').addEventListener('keydown',e=>{if(e.key==='Enter')$('#slotAmt').blur();});
addEventListener('keydown',e=>{if(e.code==='Space'&&$('#slotModal').classList.contains('on')&&document.activeElement!==$('#slotAmt')){e.preventDefault();slotPull();}});
$('#slotX').onclick=()=>{if(SLOT.busy){wlSay('Wait for the reels to stop.');return;}slotClose();};
function slotOpen(){document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));$('#slotModal').classList.add('on');paintCoins();sfx('cas_coin');
  SLOT.end=null;SLOT.msg=null;$('#slotWord').innerHTML='';SLOT.last=performance.now();cancelAnimationFrame(SLOT.raf);
  const loop=now=>{if(!$('#slotModal').classList.contains('on'))return;slotFrame(Math.min(.05,(now-SLOT.last)/1000));SLOT.last=now;SLOT.raf=requestAnimationFrame(loop);};SLOT.raf=requestAnimationFrame(loop);}
function slotClose(){$('#slotModal').classList.remove('on');cancelAnimationFrame(SLOT.raf);$('#slotAmt').blur();sfx('close');}

/* ================= KNIFE THROWING, IN THE TAVERN (18 Nov 2026) =================
   His picks: a skill score with a moving target, 5 knives (a 1 v 1 challenge comes later). Same principles as the casino games: full
   screen, up close, everything drawn here on one pixel grid, super simple. The Tavern's log wall and its orange and cream target (the
   colours are taken from the Tavern's own picture); the target slides along an iron rail. TAP ANYWHERE TO THROW. The knife flies up,
   smaller as it goes, and sticks. Bullseye 100, then 50, 25, 15, 10, the wooden rim 5; off the board it sticks in the wall (0); hit a
   knife that is already in the board and it clanks off (0). Each knife the board goes faster; from the third it bobs and turns round.
   Best score kept on this phone. No coins yet (my call: the 1 v 1 with bets comes later). */
const KN={ph:'ready',left:5,score:0,best:0,k:0,a:0,dir:1,t:0,fly:null,stuck:[],wall:[],falls:[],up:0,flipT:0,raf:0,last:0,end:0,newBest:false,wallC:null,wallK:'',tgt:null};
try{KN.best=+localStorage.getItem('m2_knife_best')||0;}catch(e){}
const KN_R=34,KN_SPD=[1.25,1.65,2.05,2.5,3.0],KN_RINGS=[[6.5,100],[12.5,50],[18.5,25],[24.5,15],[30.5,10],[34.5,5]];
const KNV={S:3,W:125,H:270,cx:62,ty:100,hy:220};
const KN_PAL={K:'#1a1430',W:'#ffffff',S:'#b8c2d4',s:'#6f7b92',G:'#ffd25e',g:'#d39b2a',O:'#c58a4a',o:'#7a4a2a'};
function knGrid(rows){const c=mk(rows[0].length,rows.length),x=c.getContext('2d');rows.forEach((r,y)=>[...r].forEach((ch,i)=>{if(ch!=='.'){x.fillStyle=KN_PAL[ch];x.fillRect(i,y,1,1);}}));return c;}
const KN_BIG=knGrid(['....K....','...KWK...','...KWK...','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','..KSWsK..','.KKKKKKK.','KGGGGGGgK','.KKKKKKK.','..KOOoK..','..KOOoK..','..KOOoK..','..KOOoK..','..KOOoK..','..KOOoK..','..KOOoK..','..KOOoK..','..KKKKK..','...KGK...','....K....']);   /* the one in your hand: bigger, it is close to you */
const KN_MID=knGrid(['..K..','.KWK.','.KWK.','.KWK.','.KWK.','.KWK.','.KWK.','KKKKK','KGGgK','KKKKK','.KOK.','.KOK.','.KOK.','.KGK.','..K..']);
const KN_SM=knGrid(['.W.','.S.','.S.','.S.','GGg','.O.','.O.','.o.']);
const KN_STUCK=knGrid(['...s...','.KKKKK.','KGGGGgK','.KKKKK.','..KOK..','..KOK..','..KoK..','..KGK..','...K...']);   /* in the board: the guard and the handle pointing at you */
const KN_LIE=knGrid(['.....KKK..........','KKKKKGGGKKKKKKKK..','KOOOKGGgKSSSSSSWWK','KoooKGgGKsssssSSK.','KKKKKgggKKKKKKKK..','.....KKK..........']);   /* a knife lying on the bench */
Object.assign(SFX,{
  kn_clank(){tone(1400,.06,{type:'square',vol:.06,to:900});tone(2100,.05,{type:'triangle',vol:.05,at:.03});hiss(.05,{vol:.05,bp:5000});},
  kn_thunk(){tone(120,.08,{type:'triangle',vol:.22,to:70});hiss(.04,{vol:.07,lp:700});},
  kn_wall(){tone(90,.08,{type:'triangle',vol:.16,to:60});hiss(.05,{vol:.06,lp:500});}});

document.querySelector('#slotModal').insertAdjacentHTML('afterend',`<div class="modal panel" id="knifeModal">
  <div class="mhead"><b>KNIVES</b><button class="btn" id="knifeX"><i data-ic="cross" data-c="solo"></i></button></div>
  <canvas id="knifeCv" width="125" height="270"></canvas><div id="knifeWord"></div></div>`);
document.querySelectorAll('#knifeModal [data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+(e.dataset.s||2));});
document.head.insertAdjacentHTML('beforeend',`<style>
#knifeModal{position:absolute;inset:0;z-index:30;padding:0;border:0!important;border-image:none!important;border-radius:0;box-shadow:none!important;background:#3f0f21;overflow:hidden}
#knifeModal.on{display:block}
#knifeModal .mhead{position:absolute;left:0;right:0;top:0;z-index:3;margin:0;padding:calc(10px + env(safe-area-inset-top)) 12px 8px;text-align:left}
#knifeModal .mhead b{color:#fff6cf!important;text-shadow:0 2px 0 #0f0b1e;font-size:24px;flex:1}
#knifeCv{position:absolute;left:0;top:0;image-rendering:pixelated;touch-action:none}
#knifeWord{position:absolute;left:0;right:0;pointer-events:none;z-index:2;text-align:center}
</style>`);

/* the log wall, made once per screen size */
function knWall(W,H){const k=W+'x'+H;if(KN.wallC&&KN.wallK===k)return KN.wallC;const c=mk(W,H),x=c.getContext('2d');
  const rows=['#3f0f21','#9d4a21','#914726','#873a23','#873a23','#7d3322','#7d3322','#7d3322','#60241f','#60241f','#581e20','#4b1328'];
  for(let y=0;y<H;y++){x.fillStyle=rows[y%12];x.fillRect(0,y,W,1);}
  let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  for(let L=0;L*12<H;L++){const y0=L*12;
    for(let i=0;i<W/6;i++){const gx=Math.floor(rnd()*W),gy=y0+3+Math.floor(rnd()*6),gl=2+Math.floor(rnd()*5);x.fillStyle=rnd()<.5?'#6a2a22':'#934526';x.fillRect(gx,gy,gl,1);}   /* the grain */
    const seam=Math.floor(rnd()*60)+(L%2?20:50);for(let sx=seam;sx<W;sx+=74+Math.floor(rnd()*30)){x.fillStyle='#3f0f21';x.fillRect(sx,y0+1,1,11);x.fillStyle='#a75321';x.fillRect(sx+1,y0+1,1,10);}}   /* where one log ends and the next begins */
  KN.wallC=c;KN.wallK=k;return c;}
/* the target: the Tavern's rings, lit from the top left, with a dark edge */
function knTarget(){if(KN.tgt)return KN.tgt;const R=KN_R,n=R*2+3,c=mk(n,n),x=c.getContext('2d'),o=R+1;
  const pal=[['#ffd27a','#f1c06d','#d99a4c'],['#c0402a','#9d2e1b','#6e1c12'],['#f6a050','#e88d38','#b5651d'],['#b25031','#9f492d','#733329']];
  for(let y=0;y<n;y++)for(let i=0;i<n;i++){const dx=i-o,dy=y-o,d=Math.hypot(dx,dy);if(d>R+.5)continue;
    if(d>R-.5){x.fillStyle='#2f0726';x.fillRect(i,y,1,1);continue;}
    const ring=d<=6.5?1:d<=12.5?0:d<=18.5?1:d<=24.5?0:d<=30.5?2:3,sh=(dx+dy)/R,v=sh<-.75?0:sh>.55?2:1;x.fillStyle=pal[ring][v];x.fillRect(i,y,1,1);}
  return KN.tgt=c;}

function knFit(){const M=$('#knifeModal'),cv=$('#knifeCv'),cw=M.clientWidth,ch=M.clientHeight;if(!cw||!ch)return false;
  const S=Math.max(2,Math.floor(landW(cw,ch)/112)),W=Math.ceil(cw/S),H=Math.ceil(ch/S);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}cv.style.width=W*S+'px';cv.style.height=H*S+'px';
  Object.assign(KNV,{S,W,H,cx:Math.floor(W/2),ty:Math.max(Math.ceil(64/S)+KN_R+12,Math.round(H*.38)),hy:H-22-Math.ceil(16/S)-44});
  $('#knifeWord').style.top=Math.max(84,(KNV.ty-KN_R-22)*S)+'px';return true;}
addEventListener('resize',()=>{if($('#knifeModal').classList.contains('on'))knFit();});
function knPos(){const{W,cx,ty}=KNV,A=Math.max(10,Math.min(W/2-KN_R-4,44));return{x:Math.round(cx+A*Math.sin(KN.a)),y:Math.round(ty+(KN.k>=2?Math.sin(KN.a*1.7)*(KN.k-1)*2.2:0))};}

function knThrow(){if(KN.ph==='done'){if(KN.t-KN.end<.6)return;knReset();return;}if(KN.ph!=='ready'||KN.up<1)return;KN.ph='fly';KN.fly={t:0};sfx('swish');}
function knReset(){Object.assign(KN,{ph:'ready',left:5,score:0,k:0,stuck:[],wall:[],falls:[],up:0,newBest:false,a:Math.random()*6.28,dir:Math.random()<.5?1:-1});$('#knifeWord').innerHTML='';}
function knLand(){const{cx,ty}=KNV,p=knPos(),dx=cx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);let pts=0,word='';
  if(d<=KN_R+.5&&KN.stuck.some(s=>Math.hypot(s.rx-dx,s.ry-dy)<4)){sfx('kn_clank');KN.falls.push({x:cx,y:ty,vx:(Math.random()<.5?-1:1)*(30+Math.random()*30),vy:-40,t:0,r:0});word='CLANK';}   /* hit a knife: it bounces off */
  else if(d<=KN_R+.5){const dl=d;pts=(KN_RINGS.find(r=>dl<=r[0])||[0,0])[1];   /* drunk luck: the rings count a touch wider */KN.stuck.push({rx:dx,ry:dy});sfx('kn_thunk');if(pts===100){sfx('rare');word='BULLSEYE';}}
  else{KN.wall.push({x:cx,y:ty});sfx('kn_wall');word='MISS';}
  KN.score+=pts;KN.left--;KN.k++;KN.ph=KN.left?'ready':'done';KN.up=0;
  const big=pts===100?'legendary':pts>=25?'good':'sub';
  if(KN.ph==='done'){KN.end=KN.t;brag('knife',{n:KN.score});if(KN.score>KN.best){KN.best=KN.score;KN.newBest=true;try{localStorage.setItem('m2_knife_best',String(KN.best));}catch(e){}}
    setTimeout(()=>{if(KN.ph!=='done')return;$('#knifeWord').innerHTML=pxWord(KN.newBest?'NEW BEST':'SCORE',5,KN.newBest?'legendary':'sub')+pxWord(String(KN.score),8,'good',.25);if(KN.newBest)sfx('cas_win');},450);}
  $('#knifeWord').innerHTML=word==='MISS'||word==='CLANK'?pxWord(word,5,'bad'):pxWord(word?word:'+'+pts,word?5:6,big)+(word?pxWord('+'+pts,5,'good',.2):'');}

function knFrame(dt){if(!knFit())return;const T=KN,{S,W,H,cx,ty,hy}=KNV,cv=$('#knifeCv'),x=cv.getContext('2d');T.t+=dt;x.imageSmoothingEnabled=false;
  /* the board moves, faster for each knife; from the fourth it turns round now and then */
  T.a+=T.dir*KN_SPD[Math.min(T.k,4)]*dt*(T.ph==='done'?.5:1);if(T.k>=3&&T.ph!=='done'){T.flipT-=dt;if(T.flipT<=0){T.flipT=.7+Math.random()*1.3;if(Math.random()<.5)T.dir*=-1;}}
  if(T.ph==='fly'){T.fly.t+=dt;if(T.fly.t>=.2)knLand();}
  T.up=Math.min(1,T.up+dt*4);
  x.drawImage(knWall(W,H),0,0);
  /* the iron rail the board slides on */
  x.fillStyle='#1a1430';x.fillRect(0,ty-2,W,5);x.fillStyle='#6f7b92';x.fillRect(0,ty-1,W,3);x.fillStyle='#b8c2d4';x.fillRect(0,ty-1,W,1);
  for(let bx=(cx%38)-19;bx<W;bx+=38){x.fillStyle='#1a1430';x.fillRect(bx-2,ty-4,5,9);x.fillStyle='#6f7b92';x.fillRect(bx-1,ty-3,3,7);x.fillStyle='#b8c2d4';x.fillRect(bx-1,ty-3,1,1);}
  for(const k of T.wall)x.drawImage(KN_STUCK,k.x-3,k.y);   /* the misses, stuck in the wall */
  const p=knPos(),tg=knTarget();x.globalAlpha=.45;x.fillStyle='#1b0614';for(let yy=0;yy<tg.height;yy++){const dd=Math.abs(yy-KN_R-1),hw=Math.floor(Math.sqrt(Math.max(0,(KN_R+.5)**2-dd*dd)));x.fillRect(p.x-hw+2,p.y-KN_R-1+yy+3,hw*2+1,1);}x.globalAlpha=1;   /* its shadow on the wall */
  x.drawImage(tg,p.x-KN_R-1,p.y-KN_R-1);
  for(const s of T.stuck)x.drawImage(KN_STUCK,p.x+s.rx-3,p.y+s.ry);   /* knives in the board ride with it */
  /* the aim: a tiny gold mark where every knife goes */
  if(T.ph==='ready'){x.fillStyle='#ffd25e';x.fillRect(cx-3,ty,2,1);x.fillRect(cx+2,ty,2,1);x.fillRect(cx,ty-3,1,2);x.fillRect(cx,ty+2,1,2);}
  /* knives bouncing off */
  T.falls=T.falls.filter(f=>(f.t+=dt)<1.4);for(const f of T.falls){f.vy+=260*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.r+=dt*14;x.save();x.translate(Math.round(f.x),Math.round(f.y));x.rotate(Math.round(f.r/(Math.PI/4))*Math.PI/4);x.drawImage(KN_MID,-2,-7);x.restore();}
  /* the bench at the bottom, with the knives still to throw */
  const by=H-22-Math.ceil(16/S);x.fillStyle='#1a1430';x.fillRect(0,by-1,W,H-by+1);x.fillStyle='#c58a4a';x.fillRect(0,by,W,3);x.fillStyle='#a75321';x.fillRect(0,by+3,W,H-by);x.fillStyle='#7a4a2a';for(let i=0;i<W;i+=23)x.fillRect(i,by+3,1,H-by);
  for(let i=0;i<T.left-(T.ph==='ready'||T.ph==='fly'?1:0);i++)x.drawImage(KN_LIE,Math.round(cx-(4*18+9)/2)+i*21,by+8);
  /* the knife in your hand, then in the air */
  if(T.ph==='ready'){const yy=Math.round(hy+(1-T.up)*30);x.drawImage(KN_BIG,cx-4,yy);}
  else if(T.ph==='fly'){const k=Math.min(1,T.fly.t/.2),yy=Math.round(hy+(ty-hy)*k),im=k<.4?KN_BIG:k<.75?KN_MID:KN_SM;x.drawImage(im,cx-Math.floor(im.width/2),yy);}
  /* the score */
  const tx=(s,y,c)=>{const w=s.length*4-1,x0=Math.round((W-w)/2);x.fillStyle='#1a1430';for(const[ox,oy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1]])pxText(x,s,x0+ox,y+oy);x.fillStyle=c;pxText(x,s,x0,y);};
  const top=Math.ceil(60/S);tx('SCORE '+T.score+'   BEST '+T.best,top,'#fff6cf');
  const blink=(T.t%1)<.65;
  if(T.ph==='ready'&&T.k===0&&blink)tx('TAP TO THROW',hy-10,'#ffd25e');   /* how to start / play again: stays (his rule) */
  if(T.ph==='done'&&T.t-T.end>.9&&blink)tx('TAP TO PLAY AGAIN',hy+6,'#ffd25e');}

$('#knifeCv').addEventListener('pointerdown',e=>{e.preventDefault();knThrow();});
addEventListener('keydown',e=>{if(e.code==='Space'&&$('#knifeModal').classList.contains('on')){e.preventDefault();knThrow();}});
$('#knifeX').onclick=()=>{if(KN.ph==='fly')return;knClose();};
function knifeOpen(){document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));$('#knifeModal').classList.add('on');sfx('cas_chips');knReset();
  KN.last=performance.now();cancelAnimationFrame(KN.raf);const loop=now=>{if(!$('#knifeModal').classList.contains('on'))return;knFrame(Math.min(.05,(now-KN.last)/1000));KN.last=now;KN.raf=requestAnimationFrame(loop);};KN.raf=requestAnimationFrame(loop);}
function knClose(){$('#knifeModal').classList.remove('on');cancelAnimationFrame(KN.raf);sfx('close');}

/* ================= DRUNK AT THE GAMES (his ask, 18 Nov) =================
   Had a few at the Tavern? The games sway and double the same way the room does, and the luck tips your way a little (not by much):
   luck goes 0 -> 1 from the third beer to about the sixth.
   Coin flip 50% -> 53%; slots: a losing spin rolls again up to 8% of the time; Blackjack: a card that would bust you is swapped up to
   25% of the time; knives: the rings count up to 6% wider. */
function drunkLuck(){return typeof drunkL==='function'?Math.min(1,drunkL()/4):0;}
const DRUNK_GAMES={bjModal:['#bjStage','#bjCv'],slotModal:['#slotCv','#slotCv'],knifeModal:['#knifeCv','#knifeCv'],flipModal:['#flipMach','#flipMach','#flipStage']};   /* [the main picture to double, what sways...] */
function drunkGames(){requestAnimationFrame(drunkGames);const L=typeof drunkL==='function'?drunkL():0,q=performance.now()/1000;
  for(const id in DRUNK_GAMES){const M=document.getElementById(id);if(!M)continue;const[srcSel,...sway]=DRUNK_GAMES[id],src=M.querySelector(srcSel.replace('#bjStage','#bjCv'));let g=M.querySelector('canvas.drunkGhost');
    const on=L>0&&M.classList.contains('on')&&src&&src.width;
    if(!on){if(g)g.style.display='none';for(const s of sway){const e=M.querySelector(s);if(e&&e.dataset.dk){e.style.transform='';delete e.dataset.dk;}}continue;}
    const S=Math.max(1,Math.round(parseFloat(src.style.width||src.clientWidth)/src.width))||1,A=.6+L*.35;   /* gentler than the room (his note): you can still play */
    const tx=Math.round(Math.sin(q*1.1)*A)*S,ty=Math.round(Math.sin(q*.83)*A*.45)*S;
    for(const s of new Set(sway)){const e=M.querySelector(s);if(e){e.style.transform=`translate(${tx}px,${ty}px)`;e.dataset.dk=1;}}
    if(!g){g=document.createElement('canvas');g.className='drunkGhost';src.parentNode.insertBefore(g,src.nextSibling);}
    if(g.parentNode!==src.parentNode)src.parentNode.insertBefore(g,src.nextSibling);
    if(g.width!==src.width||g.height!==src.height){g.width=src.width;g.height=src.height;}
    const cs=getComputedStyle(src);g.style.cssText=`display:block;position:absolute;left:${src.offsetLeft}px;top:${src.offsetTop}px;width:${src.offsetWidth}px;height:${src.offsetHeight}px;image-rendering:pixelated;pointer-events:none;z-index:${(parseInt(cs.zIndex)||0)+1};opacity:${Math.min(.32,.18+.035*L)}`;
    const gx=g.getContext('2d');gx.imageSmoothingEnabled=false;gx.clearRect(0,0,g.width,g.height);gx.drawImage(src,0,0);
    g.style.transform=`translate(${tx+Math.round(Math.sin(q*.9+1)*(1+L*.45)+1+L*.4)*S}px,${ty+Math.round(Math.cos(q*.7)*(.5+L*.2))*S}px)`;}}
requestAnimationFrame(drunkGames);
