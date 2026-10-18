// Compare les 20 graines de la passe retenue aux mêmes cas du contrôle final sur sources appliquées.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {ICI} from './vm.mjs';
const lire=f=>JSON.parse(fs.readFileSync(path.join(ICI,f)));
const passe=lire(process.argv[2]),final=lire('final.json');
if(!passe.complete||!final.complete)throw new Error('Comparaison interdite sur série incomplète');
const cas=[],sha=j=>crypto.createHash('sha256').update(JSON.stringify(j)).digest('hex');
for(const c of passe.cas){
  const d=final.cas.find(x=>x.pilote===c.pilote&&x.graine===c.graine);
  if(!d)throw new Error('Cas manquant dans le contrôle final');
  const a=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,c.recu))));
  const b=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,d.recu))));
  const champs=['raison','fin','tempsJeu','tempsCombat','tempsSimule','vague','score','morts','cartes','err'];
  const differences=champs.filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>({champ:k,avant:a[k],apres:b[k]}));
  cas.push({pilote:c.pilote,graine:c.graine,identique:!differences.length&&sha(a.journal)===sha(b.journal),differences,journalAvant:sha(a.journal),journalApres:sha(b.journal)});
}
const r={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas,conforme:cas.length===160&&cas.every(c=>c.identique)};
fs.writeFileSync(path.join(ICI,'comparaison-source-injection.json'),JSON.stringify(r,null,2)+'\n');
console.log(JSON.stringify({cas:cas.length,identiques:cas.filter(c=>c.identique).length,conforme:r.conforme}));
if(!r.conforme)process.exitCode=1;
