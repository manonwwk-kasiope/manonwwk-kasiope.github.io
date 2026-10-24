/* G11 — test 2 : LE CYAN N'APPARTIENT QU'AU JOUEUR (av-hue.mjs + masque).
   L'outil d'origine ne prenait que des PNG et ne connaissait rien de l'état du
   jeu : il ne pouvait pas écarter le serpent, qui a le droit d'être cyan. Ici la
   liste des positions écran des segments et de la tête est relevée DANS LA MÊME
   IMAGE que les pixels (voir capture.mjs).
   Seuil : pixels de la famille cyan (teinte 165-200°, S > 0,18, hors v < 0,09 et
   hors blanc) à plus de 40 px de tout segment : < 2 % de l'écran, sur les deux
   captures (60 s, et niveau 3 forcé — le niveau 1 dure 104 s).
   La part relevée AVANT modification avec le MÊME outil est mesurée sur le build
   du dernier commit et inscrite dans le rapport (QUESTION OUVERTE C).
   S.partEff et S.opt.particles sont relevés dans la même image : drawFloor sort
   si la qualité de particules est sous 0,6, et une capture en qualité dégradée
   ne mesure pas la même chose. */
import { save, finish, deadline } from '../lib.mjs';
import { captures } from './capture.mjs';
deadline(600, 'G11-t2-cyan');

const { cur, ref } = await captures('both');
const SEUIL = 2;
const lignes = cur.captures.map((c, i) => ({
  capture: c.label, t: Math.round(c.t), level: c.level, phase: c.phase,
  partEff: c.partEff, particles: c.particles, qualiteNonDegradee: c.partEff >= 0.6,
  zoom: c.zoom, perspDeg: c.perspDeg, rot: c.rot, W: c.W, H: c.H, dpr: c.dpr, segs: c.segs,
  cyanPct: c.cyanPct, cyanLoin40Pct: c.cyanLoin40Pct, pxCyanLoin40: c.pxCyanLoin40,
  reference: ref ? { capture: ref.captures[i].label, level: ref.captures[i].level, cyanPct: ref.captures[i].cyanPct, cyanLoin40Pct: ref.captures[i].cyanLoin40Pct, partEff: ref.captures[i].partEff } : null,
  ok: c.cyanLoin40Pct < SEUIL,
}));
const pass = lignes.every(l => l.ok && l.qualiteNonDegradee);
const r = {
  test: 'G11-t2-cyan', pass,
  seuil: 'pixels de teinte 165-200° S>0,18 (hors v<0,09 et hors blanc) à plus de 40 px de tout segment : < 2 % de l’écran, sur les deux captures',
  questionOuverteC: 'valeur de départ relevée avec le MÊME outil sur le build du dernier commit (' + (ref && ref.commit) + ') : ' + (ref ? ref.captures.map(c => c.label + ' ' + c.cyanLoin40Pct + ' %').join(' ; ') : 'non mesurée'),
  measured: lignes,
};
save('G11-t2-cyan.json', r);
finish(r.test, { pass, measured: lignes, threshold: r.seuil });
