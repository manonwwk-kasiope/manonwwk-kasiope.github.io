/* SNAKE 2975 — génère les actifs d'interface : node proto-neon/tools/interface/genere.mjs
   Écrit proto-neon/art/interface/*.png (PNG indexés, palette exacte, index 0 transparent),
   proto-neon/art/interface/interface.json (le catalogue : taille, ancre, images, directions, rôle),
   et la planche agrandie proto-neon/refonte/maquettes/planche-interface.png.
   Déterministe : aucun hasard, aucune date. Relancer le script redonne les mêmes octets. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, I, NOMS, ecrirePNG, texte, bande } from './commun.mjs';
import { ORDRE, icone16, icone8 } from './icones.mjs';
import * as P from './pieces.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..', '..');
const ART = path.join(RACINE, 'art', 'interface');
const MAQ = path.join(RACINE, 'refonte', 'maquettes');
fs.mkdirSync(ART, { recursive: true }); fs.mkdirSync(MAQ, { recursive: true });

/* ---------------------------------------------------------------------------------------------- */
const CAT = [];      // { nom, fichier, w, h, images, directions, ancre, role, encres, extra }
/* ajoute un sprite : imgs = une Img ou une liste (images d'animation × directions, directions d'abord) */
function ajoute(nom, imgs, role, o = {}) {
  const L = Array.isArray(imgs) ? imgs : [imgs], w = L[0].w, h = L[0].h;
  for (const im of L) if (im.w !== w || im.h !== h) throw new Error(nom + ' : images de tailles différentes');
  const fichier = nom.replace(/:/g, '-') + '.png';
  const planche = bande(L);
  ecrirePNG(path.join(ART, fichier), planche);
  const encres = new Set(); for (const v of planche.d) if (v) encres.add(NOMS[v]);
  CAT.push({ nom, fichier, w, h, images: o.images || L.length / (o.directions || 1), directions: o.directions || 1,
    ancre: o.ancre || [Math.floor(w / 2), Math.floor(h / 2)], role, encres: [...encres], ...(o.extra ? { extra: o.extra } : {}), _imgs: L, _groupe: o.groupe || 'divers' });
}

/* ---- 1. icônes des 19 cartes ---- */
const FAMILLE = id => ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ'].includes(id) ? 'arme' : ['traversee', 'ralenti', 'repli'].includes(id) ? 'pouvoir' : 'passif';
for (const id of ORDRE) ajoute('carte:' + id, icone16(id), `icône de la carte ${id} (${FAMILLE(id)}), au centre haut de la carte et dans les bandeaux`, { groupe: 'cartes' });
for (const id of ORDRE) ajoute('carte8:' + id, icone8(id), `petite icône de ${id} : pause (cartes prises) et build de l'écran de fin`, { groupe: 'cartes8' });

/* ---- 2. cadres de cartes ---- */
for (const [fmt, [w, h]] of Object.entries(P.FORMATS_CARTE)) {
  for (const rar of Object.keys(P.RARETES)) {
    if (rar === 'ultime') ajoute(`cadre:${rar}:${fmt}`, P.refletUltime(w, h), `cadre de carte ULTIME ${w} × ${h} (${fmt}) ; 16 images à 16 i/s : le reflet passe une fois par seconde`, { ancre: [0, 0], groupe: 'cadres' });
    else ajoute(`cadre:${rar}:${fmt}`, P.cadreCarte(rar, w, h), `cadre de carte ${rar} ${w} × ${h} (${fmt})`, { ancre: [0, 0], groupe: 'cadres' });
  }
  ajoute(`cadre:choisie:${fmt}`, P.cadreCarte('commune', w, h, { choisie: true }), `cadre de la carte touchée, ${w} × ${h} : deux images de flash (§ 5.6), puis la carte part`, { ancre: [0, 0], groupe: 'cadres' });
}

/* ---- 3. jauges ---- */
ajoute('jauge:cyclope:cadre', P.cadreJauge(124, 7, I.sang, [1 / 3, 2 / 3]), 'cadre de la jauge du CYCLOPE ; intérieur 120 × 3 en (2, 2) ; encoches d\'os aux deux changements de phase', { ancre: [0, 0], groupe: 'jauges' });
ajoute('jauge:cyclope:plein', P.pleinJauge(120, 3, I.rosePale, I.magenta, I.sang), 'remplissage de la jauge du CYCLOPE, rogné à la valeur par le code (de gauche à droite)', { ancre: [0, 0], groupe: 'jauges' });
ajoute('jauge:cyclope:vide', P.videJauge(120, 3, I.sang, 0.25), 'fond de la jauge du CYCLOPE (PV perdus)', { ancre: [0, 0], groupe: 'jauges' });
ajoute('jauge:deblocage:cadre', P.cadreJauge(124, 7, I.acier), 'cadre de la barre PROCHAIN DÉBLOCAGE (écran de fin) ; intérieur 120 × 3 en (2, 2)', { ancre: [0, 0], groupe: 'jauges' });
ajoute('jauge:deblocage:plein', P.pleinJauge(120, 3, I.jaune, I.ambre, I.brasier), 'remplissage ambre de la barre de déblocage, rogné par le code', { ancre: [0, 0], groupe: 'jauges' });
ajoute('jauge:progression:plein', P.pleinJauge(120, 3, I.os, I.acier, I.ardoise), 'remplissage de la barre SECTEUR n % ou CYCLOPE À n % (écran de fin), dans le cadre de déblocage', { ancre: [0, 0], groupe: 'jauges' });
ajoute('jauge:vide', P.videJauge(120, 3, I.ardoise, 0.5), 'fond tramé d\'une barre neutre', { ancre: [0, 0], groupe: 'jauges' });
ajoute('jauge:secteur:cadre', P.cadreSecteur(), 'barre de secteur sous le radar : 6 cases (V1 à V5, la 6e en sang pour le CYCLOPE) ; case k en (2 + 8k, 1)', { ancre: [0, 0], groupe: 'jauges' });
for (const [k, f] of Object.entries(P.CASE_SECTEUR)) ajoute('jauge:secteur:' + k, f(), `case de la barre de secteur : ${k}`, { ancre: [0, 0], groupe: 'jauges' });

/* ---- 4. radar ---- */
ajoute('radar', P.plaqueRadar(), 'plaque du radar 52 × 28, centrée en haut de la zone sûre ; intérieur utile 48 × 24 en (2, 2), monde 1 024 × 512 réduit au 1/21,3 ; ligne médiane en indigo', { ancre: [26, 0], groupe: 'radar' });

/* ---- 5. chevrons de portail et marqueurs ---- */
ajoute('portail', P.chevrons(1), 'chevron de portail (apparition dans 600 ms), 8 directions (0 = droite, sens horaire, k = round(angle / 45°) & 7) ; la pointe regarde le point d\'apparition', { directions: 8, images: 1, groupe: 'chevrons' });
ajoute('portail:elite', P.chevrons(2), 'chevron double d\'une élite ou du RIVAL, 8 directions', { directions: 8, images: 1, groupe: 'chevrons' });
ajoute('portail:colosse', P.chevrons(3), 'chevron triple du CYCLOPE (annoncé 1,4 s avant), 8 directions', { directions: 8, images: 1, groupe: 'chevrons' });
for (const f of ['simple', 'double', 'triple', 'mine', 'pastille', 'traqueur']) for (const t of [7, 5, 3]) {
  const anim = ['mine', 'pastille', 'traqueur'].includes(f);
  ajoute(`marque:${f}:${t}`, anim ? [P.marque(f, t, true), P.marque(f, t, false)] : P.marque(f, t),
    `marqueur hors champ « ${f} » à ${t} px (${t === 7 ? 'proche' : t === 5 ? 'moyen' : 'loin'}), gaine comprise ${t + 2} px` + (anim ? ' ; 2 images : allumé, éteint (2 Hz)' : ''), { groupe: 'marques' });
}
for (const t of Object.keys(P.MINIS)) ajoute('mini:' + t, P.mini(t), `mini-silhouette ${t} (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin`, { groupe: 'minis' });

/* ---- 6. bannières et toasts ---- */
for (const ton of Object.keys(P.TONS)) for (const [h, ech] of [[36, 4], [29, 3]]) {
  const B = P.banniere(ton, h);
  ajoute(`banniere:${ton}:${h}:gauche`, B.gauche, `capuchon gauche de bannière ${ton}, hauteur ${h} (texte à l'échelle ${ech})`, { ancre: [0, 0], groupe: 'bannieres' });
  ajoute(`banniere:${ton}:${h}:milieu`, B.milieu, `bande de bannière ${ton} à répéter tous les 4 px (motif tramé de période 4)`, { ancre: [0, 0], groupe: 'bannieres' });
  ajoute(`banniere:${ton}:${h}:droite`, B.droite, `capuchon droit de bannière ${ton}, hauteur ${h}`, { ancre: [0, 0], groupe: 'bannieres' });
}
for (const ton of Object.keys(P.TONS)) {
  const T = P.toast(ton);
  ajoute(`toast:${ton}:gauche`, T.gauche, `capuchon gauche de toast ${ton} (plaque d'une ligne, hauteur 11, texte en (x + 5, 2))`, { ancre: [0, 0], groupe: 'bannieres' });
  ajoute(`toast:${ton}:milieu`, T.milieu, `colonne de toast ${ton} à répéter`, { ancre: [0, 0], groupe: 'bannieres' });
  ajoute(`toast:${ton}:droite`, T.droite, `capuchon droit de toast ${ton}`, { ancre: [0, 0], groupe: 'bannieres' });
}

/* ---- 7. chiffres de score et notes ---- */
const CH = '0123456789x+-%';
ajoute('chiffres', [...CH].map(c => P.gros(c, 'score')), `gros chiffres de score 7 × 11 (gainés 10 × 14) ; image n = « ${CH} »[n] ; avance conseillée 9 px`, { ancre: [0, 0], images: CH.length, groupe: 'chiffres' });
ajoute('chiffres:danger', [...CH].map(c => P.gros(c, 'danger')), 'les mêmes chiffres en magenta : compte à rebours de CONTINUER ?, dégâts du CYCLOPE', { ancre: [0, 0], images: CH.length, groupe: 'chiffres' });
for (const n of ['S', 'A', 'B', 'C', 'D']) ajoute('note:' + n, P.gros(n, n, 2), `la note ${n} de l'écran de fin (lettre 14 × 22), qui tombe avec une secousse`, { groupe: 'chiffres' });

/* ---- 8. boutons, étoiles, énergie, vies ---- */
for (const b of ['pause', 'son', 'muet', 'reglages', 'records', 'galerie', 'retour', 'lecture']) {
  ajoute('bouton:' + b, [P.bouton(b), P.bouton(b, true)], `bouton ${b} 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé`, { groupe: 'boutons' });
}
for (const s of ['principal', 'secondaire', 'danger']) {
  const B = P.boutonTexte(s);
  ajoute(`boutonTexte:${s}:gauche`, B.gauche, `bouton de texte ${s} (hauteur 22) : capuchon gauche ; texte centré en y = 8`, { ancre: [0, 0], groupe: 'boutons' });
  ajoute(`boutonTexte:${s}:milieu`, B.milieu, `bouton de texte ${s} : colonne à répéter`, { ancre: [0, 0], groupe: 'boutons' });
  ajoute(`boutonTexte:${s}:droite`, B.droite, `bouton de texte ${s} : capuchon droit`, { ancre: [0, 0], groupe: 'boutons' });
}
ajoute('etoile', [P.etoile(true), P.etoile(false)], 'étoile de défi 7 × 7 gainée ; 2 images : réussi (ambre et jaune), à faire (acier)', { groupe: 'divers' });
ajoute('energie', P.energie(), 'le losange d\'énergie (5 × 6 gainé), à poser après « 412 » dans PROCHAIN DÉBLOCAGE', { groupe: 'divers' });
ajoute('vie', [P.vie(true), P.vie(false)], 'pastille de vie 5 × 5 gainée (tête de la joueuse) ; 2 images : vie, vie perdue ; code de masque 4', { groupe: 'divers' });

/* ---- 9. causes, pouce, gestes ---- */
for (const c of Object.keys(P.CAUSES)) ajoute('cause:' + c, P.cause(c), `silhouette de la cause « ${c} » sur l'écran de fin (15 × 15) ; pour un ennemi ou son tir, poser le sprite de l'ennemi`, { groupe: 'causes' });
ajoute('pouce', P.pouce(), 'pouce fantôme de la première partie (13 × 18) ; 2 images : posé, levé ; ancre = bout du pouce', { ancre: [6, 1], groupe: 'divers' });
for (const g of Object.keys(P.GESTES)) ajoute('geste:' + g, P.geste(g), `pictogramme du geste « ${g} » du second doigt (13 × 13), devant « 2ᵉ DOIGT : TOUCHE » ou « GLISSE = APOGÉE »`, { groupe: 'divers' });

/* ---------------------------------------------------------------------------------------------- */
/* VÉRIFICATIONS                                                                                    */
const erreurs = [];
const DANGER = /^(portail|marque:(simple|double|triple|mine|traqueur)|mini:|cause:(mur|convoi|traine|laser|souffle)|banniere:danger|toast:danger|chiffres:danger|jauge:cyclope)/;
const cyanIx = new Set([I.cyan, I.cyanPale]), roseIx = new Set([I.magenta, I.rosePale]);
for (const s of CAT) for (const im of s._imgs) for (const v of im.d) {
  if (v === I.vide) continue;
  if (cyanIx.has(v) && DANGER.test(s.nom)) { erreurs.push(s.nom + ' : cyan dans un signe de danger'); break; }
  if (roseIx.has(v) && /^(carte|cadre|jauge:deblocage|chiffres$|note:|etoile|energie|vie$)/.test(s.nom)) { erreurs.push(s.nom + ' : magenta ou rose pâle hors danger'); break; }
}
/* les 19 icônes : intersection sur union des masques deux à deux < 0,6 (lot 6b) ; cyan compté */
const masques = ORDRE.map(id => { const im = icone16(id); return im.d.map(v => v && v !== I.nuitProfonde ? 1 : 0); });
let pire = [0, '', ''];
for (let a = 0; a < ORDRE.length; a++) for (let b = a + 1; b < ORDRE.length; b++) {
  let n = 0, u = 0; for (let i = 0; i < 256; i++) { n += masques[a][i] & masques[b][i]; u += masques[a][i] | masques[b][i]; }
  const iou = n / u; if (iou > pire[0]) pire = [iou, ORDRE[a], ORDRE[b]];
  if (iou >= 0.6) erreurs.push(`icônes ${ORDRE[a]} et ${ORDRE[b]} : intersection sur union ${iou.toFixed(2)}`);
}
const cyanParIcone = Object.fromEntries(ORDRE.map(id => [id, [...icone16(id).d].filter(v => cyanIx.has(v)).length]));
if (erreurs.length) { console.error(erreurs.join('\n')); process.exitCode = 1; }

/* ---------------------------------------------------------------------------------------------- */
/* LE CATALOGUE                                                                                     */
const json = {
  version: 1,
  genere_par: 'proto-neon/tools/interface/genere.mjs',
  format: {
    png: 'indexé 8 bits ; PLTE = les 16 encres de DIRECTION.md dans l ordre de src/00-pal.js ; tRNS : index 0 transparent. Un octet = un index de palette du jeu, 0 = rien (le vide n est jamais posé : on prend la nuit profonde).',
    planche: 'images côte à côte en x ; pour un sprite à directions, image (d, k) en x = (d * images + k) * w ; direction 0 = droite, sens horaire, y vers le bas',
    ancre: 'pixel posé sur le point visé (centre de l objet, ou coin haut gauche pour les plaques, cadres et jauges)'
  },
  verifications: { iouMaxIcones: { valeur: +pire[0].toFixed(3), paire: [pire[1], pire[2]], seuil: 0.6 }, cyanParIcone },
  sprites: Object.fromEntries(CAT.map(s => [s.nom, { fichier: s.fichier, w: s.w, h: s.h, images: s.images, directions: s.directions, ancre: s.ancre, role: s.role, encres: s.encres, ...(s.extra ? { extra: s.extra } : {}) }]))
};
fs.writeFileSync(path.join(ART, 'interface.json'), JSON.stringify(json, null, 1) + '\n');

/* ---------------------------------------------------------------------------------------------- */
/* LA PLANCHE : tout, à l'échelle 1, sur un fond de nuit, rangé par groupe ; écrite agrandie ×3      */
function planche() {
  const W = 420, groupes = [...new Set(CAT.map(s => s._groupe))];
  const lignes = [];
  for (const g of groupes) {
    const items = CAT.filter(s => s._groupe === g);
    lignes.push({ titre: g, items });
  }
  /* mise en page en deux passes : calcul de la hauteur, puis dessin */
  const pose = (im, dessiner) => {
    let y = 12; const out = [];
    if (dessiner) texte(im, 'SNAKE 2975 — INTERFACE : ' + CAT.length + ' SPRITES, PALETTE FERMÉE, ÉCHELLE 1', 4, 2, { ci: I.os });
    for (const L of lignes) {
      if (dessiner) texte(im, L.titre.toUpperCase(), 4, y + 2, { ci: I.acier });
      y += 12; let x = 4, hl = 0;
      for (const s of L.items) {
        /* un sprite à plusieurs images ou directions : on montre toutes les images, jusqu'à 16 */
        const imgs = s._groupe === 'cadres' ? s._imgs.filter((_, k) => k === 0 || k === 4) : s._imgs.slice(0, 16), ww = Math.min(W - 8, imgs.length * (s.w + 1));
        const parLigne = Math.max(1, Math.floor((W - 8) / (s.w + 1)));
        const rangs = Math.ceil(imgs.length / parLigne), bw = Math.min(imgs.length, parLigne) * (s.w + 1), bh = rangs * (s.h + 1);
        if (x + bw > W - 4) { x = 4; y += hl + 3; hl = 0; }
        if (dessiner) imgs.forEach((im2, k) => im.blit(im2, x + (k % parLigne) * (s.w + 1), y + Math.floor(k / parLigne) * (s.h + 1)));
        x += bw + 4; hl = Math.max(hl, bh); void ww;
      }
      y += hl + 4;
    }
    return y + 4;
  };
  const H = pose(null, false), im = new Img(W, H, I.nuit);
  /* une bande de fond clair à droite pour juger les gaines sur le soleil */
  pose(im, true);
  return im;
}
const pl = planche();
ecrirePNG(path.join(MAQ, 'planche-interface.png'), pl, { transparent: false, k: 3 });

console.log(`${CAT.length} sprites écrits dans art/interface/ ; IoU max des icônes ${pire[0].toFixed(3)} (${pire[1]} / ${pire[2]})`);
console.log('cyan par icône : ' + Object.entries(cyanParIcone).map(([k, v]) => k + ' ' + v).join(', '));

/* ---------------------------------------------------------------------------------------------- */
/* LE LISEZMOI, réécrit à chaque génération pour rester fidèle au catalogue                         */
const TITRES = { cartes: 'Icônes des 19 cartes (16 × 16)', cartes8: 'Petites icônes des cartes (8 × 8)', cadres: 'Cadres de cartes par rareté',
  jauges: 'Jauges', radar: 'Radar', chevrons: 'Chevrons de portail', marques: 'Marqueurs hors champ', minis: 'Mini-silhouettes des ennemis',
  bannieres: 'Bannières et toasts', chiffres: 'Chiffres de score et notes', boutons: 'Boutons', divers: 'Étoiles, énergie, vies, pouce, gestes', causes: 'Causes de mort (écran de fin)' };
const lignes = [];
for (const g of Object.keys(TITRES)) {
  const items = CAT.filter(s => s._groupe === g); if (!items.length) continue;
  lignes.push(`\n### ${TITRES[g]}\n`, '| nom | fichier | taille | ancre | images | rôle |', '|---|---|---|---|---|---|');
  for (const s of items) lignes.push(`| \`${s.nom}\` | \`${s.fichier}\` | ${s.w} × ${s.h} | ${s.ancre[0]}, ${s.ancre[1]} | ${s.directions > 1 ? s.directions + ' dir. × ' : ''}${s.images} | ${s.role} |`);
}
const intro = fs.readFileSync(path.join(ICI, 'lisezmoi-tete.md'), 'utf8')
  .replace('{{N}}', String(CAT.length)).replace('{{IOU}}', pire[0].toFixed(3) + ' (' + pire[1] + ' / ' + pire[2] + ')')
  .replace('{{CYAN}}', Object.entries(cyanParIcone).map(([k, v]) => `${k} ${v}`).join(', '));
fs.writeFileSync(path.join(ART, 'LISEZMOI.md'), intro + '\n## Le catalogue, sprite par sprite\n\n*(Tableau produit par `genere.mjs` à partir de `interface.json`.)*\n' + lignes.join('\n') + '\n');
