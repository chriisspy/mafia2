/* ================= FISHING (17 Nov 2026): the first mini game =================
   Where: the jetty on the lake, on the right of the town. Walk to its end (or tap it) and you are at THE LAKE: its own
   place (HALLS[2], loc LAKE = 102, so walking, the door and the other players all work like the Tavern and the Casino).
   Walk to the end of that jetty, or tap the water, and you are fishing.
   How it plays:
     1. CAST   hold on the water: a ring runs out across the lake and back; let go and the float lands on the ring.
               Slide left and right while you hold to aim. Further out = rarer fish. Fish are shadows you can see.
     2. WAIT   a shadow swims over, nibbles (the float twitches), then BITES (the float goes under, a "!" pops up).
     3. HOOK   tap in time, or it gets away.
     4. REEL   hold to pull it in, let go when the bar turns red (the line snaps at the top). Big fish pull in bursts.
   Bait: 6 casts, back every 20 minutes (the same clock as the solo coin flips). Every catch pays coins; rarer and
   bigger pays more. The fish book keeps what you have caught and your biggest of each.
   ART (his call: PixelLab for the animations and effects): fish, splash, Beanie's cast and pull, and the lake's ripple
   are PixelLab's (tools/make_fishing_art.py packs them); the lake picture is Nano Banana's from his town as the
   reference (tools/make_fishing.py). Other outfits have no rod animation yet: they hold a rod drawn here.
   The numbers (bait, odds, coins) are first guesses for him to tune: FISH_BAIT, FISH_ODDS, FISHES. */
/* THE RODS (his call, 17 Nov: "the standard rod shouldnt be so easy"; better ones are bought from Fisherman Joe).
   ten = how fast the line tightens (lower is kinder), reel = how fast it comes in, win = how long you get to hook a bite,
   luck = how far the odds lean to the rarer fish, range = how far it casts (only the Steel and Golden rods reach the deep water). */
const RODS=[
  {id:'twig',name:'Twig Rod',price:0,ten:1.45,reel:.85,win:.7,luck:0,range:.55,blurb:'Free. Short casts. The line snaps easily.'},
  {id:'oak',name:'Oak Rod',price:400,ten:1.15,reel:1,win:.9,luck:1,range:.72,blurb:'Casts further. A stronger line and better fish.'},
  {id:'steel',name:'Steel Rod',price:2000,ten:.92,reel:1.25,win:1.05,luck:2,range:.88,blurb:'Reaches the deep water. Reels fast.'},
  {id:'gold',name:'Golden Rod',price:7500,ten:.72,reel:1.5,win:1.25,luck:3.5,range:1,blurb:'The best there is. Rare fish love it.'}];
/* what you carry: your rods, your bait and the fish you have not sold yet (each: fish, cm, coins). Kept on the phone. */
const KIT={rod:'twig',rods:['twig'],bait:10,bag:[]};
try{Object.assign(KIT,JSON.parse(localStorage.getItem('m2_fishkit')||'{}'));}catch(e){}
function kitSave(){try{localStorage.setItem('m2_fishkit',JSON.stringify(KIT));}catch(e){}}
const fishRod=()=>RODS.find(r=>r.id===KIT.rod)||RODS[0];
const FISH_BAG=12,BAIT_PACK=10,BAIT_PRICE=30;   /* the bag holds 12 fish; Joe sells 10 bait for 30 coins */
/* sheet cell, name, rarity, shortest and longest (cm), coins for a middling one, how hard it pulls, seconds to hook it, shadow size */
const FISHES=[
  {id:'boot',name:'Old Boot',rar:'junk',min:28,max:28,val:2,str:0,win:1.2,s:1},
  {id:'can',name:'Tin Can',rar:'junk',min:12,max:12,val:2,str:0,win:1.2,s:0},
  {id:'minnow',name:'Minnow',rar:'common',min:5,max:12,val:5,str:.35,win:1,s:0},
  {id:'perch',name:'Perch',rar:'common',min:15,max:32,val:8,str:.5,win:1,s:0},
  {id:'carp',name:'Carp',rar:'common',min:30,max:62,val:10,str:.6,win:1,s:1},
  {id:'sunfish',name:'Sunfish',rar:'common',min:10,max:24,val:9,str:.45,win:1,s:0},
  {id:'trout',name:'Rainbow Trout',rar:'rare',min:30,max:66,val:26,str:.8,win:.85,s:1},
  {id:'pike',name:'Pike',rar:'rare',min:50,max:112,val:34,str:.95,win:.85,s:2},
  {id:'catfish',name:'Catfish',rar:'rare',min:60,max:130,val:32,str:.9,win:.85,s:2},
  {id:'koi',name:'Koi',rar:'epic',min:40,max:82,val:90,str:1.15,win:.7,s:1},
  {id:'eel',name:'Baby Ice Whale',rar:'epic',min:90,max:160,val:110,str:1.25,win:.7,s:2},
  {id:'gold',name:'Golden Fish',rar:'legendary',min:20,max:40,val:320,str:1.45,win:.55,s:1},
  {id:'cod',name:'The Codfather',rar:'legendary',min:70,max:120,val:420,str:1.6,win:.55,s:2}];
/* how likely each rarity is, by how far out the shadow lives: near the jetty, the middle, the far side */
const FISH_ODDS=[{common:82,rare:17,epic:1,legendary:0},{common:64,rare:28,epic:7,legendary:1},{common:50,rare:32,epic:15,legendary:3}];
const FISH_RC={junk:'#9a8f86',common:'#7bc96f',rare:'#6fb5ff',epic:'#c58bff',legendary:'#ffcf4a'};
Object.assign(FISH,{ph:'idle',t:0,held:false,press:false,px:140,pow:0,pdir:1,tg:null,bob:null,shad:[],rip:[],spl:[],cand:null,hook:null,d:1,ten:0,burst:0,nextB:2,
  cx:140,cy:300,rods:{},spawnT:0,dip:0,reelT:0,warnT:0,land:null,mask:null,log:{},fr:0});
try{FISH.log=JSON.parse(localStorage.getItem('m2_fish')||'{}')||{};}catch(e){}
TUNES.lake={bpm:84,step:.5,vol:.34,leadType:'triangle',   /* a slow, sunny farm tune */
  lead:SEQ('G4 - B4 - D5 - B4 -  E5 - D5 - B4 - - -  C5 - E5 - G5 - E5 -  D5 - - - B4 - - -  G4 - B4 - D5 - G5 -  F#5 - E5 - D5 - - -  C5 - B4 - A4 - F#4 -  G4 - - - - - - -'),
  bass:SEQ('G2 - D3 - G2 - D3 -  E2 - B2 - E2 - B2 -  C3 - G3 - C3 - G3 -  D3 - A3 - D3 - A3 -  G2 - D3 - G2 - D3 -  B2 - F#3 - B2 - F#3 -  C3 - G3 - D3 - A3 -  G2 - D3 - G2 - - -'),
  drum:SEQ('- - h - - - h -')};
Object.assign(SFX,{
  fish_cast(){hiss(.2,{vol:.11,bp:2400});tone(650,.18,{type:'sine',vol:.05,to:1500});},
  fish_plop(){tone(520,.1,{type:'sine',vol:.15,to:170});hiss(.09,{vol:.06,lp:1800,at:.03});},
  fish_nib(){tone(880,.04,{type:'triangle',vol:.07});},
  fish_bite(){tone(988,.07,{vol:.12});tone(1319,.07,{vol:.12,at:.08});tone(1760,.13,{vol:.12,at:.16});},
  fish_hook(){tone(300,.09,{type:'triangle',vol:.2,to:620});hiss(.14,{vol:.1,lp:2500});},
  fish_reel(){tone(1150+Math.random()*250,.014,{type:'square',vol:.028});},
  fish_warn(){tone(1480,.05,{type:'square',vol:.05});},
  fish_snap(){tone(900,.06,{type:'square',vol:.13,to:190});hiss(.1,{vol:.12,hp:3000});},
  fish_splash(){hiss(.26,{vol:.12,bp:1500});hiss(.12,{vol:.07,lp:900,at:.05});},
  fish_up(){[523,659,784].forEach((f,i)=>tone(f,.09,{type:'triangle',vol:.11,at:i*.07}));}});

/* ---- bait and the fish book ---- */
function fishBait(){return LAB?99:KIT.bait;}   /* the lab never runs out (his call) */
function fishUseBait(n){if(LAB)return;KIT.bait=Math.max(0,KIT.bait-n);kitSave();}
function fishSaveLog(){try{localStorage.setItem('m2_fish',JSON.stringify(FISH.log));}catch(e){}}
function fishPic(c,i,k,dark){const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);x.drawImage(IMG['fish/sheet'],i*48,0,48,32,0,0,48*k,32*k);
  if(dark){x.globalCompositeOperation='source-in';x.fillStyle='#2a2346';x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';}}

/* ---- the water ---- */
function fishMask(){if(FISH.mask)return FISH.mask;const im=IMG['fish/mask'],c=mk(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,im.width,im.height).data;
  FISH.mw=im.width;FISH.mh=im.height;FISH.mask=new Uint8Array(im.width*im.height);for(let i=0;i<FISH.mask.length;i++)FISH.mask[i]=d[i*4]>127?1:0;return FISH.mask;}
function fishWet(x,y){const M=fishMask(),xi=Math.round(x),yi=Math.round(y);return xi>=0&&yi>=0&&xi<FISH.mw&&yi<FISH.mh&&!!M[yi*FISH.mw+xi];}
function fishSpot(nearX,nearY,r){for(let k=0;k<60;k++){const x=nearX!=null?nearX+(Math.random()*2-1)*r:30+Math.random()*220,y=nearY!=null?nearY+(Math.random()*2-1)*r:100+Math.random()*300;
    if(fishWet(x,y)&&fishWet(x-9,y)&&fishWet(x+9,y)&&fishWet(x,y-9)&&fishWet(x,y+9))return[x,y];}return null;}
const FISH_ME=[140,331];   /* where you stand to fish: the end of the jetty */
function fishRoll(y){const d=FISH_ME[1]-y,z=d<95?0:d<175?1:2,L=fishRod().luck,B=FISH_ODDS[z],O={common:B.common-7*L,rare:B.rare+3.5*L,epic:B.epic+2.5*L,legendary:B.legendary+L};let r=Math.random()*100,rar='common';for(const k of['legendary','epic','rare','common']){if(r<O[k]){rar=k;break;}r-=O[k];}
  const pool=FISHES.map((f,i)=>i).filter(i=>FISHES[i].rar===rar);return pool[Math.floor(Math.random()*pool.length)];}
function fishSpawn(){const F=FISH,p=fishSpot();if(!p)return;if(F.bob&&Math.hypot(p[0]-F.bob.x,p[1]-F.bob.y)<50)return;const kind=fishRoll(p[1]);
  F.shad.push({x:p[0],y:p[1],hx:p[0],hy:p[1],tx:p[0],ty:p[1],a:Math.random()*6.28,kind,s:FISHES[kind].s,st:'swim',t:Math.random()*3,sp:7+Math.random()*7,wig:Math.random()*9,born:0});}

/* ---- little pictures made once: fish shadows and ripple rings (solid chunky pixels) ---- */
const FSH={};
function fishShadow(s,ang,wig){const q=Math.round(ang/(Math.PI/8))&15,k=s+'|'+q+'|'+wig;if(FSH[k])return FSH[k];const L=[8,11,15][s],B=[2.1,2.9,3.9][s],R=Math.ceil(L/2)+5,c=mk(R*2+1,R*2+1),x=c.getContext('2d'),a=q*Math.PI/8,ca=Math.cos(a),sa=Math.sin(a);x.fillStyle='#14296a';
  for(let py=-R;py<=R;py++)for(let px=-R;px<=R;px++){const u=px*ca+py*sa,v=-px*sa+py*ca,body=(u*u)/((L/2)*(L/2))+(v*v)/(B*B)<=1,tu=-L/2-u,tail=tu>-1.5&&tu<4&&Math.abs(v-(wig?1:-1)*tu*.35)<=.6+tu*.75;if(body||tail)x.fillRect(px+R,py+R,1,1);}
  return FSH[k]=c;}
const FRG={};
function fishRing(r,dot,col){const k=r+'|'+dot+'|'+col;if(FRG[k])return FRG[k];const c=mk(r*2+3,r*2+3),x=c.getContext('2d');x.fillStyle=col;
  for(let py=-r-1;py<=r+1;py++)for(let px=-r-1;px<=r+1;px++){if(Math.abs(Math.hypot(px,py*1.6)-r)<.62&&(!dot||((px+py)&1)))x.fillRect(px+r+1,py+r+1,1,1);}return FRG[k]=c;}
function fishRipple(x,y,max,life){FISH.rip.push({x,y,t:0,life:life||.9,max:max||9});}
function fishSplash(x,y){FISH.spl.push({x,y,t:0});sfx('fish_splash');}
function fishLine(x0,y0,x1,y1,col,sag){lx.fillStyle=col;const n=Math.max(2,Math.ceil(Math.hypot(x1-x0,y1-y0)));let qx=null,qy=null;
  for(let i=0;i<=n;i++){const k=i/n,x=Math.round(x0+(x1-x0)*k),y=Math.round(y0+(y1-y0)*k+Math.sin(k*Math.PI)*(sag||0));if(x!==qx||y!==qy){lx.fillRect(x,y,1,1);qx=x;qy=y;}}}

/* ---- starting and stopping ---- */
function fishSay(a,b){$('#fishLine').textContent=a;const left=fishBait();$('#fishSub').textContent=b||((left?'Bait: '+(LAB?'unlimited':left):'No bait. Fisherman Joe sells it.')+' · Bag: '+KIT.bag.length+' of '+FISH_BAG);}
function fishPh(p){const F=FISH;F.ph=p;F.t=0;
  if(p==='idle')fishSay(fishBait()?'Hold on the water to cast':'Out of bait');
  else if(p==='charge')fishSay('Let go to cast','Slide left or right to aim. Further out, rarer fish.');
  else if(p==='fly'||p==='wait')fishSay('Wait for a bite...','Tap to pull the line back in.');
  else if(p==='bite')fishSay('TAP NOW!','It is on the hook!');
  else if(p==='fight')fishSay('Hold to reel it in','Let go when the bar turns red.');}
function fishStart(){const F=FISH,m=WL.me;if(F.on||!m||m.loc!==LAKE)return;F.on=true;F.held=false;F.press=false;F.bob=null;F.cand=null;F.hook=null;F.land=null;m.x=FISH_ME[0];m.y=FISH_ME[1];m.dir='back';m.walk=false;m.path=[];
  $('#townHud').classList.add('fishing');paintCoins();fishPh('idle');sfx('open');netMove();}
function fishStop(){const F=FISH;if(!F.on)return;F.on=false;F.held=false;F.bob=null;F.hook=null;F.land=null;if(F.cand){F.cand.st='swim';F.cand=null;}
  $('#townHud').classList.remove('fishing');$('#fishModal').classList.remove('on');$('#fishBookModal').classList.remove('on');}
function fishLose(msg){const F=FISH;if(F.cand){F.cand.st='flee';F.cand.t=0;F.cand=null;}if(F.hook){F.hook.st='flee';F.hook.t=0;F.hook=null;}F.bob=null;wlSay(msg,'bad');fishPh('idle');}

/* ---- taps ---- */
function fishTap(e,m,x,y){const F=FISH;
  if(F.on){if(F.ph!=='card'&&F.ph!=='land'){F.held=true;F.press=true;F.px=x;}return true;}
  if(fishWet(x,y)||y<316){wlGo(m,FISH_ME[0],FISH_ME[1],()=>{m.dir='back';fishStart();});return true;}
  return false;}
addEventListener('pointerup',()=>{FISH.held=false;});addEventListener('pointercancel',()=>{FISH.held=false;});
cv.addEventListener('pointermove',e=>{if(FISH.on&&FISH.held)FISH.px=wxy(e)[0];});
addEventListener('keydown',e=>{if(e.code==='Space'&&FISH.on&&!e.repeat&&!document.querySelector('.modal.on')){FISH.held=true;FISH.press=true;e.preventDefault();}});
addEventListener('keyup',e=>{if(e.code==='Space')FISH.held=false;});

/* ---- one step of the game ---- */
function fishTip(m){const F=FISH,c=fishCell(),B=c!=null&&F.rods[looksLike(0)];if(B)return[m.x+B[c][0],m.y+B[c][1]];
  if(F.ph==='charge')return[m.x+11-22*F.pow,m.y-34+5*F.pow];if(F.ph==='fight'&&F.held)return[m.x-7+Math.round(Math.sin(F.fr*.02)*1),m.y-37];return[m.x+11,m.y-34];}
/* which of this outfit's 9 fishing pictures to show (PixelLab's cast: 0 standing with the rod, 1-6 the swing back, 7-8 the throw; 8 = holding the line out).
   null = no pictures for this outfit (yet): it gets a rod drawn here. */
function fishCell(){const F=FISH,n=looksLike(0);if(!F.rods[n]||!IMG['rod/'+n])return null;
  if(F.ph==='charge')return 1+Math.min(5,Math.floor(F.pow*6));if(F.ph==='fly')return F.t<.25?7:8;
  if(F.ph==='fight')return F.held?7+(Math.floor(F.fr/150)%2):8;if(F.ph==='idle'||F.ph==='card')return 0;return 8;}
function fishTick(dt,t,m){const F=FISH;F.fr=t;F.t+=dt;F.dip=Math.max(0,F.dip-dt*5);
  /* the fish: always swimming, whether you are fishing or just standing there */
  F.spawnT-=dt;if(F.shad.length<6&&F.spawnT<=0){fishSpawn();F.spawnT=F.shad.length<4?.2:2.5;}
  for(const s of F.shad){s.t+=dt;s.wig+=dt*(s.st==='swim'?5:11);s.born=Math.min(1,s.born+dt*1.5);let sp=s.sp;
    if(s.st==='swim'){if(s.t>3||Math.hypot(s.tx-s.x,s.ty-s.y)<3){const p=fishSpot(s.hx,s.hy,60);if(p){s.tx=p[0];s.ty=p[1];}s.t=0;}}
    else if(s.st==='come'){s.tx=F.bob?F.bob.x:s.x;s.ty=F.bob?F.bob.y+3:s.y;sp=24;}
    else if(s.st==='flee'){sp=70;if(s.t>1.1)s.gone=true;}
    else if(s.st==='nib'||s.st==='hook'){sp=0;}
    const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy);
    if(s.st==='flee'){s.x+=Math.cos(s.a)*sp*dt;s.y+=Math.sin(s.a)*sp*dt;if(!fishWet(s.x,s.y))s.gone=true;}
    else if(d>1&&sp){const want=Math.atan2(dy,dx);let da=want-s.a;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;s.a+=clamp(da,-dt*4,dt*4);const nx=s.x+Math.cos(s.a)*sp*dt,ny=s.y+Math.sin(s.a)*sp*dt;if(fishWet(nx,ny)||s.st==='come'){s.x=nx;s.y=ny;}else s.t=9;}}
  F.shad=F.shad.filter(s=>!s.gone);
  for(const r of F.rip)r.t+=dt;F.rip=F.rip.filter(r=>r.t<r.life);for(const s of F.spl)s.t+=dt;F.spl=F.spl.filter(s=>s.t<.5);
  if(!F.on)return;const press=F.press;F.press=false;
  if(F.ph==='idle'){if(press){if(!fishBait()){wlSay('No bait left. Fisherman Joe sells it.','bad');F.held=false;}else if(KIT.bag.length>=FISH_BAG){wlSay('Your bag is full. Sell your fish to Fisherman Joe.','bad');F.held=false;}else{F.pow=0;F.pdir=1;fishPh('charge');}}}
  else if(F.ph==='charge'){F.pow+=F.pdir*dt*.85;if(F.pow>=1){F.pow=1;F.pdir=-1;}if(F.pow<=0){F.pow=0;F.pdir=1;}
    const ang=clamp((F.px-m.x)/95,-.62,.62);let R=38+F.pow*190*fishRod().range,tx,ty;for(;;){tx=m.x+Math.sin(ang)*R;ty=m.y-12-Math.cos(ang)*R;if(fishWet(tx,ty)||R<24)break;R-=4;}F.tg=[tx,ty];
    if(!F.held){if(F.pow<.06||!fishWet(tx,ty)){fishPh('idle');}else{fishUseBait(1);const tip=fishTip(m);F.bob={x:tip[0],y:tip[1],x0:tip[0],y0:tip[1],x1:tx,y1:ty,z:0,lx:tx,ly:ty};sfx('fish_cast');fishPh('fly');}}}
  else if(F.ph==='fly'){const k=Math.min(1,F.t/.55),B=F.bob;B.x=lerp(B.x0,B.x1,k);B.y=lerp(B.y0,B.y1,k);B.z=Math.sin(k*Math.PI)*34;
    if(k>=1){B.z=0;sfx('fish_plop');fishRipple(B.x,B.y,9,.8);fishRipple(B.x,B.y,5,.5);F.dip=1;F.lure=1+Math.random()*2.4;F.cand=null;
      for(const s of F.shad)if(s.st==='swim'&&Math.hypot(s.x-B.x,s.y-B.y)<11){s.st='flee';s.t=0;s.a=Math.atan2(s.y-B.y,s.x-B.x);}   /* land it ON a fish and it bolts */
      fishPh('wait');}}
  else if(F.ph==='wait'){const B=F.bob;
    if(press){if(F.cand&&F.cand.st==='nib'){fishLose('You pulled too early. It swam off.');}else{if(F.cand){F.cand.st='swim';F.cand=null;}F.bob=null;fishUseBait(-1);fishPh('idle');}return;}   /* nothing was on it yet: the bait comes back */
    if(!F.cand&&F.t>F.lure){let best=null,bd=1e9;for(const s of F.shad){if(s.st!=='swim')continue;const d=Math.hypot(s.x-B.x,s.y-B.y);if(d<bd){bd=d;best=s;}}
      if(best&&(bd<95||F.t>F.lure+2.5)){best.st='come';F.cand=best;}}
    const c=F.cand;if(c&&c.st==='come'&&Math.hypot(c.x-B.x,c.y-(B.y+3))<4){c.st='nib';c.nibs=Math.floor(Math.random()*3);c.nt=.5+Math.random()*.6;c.a=-Math.PI/2;}
    if(c&&c.st==='nib'){c.nt-=dt;if(c.nt<=0){if(c.nibs-->0){F.dip=.6;sfx('fish_nib');fishRipple(B.x,B.y,5,.5);c.nt=.55+Math.random()*.7;}
        else{if(Math.random()<.12)c.kind=Math.floor(Math.random()*2);   /* now and then it is not a fish at all */F.dip=2.2;sfx('fish_bite');fishSplash(B.x,B.y);fishRipple(B.x,B.y,10,.7);try{navigator.vibrate&&navigator.vibrate(60);}catch(e){}fishPh('bite');}}}}
  else if(F.ph==='bite'){const c=F.cand,K=FISHES[c.kind];F.dip=Math.max(F.dip,1.2);
    if(press){c.st='hook';F.hook=c;F.cand=null;F.d=1;F.ten=.25;F.burst=0;F.nextB=1.2+Math.random()*1.5;F.bob.lx=F.bob.x;F.bob.ly=F.bob.y;sfx('fish_hook');fishPh('fight');}
    else if(F.t>K.win*fishRod().win)fishLose('Too slow. It got away.');}
  else if(F.ph==='fight'){const s=F.hook,K=FISHES[s.kind],B=F.bob,RD=fishRod();
    F.nextB-=dt;if(F.burst>0)F.burst-=dt;else if(F.nextB<=0&&K.str>0){F.burst=.6+Math.random()*.7;F.nextB=F.burst+(1.3+Math.random()*2.2/K.str)/RD.ten;fishSplash(s.x,s.y);}
    const pull=K.str*Math.max(.4,1-F.t/45)*(F.burst>0?1.5:.35);   /* it tires as the fight goes on, so no tug of war lasts for ever */
    if(F.held){F.d-=dt*(F.burst>0?.09:.34)*RD.reel/(1+K.str*.25);F.ten+=dt*(.5+pull*.75)*RD.ten;F.reelT-=dt;if(F.reelT<=0){sfx('fish_reel');F.reelT=.07;}}
    else{F.ten-=dt*.95;F.d+=dt*pull*.085*RD.ten;}
    F.ten=Math.max(0,F.ten);F.warnT-=dt;if(F.ten>.8&&F.warnT<=0){sfx('fish_warn');F.warnT=.16;}
    const ex=m.x,ey=m.y-30,k=clamp(F.d,0,1.3),side=Math.sin(t*.004+s.wig*.2)*(8+14*K.str)*Math.min(1,k*1.5)*(F.burst>0?1.5:1);
    const nx=lerp(ex,B.lx,k)+side,ny=lerp(ey,B.ly,k);s.a=Math.atan2(ny-s.y,nx-s.x)+(F.held?Math.PI:0);s.x=nx;s.y=ny;if(Math.random()<dt*5)fishRipple(s.x,s.y,6,.5);
    if(F.ten>=1){sfx('fish_snap');F.hook=null;s.st='flee';s.t=0;s.a=-Math.PI/2;F.bob=null;wlSay('The line snapped!','bad');fishPh('idle');}
    else if(F.d>=1.3){fishLose('It got away.');}
    else if(F.d<=0){s.gone=true;F.hook=null;fishSplash(s.x,s.y);sfx('fish_up');F.land={kind:s.kind,x0:s.x,y0:s.y,t:0};F.bob=null;F.ph='land';F.t=0;}}
  else if(F.ph==='land'){F.land.t+=dt;if(F.land.t>=.6){const k=F.land.kind;F.land=null;F.ph='card';fishCard(k);}}
}
/* ---- what you caught ---- */
function fishCard(i){const F=FISH,K=FISHES[i],pct=Math.random(),cm=Math.round(lerp(K.min,K.max,pct*pct*.6+pct*.4)),gain=K.rar==='junk'?K.val:Math.max(1,Math.round(K.val*(.75+.6*pct)));
  const L=F.log[K.id]||(F.log[K.id]={n:0,best:0}),isNew=!L.n,rec=!isNew&&cm>L.best&&K.rar!=='junk';L.n++;L.best=Math.max(L.best,cm);fishSaveLog();KIT.bag.push([i,cm,gain]);kitSave();
  fishPic($('#fcCv'),i,2);$('#fcName').textContent=K.name;$('#fcName').style.color=K.rar==='junk'?'':FISH_RC[K.rar];$('#fcStage').style.setProperty('--rc',FISH_RC[K.rar]);
  $('#fcTag').textContent=isNew?'NEW':rec?'RECORD':'';$('#fcTag').style.display=isNew||rec?'':'none';
  $('#fcInfo').innerHTML=`<b style="color:${FISH_RC[K.rar]}">${K.rar.toUpperCase()}</b> · ${cm} cm · <span class="wal">worth ${ic('coin',2)}${gain}</span>`;
  $('#fcAgain').textContent=KIT.bag.length>=FISH_BAG?'Bag is full':fishBait()?'Cast again':'Out of bait';$('#fishModal').classList.add('on');
  if(K.rar==='epic'||K.rar==='legendary')winSound(K.rar,.1);else sfx(K.rar==='junk'?'nope':K.rar==='rare'?'rare':'prize');
  if(K.rar==='legendary'&&NET.on)wlSay('You caught '+K.name+'!','good');}
function fishBook(){$('#fishBookGrid').innerHTML=FISHES.map((K,i)=>{const L=FISH.log[K.id],own=L&&L.n;
    return `<div class="ocard fcard${own?'':' lock'}" style="--rc:${own?FISH_RC[K.rar]:'#8a7f9c'}"><canvas width="48" height="32" data-i="${i}" data-d="${own?0:1}"></canvas><span>${own?K.name:'? ? ?'}</span><em>${own?(K.rar==='junk'?'x'+L.n:L.best+' cm · x'+L.n):K.rar==='junk'?'JUNK':K.rar.toUpperCase()}</em></div>`;}).join('');
  document.querySelectorAll('#fishBookGrid canvas').forEach(c=>fishPic(c,+c.dataset.i,1,c.dataset.d==='1'));
  const got=FISHES.filter(K=>FISH.log[K.id]&&FISH.log[K.id].n).length;$('#fishBookN').textContent=got+' of '+FISHES.length;$('#fishModal').classList.remove('on');$('#fishBookModal').classList.add('on');}
$('#fcAgain').onclick=()=>{$('#fishModal').classList.remove('on');sfx('click');fishPh('idle');};
$('#fcBook').onclick=()=>{sfx('click');fishBook();};
$('#fishBookX').onclick=()=>{$('#fishBookModal').classList.remove('on');if(FISH.ph==='card')fishPh('idle');};
$('#fishBookBtn').onclick=()=>{sfx('click');fishBook();};
$('#fishStopBtn').onclick=()=>{sfx('close');fishStop();const H=hallOf(LAKE);wlHead(H.name,'Tap the water to fish. Walk down to leave.');};

/* ---- drawing the lake: called for every frame you are there ---- */
function fishFrame(m,people,dt,t,H,img){const F=FISH;fishTick(dt,t,m);
  const lhE=Hh()/Math.max(1,Math.round(W/190)),B=F.bob,foc=F.on?(B?[(m.x*2+B.x)/3,(m.y+B.y)/2+lhE*.02]:[m.x,m.y-lhE*.2]):[m.x,m.y-lhE*.08];
  F.cx+=(foc[0]-F.cx)*Math.min(1,dt*3);F.cy+=(foc[1]-F.cy)*Math.min(1,dt*3);
  view(img,F.cx,F.cy,190,{hi:true,void:'#dfeefc',loose:.8});
  /* the ripple: PixelLab's loop, each frame melting into the next so it never ticks */
  const Wj=F.wj,wim=IMG['fish/water'];if(Wj&&wim){const fr=t/300,a=Math.floor(fr)%Wj.n,b=(a+1)%Wj.n,k=fr%1,dx=Wj.x-cam.x,dy=Wj.y-cam.y;
    lx.drawImage(wim,a*Wj.w,0,Wj.w,Wj.h,dx,dy,Wj.w,Wj.h);lx.globalAlpha=k;lx.drawImage(wim,b*Wj.w,0,Wj.w,Wj.h,dx,dy,Wj.w,Wj.h);lx.globalAlpha=1;}
  /* the fish under the water */
  for(const s of F.shad){const im=fishShadow(s.s,s.a,Math.floor(s.wig)%2);lx.globalAlpha=.44*s.born;lx.drawImage(im,X(s.x)-(im.width>>1),Y(s.y)-(im.height>>1));lx.globalAlpha=1;
    if(FISHES[s.kind].rar==='legendary'&&s.st!=='hook'&&Math.floor(t/140+s.wig)%9===0){lx.fillStyle='#ffe98a';lx.fillRect(X(s.x)+Math.round(Math.cos(s.wig)*3),Y(s.y)+Math.round(Math.sin(s.wig)*2),1,1);}}
  for(const r of F.rip){const k=r.t/r.life,im=fishRing(Math.max(2,Math.round(2+k*r.max)),k>.55,'#d6ecff');lx.drawImage(im,X(r.x)-(im.width>>1),Y(r.y)-(im.height>>1));}
  const sim=IMG['fish/splash'];for(const s of F.spl){const f=Math.min(4,Math.floor(s.t/.1));if(sim)lx.drawImage(sim,f*48,0,48,48,X(s.x)-24,Y(s.y)-28,48,48);}
  /* where the float will land */
  if(F.on&&F.ph==='charge'&&F.tg){const q=Math.floor(t/120)%2,im=fishRing(5+q,false,'#ffd25e'),gx=X(F.tg[0]),gy=Y(F.tg[1]);lx.drawImage(im,gx-(im.width>>1),gy-(im.height>>1));lx.fillStyle='#fff6cf';lx.fillRect(gx,gy,1,1);
    const tp=fishTip(m);for(let i=1;i<9;i++){const k=i/9;lx.fillStyle=i%2?'#ffd25e':'#fff6cf';lx.fillRect(Math.round(lerp(X(tp[0]),gx,k)),Math.round(lerp(Y(tp[1]),gy,k)-Math.sin(k*Math.PI)*10),1,1);}}
  /* you, with the rod */
  const me=people.find(p=>p.e===m),rest=people.filter(p=>p!==me),hits=new Map();
  if(me&&F.on){const c=fishCell(),tip=fishTip(m),px=XP(m.x),py=YP(m.y);
    if(c!=null){shadow(px,py,6,2,.28);lx.drawImage(IMG['rod/'+looksLike(0)],c*64,0,64,64,px-32,py-56,64,64);hits.set(me,{cx:px,top:py-36});}
    else{const h=drawChar({...me,dir:'back',walk:false});if(h)hits.set(me,h);fishLine(X(m.x+8),Y(m.y-9),X(tip[0]),Y(tip[1]),'#3a2413');fishLine(X(m.x+8)+1,Y(m.y-9),X(tip[0])+1,Y(tip[1]),'#a36a35');}
    /* the line, the float, the fish on the end of it */
    if(B&&F.ph!=='fight'){const dip=Math.round(Math.min(2,F.dip)),bx=X(B.x),by=Y(B.y-B.z)+(F.ph==='fly'?0:dip+Math.round(Math.sin(t*.004)*.6));
      fishLine(X(tip[0]),Y(tip[1]),bx,by-2,'#eef6ff',F.ph==='fly'?0:5);
      if(dip<2){lx.fillStyle='#14203c';lx.fillRect(bx-2,by-3,4,5);lx.fillStyle='#e4544f';lx.fillRect(bx-1,by-2,2,2);lx.fillStyle='#fff';lx.fillRect(bx-1,by,2,1);}}
    if(F.ph==='fight'&&F.hook){const col=F.ten>.8?'#e4544f':F.ten>.55?'#ffd25e':'#eef6ff';fishLine(X(tip[0]),Y(tip[1]),X(F.hook.x),Y(F.hook.y),col,F.held?0:4);
      const bx=Math.round(px)-21,by=Math.round(py)-52,w=42;lx.fillStyle='#14203c';lx.fillRect(bx-1,by-1,w+2,7);lx.fillStyle='#2a3a66';lx.fillRect(bx,by,w,5);
      lx.fillStyle='#5fc46f';lx.fillRect(bx,by,Math.round(w*.55),5);lx.fillStyle='#ffd25e';lx.fillRect(bx+Math.round(w*.55),by,Math.round(w*.25),5);lx.fillStyle='#e4544f';lx.fillRect(bx+Math.round(w*.8),by,w-Math.round(w*.8),5);
      const nx=bx+Math.round(clamp(F.ten,0,1)*(w-1));lx.fillStyle='#14203c';lx.fillRect(nx-1,by-3,3,11);lx.fillStyle='#fff';lx.fillRect(nx,by-2,1,9);}
    if(F.ph==='bite'&&Math.floor(t/90)%2){const bx=Math.round(px)-3,by=Math.round(py)-50;lx.fillStyle='#14203c';lx.fillRect(bx-1,by-1,8,11);lx.fillStyle='#ffd25e';lx.fillRect(bx,by,6,9);lx.fillStyle='#14203c';lx.fillRect(bx+2,by+1,2,4);lx.fillRect(bx+2,by+6,2,2);}
    if(F.land){const L=F.land,k=Math.min(1,L.t/.6),fx=lerp(X(L.x0),px,k),fy=lerp(Y(L.y0),py-44,k)-Math.sin(k*Math.PI)*26;lx.drawImage(IMG['fish/sheet'],L.kind*48,0,48,32,Math.round(fx)-24,Math.round(fy)-16,48,32);}
  }else if(me)rest.push(me);
  for(const[p,h]of drawScene(rest,null,img,null))hits.set(p,h);
  wlFx(dt,m.loc);drawPuffs(dt);wlCases(dt,m.loc);
  lx.fillStyle='rgba(255,236,190,.05)';lx.fillRect(0,0,cam.lw,cam.lh);
  return hits;}
function Hh(){return H;}

/* every outfit's rod pictures: assets/fishing/rods/<outfit>.png (9 cells of 64) + rods.json (the rod tip in each cell, from the feet) */
fetch('assets/fishing/rods.json?v='+BUILD).then(r=>r.json()).then(j=>{for(const n of Object.keys(j))load('rod/'+n,`assets/fishing/rods/${n}.png`).then(()=>{FISH.rods[n]=j[n];}).catch(()=>{});}).catch(()=>{});

/* ================= FISHERMAN JOE (17 Nov, his ask): a stall by the lake =================
   You sell your fish here, buy better rods and buy bait. The stall and Joe are one PixelLab picture (assets/fishing/stall.png),
   drawn in the town like the wheel: in order with the people, its counter solid. Tap it, or walk up to the counter. */
const STALL={x:493,y:496,w:96,h:96,stand:[541,584]};   /* by the lake, where a tall pine stood (his pick, 17 Nov: "place it here, but remove the tree"): any tree whose foot is under the counter is left out of the day town (trees()) */
function stallObj(){return{img:IMG['fish/stall'],x:STALL.x,y:STALL.y,base:STALL.y+80};}
const stallSolid=(px,py)=>px>STALL.x+10&&px<STALL.x+86&&py>STALL.y+54&&py<STALL.y+81;
const stallHit=(x,y)=>x>STALL.x+8&&x<STALL.x+88&&y>STALL.y+18&&y<STALL.y+84;
function joeOpen(){const now=performance.now();if(now-(STALL.t||0)<900||document.querySelector('.modal.on'))return;const m=WL.me;if(m){m.path=[];m.todo=null;m.walk=false;m.dir='back';}
  joeUI();$('#joeModal').classList.add('on');sfx('open');}
function joeUI(){const worth=KIT.bag.reduce((a,b)=>a+b[2],0),free=!LAB&&KIT.bait<=0&&coins<BAIT_PRICE&&!KIT.bag.length;
  $('#joeBag').innerHTML=KIT.bag.length?KIT.bag.map(b=>`<canvas width="48" height="32" data-i="${b[0]}"></canvas>`).join(''):'<div class="small">Your bag is empty. Go and catch something.</div>';
  document.querySelectorAll('#joeBag canvas').forEach(c=>fishPic(c,+c.dataset.i,1));
  $('#joeBagN').textContent=KIT.bag.length+' of '+FISH_BAG;$('#joeSell').disabled=!KIT.bag.length;$('#joeSell').innerHTML=KIT.bag.length?'Sell all · '+ic('coin',2)+' '+worth:'Nothing to sell';
  $('#joeRods').innerHTML=RODS.map(r=>{const own=KIT.rods.includes(r.id),on=KIT.rod===r.id;
    return `<div class="jrod${on?' on':''}"><img class="jimg" src="assets/fishing/rod-${r.id}.png?v=${BUILD}" alt=""><div class="jt"><b>${r.name}</b><div class="small">${r.blurb}</div></div><button class="btn${own?'':' go'}" data-r="${r.id}"${on||(!own&&coins<r.price)?' disabled':''}>${on?'In use':own?'Use':ic('coin',2)+' '+r.price}</button></div>`;}).join('');
  $('#joeBaitN').textContent=LAB?'unlimited (lab)':KIT.bait;$('#joeBait').disabled=!free&&coins<BAIT_PRICE;$('#joeBait').innerHTML=free?'Take 5 on the house':'Buy '+BAIT_PACK+' · '+ic('coin',2)+' '+BAIT_PRICE;$('#joeBait').dataset.free=free?'1':'';
  paintCoins();}
$('#joeX').onclick=()=>{$('#joeModal').classList.remove('on');STALL.t=performance.now();sfx('close');};
$('#joeSell').onclick=()=>{const worth=KIT.bag.reduce((a,b)=>a+b[2],0);if(!worth)return;coins+=worth;KIT.bag=[];kitSave();saveInv();sfx('rare');for(let k=0;k<3;k++)setTimeout(()=>sfx('coin'),200+k*140);wlSay('Sold for '+worth+' coins.','good');joeUI();};
$('#joeRods').onclick=e=>{const b=e.target.closest('button');if(!b)return;const r=RODS.find(q=>q.id===b.dataset.r);if(!r)return;
  if(!KIT.rods.includes(r.id)){if(coins<r.price)return;coins-=r.price;KIT.rods.push(r.id);saveInv();sfx('rare');wlSay('You bought the '+r.name+'.','good');}else sfx('click');
  KIT.rod=r.id;kitSave();joeUI();};
$('#joeBait').onclick=()=>{if($('#joeBait').dataset.free){KIT.bait=5;}else{if(coins<BAIT_PRICE)return;coins-=BAIT_PRICE;KIT.bait+=BAIT_PACK;saveInv();}kitSave();sfx('coin');joeUI();};
/* lab only: a tab straight to the lake */
if(LAB){const b=document.createElement('button');b.className='btn';b.textContent='Fish';b.onclick=()=>go('town',()=>setTimeout(()=>wlDoor(LAKE),450));$('#tabs').appendChild(b);}
