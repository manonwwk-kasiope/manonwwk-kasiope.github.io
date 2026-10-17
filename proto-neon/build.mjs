/* Concatène proto-neon/src/*.js (ordre lexicographique) dans proto-neon/index.html.
   Même principe que snake2030/build.mjs : une seule fermeture, contrôle de syntaxe avant écriture,
   sortie 0 si et seulement si le bundle est valide. Aucune dépendance externe.

     node build.mjs                      -> proto-neon/index.html
     node build.mjs tools/L3a/index.html -> une page d'essai ailleurs (chemins des actifs recalculés)
     node build.mjs --embed [sortie]     -> un fichier unique, autonome : la musique et les clips sont inline

   Contrat 1.0 (REFONTE.md § 7.13, DIRECTION.md) : le bundle reçoit, avant le premier module,
     ART_SRC        les illustrations de art/ (URI de données, comme avant) ;
     CINE_DISPO     les clips présents dans cine/ ; CINE_BASE le chemin de cine/ relatif au fichier produit ;
     MUSIQUE_LISTE  les blocs de musique/ (*.mp3) et piste.json s'il existe ;
     MUSIQUE_BASE   le chemin de musique/ relatif au fichier produit ('' avec --embed) ;
     MUSIQUE_EMBED, CINE_EMBED   avec --embed seulement : {nom de fichier: URI de données}. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const args = process.argv.slice(2);
const EMBED = args.includes('--embed');
const pos = args.filter(a => !a.startsWith('--'));
const OUT = pos[0] ? path.resolve(pos[0]) : path.join(HERE, EMBED ? 'snake2975.html' : 'index.html');   // sortie ailleurs pour un essai

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
if (!files.length) { console.error('build : aucun module dans src/'); process.exit(2); }

/* chemin relatif du dossier du fichier produit vers un dossier de proto-neon, en séparateurs web */
function relatif(dossier) {
  let r = path.relative(path.dirname(OUT), path.join(HERE, dossier)).split(path.sep).join('/');
  if (!r) r = '.';
  return r.endsWith('/') ? r : r + '/';
}
function uri(f, type) { return 'data:' + type + ';base64,' + fs.readFileSync(f).toString('base64'); }

const ART = path.join(HERE, 'art');
const artFiles = fs.existsSync(ART) ? fs.readdirSync(ART).filter(f => f.endsWith('.png')).sort() : [];
const artSrc = "/* ===== préambule (build.mjs) : l objet partagé existe AVANT le premier module, quel que soit l ordre ===== */\nvar N = (typeof window !== \x27undefined\x27) ? (window.__N || (window.__N = {})) : {};\n\n/* ===== illustrations (générées, injectées par build.mjs) ===== */\nvar ART_SRC = {\n"
  + artFiles.map(f => "  " + JSON.stringify(f.replace(/\.png$/, "")) + ": \"data:image/png;base64," + fs.readFileSync(path.join(ART, f)).toString("base64") + "\"").join(",\n")
  + "\n};\n";
/* les clips de cinématique réellement présents dans cine/ : 05-art.js ne demande jamais un fichier absent */
const CINE = path.join(HERE, 'cine');
const cineFiles = fs.existsSync(CINE) ? fs.readdirSync(CINE).filter(f => f.endsWith('.mp4')).sort() : [];
let cineSrc = 'var CINE_DISPO = ' + JSON.stringify(cineFiles.map(f => f.replace(/\.mp4$/, ''))) + ';\n'
  + 'var CINE_BASE = ' + JSON.stringify(EMBED ? '' : relatif('cine')) + ';\n';
if (EMBED) cineSrc += 'var CINE_EMBED = {' + cineFiles.map(f => JSON.stringify(f.replace(/\.mp4$/, '')) + ':' + JSON.stringify(uri(path.join(CINE, f), 'video/mp4'))).join(',') + '};\n';
/* la musique de la propriétaire, découpée en blocs (lot 7a) : chargée à la demande par 30-music.js */
const MUS = path.join(HERE, 'musique');
const musFiles = fs.existsSync(MUS) ? fs.readdirSync(MUS).filter(f => f.endsWith('.mp3') || f === 'piste.json').sort() : [];
let musSrc = 'var MUSIQUE_LISTE = ' + JSON.stringify(musFiles) + ';\n'
  + 'var MUSIQUE_BASE = ' + JSON.stringify(EMBED ? '' : relatif('musique')) + ';\n';
if (EMBED) musSrc += 'var MUSIQUE_EMBED = {' + musFiles.map(f => JSON.stringify(f) + ':' + JSON.stringify(uri(path.join(MUS, f), f.endsWith('.json') ? 'application/json' : 'audio/mpeg'))).join(',') + '};\n';

const parts = [artSrc + cineSrc + musSrc].concat(files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(SRC, f), 'utf8')));
const script = '"use strict";\n(function(){' + parts.join('\n') + '\nboot();})();';

try { new vm.Script(script, { filename: 'proto-neon.bundle.js' }); }
catch (e) { console.error('build : erreur de syntaxe —', e.message); process.exit(1); }

const html = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0d0221">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="icon" href="data:,">
<title>SNAKE 2975</title>
<style>
html,body{margin:0;padding:0;background:#0d0221;overflow:hidden;height:100%;overscroll-behavior:none;
  -webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent;touch-action:none;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#app{position:fixed;inset:0;overflow:hidden}
#out{position:absolute;inset:0;width:100%;height:100%;display:block;
  image-rendering:pixelated;image-rendering:crisp-edges}
#ui{position:absolute;inset:0;pointer-events:none;font:12px/1.2 ui-monospace,Menlo,monospace;color:#fffce8}
#ui button{pointer-events:auto;font:inherit}
</style></head><body>
<div id="app"><canvas id="out"></canvas><div id="ui"></div></div>
<script>${script}</script>
</body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const bytes = Buffer.byteLength(html);
console.log(`build : ${files.length} modules, ${bytes} octets → ${path.relative(process.cwd(), OUT) || OUT}${EMBED ? ' (autonome, --embed)' : ''}`);
for (const f of files) console.log('  ' + f);
for (const f of artFiles) console.log('  art/' + f);
for (const f of cineFiles) console.log('  cine/' + f + (EMBED ? ' (inline)' : ''));
for (const f of musFiles) console.log('  musique/' + f + (EMBED ? ' (inline)' : ''));
if (!EMBED) console.log(`  MUSIQUE_BASE = ${relatif('musique')}  CINE_BASE = ${relatif('cine')}`);
process.exit(0);
