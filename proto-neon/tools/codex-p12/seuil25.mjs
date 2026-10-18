/* Ne rejoue que les branches modifiées par le passage du premier seuil de 40 à 25.
   Toutes les autres parties sur profil vierge ont exactement les mêmes options de fin. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {sources,monde,jouer,ROOT} from './vm.mjs';
const dir=ROOT+'/tools/codex-p12/',corpus=JSON.parse(fs.readFileSync(dir+'apres-80.json'));
assert.equal(corpus.cas.length,80);
fs.writeFileSync(dir+'apres-80-seuil40.json',JSON.stringify(corpus,null,2));
const src=sources(),nouveau=monde(src).N.R.defis.retour.seuils[0];assert.equal(nouveau,25);
const cibles=corpus.cas.filter(r=>r.energie>=nouveau&&r.energie<40),preuves=[];
for(const ancien of cibles){
 const r=jouer(monde(src,new Map(),[844,390],ancien.graine),ancien.pilote,ancien.graine);
 for(const k of ['tempsJeu','tempsCombat','vague','score','energie','raison'])assert.equal(r[k],ancien[k],k);
 assert.equal(r.err,0);assert.equal(r.erreurs.length,0);assert.ok(r.resume.debloques.includes('ralenti'));
 corpus.cas[corpus.cas.findIndex(x=>x.pilote===r.pilote&&x.graine===r.graine)]=r;
 preuves.push({pilote:r.pilote,graine:r.graine,energie:r.energie,tempsJeu:r.tempsJeu,vague:r.vague,score:r.score,debloques:r.resume.debloques,err:r.err});
}
const metadata={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),raison:'raccord du premier seuil 40 → 25 ; seulement les parties fraîches dont le déblocage de fin change',sourceFinaleSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),preuves};
corpus.revalidationSeuil25=metadata;fs.writeFileSync(dir+'apres-80.json',JSON.stringify(corpus,null,2));fs.writeFileSync(dir+'revalidation-seuil25.json',JSON.stringify(metadata,null,2));console.log(JSON.stringify(metadata.preuves));
