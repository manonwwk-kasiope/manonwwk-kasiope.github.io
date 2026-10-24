import fs from 'node:fs';
import { monde, sources, chargerAvant, sauver, dateParis } from './vm.mjs';
// Fixture géométrique : la trajectoire est imposée via force(), pas un pilote et pas un résultat au doigt.
// Les collisions, la trace, le polygone, E.dans(), les dégâts et le journal sont les vrais modules.
export function casConstruit({ longueur = 8, rayon = 18, ecart = 0, mobile = false, forme = "cercle" } = {}) {
  const N = window.__N, S = window.__S, c = { x: 500, y: 256 }, v = N.R.joueuse.vitesse.v1;
  N.pilote.arreter(); N.intro.skip(); N.game.reset(7); N.game.dbg.scene('calme'); N.ennemis.reset();
  S.reglages.actions = 'doigts';
  N.joueuse.reset({ x: c.x + rayon, y: c.y, ang: forme === "carre" ? -Math.PI / 2 : Math.PI / 2, len: longueur });
  const milieu = forme === 'carre' ? { x: c.x + rayon + Math.PI * rayon / 4, y: c.y - Math.PI * rayon / 4 } : c;
  const e = N.ennemis.spawn('larve', milieu.x, milieu.y, { st: 'derive' });
  N.journal.actif(true);
  const pvAvant = e.pv, steps = Math.ceil(2 * Math.PI * rayon), h = 1 / v;
  let premiere = null, distanceFin = null;
  // La fin de l'arc laisse exactement l'écart demandé (corde) avec le départ.
  const angleFin = 2 * Math.PI - 2 * Math.asin(ecart / (2 * rayon));
  for (let i = 1; i <= steps; i++) {
    const a = i / steps * angleFin;
    let x = c.x + rayon * Math.cos(a), y = c.y + rayon * Math.sin(a), ang = a + Math.PI / 2;
    if (forme === 'carre') {
      const cote = 2 * Math.PI * rayon / 4, d = i / steps * (4 * cote - ecart);
      const section = Math.min(3, Math.floor(d / cote)), q = d - section * cote;
      if (section === 0) { x = c.x + rayon; y = c.y - q; ang = -Math.PI / 2; }
      if (section === 1) { x = c.x + rayon + q; y = c.y - cote; ang = 0; }
      if (section === 2) { x = c.x + rayon + cote; y = c.y - cote + q; ang = Math.PI / 2; }
      if (section === 3) { x = c.x + rayon + cote - q; y = c.y; ang = Math.PI; }
    }
    if (mobile) { e.x = milieu.x + rayon / 4 * Math.cos(a); e.y = milieu.y + rayon / 4 * Math.sin(a); }
    S.input.x = 0; S.input.y = 0; S.input.mag = 0;
    // La tête finit le vrai update exactement sur le point échantillonné.
    N.joueuse.force({ x: x - v * h * Math.cos(ang), y: y - v * h * Math.sin(ang), ang });
    N.joueuse.update(h);
    const J = N.journal.dump(), hit = J.find(j => j.type === 'lasso');
    if (hit && !premiere) premiere = { pas: i, angle: a, d: hit.d };
    distanceFin = Math.hypot(N.joueuse.tete.x - c.x - rayon, N.joueuse.tete.y - c.y);
  }
  const journal = N.journal.dump();
  return { longueur, rayon, ecart, mobile, forme, distanceFin, perimetre: angleFin * rayon, corps: longueur * N.R.longueur.espacement,
    fenetreTraine: v * N.R.f.traine(longueur), pvAvant, pvApres: e.pv, etatEnnemi: e.etat, etatJoueuse: N.joueuse.etat,
    lenFin: N.joueuse.len(), premiere, lassos: journal.filter(j => j.type === 'lasso'), coupes: journal.filter(j => j.type === 'coupe'),
    err: window.__ERR.count, erreurs: window.__ERR.sigs };
}
export function construire(src, opt) {
  const m = monde(src); m.c.opts = opt;
  return JSON.parse(JSON.stringify(m.c.eval('(' + casConstruit.toString() + ')(opts)')));
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (!JSON.parse(fs.readFileSync(new URL('./validation-vm.json',import.meta.url))).conformite) throw Error('VM non validée');
  const label = process.argv[2] || 'avant', src = label === 'avant' ? chargerAvant() : sources(), cas = [];
  for (const longueur of [8, 20, 40]) for (const mobile of [false, true]) for (const ecart of [0, 1, 3, 6, 10]) {
    const rayon = (longueur * 5 + 68 * (1.2 + 0.02 * longueur) * 0.55) / (2 * Math.PI);
    cas.push(construire(src, { longueur, rayon, ecart, mobile, forme: "carre" }));
    if (!ecart) cas.push(construire(src, { longueur, rayon, ecart, mobile }));
  }
  for (const rayon of [8, 60]) cas.push(construire(src, { longueur: 8, rayon }));
  sauver('cas-' + label + '.json', { dateParis: dateParis(), cas });
  console.log(cas.map(c => ({ L: c.longueur, r: c.rayon, gap: c.ecart, mobile: c.mobile, n: c.lassos.length, pv: c.pvApres, len: c.lenFin, err: c.err })));
}
