/* Concatène proto-neon/src/*.js (ordre lexicographique) dans proto-neon/index.html.
   Même principe que snake2030/build.mjs : une seule fermeture, contrôle de syntaxe avant écriture,
   sortie 0 si et seulement si le bundle est valide. Aucune dépendance, aucun actif externe. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const OUT = path.join(HERE, 'index.html');

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
if (!files.length) { console.error('build : aucun module dans src/'); process.exit(2); }
const ART = path.join(HERE, "art");
const artFiles = fs.existsSync(ART) ? fs.readdirSync(ART).filter(f => f.endsWith(".png")).sort() : [];
const artSrc = "/* ===== préambule (build.mjs) : l objet partagé existe AVANT le premier module, quel que soit l ordre ===== */\nvar N = (typeof window !== \x27undefined\x27) ? (window.__N || (window.__N = {})) : {};\n\n/* ===== illustrations (générées, injectées par build.mjs) ===== */\nvar ART_SRC = {\n"
  + artFiles.map(f => "  " + JSON.stringify(f.replace(/\.png$/, "")) + ": \"data:image/png;base64," + fs.readFileSync(path.join(ART, f)).toString("base64") + "\"").join(",\n")
  + "\n};\n";
const parts = [artSrc].concat(files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(SRC, f), "utf8")));
const script = '"use strict";\n(function(){' + parts.join('\n') + '\nboot();})();';

try { new vm.Script(script, { filename: 'proto-neon.bundle.js' }); }
catch (e) { console.error('build : erreur de syntaxe —', e.message); process.exit(1); }

const html = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0d0221">
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

fs.writeFileSync(OUT, html);
const bytes = Buffer.byteLength(html);
console.log(`build : ${files.length} modules, ${bytes} octets → index.html`);
for (const f of files) console.log('  ' + f);
for (const f of artFiles) console.log('  art/' + f);
process.exit(0);
