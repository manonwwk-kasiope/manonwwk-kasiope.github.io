/* Tapis rythmique : ce qu'un juré qui n'entend rien peut lire du rythme (autotest.md § 3.2.5).
   Quatre voies sur une fenêtre de la vidéo : (1) grille des temps du moteur audio, mesure en clair ;
   (2) événements du jeu (apparitions, tirs ennemis, entrées de vague), verts à ± syncMs d'un temps, rouges au-delà ;
   (3) énergie visuelle (part de pixels modifiés par image) ; (4) repères de la carte r1 (drops, breaks).
   Limite écrite dans le JSON : la grille est celle du moteur, pas les attaques du signal rendu. */
import { P } from './protocole.mjs';
import { png } from './images.mjs';

export function instantsDeTemps(frames, debut, fin) {
  const out = []; let prev = null;
  for (const f of frames) {
    if (f.w < debut - 1 || f.w > fin + 1) { prev = null; continue; }
    const b = f.beat;
    if (!b || !f.audioRunning || !(f.bpm > 0)) { prev = null; continue; }
    if (prev && (b.bar !== prev.bar || b.beat !== prev.beat)) out.push({ w: +(f.w - b.phase * 60 / f.bpm).toFixed(4), mesure: b.bar, temps: b.beat, bpm: f.bpm });
    prev = { bar: b.bar, beat: b.beat };
  }
  return out.filter(x => x.w >= debut && x.w <= fin);
}
export const ecartSigne = e => {
  const b = e.beat;
  if (!b || !Number.isFinite(b.phase) || !(e.bpm > 0)) return null;
  return +((b.phase < 0.5 ? b.phase : b.phase - 1) * 60000 / e.bpm).toFixed(2);
};
const TYPES = ['apparition', 'tir-ennemi', 'vague'];
export function tapisRythmique({ frames, evenements, croisements = [], debut, fin, moment = null }) {
  const evts = evenements.filter(e => TYPES.includes(e.type) && (e.type !== 'vague' || e.d?.evt === 'entree') && e.w >= debut && e.w <= fin)
    .map(e => { const s = ecartSigne(e); return { w: +e.w.toFixed(4), tVideo: +(e.w - debut).toFixed(4), type: e.type, ecartSigneMs: s, ecartMs: s === null ? null : Math.abs(s), dansLaTolerance: s === null ? null : Math.abs(s) <= P.syncMs }; });
  const mesurables = evts.filter(e => e.ecartMs !== null);
  return {
    version: 1, moment, fenetre: { debut: +debut.toFixed(3), fin: +fin.toFixed(3), unite: 's_reel (tVideo = s_video depuis le début de la fenêtre)' },
    temps: instantsDeTemps(frames, debut, fin).map(x => ({ ...x, tVideo: +(x.w - debut).toFixed(4) })),
    evenements: evts,
    resume: { evenements: evts.length, mesurables: mesurables.length, dansLaTolerance: mesurables.filter(e => e.dansLaTolerance).length, toleranceMs: P.syncMs,
      medianeEcartMs: mesurables.length ? [...mesurables].sort((a, b) => a.ecartMs - b.ecartMs)[Math.floor(mesurables.length / 2)].ecartMs : null },
    energie: frames.filter(f => f.w >= debut && f.w <= fin && Number.isFinite(f.changes)).map(f => [+(f.w - debut).toFixed(4), +f.changes.toFixed(5)]),
    reperes: croisements.filter(c => c.w >= debut && c.w <= fin).map(c => ({ type: c.type, tVideo: +(c.w - debut).toFixed(4), tFichier: c.tFichier, morceau: c.id, de: c.repere?.de ?? null, a: c.repere?.a ?? null })),
    legende: { voie1: 'grille des temps du moteur audio (trait clair : début de mesure)', voie2: 'événements : haut apparition, bas tir ennemi, pleine hauteur entrée de vague ; vert ≤ 40 ms d’un temps, rouge au-delà, gris : écart inconnu', voie3: 'énergie visuelle : part de pixels modifiés par image', voie4: 'carte r1 : trait épais drop, bande break' },
    limites: ['La grille est celle du moteur audio (curseur de lecture, latence compensée), pas les attaques du signal rendu : aucune écoute, aucune preuve de timbre ni d’agrément.', 'Voie « onsets du signal » absente de ce tapis.']
  };
}
/* Rendu PNG exact du JSON (un seul chemin : modifier le JSON modifie l'image). */
export function rendreTapis(t, { largeur = 1200, voie = 48 } = {}) {
  const W = largeur, H = voie * 4 + 3, buf = Buffer.alloc(W * H * 3), d = Math.max(1e-6, t.fenetre.fin - t.fenetre.debut);
  const px = (x, y, c) => { if (x < 0 || x >= W || y < 0 || y >= H) return; const o = (y * W + x) * 3; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; };
  const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(x, y, c); };
  const X = s => Math.round(s / d * (W - 1));
  rect(0, 0, W, H, [10, 10, 24]);
  for (let k = 1; k < 4; k++) rect(0, k * (voie + 1) - 1, W, 1, [70, 70, 100]);
  const y0 = k => k * (voie + 1);
  for (const x of t.temps) rect(X(x.tVideo), y0(0) + (x.temps === 0 ? 0 : voie / 3), x.temps === 0 ? 3 : 1, x.temps === 0 ? voie : voie * 2 / 3, x.temps === 0 ? [210, 210, 255] : [110, 110, 170]);
  for (const x of t.temps) rect(X(x.tVideo), y0(1), 1, voie, [30, 30, 55]);
  for (const e of t.evenements) {
    const c = e.dansLaTolerance === null ? [140, 140, 140] : e.dansLaTolerance ? [0, 220, 120] : [255, 60, 60];
    const hh = e.type === 'vague' ? voie : voie / 2 - 2, yy = y0(1) + (e.type === 'tir-ennemi' ? voie / 2 + 1 : 1);
    rect(X(e.tVideo) - 1, yy, 3, hh, c);
  }
  const max = [...t.energie.map(p => p[1])].sort((a, b) => a - b)[Math.floor(t.energie.length * 0.98)] || 1;
  for (const [s, v] of t.energie) { const h = Math.max(1, Math.round(Math.min(1, v / max) * (voie - 2))); rect(X(s), y0(2) + voie - h, 1, h, [0, 190, 240]); }
  const brk = t.reperes.filter(r => r.type === 'break');
  for (const r of brk) rect(X(r.tVideo), y0(3) + voie / 2, Math.max(2, W - 1 - X(r.tVideo)), voie / 2 - 2, [0, 120, 120]);
  for (const r of t.reperes.filter(r => r.type === 'drop')) rect(X(r.tVideo) - 2, y0(3), 5, voie, [255, 0, 200]);
  return { fichier: png(W, H, buf), W, H };
}
