/* tools/L6a/sprites.mjs — les critères du lot 6a côté sprites (REFONTE.md § 8.3, LOT 6a) :
     Tailles      V-05 : menaces et butin ≥ 7 × 7, tirs ≥ 3 × 3 (boîte des pixels opaques)
     Couleurs     aucun cyan ni cyan pâle dans un sprite ennemi ; 100 % des index dans la palette
     Silhouettes  masques binaires des types deux à deux, centrés, intersection sur union < 0,6
                  (planche en niveaux de gris : la gaine de nuit profonde se confond avec le fond)
   et le branchement : chaque nom du catalogue figé a sa taille, ses directions et ses images ; ce qui est réel.
   Sorties : tools/L6a/sortie/sprites.json, planche-ennemis.png (couleur), planche-ennemis-gris.png,
   planche-6a.png (les sprites du lot), planche-interface.png. */
import { ouvrir, palette, png, ecrire } from './commun.mjs';

const s = await ouvrir('paysage');
const res = await s.page.evaluate(() => {
  const N = window.__N, cat = N.spr.catalogue(), out = { noms: 0, reels: 0, replis: [], erreursTaille: [], horsPalette: 0, cyanEnnemi: [], tailles: [], sources: {} };
  const MENACES = ['fleche', 'fleche:armee', 'dard', 'larve', 'mine', 'tourelle', 'sentinelle', 'traqueur', 'lame', 'lame:deployee', 'ruche', 'rival', 'planeur', 'fleche:elite', 'ruche:elite', 'colosse:main', 'wagon', 'wagon:tete'];
  const BUTIN = ['butin', 'noyau', 'pastille'];
  const TIRS = ['tirEnnemi', 'tirEnnemi:petit', 'tirEnnemi:gros'];   // V-05 vise les tirs ENNEMIS ; ceux de la joueuse sont fins par règle (§ 2.8 : 1 × 3 à 1 × 5)
  function boite(sp) { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) if (sp.data[y * sp.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x1 - x0 + 1, y1 - y0 + 1]; }
  for (const c of cat) {
    out.noms++; out.sources[c.src] = (out.sources[c.src] || 0) + 1;
    if (c.reel) out.reels++; else out.replis.push(c.nom);
    for (let d = 0; d < c.dirs; d++) for (let f = 0; f < c.images; f++) {
      const sp = N.spr.get(c.nom, d, f);
      if (sp.w !== c.w || sp.h !== c.h) { if (out.erreursTaille.length < 20) out.erreursTaille.push(c.nom + ' ' + sp.w + '×' + sp.h + ' au lieu de ' + c.w + '×' + c.h); }
      for (const v of sp.data) { if (v > 15) out.horsPalette++; }
      const menace = MENACES.indexOf(c.nom) >= 0 || /^(mine$|mine:|tirEnnemi|ruche|rival|colosse|wagon|plaque|couronne|portail|mini|marque|instable)/.test(c.nom);
      if (menace) for (const v of sp.data) if (v === 7 || v === 8) { out.cyanEnnemi.push(c.nom); break; }
    }
  }
  for (const n of MENACES.concat(BUTIN, TIRS)) {
    let mn = [99, 99];
    const c = cat.find(e => e.nom === n) || { dirs: 1, images: 1 };
    for (let d = 0; d < c.dirs; d++) for (let f = 0; f < c.images; f++) { const b = boite(N.spr.get(n, d, f)); mn = [Math.min(mn[0], b[0]), Math.min(mn[1], b[1])]; }
    const seuil = TIRS.indexOf(n) >= 0 ? 3 : 7;
    out.tailles.push({ nom: n, min: mn, seuil, ok: mn[0] >= seuil && mn[1] >= seuil });
  }
  /* silhouettes : les onze types (et les deux élites dessinées), direction 0, image 0, masques sans la gaine */
  const TYPES = ['fleche', 'dard', 'larve', 'mine', 'tourelle', 'lame', 'ruche', 'sentinelle', 'rival', 'planeur', 'traqueur', 'fleche:elite', 'ruche:elite'];
  const M = 25, masques = {};
  for (const t of TYPES) {
    const sp = N.spr.get(t, 0, 0), m = new Uint8Array(M * M), ox = ((M - sp.w) >> 1), oy = ((M - sp.h) >> 1);
    for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (v && v !== 15) m[(y + oy) * M + x + ox] = 1; }
    masques[t] = m;
  }
  const paires = [];
  for (let i = 0; i < TYPES.length; i++) for (let j = i + 1; j < TYPES.length; j++) {
    const a = masques[TYPES[i]], b = masques[TYPES[j]]; let I = 0, U = 0;
    for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) I++; if (a[k] || b[k]) U++; }
    paires.push([TYPES[i], TYPES[j], +(I / U).toFixed(3)]);
  }
  paires.sort((p, q) => q[2] - p[2]);
  out.iouMax = paires[0]; out.iouPaires = paires.slice(0, 8); out.iouAuDela = paires.filter(p => p[2] >= 0.6);
  /* planches */
  function planche(noms, k, gris) {
    const items = noms.map(n => { const c = cat.find(e => e.nom === n) || { dirs: 1, images: 1 }; return { n, c }; });
    let W = 4, H = 4, x = 4;
    const lignes = items.map(it => { const sp = N.spr.get(it.n, 0, 0); const nd = Math.min(it.c.dirs, 16), ni = it.c.images; return { it, w: sp.w, h: sp.h, nd, ni }; });
    for (const l of lignes) { W = Math.max(W, 4 + (l.w + 2) * l.nd * l.ni + 4); H += l.h + 4; }
    const buf = new Uint8Array(W * H).fill(gris ? 0 : 2); let y = 4;
    for (const l of lignes) {
      let xx = 4;
      for (let d = 0; d < l.nd; d++) for (let f = 0; f < l.ni; f++) {
        const sp = N.spr.get(l.it.n, d, f);
        for (let yy = 0; yy < sp.h; yy++) for (let x2 = 0; x2 < sp.w; x2++) { const v = sp.data[yy * sp.w + x2]; if (v) buf[(y + yy) * W + xx + x2] = gris ? (v === 15 ? 0 : 12) : v; }
        xx += sp.w + 2;
      }
      y += l.h + 4;
    }
    return { W, H, d: Array.from(buf) };
  }
  out.planches = {
    ennemis: planche(TYPES.concat(['fleche:armee']), 4, false),
    gris: planche(TYPES, 4, true),
    six: planche(['tete:dos', 'lance', 'rayon', 'fleche:armee', 'noyau', 'pastille', 'vieMini', 'portail', 'mini:fleche', 'mini:dard', 'mini:larve', 'mini:traqueur', 'mini:mine', 'dard', 'larve', 'traqueur'], 4, false),
    ui: planche(['carte:canon', 'carte:arc', 'carte:missiles', 'ui:radar', 'ui:bouton:pause', 'ui:note:S', 'ui:chiffres', 'ui:marque:pastille:7', 'ui:cause:mur', 'ui:etoile'], 3, false)
  };
  out.texte = N.spr.text('V3 · BATTERIE · LA CENTRALE', { ci: 13 }).w;
  return out;
});
const pal = await palette(s.page);
for (const [k, p] of Object.entries(res.planches)) png('planche-' + k, p.W, p.H, Uint8Array.from(p.d), pal, k === 'ui' ? 3 : 4);
delete res.planches;
res.erreurs = await s.err();
ecrire('sprites.json', res);
console.log(JSON.stringify(res, null, 1));
await s.fermer();
const ok = !res.erreursTaille.length && !res.horsPalette && !res.cyanEnnemi.length && res.tailles.every(t => t.ok) && !res.iouAuDela.length && !res.erreurs.count && !res.erreurs.console.length;
console.log(ok ? 'SPRITES : TOUT TENU' : 'SPRITES : ÉCARTS');
process.exit(ok ? 0 : 1);
