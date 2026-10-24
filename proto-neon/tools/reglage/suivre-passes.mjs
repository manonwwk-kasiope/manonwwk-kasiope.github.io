// Génère le registre des passes, ses valeurs exactes et l'arrêt obligatoire depuis les mesures.
import fs from 'node:fs';
import path from 'node:path';
import {ICI} from './vm.mjs';
const lire=f=>JSON.parse(fs.readFileSync(path.join(ICI,f)));
const registre=lire('passes.json'),base=lire('baseline.json'),regles=lire('regles-depart.json');
const vues=new Set(Object.keys(base.resume.B).filter(k=>base.resume.B[k]));
const get=(o,k)=>k.split('.').reduce((v,c)=>v[c],o);
let serieSansGain=0,stop=false,texte='# Passes de réglage\n\n'+new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'})+' (Paris).\n\n';
const bilan=[];
for(const e of registre){
  const config=lire(e.config),avant=lire(e.avant),apres=lire(e.apres);
  if(!apres.complete)throw new Error('Passe incomplète : '+e.numero);
  if(stop||e.numero>5)throw new Error('Une passe a dépassé un arrêt obligatoire');
  const anciennes=avant.spec.overrides||{}, nouvelles=config.valeurs;
  const keys=[...new Set([...Object.keys(anciennes),...Object.keys(nouvelles)])];
  const changements=keys.map(k=>({k,avant:anciennes[k]??get(regles,k),apres:nouvelles[k]??get(regles,k)})).filter(x=>x.avant!==x.apres);
  const gains=Object.keys(apres.resume.B).filter(k=>apres.resume.B[k]&&!vues.has(k));
  const pertes=Object.keys(avant.resume.B).filter(k=>avant.resume.B[k]&&!apres.resume.B[k]);
  for(const k of Object.keys(apres.resume.B).filter(k=>apres.resume.B[k]))vues.add(k);
  serieSansGain=gains.length?0:serieSansGain+1;stop=serieSansGain>=2||e.numero===5;
  texte+=`## Passe ${e.numero} — ${e.decision}\n\n${config.raison}\n\n${e.raison}\n\n`;
  texte+='| Paramètre N.R | Avant | Après |\n|---|---:|---:|\n'+changements.map(x=>`| ${x.k} | ${x.avant} | ${x.apres} |`).join('\n')+'\n\n';
  texte+='| Cible B | Avant | Après |\n|---|---|---|\n'+Object.keys(apres.resume.B).map(k=>`| ${k} | ${avant.resume.B[k]===true?'tenue':avant.resume.B[k]===false?'non tenue':'à vérifier'} | ${apres.resume.B[k]===true?'tenue':apres.resume.B[k]===false?'non tenue':'à vérifier'} |`).join('\n')+'\n\n';
  texte+=`B tenues : ${avant.resume.nbB} → ${apres.resume.nbB}/20. Nouvelles B depuis le début des passes : ${gains.join(', ')||'aucune'}. B perdues depuis la candidate précédente : ${pertes.join(', ')||'aucune'}. Passes consécutives sans nouvelle B : ${serieSansGain}. ${stop?'**ARRÊT OBLIGATOIRE atteint : aucune passe supplémentaire.**':''}\n\n`;
  bilan.push({...e,changements,gains,pertes,serieSansGain,stop,avantB:avant.resume.nbB,apresB:apres.resume.nbB});
}
fs.writeFileSync(path.join(ICI,'passes.md'),texte);
fs.writeFileSync(path.join(ICI,'suivi-passes.json'),JSON.stringify({bilan,arretObligatoire:stop,serieSansGain,budgetPasses:5,passesConsommees:registre.length},null,2)+'\n');
console.log(JSON.stringify({passes:registre.length,serieSansGain,stop}));
