/* G8 — contrôle du MÉDIATEUR nº 3 : QU'EST-CE QUI fait monter la zone centrale à l'impact ?
 *
 * Le test 3 exige « zone centrale ≤ +15 % » et le « quoi » de la même spec exige « ph.jolt(0,6, ang)
 * pour toute blessure ». Les contrôles nº 1 et nº 2 ont montré que le plafond est franchi environ
 * une fois sur deux sur une scène posée, et que neutraliser le jolt suffit à le faire tenir. Reste à
 * savoir si la hausse mesurée est de la LUMIÈRE (le retour éclaire le centre, ce que le critère veut
 * interdire) ou de la GÉOMÉTRIE (le plateau pique, la cellule centrale montre autre chose).
 *
 * ISOLEMENT. Chaque effet est déclenché SEUL, sans blessure : jolt seul, gerbe seule, vignette seule
 * — puis la blessure complète et une image témoin. Une secousse du plateau ne pose aucune lumière ;
 * si le jolt SEUL fait monter la cellule centrale autant que la blessure entière, alors le critère
 * mesure le mouvement du décor et non l'éclairement, et les deux clauses de la spec se contredisent.
 *
 * Laboratoire identique aux contrôles précédents ; la phase ORTHO est REFORCÉE à chaque cycle et
 * l'inclinaison du plateau relevée à chaque image, pour qu'aucune dérive de mise en scène ne se
 * glisse dans la mesure. Base = moyenne des images de référence (aucune dérive : contrôle nº 1).
 *
 * Sortie : out/G8-m3-attribution.json.
 */
import { launchDesktop, startGame, finish, save, deadline } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, reqGrid, waitPx, canvasInfo, runBelow, r2, r3, SEED } from './g8lib.mjs';

const REPS = +(process.env.S2030_M3_REPS || 6);
const REGIMES = ['temoin', 'joltSeul', 'gerbeSeule', 'vignetteSeule', 'blessure'];
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

const ACTS = {
  temoin:        `S.snake.invuln = 0; return { r: 'temoin' };`,
  joltSeul:      `S.snake.invuln = 0; M.phases.jolt(0.6, 0); return { r: 'joltSeul' };`,
  gerbeSeule:    `const s = S.snake; s.invuln = 0;
                  M.fx.burst(s.x + 8, s.y, '#ff2e63', 12, 210, { glow: true, ang: 0, spread: 1.1, life: 0.28, size: 1.8 });
                  return { r: 'gerbeSeule' };`,
  vignetteSeule: `S.snake.invuln = 0; M.fx.flash('#ff2b52', 0.7, 'edge', 0); return { r: 'vignetteSeule' };`,
  blessure:      `const s = S.snake; s.invuln = 0;
                  window.__lab.ebullet(s.x + 8, s.y, 0, 0, { dmg: 1, r: 6 });
                  return { r: 'blessure' };`
};

async function cycle(page, regime) {
  await page.evaluate(() => { try { window.__M.phases.forcePhase(0); } catch (e) {} });
  await clearProbeBufs(page);
  await readSpies(page, true);
  await waitFrames(page, 80);
  await reqGrid(page, 26, 3);
  await waitFrames(page, 10);
  await clearProbeBufs(page);
  await arm(page, ACTS[regime]);
  const f = await waitFired(page);
  await waitFrames(page, 34);
  const p = await readProbe(page, true);
  const sp = await readSpies(page, true);
  const g = await waitPx(page, 'grid');
  const F = f.fi;
  const pre = g.filter(o => o.fi < F), at = g.find(o => o.fi === F);
  if (pre.length < 4 || !at) return { regime, fi: F, mesurable: false };

  const brut = [];
  for (let k = 0; k < 9; k++) brut.push(mean(pre.map(o => o.cells[k])));
  const rel = k => 100 * (at.cells[k] - brut[k]) / Math.max(1e-6, brut[k]);
  const colM = (a, c) => mean([a[c], a[c + 3], a[c + 6]]);
  const colRel = c => 100 * (colM(at.cells, c) - colM(brut, c)) / Math.max(1e-6, colM(brut, c));
  let noise = 0;
  for (let k = 0; k < 9; k++) for (const o of pre) { const e = Math.abs(100 * (o.cells[k] - brut[k]) / Math.max(1e-6, brut[k])); if (e > noise) noise = e; }

  const sfx = sp.sfx.filter(o => o.fi >= F && o.fi <= F + 1).map(o => o.name);
  /* inclinaison du plateau AVANT et À l'image mesurée : une cellule qui bouge n'est pas une cellule
     qui s'éclaire, et c'est exactement ce qu'on cherche à départager. */
  const tiltAv = p.inf.filter(o => o.fi >= F - 3 && o.fi < F).map(o => r3(o.tilt));
  const tiltA = p.inf.filter(o => o.fi >= F && o.fi <= F + 2).map(o => r3(o.tilt));
  return { regime, fi: F, mesurable: true, blessureReelle: sfx.indexOf('hurt') >= 0,
    gel: runBelow(p.rec, F + 1, 0.006),
    centrePct: r2(rel(4)), bordImpactPct: r2(colRel(2)), bordOpposePct: r2(colRel(0)),
    bruitDeFondPct: r2(noise), tiltAvant: tiltAv, tiltApres: tiltA,
    centreBase: r3(brut[4]), centreImpact: r3(at.cells[4]) };
}

(async () => {
  deadline(1500, 'G8-m3-attribution');
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  const r = { test: 'G8-m3-attribution', seed: SEED, reps: REPS };
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
    await waitFrames(page, 180);
    await page.evaluate(() => { window.__G8pinCam = { x: window.__S.cam.x, y: window.__S.cam.y }; });
    await waitFrames(page, 40);
    r.canvas = await canvasInfo(page);

    const out = [];
    for (let i = 0; i < REPS; i++) for (const g of REGIMES) out.push(await cycle(page, g));
    r.cycles = out;
    r.canvasFin = await canvasInfo(page);

    const st = a => a.length ? { n: a.length, min: r2(Math.min(...a)), med: r2(a.slice().sort((x, y) => x - y)[a.length >> 1]), max: r2(Math.max(...a)), moy: r2(mean(a)) } : null;
    r.parRegime = {};
    for (const g of REGIMES) {
      const c = out.filter(o => o.regime === g && o.mesurable);
      r.parRegime[g] = { centrePct: st(c.map(o => o.centrePct)), auDessusDe15: c.filter(o => o.centrePct > 15).length + '/' + c.length,
        bordImpactPct: st(c.map(o => o.bordImpactPct)), bordOpposePct: st(c.map(o => o.bordOpposePct)),
        bruitDeFondPct: st(c.map(o => o.bruitDeFondPct)),
        valeurs: c.map(o => o.centrePct) };
    }
    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);
    r.pass = out.every(o => o.mesurable) && ctx.pageErrors.length === 0;
    r.measured = r.parRegime;
    r.threshold = 'contrôle sans seuil propre : isole ce qui fait monter la zone centrale (plafond de la spec : +15 %)';
    save('G8-m3-attribution.json', r);
    await ctx.close();
    finish('G8-m3-attribution', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-m3-attribution.json', r);
    await ctx.close();
    finish('G8-m3-attribution', r);
  }
})();
