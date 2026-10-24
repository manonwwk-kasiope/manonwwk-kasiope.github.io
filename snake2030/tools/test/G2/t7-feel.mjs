// G2 test 7 (volet desktop-feel ; la NR « run.mjs nr » est lancée par l'exécuteur) — bureau 1440×900, clavier :
// latence entrée → virage = 1 image (keydown ArrowUp → première image où le cap change), 90° atteints en ≤ 22 images.
// Mesure reprise de scratchpad desktop-feel.mjs sur la sonde de lib.mjs (cap par image + marque keydown), en pilotage
// libre au début de partie (avant le premier treillis, 2 s + 1,4 s), cap de départ 0 → cible −π/2.
import { launchDesktop, installProbe, startGame, pullProbe, clearProbe, sleep, save, finish, deadline } from '../lib.mjs';
deadline(120, 7);
const THRESH = 'images keydown→premier changement de cap === 1 ; images keydown→|cap − (−π/2)| < 0,035 ≤ 22';
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
try {
  await installProbe(page);
  await startGame(ctx);
  await sleep(700);
  await clearProbe(page);
  await sleep(120);
  const before = await page.evaluate(() => ({ ang: window.__S.snake.ang, railed: window.__M.phases.state().railed }));
  await page.keyboard.down('ArrowUp');
  await sleep(900);
  await page.keyboard.up('ArrowUp');
  const P = await pullProbe(page);
  const mark = P.marks.find(k => k.type === 'down' && k.key === 'ArrowUp');
  if (!mark) { code = 2; throw new Error('marque keydown absente'); }
  const R = P.rec.filter(r => r.fi > mark.fi);
  const first = R.find(r => Math.abs(r.ang - before.ang) > 1e-4);
  const reach = R.find(r => Math.abs(Math.atan2(Math.sin(r.ang + Math.PI / 2), Math.cos(r.ang + Math.PI / 2))) < 0.035);
  m.angBefore = +before.ang.toFixed(4); m.railedBefore = before.railed;
  m.markFrame = mark.fi;
  m.framesToFirstChange = first ? first.fi - mark.fi : null;
  m.msToFirstChange = first ? +(first.now - mark.now).toFixed(1) : null;
  m.framesTo90 = reach ? reach.fi - mark.fi : null;
  m.msTo90 = reach ? +(reach.now - mark.now).toFixed(1) : null;
  m.angCurveDeg = R.slice(0, 26).map(r => +(r.ang * 180 / Math.PI).toFixed(1));
  m.railedAfter = await page.evaluate(() => window.__M.phases.state().railed);
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = { latency1: m.framesToFirstChange === 1, turn90in22: m.framesTo90 != null && m.framesTo90 <= 22 };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g2-t7.json', m);
  finish(7, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g2-t7.json', m);
  finish(7, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
