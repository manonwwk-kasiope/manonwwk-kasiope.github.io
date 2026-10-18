// Contrôle algorithmique des primitives, sans Canvas : ne remplace pas l'identité des images navigateur.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';
const old=JSON.parse(fs.readFileSync(new URL('sources-avant.json',import.meta.url))), src=sources();
const a=monde({...src,'10-gfx.js':old['10-gfx.js']}),b=monde(src);
for(const m of [a,b]){m.N.gfx.resize(160,120);m.N.gfx.masque(true);m.N.gfx.owner(9);}
let seed=16;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const trames=[NaN,-1,0,1,2,...Array.from({length:65},(_,i)=>i/64)];
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:0,octetsDifferents:0,masquesDifferents:0};
for(let i=0;i<1400;i++) {
  const x=rand()*140-30,y=rand()*100-20,ox=rand()*40-20,oy=rand()*40-20,t=trames[i%trames.length];
  const r0=Math.round(rand()*60-2),r1=Math.round(rand()*60-2),w=rand()*120-10,h=rand()*100-10;
  for(const [nom,args] of [['ditherRect',[x,y,w,h,5,t]],['ditherCirc',[x,y,r1,11,t]],['disc',[x,y,r0,r1,12,t]]]) {
    for(const m of [a,b]){m.N.gfx.origin(ox,oy);m.N.gfx.clear(3);m.N.gfx[nom](...args);}
    assert.deepEqual(Buffer.from(a.N.gfx.buf()),Buffer.from(b.N.gfx.buf()),nom+' '+i+' '+JSON.stringify(args));
    assert.deepEqual(Buffer.from(a.N.gfx.mask()),Buffer.from(b.N.gfx.mask()),'masque '+nom+' '+i);
    out.cas++;
  }
}
fs.writeFileSync(new URL('primitives.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(out);
