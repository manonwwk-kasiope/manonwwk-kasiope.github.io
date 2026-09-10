/* G13 t1 — appels canvas par image, butin et tirs ennemis.
   Le compteur est posé sur CanvasRenderingContext2D.prototype AVANT le chargement : il voit tous les
   appels, y compris ceux des canevas hors écran qui pré-rendent les sprites. La scène est FIGÉE comme
   au banc (ennemis vidés, position et vue tenues image par image) pour que le nombre mesuré soit celui
   du butin et des tirs, pas celui d'une partie qui bouge. On mesure trois scènes : à vide, 150 butins,
   500 tirs ennemis ; la première donne le coût de fond, les deux autres le coût de l'objectif.
   Seuils (spec G13) : ≤ 3 createRadialGradient par image et ≤ 400 appels canvas par image à 150 butins ;
   ≤ 3 dégradés et ≤ 1 200 appels à 500 tirs ennemis. */
import { launchDesktop, startGame, save, finish, deadline, sleep } from '../lib.mjs';

deadline(180, 'G13-t1');

const INIT = `(() => {
  const P = CanvasRenderingContext2D.prototype;
  const C = window.__CC = { total: 0, grad: 0, img: 0, frames: 0 };
  for (const k of Object.getOwnPropertyNames(P)) {
    const d = Object.getOwnPropertyDescriptor(P, k);
    if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
    const f = d.value;
    Object.defineProperty(P, k, { value: function () {
      C.total++;
      if (k === 'createRadialGradient') C.grad++;
      else if (k === 'drawImage') C.img++;
      return f.apply(this, arguments);
    }, writable: true, configurable: true });
  }
  const raf = window.requestAnimationFrame.bind(window);
  (function t() { C.frames++; raf(t); })();
})()`;

function poser(n) {
  const S = window.__S, M = window.__M;
  const X = Math.round(window.__K.ARENA_W / 2), Y = Math.round(window.__K.ARENA_H / 2);
  window.__SC = { X, Y, np: n.np, nb: n.nb };
  if (window.__SCSTOP) window.__SCSTOP();
  let vivant = true; window.__SCSTOP = () => { vivant = false; };
  const tenir = () => {
    if (!vivant) return;
    requestAnimationFrame(tenir);
    const P = window.__SC;
    S.snake.x = P.X; S.snake.y = P.Y; S.snake.invuln = 1e9; S.snake.ghost = 1e9;
    S.snake.hp = S.snake.maxHp; S.snake.len = 30;
    S.cam.x = P.X; S.cam.y = P.Y;
    S.enemies.length = 0; S.bullets.length = 0; S.pools.length = 0;
    /* Les tirs injectés sont absorbés par le corps du serpent (G6) et chaque absorption sème des
       particules : sans ce nettoyage, la mesure compte les effets, pas les tirs. */
    try { M.fx.reset(); } catch (e) {}
    S.pickups.length = 0; S.ebullets.length = 0;
    const rw = S.view.w * 0.42, rh = S.view.h * 0.42;
    for (let i = 0; i < P.np; i++) {
      const a = i * 2.399963, r = 0.3 + 0.7 * (i / P.np);
      S.pickups.push({ kind: i % 12 === 0 ? 'core' : 'energy', x: P.X + Math.cos(a) * rw * r, y: P.Y + Math.sin(a) * rh * r,
        vx: 0, vy: 0, t: 0.5, r: i % 12 === 0 ? 11 : 7, val: 1 });
    }
    for (let i = 0; i < P.nb; i++) {
      const a = i * 2.399963, r = 0.3 + 0.7 * (i / P.nb);
      S.ebullets.push({ x: P.X + Math.cos(a) * rw * r, y: P.Y + Math.sin(a) * rh * r, vx: 0, vy: 0,
        r: 5, life: 9e9, dmg: 0, color: '#ff5c3a' });
    }
    S.pxEff = 1; S.partEff = 1;
  };
  requestAnimationFrame(tenir);
  return { ok: true };
}

async function mesurer(page, np, nb, frames = 150) {
  await page.evaluate(poser, { np, nb });
  await sleep(700);                                   // les sprites manquants se créent ici, hors mesure
  const a = await page.evaluate(() => ({ ...window.__CC }));
  await page.waitForFunction(f => window.__CC.frames >= f, a.frames + frames, { timeout: 60000 });
  const b = await page.evaluate(() => ({ ...window.__CC, np: window.__S.pickups.length, nb: window.__S.ebullets.length,
    vue: [Math.round(window.__S.view.w), Math.round(window.__S.view.h)] }));
  const df = b.frames - a.frames;
  return { np, nb, frames: df, total: +((b.total - a.total) / df).toFixed(1), grad: +((b.grad - a.grad) / df).toFixed(2),
    img: +((b.img - a.img) / df).toFixed(1), vue: b.vue };
}

const ctx = await launchDesktop(1920, 1080, { init: [INIT], unthrottled: true });
let r = {};
try {
  await ctx.page.evaluate(() => { window.__SEED = 2030; window.__DT = 1 / 60; });
  await startGame(ctx, { seed: 2030 });
  await ctx.page.waitForFunction(() => window.__S.enemies.length > 0, null, { timeout: 25000 });
  r.vide = await mesurer(ctx.page, 0, 0);
  r.butin150 = await mesurer(ctx.page, 150, 0);
  r.tirs500 = await mesurer(ctx.page, 0, 500);
  r.pageErrors = ctx.pageErrors.length;
  r.err = await ctx.page.evaluate(() => window.__ERR.count);
} finally { await ctx.close(); }

/* Décomposition : ce que coûte un butin, et ce que coûte le décor sans lui. Un sprite posé à une position
   qui lui est propre vaut AU MOINS un drawImage : le plancher arithmétique du seuil « ≤ 400 appels par
   image avec 150 butins en vue » est donc « décor + 150 ». Ces deux nombres disent si le seuil est tenu,
   et sinon, lequel des deux termes l'en empêche. */
r.parButin = +((r.butin150.total - r.vide.total) / 150).toFixed(2);
r.parTir = +((r.tirs500.total - r.vide.total) / 500).toFixed(2);
r.plancherButin = +(r.vide.total + 150).toFixed(1);
const pass = r.butin150.grad <= 3 && r.butin150.total <= 400 && r.tirs500.grad <= 3 && r.tirs500.total <= 1200
  && r.pageErrors === 0 && r.err === 0;
save('G13-t1-appels.json', { test: 'G13-t1', pass, measured: r });
finish('G13-t1', { pass, measured: r,
  threshold: '150 butins : ≤ 3 createRadialGradient/image et ≤ 400 appels canvas/image ; 500 tirs ennemis : ≤ 3 et ≤ 1 200 ; 0 pageerror, __ERR.count 0' });
