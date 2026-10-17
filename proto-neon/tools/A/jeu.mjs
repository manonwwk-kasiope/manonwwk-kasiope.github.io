/* tools/A/jeu.mjs — ouvre la page, saute l'ouverture, joue N secondes (pas imposé), capture et rend l'état.
   Usage : node tools/A/jeu.mjs [--url URL] [--profil paysage|portrait|bureau] [--secs N] [--out fichier.png] [--vague n] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8121/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const SECS = +arg('--secs', '5');
const OUT = arg('--out', '');
const VAGUE = +arg('--vague', '0');
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[PROFIL];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); });
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
if (VAGUE) await page.evaluate(v => window.__N.game.dbg.vague(v), VAGUE);
const t0 = await page.evaluate(() => window.__N.game.dbg().t);
await page.waitForFunction((s) => window.__N.game.dbg().t >= s, t0 + SECS, { timeout: 120000, polling: 100 });
const info = await page.evaluate(() => { const d = window.__N.game.dbg(); return { etat: d.etat, t: +d.t.toFixed(2), vague: d.vague, len: d.P.len, vies: d.P.lives, score: d.score, ennemis: d.E.length, butin: d.CELLS.length, tirsE: d.EB.length, W: d.W, H: d.H, err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 6) }; });
if (OUT) await page.screenshot({ path: OUT });
console.log(JSON.stringify(info));
console.log(logs.slice(0, 12).join('\n'));
await browser.close();
