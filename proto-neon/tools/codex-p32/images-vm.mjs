// Export de vrais tampons, sans DOM ; ce ne sont pas des captures de navigateur.
import fs from 'node:fs';import vm from 'node:vm';import {deflateSync} from 'node:zlib';import {sources,monde} from './vm.mjs';import {installer} from './sonde.mjs';
const H=new URL('./',import.meta.url);fs.mkdirSync(new URL('pixels-vm/',H),{recursive:true});
function crc(b){let c=-1;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^-1)>>>0;}
function chunk(t,b){const n=Buffer.alloc(4),c=Buffer.alloc(4),a=Buffer.from(t);n.writeUInt32BE(b.length);c.writeUInt32BE(crc(Buffer.concat([a,b])));return Buffer.concat([n,a,b,c]);}
const preuves=[];
for(const version of (process.argv.includes('--apres')?['apres']:['avant','apres'])){const src=version==='avant'?JSON.parse(fs.readFileSync(new URL('avant/sources.json',H))):sources();
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const phase of [1,2,3]){
 const {N,c,S}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;c.__p32step=()=>c.frame((c.__FRAME||0)*1000/60);
 vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',H),'utf8'),c);installer(c);c.__P32.preparer(phase);N.decor.fixer('eclipse','colosse');
 const g=N.gfx;g.clear(0);N.outils.geom();N.decor.drawFar();N.decor.drawPlateau();N.decor.drawFront();N.outils.origineMonde();N.colosse.draw();N.colosse.drawTop();
 const b=g.buf(),head=Buffer.alloc(13);head.writeUInt32BE(g.W);head.writeUInt32BE(g.H,4);head[8]=8;head[9]=3;
 const raw=Buffer.alloc((g.W+1)*g.H);for(let y=0;y<g.H;y++)raw.set(b.subarray(y*g.W,(y+1)*g.W),y*(g.W+1)+1);
 const pal=Buffer.from(N.pal.C.flatMap(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)])),nom=version+'-'+profil+'-phase'+phase;
 fs.writeFileSync(new URL('pixels-vm/'+nom+'.png',H),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('PLTE',pal),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
 fs.writeFileSync(new URL('pixels-vm/'+nom+'.bin',H),Buffer.from(b));fs.writeFileSync(new URL('pixels-vm/'+nom+'-masque.bin',H),Buffer.from(g.mask()));preuves.push({version,profil,phase,w:g.W,h:g.H,analyse:c.__MESURE.analyseCourante({gaine:true}),err:c.__ERR});
}}
fs.writeFileSync(new URL('pixels-vm/index.json',H),JSON.stringify(preuves,null,2)+'\n');
