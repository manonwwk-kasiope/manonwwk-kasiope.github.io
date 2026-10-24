import fs from 'node:fs';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {sources} from './vm.mjs';
import {corriger} from './raccords.mjs';
import {rejouer,jeu,comparer,sha} from './rejouer.mjs';
const here=new URL('./',import.meta.url),save=(n,r)=>fs.writeFileSync(new URL(n,here),JSON.stringify(r,null,2)+'\n');
assert.ok(JSON.parse(fs.readFileSync(new URL('calibration.json',here))).cas.length>=10);
assert.ok(JSON.parse(fs.readFileSync(new URL('calibration.json',here))).cas.every(r=>r.identique));
const src=fs.existsSync(new URL('sources-recues.json',here))?JSON.parse(fs.readFileSync(new URL('sources-recues.json',here))):sources();save('sources-recues.json',src);save('sources-candidate.json',corriger(src));
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesSha256:sha(src),candidateSha256:sha(corriger(src)),limite:'VM : vraie frame et vrai tampon indexé, aucun DOM, aucun Canvas/CRT ni Safari.',cas:[]};
const profils=[['paysage',844,390],['portrait',390,844],['bureau',1440,900]];
const nombre=Number(process.argv[2]||10);
fs.mkdirSync(new URL('journaux/',here),{recursive:true});
for(const [profil,width,height] of profils) for(let graine=1;graine<=nombre;graine++) {
  const cas={profil,graine,variantes:{}};
  for(const [nom,code] of [['avant',src],...(graine===7?[['camera',corriger(src,'camera')]]:[]),['apres',corriger(src)]]) {
    const cached=new URL(`journaux/${profil}-${graine}-${nom}.json.gz`,here);
    const precedent=fs.existsSync(cached)?JSON.parse(zlib.gunzipSync(fs.readFileSync(cached))):null;
    const d=precedent?.dessine||rejouer(code,{graine,width,height}),s=precedent?.simule||rejouer(code,{graine,width,height,simulation:true});
    const comparaison=comparer(jeu(d.journal),jeu(s.journal));
    const fichier=`journaux/${profil}-${graine}-${nom}.json.gz`;
    fs.writeFileSync(new URL(fichier,here),zlib.gzipSync(JSON.stringify({dessine:d,simule:s})));
    cas.variantes[nom]={...comparaison,premierHorsPilote:comparer(jeu(d.journal).filter(e=>e.type!=='pilote'),jeu(s.journal).filter(e=>e.type!=='pilote')),finDessinee:d.fin,finSimulee:s.fin,erreurs:[d.err,s.err],console:[d.console,s.console],pixels:d.pixels,journaux:fichier,shaJeu:[sha(jeu(d.journal).map(e=>[e.pas,e.t,e.type,e.d])),sha(jeu(s.journal).map(e=>[e.pas,e.t,e.type,e.d]))]};
    console.log(profil,graine,nom,comparaison.egaux,comparaison.premier,d.err.count,s.err.count);
  }
  out.cas.push(cas);save('diagnostic.json',out);
}
out.conforme=out.cas.length===30&&out.cas.every(c=>c.variantes.apres.egaux&&c.variantes.apres.erreurs.every(e=>e.count===0)&&c.variantes.apres.console.every(e=>!e.length));save('diagnostic.json',out);
