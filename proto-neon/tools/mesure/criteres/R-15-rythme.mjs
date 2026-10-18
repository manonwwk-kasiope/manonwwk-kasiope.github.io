/* R-15 — Rythme : vagues nommées et annoncées ; respirations (G-17 : après chaque pic, au moins 8 s sous 40 %
   du pic) ; pics d'ennemis vivants croissants de V1 à V5 (médianes) ; un pic connu en V3, V4 et V5 (G-07,
   événement `vague` evt `pic`) ; aucun tir ennemi avant la vague 2. Parties du pilote bon (invariants de
   rythme du § 4.10, bloquants). */
import { executer, principal, stats, seuils } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-15', titre: 'Rythme', seuil: 'vagues nommées et annoncées ; respirations ≥ 8 s < 40 % ; pics croissants ; pic en V3-V5 ; 0 tir ennemi en V1', bloquant: true };

/* Arbitrage Claude18/10 05h35 : pas de pic exigible dans une vague perdue avant son heure.
   Une vague arrivée à cette heure reste exigible, même si elle est ensuite perdue. */
export function eligibilitePic(r, n, regles) {
  const w = regles.secteurs && regles.secteurs[0] && regles.secteurs[0].vagues[n - 1];
  const entrees = r.vagues.filter(v => v.n === n && v.evt === 'entree');
  const entree = entrees[entrees.length - 1];
  const heure = w && w.pic && w.pic.t;
  const nettoyee = entree && r.vagues.some(v => v.n === n && v.evt === 'nettoyee' && v.t >= entree.t);
  const suivante = entree && r.vagues.some(v => v.evt === 'entree' && v.t > entree.t);
  const pic = entree && r.vagues.some(v => v.n === n && v.evt === 'pic' && v.t >= entree.t);
  const interrompue = !!entree && typeof heure === 'number' && r.finie && !nettoyee && !suivante && !pic && r.duree - entree.t < heure;
  return { interrompue, profil: r.profil || 'paysage', graine: r.graine, n, disponible: entree ? r.duree - entree.t : null, heurePic: typeof heure === 'number' ? heure : null };
}
export function compterPics(l, n, regles) {
  const jouees = l.filter(r => r.vagues.some(v => v.n === n && v.evt === 'entree'));
  const exclues = jouees.map(r => eligibilitePic(r, n, regles)).filter(x => x.interrompue);
  const eligibles = jouees.filter(r => !eligibilitePic(r, n, regles).interrompue);
  const avec = eligibles.filter(r => r.vagues.some(v => v.n === n && v.evt === 'pic')).length;
  return { jouees: jouees.length, exclues, eligibles: eligibles.length, avec, valeur: eligibles.length ? avec / eligibles.length : null, conforme: eligibles.length > 0 && avec === eligibles.length };
}

/* une respiration après le pic de la vague n : 8 s consécutives sous 40 % du pic, avant le pic suivant */
export function respirations(r, regles) {
  const E = r.echantillons, out = [];
  for (let n = 1; n <= 5; n++) {
    if (eligibilitePic(r, n, regles).interrompue) continue;
    const l = E.filter(e => e.vague === n); if (!l.length) continue;
    const pic = Math.max(...l.map(e => e.vivants)); if (!pic) continue;
    const tp = l.find(e => e.vivants === pic).t;
    const suite = E.filter(e => e.t > tp && (e.vague === n || e.vague === n + 1 || e.vague === 0));
    const finPic = (E.find(e => e.vague === n + 1 && e.vivants >= pic * 0.9) || {}).t || Infinity;
    let deb = null, best = 0;
    for (const e of suite) { if (e.t > finPic) break; if (e.vivants < 0.4 * pic) { if (deb === null) deb = e.t; best = Math.max(best, e.t - deb); } else deb = null; }
    const terminee = E.some(e => e.t > tp + 8);
    out.push({ n, pic, tp, respiration: best, terminee });
  }
  return out;
}

export async function mesurer(banc, res) {
  const b = bilanLot(await lot(banc, 'bon', banc.graines(50, 5)));
  if (!b.ok) return res.nonMesurable('parties du pilote bon', b.raison);
  const R = b.resumes.map((r, i) => ({ ...r, profil: (b.parties[i].params && b.parties[i].params.profil) || 'paysage' }));
  const session = await banc.ouvrir('paysage', { nodraw: true, dt: 1 / 60 });
  let regles; try { regles = (await seuils(session, 'R15')).R; } finally { await session.fermer(); }
  const exclues = R.flatMap(r => [1, 2, 3, 4, 5].map(n => eligibilitePic(r, n, regles)).filter(x => x.interrompue));
  const parProfil = Object.fromEntries([...new Set(R.map(r => r.profil))].map(p => [p, { total: 0 }])); for (const x of exclues) { const p = parProfil[x.profil]; p.total++; p['V' + x.n] = (p['V' + x.n] || 0) + 1; }
  res.note('Vagues perdues avant le pic exclues des contrôles pic/respiration : ' + JSON.stringify({ nombre: exclues.length, parProfil, cas: exclues }));
  const entrees = R.flatMap(r => r.vagues.filter(v => v.evt === 'entree' && v.n >= 1));
  if (!entrees.length) return res.nonMesurable('vagues', 'journal `vague` sans entrée');
  const sansNom = entrees.filter(v => !v.nom).length;
  res.verifie('vagues nommées (entrées avec nom)', 1 - sansNom / entrees.length, 1, sansNom === 0, { entrees: entrees.length });
  const avecBan = R.filter(r => r.appels && r.appels['N.hud.banniere']);
  if (avecBan.length) {
    let annoncees = 0, n = 0;
    for (const r of avecBan) for (const v of r.vagues.filter(x => x.evt === 'entree' && x.n >= 1)) { n++; if (r.appels['N.hud.banniere'].some(a => a.t >= v.t - 1.2 && a.t <= v.t + 1.5)) annoncees++; }
    res.verifie('vagues annoncées par une bannière (± 1,5 s)', annoncees / Math.max(1, n), 1, annoncees === n, { vagues: n });
  } else res.absent('vagues annoncées', 'N.hud.banniere');
  const resp = R.flatMap(r => respirations(r, regles).filter(x => x.terminee).map(x => ({ ...x, graine: r.graine })));
  const manquees = resp.filter(x => x.respiration < 8);
  res.verifie('respirations de 8 s sous 40 % du pic, après chaque pic', 1 - manquees.length / Math.max(1, resp.length), 1, resp.length > 0 && manquees.length === 0, { pics: resp.length, exemples: manquees.slice(0, 6) });
  const med = [1, 2, 3, 4, 5].map(n => { const l = R.map(r => r.pics[n]).filter(v => v !== undefined); return l.length >= Math.max(1, R.length / 4) ? stats.mediane(l) : null; });
  const conn = med.filter(v => v !== null);
  const croissant = conn.every((v, i) => i === 0 || v > conn[i - 1]);
  res.verifie('pics de vivants croissants V1 < V2 < V3 < V4 < V5 (médianes)', med, 'strictement croissants', conn.length >= 2 && croissant, { vaguesConnues: conn.length });
  for (const n of [3, 4, 5]) {
    const c = compterPics(R, n, regles);
    if (!c.eligibles) { res.nonMesurable(`pic connu en V${n}`, `aucune vague exigible (${c.exclues.length} interrompue(s) avant le pic)`); continue; }
    res.verifie(`pic connu en V${n} (événement vague/pic)`, c.valeur, 1, c.conforme, { parties: c.eligibles, jouees: c.jouees, excluesAvantPic: c.exclues.length, parProfil });

  }
  let tirsV1 = 0;
  for (const p of b.parties) { const r = R.find(x => x.graine === p.params.graine); const t2 = r.entreeV(2) ?? Infinity; tirsV1 += p.journal.filter(x => x.type === 'tirEnnemi' && x.t < t2).length; }
  res.verifie('tirs ennemis avant la vague 2', tirsV1, 0, tirsV1 === 0);
}
if (principal(import.meta.url)) executer({ meta, mesurer });
