import fs from 'node:fs';
import crypto from 'node:crypto';
import { sources, monde, partie } from './vm.mjs';
const reference = JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json', import.meta.url)));
const mode = 'calibration';
const src = sources('e1bdc6f');
const selection = reference.cas.filter(c => c.graine <= 2 && ['inerte','tourneur','maladroit','kamikaze','humain'].includes(c.pilote));
const cas = selection.map(r => {
  const m = monde(src), obtenu = partie(m, r.pilote, r.graine);
  const journalSha256 = crypto.createHash('sha256').update(JSON.stringify(m.N.journal.dump())).digest('hex');
  const attendu = Object.fromEntries(Object.keys(obtenu).map(k => [k, r[k]]));
  console.log(JSON.stringify({mode,partie:r.pilote,graine:r.graine,score:obtenu.score}));
  return { obtenu, journalSha256, referenceIdentique: JSON.stringify(obtenu) === JSON.stringify(attendu), attendu };
});
const bilan = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), mode, cas,
  referenceIdentiques: cas.filter(c => c.referenceIdentique).length };
fs.writeFileSync(new URL(`./${mode}.json`, import.meta.url), JSON.stringify(bilan, null, 2));
console.log(JSON.stringify({mode, cas: cas.length, referenceIdentiques:bilan.referenceIdentiques, avantApresIdentiques:bilan.avantApresIdentiques}));
if (bilan.referenceIdentiques < 10) process.exitCode = 1;
