// Même fonction mesurer que la batterie ; adaptateur VM et horloge construite, sans DOM/réseau.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';import {mesurer} from '../mesure/criteres/R-19-attraction.mjs';
const sorties=[];
for(const mode of ['avant','apres','jamais','tropTot','tropTard']){
 const src=sources();for(const name of ['80-ecrans.js','02-regles.js','79-jeu.js'])if(mode==='avant')src.find(([n])=>n===name)[1]=fs.readFileSync(new URL('avant/'+name,import.meta.url),'utf8');
 if(mode!=='avant')src.find(([n])=>n==='79-jeu.js')[1]=fs.readFileSync(new URL('79-jeu-candidat.js',import.meta.url),'utf8');
 if(mode==='tropTot'||mode==='tropTard')src.find(([n])=>n==='79-jeu.js')[1]=src.find(([n])=>n==='79-jeu.js')[1].replace('etT >= R.ecrans.attraction.attente','etT >= '+(mode==='tropTot'?13:17));
 const w=monde(src);w.S.phase='play';let ms=0;
 const lire=fn=>vm.runInContext(typeof fn==='string'?fn:'('+fn.toString()+')()',w.c);
 const avancer=s=>{if(mode==='jamais')w.N.ui.update(s);else w.N.game.dbg.simuler(s);ms+=s*1000;w.N.gfx.origin(0,0);w.N.gfx.clear(0);w.N.game.draw();w.N.game.drawTop();w.N.ui.draw();};
 const session={pret:true,eval:async fn=>JSON.parse(JSON.stringify(lire(fn))??'null'),absents:async names=>names.filter(n=>!n.split('.').reduce((o,k)=>o?.[k],{N:w.N,S:w.S})),attendre:async(fn,arg,max)=>{const debut=ms;while(ms-debut<max){if(lire(fn))return true;avancer(.05);}return !!lire(fn);},capture:async()=>null,page:{waitForTimeout:async millis=>avancer(millis/1000)}};
 const result={mode,mesures:[],notes:[],captures:[],verifie(nom,valeur,seuil,ok,extra){this.mesures.push({nom,valeur,seuil,ok,...extra});},note(n){this.notes.push(n);},capture(){},nonMesurable(nom,raison){this.mesures.push({nom,raison,ok:false});},absent(nom,a){throw Error(nom+':'+a);}};
 await mesurer({ouvrir:async()=>session},result,()=>ms);sorties.push(result);
 fs.writeFileSync(new URL('instrument.json',import.meta.url),JSON.stringify(sorties,null,2));console.log(mode,result.mesures.map(m=>[m.nom,m.valeur,m.ok]));
 if(mode==='apres')assert.ok(result.mesures.every(m=>m.ok));
 else if(mode!=='avant')assert.equal(result.mesures[0].ok,false);
}
