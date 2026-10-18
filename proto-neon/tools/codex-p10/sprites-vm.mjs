import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {sources,monde} from './vm.mjs';
const src=sources(),avant=src.map(([f,s])=>[f,f==='40-sprites.js'?fs.readFileSync(new URL('avant/'+f,import.meta.url),'utf8'):s]);
const WA=monde(avant),WB=monde(src),A=WA.N,B=WB.N,cas=[];
for(let d=0;d<16;d++)for(let f=0;f<3;f++){
 const a=A.spr.get('tete',d,f),b=B.spr.get('tete',d,f);let cyanAjoute=0,detailsModifies=0;
 assert.deepEqual([b.w,b.h,b.cx,b.cy],[a.w,a.h,a.cx,a.cy]);
 for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){
  const i=y*b.w+x,v=b.data[i],old=a.data[i];
  if((v===7||v===8)&&v!==old)cyanAjoute++;
  if(x>0&&y>0&&x<b.w-1&&y<b.h-1&&old&&v!==old)detailsModifies++;
 }
 assert.equal(cyanAjoute,0);assert.equal(detailsModifies,0);
 cas.push({direction:d,animation:f,w:b.w,h:b.h,cx:b.cx,cy:b.cy,cyanAjoute,detailsModifies,sha256:crypto.createHash('sha256').update(b.data).digest('hex')});
}
const autres=[];
for(const nom of ['corps','corps:7','corps:5','corps:3','queue','tir','chevron','fleche','tourelle','sentinelle','mine','rival','butin'])for(let f=0;f<B.spr.frames(nom);f++){
 const a=A.spr.make(nom,f),b=B.spr.make(nom,f);assert.deepEqual([b.w,b.h,Array.from(b.data)],[a.w,a.h,Array.from(a.data)]);autres.push({nom,animation:f,identique:true});
}
assert.equal(WA.c.__ERR.count,0);assert.equal(WB.c.__ERR.count,0);
fs.writeFileSync(new URL('sprites.json',import.meta.url),JSON.stringify({cas,autres,errA:WA.c.__ERR,errB:WB.c.__ERR},null,2)+'\n');console.log('48 têtes : boîte/ancrage/détails cyan préservés ;',autres.length,'autres sprites identiques');
