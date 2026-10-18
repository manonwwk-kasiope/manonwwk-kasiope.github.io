/* R-20 — Performance : p95 du coût d'image ≤ 11 ms au profil iPhone 13 paysage ×1, qualité adaptative coupée,
   sur les scènes `charge`, `v5` et `vol`, parallaxe complète, et meilleur que SNAKE 2030 dans la même fenêtre ;
   au profil processeur ×4 (CDP Emulation.setCPUThrottlingRate), p95 ≤ 25 ms avec la qualité adaptative et
   aucune perte de temps de jeu ; sur le vrai iPhone, p95 ≤ 16,7 ms lu sur ?perf=1 aux jalons (hors banc).
   Le coût d'une image est la durée de son rappel requestAnimationFrame (mise à jour, dessin, tube), mesurée
   par la sonde ; __DT = 1/60, soit deux pas de simulation par image. */
import { executer, principal, seuils, exiger, stats } from '../commun.mjs';
import { ouvrirSnake2030 } from '../snake2030.mjs';

export const meta = { id: 'R-20', titre: 'Performance', seuil: 'p95 ≤ 11 ms (×1, sans adaptatif) et < SNAKE 2030 ; p95 ≤ 25 ms (×4) sans perte de temps ; p95 ≤ 16,7 ms sur iPhone', bloquant: true, exclusif: true };

// Observer les conditions PENDANT la fenêtre, pas seulement la phase immédiatement après startRun.
export function installerConditionsR20(pollingMs) {
  const e = () => {
    const N = window.__N, S = window.__S, g = N?.gfx;
    const cs = [...document.querySelectorAll('canvas')].map(c => ({w:c.width,h:c.height}));
    return {phase:S?.phase, etat:N?.game?.etat?.() || null, paused:!!S?.paused, t:S?.t,
      ennemis:S?.enemies?.length ?? S?.enemies?.n ?? null,
      tampon:g ? {w:g.W,h:g.H,px:g.PX} : null, canvas:cs,
      qualite2030:S?.pxEff ?? S?.opt?.px ?? null};
  };
  const mesures = [e()], timer = setInterval(() => mesures.push(e()), pollingMs);
  window.__conditionsR20 = {fin() {clearInterval(timer);mesures.push(e());return mesures;}};
}
async function couts(s, sec, pollingMs) {
  await s.eval(installerConditionsR20, pollingMs);
  const n0 = await s.eval(() => window.__MESURE.nCouts);
  await s.page.waitForTimeout(sec * 1000);
  return s.eval(n => ({serie:window.__MESURE.lireCouts(n), conditions:window.__conditionsR20.fin()}), n0);
}
export function comparerConditions2030(conditions) {
  if (!conditions.length) return {ok:false, raison:'aucune observation pendant la fenêtre'};
  if (conditions.some(c => c.phase !== 'play' || c.paused))
    return {ok:false, raison:'SNAKE 2030 ne reste pas en jeu actif pendant toute la mesure'};
  if (!Number.isFinite(conditions[0].t) || !(conditions.at(-1).t > conditions[0].t))
    return {ok:false, raison:'temps de jeu SNAKE 2030 immobile ou absent pendant la mesure'};
  if (new Set(conditions.map(c => c.qualite2030)).size !== 1)
    return {ok:false, raison:'qualité adaptative de SNAKE 2030 modifiée pendant la mesure ×1 sans adaptatif'};
  return {ok:true};
}
async function tubeRiche(s, auto) {
  return s.eval(a => { const N = window.__N; try { if (window.__S.reglages) window.__S.reglages.ecran = 'riche'; } catch (e) { } try { N.crt.preset('riche'); } catch (e) { } try { N.crt.auto(a); return true; } catch (e) { return false; } }, auto);
}

// t = somme des dtMonde (ralentis et hitstops voulus) ; reel = somme des H réellement exécutés.
// Aucune compensation du retard CPU : les pas non exécutés restent manquants dans reel.
export function ratiosTemps(a, b) {
  const mural = (b.r - a.r) / 1000;
  if (!(mural > 0) || b.reel < a.reel || b.pas < a.pas) return null;
  return { ancien: (b.t - a.t) / mural, machine: (b.reel - a.reel) / mural,
    secondesMurales: mural, secondesTraitees: b.reel - a.reel,
    secondesMonde: b.t - a.t, pasTraites: b.pas - a.pas };
}
async function temps(s) {
  return s.eval(() => {
    const h = window.__N.horloge;
    return { t: h.t(), reel: h.reel(), pas: h.pas(), r: performance.now(),
      etat: window.__MESURE.etat(), horloge: h.etat() };
  });
}

export async function mesurer(banc, res) {
  const chauffe = 2, duree = banc.o.rapide ? 4 : 10;
  const s = await banc.ouvrir('paysage', { dt: 1 / 60, couts: true });
  const { s: S } = await seuils(s, 'R20');
  const pollingMs = await s.eval(() => window.__N.R.perf.attenteP16.pollingMs);
  if (!await exiger(s, res, 'scènes de référence', ['N.game.dbg.scene', 'N.crt.auto', 'N.horloge.reel', 'N.horloge.etat'])) return;
  const p95 = {}, conditions2975 = {};
  for (const sc of ['charge', 'v5', 'vol']) {
    const r = await s.scene(sc);
    if (!r.ok) { res.nonMesurable(`scène ${sc}`, r.raison); continue; }
    await s.eval(() => { const d = window.__MESURE.dbg(); if (d.god) d.god(true); });
    await tubeRiche(s, false);
    await s.page.waitForTimeout(chauffe * 1000);
    const {serie:c, conditions} = await couts(s, duree, pollingMs);
    conditions2975[sc] = conditions;
    if (c.length < 30) { res.nonMesurable(`scène ${sc}`, 'moins de 30 images mesurées'); continue; }
    p95[sc] = stats.p95(c);
    res.verifie(`scène ${sc}, ×1, sans qualité adaptative : p95 (ms)`, p95[sc], '≤ ' + S.x1, p95[sc] <= S.x1, { conditions, images: c.length, p50: stats.mediane(c), p99: stats.quantile(c, 0.99), max: Math.max(...c) });
  }
  await s.fermer();
  /* SNAKE 2030, même fenêtre, même profil */
  const z = await ouvrirSnake2030(banc, 'paysage', { dt: 1 / 60, couts: true });
  if (!z.ok) res.nonMesurable('meilleur que SNAKE 2030', z.raison);
  else if (!p95.charge) res.nonMesurable('meilleur que SNAKE 2030', 'pas de mesure de la scène charge');
  else {
    await z.s.page.waitForTimeout(chauffe * 1000);
    const {serie:c, conditions} = await couts(z.s, duree, pollingMs);
    const eux = stats.p95(c);
    const validite = comparerConditions2030(conditions);
    const preuve = {brut:{snake2975:p95.charge,snake2030:eux}, conditions2030:conditions, conditions2975:conditions2975.charge,
      protocole:{profil:'iPhone 13 paysage',dt:1/60,cpu:1,chauffe,duree,pollingMs,charge2975:'fixture charge',charge2030:'début de partie sans pilote'}, validite};
    if (!validite.ok || c.length < 30) res.nonMesurable('scène charge meilleure que SNAKE 2030 en jeu (p95, ms)', validite.raison || 'moins de 30 images', preuve);
    else res.verifie('scène charge meilleure que SNAKE 2030 en jeu (p95, ms)', { snake2975: p95.charge, snake2030: eux }, 'snake2975 < snake2030', p95.charge < eux, { imagesSnake2030: c.length, ...preuve });
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
    const a = await temps(q);
    const {serie:c, conditions} = await couts(q, duree, pollingMs);
    const b = await temps(q);
    const v = stats.p95(c);
    res.verifie('scène charge, processeur ×4, qualité adaptative : p95 (ms)', v, '≤ ' + S.x4, v <= S.x4, { images: c.length, conditions });
    const ratios = ratiosTemps(a, b);
    if (!ratios) res.nonMesurable('temps traité / temps réel au profil ×4', 'horloge réinitialisée ou intervalle mural nul', { a, b });
    else res.verifie('temps traité / temps réel au profil ×4 (pas réellement exécutés)', ratios.machine, '≥ 0,99', ratios.machine >= 0.99,
      { ...ratios, etat: b.etat, debut: a, fin: b });
  }
  await q.fermer();
  res.horsBanc('vrai iPhone de la propriétaire', 'p95 ≤ ' + S.iphone + ' ms à lire sur ?perf=1&scene=charge aux jalons A et B (REFONTE.md § 8.4)');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
