/* tools/fx/voir-sansflash.mjs — « Flashs : non » : grosse et moyenne explosions entièrement atténuées */
import path from 'node:path';
import { build, lancer, ouvrir, attendre, planche, OUT } from './commun.mjs';
build();
const browser = await lancer();
const { page } = await ouvrir(browser, 'iphone', { crt: 'coupe' });
const K0 = 20;
await page.evaluate(K0 => {
  const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
  fx.setFlash(false);
  T.act[K0] = () => { T.r1 = fx.boom(Math.round(g.W * 0.4), Math.round(g.H * 0.5), 1.0, 'magenta'); fx.hitstop(5); };
  T.act[K0 + 40] = () => { T.r2 = fx.boom(Math.round(g.W * 0.8), Math.round(g.H * 0.5), 0.45, 'magenta'); };
  for (const v of [0, 4, 8, 14, 20, 28, 40, 44, 48, 54]) T.shotAt[K0 + v] = true;
  T.k = 0; T.on = true;
}, K0);
await attendre(page, K0 + 60);
const r = await page.evaluate(() => ({ shots: window.__FXT.shots, r1: window.__FXT.r1, r2: window.__FXT.r2, log: window.__FXT.log, geom: window.__FXT.geom() }));
const ks = Object.keys(r.shots).map(Number).sort((a, b) => a - b);
await planche(page, ks.map(k => r.shots[k]), ks.map(k => `sans flash +${k - K0}`), 4, path.join(OUT, 'sansflash.png'));
const n = r.geom.W * r.geom.H;
console.log('retours', r.r1, r.r2, '| part claire max (L>=0,1) :', (100 * Math.max(...r.log.filter(x => x.k >= K0).map(x => x.nBright)) / n).toFixed(2) + ' %', 'seuil', (100 * r.geom.thr / n).toFixed(2) + ' %');
await browser.close();
