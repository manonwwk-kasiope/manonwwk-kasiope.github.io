/* Banc de l'aventure (64-aventure.js : N.film et N.aventure). Trois profils (iPhone 13 paysage et portrait, bureau).
   Par profil, deux aventures de bout en bout dans la même page :
     1. ELLE : choisie au toucher (au clic sur le bureau) ; la garde de 300 ms des films ; 1976 jouée par un pilote
        simple (paysage) ou sautée ; un film joué jusqu'au bout (durée) ; 1982 sautée ; le jeu simulé rend la main
        par reprendre('fin') : profondeur, warp, espace sont rattrapés, puis la fin d'ELLE et l'invitation à rejouer.
     2. LUI : choisi ; chaque époque future rendue par son événement (profondeur, warp, espace, fin) ; les deux sont
        finis : retrouvailles (jouées jusqu'au bout), teaser SNAKE 3019 avec sa carte, À SUIVRE.
   Zéro erreur (window.__ERR.count et erreurs de page), palette fermée (tampon d'index ≤ 15), aucun cyan hors des
   images de film, la liste des films joués, coût du dessin d'un film.
   Usage : node build.mjs tools/aventure/index.html && node tools/aventure/banc.mjs [dossier des captures]
   Serveur attendu sur http://127.0.0.1:8133 (racine du dépôt). Sortie 0 si tout passe. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'http://127.0.0.1:8133/proto-neon/tools/aventure/index.html';
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad/aventure';
fs.mkdirSync(OUT, { recursive: true });

const IP = devices['iPhone 13'];
const PROFILS = [
  { nom: 'paysage', ctx: { ...IP, viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } }, touche: true, pilote: true },
  { nom: 'portrait', ctx: { ...IP, viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } }, touche: true, pilote: false },
  { nom: 'bureau', ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, touche: false, pilote: false }
];

const echecs = [], mesures = {};
function verifie(ok, quoi) { if (!ok) echecs.push(quoi); console.log((ok ? '  ok   ' : '  ÉCHEC ') + quoi); }
const attendre = ms => new Promise(r => setTimeout(r, ms));

const etat = page => page.evaluate(() => window.__N.aventure.state());
async function attendreQue(page, fn, arg, max = 20000) {
  const t0 = Date.now();
  for (;;) {
    const v = await page.evaluate(fn, arg);
    if (v) return v;
    if (Date.now() - t0 > max) return null;
    await attendre(25);
  }
}
const attendreEtape = (page, id, max) => attendreQue(page, id => window.__N.aventure.etape() === id, id, max);
const attendreFilmT = (page, t, max) => attendreQue(page, t => { const f = window.__N.film.state(); return f.actif && f.t >= t; }, t, max);
async function toucher(page, P, fx = 0.5, fy = 0.5) {
  const v = P.ctx.viewport, x = Math.round(v.width * fx), y = Math.round(v.height * fy);
  if (P.touche) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
async function capture(page, P, nom) {
  const f = path.join(OUT, P.nom + '-' + nom + '.png');
  await page.screenshot({ path: f, scale: 'css' });
  return f;
}
/* le tampon d'index : hors palette, part de cyan, nombre de couleurs */
const tampon = page => page.evaluate(() => {
  const N = window.__N, B = N.gfx.buf(), I = N.pal.i, cy = I('cyan'), cp = I('cyanPale'), vu = new Set();
  let hors = 0, cyan = 0;
  for (let i = 0; i < B.length; i++) { const v = B[i]; if (v > 15) hors++; if (v === cy || v === cp) cyan++; vu.add(v); }
  return { hors, cyan: +(cyan / B.length).toFixed(4), couleurs: vu.size, W: N.gfx.W, H: N.gfx.H, px: N.gfx.PX };
});
const erreurs = page => page.evaluate(() => (window.__ERR ? window.__ERR.count : -1));

/* coût de N.aventure.draw pendant un film, sur n images */
const cout = (page, n = 120) => page.evaluate(n => new Promise(res => {
  const A = window.__N.aventure, d0 = A.draw, v = [];
  A.draw = function () { const t = performance.now(); d0.apply(this, arguments); if (window.__N.film.actif()) v.push(performance.now() - t); };
  const t0 = performance.now();
  (function boucle() {
    if (v.length >= n || performance.now() - t0 > 6000) {
      A.draw = d0; v.sort((a, b) => a - b); const k = v.length || 1;
      res({ n: v.length, p50: +(v[(k * 0.5) | 0] || 0).toFixed(2), p95: +(v[(k * 0.95) | 0] || 0).toFixed(2) });
    } else requestAnimationFrame(boucle);
  })();
}), n);

/* un film : capture à mi-chemin (légende tapée), contrôle du tampon, puis toucher pour sauter (ou attendre la fin) */
async function film(page, P, id, o = {}) {
  const ok = await attendreEtape(page, id, o.max || 15000);
  verifie(!!ok, `${P.nom} : étape ${id} atteinte`);
  if (!ok) return null;
  await attendreFilmT(page, o.capT || 1.9, 8000);
  const f = await page.evaluate(() => window.__N.film.state());
  const tb = await tampon(page);
  await capture(page, P, o.cap || id);
  verifie(tb.hors === 0, `${P.nom} : ${id} palette fermée (${tb.couleurs} couleurs)`);
  if (o.panneau !== false) verifie(f.panneau, `${P.nom} : ${id} image affichée (${f.nom}, ${f.video ? 'vidéo' : 'panneau fixe de repli'})`);
  if (f.legende) verifie(f.typed > 0, `${P.nom} : ${id} légende « ${f.legende} » en frappe (${f.typed} lettres)`);
  const m = { nom: f.nom, clip: f.clip, video: f.video, videoVue: f.videoVue, panneau: f.panneau, cyan: tb.cyan, legende: f.legende, carte: f.carte };
  if (o.jusquauBout) {
    const fini = await attendreQue(page, id => window.__N.aventure.etape() !== id, id, 12000);
    /* la durée en temps de jeu, lue au journal de l'aventure : de l'entrée du film à l'étape suivante */
    const J = (await etat(page)).journal, k = J.map(e => e.e).lastIndexOf(J.filter(e => e.e.startsWith('film ' + id + ' ')).pop()?.e);
    m.duree = k >= 0 && J[k + 1] ? +(J[k + 1].t - J[k].t).toFixed(2) : -1;
    verifie(!!fini && Math.abs(m.duree - f.duree) < 0.25, `${P.nom} : ${id} joué jusqu'au bout en ${m.duree} s (prévu ${f.duree} s)`);
  } else if (o.sauter !== false) {
    await toucher(page, P);
    const parti = await attendreQue(page, id => window.__N.aventure.etape() !== id, id, 3000);
    verifie(!!parti, `${P.nom} : ${id} sauté d'un toucher`);
  }
  return m;
}

async function aventureElle(page, P, M) {
  console.log(' -- aventure 1 : ELLE');
  const ch = await attendreQue(page, () => window.__N.aventure.etape() === 'choix' && window.__N.choix.phase() === 'choix', null, 8000);
  verifie(!!ch, `${P.nom} : écran de choix`);
  await attendre(450);                                 // passé la garde de l'écran de choix
  await capture(page, P, '01-choix');
  /* ELLE : le centre de sa moitié */
  const z = await page.evaluate(() => { const s = window.__N.choix.state(), z = s.zones.elle, r = window.__N.gfx.canvas().getBoundingClientRect(), p = window.__N.gfx.PX; return { x: r.left + (z.x + z.w * 0.5) * p, y: r.top + (z.y + z.h * 0.45) * p }; });
  if (P.touche) await page.touchscreen.tap(z.x, z.y); else await page.mouse.click(z.x, z.y);
  verifie(!!await attendreEtape(page, 'connexion', 4000), `${P.nom} : ELLE choisie, film de connexion`);
  /* la révélation tramée, puis la garde : un toucher à 0,1 s ne saute rien */
  await attendreFilmT(page, 0.1, 3000);
  await capture(page, P, '02-connexion-revele');
  await toucher(page, P);
  await attendreFilmT(page, 0.6, 3000);
  const g = await page.evaluate(() => ({ e: window.__N.aventure.etape(), f: window.__N.film.state() }));
  verifie(g.e === 'connexion' && g.f.actif && !g.f.saute, `${P.nom} : garde de 300 ms (toucher à 0,1 s ignoré, film à ${g.f.t} s)`);
  M.films.push(await film(page, P, 'connexion', { cap: '03-connexion' }));

  /* 1976 */
  verifie(!!await attendreEtape(page, '1976', 3000), `${P.nom} : époque 1976`);
  if (P.pilote) {
    await page.evaluate(() => window.__aventure.pilote(true));
    await attendreQue(page, () => window.__N.terminal.menace() >= 3, null, 40000);
    await capture(page, P, '04-1976');
    const fini = await attendreEtape(page, 'fissure', 70000);
    const ts = await page.evaluate(() => window.__N.terminal.state());
    M.t1976 = { manges: ts.manges, morts: ts.morts, t: ts.t };
    verifie(!!fini, `${P.nom} : 1976 jouée par le pilote jusqu'à la fissure (${ts.manges} cellules, ${ts.morts} morts, ${ts.t} s)`);
    await page.evaluate(() => window.__aventure.pilote(false));
  } else {
    await attendre(1800);
    await capture(page, P, '04-1976');
    await page.evaluate(() => window.__N.aventure.sauter());
    verifie(!!await attendreEtape(page, 'fissure', 6000), `${P.nom} : 1976 sautée (fissure puis film)`);
  }
  /* la fissure : jouée jusqu'au bout, pour la durée par défaut */
  M.films.push(await film(page, P, 'fissure', { cap: '05-fissure', jusquauBout: true }));

  /* 1982 */
  const arcade = await page.evaluate(() => !!(window.__N.arcade && window.__N.arcade.start));
  if (arcade) {
    verifie(!!await attendreEtape(page, '1982', 3000), `${P.nom} : époque 1982 (N.arcade)`);
    await attendre(2500);
    await capture(page, P, '06-1982');
    await page.evaluate(() => window.__N.aventure.sauter());
  }
  verifie(!!await attendreEtape(page, 'neon', 12000), `${P.nom} : LE NÉON, la main au jeu`);
  const j = await page.evaluate(() => ({ jeu: window.__AV_JEU, actif: window.__N.aventure.actif() }));
  verifie(j.jeu && j.jeu.etape === 'neon' && j.jeu.premiere && j.jeu.qui === 'elle' && !j.actif, `${P.nom} : aJouer(${JSON.stringify(j.jeu)})`);
  await attendre(600);
  await capture(page, P, '07-neon-simule');
  /* reprendre('fin') d'emblée : les trois époques futures sont rattrapées */
  await page.evaluate(() => window.__aventure.rendre('fin'));
  M.films.push(await film(page, P, 'profondeur', { cap: '08-profondeur' }));
  M.films.push(await film(page, P, 'warp', { cap: '09-warp' }));
  M.films.push(await film(page, P, 'espace', { cap: '10-espace' }));
  M.films.push(await film(page, P, 'fin', { cap: '11-fin-elle' }));
  M.films.push(await film(page, P, 'rejouer', { cap: '12-rejouer' }));
  const b = await attendreQue(page, () => window.__AV_FIN, null, 4000);
  verifie(b && b.issue === 'fin' && b.qui === 'elle' && b.deux === false, `${P.nom} : surFin(${JSON.stringify(b)})`);
  const s = await etat(page);
  M.elle = s.joues;
  verifie(JSON.stringify(s.joues) === JSON.stringify(['connexion-elle', 'fissure-elle', 'neon-elle', 'profondeur-elle', 'warp-elle', 'espace-elle', 'fin-elle', 'pilote-lui']),
    `${P.nom} : films d'ELLE ${s.joues.join(', ')}`);
}

async function aventureLui(page, P, M) {
  console.log(' -- aventure 2 : LUI');
  await page.evaluate(() => window.__aventure.lancer());
  await attendreQue(page, () => window.__N.choix.phase() === 'choix', null, 8000);
  await attendre(450);
  const prof = await page.evaluate(() => window.__N.choix.profil());
  verifie(prof.elle.fini && !prof.lui.fini, `${P.nom} : profil après ELLE ${JSON.stringify(prof)}`);
  await capture(page, P, '13-choix-elle-finie');
  const z = await page.evaluate(() => { const s = window.__N.choix.state(), z = s.zones.lui, r = window.__N.gfx.canvas().getBoundingClientRect(), p = window.__N.gfx.PX; return { x: r.left + (z.x + z.w * 0.5) * p, y: r.top + (z.y + z.h * 0.45) * p }; });
  if (P.touche) await page.touchscreen.tap(z.x, z.y); else await page.mouse.click(z.x, z.y);
  M.films.push(await film(page, P, 'connexion', { cap: '14-connexion-lui' }));
  await attendreEtape(page, '1976', 3000);
  await page.evaluate(() => window.__N.aventure.sauter());
  M.films.push(await film(page, P, 'fissure', { cap: '15-fissure-lui', max: 6000 }));
  if (await page.evaluate(() => !!window.__N.arcade)) { await attendreEtape(page, '1982', 3000); await attendre(300); await page.evaluate(() => window.__N.aventure.sauter()); }
  verifie(!!await attendreEtape(page, 'neon', 12000), `${P.nom} : LUI au néon`);
  /* chaque époque future rendue par son événement ; le jeu reprend entre chaque */
  const evts = [['profondeur', 'jeu-1993', '16-profondeur-lui'], ['warp', 'jeu-2001', '17-warp-lui'], ['espace', 'jeu-2975', '18-espace-lui']];
  for (const [evt, apres, cap] of evts) {
    await attendre(300);
    await page.evaluate(e => window.__aventure.rendre(e), evt);
    M.films.push(await film(page, P, evt, { cap }));
    const jj = await attendreQue(page, a => (window.__AV_JEU && window.__AV_JEU.etape === a && !window.__N.aventure.actif()) ? window.__AV_JEU : null, apres, 3000);
    verifie(!!jj, `${P.nom} : après ${evt}, aJouer({ etape: ${apres}, epoque: ${jj && jj.epoque} })`);
  }
  /* un reprendre hors de propos est refusé */
  const refus = await page.evaluate(() => window.__N.aventure.reprendre('profondeur'));
  verifie(refus === false, `${P.nom} : reprendre('profondeur') déjà passé refusé`);
  await page.evaluate(() => window.__aventure.rendre('fin'));
  M.films.push(await film(page, P, 'fin', { cap: '19-fin-lui' }));
  M.films.push(await film(page, P, 'retrouvailles', { cap: '20-retrouvailles', capT: 2.5, jusquauBout: true }));
  M.films.push(await film(page, P, 'teaser', { cap: '21-teaser-3019', capT: 4.4 }));
  const fa = await film(page, P, 'asuivre', { cap: '22-a-suivre', capT: 2.6, panneau: false });
  M.films.push(fa);
  verifie(fa && fa.cyan === 0, `${P.nom} : À SUIVRE sans cyan`);
  const b = await attendreQue(page, () => window.__AV_FIN, null, 4000);
  verifie(b && b.issue === 'fin' && b.qui === 'lui' && b.deux === true, `${P.nom} : surFin(${JSON.stringify(b)})`);
  const s = await etat(page);
  M.lui = s.joues;
  verifie(JSON.stringify(s.joues) === JSON.stringify(['connexion-lui', 'fissure-lui', 'neon-lui', 'profondeur-lui', 'warp-lui', 'espace-lui', 'fin-lui', 'retrouvailles', 'teaser-3019', 'asuivre']),
    `${P.nom} : films de LUI ${s.joues.join(', ')}`);
}

async function profil(browser, P) {
  console.log('\n== ' + P.nom);
  const ctx = await browser.newContext(P.ctx);
  await ctx.addInitScript(() => { window.__DT = 1 / 60; });
  const page = await ctx.newPage();
  const pageErr = [];
  page.on('pageerror', e => pageErr.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErr.push(m.text()); });
  await page.goto(URL + '?oublie=1', { waitUntil: 'load' });
  await attendreQue(page, () => !!window.__aventure, null, 5000);
  const M = { films: [] };
  const tb = await tampon(page);
  M.ecran = { W: tb.W, H: tb.H, px: tb.px };
  await aventureElle(page, P, M);
  /* coût du dessin d'un film : on relance une aventure courte jusqu'à un film, mesure, puis on la coupe */
  await aventureLui(page, P, M);
  await page.evaluate(() => window.__aventure.lancer({ qui: 'elle' }));
  await attendreFilmT(page, 0.4, 4000);
  M.cout = await cout(page);
  await page.evaluate(() => window.__N.aventure.stop());
  const n = await erreurs(page);
  verifie(n === 0, `${P.nom} : __ERR.count = ${n}`);
  verifie(pageErr.length === 0, `${P.nom} : erreurs de page ${pageErr.length}${pageErr.length ? ' — ' + pageErr.slice(0, 3).join(' | ') : ''}`);
  M.films = M.films.filter(Boolean).map(f => ({ nom: f.nom, video: f.videoVue || f.video, clip: f.clip, duree: f.duree }));
  mesures[P.nom] = M;
  await ctx.close();
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try { for (const P of PROFILS) await profil(browser, P); }
catch (e) { echecs.push('exception : ' + e.message); console.error(e); }
finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'mesures.json'), JSON.stringify(mesures, null, 1));
console.log('\n' + JSON.stringify(Object.fromEntries(Object.entries(mesures).map(([k, v]) => [k, { ecran: v.ecran, cout: v.cout, t1976: v.t1976, videos: v.films.filter(f => f.video).length + '/' + v.films.length }]))));
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\ntout passe');
process.exit(echecs.length ? 1 : 0);
