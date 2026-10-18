/* R-18 — Écran de fin : cause, quartier, progression, écart, build, record, défis, note, conseil, prochain
   déblocage, initiales si top 10, CONTINUER ? une fois. Mesure : scène `fin` (mort par tourelle en V3), et
   les textes demandés à N.spr.text pendant 60 images ; la cause doit être N.ids.texte(cause, auteur) de
   S.death. Les autres rubriques sont cherchées par mots-clés (heuristiques, indicatives) ; la capture est
   jointe pour la relecture. */
import { executer, principal, exiger } from '../commun.mjs';

export const meta = { id: 'R-18', titre: 'Écran de fin', seuil: 'cause, quartier, progression, écart, build, record, défis, note, conseil, prochain déblocage, CONTINUER', bloquant: true };
const RUBRIQUES = {
  progression: /\bV\s?[1-5]\b|VAGUE|%/, ecart: /ÉCART|[+−-]\s?\d/, build: /CANON|TOURELLES|ARC|MISSILES|DRONES|MINES/, record: /RECORD|MEILLEUR/,
  defis: /DÉFI|FINIR|✓|✗/, note: /NOTE|RANG|\b[SABCDE]\b/, conseil: /CONSEIL|ASTUCE|ESSAIE|PENSE/, deblocage: /DÉBLOC|PROCHAIN|ÉNERGIE/
};

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  if (!await exiger(s, res, 'textes', ['N.spr.text', 'N.game.dbg.scene'])) return;
  await s.eval(() => window.__MESURE.appels('r18', 'N.spr.text', 5000));
  const sc = await s.scene('fin', { images: 60 });
  if (!sc.ok) return res.nonMesurable('écran de fin', sc.raison);
  await s.images(60);
  const T = [...new Set(((await s.eval(() => window.__MESURE.arreter('r18'))) || []).map(x => String(x.args[0])))];
  const info = await s.eval(() => { const N = window.__N, d = window.__S.death, bilan = N.score && N.score.resume ? N.score.resume() : null; let attendu = null; try { attendu = d && N.ids.texte ? N.ids.texte(d.cause, d.auteur) : null; } catch (e) { } return { etat: window.__MESURE.etat(), death: d, attendu, quartier: d && d.quartier, build: bilan && bilan.build && bilan.build.nom, conseil: bilan && bilan.conseil, noms: N.ids && N.ids.noms ? N.ids.noms : null }; });
  res.capture(await s.capture('R-18-fin'));
  res.verifie('état de l’écran', info.etat, 'fin', info.etat === 'fin');
  const tout = T.join(' | ').toUpperCase();
  if (!info.attendu) res.absent('cause', 'N.ids.texte / S.death');
  else res.verifie('cause : ' + info.attendu, tout.includes(String(info.attendu).toUpperCase()), 'présente', tout.includes(String(info.attendu).toUpperCase()));
  const nomQ = info.quartier && info.noms && info.noms.quartiers ? info.noms.quartiers[info.quartier] : info.quartier;
  if (nomQ) res.verifie('quartier : ' + nomQ, tout.includes(String(nomQ).toUpperCase()), 'présent', tout.includes(String(nomQ).toUpperCase()));
  else res.nonMesurable('quartier', 'S.death.quartier absent');
  res.verifie('CONTINUER ? proposé', /CONTINUER/.test(tout), 'présent', /CONTINUER/.test(tout));
  for (const [k, re] of Object.entries(RUBRIQUES)) {
    const attendu = (k === 'build' || k === 'conseil') ? info[k] : null;
    const present = attendu ? tout.includes(String(attendu).toUpperCase()) : re.test(tout);
    res.indicatif(`${k} (${attendu ? 'texte du bilan : ' + attendu : 'mots-clés'})`, present, 'présent', present);
  }
  res.note('textes vus : ' + T.slice(0, 40).join(' | '));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
