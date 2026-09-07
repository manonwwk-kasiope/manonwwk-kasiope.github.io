// G3 test 4 — mode 'auto' (défaut) sur bureau 1440×900, ESPACE forcé, pas fixe 1/60 : souris active (300 px devant la
// tête, jactive true) puis ArrowUp pressée (tenue 2 images, relâchée) → S.input.jy === −1 (la souris n'écrase plus la
// direction) ; un mousemove ultérieur de 5 px ne modifie plus S.input ; un mousemove de 20 px la réactive (jactive true, jmag > 0).
import { launchDesktop, waitFrames, save, finish, deadline } from '../lib.mjs';
import { prepPlay, api, head, mouseTo, readInput, pickInput, sameInput, r3 } from './g3lib.mjs';
deadline(120, 4);
const THRESH = "souris active → ArrowUp → jy === −1 ; mousemove 5 px → S.input identique ; mousemove 20 px → jactive true et jmag > 0";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
try {
  m.env = await prepPlay(ctx);
  m.api = await api(page);
  if (!m.api.worldToScreen || m.api.shape !== true) { code = 2; throw new Error('phases.worldToScreen absent ou sans {sx, sy}'); }
  const h = await head(page);
  const mx = h.sx + 300 * Math.cos(h.dir), my = h.sy + 300 * Math.sin(h.dir);   // droit devant : jy souris ≈ 0
  await mouseTo(page, mx, my);
  const i0 = await readInput(page, 2);
  m.active = pickInput(i0);
  await page.keyboard.down('ArrowUp');
  await waitFrames(page, 2);
  await page.keyboard.up('ArrowUp');
  const i1 = await readInput(page, 2);
  m.afterKey = { ...pickInput(i1), ang: r3(i1.ang) };
  const snap = await readInput(page, 2);
  m.snap = pickInput(snap);
  await page.mouse.move(mx + 5, my);
  const i2 = await readInput(page, 2);
  m.after5px = pickInput(i2);
  await page.mouse.move(mx + 25, my);
  const i3 = await readInput(page, 2);
  m.after20px = pickInput(i3);
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = {
    mouseActive: i0.jactive === true && i0.jmag > 0,
    keyWins: i1.jy === -1,
    inert5px: sameInput(snap, i2),
    reactive20px: i3.jactive === true && i3.jmag > 0,
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g3-t4.json', m);
  finish(4, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g3-t4.json', m);
  finish(4, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
