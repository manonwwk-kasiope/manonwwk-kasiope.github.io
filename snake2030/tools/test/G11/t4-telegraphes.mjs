/* G11 — test 4 : TÉLÉGRAPHES ET TIRS ENNEMIS, sur iPhone 13 paysage.
   window.__DT est fixé (1/60, posé par installAutoPilot) : la phase des
   pointillés — lineDashOffset = −S.t/26 et S.t/18 — est reproductible.
   COUVERTURE ET CONTRASTE SONT SÉPARÉS. Le tracé est en pointillés à rapport
   cyclique borné : un seuil « ≥ 90 % des points » serait arithmétiquement
   inatteignable puisque les vides SONT le motif.
     - ligne de visée, 16 points régulièrement espacés : au moins 45 % des points
       sont de l'ENCRE (luminance supérieure d'au moins 10 à celle du fond local
       relevé à 6 px perpendiculairement, moyenne des deux côtés), et sur CES
       points le contraste WCAG ligne/fond est ≥ 2:1 dans ≥ 90 % des cas ;
     - cercle d'armement de mine, 24 points : ≥ 33 % d'encre, ≥ 1,6:1 sur ≥ 90 % ;
     - balle ennemie : pixel central et pixel à b.r + 1, relevés DANS LA MÊME
       IMAGE — noyau ≤ 60/255 de luminance Rec.709, contour ≥ 200/255 (écart
       ≥ 140). L'énoncé d'origine (« contour ≥ centre + 60 » sur un coeur jaune
       #ffe45e à 224,1/255) était impossible : le blanc pur plafonne à 255.
   Les tailles de pointillés effectivement rendues sont rapportées en px CSS
   d'écran (le « quoi » demande ≥ 8 px). */
import { launchPhone, startGame, installGod, installProbe, installAutoPilot, playDet,
         sleep, save, finish, deadline } from '../lib.mjs';
deadline(600, 'G11-t4-telegraphes');

const SEED = 20301;
const SONDE = function () {
  const S = window.__S, M = window.__M;
  const cv = document.getElementById('game'), g = cv.getContext('2d');
  const T = window.__T4 = { visee: [], mine: [], balle: [], dash: null, frames: 0 };
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const rel = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  const wcag = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const l709 = (r, gg, b) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;

  function geo() {
    const cssW = parseFloat(cv.style.width) || cv.clientWidth, cssH = parseFloat(cv.style.height) || cv.clientHeight;
    const X = S.rx || { dpr: cv.width / cssW, sx: cssW / Math.abs(S.view.w), sy: cssH / Math.abs(S.view.h), rt: 0, ox: 0, oy: 0, cx: S.cam.x, cy: S.cam.y, bw: cssW, bh: cssH };
    return { cssW, cssH, dpr: X.dpr, sx: X.sx, sy: X.sy, c: Math.cos(X.rt), sn: Math.sin(X.rt), X };
  }
  const w2b = (G, wx, wy) => { const px = (wx - G.X.cx + G.X.ox) * G.sx, py = (wy - G.X.cy + G.X.oy) * G.sy;
    return [G.dpr * (G.X.bw / 2 + px * G.c - py * G.sn), G.dpr * (G.X.bh / 2 + px * G.sn + py * G.c)]; };
  function px(img, W, x0, y0, x, y) { const i = ((y - y0) * W + (x - x0)) * 4; return [img[i], img[i + 1], img[i + 2]]; };

  /* Un relevé = une bande de tampon autour du segment sondé, lue en une fois. */
  function bande(pts, marge) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    x0 = Math.max(0, Math.floor(x0 - marge)); y0 = Math.max(0, Math.floor(y0 - marge));
    x1 = Math.min(cv.width, Math.ceil(x1 + marge)); y1 = Math.min(cv.height, Math.ceil(y1 + marge));
    if (x1 - x0 < 4 || y1 - y0 < 4) return null;
    return { x0, y0, W: x1 - x0, H: y1 - y0, d: g.getImageData(x0, y0, x1 - x0, y1 - y0).data, x1, y1 };
  }
  function relevePoints(pts, nx, ny, off) {
    const b = bande(pts, off + 4);
    if (!b) return null;
    const dedans = (x, y) => x >= b.x0 && y >= b.y0 && x < b.x1 && y < b.y1;
    let encre = 0, ok = 0, tot = 0;
    const detail = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], n = [nx[i], ny[i]];
      const X = Math.round(p[0]), Y = Math.round(p[1]);
      const A = [Math.round(p[0] + n[0] * off), Math.round(p[1] + n[1] * off)];
      const B = [Math.round(p[0] - n[0] * off), Math.round(p[1] - n[1] * off)];
      if (!dedans(X, Y) || !dedans(A[0], A[1]) || !dedans(B[0], B[1])) continue;
      tot++;
      const c0 = px(b.d, b.W, b.x0, b.y0, X, Y);
      const a0 = px(b.d, b.W, b.x0, b.y0, A[0], A[1]);
      const b0 = px(b.d, b.W, b.x0, b.y0, B[0], B[1]);
      const li = l709(c0[0], c0[1], c0[2]);
      const lf = (l709(a0[0], a0[1], a0[2]) + l709(b0[0], b0[1], b0[2])) / 2;
      if (li >= lf + 10) {
        encre++;
        const cr = wcag(rel(c0[0], c0[1], c0[2]), (rel(a0[0], a0[1], a0[2]) + rel(b0[0], b0[1], b0[2])) / 2);
        detail.push(+cr.toFixed(2));
        // diagnostic (aucun seuil touché) : de quoi est fait un point qui échoue
        if (cr < 2.2 && T.rate.length < 40) T.rate.push({ k: i, cr: +cr.toFixed(2), ink: c0, a: a0, b: b0 });
        ok++;
      }
    }
    return { tot, encre, cr: detail };
  }

  if (!T.rate) T.rate = [];
  window.__t4 = function () {
    if (S.phase !== 'play') return 0;
    const G = geo(); let n = 0;
    T.frames++;
    T.dash = { aim: window.__K ? null : null };
    // ---- ligne de visée d'un artilleur qui vise
    for (const e of S.enemies) {
      if (e.dead || e.type !== 'shooter' || !(e.aimT > 0)) continue;
      const L = e.bSpeed * 2.2;
      const ax = Math.cos(e.aimA), ay = Math.sin(e.aimA);
      const pts = [], nx = [], ny = [];
      for (let k = 1; k <= 16; k++) {
        const t = k / 17;
        const p = w2b(G, e.x + ax * L * t, e.y + ay * L * t);
        const q = w2b(G, e.x + ax * L * t - ay * 10, e.y + ay * L * t + ax * 10);
        const dx = q[0] - p[0], dy = q[1] - p[1], m = Math.hypot(dx, dy) || 1;
        pts.push(p); nx.push(dx / m); ny.push(dy / m);
      }
      const r = relevePoints(pts, nx, ny, 6 * G.dpr);
      if (r && r.tot >= 12) { T.visee.push(r); n++; }
    }
    // ---- cercle d'armement d'une mine non armée
    for (const e of S.enemies) {
      if (e.dead || e.type !== 'mine' || e.st === 1) continue;
      const pts = [], nx = [], ny = [];
      for (let k = 0; k < 24; k++) {
        const a = k * Math.PI / 12;
        pts.push(w2b(G, e.x + Math.cos(a) * e.armR, e.y + Math.sin(a) * e.armR));
        const p0 = w2b(G, e.x, e.y), p1 = w2b(G, e.x + Math.cos(a) * e.armR, e.y + Math.sin(a) * e.armR);
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], m = Math.hypot(dx, dy) || 1;
        nx.push(dx / m); ny.push(dy / m);
      }
      const r = relevePoints(pts, nx, ny, 6 * G.dpr);
      if (r && r.tot >= 18) { T.mine.push(r); n++; }
    }
    // ---- balle ennemie : centre et b.r + 1, DANS LA MÊME IMAGE
    for (const b of S.ebullets) {
      const p = w2b(G, b.x, b.y);
      const q = w2b(G, b.x + (b.r + 1), b.y);
      const R = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const bd = bande([p], R + 4);
      if (!bd) continue;
      const X = Math.round(p[0]), Y = Math.round(p[1]);
      if (X < bd.x0 || Y < bd.y0 || X >= bd.x1 || Y >= bd.y1) continue;
      const c0 = px(bd.d, bd.W, bd.x0, bd.y0, X, Y);
      // contour : médiane de 12 relevés sur le cercle de rayon b.r + 1
      const vals = [];
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6, x = Math.round(p[0] + Math.cos(a) * R), y = Math.round(p[1] + Math.sin(a) * R);
        if (x < bd.x0 || y < bd.y0 || x >= bd.x1 || y >= bd.y1) continue;
        const c = px(bd.d, bd.W, bd.x0, bd.y0, x, y);
        vals.push(l709(c[0], c[1], c[2]));
      }
      if (vals.length < 8) continue;
      vals.sort((u, v) => u - v);
      T.balle.push({ noyau: +l709(c0[0], c0[1], c0[2]).toFixed(1), contour: +vals[vals.length >> 1].toFixed(1), rBuf: +R.toFixed(1) });
      n++;
    }
    // ---- taille des pointillés effectivement rendus, en px CSS d'écran
    if (!T.dashPx) {
      let f = 1;
      try { const m = new DOMMatrix(getComputedStyle(cv).transform);
        const a = m.transformPoint({ x: -50, y: 0, z: 0, w: 1 }), b2 = m.transformPoint({ x: 50, y: 0, z: 0, w: 1 });
        f = Math.hypot(b2.x / b2.w - a.x / a.w, b2.y / b2.w - a.y / a.w) / 100; } catch (e) {}
      T.dashPx = { uParPxCss: +(G.sy * f).toFixed(4), aim: +(30 * G.sy * f).toFixed(2), scan: +(22 * G.sy * f).toFixed(2), big: +(34 * G.sy * f).toFixed(2) };
    }
    return n;
  };
};

const ctx = await launchPhone();
await installProbe(ctx.page);
await installGod(ctx.page);
await installAutoPilot(ctx.page, { mode: 'touch', seed: 2030 });
await startGame(ctx, { seed: SEED });
await ctx.page.evaluate(SONDE);
await ctx.page.evaluate(() => { (function t() { requestAnimationFrame(t); const S = window.__S; S.opt.px = (S.opt.px === 1.5 ? 1.4999 : 1.5); })(); });
await playDet(ctx, 150, { period: 90, onTick: async () => { for (let k = 0; k < 3; k++) await ctx.page.evaluate(() => window.__t4()); } });
const T = await ctx.page.evaluate(() => window.__T4);
const dt = await ctx.page.evaluate(() => window.__DT);
const err = await ctx.page.evaluate(() => window.__ERR.count);
await ctx.close();

function depouille(rows, seuilCr) {
  const cov = rows.map(r => 100 * r.encre / r.tot);
  const crs = rows.flatMap(r => r.cr);
  const nOk = crs.filter(c => c >= seuilCr).length;
  cov.sort((a, b) => a - b);
  return { echantillons: rows.length, pointsEncre: crs.length,
    couvertureMediane: cov.length ? +cov[cov.length >> 1].toFixed(1) : 0,
    couvertureMin: cov.length ? +cov[0].toFixed(1) : 0,
    pctCouvertureAuSeuil: null,
    pctContrasteOk: crs.length ? +(100 * nOk / crs.length).toFixed(1) : 0,
    crMedian: crs.length ? +crs.slice().sort((a, b) => a - b)[crs.length >> 1].toFixed(2) : 0 };
}
const V = depouille(T.visee, 2), Mn = depouille(T.mine, 1.6);
V.pctCouvertureAuSeuil = T.visee.length ? +(100 * T.visee.filter(r => 100 * r.encre / r.tot >= 45).length / T.visee.length).toFixed(1) : 0;
Mn.pctCouvertureAuSeuil = T.mine.length ? +(100 * T.mine.filter(r => 100 * r.encre / r.tot >= 33).length / T.mine.length).toFixed(1) : 0;
const B = T.balle;
const bOk = B.filter(b => b.noyau <= 60 && b.contour >= 200 && b.contour - b.noyau >= 140).length;
const med = a => a.length ? +a.slice().sort((x, y) => x - y)[a.length >> 1].toFixed(1) : null;

const okViseeCouv = T.visee.length >= 10 && V.couvertureMediane >= 45;
const okViseeCr = T.visee.length >= 10 && V.pctContrasteOk >= 90;
const okMineCouv = T.mine.length >= 10 && Mn.couvertureMediane >= 33;
const okMineCr = T.mine.length >= 10 && Mn.pctContrasteOk >= 90;
const okBalle = B.length >= 10 && bOk / B.length >= 0.9;
const pass = okViseeCouv && okViseeCr && okMineCouv && okMineCr && okBalle;
const r = {
  test: 'G11-t4-telegraphes', pass,
  seuilsOk: { sightCouverture: okViseeCouv, sightContraste: okViseeCr, mineCouverture: okMineCouv, mineContraste: okMineCr, balle: okBalle },
  seuils: 'ligne de visée : ≥ 45 % de points d’encre, contraste ≥ 2:1 sur ≥ 90 % de ceux-là ; cercle d’armement : ≥ 33 % d’encre, ≥ 1,6:1 sur ≥ 90 % ; balle ennemie : noyau ≤ 60/255 et contour ≥ 200/255 (écart ≥ 140), relevés dans la même image',
  protocole: { profil: 'iPhone 13 paysage', DT: dt, frames: T.frames, err },
  measured: {
    ligneDeVisee: V, cercleArmement: Mn,
    balleEnnemie: { echantillons: B.length, noyauMedian: med(B.map(b => b.noyau)), contourMedian: med(B.map(b => b.contour)),
      pctConforme: B.length ? +(100 * bOk / B.length).toFixed(1) : 0, exemples: B.slice(0, 6) },
    pointillesPxCssEcran: T.dashPx,
    diagPointsFaibles: (T.rate || []).slice(0, 20),
  },
};
save('G11-t4-telegraphes.json', r);
finish(r.test, { pass, measured: r.measured, threshold: r.seuils });
