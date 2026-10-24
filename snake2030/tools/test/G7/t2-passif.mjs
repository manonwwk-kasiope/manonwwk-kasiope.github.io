// G7 test 2 — pilote 'passive' : le joueur qui ne fait rien voit quand même une carte, et ne meurt pas
// tout de suite. Harnais versionné de l'audit (audit/sim-lib.mjs), pilote 'passive' (aucune entrée :
// le serpent avance tout droit, seul le tir automatique du CANON travaille), cran SOUTENU (1,55), n = 10.
//
// SEUILS (spec G7, test 2 — intouchables) :
//   - première carte ≤ 18 000 ms de temps de partie (convention du test 1 : S.t − L.t0)
//   - survie médiane ≥ 40 s   (26,8)
//
// LECTURE DE « première carte ≤ 18 s ». La spec donne un seul chiffre pour une campagne de dix parties.
// La lecture retenue est la MÉDIANE, comme au test 1 qui dit « médiane » explicitement pour la même
// grandeur ; la médiane est CENSURÉE (une partie sans carte compte +∞, elle n'est pas jetée). La
// lecture la plus dure — « toutes les parties sous 18 s » — est mesurée et rapportée à côté
// (premiereCarteMaxMs, partiesAuDelaDe18s) pour qu'un médiateur puisse trancher sur les chiffres
// plutôt que sur une interprétation.
import { save, finish, deadline } from '../lib.mjs';
import { ouvrir, partieSure, medianCensuree, median, pct, r1, aff } from './g7lib.mjs';

deadline(+(process.env.S2030_G7T2_DEADLINE || 1200), 2);

const RUNS = +(process.env.S2030_G7T2_RUNS || 10);
const MAXT = +(process.env.S2030_G7T2_MAXT || 300000);
const PROFIL = process.env.S2030_G7T2_PROFIL || 'phone';
const SEED0 = +(process.env.S2030_G7T2_SEED || 7200);
const THRESH = 'pilote passive n = 10 : médiane de la première carte ≤ 18 000 ms de temps de partie ; survie médiane ≥ 40 s';

const m = { harnais: 'audit/sim-lib.mjs', pilote: 'passive', cran: 'SOUTENU (1,55)', profil: PROFIL,
  parties: RUNS, plafondMs: MAXT, graines: [SEED0, SEED0 + RUNS - 1], runs: [] };
let code = 1;

try {
  const sim = await ouvrir(PROFIL);
  try {
    for (let i = 0; i < RUNS; i++) {
      const p = await partieSure(sim, { seed: SEED0 + i, pilot: 'passive', cards: 'first', diff: 1, maxT: MAXT });
      const cartes = p.G.opens.map(o => o.t - p.t0);
      m.runs.push({ i, graine: SEED0 + i, dureeS: r1(p.dur / 1000), plafond: p.aborted, kills: p.r.kills,
        cartes: cartes.length, premiereCarteMs: cartes.length ? Math.round(cartes[0]) : null,
        coups: p.L.hits.length, len: p.r.len });
    }
    m.erreursPage = sim.errors.slice(0, 5);
    m.incidents = sim.incidents || [];
    m.errCount = await sim.errCount();
  } finally { await sim.close(); }

  const R = m.runs;
  const premieres = R.map(r => r.premiereCarteMs);
  const finies = premieres.filter(v => v != null);
  const medP = medianCensuree(premieres), medS = medianCensuree(R.map(r => r.dureeS));
  const T = m.total = {
    medianePremiereCarteMs: aff(medP),
    medianePremiereCarteMsSansCensure: median(finies),
    premiereCarteMaxMs: finies.length === RUNS ? Math.max(...finies) : 'infini',
    partiesSansCarte: RUNS - finies.length,
    partiesAuDelaDe18s: premieres.filter(v => v == null || v > 18000).length,
    premieresCartesMs: premieres,
    survieMedianeS: aff(medS), surviesS: R.map(r => r.dureeS),
    partiesAuPlafond: R.filter(r => r.plafond).length,
    killsMediane: median(R.map(r => r.kills))
  };

  if (R.length < RUNS) {
    m.pourquoi = 'échantillon insuffisant : ' + R.length + '/' + RUNS + ' parties';
    code = 2;
  } else {
    const c = m.controles = {
      premiereCarte: medP <= 18000,
      survieMediane: medS >= 40
    };
    m.controleLectureDure = { toutesSous18s: T.partiesAuDelaDe18s === 0 };
    code = Object.values(c).every(Boolean) ? 0 : 1;
  }
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 600);
  code = 2;
}

save('G7-t2-passif.json', m);
finish(2, { pass: code === 0, code, measured: m.total || m, threshold: THRESH });
