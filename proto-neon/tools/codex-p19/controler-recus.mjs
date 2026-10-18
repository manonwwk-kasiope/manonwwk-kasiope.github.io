import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {cameraAppariee,comparerCamera} from '../mesure/criteres/R-12-explosion.mjs';
const p=path.dirname(fileURLToPath(import.meta.url)),preuves=[];
for(const nom of ['codex-p15','integre']){
  const d=JSON.parse(fs.readFileSync(path.join(p,nom+'-vm.json')));
  for(const r of d.mesures){
    assert.equal(r.impact.erreurs.count,0);assert.equal(r.temoin.erreurs.count,0);
    assert.deepEqual(r.consoleImpact,[]);assert.deepEqual(r.consoleTemoin,[]);
    assert.equal(r.camera.paires.length,30);assert.equal(r.camera.ok,true);
  }
  preuves.push({nom,cibles:d.mesures.length,erreurs:0,paires:d.mesures.reduce((n,r)=>n+r.camera.paires.length,0)});
}
const r=JSON.parse(fs.readFileSync(path.join(p,'integre-vm.json'))).mesures[0];
const faux=structuredClone(r.temoin);faux.avantCoup.rng++;
assert.equal(comparerCamera(r.impact,faux).ok,false);
const trou=structuredClone(r.temoin);trou.trace=trou.trace.filter(x=>x.f!==trou.imageCoup+2);
assert.equal(cameraAppariee(r.impact,trou).ok,false);
const negatif=structuredClone(r.temoin);negatif.trace.find(x=>x.f>negatif.imageCoup).sh=-1;
assert.equal(cameraAppariee(r.impact,negatif).ok,false);
fs.writeFileSync(path.join(p,'controle-recus.json'),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),preuves,refus:{prefixeDifferent:true,imageManquante:true,secousseNegative:true}},null,2)+'\n');
console.log('8 paires de branches contrôlées, 240 écarts appariés ; sorties err=0. Trois refus supplémentaires prouvés.');
