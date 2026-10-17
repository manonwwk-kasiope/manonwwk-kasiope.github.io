/* tools/fx/jeu.mjs — les explosions dans la VRAIE partie (tous les modules), tube allumé.
   L'ouverture est sautée d'une touche, le jeu tourne seul (tir automatique), puis une grosse explosion
   est posée au milieu des ennemis : on voit si menaces, joueuse et interface restent lisibles par-dessus. */
import fs from 'node:fs';
import path from 'node:path';
import { build, lancer, PROFILS, URL, OUT, planche } from './commun.mjs';
build();
const profil = process.argv[2] || 'iphone', crt = process.argv[3] || 'riche';
const browser = await lancer();
const ctx = await browser.newContext(PROFILS[profil]);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
await page.addInitScript(() => { window.__DT = 1 / 60; window.__SEED = 2975; });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.keyboard.press('Space');
await page.waitForTimeout(600);
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__S.phase !== 'intro', null, { timeout: 20000 });
await page.evaluate(c => { if (c === 'coupe') window.__N.crt.off = true; else window.__N.crt.preset(c); }, crt);
await page.waitForTimeout(9000);                      // une dizaine de secondes de partie : des ennemis, des kills
const shots = await page.evaluate(() => new Promise(res => {
  const N = window.__N, S = window.__S, out = {}, orig = N.crt.apply;
  let k = -1;
  const want = [0, 3, 8, 14, 22, 32];
  N.crt.apply = function (dt) {
    orig.call(N.crt, dt);
    if (k < 0) { k = 0; const g = N.gfx; N.fx.boom(Math.round(g.W * 0.62), Math.round(g.H * 0.45), 1, 'magenta'); N.fx.hitstop(5); }
    if (want.includes(k)) out[k] = N.gfx.canvas().toDataURL('image/png');
    if (++k > 32) { N.crt.apply = orig; res(out); }
  };
}));
const ks = Object.keys(shots).map(Number).sort((a, b) => a - b);
await planche(page, ks.map(k => shots[k]), ks.map(k => `${profil} en jeu +${k}`), 2, path.join(OUT, `jeu-${profil}-${crt}.png`));
const etat = await page.evaluate(() => ({ phase: window.__S.phase, err: window.__ERR, fx: window.__N.fx.stats, kills: window.__N.game.dbg ? window.__N.game.dbg().kills : null }));
console.log(JSON.stringify(etat), errs);
await browser.close();
