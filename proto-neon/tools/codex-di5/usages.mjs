/* Mesures des durées/segments réellement employés, sans nouvelle conversion ni nouveau rendu. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {flashs} from './r13.mjs';import {chargerVM} from '../jury2/vm-temoins.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),file=path.join(HERE,'films.json');
const data=JSON.parse(fs.readFileSync(file));assert(data.termine);const {N}=chargerVM(ROOT);
const lire=c=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,'films',c.masques))));
function mesure(c,im,detail){const offset=im[0]?.w??0,r=flashs(im.map((x,i)=>({...x,w:i/c.hz})),N.R.criteres.R13.aire,undefined,{hzFixe:c.hz});assert(r.qualifiable);return{...c,...detail,decalagePresentation:offset,rendusMesures:im.length,maxParSeconde:r.maxParSeconde,flashs:r.flashs,instant:r.a,surface:r.surface,surfaceMax:r.surfaceMax,evenements:r.evenements,conforme:r.maxParSeconde<=N.R.criteres.R13.flashsParSeconde};}
for(const f of data.films){
 const base=f.nom.replace(/-(elle|lui)$/,'');let cas=f.cas.filter(c=>c.route!=='film');
 if(base==='boss')cas=cas.filter(c=>c.route==='intro-complet');
 if(base==='alerte')cas=data.films.find(f=>f.nom==='boss').cas.filter(c=>c.route==='intro-complet').map(c=>mesure(c,lire(c).filter(x=>x.segment==='alerte'),{route:'intro-complet-alerte',selectionSegment:'alerte',film:'alerte'}));
 const etape=N.aventure.ETAPES.find(e=>e.type==='film'&&(e.base===base||e.base===f.nom));
 if(etape||base==='amiral'){
  const duration=base==='amiral'?N.R.filmAmiral.duree:etape.duree||4.5;
  const film=f.cas.filter(c=>c.route==='film').map(c=>mesure(c,lire(c).filter(x=>x.w<duration),{route:'film-usage',dureeUsage:duration}));
  cas.push(...(f.cas.some(c=>c.route==='film-usage-rendu')?f.cas.filter(c=>c.route==='film-usage-rendu'):film));
 }
 f.usages=cas;
 f.synthese={max12:Math.max(...f.cas.filter(c=>c.hz===12).map(c=>c.maxParSeconde)),max60:Math.max(...f.cas.filter(c=>c.hz===60).map(c=>c.maxParSeconde)),
  usage12:cas.length?Math.max(...cas.filter(c=>c.hz===12).map(c=>c.maxParSeconde)):null,usage60:cas.length?Math.max(...cas.filter(c=>c.hz===60).map(c=>c.maxParSeconde)):null};
}
data.usages='Segments et durées des interfaces publiques ; statistiques distinctes de la lecture intégrale de chaque clip.';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({films:data.films.length,actifsAuDessus:data.films.filter(f=>Math.max(f.synthese.max12,f.synthese.max60)>3).length,usagesAuDessus:data.films.filter(f=>Math.max(f.synthese.usage12??0,f.synthese.usage60??0)>3).length}));
