/* tools/fx/voir-att.mjs — la 4e grosse explosion d'une même seconde, vue image par image */
import path from 'node:path';
import { build, lancer, ouvrir, attendre, planche, OUT } from './commun.mjs';
const profil = process.argv[2] || 'iphone', crt = process.argv[3] || 'coupe';
build();
const browser = await lancer();
const { page } = await ouvrir(browser, profil, { crt });
const K0 = 20;
await page.evaluate(K0 => {
  const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
  T.markers = [[40, 40], [40, g.H - 44]];
  for (let i = 0; i < 4; i++) T.act[K0 + 15 * i] = () => { T.ret = (T.ret || []).concat(fx.boom(Math.round(g.W * (0.3 + 0.13 * i)), Math.round(g.H * 0.5), 1.0, 'magenta')); };
  for (const v of [0, 2, 15, 17, 30, 32, 45, 46, 47, 49, 52, 56, 60, 66, 72, 80]) T.shotAt[K0 + v] = true;
  T.k = 0; T.on = true;
}, K0);
await attendre(page, K0 + 85);
const res = await page.evaluate(() => ({ shots: window.__FXT.shots, ret: window.__FXT.ret, st: window.__N.fx.stats }));
const ks = Object.keys(res.shots).map(Number).sort((a, b) => a - b);
await planche(page, ks.map(k => res.shots[k]), ks.map(k => `+${k - K0}${k - K0 >= 45 ? ' (4e)' : ''}`), 4, path.join(OUT, `att-${profil}-${crt}.png`));
console.log('retours de boom', res.ret, JSON.stringify(res.st));
await browser.close();
