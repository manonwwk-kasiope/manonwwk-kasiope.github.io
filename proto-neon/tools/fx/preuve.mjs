/* tools/fx/preuve.mjs — les preuves du responsable des explosions, mesurées sur les PIXELS du canvas de sortie.
   Usage : cd proto-neon && /opt/node22/bin/node tools/fx/preuve.mjs
   Temps imposé __DT = 1/60 (une image = 1/60 s de jeu), graine 2975, scène neutre de tools/fx/sonde.js.

   1. Grosse explosion (force 1, gel 5) : part de pixels brasier image par image (tube coupé : couleurs
      exactes de la table), déplacement de la caméra lu sur deux repères os (tube allumé).
   2. Limiteur : quatre grosses explosions en 0,75 s. Aire nouvellement allumée (hausse de luminance >= 0,1)
      de chacune, comparée au seuil et à la même quatrième tirée seule.
   3. Flashs, critère WCAG 2.3.1 : luminance moyenne de chaque champ de 10° (341 x 256 px CSS), transitions
      de 0,1 entre extrêmes, flashs = max(montées, descentes) dans toute fenêtre glissante de 60 images.
      Scénarios : les quatre grosses ci-dessus, puis une chaîne de 2 s (15 grosses, 40 petites).
   4. Gel : images gelées comptées sur le dt reçu par le jeu, pour 2, 5, 8 et deux demandes qui se chevauchent.
   5. Budget : pic de particules vivantes, coût de update + draw. */
import fs from 'node:fs';
import path from 'node:path';
import { build, lancer, ouvrir, attendre, planche, OUT } from './commun.mjs';

build();
const browser = await lancer();
const rapport = {};
const BRUIT = /Failed to load resource/;          // les clips cine/*.mp4 absents de tools/fx/ : 05-art.js, pas les effets

function flashs(log, i0, i1) {
  const rows = log.filter(r => r.k >= i0 && r.k <= i1);
  const nW = rows[0].means.length;
  let pire = { n: 0, fen: -1, k: -1 }, totalT = 0;
  for (let w = 0; w < nW; w++) {
    const M = rows.map(r => r.means[w]);
    const tr = [];
    let dir = 0, hi = M[0], lo = M[0];
    for (let t = 1; t < M.length; t++) {
      const v = M[t];
      if (dir <= 0) { lo = Math.min(lo, v); if (v - lo >= 0.1) { tr.push({ t, d: 1 }); dir = 1; hi = v; continue; } }
      if (dir >= 0) { hi = Math.max(hi, v); if (hi - v >= 0.1) { tr.push({ t, d: -1 }); dir = -1; lo = v; continue; } }
    }
    totalT += tr.length;
    for (let t0 = 0; t0 < M.length; t0++) {
      let up = 0, dn = 0;
      for (const x of tr) if (x.t >= t0 && x.t < t0 + 60) { if (x.d > 0) up++; else dn++; }
      const n = Math.max(up, dn);
      if (n > pire.n) pire = { n, fen: w, k: rows[t0].k };
    }
  }
  return { fenetres: nW, transitions: totalT, pireFlashsParSeconde: pire.n, ou: pire };
}

/* ---------- 1. grosse explosion ---------- */
async function grosse(profil, crt) {
  const { page, errs } = await ouvrir(browser, profil, { crt });
  const K0 = 30;
  await page.evaluate(K0 => {
    const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
    T.markers = [[40, 40], [40, g.H - 44]];
    T.act[K0] = () => { T.ret = fx.boom(Math.round(g.W * 0.6), Math.round(g.H * 0.5), 1.0, 'magenta'); fx.hitstop(5); };
    T.shotAt[K0 + 8] = true; T.shotAt[K0 + 20] = true;
    T.k = 0; T.on = true;
  }, K0);
  await attendre(page, K0 + 70);
  const r = await page.evaluate(() => ({ log: window.__FXT.log, geom: window.__FXT.geom(), shots: window.__FXT.shots, err: window.__ERR, ret: window.__FXT.ret }));
  const n = r.geom.W * r.geom.H;
  const rows = r.log.filter(x => x.k >= K0 && x.k <= K0 + 60).map(x => {
    const d = x.disp.map(([a, b]) => Math.hypot(a, b));
    return { img: x.k - K0, brasier: +(100 * x.nBr / n).toFixed(2), brasierProche: +(100 * x.nBrNear / n).toFixed(2),
      os: +(100 * x.nOs / n).toFixed(2), depl: x.disp[0], deplPx: +Math.max(...d).toFixed(1), gel: x.frozen, secousse: x.shake };
  });
  const k = Object.keys(r.shots).map(Number).sort((a, b) => a - b);
  await planche(page, k.map(i => r.shots[i]), k.map(i => `${profil} ${crt} +${i - K0}`), 2, path.join(OUT, `preuve-grosse-${profil}-${crt}.png`));
  await page.context().close();
  return { geom: r.geom, rows, err: r.err.count, console: errs.filter(e => !BRUIT.test(e)), ret: r.ret };
}

/* ---------- 2 et 3. limiteur : quatre grosses en 0,75 s ---------- */
async function quatre(profil, crt, seule) {
  const { page, errs } = await ouvrir(browser, profil, { crt });
  const K0 = 30;
  await page.evaluate(({ K0, seule }) => {
    const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
    T.markers = [[40, 40], [40, g.H - 44]];
    T.ret = [];
    for (let i = 0; i < 4; i++) {
      if (seule && i < 3) continue;
      T.refAt[K0 + 15 * i - 1] = true;
      T.act[K0 + 15 * i] = () => { T.ret.push(fx.boom(Math.round(g.W * (0.3 + 0.13 * i)), Math.round(g.H * 0.5), 1.0, 'magenta')); };
    }
    T.k = 0; T.on = true;
  }, { K0, seule });
  await attendre(page, K0 + 130);
  const r = await page.evaluate(() => ({ log: window.__FXT.log, geom: window.__FXT.geom(), ret: window.__FXT.ret, st: window.__N.fx.stats, err: window.__ERR }));
  const aire = [];
  for (let i = 0; i < 4; i++) {
    const a = r.log.filter(x => x.k >= K0 + 15 * i && x.k <= K0 + 15 * i + 12).map(x => x.lit);
    aire.push(a.length ? Math.max(...a) : null);
  }
  const fl = flashs(r.log, K0 - 5, K0 + 125);
  await page.context().close();
  return { geom: r.geom, retours: r.ret, aireAllumee: aire, stats: r.st, flashs: fl, err: r.err.count, console: errs.filter(e => !BRUIT.test(e)) };
}

/* ---------- 3 bis. chaîne de 2 s : 15 grosses, 40 petites, positions à graine ---------- */
async function chaine(profil, crt) {
  const { page, errs } = await ouvrir(browser, profil, { crt });
  const K0 = 30;
  await page.evaluate(K0 => {
    const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
    T.markers = [[40, 40], [40, g.H - 44]];
    let s = 7;
    const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    T.ret = [];
    for (let i = 0; i < 15; i++) T.act[K0 + 8 * i] = () => { T.ret.push(fx.boom(Math.round(g.W * (0.15 + 0.7 * r())), Math.round(g.H * (0.2 + 0.6 * r())), 0.65 + 0.35 * r(), 'magenta')); fx.hitstop(5); };
    for (let i = 0; i < 40; i++) {
      const k = K0 + 1 + 3 * i, prev = T.act[k];
      T.act[k] = () => { if (prev) prev(); fx.boom(Math.round(g.W * r()), Math.round(g.H * r()), 0.2 + 0.25 * r(), 'magenta'); fx.hitstop(2); };
    }
    T.k = 0; T.on = true;
  }, K0);
  await attendre(page, K0 + 200);
  const r = await page.evaluate(() => ({ log: window.__FXT.log, geom: window.__FXT.geom(), ret: window.__FXT.ret, st: window.__N.fx.stats, err: window.__ERR }));
  const fl = flashs(r.log, K0 - 5, K0 + 195);
  const cu = r.log.filter(x => x.k >= K0).map(x => x.cu + x.cd).sort((a, b) => a - b);
  const q = p => +cu[Math.min(cu.length - 1, Math.floor(p * cu.length))].toFixed(3);
  await page.context().close();
  return { geom: r.geom, pleines: r.ret.filter(x => x === 1).length, attenuees: r.ret.filter(x => x === 2).length, stats: r.st, flashs: fl,
    coutMs: { p50: q(0.5), p95: q(0.95), max: q(0.999) }, err: r.err.count, console: errs.filter(e => !BRUIT.test(e)) };
}

/* ---------- 3 ter. dix secondes de partie chargée : 3 kills/s (gel 2), une grosse toutes les 3 s (gel 5) ---------- */
async function partie(profil, crt) {
  const { page, errs } = await ouvrir(browser, profil, { crt });
  const K0 = 30;
  await page.evaluate(K0 => {
    const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
    T.markers = [[40, 40], [40, g.H - 44]];
    let s = 11; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    T.ret = [];
    for (let i = 0; i < 30; i++) T.act[K0 + 20 * i] = () => { fx.boom(Math.round(g.W * (0.1 + 0.8 * r())), Math.round(g.H * (0.15 + 0.7 * r())), 0.25 + 0.3 * r(), 'magenta'); fx.hitstop(2); };
    for (let i = 0; i < 4; i++) { const k = K0 + 10 + 180 * i, prev = T.act[k]; T.act[k] = () => { if (prev) prev(); T.ret.push(fx.boom(Math.round(g.W * (0.3 + 0.4 * r())), Math.round(g.H * (0.3 + 0.4 * r())), 0.8 + 0.2 * r(), 'magenta')); fx.hitstop(5); }; }
    T.k = 0; T.on = true;
  }, K0);
  await attendre(page, K0 + 640);
  const r = await page.evaluate(() => ({ log: window.__FXT.log, geom: window.__FXT.geom(), ret: window.__FXT.ret, st: window.__N.fx.stats, err: window.__ERR }));
  const fl = flashs(r.log, K0 - 5, K0 + 635);
  const cu = r.log.filter(x => x.k >= K0).map(x => x.cu + x.cd).sort((a, b) => a - b);
  const q = p => +cu[Math.min(cu.length - 1, Math.floor(p * cu.length))].toFixed(3);
  await page.context().close();
  return { geom: r.geom, grosses: r.ret, stats: r.st, flashs: fl, coutMs: { p50: q(0.5), p95: q(0.95), max: q(0.999) }, err: r.err.count, console: errs.filter(e => !BRUIT.test(e)) };
}

/* ---------- 4. gel d'image ---------- */
async function gel() {
  const { page, errs } = await ouvrir(browser, 'iphone', { crt: 'coupe' });
  const K0 = 20;
  await page.evaluate(K0 => {
    const T = window.__FXT, fx = window.__N.fx;
    T.act[K0] = () => fx.hitstop(2);
    T.act[K0 + 20] = () => fx.hitstop(5);
    T.act[K0 + 40] = () => fx.hitstop(8);
    T.act[K0 + 60] = () => fx.hitstop(5);          // puis une seconde demande de 5 pendant le gel :
    T.act[K0 + 62] = () => fx.hitstop(5);          // jamais additionnée, le gel reste de 5
    T.act[K0 + 80] = () => fx.hitstop(5);
    T.act[K0 + 83] = () => fx.hitstop(8);          // la plus longue gagne, comptée depuis le début : 8
    T.k = 0; T.on = true;
  }, K0);
  await attendre(page, K0 + 100);
  const log = await page.evaluate(() => window.__FXT.log);
  const dt0 = 1 / 60, res = {};
  for (const [nom, a] of [['kill (2)', 0], ['gros (5)', 20], ['mort (8)', 40], ['5 puis 5 pendant le gel', 60], ['5 puis 8 pendant le gel', 80]]) {
    const r = log.filter(x => x.k > K0 + a && x.k <= K0 + a + 19);
    const gelees = r.filter(x => x.dt < dt0 * 0.5).map(x => x.k - K0 - a);
    const pose = log.find(x => x.k === K0 + a);
    res[nom] = { imagesGelees: gelees.length, lesquelles: gelees.join(','), imageQuiPoseGelee: pose ? pose.dt < dt0 * 0.5 : null };
  }
  await page.context().close();
  return { res, console: errs.filter(e => !BRUIT.test(e)) };
}

const t0 = Date.now();
rapport.grosse = {
  iphoneCoupe: await grosse('iphone', 'coupe'),
  iphoneRiche: await grosse('iphone', 'riche'),
  portraitCoupe: await grosse('portrait', 'coupe'),
  bureauCoupe: await grosse('bureau', 'coupe'),
  bureauRiche: await grosse('bureau', 'riche'),
};
rapport.limiteur = {
  quatreCoupe: await quatre('iphone', 'coupe', false),
  quatriemeSeuleCoupe: await quatre('iphone', 'coupe', true),
  quatreRiche: await quatre('iphone', 'riche', false),
  quatreBureauRiche: await quatre('bureau', 'riche', false),
};
rapport.chaine = { iphone: await chaine('iphone', 'riche'), bureau: await chaine('bureau', 'riche') };
rapport.partie = { iphone: await partie('iphone', 'riche'), bureau: await partie('bureau', 'riche') };
rapport.gel = await gel();
await browser.close();
fs.writeFileSync(path.join(OUT, 'preuve.json'), JSON.stringify(rapport, null, 1));

/* ---------- lecture ---------- */
const P = (x) => console.log(x);
for (const [nom, g] of Object.entries(rapport.grosse)) {
  const au8 = g.rows.filter(r => r.brasier > 8).length, au8p = g.rows.filter(r => r.brasierProche > 8).length;
  const d6 = g.rows.filter(r => r.deplPx >= 6).length;
  P(`\n[grosse ${nom}] tampon ${g.geom.W}x${g.geom.H} px=${g.geom.PX} seuil ${Math.round(g.geom.thr)} | images brasier exact > 8 % : ${au8} | brasier (plus proche) > 8 % : ${au8p} | images caméra >= 6 px : ${d6}, max ${Math.max(...g.rows.map(r => r.deplPx))} | erreurs ${g.err} ${g.console.length ? g.console : ''}`);
  P('  img : ' + g.rows.slice(0, 40).map(r => `${r.img}:${r.brasier}${r.gel ? '*' : ''}/${r.deplPx}`).join(' '));
}
for (const [nom, l] of Object.entries(rapport.limiteur)) {
  P(`\n[limiteur ${nom}] seuil ${Math.round(l.geom.thr)} | retours ${JSON.stringify(l.retours)} | aire nouvellement allumée ${JSON.stringify(l.aireAllumee)} | flashs/s pire champ ${l.flashs.pireFlashsParSeconde} (${l.flashs.fenetres} champs, ${l.flashs.transitions} transitions) | erreurs ${l.err}`);
}
for (const [nom, c] of Object.entries(rapport.chaine)) {
  P(`\n[chaîne ${nom}] pleines ${c.pleines} atténuées ${c.attenuees} | pic vivantes ${c.stats.peak}/400 refusées ${c.stats.dropped} | flashs/s pire champ ${c.flashs.pireFlashsParSeconde} (${c.flashs.fenetres} champs) | coût fx ms ${JSON.stringify(c.coutMs)} | erreurs ${c.err}`);
}
for (const [nom, c] of Object.entries(rapport.partie)) {
  P(`\n[partie 10 s ${nom}] grosses ${JSON.stringify(c.grosses)} | pic vivantes ${c.stats.peak}/400 | flashs/s pire champ ${c.flashs.pireFlashsParSeconde} (${c.flashs.fenetres} champs, ${c.flashs.transitions} transitions) | coût fx ms ${JSON.stringify(c.coutMs)} | erreurs ${c.err}`);
}
P('\n[gel] ' + JSON.stringify(rapport.gel.res));
P(`\n${((Date.now() - t0) / 1000).toFixed(0)} s`);
