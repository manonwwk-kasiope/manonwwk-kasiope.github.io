// Tampon de la VM, pas une capture navigateur. Palette et pixels des vraies sources.
import fs from 'node:fs';import {deflateSync} from 'node:zlib';import {sources,monde} from './vm.mjs';
const H=new URL('./',import.meta.url),src=sources();
function crc(b){let c=-1;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^-1)>>>0;}
function chunk(t,b){const n=Buffer.alloc(4),c=Buffer.alloc(4),a=Buffer.from(t);n.writeUInt32BE(b.length);c.writeUInt32BE(crc(Buffer.concat([a,b])));return Buffer.concat([n,a,b,c]);}
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const {c,N,S}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;N.game.dbg.scene('calme');for(let f=0;f<3;f++)c.frame(f*1000/60);const g=N.gfx,b=g.buf(),head=Buffer.alloc(13);head.writeUInt32BE(g.W);head.writeUInt32BE(g.H,4);head[8]=8;head[9]=3;
 const raw=Buffer.alloc((g.W+1)*g.H);for(let y=0;y<g.H;y++)raw.set(b.subarray(y*g.W,(y+1)*g.W),y*(g.W+1)+1);const pal=Buffer.from(N.pal.C.flatMap(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]));
 fs.writeFileSync(new URL('tampon-vm-'+profil+'.png',H),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('PLTE',pal),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
