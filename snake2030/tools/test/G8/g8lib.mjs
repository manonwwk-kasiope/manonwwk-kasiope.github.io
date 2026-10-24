/* Aides communes aux tests d'acceptation G8 (impact : hitstop, kill, blessure, budget de flashs,
   montée de niveau, sons « prêt »).

   Trois principes, hérités de G1/G5/G6 et rappelés par la spécification :

   1. TOUT SE POSE DANS L'IMAGE. Un hitstop se compte en images ; le déclencher depuis Node par
      page.evaluate() le poserait ENTRE deux images et décalerait le compte d'une unité. Les tests
      arment donc une action (arm) exécutée par un crochet sur S2030.weapons.update, c'est-à-dire au
      milieu de l'image, avant collide() — exactement ce que demande le test 1 de la spec.

   2. DEUX POINTS D'OBSERVATION PAR IMAGE, tous deux dans la boucle du jeu :
      - « dans l'image » : crochet sur S2030.audio.setIntensity, appelé par frame() APRÈS collide et
        updateCam et AVANT fx.update et render. C'est là que se lisent les grandeurs telles que le
        rendu va les employer (fx.shakeAmount() avant amortissement, S.cam après le recul).
      - « fin d'image » : une boucle requestAnimationFrame posée après celle du jeu (même mécanique
        que tools/test/lib.mjs) : S.dt y est la valeur de l'image qui vient de tourner.

   3. LES PIXELS SONT LUS SUR LE CANVAS DU JEU (getImageData), qui EST la sortie affichée, après
      vérification que la transformation CSS du canvas est l'identité et que la perspective est nulle
      — sans quoi pixel de canvas ≠ pixel d'écran. canvasInfo() rend de quoi le vérifier et le
      consigner. Les tests qui en ont besoin figent le temps (horloge factice de Playwright) pour que
      la capture porte sur une image connue et non sur « environ maintenant ».

   Aucun de ces scripts n'écrit dans snake2030/src ni dans index.html. */

import fs from 'node:fs';
import path from 'node:path';
import { sleep, OUT } from '../lib.mjs';

export const SEED = 2030;

/* ------------------------------------------------------------------ arène -- */

/** Arène de laboratoire : vagues coupées, pas de temps imposé, décor stable.
 *  opts.onlyLab    : seuls les ennemis posés par le labo (id ≥ 900000) survivent
 *  opts.clearAll   : aucun ennemi ne survit
 *  opts.noFire     : les armes du joueur ne tirent plus (S2030.weapons.update neutralisée)
 *  opts.keepEB     : les projectiles ennemis ne sont plus effacés (pour en poser à la main)
 *  opts.keepXp     : l'expérience et les montées de niveau ne sont PAS remises à zéro
 *  opts.dt         : pas de temps imposé en secondes (défaut 1/60) */
export async function installArena(page, opts = {}) {
  await page.evaluate((o) => {
    const M = window.__M, S = window.__S;
    const prev = M.levels.update;
    window.__G8arena = o;
    M.levels.update = function (dt) {
      let r;
      try { r = prev.apply(this, arguments); } catch (e) { window.__G8arenaErr = String(e && e.message || e); }
      const a = window.__G8arena;
      if (a.clearAll) S.enemies.length = 0;
      else if (a.onlyLab) { for (let i = S.enemies.length - 1; i >= 0; i--) if (S.enemies[i].id < 900000) S.enemies.splice(i, 1); }
      if (!a.keepEB) S.ebullets.length = 0;
      S.pickups.length = 0;
      if (M.levels.hazards) M.levels.hazards.length = 0;
      if (!a.keepXp) { S.xp = 0; S.lvlUps = 0; S.xpNext = 1e9; }
      if (a.noFire) { S.bullets.length = 0; if (S.drones) S.drones.length = 0; }
      if (window.__G8freeze) {                        // ennemis de laboratoire immobilisés
        for (const e of S.enemies) if (e.id >= 900000) { e.speed = 0; e.vx = 0; e.vy = 0; }
      }
      const p = window.__G8pin;                       // épinglage : avant collide, avant le rendu
      if (p) {
        const s = S.snake;
        if (s) {
          if (p.x != null) s.x = p.x;
          if (p.y != null) s.y = p.y;
          if (p.ang != null) { s.ang = p.ang; s.aim = p.ang; }
          if (p.speed != null) s.speed = p.speed;
          if (p.invuln != null) s.invuln = p.invuln;
          if (p.ghost != null) s.ghost = p.ghost;
          if (p.len != null) { s.len = p.len; s.hp = p.len; if (s.maxHp < p.len) s.maxHp = p.len; }
        }
      }
      return r;
    };
    if (o.noFire && M.weapons) M.weapons.update = function () {};
    window.__DT = o.dt || (1 / 60);
  }, { ...opts });
}

/** Épingle le serpent (et facultativement la caméra). Les champs non fournis sont laissés libres.
 *  cam : {x, y} pour figer S.cam APRÈS updateCam (crochet « dans l'image »), null pour la libérer. */
export async function pin(page, p) {
  await page.evaluate((p) => { window.__G8pin = p; }, p);
}
export async function pinCam(page, cam) {
  await page.evaluate((c) => { window.__G8pinCam = c; }, cam);
}

/* ---------------------------------------------------------------- labo ----- */

/** window.__lab : pose d'ennemis, de projectiles joueur et de projectiles ennemis par les mêmes
 *  constructeurs que le jeu. Les ennemis du labo portent un id ≥ 900000. */
export async function installLab(page) {
  await page.evaluate(() => {
    const S = window.__S, M = window.__M;
    window.__lab = {
      spawn(type, dx, dy, mods) {
        const d = M.enemies.defs[type]; if (!d) return null;
        const dm = S.opt.diff, s = S.snake;
        const e = { id: 900000 + (window.__labId = (window.__labId || 0) + 1), type, x: s.x + dx, y: s.y + dy,
          vx: 0, vy: 0, ang: 0, t: 0, r: d.r || 14,
          hp: Math.round((d.hp || 10) * Math.pow(dm, 0.5)), maxHp: Math.round((d.hp || 10) * Math.pow(dm, 0.5)),
          dmg: Math.max(1, Math.round((d.dmg || 1) * Math.pow(dm, 0.35))), speed: (d.speed || 60) * (1 + (dm - 1) * 0.10),
          score: d.score || 10, xp: d.xp || 1, color: d.color || '#ff2e63', elite: false, mod: null, dead: false, hitT: 0 };
        for (const k in d) if (!(k in e)) e[k] = d[k];
        if (mods && mods.elite) { e.elite = true; e.hp = e.maxHp = Math.round(e.hp * 3.2); e.r *= 1.35; }
        if (mods && mods.mod) { e.mod = mods.mod; const md = M.enemies.mods[mods.mod]; if (md && md.apply) md.apply(e); }
        if (d.init) d.init(e);
        if (mods && mods.boss) { e.boss = 1; e.name = 'LABO'; }
        e.ang = Math.atan2(s.y - e.y, s.x - e.x);
        S.enemies.push(e);
        return e.id;
      },
      get(id) { return S.enemies.find(e => e.id === id) || null; },
      clear() { S.enemies.length = 0; S.ebullets.length = 0; S.bullets.length = 0; S.boss = null; },
      /** Projectile JOUEUR posé au point monde (x, y) : collide() le confrontera aux ennemis dans
       *  cette même image (weapons.update tourne avant collide). */
      bullet(x, y, vx, vy, o) {
        const b = Object.assign({ x, y, vx: vx || 0, vy: vy || 0, r: 5, dmg: 1, life: 2, color: '#ffe08a' }, o || {});
        S.bullets.push(b);
        return b;
      },
      /** Projectile ENNEMI posé au point monde (x, y). */
      ebullet(x, y, vx, vy, o) {
        const b = Object.assign({ x, y, vx: vx || 0, vy: vy || 0, r: 6, dmg: 1, life: 2, color: '#ff2e63' }, o || {});
        S.ebullets.push(b);
        return b;
      }
    };
  });
}

/* ------------------------------------------------------- sondes d'image ---- */

/** Sonde d'image G8. Pose :
 *   - window.__G8.rec : échantillon de FIN d'image (boucle rAF posée après celle du jeu)
 *   - window.__G8.inf : échantillon DANS l'image (crochet sur audio.setIntensity, après collide et
 *     updateCam, avant fx.update et render)
 *   - window.__G8.armed / fired : action à exécuter DANS l'image (crochet sur weapons.update)
 *   - accumulateurs de flux (acc) : ce qui doit tenir sur 18 000 images sans tout rapatrier
 *  opts.cap    : taille du tampon circulaire d'échantillons (défaut 6000)
 *  opts.screen : échantillonne l'écran à chaque image (moyenne + 9 cellules 3×3) — coûteux
 *  opts.lastSfx: relève audio.lastSfx() dans l'échantillon « dans l'image » */
export async function installFrameProbe(page, opts = {}) {
  return page.evaluate((o) => {
    const S = window.__S, M = window.__M;
    if (window.__G8) return { already: true };
    const cap = o.cap || 6000;
    const G = window.__G8 = {
      fi: 0, cap, rec: [], inf: [], armed: null, perFrame: null, fired: [], err: null, opts: o,
      acc: { play: 0, shakeGt05: 0, meanSum: 0, meanMax: -1, meanMaxAt: -1, meanN: 0, flashEv: 0, flashFr: 0,
             lastMinRise: 0, prevCells: null, flashAt: [], dtLt6: 0, dtLt4: 0, ultFires: 0, prevUlt: 0 },
      spy: null
    };
    const fx = () => M.fx, ph = () => M.phases;

    /* échantillonneur d'écran : deux réductions successives (1440×900 → 120×75 → 24×15) pour que la
       moyenne soit une vraie moyenne et non un sous-échantillonnage ; 24×15 se découpe exactement en
       neuf cellules 8×5 (grille 3×3). */
    let shot = null;
    if (o.screen) {
      const cv = document.getElementById('game');
      if (cv) {
        const a = document.createElement('canvas'); a.width = 120; a.height = 75;
        const b = document.createElement('canvas'); b.width = 24; b.height = 15;
        const ga = a.getContext('2d'), gb = b.getContext('2d', { willReadFrequently: true });
        ga.imageSmoothingEnabled = true; ga.imageSmoothingQuality = 'high';
        gb.imageSmoothingEnabled = true; gb.imageSmoothingQuality = 'high';
        shot = function () {
          ga.drawImage(cv, 0, 0, 120, 75);
          gb.drawImage(a, 0, 0, 24, 15);
          const d = gb.getImageData(0, 0, 24, 15).data;
          const cs = [0, 0, 0, 0, 0, 0, 0, 0, 0], cn = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          let sum = 0;
          for (let y = 0; y < 15; y++) for (let x = 0; x < 24; x++) {
            const i = (y * 24 + x) * 4;
            const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            sum += l;
            const k = (y < 5 ? 0 : y < 10 ? 1 : 2) * 3 + (x < 8 ? 0 : x < 16 ? 1 : 2);
            cs[k] += l; cn[k]++;
          }
          for (let k = 0; k < 9; k++) cs[k] = cs[k] / cn[k];
          return { m: sum / 360, c: cs };
        };
      }
    }
    G.shot = shot;

    function push(arr, v) { arr.push(v); if (arr.length > cap) arr.shift(); }

    /* --- demandes de pixels, servies EN FIN D'IMAGE (le canvas contient alors exactement l'image que
       frame() vient de rendre) : pas besoin de figer l'horloge pour capturer une image précise. --- */
    const gcv = document.getElementById('game');
    const gctx = gcv ? gcv.getContext('2d') : null;
    G.rectReq = null; G.gridReq = null;
    G.reqRect = function (cssRect, n) {
      if (!gcv) return null;
      const bb = gcv.getBoundingClientRect(), pr = gcv.width / Math.max(1, bb.width);
      let x0 = Math.round(cssRect.x * pr), y0 = Math.round(cssRect.y * pr);
      let w = Math.round(cssRect.w * pr), h = Math.round(cssRect.h * pr);
      x0 = Math.max(0, Math.min(gcv.width - 1, x0)); y0 = Math.max(0, Math.min(gcv.height - 1, y0));
      w = Math.max(1, Math.min(gcv.width - x0, w)); h = Math.max(1, Math.min(gcv.height - y0, h));
      G.rectReq = { x0, y0, w, h, left: n, out: [], pr };
      return { x0, y0, w, h, pr: +pr.toFixed(4) };
    };
    G.reqGrid = function (step, n) { G.gridReq = { step: step || 3, left: n, out: [] }; return !!gcv; };
    function serveRect() {
      const R = G.rectReq;
      if (!R || R.left <= 0 || !gctx) return;
      R.left--;
      const d = gctx.getImageData(R.x0, R.y0, R.w, R.h).data;
      let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
      R.out.push({ fi: G.fi, l: +(s / n).toFixed(3), n });
    }
    function serveGrid() {
      const R = G.gridReq;
      if (!R || R.left <= 0 || !gctx) return;
      R.left--;
      const W = gcv.width, H = gcv.height, st = R.step;
      const d = gctx.getImageData(0, 0, W, H).data;
      const cs = [0, 0, 0, 0, 0, 0, 0, 0, 0], cn = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const cw = W / 3, chh = H / 3;
      for (let y = 0; y < H; y += st) for (let x = 0; x < W; x += st) {
        const i = (y * W + x) * 4;
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        const k = Math.min(2, (y / chh) | 0) * 3 + Math.min(2, (x / cw) | 0);
        cs[k] += l; cn[k]++;
      }
      let tot = 0, tn = 0;
      for (let k = 0; k < 9; k++) { tot += cs[k]; tn += cn[k]; cs[k] = +(cs[k] / cn[k]).toFixed(3); }
      R.out.push({ fi: G.fi, cells: cs, mean: +(tot / tn).toFixed(3) });
    }
    /* Capture PNG du canvas en fin d'image : pièce à conviction pour le médiateur. Une action armée
       peut poser G.pngNext = n pour saisir les n images à partir de celle où elle s'exécute. */
    G.pngs = []; G.pngNext = 0;
    function servePng() {
      if (G.pngNext > 0 && gcv) {
        G.pngNext--;
        if (G.pngs.length < 8) G.pngs.push({ fi: G.fi, url: gcv.toDataURL('image/png') });
      }
    }
    G.serveRect = serveRect; G.serveGrid = serveGrid; G.servePng = servePng;

    /* --- crochet DANS l'image : après collide et updateCam, avant fx.update et render --- */
    const oi = M.audio.setIntensity;
    M.audio.setIntensity = function () {
      try {
        const p = window.__G8pinCam;
        if (p) { S.cam.x = p.x; S.cam.y = p.y; }        // scène figée : la caméra ne dérive plus
        const F = fx(), P = ph();
        const smp = { fi: G.fi + 1, t: S.t, dt: S.dt,
          hs: F && F.hitstopLeft ? F.hitstopLeft() : -1,
          shake: F && F.shakeAmount ? F.shakeAmount() : -1,
          ts: S.timeScale, tilt: P && P.tilt ? P.tilt() : -1, zoom: P && P.zoom ? P.zoom() : -1,
          kills: S.kills, cx: S.cam.x, cy: S.cam.y, len: S.snake ? S.snake.len : -1,
          inv: S.snake ? S.snake.invuln : -1, lv: S.lvlUps, ult: S.ult };
        if (o.lastSfx && M.audio.lastSfx) { try { smp.ls = M.audio.lastSfx(); } catch (e) { smp.ls = null; } }
        push(G.inf, smp);
      } catch (e) { G.err = 'inf:' + String(e && e.message || e); }
      return oi ? oi.apply(this, arguments) : undefined;
    };

    /* --- crochet d'ARMEMENT : au milieu de l'image, avant collide --- */
    const ow = M.weapons ? M.weapons.update : null;
    if (M.weapons) M.weapons.update = function () {
      let r;
      try { r = ow ? ow.apply(this, arguments) : undefined; } catch (e) { G.err = 'weapons:' + String(e && e.message || e); }
      /* crochet permanent, au même point de l'image (après weapons.update, avant collide) */
      if (G.perFrame) { try { G.perFrame(S, M, window.__K, G); } catch (e) { G.err = 'perFrame:' + String(e && e.message || e); G.perFrame = null; } }
      const a = G.armed;
      if (a) {
        G.armed = null;
        try { G.fired.push({ fi: G.fi + 1, t: S.t, info: a(S, M, window.__K, G) || null }); }
        catch (e) { G.err = 'armed:' + String(e && e.stack || e); G.fired.push({ fi: G.fi + 1, t: S.t, error: String(e && e.message || e) }); }
      }
      return r;
    };

    /* --- boucle de FIN d'image, posée après celle du jeu --- */
    (function tick() {
      requestAnimationFrame(tick);
      G.fi++;
      const F = fx(), P = ph();
      let sc = null;
      if (G.shot) { try { sc = G.shot(); } catch (e) { G.err = 'shot:' + String(e && e.message || e); G.shot = null; } }
      const play = S.phase === 'play' && !S.paused;
      const smp = { fi: G.fi, t: S.t, dt: S.dt, now: +performance.now().toFixed(2), ph: S.phase, pa: S.paused ? 1 : 0,
        hs: F && F.hitstopLeft ? F.hitstopLeft() : -1, shake: S.shake || 0, ts: S.timeScale,
        tilt: P && P.tilt ? P.tilt() : -1, zoom: P && P.zoom ? P.zoom() : -1,
        kills: S.kills, cx: S.cam.x, cy: S.cam.y, ne: S.enemies.length,
        len: S.snake ? S.snake.len : -1, inv: S.snake ? S.snake.invuln : -1, lv: S.lvlUps, ult: S.ult };
      if (sc) { smp.m = +sc.m.toFixed(2); smp.c = sc.c.map(v => +v.toFixed(2)); }
      push(G.rec, smp);
      try { serveRect(); serveGrid(); servePng(); } catch (e) { G.err = 'px:' + String(e && e.message || e); }

      /* accumulateurs de flux (pour les longues parties : rien n'est rapatrié image par image) */
      const A = G.acc;
      if (play) {
        A.play++;
        if ((S.shake || 0) > 0.5) A.shakeGt05++;
        if (A.prevUlt - (S.ult || 0) > 10) A.ultFires++;      // la jauge d'ultime retombe : elle a servi
        A.prevUlt = S.ult || 0;
        if (S.dt < 0.006) A.dtLt6++;
        if (S.dt < 0.004) A.dtLt4++;
        if (sc) {
          A.meanSum += sc.m; A.meanN++;
          if (sc.m > A.meanMax) { A.meanMax = sc.m; A.meanMaxAt = G.fi; }
          /* flash PLEIN ÉCRAN rendu : une nappe additive monte les NEUF cellules d'un coup.
             Une vignette ne monte que les bords, un effet local qu'une cellule ou deux.
             On compte les fronts montants du « plus petit accroissement des neuf cellules ». */
          if (A.prevCells) {
            let mn = 1e9;
            for (let k = 0; k < 9; k++) { const d = sc.c[k] - A.prevCells[k]; if (d < mn) mn = d; }
            const on = mn >= 8;
            if (on) {
              A.flashFr++;
              if (A.lastMinRise < 8) { A.flashEv++; if (A.flashAt.length < 90) A.flashAt.push({ fi: G.fi, t: +S.t.toFixed(0), min: +mn.toFixed(2), mean: +sc.m.toFixed(2) }); }
            }
            A.lastMinRise = mn;
          }
          A.prevCells = sc.c;
        }
      }
    })();
    return { ok: true, screen: !!shot };
  }, { ...opts });
}

/** Rapatrie les échantillons (et vide les tampons si clear). */
export async function readProbe(page, clear = true) {
  return page.evaluate((clear) => {
    const G = window.__G8;
    const out = { fi: G.fi, rec: G.rec.slice(), inf: G.inf.slice(), fired: G.fired.slice(), err: G.err,
      acc: JSON.parse(JSON.stringify(G.acc, (k, v) => k === 'prevCells' ? undefined : v)) };
    if (clear) { G.rec.length = 0; G.inf.length = 0; G.fired.length = 0; }
    return out;
  }, clear);
}
/** Accumulateurs seuls (parties longues). */
export async function readAcc(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__G8.acc, (k, v) => k === 'prevCells' ? undefined : v)));
}
export async function clearProbeBufs(page) {
  await page.evaluate(() => { const G = window.__G8; G.rec.length = 0; G.inf.length = 0; G.fired.length = 0; });
}

/** Arme une action exécutée DANS la prochaine image, depuis le crochet sur weapons.update
 *  (avant collide). `src` est le CORPS d'une fonction (S, M, K, G) => info. */
export async function arm(page, src) {
  await page.evaluate((src) => {
    window.__G8.armed = new Function('S', 'M', 'K', 'G', src);
  }, src);
}

/** Demande la luminance moyenne d'un rectangle d'écran (pixels CSS) pour les n prochaines images,
 *  servie en fin d'image sur le canvas du jeu. */
export async function reqRect(page, rect, n) {
  return page.evaluate(([r, n]) => window.__G8.reqRect(r, n), [rect, n]);
}
/** Demande la grille 3×3 de luminances de tout l'écran pour les n prochaines images. */
export async function reqGrid(page, n, step = 3) {
  return page.evaluate(([n, s]) => window.__G8.reqGrid(s, n), [n, step]);
}
/** Attend la fin d'une demande de pixels et rend la série [{fi, l}] ou [{fi, cells, mean}]. */
export async function waitPx(page, which = 'rect', capMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < capMs) {
    const r = await page.evaluate((w) => {
      const R = w === 'rect' ? window.__G8.rectReq : window.__G8.gridReq;
      if (!R) return null;
      return R.left > 0 ? null : JSON.parse(JSON.stringify(R.out));
    }, which);
    if (r) return r;
    await sleep(20);
  }
  throw new Error('waitPx : demande de pixels (' + which + ') non servie en ' + capMs + ' ms');
}
/** Attend qu'une action armée ait été exécutée ; rend son enregistrement {fi, t, info}. */
export async function waitFired(page, capMs = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < capMs) {
    const f = await page.evaluate(() => { const G = window.__G8; return G.fired.length ? G.fired[G.fired.length - 1] : null; });
    if (f) return f;
    await sleep(20);
  }
  throw new Error('waitFired : action armée jamais exécutée en ' + capMs + ' ms');
}

/* ------------------------------------------------------------- espions ----- */

/** Espionne les APPELS d'API observables depuis l'extérieur du module fx : fx.text, fx.ring, fx.hit,
 *  fx.flash, fx.burst, audio.sfx, audio.ultimate, ui.banner, ui.toast.
 *  Note importante et volontairement consignée : les appels INTERNES à 20-fx.js (fx.kill appelle
 *  _fxBurst, pas S2030.fx.burst) ne passent pas par ces enveloppes. C'est ce qui rend la signature
 *  burst(n = 3, power = 0,7) univoque : elle n'est produite que par damageEnemy (10-core.js). */
export async function installSpies(page, opts = {}) {
  await page.evaluate((o) => {
    const M = window.__M, S = window.__S;
    if (window.__G8spy) return;
    const sp = window.__G8spy = { text: [], ring: [], hit: [], flash: [], burst: [], sfx: [], ult: [], banner: [], toast: [],
      n: { text: 0, ring: 0, hit: 0, flash: 0, burst: 0, sfx: 0, ult: 0, banner: 0, toast: 0 },
      cap: o.cap || 20000, skip: {} };
    for (const k of (o.skip || [])) sp.skip[k] = 1;                 // comptés mais non détaillés
    const fi = () => (window.__G8 ? window.__G8.fi + 1 : -1);
    function rec(k, v) { sp.n[k]++; if (!sp.skip[k] && sp[k].length < sp.cap) sp[k].push(v); }
    const F = M.fx;
    const oText = F.text, oRing = F.ring, oHit = F.hit, oFlash = F.flash, oBurst = F.burst;
    F.text = function (x, y, str, color, opts) { rec('text', { fi: fi(), t: S.t, x, y, s: String(str), c: color }); return oText.apply(this, arguments); };
    F.ring = function (x, y, color, r, sp2, opts) { rec('ring', { fi: fi(), t: S.t, x, y, c: color, r, sp: sp2, w: opts && opts.w }); return oRing.apply(this, arguments); };
    F.hit = function (x, y, color, power) { rec('hit', { fi: fi(), t: S.t, x, y, c: color }); return oHit.apply(this, arguments); };
    F.flash = function (color, a, mode, ang) { rec('flash', { fi: fi(), t: S.t, c: color, a, mode: mode || '', ang }); return oFlash.apply(this, arguments); };
    F.burst = function (x, y, color, n, power, opts) { rec('burst', { fi: fi(), t: S.t, x, y, c: color, n, p: power }); return oBurst.apply(this, arguments); };
    const A = M.audio;
    const oSfx = A.sfx, oUlt = A.ultimate;
    A.sfx = function (name, opts) { rec('sfx', { fi: fi(), t: S.t, name: String(name), pitch: opts && opts.pitch }); return oSfx.apply(this, arguments); };
    A.ultimate = function () { rec('ult', { fi: fi(), t: S.t }); return oUlt.apply(this, arguments); };
    const U = M.ui;
    const oBan = U.banner, oToast = U.toast;
    /* ATTRIBUTION DE LA BANNIÈRE. La spec n'interdit « SURCHARGE » qu'à useUlt. Or le boss du
       niveau 4+ s'appelle exactement 'SURCHARGE' (25-levels.js:183) et son annonce passe par
       _lvSay (:609) puis ui.banner (:295) : un test qui atteindrait ce boss échouerait sans
       qu'aucune règle de la spec soit enfreinte. On relève donc la PILE D'APPELS (le build
       concatène les modules, il ne les minifie pas : `function useUlt()` garde son nom) et on
       marque l'appel `ult` quand il vient de useUlt. Les deux comptes sont rapportés. */
    U.banner = function (text) {
      var st = ''; try { st = String(new Error().stack || ''); } catch (e) { st = ''; }
      rec('banner', { fi: fi(), t: S.t, s: String(text), ult: /\buseUlt\b/.test(st),
                      pile: st.split('\n').slice(1, 5).map(function (l) { return l.trim(); }).join(' | ') });
      return oBan.apply(this, arguments);
    };
    U.toast = function (title, sub) { rec('toast', { fi: fi(), t: S.t, s: String(title), sub: sub == null ? '' : String(sub) }); return oToast.apply(this, arguments); };
  }, { ...opts });
}
export async function readSpies(page, clear = false) {
  return page.evaluate((clear) => {
    const sp = window.__G8spy;
    const out = JSON.parse(JSON.stringify({ n: sp.n, text: sp.text, ring: sp.ring, hit: sp.hit, flash: sp.flash,
      burst: sp.burst, sfx: sp.sfx, ult: sp.ult, banner: sp.banner, toast: sp.toast }));
    if (clear) { for (const k of ['text', 'ring', 'hit', 'flash', 'burst', 'sfx', 'ult', 'banner', 'toast']) { sp[k].length = 0; sp.n[k] = 0; } }
    return out;
  }, clear);
}

/* ------------------------------------------------------------- pixels ------ */

/** Géométrie du canvas : de quoi vérifier que pixel de canvas = pixel d'écran avant toute mesure. */
export async function canvasInfo(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('game');
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    const st = getComputedStyle(cv);
    const P = window.__M.phases;
    return { cw: cv.width, ch: cv.height, cssW: +r.width.toFixed(2), cssH: +r.height.toFixed(2),
      cssX: +r.x.toFixed(2), cssY: +r.y.toFixed(2), pr: +(cv.width / Math.max(1, r.width)).toFixed(4),
      transform: st.transform, dpr: window.devicePixelRatio, pxEff: window.__S.pxEff,
      persp: P && P.persp ? +(P.persp() * 180 / Math.PI).toFixed(3) : -1,
      rot: P && P.rot ? +P.rot().toFixed(4) : -1, tilt: P && P.tilt ? +P.tilt().toFixed(4) : -1,
      zoom: P && P.zoom ? +P.zoom().toFixed(4) : -1 };
  });
}

/** Luminance moyenne (Rec. 709) d'un rectangle du canvas de jeu, en pixels CSS ; lecture directe du
 *  tampon rendu (getImageData). step : pas d'échantillonnage en pixels de tampon. */
export async function regionLum(page, rect, step = 1) {
  return page.evaluate(([r, step]) => {
    const cv = document.getElementById('game');
    const g = cv.getContext('2d');
    const bb = cv.getBoundingClientRect();
    const pr = cv.width / Math.max(1, bb.width);
    let x0 = Math.round(r.x * pr), y0 = Math.round(r.y * pr);
    let w = Math.round(r.w * pr), h = Math.round(r.h * pr);
    x0 = Math.max(0, Math.min(cv.width - 1, x0)); y0 = Math.max(0, Math.min(cv.height - 1, y0));
    w = Math.max(1, Math.min(cv.width - x0, w)); h = Math.max(1, Math.min(cv.height - y0, h));
    const d = g.getImageData(x0, y0, w, h).data;
    let s = 0, n = 0;
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++;
    }
    return { l: +(s / n).toFixed(3), n, box: { x0, y0, w, h }, pr: +pr.toFixed(4) };
  }, [rect, step]);
}

/** Grille 3×3 de luminances moyennes sur tout le canvas (cellules en tiers d'écran). */
export async function grid3(page, step = 3) {
  return page.evaluate((step) => {
    const cv = document.getElementById('game');
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const d = g.getImageData(0, 0, W, H).data;
    const s = [0, 0, 0, 0, 0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const cw = W / 3, ch = H / 3;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      const k = Math.min(2, (y / ch) | 0) * 3 + Math.min(2, (x / cw) | 0);
      s[k] += l; n[k]++;
    }
    const out = [];
    for (let k = 0; k < 9; k++) out.push(+(s[k] / n[k]).toFixed(3));
    let tot = 0, tn = 0;
    for (let k = 0; k < 9; k++) { tot += s[k]; tn += n[k]; }
    return { cells: out, mean: +(tot / tn).toFixed(3), W, H };
  }, step);
}

/** Position ÉCRAN (pixels CSS) d'un point monde, par phases.worldToScreen (repère du tampon) ramenée
 *  en pixels CSS. */
export async function toScreenCss(page, x, y) {
  return page.evaluate(([x, y]) => {
    const cv = document.getElementById('game');
    const bb = cv.getBoundingClientRect();
    const pr = cv.width / Math.max(1, bb.width);
    const p = window.__M.phases.worldToScreen(x, y);
    return { x: +(p.sx / pr).toFixed(2), y: +(p.sy / pr).toFixed(2), pr: +pr.toFixed(4) };
  }, [x, y]);
}

/* ------------------------------------------------------------- attentes ---- */

/** Attend n images comptées par la sonde G8 (window.__G8.fi). */
export async function waitFrames(page, n, capMs) {
  const cap = capMs || Math.max(5000, n * 120);
  const t0 = Date.now();
  const start = await page.evaluate(() => window.__G8.fi);
  while (Date.now() - t0 < cap) {
    const f = await page.evaluate(() => window.__G8.fi);
    if (f - start >= n) return f - start;
    await sleep(15);
  }
  throw new Error('waitFrames : ' + n + ' images non écoulées en ' + cap + ' ms réels');
}
/** Attend ms millisecondes de TEMPS DE JEU (S.t). */
export async function waitGame(page, ms, capMs) {
  const cap = capMs || Math.max(5000, ms * 5);
  const t0 = Date.now();
  const start = await page.evaluate(() => window.__S.t);
  while (Date.now() - t0 < cap) {
    const t = await page.evaluate(() => window.__S.t);
    if (t - start >= ms) return t - start;
    await sleep(15);
  }
  throw new Error('waitGame : ' + ms + ' ms de jeu non écoulés en ' + cap + ' ms réels');
}

/** Demande la capture PNG des n prochaines images (fin d'image). */
export async function reqPng(page, n) { await page.evaluate(n => { window.__G8.pngNext = n; }, n); }
/** Rapatrie les PNG capturés et les écrit dans tools/test/out/. Rend les chemins. */
export async function savePngs(page, prefix, clear = true) {
  const list = await page.evaluate((clear) => {
    const G = window.__G8, out = G.pngs.slice();
    if (clear) G.pngs.length = 0;
    return out;
  }, clear);
  const paths = [];
  for (const p of list) {
    const b64 = String(p.url).split(',')[1] || '';
    const file = path.join(OUT, prefix + '-' + p.fi + '.png');
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    paths.push({ fi: p.fi, file });
  }
  return paths;
}

/** Base de référence extrapolée : ajustement linéaire des images de référence (d < 0) évalué à d = 0.
 *  Le décor du jeu s'éclaircit lentement et régulièrement (animation de la grille) ; prendre la
 *  moyenne des images de référence sous-estimerait la base d'autant, et gonflerait la hausse mesurée.
 *  Rend { base, slope, resid } où resid est le plus grand écart relatif à la droite, en pour cent. */
export function fitBase(points) {          // points : [{d, v}] avec d < 0
  const n = points.length;
  if (n < 3) return null;
  let sd = 0, sv = 0, sdd = 0, sdv = 0;
  for (const p of points) { sd += p.d; sv += p.v; sdd += p.d * p.d; sdv += p.d * p.v; }
  const den = n * sdd - sd * sd;
  const a = den === 0 ? 0 : (n * sdv - sd * sv) / den;      // pente par image
  const b = (sv - a * sd) / n;                              // valeur en d = 0
  let resid = 0;
  for (const p of points) { const e = Math.abs(p.v - (a * p.d + b)); if (e > resid) resid = e; }
  return { base: b, slope: a, resid: b !== 0 ? 100 * resid / Math.abs(b) : 0 };
}

/* --------------------------------------------------------------- calculs --- */

/** Longueur de la suite d'images CONSÉCUTIVES, à partir de l'image fi0 incluse, dont dt < seuil. */
export function runBelow(rec, fi0, thr = 0.006) {
  let n = 0;
  for (const r of rec) {
    if (r.fi < fi0) continue;
    if (r.fi !== fi0 + n) break;
    if (r.dt < thr) n++; else break;
  }
  return n;
}
/** Nombre d'images à dt < seuil dans [fi0, fi1]. */
export function countBelow(rec, fi0, fi1, thr = 0.006) {
  let n = 0;
  for (const r of rec) if (r.fi >= fi0 && r.fi <= fi1 && r.dt < thr) n++;
  return n;
}
export function q(arr, p) {
  if (!arr || !arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}
export const r2 = v => (v == null || !isFinite(v)) ? v : +(+v).toFixed(2);
export const r3 = v => (v == null || !isFinite(v)) ? v : +(+v).toFixed(3);

/** Vitesse à imposer au serpent pour que la caméra vise le zoom `z`.
 *  camUpdate : want = zoomBase() / (1 + (speed / BASE_SPEED - 1) × 0,22), et cam.zoom converge vers want.
 *  base : ZOOM_BASE (1,05 bureau, 1,30 tactile) éventuellement multipliée par 1,54 (mode 1) ou 0,77 (mode 2). */
export function speedForZoom(z, base, baseSpeed = 150) {
  const sp = 1 + (base / z - 1) / 0.22;
  return sp * baseSpeed;
}
