/* Concatène proto-neon/src/*.js (ordre lexicographique) dans proto-neon/index.html.
   Même principe que snake2030/build.mjs : une seule fermeture, contrôle de syntaxe avant écriture,
   sortie 0 si et seulement si le bundle est valide. Aucune dépendance, aucun actif externe. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const ARGS = process.argv.slice(2);
const EMBED = ARGS.includes('--embed');                              // --embed : un seul fichier autonome, blocs de musique inline
const POS = ARGS.filter(a => !a.startsWith('--'));
const OUT = POS[0] ? path.resolve(POS[0]) : path.join(HERE, 'index.html');   // sortie ailleurs pour un essai

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
if (!files.length) { console.error('build : aucun module dans src/'); process.exit(2); }
const ART = path.join(HERE, "art");
const artFiles = fs.existsSync(ART) ? fs.readdirSync(ART).filter(f => f.endsWith(".png")).sort() : [];
/* les illustrations propres aux deux pilotes (« -elle », « -lui », retrouvailles, teaser) ne sont pas inlinées : elles
   restent des fichiers à côté du jeu, que 05-art.js charge après le démarrage (le premier affichage sur iPhone
   n'attend pas leurs 600 ko) ; --embed les inline toutes, pour le fichier unique qui joue sans réseau */
const aPart = n => /-(elle|lui)$/.test(n) || n === 'retrouvailles' || n === 'teaser-3019';
let artRel = path.relative(path.dirname(OUT), ART).split(path.sep).join('/');
if (!artRel) artRel = '.';
const artValeur = f => (!EMBED && aPart(f.replace(/\.png$/, '')))
  ? JSON.stringify(artRel + '/' + f)
  : '"data:image/png;base64,' + fs.readFileSync(path.join(ART, f)).toString('base64') + '"';
const artSrc = "/* ===== préambule (build.mjs) : l objet partagé existe AVANT le premier module, quel que soit l ordre ===== */\nvar N = (typeof window !== \x27undefined\x27) ? (window.__N || (window.__N = {})) : {};\n\n/* ===== illustrations (générées, injectées par build.mjs) ===== */\nvar ART_SRC = {\n"
  + artFiles.map(f => "  " + JSON.stringify(f.replace(/\.png$/, "")) + ": " + artValeur(f)).join(",\n")
  + "\n};\n";
/* les clips de cinématique réellement présents dans cine/ : 05-art.js ne demande jamais un fichier absent */
const CINE = path.join(HERE, "cine");
const cineFiles = fs.existsSync(CINE) ? fs.readdirSync(CINE).filter(f => f.endsWith(".mp4")).sort() : [];
const cineSrc = "var CINE_DISPO = " + JSON.stringify(cineFiles.map(f => f.replace(/\.mp4$/, ""))) + ";\n";
/* la musique : musique/nv-NN.mp3 et piste.json (tools/musique/decoupe.mjs), chargés à la demande par 30-music.js.
   MUSIQUE_BASE = le chemin relatif DU FICHIER PRODUIT jusqu'à proto-neon/musique/ ('musique/' pour index.html,
   '../../musique/' pour tools/<lot>/index.html). MUSIQUE_EMBED : null, ou, avec --embed, la piste et tous les
   blocs en base64 (le jeu tient alors dans un seul fichier, qui joue sans réseau). */
const MUS = path.join(HERE, 'musique');
const musFiles = fs.existsSync(MUS) ? fs.readdirSync(MUS).filter(f => /^nv-\d+\.mp3$/.test(f)).sort() : [];
const musJson = path.join(MUS, 'piste.json');
let musRel = path.relative(path.dirname(OUT), MUS).split(path.sep).join('/');
if (!musRel) musRel = '.';
const musicSrc = 'var MUSIQUE_BASE = ' + JSON.stringify(musRel + '/') + ';\n'
  + 'var MUSIQUE_EMBED = ' + ((EMBED && musFiles.length && fs.existsSync(musJson))
    ? '{ piste: ' + fs.readFileSync(musJson, 'utf8').trim() + ', blocs: {\n'
      + musFiles.map(f => '  ' + JSON.stringify(f) + ': "data:audio/mpeg;base64,' + fs.readFileSync(path.join(MUS, f)).toString('base64') + '"').join(',\n') + '\n} }'
    : 'null') + ';\n';
const parts = [artSrc + cineSrc + musicSrc].concat(files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(SRC, f), "utf8")));
const script = '"use strict";\n(function(){' + parts.join('\n') + '\nboot();})();';

try { new vm.Script(script, { filename: 'proto-neon.bundle.js' }); }
catch (e) { console.error('build : erreur de syntaxe —', e.message); process.exit(1); }

let html = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0d0221">
<link rel="icon" href="data:,">
<title>SNAKE 2975</title>
<style>
html,body{margin:0;padding:0;background:#0d0221;overflow:hidden;height:100%;
  -webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent;touch-action:none}
#app{position:fixed;inset:0;overflow:hidden}
#out{position:absolute;inset:0;width:100%;height:100%;display:block;
  image-rendering:pixelated;image-rendering:crisp-edges}
#ui{position:absolute;inset:0;pointer-events:none;font:12px/1.2 ui-monospace,Menlo,monospace;color:#fffce8}
#ui button{pointer-events:auto;font:inherit}
</style></head><body>
<div id="app"><canvas id="out"></canvas><div id="ui"></div></div>
<script>${script}</script>
</body></html>`;

/* un panneau d'essai à côté de la sortie (tools/<lot>/panneau.html) est inséré avant </body> : boutons, curseurs,
   affichage d'état. Il n'existe que pour les pages d'essai ; index.html n'en a pas. */
const PANNEAU = path.join(path.dirname(OUT), 'panneau.html');
if (OUT !== path.join(HERE, 'index.html') && fs.existsSync(PANNEAU)) html = html.replace('</body>', () => fs.readFileSync(PANNEAU, 'utf8') + '\n</body>');
fs.writeFileSync(OUT, html);
const bytes = Buffer.byteLength(html);
console.log(`build : ${files.length} modules, ${bytes} octets → index.html`);
for (const f of files) console.log('  ' + f);
for (const f of artFiles) console.log('  art/' + f);
for (const f of cineFiles) console.log('  cine/' + f);
console.log('  musique : ' + musFiles.length + ' blocs, MUSIQUE_BASE = ' + musRel + '/' + (EMBED ? ' (--embed : inline)' : ''));
process.exit(0);
