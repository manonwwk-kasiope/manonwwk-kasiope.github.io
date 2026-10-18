import fs from 'node:fs';
import {sources,monde,partie} from './vm.mjs';
if(!JSON.parse(fs.readFileSync(new URL('./calibration.json',import.meta.url))).valide) throw new Error('VM non calibrée');
const src=sources(),ref=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))),cas=[];
for(const r of ref.cas.filter(r=>!['bon','humain'].includes(r.pilote))) {
  const obtenu=partie(monde(src),r.pilote,r.graine);
  const attendu=Object.fromEntries(Object.keys(obtenu).map(k=>[k,r[k]]));
  cas.push({attendu,obtenu,delta:{tempsJeu:obtenu.tempsJeu-r.tempsJeu,vague:obtenu.vague-r.vague,score:obtenu.score-r.score},identique:JSON.stringify(attendu)===JSON.stringify(obtenu)});
  fs.writeFileSync(new URL('./reference60.json',import.meta.url),JSON.stringify({reference:'e1bdc6f',cas},null,2));
  console.log(JSON.stringify({pilote:r.pilote,graine:r.graine,...cas.at(-1).delta,err:obtenu.err,raison:obtenu.raison}));
}
