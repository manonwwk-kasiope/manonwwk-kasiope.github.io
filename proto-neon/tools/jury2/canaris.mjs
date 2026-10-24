/* Défauts plantés (« canaris ») : altérations documentées de COPIES du paquet remis aux jurés, jamais du dossier brut.
   La liste des types est écrite dans protocole.mjs avant toute prise ; le tirage se fait au montage (crypto),
   l'emplacement exact n'est écrit que dans la clé aveugle (cles/<code>.json), jamais dans le paquet.
   Nature « integrite » : preuve incohérente avec une autre (le juré la signale à part, sans l'imputer au jeu).
   Nature « jeu » : défaut visible ou audible dans le rythme ; réservé aux paquets d'étalonnage. */
import { P } from './protocole.mjs';

export const TYPES = P.canaris.types;
export function typesAdmis(role) { return TYPES.filter(t => role === 'verdict' ? t.nature === 'integrite' : true); }
export function tirerTypes(role, rng, n = P.canaris.parPaquet[role === 'verdict' ? 'verdict' : 'etalonnage']) {
  const pool = [...typesAdmis(role)], out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
const remplir = (img, x0, y0, w, h, c) => { for (let y = Math.max(0, y0); y < Math.min(img.H, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(img.W, x0 + w); x++) { const o = (y * img.W + x) * 3; img.rgb[o] = c[0]; img.rgb[o + 1] = c[1]; img.rgb[o + 2] = c[2]; } };
const copie = img => ({ ...img, rgb: Buffer.from(img.rgb) });
/* images : tableau d'objets {W,H,rgb,w,...} ; retourne de NOUVEAUX objets (les originaux restent intacts). */
export function imageGelee(images, k) {
  const out = images.map(copie), n = Math.min(4, out.length - k);
  for (let i = k + 1; i < k + n; i++) out[i] = { ...out[i], rgb: Buffer.from(out[k].rgb) };
  return { images: out, indices: Array.from({ length: n }, (_, i) => k + i) };
}
export function bandeauMasquant(images, k, n = 3) {
  const out = images.map(copie), idx = [];
  for (let i = k; i < Math.min(out.length, k + n); i++) { const im = out[i], o = 0; const c = [im.rgb[o], im.rgb[o + 1], im.rgb[o + 2]]; remplir(im, Math.round(im.W * 0.3), Math.round(im.H * 0.25), Math.round(im.W * 0.4), Math.round(im.H * 0.5), c); idx.push(i); }
  return { images: out, indices: idx };
}
export function flashPleinEcran(images, k, n = 4) {
  const out = images.map(copie), idx = [];
  for (let i = k; i < Math.min(out.length, k + n); i++) { remplir(out[i], 0, 0, out[i].W, out[i].H, (i - k) % 2 === 0 ? [255, 255, 255] : [0, 0, 0]); idx.push(i); }
  return { images: out, indices: idx };
}
/* Un plan de planche dont le JSON annonce plus de cases que le PNG n'en contient. */
export function retirerCases(images, n = 3) {
  const garde = images.slice(0, Math.max(1, images.length - n));
  return { images: garde, annonce: images.length, retirees: images.length - garde.length };
}
/* Temps incohérents dans le JSON d'une planche : une case recule, une autre dépasse la fenêtre. */
export function incoherenceTemps(json) {
  const c = JSON.parse(JSON.stringify(json)), n = c.images.length;
  if (n < 3) return { json: c, indices: [] };
  const a = Math.floor(n / 2), b = n - 1;
  c.images[a] = { ...c.images[a], w: +(c.images[0].w - 5).toFixed(3) };
  c.images[b] = { ...c.images[b], w: +(c.images[b].w + 120).toFixed(3) };
  return { json: c, indices: [a, b] };
}
/* Décale les événements d'un tapis (rythme en retard de ms) et recalcule leurs écarts à la grille du tapis. */
export function decalerTapis(tapis, ms = P.canaris.decalageMs) {
  const t = JSON.parse(JSON.stringify(tapis)), g = t.temps.map(x => x.tVideo);
  for (const e of t.evenements) {
    e.tVideo = +(e.tVideo + ms / 1000).toFixed(4); e.w = +(e.w + ms / 1000).toFixed(4);
    if (g.length) { let m = g[0]; for (const x of g) if (Math.abs(x - e.tVideo) < Math.abs(m - e.tVideo)) m = x; e.ecartSigneMs = +((e.tVideo - m) * 1000).toFixed(2); e.ecartMs = Math.abs(e.ecartSigneMs); e.dansLaTolerance = e.ecartMs <= P.syncMs; }
  }
  const mes = t.evenements.filter(e => e.ecartMs !== null && e.ecartMs !== undefined);
  t.resume = { ...t.resume, mesurables: mes.length, dansLaTolerance: mes.filter(e => e.dansLaTolerance).length, medianeEcartMs: mes.length ? [...mes].sort((a, b) => a.ecartMs - b.ecartMs)[Math.floor(mes.length / 2)].ecartMs : null };
  return t;
}
/* Ne planter une contradiction que dans une mesure réellement qualifiée. La borne
   historique R-13 ne constitue jamais une candidate, même si elle contient des nombres. */
export function mesureQualifiee(m) {
  if (m.R13?.qualifiable === true && Number.isFinite(m.R13.maxParSeconde) && Number.isFinite(m.R13.seuil)) return 'R13';
  const r = m.R14;
  if (m.frames > 0 && Number.isFinite(r?.secouees) && Number.isFinite(r?.part) && r.part >= 0 && r.part <= 1 &&
      Number.isFinite(r.seuil) && r.seuil >= 0 && r.seuil < 1 && typeof r.conforme === 'boolean') return 'R14';
  return null;
}
export function contredireMesure(mesures, champ = mesureQualifiee(mesures)) {
  if (!champ || champ !== mesureQualifiee(mesures)) throw Error('Aucune mesure qualifiée pour le défaut de passe 2');
  const m = JSON.parse(JSON.stringify(mesures));
  if (champ === 'R13') m.R13 = { ...m.R13, maxParSeconde: m.R13.seuil + 3, conforme: true };
  else m.R14 = { ...m.R14, secouees: m.frames, part: 1, conforme: true };
  return m;
}
