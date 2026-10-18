/* R-34 — LASSO jouable : pilote humain (ACTIONS AUTO) ; au moins 50 % des lassos tentés réussis jusqu'à 20
   segments, 40 % de 30 à 40 ; lassos réussis par minute à 30-40 segments ≥ 0,8 fois ceux à 8-20.
   Une tentative est l'entrée du pilote en mode LASSO (journal pilote, evt lassoTente, longueur) ; elle réussit
   si un événement `lasso` est journalisé avant sa sortie (lassoFin). Le temps passé à chaque longueur vient
   des échantillons (S.player.len toutes les 0,25 s). */
import { executer, principal, seuils } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-34', titre: 'LASSO jouable', seuil: '≥ 50 % jusqu’à 20 segments ; ≥ 40 % de 30 à 40 ; cadence 30-40 ≥ 0,8 × 8-20', bloquant: true };

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R34');
  const b = bilanLot(await lot(banc, 'humain', banc.graines(50, 5), { actions: 'auto' }));
  if (!b.ok) return res.nonMesurable('parties du pilote humain', b.raison);
  const court = { n: 0, ok: 0 }, long = { n: 0, ok: 0 }, temps = { court: 0, long: 0 }, reussis = { court: 0, long: 0 };
  let tentatives = 0;
  for (const p of b.parties) {
    const J = p.journal;
    for (let i = 0; i < J.length; i++) {
      const x = J[i], d = x.d || {};
      if (x.type !== 'pilote' || d.evt !== 'lassoTente') continue;
      tentatives++;
      let ok = false;
      for (let k = i + 1; k < J.length; k++) { const y = J[k]; if (y.type === 'lasso') { ok = true; break; } if (y.type === 'pilote' && (y.d || {}).evt === 'lassoFin') break; }
      const L = d.longueur;
      const c = L <= 20 ? court : (L >= 30 && L <= 40 ? long : null);
      if (c) { c.n++; if (ok) c.ok++; }
      if (ok) { if (L >= 8 && L <= 20) reussis.court++; else if (L >= 30 && L <= 40) reussis.long++; }
    }
    const E = p.echantillons;
    for (let k = 1; k < E.length; k++) { const L = E[k].len, dt = E[k].t - E[k - 1].t; if (L >= 8 && L <= 20) temps.court += dt; else if (L >= 30 && L <= 40) temps.long += dt; }
  }
  if (!tentatives) return res.nonMesurable('tentatives de LASSO', 'aucune entrée « lassoTente » au journal du pilote (pilote du lot P absent ?)');
  if (court.n) res.verifie('lassos réussis jusqu’à 20 segments', court.ok / court.n, '≥ ' + s.court, court.ok / court.n >= s.court, { tentatives: court.n });
  else res.nonMesurable('lassos jusqu’à 20 segments', 'aucune tentative à cette longueur');
  if (long.n) res.verifie('lassos réussis de 30 à 40 segments', long.ok / long.n, '≥ ' + s.long, long.ok / long.n >= s.long, { tentatives: long.n });
  else res.nonMesurable('lassos de 30 à 40 segments', 'aucune tentative à cette longueur');
  if (temps.court > 30 && temps.long > 30) {
    const rc = reussis.court / (temps.court / 60), rl = reussis.long / (temps.long / 60);
    res.verifie('lassos par minute, 30-40 segments / 8-20 segments', rc ? rl / rc : null, '≥ ' + s.rapport, rc > 0 && rl / rc >= s.rapport, { parMinute: { court: +rc.toFixed(2), long: +rl.toFixed(2) }, minutes: { court: +(temps.court / 60).toFixed(1), long: +(temps.long / 60).toFixed(1) } });
  } else res.nonMesurable('cadence des lassos selon la longueur', 'moins de 30 s de jeu à 8-20 ou à 30-40 segments');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
