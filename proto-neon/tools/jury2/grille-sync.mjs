/* Grille du bundle observé, jamais celle du checkout courant par défaut.
   Évaluation de 02-regles SEUL : constantes, aucun boot ni simulation de partie. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
export function grilleBundle(dossier) {
  const fichier=path.join(dossier,'build.html');
  if(!fs.existsSync(fichier))return null;
  const html=fs.readFileSync(fichier,'utf8'),debut=html.indexOf('/* ===== 02-regles.js ===== */');
  if(debut<0)return null;
  const suivant=/^\/\* ===== [0-9]{2}-[^\n]+\.js ===== \*\/$/gm;suivant.lastIndex=debut+1;
  const fin=suivant.exec(html)?.index,source=html.slice(debut,fin??html.length);
  const c={__N:{}};vm.createContext(c);vm.runInContext(source,c,{timeout:1000});
  return {...JSON.parse(JSON.stringify(c.__N.R.rythme)),origine:'N.R.rythme du build.html figé',sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};
}
export const grilleDonnees=(d,grille=null)=>d.rythmeRegles||grille;
/* La noire reste publiée pour comparaison. Les apparitions ET les annonces de tirs
   utilisent R.subdivisions (31-rythme.annonce). Aucun repli silencieux vers 2. */
export function ecartGrille(e,regles=null) {
  const phase=e.beat?.phase,division=e.subdivisions??regles?.subdivisions;
  if(!Number.isFinite(phase)||!(e.bpm>0)||!Number.isInteger(division)||division<1)return null;
  const u=phase*division;
  return (u-Math.round(u))*60000/e.bpm/division;
}
export const ecartNoire=e=>Number.isFinite(e.beat?.phase)&&e.bpm>0?(e.beat.phase-Math.round(e.beat.phase))*60000/e.bpm:null;
export function recalculerEvenements(d,regles=null) {
  const g=grilleDonnees(d,regles);
  return (d.evenements||[]).map(e=>({...e,subdivisions:e.subdivisions??g?.subdivisions??null,
    ecartNoireMs:ecartNoire(e),ecartAudioMs:ecartGrille(e,g)===null?null:Math.abs(ecartGrille(e,g))}));
}
