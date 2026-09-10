// G7 test 3 — cadence sur dix minutes : cartes à cadence constante, ultime rare, pas d'écrans enchaînés.
// Harnais versionné de l'audit (audit/sim-lib.mjs), « pilote dodge-greedy » = { pilot: 'dodge',
// cards: 'greedy' } ('greedy' est une stratégie de CARTES, sim-lib.mjs:226), n = 10 parties de 10 min.
//
// SEUILS (spec G7, test 3 — intouchables) :
//   - cartes/min par tranche de 60 s ∈ [1,5 ; 3,5] pour les 10 tranches          (4,1 → 0,9)
//   - ultimes/min par tranche ∈ [0,7 ; 2,0]                                       (3,8 → 45) — QO-1
//   - premier ultime médian ≤ 45 s de temps de partie
//   - écrans de cartes enchaînés en < 2 s ≤ 1 %                                   (8 %)
//
// LECTURE DES CADENCES (correction de la spec) : les deux cadences se lisent en MOYENNE SUR LES 10
// PARTIES de la tranche, jamais partie par partie — un compte d'événements sur 60 s dans une seule
// partie est un ENTIER, donc « ∈ [1,5 ; 3,5] » par partie voudrait dire « exactement 2 ou 3 ». La
// moyenne est calculée en divisant le total des événements de la tranche par le temps d'EXPOSITION
// réellement passé dans la tranche par les dix parties (une partie morte à 200 s n'expose rien après) :
// c'est la moyenne des parties quand toutes couvrent la tranche, et cela reste défini quand certaines
// meurent avant. Une tranche sans exposition suffisante n'est pas « conforme par vacuité » : elle rend
// le test NON MESURABLE (code 2), avec le détail de la couverture.
//
// ÉCRANS ENCHAÎNÉS : l'écart mesuré est celui de deux OUVERTURES successives de ui.showCards dans la
// même partie, en temps de jeu (S.t, qui avance au rythme brut dans les branches 'play' et 'cards' :
// l'écart y vaut la même chose qu'en horloge murale). La part est rapportée sur les ouvertures qui ONT
// une ouverture précédente — le seul dénominateur qui a un sens pour un écart — et aussi sur toutes les
// ouvertures, pour qu'aucune lecture ne dépende d'un choix de dénominateur non écrit dans la spec.
//
// ULTIMES : comptés en enveloppant __M.audio.ultimate, appelé par useUlt APRÈS ses deux gardes
// (S.phase === 'play' et S.ult >= S.ultMax, src/90-boot.js:320-324) — un ultime compté est un ultime
// réellement parti. Le compte du harnais (chute de S.ult > 50) est rapporté à côté pour recoupement.
//
// QO-1 (question ouverte de la spec, seuil INCHANGÉ) : la SOURCE de chaque point de jauge est
// instrumentée par tranche — points venus des kills, du boost, du reste (cœurs) — plus la part de temps
// en boost et la part de temps jauge pleine. Si le boost seul apporte de quoi remplir la jauge, le
// plafond de 2,0 ultimes/min n'est pas atteignable en ne touchant qu'à la charge par kill : la mesure
// le dira, et elle est rapportée telle quelle sans toucher au seuil.
// RÉPONSE MESURÉE À QO-1 (n = 10 parties de 10 min, build G7, attribution BRUTE par la source, sans
// l'écrêtage de Math.min(S.ultMax, …)). À la 10e tranche (540-600 s), par minute-partie :
//   kills ordinaires 227,2 pt · ÉLITES 1 502,6 pt · cœurs 528,0 pt · boost 1,1 pt.
// La question ouverte demandait : « si boost et élites dépassent à eux seuls 200 pt/min à la 10e
// tranche, le plafond 2,0 est une erreur de la spec ». Ils en font 1 503,7, soit 15,0 ultimes/min à eux
// deux, et 20,3 en ajoutant les cœurs — alors que la seule source que le « quoi » retouche, le kill
// ordinaire, n'en fait que 2,3. Mettre la charge par kill À ZÉRO laisserait donc encore dix fois le
// plafond : l'élite à +22 est « inchangée » par la spec et le cœur passe de +12 à +20 sur son ordre.
// Le boost, lui, est hors de cause dans cette campagne : 1,1 pt/min à la 10e tranche (le pilote 'dodge'
// ne boostait que 1,25 % du temps) — la borne supérieure théorique de 189,6 pt/min citée par QO-1 n'est
// pas approchée.
// PREMIER ULTIME : le seuil (≤ 45 s) porte sur le TIR, mais le pilote du harnais n'appuie que s'il voit
// au moins six ennemis (sim-lib.mjs:239). Les deux grandeurs sont rapportées : premier tir médian
// 65,2 s, première jauge PLEINE médiane 65,3 s — l'écart ne vient donc pas du pilote mais du
// remplissage lui-même, à 6 points par kill au plus (100 / 6 = 17 kills ordinaires minimum).
import { save, finish, deadline } from '../lib.mjs';
import { ouvrir, partieSure, medianCensuree, pct, r1, r2, aff } from './g7lib.mjs';

deadline(+(process.env.S2030_G7T3_DEADLINE || 2400), 3);

const RUNS = +(process.env.S2030_G7T3_RUNS || 10);
const MAXT = +(process.env.S2030_G7T3_MAXT || 600000);
const PROFIL = process.env.S2030_G7T3_PROFIL || 'phone';
const SEED0 = +(process.env.S2030_G7T3_SEED || 7300);
const NTR = 10;                       // dix tranches de 60 s
const EXPO_MIN = +(process.env.S2030_G7T3_EXPOMIN || 3);   // minutes-parties minimales par tranche
const THRESH = 'cartes/min ∈ [1,5 ; 3,5] pour les 10 tranches ; ultimes/min ∈ [0,7 ; 2,0] ; premier ultime médian ≤ 45 s ; écrans enchaînés < 2 s ≤ 1 %';

const m = { harnais: 'audit/sim-lib.mjs', pilote: 'dodge', cartes: 'greedy', cran: 'SOUTENU (1,55)',
  profil: PROFIL, parties: RUNS, plafondMs: MAXT, graines: [SEED0, SEED0 + RUNS - 1], runs: [] };
let code = 1;

try {
  const sim = await ouvrir(PROFIL);
  try {
    for (let i = 0; i < RUNS; i++) {
      const p = await partieSure(sim, { seed: SEED0 + i, pilot: 'dodge', cards: 'greedy', diff: 1, maxT: MAXT });
      const cartes = p.G.opens.map(o => o.t - p.t0);
      const ults = p.G.ultFires.map(u => u.t - p.t0);
      const gaps = [];
      for (let k = 1; k < cartes.length; k++) gaps.push(cartes[k] - cartes[k - 1]);
      m.runs.push({
        i, graine: SEED0 + i, dureeS: r1(p.dur / 1000), plafond: p.aborted, kills: p.r.kills, level: p.r.level,
        cartes: cartes.length, cartesMs: cartes.map(Math.round),
        ults: ults.length, ultsMs: ults.map(Math.round), ultsHarnais: p.L.ults.length,
        premierUltMs: ults.length ? Math.round(ults[0]) : null,
        ecartsMs: gaps.map(Math.round), enchainesSous2s: gaps.filter(g => g < 2000).length,
        lvlUpsAOuverture: p.G.opens.map(o => o.lvlUps), cartesOffertes: p.G.opens.map(o => o.n),
        cardsTaken: p.G.cardsTaken,
        tr: p.G.tr, boostPct: pct(p.G.boostFrames, p.G.playFrames), jaugePleinePct: pct(p.G.fullFrames, p.G.playFrames),
        ptsKill: Math.round(p.G.uKill), ptsBoost: Math.round(p.G.uBoost), ptsAutres: Math.round(p.G.uAutre),
        premierPleinMs: p.G.firstFull != null ? Math.round(p.G.firstFull - p.t0) : null,
        srcOrd: Math.round(p.G.sOrd), srcElite: Math.round(p.G.sElite), srcCoeur: Math.round(p.G.sCore),
        srcBoost: Math.round(p.G.sBoost), nOrd: p.G.nOrd, nElite: p.G.nElite, nCoeur: p.G.nCore
      });
    }
    m.erreursPage = sim.errors.slice(0, 5);
    m.incidents = sim.incidents || [];
    m.errCount = await sim.errCount();
  } finally { await sim.close(); }

  const R = m.runs;
  // --- agrégation par tranche de 60 s
  const tranches = [];
  for (let k = 0; k < NTR; k++) {
    const a = k * 60000, b = (k + 1) * 60000;
    let expoMs = 0, cartes = 0, ults = 0, kills = 0, uKill = 0, uBoost = 0, uAutre = 0, frames = 0, boost = 0, full = 0, parties = 0;
    let sOrd = 0, sElite = 0, sCore = 0, sBoost = 0, nElite = 0;
    for (const r of R) {
      const e = Math.max(0, Math.min(r.dureeS * 1000, b) - a);
      if (e <= 0) continue;
      parties++; expoMs += e;
      cartes += r.cartesMs.filter(t => t >= a && t < b).length;
      ults += r.ultsMs.filter(t => t >= a && t < b).length;
      const tb = r.tr[k];
      if (tb) { kills += tb.kills; uKill += tb.uKill; uBoost += tb.uBoost; uAutre += tb.uAutre; frames += tb.frames; boost += tb.boost; full += tb.full;
        sOrd += tb.sOrd || 0; sElite += tb.sElite || 0; sCore += tb.sCore || 0; sBoost += tb.sBoost || 0; nElite += tb.nElite || 0; }
    }
    const min = expoMs / 60000;
    tranches.push({
      tranche: k, deS: k * 60, aS: (k + 1) * 60, partiesPresentes: parties, expositionMinutes: r2(min),
      cartes, cartesParMin: min ? r2(cartes / min) : null,
      ults, ultsParMin: min ? r2(ults / min) : null,
      kills, killsParMin: min ? r2(kills / min) : null,
      ptsKillParMin: min ? r2(uKill / min) : null, ptsBoostParMin: min ? r2(uBoost / min) : null,
      ptsAutresParMin: min ? r2(uAutre / min) : null,
      partTempsBoostPct: pct(boost, frames), partTempsJaugePleinePct: pct(full, frames),
      /* ATTRIBUTION BRUTE (protocole QO-1) : points de jauge PRODUITS par chaque source, sans
         l'écrêtage de Math.min(S.ultMax, …) que subissent les colonnes ptsKill/ptsBoost/ptsAutres.
         C'est cette lecture-là que la question ouverte demande (« si boost et élites dépassent à eux
         seuls 200 pt/min à la 10e tranche, le plafond 2,0 est une erreur de la spec »). */
      srcOrdParMin: min ? r2(sOrd / min) : null, srcEliteParMin: min ? r2(sElite / min) : null,
      srcCoeurParMin: min ? r2(sCore / min) : null, srcBoostParMin: min ? r2(sBoost / min) : null,
      srcEliteEtBoostParMin: min ? r2((sElite + sBoost) / min) : null, elites: nElite
    });
  }

  const totalOuvertures = R.reduce((a, r) => a + r.cartes, 0);
  const totalEnchainables = R.reduce((a, r) => a + Math.max(0, r.cartes - 1), 0);
  const totalEnchaines = R.reduce((a, r) => a + r.enchainesSous2s, 0);
  const medU = medianCensuree(R.map(r => r.premierUltMs));
  const T = m.total = {
    tranches,
    tranchesMesurables: tranches.filter(t => t.expositionMinutes >= EXPO_MIN).length,
    cartesParMinHorsBornes: tranches.filter(t => t.expositionMinutes >= EXPO_MIN && !(t.cartesParMin >= 1.5 && t.cartesParMin <= 3.5)).map(t => ({ tranche: t.tranche, v: t.cartesParMin })),
    ultsParMinHorsBornes: tranches.filter(t => t.expositionMinutes >= EXPO_MIN && !(t.ultsParMin >= 0.7 && t.ultsParMin <= 2.0)).map(t => ({ tranche: t.tranche, v: t.ultsParMin })),
    premierUltMedianMs: aff(medU),
    premiersUltsMs: R.map(r => r.premierUltMs),
    ouvertures: totalOuvertures, ouverturesAvecPrecedente: totalEnchainables,
    enchainesSous2s: totalEnchaines,
    enchainesSous2sPct: pct(totalEnchaines, totalEnchainables),
    enchainesSous2sPctSurToutes: pct(totalEnchaines, totalOuvertures),
    surviesS: R.map(r => r.dureeS), partiesAuPlafond: R.filter(r => r.plafond).length,
    ultsTotal: R.reduce((a, r) => a + r.ults, 0), ultsHarnaisTotal: R.reduce((a, r) => a + r.ultsHarnais, 0),
    lvlUpsAOuvertureMax: Math.max(0, ...R.flatMap(r => r.lvlUpsAOuverture)),
    ecransA4Cartes: R.reduce((a, r) => a + r.cartesOffertes.filter(n => n >= 4).length, 0),
    sourceJauge: { ptsKill: R.reduce((a, r) => a + r.ptsKill, 0), ptsBoost: R.reduce((a, r) => a + r.ptsBoost, 0), ptsAutres: R.reduce((a, r) => a + r.ptsAutres, 0) },
    /* Attribution brute cumulée + moment où la jauge est PLEINE pour la première fois : le pilote du
       harnais n'appuie sur l'ultime que lorsqu'il voit au moins six ennemis (sim-lib.mjs:239), donc
       « premier ultime tiré » et « premier ultime disponible » ne sont pas la même grandeur. Le seuil
       de la spec porte sur le tir ; le second est rapporté à côté pour dire d'où vient l'écart. */
    sourceBrute: { ordinaires: Math.round(R.reduce((a, r) => a + r.srcOrd, 0)), elites: Math.round(R.reduce((a, r) => a + r.srcElite, 0)),
      coeurs: Math.round(R.reduce((a, r) => a + r.srcCoeur, 0)), boost: Math.round(R.reduce((a, r) => a + r.srcBoost, 0)),
      nOrdinaires: R.reduce((a, r) => a + r.nOrd, 0), nElites: R.reduce((a, r) => a + r.nElite, 0), nCoeurs: R.reduce((a, r) => a + r.nCoeur, 0) },
    premierPleinMedianMs: aff(medianCensuree(R.map(r => r.premierPleinMs))),
    premiersPleinsMs: R.map(r => r.premierPleinMs)
  };

  if (R.length < RUNS || T.tranchesMesurables < NTR) {
    m.pourquoi = 'couverture insuffisante : ' + T.tranchesMesurables + '/' + NTR + ' tranches ont au moins '
      + EXPO_MIN + ' minutes-parties d\'exposition (parties trop courtes pour mesurer une cadence sur dix minutes)';
    code = 2;
  } else {
    const c = m.controles = {
      cartesParMin: T.cartesParMinHorsBornes.length === 0,
      ultsParMin: T.ultsParMinHorsBornes.length === 0,
      premierUlt: medU <= 45000,
      enchaines: T.enchainesSous2sPct <= 1
    };
    code = Object.values(c).every(Boolean) ? 0 : 1;
  }
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 600);
  code = 2;
}

save('G7-t3-cadence.json', m);
// la dernière ligne reste lisible : le détail par tranche est dans out/G7-t3-cadence.json
const T2 = m.total;
finish(3, { pass: code === 0, code, threshold: THRESH, measured: T2 ? {
  cartesParMinParTranche: T2.tranches.map(t => t.cartesParMin),
  ultsParMinParTranche: T2.tranches.map(t => t.ultsParMin),
  expositionMinutesParTranche: T2.tranches.map(t => t.expositionMinutes),
  ptsBoostParMinParTranche: T2.tranches.map(t => t.ptsBoostParMin),
  ptsKillParMinParTranche: T2.tranches.map(t => t.ptsKillParMin),
  cartesParMinHorsBornes: T2.cartesParMinHorsBornes, ultsParMinHorsBornes: T2.ultsParMinHorsBornes,
  premierUltMedianMs: T2.premierUltMedianMs, enchainesSous2sPct: T2.enchainesSous2sPct,
  enchainesSous2s: T2.enchainesSous2s, ouverturesAvecPrecedente: T2.ouverturesAvecPrecedente,
  surviesS: T2.surviesS, ecransA4Cartes: T2.ecransA4Cartes, lvlUpsAOuvertureMax: T2.lvlUpsAOuvertureMax,
  controles: m.controles, pourquoi: m.pourquoi
} : { erreur: m.erreur, pourquoi: m.pourquoi } });
