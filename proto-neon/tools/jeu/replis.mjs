/* tools/jeu/replis.mjs — le jeu sans ses voisins : N.spr, N.fx et N.intro retirés à chaud, une partie de 90 s
   au pilote, puis la fin. Vérifie que les replis de 70-game.js tiennent (zéro erreur) et capture. */
import { chromium, devices } from 'playwright';
const OUT = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await page.addInitScript(() => { window.__SEED = 11; window.__DT = 1 / 60; window.__MODE = 'expert'; window.__CHECK = [{ t: 40, name: 'a' }, { t: 79.5, name: 'b' }]; });
await page.addInitScript({ path: OUT + 'pilote.js' });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => { const N = window.__N; delete N.spr; delete N.fx; delete N.intro; N.game.reset(11); });
const shots = [];
for (let k = 0; k < 4000; k++) {
  const s = await page.evaluate(() => ({ held: window.__HOLD ? window.__LOG.held : null, t: window.__N.game.dbg().t, st: window.__N.game.dbg().st }));
  if (s.held) { const f = OUT + 'repli-' + s.held + '.png'; await page.screenshot({ path: f }); shots.push(f); await page.evaluate(() => { window.__HOLD = false; }); continue; }
  if (s.st === 'fin' || s.t > 90) break;
  await page.waitForTimeout(40);
}
await page.evaluate(() => { const d = window.__N.game.dbg(); d.P.lives = 1; d.P.invul = 0; });
await page.waitForFunction(() => { const d = window.__N.game.dbg(); if (d.st !== 'jeu') return true; d.P.invul = 0; const e = d.E.find(x => !x.dead && x.k !== 'colosse'); if (e) { e.x = d.P.x; e.y = d.P.y; } return false; }, null, { timeout: 60000, polling: 16 });
await page.waitForFunction(() => window.__N.game.dbg().st === 'fin' && window.__N.game.dbg().finT > 1, null, { timeout: 60000 });
await page.screenshot({ path: OUT + 'repli-fin.png' }); shots.push(OUT + 'repli-fin.png');
console.log(JSON.stringify({ err: await page.evaluate(() => window.__ERR), errs: errs.slice(0, 5), stats: await page.evaluate(() => { const d = window.__N.game.dbg(); return { t: d.t, st: d.st, kills: d.kills, boss: d.stats.bossT, inView: d.stats.inView }; }), shots }, null, 1));
await browser.close();
