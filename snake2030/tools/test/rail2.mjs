// NR — rail2 : latence entrée → virage sur treillis (copie adaptée de scratchpad rails2.mjs).
// Bureau 1440×900, 20 virages de 90° sur treillis ortho puis 20 sur treillis diagonal, fenêtre d'observation
// 2,4 s de jeu (144 images) par virage. Latence = images entre le keydown (ArrowUp) et le premier changement de cap > 0,05 rad.
// La latence d'un virage dépend de la distance au prochain nœud, donc de la position de départ : pour que la
// médiane soit comparable d'une exécution à l'autre (référence baseline.json), l'échantillon est rendu
// reproductible : (1) positions de départ et maintiens tirés d'un générateur à graine fixe (S2030_RAIL2_SEED, défaut
// 2030), distances au prochain nœud stratifiées (20 décalages réguliers du pas, ordre mélangé par la graine) ;
// (2) maintien du cap compté en images côté page (requestAnimationFrame) et non en ms ; (3) pas de temps
// imposé au jeu pendant la mesure (window.__DT = 1/60, sonde G1 de 90-boot.js) : une image longue de la
// machine de test ne fait plus avancer le serpent de deux pas ; (4) à l'instant du keydown ArrowUp, la tête est
// posée à un point déterministe de son rail (projection d'un point tiré du générateur sur la droite suivie), ce
// qui supprime le jeu de ±1 image entre la fin du maintien et l'arrivée de la touche par CDP.
// Treillis diagonal : cap de départ −π/4 tenu par Flèches Droite+Haut (exactement sur un rail diagonal), virage de
// 90° par Flèches Gauche+Haut (cap −3π/4) — avec ArrowRight/ArrowUp seuls, le cap 0 tombait entre deux rails et
// seuls 10 virages sur 20 étaient mesurables.
import { launchDesktop, installProbe, installInvuln, startGame, state, pullProbe, clearProbe, waitFrames, mulberry32, sleep, save, isMain, finish, deadline } from './lib.mjs';

const SEED = +(process.env.S2030_RAIL2_SEED || 2030);
const WINDOW = 144;                                 // fenêtre d'observation : 144 images = 2,4 s de jeu à pas fixe 1/60
const HOLD_MIN = 36, HOLD_VAR = 30;                // maintien 36..66 images (0,6..1,1 s à 60 Hz) : la mise sur rail (RAIL_EASE 0,5 s) est finie

const THRESH = 'mesure de 20 virages ortho + 20 diag ; ortho : médiane comparée à baseline.json par run.mjs (≤ base) ; à partir de G5 : p90 ≤ 40, max ≤ 45, diag 20/20';

function summarize(lat, dists, ms) {
  const ok = lat.filter(v => v >= 0).sort((a, b) => a - b);
  if (!ok.length) return { n: 0, of: lat.length, all: lat };
  const mean = ok.reduce((a, b) => a + b, 0) / ok.length;
  const okMs = ms.filter(v => v >= 0).sort((a, b) => a - b);
  // en images (unité de la spec ; avec __DT = 1/60 une image = 16,7 ms de jeu) et en ms réels (keydown → premier changement de cap)
  return { n: ok.length, of: lat.length, min: ok[0], med: ok[Math.floor(ok.length / 2)], p90: ok[Math.min(ok.length - 1, Math.floor(ok.length * 0.9))], max: ok[ok.length - 1],
    meanFrames: +mean.toFixed(1), meanMs: +(mean * 16.7).toFixed(0), over500ms: okMs.filter(v => v > 500).length,
    medMs: okMs.length ? +okMs[Math.floor(okMs.length / 2)].toFixed(0) : null, p90Ms: okMs.length ? +okMs[Math.min(okMs.length - 1, Math.floor(okMs.length * 0.9))].toFixed(0) : null, maxMs: okMs.length ? +okMs[okMs.length - 1].toFixed(0) : null,
    distMeanWorld: dists.length ? +(dists.reduce((a, b) => a + b, 0) / dists.length).toFixed(0) : null, all: lat, allMs: ms.map(v => v < 0 ? -1 : +v.toFixed(0)) };
}

const KEYS = { ortho: { hold: ['ArrowRight'], turn: ['ArrowUp'], ang: 0 }, diag: { hold: ['ArrowRight', 'ArrowUp'], turn: ['ArrowLeft', 'ArrowUp'], ang: -Math.PI / 4 } };

export async function run() {
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  try {
    await installProbe(page);
    await installInvuln(page);          // les dangers de niveau (rigs, nœuds) restent : un serpent mort ne tourne plus
    await startGame(ctx, { seed: SEED });
    await sleep(300);
    const api = await page.evaluate(() => { const M = window.__M; return { forceGrid: !!(M.phases && typeof M.phases.forceGrid === 'function' && M.levels && M.levels.update), dt: true }; });
    if (!api.forceGrid) return { pass: false, measured: { api }, threshold: THRESH, code: 2 };
    // arène vide : ni ennemi, ni tir, ni ramassage, ni danger de niveau ne doit perturber la mesure ; ni montée de
    // niveau (l'écran de cartes gèle les entrées et une carte changerait la vitesse) ; pas de temps imposé (sonde __DT de G1)
    await page.evaluate(() => { const M = window.__M, S = window.__S; const o = M.levels.update; M.levels.update = function (dt) { const r = o.apply(this, arguments); S.enemies.length = 0; S.ebullets.length = 0; S.pickups.length = 0; if (M.levels.hazards) M.levels.hazards.length = 0; S.xp = 0; S.lvlUps = 0; S.xpNext = 1e9; return r; }; window.__DT = 1 / 60; });
    await waitFrames(page, 3);
    const dtOk = await page.evaluate(() => Math.abs(window.__S.dt - 1 / 60) < 1e-6);
    const results = {};
    const rnd = mulberry32(SEED);
    const SPACING = await page.evaluate(() => window.__M.phases.railSpacing || 330);
    for (const axis of ['ortho', 'diag']) {
      const KA = KEYS[axis];
      // décalages stratifiés avant le prochain nœud : (k + 0,5)/20 du pas, ordre mélangé par la graine. La latence d'un
      // virage est uniforme sur [0 ; pas/vitesse] : 20 tirages au hasard donnent une médiane d'échantillon qui varie de
      // ±10 images selon la graine (61 ou 74 mesurés) ; l'échantillon stratifié rend la médiane de la population.
      const offs = Array.from({ length: 20 }, (_, k) => SPACING * (k + 0.5) / 20);
      for (let k = offs.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); const t = offs[k]; offs[k] = offs[j]; offs[j] = t; }
      await page.evaluate(a => { window.__M.phases.forceGrid(a); const S = window.__S; S.snake.x = 700; S.snake.y = 800; }, axis);
      await sleep(400);
      const lat = [], dists = [], ms = [], starts = [];
      for (let k = 0; k < 20; k++) {
        const px = 500 + rnd() * 330, py = 700 + rnd() * 330, hold = HOLD_MIN + Math.round(rnd() * HOLD_VAR);
        // point projeté sur le rail à l'instant du keydown : ortho → x = 2·pas + off (prochaine droite verticale à 3·pas,
        // distance pas − off) ; diag → (x − y)/√2 = off (prochaine droite perpendiculaire à distance pas − off)
        const off = offs[k];
        const qx = axis === 'ortho' ? 2 * SPACING + off : (700 + rnd() * 200) + off * Math.SQRT2;
        const qy = axis === 'ortho' ? 700 + rnd() * 330 : qx - off * Math.SQRT2;
        await page.evaluate(([x, y, a]) => { const S = window.__S; S.snake.x = x; S.snake.y = y; S.snake.ang = a; S.snake._ra = undefined; S.snake._rw = undefined; }, [px, py, KA.ang]);
        for (const kk of KA.hold) await page.keyboard.down(kk);
        await waitFrames(page, hold);
        for (const kk of KA.hold) await page.keyboard.up(kk);
        await waitFrames(page, 2);
        await clearProbe(page);
        const st0 = await state(page); const a0 = st0.ang;
        if (st0.phase !== 'play' || st0.paused) { lat.push(-1); ms.push(-1); starts.push({ phase: st0.phase, paused: st0.paused }); continue; }
        // à la réception du prochain keydown (avant le gestionnaire du jeu) : tête posée au point déterministe de son rail
        await page.evaluate(([qx, qy]) => { window.__onKeyOnce = function (e) { if (e.key !== 'ArrowUp') return false; const s = window.__S.snake; const a = (s._ra !== undefined) ? s._ra : s.ang; const c = Math.cos(a), sn = Math.sin(a); const u = (qx - s.x) * c + (qy - s.y) * sn; s.x += u * c; s.y += u * sn; return true; }; }, [qx, qy]);
        for (const kk of KA.turn) await page.keyboard.down(kk);
        await waitFrames(page, WINDOW);                 // fenêtre comptée en images : le treillis diagonal rend à ~36 im/s sur ce bureau, 2 400 ms de mur n'y font que ~87 images
        for (const kk of KA.turn) await page.keyboard.up(kk);
        await page.evaluate(() => { window.__onKeyOnce = null; });
        const P = await pullProbe(page);
        const mk = P.marks.find(x => x.type === 'down' && x.key === 'ArrowUp');
        if (!mk) { lat.push(-1); ms.push(-1); starts.push(null); continue; }
        const s0 = P.rec.find(r => r.fi === mk.fi + 1) || P.rec.find(r => r.fi > mk.fi);
        const ch = P.rec.find(r => r.fi > mk.fi && Math.abs(r.ang - a0) > 0.05);
        starts.push(s0 ? [+s0.x.toFixed(1), +s0.y.toFixed(1), +a0.toFixed(3), +off.toFixed(1), st0.len] : null);
        if (ch && s0) { lat.push(ch.fi - mk.fi); ms.push(ch.now - mk.now); dists.push(Math.hypot(ch.x - s0.x, ch.y - s0.y)); } else { lat.push(-1); ms.push(-1); }
      }
      results[axis] = summarize(lat, dists, ms);
      results[axis].starts = starts;
      console.log('[rail2]', axis, JSON.stringify({ ...results[axis], starts: undefined }));
    }
    results.seed = SEED; results.fixedDt = dtOk; results.spacing = SPACING;
    results.pageErrors = ctx.pageErrors.length; results.consoleErrors = ctx.consoleErrors.length;
    save('rail2.json', results);
    const measurable = results.ortho.n >= 10;
    return { pass: measurable, measured: results, threshold: THRESH, code: measurable ? 0 : 2 };
  } finally { await ctx.close(); }
}

if (isMain(import.meta.url)) {
  deadline(400, 'rail2');
  finish('rail2', await run());
}
