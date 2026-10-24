// Captures de l'ouverture à des instants donnés (horloge de 60-intro.js), dans un profil d'écran.
// usage : node voir.mjs <paysage|portrait|bureau> t1 t2 ...   -> cap/<profil>-<t>.png
import { chromium, devices } from 'playwright';
const prof = process.argv[2] || 'paysage';
const times = process.argv.slice(3).map(Number);
const PAGE = 'http://127.0.0.1:8112/proto-neon/tools/intro/index.html';
const P = {
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}[prof];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror ' + e.message));
await page.addInitScript(() => { window.__DT = 1 / 60; window.__SEED = 2975; });
await page.goto(PAGE);
await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready(), null, { timeout: 15000 });
for (const T of times) {
  await page.waitForFunction((T) => { const s = window.__N.intro.state(); if (s.t >= T || s.mode !== 'ouverture') { window.__DT = 1e-9; return true; } return false; }, T, { polling: 'raf', timeout: 60000 });
  await page.waitForTimeout(80);
  const st = await page.evaluate(() => ({ ...window.__N.intro.state(), W: window.__N.gfx.W, H: window.__N.gfx.H, PX: window.__N.gfx.PX, safe: window.__S.view.safe }));
  const f = `cap/${prof}-${T.toFixed(2)}.png`;
  await page.screenshot({ path: new URL(f, import.meta.url).pathname });
  console.log(f, JSON.stringify(st));
  await page.evaluate(() => { window.__DT = 1 / 60; });
}
console.log('erreurs console :', errs.length, errs.slice(0, 6).join(' | '));
console.log('__ERR :', JSON.stringify(await page.evaluate(() => window.__ERR)));
await browser.close();
