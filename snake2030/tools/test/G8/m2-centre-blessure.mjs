/* G8 — contrôle du MÉDIATEUR nº 2 : la blessure éclaire-t-elle la ZONE CENTRALE au-delà du plafond ?
 *
 * Le test 3 exige « à l'impact, zone centrale ≤ +15 % ». Il ne mesure qu'UNE blessure, prise une
 * centaine d'images après le départ, là où le décor dérive encore (mesuré : +0,78 % par image) ;
 * il extrapole donc sa base par une droite. Le contrôle nº 1 (m1) a montré que cette dérive est
 * NULLE une fois la scène posée (cycles sans blessure : 0,00 ± 0,01 %) et que, sur cette scène
 * posée, deux blessures sur quatre dépassaient le plafond (+18,35 % et +20,11 %).
 *
 * Ce script répète la mesure et l'ATTRIBUE. Même laboratoire (bureau 1440×900, arène vide, phase
 * ortho, serpent épinglé au centre longueur 30, caméra figée, pas de temps imposé 1/60), scène
 * laissée se poser avant la première mesure, blessure provoquée DANS l'image depuis le crochet sur
 * weapons.update (projectile ennemi de dégât 1 sur la tête, collide → hurtSnake). Quatre régimes,
 * entrelacés pour qu'aucun ne profite d'un moment particulier :
 *   tout       — la blessure telle que le jeu la joue ;
 *   sansGerbe  — fx.burst neutralisée pendant l'image de la blessure (l'écart nº4 de l'implémenteur) ;
 *   sansJolt   — phases.jolt neutralisée (le plateau ne pique pas) ;
 *   sansFlash  — fx.flash neutralisée (pas de vignette).
 * Base = moyenne des images de référence, SANS correction de dérive : sur une scène posée elle n'a
 * pas lieu d'être, et le contrôle nº 1 le montre (l'écart brut/ajusté y est de 0,01 point).
 *
 * Sortie : out/G8-m2-centre.json.
 */
import { launchDesktop, startGame, finish, save, deadline } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, reqGrid, waitPx, canvasInfo, runBelow, r2, r3, SEED } from './g8lib.mjs';

const REPS = +(process.env.S2030_M2_REPS || 5);
const REGIMES = ['tout', 'sansGerbe', 'sansJolt', 'sansFlash'];
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

function act(regime) {
  return `
    const s = S.snake, d = 8;
    s.invuln = 0;
    window.__G8mute = ${JSON.stringify(regime)};
    window.__lab.ebullet(s.x + d, s.y, 0, 0, { dmg: 1, r: 6 });
    return { regime: ${JSON.stringify(regime)}, len: s.len };
  `;
}

async function cycle(page, regime) {
  await clearProbeBufs(page);
  await readSpies(page, true);
  await waitFrames(page, 70);                       // les effets du cycle précédent sont éteints
  await reqGrid(page, 26, 3);
  await waitFrames(page, 10);
  await clearProbeBufs(page);
  await arm(page, act(regime));
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
  const rel = (k) => 100 * (at.cells[k] - brut[k]) / Math.max(1e-6, brut[k]);
  const colM = (arr, c) => mean([arr[c], arr[c + 3], arr[c + 6]]);
  const colRel = (c) => 100 * (colM(at.cells, c) - colM(brut, c)) / Math.max(1e-6, colM(brut, c));
  let resid = 0;
  for (let k = 0; k < 9; k++) for (const o of pre) { const e = Math.abs(100 * (o.cells[k] - brut[k]) / Math.max(1e-6, brut[k])); if (e > resid) resid = e; }

  const sfx = sp.sfx.filter(o => o.fi >= F && o.fi <= F + 1).map(o => o.name);
  const mute = await page.evaluate(() => { const m = window.__G8muteN; window.__G8muteN = { burst: 0, jolt: 0, flash: 0 }; return m; });
  return { regime, fi: F, mesurable: true,
    blessureReelle: sfx.indexOf('hurt') >= 0,
    neutralisations: mute,
    gel: runBelow(p.rec, F + 1, 0.006),
    centrePct: r2(rel(4)), bordImpactPct: r2(colRel(2)), bordOpposePct: r2(colRel(0)),
    bruitDeFondPct: r2(resid),
    centreBase: r3(brut[4]), centreImpact: r3(at.cells[4]),
    serieCentre: g.filter(o => o.fi >= F - 3 && o.fi <= F + 3).map(o => ({ d: o.fi - F, c4: o.cells[4] })) };
}

(async () => {
  deadline(1200, 'G8-m2-centre');
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  const r = { test: 'G8-m2-centre', seed: SEED, reps: REPS };
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    await installArena(page, { clearAll: true, noFire: true, keepEB: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 6000 });
    await installSpies(page, { cap: 20000 });
    /* Neutralisations posées UNE fois, activées par window.__G8mute pendant l'image visée puis
       relâchées : on ne change rien au build, on coupe une source à l'exécution. */
    await page.evaluate(() => {
      const M = window.__M;
      window.__G8mute = 'tout';
      window.__G8muteN = { burst: 0, jolt: 0, flash: 0 };
      const oB = M.fx.burst, oF = M.fx.flash, oJ = M.phases.jolt;
      M.fx.burst = function () { if (window.__G8mute === 'sansGerbe') { window.__G8muteN.burst++; return; } return oB.apply(this, arguments); };
      M.fx.flash = function () { if (window.__G8mute === 'sansFlash') { window.__G8muteN.flash++; return; } return oF.apply(this, arguments); };
      M.phases.jolt = function () { if (window.__G8mute === 'sansJolt') { window.__G8muteN.jolt++; return; } return oJ.apply(this, arguments); };
    });
    await page.evaluate(() => {
      const K = window.__K;
      try { window.__M.phases.forcePhase(0); } catch (e) {}
      window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30, invuln: 0, ghost: 0 };
    });
    await waitFrames(page, 180);                    // la scène se pose : plus aucune dérive (voir m1)
    await page.evaluate(() => { window.__G8pinCam = { x: window.__S.cam.x, y: window.__S.cam.y }; });
    await waitFrames(page, 40);
    r.canvas = await canvasInfo(page);

    const out = [];
    for (let i = 0; i < REPS; i++) for (const g of REGIMES) {
      out.push(await cycle(page, g));
      await page.evaluate(() => { window.__G8mute = 'tout'; });
    }
    r.cycles = out;

    const st = a => a.length ? { n: a.length, min: r2(Math.min(...a)), med: r2(a.slice().sort((x, y) => x - y)[a.length >> 1]), max: r2(Math.max(...a)), moy: r2(mean(a)) } : null;
    r.parRegime = {};
    for (const g of REGIMES) {
      const c = out.filter(o => o.regime === g && o.mesurable);
      r.parRegime[g] = {
        centrePct: st(c.map(o => o.centrePct)),
        auDessusDe15: c.filter(o => o.centrePct > 15).length + '/' + c.length,
        bordImpactPct: st(c.map(o => o.bordImpactPct)),
        bordOpposePct: st(c.map(o => o.bordOpposePct)),
        auDessusDe25BordOppose: c.filter(o => o.bordOpposePct > 25).length + '/' + c.length,
        bruitDeFondPct: st(c.map(o => o.bruitDeFondPct)),
        gel: c.map(o => o.gel), reelles: c.filter(o => o.blessureReelle).length + '/' + c.length
      };
    }
    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);
    r.pass = out.every(o => o.mesurable) && ctx.pageErrors.length === 0;
    r.measured = r.parRegime;
    r.threshold = 'contrôle sans seuil propre : attribue la hausse de la zone centrale (plafond de la spec : +15 %)';
    save('G8-m2-centre.json', r);
    await ctx.close();
    finish('G8-m2-centre', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-m2-centre.json', r);
    await ctx.close();
    finish('G8-m2-centre', r);
  }
})();
