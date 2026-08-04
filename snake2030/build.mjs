/* Assemble les modules de src/ en un fichier HTML autonome.
   node build.mjs            -> index.html (musique en fichier séparé)
   node build.mjs --embed X  -> dist-embed.html (musique en base64 dans la page) */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(HERE, 'src');

const ORDER = [
  '10-core.js',
  '20-fx.js',
  '21-audio.js',
  '22-enemies.js',
  '23-weapons.js',
  '24-upgrades.js',
  '25-levels.js',
  '26-ui.js',
  '27-phases.js',
  '90-boot.js',
];

const missing = ORDER.filter(f => !fs.existsSync(path.join(SRC, f)));
if (missing.length) {
  console.error('modules manquants :', missing.join(', '));
  process.exit(1);
}

const parts = ORDER.map(f => {
  const code = fs.readFileSync(path.join(SRC, f), 'utf8');
  return `\n/* ==== ${f} ${'='.repeat(Math.max(0, 60 - f.length))} */\n${code}`;
});

const embedArg = process.argv.indexOf('--embed');
let musicDecl = '';
let outName = 'index.html';
if (embedArg > -1) {
  const mp3 = process.argv[embedArg + 1];
  const b64 = fs.readFileSync(mp3).toString('base64');
  musicDecl = `var MUSIC_B64 = ${JSON.stringify(b64)};\n`;
  outName = 'dist-embed.html';
}

const script = `"use strict";\n(function(){\n${musicDecl}${parts.join('\n')}\n\nboot();\n})();`;

// contrôle de syntaxe avant écriture : mieux vaut échouer ici que dans le navigateur
try { new vm.Script(script); }
catch (e) { console.error('ERREUR DE SYNTAXE dans le bundle :', e.message); process.exit(1); }

const HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>SNAKE 2030</title>
<meta name="description" content="Snake arcade survival synthwave : pilote un serpent cybernétique armé, survis à la surcharge.">
<meta name="theme-color" content="#05060f">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SNAKE 2030">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2305060f'/%3E%3Cpath d='M10 42c0-10 14-8 14-18S10 14 10 10' stroke='%2300e5ff' stroke-width='7' fill='none' stroke-linecap='round'/%3E%3Cpath d='M40 24l14 8-14 8z' fill='%23ff2e63'/%3E%3C/svg%3E">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;background:#05060f;overscroll-behavior:none;
  touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#app{position:fixed;inset:0;touch-action:none}
#game{display:block;width:100%;height:100%}
#ui{position:fixed;inset:0;pointer-events:none;z-index:10}
#rotate{position:fixed;inset:0;z-index:99;display:none;align-items:center;justify-content:center;
  flex-direction:column;gap:18px;background:#05060f;color:#00e5ff;text-align:center;
  font:600 15px/1.5 system-ui,-apple-system,sans-serif;letter-spacing:.16em;text-transform:uppercase}
#rotate svg{width:74px;height:74px;stroke:#00e5ff;fill:none;stroke-width:2}
body.portrait #rotate{display:flex}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms !important;transition-duration:.05ms !important}}
</style>
</head>
<body>
<div id="app">
  <canvas id="game"></canvas>
  <div id="ui"></div>
</div>
<div id="rotate">
  <svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="3"/><path d="M9 19h6"/></svg>
  <span>Tourne ton téléphone</span>
</div>
<script>
${script}
<\/script>
</body>
</html>
`;

fs.writeFileSync(path.join(HERE, outName), HTML);
const kb = (fs.statSync(path.join(HERE, outName)).size / 1024).toFixed(0);
console.log('écrit ' + outName + ' — ' + kb + ' Ko (' + ORDER.length + ' modules)');
