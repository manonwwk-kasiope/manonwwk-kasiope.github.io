/* R-19 — Attraction (P3) : la démo jouée après 15 s d'inaction au titre, puis la galerie, les records et
   l'invitation. Mesure : chronométrage en temps réel depuis l'arrivée au titre, sans toucher ; écrans de
   N.ui.actif() et textes demandés à N.spr.text pendant la boucle de 35 s. */
import { executer, principal, seuils, exiger } from '../commun.mjs';
import { allerTitre } from '../scenes.mjs';

export const meta = { id: 'R-19', titre: 'Attraction (P3)', seuil: 'démo après 15 s d’inaction, galerie, records, invitation', bloquant: false };

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', {});
  const { s: S } = await seuils(s, 'R19');
  if (!await exiger(s, res, 'titre', ['N.game.etat', 'N.game.dbg.input'])) return;
  const t = await allerTitre(s);
  if (!t.ok) return res.nonMesurable('titre', t.raison);
  const t0 = Date.now();
  const vu = await s.attendre(() => window.__MESURE.etat() === 'attraction', null, (S.attente + 10) * 1000);
  if (!vu) return res.verifie('attraction après ' + S.attente + ' s d’inaction', null, S.attente + ' ± 1 s', false, { raison: 'jamais atteinte en ' + (S.attente + 10) + ' s' });
  const d = (Date.now() - t0) / 1000;
  res.verifie('attraction après inaction au titre (s)', d, S.attente + ' ± 1', Math.abs(d - S.attente) <= 1);
  await s.eval(() => window.__MESURE.appels('r19', 'N.spr.text', 20000));
  const ui = new Set(); const t1 = Date.now();
  while (Date.now() - t1 < 36000) { const u = await s.eval(() => { try { const a = window.__N.ui && window.__N.ui.actif ? window.__N.ui.actif() : null; return typeof a === 'string' ? a : (a && a.nom) || null; } catch (e) { return null; } }); if (u) ui.add(u); ui.add('etat:' + await s.etat()); await s.page.waitForTimeout(500); }
  const T = [...new Set(((await s.eval(() => window.__MESURE.arreter('r19'))) || []).map(x => String(x.args[0]).toUpperCase()))].join(' | ');
  res.capture(await s.capture('R-19-attraction'));
  res.verifie('bandeau DÉMO', /DÉMO|DEMO/.test(T), 'présent', /DÉMO|DEMO/.test(T));
  res.verifie('galerie des ennemis', ui.has('galerie') || /GALERIE|FLÈCHE|DARD|SENTINELLE/.test(T), 'vue', ui.has('galerie') || /GALERIE|FLÈCHE|DARD|SENTINELLE/.test(T));
  res.verifie('tableau des records', ui.has('records') || /RECORDS?|MEILLEURS/.test(T), 'vu', ui.has('records') || /RECORDS?|MEILLEURS/.test(T));
  res.verifie('invitation TOUCHE L’ÉCRAN', /TOUCHE/.test(T), 'vue', /TOUCHE/.test(T));
  res.note('écrans et états vus : ' + [...ui].join(', '));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
