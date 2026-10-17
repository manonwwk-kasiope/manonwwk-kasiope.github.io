/* tools/A/ev.mjs — exécute un fichier JS dans la page du jeu (état jeu, partie neuve) et affiche le résultat JSON.
   Usage : node tools/A/ev.mjs fichier.js [--profil paysage|portrait|bureau] */
import { chromium, devices } from 'playwright';
import fs from 'fs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8121/proto-neon/index.html');
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[arg('--profil', 'paysage')];
const code = fs.readFileSync(process.argv[2], 'utf8');
const browser = await chromium.launch();
const page = await (await browser.newContext(P)).newPage();
page.on('pageerror', e => console.log('pageerror: ' + e.message));
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const r = await page.evaluate(code);
console.log(JSON.stringify(r, null, 1));
await browser.close();
