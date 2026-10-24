// G5 test 4 — arc de boost autour de la tête (bureau 1440×900 et iPhone 13 paysage), captures d'écran réelles à
// l'image près (horloge factice). Serpent en croisière droite sur rail ortho forcé, tête à mi-cellule (aucune ligne
// verticale dans l'anneau), arène vide. R = HEAD_R × échelle écran (px CSS).
//   - boostE forcé à 50 : luminance moyenne (Rec. 709) de l'anneau écran [1,9 R ; 2,5 R] côté rempli (la moitié
//     angulaire contiguë la plus lumineuse, 12 secteurs de 15°) ≥ +10 points vs la même moitié à boostE = 100 ;
//   - boostE = 10 : canal R ≥ 2 × canal G sur les pixels de l'anneau allumés par l'arc (ΔL ≥ 20 vs boostE = 100,
//     ≥ 10 pixels ; géométrie figée entre les captures, voir plus bas) ;
//   - épaisseur : largeur à mi-hauteur du pic radial ΔL (rayons du côté rempli, r ∈ [1,5 R ; 3 R]) = 3 ± 1 px CSS.
import { launchDesktop, launchPhone, startGame, clockPause, clockStep, clockResume, sleep, save, finish, deadline } from '../lib.mjs';
import { shotClip, sectorMeans, meanWhere, radialProfile, fwhm, lum, px } from '../px.mjs';
import { SEED, emptyArena, setSnake, installToScreen, advanceToMidCell } from './g5lib.mjs';
deadline(240, 4);
const THRESH = 'boostE 50 : ΔL(anneau [1,9R;2,5R], côté rempli) ≥ +10 vs 100 ; boostE 10 : R ≥ 2G (pixels de l\'arc) ; épaisseur FWHM 3 ± 1 px CSS ; sur 1440×900 et iPhone 13 paysage';
const m = {};

async function measure(ctx, label) {
  const { page } = ctx;
  const r = {};
  // pas d'invulnérabilité de test : elle fait clignoter la tête en blanc toutes les 60 ms ; l'arène vide suffit
  await startGame(ctx, { seed: SEED });
  await emptyArena(page, { noFire: true });
  await installToScreen(page);
  await page.evaluate(() => window.__M.phases.forceGrid('ortho'));
  await setSnake(page, 700, 800, 0);
  await sleep(2200);                                   // rail, zoom et caméra posés
  const SP = await page.evaluate(() => window.__M.phases.railSpacing || 330);
  await clockPause(ctx);
  const mc = await advanceToMidCell(ctx, SP);
  const st = { x: mc.x, y: mc.y, ang: mc.ang, railed: mc.railed };
  r.start = { x: +st.x.toFixed(1), y: +st.y.toFixed(1), railed: st.railed, spacing: SP };
  /* Géométrie figée pendant les captures : pas de temps 1 µs (window.__DT) — S.t, la tête, le corps et les halos ne
     bougent plus d'une image à l'autre, seul boostE change ; les pixels dont la luminance monte sont donc ceux de
     l'arc et rien d'autre (avec 1/60 s par image, les écailles du corps et le halo, déplacés de trois images,
     entraient dans la sélection « ΔL ≥ 20 » et tiraient la moyenne vers le cyan). */
  await page.evaluate(() => { window.__DT = 1e-6; });
  async function capture(boostE) {
    await page.evaluate(v => { const s = window.__S.snake; s.boostE = v; s.boosting = false; }, boostE);
    await clockStep(ctx, 1);
    const h = await page.evaluate(() => { const S = window.__S, s = S.snake, st = window.__mapState(); const p = window.__toScreen(s.x, s.y, st); return { x: p.x, y: p.y, R: window.__K.HEAD_R * st.sx, sx: st.sx, sy: st.sy, zoom: st.zoom, boostE: s.boostE, boosting: s.boosting, persp: st.persp, W: st.W, H: st.H }; });
    const half = Math.ceil(3.3 * h.R + 6);
    const clip = { x: Math.round(h.x - half), y: Math.round(h.y - half), width: 2 * half, height: 2 * half };
    const img = await shotClip(ctx, clip);
    const pr = img.pr;
    return { img, pr, cx: (h.x - clip.x) * pr, cy: (h.y - clip.y) * pr, R: h.R, Rpx: h.R * pr, h, clip };
  }
  const C100 = await capture(100);
  const C100b = await capture(100);                    // bruit de fond entre deux images à 100
  const C50 = await capture(50);
  const C10 = await capture(10);
  await page.screenshot({ path: new URL('../out/g5-t4-' + label + '.png', import.meta.url).pathname });
  await page.evaluate(() => { window.__DT = 1 / 60; });
  await clockResume(ctx);
  r.head = { x: +C50.h.x.toFixed(1), y: +C50.h.y.toFixed(1), Rcss: +C50.R.toFixed(2), zoom: +C50.h.zoom.toFixed(3), pr: C50.pr, persp: +C50.h.persp.toFixed(1), boostEAt50: +C50.h.boostE.toFixed(1), boostEAt100: +C100.h.boostE.toFixed(1) };
  // secteurs de l'anneau [1,9R ; 2,5R]
  const NB = 24;
  const sec = c => sectorMeans(c.img, c.cx, c.cy, 1.9 * c.Rpx, 2.5 * c.Rpx, NB);
  const s100 = sec(C100), s100b = sec(C100b), s50 = sec(C50), s10 = sec(C10);
  // moitié contiguë la plus lumineuse à 50
  let best = 0, bestL = -1;
  for (let k = 0; k < NB; k++) { let sum = 0; for (let j = 0; j < NB / 2; j++) sum += s50[(k + j) % NB].l; if (sum > bestL) { bestL = sum; best = k; } }
  const half = Array.from({ length: NB / 2 }, (_, j) => (best + j) % NB);
  const avg = (s, idx) => +(idx.reduce((a, k) => a + s[k].l, 0) / idx.length).toFixed(2);
  r.filledHalfStartDeg = best * 360 / NB;
  r.lumHalf100 = avg(s100, half); r.lumHalf100b = avg(s100b, half); r.lumHalf50 = avg(s50, half); r.lumHalf10 = avg(s10, half);
  r.deltaHalf50 = +(r.lumHalf50 - r.lumHalf100).toFixed(2);
  r.noise100 = +(r.lumHalf100b - r.lumHalf100).toFixed(2);
  r.sectorDelta50 = s50.map((s, k) => +(s.l - s100[k].l).toFixed(1));
  r.sectorDelta10 = s10.map((s, k) => +(s.l - s100[k].l).toFixed(1));
  // pixels allumés par l'arc à 10 : ΔL ≥ 20 vs 100 (même géométrie : la tête a bougé de ≈ 3 images, on compare au
  // pixel de même position relative à la tête)
  const lit = (c, ref) => meanWhere(c.img, c.cx - 2.6 * c.Rpx, c.cy - 2.6 * c.Rpx, c.cx + 2.6 * c.Rpx, c.cy + 2.6 * c.Rpx, (x, y, rr, gg, bb) => {
    const dx = x + 0.5 - c.cx, dy = y + 0.5 - c.cy, d2 = dx * dx + dy * dy, r0 = 1.9 * c.Rpx, r1 = 2.5 * c.Rpx;
    if (d2 < r0 * r0 || d2 > r1 * r1) return false;
    const q = px(ref.img, Math.round(ref.cx + dx - 0.5), Math.round(ref.cy + dy - 0.5));
    if (!q) return false;
    return lum(rr, gg, bb) - lum(q[0], q[1], q[2]) >= 20;
  });
  const L10 = lit(C10, C100), L50 = lit(C50, C100);
  r.lit10 = { n: L10.n, rgb: [L10.r, L10.g, L10.b], ratioRG: +(L10.r / Math.max(1, L10.g)).toFixed(2) };
  r.lit50 = { n: L50.n, rgb: [L50.r, L50.g, L50.b], ratioRG: +(L50.r / Math.max(1, L50.g)).toFixed(2) };
  r.annulusAll10 = (() => { const a = sectorMeans(C10.img, C10.cx, C10.cy, 1.9 * C10.Rpx, 2.5 * C10.Rpx, 1)[0]; return { rgb: [a.r, a.g, a.b], ratioRG: +(a.r / Math.max(1, a.g)).toFixed(2) }; })();
  // épaisseur : profils radiaux ΔL (50 − 100) sur les secteurs allumés (Δ ≥ 5), 3 rayons par secteur
  const widths = [], peaks = [];
  const step = 0.25;                                   // px CSS
  for (let k = 0; k < NB; k++) {
    if (r.sectorDelta50[k] < 5) continue;
    for (const da of [-5, 0, 5]) {
      const a = (k * 360 / NB + da) * Math.PI / 180;
      const p50 = radialProfile(C50.img, C50.cx, C50.cy, a, 1.5 * C50.Rpx, 3.0 * C50.Rpx, step * C50.pr);
      const p100 = radialProfile(C100.img, C100.cx, C100.cy, a, 1.5 * C100.Rpx, 3.0 * C100.Rpx, step * C100.pr);
      const d = p50.map((v, i) => v - p100[i]);
      const f = fwhm(d, 15);
      if (f) { widths.push(f.width * step); peaks.push(+((1.5 * C50.Rpx + f.at * step * C50.pr) / C50.Rpx).toFixed(2)); }
    }
  }
  widths.sort((a, b) => a - b); peaks.sort((a, b) => a - b);
  r.thicknessRays = widths.length;
  r.thicknessMedianCss = widths.length ? +widths[Math.floor(widths.length / 2)].toFixed(2) : null;
  r.thicknessP10 = widths.length ? +widths[Math.floor(widths.length * 0.1)].toFixed(2) : null;
  r.thicknessP90 = widths.length ? +widths[Math.floor(widths.length * 0.9)].toFixed(2) : null;
  r.peakRadiusOverR = peaks.length ? peaks[Math.floor(peaks.length / 2)] : null;
  r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  return r;
}

for (const [label, launch] of [['desk1440', () => launchDesktop(1440, 900, { clock: true })], ['iphone', () => launchPhone({ clock: true })]]) {
  const ctx = await launch();
  try { m[label] = await measure(ctx, label); }
  catch (e) { m[label] = { ...(m[label] || {}), error: String(e && e.stack || e).slice(0, 400) }; }
  finally { await ctx.close(); }
}

const checks = {};
for (const k of ['desk1440', 'iphone']) {
  const r = m[k] || {};
  checks[k + 'Delta50'] = r.deltaHalf50 != null ? r.deltaHalf50 >= 10 : null;
  checks[k + 'RedAt10'] = r.lit10 ? (r.lit10.n >= 10 && r.lit10.rgb[0] >= 2 * r.lit10.rgb[1]) : null;
  checks[k + 'Thickness'] = r.thicknessMedianCss != null ? Math.abs(r.thicknessMedianCss - 3) <= 1 : (r.error ? null : false);
}
m.checks = checks;
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
const code = pass ? 0 : (vals.some(v => v === false) ? 1 : 2);
save('g5-t4.json', m);
const brief = k => { const r = m[k] || {}; return { ...r, sectorDelta50: undefined, sectorDelta10: undefined }; };
finish(4, { pass, measured: { desk1440: brief('desk1440'), iphone: brief('iphone'), checks }, threshold: THRESH, code });
