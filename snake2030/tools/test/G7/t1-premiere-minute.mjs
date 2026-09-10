// G7 test 1 — première minute : carte tôt, main de survie garantie, première minute vivable.
// Harnais VERSIONNÉ de l'audit (tools/test/audit/sim-lib.mjs, avec audit/sim.mjs), pilote 'sloppy',
// cran SOUTENU (S.opt.diff = 1,55, index 1), n = 20 parties.
//
// CONVENTION DE TEMPS (spec) : tout temps de partie = S.t − L.t0 (S.t est l'horloge de la PAGE et
// n'est jamais remis à zéro ; le harnais enchaîne les parties dans la même page).
//
// SEUILS (spec G7, test 1 — intouchables) :
//   - médiane du temps de partie à la PREMIÈRE ouverture de ui.showCards ≤ 15 000 ms   (25 000)
//   - 100 % des PREMIERS écrans : ≥ 1 carte de la liste de survie (growth, shield, regen, iframes,
//     pickHeal) ET ≤ 1 ARME NEUVE (un des huit ids de _WPN_IDS avec (S.up[id] | 0) === 0 au tirage)
//   - parties mortes sans aucune carte ≤ 5 %                                            (30 %)
//   - survie médiane ∈ [90 ; 240] s                                                     (41,9)
//   - coups reçus par minute sur la tranche 15-45 s ≤ 12                                (20-23)
//   - ≥ 60 % des parties atteignent la 3e carte
//
// LECTURES POSÉES ICI, ET POURQUOI
//  - Médiane de la première carte : CENSURÉE. Une partie qui n'a jamais vu de carte compte +∞, elle
//    n'est pas jetée — sinon la médiane se calculerait sur les seules parties qui en voient.
//  - Coups reçus : chutes de longueur du serpent hors pliage, exactement la grandeur du journal du
//    harnais (sim-lib.mjs:143) qui a produit la mesure de référence « 20-23/min ». La cadence est le
//    total des coups de la fenêtre divisé par le temps d'exposition réellement passé dans la fenêtre
//    par les 20 parties (une partie morte à 30 s n'expose que 15 s), jamais une moyenne de moyennes.
//  - « Atteindre la 3e carte » = au moins trois ÉCRANS de cartes ouverts, donc trois cartes prises :
//    le pilote du harnais choisit une carte par écran, et la règle « un seul écran absorbe toute la
//    file » du « quoi » fait qu'un écran = une carte, quel que soit le nombre de montées en attente.
//  - Survie : les parties arrêtées au plafond de temps sont CENSURÉES (compte ≥ plafond). Le plafond
//    est posé à 300 s, au-dessus de la borne haute de 240 s : une médiane collée au plafond démontre
//    donc un dépassement de la borne haute, elle ne le masque pas.
// DISPERSION DE LA MESURE, RELEVÉE. Trois campagnes de 20 parties (graines 7000, 8000, 9000) sur un
// build PRÉ-G7 servi à part sur un port dédié (empreinte md5 bf3ef63e…, xpNext 12, croissance ×1,28+4,
// multT 3 200, ni S.cardsTaken ni 'multUp'), machine partagée, ont donné : médiane de la première carte
// 27,5 / 33,0 / 32,9 s ; survie médiane 40,8 / 47,0 / 45,9 s ; coups/min 16,8 / 15,5 / 18,0 ;
// parties mortes sans carte 25 / 20 / 30 % ; parties atteignant la 3e carte 20 / 40 / 15 %. Les trois
// premières grandeurs bougent d'environ ±10 % d'une campagne à l'autre à n = 20, les deux dernières
// beaucoup plus : un verdict qui se joue à quelques points près sur ces deux-là doit être rejoué.
// Une partie n'est PAS reproductible à graine égale dans ce harnais (même graine, même page, quatre
// passes : 84, 75, 3 et 192 kills) — seule la statistique de campagne l'est, approximativement.
// CONTRE-MESURE SUR LE BUILD DU DERNIER COMMIT (règle « un garde-fou qui échoue est suspect avant le
// build »). Les sources de HEAD (209d06a) ont été rebâties dans un dossier à part : le index.html obtenu
// est OCTET POUR OCTET celui du dépôt (md5 9533cecea517c375ac20893ec84df9fc), servi sur un port dédié.
// Ce script, mêmes graines (7100-7119), même machine, même harnais, y donne : première carte médiane
// 43,5 s ; survie médiane 300 s (15 parties sur 20 arrêtées au plafond) ; coups/min sur 15-45 s = 5,62.
// Sur le build G7 : 21,9 s ; 300 s (19/20 au plafond) ; 5,70. Conséquences, à lire avant tout verdict :
//   - « survie médiane ∈ [90 ; 240] s » échoue À L'IDENTIQUE avant et après G7 : ce n'est pas une
//     régression de G7, c'est un seuil que le build du dernier commit ne tient déjà pas. La mesure de
//     référence de la spec (41,9 s) n'est pas reproductible sur HEAD.
//   - « coups/min ≤ 12 » passe avant (5,62) comme après (5,70) : la référence 20-23/min de la spec ne
//     l'est pas davantage. Ce contrôle ne discrimine pas.
//   - la première carte, elle, est bien divisée par deux par G7, et c'est LA COURBE D'XP qui la porte :
//     en remettant xpNext 12 et ×1,28+4 dans le build G7 (toutes autres retouches gardées), la médiane
//     remonte à 47,0 s. Retirer le rabais de plafond simultané : 22,1 s ; retirer la porte des
//     artilleurs : 22,0 s ; remettre l'ultime d'avant : 25,4 s ; survie médiane 300 s dans les quatre cas.
// CE QU'IL FAUDRAIT POUR TENIR LES 15 000 ms (mesuré, 20 parties par valeur, mêmes graines, plafond
// 60 s) : xpNext initial 6 (valeur du « quoi ») → 19,4 s ; 4 → 17,9 s ; 3 → 13,9 s ; 2 → 10,9 s. Le
// seuil du test n'est donc atteint qu'à partir de xpNext initial 3, MOITIÉ de la valeur que le « quoi »
// impose — et xpNext 2 donne exactement les « 12 s » du titre de l'objectif. La raison tient en une
// mesure : le premier KILL du pilote 'sloppy' tombe à 11,6 s médians (n = 12), et il faut 6 XP, soit
// trois kills (1 XP par kill plus 1 XP par pastille d'énergie ramassée, src/10-core.js:904), pour
// ouvrir le premier écran. Le coût de la première carte n'est pas le facteur limitant : le temps de
// mise à mort l'est. Le « quoi » (xpNext 6) et le seuil du test 1 (≤ 15 s) sont contradictoires.
// Les trois campagnes « pré-G7 » citées plus bas (md5 bf3ef63e…) ne sont donc PAS comparables : aucun
// build de ce md5 n'a été retrouvé, et le seul build pré-G7 présent sur la machine (md5 2ed6da6c…)
// précède G8 — il lui manque hurtSlowTick, l'arrêt sur image de la blessure.
import { save, finish, deadline } from '../lib.mjs';
import { ouvrir, partieSure, analyseEcran, median, medianCensuree, pct, r1, r2, aff, tempsCoups } from './g7lib.mjs';

deadline(+(process.env.S2030_G7T1_DEADLINE || 1800), 1);

const RUNS = +(process.env.S2030_G7T1_RUNS || 20);
const MAXT = +(process.env.S2030_G7T1_MAXT || 300000);     // plafond de temps de partie, ms
const PROFIL = process.env.S2030_G7T1_PROFIL || 'phone';   // profil de la campagne d'audit
const CARTES = process.env.S2030_G7T1_CARDS || 'first';    // stratégie de cartes du pilote
const SEED0 = +(process.env.S2030_G7T1_SEED || 7100);
const THRESH = 'médiane 1re carte ≤ 15 000 ms ; 100 % des 1ers écrans avec ≥ 1 carte de survie et ≤ 1 arme neuve ; '
  + 'parties mortes sans carte ≤ 5 % ; survie médiane ∈ [90 ; 240] s ; coups/min sur 15-45 s ≤ 12 ; ≥ 60 % des parties atteignent la 3e carte';

const m = { harnais: 'audit/sim-lib.mjs', pilote: 'sloppy', cartes: CARTES, cran: 'SOUTENU (1,55)',
  profil: PROFIL, parties: RUNS, plafondMs: MAXT, graines: [SEED0, SEED0 + RUNS - 1], runs: [] };
let code = 1;

try {
  const sim = await ouvrir(PROFIL);
  try {
    for (let i = 0; i < RUNS; i++) {
      const p = await partieSure(sim, { seed: SEED0 + i, pilot: 'sloppy', cards: CARTES, diff: 1, maxT: MAXT });
      const cartes = p.G.opens.map(o => o.t - p.t0);
      const coups = tempsCoups(p);
      m.runs.push({
        i, graine: SEED0 + i, dureeS: r1(p.dur / 1000), plafond: p.aborted, kills: p.r.kills, level: p.r.level,
        cartes: cartes.length, premiereCarteMs: cartes.length ? Math.round(cartes[0]) : null,
        cartesMs: cartes.slice(0, 6).map(Math.round),
        premierEcran: p.G.opens.length ? analyseEcran(p.G.opens[0]) : null,
        coups: coups.length, coups15_45: coups.filter(t => t >= 15000 && t < 45000).length,
        expo15_45S: r1(Math.max(0, Math.min(p.dur, 45000) - 15000) / 1000),
        cardsTaken: p.G.cardsTaken, multMax: p.G.multMax
      });
    }
    m.erreursPage = sim.errors.slice(0, 5);
    m.incidents = sim.incidents || [];
    m.errCount = await sim.errCount();
  } finally { await sim.close(); }

  const R = m.runs;
  const premieres = R.map(r => r.premiereCarteMs);
  const nEcrans = R.filter(r => r.premierEcran).length;
  const conformes = R.filter(r => r.premierEcran && r.premierEcran.conforme).length;
  const nonConformes = R.filter(r => r.premierEcran && !r.premierEcran.conforme)
    .map(r => ({ graine: r.graine, offert: r.premierEcran.offert, survie: r.premierEcran.survie, armesNeuves: r.premierEcran.armesNeuves }));
  const mortesSansCarte = R.filter(r => !r.plafond && r.cartes === 0).length;
  const coupsF = R.reduce((a, r) => a + r.coups15_45, 0);
  const expoF = R.reduce((a, r) => a + r.expo15_45S, 0);

  const medP = medianCensuree(premieres);
  const medS = medianCensuree(R.map(r => r.dureeS));
  const cpm = expoF ? +(coupsF / expoF * 60).toFixed(2) : null;
  const T = m.total = {
    medianePremiereCarteMs: aff(medP),
    medianePremiereCarteMsSansCensure: median(premieres.filter(v => v != null)),
    partiesSansAucuneCarte: R.filter(r => r.cartes === 0).length,
    premiersEcrans: nEcrans, premiersEcransConformes: conformes, premiersEcransConformesPct: pct(conformes, nEcrans),
    exemplesNonConformes: nonConformes.slice(0, 6),
    partiesMortesSansCartePct: pct(mortesSansCarte, RUNS), partiesMortesSansCarte: mortesSansCarte,
    survieMedianeS: aff(medS), surviesS: R.map(r => r.dureeS),
    partiesAuPlafond: R.filter(r => r.plafond).length,
    coups15_45: coupsF, exposition15_45S: r1(expoF), coupsParMinute15_45: cpm,
    coupsTotal: R.reduce((a, r) => a + r.coups, 0),
    troisiemeCartePct: pct(R.filter(r => r.cartes >= 3).length, RUNS),
    cartesParPartie: R.map(r => r.cartes)
  };

  if (R.length < RUNS || nEcrans === 0 || expoF <= 0) {
    m.pourquoi = 'échantillon insuffisant : ' + R.length + '/' + RUNS + ' parties, ' + nEcrans + ' premiers écrans, exposition ' + r1(expoF) + ' s';
    code = 2;
  } else {
    const c = m.controles = {
      medianePremiereCarte: medP <= 15000,
      premiersEcrans100: T.premiersEcransConformesPct === 100,
      mortesSansCarte: T.partiesMortesSansCartePct <= 5,
      survieMediane: medS >= 90 && medS <= 240,
      coupsParMinute: cpm != null && cpm <= 12,
      troisiemeCarte: T.troisiemeCartePct >= 60
    };
    code = Object.values(c).every(Boolean) ? 0 : 1;
    if (T.partiesAuPlafond > 0) m.noteCensure = T.partiesAuPlafond + ' partie(s) arrêtée(s) au plafond de ' + (MAXT / 1000)
      + ' s : leur survie vaut « ≥ ' + (MAXT / 1000) + ' s », donc au-dessus de la borne haute de 240 s.';
  }
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 600);
  code = 2;
}

save('G7-t1-premiere-minute.json', m);
finish(1, { pass: code === 0, code, measured: m.total || m, threshold: THRESH });
