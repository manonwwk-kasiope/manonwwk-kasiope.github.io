// Appliquer les patchs fournis sur des chaînes en mémoire seulement ; aucune source réservée écrite.
import fs from 'node:fs';import {ICI} from './vm.mjs';
export function appliquer(texte,nom){
 const patch=fs.readFileSync(ICI+'/'+nom,'utf8');const lignes=patch.split('\n');let anciens=[],nouveaux=[];
 function hunk(){if(!anciens.length)return;const a=anciens.join('\n'),b=nouveaux.join('\n');if(!texte.includes(a))throw Error('Contexte de patch absent : '+nom);texte=texte.replace(a,b);anciens=[];nouveaux=[];}
 for(const l of lignes){if(l.startsWith('---')||l.startsWith('+++'))continue;if(l.startsWith('@@')){hunk();continue;}if(l.startsWith(' ')){anciens.push(l.slice(1));nouveaux.push(l.slice(1));}else if(l.startsWith('-'))anciens.push(l.slice(1));else if(l.startsWith('+'))nouveaux.push(l.slice(1));}
 hunk();return texte;
}
export function raccorder(src){return src.map(([f,s])=>[f,f==='03-socle.js'?appliquer(s,'raccord-03-socle.patch'):f==='76-directeur.js'?appliquer(s,'raccord-76-directeur.patch'):s]);}

export function schemas(src){return src.map(([f,s])=>[f,f==='03-socle.js'?appliquer(s,'raccord-03-socle.patch'):s]);}
