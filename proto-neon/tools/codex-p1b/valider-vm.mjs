import fs from 'node:fs';
import path from 'node:path';
import { monde, partie, here, root } from './vm.mjs';
const refs = JSON.parse(fs.readFileSync(path.join(root,'tools/pilotes/sortie.json'))).cas;
const selection = refs.filter(r => ['inerte','tourneur'].includes(r.pilote));
const m=monde({ revision:'e1bdc6f' }), cas=[];
for (const r of selection) {
  // Une VM vierge par partie, exactement comme le contexte navigateur vierge.
  const obtenu = partie(cas.length ? monde({revision:'e1bdc6f'}) : m,r.pilote,r.graine);
  const attendu = { tempsJeu:r.tempsJeu,vague:r.vague,score:r.score };
  const identique = Object.keys(attendu).every(k => obtenu[k] === attendu[k]) && obtenu.etat === 'fin' && !obtenu.err && !obtenu.console.length;
  cas.push({attendu,obtenu,identique}); console.log(JSON.stringify(cas.at(-1)));
}
const out={revision:'e1bdc6f',dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),identiques:cas.filter(c=>c.identique).length,cas};
fs.writeFileSync(path.join(here,'validation-vm.json'),JSON.stringify(out,null,2)+'\n');
if(out.identiques<10) process.exitCode=1;
