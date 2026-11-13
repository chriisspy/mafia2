// MAFIA 2 pixel icons. Each is drawn on a 10 by 10 grid, so at button size (20px) one icon pixel is 2px,
// the same as the game's own pixels. Never show one below scale 2. The review sheet (icons.html) carries
// its own copy of these grids because it has to be a single file; change both together.
(function(){
const PAL={K:'#1a1430',W:'#ffffff',P:'#f6dfae',p:'#e9c88a',R:'#e4544f',r:'#a92b2c',G:'#ffd25e',g:'#d39b2a',Y:'#fff2a8',
  B:'#4a7bd0',b:'#2b4a8a',L:'#9fd0ff',E:'#5fc46f',e:'#2f7a3f',S:'#b8c2d4',s:'#6f7b92',H:'#5a5290',h:'#3b3468',
  O:'#c58a4a',o:'#7a4a2a',T:'#ff9a8f',F:'#9be8a4',I:'#8a80c8',U:'#e0b074',J:'#c77fdc',N:'#ffaed0',A:'#d18a2e',a:'#b5651d',V:'#9a48ad',v:'#5e2a86',M:'#f07ab0',m:'#b8457e'};
// Drawn on a 10 by 10 grid. At button size one icon pixel is 2px, the same as the game's own pixels.
const GRID=10,E='..........';
const ICONS={
mafia:[E,'...KKKK...','..KIHHhK..','..KHHHhK..','..KTRRrK..','.KKhhhhKK.','KIHHHHHHhK','KhhhhhhhhK','.KKKKKKKK.',E],
doctor:[E,'...KKKK...','...KFEK...','.KKKEEKKK.','.KFEEEEeK.','.KEEEEeeK.','.KKKEeKKK.','...KeeK...','...KKKK...',E],
civilian:['....KK....','...KTRK...','..KTRRRK..','.KRRRRRrK.','KKKKKKKKKK','.KPPPPPpK.','.KPLLPopK.','.KPLLPopK.','.KKKKKKKK.',E],
detective:['..KKKK....','.KSSSSK...','KSLWLLSK..','KSWLLLSK..','KSLLLLSK..','KSLLLBSK..','.KSSSSKK..','..KKKKOUK.','.......KOK','........KK'],
jester:['..KK..KK..','.KJVKKFEK.','KJVVVEEEEK','KVVVVEEEeK','KVKvvEeKeK','KVKKKKKKeK','KvK....KeK','.K......K.','KGK....KGK','.K......K.'],
bodyguard:[E,'.KKKKKKKK.','.KYGGGggK.','.KGWGGggK.','.KGGGGggK.','.KGGGgggK.','..KGGggK..','...KggK...','....KK....',E],
dice:['.KKKKKKKK.','KWWWWWWWSK','KWKWWWWKSK','KWWWWWWWSK','KWWWKKWWSK','KWWWKKWWSK','KWWWWWWWSK','KWKWWWWKSK','KSSSSSSSsK','.KKKKKKKK.'],
framer:[E,'.KKKKKKKK.','KNMMMMMMMK','KMKKMMKKMK','KMKKMMKKMK','KMMMMMMMmK','KMKMMMMKmK','.KMKKKKmK.','..KmmmmK..','...KKKK...'],
eye:[E,E,'..KKKKKK..','.KWWWWWWK.','KWWBLKBWSK','KWWBKKBWSK','.KSWWWSSK.','..KKKKKK..',E,E],
rain:[E,'...KKK....','.KKWWWKK..','KWWWWWWWK.','KSSSSSSsK.','.KKKKKKK..',E,'.L..L..L..','B..B..B...',E],
moon:['...KKKK...','..KYGGK...','.KYGGK....','.KGGK...Y.','.KGGK..YGY','.KGGK...Y.','.KGGgK....','..KGggK...','...KKKK...',E],
sun:['....GG....','.G......G.','...KKKK...','..KYYGGK..','G.KYGGGK.G','G.KGGGgK.G','..KGGggK..','...KKKK...','.G......G.','....GG....'],
notes:[E,'.KKKKKKK..','.KWWWWWKK.','.KWssWWPK.','.KWWWWWWK.','.KWssssWK.','.KWWWWWWK.','.KWsssWSK.','.KKKKKKKK.',E],
lock:['...KKKK...','..KSWSSK..','..KSKKsK..','.KKKKKKKK.','.KYGGGGgK.','.KGGKKGgK.','.KGGKKGgK.','.KggggggK.','.KKKKKKKK.',E],
binoculars:[E,'.KKK..KKK.','KSSsKKSSsK','KSSsKKSSsK','KSSSssSSsK','KKKKKKKKKK','KLLBKKLLBK','KLWBKKLWBK','.KKK..KKK.',E],
mute:[E,'....KK....','...KSK.R.R','.KKSSK..R.','.KWSsK.R.R','.KSSsK....','.KKssK....','...KsK....','....KK....',E],
fist:[E,'....KKKK..','..KKTRRRK.','.KTRRRWRRK','.KRRRRRRRK','.KRRKRRRrK','.KRRRKKrrK','..KRrrrrK.','..KWWWSK..','..KKKKKK..'],
hand:['..K.K.K...','.KPKPKPK..','.KPKPKPK..','.KPKPKPKK.','.KPPPPPKPK','.KPPPPPPPK','.KPPPPPPpK','.KPPPPPppK','..KPPPppK.','...KKKKK..'],
note:['....KKKKK.','....KWWSK.','....KWKKK.','....KWK...','....KWK...','..KKKWK...','.KWWWSK...','.KWSSSK...','..KKKK....',E],
wheel:['...KKKK...','.KKRRGGKK.','.KRRRGGGK.','KBBRRGGEEK','KBBBKKEEEK','KVVVKKYYYK','KVVMMOOYYK','.KMMMOOOK.','.KKMMOOKK.','...KKKK...'],
phone:['..KKKKKK..','..KWWWWK..','..KWWWWK..','..KWWWWK..','..KWWWWK..','..KWWWWK..','..KWWWWK..','..KKKKKK..','..KKGGKK..','..KKKKKK..'],
mystery:['...KKKK...','..KKKKKK..','.KKKWWKKK.','.KKWKKWKK.','KKKKKKWKKK','KKKKKWKKKK','.KKKWKKKK.','.KKKKKKKK.','..KKWKKK..','...KKKK...'],
hanger:['....KK....','...K..K...','......K...','....KKK...','...KOOOK..','..KOKKKOK.','.KOK...KOK','KOOKKKKKOK','KKKKKKKKKK',E],
skull:['..KKKKKK..','.KWWWWWSK.','KWWWWWWWSK','KWKKWWKKSK','KWKKWWKKSK','KWWWKKWSSK','.KSWWWSSK.','..KWKKSK..','..KKKKKK..',E],
ghost:['..KKKKKK..','.KWWWWWSK.','KWWWWWWWSK','KWKKWWKKSK','KWKKWWKKSK','KWWWWWWWSK','KWWWKKWWSK','KWWWWWWSSK','KWKKSKKSSK','KK..K..KK.'],
bat:[E,'K........K','KK.K..K.KK','KHKKIHKKHK','KIHHHHHHhK','KHHRHHRHhK','.KHHHHhhK.','..KhKKhK..','...K..K...',E],
spider:['K...KK...K','.K.KIHK.K.','..KIHHHK..','KKKHRRHKKK','..KHHHhK..','.KKHHhhKK.','K..KhhK..K','...KKKK...','..K....K..',E],
boo:['..KKK.KKK.','..KTK.KTK.','..KRK.KRK.','..KRK.KRK.','..KrK.KrK.','..KKK.KKK.',E,'..KKK.KKK.','..KRK.KRK.','..KKK.KKK.'],
heart:[E,'.KKK..KKK.','KTRRKKRRRK','KTWRRRRRrK','KRRRRRRRrK','.KRRRRRrK.','..KRRrrK..','...KrrK...','....KK....',E],
coin:['...KKKK...','.KKGGYYKK.','.KGGGGGYK.','KGGAAaAGGK','KGAAGYAAGK','KGAAGGAAGK','KGGaAAAGGK','.KYGGGGGK.','.KKYGGGKK.','...KKKK...'],
chat:[E,'.KKKKKKKK.','KWWWWWWWSK','KWKWKWKWSK','KWWWWWWSSK','.KKKWSKKK.','...KSK....','...KK.....',E,E],
vote:['...KKKK...','...KWWK...','...KRWK...','KKKKWWKKKK','KOOKKKKOOK','KUOOOOOOoK','KOOOOOOOoK','KooooooooK','KKKKKKKKKK',E],
knife:['....KK....','...KSWK...','...KSWK...','...KSWK...','...KSWK...','.KKKSWKKK.','.KggggggK.','.KKKooKKK.','...KooK...','...KKKK...'],
door:['.KKKKKKKK.','.KUOOOOoK.','.KOKKKKoK.','.KOKooKoK.','.KOKKKKoK.','.KOOOOGoK.','.KOKKKKoK.','.KOKooKoK.','.KOKKKKoK.','.KKKKKKKK.'],
right:[E,'..KK......','..KGKK....','..KGGGKK..','..KGGGGGK.','..KgggggK.','..KgggKK..','..KgKK....','..KK......',E],
check:[E,'........KK','.......KFK','......KFEK','.KK..KEEK.','KFEKKEEK..','KEEEEeK...','.KEeeK....','..KKK.....',E],
cross:[E,'.KK....KK.','KTRK..KTRK','.KRRKKRRK.','..KRRRRK..','..KRRrrK..','.KRrKKrrK.','KRrK..KrrK','.KK....KK.',E],
google:['...RRRR...','.RRRRRRRR.','RRR....RR.','GG........','GG...BBBBB','GG...BBBBB','EE......BB','EEE....BBB','.EEEEEEBB.','...EEEE...'],
bag:['................','.KKKKKKKKKKKKKK.','KRRRWWWRRWWWRRRK','KRRRWWWRRWWWRRRK','KrrrSSSrrSSSrrrK','.KrKKSKKKKSKKrK.','..KOhhhhhhhhOK..','..KOhhhhhhhhOK..','..KOhhhhhhhhOK..','.KKKKKKKKKKKKKK.','.KPPPPPPPPPPPPK.','.KOOOOGGGGOOOOK.','.KOOOOGYGGOOOOK.','.KooooggggooooK.','.KKKKKKKKKKKKKK.','................'],
shirt:['................','....KK....KK....','...KLBK..KBBK...','..KKLBBKKBBBKK..','.KLBBBBBBBBBBBK.','KLBBBBBBBBBBBBbK','KBBBBBBBBBBBBbbK','.KKKBBBBBBBbKKK.','...KBBBBBBBbK...','...KBBBBBBBbK...','...KBBBBBBBbK...','...KBBBBBBbbK...','...KbbbbbbbbK...','...KKKKKKKKKK...','................','................'],
help:[E,'...KKKK...','..KWWWSK..','.KWWKKWSK.','.KKK.KWSK.','....KWSK..','...KWSK...','...KKKK...','...KWSK...','...KKKK...'],
sound:[E,'....KK....','...KSK.L..','.KKSSK..L.','.KWSsK.L.L','.KSSsK.L.L','.KKssK..L.','...KsK.L..','....KK....',E],
menu:[E,'.PPPPPPPP.','.pppppppp.',E,'.PPPPPPPP.','.pppppppp.',E,'.PPPPPPPP.','.pppppppp.',E],
crossk:[E,'.KK....KK.','KKKK..KKKK','.KKKKKKKK.','..KKKKKK..','..KKKKKK..','.KKKKKKKK.','KKKK..KKKK','.KK....KK.',E],
skip:[E,E,'KK...KK...','KGKK.KGKK.','KGGGKKGGGK','KgggKKgggK','KgKK.KgKK.','KK...KK...',E,E],
sleep:['....BBBBBB','........BB','.......BB.','......BB..','.....BB...','....BBBBBB','BBBB......','..BB......','.BB.......','BBBB......'],
hourglass:['KKKKKKKKKK','.KWWWWWWK.','.KWGGGGWK.','..KWGGWK..','...KWWK...','...KWGK...','..KWWGWK..','.KWGGGGWK.','.KWGGGGWK.','KKKKKKKKKK'],
case:[E,'...KKKK...','...K..K...','KKKKKKKKKK','KUOOOOOOoK','KKKKYGKKKK','KOOOGgoooK','KooooooooK','KKKKKKKKKK',E],
rec:[E,E,'...KKKK...','..KTRRRK..','..KRWRRK..','..KRRRrK..','..KRrrrK..','...KKKK...',E,E],
};
// the other three arrows are the right arrow, turned
ICONS.left=ICONS.right.map(r=>[...r].reverse().join(''));
ICONS.down=ICONS.right.map((_,y)=>ICONS.right.map(r=>r[y]).join(''));
ICONS.up=[...ICONS.down].reverse();
const URLS={};
function url(name){
  if(URLS[name])return URLS[name];
  const g=ICONS[name],c=document.createElement('canvas');c.width=c.height=g.length;   // most icons are 10 by 10; the newer shaded ones are 16 by 16
 const x=c.getContext('2d');
  g.forEach((row,y)=>[...row].forEach((ch,i)=>{if(ch==='.')return;x.fillStyle=PAL[ch]||'#f0f';x.fillRect(i,y,1,1);}));
  return URLS[name]=c.toDataURL();
}
// ic('lock') -> an <img> at button size; ic('skull',3) for headings; pass 'solo' or 'after' as the third argument
// for an icon on its own, or one that comes after its label
window.ic=function(name,scale,cls){const s=Math.max(2,scale||2);if(!ICONS[name])return'';
  const n=ICONS[name].length,px=n>GRID?Math.max(1,s-1):s;   // a 16-grid icon at scale 3 is 32px (2px pixels), beside 30px for the 10-grid ones
  return `<img class="ic${cls?' '+cls:''}" src="${url(name)}" width="${n*px}" height="${n*px}" alt="">`;};
window.M2_ICONS=ICONS;
})();
