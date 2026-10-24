import fs from 'node:fs';
import path from 'node:path';
import {sources,partie,ICI,PROTO} from './vm.mjs';
const ref=JSON.parse(fs.readFileSync(path.join(PROTO,'tools/pilotes/sortie.json'))),src=sources('e1bdc6f');
const cas=[];
// Dix parties, plusieurs pilotes ; comparaison stricte de toutes les sorties scalaires demandées.
const choix=ref.cas.filter(c=>c.graine<=2).slice(0,10);
for(const c of choix){const r=partie(src,c.pilote,c.graine),champs=['tempsJeu','tempsCombat','pas','tempsSimule','vague','score','raison','fin','err'];const ecarts=champs.filter(k=>r[k]!==c[k]).map(k=>({champ:k,reference:c[k],vm:r[k]}));cas.push({pilote:c.pilote,graine:c.graine,ecarts,resultat:r});console.log(c.pilote,c.graine,ecarts.length?'DIVERGE':'identique');}
const o={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),reference:'e1bdc6f',identiques:cas.filter(c=>!c.ecarts.length).length,cas};fs.writeFileSync(path.join(ICI,'validation-vm.json'),JSON.stringify(o,null,2));if(o.identiques<10)process.exitCode=1;
