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
/* the Mafia's top hat as a silhouette (18 Nov, his ask: "look more like the silhouette of our mafia hat"): tall crown, red band, wide brim, like the Mafia outfit */
/* the UFO's abduct button (21 Nov) */
/* the Getaway Car's lift button (21 Nov) */
/* the Godfather's car button: a steering wheel, wooden rim, chrome spokes (21 Nov) */
steer:['..KKKKKK..','.KOOOOOOK.','KOOKKKKOOK','KOK....KOK','KOSSSSSSOK','KOKKSSKKOK','KOK.SS.KOK','KOOKSSKOOK','.KOOOOOOK.','..KKKKKK..'],
car:[E,'..KKKKK...','.KLLKLLK..','.KLLKLLK..','KKKKKKKKKK','KhhhhhhhGK','KhhhhhhhhK','KKSKKKKSKK','.KSK..KSK.',E],
ufo:[E,'...KKKK...','..KLEELK..','.KKLEELKK.','KSSSSSSSSK','KsGsNsGsNK','.KKKKKKKK.','..L.LL.L..','.L..LL..L.',E],
tophat:[E,'..KKKKKK..','..KhhhhK..','..KhHhhK..','..KhhhhK..','..KRRRRK..','..KrrrrK..','KKKKKKKKKK','KhhhhhhhhK','.KKKKKKKK.'],
/* Blackjack's buttons (18 Nov, drawn by hand on his note: the PixelLab ones "suck, make new simple ones yourself") */
bjhit:['.KKKKKK...','.KWWWWK...','.KWRRWK...','.KWRRWK...','.KWWWWK...','.KWWWWKKK.','.KWWWKKEKK','.KWWWKEEEK','.KKKKKKEKK','......KKK.'],
bjdouble:['......KKK.','.....KRRRK','.....KrWrK','.....KRRRK','.KKK.KrWrK','KBBBKKRRRK','KbWbKKrWrK','KBBBKKRRRK','KbWbKKrWrK','.KKK..KKK.'],
bjsplit:['KKKK..KKKK','KWWK..KWWK','KWRK..KWRK','KWWK..KWWK','KWWK..KWWK','KKKK..KKKK',E,'.K......K.','KKKK..KKKK','.K......K.'],
mafia:[E,'...KKKK...','..KIHHhK..','..KHHHhK..','..KTRRrK..','.KKhhhhKK.','KIHHHHHHhK','KhhhhhhhhK','.KKKKKKKK.',E],
doctor:[E,'...KKKK...','...KFEK...','.KKKEEKKK.','.KFEEEEeK.','.KEEEEeeK.','.KKKEeKKK.','...KeeK...','...KKKK...',E],
civilian:['....KK....','...KTRK...','..KTRRRK..','.KRRRRRrK.','KKKKKKKKKK','.KPPPPPpK.','.KPLLPopK.','.KPLLPopK.','.KKKKKKKK.',E],
detective:['..KKKK....','.KSSSSK...','KSLWLLSK..','KSWLLLSK..','KSLLLLSK..','KSLLLBSK..','.KSSSSKK..','..KKKKOUK.','.......KOK','........KK'],
jester:['..KK..KK..','.KJVKKFEK.','KJVVVEEEEK','KVVVVEEEeK','KVKvvEeKeK','KVKKKKKKeK','KvK....KeK','.K......K.','KGK....KGK','.K......K.'],
bodyguard:[E,'.KKKKKKKK.','.KYGGGggK.','.KGWGGggK.','.KGGGGggK.','.KGGGgggK.','..KGGggK..','...KggK...','....KK....',E],
dice:['.KKKKKKKK.','KWWWWWWWSK','KWKWWWWKSK','KWWWWWWWSK','KWWWKKWWSK','KWWWKKWWSK','KWWWWWWWSK','KWKWWWWKSK','KSSSSSSSsK','.KKKKKKKK.'],
framer:[E,'.KKKKKKKK.','KNMMMMMMMK','KMKKMMKKMK','KMKKMMKKMK','KMMMMMMMmK','KMKMMMMKmK','.KMKKKKmK.','..KmmmmK..','...KKKK...'],
eye:[E,E,'..KKKKKK..','.KWWWWWWK.','KWWBLKBWSK','KWWBKKBWSK','.KSWWWSSK.','..KKKKKK..',E,E],
eyeoff:[E,'.......KR.','..KKKKKR..','.KWWWKRWK.','KWWBKRBWSK','KWWKRKBWSK','.KKRWWSSK.','.KRKKKKK..','KR........',E],
/* the prop maker's tools (18 Nov 2026) */
eraser:['..........','.....KKK..','....KTTTK.','...KTTTTTK','..KTTTTTK.','.KWWTTTK..','KWWWWTK...','.KWWWK....','..KKK.....','KKKKKKKKK.'],
bucket:['....KK....','...K..K...','..KKKKKK..','.KSSSSSSK.','.KSWSSSSKB','.KSSSSSSKB','.KSSSSSsKB','..KSSSsK.B','...KKKK...','..........'],
dropper:['.......KK.','......KssK','.....KKsK.','....KLKK..','...KLLK...','..KLLK....','.KLLK.....','.KLK......','KBK.......','.K........'],
undo:['..........','...K......','..KK......','.KGKKKK...','KGGGGGGK..','.KGKKKGGK.','..KK..KGK.','...K..KGK.','.....KGK..','....KKK...'],
/* turn a decoration to face another way (18 Nov 2026) */
turn:['..........','...KKKK...','..KBBBBK.K','.KBKKKKBKK','.KBK..KBBK','.KK..KBBBK','.....KKKKK','.KBK......','.KBBKKKBK.','..KBBBBK..'],
/* a bin: take a decoration away (18 Nov 2026) */
bin:['...KKKK...','.KKKKKKKK.','.KSSSSSSK.','.KKKKKKKK.','..KSsSsK..','..KSsSsK..','..KSsSsK..','..KSsSsK..','..KSSSSK..','..KKKKKK..'],
/* a pencil for Edit (18 Nov 2026) */
pencil:['.......KK.','......KTRK','.....KRRrK','....KGGGK.','...KGGGK..','..KGGgK...','.KPpgK....','.KPpK.....','.KKK......','..........'],
// the slot machine's reel symbols, 16 by 16, drawn by hand (18 Nov 2026)
slot7:["................", "..KKKKKKKKKKKK..", "..KTTTTTTTTTRK..", "..KRRRRRRRRRrK..", "..KKKKKKKKRRrK..", ".........KRRrK..", "........KRRrK...", "........KRRrK...", ".......KRRrK....", ".......KRRrK....", "......KRRrK.....", "......KRRrK.....", ".....KTRRrK.....", ".....KRRrrK.....", ".....KKKKKK.....", "................"],
slotbar:["................", "................", "................", ".KKKKKKKKKKKKKK.", ".KHHHHHHHHHHHHK.", ".KWWhhhWhhWWhhK.", ".KWhWhWhWhWhWhK.", ".KWWhhWWWhWWhhK.", ".KWhWhWhWhWhWhK.", ".KWWhhWhWhWhWhK.", ".KhhhhhhhhhhhhK.", ".KKKKKKKKKKKKKK.", "................", "................", "................", "................"],
slotbell:[".......KK.......", "......KGGK......", ".....KKYGKK.....", "....KYYGGGgK....", "...KYGGGGGGgK...", "...KYGGGGGGgK...", "...KYGGGGGGgK...", "..KYGGGGGGGGgK..", "..KYGGGGGGGGgK..", ".KYGGGGGGGGGGgK.", ".KGGGGGGGGGGggK.", "KKKKKKKKKKKKKKKK", "KgggggggggggggaK", ".KKKKKKKKKKKKKK.", "......KggK......", ".......KK......."],
slotlemon:["................", "................", "......KKKK......", "....KKYYGGKK....", "...KYYGGGGGgK...", "..KYGGGGGGGGgK..", ".KGYGGGGGGGGGgK.", "KGGGGGGGGGGGGggK", "KgGGGGGGGGGGGggK", ".KgGGGGGGGGGGgK.", "..KgGGGGGGGggK..", "...KggGGGgggK...", "....KKggggKK....", "......KKKK......", "................", "................"],
slothat:["................", "................", "....KKKKKKKK....", "....KHHhhhhK....", "....KHhhhhhK....", "....KHhhhhhK....", "....KHhhhhhK....", "....KHhhhhhK....", "....KRRRRRRK....", "....KrrrrrrK....", ".KKKKKKKKKKKKKK.", "KHHhhhhhhhhhhhhK", "KhhhhhhhhhhhhhhK", ".KKKKKKKKKKKKKK.", "................", "................"],
slotknife:[".......KK.......", "......KSWK......", "......KSWK......", "......KSWK......", "......KSWK......", "......KSWK......", "......KSWK......", "......KSWK......", "...KKKKSWKKKK...", "...KggggggggK...", "...KKKKooKKKK...", "......KooK......", "......KooK......", "......KooK......", "......KGGK......", ".......KK......."],
slotcherry:["..........KKK...", "..........EEEK..", ".........eEEEEK.", "........e.eKKK..", "........e.e.....", ".......e...e....", ".......e...e....", "......e...KKKK..", "....KKKK.KRRRRK.", "...KWRRRKRWRRRRK", "..KRRRRRKRRRRRrK", "..KRRRRRKRRRRrrK", "..KRRRRrKKRRrrKK", "...KRRrrKKKrrKK.", "....KKKK..KKKK..", "................"],
// 16 by 16, the size of the Shop's stall and the Collection's shirt: the lobby's Coin flip and Daily buttons (16 Nov). coinbig is the wallet's coin (same chunky ring, glint and sheen) on a rounder outline, his call.
coinbig:['................','.....KKKKKK.....','....KGGGYYYK....','...KGGGGGGGYK...','..KGGAAAAAAGYK..','..KGAAAAAAAaYK..','.KGGAAGGYYAaGGK.','.KGGAAGGGYAaGGK.','.KGGAAGGGGAaGGK.','.KGGAAGGGGAaGGK.','..KYAAAAAAAaGK..','..KYGaaaaaaGGK..','...KYGGGGGGGK...','....KYYYGGGK....','.....KKKKKK.....','................'],
giftbig:['................','....KK....KK....','...KGGK..KGGK...','...KGYGKKGGgK...','....KKGGGGKK....','.KKKKKKGGKKKKKK.','KTRRRRRGYRRRRRrK','KRRRRRRGGRRRRRrK','KKKKKKKGGKKKKKKK','.KTRRRRGYRRRRrK.','.KRRRRRGGRRRRrK.','.KRRRRRGGRRRRrK.','.KRRRRRGGRRRrrK.','.KrrrrrggrrrrrK.','.KKKKKKKKKKKKKK.','................'],
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
left:[E,'......KK..','....KKGK..','..KKGGGK..','.KGGGGGK..','.KgggggK..','..KKgggK..','....KKgK..','......KK..',E],   /* (25 Nov) the right arrow mirrored: the folded menu button */
check:[E,'........KK','.......KFK','......KFEK','.KK..KEEK.','KFEKKEEK..','KEEEEeK...','.KEeeK....','..KKK.....',E],
cross:[E,'.KK....KK.','KTRK..KTRK','.KRRKKRRK.','..KRRRRK..','..KRRrrK..','.KRrKKrrK.','KRrK..KrrK','.KK....KK.',E],
google:['...RRRR...','.RRRRRRRR.','RRR....RR.','GG........','GG...BBBBB','GG...BBBBB','EE......BB','EEE....BBB','.EEEEEEBB.','...EEEE...'],
bag:['................','.KKKKKKKKKKKKKK.','KRRRWWWRRWWWRRRK','KRRRWWWRRWWWRRRK','KrrrSSSrrSSSrrrK','.KrKKSKKKKSKKrK.','..KOhhhhhhhhOK..','..KOhhhhhhhhOK..','..KOhhhhhhhhOK..','.KKKKKKKKKKKKKK.','.KPPPPPPPPPPPPK.','.KOOOOGGGGOOOOK.','.KOOOOGYGGOOOOK.','.KooooggggooooK.','.KKKKKKKKKKKKKK.','................'],
shirt:['................','....KK....KK....','...KLBK..KBBK...','..KKLBBKKBBBKK..','.KLBBBBBBBBBBBK.','KLBBBBBBBBBBBBbK','KBBBBBBBBBBBBbbK','.KKKBBBBBBBbKKK.','...KBBBBBBBbK...','...KBBBBBBBbK...','...KBBBBBBBbK...','...KBBBBBBbbK...','...KbbbbbbbbK...','...KKKKKKKKKK...','................','................'],
help:[E,'...KKKK...','..KWWWSK..','.KWWKKWSK.','.KKK.KWSK.','....KWSK..','...KWSK...','...KKKK...','...KWSK...','...KKKK...'],
sound:[E,'....KK....','...KSK.L..','.KKSSK..L.','.KWSsK.L.L','.KSSsK.L.L','.KKssK..L.','...KsK.L..','....KK....',E],
/* a person: the player list (18 Nov 2026) */
players:['...PPPP...','..PPPPPP..','..PPPPPP..','..pPPPPp..','...pppp...',E,'.PPPPPPPP.','PPPPPPPPPP','PPPPPPPPPP','pppppppppp'],
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
/* THE COIN IS HIS OWN ART (27 Nov 2026, his ask: "replace all of the coin icons in the game" with mafia2-art/NEW-COIN.png, 20 x 19, kept here as a 20 x 20 picture
   and at assets/icons/coin.png). 'coin' and 'coinbig' both show it, always at a whole number of screen pixels per art pixel (20, 40, 60...) so it stays crisp.
   The old grid 'coin' above is still there for anything that reads the grids. */
const ART={coin:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAABtUlEQVR42q2Uv0sCYRjHv6dHCacmFVJDkpPW0BA6BA0NDdLUJI3R4FhTg2t/gGD/RNLUIE4NgkKEZ1AK4eKFS3n+4DhR8ECu4bjX9z3vtKhne++e9/N+n58cFtiaP6zT554qcfP8uUUguZTBRCiQ75v7j3PBnBPo8+UYAOAeizOXxHc/Ti5atmDOCpOUJoTaA8DfzE3FZDkG91hE8EBhoBwNk0sZBlTMLtnCjq405kxDeeZVoQD3eAqLJsK2wGJWItBWJQBAIf9cdKim5dO6IwwAookw8mmj+KG4AvF2m+SeKPQ0U6QA3o1lctl3egdPM0XOnbcB5TMNvT/0GTncWdnSX6sJAqNDNWHWSn81IgAATW0jFFdI6LHLD7hknbdtDavqRRaKK+gPfUYOzRet9lOYqXBVGMDVUyVu7/yZaQm+U3Nsm25ZY1TR4fZUieNpx/VDA1CvehFNGNUsZiVLhSMzypiiMI39FGCa2q51NLXNqOuWNexej+wbu1UJEEejcRtEgTVM0+pVL4CR8yzfnwVtx4udlGlukznZfpat28YJbMKSOXnxtpkHphX9ah/+dWP/u30DySLRzs5V+g4AAAAASUVORK5CYII='};ART.coinbig=ART.coin;const ART_N=20;
/* HIS MENU ICONS (27 Nov 2026: mafia2-art/buttons/*-icon-stroke.png, his versions with a dark outline, also at assets/buttons/ic-*.png): shop, collection, rewards, coin, social, and his pencil (decorate / edit).
   Each is cut to its own drawing and shown at 3 screen pixels a dot (2 at the smallest scale), the game's own pixel size, like his buttons. */
const ART16={aShop:{u:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAKCAYAAACALL/6AAAA7UlEQVR42n2OsUoDQRRFz2iwENJt4sZCYrELoqRKF6tBqxR+gF+gP5R/0MpWxSpgkQVBLGSLJCi46KaJASMBuSnijIqrBwbm3TfnzTOScNQq8VfxjSxPjS8kIYkwiDS1LY0nbz/O1LYUBpHcuyU3edCo8heDRtX/bsIgUma3eR/lzM4uCoWVg30ANm9fKAGcd3uL9W76hYK5H37eVjGSqFViHTU/6CTLhYLrZXlqSi5s2zowLBTatk4neQTAC+PXGbvNdQDs8SGMrrk66fuewwvd5MmHW73TXxks1jWSiHf2mDw/iH8or22Y9O6SOemRbTIdFpkYAAAAAElFTkSuQmCC',w:12,h:10},aColl:{u:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAKCAYAAACALL/6AAAArklEQVR42mP8//8/AwxIiqr9Z2BgYHj++hYjNj4DAwMDC7JivWO3UDQi82GaGP///w9XfPMFRLO6BISG8UW/vmR4EmvL8Pz1LUZGCRFVFMW4AM/uowxvpycyMDEQAQSvXmX4++YLA4qTGBgYGNjX3cJQLPz4HsOzfA8GmOeZGBgYGHjF5Rhxmf7v03cGZDUEnfTv608UPgu6x9DBXzQ+XAOvuBzj2+mJ/7HZguxkAMhmSoQzOdJ3AAAAAElFTkSuQmCC',w:12,h:10},aRewards:{u:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAsElEQVR42o2POwrCUBBFz5OAWNhESdpYuAl3INa2WYBg517sLNyDlVsQJVEQbGLhh6gpFAsjwlgEH3lgIAcGLndOMYOI8BvH9uRfFhFM6TQWx/Yknw3RWOxGkobDLIe+lpWI4DZaArCfd1GfB+/nHYB2fwNAnERKObYnsd9DM6jB6wKTuq7c6QwLgNuV9HgAoEoHgDRYkadCSUqLFsB6EeiiuV1m15wTQzS+LiJOIvUFT+l2a8+0L94AAAAASUVORK5CYII=',w:10,h:10},aCoin:{u:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAvklEQVR42mWQsQqCUBSGvyON2VSYEG669AQtEfQE7UJza3MP4tDYawjh0hzhcttCMJCWcL8NctOrZzrn8PH/5z+itcaUP4vaASgrJaYfdaGyUvBO6O0EQLTWzeJxhM+tK0hd5ITxl7JSIvNp2CjlewBUlgIQrbcW7AB/O5WlRIeCaHeiLnJL3aFf72RwghXG2NX3MwDjxdIC2zDX1UClG2YE4HqB+Jubfl4mFhjGX1wvEMva9QIJ45f1cAMB/AC51lDnXExHKgAAAABJRU5ErkJggg==',w:10,h:10},aSocial:{u:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAkElEQVR42o2QMQ7CMAxFXyKOkEqUnYqTVOodek8YOARjlQM0oGSBpWKgZnLVQCR4m/2fLctGRACoq0YAQvSmVG+0Gfo2H1jVIXpjtm4voW95Pe4A2GniebuiDGOiSzOWFZ9Slv0jLeLldOYXRkSoq0aOznLYuSzU+0L0xuoLujQzjKkoLRsV3Qxk0pdYerTyBvIeXNrrQedPAAAAAElFTkSuQmCC',w:10,h:10},aPencil:{u:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAApklEQVR42nXOMQrCQBBA0b/BKrYG3UKskjPYpLD3AGJjYSlY5D4WniZFMIiNELCQIEFWiaCmEtZCWEV2pxqGB3+E1hrbyCDSAJUqxHC0oOVC+Xhp9koVwrOhapcgkwyANJ4ig0h7NsQlhecZmWS8mjvAN/2PaHd5lHvizQ2TdqFw9kEAotcJ9WE9we8fnQjA/NiUAycycL6qqa+K09a3IpP+PdgQwBtEeWKg7Ig7VAAAAABJRU5ErkJggg==',w:10,h:10}};
const URLS={};
function url(name){
  if(ART[name])return ART[name];if(URLS[name])return URLS[name];
  const g=ICONS[name],c=document.createElement('canvas');c.width=c.height=g.length;   // most icons are 10 by 10; the newer shaded ones are 16 by 16
 const x=c.getContext('2d');
  g.forEach((row,y)=>[...row].forEach((ch,i)=>{if(ch==='.')return;x.fillStyle=PAL[ch]||'#f0f';x.fillRect(i,y,1,1);}));
  return URLS[name]=c.toDataURL();
}
// ic('lock') -> an <img> at button size; ic('skull',3) for headings; pass 'solo' or 'after' as the third argument
// for an icon on its own, or one that comes after its label
window.ic=function(name,scale,cls){const s=Math.max(2,scale||2);
  if(ART16[name]){const A=ART16[name],k=s>=3?3:2;return `<img class="ic${cls?' '+cls:''}" src="${A.u}" width="${A.w*k}" height="${A.h*k}" alt="">`;}
  if(!ICONS[name])return'';
  if(ART[name]){const want=ICONS[name].length>GRID?ICONS[name].length*Math.max(1,s-1):GRID*s,px=want<=24?20:want<=34?30:ART_N*Math.round(want/ART_N);   /* (his note) 40 was too big on the small buttons: those slots get 30. Big ones stay whole multiples (40, 60) */
    return `<img class="ic${cls?' '+cls:''}" src="${ART[name]}" width="${px}" height="${px}" alt="">`;}
  const n=ICONS[name].length,px=n>GRID?Math.max(1,s-1):s;   // a 16-grid icon at scale 3 is 32px (2px pixels), beside 30px for the 10-grid ones
  return `<img class="ic${cls?' '+cls:''}" src="${url(name)}" width="${n*px}" height="${n*px}" alt="">`;};
window.M2_ICONS=ICONS;window.M2_PAL=PAL;window.M2_COIN=ART.coin;
})();
