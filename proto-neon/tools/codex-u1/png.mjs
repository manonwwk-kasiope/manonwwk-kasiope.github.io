import fs from 'node:fs';
import { deflateSync } from 'node:zlib';
function crc(b){let c=-1;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^-1)>>>0;}
function chunk(t,b){const n=Buffer.alloc(4),c=Buffer.alloc(4),a=Buffer.from(t);n.writeUInt32BE(b.length);c.writeUInt32BE(crc(Buffer.concat([a,b])));return Buffer.concat([n,a,b,c]);}
export function png(f,w,h,buf,palette,scale=1){
 const W=w*scale,H=h*scale,head=Buffer.alloc(13);head.writeUInt32BE(W);head.writeUInt32BE(H,4);head[8]=8;head[9]=3;
 const raw=Buffer.alloc((W+1)*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)raw[y*(W+1)+x+1]=buf[Math.floor(y/scale)*w+Math.floor(x/scale)];
 const pal=Buffer.from(palette.flatMap(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]));
 fs.writeFileSync(f,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('PLTE',pal),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
