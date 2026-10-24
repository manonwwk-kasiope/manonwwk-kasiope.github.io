import fs from 'node:fs';import {sources,sauver,dateParis} from './vm.mjs';import {figer,lancer} from './processus.mjs';
const ref=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))).cas,src=figer(sources('e1bdc6f')),cas=[];
for(const a of ref.filter(r=>r.graine===1||r.graine===2&&['bon','expert'].includes(r.pilote))){
 const r=await lancer(src,'pilotes',{pilote:a.pilote,graine:a.graine}),champs=['tempsJeu','tempsCombat','tempsSimule','score','vague'];
 const attendu=Object.fromEntries(champs.map(k=>[k,a[k]])),obtenu=Object.fromEntries(champs.map(k=>[k,r[k]]));
 cas.push({pilote:a.pilote,graine:a.graine,attendu,obtenu,identique:champs.every(k=>a[k]===r[k])&&r.etat==='fin'&&!r.err&&!r.erreursConsole.length});
 sauver('validation-processus.json',{dateParis:dateParis(),ref:'e1bdc6f',methode:'processus Node distinct par partie, vraie VM inchangée',conforme:cas.length===10&&cas.every(c=>c.identique),cas});console.log(a.pilote,a.graine,cas.at(-1).identique);
}
if(!cas.every(c=>c.identique))process.exitCode=1;
