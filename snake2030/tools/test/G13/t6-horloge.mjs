/* G13 t6 — horloge à pas fixe.
   Spec : gel injecté de 2 s → S.t avance de ≤ 40 ms et le serpent de ≤ 6 u ; dilatation du temps de
   jeu < 1 % sur une partie réelle ; trajectoire identique à graine et entrées égales.
   Le gel est injecté DANS la page (boucle occupée synchrone) au milieu d'une image, comme le ferait un
   ramasse-miettes : c'est le chemin que le jeu emprunte, pas un saut d'horloge posé entre deux images. */
import { launchDesktop, startGame, save, finish, deadline, sleep, installGod, installInvuln, playFor } from '../lib.mjs';
deadline(300, 'G13-t6');

const ctx = await launchDesktop(1920, 1080, { unthrottled: true });
let r = {};
try {
  await startGame(ctx, { seed: 2030 });
  await installInvuln(ctx.page);
  await sleep(1500);
  // --- 1. gel de 2 s injecté au milieu d'une image
  r.gel = await ctx.page.evaluate(() => new Promise(res => {
    const S = window.__S;
    requestAnimationFrame(() => {
      const t0 = S.t, x0 = S.snake.x, y0 = S.snake.y, d0 = S.dropped | 0;
      const fin = performance.now() + 2000;
      while (performance.now() < fin) { /* la page est bloquée, comme sous un ramasse-miettes */ }
      requestAnimationFrame(() => {
        res({ dt: +(S.t - t0).toFixed(2), du: +Math.hypot(S.snake.x - x0, S.snake.y - y0).toFixed(2),
              dropped: (S.dropped | 0) - d0, speed: +S.snake.speed.toFixed(0) });
      });
    });
  }));
  // --- 2. dilatation sur une partie réelle de 90 s
  /* « temps réel joué » : on n'additionne que les images effectivement JOUÉES (phase play, non pausée).
     Une carte à choisir ou une pause ne sont pas du temps de jeu, et S.t n'y avance pas non plus. */
  await ctx.page.evaluate(() => {
    const S = window.__S;
    window.__CLK = { raw: 0, jeu: 0, n: 0, long: 0, exces: 0, long50: 0, exces50: 0, w0: performance.now() };
    let l = performance.now(), lt = S.t;
    (function t() {
      requestAnimationFrame(t);
      const n = performance.now(), d = n - l; l = n;
      const dj = S.t - lt; lt = S.t;
      if (S.phase === 'play' && !S.paused) {
        window.__CLK.raw += d; window.__CLK.jeu += dj; window.__CLK.n++;
        if (d > 33) { window.__CLK.long++; window.__CLK.exces += d - 33; }
        if (d > 50) { window.__CLK.long50++; window.__CLK.exces50 += d - 50; }
      }
    })();
  });
  await installGod(ctx.page);
  await playFor(ctx, 90, { god: true });
  r.dil = await ctx.page.evaluate(() => {
    const C = window.__CLK, S = window.__S;
    return { reelMs: Math.round(C.raw), jeuMs: Math.round(C.jeu), images: C.n, dropped: S.dropped | 0,
      longues: C.long, excesMs: Math.round(C.exces), longues50: C.long50, exces50Ms: Math.round(C.exces50), ecart: +(100 * (C.raw - C.jeu) / C.raw).toFixed(2) };
  });
  r.pageErrors = ctx.pageErrors.length;
  r.err = await ctx.page.evaluate(() => window.__ERR.count);
} finally { await ctx.close(); }

const pass = r.gel.dt <= 40 && r.gel.du <= 6 && Math.abs(r.dil.ecart) <= 1 && r.pageErrors === 0 && r.err === 0;
save('G13-t6-horloge.json', { test: 'G13-t6', pass, measured: r });
finish('G13-t6', { pass, measured: r, threshold: 'gel de 2 s → S.t ≤ 40 ms et serpent ≤ 6 u ; |temps réel − temps de jeu| ≤ 1 % sur 90 s ; 0 pageerror' });
