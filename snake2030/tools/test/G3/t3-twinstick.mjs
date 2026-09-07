// G3 test 3 — clavier + souris (bureau 1440×900, ESPACE forcé, pas fixe 1/60) : keyboard.down('ArrowRight') maintenu,
// puis souris placée à 300 px de la tête, 60° sous l'axe de son cap (côté écran) → après 200 ms de jeu (12 images)
// (S.t) |norm(S.snake.aim − S.snake.ang − 1,047)| < 0,1 (visée bornée à ±RAIL_LOOK = 1,15) et S.input.jx > 0,9 (les touches dirigent).
import { launchDesktop, waitFrames, save, finish, deadline } from '../lib.mjs';
import { prepPlay, api, head, mouseTo, readInput, waitGameMs, pickInput, norm, r3 } from './g3lib.mjs';
deadline(120, 3);
const THRESH = 'ArrowRight tenu + souris à 60° sous l’axe : après 200 ms |norm(aim − ang − 1,047)| < 0,1 et jx > 0,9';
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
try {
  m.env = await prepPlay(ctx);
  m.api = await api(page);
  if (!m.api.worldToScreen || m.api.shape !== true) { code = 2; throw new Error('phases.worldToScreen absent ou sans {sx, sy}'); }
  await page.keyboard.down('ArrowRight');
  await waitFrames(page, 3);
  m.keyOnly = pickInput(await readInput(page, 1));
  const h = await head(page);
  const D = 300, a = h.dir + Math.PI / 3;
  const px = h.sx + D * Math.cos(a), py = h.sy + D * Math.sin(a);
  m.head = { sx: r3(h.sx), sy: r3(h.sy), dirScreen: r3(h.dir), ang: r3(h.ang) };
  m.mouse = { x: r3(px), y: r3(py), inView: px >= 0 && px < 1440 && py >= 0 && py < 900 };
  await mouseTo(page, px, py);                                   // ≥ 8 px cumulés après la touche : la souris redevient active
  const i = await waitGameMs(page, 200);
  const h2 = await head(page);
  const mouseAng = norm(Math.atan2(py - h2.sy, px - h2.sx) - h2.rot);
  m.after200 = { ...pickInput(i), ang: r3(i.ang), aim: r3(i.aim), aimMinusAng: i.aim == null ? null : r3(norm(i.aim - i.ang)),
    err: i.aim == null ? null : r3(norm(i.aim - i.ang - 1.047)), mouseRelToCap: r3(norm(mouseAng - h2.ang)), frames: i.frames, gameMs: i.gameMs };
  await page.keyboard.up('ArrowRight');
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = {
    aim60: i.aim != null && Math.abs(norm(i.aim - i.ang - 1.047)) < 0.1,
    keysSteer: i.jx > 0.9,
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g3-t3.json', m);
  finish(3, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g3-t3.json', m);
  finish(3, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
