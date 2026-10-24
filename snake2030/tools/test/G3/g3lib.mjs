// Aides communes aux tests G3 (souris sur bureau) : partie déterministe en pilotage libre, position de la tête à
// l'écran par l'API que l'objectif impose (phases.worldToScreen), lecture de S.input synchronisée sur l'image.
import { installProbe, installInvuln, startGame, waitFrames, sleep } from '../lib.mjs';
import { emptyArena } from '../G5/g5lib.mjs';
export { norm, setSnake, waitUntil } from '../G5/g5lib.mjs';

export const SEED = 2030;

/** Partie lancée (graine fixe), serpent invulnérable, pas de temps imposé 1/60 (arène vide sauf opts.empty === false),
 *  phase ESPACE forcée (pilotage libre : ni treillis, ni rotation, ni bascule — la caméra ne fait que suivre la tête).
 *  Rend l'état d'environnement utile au rapport. */
export async function prepPlay(ctx, opts = {}) {
  const { page } = ctx;
  await installProbe(page);                                  // compteur d'images window.__fi
  await installInvuln(page);
  await startGame(ctx, { seed: opts.seed == null ? SEED : opts.seed });
  await sleep(300);
  if (opts.empty === false) { if (opts.fixedDt !== false) await page.evaluate(() => { window.__DT = 1 / 60; }); }
  else await emptyArena(page);
  await page.evaluate(() => { const M = window.__M; if (M.phases && M.phases.forcePhase) M.phases.forcePhase(1); });
  await waitFrames(page, 5);
  return page.evaluate(() => { const S = window.__S, M = window.__M; const st = M.phases.state();
    return { desktop: S.desktop, phase: st.phase, railed: st.railed, rot: +st.rot.toFixed(3), persp: +st.perspDeg.toFixed(1), dt: +S.dt.toFixed(5),
      mouseOpt: S.opt.mouse === undefined ? null : S.opt.mouse, ang: +S.snake.ang.toFixed(4), inner: [innerWidth, innerHeight] }; });
}

/** API que l'objectif doit exposer : phases.worldToScreen(x, y) → { sx, sy } en px CSS. */
export async function api(page) {
  return page.evaluate(() => {
    const M = window.__M, ok = !!(M.phases && typeof M.phases.worldToScreen === 'function');
    let shape = null;
    if (ok) { try { const s = window.__S.snake; const p = M.phases.worldToScreen(s.x, s.y); shape = p && typeof p.sx === 'number' && typeof p.sy === 'number'; } catch (e) { shape = 'throw:' + String(e && e.message).slice(0, 80); } }
    return { worldToScreen: ok, shape, mouseOpt: window.__S.opt.mouse === undefined ? null : window.__S.opt.mouse };
  });
}

/** Tête à l'écran (px CSS) et direction ÉCRAN de son cap (dir), calculée par deux projections : elle inclut la rotation
 *  de caméra et la transformation CSS du canvas, quelles qu'elles soient. */
export async function head(page) {
  return page.evaluate(() => {
    const S = window.__S, s = S.snake, P = window.__M.phases;
    const a = P.worldToScreen(s.x, s.y), b = P.worldToScreen(s.x + 100 * Math.cos(s.ang), s.y + 100 * Math.sin(s.ang));
    return { sx: a.sx, sy: a.sy, dir: Math.atan2(b.sy - a.sy, b.sx - a.sx), ang: s.ang, aim: s.aim, x: s.x, y: s.y, rot: P.rot(), fi: window.__fi || 0 };
  });
}

/** Déplace la souris en deux événements distants de 10 px (déplacement cumulé ≥ 8 px : la souris devient active en
 *  mode 'auto' même si c'est son premier mouvement). */
export async function mouseTo(page, x, y) {
  await page.mouse.move(x - 10, y);
  await page.mouse.move(x, y);
}

/** S.input (et cap, visée) lu depuis un rappel requestAnimationFrame posé APRÈS frame() du jeu : la valeur rendue est
 *  celle calculée par la n-ième image qui suit l'appel (n = frames), jamais un état intermédiaire. */
export async function readInput(page, frames = 1) {
  return page.evaluate(n => new Promise(res => {
    let k = 0;
    (function f() { requestAnimationFrame(() => { if (++k >= n) { const S = window.__S, s = S.snake; res({ jx: S.input.jx, jy: S.input.jy, jmag: S.input.jmag, jactive: S.input.jactive, boost: S.input.boost, special: S.input.special, ult: S.input.ult, ang: s ? s.ang : null, aim: s ? s.aim : null, fi: window.__fi || 0, t: S.t }); } else f(); }); })();
  }), frames);
}
export const INPUT_KEYS = ['jx', 'jy', 'jmag', 'jactive', 'boost', 'special', 'ult'];
export function pickInput(o) { const r = {}; for (const k of INPUT_KEYS) r[k] = o[k]; return r; }
export function sameInput(a, b) { return INPUT_KEYS.every(k => a[k] === b[k]); }
export const r3 = v => (typeof v === 'number' ? +v.toFixed(3) : v);

/** Attend `ms` millisecondes de TEMPS DE JEU (S.t, pas fixe 1/60 → 60 images par seconde) et rend S.input, cap et visée
 *  lus à la première image où l'échéance est atteinte (même rappel rAF posé après frame() que readInput). */
export async function waitGameMs(page, ms) {
  return page.evaluate(ms => new Promise(res => {
    const S = window.__S, t0 = S.t, f0 = window.__fi || 0;
    (function f() { requestAnimationFrame(() => { if (S.t - t0 >= ms) { const s = S.snake; res({ jx: S.input.jx, jy: S.input.jy, jmag: S.input.jmag, jactive: S.input.jactive, boost: S.input.boost, special: S.input.special, ult: S.input.ult, ang: s ? s.ang : null, aim: s ? s.aim : null, fi: window.__fi || 0, frames: (window.__fi || 0) - f0, gameMs: +(S.t - t0).toFixed(1) }); } else f(); }); })();
  }), ms);
}

/** Attend que la tête soit stable à l'écran (déplacement < 0,3 px sur 3 images : caméra d'avance rattrapée), 120 images au plus. */
export async function settleHead(page, maxFrames = 120) {
  let h = await head(page), n = 0;
  while (n < maxFrames) {
    await waitFrames(page, 3); n += 3;
    const g = await head(page);
    const d = Math.hypot(g.sx - h.sx, g.sy - h.sy); h = g;
    if (d < 0.3) return { frames: n, drift: +d.toFixed(2), settled: true };
  }
  return { frames: n, settled: false };
}
