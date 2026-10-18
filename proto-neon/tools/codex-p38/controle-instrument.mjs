// Témoins négatifs de l'instrument ; ne lancent ni serveur ni navigateur.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cle,comparer} from '../mesure/criteres/R-30-rejouabilite.mjs';
const origine=[{pas:7,t:1,type:'kill',d:{id:1,x:30}},{pas:8,t:2,type:'mort',d:{cause:'mur'}}];
const cases=[];
for(const [nom,journal,attendu] of [
  ['témoin identique',structuredClone(origine),true],
  ['donnée de kill altérée',[{...origine[0],d:{id:1,x:31}},origine[1]],false],
  ['kill supprimé',origine.slice(1),false],
  ['pas de jeu décalé',[{...origine[0],pas:8},origine[1]],false],
  ['journal tronqué',[],false],
  ['présentation seulement',[...origine,{pas:9,t:3,type:'hudBanniere',d:{texte:'X'}},{pas:9,t:3,type:'flash',d:{aire:1}}],true]
]) {
  const obtenu=comparer(cle(origine,60,true),cle(journal,60,true)).egaux;
  assert.equal(obtenu,attendu,nom);cases.push({nom,attendu,obtenu});
}
// Les mêmes événements de présentation restent obligatoires entre deux parties dessinées.
assert.equal(comparer(cle(origine,60),cle([...origine,{pas:9,t:3,type:'flash',d:{aire:1}}],60)).egaux,false);
cases.push({nom:'flash conservé entre dessins',attendu:false,obtenu:false});
fs.writeFileSync(new URL('controle-instrument.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cases},null,2)+'\n');
console.log(cases.length+' témoins réussis ; kill, troncature et pas décalé refusés.');
