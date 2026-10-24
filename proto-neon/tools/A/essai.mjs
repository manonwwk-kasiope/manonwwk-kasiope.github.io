/* tools/A/essai.mjs — essai rapide du lot 0b : charge le bundle, laisse tourner, rend l'état et les erreurs.
   Usage : node tools/A/essai.mjs [--url URL] [--profil paysage|portrait|bureau] [--secs N] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8121/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const SECS = +arg('--secs', '2');
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[PROFIL];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S, null, { timeout: 15000 });
await page.waitForTimeout(SECS * 1000);
const info = await page.evaluate(() => ({ etat: window.__N.game.etat(), err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 6), frame: window.__FRAME, modules: Object.keys(window.__N).join(' ') }));
console.log(JSON.stringify(info));
console.log(logs.slice(0, 12).join('\n'));
await browser.close();
