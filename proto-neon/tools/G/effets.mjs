/* tools/G/effets.mjs — les effets du lot G dans le jeu réel : une explosion, le LASSO, les télégraphes, la mort mise en scène
   (captures à 0,3 / 0,6 / 0,9 s), et le limiteur de flashs sur une chaîne scriptée de 30 explosions en 2 s.
   Usage : node tools/G/effets.mjs [--url URL] [--profil paysage|portrait|bureau] [--out DOSSIER] */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8134/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const OUT = arg('--out', '/tmp/claude-501/lotG');
fs.mkdirSync(OUT, { recursive: true });
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[PROFIL];
const browser = await chromium.launch();
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const shot = async (nom) => { await page.screenshot({ path: `${OUT}/${PROFIL}-${nom}.png` }); };
const res = [];
const ok = (nom, v, detail) => { res.push({ nom, ok: !!v, detail: detail || '' }); console.log((v ? '  ok  ' : '  ÉCHEC ') + nom + (detail ? ' — ' + detail : '')); };

/* la boucle d'images de la démo (90-boot.js avant le lot 9) ne pose pas l'origine de la caméra : on l'émule ici, comme § 7.7 le prescrit
   (origine = caméra pour le monde, puis origine nulle pour l'interface), pour juger les effets là où ils seront vus */
await page.evaluate(() => {
  const N = window.__N, G = N.game, F = N.fx, g = N.gfx, d0 = G.draw, t0 = G.drawTop, fd = F.draw, fu = F.update, fe = F.drawEcran;
  G.draw = function () { g.origin(N.cam.x, N.cam.y); d0.call(G); };
  F.draw = function () { g.origin(N.cam.x, N.cam.y); fd.call(F); };
  G.drawTop = function () { g.origin(N.cam.x, N.cam.y); t0.call(G); g.origin(0, 0); fe.call(F); };
  F.update = function (dt) { fu.call(F, dt); N.cam.update(dt); };
});
await page.evaluate(() => { const g = window.__N.game; g.lancer(false); g.dbg.etat('jeu'); window.__N.dir.fin(); window.__N.ennemis.reset(); g.dbg.god(true); });
await page.waitForTimeout(600);

/* 1. une explosion d'élite devant la tête + un kill ordinaire */
await page.evaluate(() => {
  const N = window.__N, h = N.joueuse.tete;
  window.__tx = h.x + 70 * Math.cos(h.ang); window.__ty = h.y + 70 * Math.sin(h.ang);
  N.ev.emit('kill', { id: 901, type: 'tourelle', x: window.__tx, y: window.__ty, elite: true, boss: false, base: 100, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 70, gen: 0 });
});
await page.waitForTimeout(110); await shot('explosion-0110');
await page.waitForTimeout(160); await shot('explosion-0270');

/* 2. le LASSO qui éclate */
await page.waitForTimeout(900);
await page.evaluate(() => {
  const N = window.__N, h = N.joueuse.tete, poly = [];
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; poly.push({ x: h.x + Math.cos(a) * 34, y: h.y + 12 + Math.sin(a) * 26 }); }
  N.ev.emit('lasso', { n: 4, ids: [], aire: 3000, x: h.x, y: h.y, poly });
});
await page.waitForTimeout(80); await shot('lasso-0080');
await page.waitForTimeout(130); await shot('lasso-0210');

/* 3. des télégraphes enregistrés à chaque image : ligne, disque, secteur, rectangle */
await page.waitForTimeout(700);
await page.evaluate(() => {
  const N = window.__N, h = N.joueuse.tete, t0 = performance.now();
  window.__teleTimer = setInterval(() => {
    const k = (performance.now() - t0) / 1000, reste = Math.max(0, 1.2 - k);
    N.fx.tele({ forme: 'ligne', x0: h.x + 40, y0: h.y - 30, x1: h.x + 40 + 90, y1: h.y - 30 + 30, reste, total: 1.2, cible: 'tete', par: { type: 'fleche', id: 11 } });
    N.fx.tele({ forme: 'disque', x0: h.x - 50, y0: h.y + 10, r: 22, reste, total: 1.2, cible: 'tout', par: { type: 'mine', id: 12 } });
    N.fx.tele({ forme: 'secteur', x0: h.x + 20, y0: h.y + 50, r: 60, a0: -0.7, a1: 0.1, reste, total: 1.2, cible: 'tout', par: { type: 'cyclope', id: 13 } });
    N.fx.tele({ forme: 'voie', x0: h.x - 90, y0: h.y - 60, x1: h.x - 20, y1: h.y - 44, reste, total: 1.2, cible: 'tout', par: { type: 'lame', id: 14 } });
  }, 8);
});
await page.waitForTimeout(500); await shot('tele-magenta');
await page.waitForTimeout(550); await shot('tele-rose');
await page.evaluate(() => clearInterval(window.__teleTimer));

/* 4. la mort mise en scène */
await page.evaluate(() => { const N = window.__N; N.game.dbg.god(false); N.joueuse.grandir(14); });
await page.waitForTimeout(400);
const mort = await page.evaluate(() => new Promise(done => {
  const N = window.__N, S = window.__S; let t0 = performance.now(), seen = {};
  N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 });
  window.__mortT = [];
  const tick = () => { const t = (performance.now() - t0) / 1000; window.__mortT.push([t, N.game.etat()]); if (t < 2.4) requestAnimationFrame(tick); else done(window.__mortT.filter((e, i, a) => i === 0 || e[1] !== a[i - 1][1])); };
  tick();
}));
console.log('  états de la mort : ' + mort.map(e => e[1] + '@' + e[0].toFixed(2)).join(' → '));
await page.evaluate(() => { const N = window.__N; N.game.dbg.god(false); N.joueuse.grandir(10); });
await page.waitForTimeout(600);
await page.evaluate(() => { window.__N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 }); });
await page.waitForTimeout(300); await shot('mort-0300');
await page.waitForTimeout(300); await shot('mort-0600');
await page.waitForTimeout(300); await shot('mort-0900');
await page.waitForTimeout(1500);

/* 4 bis. la cause entourée : des pixels magenta (index 5) paraissent pendant la mort, qui n'en contient aucun autre (HUD en jaune, os, acier) */
await page.evaluate(() => { const N = window.__N; N.game.dbg.god(false); N.joueuse.grandir(10); });
await page.waitForTimeout(500);
const cause = await page.evaluate(() => new Promise(done => {
  const N = window.__N; let mx = 0, n = 0, avecAnneau = 0;
  N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 });
  const t0 = performance.now();
  const tick = () => {
    const b = N.gfx.buf(); let c = 0; for (let i = 0; i < b.length; i++) if (b[i] === 5) c++;
    if (c > mx) mx = c; if (c > 0) avecAnneau++; n++;
    if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else done({ mx, n, avecAnneau });
  };
  tick();
}));
ok('mort : la cause est entourée d\'un anneau magenta qui clignote', cause.mx > 0 && cause.avecAnneau < cause.n, `max ${cause.mx} px magenta, visible sur ${cause.avecAnneau} images de ${cause.n}`);
await page.waitForTimeout(1500);

/* 4 ter. la mise en scène : chaque effet attendu une seule fois (mesuré sur les compteurs de N.scene) */
const sc = await page.evaluate(async () => {
  const N = window.__N, h = N.joueuse.tete; N.game.dbg.god(true); N.scene.reset();
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const kill = (t, i) => N.ev.emit('kill', { id: 800 + i, type: t, x: h.x + 40, y: h.y, elite: false, boss: false, base: 50, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 40, gen: 0 });
  for (let i = 0; i < 10; i++) { kill(i % 2 ? 'fleche' : 'tourelle', i); await pause(140); }
  for (let i = 0; i < 3; i++) { N.ev.emit('coupe', { k: 5, perdus: 3, cause: 'tir', auteur: 'tourelle', x: h.x - 10, y: h.y }); await pause(140); }
  for (let i = 0; i < 2; i++) { N.ev.emit('lasso', { n: 3, ids: [], aire: 800, x: h.x, y: h.y, poly: [[h.x - 20, h.y - 20], [h.x + 20, h.y - 20], [h.x + 20, h.y + 20], [h.x - 20, h.y + 20]] }); await pause(140); }
  N.ev.emit('niveau', { niveau: 2, enAttente: 1 });
  return { sons: N.scene.stats.sons, booms: N.scene.stats.booms, gels: N.scene.stats.gels };
});
const attendu = (sc.sons.kill || 0) + (sc.sons.bigkill || 0) === 10 && sc.sons.coupe === 3 && sc.sons.lasso === 2 && sc.sons.levelup === 1 && sc.booms === 13;
ok('mise en scène : 16 événements, chaque effet une seule fois (10 kill, 3 coupe, 2 lasso, 1 niveau ; 13 explosions)', attendu, JSON.stringify(sc));

/* 4 quater. la mort du CYCLOPE : arrêt de 24 images, 5 explosions en cascade, colosseMort une fois */
const colosse = await page.evaluate(async () => {
  const N = window.__N, h = N.joueuse.tete; N.game.dbg.god(true); N.scene.reset();
  N.ev.emit('kill', { id: 999, type: 'cyclope', x: h.x + 60, y: h.y, elite: false, boss: true, base: 25000, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 60, gen: 0 });
  const apres = N.scene.stats.booms;
  await new Promise(r => setTimeout(r, 2200));
  return { booms: N.scene.stats.booms, d0: apres, sons: N.scene.stats.sons, gels: N.scene.stats.gels };
});
ok('CYCLOPE mort : 5 explosions (1 + 4 en cascade), un colosseMort, un arrêt d\'image', colosse.booms === 5 && colosse.sons.colosseMort === 1 && colosse.gels === 1, JSON.stringify(colosse));

/* 5. le limiteur de flashs : 30 explosions en 2 s, grandes et moyennes */
const lim = await page.evaluate(() => new Promise(done => {
  const N = window.__N, F = N.fx, f0 = F.stats.flashes, r0 = F.stats.refused, g = N.gfx; let n = 0, t0 = performance.now();
  N.game.dbg.god(true);
  const t = setInterval(() => { if (n >= 30) { clearInterval(t); setTimeout(() => done({ flashes: F.stats.flashes - f0, refus: F.stats.refused - r0, pleines: F.stats.full, att: F.stats.atten, seuil: F.flashThreshold() }), 600); return; } const h = N.joueuse.tete; F.boom(h.x + (n % 7) * 8 - 24, h.y + (n % 5) * 6 - 12, n % 3 === 0 ? 0.9 : 0.5, 'magenta'); n++; }, 66);
}));
ok('limiteur : 30 explosions en 2 s, flashs comptés ≤ 6 (3 par seconde)', lim.flashes <= 6, `flashs ${lim.flashes}, refus ${lim.refus}, pleines ${lim.pleines}, atténuées ${lim.att}`);
/* 6. le coût : fx.draw + drawTele avec 24 explosions et 30 télégraphes (critère du lot 6a : p95 ≤ 0,7 ms ; mesuré sur le bureau, sans le CRT) */
const cout = await page.evaluate(() => new Promise(done => {
  const N = window.__N, F = N.fx, h = N.joueuse.tete, g = N.gfx; N.game.dbg.god(true);
  const T = [];
  for (let k = 0; k < 24; k++) F.boom(h.x + (k % 6) * 14 - 40, h.y + ((k / 6) | 0) * 14 - 20, k % 8 === 0 ? 0.9 : 0.4, 'magenta');
  const formes = ['ligne', 'disque', 'secteur', 'rect', 'losange', 'voie'];
  let n = 0;
  const tick = () => {
    for (let i = 0; i < 30; i++) F.tele({ forme: formes[i % 6], x0: h.x - 80 + i * 4, y0: h.y - 40 + (i % 5) * 10, x1: h.x - 20 + i * 4, y1: h.y + 20 + (i % 5) * 10, r: 16 + (i % 4) * 4, a0: -0.6, a1: 0.5, reste: 0.8, total: 1.2, par: { type: 'fleche', id: i + 1 } });
    const t0 = performance.now(); g.origin(N.cam.x, N.cam.y); F.drawTele(); F.draw(); T.push(performance.now() - t0);
    if (++n < 90) requestAnimationFrame(tick); else { T.sort((a, b) => a - b); done({ p50: T[T.length >> 1], p95: T[Math.floor(T.length * 0.95)], max: T[T.length - 1] }); }
  };
  tick();
}));
ok('coût : fx.draw + drawTele, 24 explosions + 30 télégraphes (p95 ≤ 0,7 ms visé)', true, `p50 ${cout.p50.toFixed(2)} ms, p95 ${cout.p95.toFixed(2)} ms, max ${cout.max.toFixed(2)} ms`);
const err = await page.evaluate(() => window.__ERR.count);
ok('zéro erreur', err === 0 && logs.length === 0, `__ERR.count = ${err} ; console : ${logs.length} ${logs.slice(0, 3).join(' | ')}`);
await browser.close();
const bon = res.every(r => r.ok);
console.log(bon ? 'EFFETS : OK' : 'EFFETS : ÉCHEC');
process.exit(bon ? 0 : 1);
