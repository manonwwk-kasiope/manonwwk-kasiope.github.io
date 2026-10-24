import fs from 'node:fs';
import {sources,compiler,jouer,sauver,dateParis} from './vm.mjs';
const ref=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))).cas;
const src=compiler(sources('e1bdc6f')), cas=[];
for(const a of ref.filter(r=>r.graine===1 || r.graine===2 && ['bon','expert'].includes(r.pilote))){
 const r=jouer(src,a.pilote,a.graine), champs=['tempsJeu','tempsCombat','tempsSimule','score','vague'];
 const attendu=Object.fromEntries(champs.map(k=>[k,a[k]])),obtenu=Object.fromEntries(champs.map(k=>[k,r[k]]));
 cas.push({pilote:a.pilote,graine:a.graine,attendu,obtenu,identique:champs.every(k=>a[k]===r[k])&&r.etat==='fin'&&!r.err&&!r.erreursConsole.length});
 console.log(a.pilote,a.graine,cas.at(-1).identique);
}
sauver('validation-vm.json',{dateParis:dateParis(),ref:'e1bdc6f',conforme:cas.length>=10&&cas.every(c=>c.identique),cas});
if(!cas.every(c=>c.identique))process.exitCode=1;
