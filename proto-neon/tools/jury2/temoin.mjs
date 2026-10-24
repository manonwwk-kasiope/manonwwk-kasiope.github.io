/* Fabrique un vrai bundle dégradé dans une copie temporaire, sans modifier src/. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { P, paris } from './protocole.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
export function construireTemoin(sortie=path.join(HERE,'temoin')) {
  /* Node canonicalise import.meta.url (/private/var sur macOS). Canonicaliser
     aussi OUT évite d'inscrire des liens vers /var/… dans ART_SRC. */
  const tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'snake-jury2-temoin-')));
  try {
    fs.cpSync(path.join(ROOT,'src'),path.join(tmp,'src'),{recursive:true});
    fs.copyFileSync(path.join(ROOT,'build.mjs'),path.join(tmp,'build.mjs'));
    for(const d of ['art','cine','musique'])if(fs.existsSync(path.join(ROOT,d)))fs.symlinkSync(path.join(ROOT,d),path.join(tmp,d),'dir');
    const ajout=`/* TÉMOIN J1 seulement ; jamais dans le jeu livré. */
(function(){
 var N=window.__N,seed=${P.temoin.graine},spawn=N.ennemis.spawn,mute=N.music.mute;
 function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 N.ennemis.spawn=function(type,x,y,opts){
   var o=Object.assign({},opts||{});
   o.portail=(o.portail||0)+rnd()*${P.temoin.retardMax};
   return spawn.call(this,type,x,y,o);
 };
 /* Porte musicale publique, appliquée même après reset. Effets conservés. */
 N.music.mute=function(a,b){var r=mute.apply(this,arguments);mute.call(this,'musique',true);return r;};
 mute.call(N.music,'musique',true);
 window.__JURY_TEMOIN={musiqueCoupee:true,apparitionsAleatoires:true,graine:${P.temoin.graine},retardMax:${P.temoin.retardMax}};
})();`;
    fs.writeFileSync(path.join(tmp,'src','99-jury2-temoin.js'),ajout);
    fs.mkdirSync(sortie,{recursive:true});
    /* Même mode de build que la pointe ; les bases relatives restent art/, cine/,
       musique/. La copie temporaire peut ensuite être supprimée. */
    const b=spawnSync(process.execPath,[path.join(tmp,'build.mjs'),path.join(tmp,'index.html')],{encoding:'utf8'});
    if(b.status!==0)throw Error('Build témoin : '+b.stderr);
    let html=fs.readFileSync(path.join(tmp,'index.html'),'utf8');
    html=html.replace(/var CINE_BASE = [^;]+;/,'var CINE_BASE = "cine/";').replace(/var MUSIQUE_BASE = [^;]+;/,'var MUSIQUE_BASE = "musique/";');
    const fichier=path.join(sortie,'index.html');fs.writeFileSync(fichier,html);
    const preuve={dateParis:paris(),buildCode:b.status,sha256:crypto.createHash('sha256').update(html).digest('hex'),
      fichier,modifications:['musique coupée par le canal public musique','portails prolongés par un retard pseudo-aléatoire indépendant de 0 à '+P.temoin.retardMax+' s'],
      srcOriginalModifie:false,executionNavigateur:false,
      limite:'Construction et syntaxe seulement ; sensibilité à mesurer sur les sorties réelles, jamais déduite de la présence de ce patch.'};
    fs.writeFileSync(path.join(sortie,'preuve.json'),JSON.stringify(preuve,null,2)+'\n');
    fs.writeFileSync(path.join(sortie,'ajout.js'),ajout);return preuve;
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(construireTemoin(),null,2));
