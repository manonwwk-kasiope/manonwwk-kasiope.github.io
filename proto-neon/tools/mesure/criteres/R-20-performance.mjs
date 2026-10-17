/* R-20 — Performance : p95 du coût d'image ≤ 11 ms au profil iPhone 13 paysage ×1, qualité adaptative coupée,
   sur les scènes `charge`, `v5` et `vol`, parallaxe complète, et meilleur que SNAKE 2030 dans la même fenêtre ;
   au profil processeur ×4 (CDP Emulation.setCPUThrottlingRate), p95 ≤ 25 ms avec la qualité adaptative et
   aucune perte de temps de jeu ; sur le vrai iPhone, p95 ≤ 16,7 ms lu sur ?perf=1 aux jalons (hors banc).
   Le coût d'une image est la durée de son rappel requestAnimationFrame (mise à jour, dessin, tube), mesurée
   par la sonde ; __DT = 1/60, soit deux pas de simulation par image. */
import { executer, principal, seuils, exiger, stats } from '../commun.mjs';
import { ouvrirSnake2030 } from '../snake2030.mjs';

export const meta = { id: 'R-20', titre: 'Performance', seuil: 'p95 ≤ 11 ms (×1, sans adaptatif) et < SNAKE 2030 ; p95 ≤ 25 ms (×4) sans perte de temps ; p95 ≤ 16,7 ms sur iPhone', bloquant: true, exclusif: true };

async function couts(s, sec) {
  const n0 = await s.eval(() => window.__MESURE.nCouts);
  await s.page.waitForTimeout(sec * 1000);
  return s.eval(n => window.__MESURE.lireCouts(n), n0);
}
async function tubeRiche(s, auto) {
  return s.eval(a => { const N = window.__N; try { if (window.__S.reglages) window.__S.reglages.ecran = 'riche'; } catch (e) { } try { N.crt.preset('riche'); } catch (e) { } try { N.crt.auto(a); return true; } catch (e) { return false; } }, auto);
}

export async function mesurer(banc, res) {
  const chauffe = 2, duree = banc.o.rapide ? 4 : 10;
  const s = await banc.ouvrir('paysage', { dt: 1 / 60, couts: true });
  const { s: S } = await seuils(s, 'R20');
  if (!await exiger(s, res, 'scènes de référence', ['N.game.dbg.scene', 'N.crt.auto'])) return;
  const p95 = {};
  for (const sc of ['charge', 'v5', 'vol']) {
    const r = await s.scene(sc);
    if (!r.ok) { res.nonMesurable(`scène ${sc}`, r.raison); continue; }
    await s.eval(() => { const d = window.__MESURE.dbg(); if (d.god) d.god(true); });
    await tubeRiche(s, false);
    await s.page.waitForTimeout(chauffe * 1000);
    const c = await couts(s, duree);
    if (c.length < 30) { res.nonMesurable(`scène ${sc}`, 'moins de 30 images mesurées'); continue; }
    p95[sc] = stats.p95(c);
    res.verifie(`scène ${sc}, ×1, sans qualité adaptative : p95 (ms)`, p95[sc], '≤ ' + S.x1, p95[sc] <= S.x1, { images: c.length, p50: stats.mediane(c), p99: stats.quantile(c, 0.99), max: Math.max(...c) });
  }
  await s.fermer();
  /* SNAKE 2030, même fenêtre, même profil */
  const z = await ouvrirSnake2030(banc, 'paysage', { dt: 1 / 60, couts: true });
  if (!z.ok) res.nonMesurable('meilleur que SNAKE 2030', z.raison);
  else if (!p95.charge) res.nonMesurable('meilleur que SNAKE 2030', 'pas de mesure de la scène charge');
  else {
    await z.s.page.waitForTimeout(chauffe * 1000);
    const c = await couts(z.s, duree);
    const eux = stats.p95(c);
    res.verifie('scène charge meilleure que SNAKE 2030 en jeu (p95, ms)', { snake2975: p95.charge, snake2030: eux }, 'snake2975 < snake2030', p95.charge < eux, { imagesSnake2030: c.length });
  }
  if (z.s) await z.s.fermer();
  /* processeur ×4, qualité adaptative, temps réel (sans __DT) */
  const q = await banc.ouvrir('paysage', { couts: true, cpu: 4 });
  const r = await q.scene('charge');
  if (!r.ok) res.nonMesurable('profil processeur ×4', r.raison);
  else {
    await q.eval(() => { const d = window.__MESURE.dbg(); if (d.god) d.god(true); });
    await tubeRiche(q, true);
    await q.page.waitForTimeout(chauffe * 1000);
    const a = await q.eval(() => ({ t: window.__MESURE.t(), r: performance.now() }));
    const c = await couts(q, duree);
    const b = await q.eval(() => ({ t: window.__MESURE.t(), r: performance.now(), etat: window.__MESURE.etat() }));
    const v = stats.p95(c);
    res.verifie('scène charge, processeur ×4, qualité adaptative : p95 (ms)', v, '≤ ' + S.x4, v <= S.x4, { images: c.length });
    const ratio = (b.t - a.t) / ((b.r - a.r) / 1000);
    res.verifie('temps de jeu / temps réel au profil ×4', ratio, '≥ 0,99', ratio >= 0.99, { etat: b.etat });
  }
  await q.fermer();
  res.horsBanc('vrai iPhone de la propriétaire', 'p95 ≤ ' + S.iphone + ' ms à lire sur ?perf=1&scene=charge aux jalons A et B (REFONTE.md § 8.4)');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
