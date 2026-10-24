/* Banc de mesure du compositeur.
   Au 17/10, src/05-art.js (propriete du pilote) ecrit sur un N global qu'aucun module n'a encore
   affecte a ce moment-la : les autres modules declarent leur N LOCAL dans leur fermeture et ne
   partagent que window.__N. Resultat, le bundle leve « Cannot set properties of undefined (setting
   'art') » et boot() n'est jamais atteint. Je ne touche pas a un fichier dont je ne suis pas
   proprietaire : ce banc reconstruit le MEME bundle, a partir des MEMES sources, en ajoutant
   seulement la ligne de prologue qui manque. Des que 05-art.js la portera, preuve.mjs mesurera
   directement index.html — il essaie index.html d'abord et ne retombe ici qu'en cas d'echec. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SRC = path.join(ROOT, 'src');
const ART = path.join(ROOT, 'art');

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
const artFiles = fs.existsSync(ART) ? fs.readdirSync(ART).filter(f => f.endsWith('.png')).sort() : [];
const artSrc = 'var ART_SRC = {\n'
  + artFiles.map(f => '  ' + JSON.stringify(f.replace(/\.png$/, '')) + ': "data:image/png;base64,'
    + fs.readFileSync(path.join(ART, f)).toString('base64') + '"').join(',\n') + '\n};\n';

const PROLOGUE = '/* ligne manquante dans 05-art.js, ajoutee ici et nulle part ailleurs */\n'
  + 'var N = (typeof window !== "undefined") ? (window.__N || (window.__N = {})) : {};\n';

const parts = [artSrc, PROLOGUE].concat(files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(SRC, f), 'utf8')));
const script = '"use strict";\n(function(){' + parts.join('\n') + '\nboot();})();';
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>NEON 2084 — banc du compositeur</title>
<style>html,body{margin:0;padding:0;background:#0d0221;overflow:hidden;height:100%;touch-action:none}
#app{position:fixed;inset:0;overflow:hidden}
#out{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated}
#ui{position:absolute;inset:0;pointer-events:none;font:12px/1.2 ui-monospace,monospace;color:#fffce8}
</style></head><body><div id="app"><canvas id="out"></canvas><div id="ui"></div></div>
<script>${script}</script></body></html>`;
fs.writeFileSync(path.join(HERE, 'banc.html'), html);
console.log('banc : ' + files.length + ' modules -> tools/compositeur/banc.html');
