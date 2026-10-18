import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } })).newPage();
const logs = []; page.on('pageerror', e => logs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await page.addInitScript(() => { window.__SEED = 5; window.__DT = 1 / 60; localStorage.removeItem('snake2975.pilotes'); });
await page.goto('http://127.0.0.1:8133/proto-neon/demo/index.html');
await page.waitForFunction(() => window.__N && window.__demo);
const etat = () => page.evaluate(() => window.__demo.etat());
const shot = async n => { await page.waitForTimeout(600); await page.screenshot({ path: `demo/${n}.png` }); };
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__demo.etat().etape === 'choix', null, { timeout: 15000 });
console.log('1', JSON.stringify(await etat())); await shot('01-choix');
await page.waitForTimeout(500);
await page.mouse.click(200, 200);                                   // ELLE (moitié gauche)
const journal = [];
for (let i = 0; i < 400; i++) {
  const e = await etat();
  const k = e.etape + '/' + e.neon + '/' + e.jeu;
  if (journal[journal.length - 1] !== k) { journal.push(k); if (journal.length < 40) await shot(String(journal.length).padStart(2, '0') + '-' + e.etape); }
  if (e.neon) break;
  await page.evaluate(() => { const N = window.__N, et = N.aventure.etape();
    if (et === '1976' && N.terminal.actif()) N.terminal.skip(); else if (et === '1982' && N.arcade && N.arcade.actif()) N.arcade.skip(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
  await page.waitForTimeout(150);
}
console.log('neon', JSON.stringify(await etat()));
await page.waitForTimeout(1500); await shot('20-neon-jeu');
await page.evaluate(() => { const g = window.__N.game; g.dbg.god(true); g.dbg.vague(3); });
await page.waitForTimeout(800);
console.log('vague3', JSON.stringify(await etat())); await shot('21-profondeur');
for (let i = 0; i < 60 && !(await etat()).neon; i++) { await page.evaluate(() => { const F = window.__N.film; if (F && F.actif && F.actif()) F.sauter(); }); await page.waitForTimeout(150); }
console.log('retour', JSON.stringify(await etat()));
await page.evaluate(() => { window.__N.game.dbg.etat('victoire'); });
for (let i = 0; i < 200; i++) { const e = await etat(); if (!e.neon && e.etape === 'fin') break; await page.evaluate(() => { const N = window.__N; if (N.intro.current && N.intro.current()) N.intro.skip(); const et = N.aventure.etape(); if (et === '2975') N.aventure.sauter(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); }); await page.waitForTimeout(150); }
console.log('fin', JSON.stringify(await etat())); await shot('22-fin');
console.log('journal', journal.join(' | '));
console.log('ERR', await page.evaluate(() => window.__ERR.count), logs.slice(0, 5));
await browser.close();
