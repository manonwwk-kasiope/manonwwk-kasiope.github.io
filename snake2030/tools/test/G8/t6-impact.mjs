/* G8 — test 6 : l'impact non létal se voit, et fx.hit cesse d'être du code mort.
 *
 * Spécification : « probe-feel.mjs section E (ennemi immobilisé, projectile manuel) : luminance de la
 * boîte de l'ennemi ≥ +25 points l'image suivant l'impact (2,5) ; appels fx.hit === impacts de
 * projectiles sur 20 s de bot. »
 *
 * VOLET A — laboratoire. Ennemi immobilisé (vitesse forcée à zéro à chaque image), points de vie
 * portés très haut pour que le coup ne soit pas mortel, projectile joueur déposé sur lui DANS l'image
 * depuis le crochet sur weapons.update ; c'est collide() → damageEnemy() qui encaisse. La luminance
 * moyenne de la boîte de l'ennemi (2 r × 2 r projetés à l'écran) est relevée sur le canvas en fin
 * d'image ; la base est extrapolée des images de référence par ajustement linéaire (le décor
 * s'éclaircit lentement), et le résidu est rapporté comme bruit de fond.
 *
 * VOLET B — 20 s de bot. Le nombre d'IMPACTS DE PROJECTILES est compté indépendamment de fx.hit, en
 * rejouant la règle de collision du jeu un cran plus tôt dans l'image : un crochet permanent posé
 * après weapons.update (donc après le tir de l'image) et avant collide() applique aux projectiles
 * exactement ce que collide() va leur appliquer — avance de v × dt, rejet des projectiles épuisés ou
 * sortis de l'arène, puis premier ennemi vivant à portée (dist ≤ b.r + 26 ET dist ≤ b.r + e.r, un
 * seul ennemi par projectile et par image, comme le « break » du jeu). Rien dans frame() ne déplace
 * projectiles ou ennemis entre ce crochet et collide() : la prédiction est exacte, et elle ne doit
 * rien à fx.hit. Les montées de niveau sont neutralisées (aucune carte prise : arsenal de base, pas
 * d'aura ni de ronces), l'ultime et le pouvoir sont coupés : la seule source de dégâts positionnés
 * du joueur est le projectile.
 *
 * Sortie : out/G8-t6-impact.json.
 */
import { launchDesktop, startGame, finish, save, deadline, installProbe, installAutoPilot,
         installGod, playDet } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, reqRect, savePngs, waitPx, toScreenCss, canvasInfo,
         fitBase, r2, r3, SEED } from './g8lib.mjs';

/* La spécification demande 20 s de bot ; on en joue 40 par défaut pour que l'égalité porte sur un
   échantillon moins maigre (mesuré : environ 9 impacts en 20 s, la partie commence calme). */
const BOT_SECS = +(process.env.S2030_G8T6_SECS || 40);
const REPS = 3;

const ACT_HIT = `
  const list = S.enemies.filter(x => x.id >= 900000 && !x.dead);
  if (!list.length) throw new Error('aucun ennemi de laboratoire');
  const e = list[0];
  e.hp = 9999; e.maxHp = 9999;                 // le coup ne doit pas tuer : c'est un impact, pas un kill
  G.pngNext = 2;
  window.__lab.bullet(e.x, e.y, 300, 0, { dmg: 1, r: 5 });
  return { ex: e.x, ey: e.y, er: e.r, hitT: e.hitT, kills: S.kills };
`;

/* Prédicteur d'impacts : réplique de la règle de collision du jeu, posée avant collide(). */
const PREDICTOR = `
  const dt = S.dt, I = G.imp;
  I.frames++;
  let n = 0;
  for (let i = 0; i < S.bullets.length; i++) {
    const b = S.bullets[i];
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt, nl = b.life - dt;
    if (nl <= 0 || nx < -60 || ny < -60 || nx > K.ARENA_W + 60 || ny > K.ARENA_H + 60) { I.rejetes++; continue; }
    let hit = false;
    for (let j = 0; j < S.enemies.length; j++) {
      const e = S.enemies[j];
      if (e.dead) continue;
      const dx = nx - e.x, dy = ny - e.y, d2 = dx * dx + dy * dy;
      const rc = b.r + 26; if (d2 > rc * rc) continue;
      const rr = b.r + e.r; if (d2 <= rr * rr) { hit = true; break; }
    }
    if (hit) n++;
  }
  if (n) { I.n += n; if (I.byFrame.length < 4000) I.byFrame.push({ fi: G.fi + 1, n }); }
`;

/* ------------------------------------------------------------------ A ----- */
async function sectionA(out) {
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });   // pas de temps imposé dès le chargement
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    await installArena(page, { onlyLab: true, noFire: true, keepEB: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 6000 });
    await installSpies(page, { cap: 20000 });
    await page.evaluate(() => {
      const K = window.__K;
      try { window.__M.phases.forcePhase(0); } catch (e) {}
      window.__G8freeze = true;
      window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30, invuln: 1e9, ghost: 1e9 };
    });
    await waitFrames(page, 60);
    await page.evaluate(() => { window.__G8pinCam = { x: window.__S.cam.x, y: window.__S.cam.y }; });
    await waitFrames(page, 20);
    const canvas = await canvasInfo(page);

    const runs = [];
    for (let i = 0; i < REPS; i++) {
      await page.evaluate(() => { window.__lab.clear(); });
      await page.evaluate(() => window.__lab.spawn('chaser', 260, 0, null));
      await waitFrames(page, 24);
      const e = await page.evaluate(() => { const e = window.__S.enemies.find(x => x.id >= 900000); return e ? { x: e.x, y: e.y, r: e.r } : null; });
      if (!e) { runs.push({ error: 'ennemi absent' }); continue; }
      const c = await toScreenCss(page, e.x, e.y);
      const edge = await toScreenCss(page, e.x + e.r, e.y);
      const hw = Math.abs(edge.x - c.x);                       // demi-largeur de la boîte, pixels d'écran
      const box = { x: c.x - hw, y: c.y - hw, w: 2 * hw, h: 2 * hw };
      await reqRect(page, box, 24);
      await waitFrames(page, 10);
      await clearProbeBufs(page);
      await readSpies(page, true);
      await arm(page, ACT_HIT);
      const f = await waitFired(page);
      const serie = await waitPx(page, 'rect');
      const p = await readProbe(page, true);
      const sp = await readSpies(page, true);
      const pre = serie.filter(o => o.fi < f.fi);
      const fit = pre.length >= 4 ? fitBase(pre.map(o => ({ d: o.fi - f.fi, v: o.l }))) : null;
      const at0 = serie.find(o => o.fi === f.fi), at1 = serie.find(o => o.fi === f.fi + 1);
      const alive = await page.evaluate(() => { const e = window.__S.enemies.find(x => x.id >= 900000 && !x.dead); return e ? { hp: e.hp, hitT: e.hitT } : null; });
      runs.push({ fi: f.fi, boiteEcran: box, demiLargeurPx: r2(hw),
        base: fit ? r3(fit.base) : null, bruitDeFondPts: fit ? r3(fit.resid * fit.base / 100) : null,
        imageImpact: at0 ? r3(at0.l) : null, imageSuivante: at1 ? r3(at1.l) : null,
        hausseImageSuivante: (fit && at1) ? r2(at1.l - fit.base) : null,
        hausseImageImpact: (fit && at0) ? r2(at0.l - fit.base) : null,
        serie: serie.map(o => ({ d: o.fi - f.fi, l: o.l })),
        appelsFxHit: sp.hit.filter(o => o.fi >= f.fi && o.fi <= f.fi + 1).length,
        ennemiVivant: !!alive, ennemi: alive, err: p.err });
    }
    out.captures = await savePngs(page, 'G8-t6-impact');
    const h = runs.filter(o => !o.error).map(o => o.hausseImageSuivante);
    out.A = { canvas, mesures: runs, hausses: h, seuil: 25,
      pass: h.length === REPS && h.every(v => v != null && v >= 25) && runs.every(o => o.ennemiVivant) };
  } finally { await ctx.close(); }
}

/* ------------------------------------------------------------------ B ----- */
async function sectionB(out) {
  // pas de temps imposé dès le chargement et tout posé AVANT le clic sur JOUER : la partie est alors
  // reproductible d'une exécution à l'autre
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  try {
    const { page } = ctx;
    // montées de niveau neutralisées : aucune carte n'est prise, l'arsenal reste celui de départ
    await page.evaluate(() => {
      const M = window.__M, S = window.__S, o = M.levels.update;
      M.levels.update = function () { const r = o.apply(this, arguments); S.xp = 0; S.lvlUps = 0; S.xpNext = 1e9; return r; };
      window.__DT = 1 / 60;
    });
    await installProbe(page);
    await installFrameProbe(page, { cap: 2000 });
    await installSpies(page, { cap: 40000, skip: ['ring', 'text', 'flash'] });
    await page.evaluate((src) => {
      const G = window.__G8;
      G.imp = { n: 0, rejetes: 0, frames: 0, byFrame: [] };
      G.perFrame = new Function('S', 'M', 'K', 'G', src);
    }, PREDICTOR);
    await installAutoPilot(page, { mode: 'key', seed: SEED, ult: false, special: false });
    await installGod(page);
    await startGame(ctx, { seed: SEED });

    const played = await playDet(ctx, BOT_SECS);
    const sp = await readSpies(page, false);
    const imp = await page.evaluate(() => JSON.parse(JSON.stringify({ ...window.__G8.imp, byFrame: window.__G8.imp.byFrame.length })));
    const p = await readProbe(page, true);

    const bursts = (sp.burst || []).filter(b => b.n === 3 && b.p === 0.7);
    out.B = { joueS: played.played, images: imp.frames,
      impactsPredits: imp.n, appelsFxHit: sp.n.hit, egalite: imp.n === sp.n.hit,
      degatsPositionnesAutresSources: bursts.length,
      exemplesFxHit: (sp.hit || []).slice(0, 4),
      kills: await page.evaluate(() => window.__S.kills),
      pilotErr: played.pilot && played.pilot.err, probeErr: p.err,
      pageErrors: ctx.pageErrors.slice(0, 5),
      errCount: await page.evaluate(() => window.__ERR ? window.__ERR.count : null) };
    out.B.pass = imp.n > 0 && imp.n === sp.n.hit && ctx.pageErrors.length === 0;
  } finally { await ctx.close(); }
}

/* ------------------------------------------------------------------------- */
(async () => {
  deadline(700, 'G8-t6-impact');
  const r = { test: 'G8-t6-impact', seed: SEED, botSecs: BOT_SECS };
  try {
    await sectionA(r);
    await sectionB(r);
    r.pass = !!(r.A && r.A.pass && r.B && r.B.pass);
    r.measured = {
      A_hausseLuminanceBoite: r.A ? r.A.hausses : null, A_seuil: 25,
      B_impactsPredits: r.B ? r.B.impactsPredits : null, B_appelsFxHit: r.B ? r.B.appelsFxHit : null,
      B_degatsPositionnesAutres: r.B ? r.B.degatsPositionnesAutresSources : null
    };
    r.threshold = 'luminance de la boîte de l\'ennemi ≥ +25 points sur l\'image suivant l\'impact ; appels fx.hit = impacts de projectiles prédits sur 20 s de bot';
    save('G8-t6-impact.json', r);
    finish('G8-t6-impact', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t6-impact.json', r);
    finish('G8-t6-impact', r);
  }
})();
