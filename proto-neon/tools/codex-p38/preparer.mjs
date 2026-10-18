// Génération reviewable des patchs ; aucun module src écrit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sources} from './vm.mjs';
import {corriger} from './raccords.mjs';
import {sha} from './rejouer.mjs';
const here=new URL('./',import.meta.url),lire=n=>JSON.parse(fs.readFileSync(new URL(n,here)));
const avant=lire('sources-recues.json'),apres=corriger(avant);
assert.deepEqual(sources(),avant,'Sources reçues modifiées depuis la mesure : rebaser avant livraison');
new vm.Script('"use strict";(function(){var N={};'+Object.values(apres).join('\n')+'\n})();');
for(const f of ['79-jeu.js','50-fx.js']) {
  const a=new URL('temp-avant.txt',here),b=new URL('temp-apres.txt',here);fs.writeFileSync(a,avant[f]);fs.writeFileSync(b,apres[f]);
  let patch='';try{execFileSync('diff',['-u','--label','a/proto-neon/src/'+f,'--label','b/proto-neon/src/'+f,fileURLToPath(a),fileURLToPath(b)],{encoding:'utf8'});}catch(e){if(e.status!==1)throw e;patch=e.stdout;}
  fs.writeFileSync(new URL('raccord-'+f+'.patch',here),patch);fs.unlinkSync(a);fs.unlinkSync(b);
}
const html=fs.readFileSync(new URL('../../index.html',here),'utf8');
let candidate=html;
for(const f of ['79-jeu.js','50-fx.js']) {assert.equal(candidate.split(avant[f]).length,2,'bundle non synchronisé : '+f);candidate=candidate.replace(avant[f],()=>apres[f]);}
fs.writeFileSync(new URL('bundle-avant.html',here),html);fs.writeFileSync(new URL('bundle-apres.html',here),candidate);
const manifeste={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesSha256:sha(avant),candidateSha256:sha(apres),bundles:{avant:sha(html),apres:sha(candidate)},modules:Object.fromEntries(Object.entries(avant).map(([f,s])=>[f,{avant:sha(s),apres:sha(apres[f])}])),correctifs:['raccord-79-jeu.js.patch','raccord-50-fx.js.patch']};
fs.writeFileSync(new URL('manifeste.json',here),JSON.stringify(manifeste,null,2)+'\n');
console.log('Deux patchs préparés ; syntaxe candidate valide ; sources réservées intactes.');
