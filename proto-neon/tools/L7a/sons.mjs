/* tools/L7a/sons.mjs — recopie la banque de sons (sons/banque.js, sons/jouer.js) et la voix de la machine
   (sons/voix.js) dans src/30-music.js, entre les marqueurs « BANQUE-DEBUT » et « BANQUE-FIN ».

   Pourquoi une copie : build.mjs ne concatène que src/, et le lot 7a ne possède pas build.mjs. La banque
   reste écrite, mesurée et calibrée dans sons/ (son banc : tools/sons/mesure.mjs) ; ce script la reporte
   telle quelle dans le bundle. Chaque fichier est enfermé dans une fonction qui masque `window` et `module` :
   rien ne fuit sur l'objet global.

     node tools/L7a/sons.mjs            recopie les trois fichiers
     node tools/L7a/sons.mjs --sans-voix  sans la voix (N.music.voix rend alors false, les mots s'écrivent)

   À relancer après toute retouche de sons/*.js (puis tools/sons/mesure.mjs reste la preuve des recettes). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CIBLE = path.join(PN, 'src', '30-music.js');
const sansVoix = process.argv.includes('--sans-voix');

function lire(f) { return fs.readFileSync(path.join(PN, f), 'utf8'); }
function empreinte(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 12); }

const banque = lire('sons/banque.js'), jouer = lire('sons/jouer.js');
const voix = sansVoix ? null : lire('sons/voix.js');

let bloc = '/* BANQUE-DEBUT — partie générée par tools/L7a/sons.mjs : ne pas retoucher à la main.\n'
  + '   sons/banque.js ' + empreinte(banque) + ', sons/jouer.js ' + empreinte(jouer)
  + (voix ? ', sons/voix.js ' + empreinte(voix) : ', sans la voix') + ' */\n'
  + 'var SONS = (function () { var window = {}, module; // eslint-disable-line no-unused-vars\n' + banque + '\nreturn window.SONS_2975; })();\n'
  + 'var JOUER = (function () { var window = {}, module; // eslint-disable-line no-unused-vars\n' + jouer + '\nreturn window.SONS_2975_JOUER; })();\n'
  + (voix ? 'var VOIX = (function () { var module; // eslint-disable-line no-unused-vars\n' + voix + '\nreturn VOIX_2975; })();\n'
    : 'var VOIX = null;\n')
  + '/* BANQUE-FIN */';

const src = fs.readFileSync(CIBLE, 'utf8');
const a = src.indexOf('/* BANQUE-DEBUT'), b = src.indexOf('/* BANQUE-FIN */');
if (a < 0 || b < 0) { console.error('sons.mjs : marqueurs absents de src/30-music.js'); process.exit(1); }
fs.writeFileSync(CIBLE, src.slice(0, a) + bloc + src.slice(b + '/* BANQUE-FIN */'.length));
console.log('sons.mjs : banque' + (voix ? ', lecteur et voix' : ' et lecteur') + ' recopiés dans src/30-music.js ('
  + Math.round(bloc.length / 1024) + ' Ko)');
