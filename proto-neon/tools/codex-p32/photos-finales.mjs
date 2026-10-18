import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const cas=[];for(const profil of ['paysage','portrait','bureau'])for(const scene of ['charge','boss3','mort-cyclope']){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('photo-cas.mjs',import.meta.url)),profil,scene],{encoding:'utf8'});
 console.log(r.stdout.trim());if(r.status!==0){console.error(r.stderr,r.status,r.signal);process.exit(r.status||1);}cas.push(JSON.parse(fs.readFileSync(new URL('photo-'+profil+'-'+scene+'.json',import.meta.url))));
}
fs.writeFileSync(new URL('photos-finales.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas},null,2)+'\n');
