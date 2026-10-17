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

/* 5. le limiteur de flashs : 30 explosions en 2 s, grandes et moyennes */
const lim = await page.evaluate(() => new Promise(done => {
  const N = window.__N, F = N.fx, f0 = F.stats.flashes, r0 = F.stats.refused, g = N.gfx; let n = 0, t0 = performance.now();
  N.game.dbg.god(true);
  const t = setInterval(() => { if (n >= 30) { clearInterval(t); setTimeout(() => done({ flashes: F.stats.flashes - f0, refus: F.stats.refused - r0, pleines: F.stats.full, att: F.stats.atten, seuil: F.flashThreshold() }), 600); return; } const h = N.joueuse.tete; F.boom(h.x + (n % 7) * 8 - 24, h.y + (n % 5) * 6 - 12, n % 3 === 0 ? 0.9 : 0.5, 'magenta'); n++; }, 66);
}));
ok('limiteur : 30 explosions en 2 s, flashs comptés ≤ 6 (3 par seconde)', lim.flashes <= 6, `flashs ${lim.flashes}, refus ${lim.refus}, pleines ${lim.pleines}, atténuées ${lim.att}`);
const err = await page.evaluate(() => window.__ERR.count);
ok('zéro erreur', err === 0 && logs.length === 0, `__ERR.count = ${err} ; console : ${logs.length} ${logs.slice(0, 3).join(' | ')}`);
await browser.close();
const bon = res.every(r => r.ok);
console.log(bon ? 'EFFETS : OK' : 'EFFETS : ÉCHEC');
process.exit(bon ? 0 : 1);
