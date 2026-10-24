import fs from 'node:fs';import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';import {installer,compter} from './sonde.mjs';
const cfg=JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url)));assert.ok(cfg.valide);
const src=sources(), avant=src.map(([f,s])=>[f,f==='50-fx.js'?fs.readFileSync(new URL('avant/'+f,import.meta.url),'utf8'):s]);
function gel(src){
 const {c,N,S}=monde(src);installer(c);const P=c.__P10,images=[];N.journal.actif(true);N.journal.vider();let admis=0;
 for(let f=0;f<120;f++){
  S.frame++;N.fx.update(0);N.gfx.clear(0);
  if(f%2===1&&N.fx.flashGate(N.gfx.W*N.gfx.H,{type:'test-gel',ci:N.pal.i('os')})){admis++;N.gfx.clear(N.pal.i('os'));}
  images.push(P.lire(f));
 }
 return {admis,pixels:compter(images),journal:N.journal.dump(),err:c.__ERR};
}
const ancien=gel(avant),corrige=gel(src);assert.ok(ancien.pixels.maxParSeconde>3);assert.ok(corrige.pixels.maxParSeconde<=3);assert.equal(corrige.err.count,0);
function pression(src){
 const {c,N,S}=monde(src);N.journal.actif(true);N.journal.vider();N.fx.setFlash(true);
 const aire=N.gfx.W*N.gfx.H;
 for(let f=0;f<600;f++){S.frame++;N.fx.update(1/60);for(let k=0;k<8;k++)N.fx.flashGate(aire,{type:'test-pression',ci:N.pal.i('brasier')});if(f%60===0)N.fx.reset();}
 const j=N.journal.lire('flash'),acc=j.filter(e=>e.d._compte);let max=0;
 for(let i=0,k=0;i<acc.length;i++){while(acc[i].d._temps-acc[k].d._temps>=1)k++;max=Math.max(max,i-k+1);}
 for(const e of j)assert.deepEqual(Array.from(N.ids.valider('journal:flash',e)),[]);
 assert.equal(j.length,4800);assert.ok(max<=3);assert.equal(c.__ERR.count,0);
 return {demandes:j.length,admisNouveaux:acc.length,maxParSeconde:max,refuses:j.filter(e=>!e.d.accepte).length,err:c.__ERR};
}
// Une union L/R ne doit pas doubler un éclair, quatre éclairs restent un échec.
const images=Array.from({length:60},()=>({up:0,dn:0,rin:0,rout:0}));for(const f of [1,10,20,30]){images[f]={up:1,dn:0,rin:1,rout:0};images[f+1]={up:0,dn:1,rin:0,rout:1};}assert.equal(compter(images).maxParSeconde,4);
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),gel:{avant:ancien,apres:corrige},pression:pression(src),instrument:{quatreFlashs:compter(images)}};
fs.writeFileSync(new URL('limiteur.json',import.meta.url),JSON.stringify(resultat,null,2)+'\n');console.log('gel',ancien.pixels.maxParSeconde,'→',corrige.pixels.maxParSeconde,'; pression',resultat.pression);
