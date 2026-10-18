import fs from 'node:fs';
import { sources, partie } from '../codex-p10/vm.mjs';
const refs = JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json', import.meta.url)));
const src = sources('e1bdc6f');
// Dix cas exigeant aussi le journal complet identique ; aucun arrondi.
// L'essai initial plus large est conservé dans calibration-metriques.json.
const cas = refs.cas.filter(x => (x.pilote === 'inerte' && [1,2,3,4,5,6,8,9,10].includes(x.graine)) || (x.pilote === 'tourneur' && x.graine === 1)).map(a => {
  const b = partie(src, a.pilote, a.graine);
  const differences = ['tempsJeu','tempsCombat','vague','score','raison','err','journalSha256'].filter(k => a[k] !== b[k]).map(k => ({ champ:k, attendu:a[k], obtenu:b[k] }));
  console.log(a.pilote, a.graine, differences.length ? 'DIVERGE' : 'identique');
  return { pilote:a.pilote, graine:a.graine, differences, obtenu:Object.fromEntries(['tempsJeu','tempsCombat','vague','score','raison','err'].map(k => [k,b[k]])), journalIdentique:a.journalSha256 === b.journalSha256 };
});
const resultat = { reference:'e1bdc6f', dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}), cas, valide:cas.length >= 10 && cas.every(c => !c.differences.length) };
fs.writeFileSync(new URL('calibration.json',import.meta.url), JSON.stringify(resultat,null,2)+'\n');
if (!resultat.valide) process.exitCode=1;
