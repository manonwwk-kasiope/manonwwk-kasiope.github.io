// Sans HTTP ni navigateur. --calibrer vérifie e1bdc6f ; sinon comparaison finale de vingt parties, avant/après.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, sources, monde, partie } from './vm.mjs';
const HERE = path.join(ROOT, 'tools/codex-09');
const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pilotes/sortie.json')));
if (process.argv.includes('--calibrer')) {
  const src=sources('e1bdc6f'), controles=[];
  for(const x of ref.cas.filter(c=>c.pilote==='inerte'||c.graine===1&&['tourneur','maladroit'].includes(c.pilote))) {
    const m=monde(src), r=partie(m,x.pilote,x.graine);
    controles.push({pilote:x.pilote,graine:x.graine,attendu:[x.tempsJeu,x.vague,x.score],mesure:[r.tempsJeu,r.vague,r.score],identique:['tempsJeu','vague','score'].every(k=>r[k]===x[k]),err:r.err,erreursConsole:m.erreurs});
  }
  fs.writeFileSync(path.join(HERE,'calibration.json'),JSON.stringify({reference:'e1bdc6f',controles},null,2));
  if(controles.length<10||controles.some(c=>!c.identique||c.err||c.erreursConsole.length))process.exitCode=1;
  console.log(JSON.stringify({calibres:controles.length,exacts:controles.filter(c=>c.identique).length}));
} else {
  const calibration=JSON.parse(fs.readFileSync(path.join(HERE,'calibration.json')));
  if(calibration.controles.length<10||calibration.controles.some(c=>!c.identique||c.err||c.erreursConsole.length))throw Error('Calibration VM refusée');
  const avant=sources('8f55a91'),apres=sources(),cas=[];
  const fichier=path.join(HERE,'pilotes-final.json');
  for(const x of ref.cas.filter(c=>c.graine<=5&&['inerte','tourneur','maladroit','kamikaze'].includes(c.pilote))) {
    const mb=monde(avant),r0=partie(mb,x.pilote,x.graine),ma=monde(apres),r1=partie(ma,x.pilote,x.graine);
    cas.push({pilote:x.pilote,graine:x.graine,avant:r0,apres:r1,historique:{tempsJeu:x.tempsJeu,vague:x.vague,score:x.score},identiqueAvantApres:JSON.stringify(r0)===JSON.stringify(r1),identiqueHistorique:['tempsJeu','vague','score'].every(k=>r1[k]===x[k]),erreursConsole:[...mb.erreurs,...ma.erreurs]});
    fs.writeFileSync(fichier,JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),avant:'8f55a91',cas},null,2));
    console.log(JSON.stringify({pilote:x.pilote,graine:x.graine,identiqueAvantApres:cas.at(-1).identiqueAvantApres,identiqueHistorique:cas.at(-1).identiqueHistorique}));
  }
  if(cas.length!==20||cas.some(c=>!c.identiqueAvantApres||c.apres.err||c.erreursConsole.length))process.exitCode=1;
  console.log(`Référence historique : ${cas.filter(c=>c.identiqueHistorique).length}/${cas.length}. Les écarts sont publiés, aucun seuil modifié.`);
}
