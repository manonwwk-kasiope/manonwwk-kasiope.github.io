// G6 test 2 — le corps absorbe les balles au-delà du 8e anneau (laboratoire, bureau 1440×900).
// Serpent de 40 anneaux, arène vide, pas de temps imposé (1/60 s), graine imposée.
//   (A) une balle ennemie posée sur le segment 20 : S.snake.len inchangé, S.mult inchangé, ≥ 1 particule émise ;
//   (B) une balle ennemie posée sur le segment 3  : len − 1.
// Extras relevés (non bloquants, la spec ne les chiffre pas) : invulnérabilité, combo, réserve de boost.
import { launchDesktop, startGame, save, finish, deadline } from '../lib.mjs';
import { SEED, emptyArena, installLab, installBurstSpy, readBursts, waitGame, waitFramesLocal } from './g6lib.mjs';

deadline(240, 2);
const THRESH = 'segment 20 : len inchangé, mult inchangé, ≥ 1 particule ; segment 3 : len − 1';
const m = {};
let code = 1;

const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
try {
  await startGame(ctx, { seed: SEED });
  await emptyArena(page, { noFire: true, keepEBullets: true });
  await installLab(page);
  await installBurstSpy(page);
  // serpent de 40 anneaux : il faut 40 × 15 u de trace derrière la tête pour que les segments soient posés
  await page.evaluate(() => { const s = window.__S.snake; s.len = 40; s.hp = 40; s.maxHp = 40; });
  await waitGame(page, 6000);
  const geo = await page.evaluate(() => {
    const s = window.__S.snake;
    return { len: s.len, nsegs: s.segs.length, d20: s.segs[20] ? Math.hypot(s.segs[20].x - s.x, s.segs[20].y - s.y) : -1,
      d3: s.segs[3] ? Math.hypot(s.segs[3].x - s.x, s.segs[3].y - s.y) : -1 };
  });
  m.geometrie = { anneaux: geo.nsegs, distanceSegment20: Math.round(geo.d20), distanceSegment3: Math.round(geo.d3) };
  if (geo.nsegs < 30 || geo.d20 < 150) {
    m.pourquoi = 'corps non déployé (40 anneaux attendus, segment 20 à plus de 150 u de la tête)';
    code = 2;
  } else {
    /* ---- A : balle sur le segment 20 ---- */
    await readBursts(page);
    const a0 = await page.evaluate(() => {
      const S = window.__S, s = S.snake;
      S.ebullets.length = 0;
      s.invuln = 0; s.ghost = 0;
      S.mult = 3; S.multT = 60000; S.combo = 8;
      const sg = s.segs[20];
      window.__lab.ebullet(sg.x, sg.y, 0, 0, { r: 6, dmg: 1, life: 1.5 });
      return { len: s.len, mult: S.mult, combo: S.combo, boostE: Math.round(s.boostE), invuln: Math.round(s.invuln), x: sg.x, y: sg.y, nb: S.ebullets.length };
    });
    await waitFramesLocal(page, 8);
    const a1 = await page.evaluate(() => {
      const S = window.__S, s = S.snake;
      return { len: s.len, mult: S.mult, combo: S.combo, boostE: Math.round(s.boostE), invuln: Math.round(s.invuln), nb: S.ebullets.length };
    });
    const bA = await readBursts(page);
    const nearA = bA.filter(b => Math.hypot(b.x - a0.x, b.y - a0.y) < 80);
    m.segment20 = { avant: a0, apres: a1, lenDelta: a1.len - a0.len, multDelta: +(a1.mult - a0.mult).toFixed(2),
      comboDelta: a1.combo - a0.combo, boostEDelta: a1.boostE - a0.boostE, invulnApres: a1.invuln,
      balleRestante: a1.nb, particules: nearA.reduce((s, b) => s + b.n, 0),
      bursts: nearA.map(b => ({ c: b.color, n: b.n })).slice(0, 6) };

    /* ---- B : balle sur le segment 3 ---- */
    await page.evaluate(() => {
      const S = window.__S, s = S.snake;
      S.ebullets.length = 0;
      s.len = 40; s.hp = 40; s.invuln = 0; s.ghost = 0;
      S.mult = 3; S.multT = 60000; S.combo = 8;
    });
    await waitGame(page, 700);                  // le corps se replace après la remise à 40 anneaux
    await readBursts(page);
    const b0 = await page.evaluate(() => {
      const S = window.__S, s = S.snake;
      s.invuln = 0;
      const sg = s.segs[3];
      window.__lab.ebullet(sg.x, sg.y, 0, 0, { r: 6, dmg: 1, life: 1.5 });
      return { len: s.len, mult: S.mult, combo: S.combo, invuln: Math.round(s.invuln), x: sg.x, y: sg.y };
    });
    await waitFramesLocal(page, 8);
    const b1 = await page.evaluate(() => {
      const S = window.__S, s = S.snake;
      return { len: s.len, mult: S.mult, combo: S.combo, invuln: Math.round(s.invuln), nb: S.ebullets.length };
    });
    m.segment3 = { avant: b0, apres: b1, lenDelta: b1.len - b0.len, multApres: b1.mult, invulnApres: b1.invuln };

    const okA = m.segment20.lenDelta === 0 && Math.abs(m.segment20.multDelta) < 1e-9 && m.segment20.particules >= 1;
    const okB = m.segment3.lenDelta === -1;
    m.verdict = { absorption: okA, degatsPresDeLaTete: okB };
    code = (okA && okB) ? 0 : 1;
  }
  m.erreursPage = ctx.pageErrors.slice(0, 4).concat(ctx.consoleErrors.slice(0, 4));
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 500);
  code = 2;
} finally {
  await ctx.close();
}
save('G6-t2-absorb.json', m);
finish(2, { pass: code === 0, code, measured: m, threshold: THRESH });
