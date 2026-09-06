// G1 test 2 — injection d'un ennemi dont enemies.update lève à chaque image (bureau 1440×900).
// Attendu : l'ennemi disparaît de S.enemies en ≤ 2 images, fillRect ≥ 55/s, S.cam bouge,
// window.__ERR.count === 1 après 2 s (une signature, pas une erreur par image).
import { launchDesktop, startGame, installGod, playFor, isMain, finish, deadline } from './lib.mjs';

const THRESH = 'goneAfterFrames ≤ 2, fillRectPerS ≥ 55, camMoved > 0, errCount === 1 après 2 s';

export async function run() {
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  let r;
  try {
    await installGod(page);
    await startGame(ctx);
    await playFor(ctx, 4, { god: true });
    const errs0 = ctx.pageErrors.length;
    r = await page.evaluate(async () => {
      const S = window.__S, M = window.__M;
      const raf = () => new Promise(r => requestAnimationFrame(r));
      const C = { fillRect: 0, thrown: 0 };
      const proto = CanvasRenderingContext2D.prototype; const o = proto.fillRect; proto.fillRect = function () { C.fillRect++; return o.apply(this, arguments); };
      await raf(); await raf();
      const ou = M.enemies.update;
      M.enemies.update = function (e, dt) { if (e.__bad) { C.thrown++; throw new Error('ennemi corrompu (test rp-robust2)'); } return ou.call(this, e, dt); };
      const bad = { __bad: true, x: S.snake.x + 300, y: S.snake.y, r: 10, hp: 1, maxHp: 1, dead: false, hitT: 0, t: 0, type: 'chaser', color: '#f00', speed: 0, dmg: 1, score: 1, xp: 1, id: 999999 };
      S.enemies.push(bad);
      const t0 = S.t, cam0 = { x: S.cam.x, y: S.cam.y }, x0 = S.snake.x, y0 = S.snake.y;
      const err0 = window.__ERR ? window.__ERR.count : null;
      C.fillRect = 0;
      let n = 0, gone = -1;
      const tStart = performance.now();
      while (performance.now() - tStart < 2000) {
        await raf(); n++;
        if (gone < 0 && S.enemies.indexOf(bad) < 0) gone = n;
      }
      const secs = (performance.now() - tStart) / 1000;
      M.enemies.update = ou;
      return { thrown: C.thrown, frames: n, goneAfterFrames: gone, badStill: S.enemies.indexOf(bad) >= 0, badDead: !!bad.dead,
        fillRectPerS: +(C.fillRect / secs).toFixed(1), tAdvancedMs: +(S.t - t0).toFixed(0),
        snakeMoved: +Math.hypot(S.snake.x - x0, S.snake.y - y0).toFixed(1), camMoved: +Math.hypot(S.cam.x - cam0.x, S.cam.y - cam0.y).toFixed(1),
        errCount: window.__ERR ? window.__ERR.count : null, errCountBefore: err0,
        errSigs: window.__ERR ? Object.keys(window.__ERR.sigs || {}).slice(0, 5) : null, phase: S.phase };
    });
    r.pageErrors = ctx.pageErrors.length - errs0;
    r.firstError = ctx.pageErrors[errs0] || null;
  } finally { await ctx.close(); }
  const checks = { gone: r.goneAfterFrames >= 0 && r.goneAfterFrames <= 2, fill: r.fillRectPerS >= 55, cam: r.camMoved > 0, err: r.errCount === 1 };
  r.checks = checks;
  const otherOk = checks.gone && checks.fill && checks.cam;
  const pass = otherOk && checks.err;
  const code = pass ? 0 : (r.errCount == null && otherOk ? 2 : 1);
  return { pass, measured: r, threshold: THRESH, code };
}

if (isMain(import.meta.url)) {
  deadline(120, 'rp-robust2');
  finish('rp-robust2', await run());
}
