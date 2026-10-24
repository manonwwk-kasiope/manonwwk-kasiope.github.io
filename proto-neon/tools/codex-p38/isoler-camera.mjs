// Le raccord caméra ne change aucune instruction du trajet dessiné : réemploi de son reçu exact.
// Seule la simulation caméra-seule est exécutée, puis comparée au vrai dessin avant déjà reçu.
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {corriger} from './raccords.mjs';
import {rejouer,jeu,comparer,sha} from './rejouer.mjs';
const here=new URL('./',import.meta.url),lire=n=>JSON.parse(fs.readFileSync(new URL(n,here))),src=lire('sources-recues.json'),d=lire('diagnostic.json');
assert.equal(sha(src),d.sourcesSha256);
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),methode:'Dessin avant reçu réemployé : les trois instructions caméra modifiées ne changent la branche que lorsque simulant=true ; la quatrième supprime la caméra supplémentaire dans dbg.simuler uniquement.',cas:[]};
for(const cas of d.cas){
  const r=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(cas.variantes.avant.journaux,here))));
  const [width,height]=cas.profil==='paysage'?[844,390]:cas.profil==='portrait'?[390,844]:[1440,900];
  const fichier=`journaux/${cas.profil}-${cas.graine}-camera-isolee.json.gz`,u=new URL(fichier,here);
  const paire=new URL(`journaux/${cas.profil}-${cas.graine}-camera.json.gz`,here);
  const simulation=fs.existsSync(paire)?JSON.parse(zlib.gunzipSync(fs.readFileSync(paire))).simule:fs.existsSync(u)?JSON.parse(zlib.gunzipSync(fs.readFileSync(u))):rejouer(corriger(src,'camera'),{width,height,graine:cas.graine,simulation:true});
  fs.writeFileSync(u,zlib.gzipSync(JSON.stringify(simulation)));
  const c=comparer(jeu(r.dessine.journal),jeu(simulation.journal));
  assert.equal(simulation.err.count,0);out.cas.push({profil:cas.profil,graine:cas.graine,...c,preuveDessinee:cas.variantes.avant.journaux,preuveSimulee:fichier});
}
out.complets=out.cas.length===30;out.identiques=out.cas.filter(c=>c.egaux).length;
fs.writeFileSync(new URL('isolation-camera.json',here),JSON.stringify(out,null,2)+'\n');console.log({total:out.cas.length,identiques:out.identiques});
