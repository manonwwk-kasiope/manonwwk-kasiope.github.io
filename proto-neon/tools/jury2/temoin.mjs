/* Fabrique un vrai bundle dégradé dans une copie temporaire, sans modifier src/.
   Deux modes, choisis à l'exécution par window.__JURY_TEMOIN_MODE (posé par le banc avant le chargement) :
   - « desync » (par défaut, le témoin remis aux jurés) : musique coupée, échéances retardées de 0 à retardMax s
     par un générateur indépendant, et une part des poursuivants doublée (difficulté nettement plus haute,
     visible à l'image et dans la durée des parties) ;
   - « synchro » (témoin POSITIF, jamais remis aux jurés) : musique conservée, apparitions calées sur le prochain
     temps audio. Il sert seulement à prouver que l'instrument voit une apparition calée quand il y en a une,
     même si la pointe testée ne l'est pas (la version 0 ne l'est pas : 4,8 % à ± 40 ms mesuré). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { P, paris } from './protocole.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..');
export const MODES = Object.freeze(['desync', 'synchro']);
export function sourceAjout(T = P.temoin) {
  return `/* TÉMOIN J1 seulement ; jamais dans le jeu livré. */
(function(){
 var N=window.__N,seed=${T.graine},spawn=N.ennemis.spawn,mute=N.music.mute;
 var mode=window.__JURY_TEMOIN_MODE==='synchro'?'synchro':'desync';
 var DOUBLES=${JSON.stringify(T.typesDoublables)};
 function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 /* délai qui fait tomber l'apparition sur un temps audio : le moteur publie la phase du temps courant */
 function versTemps(d){
   var b=N.music.beat&&N.music.beat(),bpm=N.music.tempo&&N.music.tempo();
   if(!b||!(bpm>0)||!isFinite(b.phase))return d;
   var T=60/bpm,reste=(1-b.phase)*T;
   if(d<=reste)return reste;
   return reste+Math.ceil((d-reste)/T-1e-9)*T;
 }
 /* 31 lit le curseur transport.rythme (version jouée), pas celui du fichier original.
    L'échéance explicite évite le recalage demi-temps de dateNaissance(). */
 function dater(o){
   var tr=N.music.transport&&N.music.transport();
   tr=tr&&(tr.rythme||tr);
   var maintenant=tr&&isFinite(tr.t)?tr.t:N.rythme.lire().t;
   var minimum=Math.max(N.R.apparitions.portail,o.portail||0);
   o.portail=mode==='synchro'?versTemps(minimum):minimum+rnd()*${T.retardMax};
   o.rythmeFin=maintenant+o.portail;
   return o;
 }
 N.ennemis.spawn=function(type,x,y,opts){
   var o=dater(Object.assign({},opts||{})),e;
   if(mode==='synchro')return spawn.call(this,type,x,y,o);
   e=spawn.call(this,type,x,y,o);
   if(!o.ext&&DOUBLES.indexOf(type)>=0&&rnd()<${T.doublonProba}){
     spawn.call(this,type,x+6,y+6,dater(Object.assign({},opts||{})));
   }
   return e;
 };
 if(mode==='desync'){
   /* Porte musicale publique, appliquée même après reset. Effets conservés. */
   N.music.mute=function(a,b){var r=mute.apply(this,arguments);mute.call(this,'musique',true);return r;};
   mute.call(N.music,'musique',true);
 }
 window.__JURY_TEMOIN={mode:mode,musiqueCoupee:mode==='desync',apparitionsAleatoires:mode==='desync',apparitionsCalees:mode==='synchro',poursuivantsDoubles:mode==='desync',graine:${T.graine},retardMax:${T.retardMax},doublonProba:${T.doublonProba}};
})();`;
}
/* Bâtit un bundle dans une copie temporaire de src/ (jamais dans la copie de travail) ; ajout = source du module
   99-jury2-temoin.js, ou null pour la pointe nue. Même mode de build que la pointe ; les bases relatives restent art/,
   cine/, musique/. Node canonicalise import.meta.url (/private/var sur macOS) : canonicaliser aussi la copie évite
   d'inscrire des liens vers /var/… dans ART_SRC. */
export function batirCopie(ajout=null) {
  const tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'snake-jury2-temoin-')));
  try {
    fs.cpSync(path.join(ROOT,'src'),path.join(tmp,'src'),{recursive:true});
    fs.copyFileSync(path.join(ROOT,'build.mjs'),path.join(tmp,'build.mjs'));
    for(const d of ['art','cine','musique'])if(fs.existsSync(path.join(ROOT,d)))fs.symlinkSync(path.join(ROOT,d),path.join(tmp,d),'dir');
    if(ajout)fs.writeFileSync(path.join(tmp,'src','99-jury2-temoin.js'),ajout);
    const b=spawnSync(process.execPath,[path.join(tmp,'build.mjs'),path.join(tmp,'index.html')],{encoding:'utf8'});
    if(b.status!==0)throw Error('Build copie : '+b.stderr);
    const html=fs.readFileSync(path.join(tmp,'index.html'),'utf8').replace(/var CINE_BASE = [^;]+;/,'var CINE_BASE = "cine/";').replace(/var MUSIQUE_BASE = [^;]+;/,'var MUSIQUE_BASE = "musique/";');
    return {html,status:b.status,journal:b.stdout+b.stderr};
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
}
export function construireTemoin(sortie=path.join(HERE,'temoin')) {
  const ajout=sourceAjout(),b=batirCopie(ajout),html=b.html;
  fs.mkdirSync(sortie,{recursive:true});
  const fichier=path.join(sortie,'index.html');fs.writeFileSync(fichier,html);
  const preuve={dateParis:paris(),buildCode:b.status,sha256:crypto.createHash('sha256').update(html).digest('hex'),
    fichier,modes:MODES,modifications:['mode desync : musique coupée par le canal public musique','mode desync : portails prolongés par un retard pseudo-aléatoire indépendant de 0 à '+P.temoin.retardMax+' s','mode desync : '+Math.round(100*P.temoin.doublonProba)+' % des '+P.temoin.typesDoublables.join(', ')+' doublés','mode synchro (témoin positif) : rythmeFin imposé au prochain temps audio après le préavis minimal, musique conservée'],
    srcOriginalModifie:false,executionNavigateur:false,
    limite:'Construction et syntaxe seulement ; sensibilité à mesurer sur les sorties réelles, jamais déduite de la présence de ce patch.'};
  fs.writeFileSync(path.join(sortie,'preuve.json'),JSON.stringify(preuve,null,2)+'\n');
  fs.writeFileSync(path.join(sortie,'ajout.js'),ajout);return preuve;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(construireTemoin(),null,2));
