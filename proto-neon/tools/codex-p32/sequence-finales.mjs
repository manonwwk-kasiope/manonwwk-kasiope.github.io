import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const cas=[];for(const version of ['avant','apres'])for(const profil of ['paysage','portrait','bureau']){
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('r11-sequence-vm.mjs',import.meta.url)),version,profil],{encoding:'utf8'});
 console.log(r.stdout.trim());if(r.status!==0){console.error(r.stderr,r.status,r.signal);process.exit(r.status||1);}cas.push(...JSON.parse(fs.readFileSync(new URL('r11-sequence-'+version+'-'+profil+'.json',import.meta.url))).cas);
}
fs.writeFileSync(new URL('r11-sequence.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas},null,2)+'\n');
