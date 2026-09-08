// G6 test 1 — menaces lisibles, mesure statistique sur 20 parties × 3 fenêtres (1440×900, 2560×1080,
// iPhone 13 paysage 844×390), simulation accélérée sans rendu (simlib.mjs) + sonde enprobe.mjs.
// Pas de temps imposé (window.__DT = 1/60) et graine imposée (window.__SEED = 6000 + n) : mêmes vagues d'une
// exécution à l'autre. Chaque partie court jusqu'à la mort ou 240 s de temps de jeu.
//
// Seuils (spec G6) :
//   - apparitions avec inView = true à leur première image      = 0 %   (aujourd'hui 17-29 %)
//   - 'wind' avec inView = false (cutter/interceptor/shooter/spawner) = 0 %   (30-71 %)
//   - coups 'bullet'                                            ≤ 25 % du total (52 %)
//   - coups 'bullet' sur un segment d'indice > 8                = 0
//   - coups 'cutter:dash' dont la source est visible depuis < 600 ms ≤ 3 %
// Les couvées (enfants d'une pondeuse, apparues à son contact) sont exclues des apparitions et des annonces :
// elles naissent par construction au contact d'un ennemi déjà visible, la règle « hors champ » ne les vise pas.
import { save, finish, deadline } from '../lib.mjs';
import { launchSim, runOne } from '../simlib.mjs';
import { PROBE_SRC, pctOf } from '../enprobe.mjs';

deadline(1500, 1);

const RUNS = +(process.env.S2030_G6T1_RUNS || 20);
const MAXT = +(process.env.S2030_G6T1_MAXT || 240000);      // ms de temps de jeu par partie
const VIEWS = (process.env.S2030_G6T1_VIEWS || 'desk1440,desk2560,iphone').split(',');
const WIND_TYPES = ['cutter', 'interceptor', 'shooter', 'spawner'];
const THRESH = 'spawn inView = 0 % ; wind hors champ (cutter/interceptor/shooter/spawner) = 0 % ; bullet ≤ 25 % des coups ; bullet sur segment > 8 = 0 ; cutter:dash source vue < 600 ms ≤ 3 % des cutter:dash';

const m = { runs: RUNS, maxTms: MAXT, views: {}, total: {} };
const errors = [];

function empty() {
  return { runs: 0, gameSecs: 0, spawns: 0, spawnBrood: 0, spawnInView: 0, spawnInViewList: [],
    winds: 0, windsOff: 0, windsOffList: [], hurts: 0, unknown: 0, bullet: 0, bulletDeep: 0, bulletDeepList: [],
    cutterDash: 0, cutterDashFresh: 0, bySrc: {} };
}
function merge(a, b) {
  for (const k of Object.keys(a)) {
    if (Array.isArray(a[k])) a[k] = a[k].concat(b[k]).slice(0, 40);
    else if (k === 'bySrc') { for (const s in b.bySrc) a.bySrc[s] = (a.bySrc[s] || 0) + b.bySrc[s]; }
    else a[k] += b[k];
  }
  return a;
}

const EXTRACT = (WIND_TYPES) => {
  const L = window.__EP.L;
  const o = { runs: 1, gameSecs: Math.round((L.tEnd - L.t0) / 1000), spawns: 0, spawnBrood: 0, spawnInView: 0, spawnInViewList: [],
    winds: 0, windsOff: 0, windsOffList: [], hurts: L.hurts.length, unknown: L.unknown, bullet: 0, bulletDeep: 0, bulletDeepList: [],
    cutterDash: 0, cutterDashFresh: 0, bySrc: {} };
  for (const s of L.spawns) {
    if (s.brood) { o.spawnBrood++; continue; }
    o.spawns++;
    if (s.inView) { o.spawnInView++; if (o.spawnInViewList.length < 12) o.spawnInViewList.push({ t: Math.round(s.t), type: s.type, d: s.d, lvl: s.level }); }
  }
  for (const e of L.tele) {
    if (e.kind !== 'wind' || e.brood || WIND_TYPES.indexOf(e.type) < 0) continue;
    o.winds++;
    if (!e.inView) { o.windsOff++; if (o.windsOffList.length < 12) o.windsOffList.push({ t: Math.round(e.t), type: e.type, d: e.d }); }
  }
  for (const h of L.hurts) {
    o.bySrc[h.src] = (o.bySrc[h.src] || 0) + 1;
    if (h.src === 'bullet') {
      o.bullet++;
      if (h.segIdx > 8) { o.bulletDeep++; if (o.bulletDeepList.length < 12) o.bulletDeepList.push({ t: Math.round(h.t), seg: h.segIdx, headD: h.headD }); }
    }
    if (h.src === 'cutter:dash') { o.cutterDash++; if (h.seenMs === null || h.seenMs < 0 || h.seenMs < 600) o.cutterDashFresh++; }
  }
  return o;
};

let code = 1;
try {
  const totals = empty();
  for (const view of VIEWS) {
    const sim = await launchSim(view);
    try {
      await sim.page.evaluate(PROBE_SRC);
      const agg = empty();
      for (let i = 0; i < RUNS; i++) {
        await sim.page.evaluate(() => window.__EP.reset());
        await runOne(sim.page, { seed: 6000 + i, maxT: MAXT, diff: 1 });
        const o = await sim.page.evaluate(EXTRACT, WIND_TYPES);
        merge(agg, o);
      }
      const v = m.views[view] = {
        parties: agg.runs, secondesDeJeu: agg.gameSecs,
        apparitions: agg.spawns, apparitionsCouvee: agg.spawnBrood, apparitionsEnVue: agg.spawnInView, apparitionsEnVuePct: pctOf(agg.spawnInView, agg.spawns),
        annonces: agg.winds, annoncesHorsChamp: agg.windsOff, annoncesHorsChampPct: pctOf(agg.windsOff, agg.winds),
        coups: agg.hurts, coupsInconnus: agg.unknown, bullet: agg.bullet, bulletPct: pctOf(agg.bullet, agg.hurts),
        bulletSegSup8: agg.bulletDeep, cutterDash: agg.cutterDash, cutterDashFrais: agg.cutterDashFresh,
        cutterDashFraisPct: pctOf(agg.cutterDashFresh, agg.cutterDash),
        exemples: { apparitionsEnVue: agg.spawnInViewList, annoncesHorsChamp: agg.windsOffList, bulletProfond: agg.bulletDeepList },
        bySrc: agg.bySrc
      };
      merge(totals, agg);
      if (sim.errors.length) errors.push(view + ': ' + sim.errors.slice(0, 3).join(' | '));
    } finally { await sim.close(); }
  }
  m.total = {
    parties: totals.runs, secondesDeJeu: totals.gameSecs,
    apparitions: totals.spawns, apparitionsEnVue: totals.spawnInView, apparitionsEnVuePct: pctOf(totals.spawnInView, totals.spawns),
    annonces: totals.winds, annoncesHorsChamp: totals.windsOff, annoncesHorsChampPct: pctOf(totals.windsOff, totals.winds),
    coups: totals.hurts, coupsInconnus: totals.unknown, bullet: totals.bullet, bulletPct: pctOf(totals.bullet, totals.hurts),
    bulletSegSup8: totals.bulletDeep, cutterDash: totals.cutterDash, cutterDashFrais: totals.cutterDashFresh,
    cutterDashFraisPct: pctOf(totals.cutterDashFresh, totals.cutterDash), bySrc: totals.bySrc,
    parVue: Object.fromEntries(Object.entries(m.views).map(([k, v]) => [k, {
      apparitionsEnVuePct: v.apparitionsEnVuePct, annoncesHorsChampPct: v.annoncesHorsChampPct,
      bulletPct: v.bulletPct, bulletSegSup8: v.bulletSegSup8, cutterDashFraisPct: v.cutterDashFraisPct, coups: v.coups }]))
  };
  m.erreursPage = errors.slice(0, 6);

  // garde-fous de mesure : sans échantillon ni attribution fiable, on ne conclut pas
  const T = m.total;
  if (T.apparitions < 200 || T.annonces < 60 || T.coups < 40) {
    m.pourquoi = 'échantillon insuffisant (apparitions ≥ 200, annonces ≥ 60, coups ≥ 40 exigés)';
    code = 2;
  } else if (T.coupsInconnus > 0.4 * (T.coups + T.coupsInconnus)) {
    m.pourquoi = 'attribution des coups non fiable : ' + T.coupsInconnus + ' chutes de longueur sans burst identifiable';
    code = 2;
  } else {
    const pass = T.apparitionsEnVuePct === 0 && T.annoncesHorsChampPct === 0 && T.bulletPct <= 25 &&
      T.bulletSegSup8 === 0 && T.cutterDashFraisPct <= 3;
    code = pass ? 0 : 1;
  }
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 500);
  code = 2;
}
save('G6-t1-sim.json', m);
finish(1, { pass: code === 0, code, measured: m.total || m, threshold: THRESH });
