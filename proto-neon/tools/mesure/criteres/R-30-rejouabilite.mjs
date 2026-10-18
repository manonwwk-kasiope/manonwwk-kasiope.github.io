/* R-30 — Rejouabilité : deux parties de même graine et mêmes entrées donnent le même journal, en mode dessiné
   comme en mode simulé (et le dessiné égale le simulé sur les types de jeu) ; une graine différente donne une
   suite de vagues différente dans le détail (positions, côtés, voies). Pilote bon, __DT = 1/60. */
import { executer, principal, exiger } from '../commun.mjs';
import { installerRAF, amorcerPartie, jouerControle } from '../../codex-p16/raf-controle.mjs';

export const meta = { id: 'R-30', titre: 'Rejouabilité', seuil: 'même graine et mêmes entrées → même journal (dessiné et simulé) ; graine différente → vagues différentes', bloquant: true };
/* types qui dépendent de l'image ou de l'audio, et non de la simulation */
const HORS_JEU = ['perf', 'vue', 'sfx', 'bloc', 'section', 'geste'];
// hudBanniere est une preuve du premier dessin, avec rectangle et échelle ; flash est la décision
// du limiteur de lumière (incluant désormais ses demandes sous-seuil). Aucun des deux n'est un kill,
// une apparition ou une entrée de la joueuse. Leur reproductibilité reste exigée entre deux dessins.
// On le garde pour dessiné/dessiné et on l'exclut seulement de dessiné/simulé.
export const TYPES_DESSIN = ['hudBanniere', 'flash'];
export const cle = (J, T, jeuSeulement = false) => J.filter(x => !HORS_JEU.includes(x.type) &&
  !(jeuSeulement && TYPES_DESSIN.includes(x.type)) && x.t <= T).map(x => JSON.stringify([x.pas, x.type, x.d]));
export function comparer(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return { egaux: false, premier: i, a: a[i], b: b[i] };
  return { egaux: a.length === b.length, premier: a.length === b.length ? -1 : n, longueurs: [a.length, b.length] };
}
// Le RAF natif peut dessiner 0, 1 ou plusieurs images avant demarrer(). S.frame n'est pas
// remis à zéro par reset : flash.d._image expose alors le temps de chargement, même à __DT fixe.
// Recharger avec le contrôleur installé AVANT boot, puis piloter les vraies frames ; ne filtrer aucun champ.
async function rejouer(banc, graine, T, simulation = false, nodraw = false) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60, graine, query: nodraw ? {nodraw:'1'} : {} });
  try {
    await s.page.addInitScript(installerRAF);
    await s.page.goto(s.urlOuverte, {waitUntil:'load'});
    const attente = await s.eval(() => window.__N.R.perf.attenteP16);
    await s.page.waitForFunction(() => window.__N?.art?.ready() && window.__R30RAF,
      null, {timeout:attente.delaiMs, polling:attente.pollingMs});
    const debut = await s.eval(amorcerPartie, {graine});
    const r = await s.eval(jouerControle, {T, simulation, dessiner:!nodraw});
    return {...r, debut, erreurs:await s.bilanErreurs()};
  } finally { await s.fermer(); }
}

export async function journalInitial(banc, graine) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60, graine });
  try {
    return await s.eval(g => {
      const N = window.__N;
      N.journal.actif(true);
      N.game.reset(g, { depart: 'plongee', mode: 'banc' });
      return N.journal.dump();
    }, graine);
  } finally { await s.fermer(); }
}

export async function mesurer(banc, res) {
  const T = banc.o.rapide ? 15 : 60;
  const p = await banc.ouvrir('paysage', {});
  if (!await exiger(p, res, 'journal', ['N.journal.dump', 'N.game.dbg.simuler'])) return;
  await p.fermer();
  // Contrôle indépendant : le reset et le journal sont publics même quand le départ ne fonctionne pas.
  // Ce contrôle ne valide jamais les parties dessinées/simulées exigées ci-dessous.
  const ia = cle(await journalInitial(banc, 7), 0), ib = cle(await journalInitial(banc, 7), 0);
  if (!ia.length || !ib.length) res.nonMesurable('réinitialisation reproductible', 'journal initial de jeu vide');
  else { const r = comparer(ia, ib); res.verifie('réinitialisation : même graine → même journal initial', r.egaux, true, r.egaux, r); }

  /* simulé : deux fois la même graine (sans cache), puis une autre graine */
  const a = await rejouer(banc, 7, T, true), b = await rejouer(banc, 7, T, true), c = await rejouer(banc, 8, T, true);
  for (const [nom, p] of [['a', a], ['b', b], ['c', c]]) if (!p.ok) return res.nonMesurable('mode simulé (' + nom + ')', p.raison);
  if (!cle(a.journal, T).length || !cle(b.journal, T).length) return res.nonMesurable('mode simulé', 'journal de jeu vide : égalité non probante');
  const ka = cle(a.journal, T), kb = cle(b.journal, T);
  const r1 = comparer(ka, kb);
  res.verifie('simulé : même graine → même journal', r1.egaux, true, r1.egaux, { entrees: ka.length, ...r1 });
  const app = J => J.filter(x => x.type === 'apparition' || (x.type === 'arene' && (x.d || {}).voie !== undefined)).map(x => JSON.stringify([x.type, Math.round((x.d || {}).x), Math.round((x.d || {}).y), (x.d || {}).voie]));
  const pa = app(a.journal), pc = app(c.journal);
  const diff = pa.length !== pc.length || pa.some((v, i) => v !== pc[i]);
  res.verifie('graine différente → apparitions différentes dans le détail', diff, true, diff && pa.length > 0, { apparitions: [pa.length, pc.length] });
  /* dessiné : deux fois la même graine, puis comparé au simulé */
  const da = await rejouer(banc, 7, T), db = await rejouer(banc, 7, T);
  if (!da.ok || !db.ok) return res.nonMesurable('mode dessiné', da.raison || db.raison);
  const kda = cle(da.journal, T), kdb = cle(db.journal, T);
  if (!kda.length || !kdb.length) return res.nonMesurable('mode dessiné', 'journal de jeu vide : égalité non probante');
  const r2 = comparer(kda, kdb);
  res.verifie('dessiné : même graine → même journal', r2.egaux, true, r2.egaux, { entrees: kda.length, departs:[da.debut,db.debut], fins:[da.fin,db.fin], erreurs:[da.erreurs,db.erreurs], ...r2 });
  const nd = await rejouer(banc, 7, T, false, true);
  if (!nd.ok) res.nonMesurable('vraies frames avec/sans dessin', 'borne atteinte');
  else {
    const rd = comparer(cle(da.journal,T,true), cle(nd.journal,T,true));
    res.verifie('vraies frames : dessin sans effet sur le journal de jeu', rd.egaux, true, rd.egaux,
      {entrees:[cle(da.journal,T,true).length,cle(nd.journal,T,true).length], fins:[da.fin,nd.fin], ...rd});
  }
  const runs = [a,b,c,da,db,nd];
  res.verifie('zéro erreur pendant les rejeux', runs.map(r => r.err.count), 'tous à 0',
    runs.every(r => r.err.count === 0 && r.erreurs.zero));
  const sansPas = l => l.map(s => s.replace(/^\[\d+,/, '['));
  const jeuDessine = cle(da.journal, T, true), jeuSimule = cle(a.journal, T, true);
  /* Les deux parcours partagent le pas fixe : son numéro fait partie de la preuve.
     La comparaison sans pas reste un diagnostic, jamais le verdict. */
  const r3 = comparer(jeuDessine, jeuSimule);
  res.verifie('dessiné = simulé (types de jeu)', r3.egaux, true, r3.egaux,
    { diagnostic:'Comparaison stricte [pas,type,données] ; seuls les types de présentation déjà déclarés sont exclus. Causes et raccords réservés : tools/codex-p38/rapport.md.',
      comparaisonSansPas: comparer(sansPas(jeuDessine), sansPas(jeuSimule)),
      fins:[da.fin,a.fin], entrees: [jeuDessine.length, jeuSimule.length], typesDessinExclus: TYPES_DESSIN,
      dessins: da.journal.filter(x => TYPES_DESSIN.includes(x.type) && x.t <= T).length,
      comparaisonAvantFiltrage: comparer(sansPas(kda), sansPas(ka)), ...r3 });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
