// À lancer après les 80 avant ; un seul processus de calcul à la fois.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ici=path.dirname(fileURLToPath(import.meta.url));
const avant=JSON.parse(fs.readFileSync(path.join(ici,'parties-avant.json')));
if(avant.cas.length!==80)throw Error('80 reçus avant requis');
for(const [mode,phase] of [['camera','avant'],['camera','apres'],['flashs','avant'],['flashs','apres'],['parties','apres'],['r05','avant'],['r05','apres']]){
 const fichier=path.join(ici,mode+'-'+phase+'.log'),fd=fs.openSync(fichier,'w');
 console.log('DEBUT',mode,phase,new Date().toISOString());
 const r=spawnSync(process.execPath,['--expose-gc',path.join(ici,'mesurer-vm.mjs'),mode,phase],{stdio:['ignore',fd,fd]});fs.closeSync(fd);
 console.log('FIN',mode,phase,r.status,new Date().toISOString());
 if(r.status!==0)throw Error('mesure interrompue : '+mode+' '+phase+' ; consulter '+fichier);
}
