/* G9 — test 1 : la courbe de difficulté après 60 s.
 *  a) pilote dodge-greedy, cran STANDARD (1,90), n = 10, plafond 900 s :
 *     - part des parties qui atteignent le plafond <= 30 %
 *     - survie médiane dans [360 ; 720] s
 *     - kills/min du secteur 6 <= 1,5 x kills/min du secteur 3
 *     - part du temps passé à len >= 90 après 120 s <= 25 %  (prédicat len >= 90, JAMAIS
 *       len === maxHp : _upGrow relève maxHp sans plafond alors que K.MAX_LEN vaut 90)
 *  b) pilote sloppy, crans FACILE (d0) et SOUPLE (d1), 36 parties agrégées, plafond 600 s :
 *     - part des parties qui atteignent le plafond <= 20 %
 * Sortie : tools/test/out/G9-sim.json.
 *
 * Le pilote « sloppy » est reconstruit ici (retard de réaction et erreur de cap posés sur
 * le manche du pilote versionné) : les pourcentages de référence de la spec viennent d'une
 * campagne dont le pilote n'était pas versionné, ce sont les SEUILS qui font foi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launchSim } from '../simlib.mjs';

const OUT = '/home/user/manonwwk-kasiope.github.io/snake2030/tools/test/out/G9-sim.json';
const PAR = +(process.env.PAR || 4);

/* Dégradation « sloppy » : on enveloppe le pilote versionné et on abîme sa sortie —
   le cap n'est rafraîchi qu'une image sur douze et porte une erreur de +/- 0,55 rad. */
const SLOPPY = `
(function(){
  if (window.__sloppyOn) return;
  window.__sloppyOn = 1;
  const S = window.__S;
  const base = window.__pilotTick;
  let f = 0, jx = 1, jy = 0, rs = 1;
  /* Générateur PROPRE à la dégradation, semé par la graine de la partie :
     Math.random() rendait le pilote sloppy non reproductible, et avec lui la
     part des parties qui touchent le plafond — le seul chiffre du test 1 qui
     ne se rejouait pas à l'identique. */
  function rr(){ rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; }
  window.__sloppySeed = function(s){ rs = (s >>> 0) || 1; f = 0; jx = 1; jy = 0; };
  window.__pilotTick = function(){
    base();
    if (!window.__PSIM || !window.__PSIM.sloppy) return;
    if (S.phase !== 'play') return;
    if ((f++ % 12) === 0){
      const a = Math.atan2(S.input.jy, S.input.jx) + (rr() - 0.5) * 1.1;
      jx = Math.cos(a); jy = Math.sin(a);
    }
    S.input.jx = jx; S.input.jy = jy; S.input.jmag = 1;
    S.input.boost = false;
  };
})();`;

const PROBE = `
(function(){
  if (window.__C9) return;
  const S = window.__S, M = window.__M, K = window.__K;
  const C = window.__C9 = { };
  /* S.t n'est PAS remis à zéro par resetRun : c'est l'horloge du jeu, pas celle
     de la partie. La durée d'une partie se compte depuis l'image où elle
     commence, sinon on publie l'âge de l'onglet. */
  C.reset = function(){ C.long = 0; C.long90 = 0; C.kills = {}; C.temps = {}; C.t0 = -1; };
  C.reset();
  (function tick(){ requestAnimationFrame(tick);
    if (S.phase !== 'play') return;
    const s = S.snake; if (!s) return;
    if (C.t0 < 0) C.t0 = S.t;
    if (S.t - C.t0 > 120000){ C.long++; if (s.len >= 90) C.long90++; }   // len >= 90, jamais len === maxHp
    const l = S.level;
    C.temps[l] = (C.temps[l] || 0) + (S.dt || 0);
  })();
  const od = M.enemies.onDeath;
  M.enemies.onDeath = function(e){ C.kills[S.level] = (C.kills[S.level] || 0) + 1; return od.call(M.enemies, e); };
})();`;

async function unePartie(page, cfg) {
  const { diff, seed, maxT, sloppy } = cfg;
  await page.evaluate(({ diff, seed, maxT, sloppy }) => {
    const S = window.__S;
    S.opt.diff = [1.25, 1.55, 1.9, 2.3, 2.75][diff];
    S.opt.music = false; S.opt.sfx = false; S.opt.haptics = false;
    S.stats.unlocks = {};
    window.__SEED = seed; window.__DT = 1 / 60;
    /* HORLOGE DE JEU REMISE À ZÉRO AVANT LA PARTIE. resetRun ne touche pas S.t
       (c'est l'horloge du jeu, pas celle de la partie) : sa valeur au coup
       d'envoi dépend donc du nombre d'images jouées au menu, c'est-à-dire du
       moment RÉEL où Playwright a cliqué. Or S.t se lit à l'intérieur de la
       partie, et deux exécutions des mêmes graines ne donnaient pas les mêmes
       parties : c1 = 123,2 / 64,6 / 48,3 s puis 104,3 / 111,9 / 9,3 s sur les
       graines 3300-3302 du MÊME build, première partie d'une page neuve, donc
       sans report d'état d'une partie à l'autre. Avec S.t remis à zéro, les
       trois durées se reproduisent au centième : 179,9 / 21,1 / 52,9 s deux
       fois de suite. C'est la condition pour opposer une médiane à un seuil. */
    S.t = 0;
    window.__PSIM = { maxT, joy: false, god: false, sloppy: !!sloppy };
    window.__LSIM = { aborted: false };
    window.__C9.reset();
    if (window.__sloppySeed) window.__sloppySeed(seed);
    const b = Array.from(document.querySelectorAll('#ui button'))
      .filter(x => /^(JOUER|REJOUER)$/.test(x.textContent.trim()) && x.offsetParent !== null)[0];
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  }, { diff, seed, maxT, sloppy });
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 15000 });
  await page.waitForFunction(() => window.__M.ui.screen() === 'over', null, { timeout: 0, polling: 100 });
  return page.evaluate(() => {
    const S = window.__S, C = window.__C9, L = window.__LSIM;
    return { t: S.t - (C.t0 < 0 ? S.t : C.t0), kills: S.kills, level: S.level, plafond: !!(L && L.aborted),
             long: C.long, long90: C.long90, k: C.kills, temps: C.temps };
  });
}

async function lot(jobs) {
  const ctx = await launchSim('desk1440');
  const out = [];
  try {
    await ctx.page.evaluate(PROBE);
    await ctx.page.evaluate(SLOPPY);
    for (const j of jobs) out.push({ ...j, r: await unePartie(ctx.page, j) });
  } finally { await ctx.close(); }
  return out;
}

const jobs = [];
for (let i = 0; i < 10; i++) jobs.push({ nom: 'dodge-greedy-d2', diff: 2, seed: 5100 + i, maxT: 900000, sloppy: false });
for (let i = 0; i < 18; i++) jobs.push({ nom: 'sloppy-d0', diff: 0, seed: 6100 + i, maxT: 600000, sloppy: true });
for (let i = 0; i < 18; i++) jobs.push({ nom: 'sloppy-d1', diff: 1, seed: 6300 + i, maxT: 600000, sloppy: true });

const lots = Array.from({ length: PAR }, (_, i) => jobs.filter((_, j) => j % PAR === i));
const tout = (await Promise.all(lots.map(lot))).flat();

const med = a => { if (!a.length) return -1; const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const dg = tout.filter(x => x.nom === 'dodge-greedy-d2');
const sl = tout.filter(x => x.nom !== 'dodge-greedy-d2');

const res = { dodge: dg.map(x => ({ t: Math.round(x.r.t / 1000), plafond: x.r.plafond, lvl: x.r.level })),
              sloppy: sl.map(x => ({ nom: x.nom, t: Math.round(x.r.t / 1000), plafond: x.r.plafond })) };
const S = res.seuils = {};
S.dodgeN = dg.length;
S.dodgePlafondPct = +(100 * dg.filter(x => x.r.plafond).length / dg.length).toFixed(1);
S.dodgeSurvieMed = med(dg.map(x => x.r.t / 1000));
let l = 0, l90 = 0;
for (const x of dg) { l += x.r.long; l90 += x.r.long90; }
S.long90Pct = l ? +(100 * l90 / l).toFixed(1) : 0;
S.echantillons = l;
// kills par minute des secteurs 3 et 6, agrégés sur les 10 parties
let k3 = 0, t3 = 0, k6 = 0, t6 = 0;
for (const x of dg) { k3 += (x.r.k[3] || 0); t3 += (x.r.temps[3] || 0); k6 += (x.r.k[6] || 0); t6 += (x.r.temps[6] || 0); }
S.kpm3 = t3 > 5 ? +(60 * k3 / t3).toFixed(2) : -1;
S.kpm6 = t6 > 5 ? +(60 * k6 / t6).toFixed(2) : -1;
S.tempsS3 = Math.round(t3); S.tempsS6 = Math.round(t6);
S.ratio63 = (S.kpm3 > 0 && S.kpm6 > 0) ? +(S.kpm6 / S.kpm3).toFixed(2) : -1;
S.sloppyN = sl.length;
S.sloppyPlafondPct = +(100 * sl.filter(x => x.r.plafond).length / sl.length).toFixed(1);

const v = {
  t1_dodgePlafond30: S.dodgePlafondPct <= 30,
  t1_survieMediane: S.dodgeSurvieMed >= 360 && S.dodgeSurvieMed <= 720,
  t1_kills63: S.ratio63 < 0 || S.ratio63 <= 1.5,
  t1_len90: S.long90Pct <= 25,
  t1_sloppyPlafond20: S.sloppyPlafondPct <= 20
};
res.verdicts = v;
res.pass = Object.values(v).every(Boolean);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ pass: res.pass, verdicts: v, seuils: S }, null, 1));
process.exit(res.pass ? 0 : 1);
