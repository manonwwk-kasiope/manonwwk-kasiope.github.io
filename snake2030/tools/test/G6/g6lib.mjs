// Aides communes aux tests G6 (menaces lisibles) : arène vide à pas de temps fixe, apparitions forcées de
// laboratoire, journal d'événements du jeu (S.log), attente en temps de JEU, bande de pixels du cadre.
import { sleep } from '../lib.mjs';

export const SEED = 2030;

/** Arène vide (ni ennemi, ni ramassage, ni danger, ni montée de niveau) et pas de temps imposé 1/60 s
 *  (sonde __DT de 90-boot.js, G1) : une image = 16,7 ms de jeu quel que soit le temps réel.
 *  opts.keepEnemies : les ennemis posés par le laboratoire survivent (seules les vagues sont coupées).
 *  opts.onlyLab : seuls les ennemis du laboratoire (id ≥ 900000) survivent, les vagues sont balayées à chaque image.
 *  opts.keepEBullets : les projectiles ennemis ne sont plus effacés (indispensable pour en poser un à la main).
 *  opts.noFire : les armes du joueur ne tirent plus (les tirs traversent la zone mesurée). */
export async function emptyArena(page, opts = {}) {
  await page.evaluate(([keep, noFire, keepEB, onlyLab]) => {
    const M = window.__M, S = window.__S, o = M.levels.update;
    M.levels.update = function (dt) {
      const r = o.apply(this, arguments);
      if (onlyLab) { for (let i = S.enemies.length - 1; i >= 0; i--) if (S.enemies[i].id < 900000) S.enemies.splice(i, 1); }
      else if (!keep) S.enemies.length = 0;
      if (!keepEB) S.ebullets.length = 0;
      S.pickups.length = 0;
      if (M.levels.hazards) M.levels.hazards.length = 0;
      S.xp = 0; S.lvlUps = 0; S.xpNext = 1e9;
      if (noFire) { S.bullets.length = 0; if (S.drones) S.drones.length = 0; }
      return r;
    };
    if (noFire && M.weapons) M.weapons.update = function () {};
    window.__DT = 1 / 60;
  }, [!!opts.keepEnemies, !!opts.noFire, !!opts.keepEBullets, !!opts.onlyLab]);
}

/** Coupe uniquement les vagues du niveau (les ennemis déjà présents vivent leur vie) et impose le pas de temps. */
export async function noWaves(page) {
  await page.evaluate(() => {
    const M = window.__M, S = window.__S, o = M.levels.update;
    M.levels.update = function (dt) { const r = o.apply(this, arguments); S.pickups.length = 0; S.xp = 0; S.lvlUps = 0; S.xpNext = 1e9; return r; };
    window.__DT = 1 / 60;
  });
}

/** Attend `ms` millisecondes de TEMPS DE JEU (S.t), avec un garde-fou en temps réel. */
export async function waitGame(page, ms, wallCapMs) {
  const cap = wallCapMs || Math.max(4000, ms * 4);
  const t0 = Date.now();
  const start = await page.evaluate(() => window.__S.t);
  while (Date.now() - t0 < cap) {
    const t = await page.evaluate(() => window.__S.t);
    if (t - start >= ms) return t - start;
    await sleep(30);
  }
  throw new Error('waitGame : ' + ms + ' ms de jeu non écoulés en ' + cap + ' ms réels');
}

/** Attend n images (compteur rAF posé par cette fonction). */
export async function waitFramesLocal(page, n) {
  await page.evaluate(n => new Promise(r => { let k = 0; (function f() { if (++k >= n) r(); else requestAnimationFrame(f); })(); }), n);
}

/** Laboratoire : window.__lab.spawn(type, dx, dy, mods) pose un ennemi à (tête + dx, dy) par le même
 *  constructeur que le jeu (defs + mods + init) ; get(id), clear(), ebullet(...) posent le décor. */
export async function installLab(page) {
  await page.evaluate(() => {
    const S = window.__S, M = window.__M;
    window.__lab = {
      spawn(type, dx, dy, mods) {
        const d = M.enemies.defs[type]; if (!d) return null;
        const dm = S.opt.diff, s = S.snake;
        const e = { id: 900000 + (window.__labId = (window.__labId || 0) + 1), type, x: s.x + dx, y: s.y + dy, vx: 0, vy: 0, ang: 0, t: 0, r: d.r || 14,
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
      /** Projectile ennemi posé au point monde (x, y). */
      ebullet(x, y, vx, vy, o) {
        const b = Object.assign({ x, y, vx: vx || 0, vy: vy || 0, r: 6, dmg: 1, life: 2, color: '#ff2e63' }, o || {});
        S.ebullets.push(b);
        return b;
      }
    };
  });
}

/** Journal d'événements du jeu : pose S.log = [] (le jeu y journalise ses événements « si présent »)
 *  et rend un lecteur. Rend false si le tableau n'a pas pu être posé. */
export async function installLog(page) {
  return page.evaluate(() => { try { window.__S.log = []; return Array.isArray(window.__S.log); } catch (e) { return false; } });
}
export async function readLog(page, clear = false) {
  return page.evaluate((clear) => {
    const L = window.__S.log || [];
    const out = L.map(e => { try { return JSON.parse(JSON.stringify(e)); } catch (x) { return { kind: String(e) }; } });
    if (clear) L.length = 0;
    return out;
  }, clear);
}

/** Compteur de particules : enveloppe M.fx.burst et retient (t, x, y, couleur, n) de chaque appel. */
export async function installBurstSpy(page) {
  await page.evaluate(() => {
    const M = window.__M, S = window.__S;
    if (window.__burstSpy) { window.__burstSpy.length = 0; return; }
    const spy = window.__burstSpy = [];
    const orig = M.fx.burst;
    M.fx.burst = function (x, y, color, n, power, opts) {
      spy.push({ t: S.t, x, y, color, n: n === undefined ? 10 : n });
      return orig.apply(M.fx, arguments);
    };
  });
}
export async function readBursts(page, clear = true) {
  return page.evaluate((clear) => { const s = window.__burstSpy || []; const out = s.slice(); if (clear) s.length = 0; return out; }, clear);
}

/** Fige la scène : la tête est reposée au même point (et au même cap) après chaque image, la vitesse est nulle.
 *  La caméra cesse de dériver : deux captures successives ne diffèrent que par ce qui est dessiné en plus. */
export async function pinSnake(page, x, y, ang) {
  await page.evaluate(([x, y, ang]) => {
    const S = window.__S;
    window.__pin = { x, y, ang };
    if (window.__pinOn) return;
    window.__pinOn = true;
    (function g() {
      requestAnimationFrame(g);
      const p = window.__pin, s = S.snake;
      if (!p || !s) return;
      s.x = p.x; s.y = p.y; s.ang = p.ang; s.aim = p.ang; s.speed = 0;
      s.invuln = 1e9; s.ghost = 1e9;
      S.cam.x = p.x; S.cam.y = p.y;
    })();
  }, [x, y, ang]);
}

/** Bande de 40 px du cadre (haut, bas, gauche, droite) du canvas de jeu, en luminance Rec. 709,
 *  échantillonnée un pixel sur deux. installBand pose les outils ; grabBand() capture, diffBand(ref) compare. */
export async function installBand(page, bandPx = 40) {
  return page.evaluate((bandPx) => {
    const cv = document.getElementById('game');
    if (!cv) return null;
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const dpr = W / Math.max(1, cv.getBoundingClientRect().width);      // pixels de tampon par pixel CSS
    const b = Math.max(4, Math.round(bandPx * dpr));
    const strips = [ [0, 0, W, b], [0, H - b, W, b], [0, b, b, H - 2 * b], [W - b, b, b, H - 2 * b] ];
    window.__band = {
      W, H, b, dpr, bandPx,
      grab() {
        const out = [];
        for (const [x, y, w, h] of strips) {
          if (w <= 0 || h <= 0) continue;
          const d = g.getImageData(x, y, w, h).data;
          const a = new Float32Array(Math.ceil(w / 2) * Math.ceil(h / 2));
          let k = 0;
          for (let yy = 0; yy < h; yy += 2) for (let xx = 0; xx < w; xx += 2) {
            const i = (yy * w + xx) * 4;
            a[k++] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          }
          out.push(a);
        }
        return out;
      },
      diff(a, c) {
        if (!a || !c) return -1;
        let n = 0;
        for (let s = 0; s < a.length; s++) { const p = a[s], q = c[s]; for (let i = 0; i < p.length; i++) if (Math.abs(p[i] - q[i]) > 20) n++; }
        return n * 4;                                      // un échantillon = 4 pixels du tampon (pas de 2 en x et y)
      }
    };
    return { W, H, band: b, dpr };
  }, bandPx);
}
