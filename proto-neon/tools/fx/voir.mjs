/* tools/fx/voir.mjs — regarder les explosions image par image.
   Usage : cd proto-neon && /opt/node22/bin/node tools/fx/voir.mjs [profil] [crt]
   Écrit tools/fx/out/voir-<profil>-<crt>-*.png */
import path from 'node:path';
import { build, lancer, ouvrir, attendre, planche, OUT } from './commun.mjs';

const profil = process.argv[2] || 'iphone';
const crt = process.argv[3] || 'coupe';
build();
const browser = await lancer();
const { page, errs } = await ouvrir(browser, profil, { crt });

const K0 = 20;
const vues = [0, 1, 2, 3, 6, 9, 13, 18, 24, 30, 38, 46, 56, 70, 90, 200];
await page.evaluate(({ K0, vues }) => {
  const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
  T.markers = [[40, 40], [40, g.H - 44]];
  /* une grosse (boss), une moyenne, une petite : la grosse au centre droit */
  T.act[K0] = () => { fx.boom(Math.round(g.W * 0.6), Math.round(g.H * 0.5), 1.0, 'magenta'); fx.hitstop(5); };
  if (window.__ATT) {
    for (let i = 0; i < 4; i++) T.act[K0 + 15 * i] = () => { T.ret = (T.ret || []).concat(fx.boom(Math.round(g.W * 0.6), Math.round(g.H * 0.5), 1.0, 'magenta')); };
    for (let v = 45; v <= 90; v += 3) T.shotAt[K0 + v] = true;
    T.k = 0; T.on = true; return;
  }
  T.act[K0 + 120] = () => { fx.boom(Math.round(g.W * 0.25), Math.round(g.H * 0.4), 0.45, 'magenta'); fx.hitstop(2); };
  T.act[K0 + 150] = () => { fx.boom(Math.round(g.W * 0.7), Math.round(g.H * 0.3), 0.15, 'magenta'); fx.boom(Math.round(g.W * 0.8), Math.round(g.H * 0.7), 0.25, 'ambre'); };
  for (const v of vues) T.shotAt[K0 + v] = true;
  for (let v = 0; v <= 60; v += 4) { T.shotAt[K0 + 120 + v] = true; }
  T.k = 0; T.on = true;
}, { K0, vues });
await attendre(page, K0 + 210);
const res = await page.evaluate(() => ({ shots: window.__FXT.shots, log: window.__FXT.log, geom: window.__FXT.geom(), err: window.__ERR }));
const ks = vues.map(v => K0 + v).filter(k => res.shots[k]);
await planche(page, ks.map(k => res.shots[k]), ks.map(k => `+${k - K0} images`), 4, path.join(OUT, `voir-${profil}-${crt}-grosse.png`));
const k2 = []; for (let v = 0; v <= 60; v += 4) if (res.shots[K0 + 120 + v]) k2.push(K0 + 120 + v);
await planche(page, k2.map(k => res.shots[k]), k2.map(k => `moy. +${k - K0 - 120}`), 4, path.join(OUT, `voir-${profil}-${crt}-moyenne.png`));

const kz = [2, 9, 18, 24, 30, 38].map(v => K0 + v).filter(k => res.shots[k]);
await planche(page, kz.map(k => res.shots[k]), kz.map(k => `+${k - K0}`), 3, path.join(OUT, `voir-${profil}-${crt}-zoom.png`),
  [Math.round(res.geom.cw * 0.6 - 230), 0, 460, res.geom.ch]);
const kd = [56, 90, 200].map(v => K0 + v).filter(k => res.shots[k]);
await planche(page, kd.map(k => res.shots[k]), kd.map(k => `sol +${k - K0}`), 3, path.join(OUT, `voir-${profil}-${crt}-sol.png`),
  [Math.round(res.geom.cw * 0.6 - 230), 0, 460, res.geom.ch]);
console.log('géométrie', JSON.stringify(res.geom), 'erreurs', JSON.stringify(res.err), errs);
const n = res.geom.W * res.geom.H;
for (const r of res.log) {
  if (r.k < K0 - 1 || r.k > K0 + 70) continue;
  console.log(`k=${r.k - K0} brasier ${(100 * r.nBr / n).toFixed(1)}% (proche ${(100 * r.nBrNear / n).toFixed(1)}%) clair ${(100 * r.nBright / n).toFixed(1)}% os ${(100 * r.nOs / n).toFixed(1)}% secousse ${r.shake} dépl ${JSON.stringify(r.disp)} crt ${JSON.stringify(r.crt)} gel ${r.frozen ? 'oui' : 'non'} chaleur ${r.heat} vivantes ${r.live}`);
}
await browser.close();
