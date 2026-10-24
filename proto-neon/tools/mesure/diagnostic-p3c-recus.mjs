/* Relecture des reçus immuables et des PNG ; aucune simulation de jeu. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {decode} from './png.mjs';
import {dateParis} from './commun.mjs';
const racine=process.argv[2] || '/Users/manonwojciechowski/Projets/wt-snake/recus/batterie-15a196a';
const preuve={dateParis:dateParis(),racine,source:'batterie exécutée hors bac, bundle 15a196a ; aucune nouvelle mesure de jeu',criteres:[],captures:[]};
for(const id of ['13','33','03','37','20','22','12','05','11','28','19']){
 const file=path.join(racine,'R-'+id+'.json'),raw=fs.readFileSync(file),r=JSON.parse(raw);
 preuve.criteres.push({id:r.id,sha256:crypto.createHash('sha256').update(raw).digest('hex'),dateParis:r.dateParis,bundle:r.bundle,statut:r.statut,mesures:r.mesures});
}
for(const nom of ['R-03-vol-paysage-tampon.png','R-37-v5-paysage-tampon.png','R-11-colosse-paysage-tampon.png']){
 const file=path.join(racine,'captures',nom),im=decode(file);let cyan=0;
 // Ces captures du tampon sont agrandies par un facteur entier 3 (commun.mjs).
 for(let y=0;y<im.h;y+=3)for(let x=0;x<im.w;x+=3){const o=(y*im.w+x)*4,c=Array.from(im.rgba.slice(o,o+3)).join(',');if(['5,217,232','209,247,255'].includes(c))cyan++;}
 preuve.captures.push({nom,w:im.w/3,h:im.h/3,cyan,partCyan:cyan/(im.w*im.h/9),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
}
fs.writeFileSync(new URL('./diagnostic/p3c-recus.json',import.meta.url),JSON.stringify(preuve,null,2)+'\n');
console.log(JSON.stringify(preuve.captures,null,2));
