/* Vraie fonction R-18 inchangée ; chaque profil est exécuté dans une VM sans DOM.
   Les observations d'appels du critère sont complétées par les pixels finaux. */
import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';import {mesurer,meta} from '../mesure/criteres/R-18-ecran-de-fin.mjs';
import {encodeIndex} from '../mesure/png.mjs';import {observerFin,installerTrace} from './scenarios.mjs';
const out=[];
for(const phase of ['8f55a91','p17','recu','apres'])for(const [profil,viewport]of [['paysage',[844,390]],['portrait',[390,844]],['bureau',[1440,900]]]){
 const src=phase==='8f55a91'||phase==='p17'?sources(phase==='p17'?'318ce61':phase):sources();
 if(phase==='recu')src.find(([f])=>f==='80-ecrans.js')[1]=fs.readFileSync(new URL('avant/80-ecrans.js',import.meta.url),'utf8');
 const w=monde(src,new Map(),viewport),{N,S,c}=w;
 S.view.safe=profil==='paysage'?{l:24,r:24,t:0,b:10}:profil==='portrait'?{l:0,r:0,t:23,b:17}:{l:0,r:0,t:0,b:0};N.outils.geom();
 vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',import.meta.url),'utf8'),c);
 vm.runInContext('('+installerTrace.toString()+')()',c);S.phase='play';N.journal.actif(true);N.horloge.avancer();
 function evaluer(fn){return vm.runInContext(typeof fn==='string'?fn:'('+fn.toString()+')()',c);}
 function peindre(){N.gfx.origin(0,0);N.gfx.clear(0);N.game.draw();N.game.drawTop();N.ui.draw();}
 async function images(n){for(let i=0;i<n;i++){N.game.dbg.simuler(1/60);peindre();}return true;}
 const session={pret:true,eval:async fn=>JSON.parse(JSON.stringify(evaluer(fn))??'null'),absents:async names=>c.__MESURE.absents(names),images,scene:async(n,o={})=>{N.intro.skip();const ok=N.game.dbg.scene(n)!==false;await images(o.images||0);return {ok};},capture:async()=>null};
 const res={phase,profil,meta,mesures:[],notes:[],verifie(nom,valeur,seuil,ok,extra){this.mesures.push({nom,valeur,seuil,ok,...extra});},indicatif(nom,valeur,seuil,ok){this.verifie(nom,valeur,seuil,ok,{indicatif:true});},note(n){this.notes.push(n);},capture(){},nonMesurable(nom,raison){this.mesures.push({nom,raison,ok:false});},absent(nom,raison){this.nonMesurable(nom,raison);}};
 await mesurer({ouvrir:async()=>session},res);
 peindre();res.pixels=JSON.parse(JSON.stringify(evaluer(observerFin)));res.err=c.__ERR;res.journal=N.journal.dump();res.sourceSha256=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');res.ok=res.mesures.length===12&&res.mesures.every(m=>m.ok);
 fs.mkdirSync(new URL('tampon-vm/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('tampon-vm/'+phase+'-'+profil+'-r18.png',import.meta.url),encodeIndex(N.gfx.W,N.gfx.H,N.gfx.buf(),N.pal.C.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))),N.gfx.PX));
 out.push(res);fs.writeFileSync(new URL('r18.json',import.meta.url),JSON.stringify({limite:'VM sans DOM, pas une capture navigateur. Critère R-18 inchangé, complété par état/pixels/journal.',cas:out},null,2));console.log(phase,profil,res.mesures.filter(m=>m.ok).length+'/12',res.pixels.ok,res.pixels.lignes.filter(l=>!l.dansZone||!l.pixels).map(l=>l.texte));
}
assert.ok(out.filter(c=>['8f55a91','apres'].includes(c.phase)).every(c=>c.ok));assert.ok(out.filter(c=>c.phase==='apres').every(c=>c.pixels.ok));
