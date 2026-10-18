import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } })).newPage();
const logs = []; page.on('pageerror', e => logs.push(e.message));
await page.addInitScript(() => { localStorage.removeItem('snake2975.pilotes'); });
await page.goto('http://127.0.0.1:8133/proto-neon/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__N.aventure);
const st = () => page.evaluate(() => ({ jeu: window.__N.game.etat(), etape: window.__N.aventure.etape ? window.__N.aventure.etape() : null }));
const journal = []; const note = async () => { const s = await st(); const k = s.jeu + '/' + s.etape; if (journal[journal.length - 1] !== k) journal.push(k); return s; };
/* jusqu'au titre puis JOUER */
for (let i = 0; i < 120; i++) { const s = await note(); if (s.jeu === 'aventure') break;
  await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); });
  await page.touchscreen.tap(600, 200); await page.waitForTimeout(250); }
/* l'aventure jusqu'au néon */
for (let i = 0; i < 400; i++) { const s = await note(); if (s.jeu !== 'aventure') break;
  await page.evaluate(() => { const N = window.__N, et = N.aventure.etape();
    if (et === 'choix') return; if (et === '1976' && N.terminal.actif()) N.terminal.skip(); else if (et === '1982' && N.arcade && N.arcade.actif()) N.arcade.skip(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
  if ((await st()).etape === 'choix') await page.touchscreen.tap(200, 200);
  await page.waitForTimeout(200); }
console.log('néon :', JSON.stringify(await st()));
/* la victoire → apothéose → l'aventure reprend : films, 2975, fin */
await page.evaluate(() => window.__N.game.dbg.etat('victoire'));
let vu = null;
for (let i = 0; i < 600; i++) { const s = await note();
  if (s.etape === '2975' && !vu) { await page.waitForTimeout(2000); await page.screenshot({ path: 'reel-2975.png' });
    vu = await page.evaluate(() => ({ cosmos: window.__N.cosmos.actif(), liste: window.__N.ennemis.list.length })); console.log('2975 :', JSON.stringify(vu)); }
  if (s.jeu === 'fin' || s.jeu === 'titre') break;
  await page.evaluate(() => { const N = window.__N, et = N.aventure.etape && N.aventure.etape();
    if (N.intro && N.intro.current && N.intro.current()) N.intro.skip();
    if (et === '2975') N.aventure.sauter(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
  await page.waitForTimeout(250); }
const fin = await st(); await page.waitForTimeout(800); await page.screenshot({ path: 'reel-fin.png' });
console.log('fin :', JSON.stringify(fin), 'joués :', JSON.stringify(await page.evaluate(() => window.__N.aventure.state().joues)));
console.log('journal :', journal.join(' | '));
console.log('ERR', await page.evaluate(() => window.__ERR ? window.__ERR.count : -1), logs.slice(0, 5));
await browser.close();
