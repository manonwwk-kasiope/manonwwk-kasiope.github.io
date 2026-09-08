/* G8 — test 3 : la blessure se lit du côté du coup, pas en pleine figure.
 *
 * Spécification : « Blessure, sonde de luminance 3×3 : à l'impact, zone centrale ≤ +15 %, bord côté
 * impact ≥ +60 %, bord opposé ≤ +25 % ; 4 images avec dt < 0,006 ; S.timeScale ≤ 0,45 sur ≥ 10
 * images ; phases.tilt() ≥ 0,05 dans les 2 images suivant chaque hurtSnake (11/11, contre 1/11). »
 *
 * PROTOCOLE. Laboratoire bureau 1440×900, arène vide, phase ORTHO forcée (ni roulis, ni bascule, ni
 * perspective : la transformation CSS du canvas est l'identité, donc pixel de canvas = pixel d'écran,
 * et l'angle du monde est l'angle de l'écran). Serpent épinglé au centre, caméra figée, longueur
 * maintenue à 30 anneaux, invulnérabilité remise à zéro à chaque image pour pouvoir enchaîner.
 * La blessure est provoquée DANS l'image, depuis le crochet sur weapons.update : un projectile ennemi
 * de dégât 1 est déposé sur la tête, et c'est collide() → hurtSnake() qui blesse — jamais un appel
 * direct depuis Node. Le dégât 1 est délibéré : au-delà de 2, collide() appelle déjà phases.jolt(1,2)
 * de son côté et le test ne dirait plus rien de hurtSnake.
 *
 * PIXELS. La grille 3×3 est relevée sur le canvas du jeu EN FIN D'IMAGE (le canvas contient alors
 * l'image que frame() vient de rendre). Référence : moyenne des cinq images qui précèdent l'impact ;
 * le bruit de fond de ces cinq images est mesuré et rapporté — la mesure n'est concluante que s'il
 * reste très en dessous des seuils.
 *
 * RENFORCEMENT DU MÉDIATEUR (G8, tentative 2). L'exécuteur avait consigné une réserve : le critère
 * « zone centrale ≤ +15 % » ne passait qu'avec la base EXTRAPOLÉE, le script rapportant lui-même
 * +15,66 % avec la base brute. Mesuré depuis (voir m1-derive-blessure.mjs) : la dérive du décor est
 * un TRANSITOIRE DE DÉMARRAGE — 0,78 % par image une centaine d'images après le départ, 0,00 % une
 * fois la scène posée. La mesure se prenait donc dans le transitoire, et l'extrapolation en tenait
 * lieu de correction. Deux changements, tous deux dans le sens de la sévérité : la scène est
 * LAISSÉE SE POSER avant la blessure mesurée au pixel, et la phase ORTHO est REFORCÉE avant chaque
 * blessure (sans quoi la mise en scène dérive et la cellule centrale montre autre chose) ; le
 * verdict exige désormais que les trois seuils tiennent SUR LES DEUX BASES, brute et ajustée.
 *
 * Sortie : out/G8-t3-blessure.json.
 */
import { launchDesktop, startGame, finish, save, deadline } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, reqGrid, savePngs, waitPx, canvasInfo, runBelow, fitBase,
         r2, r3, SEED } from './g8lib.mjs';

const N_HURTS = 11;

function hurtAction(ang, png) {
  return `
    const s = S.snake, a = ${ang}, d = 8;
    s.invuln = 0;
    ${png ? 'G.pngNext = 2;' : ''}
    window.__lab.ebullet(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 0, 0, { dmg: 1, r: 6 });
    return { hx: s.x + Math.cos(a) * d, hy: s.y + Math.sin(a) * d, ang: a, len: s.len, ts: S.timeScale, tilt: M.phases.tilt() };
  `;
}

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

async function oneHurt(page, ang, wantGrid) {
  /* la mise en scène est ramenée à l'ortho AVANT chaque blessure : une cellule qui bouge n'est pas
     une cellule qui s'éclaire, et c'est l'éclairement que le critère vise. Le retour à l'ortho est
     lui-même une transition : on lui laisse 70 images pour s'éteindre, sans quoi le décor bouge
     pendant les images de référence et le bruit de fond monte à 8 % (mesuré). */
  await page.evaluate(() => { try { window.__M.phases.forcePhase(0); } catch (e) {} });
  await clearProbeBufs(page);
  await readSpies(page, true);
  await waitFrames(page, 70);
  if (wantGrid) { await reqGrid(page, 26, 3); await waitFrames(page, 10); }
  await clearProbeBufs(page);
  await arm(page, hurtAction(ang, wantGrid));
  const f = await waitFired(page);
  await waitFrames(page, 34);
  const p = await readProbe(page, true);
  const sp = await readSpies(page, true);
  const grid = wantGrid ? await waitPx(page, 'grid') : null;
  const F = f.fi;

  const gel = runBelow(p.rec, F + 1, 0.006);
  const tsFrames = p.rec.filter(r => r.fi >= F && r.fi <= F + 45 && r.ts <= 0.45).length;
  const tsSerie = p.rec.filter(r => r.fi >= F - 1 && r.fi <= F + 20).map(r => ({ d: r.fi - F, ts: r3(r.ts), dt: r3(r.dt) }));
  const tiltAfter = [1, 2].map(k => {
    const s = p.inf.find(o => o.fi === F + k);
    return s ? r3(s.tilt) : null;
  });
  const tiltOk = tiltAfter.every(v => v != null && v >= 0.05);
  const sfx = sp.sfx.filter(o => o.fi >= F && o.fi <= F + 1).map(o => o.name);
  const flash = sp.flash.filter(o => o.fi >= F && o.fi <= F + 1);
  const happened = sfx.indexOf('hurt') >= 0 || p.rec.some(r => r.fi >= F && r.fi <= F + 1 && r.len < 30);

  return { ang: r3(ang), fi: F, happened, gel, tsFrames, tsSerie, tiltAfter, tiltOk, sfx, flash, grid, err: p.err };
}

(async () => {
  deadline(600, 'G8-t3-blessure');
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });   // pas de temps imposé dès le chargement
  const r = { test: 'G8-t3-blessure', seed: SEED };
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
    await waitFrames(page, 180);          // la scène se pose : plus de transitoire de démarrage
    await page.evaluate(() => { window.__G8pinCam = { x: window.__S.cam.x, y: window.__S.cam.y }; });
    await waitFrames(page, 40);
    r.canvas = await canvasInfo(page);

    /* --- volet PIXELS : une blessure venant de la droite (angle 0) --- */
    const px = await oneHurt(page, 0, true);
    r.captures = await savePngs(page, 'G8-t3-impact');
    const g = px.grid || [];
    const pre = g.filter(o => o.fi < px.fi);
    const at = g.find(o => o.fi === px.fi);
    let lum = null;
    if (pre.length >= 4 && at) {
      /* Base extrapolée : le décor s'éclaircit lentement et régulièrement pendant la partie (mesuré
         ici : voir « deriveParImage »). Prendre la moyenne des images de référence prêterait cette
         dérive à la blessure. On ajuste donc une droite sur les images de référence et on l'évalue à
         l'image de l'impact ; l'écart résiduel à cette droite est le vrai bruit de fond. */
      const base = [], slope = [], resid = [];
      for (let k = 0; k < 9; k++) {
        const f = fitBase(pre.map(o => ({ d: o.fi - px.fi, v: o.cells[k] })));
        base.push(f.base); slope.push(f.slope); resid.push(f.resid);
      }
      const baseBrut = [];
      for (let k = 0; k < 9; k++) baseBrut.push(mean(pre.map(o => o.cells[k])));
      const rel = (k, b) => 100 * (at.cells[k] - b[k]) / Math.max(1e-6, b[k]);
      const colMean = (arr, c) => mean([arr[c], arr[c + 3], arr[c + 6]]);
      const colRel = (c, b) => 100 * (colMean(at.cells, c) - colMean(b, c)) / Math.max(1e-6, colMean(b, c));
      const noise = Math.max(...resid);
      lum = {
        imagesDeReference: pre.length,
        cellulesBase: base.map(r3), cellulesBaseBrute: baseBrut.map(r3), cellulesImpact: at.cells,
        deriveParImagePct: base.map((b, k) => r3(100 * slope[k] / Math.max(1e-6, b))),
        centrePct: r2(rel(4, base)), bordImpactPct: r2(colRel(2, base)), bordOpposePct: r2(colRel(0, base)),
        celluleDroitePct: r2(rel(5, base)), celluleGauchePct: r2(rel(3, base)),
        sansCorrectionDeDerive: { centre: r2(rel(4, baseBrut)), bordImpact: r2(colRel(2, baseBrut)), bordOppose: r2(colRel(0, baseBrut)) },
        bruitDeFondPct: r2(noise),
        seuils: { centre: '≤ +15 %', bordImpact: '≥ +60 %', bordOppose: '≤ +25 %' },
        serie: g.map(o => ({ d: o.fi - px.fi, mean: o.mean })),
        /* LES DEUX BASES doivent tenir : l'ajustée (protocole d'origine) et la BRUTE (moyenne des
           images de référence, sans aucune correction). Sur une scène posée elles coïncident ; si
           elles divergent, c'est que la mesure a été prise dans un transitoire et le verdict le
           dit au lieu de s'appuyer sur la seule extrapolation. */
        passAjustee: rel(4, base) <= 15 && colRel(2, base) >= 60 && colRel(0, base) <= 25,
        passBrute: rel(4, baseBrut) <= 15 && colRel(2, baseBrut) >= 60 && colRel(0, baseBrut) <= 25,
        pass: rel(4, base) <= 15 && colRel(2, base) >= 60 && colRel(0, base) <= 25
              && rel(4, baseBrut) <= 15 && colRel(2, baseBrut) >= 60 && colRel(0, baseBrut) <= 25
      };
    }

    /* --- volet TEMPS et BASCULE : onze blessures --- */
    const hurts = [px];
    for (let i = 1; i < N_HURTS; i++) hurts.push(await oneHurt(page, i * 2 * Math.PI / N_HURTS, false));

    const gels = hurts.map(h => h.gel);
    const tss = hurts.map(h => h.tsFrames);
    const tilts = hurts.filter(h => h.tiltOk).length;
    const done = hurts.filter(h => h.happened).length;

    r.canvasTransformIdentite = !r.canvas || r.canvas.transform === 'none' || r.canvas.transform === 'matrix(1, 0, 0, 1, 0, 0)';
    r.luminance = lum;
    r.blessures = hurts.map(h => ({ ang: h.ang, fi: h.fi, happened: h.happened, gel: h.gel, tsFrames: h.tsFrames, tilt: h.tiltAfter }));
    r.gelImages = { valeurs: gels, cible: 4, ok: gels.every(v => v === 4) };
    r.timeScale = { imagesSous045: tss, seuil: 10, ok: tss.every(v => v >= 10) };
    r.bascule = { ok: tilts, sur: N_HURTS, seuil: N_HURTS };
    r.blessuresReelles = done + '/' + N_HURTS;
    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);

    const pass = !!(lum && lum.pass) && r.gelImages.ok && r.timeScale.ok && tilts === N_HURTS
      && done === N_HURTS && ctx.pageErrors.length === 0 && r.canvasTransformIdentite;
    r.pass = pass;
    r.measured = {
      luminance3x3: lum ? { centre: lum.centrePct + ' %', bordImpact: lum.bordImpactPct + ' %', bordOppose: lum.bordOpposePct + ' %', bruitDeFond: lum.bruitDeFondPct + ' %' } : 'non mesurable',
      luminance3x3BaseBrute: lum ? lum.sansCorrectionDeDerive : 'non mesurable',
      lesDeuxBasesTiennent: lum ? { ajustee: lum.passAjustee, brute: lum.passBrute } : null,
      gel: gels, timeScaleSous045: tss, basculeApresBlessure: tilts + '/' + N_HURTS, blessuresReelles: r.blessuresReelles
    };
    r.threshold = 'centre ≤ +15 %, bord côté impact ≥ +60 %, bord opposé ≤ +25 % — SUR LES DEUX BASES, brute et ajustée ; 4 images à dt < 0,006 ; S.timeScale ≤ 0,45 sur ≥ 10 images ; phases.tilt() ≥ 0,05 sur les 2 images suivantes, 11/11';
    save('G8-t3-blessure.json', r);
    await ctx.close();
    finish('G8-t3-blessure', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t3-blessure.json', r);
    await ctx.close();
    finish('G8-t3-blessure', r);
  }
})();
