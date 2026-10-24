// G3 test 6 — iPhone 13 paysage hasTouch:true (ESPACE forcé, arène vide, pas fixe 1/60) : page.mouse.move puis
// mouse.down → S.input inchangé (les écouteurs souris n'existent que si S.desktop) ; latence doigt → virage
// (repère iphone-feel.mjs sur la sonde de lib.mjs) : manche posé à ui.joyHome(), déplacé de 60 px vers le haut par CDP,
// première image où le cap change = 1 image après la marque touchmove, sur 3 essais (cap remis à 0 entre deux).
import { launchPhone, installProbe, installInvuln, startGame, pullProbe, clearProbe, waitFrames, touch, sleep, save, finish, deadline } from '../lib.mjs';
import { emptyArena, setSnake } from '../G5/g5lib.mjs';
import { INPUT_KEYS, sameInput } from './g3lib.mjs';
deadline(150, 6);
const THRESH = 'iPhone : S.input identique après mouse.move + mouse.down ; latence doigt → virage === 1 image (3/3 essais)';
const ctx = await launchPhone();
const { page, cdp } = ctx;
const T = touch(cdp);
const m = {};
let code = 1;
const input = () => page.evaluate(K => { const o = {}; for (const k of K) o[k] = window.__S.input[k]; return o; }, INPUT_KEYS);
try {
  await installProbe(page);
  await installInvuln(page);
  await startGame(ctx, { seed: 2030 });
  await sleep(300);
  await emptyArena(page);
  await page.evaluate(() => { const M = window.__M; if (M.phases && M.phases.forcePhase) M.phases.forcePhase(1); });
  await waitFrames(page, 5);
  m.env = await page.evaluate(() => ({ desktop: window.__S.desktop, maxTouchPoints: navigator.maxTouchPoints, phase: window.__M.phases.state().phase, railed: window.__M.phases.railed(), dt: +window.__S.dt.toFixed(5) }));
  // souris inerte
  m.mouse = { before: await input() };
  await page.mouse.move(400, 200);
  await page.mouse.down();
  await waitFrames(page, 3);
  m.mouse.afterDown = await input();
  await page.mouse.up();
  await waitFrames(page, 2);
  m.mouse.afterUp = await input();
  m.mouse.unchanged = sameInput(m.mouse.before, m.mouse.afterDown) && sameInput(m.mouse.before, m.mouse.afterUp);
  // latence doigt → virage
  const joy = await page.evaluate(() => window.__M.ui.joyHome && window.__M.ui.joyHome());
  if (!joy) { code = 2; throw new Error('ui.joyHome absent'); }
  m.joy = joy;
  m.trials = [];
  for (let k = 0; k < 3; k++) {
    await setSnake(page, 1000, 800, 0);
    await waitFrames(page, 20);
    await T.start([{ x: joy.x, y: joy.y, id: 1 }]);
    await waitFrames(page, 5);
    await clearProbe(page);
    const a0 = await page.evaluate(() => window.__S.snake.ang);
    await T.move([{ x: joy.x, y: joy.y - 60, id: 1 }]);
    await waitFrames(page, 30);
    const P = await pullProbe(page);
    const mk = P.marks.find(x => x.type === 'tm');
    const first = mk ? P.rec.find(r => r.fi > mk.fi && Math.abs(r.ang - a0) > 1e-4) : null;
    m.trials.push({ mark: mk ? mk.fi : null, firstChange: first ? first.fi : null, frames: (mk && first) ? first.fi - mk.fi : null, ms: (mk && first) ? +(first.now - mk.now).toFixed(1) : null, a0: +a0.toFixed(3), railed: await page.evaluate(() => window.__M.phases.railed()) });
    await T.end([]);
    await waitFrames(page, 10);
  }
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = {
    mouseInert: m.mouse.unchanged === true,
    latency1: m.trials.length === 3 && m.trials.every(t => t.frames === 1),
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g3-t6.json', m);
  finish(6, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g3-t6.json', m);
  finish(6, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
