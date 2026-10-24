// Aides communes aux tests G5 (pilotage) : arène vide à pas de temps fixe, projection monde → écran passant par la
// transformation CSS du canvas (bascule 3D), suivi de la tête image par image, position du serpent.
import { sleep } from '../lib.mjs';

export const SEED = 2030;

/** Arène vide (ni ennemi, ni tir, ni ramassage, ni danger, ni montée de niveau) et pas de temps imposé 1/60 s
 *  (sonde __DT de 90-boot.js, G1) : une image = 16,7 ms de jeu quel que soit le temps réel. */
/** opts.noFire : les armes ne tirent plus (weapons.update neutralisé, projectiles vidés) — indispensable aux mesures de
 *  pixels autour de la tête : les tirs du canon avant traversent l'anneau et le nœud d'attente d'une image à l'autre. */
export async function emptyArena(page, opts = {}) {
  await page.evaluate((noFire) => {
    const M = window.__M, S = window.__S; const o = M.levels.update;
    M.levels.update = function (dt) { const r = o.apply(this, arguments); S.enemies.length = 0; S.ebullets.length = 0; S.pickups.length = 0; if (M.levels.hazards) M.levels.hazards.length = 0; S.xp = 0; S.lvlUps = 0; S.xpNext = 1e9; if (noFire) { S.bullets.length = 0; if (S.drones) S.drones.length = 0; } return r; };
    if (noFire && M.weapons) M.weapons.update = function () {};
    window.__DT = 1 / 60;
  }, !!opts.noFire);
}

/** Pose la tête (et vide la trace du corps derrière elle par un rail neuf : _ra/_rw effacés). */
export async function setSnake(page, x, y, ang) {
  await page.evaluate(([x, y, ang]) => { const s = window.__S.snake; s.x = x; s.y = y; if (ang != null) s.ang = ang; s._ra = undefined; s._rw = undefined; s._rw2 = undefined; }, [x, y, ang]);
}

/** Projection monde → écran. window.__toScreen(wx, wy) → { x, y } en pixels CSS du viewport, en passant par la même
 *  chaîne que drawWorld (centre, rotation, échelles sx = W / view.w, sy = H / view.h, caméra) PUIS par la
 *  transformation CSS réellement posée sur le canvas (perspective de la bascule) via un calque DOM jumeau :
 *  c'est la position à laquelle le compositeur affiche le point. window.__headScreen() → { fx, fy, persp, ... }
 *  fractions de la largeur et de la hauteur de l'écran. */
export async function installToScreen(page) {
  await page.evaluate(() => {
    const S = window.__S, M = window.__M, cv = document.getElementById('game');
    const ov = document.createElement('div'); ov.id = 's2probeOv';
    Object.assign(ov.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', transformOrigin: '50% 50%', zIndex: 999, visibility: 'hidden' });
    const mk = document.createElement('div'); Object.assign(mk.style, { position: 'absolute', width: '1px', height: '1px' }); ov.appendChild(mk);
    document.body.appendChild(ov);
    window.__mapState = function () {
      const W = innerWidth, H = innerHeight;
      return { W, H, cx: S.cam.x, cy: S.cam.y, sx: W / S.view.w, sy: H / S.view.h, rt: M.phases.rot(), zoom: M.phases.zoom(), persp: M.phases.persp() * 180 / Math.PI, cssT: cv.style.transform || '' };
    };
    window.__toScreen = function (wx, wy, st) {
      st = st || window.__mapState();
      const X = (wx - st.cx) * st.sx, Y = (wy - st.cy) * st.sy, c = Math.cos(st.rt), s = Math.sin(st.rt);
      const px = st.W / 2 + X * c - Y * s, py = st.H / 2 + X * s + Y * c;
      if (!st.cssT) return { x: px, y: py, px, py };
      ov.style.width = st.W + 'px'; ov.style.height = st.H + 'px';
      ov.style.transform = st.cssT; ov.style.transformOrigin = cv.style.transformOrigin || '50% 50%';
      mk.style.left = px + 'px'; mk.style.top = py + 'px';
      const b = mk.getBoundingClientRect();
      return { x: b.left, y: b.top, px, py };
    };
    window.__headScreen = function () {
      const s = S.snake; if (!s) return null;
      const st = window.__mapState(); const p = window.__toScreen(s.x, s.y, st);
      return { fx: p.x / st.W, fy: p.y / st.H, x: p.x, y: p.y, persp: st.persp, zoom: st.zoom, ang: s.ang, wx: s.x, wy: s.y };
    };
  });
}

/** Suivi de la tête à chaque image (après l'image du jeu) : window.__hs = [{ fi, fx, fy, persp, t }] en phase play. */
export async function installHeadTracker(page) {
  await page.evaluate(() => {
    const S = window.__S; window.__hs = [];
    (function tick() { requestAnimationFrame(tick); if (S.phase === 'play' && !S.paused && S.snake) { const h = window.__headScreen(); window.__hs.push({ fi: window.__fi || 0, fx: +h.fx.toFixed(4), fy: +h.fy.toFixed(4), persp: +h.persp.toFixed(1), t: S.t, wx: +h.wx.toFixed(0), wy: +h.wy.toFixed(0) }); } })();
  });
}
export async function pullHead(page, clear = true) { return page.evaluate(c => { const a = window.__hs.slice(); if (c) window.__hs.length = 0; return a; }, clear); }

/** Attend (temps réel, scrutation 50 ms) qu'une expression évaluée dans la page soit vraie ; rend false au bout de ms. */
export async function waitUntil(page, src, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(src)) return true; await sleep(50); }
  return false;
}

export const deg = r => +(r * 180 / Math.PI).toFixed(2);
export const norm = a => Math.atan2(Math.sin(a), Math.cos(a));

/** Horloge en pause : amène la tête à mi-cellule du treillis ortho (x ≡ SP/2 mod SP, ± 3 u) en comptant les images
 *  nécessaires à 150 u/s (2,5 u par image), puis vérifie ; jette si la tête n'y est pas (vitesse différente, rail perdu). */
export async function advanceToMidCell(ctx, SP) {
  const { page } = ctx;
  const { clockStep } = await import('../lib.mjs');
  const read = () => page.evaluate(() => { const s = window.__S.snake; return { x: s.x, y: s.y, ang: s.ang, speed: s.speed, railed: window.__M.phases.railed() }; });
  const st0 = await read();
  const off0 = st0.x - Math.floor(st0.x / SP) * SP;
  const perFrame = st0.speed / 60;
  let steps = Math.round((((SP * 0.5 - off0) % SP) + SP) % SP / perFrame);
  if (steps > 0) await clockStep(ctx, steps);
  let st = await read(), off = st.x - Math.floor(st.x / SP) * SP;
  for (let k = 0; k < 8 && Math.abs(off - SP * 0.5) > 3; k++) { await clockStep(ctx, 1); st = await read(); off = st.x - Math.floor(st.x / SP) * SP; steps++; }
  if (Math.abs(off - SP * 0.5) > 3) throw new Error('tête jamais à mi-cellule (x=' + st.x.toFixed(1) + ', départ ' + st0.x.toFixed(1) + ', pas ' + SP + ', ' + steps + ' images)');
  return { x0: +st0.x.toFixed(1), steps, x: +st.x.toFixed(1), y: +st.y.toFixed(1), ang: st.ang, railed: st.railed, off: +off.toFixed(1) };
}
