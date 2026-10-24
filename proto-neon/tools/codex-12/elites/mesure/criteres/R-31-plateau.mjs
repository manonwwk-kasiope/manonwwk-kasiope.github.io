/* R-31 — Le plateau se déplace : arène en mouvement pendant au moins 25 % du temps des vagues 2 à 5 (pilote
   bon, N.world.enMouvement() pas à pas) ; TRAVELLING en V2, V3 et V5 ; 5 VOLS par partie gagnée ; au moins
   4 convois en V4 ; 0 mort par un mur mobile sans son annonce. */
import { executer, principal, seuils } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-31', titre: 'Le plateau se déplace', seuil: '≥ 25 % en mouvement (V2-V5) ; TRAVELLING V2, V3, V5 ; 5 VOLS ; ≥ 4 convois en V4 ; 0 mort par mur mobile non annoncé', bloquant: true };

// Même prédicat exporté pour les collisions contrôlées et la campagne.
// Le dernier cycle seul compte ; un convoi, un départ ou une annonce ancienne ne valent pas préavis.
export function murMobileAnnonce(r, m, annonce) {
  if (m.teleDuree >= annonce) return true;
  const bornes = (r.vagues || []).filter(v => v.t <= m.t && ['entree', 'nettoyee'].includes(v.evt))
    .concat((r.phases || []).filter(p => p.t <= m.t && (p.evt === 'arrivee' || p.evt === 'entree' && p.n === 3)));
  const depuis = bornes.reduce((t, b) => Math.max(t, b.t), -Infinity);
  const cycle = (r.arene || []).filter(a => a.t >= depuis && a.t <= m.t && ['travellingAnnonce', 'travelling', 'fin'].includes(a.evt));
  let avertissement = null, parti = false;
  for (const a of cycle) {
    if (a.evt === 'travellingAnnonce') { avertissement = a; parti = false; }
    else if (a.evt === 'fin') { avertissement = null; parti = false; }
    else if (a.evt === 'travelling') {
      if (parti || !avertissement || a.vx !== avertissement.vx) avertissement = null;
      parti = true;
    }
  }
  return !!avertissement && m.t - avertissement.t >= annonce;
}

export async function mesurer(banc, res) {
  const { R, s } = await seuils(null, 'R31');
  const b = bilanLot(await lot(banc, 'bon', banc.graines(50, 5)));
  const d = bilanLot(await lot(banc, 'dieu', banc.graines(10, 2), { god: true }));
  if (!b.ok) return res.nonMesurable('parties du pilote bon', b.raison);
  const RR = b.resumes;
  let mv = 0, tot = 0;
  for (const r of RR) if (r.parPas) for (const v of [2, 3, 4, 5]) { mv += r.parPas.mouvement[v] || 0; tot += r.parPas.pasVague[v] || 0; }
  if (tot) res.verifie('arène en mouvement, vagues 2 à 5', mv / tot, '≥ ' + s.mouvement, mv / tot >= s.mouvement, { pas: tot });
  else res.nonMesurable('arène en mouvement', 'aucun pas en vagues 2 à 5 (ou N.world.enMouvement absent)');
  const tous = RR.concat(d.ok ? d.resumes : []);
  for (const n of [2, 3, 5]) {
    const jouees = tous.filter(r => r.entreeV(n) !== null);
    if (!jouees.length) { res.nonMesurable(`TRAVELLING en V${n}`, `aucune partie n’atteint la vague ${n}`); continue; }
    const avec = jouees.filter(r => r.arene.some(a => a.evt === 'travelling' && r.vagueA(a.t) === n)).length;
    res.verifie(`TRAVELLING en V${n}`, avec / jouees.length, 1, avec === jouees.length, { parties: jouees.length });
  }
  const gagnees = tous.filter(r => r.victoire);
  if (gagnees.length) { const v = gagnees.map(r => r.vols.filter(x => x.evt === 'debut').length); res.verifie('VOLS par partie gagnée', Math.min(...v), (R.vol && R.vol.parPartie) || s.vols, v.every(x => x === ((R.vol && R.vol.parPartie) || s.vols)), { parties: v.length, vols: v }); }
  else res.nonMesurable('VOLS par partie gagnée', 'aucune partie gagnée');
  const v4 = tous.filter(r => r.nettoyeeV(4) !== null);
  if (v4.length) { const c = v4.map(r => r.arene.filter(a => a.evt === 'convoiPasse' && r.vagueA(a.t) === 4).length); res.verifie('convois en V4 (minimum par partie)', Math.min(...c), '≥ ' + s.convoisV4, Math.min(...c) >= s.convoisV4, { parties: c.length }); }
  else res.nonMesurable('convois en V4', 'aucune partie ne finit la vague 4');
  const annonce = (R.arene && R.arene.travelling && R.arene.travelling.annonce) || 2;
  let mm = 0, sans = 0;
  // S.death.t est le temps de combat local : comparer les horodatages du JOURNAL entre eux.
  for (const p of b.parties.concat(d.ok ? d.parties : [])) {
    const j = p.journal || [], de = type => j.filter(e => e.type === type).map(e => ({ ...e.d, t: e.t }));
    const r = { arene: de('arene'), vagues: de('vague'), phases: de('phase') };
    for (const m of de('mort').filter(x => x.auteur === 'murMobile')) { mm++; if (!murMobileAnnonce(r, m, annonce)) sans++; }
  }
  res.verifie('morts par un mur mobile sans annonce', sans, 0, sans === 0, { mortsMurMobile: mm });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
