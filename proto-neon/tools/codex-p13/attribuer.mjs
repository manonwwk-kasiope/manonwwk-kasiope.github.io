import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const resultats=[];
for(const [profil,scene] of [['paysage','charge'],['portrait','boss3'],['paysage','mort-cyclope']]){
 const nom=`ablation-${profil}-${scene}.json`;
 execFileSync(process.execPath,[new URL('scenes-vm.mjs',import.meta.url).pathname,'--ablation','--profil',profil,'--scene',scene,'--sortie',nom],{stdio:'inherit'});
 resultats.push(...JSON.parse(fs.readFileSync(new URL(nom,import.meta.url))).resultats);
 fs.writeFileSync(new URL('ablation-apres.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),resultats},null,2)+'\n');
}
