import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { monde,here } from './vm.mjs';
const validation=JSON.parse(fs.readFileSync(path.join(here,'validation-vm.json')));
if(validation.identiques<10 || validation.cas.some(c=>!c.identique)) throw Error('VM non calibrée : aucune conclusion autorisée');
const integration=process.argv.includes('--registre-attendu');
const code=fs.readFileSync(path.join(here,'scenes.js'),'utf8');
const frais=avant=>{const m=monde({avant,integration:integration&&!avant});vm.runInContext(code,m.c);return m;};
const reel=monde(); const manquants=['onde','sillage','perforation','surtension','epines'].filter(id=>!reel.N.ids.cartes.includes(id));
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),integrationAnticipee:integration,
  limite:integration?'Registre anticipé en mémoire UNIQUEMENT : aucun résultat ne valide son intégration réelle.':'Sources de production sans modification.',
  calibration:validation.identiques,manquants,scenes:[],endurances:[]};
const fichier=path.join(here,integration?'vm-registre-anticipe.json':'vm-production.json');
if(process.argv.includes('--scenes-seulement')) {
  const precedent=JSON.parse(fs.readFileSync(fichier));out.endurances=precedent.endurances;
  out.endurancesReutilisees=precedent.dateParis;
}
for(const id of ['onde','sillage','perforation','surtension','epines']) {
  const avant=frais(true),apres=frais(false);
  out.scenes.push({id,avant:avant.c.__P1B.scene(id,false),apres:apres.c.__P1B.scene(id,true),console:apres.erreurs});
  console.log(JSON.stringify({scene:id,avant:out.scenes.at(-1).avant.degats,apres:out.scenes.at(-1).apres.degats,err:apres.c.__ERR.count}));
  if(!process.argv.includes('--scenes-seulement') && (integration || !manquants.includes(id))) {
    for(const avec of [false,true]) { const m=frais(!avec); const e=m.c.__P1B.endurance(id,avec);out.endurances.push({...e,console:m.erreurs});
      console.log(JSON.stringify({endurance:id,avec,temps:e.tempsJeu,etat:e.etat,kills:e.kills,err:e.err})); }
  }
}
const m=frais(false); out.cartes=m.c.__P1B.cartes(); out.controle=m.c.__P1B.controle();out.console=m.erreurs;
out.conforme=(!manquants.length || integration) && out.scenes.every(s=>s.apres.choix!==null && s.apres.degats.some((d,i)=>d>s.avant.degats[i]) && !s.apres.err && !s.console.length)
  && out.endurances.length===10 && out.endurances.every(e=>e.tempsJeu>=60 && !e.err && !e.console.length && !e.perdusBus) && out.cartes.textesConformes && !out.cartes.schemaMods.length && !out.cartes.err && !out.controle.err && !out.console.length;
fs.writeFileSync(fichier,JSON.stringify(out,null,2)+'\n');
if(!out.conforme) process.exitCode=1;
