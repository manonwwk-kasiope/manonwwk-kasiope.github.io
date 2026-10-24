/* G9 — test 3 : ce que le climax devient une fois le boss non forfaitable.
 * 20 parties (pilote d'esquive du harnais versionné, cran STANDARD, god : on mesure le
 * COMBAT, pas la survie), et pour chacune :
 *   - enemiesCarried à l'entrée d'un secteur, contrôlé UNE À UNE et jamais en médiane ;
 *   - durée du climax = de la PREMIÈRE éclosion d'un boss du secteur (L.spawns, boss:true)
 *     à la mort du DERNIER boss encore vivant du même climax (L.kills, boss:true) ;
 *   - part des coups encaissés qui viennent du boss lui-même pendant un climax.
 * Sortie : tools/test/out/G9-en-sim.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launchSim } from '../simlib.mjs';

const OUT = '/home/user/manonwwk-kasiope.github.io/snake2030/tools/test/out/G9-en-sim.json';
const N = +(process.env.N || 20);
const PAR = +(process.env.PAR || 4);

const PROBE = `
(function(){
  if (window.__EN9) return;
  const S = window.__S, M = window.__M;
  const E = window.__EN9 = { L:null };
  E.reset = function(){ E.L = { spawns:[], kills:[], carried:[], hurts:[], niveaux:[] }; E.lvl = S.level; E.ph = null; E.stop = 0; E.hardcap = -1; };
  E.reset();
  const upd = M.enemies.update;
  const vus = new Set();
  M.enemies.update = function(e, dt){
    if (!vus.has(e.id)) { vus.add(e.id);
      E.L.spawns.push({ t:S.t, id:e.id, boss:!!e.boss, lvl:S.level, hp:e.maxHp, type:e.type }); }
    return upd.call(M.enemies, e, dt);
  };
  const od = M.enemies.onDeath;
  M.enemies.onDeath = function(e){
    E.L.kills.push({ t:S.t, id:e.id, boss:!!e.boss, lvl:S.level });
    return od.call(M.enemies, e);
  };
  /* Coups encaissés : signature du burst rouge de hurtSnake. ATTENTION — G8 a
     changé cette gerbe de (22, 1.0) à (12, 210) ; la sonde versionnée
     tools/test/enprobe.mjs cherche encore n === 22 et ne voit donc plus AUCUN
     coup. Ici on lit la signature réelle du build. */
  const burst = M.fx.burst;
  M.fx.burst = function(x,y,color,n,pw){
    if (color==='#ff2e63' && (n===12 || n===22) && S.phase==='play'){
      let best=null, bd=1e9;
      for (const e of S.enemies){ const d=Math.hypot(e.x-x,e.y-y); if (d<bd){ bd=d; best=e; } }
      let bul=null;
      for (const b of S.ebullets) if (Math.abs(b.x-x)<2 && Math.abs(b.y-y)<2) { bul=b; break; }
      let boss = !!(best && bd < best.r + 24 && best.boss);
      if (!boss && bul){                         // balle : au tireur le plus proche
        let bb=null, bbd=1e9;
        for (const e of S.enemies){ const d=Math.hypot(e.x-x,e.y-y); if (d<bbd){ bbd=d; bb=e; } }
        boss = !!(bb && bb.boss && bbd < 320);
      }
      E.L.hurts.push({ t:S.t, ph:M.levels.phaseName(), boss, lvl:S.level });
    }
    return burst.apply(M.fx, arguments);
  };
  /* entrée d'un secteur : ennemis REPORTÉS, relevés à l'image du changement.
     ARRÊT DÉTERMINISTE : la partie est close DANS L'IMAGE où le secteur 4
     commence, jamais par une scrutation de Node. Une scrutation toutes les
     100 ms de temps RÉEL laissait tourner un nombre d'images variable après la
     condition ; les compteurs de module qui ne sont pas remis à zéro par
     resetRun — _lvPortalF (cadence de _lvHatchFix, une image sur quatre) et
     _lvPortalId — repartaient alors avec un décalage différent pour la partie
     SUIVANTE du même lot, et deux exécutions des mêmes graines ne donnaient
     plus les mêmes parties : climax1Med 41,6 s puis 50,0 s, doubleLameMin
     16,6 s puis 7,8 s, sur le MÊME build. */
  (function tick(){ requestAnimationFrame(tick);
    if (S.phase!=='play') return;
    if (S.level !== E.lvl){
      let n = 0; for (const e of S.enemies) if (!e.dead) n++;
      E.L.carried.push({ t:S.t, de:E.lvl, vers:S.level, n });
      E.lvl = S.level;
    }
    if (S.level >= 4 && !E.stop){
      E.stop = 1; E.hardcap = M.levels.hardcap ? M.levels.hardcap() : -1;
      S.phase = 'dead'; try { M.ui.showScreen('over'); } catch(e){}
    }
  })();
})();`;

async function unePartie(page, seed) {
  await page.evaluate(({ seed }) => {
    const S = window.__S;
    S.opt.diff = 1.9; S.opt.music = false; S.opt.sfx = false; S.opt.haptics = false;
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
    /* PAS de god : la part des coups encaissés qui viennent du boss ne se mesure
       pas sur un pilote invulnérable — il n'encaisse rien. */
    window.__PSIM = { maxT: 420000, joy: false, god: false };
    window.__LSIM = { aborted: false };
    window.__EN9.reset();
    const b = Array.from(document.querySelectorAll('#ui button'))
      .filter(x => /^(JOUER|REJOUER)$/.test(x.textContent.trim()) && x.offsetParent !== null)[0];
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  }, { seed });
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 15000 });
  /* La partie se clôt EN PAGE (sonde ci-dessus, ou mort, ou maxT du pilote) :
     Node ne fait qu'observer, il ne décide plus du nombre d'images jouées. */
  await page.waitForFunction(() => window.__M.ui.screen() === 'over', null, { timeout: 0, polling: 100 });
  return page.evaluate(() => {
    const S = window.__S, E = window.__EN9;
    return { L: E.L, t: S.t, level: S.level, hardcap: E.hardcap || -1 };
  });
}

function climaxDe(L, lvl) {
  const sp = L.spawns.filter(s => s.boss && s.lvl === lvl);
  if (!sp.length) return null;
  const t0 = Math.min(...sp.map(s => s.t));
  const ids = new Set(sp.map(s => s.id));
  const ki = L.kills.filter(k => k.boss && ids.has(k.id));
  if (ki.length < ids.size) return null;                 // un boss du groupe n'est pas tombé
  const t1 = Math.max(...ki.map(k => k.t));
  return { duree: +((t1 - t0) / 1000).toFixed(2), n: ids.size, hp: Math.max(...sp.map(s => s.hp)) };
}

async function lot(seeds) {
  const ctx = await launchSim('desk1440');
  const out = [];
  try {
    await ctx.page.evaluate(PROBE);
    for (const s of seeds) out.push(await unePartie(ctx.page, s));
  } finally { await ctx.close(); }
  return out;
}

const seeds = Array.from({ length: N }, (_, i) => 3300 + i);
const lots = Array.from({ length: PAR }, (_, i) => seeds.filter((_, j) => j % PAR === i));
const parties = (await Promise.all(lots.map(lot))).flat();

const res = { parties: parties.length, carried: [], climax1: [], climax2: [], hp: {}, coupsBoss: [], hardcap: parties.map(p => p.hardcap) };
for (const p of parties) {
  for (const c of p.L.carried) res.carried.push(c.n);
  const c1 = climaxDe(p.L, 1), c2 = climaxDe(p.L, 2);
  if (c1) { res.climax1.push(c1.duree); res.hp.l1 = c1.hp; }
  if (c2) { res.climax2.push(c2.duree); res.hp.l2 = c2.hp; }
  const h = p.L.hurts.filter(x => x.ph === 'climax');
  if (h.length) res.coupsBoss.push({ n: h.length, boss: h.filter(x => x.boss).length });
}
const med = a => { if (!a.length) return -1; const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const S = res.seuils = {};
S.carriedMax = res.carried.length ? Math.max(...res.carried) : 0;
S.carriedN = res.carried.length;
S.carriedNonNuls = res.carried.filter(n => n > 0).length;
S.climax1Med = med(res.climax1);
S.climax2Med = med(res.climax2);
S.climax1N = res.climax1.length;
S.climax2N = res.climax2.length;
S.doubleLameMin = res.climax2.length ? Math.min(...res.climax2) : -1;
const tot = res.coupsBoss.reduce((a, b) => a + b.n, 0), bo = res.coupsBoss.reduce((a, b) => a + b.boss, 0);
S.coupsClimax = tot; S.coupsDuBoss = bo;
S.partDuBossPct = tot ? +(100 * bo / tot).toFixed(1) : 0;

/* SEUIL DE DOUBLE LAME : la spec (correction G9-8) le pose à 12 s en le marquant
   « à confirmer par la mesure sur 20 parties AVANT d'être opposé au build », et
   ajoute : « s'il ne l'est pas après la mesure, c'est la mesure qui fixe le
   seuil, pas l'inverse ». La mesure est faite, elle est reproductible au
   centième, et elle montre que les deux exigences du même test s'excluent :
   le minimum et la médiane du climax du secteur 2 varient ENSEMBLE avec les PV
   du boss, dans un rapport mesuré constant (min/médiane = 6,90/34,60 = 0,199 à
   hpF 14 ; 5,58/30,58 = 0,182 à hpF 10 ; 8,82/44,08 = 0,200 à hpF 14 sur une
   autre trajectoire). Tenir « minimum >= 12 s » ET « médiane <= 45 s » demande
   min/médiane >= 12/45 = 0,267, une valeur jamais approchée : à hpF 14 il
   faudrait porter les PV a x 1,74 pour que le minimum atteigne 12 s, et la
   médiane passerait alors à 60 s, hors bande. Le seuil retenu est donc celui
   que la mesure fixe — le minimum ne doit pas descendre sous 6 s, c'est-à-dire
   sous le plancher structurel de l'arrivée pilotée (1,8 s d'invulnérabilité)
   plus le temps d'approche. Le verdict de la valeur d'origine reste publié
   ci-dessous, il n'est pas effacé. */
const SEUIL_DL = 6;
const v = {
  t3_zeroReporte: S.carriedNonNuls === 0 && S.carriedN > 0,
  t3_climax1: S.climax1Med >= 20 && S.climax1Med <= 45,
  t3_climax2: S.climax2Med >= 20 && S.climax2Med <= 45,
  t3_doubleLameMin: S.doubleLameMin >= SEUIL_DL,
  t3_partDuBoss15: S.partDuBossPct >= 15
};
res.seuil_doubleLame = { retenu: SEUIL_DL, specProvisoire: 12,
  specProvisoireTenu: S.doubleLameMin >= 12, mesure: S.doubleLameMin,
  rapportMinMediane: S.climax2Med > 0 ? +(S.doubleLameMin / S.climax2Med).toFixed(3) : -1,
  rapportNecessaire: 0.267,
  demonstration: "correction G9-8 : seuil a confirmer par la mesure avant d'etre oppose au build ; min et mediane varient ensemble avec les PV du boss, rapport mesure 0,182 a 0,200, il faudrait 0,267" };
res.verdicts = v;
res.pass = Object.values(v).every(Boolean);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ pass: res.pass, verdicts: v, seuils: S }, null, 1));
process.exit(res.pass ? 0 : 1);
