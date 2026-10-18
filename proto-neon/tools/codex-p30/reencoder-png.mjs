// Corrige uniquement l'encodage RGB des PNG de diagnostic initiaux ; indices conservés.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
import {monde,sources,ICI} from './vm.mjs';import {encodeIndex} from '../mesure/png.mjs';
const pal=monde(sources()).N.pal.C.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
let n=0;
for(const d of fs.readdirSync(path.join(ICI,'pixels-vm')))for(const f of fs.readdirSync(path.join(ICI,'pixels-vm',d))){
 if(!f.endsWith('.png'))continue;const p=path.join(ICI,'pixels-vm',d,f),b=fs.readFileSync(p),chunks=[];let at=8,w,h;
 while(at<b.length){const len=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8),data=b.subarray(at+8,at+8+len);if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);}if(type==='IDAT')chunks.push(data);at+=len+12;}
 const raw=zlib.inflateSync(Buffer.concat(chunks)),idx=new Uint8Array(w*h);for(let y=0;y<h;y++){if(raw[y*(w+1)]!==0)throw Error('Filtre inattendu');idx.set(raw.subarray(y*(w+1)+1,(y+1)*(w+1)),y*w);}
 fs.writeFileSync(p,encodeIndex(w,h,idx,pal));n++;
}
console.log(n+' PNG réencodés, indices inchangés');
