/* R-30 — Rejouabilité : deux parties de même graine et mêmes entrées donnent le même journal, en mode dessiné
   comme en mode simulé (et le dessiné égale le simulé sur les types de jeu) ; une graine différente donne une
   suite de vagues différente dans le détail (positions, côtés, voies). Pilote bon, __DT = 1/60. */
import { executer, principal, exiger } from '../commun.mjs';
import { partie } from '../parties.mjs';

export const meta = { id: 'R-30', titre: 'Rejouabilité', seuil: 'même graine et mêmes entrées → même journal (dessiné et simulé) ; graine différente → vagues différentes', bloquant: true };
/* types qui dépendent de l'image ou de l'audio, et non de la simulation */
const HORS_JEU = ['perf', 'vue', 'sfx', 'bloc', 'section', 'geste'];
const cle = (J, T) => J.filter(x => !HORS_JEU.includes(x.type) && x.t <= T).map(x => JSON.stringify([x.pas, x.type, x.d]));
function comparer(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return { egaux: false, premier: i, a: a[i].slice(0, 160), b: b[i].slice(0, 160) };
  return { egaux: a.length === b.length, premier: a.length === b.length ? -1 : n, longueurs: [a.length, b.length] };
}
async function dessinee(banc, graine, T) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60, graine });
  try {
    await s.eval(() => { try { window.__N.journal.dump({ vider: true }); } catch (e) { } });
    const d = await s.demarrer({ graine, pilote: 'bon' });
    if (!d.ok) return { ok: false, raison: d.raison };
    const J = [];
    while (true) { await s.page.waitForTimeout(1000); J.push(...(await s.journal(true) || [])); const t = await s.t(), e = await s.etat(); if (t >= T + 0.5 || e === 'fin' || e === 'initiales') break; }
    return { ok: true, journal: J };
  } finally { await s.fermer(); }
}

export async function mesurer(banc, res) {
  const T = banc.o.rapide ? 15 : 60;
  const p = await banc.ouvrir('paysage', {});
  if (!await exiger(p, res, 'journal', ['N.journal.dump', 'N.game.dbg.simuler'])) return;
  await p.fermer();
  /* simulé : deux fois la même graine (sans cache), puis une autre graine */
  const o = { pilote: 'bon', graine: 7, maxT: T, echantillon: 'return 0' };
  const a = await partie(banc, o), b = await partie(banc, o), c = await partie(banc, { ...o, graine: 8 });
  if (!a.ok) return res.nonMesurable('mode simulé', a.raison);
  const ka = cle(a.journal, T), kb = cle(b.journal, T);
  const r1 = comparer(ka, kb);
  res.verifie('simulé : même graine → même journal', r1.egaux, true, r1.egaux, { entrees: ka.length, ...r1 });
  const app = J => J.filter(x => x.type === 'apparition' || (x.type === 'arene' && (x.d || {}).voie !== undefined)).map(x => JSON.stringify([x.type, Math.round((x.d || {}).x), Math.round((x.d || {}).y), (x.d || {}).voie]));
  const pa = app(a.journal), pc = app(c.journal);
  const diff = pa.length !== pc.length || pa.some((v, i) => v !== pc[i]);
  res.verifie('graine différente → apparitions différentes dans le détail', diff, true, diff && pa.length > 0, { apparitions: [pa.length, pc.length] });
  /* dessiné : deux fois la même graine, puis comparé au simulé */
  const da = await dessinee(banc, 7, T), db = await dessinee(banc, 7, T);
  if (!da.ok || !db.ok) return res.nonMesurable('mode dessiné', da.raison || db.raison);
  const kda = cle(da.journal, T), kdb = cle(db.journal, T);
  const r2 = comparer(kda, kdb);
  res.verifie('dessiné : même graine → même journal', r2.egaux, true, r2.egaux, { entrees: kda.length, ...r2 });
  const sansPas = l => l.map(s => s.replace(/^\[\d+,/, '['));
  const r3 = comparer(sansPas(kda), sansPas(ka));
  res.verifie('dessiné = simulé (types de jeu)', r3.egaux, true, r3.egaux, { entrees: [kda.length, ka.length], ...r3 });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
