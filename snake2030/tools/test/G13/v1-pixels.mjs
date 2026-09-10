/* G13 — CONTRE-VÉRIFICATION PAR LES PIXELS (vérificateur indépendant).
   Ne fait confiance à aucun compteur d'appels : on regarde ce que le canevas AFFICHE.
   1) fusion : trois pièces d'énergie posées à moins de 30 u doivent devenir UNE tache lumineuse ;
   2) rayon : la tache fusionnée doit être plus large qu'une pièce seule (+15 % attendu) ;
   3) valeur : ramasser la pièce fusionnée doit rendre l'XP des trois ;
   4) clignotement : à t > 8 s la tache doit disparaître puis revenir d'une image à l'autre ;
   5) halo : le sprite pré-rendu doit produire un vrai dégradé (pixels décroissants), pas un disque plat. */
import { launchDesktop, startGame, save, finish, deadline, sleep } from '../lib.mjs';

deadline(150, 'G13-v1');

const HOLD = `(() => {
  const S = window.__S, M = window.__M, K = window.__K;
  const X = Math.round(K.ARENA_W / 2), Y = Math.round(K.ARENA_H / 2);
  window.__V = { X, Y, grabbed: 0 };
  if (window.__VSTOP) window.__VSTOP();
  let vivant = true; window.__VSTOP = () => { vivant = false; };
  const tenir = () => {
    if (!vivant) return;
    requestAnimationFrame(tenir);
    S.snake.x = X; S.snake.y = Y; S.snake.invuln = 1e9; S.snake.ghost = 1e9;
    S.snake.hp = S.snake.maxHp;
    S.cam.x = X; S.cam.y = Y;
    S.enemies.length = 0; S.bullets.length = 0; S.ebullets.length = 0; S.pools.length = 0;
    S.pxEff = 1; S.partEff = 1; S.paused = false;
    try { M.fx.reset(); } catch (e) {}
  };
  tenir();
})()`;

/* Analyse du canevas : composantes connexes de pixels cyan vifs dans une bande à droite du serpent. */
const SCAN = `(() => {
  const cv = document.getElementById('game');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const x0 = Math.round(W * 0.60), x1 = Math.round(W * 0.98);
  const y0 = Math.round(H * 0.30), y1 = Math.round(H * 0.70);
  const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  const w = x1 - x0, h = y1 - y0;
  const vif = new Uint8Array(w * h);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
    if (b > 140 && gg > 110 && r < 130) { vif[i] = 1; n++; }
  }
  // composantes connexes (4-voisins), pile explicite
  const vu = new Uint8Array(w * h); const comps = [];
  for (let i = 0; i < w * h; i++) {
    if (!vif[i] || vu[i]) continue;
    let pile = [i], taille = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    vu[i] = 1;
    while (pile.length) {
      const p = pile.pop(); taille++;
      const px = p % w, py = (p / w) | 0;
      if (px < minx) minx = px; if (px > maxx) maxx = px;
      if (py < miny) miny = py; if (py > maxy) maxy = py;
      if (px > 0 && vif[p - 1] && !vu[p - 1]) { vu[p - 1] = 1; pile.push(p - 1); }
      if (px < w - 1 && vif[p + 1] && !vu[p + 1]) { vu[p + 1] = 1; pile.push(p + 1); }
      if (py > 0 && vif[p - w] && !vu[p - w]) { vu[p - w] = 1; pile.push(p - w); }
      if (py < h - 1 && vif[p + w] && !vu[p + w]) { vu[p + w] = 1; pile.push(p + w); }
    }
    if (taille >= 6) comps.push({ taille, w: maxx - minx + 1, h: maxy - miny + 1, cx: (minx + maxx) / 2 + x0, cy: (miny + maxy) / 2 + y0 });
  }
  comps.sort((a, b) => b.taille - a.taille);
  return { n, comps: comps.slice(0, 6), W, H };
})()`;

const main = async () => {
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  const res = { pageErrors: 0 };
  page.on('pageerror', () => res.pageErrors++);
  await startGame(ctx);
  await sleep(600);
  await page.evaluate(HOLD);
  await sleep(400);

  // --- 1 pièce seule : référence de taille
  await page.evaluate(() => {
    const S = window.__S, V = window.__V;
    S.pickups.length = 0;
    S.pickups.push({ kind: 'energy', x: V.X + 380, y: V.Y, vx: 0, vy: 0, t: 0.5, r: 7, val: 1 });
  });
  await sleep(300);
  res.seule = await page.evaluate(SCAN);

  // --- 3 pièces à moins de 30 u : doivent fusionner
  await page.evaluate(() => {
    const S = window.__S, V = window.__V;
    S.pickups.length = 0;
    S.pickups.push({ kind: 'energy', x: V.X + 380, y: V.Y, vx: 0, vy: 0, t: 0.5, r: 7, val: 1 });
    S.pickups.push({ kind: 'energy', x: V.X + 398, y: V.Y + 6, vx: 0, vy: 0, t: 0.5, r: 7, val: 1 });
    S.pickups.push({ kind: 'energy', x: V.X + 370, y: V.Y + 14, vx: 0, vy: 0, t: 0.5, r: 7, val: 1 });
    window.__V.avant = S.pickups.length;
  });
  // une seule image suffit : fusePickups tourne dans collide()
  await sleep(300);
  res.fusion = await page.evaluate(SCAN);
  res.etat = await page.evaluate(() => {
    const S = window.__S;
    return { n: S.pickups.length, r: S.pickups[0] ? +S.pickups[0].r.toFixed(3) : null, val: S.pickups[0] ? S.pickups[0].val : null };
  });

  // --- valeur : on ramène le butin sous le serpent et on regarde l'XP
  res.xp = await page.evaluate(async () => {
    const S = window.__S, V = window.__V;
    const xp0 = S.xp + (S.level || 0) * 1e6, sc0 = S.score;
    S.pickups.length = 0;
    S.pickups.push({ kind: 'energy', x: V.X + 6, y: V.Y, vx: 0, vy: 0, t: 0.5, r: 8.05, val: 3 });
    await new Promise(r => setTimeout(r, 250));
    return { dxp: (S.xp + (S.level || 0) * 1e6) - xp0, dscore: S.score - sc0, reste: S.pickups.length };
  });

  // --- clignotement : t > 8 s, la tache doit apparaître et disparaître
  res.cli = await page.evaluate(async () => {
    const S = window.__S, V = window.__V;
    const cv = document.getElementById('game'), g = cv.getContext('2d');
    const bx = Math.round(cv.width * 0.60), by = Math.round(cv.height * 0.30);
    const bw = Math.round(cv.width * 0.38), bh = Math.round(cv.height * 0.40);
    const vus = [];
    for (let k = 0; k < 40; k++) {
      await new Promise(r => requestAnimationFrame(() => r()));
      S.pickups.length = 0;
      S.pickups.push({ kind: 'energy', x: V.X + 380, y: V.Y, vx: 0, vy: 0, t: 8.5, r: 7, val: 1 });
      await new Promise(r => requestAnimationFrame(() => r()));
      const d = g.getImageData(bx, by, bw, bh).data;
      let n = 0;
      for (let i = 0; i < bw * bh; i++) if (d[i * 4 + 2] > 140 && d[i * 4 + 1] > 110 && d[i * 4] < 130) n++;
      vus.push(n > 20 ? 1 : 0);
    }
    return { suite: vus.join(''), visibles: vus.filter(x => x).length, invisibles: vus.filter(x => !x).length };
  });

  // --- halo : profil radial d'une pièce seule, du centre vers l'extérieur
  await page.evaluate(() => {
    const S = window.__S, V = window.__V;
    S.pickups.length = 0;
    S.pickups.push({ kind: 'energy', x: V.X + 380, y: V.Y, vx: 0, vy: 0, t: 0.5, r: 7, val: 1 });
  });
  await sleep(250);
  res.halo = await page.evaluate(() => {
    const S = window.__S;
    const cv = document.getElementById('game'), g = cv.getContext('2d');
    // le centre de la tache : on le retrouve par le maximum de bleu dans la bande
    const x0 = Math.round(cv.width * 0.60), y0 = Math.round(cv.height * 0.30);
    const w = Math.round(cv.width * 0.38), h = Math.round(cv.height * 0.40);
    const d = g.getImageData(x0, y0, w, h).data;
    let best = -1, bi = 0;
    for (let i = 0; i < w * h; i++) { const v = d[i * 4 + 2] + d[i * 4 + 1]; if (v > best) { best = v; bi = i; } }
    const cx = bi % w, cy = (bi / w) | 0;
    const prof = [];
    for (let dx = 0; dx <= 40; dx += 4) {
      const i = (cy * w + Math.min(w - 1, cx + dx)) * 4;
      prof.push(d[i] + d[i + 1] + d[i + 2]);
    }
    return { prof, decroissant: prof.every((v, i) => i === 0 || v <= prof[i - 1] + 6) };
  });

  res.err = await page.evaluate(() => (window.__ERR && window.__ERR.count) || 0);

  const seuleW = res.seule.comps[0] ? res.seule.comps[0].w : 0;
  const fusW = res.fusion.comps[0] ? res.fusion.comps[0].w : 0;
  res.ratioLargeur = seuleW ? +(fusW / seuleW).toFixed(3) : null;
  const ok = {
    troisDeviennentUne: res.fusion.comps.length === 1 && res.etat.n === 1,
    valeurCumulee: res.etat.val === 3,
    rayonMajore: res.etat.r === 8.05,
    tacheGrandit: res.ratioLargeur !== null && res.ratioLargeur >= 1.05,
    xpConserve: res.xp.dxp === 3 && res.xp.reste === 0,
    clignote: res.cli.visibles > 3 && res.cli.invisibles > 3,
    haloDegrade: res.halo.decroissant && res.halo.prof[0] > res.halo.prof[6] + 60,
    sansErreur: res.pageErrors === 0 && res.err === 0
  };
  res.ok = ok;
  const pass = Object.values(ok).every(Boolean);
  save('G13-v1-pixels.json', { test: 'G13-v1', pass, measured: res });
  console.log(JSON.stringify({ pass, ok, ratioLargeur: res.ratioLargeur, etat: res.etat, xp: res.xp, cli: res.cli.suite }, null, 1));
  await finish(ctx, pass);
};
main();
