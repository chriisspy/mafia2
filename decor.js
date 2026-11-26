/* ================= DECORATING (18 Nov 2026, phase 4 of the worlds plan) =================
   His plan: everyone decorates their own cabin, inside and outside. A starter set of decorations (assets/decor, made from
   the game's own art) is bought with coins; yours are kept in your wallet (wallet.dec = how many of each). In a world you
   place them inside your cabin and round it outside; everyone in the world sees them (worlds/{wid}/decor/{uid}).
   Buying and saving go through the server (decorBuy, decorSave).
   DECORATE MODE: the button shows when you are in your own cabin or stood by it. A tray of things along the bottom.
   PLACING (his call, 18 Nov): the ground you may use shows as a GRID. Tap a thing and a see-through GHOST of it appears by
   you; drag it about (it snaps to the grid); the tray gives way to a small panel with a tick (place it: this is when it is
   bought, if you have none spare) and a cross (cancel). Tap something you already placed and it becomes the ghost again:
   move it, or Put away. Done saves. */
const DECOR={cat:[],by:{},wid:null,ref:null,all:{},on:false,where:'in',list:[],ghost:null,drag:null,busy:false};
const DGRID=8,PGRID=16,   /* the grid's squares: 8 px (his call: smaller squares, to place things more exactly); a pond square is 16 */
  PROP_PRICE=7500,PROP_MAKER=true;   /* 24 Nov: back, as THE MAKER (props + cosmetics): 7,500 once to unlock, then free */   /* the prop maker (prop.js) is left out for now (his call, 18 Nov): its tile is hidden, props already made still work */   /* the grid's squares, in game pixels */
/* ANIMATED THINGS (PixelLab, tools/make_decor.py): the file holds every frame side by side; cut here into DANIM[id]. IMG['decor/id'] is frame 0.
   THE POND ('water', his ask): drawn in code, one grid square each, sunk into the ground; squares that touch join into one pond (pondTile). */
const DIMG={},DMAX=60;
fetch('assets/decor/decor.json?v='+BUILD).then(r=>r.json()).then(c=>{DECOR.cat=c;for(const d of c){DECOR.by[d.id]=d;
  if(d.code){const t=mk(PGRID,PGRID);pondTile(t.getContext('2d'),0,0,0,0);IMG['decor/'+d.id]=t;d.thumb=t.toDataURL();continue;}
  /* TURNING (his ask, 18 Nov): a thing with "dirs" has a picture for each way it faces: 0 south (id.png), 1 east (id_e.png), 2 north (id_n.png),
     3 west (id_w.png); dirs gives the frames in each. DIMG[id][r] = that way's frames. d.def = the way it faces when you first pick it. */
  const dirs=d.dirs||{s:d.frames||1};DIMG[d.id]=DIMG[d.id]||{};
  ['s','e','n','w'].forEach((k,r)=>{const n=dirs[k];if(!n)return;const key='decor/'+d.id+'#'+k;load(key,'assets/decor/'+d.id+(k==='s'?'':'_'+k)+'.png').then(()=>{const im=IMG[key],w=im.width/n,fr=[];
    for(let i=0;i<n;i++){const f=mk(w,im.height);f.getContext('2d').drawImage(im,-i*w,0);fr.push(f);}DIMG[d.id][r]=fr;
    if(r===(d.def|0)){IMG['decor/'+d.id]=fr[0];d.thumb=fr[0].toDataURL();}if(DECOR.on)decorTray();}).catch(()=>{});});}}).catch(()=>{});
/* the picture of a thing facing way r, right now (animated ones step through their frames) */
function decorIm(id,r,x){const D=DIMG[id],fr=D&&(D[r|0]||D[(DECOR.by[id]||{}).def|0]||D[0]);if(!fr)return IMG['decor/'+id]||null;return fr.length>1?fr[Math.floor(performance.now()/130+(x||0)*3)%fr.length]:fr[0];}
/* one square of pond at (x, y) on the picture. m says which neighbours are water too: 1 up, 2 right, 4 down, 8 left (+16/32/64/128 the corners
   up-left, up-right, down-right, down-left). Where there is no neighbour there is a bank: a dark lip, and on the far (top) side the earth wall
   you see down into, which is what makes it look sunk in. t makes the glints drift. */
function pondTile(x,X0,Y0,m,t,wx,wy){const G=PGRID,U=m&1,R=m&2,D=m&4,L=m&8,f=(c,a,b,w,h)=>{x.fillStyle=c;x.fillRect(X0+a,Y0+b,w,h);};wx=wx||0;wy=wy||0;
  f('#4f9ed9',0,0,G,G);                                                       /* water */
  /* THE RIPPLES (his note, 18 Nov: the old glints "moved really weird" as you walked, and did not flow from square to square). Every ripple is
     worked out from where the water is in the WORLD, so the pattern is one sheet across the whole pond; it drifts slowly sideways, a pixel at a time.
     Rows of soft light dashes, darker dashes drifting the other way between them, and a few bright glints. */
  {const T=t||0,mod=(a,n)=>((a%n)+n)%n,h=n=>mod(n*73+((n*n)>>2)*31,97);
    for(let r=0;r<G;r++){const Y=wy+r,k=mod(Y,6);if(k!==1&&k!==4)continue;const row=Math.floor(Y/6),lite=k===1;
      const off=h(row*2+(lite?0:1))+(lite?1:-1)*Math.floor(T*(lite?4:2.5)),per=lite?23:31,len=lite?5:7;
      for(let c=0;c<G;c++){const q=mod(wx+c-off,per);if(q<len){x.fillStyle=lite?'#8fd0f5':'#3f8ccb';x.fillRect(X0+c,Y0+r,1,1);}
        else if(lite&&q===len+7&&mod(row,3)===0){x.fillStyle='#e4f6ff';x.fillRect(X0+c,Y0+r,1,1);}}}}
  if(!U){f('#3a2a22',0,0,G,1);f('#6b4a36',0,1,G,3);f('#2f6fb0',0,4,G,2);}     /* far bank: lip, earth wall, its shadow on the water */
  else f('#4f9ed9',0,0,G,1);
  if(!L){f('#3a2a22',0,0,1,G);f('#6b4a36',1,U?0:1,1,G-(U?0:1));}
  if(!R){f('#3a2a22',G-1,0,1,G);f('#6b4a36',G-2,U?0:1,1,G-(U?0:1));}
  if(!D){f('#3a2a22',0,G-1,G,1);f('#7fc4f0',L?0:2,G-2,G-(L?0:2)-(R?0:2),1);}   /* near bank: lip, and the light edge of the water against it */
  /* inside corners: both sides are water but the corner square is not */
  if(U&&L&&!(m&16)){f('#3a2a22',0,0,1,1);f('#6b4a36',0,1,2,3);f('#6b4a36',1,0,1,1);}
  if(U&&R&&!(m&32)){f('#3a2a22',G-1,0,1,1);f('#6b4a36',G-2,1,2,3);f('#6b4a36',G-2,0,1,1);}
  if(D&&R&&!(m&64))f('#3a2a22',G-1,G-1,1,1);if(D&&L&&!(m&128))f('#3a2a22',0,G-1,1,1);
  /* outside corners rounded off: the corner pixel goes back to bank colour */
  if(!U&&!L)f('#3a2a22',1,1,1,1);if(!U&&!R)f('#3a2a22',G-2,1,1,1);if(!D&&!L)f('#3a2a22',1,G-2,1,1);if(!D&&!R)f('#3a2a22',G-2,G-2,1,1);
}
function pondObj(p,set){const G=PGRID,x0=p[1]-G/2,y0=p[2]-G,has=(dx,dy)=>set.has((x0+dx*G)+','+(y0+dy*G));
  const m=(has(0,-1)?1:0)|(has(1,0)?2:0)|(has(0,1)?4:0)|(has(-1,0)?8:0)|(has(-1,-1)?16:0)|(has(1,-1)?32:0)|(has(1,1)?64:0)|(has(-1,1)?128:0);
  return{x:x0,y:y0,img:DBLANK,base:-5e5,after(){pondTile(lx,X(x0),Y(y0),m,performance.now()/1000,x0,y0);}};}
document.querySelector('#townHud .tpanel').insertAdjacentHTML('beforeend',`<button class="tbtn deco" id="townDecor" style="display:none">${ic('pencil',3,'solo')}Decorate</button>`);
document.querySelector('#townHud .bottom').insertAdjacentHTML('beforeend',`<div class="panel" id="decorBar" style="display:none"><div id="decorPick"><div id="decorTray"></div><div class="row" style="gap:8px;margin-top:8px"><span class="wal"><i data-ic="coin" data-c="solo"></i><span class="coinN">0</span></span><span style="flex:1"></span><button class="btn red" id="decorDone">Done</button></div></div>
  <div id="decorPlace" style="display:none"><img id="dpPic" alt=""><span id="dpName"></span><button class="btn dpb" id="decorTurn" title="Turn it"><i data-ic="turn" data-c="solo"></i></button><button class="btn dpb" id="decorPut" title="Remove it"><i data-ic="bin" data-c="solo"></i></button><button class="btn dpb" id="decorNo" title="Cancel"><i data-ic="cross" data-c="solo"></i></button><button class="btn go dpb" id="decorYes" title="Place it"><i data-ic="check" data-c="solo"></i></button></div></div>`);
document.querySelectorAll('#decorBar [data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+(e.dataset.s||2),e.dataset.c);});
document.head.insertAdjacentHTML('beforeend',`<style>
.tbtn.deco{width:100%;margin-top:10px;background:#5fc46f;box-shadow:inset 0 -6px 0 #2f7a3f,inset 0 3px 0 #9be8a4,0 4px 0 #0009}
#townHud.decorating .tpanel,#townHud.decorating #hallBar{display:none!important}
#decorBar{padding:8px 10px 10px}
#decorTray{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}#decorTray::-webkit-scrollbar{display:none}
.dit{flex:none;width:68px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;padding:5px 2px 6px;border:3px solid var(--wood);border-radius:5px;background:#fff7;font:700 12px "Pixelify Sans";color:var(--text);cursor:pointer}
.dit .pic{height:46px;display:flex;align-items:flex-end;justify-content:center}.dit img.d{image-rendering:pixelated;max-height:46px;max-width:60px}
#decorPlace{display:flex;align-items:center;gap:8px}#dpPic{image-rendering:pixelated;max-height:44px;max-width:52px}
#dpName{flex:1;min-width:0;font:700 17px "Pixelify Sans";line-height:1.1}#dpName small{display:flex;align-items:center;gap:3px;font:600 13px "Pixelify Sans";opacity:.75}#dpName small img{width:12px;height:12px}
#decorPlace .btn{height:42px;display:inline-flex;align-items:center;justify-content:center;padding:0 10px 4px;font-size:14px;flex:none}#decorPlace .dpb{width:44px;padding:0 0 4px}#dpName{font-size:15px!important}
#decorYes:disabled{opacity:.45}
#dpName small.poor,.dit em.poor{color:#c0392b;opacity:1}
.dit.mk{background:#ffe08a}.dit.mk .pic{align-items:center}
.dit em{font-style:normal;display:flex;align-items:center;gap:2px}.dit em img{width:12px;height:12px}
</style>`);

/* everyone's decorations in the world you are in */
function decorSync(){if(DECOR.wid===NET.world)return;if(DECOR.ref)DECOR.ref.off();DECOR.wid=NET.world;DECOR.all={};DECOR.ref=null;decorStop(false);
  if(NET.world){DECOR.ref=NET.db.ref('worlds/'+NET.world+'/decor');DECOR.ref.on('value',s=>{DECOR.all=s.val()||{};},()=>{});}}
const decorMine=()=>DECOR.all[NET.uid]||{};
/* A PROP SOMEBODY DREW (prop.js): its id is '@uid:propId'; the picture is fetched once from props/{uid}/{propId} */
const DNEED={};function decorNeed(id){if(id[0]!=='@'||DNEED[id]||!NET.db)return;DNEED[id]=1;const[u,k]=id.slice(1).split(':');
  NET.db.ref('props/'+u+'/'+k).get().then(s=>{const v=s.val();if(!v||!v.png)return;const im=new Image();im.onload=()=>{const c=mk(im.width,im.height);c.getContext('2d').drawImage(im,0,0);IMG['decor/'+id]=c;
    let sh=null;if(v.sh!==false&&!v.wall){sh=mk(c.width,c.height);const x=sh.getContext('2d');x.drawImage(c,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#0a0612';x.fillRect(0,0,c.width,c.height);}
    DECOR.by[id]={id,name:'Your prop',price:0,wall:v.wall?1:0,png:v.png,shadow:sh,mine:u===NET.uid};if(DECOR.on)decorTray();};im.src=v.png;}).catch(()=>{DNEED[id]=0;});}
const decorSrc=id=>id[0]==='@'?((DECOR.by[id]||{}).png||''):(DECOR.by[id]||{}).thumb||'assets/decor/'+id+'.png?v='+BUILD;
function decorObj(p,where,slot,pond){const im=decorIm(p[0],p[3],p[1]),d=DECOR.by[p[0]];if(!im||!d){decorNeed(p[0]);return null;}if(d.code&&pond)return pondObj(p,pond);
  let base=d.flat?p[2]-im.height:p[2];
  if(d.wall){const h=where==='out'&&decorHut(slot);base=h?h.base+.5:p[2]-im.height-40;}   /* on the wall: behind anyone stood there */
  return{x:p[1]-Math.floor(im.width/2),y:p[2]-im.height,img:im,base,shadow:d.shadow||null};}
/* your cabin's own picture in the town (where its walls are) */
function decorHut(slot){try{return(dayImg('cabins')||[]).find(o=>o.ci===slot)||null;}catch(e){return null;}}
/* the ghost: the thing tinted green where it can go, red where it cannot (his call) */
const DTHUMB={};const DTINT={};function decorTint(id,ok,r){const k=id+(r|0)+(ok?'+':'-');if(DTINT[k])return DTINT[k];const D=DIMG[id],im=(D&&D[r|0]&&D[r|0][0])||IMG['decor/'+id],c=mk(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=.55;x.fillStyle=ok?'#3ddc6a':'#ff3b3b';x.fillRect(0,0,c.width,c.height);return DTINT[k]=c;}
/* what to draw: inside cabin `loc`, or everything outside. Your own come from the list being edited while you decorate. */
/* PONDS DUG BEFORE 18 Nov sat on a grid that started at the middle of the cabin picture, 5 px off the path. Slide them onto today's grid. */
function pondFix(list,where,slot){if(where!=='out')return list;const c=TOWN.cabins[slot];if(!c)return list;const x0=c.cx-80;for(const p of list)if(p[0]==='water')p[1]=x0+Math.floor((p[1]-x0)/PGRID)*PGRID+PGRID/2;return list;}
function decorObjs(where,loc){decorSync();if(!NET.world)return[];const out=[],lists=[],pond=new Set();
  for(const[uid,m]of Object.entries(WORLD.members||{})){if(where==='in'&&+m.s!==loc)continue;
    const list=DECOR.on&&uid===NET.uid&&DECOR.where===where?DECOR.list:((DECOR.all[uid]||{})[where]||[]);
    pondFix(list,where,+m.s);lists.push([list,+m.s]);for(const p of list)if(p[0]==='water')pond.add((p[1]-PGRID/2)+','+(p[2]-PGRID));}
  for(const[list,sl]of lists)for(const p of list){const o=decorObj(p,where,sl,pond);if(o)out.push(o);}   /* every pond square knows its neighbours, whoever dug them */
  if(DECOR.on&&DECOR.where===where&&(where==='out'||loc===NET.slot)){out.push(decorGrid());
    const g=DECOR.ghost,o=g&&decorObj([g.id,g.x,g.y,g.r],where,NET.slot);if(o){o.img=decorTint(g.id,decorOk(where,g.x,g.y),g.r);o.alpha=.8;o.base=1e6;out.push(o);}}   /* the grid under everything; the ghost on top, fainter where it cannot go */
  return out;}
/* the ground you may decorate, as a grid of little squares (drawn under the people) */
const DBLANK=mk(1,1);
const decorWall=()=>{const g=DECOR.ghost,d=g&&DECOR.by[g.id];return!!(d&&d.wall);};
function decorZone(){const wall=decorWall();
  if(DECOR.where==='in'){const fy=ROOM.floor[1];return wall?[16,fy-32,176,fy]:[16,fy,176,fy+112];}
  const c=TOWN.cabins[NET.slot],h=decorHut(NET.slot);
  if(wall&&h){const w=h.img.width,x0=h.x+Math.round(w*.14);return[x0,h.base-40,x0+Math.max(1,Math.floor(w*.72/DGRID))*DGRID,h.base-8];}   /* a wall thing: on the cabin itself (his call: this was right). None in the starter set; the prop maker will make them */
  const bx=c.cx,by=h?Math.round(h.base):c.top+38;return[bx-80,by-80,bx+80,by+80];}   /* 80 px each way from the middle of the cabin's base: the area he chose, in squares half the size */
function decorGrid(){return{x:0,y:0,img:DBLANK,base:-1e6,after(){const[x0,y0,x1,y1]=decorZone(),g=DECOR.ghost;lx.fillStyle='rgba(255,255,255,.07)';lx.fillRect(X(x0),Y(y0),x1-x0,y1-y0);
    lx.fillStyle='rgba(255,255,255,.22)';for(let x=x0;x<=x1;x+=DGRID)lx.fillRect(X(x),Y(y0),1,y1-y0+1);for(let y=y0;y<=y1;y+=DGRID)lx.fillRect(X(x0),Y(y),x1-x0+1,1);
    if(g){lx.fillStyle=decorOk(DECOR.where,g.x,g.y)?'rgba(95,196,111,.55)':'rgba(228,84,79,.55)';const G=g.id==='water'?PGRID:DGRID;lx.fillRect(X(g.x-G/2)+1,Y(g.y-G)+1,G-1,G-1);}}};}   /* the square it will stand on: green, or red where it cannot go */
/* where you may decorate right now: inside your own cabin, or stood near it outside */
function decorSpot(){const m=WL.me;if(!NET.on||!NET.world||!m||GAME.on)return null;if(m.loc===NET.slot)return'in';
  if(m.loc<0){const c=TOWN.cabins[NET.slot];if(c&&Math.abs(m.x-c.cx)<=90&&m.y>=c.top-50&&m.y<=c.top+125)return'out';}return null;}
/* a ground thing needs open ground (not the cabin, the pond, the furniture); a wall thing needs the wall (his call) */
function decorOk(where,x,y){const[x0,y0,x1,y1]=decorZone();if(!(x>x0&&x<x1&&y>y0&&y<=y1))return false;if(decorWall())return true;const g=DECOR.ghost;if(g&&g.id==='water'){if(DECOR.list.some(p=>p[0]==='water'&&p[1]===x&&p[2]===y))return false;
    if(where==='out')for(const[dx,dy]of[[-7,-15],[7,-15],[-7,-1],[7,-1],[0,-8]]){if(groundAt(x+dx,y+dy,1)!=='grass')return false;}}   /* not on the path */
  return where==='in'?canStand(x,y-2):townOk(x,y-2);}
const decorSnap=(x,y)=>{const[x0,y0]=decorZone(),g=DECOR.ghost,G=g&&g.id==='water'?PGRID:DGRID;return[x0+Math.floor((x-x0)/G)*G+G/2,y0+Math.ceil((y-y0)/G)*G];};   /* the middle of a square, stood on its bottom edge */
const decorLeft=id=>((WALLET.dec||{})[id]||0)-[...(DECOR.on?(DECOR.where==='in'?DECOR.list:(decorMine().in||[])):(decorMine().in||[])),...(DECOR.on&&DECOR.where==='out'?DECOR.list:(decorMine().out||[]))].filter(p=>p[0]===id).length;
function decorTray(){const g=DECOR.ghost;$('#decorPick').style.display=g?'none':'';$('#decorPlace').style.display=g?'flex':'none';paintCoins();
  if(g){const d=DECOR.by[g.id],buy=!g.from&&decorLeft(g.id)<=0;{const im=decorIm(g.id,g.r)||{height:22};$('#dpPic').src=im.toDataURL?(DTHUMB[g.id+(g.r|0)]||(DTHUMB[g.id+(g.r|0)]=((DIMG[g.id]||{})[g.r|0]||[im])[0].toDataURL())):decorSrc(g.id);$('#dpPic').style.height=Math.min(44,im.height*2)+'px';}$('#decorTurn').style.display=d.dirs?'':'none';
    const poor=buy&&coins<d.price;$('#dpName').innerHTML=esc(d.name)+(buy?`<small class="${poor?'poor':''}">${ic('coin',2)}${d.price}${poor?' · not enough coins':''}</small>`:'');$('#decorPut').style.display=g.from?'':'none';$('#decorYes').disabled=!decorOk(DECOR.where,g.x,g.y)||(buy&&coins<d.price);return;}
  const own=Object.keys(WALLET.dec||{}).filter(k=>k[0]==='@');own.forEach(decorNeed);const mine=own.map(k=>DECOR.by[k]).filter(Boolean);
  $('#decorTray').innerHTML=(PROP_MAKER?`<button class="dit mk" id="decorMake"><span class="pic">${ic('pencil',4,'solo')}</span>${typeof MK!=='undefined'&&MK.me.maker?'':`<em class="${coins<PROP_PRICE?'poor':''}">${ic('coin',2)}${PROP_PRICE}</em>`}</button>`:'')+[...mine,...DECOR.cat].map(d=>{const n=decorLeft(d.id);if((d.png||d.quest)&&n<=0)return'';   /* a thing you were GIVEN (the Keystone Plaque) cannot be bought: it is only here while you hold one */return`<button class="dit" data-id="${d.id}"><span class="pic"><img class="d" src="${decorSrc(d.id)}" alt="" style="height:${Math.min(46,(IMG['decor/'+d.id]||{height:23}).height*2)}px"></span><em class="${n<=0&&coins<d.price?'poor':''}">${n>0?'x'+n:ic('coin',2)+d.price}</em></button>`;}).join('');}
function decorStart(){const w=decorSpot();if(!w)return;DECOR.on=true;DECOR.where=w;DECOR.list=pondFix((decorMine()[w]||[]).map(p=>[...p]),w,NET.slot);DECOR.ghost=null;DECOR.drag=null;document.querySelectorAll('.modal.on').forEach(q=>q.classList.remove('on'));
  $('#townHud').classList.add('decorating');$('#decorBar').style.display='';decorTray();sfx('click');}
function decorCancel(){const g=DECOR.ghost;if(!g)return;if(g.from)DECOR.list.push(g.from);DECOR.ghost=null;DECOR.drag=null;decorTray();}   /* a thing you were moving goes back where it was */
function decorStop(save){if(!DECOR.on)return;decorCancel();DECOR.on=false;$('#townHud').classList.remove('decorating');$('#decorBar').style.display='none';
  if(save){const mine=decorMine(),d={wid:NET.world,in:DECOR.where==='in'?DECOR.list:(mine.in||[]),out:DECOR.where==='out'?DECOR.list:(mine.out||[])};
    DECOR.all[NET.uid]={in:d.in,out:d.out};srv('decorSave',d).then(()=>sfx('rare')).catch(e=>wlSay(e.message,'bad'));}}
$('#townDecor').onclick=decorStart;
$('#decorDone').onclick=()=>decorStop(true);
/* pick a thing from the tray: its ghost appears just in front of you */
$('#decorTray').onclick=e=>{const b=e.target.closest('.dit');if(!b||DECOR.busy)return;if(b.id==='decorMake'){if(window.propOpen)propOpen();return;}const id=b.dataset.id,m=WL.me;sfx('click');DECOR.ghost={id,x:0,y:0,r:(DECOR.by[id]||{}).def|0,from:null};const[x0,y0,x1,y1]=decorZone();
  [DECOR.ghost.x,DECOR.ghost.y]=decorSnap(clamp(m.x,x0+1,x1-1),clamp(m.y+16,y0+1,y1));decorTray();};
$('#decorTurn').onclick=()=>{const g=DECOR.ghost,d=g&&DECOR.by[g.id];if(!d||!d.dirs)return;for(let k=0;k<4;k++){g.r=((g.r|0)+1)%4;if((DIMG[g.id]||{})[g.r])break;}sfx('click');decorTray();};   /* south, east, north, west */
$('#decorNo').onclick=()=>{sfx('close');decorCancel();};
$('#decorPut').onclick=()=>{sfx('close');DECOR.ghost=null;decorTray();};   /* back in your pocket */
$('#decorYes').onclick=async()=>{const g=DECOR.ghost;if(!g||DECOR.busy||!decorOk(DECOR.where,g.x,g.y))return;if(DECOR.list.length>=DMAX){sfx('nope');return;}
  if(!g.from&&decorLeft(g.id)<=0&&(DECOR.by[g.id]||{}).quest){sfx('nope');return;}
  if(!g.from&&decorLeft(g.id)<=0){DECOR.busy=true;const done=btnBusy($('#decorYes'),'…');   /* none spare: this is when it is bought */
    try{await srv('decorBuy',{id:g.id});WALLET.dec=WALLET.dec||{};WALLET.dec[g.id]=(WALLET.dec[g.id]||0)+1;sfx('coin');}catch(err){done();DECOR.busy=false;wlSay(err.message,'bad');return;}done();DECOR.busy=false;}
  DECOR.list.push(g.r?[g.id,g.x,g.y,g.r]:[g.id,g.x,g.y]);DECOR.ghost=null;sfx('sit');
  if(g.id==='water'&&!g.from){const[x0,y0,x1]=decorZone(),nx=g.x+PGRID<x1?g.x+PGRID:g.x-PGRID;DECOR.ghost={id:'water',x:nx,y:g.y,from:null};}   /* digging a pond: the next square is ready beside it (X when you are done) */
  decorTray();};
/* the room while you decorate: drag the ghost about; with no ghost, tap one of yours to pick it up */
const decorAt=e=>{const[x,y]=wxy(e),im=decorIm(DECOR.ghost.id,DECOR.ghost.r)||{height:20};return decorSnap(x,y+Math.min(im.height/2,14));};   /* your finger holds it by the middle */
cv.addEventListener('pointerdown',e=>{if(!DECOR.on||scene!==scenes.town)return;e.stopImmediatePropagation();e.preventDefault();
  if(DECOR.ghost){DECOR.drag=e.pointerId;[DECOR.ghost.x,DECOR.ghost.y]=decorAt(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}decorTray();return;}
  const[x,y]=wxy(e);for(let i=DECOR.list.length-1;i>=0;i--){const p=DECOR.list[i],im=decorIm(p[0],p[3]);if(!im)continue;
    if(Math.abs(x-p[1])<=im.width/2+2&&y<=p[2]+2&&y>=p[2]-im.height-2){DECOR.list.splice(i,1);DECOR.ghost={id:p[0],x:p[1],y:p[2],r:p[3]|0,from:p};sfx('click');decorTray();return;}}},true);
cv.addEventListener('pointermove',e=>{if(!DECOR.on||DECOR.drag!==e.pointerId||!DECOR.ghost)return;e.stopImmediatePropagation();[DECOR.ghost.x,DECOR.ghost.y]=decorAt(e);$('#decorYes').disabled=!decorOk(DECOR.where,DECOR.ghost.x,DECOR.ghost.y);},true);
for(const ev of['pointerup','pointercancel'])cv.addEventListener(ev,e=>{if(DECOR.drag===e.pointerId){DECOR.drag=null;if(DECOR.on)decorTray();}},true);
/* the Decorate button comes and goes with where you stand; walking away or a game starting ends decorating */
setInterval(()=>{if(scene!==scenes.town){if(DECOR.on)decorStop(false);return;}const w=decorSpot();if(DECOR.on&&w!==DECOR.where)decorStop(true);
  const b=$('#townDecor'),d=w&&!DECOR.on?'flex':'none';if(b.style.display!==d)b.style.display=d;},300);
