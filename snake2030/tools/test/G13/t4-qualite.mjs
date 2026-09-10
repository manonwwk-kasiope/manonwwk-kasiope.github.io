/* G13 t4 — qualité stable sur le profil de la joueuse, et démarrage sans gel.
   Spec : profil iPhone, partie « dieu » de 300 s → changements de S.pxEff ≤ 4 (20 avant) ; rechargement
   après une partie → S.pxEff de la première image en jeu === S.stats.qStep (le cran mémorisé) ; profils
   iPhone et tablette → aucune image > 100 ms dans les 3 s qui suivent le clic JOUER (350 / 533 ms avant)
   et pxEff inchangé pendant ces 3 s. */
import { launchPhone, launchTablet, startGame, save, finish, deadline, sleep, installGod, playFor } from '../lib.mjs';
deadline(600, 'G13-t4');

const SECS = +(process.env.G13_T4_SECS || 300);
const r = {};

/* --- démarrage : la sonde tourne AVANT le clic, on relève les images des 3 s qui suivent --- */
async function demarrage(mk, nom) {
  const ctx = await mk();
  try {
    await sleep(800);
    await ctx.page.evaluate(() => {
      window.__D = [];
      let l = performance.now();
      (function t() { requestAnimationFrame(t); const n = performance.now(); window.__D.push({ d: n - l, w: n, ph: window.__S.phase, px: window.__S.pxEff }); l = n; })();
    });
    await startGame(ctx, { seed: 2030 });
    const t0 = await ctx.page.evaluate(() => performance.now());
    await sleep(3200);
    const f = await ctx.page.evaluate(t0 => window.__D.filter(o => o.w >= t0 && o.w <= t0 + 3000), t0);
    const px = [...new Set(f.map(o => o.px))];
    return { nom, images: f.length, max: +Math.max(...f.map(o => o.d)).toFixed(1),
      sup100: f.filter(o => o.d > 100).length, pxDistincts: px, pageErrors: ctx.pageErrors.length };
  } finally { await ctx.close(); }
}

r.demIphone = await demarrage(() => launchPhone({}), 'iphone');
r.demTablette = await demarrage(() => launchTablet({}), 'tablette');

/* --- 300 s sur iPhone : combien de fois la netteté change-t-elle ? --- */
{
  const ctx = await launchPhone({});
  try {
    await startGame(ctx, { seed: 2030 });
    await ctx.page.evaluate(() => {
      window.__Q = { chg: 0, suite: [window.__S.pxEff] };
      let p = window.__S.pxEff;
      (function t() { requestAnimationFrame(t); const v = window.__S.pxEff; if (v !== p) { p = v; window.__Q.chg++; window.__Q.suite.push(v); } })();
    });
    await installGod(ctx.page);
    await playFor(ctx, SECS, { god: true });
    r.iphone300 = await ctx.page.evaluate(() => ({ ...window.__Q, px: window.__S.pxEff, qStep: window.__S.stats.qStep,
      t: Math.round(window.__S.t / 1000), err: window.__ERR.count }));
    r.iphone300.pageErrors = ctx.pageErrors.length;
    // --- rechargement : le cran mémorisé s'applique dès la première image en jeu
    await ctx.page.reload({ waitUntil: 'load' });
    await ctx.page.waitForFunction(() => window.__S && window.__M && window.__M.ui, null, { timeout: 30000 });
    await sleep(600);
    await ctx.page.evaluate(() => {
      window.__P1 = null;
      (function t() { requestAnimationFrame(t); if (window.__P1 === null && window.__S.phase === 'play') window.__P1 = window.__S.pxEff; })();
    });
    await startGame(ctx, { seed: 2030 });
    await sleep(500);
    r.memoire = await ctx.page.evaluate(() => ({ premiereImage: window.__P1, qStep: window.__S.stats.qStep,
      cran: [0.6, 0.75, 1, 1.25, 1.5, 2], optPx: window.__S.opt.px, px: window.__S.pxEff }));
  } finally { await ctx.close(); }
}

// pxEff attendu à la première image = cran(base(opt.px) − qStep), plancher 1 sur petit écran
const M = r.memoire;
const CR = M.cran; let base = 0;
for (let k = 0; k < CR.length; k++) if (CR[k] <= M.optPx + 1e-6) base = k;
const attendu = CR[Math.max(Math.min(base, 2), base - M.qStep)];
M.attendu = attendu;
M.ok = M.premiereImage === attendu;

const okDem = o => o.sup100 === 0 && o.pxDistincts.length === 1 && o.pageErrors === 0;
const pass = r.iphone300.chg <= 4 && M.ok && okDem(r.demIphone) && okDem(r.demTablette)
  && r.iphone300.err === 0 && r.iphone300.pageErrors === 0;
save('G13-t4-qualite.json', { test: 'G13-t4', pass, measured: r });
finish('G13-t4', { pass, measured: r, threshold: 'iPhone ' + SECS + ' s : changements de pxEff ≤ 4 ; pxEff de la première image = cran mémorisé (S.stats.qStep) ; iPhone et tablette : 0 image > 100 ms et pxEff constant dans les 3 s après JOUER' });
