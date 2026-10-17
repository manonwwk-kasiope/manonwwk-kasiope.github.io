/* Banc de l'écran de choix (62-choix.js) : trois profils (iPhone 13 paysage et portrait, bureau), la garde de 300 ms,
   ELLE choisie au toucher (au clic sur le bureau), LUI au clavier, l'état « les deux finis », avec les portraits
   art/pilote-*.png et les clips cine/pilote-*.mp4, puis SANS eux (la silhouette procédurale de repli).
   La page d'essai vit dans tools/choix/ : ses demandes de cine/*.mp4 sont servies depuis proto-neon/cine/.
   Usage : node build.mjs tools/choix/index.html && node tools/choix/banc.mjs [dossier des captures]
   Serveur attendu sur http://127.0.0.1:8133 (racine du dépôt). Sortie 0 si tout passe. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { URL as URL_ } from 'node:url';

const URL = 'http://127.0.0.1:8133/proto-neon/tools/choix/index.html';
const CINE = path.join(path.dirname(new URL_(import.meta.url).pathname), '..', '..', 'cine');
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad/choix';
fs.mkdirSync(OUT, { recursive: true });

const IP = devices['iPhone 13'];
const PROFILS = [
  { nom: 'paysage', ctx: { ...IP, viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } }, touche: true },
  { nom: 'portrait', ctx: { ...IP, viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } }, touche: true },
  { nom: 'bureau', ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, touche: false }
];

const echecs = [], mesures = {};
function verifie(ok, quoi) { if (!ok) echecs.push(quoi); console.log((ok ? '  ok   ' : '  ÉCHEC ') + quoi); }
const attendre = ms => new Promise(r => setTimeout(r, ms));

async function etat(page) { return page.evaluate(() => window.__N.choix.state()); }
async function attendrePhase(page, ph, max = 4000) {
  const t0 = Date.now();
  for (;;) { const s = await etat(page); if (s.phase === ph) return s; if (Date.now() - t0 > max) return s; await attendre(30); }
}
/* centre d'une zone, en pixels CSS de la page */
async function centre(page, qui, fy = 0.45) {
  return page.evaluate(([qui, fy]) => {
    const s = window.__N.choix.state(), z = s.zones[qui], r = window.__N.gfx.canvas().getBoundingClientRect(), p = window.__N.gfx.PX;
    return { x: r.left + (z.x + z.w * 0.5) * p, y: r.top + (z.y + z.h * fy) * p };
  }, [qui, fy]);
}
async function touche(page, k) { await page.keyboard.down(k); await attendre(100); await page.keyboard.up(k); }
async function capture(page, nom) { const f = path.join(OUT, nom + '.png'); await page.screenshot({ path: f, scale: 'css' }); return f; }
/* part des encres de chaque monde dans chaque moitié, lue dans le tampon d'index */
async function encres(page) {
  return page.evaluate(() => {
    const N = window.__N, g = N.gfx, B = g.buf(), W = g.W, H = g.H, I = N.pal.i, s = N.choix.state();
    const chaud = [I('ambre'), I('jaune'), I('brasier')], rose = [I('magenta'), I('rosePale'), I('sang')], cy = [I('cyan'), I('cyanPale')];
    const res = {};
    for (const qui of ['elle', 'lui']) {
      const z = s.zones[qui]; let n = 0, c = 0, r = 0, k = 0;
      for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
        const v = B[y * W + x]; n++; if (chaud.includes(v)) c++; if (rose.includes(v)) r++; if (cy.includes(v)) k++;
      }
      res[qui] = { ambre: +(c / n).toFixed(3), magenta: +(r / n).toFixed(3), cyan: +(k / n).toFixed(3) };
    }
    let hors = 0; for (let i = 0; i < B.length; i++) if (B[i] > 15) hors++;
    res.horsPalette = hors;
    return res;
  });
}
/* coût de N.choix.update + draw, mesuré dans la page sur n images */
async function cout(page, n = 180) {
  return page.evaluate((n) => new Promise(res => {
    const C = window.__N.choix, d0 = C.draw, v = [];
    C.draw = function () { const t = performance.now(); d0.apply(this, arguments); v.push(performance.now() - t); };
    (function attendre() {
      if (v.length >= n) { C.draw = d0; v.sort((a, b) => a - b); res({ p50: +v[(n * 0.5) | 0].toFixed(2), p95: +v[(n * 0.95) | 0].toFixed(2), max: +v[n - 1].toFixed(2) }); }
      else requestAnimationFrame(attendre);
    })();
  }), n);
}

async function profil(browser, P) {
  console.log('\n== ' + P.nom);
  const ctx = await browser.newContext(P.ctx);
  await ctx.addInitScript(() => { window.__DT = 1 / 60; });
  await ctx.route('**/tools/choix/cine/*.mp4', async route => {
    const f = path.join(CINE, path.basename(new URL_(route.request().url()).pathname));
    if (fs.existsSync(f)) await route.fulfill({ path: f, contentType: 'video/mp4' }); else await route.fulfill({ status: 404, body: '' });
  });
  const page = await ctx.newPage();
  const consoleErr = [];
  page.on('console', m => { if (m.type() === 'error') consoleErr.push(m.text()); });
  page.on('pageerror', e => consoleErr.push(String(e)));
  await page.goto(URL + '?oublie=1');
  await page.waitForFunction(() => window.__choix && window.__N.choix.state().phase === 'choix', null, { timeout: 8000 });
  await attendre(900);
  const m = mesures[P.nom] = {};
  let s = await etat(page);
  m.tampon = s.W + '×' + s.H + ' px ' + s.px + (s.portrait ? ' portrait' : ' paysage');
  verifie(s.focus === null || !P.touche, P.nom + ' : au toucher, personne n\'est pointé d\'avance');
  m.encres = await encres(page);
  m.portraits = s.art;
  verifie(m.encres.elle.magenta > m.encres.elle.ambre * 3 && m.encres.lui.ambre > m.encres.elle.ambre * 2, P.nom + ' : deux mondes (portraits ' + JSON.stringify(s.art) + ')');
  verifie(m.encres.horsPalette === 0, P.nom + ' : palette fermée');
  await capture(page, P.nom + '-1-accueil');

  /* la garde : un toucher dans les 300 premières ms ne choisit rien */
  await page.evaluate(() => window.__choix.lancer());
  const ce = await centre(page, 'elle');
  if (P.touche) await page.touchscreen.tap(ce.x, ce.y); else await page.mouse.click(ce.x, ce.y);
  await attendre(700);
  s = await etat(page);
  verifie(s.gardes >= 1 && s.phase === 'choix' && !s.choisi, P.nom + ' : garde de 300 ms (toucher ignoré : ' + s.gardes + ')');

  /* ELLE au toucher (au clic sur le bureau) */
  if (P.touche) await page.touchscreen.tap(ce.x, ce.y); else { await page.mouse.move(ce.x + 12, ce.y + 6, { steps: 3 }); await attendre(400); s = await etat(page); m.survolClip = s.clipJoue; verifie(s.focus === 'elle', P.nom + ' : le survol pointe ELLE (clip ' + (s.clipJoue ? 'lancé' : 'absent') + ')'); await capture(page, P.nom + '-2a-survol-elle'); await page.mouse.click(ce.x, ce.y); }
  await attendre(320);
  await capture(page, P.nom + '-2-confirme-elle');
  await page.waitForFunction(() => window.__CHOIX_FIN, null, { timeout: 4000 }).catch(() => {});
  s = await etat(page);
  const jc = s.journal.find(e => e.e.startsWith('choix elle')), jf = s.journal.find(e => e.e === 'fin elle');
  m.confirmation = jc && jf ? +(jf.t - jc.t).toFixed(2) : null;
  verifie(await page.evaluate(() => window.__CHOIX_FIN) === 'elle' && s.personnage === 'elle', P.nom + ' : ELLE choisie (' + (jc ? jc.e : '?') + ')');
  verifie(m.confirmation !== null && Math.abs(m.confirmation - 0.6) < 0.05, P.nom + ' : confirmation de 0,6 s (' + m.confirmation + ' s)');
  verifie(s.actif === false && s.phase === 'fini', P.nom + ' : écran rendu après surFin');

  /* LUI au clavier */
  await page.evaluate(() => window.__choix.lancer());
  await attendrePhase(page, 'choix');
  await attendre(250);
  await touche(page, s.portrait ? 'ArrowDown' : 'ArrowRight');
  await attendre(500);
  s = await etat(page);
  verifie(s.focus === 'lui', P.nom + ' : la flèche pointe LUI');
  await capture(page, P.nom + '-3-pointe-lui');
  m.cout = await cout(page);
  await touche(page, 'Enter');
  await page.waitForFunction(() => window.__CHOIX_FIN, null, { timeout: 4000 }).catch(() => {});
  s = await etat(page);
  verifie(await page.evaluate(() => window.__CHOIX_FIN) === 'lui' && s.personnage === 'lui' && s.via === 'clavier', P.nom + ' : LUI choisi au clavier');

  /* les deux finis : profil écrit par marquerFini, relu après rechargement */
  await page.evaluate(() => { window.__N.choix.marquerFini('elle'); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__choix && window.__N.choix.state().phase === 'choix', null, { timeout: 8000 });
  await attendre(600);
  s = await etat(page);
  verifie(s.profil.elle.fini && !s.profil.lui.fini && !s.deux, P.nom + ' : profil relu après rechargement (ELLE finie seule)');
  await capture(page, P.nom + '-4-elle-finie');
  await page.evaluate(() => { window.__N.choix.marquerFini('lui'); window.__choix.lancer(); });
  await attendre(2400);
  s = await etat(page);
  verifie(s.deux && s.ouvert === 1 && await page.evaluate(() => window.__N.choix.lesDeuxFinis()), P.nom + ' : les deux finis, la faille ouverte');
  await capture(page, P.nom + '-5-deux-finis');

  /* SANS portraits ni clips : la silhouette procédurale de repli */
  await page.evaluate(() => {
    const A = window.__N.art, g0 = A.get, p0 = A.play;
    A.get = n => /^pilote-/.test(n) ? null : g0(n);
    A.play = n => /^pilote-/.test(n) ? false : p0(n);
    try { localStorage.removeItem('snake2975.pilotes'); } catch (e) {}
    window.__choix.lancer();
  });
  await attendrePhase(page, 'choix');
  await attendre(300);
  m.encresRepli = await encres(page);
  s = await etat(page);
  verifie(!s.art.elle && !s.art.lui && m.encresRepli.elle.magenta > m.encresRepli.elle.ambre * 3 && m.encresRepli.lui.ambre > m.encresRepli.lui.magenta * 3, P.nom + ' : repli procédural, deux mondes');
  await capture(page, P.nom + '-6-repli');
  await touche(page, s.portrait ? 'ArrowUp' : 'ArrowLeft');
  await attendre(500);
  await capture(page, P.nom + '-7-repli-pointe-elle');
  await page.evaluate(() => { window.__N.choix.marquerFini('elle'); window.__N.choix.marquerFini('lui'); window.__choix.lancer(); });
  await attendre(2400);
  await capture(page, P.nom + '-8-repli-deux-finis');

  const err = await page.evaluate(() => window.__ERR.count);
  m.erreurs = err + consoleErr.length;
  verifie(err === 0 && consoleErr.length === 0, P.nom + ' : zéro erreur (' + err + ' / console ' + consoleErr.length + (consoleErr[0] ? ' : ' + consoleErr[0] : '') + ')');
  await ctx.close();
}

const browser = await chromium.launch();
for (const P of PROFILS) await profil(browser, P);
await browser.close();
console.log('\nmesures', JSON.stringify(mesures, null, 1));
console.log('captures dans ' + OUT);
console.log(echecs.length ? '\n' + echecs.length + ' échec(s)' : '\ntout passe');
process.exit(echecs.length ? 1 : 0);
