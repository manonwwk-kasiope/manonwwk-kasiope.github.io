/* R-25 — Musique de la propriétaire : jouée en jeu (N.music.piste() : pret, sans repli ; journal `bloc`),
   calée sur la mesure (débuts de bloc multiples de la mesure à 144,6 BPM, à 10 ms près), jamais redémarrée
   au début après une mort (le bloc qui suit une mort n'est ni le premier de la piste, ni celui d'avant) ;
   repli génératif sans trou quand musique/ est injoignable (niveau de sortie jamais nul plus de 0,5 s). */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-25', titre: 'Musique de la propriétaire', seuil: 'piste jouée, calée à 10 ms, pas de redémarrage après une mort, repli sans trou', bloquant: true, exclusif: true };

async function lancerAvecSon(s) {
  const v = s.page.viewportSize();
  await s.page.touchscreen.tap(v.width / 2, v.height / 2).catch(() => s.page.mouse.click(v.width / 2, v.height / 2));
  await s.page.waitForTimeout(400);
  return s.demarrer({ graine: 8, pilote: 'bon', god: true });
}

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', {});
  const { R } = await seuils(s, 'R25');
  if (!await exiger(s, res, 'musique', ['N.music.piste', 'N.journal.dump'])) return;
  const d = await lancerAvecSon(s);
  if (!d.ok) return res.nonMesurable('partie', d.raison);
  await s.page.waitForTimeout(banc.o.rapide ? 12000 : 30000);
  /* une mort, avec une vie restante */
  await s.eval(() => { const d2 = window.__MESURE.dbg(); if (d2.god) d2.god(false); try { window.__N.joueuse.tuer('mur', { genre: 'decor', type: 'mur', id: -1 }); } catch (e) { } });
  await s.page.waitForTimeout(6000);
  const piste = await s.eval(() => { try { return window.__N.music.piste(); } catch (e) { return null; } });
  const J = (await s.journal()) || [];
  const blocs = J.filter(x => x.type === 'bloc').map(x => ({ t: x.t, ...(x.d || x) }));
  const morts = J.filter(x => x.type === 'mort').map(x => x.t);
  res.verifie('piste prête, sans repli (N.music.piste())', piste, '{pret:true, repli:false}', !!piste && piste.pret === true && piste.repli === false);
  if (!blocs.length) res.nonMesurable('blocs joués en jeu', 'journal `bloc` vide');
  else {
    res.verifie('blocs de musique/ joués en jeu', blocs.length, '≥ 1', blocs.some(b => /musique\//.test(b.fichier || '') || /\.mp3$/.test(b.fichier || '')), { fichiers: [...new Set(blocs.map(b => b.fichier))].slice(0, 8) });
    const bpm = (R.musique && R.musique.bpm) || 144.6, mesure = 4 * 60 / bpm;
    const t0 = blocs[0].t0, ecarts = blocs.map(b => { const k = (b.t0 - t0) / mesure; return Math.abs(k - Math.round(k)) * mesure; });
    res.verifie('débuts de bloc calés sur la mesure (écart max, s)', Math.max(...ecarts), '≤ 0,010', Math.max(...ecarts) <= 0.010 + 1e-9, { mesure });
    if (!morts.length) res.nonMesurable('pas de redémarrage après une mort', 'la mort demandée par N.joueuse.tuer n’a pas eu lieu');
    else {
      const tm = morts[0], avant = blocs.filter(b => b.t <= tm).pop(), apres = blocs.find(b => b.t > tm);
      if (!apres) res.nonMesurable('pas de redémarrage après une mort', 'aucun bloc après la mort');
      else res.verifie('bloc après la mort : ni le premier de la piste, ni celui d’avant', apres.fichier, '≠ ' + blocs[0].fichier + (avant ? ' et ≠ ' + avant.fichier : ''), apres.fichier !== blocs[0].fichier && (!avant || apres.fichier !== avant.fichier));
    }
  }
  await s.fermer();
  /* le repli génératif : musique/ refusée */
  const q = await banc.ouvrir('paysage', { bloquer: '**/musique/**' });
  if (!await exiger(q, res, 'repli génératif', ['N.music.piste', 'N.music.rmsOut'])) return;
  const d2 = await lancerAvecSon(q);
  if (!d2.ok) return res.nonMesurable('repli génératif', d2.raison);
  await q.page.waitForTimeout(2000);
  const niv = [];
  for (let k = 0; k < (banc.o.rapide ? 60 : 150); k++) { niv.push(await q.eval(() => { try { return window.__N.music.rmsOut(); } catch (e) { return -1; } })); await q.page.waitForTimeout(100); }
  const p2 = await q.eval(() => { try { return window.__N.music.piste(); } catch (e) { return null; } });
  res.verifie('repli déclaré quand musique/ est injoignable', p2 && p2.repli, true, !!p2 && p2.repli === true);
  let trou = 0, run = 0; for (const v of niv) { if (v <= 1e-4) { run++; trou = Math.max(trou, run); } else run = 0; }
  res.verifie('repli génératif : plus long silence (s)', trou * 0.1, '< 0,5', trou * 0.1 < 0.5, { mesures: niv.length, niveauMedian: niv.slice().sort((a, b) => a - b)[niv.length >> 1] });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
