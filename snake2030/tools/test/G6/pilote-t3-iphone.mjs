// G6 test 3 — portail d'apparition (bureau 1440×900, rendu réel, pas de temps imposé 1/60 s, graine imposée).
// Scène figée : tête reposée au même point après chaque image (caméra immobile), progression des phases
// neutralisée, et chaque ennemi produit par les vagues est relevé PUIS retiré à l'image de sa naissance
// (les ennemis eux-mêmes ne doivent pas bouger les pixels de la bande mesurée).
// Pour chaque apparition on exige :
//   - un événement 'portal' journalisé dans S.log entre 550 et 650 ms avant la première image de l'ennemi ;
//   - au moins 100 pixels modifiés dans la bande de 40 px du cadre pendant la fenêtre du portail,
//     par rapport à la dernière capture prise hors fenêtre (luminance Rec. 709, seuil 20).
// Seuil : ≥ 95 % des apparitions conformes. Le bruit de fond (deux captures hors fenêtre) est mesuré et
// rapporté : au-delà de 100 pixels la mesure ne prouverait rien et le test sort en code 2.
import { launchDesktop, launchPhone, startGame, save, finish, deadline, sleep } from '../lib.mjs';
import { SEED, installLog, installBand, pinSnake } from './g6lib.mjs';

deadline(600, 3);
const THRESH = "≥ 95 % des apparitions précédées d'un 'portal' dans S.log 550-650 ms avant, avec ≥ 100 pixels modifiés dans la bande de 40 px du cadre";
const GAME_MS = +(process.env.S2030_G6T3_MS || 75000);
const m = {};
let code = 1;

const ctx = await launchPhone();   // profil iPhone 13 paysage : les chevrons n'ont jamais été vérifiés en pixels ici
const { page } = ctx;
try {
  await startGame(ctx, { seed: SEED });
  const logOk = await installLog(page);
  // instant d'installation du journal : une apparition dont le portail aurait dû être
  // journalisé AVANT ce point ne peut pas être jugée (le jeu n'avait pas encore de S.log).
  const tLog = await page.evaluate(() => window.__S.t);
  m.logInstalle = logOk;
  m.tJournal = Math.round(tLog);
  const band = await installBand(page, 40);
  m.bande = band;
  if (!band) { m.pourquoi = 'canvas #game introuvable'; code = 2; }
  else {
    await pinSnake(page, 1600, 900, 0);
    await page.evaluate(() => {
      const S = window.__S, M = window.__M;
      window.__DT = 1 / 60;
      S.opt.reduceShake = true;                       // ni secousse ni cycle de zoom : la caméra ne bouge plus
      try { M.phases.reset(); } catch (e) {}
      M.phases.update = function () {};               // ni bascule, ni roulis, ni treillis pendant la mesure
      M.weapons.update = function () {};               // les tirs du joueur traversent la bande mesurée
    });
    await sleep(600);
    // moniteur : relève les naissances dans levels.update, les événements 'portal' de S.log, et la bande
    await page.evaluate(() => {
      const S = window.__S, M = window.__M;
      const P = window.__portal = { spawns: [], portals: [], windows: [], noise: [], grabs: 0, logSeen: 0, tStart: S.t };
      const orig = M.levels.update;
      M.levels.update = function (dt) {
        const r = orig.apply(this, arguments);
        for (const e of S.enemies) P.spawns.push({ t: S.t, type: e.type, x: Math.round(e.x), y: Math.round(e.y), elite: !!e.elite, boss: !!e.boss });
        S.enemies.length = 0; S.ebullets.length = 0; S.pickups.length = 0;
        S.bullets.length = 0; if (S.drones) S.drones.length = 0;
        if (M.levels.hazards) M.levels.hazards.length = 0;
        S.xp = 0; S.lvlUps = 0; S.xpNext = 1e9;
        return r;
      };
      function isPortal(e) {
        if (!e) return false;
        if (typeof e === 'string') return e.indexOf('portal') >= 0;
        const k = e.kind || e.type || e.ev || e.event || e.name || e.k || '';
        if (String(k).indexOf('portal') >= 0) return true;
        try { return JSON.stringify(e).indexOf('portal') >= 0; } catch (x) { return false; }
      }
      let ref = null, fi = 0, win = null;
      (function tick() {
        requestAnimationFrame(tick);
        if (S.phase !== 'play') return;
        fi++;
        // nouveaux événements du journal
        const L = S.log;
        if (Array.isArray(L)) {
          for (let i = P.logSeen; i < L.length; i++) {
            const e = L[i];
            if (!isPortal(e)) continue;
            const t = (e && typeof e.t === 'number') ? e.t : ((e && typeof e.time === 'number') ? e.time : S.t);
            const rec = { t, tSeen: S.t, px: 0, i: P.portals.length };
            P.portals.push(rec);
            if (!win || S.t > win.tEnd) win = { tEnd: S.t + 700, recs: [rec], px: 0 };
            else { win.tEnd = Math.max(win.tEnd, S.t + 700); win.recs.push(rec); }
            if (P.windows.indexOf(win) < 0) P.windows.push(win);
          }
          P.logSeen = L.length;
        }
        const B = window.__band;
        if (!ref) { ref = B.grab(); P.grabs++; return; }      // référence disponible dès la première image
        if (win && S.t <= win.tEnd) {                      // fenêtre active : on compare à la dernière référence
          // chaque portail garde le MAXIMUM mesuré PENDANT SA PROPRE vie : un portail
          // qui rejoint une fenêtre déjà ouverte après son pic doit pouvoir marquer
          // ses propres pixels (sinon il reste à 0 quoi que dessine le jeu).
          if (ref) { const d = B.diff(ref, B.grab()); P.grabs++; if (d > win.px) win.px = d; for (const r of win.recs) { if (d > r.px) r.px = d; } }
        } else {
          win = null;
          if (fi % 6 === 0) {                              // hors fenêtre : référence + bruit de fond
            const cur = B.grab(); P.grabs++;
            if (ref) P.noise.push(B.diff(ref, cur));
            ref = cur;
          }
        }
      })();
    });
    // laisse tourner GAME_MS de temps de jeu
    const t0 = await page.evaluate(() => window.__S.t);
    const wall0 = Date.now();
    while (Date.now() - wall0 < GAME_MS * 3 + 60000) {
      const st = await page.evaluate(() => ({ t: window.__S.t, ph: window.__S.phase }));
      if (st.ph !== 'play' || st.t - t0 >= GAME_MS) break;
      await sleep(500);
    }
    const R = await page.evaluate(() => {
      const P = window.__portal, S = window.__S;
      const nz = P.noise.slice().sort((a, b) => a - b), q = p => nz.length ? nz[Math.min(nz.length - 1, Math.floor(nz.length * p))] : 0;
      return { spawns: P.spawns, portals: P.portals.map(r => ({ t: r.t, tSeen: r.tSeen, px: r.px })),
        noise: { n: nz.length, p50: q(0.5), p90: q(0.9), p95: q(0.95), max: nz.length ? nz[nz.length - 1] : 0 },
        grabs: P.grabs, logLen: Array.isArray(S.log) ? S.log.length : -1,
        tGame: Math.round(S.t - P.tStart), phase: S.phase };
    });
    // appariement : chaque apparition cherche un portail non utilisé 550-650 ms avant sa première image
    const used = new Set();
    let ok = 0, okTime = 0, okPx = 0;
    const misses = [];
    let horsPortee = 0;
    for (const s of R.spawns) {
      if (s.t < tLog + 660) { horsPortee++; continue; }   // portail antérieur au journal : non jugeable
      let best = -1, bestD = 1e9;
      for (let i = 0; i < R.portals.length; i++) {
        if (used.has(i)) continue;
        const dt = s.t - R.portals[i].t;
        if (dt < 550 || dt > 650) continue;
        const d = Math.abs(dt - 600);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best < 0) { if (misses.length < 12) misses.push({ t: Math.round(s.t), type: s.type, cause: 'aucun portal 550-650 ms avant' }); continue; }
      used.add(best);
      okTime++;
      const px = R.portals[best].px;
      if (px >= 100) { ok++; okPx++; }
      else if (misses.length < 12) misses.push({ t: Math.round(s.t), type: s.type, cause: 'pixels de bande ' + px + ' < 100' });
    }
    const n = R.spawns.length - horsPortee;
    m.mesure = { apparitions: n, ignoreesAvantJournal: horsPortee, portauxJournalises: R.portals.length, entreesJournal: R.logLen,
      conformes: ok, conformesPct: n ? +(100 * ok / n).toFixed(1) : 0,
      portalDansLaFenetre: okTime, portalDansLaFenetrePct: n ? +(100 * okTime / n).toFixed(1) : 0,
      pixelsBandeOk: okPx, bruitDeFond: R.noise, captures: R.grabs,
      secondesDeJeu: Math.round(R.tGame / 1000), phaseFinale: R.phase, exemples: misses };
    m.erreursPage = ctx.pageErrors.slice(0, 4).concat(ctx.consoleErrors.slice(0, 4));
    if (n < 40) { m.pourquoi = 'moins de 40 apparitions relevées (' + n + ')'; code = 2; }
    else if (R.noise.p95 >= 100) { m.pourquoi = 'bruit de fond p95 = ' + R.noise.p95 + ' pixels : la bande bouge sans portail, mesure non concluante'; code = 2; }
    else code = (m.mesure.conformesPct >= 95) ? 0 : 1;
  }
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 500);
  code = 2;
} finally {
  await ctx.close();
}
save('PILOTE-t3-portail-iphone.json', m);   // nom distinct : ne pas écraser le résultat de l'exécuteur
finish(3, { pass: code === 0, code, measured: m.mesure || m, threshold: THRESH });
