/* tools/rendu2/preuve.mjs — preuves de l'ingénieur du rendu (10-gfx.js, 20-crt.js).
   Usage : cd proto-neon && /opt/node22/bin/node tools/rendu2/preuve.mjs [ecrans|fantome|trace|cout]...
   (serveur http sur 8112 à la racine du dépôt ; les bundles de comparaison sont construits en mémoire)

   ecrans   taille du pixel et du tampon sur quatre écrans, ma copie construite depuis src/ (serveur 8112),
            zone sûre nulle (Chromium) puis zone sûre réelle de l'iPhone imposée par CDP
   fantome  pendant une secousse : l'image rendue est comparée, pixel à pixel, au rendu SANS secousse du
            tampon décalé à la main. Si le halo suit l'image décalée, les deux sont identiques.
   trace    décalage de la caméra image par image après un gros coup, avec et sans direction
   cout     coût d'image (rappel rAF complet + vidage du canvas) et coût du seul 20-crt.js, p50/p95,
            sur un scénario identique, profil iPhone 13 paysage, CPU x1 et x4

   fantome et trace comparent deux bundles construits par build.mjs dans un dossier temporaire, au même
   instant, depuis le MÊME src/ : « avant » y remet 10-gfx.js et 20-crt.js du commit ORIGINE, « après » le
   prend tel quel. Seule ma modification diffère, même pendant que d'autres modules s'écrivent. Les pages
   sont servies par interception à côté de ma copie : aucun fichier écrit dans le dépôt. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium, devices } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const COPIE = 'http://127.0.0.1:8112/proto-neon/tools/rendu2/index.html';
/* le dernier commit qui porte 10-gfx.js et 20-crt.js d'AVANT ma modification (HEAD les contient désormais) */
const ORIGINE = 'f84a072';
const QUOI = process.argv.slice(2).length ? process.argv.slice(2) : ['ecrans', 'fantome', 'trace', 'cout'];

const ORIG = f => execFileSync('git', ['-C', ROOT, 'show', ORIGINE + ':proto-neon/src/' + f], { encoding: 'utf8' });
/* un bundle construit par build.mjs depuis src/, avec des modules remplacés ou ajoutés ; rend le HTML */
function bundle(remplace) {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rendu2-'));
  try {
    fs.mkdirSync(path.join(TMP, 'src'));
    for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'))) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(TMP, 'src', f));
    for (const [f, src] of Object.entries(remplace)) fs.writeFileSync(path.join(TMP, 'src', f), src);
    fs.copyFileSync(path.join(ROOT, 'build.mjs'), path.join(TMP, 'build.mjs'));
    fs.symlinkSync(path.join(ROOT, 'art'), path.join(TMP, 'art'));
    execFileSync('/opt/node22/bin/node', [path.join(TMP, 'build.mjs'), path.join(TMP, 'b.html')], { cwd: TMP, stdio: 'pipe' });
    return fs.readFileSync(path.join(TMP, 'b.html'), 'utf8');
  } finally { fs.rmSync(TMP, { recursive: true, force: true }); }
}
const AB = {};
function ab(v) {
  if (!AB[v]) AB[v] = { url: COPIE.replace('index.html', v + '.html'), html: v === 'avant' ? bundle({ '10-gfx.js': ORIG('10-gfx.js'), '20-crt.js': ORIG('20-crt.js') }) : bundle({}) };
  return AB[v];
}

const IPH = devices['iPhone 13'];
const PAYSAGE = { ...IPH, viewport: { width: 844, height: 390 } };

/* boucle instrumentée : graine et pas imposés, événements programmés par numéro d'image, gel à la demande,
   coût de chaque rappel rAF mesuré jusqu'au vidage du canvas (relecture d'un pixel) */
const INIT = `(() => {
  window.__DT = 1 / 60; window.__SEED = 2975;
  const raf = window.requestAnimationFrame.bind(window);
  const R = window.__R = { on: false, k: 0, ev: {}, hold: false, cost: [], crt: [], tr: [], arm: 0, ghost: null };
  function wrap(cb) {
    /* seule la boucle d'images de 90-boot.js (function frame) est comptée, chronométrée et gelée ;
       tout autre rappel (sondes de Playwright comprises) passe tel quel */
    if (!cb || cb.name !== 'frame') return raf(cb);
    return raf(function (t) {
      if (R.hold) { wrap(cb); return; }
      const f = R.on ? R.ev[R.k] : null;
      if (f) f();
      const a = performance.now();
      cb(t);
      const o = document.getElementById('out');
      if (o) o.getContext('2d').getImageData(0, 0, 1, 1);
      if (R.on) { R.cost.push(performance.now() - a); R.k++; }
    });
  }
  window.requestAnimationFrame = wrap;
})();`;

/* posé après le chargement : chronomètre 20-crt.js, relève la trace, et arme le test du fantôme */
const POSE = () => {
  const N = window.__N, R = window.__R, o = document.getElementById('out'), cx = o.getContext('2d');
  const f = R.orig = N.crt.apply;
  function png(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0); return c.toDataURL('image/png'); }
  function fantome() {
    const g = N.gfx, S = N.S, W = g.W, H = g.H, PX = g.PX, OW = o.width, OH = o.height;
    const ox = N.crt.stats.ox, oy = N.crt.stats.oy;
    const P1 = cx.getImageData(0, 0, OW, OH);
    /* la référence : le tampon décalé À LA MAIN, rendu sans secousse */
    const B = g.buf(), Bs = B.slice(), V = N.pal.i('nuitProfonde');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = x + ox, sy = y + oy;
      B[y * W + x] = (sx >= 0 && sx < W && sy >= 0 && sy < H) ? Bs[sy * W + sx] : V;
    }
    const sh = S.shake; S.shake = 0;
    f.call(N.crt, 0);
    const ref = [N.crt.stats.ox, N.crt.stats.oy];
    const P2 = cx.getImageData(0, 0, OW, OH);
    B.set(Bs); S.shake = sh;
    cx.putImageData(P1, 0, 0);                  /* l'écran garde l'image réellement rendue */
    /* écart, hors des deux colonnes de jeu du bord (l'aberration y lit un voisin différent par construction) */
    const a = P1.data, b = P2.data, D = new ImageData(OW, OH), d = D.data;
    let n = 0, mx = 0, som = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
      const i = (y * OW + x) * 4;
      d[i + 3] = 255;
      if (x < PX || x >= OW - PX) continue;
      const e = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (e) { n++; som += e; if (e > mx) mx = e; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; d[i] = d[i + 1] = d[i + 2] = Math.min(255, 40 + e * 6); }
    }
    return { ox, oy, ref, PX, W, H, OW, OH, n, pct: +(100 * n / (OW * OH)).toFixed(3), mx, moy: n ? +(som / n).toFixed(1) : 0,
      boite: n ? [x0, y0, x1, y1] : null, p1: png(P1), p2: png(P2), diff: png(D) };
  }
  N.crt.apply = function (dt) {
    const A = +N.S.shake || 0, t0 = performance.now();
    f.call(N.crt, dt);
    cx.getImageData(0, 0, 1, 1);
    const c = performance.now() - t0;
    if (R.on) { R.crt.push(c); R.tr.push([N.crt.stats.ox, N.crt.stats.oy, +A.toFixed(2)]); }
    if (R.arm && R.on && Math.abs(N.crt.stats.ox) + Math.abs(N.crt.stats.oy) >= R.arm) { R.arm = 0; R.ghost = fantome(); R.hold = true; }
  };
};

async function ouvrir(browser, url, prof, ralenti = 1, html = null) {
  const ctx = await browser.newContext(prof);
  if (html) await ctx.route(url, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  const page = await ctx.newPage();
  const errs = [];
  errs.absents = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  /* une ressource absente (les clips cine/*.mp4 ne sont pas dans ce dépôt) est relevée à part, avec son adresse */
  page.on('response', r => { if (r.status() >= 400) errs.absents.push(r.status() + ' ' + r.url().replace(/^.*\/(cine\/)/, '$1')); });
  page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.addInitScript(INIT);
  if (ralenti > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: ralenti }); }
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.crt && window.__N.gfx && window.__N.gfx.W > 0 && window.__FRAME > 5, null, { timeout: 20000, polling: 50 });
  await page.evaluate(POSE);
  return { ctx, page, errs };
}
/* l'ouverture sautée par l'interface publique de 60-intro.js, puis la partie en route */
async function enJeu(page) {
  /* le compteur part dans le même appel que le saut : l'image 0 est la première image de jeu, à chaque passe */
  await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); if (window.__S.phase === 'play') window.__R.on = true; });
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 10000, polling: 50 });
  await page.evaluate(() => { window.__R.on = true; });
}
async function erreurs(page, errs) {
  const e = await page.evaluate(() => ({ n: window.__ERR.count, s: Object.keys(window.__ERR.sigs) }));
  return { __ERR: e.n, sigs: e.s, journal: errs.slice(), absents: errs.absents.slice() };
}
function ecrire(nom, dataUrl) { fs.writeFileSync(path.join(OUT, nom), Buffer.from(dataUrl.split(',')[1], 'base64')); }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const RES = {};

/* scène commune : gros coup au même endroit, avec la direction d'un tir vers la droite */
const GROS = (dir) => { const N = window.__N, g = N.gfx; N.fx.boom(Math.round(g.W * 0.7), Math.round(g.H * 0.45), 1, 'magenta'); N.fx.shake(12); if (dir) { N.S.shakeX = dir[0]; N.S.shakeY = dir[1]; } };

/* ================================ écrans ================================ */
execFileSync('/opt/node22/bin/node', [path.join(ROOT, 'build.mjs'), path.join(HERE, 'index.html')], { cwd: ROOT, stdio: 'pipe' });
if (QUOI.includes('ecrans')) {
  const ECRANS = [
    ['iPhone 13 paysage', PAYSAGE, { left: 47, right: 47, bottom: 21 }],
    ['iPhone 16 paysage', { ...IPH, viewport: { width: 852, height: 393 } }, { left: 59, right: 59, bottom: 21 }],
    ['iPhone portrait', { ...IPH, viewport: { width: 390, height: 844 } }, { top: 47, bottom: 34 }],
    ['bureau', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, null],
  ];
  const lire = page => page.evaluate(() => {
    const g = window.__N.gfx, r = g.canvas().getBoundingClientRect(), s = window.__S.view.safe;
    return { px: g.PX, W: g.W, H: g.H, css: [r.width, r.height], canvas: [g.canvas().width, g.canvas().height], safe: s,
      arene: [g.W - s.l - s.r, g.H - s.t - s.b], vue: [innerWidth, innerHeight] };
  });
  RES.ecrans = [];
  for (const [nom, prof, ins] of ECRANS) {
    const { ctx, page, errs } = await ouvrir(browser, COPIE, prof);
    const sans = await lire(page);
    let avec = null, cdpOK = null;
    if (ins) {
      try {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 0, right: 0, ...ins } });
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(150);
        avec = await lire(page);
        cdpOK = true;
      } catch (e) { cdpOK = String(e.message || e).slice(0, 120); }
    }
    const [w, h] = [prof.viewport.width, prof.viewport.height];
    const pOld = Math.min(6, Math.max(2, Math.round(w / 340)));
    /* en jeu : grosse secousse avec direction, puis ROTATION en pleine secousse ; la partie doit survivre */
    await enJeu(page);
    await page.evaluate(g => { window.__R.ev[30] = () => (0, eval)('(' + g + ')')([0, 1]); }, GROS.toString());
    await page.waitForFunction(() => window.__R.k > 33, null, { timeout: 20000, polling: 20 });
    await page.setViewportSize({ width: h, height: w });
    await page.waitForFunction(() => window.__R.k > 90, null, { timeout: 20000, polling: 50 });
    const tourne = await lire(page);
    const secoue = await page.evaluate(() => Math.max(...window.__R.tr.slice(28, 40).map(t => Math.hypot(t[0], t[1]))));
    RES.ecrans.push({ nom, vue: [w, h], ancienneRegle: { px: pOld, tampon: [Math.ceil(w / pOld), Math.ceil(h / pOld)] }, sansZoneSure: sans, zoneSure: ins, avecZoneSure: avec, cdp: cdpOK, secousseMax: secoue, apresRotation: tourne, erreurs: await erreurs(page, errs) });
    await ctx.close();
  }
  console.log('\n=== ECRANS (ma copie, src/ du moment) ===');
  for (const e of RES.ecrans) {
    const f = r => r ? `px=${r.px} tampon=${r.W}x${r.H} canvas CSS=${r.css.join('x')} (=${r.W * r.px}x${r.H * r.px}) sûre(jeu) l${r.safe.l} t${r.safe.t} r${r.safe.r} b${r.safe.b} arène=${r.arene.join('x')}` : '-';
    console.log(`${e.nom.padEnd(18)} ${e.vue.join('x')}  ancienne règle : px=${e.ancienneRegle.px} tampon=${e.ancienneRegle.tampon.join('x')}`);
    console.log(`   zone sûre nulle  : ${f(e.sansZoneSure)}`);
    if (e.zoneSure) console.log(`   zone sûre ${JSON.stringify(e.zoneSure)} : ${e.cdp === true ? f(e.avecZoneSure) : 'CDP refusé : ' + e.cdp}`);
    console.log(`   en jeu : secousse max ${e.secousseMax.toFixed(1)} px de jeu ; après rotation en ${e.apresRotation.vue.join('x')} : ${f(e.apresRotation)}`);
    console.log(`   erreurs : __ERR=${e.erreurs.__ERR} exceptions+console=${e.erreurs.journal.length} ${e.erreurs.journal.slice(0, 3).join(' | ')}  ressources absentes : ${e.erreurs.absents.join(', ') || 'aucune'}`);
  }
}


/* ================================ fantôme ================================ */
if (QUOI.includes('fantome')) {
  RES.fantome = {};
  for (const v of ['avant', 'apres']) {
    const { ctx, page, errs } = await ouvrir(browser, ab(v).url, PAYSAGE, 1, ab(v).html);
    await enJeu(page);
    await page.evaluate(g => { const R = window.__R; R.ev[150] = () => { (0, eval)('(' + g + ')')([1, 0]); R.arm = 6; }; }, GROS.toString());
    try { await page.waitForFunction(() => !!window.__R.ghost, null, { timeout: 20000, polling: 50 }); }
    catch (e) { console.log(v, await page.evaluate(() => ({ k: window.__R.k, arm: window.__R.arm, on: window.__R.on, tr: window.__R.tr.slice(145, 160), err: window.__ERR.sigs }))); throw e; }
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(OUT, `fantome-${v}-ecran.png`) });
    const r = await page.evaluate(() => window.__R.ghost);
    ecrire(`fantome-${v}-image.png`, r.p1); ecrire(`fantome-${v}-reference.png`, r.p2); ecrire(`fantome-${v}-ecart.png`, r.diff);
    delete r.p1; delete r.p2; delete r.diff;
    await page.evaluate(() => { window.__R.hold = false; });
    await page.waitForTimeout(300);
    RES.fantome[v] = { ...r, erreurs: await erreurs(page, errs) };
    await ctx.close();
  }
  console.log('\n=== FANTOME : image rendue pendant la secousse  vs  tampon décalé à la main rendu sans secousse ===');
  for (const [v, r] of Object.entries(RES.fantome))
    console.log(`${v.padEnd(6)} décalage (${r.ox},${r.oy}) px=${r.PX}  référence rendue à (${r.ref})  pixels différents : ${r.n} (${r.pct} % de ${r.OW}x${r.OH}), écart max ${r.mx}/255, moyen ${r.moy}, boîte ${JSON.stringify(r.boite)}  __ERR=${r.erreurs.__ERR} journal=${r.erreurs.journal.length}`);
}

/* ================================ trace ================================ */
if (QUOI.includes('trace')) {
  RES.trace = {};
  for (const v of ['avant', 'apres']) {
    const { ctx, page, errs } = await ouvrir(browser, ab(v).url, PAYSAGE, 1, ab(v).html);
    await enJeu(page);
    await page.evaluate(g => {
      const R = window.__R, G = (0, eval)('(' + g + ')');
      R.ev[60] = () => G([1, 0]);          /* tir ou impact vers la droite : la caméra doit partir à gauche */
      R.ev[150] = () => G(null);           /* sans direction */
    }, GROS.toString());
    await page.waitForFunction(() => window.__R.k > 240, null, { timeout: 30000, polling: 50 });
    const tr = await page.evaluate(() => window.__R.tr.slice(0, 241));
    RES.trace[v] = { tr, erreurs: await erreurs(page, errs) };
    await ctx.close();
  }
  {
    /* mouvement réduit : 50-fx.js écrit N.S.shake = 0, la caméra ne doit pas bouger d'un pixel */
    const { ctx, page, errs } = await ouvrir(browser, ab('apres').url, { ...PAYSAGE, reducedMotion: 'reduce' }, 1, ab('apres').html);
    await enJeu(page);
    await page.evaluate(g => {
      const R = window.__R, S = window.__S; R.ev[30] = () => (0, eval)('(' + g + ')')([1, 0]);
      /* une direction écrite sans coup : elle doit s'effacer seule (0,12 s) */
      R.ev[100] = () => { S.shakeX = 0.6; S.shakeY = 0.8; };
      R.ev[102] = () => { R.dir2 = [S.shakeX, S.shakeY]; };
      R.ev[118] = () => { R.dir18 = [S.shakeX, S.shakeY]; };
    }, GROS.toString());
    await page.waitForFunction(() => window.__R.k > 120, null, { timeout: 30000, polling: 50 });
    const r = await page.evaluate(() => ({ max: Math.max(...window.__R.tr.slice(25, 120).map(t => Math.hypot(t[0], t[1]))), a: Math.max(...window.__R.tr.slice(25, 120).map(t => t[2])), dir2: window.__R.dir2, dir18: window.__R.dir18 }));
    RES.reduit = { ...r, erreurs: await erreurs(page, errs) };
    await ctx.close();
  }
  console.log('\n=== TRACE de la caméra (ox,oy en pixels de jeu ; A = N.S.shake lu) ===');
  console.log(`mouvement réduit (après) : N.S.shake max ${RES.reduit.a}, décalage max ${RES.reduit.max} ; direction écrite sans coup : 2 images après ${JSON.stringify(RES.reduit.dir2)}, 18 images après ${JSON.stringify(RES.reduit.dir18)}  __ERR=${RES.reduit.erreurs.__ERR}`);
  const stats = (tr, a, b) => {
    const s = tr.slice(a, b); let saut = 0, n = 0, inv = 0, px = 0, py = 0, mx = 0, actives = 0, dernier = 0;
    for (let i = 1; i < s.length; i++) {
      const [x, y] = s[i], [x0, y0] = s[i - 1];
      saut += Math.hypot(x - x0, y - y0); n++;
      if (x || y) { actives++; dernier = i; }
      if (x && px && Math.sign(x) !== Math.sign(px)) inv++;
      if (y && py && Math.sign(y) !== Math.sign(py)) inv++;
      if (x) px = x; if (y) py = y;
      mx = Math.max(mx, Math.hypot(x, y));
    }
    /* saut moyen d'une image à la suivante, sur la seule durée du mouvement (du coup au repos) */
    let sm = 0; for (let i = 1; i <= dernier + 1 && i < s.length; i++) sm += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    return { sautMoyen: +(sm / (dernier + 1)).toFixed(2), inversions: inv, max: +mx.toFixed(1), imagesDecalees: actives, reposA: dernier };
  };
  for (const [v, r] of Object.entries(RES.trace)) {
    const d = stats(r.tr, 59, 150), s = stats(r.tr, 149, 240);
    r.stats = { avecDirection: d, sansDirection: s };
    console.log(`${v} — coup à l'image 60, direction (1,0) : ${r.tr.slice(60, 84).map(t => t[0] + ',' + t[1]).join(' ')}`);
    console.log(`        A : ${r.tr.slice(60, 84).map(t => t[2]).join(' ')}`);
    console.log(`        ${JSON.stringify(d)}`);
    console.log(`${v} — coup à l'image 150, sans direction : ${r.tr.slice(150, 174).map(t => t[0] + ',' + t[1]).join(' ')}`);
    console.log(`        ${JSON.stringify(s)}   __ERR=${r.erreurs.__ERR} journal=${r.erreurs.journal.length}`);
  }
}

/* ================================ coût ================================
   APPARIÉ : un bundle de mesure, construit par build.mjs dans un dossier temporaire et servi par
   interception (aucun fichier écrit dans le dépôt), contient src/ tel quel PLUS l'ancien 20-crt.js (celui
   du commit ORIGINE, ou VIEUX=<chemin>) publié sous N.crtVieux. Les deux, compilés de la même façon dans la même
   fermeture, traitent CHAQUE image dans un ordre alterné, chacun chronométré entre deux vidages du canvas.
   Même tampon, même charge de la machine au même instant : la différence ne vient que du code.
   Coût d'image avant = rappel complet - nouveau ; après = rappel complet - ancien (tout le reste est commun).
   (Injecter l'ancien par eval à côté du nouveau compilé dans le bundle faussait la comparaison de 0,3 ms.) */
if (QUOI.includes('cout')) {
  RES.cout = [];
  const VIEUX = process.env.VIEUX ? fs.readFileSync(process.env.VIEUX, 'utf8')
    : execFileSync('git', ['-C', ROOT, 'show', ORIGINE + ':proto-neon/src/20-crt.js'], { encoding: 'utf8' });
  if ((VIEUX.match(/N\.crt = CRT;/g) || []).length !== 1) throw new Error('ancien 20-crt.js : publication introuvable');
  const HTML = bundle({ '21-crt-vieux.js': VIEUX.replace('N.crt = CRT;', 'N.crtVieux = CRT;') });
  const URLP = COPIE.replace('index.html', 'paire.html');
  const PAIRE = () => {
    const N = window.__N, R = window.__R, o = document.getElementById('out'), cx = o.getContext('2d');
    const neuf = N.crt, fN = R.orig, ancien = N.crtVieux, fA = ancien.apply;
    R.cA = []; R.cN = []; R.trA = [];
    neuf.apply = function (dt) {
      const un = (R.k & 1) ? fN : fA, deux = un === fN ? fA : fN;
      for (const f of [un, deux]) {
        cx.getImageData(0, 0, 1, 1);               /* le travail en attente (present) n'est imputé à aucun des deux */
        const t0 = performance.now();
        f(dt); cx.getImageData(0, 0, 1, 1);
        const d = performance.now() - t0;
        if (R.on) (f === fN ? R.cN : R.cA).push(d);
      }
      if (R.on) { R.tr.push([neuf.stats.ox, neuf.stats.oy]); R.trA.push([ancien.stats.ox, ancien.stats.oy]); }
    };
    return [!!ancien && ancien !== neuf, typeof fA, typeof fN];
  };
  const SCENE = () => {
    const R = window.__R, N = window.__N, g = N.gfx;
    let s = 77; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const coup = (f) => {
      const x = Math.round(g.W * (0.15 + 0.7 * r())), y = Math.round(g.H * (0.2 + 0.6 * r()));
      N.fx.boom(x, y, f, 'magenta'); if (f > 0.6) N.fx.shake(12);
      const dx = x - g.W / 2, dy = y - g.H / 2, l = Math.hypot(dx, dy) || 1;
      N.S.shakeX = dx / l; N.S.shakeY = dy / l;
    };
    for (let k = 70; k < 700; k += 45) R.ev[k] = () => coup(0.3 + 0.25 * r());
    for (const k of [100, 250, 400, 550]) R.ev[k + 3] = () => coup(1);
  };
  for (const ra of [1, 4]) {
    const { ctx, page, errs } = await ouvrir(browser, URLP, PAYSAGE, ra, HTML);
    const ok = await page.evaluate(PAIRE);
    await enJeu(page);
    await page.evaluate(SCENE);
    await page.waitForFunction(() => window.__R.k >= 660, null, { timeout: 240000, polling: 200 });
    const m = await page.evaluate(() => { const R = window.__R; return { cost: R.cost.slice(60, 660), cA: R.cA.slice(60, 660), cN: R.cN.slice(60, 660), tr: R.tr.slice(60, 660), trA: R.trA.slice(60, 660) }; });
    const av = m.cost.map((c, i) => c - m.cN[i]), ap = m.cost.map((c, i) => c - m.cA[i]), dif = m.cN.map((c, i) => c - m.cA[i]);
    const P = a => ({ p50: +q(a, 0.5).toFixed(2), p95: +q(a, 0.95).toFixed(2) });
    RES.cout.push({ ra, chargement: ok, n: m.cost.length, imageAvant: P(av), imageApres: P(ap), crtAvant: P(m.cA), crtApres: P(m.cN), ecartCrt: P(dif),
      decaleesAvant: m.trA.filter(t => t[0] || t[1]).length, decaleesApres: m.tr.filter(t => t[0] || t[1]).length, erreurs: await erreurs(page, errs) });
    await ctx.close();
  }
  console.log('\n=== COUT APPARIÉ, profil iPhone 13 paysage 844x390, 600 images de jeu, explosions et secousses programmées ===');
  for (const c of RES.cout) {
    console.log(`CPU x${c.ra}  (ancien chargé : ${c.chargement.join(',')})  ${c.n} images`);
    console.log(`   image   avant p50 ${c.imageAvant.p50} ms  p95 ${c.imageAvant.p95} ms   |  après p50 ${c.imageApres.p50} ms  p95 ${c.imageApres.p95} ms`);
    console.log(`   20-crt  avant p50 ${c.crtAvant.p50} ms  p95 ${c.crtAvant.p95} ms   |  après p50 ${c.crtApres.p50} ms  p95 ${c.crtApres.p95} ms   |  écart apparié (après - avant) p50 ${c.ecartCrt.p50} p95 ${c.ecartCrt.p95}`);
    console.log(`   images décalées : avant ${c.decaleesAvant}  après ${c.decaleesApres}   __ERR=${c.erreurs.__ERR} exceptions+console=${c.erreurs.journal.length} absents=${c.erreurs.absents.length}`);
  }
}

fs.writeFileSync(path.join(OUT, 'preuve.json'), JSON.stringify(RES, null, 1));
await browser.close();
