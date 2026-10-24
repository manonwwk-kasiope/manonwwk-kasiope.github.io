// Contrôle après application d'une candidate : seulement des nombres, jamais les pilotes ou seuils.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {ICI,ROOT} from './vm.mjs';
const config=JSON.parse(fs.readFileSync(process.argv[2]));
const fichier='proto-neon/src/02-regles.js';
const avant=execFileSync('git',['show','85b389d:'+fichier],{cwd:ROOT,encoding:'utf8'});
const apres=fs.readFileSync(path.join(ROOT,'src/02-regles.js'),'utf8');
const sansNombres=s=>s.replace(/\b\d+(?:\.\d+)?\b/g,'#');
assert.equal(sansNombres(apres),sansNombres(avant),'Autre chose que les nombres a changé');
const charger=s=>{const c={window:{__N:{}}};vm.runInNewContext(s,c);return c.window.__N.R;};
const A=charger(avant),B=charger(apres),changements=[];
function comparer(a,b,p=''){
  if(typeof a==='function'){assert.equal(a.toString(),b.toString(),'Formule modifiée : '+p);return;}
  if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),'Structure modifiée : '+p);for(const k of Object.keys(a))comparer(a[k],b[k],p?p+'.'+k:k);return;}
  if(a!==b){assert.equal(typeof a,'number');assert.equal(typeof b,'number');changements.push({chemin:p,avant:a,apres:b});}
}
comparer(A,B);
const get=(o,k)=>k.split('.').reduce((v,c)=>v[c],o);
for(const [k,v] of Object.entries(config.valeurs))assert.equal(get(B,k),v,'Candidate non appliquée : '+k);
for(const c of changements)assert.equal(c.apres,config.valeurs[c.chemin],'Changement hors candidate : '+c.chemin);
for(const k of ['pilotes','criteres','mort','vies'])assert.equal(JSON.stringify(A[k]),JSON.stringify(B[k]),'Invariant ou seuil modifié : '+k);
assert.equal(JSON.stringify(A.scene.budgets),JSON.stringify(B.scene.budgets));assert.equal(B.mort.morsure.effet,'coupe');
assert.equal(Object.isFrozen(B),true);assert.equal(Object.isFrozen(B.secteurs[0].vagues),true);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const depart=JSON.parse(fs.readFileSync(path.join(ICI,'sources-depart.json')));
const autresSources=depart.sources.filter(s=>s.f!=='02-regles.js').map(s=>({f:s.f,identique:sha(fs.readFileSync(path.join(ROOT,'src',s.f)))===s.sha256}));
assert.ok(autresSources.every(s=>s.identique),'Autre module modifié');
const preuve={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),candidate:config.numero,changements,autresSources,
  chiffresSeulement:true,formulesInchangees:true,pilotesEtSeuilsInchanges:true,morsure:'coupe',gelProfond:true,
  sourceReglesSha256:sha(apres),bundleSha256:sha(fs.readFileSync(path.join(ROOT,'index.html')))};
fs.writeFileSync(path.join(ICI,'verification-source.json'),JSON.stringify(preuve,null,2)+'\n');
console.log(JSON.stringify({candidate:config.numero,nombresChanges:changements.length,autresSourcesInchangees:autresSources.length}));
