/* R-33 — Gestes sûrs : recentrages humains (120 s de pouce levé et reposé toutes les 0,5 à 3 s, dont 30 % de
   reposés de moins de 200 ms sans mouvement, et 10 % où un autre doigt se pose moins de 150 ms après) :
   0 action involontaire ; slalom serré : 0 accélération ; 20 sur 20 pour chaque geste du second doigt ;
   50 balayages par bord : 0 navigation, 0 zoom, 0 sélection, et les origines du manche à 20 pt au moins des
   bords. Doigts simulés par CDP, iPhone 13 paysage, en onglet (le mode web app n'est pas émulable ici). */
import { executer, principal, seuils, exiger } from '../commun.mjs';
import { Doigts, preparerJeu, serieSecondDoigt, vue, hasard, lireGestes } from '../gestes.mjs';

export const meta = { id: 'R-33', titre: 'Gestes sûrs', seuil: '0 action involontaire ; slalom 0 accélération ; 20/20 ; 0 navigation, zoom, sélection', bloquant: true, exclusif: true };

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', {});
  const { R } = await seuils(s, 'R33');
  const L = (R.criteres && R.criteres.lots) || { recentrages: 120, recentrageCourt: 0.3, recentrageAutreDoigt: 0.1, gestes: 20, balayages: 50, bordPx: 10 };
  if (!await exiger(s, res, 'entrées', ['S.input', 'S.player'])) return;
  const p = await preparerJeu(s);
  if (!p.ok) return res.nonMesurable('partie', p.raison);
  const V = vue(s), d = await new Doigts(s).init(), alea = hasard(2975);
  /* 1. les recentrages humains */
  const duree = banc.o.rapide ? 20 : L.recentrages;
  await s.eval(() => { try { window.__N.journal.dump({ vider: true }); } catch (e) { } window.__MESURE.parImage('r33b', 'return !!(S.input && S.input.boost) ? 1 : 0;'); });
  const t0 = Date.now(); let n = 0, courts = 0, autres = 0;
  while (Date.now() - t0 < duree * 1000) {
    n++;
    const x = V.w * (0.1 + 0.35 * alea()), y = V.h * (0.35 + 0.5 * alea()), court = alea() < L.recentrageCourt, autre = alea() < L.recentrageAutreDoigt;
    const id = await d.poser(x, y);
    if (autre) { autres++; await d.attendre(40 + 90 * alea()); const id2 = await d.poser(V.w * (0.55 + 0.35 * alea()), V.h * (0.3 + 0.5 * alea())); await d.attendre(80); await d.lever(id2); }
    if (court) { courts++; await d.attendre(60 + 120 * alea()); }
    else { const a = alea() * Math.PI * 2; await d.glisser(id, x + 30 * Math.cos(a), y + 30 * Math.sin(a), 80); await d.attendre(500 + 2500 * alea()); }
    await d.lever(id); await d.attendre(30 + 120 * alea());
  }
  const Lg = await lireGestes(s), B = await s.eval(() => window.__MESURE.arreter('r33b'));
  if (!Lg) res.absent('recentrages humains', 'N.journal.dump');
  else {
    const inv = Lg.gestes.filter(g => g.action && g.action !== 'aucune').length;
    res.verifie(`recentrages humains (${n} poses, ${courts} courtes, ${autres} avec un autre doigt) : actions involontaires`, inv + Lg.pouvoirs + Lg.apogees, 0, inv + Lg.pouvoirs + Lg.apogees === 0, { gestes: Lg.gestes.length, pouvoirs: Lg.pouvoirs, apogees: Lg.apogees });
    const acc = B.reduce((a, b, i) => a + (b && !B[i - 1] ? 1 : 0), 0);
    res.verifie('recentrages humains : accélérations par le second doigt', acc, 0, acc === 0);
  }
  await d.toutLever(); await d.attendre(300);
  /* 2. le slalom serré : manche à fond, cap qui oscille de ± 40° toutes les 150 ms */
  { await s.eval(() => window.__MESURE.parImage('slalom', 'return !!(S.player && S.player.boost) ? 1 : 0;'));
    const R0 = await s.eval(() => (window.__S.input.stick && window.__S.input.stick.r) || 44), a0 = await s.eval(() => window.__S.player.ang);
    const id = await d.poser(V.w * 0.3, V.h * 0.5);
    for (let k = 0; k < (banc.o.rapide ? 20 : 60); k++) { const a = a0 + (k % 2 ? 1 : -1) * 40 * Math.PI / 180; await d.bouger(id, V.w * 0.3 + R0 * Math.cos(a), V.h * 0.5 + R0 * Math.sin(a)); await d.attendre(150); }
    await d.lever(id);
    const I = await s.eval(() => window.__MESURE.arreter('slalom'));
    res.verifie('slalom serré : images en accélération', I.filter(x => x).length, 0, !I.some(x => x)); }
  await d.attendre(300);
  /* 3. 20 sur 20 pour chaque geste du second doigt */
  const ng = banc.o.rapide ? 6 : L.gestes;
  for (const [genre, action] of [['toucher', 'pouvoir'], ['glisse', 'apogee'], ['tenu', 'boost']]) {
    const r = await serieSecondDoigt(s, genre, ng, genre === 'tenu' ? { duree: 0.5 } : {});
    if (!r.journal) { res.absent(`${genre} : ${ng} sur ${ng}`, 'N.journal.dump'); continue; }
    const bon = r.actions[action] || 0, autresA = Object.entries(r.actions).filter(([k]) => k !== action).reduce((a, [, v]) => a + v, 0);
    res.verifie(`${genre} → ${action} : ${ng} sur ${ng}`, bon, ng, bon === ng && autresA === 0, { actions: r.actions });
  }
  /* 4. les balayages depuis les bords */
  await s.eval(() => {
    window.__R33 = { prevenus: 0, touches: 0, origines: [] };
    window.addEventListener('touchstart', e => { window.__R33.touches++; if (e.defaultPrevented) window.__R33.prevenus++; }, { passive: true });
    window.__R33.url = location.href; window.__R33.hist = history.length;
  });
  const nb = banc.o.rapide ? 5 : L.balayages, bp = L.bordPx || 10, bords = { gauche: [bp - 4, 0.5, 1, 0], droite: [-(bp - 4), 0.5, -1, 0], haut: [0.5, bp - 4, 0, 1], bas: [0.5, -(bp - 4), 0, -1] };
  const origines = [];
  for (const [nom, [bx, by, dx, dy]] of Object.entries(bords)) {
    for (let k = 0; k < nb; k++) {
      const f = 0.15 + 0.7 * ((k * 37) % 100) / 100;
      const x = typeof bx === 'number' && Math.abs(bx) < 1 ? V.w * (dx ? 0 : f) : (bx >= 0 ? bx : V.w + bx), y = Math.abs(by) < 1 ? V.h * (dy ? 0 : f) : (by >= 0 ? by : V.h + by);
      const X = dx ? (bx >= 0 ? bx : V.w + bx) : V.w * f, Y = dy ? (by >= 0 ? by : V.h + by) : V.h * f;
      void x; void y;
      const id = await d.poser(X, Y);
      const o = await s.eval(() => { const st = window.__S.input.stick; return st && st.active ? { ox: st.ox, oy: st.oy } : null; });
      if (o) origines.push({ bord: nom, ...o });
      await d.glisser(id, X + dx * 120, Y + dy * 120, 90); await d.lever(id); await d.attendre(60);
    }
  }
  const bilan = await s.eval(() => ({ ...window.__R33, urlApres: location.href, histApres: history.length, zoom: window.visualViewport ? window.visualViewport.scale : 1, selection: String(getSelection && getSelection()) }));
  res.verifie(`balayages depuis les bords (${nb} par bord) : navigations`, (bilan.urlApres !== bilan.url ? 1 : 0) + (bilan.histApres - bilan.hist), 0, bilan.urlApres === bilan.url && bilan.histApres === bilan.hist);
  res.verifie('balayages : zoom', bilan.zoom, 1, bilan.zoom === 1);
  res.verifie('balayages : sélection de texte', bilan.selection.length, 0, bilan.selection.length === 0);
  res.verifie('balayages : touchstart neutralisés (preventDefault, J-28)', bilan.touches ? bilan.prevenus / bilan.touches : null, 1, bilan.touches > 0 && bilan.prevenus === bilan.touches, { touches: bilan.touches });
  const b20 = (R.gestes && R.gestes.bordPt) || 20;
  if (origines.length) {
    const mauvaises = origines.filter(o => (o.bord === 'gauche' && o.ox < b20 - 0.5) || (o.bord === 'droite' && o.ox > V.w - b20 + 0.5) || (o.bord === 'bas' && o.oy > V.h - b20 + 0.5));
    res.verifie(`origines du manche à ${b20} pt au moins des bords gauche, droit et bas`, origines.length - mauvaises.length, origines.length, mauvaises.length === 0, { exemples: mauvaises.slice(0, 4) });
  } else res.absent('origines du manche', 'S.input.stick (origine publiée par 90-boot, hors contrat)');
  res.note('le mode web app (écran d’accueil) n’est pas émulable dans Chromium : seul le mode onglet est mesuré');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
