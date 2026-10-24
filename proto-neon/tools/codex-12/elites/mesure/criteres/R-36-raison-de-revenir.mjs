/* R-36 — Raison de revenir : énergie et prochain déblocage (ou catalogue acquis et TOUT DÉBLOQUÉ peint) sur 100 % des écrans de fin (N.score.energie,
   N.score.prochain()) ; premier déblocage à la partie 1 ou 2 du pilote bon, dernier entre la 12ᵉ et la 25ᵉ
   (parties enchaînées sur un même profil, stockage gardé) ; défis du jour qui changent avec la date (S.jour) ;
   défi de vague annoncé à chaque vague (N.score.defiVague). */
import { executer, principal, exiger } from '../commun.mjs';
import { enchainees } from '../parties.mjs';

export const meta = { id: 'R-36', titre: 'Raison de revenir', seuil: 'énergie et prochain déblocage ou TOUT DÉBLOQUÉ acquis à chaque fin ; 1er déblocage partie 1-2, dernier 12-25 ; défis du jour qui changent ; défi de vague', bloquant: true };

// L'absence de prochain seuil seule n'est jamais une preuve de catalogue acquis.
export function retourValide(fin, preuve) {
  if (!fin || typeof fin.energie !== 'number') return false;
  if (fin.prochain && fin.prochain.id !== undefined) return true;
  return fin.prochain === null && !!preuve && preuve.catalogue.length > 0 &&
    preuve.catalogue.every(id => preuve.acquis.includes(id)) && preuve.toutVisible === true;
}

// Exécutée dans la vraie page à chaque fin : état public ET encre réellement peinte.
export const sondeRetour = `
  if (N.game.etat() !== 'fin') return null;
  N.gfx.origin(0, 0); N.ui.draw();
  var m = S.ecran && S.ecran.retour, b = N.gfx.buf();
  var l = m && m.lignes.find(l => l.texte === 'TOUT DÉBLOQUÉ');
  var pixels = 0;
  if (l) for (var y = l.y; y < l.y + l.h; y++) for (var x = l.x; x < l.x + l.w; x++)
    if (x >= 0 && x < N.gfx.W && y >= 0 && y < N.gfx.H && b[y * N.gfx.W + x] === l.encre) pixels++;
  return { catalogue: N.R.deblocages.map(d => d.id), acquis: N.score.deblocages.slice(),
    toutVisible: !!l && pixels > 0 && l.x >= m.x && l.x + l.w <= m.x + m.w && l.y >= m.y && l.y + l.h <= m.bas, pixels: pixels };
`;

export async function mesurer(banc, res) {
  const n = banc.o.rapide ? 4 : 25;
  const l = await enchainees(banc, 'bon', n, { echantillon: sondeRetour });
  const ok = l.filter(p => p.ok);
  if (!ok.length) return res.nonMesurable('parties enchaînées', l[0] && l[0].raison);
  const fins = ok.filter(p => p.raison === 'fin');
  const preuves = fins.map(p => ({ fin: p.fin, preuve: p.echantillons.at(-1)?.x }));
  const avec = preuves.filter(p => retourValide(p.fin, p.preuve)).length;
  res.verifie('énergie et prochain déblocage ou catalogue entièrement acquis affiché', fins.length ? avec / fins.length : null, 1, fins.length > 0 && avec === fins.length, { fins: fins.length, preuves });
  const debl = ok.map((p, i) => ({ i: i + 1, n: p.journal.filter(x => x.type === 'deblocage').length }));
  const premiere = (debl.find(x => x.n > 0) || {}).i, derniere = [...debl].reverse().find(x => x.n > 0);
  res.verifie('premier déblocage (numéro de partie)', premiere ?? null, '1 ou 2', premiere === 1 || premiere === 2, { parPartie: debl.map(x => x.n) });
  if (n >= 25) {
    const total = debl.reduce((a, x) => a + x.n, 0);
    res.verifie('dernier déblocage (numéro de partie)', derniere ? derniere.i : null, 'entre 12 et 25', !!derniere && derniere.i >= 12 && derniere.i <= 25, { deblocages: total });
  } else res.nonMesurable('dernier déblocage entre la 12ᵉ et la 25ᵉ partie', `--rapide : ${n} parties seulement`);
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  if (await exiger(s, res, 'défis du jour', ['N.score.defis', 'N.game.reset'])) {
    const ids = [];
    for (const jour of [20261017, 20261018, 20261019]) {
      await s.eval(j => { window.__MESURE.demarrer({ graine: 1, jour: j }); }, jour);
      ids.push(await s.eval(() => JSON.stringify((window.__N.score.defis || []).map(d => d && (d.id || d)))));
    }
    const differents = new Set(ids).size > 1;
    res.verifie('défis du jour qui changent avec la date (trois jours)', differents, true, differents, { defis: ids });
  }
  let nv = 0, av = 0;
  for (const p of ok) for (const v of p.journal.filter(x => x.type === 'vague' && (x.d || {}).evt === 'entree' && (x.d || {}).n >= 1)) { const e = p.echantillons.find(x => x.t >= v.t + 0.3); if (!e) continue; nv++; if (e.defiVague) av++; }
  if (nv) res.verifie('défi de vague présent à chaque vague', av / nv, 1, av === nv, { vagues: nv });
  else res.absent('défi de vague', 'N.score.defiVague');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
