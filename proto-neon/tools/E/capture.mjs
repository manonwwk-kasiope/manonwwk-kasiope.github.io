/* tools/E/capture.mjs — deux captures du lot E : un LASSO qui vient de se fermer (boucle remplie, cibles éclatées) et une
   INVERSION en cours (proies ardoise qui fuient, la tête les dévore). Sortie : DOSSIER/lasso.png et DOSSIER/inversion.png.
   Usage : node tools/E/capture.mjs [--url URL] [--dossier DOSSIER] [--profil paysage|portrait|bureau] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8132/proto-neon/index.html');
const DOS = arg('--dossier', '/tmp/claude-501/lotE');
const PROFIL = arg('--profil', 'paysage');
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[PROFIL];
import fs from 'fs';
/* une image dessinée à la main, dans la même tâche que la simulation : la boucle d'images ne passe pas entre les deux */
const IMAGE = () => {
  const N = window.__N, S = window.__S;
  N.gfx.clear(0); N.outils.origineMonde(); N.game.draw(); N.outils.origineMonde(); if (N.fx && N.fx.draw) N.fx.draw(); N.outils.origineMonde(); N.game.drawTop(); N.gfx.present(); if (N.crt && N.crt.apply) N.crt.apply(0.016);
  const cs = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height);
  return cs[0].toDataURL('image/png');
};
const browser = await chromium.launch();
const page = await (await browser.newContext(P)).newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 11; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });

/* --- le LASSO : un cercle de rayon 11 autour de quatre flèches, jusqu'à la fermeture --- */
const lasso = await page.evaluate(([imgSrc]) => {
  const IMAGE_FN = eval(imgSrc);
  const N = window.__N, S = window.__S, g = N.game, J = N.joueuse, O = N.outils, H = 1 / 120;
  g.lancer(false); g.dbg.etat('jeu'); N.dir.fin(); N.ennemis.reset(); N.butin.reset(); g.dbg.god(false); S.death = null; O.geom();
  N.arsenal.update = function () {};
  const A = O.A; J.force({ x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2, ang: 0, len: 12, trace: true }); g.dbg.simuler(2 * H);
  const cx = J.tete.x, cy = J.tete.y + 11, fixes = [];
  // des cibles dehors, pour montrer qu'elles restent, et dedans
  const pos = [[cx - 3, cy - 2], [cx + 3, cy + 1], [cx, cy + 3], [cx + 40, cy - 30], [cx + 55, cy + 20], [cx - 36, cy + 30]];
  pos.forEach(([x, y], i) => { const e = N.ennemis.spawn(i < 3 ? 'fleche' : 'tourelle', x, y, {}); e._portail = 0; e.etat = 'approche'; e._st = 'derive'; e._stun = 99; fixes.push({ e, x, y }); });
  const dz = N.R.joueuse.dz, pl = N.R.joueuse.deflexion.pleine, n0 = J.lassos();
  for (let i = 0; i < 120 * 5 && J.etat === 'vivant' && J.lassos() === n0; i++) {
    const a = J.tete.ang + 0.6; S.input.x = Math.cos(a); S.input.y = Math.sin(a); S.input.mag = 1;
    g.dbg.simuler(H); fixes.forEach(f => { f.e.x = f.x; f.e.y = f.y; });
  }
  S.input.mag = 0;
  g.dbg.simuler(10 * H); fixes.forEach(f => { f.e.x = f.x; f.e.y = f.y; });
  return { lassos: J.lassos() - n0, morts: fixes.filter(f => f.e._dead).length, etat: J.etat, img: IMAGE_FN() };
}, [IMAGE.toString()]);
fs.writeFileSync(DOS + '/lasso.png', Buffer.from(lasso.img.split(',')[1], 'base64')); delete lasso.img;

/* --- l'INVERSION : la pastille avalée, quatre proies, la poursuite --- */
const inv = await page.evaluate(([imgSrc]) => {
  const IMAGE_FN = eval(imgSrc);
  const N = window.__N, S = window.__S, g = N.game, J = N.joueuse, O = N.outils, H = 1 / 120;
  g.lancer(false); g.dbg.etat('jeu'); N.dir.fin(); N.ennemis.reset(); N.butin.reset(); g.dbg.god(false); S.death = null; O.geom();
  N.arsenal.update = function () {};
  const A = O.A; J.force({ x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2, ang: 0, len: 14, trace: true }); g.dbg.simuler(2 * H);
  const es = [[40, -20], [55, 10], [30, 25], [70, -5]].map(([dx, dy], i) => { const e = N.ennemis.spawn(i % 2 ? 'tourelle' : 'fleche', J.tete.x + dx, J.tete.y + dy, {}); e._portail = 0; e.etat = 'approche'; e._st = 'derive'; return e; });
  N.butin.pastille(J.tete.x, J.tete.y); g.dbg.simuler(2 * H);
  for (let i = 0; i < 120 * 0.9; i++) {
    const t = es.find(e => !e._dead); if (!t) break;
    const dx = t.x - J.tete.x, dy = t.y - J.tete.y, m = Math.hypot(dx, dy) || 1; S.input.x = dx / m; S.input.y = dy / m; S.input.mag = 1;
    g.dbg.simuler(H);
  }
  S.input.mag = 0;
  return { actif: J.inversion().actif, devores: J.inversion().devores, etats: es.map(e => e._dead ? 'X' : e.etat), etat: J.etat, img: IMAGE_FN() };
}, [IMAGE.toString()]);
fs.writeFileSync(DOS + '/inversion.png', Buffer.from(inv.img.split(',')[1], 'base64')); delete inv.img;
const err = await page.evaluate(() => window.__ERR && window.__ERR.count);
console.log(JSON.stringify({ lasso, inv, err, console: logs.length }));
await browser.close();
