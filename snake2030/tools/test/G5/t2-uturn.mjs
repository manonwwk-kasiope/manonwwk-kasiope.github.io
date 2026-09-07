// G5 test 2 — demi-tour sur rail ortho (bureau 1440×900, clavier) : le serpent roule à droite sur le treillis ortho
// forcé (cap 0), Flèche Gauche tenue 3 s (180 images à pas fixe 1/60) → le cap doit valoir 180° ± 1° avant 2,4 s
// (144 images) après le keydown. Aujourd'hui le demi-tour est refusé (cap inchangé).
import { launchDesktop, installProbe, installInvuln, startGame, pullProbe, clearProbe, waitFrames, sleep, save, finish, deadline } from '../lib.mjs';
import { SEED, emptyArena, setSnake, deg, norm } from './g5lib.mjs';
deadline(120, 2);
const THRESH = 'Gauche tenue 3 s en roulant à droite sur rail ortho : première image avec |cap − 180°| ≤ 1° à ≤ 144 images (2,4 s) du keydown';
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
try {
  await installProbe(page);
  await installInvuln(page);
  await startGame(ctx, { seed: SEED });
  await emptyArena(page);
  await page.evaluate(() => window.__M.phases.forceGrid('ortho'));
  await setSnake(page, 600, 800, 0);
  await waitFrames(page, 70);                               // mise sur rail (0,5 s) puis croisière
  const st0 = await page.evaluate(() => { const s = window.__S.snake, P = window.__M.phases; return { x: s.x, y: s.y, ang: s.ang, railed: P.railed(), spacing: P.railSpacing, dt: window.__S.dt }; });
  m.before = { x: +st0.x.toFixed(1), y: +st0.y.toFixed(1), capDeg: deg(st0.ang), railed: st0.railed, spacing: st0.spacing, fixedDt: Math.abs(st0.dt - 1 / 60) < 1e-6 };
  if (!st0.railed) { code = 2; throw new Error('serpent non posé sur rail'); }
  await clearProbe(page);
  await page.keyboard.down('ArrowLeft');
  await waitFrames(page, 180);
  await page.keyboard.up('ArrowLeft');
  const P = await pullProbe(page);
  const mk = P.marks.find(k => k.type === 'down' && k.key === 'ArrowLeft');
  if (!mk) { code = 2; throw new Error('marque keydown absente'); }
  const R = P.rec.filter(r => r.fi > mk.fi);
  const a0 = st0.ang;
  const first = R.find(r => Math.abs(norm(r.ang - a0)) > 0.05);
  const reach = R.find(r => Math.abs(norm(r.ang - Math.PI)) <= Math.PI / 180);
  m.markFrame = mk.fi;
  m.framesToFirstChange = first ? first.fi - mk.fi : null;
  m.framesTo180 = reach ? reach.fi - mk.fi : null;
  m.secondsTo180 = reach ? +((reach.fi - mk.fi) / 60).toFixed(3) : null;
  m.gameMsTo180 = reach ? +(reach.t - (P.rec.find(r => r.fi === mk.fi + 1) || R[0]).t).toFixed(0) : null;
  m.capAfter3sDeg = R.length ? deg(R[R.length - 1].ang) : null;
  m.capEvery10Frames = R.filter((r, i) => i % 10 === 0).map(r => deg(r.ang));
  m.headPathEvery30 = R.filter((r, i) => i % 30 === 0).map(r => [+r.x.toFixed(0), +r.y.toFixed(0)]);
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = { turned180within144: m.framesTo180 != null && m.framesTo180 <= 144 };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g5-t2.json', m);
  finish(2, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 300);
  save('g5-t2.json', m);
  finish(2, { pass: false, measured: m, threshold: THRESH, code });
} finally { await ctx.close(); }
