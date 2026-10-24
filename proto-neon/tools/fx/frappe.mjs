/* tools/fx/frappe.mjs — flash de frappe, étincelles, traînées */
import path from 'node:path';
import { build, lancer, ouvrir, attendre, planche, OUT } from './commun.mjs';
build();
const browser = await lancer();
const { page, errs } = await ouvrir(browser, 'iphone', { crt: 'coupe' });
const r = await page.evaluate(() => new Promise(res => {
  const T = window.__FXT, N = window.__N, fx = N.fx, g = N.gfx, S = window.__S;
  const e = { x: 120, y: 100, r: 6 }, big = { x: 300, y: 100, r: 40 };
  const log = [];
  N.game.drawTop = function () {
    g.circ(e.x, e.y, e.r, fx.isHit(e) ? fx.HIT : 5);
    log.push({ k: T.k, hit: fx.isHit(e), frozen: fx.frozen() });
  };
  T.act[10] = () => { T.r10 = fx.hit(e); };
  T.act[20] = () => { T.r20 = fx.hit(e); };
  T.act[25] = () => { T.r25 = fx.hit(e); };               // 0,083 s après : refusé (3/s au plus)
  T.act[50] = () => { T.r50 = fx.hit(e); fx.hitstop(3); };
  T.act[60] = () => { T.big = []; };
  /* un objet de rayon 40 (aire 5 027) est sous le seuil iPhone (5 431) : il blanchit sans place du limiteur */
  T.act[61] = () => { T.big.push(fx.hit(big)); };
  T.act[90] = () => { T.big.push(fx.hit(big)); };
  /* étincelles vers la droite, et une traînée en arc */
  T.act[100] = () => { fx.spark(200, 150, 1, 0, 14); fx.spark(200, 60, 0, -1, 10, 'cyan'); };
  for (let i = 0; i < 24; i++) T.act[100 + i] = ((prev, i) => () => { if (prev) prev(); const a0 = i * 0.12, a1 = (i + 1) * 0.12; fx.trail(60 + 40 * Math.cos(a0), 150 + 30 * Math.sin(a0), 60 + 40 * Math.cos(a1), 150 + 30 * Math.sin(a1), 'jaune'); })(T.act[100 + i], i);
  for (const k of [101, 103, 106, 110, 116, 124]) T.shotAt[k] = true;
  T.k = 0; T.on = true;
  const iv = setInterval(() => { if (T.k >= 130) { clearInterval(iv); res({ log, r10: T.r10, r20: T.r20, r25: T.r25, r50: T.r50, big: T.big, shots: T.shots }); } }, 50);
}));
const hitK = r.log.filter(x => x.hit).map(x => x.k);
console.log('hit() rend', { k10: r.r10, k20: r.r20, k25: r.r25, k50: r.r50, gros: r.big });
console.log('images où l\'ennemi est blanc :', hitK.join(','));
console.log('images gelées :', r.log.filter(x => x.frozen).map(x => x.k).join(','));
const ks = Object.keys(r.shots).map(Number).sort((a, b) => a - b);
await planche(page, ks.map(k => r.shots[k]), ks.map(k => `+${k - 100}`), 3, path.join(OUT, 'frappe.png'), [0, 0, 560, 390]);
console.log(errs.filter(e => !/Failed to load/.test(e)));
await browser.close();
