/* SNAKE 2975 — maquettes composées à la taille du tampon de jeu (iPhone 13 : paysage 422 × 195, portrait
   195 × 422) : l'écran de jeu avec son HUD, l'écran de choix des cartes, l'écran de fin qui dit qui a tué,
   l'écran-titre. Usage : node proto-neon/tools/interface/maquettes.mjs   (après genere.mjs)

   Elles assemblent les vrais morceaux : le décor du lot 2 (tools/decor/maquette.mjs, art/decor/), les
   sprites du jeu (src/40-sprites.js, chargé en lecture seule dans une machine virtuelle de node), les
   panneaux de art/, et les actifs de art/interface/. Si le décor ou les sprites manquent, un repli dessiné
   ici prend la place : la maquette reste lisible, juste moins fidèle.

   Écrit refonte/maquettes/<ecran>-<orientation>.png (échelle 1, ce que le tampon contiendrait) et
   <ecran>-<orientation>-x3.png (agrandi au voisin le plus proche, pour regarder), et affiche pour chacune
   la part de l'écran couverte par le HUD, la part de cyan hors joueuse et le respect de la palette. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Img, I, L, ecrirePNG, lirePNG, texte, mesure, dither, carte, contour } from './commun.mjs';
import { icone16, icone8 } from './icones.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..', '..');
const ART = path.join(RACINE, 'art'), AI = path.join(ART, 'interface'), MAQ = path.join(RACINE, 'refonte', 'maquettes');
const CAT = JSON.parse(fs.readFileSync(path.join(AI, 'interface.json'), 'utf8')).sprites;
const { vide, nuit, ardoise, violet, indigo, magenta, rosePale, cyan, cyanPale, ambre, jaune, brasier, os, acier, sang, nuitProfonde: NP } = I;

/* ---- actifs d'interface : get('carte:canon', image) ---- */
const cacheA = {};
function A(nom, k = 0) {
  const s = CAT[nom]; if (!s) throw new Error('actif absent : ' + nom);
  const pl = cacheA[nom] || (cacheA[nom] = lirePNG(path.join(AI, s.fichier)));
  return pl.sous(k * s.w, 0, s.w, s.h);
}
/* ---- sprites du jeu ---- */
let SPR = null;
try {
  const ctx = { console: { log() {}, warn() {}, error() {} } }; ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['00-pal.js', '02-regles.js', '03-socle.js', '40-sprites.js']) vm.runInContext(fs.readFileSync(path.join(RACINE, 'src', f), 'utf8'), ctx, { filename: f });
  if (ctx.__N && ctx.__N.spr && ctx.__N.spr.make) SPR = ctx.__N.spr;
} catch (e) { console.warn('sprites du jeu indisponibles, repli : ' + e.message); }
function S(nom, graine = 0) {
  if (SPR) { const s = SPR.make(nom, graine); const im = new Img(s.w, s.h); im.d.set(s.data); im.cx = s.cx; im.cy = s.cy; return im; }
  const im = new Img(9, 9); im.disc(4.5, 4.5, 4, /^(tete|corps|queue|tir|vie)/.test(nom) ? cyan : /butin/.test(nom) ? ambre : magenta); im.cx = 4; im.cy = 4; return im;
}
const poseC = (im, spr, x, y) => im.blit(spr, Math.round(x - spr.cx), Math.round(y - spr.cy));
/* ---- décor ---- */
let composer = null;
try { composer = (await import('../decor/maquette.mjs')).composer; } catch (e) { console.warn('décor indisponible, repli : ' + e.message); }
function decor(q, etat, W, H, cx, cy, t = 1.3) {
  if (composer) { const r = composer({ q, etat, W, H, cx, cy, t }); for (let i = 0; i < r.img.d.length; i++) if (r.img.d[i] > 15) r.img.d[i] = vide; return r.img; }
  const im = new Img(W, H, vide), yh = Math.floor(H * 0.6);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (y < yh) im.put(x, y, dither(x, y, y / yh) ? violet : nuit); else im.put(x, y, (x % 16 === 0 || (y - yh) % 8 === 0) ? brasier : vide); }
  im.disc(W / 2, yh - 20, 30, jaune); return im;
}
/* ---- panneaux de art/ (le vide devient nuit profonde, comme 05-art.js) ---- */
function panneau(nom) { const im = lirePNG(path.join(ART, nom + '.png'), 255); for (let i = 0; i < im.d.length; i++) im.d[i] = im.d[i] === 255 ? 0 : im.d[i] === 0 ? NP : im.d[i]; return im; }

/* ---- tables d'assombrissement : « un cran » et « deux crans » ---- */
const CRAN1 = []; const CRAN2 = [];
{ const un = { [vide]: vide, [nuit]: vide, [ardoise]: nuit, [violet]: indigo, [indigo]: nuit, [magenta]: sang, [rosePale]: magenta, [cyan]: indigo, [cyanPale]: violet,
  [ambre]: brasier, [jaune]: ambre, [brasier]: sang, [os]: acier, [acier]: ardoise, [sang]: nuit, [NP]: vide };
  for (let c = 0; c < 16; c++) { CRAN1[c] = un[c]; CRAN2[c] = un[un[c]]; } }

/* ---- comptes : HUD (pixels posés par l'interface), cyan hors joueuse ---- */
class Toile extends Img {
  constructor(w, h, fond) { super(w, h, fond); this.hud = new Uint8Array(w * h); this.joueuse = new Uint8Array(w * h); this.mode = 0; }
  put(x, y, c) { if (!this.in(x, y)) return; const i = y * this.w + x; this.d[i] = c; this.hud[i] = this.mode === 1 ? 1 : this.mode === 3 ? 2 : 0; this.joueuse[i] = this.mode === 2 ? 1 : 0; }
}
/* mode 3 : interface passagère (toasts, bannières, gains flottants, chevrons), comptée à part du HUD permanent */
const passeOn = (im, f) => { const m = im.mode; im.mode = 3; f(); im.mode = m; };
const hudOn = (im, f) => { const m = im.mode; im.mode = 1; f(); im.mode = m; };
const joueuseOn = (im, f) => { const m = im.mode; im.mode = 2; f(); im.mode = m; };

/* ---- briques d'interface ---- */
/* plaque de nuit profonde à coins coupés, avec un liseré facultatif */
function plaque(im, x, y, w, h, lis = 0, fond = NP) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const xx = Math.min(i, w - 1 - i), yy = Math.min(j, h - 1 - j); if (xx + yy < 1) continue;
    im.put(x + i, y + j, lis && (xx === 0 || yy === 0 || xx + yy === 1) ? lis : fond);
  }
}
/* plaque tramée (voile) : on voit le décor à travers, une case sur deux */
function voile(im, x, y, w, h, t = 0.5, c = NP) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (dither(i, j, t)) im.put(i, j, c); }
function bandeau9(im, nomG, nomM, nomD, x, y, w) { const g = A(nomG), m = A(nomM), d = A(nomD); for (let i = g.w; i < w - d.w; i += m.w) im.blit(m.w > w - d.w - i ? m.sous(0, 0, w - d.w - i, m.h) : m, x + i, y); im.blit(g, x, y); im.blit(d, x + w - d.w, y); }
function boutonTexte(im, style, x, y, w, txt, ci) { bandeau9(im, `boutonTexte:${style}:gauche`, `boutonTexte:${style}:milieu`, `boutonTexte:${style}:droite`, x, y, w); texte(im, txt, x + Math.floor(w / 2), y + 8, { ci, align: 'c' }); }
function grosNombre(im, s, x, y, nom = 'chiffres', avance = 9) { const CH = '0123456789x+-%'; let cx = x; for (const ch of s) { if (ch === ' ') { cx += 4; continue; } const k = CH.indexOf(ch); if (k >= 0) im.blit(A(nom, k), cx, y); cx += avance; } return cx - x; }
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* le HUD de jeu. o = { W, H, safe:{x0,y0,x1,y1}, portrait, score, mult, chaine (0..1), objectif, vies, label, vague (1..6), cyclope } */
function hud(im, o) {
  const { x0, y0, x1 } = o.safe;
  hudOn(im, () => {
    /* --- score, multiplicateur, vies --- */
    const sc = String(o.score).padStart(7, '0');
    if (!o.portrait) {
      plaque(im, x0, y0 + 1, 103, 23);
      texte(im, sc, x0 + 3, y0 + 3, { ci: jaune });
      texte(im, '×' + o.mult, x0 + 48, y0 + 3, { ci: ambre });
      texte(im, o.objectif, x0 + 63, y0 + 3, { ci: acier });
      /* barre de chaîne d'un pixel sous le multiplicateur et l'objectif */
      const bw = 52, plein = Math.round(bw * o.chaine);
      for (let i = 0; i < bw; i++) im.put(x0 + 48 + i, y0 + 11, i < plein ? jaune : ardoise);
      for (let k = 0; k < 3; k++) im.blit(A('vie', k < o.vies ? 0 : 1), x0 + 2 + k * 8, y0 + 14);
      texte(im, 'VIE À 80 000', x0 + 28, y0 + 15, { ci: acier });
    } else {
      plaque(im, x0, y0 + 1, 64, 40);
      texte(im, sc, x0 + 3, y0 + 3, { ci: jaune });
      texte(im, '×' + o.mult, x0 + 3, y0 + 12, { ci: ambre });
      const bw = 41, plein = Math.round(bw * o.chaine);
      for (let i = 0; i < bw; i++) { im.put(x0 + 19 + i, y0 + 15, i < plein ? jaune : ardoise); }
      texte(im, o.objectif, x0 + 3, y0 + 21, { ci: acier });
      for (let k = 0; k < 3; k++) im.blit(A('vie', k < o.vies ? 0 : 1), x0 + 2 + k * 8, y0 + 30);
      texte(im, '80 000', x0 + 27, y0 + 31, { ci: acier });
    }
    /* --- radar, barre de secteur, étiquette --- */
    const rx = Math.floor((o.W - 52) / 2), ry = y0 + 1;
    im.blit(A('radar'), rx, ry);
    radar(im, rx + 2, ry + 2, o);
    const sx = Math.floor((o.W - 50) / 2), sy = ry + 29;
    im.blit(A('jauge:secteur:cadre'), sx, sy);
    for (let k = 0; k < 6; k++) { const etat = k === 5 ? (o.vague === 6 ? 'colosse' : 'avenir') : k + 1 < o.vague ? 'faite' : k + 1 === o.vague ? 'encours' : 'avenir'; im.blit(A('jauge:secteur:' + etat), sx + 2 + k * 8, sy + 1); }
    if (o.cyclope !== undefined) {
      const jx = Math.floor((o.W - 124) / 2), jy = o.portrait ? y0 + 44 : sy + 7;
      plaque(im, jx - 2, jy - 1, 128, 19);
      texte(im, 'LE CYCLOPE · PHASE 2', o.W / 2, jy + 1, { ci: magenta, align: 'c' });
      im.blit(A('jauge:cyclope:cadre'), jx, jy + 10);
      im.blit(A('jauge:cyclope:vide'), jx + 2, jy + 12);
      im.blit(A('jauge:cyclope:plein').sous(0, 0, Math.round(120 * o.cyclope), 3), jx + 2, jy + 12);
    } else {
      const lw = mesure(o.label) + 6;
      plaque(im, Math.floor((o.W - lw) / 2), sy + 6, lw, 11);
      texte(im, o.label, Math.floor(o.W / 2), sy + 8, { ci: acier, align: 'c' });
    }
    /* --- boutons --- */
    im.blit(A('bouton:pause'), x1 - 22, y0 + 1);
    im.blit(A('bouton:son'), x1 - 46, y0 + 1);
  });
}
/* le contenu du radar : monde 1 024 × 512 dans 48 × 24 */
function radar(im, rx, ry, o) {
  const P = (wx, wy) => [rx + Math.floor(wx / 1024 * 48), ry + Math.floor(wy / 512 * 24)];
  /* murs courants de l'arène, en magenta tramé */
  const [ax, ay] = P(o.arene[0], o.arene[1]), [bx, by] = P(o.arene[2], o.arene[3]);
  for (let x = ax; x <= bx; x++) { if (x % 2 === 0) { im.put(x, ay, sang); im.put(x, by, sang); } }
  for (let y = ay; y <= by; y++) { if (y % 2 === 0) { im.put(ax, y, sang); im.put(bx, y, sang); } }
  /* la vue, en ardoise */
  const [vx, vy] = P(o.cam[0], o.cam[1]), vw = Math.round(o.W / 1024 * 48), vh = Math.round(o.H / 512 * 24);
  for (let x = vx; x < vx + vw; x++) { im.put(x, vy, ardoise); im.put(x, vy + vh - 1, ardoise); }
  for (let y = vy; y < vy + vh; y++) { im.put(vx, y, ardoise); im.put(vx + vw - 1, y, ardoise); }
  for (const [wx, wy, t] of o.blips) { const [x, y] = P(wx, wy);
    if (t === 'e') im.put(x, y, magenta); else if (t === 'E') { im.put(x, y, magenta); im.put(x + 1, y, magenta); im.put(x, y + 1, magenta); im.put(x + 1, y + 1, magenta); }
    else if (t === 'n') im.put(x, y, ambre); else if (t === 'p') { im.put(x, y, jaune); im.put(x + 1, y, jaune); im.put(x, y + 1, jaune); im.put(x + 1, y + 1, jaune); } }
  const [hx, hy] = P(o.tete[0], o.tete[1]); joueuseOn(im, () => { im.put(hx, hy, cyan); im.put(hx + 1, hy, cyan); });
}

/* un serpent le long d'une courbe paramétrée f(s) -> [x, y], s de 0 (tête) à 1 (queue) */
function serpent(im, f, n, graine = 0, traine = true) {
  const pts = []; for (let k = 0; k <= 400; k++) pts.push(f(k / 400));
  /* échantillonnage à 5 px d'arc */
  const seg = [pts[0]]; let acc = 0;
  for (let k = 1; k < pts.length && seg.length < n; k++) { acc += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); if (acc >= 5) { seg.push(pts[k]); acc = 0; } }
  joueuseOn(im, () => {
    if (traine) { /* traînée du lasso : un pixel cyan pâle tramé selon l'âge, après la queue */
      const q = seg[seg.length - 1]; let a = 0, last = q;
      for (let k = pts.indexOf(q) + 1; k < pts.length; k++) { const p = pts[k]; a += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; const t = 1 - a / 70; if (t <= 0) break; if (dither(Math.round(p[0]), Math.round(p[1]), t * 0.9)) im.put(Math.round(p[0]), Math.round(p[1]), a < 25 ? cyanPale : cyan); }
    }
    for (let k = seg.length - 1; k >= 1; k--) { const r = seg.length - k; const nom = r <= 1 ? 'corps:3' : r <= 3 ? 'corps:5' : r <= 6 ? 'corps:7' : 'corps'; poseC(im, S(nom, graine + k), seg[k][0], seg[k][1]); }
    const [hx, hy] = seg[0], [nx, ny] = seg[1], ang = Math.atan2(hy - ny, hx - nx);
    poseC(im, S('tete:' + (((Math.round(ang / (Math.PI / 8)) % 16) + 16) % 16), graine), hx, hy);
  });
  return seg;
}
/* télégraphe de tourelle : ligne pointillée magenta gainée vers la cible, crochet d'impact */
function telegraphe(im, x0, y0, x1, y1, rose = false) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); if ((k >> 1) % 2 === 0) { for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (im.get(x + dx, y + dy) !== magenta) im.put(x + dx, y + dy, NP); } }
  for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); if ((k >> 1) % 2 === 0) im.put(x, y, rose ? rosePale : magenta); }
  const c = carte(['..m..', '.m.m.', 'm...m', '.m.m.', '..m..'].map(r => r.replace(/m/g, rose ? 'r' : 'm')));
  const g = contour(c); im.blit(g, x1 - 3, y1 - 3);
}
/* cercle d'armement d'une mine (violet tramé) */
function cercle(im, cx, cy, r, c = violet) { for (let a = 0; a < 360; a += 1.5) { const x = Math.round(cx + r * Math.cos(a * Math.PI / 180)), y = Math.round(cy + r * Math.sin(a * Math.PI / 180)); if (dither(x, y, 0.6)) im.put(x, y, c); } }

/* ================================================================================================ */
/* 1. L'ÉCRAN DE JEU                                                                                */
/* ================================================================================================ */
function ecranJeu(W, H, portrait, sansHud = false) {
  const cam = portrait ? [300, 60] : [250, 150];
  const fond = decor('docks', 'calme', W, H, cam[0], cam[1], 1.3);
  const im = new Toile(W, H); im.d.set(fond.d);
  const safe = portrait ? { x0: 2, y0: 24, x1: W - 2, y1: H - 17 } : { x0: 24, y0: 0, x1: W - 24, y1: H - 10 };
  /* --- le jeu --- */
  /* une belle courbe en S : la tête (s = 0) file vers la droite et les flèches, le corps ondule derrière */
  const P = portrait
    ? s => [110 - 60 * s, 236 + 20 * (1 - Math.cos(s * 5.5)) + 60 * s * s]
    : s => [200 - s * 150, 112 + 18 * (1 - Math.cos(s * 6.0))];
  /* ennemis : une FILE de trois flèches qui entre par la droite, une tourelle qui vise, une mine armée */
  const fle = portrait ? [[150, 170], [166, 182], [182, 194]] : [[300, 96], [318, 104], [336, 112]];
  fle.forEach(([x, y], k) => poseC(im, S('fleche:8', k), x, y));
  const tour = portrait ? [150, 330] : [330, 160], cible = portrait ? [102, 285] : [226, 133];
  telegraphe(im, tour[0] - 6, tour[1] - 3, cible[0], cible[1]);
  poseC(im, S('tourelle:charge', 1), tour[0], tour[1]);
  const mine = portrait ? [48, 345] : [92, 62];
  cercle(im, mine[0], mine[1], 17);
  poseC(im, S('mine', 0), mine[0], mine[1]);
  poseC(im, S('tirEnnemi', 0), portrait ? 120 : 270, portrait ? 300 : 140);
  /* butin */
  for (const [x, y, k] of portrait ? [[110, 210, 0], [124, 224, 1], [40, 160, 2]] : [[220, 84, 0], [236, 92, 1], [252, 74, 2]]) poseC(im, S('butin', k), x, y);
  /* la joueuse, ses tirs */
  const seg = serpent(im, P, 22, 3);
  const [hx, hy] = seg[0], [nx, ny] = seg[1], ang = Math.atan2(hy - ny, hx - nx), kd = (((Math.round(ang / (Math.PI / 8)) % 16) + 16) % 16);
  joueuseOn(im, () => { for (const d of [16, 34, 52]) poseC(im, S('tir:' + kd, d), hx + Math.cos(ang) * d, hy + Math.sin(ang) * d); });
  /* gain flottant et explosion de la flèche abattue */
  if (sansHud) return im;
  passeOn(im, () => texte(im, '+100', portrait ? 128 : 262, portrait ? 150 : 100, { ci: jaune, contour: NP }));
  /* --- HUD --- */
  hud(im, { W, H, safe, portrait, score: 12450, mult: 2, chaine: 0.6, objectif: '×3 DANS 3', vies: 3, label: 'V1 · FILE · LES DOCKS', vague: 1,
    arene: [240, 120, 784, 392], cam, tete: [cam[0] + hx, cam[1] + hy], blips: [[cam[0] + 300, cam[1] + 100, 'e'], [cam[0] + 320, cam[1] + 106, 'e'], [cam[0] + 340, cam[1] + 112, 'e'], [700, 200, 'e'], [720, 330, 'E'], [600, 380, 'n']] });
  /* chevron de portail au bord droit de la zone sûre, avec la mini-silhouette */
  passeOn(im, () => {
    const cx = portrait ? safe.x1 - 9 : safe.x1 - 9, cy = portrait ? 120 : 60;
    im.blit(A('portail', 0), cx, cy - 4);
    im.blit(A('mini:dard'), cx - 9, cy - 3);
    /* marqueur permanent de mine hors champ, à gauche */
    im.blit(A('marque:mine:5'), safe.x0 + 1, portrait ? 300 : 150);
    /* toast du défi de vague, sous le HUD */
    const t = 'DÉFI DE VAGUE : 2 LASSO', tw = mesure(t) + 10, tx = Math.floor((W - tw) / 2), ty = portrait ? H - safe.y0 - 30 : H - 24;
    bandeau9(im, 'toast:info:gauche', 'toast:info:milieu', 'toast:info:droite', tx, ty, tw);
    texte(im, t, tx + 5, ty + 2, { ci: os });
  });
  return im;
}

/* ================================================================================================ */
/* 1 bis. L'ÉCRAN DE JEU AU PLUS FORT : bannière, CYCLOPE, danger proche                              */
/* ================================================================================================ */
function ecranCyclope(W, H, portrait) {
  const cam = portrait ? [400, 40] : [300, 120];
  const fond = decor('eclipse', 'colosse', W, H, cam[0], cam[1], 2.1);
  const im = new Toile(W, H); im.d.set(fond.d);
  const safe = portrait ? { x0: 2, y0: 24, x1: W - 2, y1: H - 17 } : { x0: 24, y0: 0, x1: W - 24, y1: H - 10 };
  const bx = portrait ? W / 2 : W * 0.66, by = portrait ? 180 : 100;
  const col = S('colosse:oeil', 0); im.blit(col, Math.round(bx - col.w), Math.round(by - col.h), null, 2);
  telegraphe(im, bx - 2, by - 14, portrait ? 60 : 120, portrait ? 300 : 150, true);
  const P = portrait ? s => [60 + s * 90, 330 - 40 * Math.sin(s * 4)] : s => [110 - s * 70, 150 - 25 * Math.sin(s * 5)];
  serpent(im, P, 26, 5);
  /* bords tramés en sang du danger proche */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.min(x, W - 1 - x, y, H - 1 - y); if (d < 6 && dither(x, y, (6 - d) / 10)) im.put(x, y, sang); }
  hud(im, { W, H, safe, portrait, score: 487250, mult: 5, chaine: 0.3, objectif: '×6 DANS 4', vies: 1, label: '', vague: 6, cyclope: 0.55,
    arene: [300, 150, 720, 360], cam, tete: [cam[0] + 100, cam[1] + 150], blips: [[cam[0] + bx, cam[1] + by, 'E']] });
  /* bannière dans le tiers opposé à la tête */
  passeOn(im, () => {
    const h = portrait ? 29 : 36, k = portrait ? 3 : 4, txt = 'WARNING', bw = mesure(txt, k) + 40, x = Math.floor((W - bw) / 2), y = portrait ? 96 : H - 64;
    bandeau9(im, `banniere:danger:${h}:gauche`, `banniere:danger:${h}:milieu`, `banniere:danger:${h}:droite`, x, y, bw);
    const ty = y + Math.floor((h - 7 * k) / 2);
    texte(im, txt, W / 2 - 2, ty, { ci: violet, k, align: 'c' }); texte(im, txt, W / 2 + 2, ty, { ci: magenta, k, align: 'c' });
    texte(im, txt, W / 2, ty, { ci: os, k, align: 'c' });
  });
  return im;
}

/* ================================================================================================ */
/* 2. LE CHOIX DES CARTES                                                                           */
/* ================================================================================================ */
const MAIN = [
  { id: 'tourelles', rar: 'commune', nom: 'TOURELLES', l1: '1 TOURELLE/8 SEG.', l2: '2 TIRS/S · 100 PX', tag: 'ARME · NOUVEAU', tagc: jaune },
  { id: 'traversee', rar: 'rare', nom: 'TRAVERSÉE', l1: 'INTOUCHABLE 1,4 S', l2: 'SAUF MUR, MORSURE', tag: 'POUVOIR · NOUVEAU', tagc: jaune },
  { id: 'bouclier', rar: 'epique', nom: 'BOUCLIER', l1: 'ABSORBE UN COUP', l2: 'À LA TÊTE · 20 S', tag: 'PASSIF', tagc: acier },
  { id: 'canon', rar: 'ultime', nom: 'RAYON', l1: 'CANON III → ULTIME', l2: 'RAYON DE 140 PX', tag: 'ARME · NIV 4', tagc: jaune }
];
const ENCRE_R = { commune: acier, rare: os, epique: ambre, ultime: jaune };
const NOM_R = { commune: 'COMMUNE', rare: 'RARE', epique: 'ÉPIQUE', ultime: 'ULTIME' };
function carteUI(im, x, y, fmt, c, img = 0) {
  const cad = A(`cadre:${c.rar}:${fmt}`, c.rar === 'ultime' ? img : 0); im.blit(cad, x, y);
  const ombre = { commune: ardoise, rare: indigo, epique: sang, ultime: brasier }[c.rar];
  const halo = (cx, cy, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j) / r; if (d <= 1 && dither(cx + i, cy + j, 0.4 * (1 - d) + 0.06) && im.get(cx + i, cy + j) === nuit) im.put(cx + i, cy + j, ombre); } };
  /* l'icône de 16 × 16 est posée à l'échelle 2 : sur une carte de 80 ou 48 px de haut, elle se lit d'un coup d'œil */
  const ico = icone16(c.id);
  if (fmt === 'portrait') {
    halo(x + 23, y + 24, 19); im.blit(ico, x + 7, y + 8, null, 2);
    texte(im, c.nom, x + 46, y + 6, { ci: os });
    texte(im, c.l1, x + 46, y + 17, { ci: acier }); texte(im, c.l2, x + 46, y + 26, { ci: acier });
    texte(im, c.tag, x + 46, y + 37, { ci: c.tagc });
    texte(im, NOM_R[c.rar], x + 173, y + 6, { ci: ENCRE_R[c.rar], align: 'd' });
  } else {
    const w = fmt === 'paysage' ? 120 : 96, mid = x + Math.floor(w / 2);
    texte(im, c.tag, x + 7, y + 6, { ci: c.tagc });
    halo(mid, y + 30, 19); im.blit(ico, mid - 16, y + 14, null, 2);
    texte(im, c.nom, mid, y + 48, { ci: os, align: 'c' });
    for (let i = x + 8; i < x + w - 8; i++) if (i % 2 === 0) im.put(i, y + 57, ENCRE_R[c.rar] === os ? acier : ENCRE_R[c.rar]);
    texte(im, c.l1, mid, y + 60, { ci: acier, align: 'c' }); texte(im, c.l2, mid, y + 69, { ci: acier, align: 'c' });
  }
}
/* le build en cours : plaque centrée en cx, icônes de 8 × 8 et palier en chiffres romains */
function build(im, cx, y, liste) {
  const larg = 34 + liste.reduce((a, [, n]) => a + 12 + (n ? mesure(n) + 4 : 0), 0), x = Math.round(cx - larg / 2);
  plaque(im, x, y, larg, 15, ardoise); texte(im, 'BUILD', x + 5, y + 4, { ci: acier });
  let ix = x + 38; for (const [id, n] of liste) { im.blit(icone8(id), ix, y + 3); if (n) texte(im, n, ix + 10, y + 4, { ci: os }); ix += 12 + (n ? mesure(n) + 4 : 0); }
}
function ecranCartes(W, H, portrait) {
  const base = ecranJeu(W, H, portrait, true), im = new Toile(W, H); im.d.set(base.d); im.remap(CRAN2);
  hudOn(im, () => {
    if (!portrait) {
      texte(im, 'VAGUE 1 NETTOYÉE', W / 2, 6, { ci: jaune, k: 2, align: 'c', contour: NP });
      texte(im, 'CARTE DE VAGUE + NIV 2 : CHOISIS 2', W / 2, 24, { ci: os, align: 'c', contour: NP });
    } else {
      texte(im, 'VAGUE 1', W / 2, 28, { ci: jaune, k: 2, align: 'c', contour: NP });
      texte(im, 'NETTOYÉE', W / 2, 46, { ci: jaune, k: 2, align: 'c', contour: NP });
      texte(im, 'CHOISIS 2 CARTES', W / 2, 62, { ci: os, align: 'c', contour: NP });
    }
    if (!portrait) {
      const xs = [24, 151, 278]; MAIN.slice(0, 3).forEach((c, k) => carteUI(im, xs[k] + (k === 1 ? 0 : 0), 42 + (k === 1 ? -2 : 0), 'paysage', c));
      /* la carte du milieu est déjà choisie : liseré os, elle se soulève de 2 px */
      im.blit(A('cadre:choisie:paysage'), 151, 40); carteUI(im, 151, 40, 'paysage', MAIN[1]);
      texte(im, '1 CHOISIE · ENCORE 1', W / 2, 132, { ci: jaune, align: 'c', contour: NP });
      texte(im, 'TOUCHE UNE CARTE · 1 2 3 AU CLAVIER', W / 2, 146, { ci: acier, align: 'c', contour: NP });
      /* le build en cours, en petites icônes */
      build(im, W / 2, 162, [['canon', 'II'], ['aimant', 'I']]);
    } else {
      [0, 1, 2, 3].forEach(k => carteUI(im, 7, 76 + k * 52, 'portrait', MAIN[k], 3));
      im.blit(A('cadre:choisie:portrait'), 7, 76 + 52); carteUI(im, 7, 76 + 52, 'portrait', MAIN[1]);
      texte(im, 'TOUCHE UNE CARTE', W / 2, 296, { ci: acier, align: 'c', contour: NP });
      build(im, W / 2, 314, [['canon', 'III'], ['aimant', 'I']]);
    }
  });
  return im;
}

/* ================================================================================================ */
/* 3. L'ÉCRAN DE FIN : SIGNAL PERDU, qui a tué                                                       */
/* ================================================================================================ */
const PY = 8;   /* portrait : hauteur où l'on pose le panneau de 384 × 216 */
function fondPanneau(nom, W, H, portrait) {
  const p = panneau(nom), im = new Toile(W, H, NP); im.mode = 2;   /* le serpent du panneau, c'est la joueuse (cinématique) */
  if (!portrait) im.blit(p, Math.floor((W - p.w) / 2), Math.floor((H - p.h) / 2));
  else { /* portrait : le panneau occupe le haut, recadré sur le serpent ; le bas se fond dans la nuit */
    im.blit(p, -60, PY);
  }
  /* bords latéraux en paysage : le panneau fait 384 de large pour 422 : on prolonge par un tramage */
  if (!portrait) { const m = Math.floor((W - p.w) / 2); for (let y = 0; y < H; y++) for (let x = 0; x < m + 6; x++) { const t = 1 - x / (m + 6); if (dither(x, y, t)) { im.put(x, y, NP); im.put(W - 1 - x, y, NP); } } }
  im.mode = 0;
  if (portrait) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = y < PY ? (PY - y) / 14 : y > PY + 216 - 16 ? (y - (PY + 216 - 16)) / 14 : 0; if (d > 0 && dither(x, y, Math.min(1, d))) im.put(x, y, NP); } }
  return im;
}
function cadreBarre(im, x, y, w, frac, plein) {
  im.cadre(x, y, w, 7, acier); for (const [i, j] of [[x, y], [x + w - 1, y], [x, y + 6], [x + w - 1, y + 6]]) im.put(i, j, NP);
  im.rect(x + 1, y + 1, w - 2, 5, NP);
  im.blit(A('jauge:vide').sous(0, 0, w - 4, 3), x + 2, y + 2); im.blit(A(plein).sous(0, 0, Math.round((w - 4) * frac), 3), x + 2, y + 2);
}
function ecranFin(W, H, portrait) {
  /* assombri d'un cran, sauf la joueuse : sur ce panneau, le serpent qui se désintègre, c'est elle */
  const im = fondPanneau('defaite', W, H, portrait); im.remap(CRAN1.map((c, i) => i === cyan ? cyan : i === cyanPale ? cyan : c));
  hudOn(im, () => {
    const cx = Math.floor(W / 2), k = portrait ? 2 : 3;
    /* 1. le titre, avec ses deux fantômes */
    const ty = portrait ? 30 : 7;
    texte(im, 'SIGNAL PERDU', cx - 1, ty, { ci: violet, k, align: 'c' }); texte(im, 'SIGNAL PERDU', cx + 1, ty, { ci: sang, k, align: 'c' });
    texte(im, 'SIGNAL PERDU', cx, ty, { ci: magenta, k, align: 'c', contour: NP });
    /* 2. la cause, avec le coupable entouré d'un anneau magenta */
    const lignes = portrait ? ['DÉTRUITE PAR :', 'TIR DE TOURELLE', 'V3 · LA CENTRALE · 2:07'] : ['DÉTRUITE PAR : TIR DE TOURELLE', 'VAGUE 3 · LA CENTRALE · 2:07'];
    const cy = portrait ? 52 : 33, lw = Math.max(...lignes.map(l => mesure(l))) + 32, lh = lignes.length * 9 + 5, lx = cx - Math.floor(lw / 2);
    plaque(im, lx, cy, lw, Math.max(lh, 24), sang);
    const tur = S('tourelle', 0), ry = cy + Math.floor(Math.max(lh, 24) / 2);
    im.blit(tur, lx + 5, ry - 7);
    for (let a = 0; a < 360; a += 3) { const x = Math.round(lx + 12.5 + 10.5 * Math.cos(a * Math.PI / 180)), y = Math.round(ry + 0.5 + 10.5 * Math.sin(a * Math.PI / 180)); if (im.get(x, y) === NP || im.get(x, y) === sang) im.put(x, y, magenta); }
    lignes.forEach((l, n) => texte(im, l, lx + 27, cy + 3 + n * 9, { ci: n === lignes.length - 1 ? acier : os }));

    /* l'encart */
    const ex = portrait ? 5 : 26, ey = portrait ? 196 : 62, ew = W - 2 * ex, eh = portrait ? H - 17 - ey : H - 8 - ey;
    plaque(im, ex, ey, ew, eh, ardoise);
    const c1 = ex + 6;
    let y = ey + 6;
    /* 3. la progression */
    texte(im, 'SECTEUR 62 %', c1, y, { ci: os });
    cadreBarre(im, c1 + 76, y, portrait ? ew - 88 : 104, 0.62, 'jauge:progression:plein');
    y += 13;
    /* 4. le score compté, l'écart, le record */
    texte(im, 'SCORE', c1, y + 4, { ci: acier });
    grosNombre(im, '0187450', c1 + 34, y);
    if (!portrait) { texte(im, '+12 400', c1 + 101, y, { ci: jaune }); texte(im, 'RECORD 248 900', c1 + 101, y + 8, { ci: acier }); y += 19; }
    else { y += 17; texte(im, '+12 400', c1, y, { ci: jaune }); texte(im, 'RECORD 248 900', c1 + 50, y, { ci: acier }); y += 13; }
    /* 5. le build */
    texte(im, 'ARTILLEUSE', c1, y, { ci: ambre });
    let ix = c1 + 64;
    for (const [id, n] of [['tourelles', 'III'], ['missiles', 'II'], ['canon', 'II'], ['aimant', 'I'], ['bouclier', '']]) { im.blit(icone8(id), ix, y - 1); if (n) texte(im, n, ix + 10, y, { ci: os }); ix += 12 + (n ? mesure(n) + 3 : 0); }
    y += portrait ? 13 : 15;
    /* 8. les défis du jour (étoiles) et le défi de vague réussi */
    texte(im, 'DÉFIS', c1, y, { ci: acier });
    [true, false, true].forEach((ok, n) => im.blit(A('etoile', ok ? 0 : 1), c1 + 34 + n * 10, y - 1));
    texte(im, 'V2 : DÉVORE 4 ✓', c1 + 70, y, { ci: jaune });
    y += portrait ? 13 : 15;
    /* 9. UN conseil, en jaune, encadré d'un filet */
    const conseil = 'PRENDS LA TOURELLE DE CÔTÉ';
    for (let i = c1; i < c1 + mesure(conseil); i++) if (i % 2 === 0) im.put(i, y - 3, ardoise);
    texte(im, conseil, c1, y, { ci: jaune });
    y += 13;
    /* 6. le bilan et 7. la note : colonne de droite en paysage, sous le reste en portrait */
    const c2 = portrait ? c1 : ex + 198;
    let y2 = portrait ? y : ey + 6;
    const bil = [['DÉTRUITS', '214'], ['CHAÎNE MAX', '×6'], ['LASSO MAX', '×4'], ['LONGUEUR MAX', '31'], ['DÉVORÉS', '7'], ['APOGÉES', '2']];
    const bwc = portrait ? 116 : 112;
    bil.forEach(([kk, v], n) => { texte(im, kk, c2, y2 + n * 9, { ci: acier }); texte(im, v, c2 + bwc, y2 + n * 9, { ci: os, align: 'd' }); });
    const note = A('note:C'), nx = ex + ew - note.w - (portrait ? 14 : 12), ny = portrait ? y2 + 14 : ey + 16;
    texte(im, 'NOTE', nx + Math.floor(note.w / 2), ny - 10, { ci: acier, align: 'c' });
    im.blit(note, nx, ny);
    if (portrait) y = y2 + 6 * 9 + 6;
    /* 10. l'énergie gagnée et le prochain déblocage */
    const dx = portrait ? c1 : c2, dy = portrait ? y : ey + 62, jw = portrait ? ew - 12 : ew - (c2 - ex) - 8;
    texte(im, 'PROCHAIN DÉBLOCAGE', dx, dy, { ci: acier });
    texte(im, '+86', dx, dy + 10, { ci: ambre }); im.blit(A('energie'), dx + 19, dy + 9);
    texte(im, 'REPLI DANS 112', dx + jw, dy + 10, { ci: os, align: 'd' });
    cadreBarre(im, dx, dy + 20, jw, 0.71, 'jauge:deblocage:plein');
    /* 11. les boutons : CONTINUER ? et son compte à rebours, REJOUER, TITRE */
    const byy = ey + eh - 26, bw = portrait ? [72, 54, 49] : [116, 112, 112], gap = portrait ? 3 : 7;
    let bx = ex + (portrait ? 4 : 7);
    boutonTexte(im, 'principal', bx, byy, bw[0], '', jaune);
    texte(im, portrait ? 'CONTINUE' : 'CONTINUER ?', bx + 7, byy + 8, { ci: jaune });
    im.blit(A('chiffres:danger', 9), bx + bw[0] - 15, byy + 4);
    bx += bw[0] + gap; boutonTexte(im, 'secondaire', bx, byy, bw[1], 'REJOUER', os);
    bx += bw[1] + gap; boutonTexte(im, 'secondaire', bx, byy, bw[2], 'TITRE', os);
  });
  return im;
}

/* ================================================================================================ */
/* 4. L'ÉCRAN-TITRE                                                                                  */
/* ================================================================================================ */
function logo(maxW) {
  const src = panneau('logo'); const w = src.w, h = src.h; let keep = [...Array(w).keys()];
  const drop = w - maxW;
  if (drop > 0) { const cost = []; for (let x = 2; x < w - 2; x++) { let d = 0; for (let y = 0; y < h; y++) if (src.d[y * w + x] !== src.d[y * w + x - 1]) d++; cost.push([d, x]); }
    cost.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const gone = new Set(); for (const [, c] of cost) { if (gone.size >= drop) break; if ([c - 2, c - 1, c + 1, c + 2].some(v => gone.has(v))) continue; gone.add(c); } keep = keep.filter(x => !gone.has(x)); }
  const o = new Img(keep.length, h); for (let y = 0; y < h; y++) keep.forEach((x, k) => o.put(k, y, src.d[y * w + x])); return o;
}
function ecranTitre(W, H, portrait) {
  const im = new Toile(W, H, NP);
  const hor = panneau('horizon'), aff = panneau('affiche');
  im.mode = 2;   /* panneaux de cinématique : le serpent de l'affiche, c'est la joueuse */
  /* l'horizon au fond, l'affiche par-dessus, fondue dans l'horizon par un tramage sur 14 rangées */
  if (!portrait) {
    im.blit(hor, Math.floor((W - hor.w) / 2), Math.floor((H - hor.h) / 2));
    const ax = Math.floor((W - aff.w) / 2), ay = Math.floor((H - aff.h) / 2);
    for (let y = 0; y < aff.h; y++) for (let x = 0; x < aff.w; x++) { const e = Math.min(x, aff.w - 1 - x) / 14; const c = aff.get(x, y); if (c && (e >= 1 || dither(ax + x, ay + y, e))) im.put(ax + x, ay + y, c); }
  } else {
    im.blit(hor, -Math.floor((hor.w - W) / 2), -10);
    im.blit(hor, -Math.floor((hor.w - W) / 2), 210);
    const ax = -Math.floor((aff.w - W) / 2) - 50, ay = 176;
    for (let y = 0; y < aff.h; y++) for (let x = 0; x < aff.w; x++) { const e = Math.min(y, aff.h - 1 - y) / 14; const c = aff.get(x, y); if (c && (e >= 1 || dither(ax + x, ay + y, e))) im.put(ax + x, ay + y, c); }
  }
  im.mode = 0;
  hudOn(im, () => {
    const lg = logo(portrait ? 195 : 200), lx = Math.floor((W - lg.w) / 2), ly = portrait ? 42 : -8;
    im.blit(lg, lx, ly);
    /* TOUCHE POUR JOUER, en jaune, gainé */
    const ty = portrait ? 150 : 112;
    const tl = portrait ? ['TOUCHE', 'POUR JOUER'] : ['TOUCHE POUR JOUER'];
    const tw = Math.max(...tl.map(t => mesure(t, 2)));
    plaque(im, Math.floor(W / 2 - tw / 2) - 6, ty - 4, tw + 12, 22 + (tl.length - 1) * 18, 0, NP);
    tl.forEach((t, n) => texte(im, t, W / 2, ty + n * 18, { ci: jaune, k: 2, align: 'c', contour: NP }));
    /* boutons du haut : RÉGLAGES, RECORDS */
    const bx = portrait ? W - 2 - 22 : W - 24 - 22, by = portrait ? 26 : 4;
    im.blit(A('bouton:reglages'), bx, by); im.blit(A('bouton:records'), bx - 24, by);
    /* les chiffres : record, énergie, défis du jour */
    const py = portrait ? 346 : 140, pw = portrait ? 181 : 374, px = Math.floor((W - pw) / 2);
    plaque(im, px, py, pw, portrait ? 58 : 46, ardoise);
    texte(im, 'RECORD', px + 6, py + 5, { ci: acier }); texte(im, '248 900', px + 46, py + 5, { ci: jaune }); texte(im, 'MNW', px + 92, py + 5, { ci: os });
    const ex = portrait ? px + 6 : px + 130, ey = portrait ? py + 15 : py + 5;
    texte(im, 'ÉNERGIE', ex, ey, { ci: acier }); texte(im, '688', ex + 46, ey, { ci: ambre }); im.blit(A('energie'), ex + 65, ey - 1);
    const dy = portrait ? py + 27 : py + 18;
    texte(im, 'DÉFIS DU JOUR', px + 6, dy, { ci: acier });
    im.blit(A('etoile', 1), px + 6, dy + 10); texte(im, 'LASSO ×6', px + 16, dy + 11, { ci: os });
    const d2x = portrait ? px + 6 : px + 130, d2y = portrait ? dy + 20 : dy + 10;
    im.blit(A('etoile', 0), d2x, d2y); texte(im, 'CRASH', d2x + 10, d2y + 1, { ci: os });
    if (!portrait) { im.blit(A('etoile', 1), px + 220, dy + 10); texte(im, 'FINIR', px + 230, dy + 11, { ci: os }); }
  });
  return im;
}

/* ================================================================================================ */
const ECRANS = { jeu: ecranJeu, cyclope: ecranCyclope, cartes: ecranCartes, fin: ecranFin, titre: ecranTitre };
const ORIENT = { paysage: [422, 195, false], portrait: [195, 422, true] };
const seul = process.argv[2];
for (const [nom, f] of Object.entries(ECRANS)) {
  if (seul && seul !== nom) continue;
  for (const [or, [W, H, portrait]] of Object.entries(ORIENT)) {
    const im = f(W, H, portrait);
    let hudN = 0, passe = 0, cyanHors = 0, lum = 0; for (let i = 0; i < im.d.length; i++) { hudN += im.hud[i] === 1; passe += im.hud[i] === 2; const v = im.d[i]; if ((v === cyan || v === cyanPale) && !im.joueuse[i]) cyanHors++; if (L[v] > 0.10) lum++; }
    const out = new Img(W, H); out.d.set(im.d);
    ecrirePNG(path.join(MAQ, `${nom}-${or}.png`), out, { transparent: false });
    ecrirePNG(path.join(MAQ, `${nom}-${or}-x3.png`), out, { transparent: false, k: 3 });
    console.log(`${(nom + '-' + or).padEnd(18)} HUD ${(100 * hudN / im.d.length).toFixed(1).padStart(5)} % (+ ${(100 * passe / im.d.length).toFixed(1)} % passager)   cyan hors joueuse et panneaux ${(100 * cyanHors / im.d.length).toFixed(2)} %   lumineux ${(100 * lum / im.d.length).toFixed(1)} %`);
  }
}
