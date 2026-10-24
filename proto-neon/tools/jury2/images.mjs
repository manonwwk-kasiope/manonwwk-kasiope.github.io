import fs from 'node:fs';
import zlib from 'node:zlib';
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,buf){const t=Buffer.from(type),l=Buffer.alloc(4),c=Buffer.alloc(4);l.writeUInt32BE(buf.length);let crc=0xffffffff;for(const b of Buffer.concat([t,buf]))crc=table[(crc^b)&255]^(crc>>>8);c.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([l,t,buf,c]);}
export function png(w,h,rgb) {
  const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;
  const scan=Buffer.alloc(h*(w*3+1));for(let y=0;y<h;y++)rgb.copy(scan,y*(w*3+1)+1,y*w*3,(y+1)*w*3);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
}
export function tampon(i,file){const b=Buffer.from(i.buf,'base64'),pal=i.pal.map(s=>Buffer.from(s.slice(1),'hex')),rgb=Buffer.alloc(i.W*i.H*3);for(let k=0;k<b.length;k++)(pal[b[k]]||Buffer.alloc(3)).copy(rgb,k*3);fs.writeFileSync(file,png(i.W,i.H,rgb));return {...i,buf:undefined,rgb};}
/* Lit uniquement les PNG RGB filtre 0 produits ci-dessus, sans dépendance externe. */
export function lireTampon(i,file){const b=fs.readFileSync(file),ids=[];for(let o=8;o<b.length;){const n=b.readUInt32BE(o),t=b.toString('ascii',o+4,o+8);if(t==='IDAT')ids.push(b.subarray(o+8,o+8+n));o+=12+n;}const raw=zlib.inflateSync(Buffer.concat(ids)),rgb=Buffer.alloc(i.W*i.H*3);for(let y=0;y<i.H;y++){if(raw[y*(i.W*3+1)]!==0)throw Error('Filtre PNG inattendu');raw.copy(rgb,y*i.W*3,y*(i.W*3+1)+1,(y+1)*(i.W*3+1));}return {...i,rgb};}
export function planche(images,file){if(!images.length)return null;const cols=Math.min(4,images.length),tw=Math.max(...images.map(x=>x.W)),th=Math.max(...images.map(x=>x.H));const w=cols*tw,h=Math.ceil(images.length/cols)*th,rgb=Buffer.alloc(w*h*3);images.forEach((i,k)=>{for(let y=0;y<i.H;y++)i.rgb.copy(rgb,((Math.floor(k/cols)*th+y)*w+(k%cols)*tw)*3,y*i.W*3,(y+1)*i.W*3);});fs.writeFileSync(file,png(w,h,rgb));return {fichier:file,colonnes:cols,cellule:[tw,th],images:images.map(i=>({fichier:i.fichier,w:i.w,t:i.t,etat:i.etat}))};}
