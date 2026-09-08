/* G8 — test 5 : la montée de niveau est mise en scène avant l'écran de cartes.
 *
 * Spécification : « Montée de niveau : entre l'image où S.lvlUps passe à 1 et la première image en
 * phase 'cards' ≥ 18 images dont ≥ 15 avec dt < 0,004 ; un appel fx.ring avec (x, y) = tête ± 2 u ;
 * pic de luminance globale ≥ +40 % ; S.snake.invuln > 0 pendant toute la séquence. »
 *
 * PROTOCOLE. Laboratoire bureau 1440×900, arène de laboratoire, phase ORTHO forcée, caméra figée,
 * serpent épinglé — mais SON INVULNÉRABILITÉ EST LAISSÉE LIBRE : elle est justement l'objet d'un des
 * critères, l'épingler la rendrait vraie par construction. La montée de niveau est provoquée par le
 * chemin du jeu : l'action armée (crochet sur weapons.update, dans l'image) ramène S.xpNext à 1 et
 * dépose un projectile joueur sur l'ennemi ; collide() tue, killEnemy() appelle addXp(), addXp()
 * incrémente S.lvlUps, et frame() appelle openCards() plus loin dans la MÊME image.
 *
 * OÙ SE LIT « S.lvlUps passe à 1 ». frame() appelle audio.setIntensity() juste AVANT le test
 * « if (S.lvlUps > 0) openCards() » : le crochet posé sur setIntensity voit donc S.lvlUps = 1 dans
 * l'image même où il est monté, avant qu'openCards ne le décrémente. C'est ce point d'observation qui
 * est utilisé, et non la fin d'image, où le compteur est déjà retombé.
 *
 * LUMINANCE. Grille de luminance relevée sur le canvas en fin d'image ; base extrapolée par ajustement
 * linéaire des images de référence (le décor s'éclaircit lentement et régulièrement), résidu rapporté.
 *
 * Sortie : out/G8-t5-niveau.json.
 */
import { launchDesktop, startGame, finish, save, deadline, sleep } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, reqGrid, savePngs, waitPx, canvasInfo, fitBase,
         r2, r3, SEED } from './g8lib.mjs';

const REPS = +(process.env.S2030_G8T5_REPS || 3);

const ACT_LEVEL = `
  const list = S.enemies.filter(x => x.id >= 900000 && !x.dead);
  if (!list.length) throw new Error('aucun ennemi de laboratoire');
  const e = list[0], s = S.snake;
  S.xp = 0; S.xpNext = 1;                       // le prochain point d'expérience fera monter d'un niveau
  G.pngNext = 2;
  window.__lab.bullet(e.x, e.y, 300, 0, { dmg: 9999, r: 5 });
  return { hx: s.x, hy: s.y, ex: e.x, ey: e.y, lvlUps: S.lvlUps, invuln: s.invuln, kills: S.kills };
`;

async function dismissCards(page) {
  for (let i = 0; i < 40; i++) {
    const ph = await page.evaluate(() => window.__S.phase);
    if (ph !== 'cards') return true;
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.s2card')).filter(el => el.offsetParent !== null);
      if (els.length) els[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: 'mouse' }));
    });
    await sleep(120);
  }
  return false;
}

async function one(page, wantGrid) {
  await page.evaluate(() => {
    const S = window.__S;
    window.__lab.clear();
    S.combo = 0; S.mult = 1; S.multT = 0; S.ult = 0; S.lvlUps = 0; S.xp = 0;
    window.__lab.spawn('chaser', 260, 0, null);
  });
  await waitFrames(page, 24);
  await clearProbeBufs(page);
  await readSpies(page, true);
  if (wantGrid) { await reqGrid(page, 60, 3); await waitFrames(page, 12); }
  await arm(page, ACT_LEVEL);
  const f = await waitFired(page);
  // on attend le passage en 'cards' (ou 90 images)
  let cardsAt = null;
  for (let i = 0; i < 90 && cardsAt == null; i++) {
    await waitFrames(page, 2);
    const st = await page.evaluate(() => ({ ph: window.__S.phase, fi: window.__G8.fi }));
    if (st.ph === 'cards') cardsAt = st.fi;
  }
  await waitFrames(page, 6);
  const p = await readProbe(page, true);
  const sp = await readSpies(page, true);
  const grid = wantGrid ? await waitPx(page, 'grid') : null;

  const F = f.fi;
  const infLv = p.inf.find(s => s.fi >= F && s.lv >= 1);
  const fiLv = infLv ? infLv.fi : null;
  const cardRec = p.rec.find(r => r.fi >= F && r.ph === 'cards');
  const fiCards = cardRec ? cardRec.fi : null;
  const span = (fiLv != null && fiCards != null) ? fiCards - fiLv : null;
  const inWin = p.rec.filter(r => fiLv != null && fiCards != null && r.fi >= fiLv && r.fi < fiCards);
  const slow = inWin.filter(r => r.dt < 0.004).length;
  const invMin = inWin.length ? Math.min(...inWin.map(r => r.inv)) : null;
  const head = f.info || {};
  const rings = sp.ring.filter(o => o.fi >= F && o.fi <= F + 40);
  const ringHead = rings.filter(o => Math.abs(o.x - head.hx) <= 2 && Math.abs(o.y - head.hy) <= 2);

  return { fi: F, fiLv, fiCards, span, slow, invMin,
    invulnSerie: inWin.slice(0, 40).map(r => r.inv),
    dtSerie: inWin.slice(0, 40).map(r => r3(r.dt)), tsSerie: inWin.slice(0, 24).map(r => r3(r.ts)),
    anneaux: rings.map(o => ({ d: o.fi - F, x: r2(o.x), y: r2(o.y), r: o.r, sp: o.sp, w: o.w, c: o.c })),
    anneauTete: ringHead.length, tete: { x: r2(head.hx), y: r2(head.hy) },
    sfx: sp.sfx.filter(o => o.fi >= F && o.fi <= F + 60).map(o => ({ d: o.fi - F, name: o.name })),
    grid, err: p.err };
}

(async () => {
  deadline(600, 'G8-t5-niveau');
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });   // pas de temps imposé dès le chargement
  const r = { test: 'G8-t5-niveau', seed: SEED, reps: REPS };
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    await installArena(page, { onlyLab: true, noFire: true, keepEB: true, keepXp: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 6000 });
    await installSpies(page, { cap: 20000 });
    await page.evaluate(() => {
      const K = window.__K;
      try { window.__M.phases.forcePhase(0); } catch (e) {}
      window.__G8freeze = true;
      // l'invulnérabilité N'EST PAS épinglée : c'est un des critères
      window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30 };
    });
    await waitFrames(page, 60);
    await page.evaluate(() => { window.__G8pinCam = { x: window.__S.cam.x, y: window.__S.cam.y }; });
    await waitFrames(page, 20);
    r.canvas = await canvasInfo(page);

    const runs = [];
    for (let i = 0; i < REPS; i++) {
      runs.push(await one(page, i === 0));
      await dismissCards(page);
      await waitFrames(page, 30);
    }
    r.captures = await savePngs(page, 'G8-t5-niveau');

    /* --- luminance globale sur la première séquence --- */
    const g0 = runs[0].grid || [];
    const F0 = runs[0].fi;
    const pre = g0.filter(o => o.fi < F0);
    let lum = null;
    if (pre.length >= 4) {
      const fit = fitBase(pre.map(o => ({ d: o.fi - F0, v: o.mean })));
      const after = g0.filter(o => o.fi >= F0 && o.fi <= F0 + 40);
      const peakO = after.length ? after.reduce((a, b) => (b.mean > a.mean ? b : a)) : null;
      const rise = peakO ? 100 * (peakO.mean - fit.base) / Math.max(1e-6, fit.base) : null;
      lum = { imagesDeReference: pre.length, base: r3(fit.base), deriveParImagePct: r3(100 * fit.slope / fit.base),
        bruitDeFondPct: r2(fit.resid), pic: peakO ? r3(peakO.mean) : null, picAImage: peakO ? peakO.fi - F0 : null,
        haussePct: r2(rise), seuil: 40,
        serie: g0.map(o => ({ d: o.fi - F0, mean: o.mean })), pass: rise != null && rise >= 40 };
    }

    const spans = runs.map(o => o.span);
    const slows = runs.map(o => o.slow);
    const invs = runs.map(o => o.invMin);
    const ringHead = runs.map(o => o.anneauTete);
    r.sequences = runs.map(o => ({ fiLv: o.fiLv, fiCards: o.fiCards, images: o.span, imagesLentes: o.slow,
      invulnMin: o.invMin, anneauTete: o.anneauTete, tete: o.tete, anneaux: o.anneaux.slice(0, 6),
      sfx: o.sfx, tsSerie: o.tsSerie }));
    r.luminance = lum;
    r.duree = { images: spans, seuil: 18, ok: spans.every(v => v != null && v >= 18) };
    r.ralenti = { imagesSous0004: slows, seuil: 15, ok: slows.every(v => v >= 15) };
    r.invulnerabilite = { minParSequence: invs, ok: invs.every(v => v != null && v > 0) };
    r.anneauDepuisLaTete = { parSequence: ringHead, ok: ringHead.every(v => v >= 1) };
    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);

    r.pass = !!(r.duree.ok && r.ralenti.ok && r.invulnerabilite.ok && r.anneauDepuisLaTete.ok
      && lum && lum.pass && ctx.pageErrors.length === 0);
    r.measured = {
      imagesAvantCartes: spans, imagesSous0004: slows,
      anneauALaTete: ringHead, invulnMin: invs,
      picDeLuminancePct: lum ? lum.haussePct : null, bruitDeFondPct: lum ? lum.bruitDeFondPct : null
    };
    r.threshold = '≥ 18 images entre S.lvlUps = 1 et la phase cards, dont ≥ 15 à dt < 0,004 ; un fx.ring à la tête ± 2 u ; pic de luminance globale ≥ +40 % ; S.snake.invuln > 0 sur toute la séquence';
    save('G8-t5-niveau.json', r);
    await ctx.close();
    finish('G8-t5-niveau', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t5-niveau.json', r);
    await ctx.close();
    finish('G8-t5-niveau', r);
  }
})();
