// Contrôle ciblé du modèle public final : réutilisation de S.ecran.retour, déjà au contrat.
import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';import {sources,monde}from './vm.mjs';import {observerAttraction}from '../mesure/criteres/R-19-attraction.mjs';
const src=sources();src.find(([n])=>n==='79-jeu.js')[1]=fs.readFileSync(new URL('79-jeu-candidat.js',import.meta.url),'utf8');const w=monde(src);w.N.game.reset(17,{depart:'titre'});w.N.game.dbg.simuler(15.05);const cas=[];
for(let i=0;i<36*4;i++){
 w.N.game.dbg.simuler(.25);w.N.gfx.origin(0,0);w.N.gfx.clear(0);w.N.game.draw();w.N.game.drawTop();w.N.ui.draw();
 const m=w.S.ecran.retour;if(cas.some(c=>c.volet===m.volet))continue;
 const schema=w.N.ids.valider('ecran',w.S.ecran),preuve=JSON.parse(JSON.stringify(vm.runInContext('('+observerAttraction.toString()+')(N,__S)',w.c)));
 const c={volet:m.volet,schema,preuve};cas.push(c);assert.equal(schema.length,0);assert.equal(preuve.err,0);assert.ok(preuve.lignes.every(l=>l.pixels>0&&l.dansZone));
}
assert.equal(cas.length,4);fs.writeFileSync(new URL('modele.json',import.meta.url),JSON.stringify({cas},null,2));console.log(cas.map(c=>({volet:c.volet,schema:c.schema})));
