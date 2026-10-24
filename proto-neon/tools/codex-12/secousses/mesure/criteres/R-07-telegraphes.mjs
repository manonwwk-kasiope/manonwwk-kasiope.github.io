/* R-07 — Télégraphes : 100 % durent au moins 500 ms (CYCLOPE ≥ 800 ms, convois ≥ 1,5 s), à l'endroit des
   dégâts. Mesure : journal `tele` (total), et journal `coup` (teleDuree des coups télégraphiés). Parties des
   pilotes bon, humain, expert et dieu. */
import { executer, principal, seuils } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-07', titre: 'Télégraphes', seuil: '100 % ≥ 0,5 s ; CYCLOPE ≥ 0,8 s ; convois ≥ 1,5 s', bloquant: true };
const TELEGRAPHIES = ['tir', 'laser', 'souffle', 'convoi'];

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R07');
  const graines = banc.graines(50, 5);
  const tele = { n: 0, courts: 0 }, cyc = { n: 0, courts: 0 }, conv = { n: 0, courts: 0 }, coups = { n: 0, sans: 0 };
  let absent = null; const ex = [];
  for (const pilote of ['bon', 'humain', 'expert', 'dieu']) {
    const o = pilote === 'dieu' ? { god: true } : pilote === 'humain' ? { actions: 'auto' } : {};
    const b = bilanLot(await lot(banc, pilote, graines, o));
    if (!b.ok) { absent = absent || b.raison; continue; }
    for (const p of b.parties) for (const x of p.journal) {
      const d = x.d || x;
      if (x.type === 'tele') {
        const par = d.par || {}, estCyc = /cyclope|colosse/.test(String(par.type)), estConv = d.forme === 'voie' || par.type === 'convoi';
        const min = estConv ? s.convoi : estCyc ? s.cyclope : s.tele, cible = estConv ? conv : estCyc ? cyc : tele;
        cible.n++; if (!(d.total >= min - 1e-6)) { cible.courts++; if (ex.length < 6) ex.push({ pilote, graine: p.params.graine, t: x.t, forme: d.forme, total: d.total, par }); }
      } else if (x.type === 'coup' && TELEGRAPHIES.includes(d.cause)) {
        coups.n++; if (!(d.teleDuree >= s.tele - 1e-6)) coups.sans++;
      }
    }
  }
  if (!tele.n && !cyc.n && !conv.n) return res.nonMesurable('télégraphes', absent || 'journal `tele` vide');
  const v = (c, nom, min) => c.n ? res.verifie(nom, 1 - c.courts / c.n, '100 % ≥ ' + min + ' s', c.courts === 0, { telegraphes: c.n, courts: c.courts }) : res.nonMesurable(nom, 'aucun télégraphe de ce genre dans le journal');
  v(tele, 'télégraphes ordinaires', s.tele); v(cyc, 'télégraphes du CYCLOPE', s.cyclope); v(conv, 'télégraphes des convois', s.convoi);
  if (coups.n) res.verifie('coups télégraphiés reçus avec un télégraphe à l’endroit (teleDuree ≥ 0,5 s)', 1 - coups.sans / coups.n, 1, coups.sans === 0, { coups: coups.n, sansTelegraphe: coups.sans });
  else res.nonMesurable('coups télégraphiés à l’endroit des dégâts', 'aucun coup de tir, laser, souffle ou convoi dans le journal');
  if (ex.length) res.note('exemples trop courts : ' + JSON.stringify(ex));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
