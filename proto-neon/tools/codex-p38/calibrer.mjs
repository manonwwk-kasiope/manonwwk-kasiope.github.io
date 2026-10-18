// Calibration préalable obligatoire ; aucun réseau, serveur ou navigateur.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sources, monde, partie} from './vm.mjs';
const refs=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))).cas;
const src=sources('e1bdc6f'), cas=[];
for(const ref of refs.filter(r=>r.graine<=2&&['inerte','tourneur','maladroit','kamikaze','humain'].includes(r.pilote))) {
  const obtenu=partie(monde(src),ref.pilote,ref.graine);
  const attendu=Object.fromEntries(Object.keys(obtenu).map(k=>[k,ref[k]]));
  const identique=JSON.stringify(obtenu)===JSON.stringify(attendu);
  cas.push({attendu,obtenu,identique}); console.log(ref.pilote,ref.graine,identique);
  fs.writeFileSync(new URL('calibration.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),revision:'e1bdc6f',cas},null,2)+'\n');
}
assert.equal(cas.length,10);assert.ok(cas.every(r=>r.identique),'VM divergente : ne pas conclure');
