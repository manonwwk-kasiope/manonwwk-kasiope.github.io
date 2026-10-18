import fs from 'node:fs';
import path from 'node:path';
import { ROOT, sources, monde, partie } from './vm.mjs';
const src = sources('e1bdc6f'), reference = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pilotes/sortie.json')));
const cas = reference.cas.filter(c => c.graine <= 2 && ['inerte', 'tourneur', 'maladroit', 'kamikaze', 'humain'].includes(c.pilote)).map(r => {
  const obtenu = partie(monde(src), r.pilote, r.graine);
  const attendu = Object.fromEntries(Object.keys(obtenu).map(k => [k, r[k]]));
  return { attendu, obtenu, identique: JSON.stringify(attendu) === JSON.stringify(obtenu) };
});
const bilan = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), revision: 'e1bdc6f', cas, valide: cas.length >= 10 && cas.every(c => c.identique) };
fs.writeFileSync(new URL('./calibration.json', import.meta.url), JSON.stringify(bilan, null, 2));
console.log(JSON.stringify(bilan));
if (!bilan.valide) process.exitCode = 1;
