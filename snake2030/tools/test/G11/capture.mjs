/* G11 — capture d'écran instrumentée, partagée par les tests 2 et 6.
   Tout le comptage se fait DANS LA PAGE, à l'intérieur d'un requestAnimationFrame
   posté après celui du jeu : les pixels du tampon, les positions écran des
   segments et de la tête, l'état de qualité (S.partEff, S.opt.particles) et
   l'état de caméra sont donc relevés DANS LA MÊME IMAGE. Les positions sont
   projetées dans le repère du TAMPON (et non par phases.worldToScreen, qui
   applique en plus la matrice CSS de la bascule : le tampon, lui, n'est pas
   penché — c'est son affichage qui l'est).
   Les captures sont mises en cache dans out/, par build, pour que les tests 2
   et 6 ne rejouent pas deux fois soixante secondes de partie. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchDesktop, startGame, installGod, installProbe, installAutoPilot, playDet, sleep, OUT } from '../lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const REF_FILE = path.join(REPO, 'snake2030', 'index-ref.html');
export const SEED = 20301;
const PROTO = 'v3-pilote-deterministe';

function empreinte(p) { return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 12); }

/* Analyse d'une image, exécutée dans la page. */
const ANALYSE = function (opt) {
  return new Promise(res => {
    requestAnimationFrame(function () {
      const S = window.__S, M = window.__M, cv = document.getElementById('game');
      const g = cv.getContext('2d');
      const cssW = parseFloat(cv.style.width) || cv.clientWidth, cssH = parseFloat(cv.style.height) || cv.clientHeight;
      // repère réellement employé par l'image (secousse de caméra comprise)
      const X = S.rx || { dpr: cv.width / cssW, sx: cssW / Math.abs(S.view.w), sy: cssH / Math.abs(S.view.h), rt: 0, ox: 0, oy: 0, cx: S.cam.x, cy: S.cam.y, bw: cssW, bh: cssH };
      const dpr = X.dpr, sx = X.sx, sy = X.sy;
      const P = M.phases, rt = X.rt, c = Math.cos(rt), sn = Math.sin(rt);
      const W = cv.width, H = cv.height;
      const w2b = (wx, wy) => {
        const px = (wx - X.cx + X.ox) * sx, py = (wy - X.cy + X.oy) * sy;
        return [dpr * (X.bw / 2 + px * c - py * sn), dpr * (X.bh / 2 + px * sn + py * c)];
      };
      /* positions écran, relevées AVANT la lecture des pixels mais dans la même
         image : rien ne bouge entre les deux, la boucle de jeu ne tourne pas. */
      const segs = [];
      if (S.snake) {
        segs.push(w2b(S.snake.x, S.snake.y));
        for (const s of S.snake.segs) segs.push(w2b(s.x, s.y));
      }
      const ents = [];
      if (S.snake) { const h = w2b(S.snake.x, S.snake.y); ents.push([h[0], h[1], S.headR * 1.6 * sy * dpr]); }
      if (S.snake) for (const s of S.snake.segs) { const p = w2b(s.x, s.y); ents.push([p[0], p[1], S.headR * 1.3 * sy * dpr]); }
      for (const e of S.enemies) { if (e.dead) continue; const p = w2b(e.x, e.y); ents.push([p[0], p[1], (e.r + 26) * sy * dpr]); }
      for (const p0 of S.pickups) { const p = w2b(p0.x, p0.y); ents.push([p[0], p[1], (p0.r + 22) * sy * dpr]); }
      for (const b of S.bullets) { const p = w2b(b.x, b.y); ents.push([p[0], p[1], (b.r + 16) * sy * dpr]); }
      for (const b of S.ebullets) { const p = w2b(b.x, b.y); ents.push([p[0], p[1], (b.r + 22) * sy * dpr]); }

      const img = g.getImageData(0, 0, W, H).data;
      /* masque « près d'un segment » : disques de 40 px CSS autour de chaque
         segment et de la tête ; masque « entité » pour la luminance du fond. */
      const near = new Uint8Array(W * H), entm = new Uint8Array(W * H);
      const stamp = (arr, cx0, cy0, r) => {
        const x0 = Math.max(0, Math.floor(cx0 - r)), x1 = Math.min(W - 1, Math.ceil(cx0 + r));
        const y0 = Math.max(0, Math.floor(cy0 - r)), y1 = Math.min(H - 1, Math.ceil(cy0 + r));
        const r2 = r * r;
        for (let y = y0; y <= y1; y++) { const dy = y - cy0; for (let x = x0; x <= x1; x++) { const dx = x - cx0; if (dx * dx + dy * dy <= r2) arr[y * W + x] = 1; } }
      };
      const R40 = 40 * dpr;
      for (const s of segs) stamp(near, s[0], s[1], R40);
      for (const e of ents) stamp(entm, e[0], e[1], Math.max(6, e[2]));

      let cyan = 0, cyanLoin = 0, fondN = 0;
      const hist = new Uint32Array(256);
      for (let i = 0, p = 0; i < W * H; i++, p += 4) {
        const r = img[p], gg = img[p + 1], b = img[p + 2];
        const mx = r > gg ? (r > b ? r : b) : (gg > b ? gg : b);
        const mn = r < gg ? (r < b ? r : b) : (gg < b ? gg : b);
        const d = mx - mn;
        if (d && mx) {
          let h;
          if (mx === r) h = 60 * (((gg - b) / d) % 6); else if (mx === gg) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - gg) / d + 4);
          if (h < 0) h += 360;
          const sat = d / mx, v = mx / 255;
          if (h >= 165 && h <= 200 && sat > 0.18 && v >= 0.09 && mn <= 220) {
            cyan++;
            if (!near[i]) cyanLoin++;
          }
        }
        if (!entm[i]) { fondN++; hist[(0.2126 * r + 0.7152 * gg + 0.0722 * b) | 0]++; }
      }
      /* médiane INTERPOLÉE dans son casier : sur un fond à ~10/255, un entier
         vaut déjà dix pour cent relatifs, et la borne relative du test 6 est de
         quinze. On interpole donc linéairement dans le casier médian. */
      let acc = 0, med = 0;
      const cible = fondN / 2;
      for (let k = 0; k < 256; k++) {
        const av = acc; acc += hist[k];
        if (acc >= cible) { med = hist[k] ? k + (cible - av) / hist[k] : k; break; }
      }
      med = +med.toFixed(2);
      const st = P.state ? P.state() : {};
      res({
        label: opt.label, t: S.t, level: S.level, phase: M.levels.phaseName ? M.levels.phaseName() : '',
        partEff: S.partEff === undefined ? S.opt.particles : S.partEff, particles: S.opt.particles,
        zoom: st.zoom, perspDeg: +(st.perspDeg || 0).toFixed(1), rot: +(st.rot || 0).toFixed(3),
        W: cssW, H: cssH, dpr, bufW: W, bufH: H, segs: segs.length,
        pxTotal: W * H, cyanPct: +(100 * cyan / (W * H)).toFixed(3),
        cyanLoin40Pct: +(100 * cyanLoin / (W * H)).toFixed(3), pxCyanLoin40: cyanLoin,
        fondPx: fondN, fondMedianeLum: med,
        err: window.__ERR ? window.__ERR.count : -1,
      });
    });
  });
};

/* QUALITÉ ÉPINGLÉE PENDANT LA CAPTURE. Chromium sans processeur graphique coûte
   ~25 ms par image à 1440x900 : la dégradation automatique tombe au cran 3 en
   quelques secondes, S.partEff passe à 0,25 et drawFloor SORT — la capture ne
   mesurerait alors pas le rendu que le test prétend juger (la spec l'écrit).
   frame() remet _qStep à 0 et rappelle applyQuality dès que S.opt.px change ;
   on alterne donc S.opt.px entre deux valeurs qui donnent le MÊME cran de base
   (_qBase borne à devicePixelRatio = 1 sur ce profil, 1,5 et 1,4999 donnent tous
   deux base = 2), ce qui remet la qualité au maximum à chaque image sans jamais
   réallouer le tampon. */
async function epingleQualite(page) {
  await page.evaluate(() => {
    if (window.__QPIN) return;
    window.__QPIN = 1;
    (function t() { requestAnimationFrame(t); const S = window.__S; S.opt.px = (S.opt.px === 1.5 ? 1.4999 : 1.5); })();
  });
}

async function joue(url, tag) {
  /* PARTIE DÉTERMINISTE. Sans elle, les deux builds ne jouent pas la même
     partie : la caméra n'est pas au même endroit, les ennemis non plus, et la
     médiane du fond bouge de deux unités pour cette seule raison — ce qui, sur
     un fond à 9/255, vaut vingt-deux pour cent relatifs. Pilote dans la page,
     graine de jeu imposée, pas de temps imposé (window.__DT = 1/60) : à build
     comparable, la suite d'états du jeu est la même, et les deux captures se
     comparent pixel pour pixel. */
  const ctx = await launchDesktop(1440, 900, { url });
  await installProbe(ctx.page);
  await installGod(ctx.page);
  await installAutoPilot(ctx.page, { mode: 'key', seed: 2030 });
  await startGame(ctx, { seed: SEED });
  await epingleQualite(ctx.page);
  await playDet(ctx, 60);
  const a = await ctx.page.evaluate(ANALYSE, { label: '60s-niveau-courant' });
  // niveau 3 forcé : le niveau 1 dure 104 s, une capture à 60 s ne le voit jamais
  await ctx.page.evaluate(() => window.__M.levels.start(3));
  await playDet(ctx, 68);
  const b = await ctx.page.evaluate(ANALYSE, { label: 'niveau3' });
  const errs = { pageErrors: ctx.pageErrors.slice(0, 3), consoleErrors: ctx.consoleErrors.slice(0, 3) };
  await ctx.close();
  return { tag, url, captures: [a, b], errs };
}

/** Captures du build courant et du build de référence (dernier commit), en cache. */
export async function captures(quoi = 'both') {
  const cur = path.join(REPO, 'snake2030', 'index.html');
  const empCur = empreinte(cur);
  const out = {};
  if (quoi === 'cur' || quoi === 'both') {
    const f = path.join(OUT, 'G11-captures-cur.json');
    let j = null;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
    if (!j || j.empreinte !== empCur || j.proto !== PROTO) {
      const r = await joue(process.env.S2030_URL || 'http://127.0.0.1:8112/snake2030/index.html', 'cur');
      j = { empreinte: empCur, proto: PROTO, ...r };
      fs.writeFileSync(f, JSON.stringify(j, null, 1));
    }
    out.cur = j;
  }
  if (quoi === 'ref' || quoi === 'both') {
    const html = execFileSync('git', ['-C', REPO, 'show', 'HEAD:snake2030/index.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(REF_FILE, html);
    const commit = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    const empRef = crypto.createHash('md5').update(html).digest('hex').slice(0, 12);
    const f = path.join(OUT, 'G11-captures-ref.json');
    let j = null;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
    if (!j || j.empreinte !== empRef || j.proto !== PROTO) {
      const url = (process.env.S2030_URL || 'http://127.0.0.1:8112/snake2030/index.html').replace(/index\.html(\?.*)?$/, 'index-ref.html');
      const r = await joue(url, 'ref');
      j = { empreinte: empRef, proto: PROTO, commit, ...r };
      fs.writeFileSync(f, JSON.stringify(j, null, 1));
    }
    out.ref = j;
    try { fs.unlinkSync(REF_FILE); } catch (e) {}
  }
  return out;
}
