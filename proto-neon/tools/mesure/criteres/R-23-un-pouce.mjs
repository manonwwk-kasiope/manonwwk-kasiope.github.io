/* R-23 — Un pouce : le secteur se gagne en ne faisant que diriger, sans second doigt ni accélération : pilote
   expert, variante `diriger`, ≥ 15 % des graines ; avec ACTIONS AUTO et la poussée droit devant (variante
   `auto`, S.reglages.actions = 'auto') : ≥ 35 %. 50 graines, mode simulé. */
import { executer, principal, seuils } from '../commun.mjs';
import { partiePouce } from '../../codex-p21/partie-r23.mjs';

export const meta = { id: 'R-23', titre: 'Un pouce', seuil: 'expert « diriger » ≥ 15 % ; expert « auto » ≥ 35 %', bloquant: true };

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R23');
  const graines = banc.graines(50, 5);
  for (const [variante, seuil] of [['diriger', s.diriger], ['auto', s.auto]]) {
    const resumes = [];
    for (const graine of graines) {
      const page = await banc.ouvrir('paysage', { dt: 1 / 60, graine, query: { nodraw: '1' } });
      try {
        // Même protocole que tools/pilotes : aucune RAF concurrente à la simulation.
        await page.page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; });
        await page.recharger();
        const r = await page.eval(partiePouce, { graine, variante });
        r.erreurs = await page.bilanErreurs(); resumes.push(r);
      } finally { await page.fermer(); }
    }
    const b = { resumes };
    const complets = resumes.filter(r => r.fin && r.raison === 'fin' && !r.err && r.erreurs.zero).length;
    res.verifie(`expert « ${variante} » : parties terminées sans erreur`, complets, graines.length, complets === graines.length);
    const v = resumes.filter(r => r.victoire).length / graines.length;
    res.verifie(`expert « ${variante} » : secteurs gagnés`, v, '≥ ' + seuil, v >= seuil && complets === graines.length,
      { parties: graines.length, resumes: resumes.map(({journal,...r}) => r), source: 'protocole pilotes officiel ; manche virtuel actif, actions du pilote inchangées' });
    if (variante === 'diriger') {
      /* le pilote ne doit rien faire d'autre que diriger : aucune impulsion de pouvoir, d'APOGÉE ni d'accélération */
      const imp = b.resumes.reduce((n, r) => n + r.impulsions, 0);
      res.verifie('expert « diriger » : impulsions de pouvoir, APOGÉE ou accélération du pilote', imp, 0, imp === 0);
    }
    if (!b.resumes.every(r => r.piloteConforme)) res.note(`expert « ${variante} » : repli du squelette (aucune décision « cap » journalisée)`);
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
