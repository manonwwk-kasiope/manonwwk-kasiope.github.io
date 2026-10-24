/* Construit la page d'essai du lot B : le bundle ordinaire (build.mjs) + le banc essai.js, injecté après lui.
   Usage : node proto-neon/tools/B/construire.mjs   ->  proto-neon/tools/B/index.html
   (la commande `node proto-neon/build.mjs proto-neon/tools/B/index.html` donne le bundle seul, sans le banc.) */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'index.html');
execFileSync(process.execPath, [path.join(ROOT, 'build.mjs'), OUT], { stdio: 'inherit' });
const html = fs.readFileSync(OUT, 'utf8');
const banc = fs.readFileSync(path.join(HERE, 'essai.js'), 'utf8');
if (!html.includes('</body>')) { console.error('construire : pas de </body>'); process.exit(1); }
fs.writeFileSync(OUT, html.replace('</body>', () => '<script>' + banc + '</script>\n</body>'));
console.log('construire : banc essai.js injecté → tools/B/index.html (' + fs.statSync(OUT).size + ' octets)');
