// Aucun fichier réservé modifié : raccords stricts sur chaînes en mémoire.
import fs from 'node:fs';
import path from 'node:path';
import {ICI} from './vm.mjs';
export function appliquerTexte(texte,patch){
 const lignes=patch.split('\n');let i=0;
 while(i<lignes.length){if(!lignes[i].startsWith('@@')){i++;continue;}i++;
  const avant=[],apres=[];
  while(i<lignes.length&&!lignes[i].startsWith('@@')&&!lignes[i].startsWith('--- ')){
   const l=lignes[i++];if(l.startsWith(' ')||l.startsWith('-'))avant.push(l.slice(1));if(l.startsWith(' ')||l.startsWith('+'))apres.push(l.slice(1));
  }
  const a=avant.join('\n')+'\n',b=apres.join('\n')+'\n';
  if(texte.split(a).length!==2)throw Error('Raccord absent ou ambigu : '+a.slice(0,100));texte=texte.replace(a,b);
 }
 return texte;
}
export function raccorder(src,nom='p41'){
 const fichiers=nom==='p41'?['79-jeu.js']:['79-jeu.js','50-fx.js'];
 return src.map(([f,s])=>[f,fichiers.includes(f)?appliquerTexte(s,fs.readFileSync(path.join(ICI,nom==='p41'?`raccord-${f}.patch`:`p38-${f}.patch`),'utf8')):s]);
}
