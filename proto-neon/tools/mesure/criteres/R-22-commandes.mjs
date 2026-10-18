/* R-22 — Commandes : J-01 à J-06 tenues (recherche/jouabilite-mobile.md), J-07 au sens du § 0.3 (voir R-23) ;
   une image de latence ; accélération droit devant et coupure en virage ; gestes du second doigt fiables
   (20 touchers → 20 pouvoirs, 20 glissés → 20 APOGÉE, 20 appuis de 0,5 s → 20 accélérations de 0,32 s ± 1
   image). Doigts simulés par CDP, iPhone 13 paysage, temps réel, partie invulnérable. */
import { executer, principal, seuils, exiger, stats } from '../commun.mjs';
import { Doigts, preparerJeu, serieSecondDoigt, vue } from '../gestes.mjs';

export const meta = { id: 'R-22', titre: 'Commandes', seuil: 'J-01 à J-06 ; 1 image de latence ; accélération droit devant ; gestes 20/20', bloquant: true, exclusif: true };
const deg = r => r * 180 / Math.PI;
const ecartAng = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
const lireCap = s => s.eval(() => { const p = window.__S.player; return p ? { ang: p.ang, vise: p.angVise !== undefined ? p.angVise : p.ang, boost: !!p.boost } : null; });

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', {});
  const { R } = await seuils(s, 'R22');
  if (!await exiger(s, res, 'joueuse et entrées', ['S.player', 'S.input', 'N.gfx.present'])) return;
  const p = await preparerJeu(s);
  if (!p.ok) return res.nonMesurable('partie', p.raison);
  const V = vue(s), d = await new Doigts(s).init();
  /* J-01 : le manche naît sous le pouce, dans les quatre quarts : glisser vers le haut → cap vers le haut */
  let j01 = 0;
  for (const [qx, qy] of [[0.25, 0.3], [0.75, 0.3], [0.25, 0.75], [0.75, 0.75]]) {
    const id = await d.poser(V.w * qx, V.h * qy); await d.glisser(id, V.w * qx, V.h * qy - 40, 80); await d.attendre(450);
    const c = await lireCap(s); if (c && ecartAng(c.vise, -Math.PI / 2) < 15 * Math.PI / 180) j01++;
    await d.lever(id); await d.attendre(300);
  }
  res.verifie('J-01 : manche flottant, cap vers le haut depuis les quatre quarts', j01, '4 sur 4', j01 === 4);
  /* J-02 : cap gardé au relâcher */
  { const id = await d.poser(V.w * 0.3, V.h * 0.5); await d.glisser(id, V.w * 0.3 + 40, V.h * 0.5, 80); await d.attendre(600); await d.lever(id); await d.attendre(100);
    const a = await lireCap(s); await d.attendre(2000); const b = await lireCap(s);
    const der = a && b ? deg(ecartAng(a.ang, b.ang)) : null;
    res.verifie('J-02 : dérive du cap 2 s après le relâcher (°)', der, '≤ 2', der !== null && der <= 2); }
  /* J-03 : pouce immobile 3 s → dérive du cap visé < 2° */
  { const id = await d.poser(V.w * 0.3, V.h * 0.5); await d.glisser(id, V.w * 0.3, V.h * 0.5 - 30, 60); await d.attendre(400);
    const a = await lireCap(s); await d.attendre(3000); const b = await lireCap(s); await d.lever(id);
    const der = a && b ? deg(ecartAng(a.vise, b.vise)) : null;
    res.verifie('J-03 : pouce immobile 3 s, dérive du cap visé (°)', der, '< 2', der !== null && der < 2); }
  /* J-05 : une image de latence entre l'événement tactile et le changement de cap visé */
  { const lat = [];
    const id = await d.poser(V.w * 0.3, V.h * 0.5); await d.glisser(id, V.w * 0.3 + 40, V.h * 0.5, 60); await d.attendre(500);
    for (let k = 0; k < 8; k++) {
      const vers = k % 2 ? [40, 0] : [0, -40];
      await s.eval(() => window.__MESURE.parImage('lat', 'var p = S.player; return { f: window.__FRAME, v: p ? (p.angVise !== undefined ? p.angVise : p.ang) : 0 };'));
      await d.attendre(80);
      /* l'image en cours quand l'événement arrive dans la page (et non quand CDP l'envoie) */
      await s.eval(() => { window.__R22f = -1; if (!window.__R22ecoute) { window.__R22ecoute = true; window.addEventListener('touchmove', () => { if (window.__R22f < 0) window.__R22f = window.__FRAME | 0; }, { capture: true, passive: true }); } });
      await d.bouger(id, V.w * 0.3 + vers[0], V.h * 0.5 + vers[1]);
      await d.attendre(250);
      const f0 = await s.eval(() => window.__R22f);
      const I = await s.eval(() => window.__MESURE.arreter('lat'));
      const av = I.filter(x => x.f <= f0), ref = av.length ? av[av.length - 1].v : I[0].v;
      const ch = I.find(x => x.f > f0 && ecartAng(x.v, ref) > 0.05);
      lat.push(ch ? ch.f - f0 : null);
    }
    await d.lever(id);
    const ok = lat.filter(x => x !== null);
    res.verifie('J-05 : latence toucher → cap visé (images, pire cas)', ok.length ? Math.max(...ok) : null, '≤ ' + ((R.criteres && R.criteres.R22 && R.criteres.R22.latenceImages) || 1), ok.length === lat.length && Math.max(...ok) <= 1, { essais: lat }); }
  /* J-06 : 90° en 350 ms au plus */
  { const t90 = [];
    for (let k = 0; k < (banc.o.rapide ? 4 : 10); k++) {
      const id = await d.poser(V.w * 0.3, V.h * 0.5); await d.glisser(id, V.w * 0.3 + 40, V.h * 0.5, 60); await d.attendre(900);
      const a0 = (await lireCap(s)).ang, cible = a0 + (k % 2 ? 1 : -1) * Math.PI / 2;
      await s.eval(() => window.__MESURE.parImage('v90', 'return { a: S.player ? S.player.ang : 0, r: performance.now() };'));
      const r0 = await s.eval(() => performance.now());
      await d.bouger(id, V.w * 0.3 + 40 * Math.cos(cible), V.h * 0.5 + 40 * Math.sin(cible));
      await d.attendre(700);
      const I = await s.eval(() => window.__MESURE.arreter('v90'));
      const atteint = I.find(x => x.r > r0 && ecartAng(x.a, cible) < 4 * Math.PI / 180);
      t90.push(atteint ? (atteint.r - r0) / 1000 : null);
      await d.lever(id); await d.attendre(300);
    }
    const ok = t90.filter(x => x !== null);
    res.verifie('J-06 : virage de 90° (s, pire cas)', ok.length ? Math.max(...ok) : null, '≤ 0,35', ok.length === t90.length && Math.max(...ok) <= 0.35, { essais: t90 }); }
  /* accélération droit devant (course > 0,85, cap à moins de 15°) et coupure en virage */
  { const c = await lireCap(s), R0 = await s.eval(() => (window.__S.input.stick && window.__S.input.stick.r) || 44);
    const id = await d.poser(V.w * 0.3, V.h * 0.5); await d.glisser(id, V.w * 0.3 + 0.97 * R0 * Math.cos(c.ang), V.h * 0.5 + 0.97 * R0 * Math.sin(c.ang), 60); await d.attendre(250);
    const b1 = (await lireCap(s)).boost;
    const a2 = c.ang + 50 * Math.PI / 180; await d.bouger(id, V.w * 0.3 + 0.97 * R0 * Math.cos(a2), V.h * 0.5 + 0.97 * R0 * Math.sin(a2)); await d.attendre(60);
    const b2 = (await lireCap(s)).boost; await d.lever(id);
    res.verifie('accélération par la poussée droit devant (S.player.boost)', b1, true, b1 === true);
    res.verifie('coupure de l’accélération en virage de 50°', b2, false, b2 === false); }
  await d.toutLever(); await d.attendre(400);
  /* les gestes du second doigt (critères du lot 1) */
  const n = banc.o.rapide ? 6 : 20;
  const t = await serieSecondDoigt(s, 'toucher', n);
  if (!t.journal) res.absent('gestes du second doigt', 'N.journal.dump');
  else {
    res.verifie(`${n} touchers → pouvoirs`, (t.actions.pouvoir || 0), n, (t.actions.pouvoir || 0) === n && !t.actions.apogee && !t.actions.boost, { actions: t.actions, entrees: t.entrees, source: t.source });
    const g = await serieSecondDoigt(s, 'glisse', n);
    res.verifie(`${n} glissés → APOGÉE`, (g.actions.apogee || 0), n, (g.actions.apogee || 0) === n && !g.actions.pouvoir, { actions: g.actions, entrees: g.entrees, source: g.source });
    const h = await serieSecondDoigt(s, 'tenu', n, { duree: 0.5 });
    /* chaque accélération doit durer l'appui moins le délai de TENU (0,5 − 0,18 = 0,32 s), à une image près ;
       l'appui est relu tel que la page l'a reçu, pour ne pas compter le retard de CDP */
    const img = 1 / (h.ips || 60), delai = (R.gestes && R.gestes.tenu && R.gestes.tenu.duree) || 0.18;
    const bonnes = h.boosts.filter((x, i) => h.tenues[i] !== undefined && Math.abs(x - (h.tenues[i] - delai)) <= img + 1e-3).length;
    res.verifie(`${n} appuis de 0,5 s → accélérations de 0,32 s ± 1 image`, bonnes, n, bonnes === n && h.boosts.length === n, { durees: h.boosts.map(x => +x.toFixed(3)), appuis: h.tenues.map(x => +x.toFixed(3)), actions: h.actions });
  }
  res.note('J-04 (origine qui suit, doigt propriétaire) est couvert par R-33 (recentrages) ; J-07 au sens du § 0.3 par R-23.');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
