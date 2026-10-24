/* Échantillon du dossier, écrit avant toute prise (autotest.md § 3.2, protocole.mjs › echantillon).
   Fonctions pures sur les données d'une séquence (brut.json.gz) : le script les applique à TOUTES les données,
   personne ne choisit « les moments clés ». Trois familles :
   1. instants uniformes (stratifiés, tirés par une graine pré-enregistrée) ;
   2. événements du jeu (drops, breaks, entrées de vague, WARP, CYCLOPE, vol, fin, toutes les morts) ;
   3. pires cas (images les plus lentes, morts au plus court préavis, seconde la plus chargée en flashs). */
import { P } from './protocole.mjs';
import { flashs } from './analyse.mjs';

export function hashTexte(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function prng(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* n instants, un par tranche égale de [marge, duree - marge], jitter uniforme dans la tranche. */
export function instantsUniformes({ duree, n = P.echantillon.uniformes, graine, marge = P.echantillon.margeBord }) {
  const debut = marge, fin = duree - marge;
  if (!(fin > debut) || n < 1) return [];
  const r = prng(graine), pas = (fin - debut) / n;
  return Array.from({ length: n }, (_, i) => +(debut + (i + r()) * pas).toFixed(3));
}
/* Temps de jeu → temps réel : premier cadre dont tempsJeu atteint t (interpolation linéaire). */
export function wDepuisTempsJeu(frames, t) {
  let lo = 0, hi = frames.length - 1;
  if (!frames.length || !(t <= frames[hi].tempsJeu)) return null;
  while (lo < hi) { const m = (lo + hi) >> 1; if (frames[m].tempsJeu >= t) hi = m; else lo = m + 1; }
  const b = frames[lo], a = frames[lo - 1];
  if (!a || b.tempsJeu === a.tempsJeu) return b.w;
  return a.w + (b.w - a.w) * (t - a.tempsJeu) / (b.tempsJeu - a.tempsJeu);
}
/* Événements retenus par la règle écrite dans protocole.mjs. `croisements` = carteAlignee(frames, carte). */
export function evenementsDuJeu(data, croisements = [], regles = P.echantillon.evenements) {
  const F = data.frames || [], E = data.evenements || [], out = [];
  const add = (categorie, w, detail = {}) => { if (Number.isFinite(w)) out.push({ categorie, w: +w.toFixed(3), ...detail }); };
  croisements.filter(c => c.type === 'drop').slice(0, regles.drop).forEach((c, k) => add('drop', c.w, { rang: k + 1, tFichier: c.tFichier, morceau: c.id }));
  croisements.filter(c => c.type === 'break').slice(0, regles.break).forEach((c, k) => add('break', c.w, { rang: k + 1, tFichier: c.tFichier, morceau: c.id }));
  for (const n of regles.vague) { const e = E.find(x => x.type === 'vague' && x.d?.evt === 'entree' && x.d?.n === n); if (e) add('vague', e.w, { n }); }
  const w0 = F.findIndex(f => f.warp && f.warp.phase !== 'repos');
  if (w0 >= 0) {
    if (regles.warp.includes('entree')) add('warp-entree', F[w0].w);
    const w1 = F.findIndex((f, i) => i > w0 && f.warp && f.warp.phase === 'repos');
    if (w1 >= 0 && regles.warp.includes('sortie')) add('warp-sortie', F[w1].w);
  }
  const cy = F.find(f => f.etat === 'boss'); if (cy && regles.cyclope) add('cyclope', cy.w);
  const vol = E.find(x => x.type === 'vol' && x.d?.evt === 'debut'); if (vol && regles.vol) add('vol', vol.w);
  const fin = F.find(f => f.etat === 'fin'); if (fin && regles.fin) add('fin', fin.w);
  if (regles.mort === 'toutes') E.filter(x => x.type === 'mort').forEach((m, k) => add('mort', m.w, { rang: k + 1, cause: m.d?.cause ?? null, visibleDepuis: m.d?.visibleDepuis ?? null, teleDuree: m.d?.teleDuree ?? null }));
  return out.sort((a, b) => a.w - b.w);
}
export function piresCas(data, aire, regles = P.echantillon.piresCas) {
  const F = data.frames || [], E = data.evenements || [], out = [];
  const lentes = F.filter(f => Number.isFinite(f.coutMs)).sort((a, b) => b.coutMs - a.coutMs), pris = [];
  for (const f of lentes) { if (pris.length >= regles.imagesLentes) break; if (pris.every(x => Math.abs(x.w - f.w) >= 1)) pris.push(f); }
  pris.forEach((f, k) => out.push({ categorie: 'pire-image-lente', rang: k + 1, w: +f.w.toFixed(3), coutMs: f.coutMs }));
  E.filter(x => x.type === 'mort').sort((a, b) => (a.d?.visibleDepuis ?? Infinity) - (b.d?.visibleDepuis ?? Infinity) || (a.d?.teleDuree ?? Infinity) - (b.d?.teleDuree ?? Infinity))
    .slice(0, regles.mortsCourtPreavis).forEach((m, k) => out.push({ categorie: 'pire-mort-court-preavis', rang: k + 1, w: +m.w.toFixed(3), cause: m.d?.cause ?? null, visibleDepuis: m.d?.visibleDepuis ?? null, teleDuree: m.d?.teleDuree ?? null }));
  if (regles.secondeFlashs && F.length && Number.isFinite(aire)) { const f = flashs(F, aire); if (f.a !== null && f.maxParSeconde > 0) out.push({ categorie: 'pire-seconde-flashs', rang: 1, w: +(f.a - 0.5).toFixed(3), flashsParSeconde: f.maxParSeconde, fenetre: [+(f.a - 1).toFixed(3), +f.a.toFixed(3)] }); }
  return out;
}
/* Images du tampon autour de w : une par pas, la plus proche dans la tolérance ; jamais plus de max. */
export function imagesAutour(images, w, { avant, apres, pas = P.echantillon.pasPlanche, tolerance = null, max = P.echantillon.maxImagesPlanche }) {
  const tol = tolerance ?? pas * 0.6, pasEff = Math.max(pas, (avant + apres) / Math.max(1, max - 1)), choisies = [], manquantes = [];
  for (let t = w - avant; t <= w + apres + 1e-9; t += pasEff) {
    let m = null; for (const x of images) if (!m || Math.abs(x.w - t) < Math.abs(m.w - t)) m = x;
    if (m && Math.abs(m.w - t) <= tol) { if (!choisies.length || choisies.at(-1).fichier !== m.fichier) choisies.push(m); } else manquantes.push(+t.toFixed(3));
  }
  return { images: choisies, manquantes, pas: pasEff };
}
/* Plan complet d'une séquence : tout ce qui sera mis en planche, avec la règle qui l'a désigné. */
export function planEchantillon(data, { cle, croisements = [], aire, duree }) {
  const E = P.echantillon, graine = (E.graine ^ hashTexte(cle)) >>> 0, plan = [];
  instantsUniformes({ duree: duree ?? data.duree, graine }).forEach((w, k) => plan.push({ famille: 'uniforme', categorie: 'uniforme', rang: k + 1, w, ...E.fenetre }));
  for (const e of evenementsDuJeu(data, croisements)) {
    const mort = e.categorie === 'mort';
    plan.push({ famille: 'evenement', ...e, avant: mort ? E.mortAvant : E.fenetre.avant, apres: mort ? 0.5 : E.fenetre.apres });
  }
  for (const c of piresCas(data, aire)) plan.push({ famille: 'pire-cas', ...c, ...E.fenetre });
  return { regle: { graine, cle, echantillon: E }, plan };
}
