/* R-23 — Un pouce : le secteur se gagne en ne faisant que diriger, sans second doigt ni accélération : pilote
   expert, variante `diriger`, ≥ 15 % des graines ; avec ACTIONS AUTO et la poussée droit devant (variante
   `auto`, S.reglages.actions = 'auto') : ≥ 35 %. 50 graines, mode simulé. */
import { executer, principal, seuils } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-23', titre: 'Un pouce', seuil: 'expert « diriger » ≥ 15 % ; expert « auto » ≥ 35 %', bloquant: true };

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R23');
  const graines = banc.graines(50, 5);
  for (const [variante, seuil, o] of [['diriger', s.diriger, {}], ['auto', s.auto, { actions: 'auto' }]]) {
    const b = bilanLot(await lot(banc, 'expert', graines, { variante, ...o }));
    if (!b.ok) { res.nonMesurable(`expert « ${variante} »`, b.raison); continue; }
    const v = b.resumes.filter(r => r.victoire).length / b.resumes.length;
    res.verifie(`expert « ${variante} » : secteurs gagnés`, v, '≥ ' + seuil, v >= seuil, { parties: b.resumes.length });
    if (variante === 'diriger') {
      /* le pilote ne doit rien faire d'autre que diriger : aucune impulsion de pouvoir, d'APOGÉE ni d'accélération */
      const imp = b.resumes.reduce((n, r) => n + r.pilote.filter(x => ['pouvoir', 'apogee'].includes(x.evt) || (x.evt === 'boost' && x.on)).length, 0);
      res.verifie('expert « diriger » : impulsions de pouvoir, APOGÉE ou accélération du pilote', imp, 0, imp === 0);
    }
    if (!b.resumes.some(r => r.piloteConforme)) res.note(`expert « ${variante} » : repli du squelette (aucune décision « cap » journalisée)`);
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
