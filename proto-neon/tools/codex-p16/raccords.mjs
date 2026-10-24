// Produit un correctif du fichier réservé sans l'écrire. Mutation de table par rangée, mêmes index et même ordre.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function decor(src) {
  const avant=`      for (var sx = 0; sx < g.W; sx++) {
        var table = B[br | (sx & 3)] === 0 ? lutAccentJeu : lutLointainJeu;
        b[row + sx] = table[b[row + sx]];
      }`;
  const apres=`      // Une table par sous-colonne, résolue une fois par rangée (Bayer reste en phase écran).
      var t0 = B[br] === 0 ? lutAccentJeu : lutLointainJeu;
      var t1 = B[br | 1] === 0 ? lutAccentJeu : lutLointainJeu;
      var t2 = B[br | 2] === 0 ? lutAccentJeu : lutLointainJeu;
      var t3 = B[br | 3] === 0 ? lutAccentJeu : lutLointainJeu;
      var sx = 0, fin = g.W - 3;
      for (; sx < fin; sx += 4) {
        b[row + sx] = t0[b[row + sx]];
        b[row + sx + 1] = t1[b[row + sx + 1]];
        b[row + sx + 2] = t2[b[row + sx + 2]];
        b[row + sx + 3] = t3[b[row + sx + 3]];
      }
      for (; sx < g.W; sx++) {
        var table = B[br | (sx & 3)] === 0 ? lutAccentJeu : lutLointainJeu;
        b[row + sx] = table[b[row + sx]];
      }`;
  if(!src.includes(avant))throw Error('taireFondJeu a changé : raccord à rebaser, ne pas appliquer en aveugle');
  return src.replace(avant,apres);
}
export function cameraSimulation(src) {
  const attentes=[
    ["/* la caméra suit la tête à chaque pas de jeu (le mode simulé l'avance lui-même) */", "/* la caméra suit la tête au même endroit en mode dessiné et simulé */"],
    ["if (!simulant && modOk(N.cam, 'update')) N.cam.update(dt);", "if (modOk(N.cam, 'update')) N.cam.update(dt);"],
    ["if (!simulant && N.cam && N.cam.update) appel('cam.update', function () { N.cam.update(dt); });", "if (N.cam && N.cam.update) appel('cam.update', function () { N.cam.update(dt); });"],
    ["      if (N.cam && N.cam.update) N.cam.update(dt);\n", "      /* La caméra avance dans update(), au même endroit que dans frame(). */\n"]
  ];
  for(const [a,b] of attentes){if(!src.includes(a))throw Error('raccord caméra à rebaser');src=src.replace(a,b);}
  return src;
}
// Diagnostic p16c : le reliquat en images est figé quand dbg.simuler ne dessine pas.
// Lire le gel public consommé par le pas fixe pour borner la durée d'un nouveau ralenti.
export function gelSimulation(src) {
  const a = 'var gl = hitstopLeft() / 60;';
  const b = 'var gl = N.horloge && N.horloge.etat ? N.horloge.etat().gel : hitstopLeft() / 60;';
  if (!src.includes(a)) throw Error('raccord gel à rebaser');
  return src.replace(a, b);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const here=new URL('./',import.meta.url);
  for(const [nom,transform] of [['15-decor.js',decor],['79-jeu.js',cameraSimulation]]) {
  const f=new URL('../../src/'+nom,import.meta.url),a=fs.readFileSync(f,'utf8'),b=transform(a);
  const af=new URL('decor-avant.txt',here),bf=new URL('decor-raccord.txt',here);fs.writeFileSync(af,a);fs.writeFileSync(bf,b);
  let patch='';try{execFileSync('diff',['-u','--label','a/proto-neon/src/'+nom,'--label','b/proto-neon/src/'+nom,fileURLToPath(af),fileURLToPath(bf)],{encoding:'utf8'});}catch(e){if(e.status!==1)throw e;patch=e.stdout;}
  fs.writeFileSync(new URL('raccord-'+nom+'.patch',here),patch);fs.unlinkSync(af);fs.unlinkSync(bf);
  }
}
