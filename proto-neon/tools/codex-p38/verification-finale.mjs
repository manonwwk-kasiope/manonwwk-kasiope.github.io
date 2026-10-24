// Audit des livrables et des reçus existants ; aucune partie, aucun navigateur relancé.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sources} from './vm.mjs';
import {corriger} from './raccords.mjs';
import {sha,jeu} from './rejouer.mjs';
const here=new URL('./',import.meta.url),lire=n=>JSON.parse(fs.readFileSync(new URL(n,here))),manifest=lire('manifeste.json'),recu=lire('sources-recues.json'),b=lire('bilan.json'),p=lire('parties80-assemble.json');
assert.deepEqual(sources(),recu,'Source réservée modifiée depuis la mesure');
assert.equal(sha(recu),manifest.sourcesSha256);assert.equal(sha(corriger(recu)),manifest.candidateSha256);
assert.equal(sha(fs.readFileSync(new URL('../../index.html',here))),manifest.bundles.avant);
for(const phase of ['avant','apres'])assert.equal(sha(fs.readFileSync(new URL('bundle-'+phase+'.html',here))),manifest.bundles[phase]);
assert.equal(b.VM.calibration,10);assert.equal(b.VM.total,30);assert.equal(b.VM.apres,30);assert.equal(b.VM.erreursMax,0);
assert.equal(p.cas.length,80);assert.equal(p.identiques,p.cas.filter(c=>c.identique).length);
for(const c of b.VM.cas){
  const r=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(c.variantes.apres.journaux,here))));
  const signature=J=>jeu(J).map(e=>[e.pas,e.t,e.type,e.d]);
  assert.deepEqual(signature(r.dessine.journal),signature(r.simule.journal));
  assert.equal(r.dessine.err.count+r.simule.err.count,0);
}
const preuves=[];
for(const c of p.cas)for(const phase of ['avant','apres']){
  const r=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(c[phase].fichier,here))));
  assert.equal(sha(r.journal),r.journalSha256);assert.equal(r.err.count,0);assert.equal(r.erreursConsole.length,0);
  assert.equal(r.sourcesSha256,p.sources[phase]);preuves.push({fichier:c[phase].fichier,sha256:sha(fs.readFileSync(new URL(c[phase].fichier,here))),journalSha256:r.journalSha256,raison:r.raison});
}
execFileSync('git',['apply','--check',fileURLToPath(new URL('raccord-79-jeu.js.patch',here)),fileURLToPath(new URL('raccord-50-fx.js.patch',here))]);
execFileSync('git',['diff','--check']);
for(const fichier of fs.readdirSync(here).filter(f=>f.endsWith('.mjs')))execFileSync(process.execPath,['--check',fileURLToPath(new URL(fichier,here))]);
const suivis=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
assert.ok(suivis.every(f=>['proto-neon/refonte/lots/demandes.md','proto-neon/tools/mesure/criteres/R-30-rejouabilite.mjs'].includes(f)),suivis.join('\n'));
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesReserveesInchangees:true,bundlesSynchronises:true,build:{sortie:0,preuve:'build.log',sha256:manifest.bundles.avant},syntaxesEtPatchs:true,fichiersSuivisModifies:suivis,recusVerifies:preuves.length,preuves,VM:{total:30,identiques:30},recusR30Verifies:30,nonRegression:{total:80,identiques:p.identiques,arretsAvantFin:b.parties80.arrets},palierValide:b.palierValide,navigateur:'À vérifier hors bac ; script complet non exécuté ici.',reseauSortant:'Aucune connexion sortante utilisée.'};
fs.writeFileSync(new URL('verification-finale.json',here),JSON.stringify(sortie,null,2)+'\n');console.log({recus:preuves.length,VM:30,nonRegression:p.identiques,sourcesReserveesInchangees:true});
