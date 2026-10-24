/* G8 — contrôle du MÉDIATEUR nº 1 : la « correction de dérive » du test 3 est-elle légitime ?
 *
 * L'exécuteur a consigné une réserve : le critère « zone centrale ≤ +15 % » du test 3 ne passe
 * (+9,85 %) qu'avec la base extrapolée par une droite ajustée sur les images de référence ; le
 * script rapporte lui-même +15,66 % sans cette correction, au-dessus du plafond. Le médiateur doit
 * trancher : ou bien la scène s'éclaircit VRAIMENT toute seule et corriger est juste, ou bien la
 * correction est un artifice qui fabrique la marge.
 *
 * EXPÉRIENCE NULLE. Même laboratoire que le test 3 (bureau 1440×900, arène vide, phase ortho,
 * serpent épinglé au centre longueur 30, caméra figée, pas de temps imposé 1/60), même sonde 3×3,
 * même fenêtre d'images. On alterne des cycles SANS AUCUNE BLESSURE et des cycles AVEC blessure,
 * et on calcule pour les deux, exactement comme le test 3, la hausse de la cellule centrale :
 *   - « brut »  : base = moyenne des images de référence ;
 *   - « ajusté » : base = droite ajustée sur les images de référence, évaluée à l'image cible.
 * Un cycle NUL ne contient, par construction, aucun effet de blessure : tout ce qu'il mesure EST la
 * dérive. Si le brut d'un cycle nul est nettement positif, la dérive est réelle et la corriger est
 * la mesure juste ; s'il est nul, la correction fabrique la marge et le test 3 doit être relu.
 *
 * Sortie : out/G8-m1-derive.json.
 */
import { launchDesktop, startGame, finish, save, deadline } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, reqGrid, waitPx, canvasInfo, runBelow, fitBase, r2, r3, SEED } from './g8lib.mjs';

const CYCLES = +(process.env.S2030_M1_CYCLES || 8);   // alternés : nul, blessure, nul, blessure...
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

const ACT_HURT = `
  const s = S.snake, d = 8;
  s.invuln = 0;
  window.__lab.ebullet(s.x + d, s.y, 0, 0, { dmg: 1, r: 6 });
  return { kind: 'blessure', len: s.len };
`;
const ACT_NULL = `
  const s = S.snake;
  s.invuln = 0;
  return { kind: 'nul', len: s.len };
`;

async function cycle(page, hurt) {
  await clearProbeBufs(page);
  await readSpies(page, true);
  await waitFrames(page, 60);            // les effets du cycle précédent sont éteints
  await reqGrid(page, 26, 3);
  await waitFrames(page, 10);
  await clearProbeBufs(page);
  await arm(page, hurt ? ACT_HURT : ACT_NULL);
  const f = await waitFired(page);
  await waitFrames(page, 34);
  const p = await readProbe(page, true);
  const sp = await readSpies(page, true);
  const g = await waitPx(page, 'grid');
  const F = f.fi;

  const pre = g.filter(o => o.fi < F);
  const at = g.find(o => o.fi === F);
  if (pre.length < 4 || !at) return { kind: hurt ? 'blessure' : 'nul', fi: F, mesurable: false, pre: pre.length };

  const base = [], slope = [], resid = [], brut = [];
  for (let k = 0; k < 9; k++) {
    const fb = fitBase(pre.map(o => ({ d: o.fi - F, v: o.cells[k] })));
    base.push(fb.base); slope.push(fb.slope); resid.push(fb.resid);
    brut.push(mean(pre.map(o => o.cells[k])));
  }
  const rel = (k, b) => 100 * (at.cells[k] - b[k]) / Math.max(1e-6, b[k]);
  const colMean = (arr, c) => mean([arr[c], arr[c + 3], arr[c + 6]]);
  const colRel = (c, b) => 100 * (colMean(at.cells, c) - colMean(b, c)) / Math.max(1e-6, colMean(b, c));

  const sfx = sp.sfx.filter(o => o.fi >= F && o.fi <= F + 1).map(o => o.name);
  const flash = sp.flash.filter(o => o.fi >= F && o.fi <= F + 1);

  return {
    kind: hurt ? 'blessure' : 'nul', fi: F, mesurable: true,
    blessureReelle: sfx.indexOf('hurt') >= 0,
    appelsFlash: flash.map(o => ({ c: o.c, a: r3(o.a), mode: o.mode })),
    gel: runBelow(p.rec, F + 1, 0.006),
    imagesDeReference: pre.length,
    centreAjustePct: r2(rel(4, base)), centreBrutPct: r2(rel(4, brut)),
    bordImpactAjustePct: r2(colRel(2, base)), bordImpactBrutPct: r2(colRel(2, brut)),
    bordOpposeAjustePct: r2(colRel(0, base)), bordOpposeBrutPct: r2(colRel(0, brut)),
    derivePctParImage: r3(100 * slope[4] / Math.max(1e-6, base[4])),
    residuMaxPct: r2(Math.max(...resid)),
    centreBase: r3(base[4]), centreBaseBrute: r3(brut[4]), centreImpact: r3(at.cells[4]),
    serieCentre: g.map(o => ({ d: o.fi - F, c4: o.cells[4] })).filter(o => o.d >= -12 && o.d <= 4)
  };
}

(async () => {
  deadline(900, 'G8-m1-derive');
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  const r = { test: 'G8-m1-derive', seed: SEED, cycles: CYCLES };
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    await installArena(page, { clearAll: true, noFire: true, keepEB: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 6000 });
    await installSpies(page, { cap: 20000 });
    await page.evaluate(() => {
      const K = window.__K;
      try { window.__M.phases.forcePhase(0); } catch (e) {}
      window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30, invuln: 0, ghost: 0 };
    });
    await waitFrames(page, 60);
    await page.evaluate(() => { window.__G8pinCam = { x: window.__S.cam.x, y: window.__S.cam.y }; });
    await waitFrames(page, 20);
    r.canvas = await canvasInfo(page);

    const out = [];
    for (let i = 0; i < CYCLES; i++) out.push(await cycle(page, i % 2 === 1));
    r.cycles_detail = out;

    const nuls = out.filter(o => o.kind === 'nul' && o.mesurable);
    const bles = out.filter(o => o.kind === 'blessure' && o.mesurable);
    const st = a => a.length ? { n: a.length, min: r2(Math.min(...a)), max: r2(Math.max(...a)), moy: r2(mean(a)) } : null;

    r.experienceNulle = {
      centreBrutPct: st(nuls.map(o => o.centreBrutPct)),
      centreAjustePct: st(nuls.map(o => o.centreAjustePct)),
      bordImpactBrutPct: st(nuls.map(o => o.bordImpactBrutPct)),
      derivePctParImage: st(nuls.map(o => o.derivePctParImage))
    };
    r.blessures = {
      centreBrutPct: st(bles.map(o => o.centreBrutPct)),
      centreAjustePct: st(bles.map(o => o.centreAjustePct)),
      bordImpactBrutPct: st(bles.map(o => o.bordImpactBrutPct)),
      bordImpactAjustePct: st(bles.map(o => o.bordImpactAjustePct)),
      bordOpposeBrutPct: st(bles.map(o => o.bordOpposeBrutPct)),
      bordOpposeAjustePct: st(bles.map(o => o.bordOpposeAjustePct)),
      gel: bles.map(o => o.gel),
      reelles: bles.filter(o => o.blessureReelle).length + '/' + bles.length
    };
    /* Hausse NETTE : la blessure moins ce que la scène aurait fait sans elle. C'est la seule
       grandeur qui réponde à la question « la blessure éclaire-t-elle le centre ? ». */
    const derNul = nuls.length ? mean(nuls.map(o => o.centreBrutPct)) : null;
    r.centreNetPct = derNul == null ? null : st(bles.map(o => o.centreBrutPct - derNul));

    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);
    r.pass = nuls.length >= 2 && bles.length >= 2 && ctx.pageErrors.length === 0;
    r.measured = {
      cyclesNuls_centreBrut: r.experienceNulle.centreBrutPct,
      cyclesNuls_centreAjuste: r.experienceNulle.centreAjustePct,
      blessures_centreBrut: r.blessures.centreBrutPct,
      blessures_centreAjuste: r.blessures.centreAjustePct,
      blessures_centreNetDeLaDerive: r.centreNetPct,
      blessures_bordImpactBrut: r.blessures.bordImpactBrutPct
    };
    r.threshold = 'contrôle sans seuil : la dérive est-elle réelle ? (un cycle NUL ne contient aucune blessure)';
    save('G8-m1-derive.json', r);
    await ctx.close();
    finish('G8-m1-derive', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-m1-derive.json', r);
    await ctx.close();
    finish('G8-m1-derive', r);
  }
})();
