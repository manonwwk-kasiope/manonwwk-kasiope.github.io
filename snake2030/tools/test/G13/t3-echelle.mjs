/* G13 t3 — échelle de qualité et coût d'image en rendu logiciel.
   Spec : Chromium sans GPU, 1920×1080 DPR 1 — S.opt.px = 0,75 → #game 1440×810 et style.width 1920px ;
   S.opt.px = 0,6 → 1152×648 ; scène vide (0 ennemi) p50 ≤ 20 ms ; partie réelle de 120 s : part
   d'images > 33 ms ≤ 20 % après les vingt premières secondes ; 30 s à 2560×1440 : S.pxEff < 1 à la fin. */
import { launchDesktop, startGame, save, finish, deadline, sleep, installGod, installInvuln, playFor, frameStats } from '../lib.mjs';
deadline(420, 'G13-t3');

const lireCanvas = p => p.evaluate(() => {
  const cv = document.getElementById('game'), S = window.__S;
  return { w: cv.width, h: cv.height, sw: cv.style.width, sh: cv.style.height, px: S.pxEff, opt: S.opt.px };
});
const sonde = p => p.evaluate(() => {
  window.__FR = [];
  let l = performance.now();
  (function t() { requestAnimationFrame(t); const n = performance.now(); const S = window.__S;
    window.__FR.push({ d: n - l, ph: S.phase, pa: !!S.paused, px: S.pxEff }); l = n; })();
});

const r = {};
// --- A. crans d'échelle et scène vide
{
  const ctx = await launchDesktop(1920, 1080, { unthrottled: true });
  try {
    await startGame(ctx, { seed: 2030 });
    await installInvuln(ctx.page);
    await sleep(1200);
    for (const v of [0.75, 0.6, 1, 1.5]) {
      await ctx.page.evaluate(v => { window.__S.opt.px = v; }, v);
      await sleep(400);
      r['px' + v] = await lireCanvas(ctx.page);
    }
    /* Scène vide : 0 ennemi tenu image par image. Le réglage de la joueuse est remis à son défaut et
       la qualité adaptative fait son travail — c'est le coût d'image RÉELLEMENT vécu qu'on mesure, pas
       celui d'une résolution forcée que le jeu n'aurait pas choisie. */
    await ctx.page.evaluate(() => {
      window.__S.opt.px = 1.5;
      (function t() { requestAnimationFrame(t); const S = window.__S; S.enemies.length = 0; S.ebullets.length = 0; S.snake.invuln = 1e9; S.snake.ghost = 1e9; })();
    });
    /* On attend que la qualité adaptative se soit STABILISÉE : mesurer pendant la descente mélange
       deux résolutions dans la même statistique (30,7 ms relevés à cheval sur 1,5 et 0,75). */
    await ctx.page.waitForFunction(() => {
      const S = window.__S, w = window.__STAB = window.__STAB || { v: -1, t: 0 };
      if (S.pxEff !== w.v) { w.v = S.pxEff; w.t = performance.now(); return false; }
      return performance.now() - w.t > 9000;   // un cran tombe toutes les ~5 s : 9 s sans changement = descente finie
    }, null, { timeout: 60000, polling: 500 });
    await sonde(ctx.page);
    await sleep(8000);
    r.vide = frameStats(await ctx.page.evaluate(() => window.__FR.slice(30).map(o => o.d)));
    r.videPx = await ctx.page.evaluate(() => window.__S.pxEff);
    r.pageErrorsA = ctx.pageErrors.length;
  } finally { await ctx.close(); }
}
// --- B. partie réelle de 120 s
{
  const ctx = await launchDesktop(1920, 1080, { unthrottled: true });
  try {
    await startGame(ctx, { seed: 7 });
    await installGod(ctx.page);
    await sonde(ctx.page);
    await playFor(ctx, 120, { god: true });
    const fr = await ctx.page.evaluate(() => window.__FR);
    let acc = 0; const apres = [];
    for (const o of fr) { acc += o.d; if (acc > 20000 && o.ph === 'play' && !o.pa) apres.push(o.d); }
    r.partie120 = frameStats(apres);
    r.changements = await ctx.page.evaluate(() => { let c = 0, p = null; for (const o of window.__FR) { if (p !== null && o.px !== p) c++; p = o.px; } return c; });
    r.pxFin = await ctx.page.evaluate(() => window.__S.pxEff);
    r.pageErrorsB = ctx.pageErrors.length;
    r.errB = await ctx.page.evaluate(() => window.__ERR.count);
  } finally { await ctx.close(); }
}
// --- C. 2560×1440 pendant 30 s : la machine doit descendre sous le cran 1
{
  const ctx = await launchDesktop(2560, 1440, { unthrottled: true });
  try {
    await startGame(ctx, { seed: 7 });
    await installGod(ctx.page);
    await sonde(ctx.page);
    await playFor(ctx, 30, { god: true });
    r.gros = await lireCanvas(ctx.page);
    /* Pourquoi le cran s'arrête là : on publie la part d'images longues au cran atteint. Descendre
       encore alors que la machine tient serait dégrader pour rien — la règle de baisse est « part > 6 % ». */
    r.grosFin = frameStats(await ctx.page.evaluate(() => window.__FR.slice(-600).filter(o => o.ph === 'play' && !o.pa).map(o => o.d)));
    r.pageErrorsC = ctx.pageErrors.length;
  } finally { await ctx.close(); }
}

const okPx = r['px0.75'].w === 1440 && r['px0.75'].h === 810 && r['px0.75'].sw === '1920px'
  && r['px0.6'].w === 1152 && r['px0.6'].h === 648 && r['px0.6'].sw === '1920px';
const pass = okPx && r.vide.p50 <= 20 && r.partie120.pct33 <= 20 && r.gros.px < 1
  && r.pageErrorsA === 0 && r.pageErrorsB === 0 && r.pageErrorsC === 0 && r.errB === 0;
r.okPx = okPx;
save('G13-t3-echelle.json', { test: 'G13-t3', pass, measured: r });
finish('G13-t3', { pass, measured: r, threshold: 'px 0,75 → 1440×810 (style 1920px) ; px 0,6 → 1152×648 ; scène vide p50 ≤ 20 ms ; partie 120 s part > 33 ms ≤ 20 % après 20 s ; 2560×1440 30 s → pxEff < 1' });
