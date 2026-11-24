/* ================= THE MAKER (18 Nov 2026 props; 24 Nov 2026 + COSMETICS, his ask) =================
   24 Nov: unlocked ONCE for 7,500 coins (makerUnlock), then every drawing is free. Two modes: a PROP (as below) or a COSMETIC drawn
   on a grey mannequin from the front, the side and the back (32 x 40 each), worn over any outfit (market.js draws it) and sold in the market.
   Head cosmetics sit on the top of the head, body ones stand on the feet.
   His plan: "in game you can draw something and then add it to the front of your cabin or on the inside". You pick the size
   (up to 48 x 48), draw it pixel by pixel (what you leave empty is see-through), say whether it stands on the floor or hangs
   on the wall, and whether it has a shadow. It costs 7,500 coins (paid on the server, propMake) and becomes a decoration only
   you own; it shows in the Decorate tray like the rest (decor.js). The picture is cropped to what you drew.
   Tools: pencil, eraser, fill, pick a colour off the drawing, undo. Colours: the game's own, or any colour you like. */
const PM={w:32,h:32,px:null,tool:'pen',col:'#e4544f',undo:[],wall:false,sh:true,down:false,busy:false,mode:'prop',view:'front',cos:null,slot:'head',saved:null};
const PM_COLS=['#1a1430','#ffffff','#b8c2d4','#6f7b92','#f6dfae','#e9c88a','#c58a4a','#7a4a2a','#e4544f','#a92b2c','#ff9a8f','#f07ab0','#ffd25e','#d39b2a','#fff2a8','#ff9a4a','#5fc46f','#2f7a3f','#9be8a4','#3c6d40','#4a7bd0','#2b4a8a','#9fd0ff','#9a48ad'];
document.querySelector('#townHud').insertAdjacentHTML('beforeend',`<div class="modal panel" id="propModal">
  <div class="mhead"><b id="pmTitle">MAKE A PROP</b><span class="wal"><i data-ic="coin" data-c="solo"></i><span class="coinN">0</span></span><button class="btn" id="pmX"><i data-ic="cross" data-c="solo"></i></button></div>
  <div class="pmRow"><button class="btn pk sel" id="pmModeP">Prop</button><button class="btn pk" id="pmModeC">Cosmetic</button><span style="flex:1"></span><input type="text" id="pmName" maxlength="16" placeholder="Name"></div>
  <div class="pmRow" id="pmViews"><button class="btn pk sel" data-v="front">Front</button><button class="btn pk" data-v="right">Side</button><button class="btn pk" data-v="back">Back</button><span style="flex:1"></span><button class="btn pk sel" id="pmHead">Head</button><button class="btn pk" id="pmBody">Body</button></div>
  <div id="pmStage"><canvas id="pmCv"></canvas></div>
  <div class="pmRow" id="pmTools"><button class="btn pt sel" data-t="pen" title="Pencil"><i data-ic="pencil" data-c="solo"></i></button><button class="btn pt" data-t="erase" title="Eraser"><i data-ic="eraser" data-c="solo"></i></button><button class="btn pt" data-t="fill" title="Fill"><i data-ic="bucket" data-c="solo"></i></button><button class="btn pt" data-t="pick" title="Pick a colour"><i data-ic="dropper" data-c="solo"></i></button><span style="flex:1"></span><button class="btn pt" id="pmUndo" title="Undo"><i data-ic="undo" data-c="solo"></i></button></div>
  <div id="pmPal"></div>
  <div class="pmRow" id="pmSize"><span class="pmL">Size</span><button class="btn ps" data-d="w-">-</button><b id="pmW">32</b><button class="btn ps" data-d="w+">+</button><span class="pmX">x</span><button class="btn ps" data-d="h-">-</button><b id="pmH">32</b><button class="btn ps" data-d="h+">+</button></div>
  <div class="pmRow" id="pmKindRow"><button class="btn pk sel" id="pmFloor">Floor</button><button class="btn pk" id="pmWall">Wall</button><span style="flex:1"></span><button class="btn pk sel" id="pmSh">Shadow</button></div>
  <div class="small bad" id="pmMsg"></div>
  <button class="btn red wide" id="pmMake">Create</button></div>`);
document.querySelectorAll('#propModal [data-ic]').forEach(e=>{e.outerHTML=ic(e.dataset.ic,+(e.dataset.s||2),e.dataset.c);});
document.head.insertAdjacentHTML('beforeend',`<style>
#propModal{position:absolute;inset:0;z-index:35;padding:calc(10px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));border-radius:0;text-align:left;display:none;flex-direction:column;gap:8px;overflow:auto}
#propModal.on{display:flex}#propModal .mhead{margin:0}
#pmStage{display:flex;justify-content:center;align-items:center;background:#0f0b1e;border:3px solid var(--wood);border-radius:5px;padding:6px;min-height:120px}
#pmCv{image-rendering:pixelated;touch-action:none;display:block}
.pmRow{display:flex;align-items:center;gap:6px}.pmRow b{min-width:26px;text-align:center;font:700 18px "Pixelify Sans"}.pmL{font:700 14px "Pixelify Sans";opacity:.75;margin-right:4px}.pmX{opacity:.6;margin:0 4px}
#propModal .btn.pt{width:42px;height:38px;padding:0 0 3px;display:flex;align-items:center;justify-content:center}
#propModal .btn.ps{width:34px;height:32px;padding:0 0 3px;font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center}
#propModal .btn.pk{height:34px;padding:0 12px 3px;font-size:15px}
#propModal .btn.sel{background:#ffe08a;border-color:#1a1430;box-shadow:inset 0 -4px 0 #d39b2a}
#pmPal{display:grid;grid-template-columns:repeat(13,1fr);gap:4px}
#pmPal button,#pmPal label{aspect-ratio:1;border:2px solid #1a1430;border-radius:3px;padding:0;cursor:pointer;position:relative;overflow:hidden}
#pmPal .sel{outline:3px solid #ffd25e;outline-offset:1px;z-index:1}
#pmPal label{background:conic-gradient(#e4544f,#ffd25e,#5fc46f,#4a7bd0,#9a48ad,#e4544f)}#pmPal input{position:absolute;inset:0;opacity:0;width:100%;height:100%}
#pmName{flex:0 1 150px;min-width:0;font:600 15px "Pixelify Sans";padding:5px 8px;border:3px solid #1a1430;border-radius:5px}#propModal:not(.cos) #pmViews{display:none}#propModal.cos #pmSize,#propModal.cos #pmKindRow{display:none}#pmMsg:empty{display:none}#pmMsg{color:#c0392b}#pmMake{display:flex;align-items:center;justify-content:center;gap:6px}#pmMake img{width:14px;height:14px}
</style>`);
$('#pmPal').innerHTML=PM_COLS.map(c=>`<button data-c="${c}" style="background:${c}"></button>`).join('')+`<label title="Any colour"><input type="color" id="pmAny" value="#e4544f"></label><button id="pmCur" title="Your colour"></button>`;

function pmNew(w,h){const old=PM.px,ow=PM.w,oh=PM.h,px=new Array(w*h).fill(null);   /* a new size keeps the drawing, held by the middle of its bottom edge */
  if(old){const dx=Math.floor((w-ow)/2),dy=h-oh;for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<w&&ny<h)px[ny*w+nx]=old[y*ow+x];}}
  PM.w=w;PM.h=h;PM.px=px;$('#pmW').textContent=w;$('#pmH').textContent=h;pmDraw();}
function pmDraw(){const cv=$('#pmCv'),st=$('#pmStage'),k=Math.max(3,Math.floor(Math.min((st.clientWidth-12)/PM.w,(LAND?Math.max(140,innerHeight-74):Math.max(160,innerHeight*.36))/PM.h)));PM.k=k;
  cv.width=PM.w*k;cv.height=PM.h*k;const x=cv.getContext('2d');
  for(let y=0;y<PM.h;y++)for(let i=0;i<PM.w;i++){const c=PM.px[y*PM.w+i];x.fillStyle=c||((i+y)%2?'#3a3358':'#2c2647');x.fillRect(i*k,y*k,k,k);}   /* the checks are the see-through part */
  if(PM.mode==='cos'){const man=IMG['man/'+PM.view];if(man){x.imageSmoothingEnabled=false;x.globalAlpha=.5;x.drawImage(man,0,0,PM.w*k,PM.h*k);x.globalAlpha=1;}   /* the mannequin shows through where you have not drawn */
    for(let y=0;y<PM.h;y++)for(let i=0;i<PM.w;i++){const c=PM.px[y*PM.w+i];if(c){x.fillStyle=c;x.fillRect(i*k,y*k,k,k);}}}
  if(k>=5){x.fillStyle='rgba(255,255,255,.06)';for(let i=1;i<PM.w;i++)x.fillRect(i*k,0,1,cv.height);for(let y=1;y<PM.h;y++)x.fillRect(0,y*k,cv.width,1);}
  $('#pmCur').style.background=PM.col;$('#pmCur').classList.add('sel');
  $('#pmMake').innerHTML=makerOn()?'Create':'Unlock the maker · '+ic('coin',2)+' '+PROP_PRICE;$('#pmMake').disabled=PM.busy;paintCoins();}
const makerOn=()=>!!(typeof MK!=='undefined'&&MK.me.maker);
function pmSave(){PM.undo.push({w:PM.w,h:PM.h,px:PM.px.slice()});if(PM.undo.length>40)PM.undo.shift();}
function pmAt(e){const r=$('#pmCv').getBoundingClientRect();return[Math.floor((e.clientX-r.left)/r.width*PM.w),Math.floor((e.clientY-r.top)/r.height*PM.h)];}
function pmDo(x,y,first){if(x<0||y<0||x>=PM.w||y>=PM.h)return;const i=y*PM.w+x;
  if(PM.tool==='pick'){if(first&&PM.px[i]){PM.col=PM.px[i];pmTool('pen');}return;}
  if(PM.tool==='fill'){if(!first)return;const from=PM.px[i],to=PM.col;if(from===to)return;const st=[[x,y]];while(st.length){const[a,b]=st.pop();if(a<0||b<0||a>=PM.w||b>=PM.h||PM.px[b*PM.w+a]!==from)continue;PM.px[b*PM.w+a]=to;st.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]);}return;}
  PM.px[i]=PM.tool==='erase'?null:PM.col;}
function pmLine(x0,y0,x1,y1){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let k=0;k<=n;k++)pmDo(Math.round(x0+(x1-x0)*k/n),Math.round(y0+(y1-y0)*k/n),false);}
function pmTool(t){PM.tool=t;document.querySelectorAll('#pmTools [data-t]').forEach(b=>b.classList.toggle('sel',b.dataset.t===t));pmDraw();}
{const cv=$('#pmCv');
  cv.addEventListener('pointerdown',e=>{e.preventDefault();pmSave();PM.down=true;const[x,y]=pmAt(e);PM.lx=x;PM.ly=y;pmDo(x,y,true);pmDraw();try{cv.setPointerCapture(e.pointerId);}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!PM.down||PM.tool==='fill'||PM.tool==='pick')return;const[x,y]=pmAt(e);if(x===PM.lx&&y===PM.ly)return;pmLine(PM.lx,PM.ly,x,y);PM.lx=x;PM.ly=y;pmDraw();});
  for(const ev of['pointerup','pointercancel'])cv.addEventListener(ev,()=>{PM.down=false;});}
$('#pmTools').onclick=e=>{const b=e.target.closest('[data-t]');if(b){sfx('click');pmTool(b.dataset.t);}};
$('#pmUndo').onclick=()=>{const u=PM.undo.pop();if(!u)return;PM.w=u.w;PM.h=u.h;PM.px=u.px;if(PM.mode==='cos')PM.cos[PM.view]=PM.px;$('#pmW').textContent=u.w;$('#pmH').textContent=u.h;sfx('click');pmDraw();};
$('#pmPal').onclick=e=>{const b=e.target.closest('button[data-c]');if(!b)return;PM.col=b.dataset.c;if(PM.tool!=='fill')PM.tool='pen';pmTool(PM.tool);};
$('#pmAny').oninput=e=>{PM.col=e.target.value;if(PM.tool!=='fill')PM.tool='pen';pmTool(PM.tool);};
document.querySelectorAll('#propModal .ps').forEach(b=>b.onclick=()=>{const d=b.dataset.d,w=clamp(PM.w+(d==='w+'?8:d==='w-'?-8:0),8,48),h=clamp(PM.h+(d==='h+'?8:d==='h-'?-8:0),8,48);if(w===PM.w&&h===PM.h)return;pmSave();sfx('click');pmNew(w,h);});
function pmKind(){$('#pmFloor').classList.toggle('sel',!PM.wall);$('#pmWall').classList.toggle('sel',PM.wall);$('#pmSh').classList.toggle('sel',PM.sh&&!PM.wall);$('#pmSh').disabled=PM.wall;}
$('#pmFloor').onclick=()=>{PM.wall=false;sfx('click');pmKind();};$('#pmWall').onclick=()=>{PM.wall=true;sfx('click');pmKind();};$('#pmSh').onclick=()=>{PM.sh=!PM.sh;sfx('click');pmKind();};
function propOpen(mode){PM.undo=[];pmMode(mode==='cos'?'cos':'prop');$('#pmMsg').textContent='';pmKind();$('#propModal').classList.add('on');requestAnimationFrame(pmDraw);}
function cosmeticOpen(){propOpen('cos');}
/* prop <-> cosmetic: each keeps its own drawing (a cosmetic has one per view) */
function pmMode(m){if(PM.mode==='cos'&&PM.cos)PM.cos[PM.view]=PM.px;else if(PM.mode==='prop')PM.saved={w:PM.w,h:PM.h,px:PM.px};
  PM.mode=m;$('#propModal').classList.toggle('cos',m==='cos');$('#pmTitle').textContent=m==='cos'?'MAKE A COSMETIC':'MAKE A PROP';$('#pmModeP').classList.toggle('sel',m==='prop');$('#pmModeC').classList.toggle('sel',m==='cos');
  if(m==='cos'){if(!PM.cos)PM.cos={front:new Array(32*40).fill(null),right:new Array(32*40).fill(null),back:new Array(32*40).fill(null)};PM.w=32;PM.h=40;PM.px=PM.cos[PM.view];}
  else{const sv=PM.saved;PM.px=null;if(sv){PM.w=sv.w;PM.h=sv.h;PM.px=sv.px;}if(!PM.px){PM.w=32;PM.h=32;PM.px=new Array(32*32).fill(null);}$('#pmW').textContent=PM.w;$('#pmH').textContent=PM.h;}
  PM.undo=[];pmViewsPaint();pmDraw();}
function pmViewsPaint(){document.querySelectorAll('#pmViews [data-v]').forEach(b=>b.classList.toggle('sel',b.dataset.v===PM.view));$('#pmHead').classList.toggle('sel',PM.slot==='head');$('#pmBody').classList.toggle('sel',PM.slot==='body');}
$('#pmModeP').onclick=()=>{sfx('click');pmMode('prop');};$('#pmModeC').onclick=()=>{sfx('click');pmMode('cos');};
$('#pmViews').onclick=e=>{const b=e.target.closest('[data-v]');if(b&&PM.mode==='cos'){sfx('click');PM.cos[PM.view]=PM.px;PM.view=b.dataset.v;PM.px=PM.cos[PM.view];PM.undo=[];pmViewsPaint();pmDraw();}};
$('#pmHead').onclick=()=>{PM.slot='head';sfx('click');pmViewsPaint();};$('#pmBody').onclick=()=>{PM.slot='body';sfx('click');pmViewsPaint();};
$('#pmName').onkeydown=e=>e.stopPropagation();$('#pmName').onkeyup=e=>e.stopPropagation();
$('#pmX').onclick=()=>$('#propModal').classList.remove('on');
addEventListener('resize',()=>{if($('#propModal').classList.contains('on'))pmDraw();});
/* Create: unlock the maker once (7,500), then a prop is cropped to what was drawn, a cosmetic goes up as front|side|back (96 x 40) */
$('#pmMake').onclick=async()=>{if(PM.busy)return;
  if(!makerOn()){if(coins<PROP_PRICE){$('#pmMsg').textContent='You need '+PROP_PRICE+' coins.';sfx('nope');return;}
    PM.busy=true;const done=btnBusy($('#pmMake'),'Unlocking…');try{await mkOp('makerUnlock',{});MK.me.maker=1;sfx('rare');}catch(e){$('#pmMsg').textContent=e.message;}PM.busy=false;done();pmDraw();return;}
  const name=$('#pmName').value.trim().slice(0,16);let c,cos=PM.mode==='cos';
  if(cos){PM.cos[PM.view]=PM.px;if(!['front','right','back'].some(v=>PM.cos[v].some(Boolean))){$('#pmMsg').textContent='Draw something first.';return;}
    c=mk(96,40);const g=c.getContext('2d');['front','right','back'].forEach((v,n)=>{const px=PM.cos[v];for(let y=0;y<40;y++)for(let x=0;x<32;x++){const q=px[y*32+x];if(q){g.fillStyle=q;g.fillRect(n*32+x,y,1,1);}}});}
  else{let x0=99,y0=99,x1=-1,y1=-1;for(let y=0;y<PM.h;y++)for(let x=0;x<PM.w;x++)if(PM.px[y*PM.w+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    if(x1<0){$('#pmMsg').textContent='Draw something first.';return;}
    c=mk(x1-x0+1,y1-y0+1);const g=c.getContext('2d');for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const v=PM.px[y*PM.w+x];if(v){g.fillStyle=v;g.fillRect(x-x0,y-y0,1,1);}}}
  PM.busy=true;const done=btnBusy($('#pmMake'),'Creating…');$('#pmMsg').textContent='';const png=c.toDataURL('image/png');
  const finish=id=>{if(cos){MK.me.cos[id]=1;const im=new Image();im.onload=()=>{cosMake(id,im,PM.slot,name||'Cosmetic');PM.cos=null;PM.px=null;pmMode('cos');};im.src=png;}
    else{WALLET.dec=WALLET.dec||{};WALLET.dec[id]=1;decorNeed(id);PM.px=null;PM.saved=null;pmNew(PM.w,PM.h);}DESIGNS[id]={name:name||(cos?'Cosmetic':'Prop'),cos};sfx('rare');PM.busy=false;done();$('#pmName').value='';$('#propModal').classList.remove('on');
    wlSay(cos?'Made. Wear it from your Collection.':'Made. It is in your decorations.','good');if(window.DECOR&&DECOR.on)setTimeout(decorTray,400);};
  try{const r=await srv('propMake',{png,wall:PM.wall,sh:PM.sh,cos,slot:PM.slot,name});finish(r.id);}
  catch(e){if(typeof mkLocalOk!=='undefined'&&(mkLocalOk()||/Unknown action|Unlock the maker|48 by 48/i.test(e.message))&&typeof LABLOCAL!=='undefined'&&LABLOCAL){finish('@'+(NET.uid||'me')+':local'+Date.now());return;}   /* the local test lab, before the server has the new maker */
    PM.busy=false;done();pmDraw();$('#pmMsg').textContent=e.message;}};
