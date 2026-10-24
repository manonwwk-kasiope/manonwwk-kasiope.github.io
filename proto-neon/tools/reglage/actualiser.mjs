// Recalcul d'analyse depuis les reçus réels : aucune partie rejouée, aucun seuil modifié.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {ICI} from './vm.mjs';
import {analyser,bilan} from './analyse.mjs';
const journal=[],hash=crypto.createHash('sha256').update(fs.readFileSync(new URL('./analyse.mjs',import.meta.url))).digest('hex');
for(const f of fs.readdirSync(ICI).filter(f=>f==='baseline.json'||f==='final.json'||/(moins|plus)\.json$/.test(f)||/^passe-\d+-sortie\.json$/.test(f))){
  const r=JSON.parse(fs.readFileSync(path.join(ICI,f)));if(!r.complete)continue;
  const avant=r.resume.rythme;
  r.cas=r.cas.map(c=>({...analyser(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,c.recu))))),recu:c.recu}));
  r.resume=bilan(r.cas);r.analyseSha256=hash;
  if(JSON.stringify(avant)!==JSON.stringify(r.resume.rythme))journal.push({f,avant,apres:r.resume.rythme});
  fs.writeFileSync(path.join(ICI,f),JSON.stringify(r,null,2)+'\n');
}
if(journal.length){
  const fichier=path.join(ICI,'correction-analyse-pics.json');
  const precedent=fs.existsSync(fichier)?JSON.parse(fs.readFileSync(fichier)).journal:[];
  fs.writeFileSync(fichier,JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),raison:'Exclure le combat du CYCLOPE des pics de V5, car le numéro de vague reste à 5. Traces réelles réanalysées sans rejeu ni modification des seuils.',journal:precedent.concat(journal)},null,2)+'\n');
}
console.log(JSON.stringify({seriesCorrigees:journal.map(x=>x.f)}));
