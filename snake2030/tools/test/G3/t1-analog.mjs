// G3 test 1 — bureau 1440×900 en jeu (phase ESPACE forcée : pilotage libre, arène vide, pas fixe 1/60, graine 2030),
// cap initial 0, tête au repos (aucune entrée) : page.mouse.move(tête.sx, tête.sy + 300) → après 700 ms de jeu
// |norm(S.snake.ang − π/2)| < 0,1 ; move à 40 px de la tête (30° du cap, côté écran) → 0 < jmag ≤ 0,35 ; move à 20 px →
// jmag === 0 et jactive === false. La tête vient de phases.worldToScreen (API imposée : code 2 si absente).
// La souris est MAINTENUE 300 px sous la tête courante (page.mouse.move(tête.sx, tête.sy + 300) répété toutes les
// 2 images) : la caméra d'avance déplace la tête de ~75 px à l'écran pendant le virage, et un curseur posé une seule
// fois finit 14° de côté (cap 103° mesuré sur maquette) — le seuil 0,1 rad n'a de sens que curseur sous la tête. Le
// scénario littéral (curseur posé une fois au départ de partie) est mesuré d'abord, à titre indicatif (fixedCursor).
import { launchDesktop, waitFrames, save, finish, deadline } from '../lib.mjs';
import { prepPlay, api, head, mouseTo, readInput, waitGameMs, settleHead, pickInput, setSnake, norm, r3 } from './g3lib.mjs';
deadline(120, 1);
const THRESH = 'souris 300 px sous la tête : après 700 ms de jeu |norm(ang − π/2)| < 0,1 ; à 40 px (30°) 0 < jmag ≤ 0,35 ; à 20 px jmag === 0 et jactive === false';
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
/** Souris tenue 300 px sous la tête pendant `ms` de temps de jeu ; rend la dernière lecture. */
async function trackBelow(ms) {
  const t0 = await page.evaluate(() => window.__S.t);
  let last = null, moves = 0;
  for (;;) {
    const h = await head(page);
    await page.mouse.move(h.sx, h.sy + 300); moves++;
    last = await readInput(page, 2);
    if (last.t - t0 >= ms) return { ...last, moves, gameMs: +(last.t - t0).toFixed(1) };
  }
}
try {
  m.env = await prepPlay(ctx);
  m.api = await api(page);
  if (!m.api.worldToScreen || m.api.shape !== true) { code = 2; throw new Error('phases.worldToScreen absent ou sans {sx, sy}'); }
  const h0 = await head(page);
  m.head0 = { sx: r3(h0.sx), sy: r3(h0.sy), ang: r3(h0.ang), dirScreen: r3(h0.dir) };
  m.rest = pickInput(await readInput(page, 1));                 // tête au repos : aucune entrée
  // indicatif (scénario littéral) : curseur posé UNE fois 300 px sous la tête au départ de partie (avance de caméra
  // horizontale établie), erreur au bout de 700 ms de jeu — premier placement en deux événements (cumul ≥ 8 px → active en 'auto')
  await mouseTo(page, h0.sx, h0.sy + 300);
  const i0 = await readInput(page, 1);
  m.afterMove = { ...pickInput(i0), ang: r3(i0.ang) };
  const i4 = await waitGameMs(page, 700);
  const h5 = await head(page);
  m.fixedCursor = { ang: r3(i4.ang), errToHalfPi: r3(norm(i4.ang - Math.PI / 2)), headDrift: [r3(h5.sx - h0.sx), r3(h5.sy - h0.sy)], gameMs: i4.gameMs, frames: i4.frames };
  // 1. critère : cap remis à 0, souris MAINTENUE 300 px sous la tête pendant 700 ms de jeu
  await setSnake(page, h5.x, h5.y, 0);
  await waitFrames(page, 1);
  const i1 = await trackBelow(700);
  m.step1 = { gameMs: i1.gameMs, moves: i1.moves, ang: r3(i1.ang), errToHalfPi: r3(norm(i1.ang - Math.PI / 2)), jmag: r3(i1.jmag), jactive: i1.jactive };
  // 2. caméra rattrapée, puis souris à 40 px de la tête, 30° du cap (côté écran) : lecture à l'image qui suit le mousemove
  m.settle = await settleHead(page);
  const h1 = await head(page);
  const p40 = { x: h1.sx + 40 * Math.cos(h1.dir + Math.PI / 6), y: h1.sy + 40 * Math.sin(h1.dir + Math.PI / 6) };
  await page.mouse.move(p40.x, p40.y);
  const i2 = await readInput(page, 1);
  const h2 = await head(page);
  m.step2 = { ...pickInput(i2), distAfter: r3(Math.hypot(p40.x - h2.sx, p40.y - h2.sy)), framesAfterMove: i2.fi - h1.fi };
  // 3. souris à 20 px
  const p20 = { x: h2.sx + 20 * Math.cos(h2.dir + Math.PI / 6), y: h2.sy + 20 * Math.sin(h2.dir + Math.PI / 6) };
  await page.mouse.move(p20.x, p20.y);
  const i3 = await readInput(page, 1);
  const h3 = await head(page);
  m.step3 = { ...pickInput(i3), distAfter: r3(Math.hypot(p20.x - h3.sx, p20.y - h3.sy)), framesAfterMove: i3.fi - h2.fi };
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = {
    turn90: Math.abs(m.step1.errToHalfPi) < 0.1,
    jmag40: i2.jmag > 0 && i2.jmag <= 0.35,
    dead20: i3.jmag === 0 && i3.jactive === false,
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g3-t1.json', m);
  finish(1, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g3-t1.json', m);
  finish(1, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
