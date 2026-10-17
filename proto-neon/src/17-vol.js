/* ===== 17-vol.js — LE VOL : la plongée de 4 s entre deux vagues (REFONTE.md § 3.9, § 7.8) =====

   La vue de poursuite de Space Harrier, refaite en pixels entiers. L'horizon descend à 0,38 h, le sol prend
   les 62 % du bas, le serpent est vu de dos, et trois sortes d'objets arrivent du point de fuite :
   des CELLULES (losanges ambre), des PORTES (anneaux jaunes) et des MINES (disques magenta à piques, chacune
   annoncée par son ombre au sol). Tout est une primitive à rayon entier, r = ⌊r0 × Z0 / z⌋ : jamais un sprite
   agrandi d'un facteur non entier (seule la tête, un sprite de 13 px, est posée à l'échelle 2).

   Interface imposée (REFONTE.md § 7.8) :
     N.vol.start(depuis, vers)   depuis, vers : ids de N.ids.quartiers ; capture l'image du jeu, tire la disposition
     N.vol.update(dt)            dt = temps de jeu (N.horloge.dtMonde) ; avance le VOL, émet les événements
     N.vol.draw()                dessine TOUT l'écran en espace écran (origine (0,0)), balayages compris
     N.vol.actif()               true de start() jusqu'à la fin de la sortie
     N.vol.resultat()            -> {portes, mines, parfait}, lisible après la fin (même objet à chaque appel)
   En plus, pour les pilotes et les bancs (lecture seule, aucune allocation) :
     N.vol.etat()                l'état courant et les tableaux d'objets (voir plus bas)
     N.vol.ligne(t, out)         le point (x, y) de l'itinéraire PARFAIT à l'instant t du VOL
     N.vol.annuler()             abandonne un VOL en cours, sans événement (REJOUER, bascule d'état)

   Événements : N.ev.emit('vol', {evt:'debut'|'porte'|'mine'|'fin', parfait, vers, portes, mines}), schéma CH.vol de
   03-socle.js (tous les champs, aucun autre). `parfait` n'est vrai que dans `fin`. `portes` et `mines` sont les
   comptes cumulés après l'événement. Une cellule prise émet aussi `ramassage` {type:'cellule', x, y, valeur:1} :
   x et y sont alors en espace ÉCRAN (le monde n'est pas dessiné pendant LE VOL ; N.vol.actif() le dit).

   Le temps. 4 s en tout (somme des dt) : entrée tramée 0,4 s, vol de 0,4 à 3,6 s, sortie tramée 0,4 s. `fin` part
   à la dernière image de la sortie, jamais avant : le consommateur de rang 10 (79-jeu) quitte l'état `vol` à ce
   moment-là. La sortie est dessinée dans un second tampon (la vue de face du quartier d'arrivée, par
   N.decor.quartier(vers), N.decor.etat('calme'), N.decor.drawFar(N.cam) ; si N.decor.fixer existe il remplace
   les deux premiers appels, car quartier() ouvre un balayage de 0,5 s qui montrerait encore l'ancien quartier)
   puis fondue par Bayer.
   Le sol : `avance` passé à N.decor.drawVol est la profondeur parcourue EN PX DE SOL (le décor calcule
   (z + avance) mod 24, comme son propre avZ), croissante à 6 cases × 24 px par temps de jeu, soit la vitesse
   des objets ; constante L_AVANCE_PX pour passer en cases.

   La disposition. Tirée à start() dans le flux N.rng('vol') (graine du jeu), jamais par le hasard natif ni par
   l'horloge murale. Elle est construite autour d'un ITINÉRAIRE PARFAIT : une ligne brisée qui passe au centre de
   chaque porte à l'instant où elle croise la tête, à 60 % de la vitesse de la manche. Les mines sont posées à
   34 px au moins de cette ligne (rayon de contact + marge), les cellules sur ou près d'elle : un VOL PARFAIT
   (toutes les portes, aucune mine) existe donc pour toute graine, par construction.
   Visibilité des mines : une mine ne naît jamais plus tard que `balayage + 1,2 + 0,15` s avant son contact (la vue de
   poursuite est alors entièrement dessinée), et son rayon r0 est tel que ⌊r0 × Z0 / z⌋ ≥ 1 dès
   (r0 − 1) × Z0 / v ≥ 1,2 + 0,15 s avant le contact ; son ombre au sol, 1,3 fois plus large, apparaît avant elle et se
   détache d'elle (la mine est tirée assez haut au-dessus du sol pour cela). Le placement écarte aussi les mines qu'une
   autre mine ou une cellule plus proche cacherait pendant cette fenêtre.

   Le dessin, du fond vers l'avant : le fond (N.decor.drawVol), le corps du serpent, les portes, les cellules, les mines
   avec leur ombre (les menaces ne sont jamais cachées par un bord d'anneau), la tête, puis ce qui a dépassé le plan de
   la tête (grossit et sort de l'écran), les éclats, enfin le balayage. Dans chaque couche, du plus loin au plus proche.

   Les coordonnées. Un objet vit dans le plan de la tête (profondeur Z0) à (cx + ox, hor + oy), cx = ⌊W / 2⌋ le point de
   fuite, hor la rangée de l'horizon ; à la profondeur z il est dessiné en (cx + ox × Z0 / z, hor + oy × Z0 / z) avec le
   rayon ⌊r0 × Z0 / z⌋ et z = Z0 + v × (tc − t), tc étant l'instant où il croise la tête. v = 6 cases × 24 px par temps de
   jeu : la vitesse du sol. Le contact se teste à cet instant exact (position de la tête interpolée), à tout dt.

   N.vol.etat() rend un objet réutilisé : actif, t, hx, hy (la tête), cx, hor, sol0, z0, vz, portes, mines, cellules,
   nPortes, nMines, nCellules, replis (mines posées sans la règle des occlusions : rare), n (objets), et les tableaux
   typés kind (0 cellule, 1 porte, 2 mine), st (0 en vol, 1 pris / traversé / touché, 2 manqué / évité), ray (r0), tc, ox,
   oy, vu (premier instant où le rayon projeté atteint 1), ord (indices du plus loin au plus proche).

   Il PUBLIE S.vol (schéma `vol` de 03-socle.js, null hors du VOL) pour les pilotes : tete, objets visibles, reste.
   Aucune allocation structurelle par image : pools et tableaux typés préalloués, charges d'événements en anneau,
   flottants chauds dans un Float64Array, aucune fermeture ni tableau créé dans update/draw. Aucune couleur écrite ici :
   seulement N.pal.i(nom). Le cyan est la joueuse seule (tête et anneaux du corps).

   Décisions prises sans le gardien (à confirmer) : (1) la coupe d'une mine appelle N.joueuse.couper(k, {genre:'decor',
   type:'vol'}) avec k = max(8, L − ⌊L / 4⌋), seulement si k < L ; un coup absorbé (retour false : BOUCLIER,
   TRAVERSÉE) ne compte pas comme mine et n'émet pas `mine` ; (2) la cellule prise émet `ramassage` (x, y écran, valeur 1) ;
   (3) rien ne donne les 5 XP d'une porte : EVT.vol n'a pas de consommateur de rang 30 ; (4) `avance` du décor en px de sol.

   Chiffres de N.R.vol (02-regles.js) lus au start(). Ceux que N.R.vol ne porte pas encore sont dans le bloc
   « → N.R » ci-dessous, à demander au gardien. Module chargeable seul : N.decor, N.joueuse, N.music, N.ev, N.R,
   N.S, N.spr, N.rng, N.gfx sont tous détectés, jamais supposés. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ---- chiffres que N.R.vol ne porte pas encore : → N.R (à demander au gardien) ---- */
  var L_CELLULE = 6;          // rayon d'une cellule à la profondeur de la tête (losange de 13 px)
  var L_PRISE = 16;           // une cellule est prise à moins de 16 px du centre de la tête
  var L_MINE = 11;            // rayon d'une mine à la profondeur de la tête (relevé au besoin, voir lire())
  var L_MINE_TOUCHE = 0.8;    // part de ce rayon qui touche (les piques ne comptent pas)
  var L_OMBRE = 1.3;          // l'ombre au sol d'une mine est 1,3 fois plus large qu'elle
  var L_TETE_TOUCHE = 9;      // rayon de contact de la tête
  var L_PORTE_MARGE = 5;      // la tête passe DANS l'anneau à moins de (rayon − 5) px du centre
  var L_MARGE_VISIBLE = 0.15; // marge sur les 1,2 s de visibilité d'une mine
  var L_ECART_MINE = 16;      // marge entre l'itinéraire parfait et le contact d'une mine
  var L_ROUTE = 0.6;          // part de la vitesse de la manche que demande l'itinéraire parfait
  var L_SOL0 = 0.95;          // rangée du sol à la profondeur de la tête : 0,95 h
  var L_ZMIN = 29;            // un objet disparaît quand il passe sous cette profondeur (~Z0 / 2)
  var L_CORPS_R0 = 8;         // rayon de référence des anneaux du corps : ⌊8 × s⌋ = 5, 4, 3, 2, 1
  var L_CORPS_TAU = 0.045;    // constante de temps du fouet du corps
  var L_RAMASSAGE = 1;        // valeur d'une cellule dans `ramassage`
  var L_AVANCE_PX = true;     // `avance` passé à N.decor.drawVol : profondeur parcourue en px (le décor calcule (z + avance) mod 24) ;
                              // mettre false pour des cases de 24 px

  /* ---- réglages lus au start() ---- */
  var D = {
    duree: 4, balayage: 0.4, horizon: 0.38, sol: 0.62,
    cx0: 0.15, cx1: 0.85, cy0: 0.55, cy1: 0.90, vitesse: 140,
    nCell: 24, nPorte: 6, rayonPorte: 24, nMine: 4, nMineCoeur: 8,
    ombre: 1.2, coupe: 0.25, longMin: 8, Z0: 64, echelle: 2,
    avance: 6, pas: 24, temps: 60 / 144.6,
    V: 0, rMine: L_MINE
  };
  var ANNEAUX = new Uint8Array(8), NA = 5;

  function ou(v, def) { return (typeof v === 'number' && isFinite(v)) ? v : def; }

  function lire() {
    var R = N.R, v = R && R.vol, s = R && R.decor && R.decor.sol, tp = R && R.temps;
    if (v) {
      D.duree = ou(v.duree, 4); D.balayage = ou(v.balayage, 0.4); D.horizon = ou(v.horizon, 0.38); D.sol = ou(v.sol, 0.62);
      if (v.cadre && v.cadre.x && v.cadre.y) {
        D.cx0 = ou(v.cadre.x[0], 0.15); D.cx1 = ou(v.cadre.x[1], 0.85); D.cy0 = ou(v.cadre.y[0], 0.55); D.cy1 = ou(v.cadre.y[1], 0.90);
      }
      D.vitesse = ou(v.vitesse, 140);
      if (v.cellules) D.nCell = ou(v.cellules.nombre, 24);
      if (v.portes) { D.nPorte = ou(v.portes.nombre, 6); D.rayonPorte = ou(v.portes.rayonMax, 24); }
      if (v.mines) {
        D.nMine = ou(v.mines.nombre, 4); D.nMineCoeur = ou(v.mines.versCoeur, 8); D.ombre = ou(v.mines.ombreAvant, 1.2);
        D.coupe = ou(v.mines.coupe, 0.25); D.longMin = ou(v.mines.longueurMin, 8);
      }
      D.Z0 = ou(v.Z0, 64);
      if (v.tete) D.echelle = ou(v.tete.echelle, 2) | 0;
      D.avance = ou(v.grille, 6);
      var an = v.anneaux;
      if (an && an.length) { NA = Math.min(8, an.length); for (var a = 0; a < NA; a++) ANNEAUX[a] = an[a]; }
      else { NA = 5; for (var b = 0; b < 5; b++) ANNEAUX[b] = 5 - b; }
    }
    if (s) { D.pas = ou(s.pasTransversal, 24); if (s.avance) D.avance = ou(s.avance.vol, D.avance); }
    D.temps = (tp && ou(tp.dureeTemps, 0)) ? tp.dureeTemps : 60 / 144.6;
    if (D.echelle < 1) D.echelle = 2;
    if (D.nPorte < 1) D.nPorte = 1;
    if (D.nPorte > 8) D.nPorte = 8;
    D.V = D.avance * D.pas / D.temps;                      // vitesse du sol, en profondeur par seconde
    var rmin = Math.ceil(1 + (D.ombre + L_MARGE_VISIBLE) * D.V / D.Z0);
    D.rMine = L_MINE > rmin ? L_MINE : rmin;               // la mine est visible assez tôt, par construction
  }

  /* ---- couleurs et propriétaires : résolus au start(), jamais au chargement ---- */
  var cVide = 0, cNuit = 0, cViolet = 0, cMagenta = 0, cRose = 0, cCyan = 0, cCyanP = 0, cAmbre = 0, cJaune = 0,
    cBrasier = 0, cOs = 0, cSang = 0, cNuitP = 0;
  var oTete = 0, oCorps = 0, oEnnemi = 0, oButin = 0, oEffet = 0;
  function couleurs() {
    var P = N.pal;
    if (P && typeof P.i === 'function') {
      cVide = P.i('vide'); cNuit = P.i('nuit'); cViolet = P.i('violet'); cMagenta = P.i('magenta'); cRose = P.i('rosePale');
      cCyan = P.i('cyan'); cCyanP = P.i('cyanPale'); cAmbre = P.i('ambre'); cJaune = P.i('jaune'); cBrasier = P.i('brasier');
      cOs = P.i('os'); cSang = P.i('sang'); cNuitP = P.i('nuitProfonde');
    }
    var pr = N.ids && N.ids.proprietaires;
    if (pr) { oTete = pr.tete | 0; oCorps = pr.corps | 0; oEnnemi = pr.ennemi | 0; oButin = pr.butin | 0; oEffet = pr.effet | 0; }
  }

  /* ---- l'état du VOL ---- */
  var G = null;                                   // N.gfx
  var phase = 0;                                  // 0 inactif, 1 en cours
  /* Les flottants écrits à chaque pas vivent dans un Float64Array : une variable de fermeture qui reçoit un
     flottant est reboxée par le moteur à chaque écriture, soit de l'allocation à chaque image. */
  var Q = new Float64Array(8), T = 0, TP = 1, AV = 2, HX = 3, HY = 4, HPX = 5, HPY = 6;
  var AVN = 0;
  var dep = 'docks', ver = 'artere';
  var W = 422, H = 195, cx = 211, hor = 74, sol0 = 185, xmin = 63, xmax = 359, ymin = 107, ymax = 175;
  var cPortes = 0, cMines = 0, cCell = 0, chaine = 0, nG = 6, nM = 4, nC = 24;
  var RES = { portes: 0, mines: 0, parfait: false };

  var MAXO = 48;
  var KC = 0, KP = 1, KM = 2;                     // cellule, porte, mine
  var kind = new Uint8Array(MAXO), st = new Uint8Array(MAXO), ray = new Uint8Array(MAXO);
  var tc = new Float64Array(MAXO), ox = new Float32Array(MAXO), oy = new Float32Array(MAXO), vu = new Float32Array(MAXO);
  var ord = new Uint8Array(MAXO);                 // indices triés par tc décroissant : du plus loin au plus proche
  var nObj = 0, nRepli = 0;
  // st : 0 en vol, 1 pris / traversé / touché, 2 manqué / évité

  var wt = new Float64Array(10), wx = new Float32Array(10), wy = new Float32Array(10), nWp = 0;   // l'itinéraire parfait
  var PT = { x: 0, y: 0 };
  var TX = new Float32Array(8), TY = new Float32Array(8), TT = new Float64Array(8);

  var bX = new Float32Array(8), bY = new Float32Array(8);   // fouet du corps, relatif au point de fuite, dans le plan de la tête

  /* ---- tampons des balayages ---- */
  var snap = null, snapW = 0, snapH = 0, snapOK = false;
  var dest = null, destW = 0, destH = 0, destPret = false;
  var PAT = new Uint8Array(16);

  /* ---- la tête ---- */
  var spr0 = null, spr1 = null;

  /* ---- paramètres du fond : un objet réutilisé ---- */
  var DV = { horizon: 0, sol0: 0, avance: 0, depuis: 'docks', vers: 'artere', montee: 0 };

  /* ---- éclats : un anneau de pools ---- */
  var NB = 12;
  var eX = new Int16Array(NB), eY = new Int16Array(NB), eT0 = new Float64Array(NB), eK = new Uint8Array(NB), eR = new Uint8Array(NB),
    eOn = new Uint8Array(NB), eI = 0;
  var E_DUREE = [0.30, 0.20, 0.45, 0.30];         // porte, cellule, mine, mine absorbée

  /* ---- charges d'événements et options de son : des anneaux, rien à allouer par événement ---- */
  var NE = 16, evP = [], evI = 0, NR = 8, raP = [], raI = 0, NS = 4, sfP = [], sfI = 0, q0;
  for (q0 = 0; q0 < NE; q0++) evP.push({ evt: 'debut', parfait: false, vers: 'docks', portes: 0, mines: 0 });
  for (q0 = 0; q0 < NR; q0++) raP.push({ type: 'cellule', x: 0, y: 0, valeur: 1 });
  for (q0 = 0; q0 < NS; q0++) sfP.push({ pitch: 0 });
  var SRC_VOL = { genre: 'decor', type: 'vol', id: 0 };

  function emettre(evt, parfait) {
    var E = N.ev;
    if (!E || typeof E.emit !== 'function') return;
    var c = evP[evI]; evI = (evI + 1) % NE;
    c.evt = evt; c.parfait = parfait; c.vers = ver; c.portes = cPortes; c.mines = cMines;
    E.emit('vol', c);
  }
  function ramasser(x, y) {
    var E = N.ev;
    if (!E || typeof E.emit !== 'function') return;
    var c = raP[raI]; raI = (raI + 1) % NR;
    c.type = 'cellule'; c.x = x; c.y = y; c.valeur = L_RAMASSAGE;
    E.emit('ramassage', c);
  }
  function son(nom, pitch) {
    var M = N.music;
    if (!M || typeof M.sfx !== 'function') return;
    if (pitch < 0) { M.sfx(nom); return; }
    var o = sfP[sfI]; sfI = (sfI + 1) % NS;
    o.pitch = pitch;
    M.sfx(nom, o);
  }

  /* ---- le hasard : le flux 'vol' de la partie ; un repli congruentiel si N.rng manque (essai seul) ---- */
  var FB = null;
  function flux() {
    var F = null;
    if (typeof N.rng === 'function') { try { F = N.rng('vol'); } catch (e) { F = null; } }
    if (F && typeof F.f === 'function' && typeof F.r === 'function' && typeof F.i === 'function') return F;
    if (!FB) {
      var s = 2975;
      FB = {
        f: function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; },
        r: function (a, b) { return a + (b - a) * FB.f(); },
        i: function (a, b) { return a + ((FB.f() * (b - a + 1)) | 0); }
      };
    }
    return FB;
  }

  /* ---- la géométrie de l'écran : relue à chaque image, entière ---- */
  function geom() {
    G = N.gfx;
    W = (G && G.W) ? (G.W | 0) : 422; H = (G && G.H) ? (G.H | 0) : 195;
    cx = W >> 1;
    hor = Math.round(D.horizon * H);
    sol0 = Math.round(L_SOL0 * H);
    xmin = Math.ceil(D.cx0 * W); xmax = Math.floor(D.cx1 * W);          // le cadre, arrondi vers l'intérieur
    ymin = Math.ceil(D.cy0 * H); ymax = Math.floor(D.cy1 * H);
  }

  /* ---- l'itinéraire parfait ---- */
  function cheminA(tt, out) {
    var j = 0;
    while (j < nWp - 2 && tt > wt[j + 1]) j++;
    var a = wt[j], b = wt[j + 1], f = b > a ? (tt - a) / (b - a) : 1;
    if (f < 0) f = 0; else if (f > 1) f = 1;
    out.x = wx[j] + (wx[j + 1] - wx[j]) * f;
    out.y = wy[j] + (wy[j + 1] - wy[j]) * f;
    return out;
  }

  /* ---- la disposition ---- */
  function ajouter(k, tcv, x, y, r) {
    var i = nObj++;
    kind[i] = k; st[i] = 0; ray[i] = r; tc[i] = tcv; ox[i] = x - cx; oy[i] = y - hor;
    var tv = tcv - (r * D.Z0 - D.Z0) / D.V;        // premier instant où ⌊r0 × Z0 / z⌋ ≥ 1
    vu[i] = tv > 0 ? tv : 0;
    return i;
  }
  function trier() {
    for (var i = 0; i < nObj; i++) ord[i] = i;
    for (var a = 1; a < nObj; a++) {
      var v = ord[a], tv = tc[v], j = a - 1;
      while (j >= 0 && tc[ord[j]] < tv) { ord[j + 1] = ord[j]; j--; }
      ord[j + 1] = v;
    }
  }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function borne(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* Vrai si l'objet j (contact tcj, centre (xj, yj) à la profondeur de la tête, rayon rj) peut cacher, pendant les 1,15 s
     qui précèdent de 0,2 s le contact de l'objet i, le point (xi, yi) de celui-ci : son centre, ou le centre de son ombre.
     Seuls les objets plus proches que i (profondeur plus petite) le cachent. Les deux sont projetés à chaque instant.
     Ne vaut que pour des disques pleins (mines, cellules) : une porte est un anneau, on voit à travers. */
  function cache(tcj, xj, yj, rj, tci, xi, yi) {
    for (var ts = tci - 1.35; ts <= tci - 0.2; ts += 0.05) {
      var zi = D.Z0 + D.V * (tci - ts), zj = D.Z0 + D.V * (tcj - ts);
      if (zj >= zi || zj < L_ZMIN) continue;
      var ki = D.Z0 / zi, kj = D.Z0 / zj;
      var dx = kj * (xj - cx) - ki * (xi - cx), dy = kj * (yj - hor) - ki * (yi - hor);
      var rr = ((rj * kj) | 0) + 2;
      if (dx * dx + dy * dy <= rr * rr) return true;
    }
    return false;
  }

  function mineOK(tm, mx, my, ecart, rm, strict) {
    var e2 = ecart * ecart, p, i;
    for (p = -1; p <= 1; p++) {                    // l'itinéraire un peu avant, pendant, un peu après
      cheminA(tm + p * 0.1, PT);
      if (dist2(mx, my, PT.x, PT.y) < e2) return false;
    }
    for (i = 0; i < nObj; i++) {
      var dt = tc[i] - tm; if (dt < 0) dt = -dt;
      if (kind[i] === KP) {
        if (dt < 0.12) { var lp = ray[i] + rm + 4; if (dist2(mx, my, cx + ox[i], hor + oy[i]) < lp * lp) return false; }
      } else if (kind[i] === KM) {
        if (dt < 0.25 && dist2(mx, my, cx + ox[i], hor + oy[i]) < 4900) return false;     // 70 px entre deux mines voisines
      }
      var xj = cx + ox[i], yj = hor + oy[i];
      if (!strict || kind[i] !== KM) continue;
      var rj = ray[i] + (ray[i] >> 1) + 1, rn = rm + (rm >> 1) + 1;               // les piques d'une mine comptent
      if (tc[i] < tm) {                                      // plus proche : peut cacher la nouvelle mine ou son ombre
        if (cache(tc[i], xj, yj, rj, tm, mx, my) || cache(tc[i], xj, yj, rj, tm, mx, sol0)) return false;
      } else if (cache(tm, mx, my, rn, tc[i], xj, yj) || cache(tm, mx, my, rn, tc[i], xj, sol0)) return false;   // plus loin : la nouvelle peut cacher l'ancienne
    }
    return true;
  }

  function placerMine(F) {
    var tmin = D.balayage + D.ombre + L_MARGE_VISIBLE;      // vue de poursuite entière, 1,2 s + marge avant le contact
    var tmax = D.duree - D.balayage - 0.3;
    var rm = D.rMine, ecart = rm * L_MINE_TOUCHE + L_TETE_TOUCHE + L_ECART_MINE;
    // l'ombre au sol doit se détacher de la mine dès 1,2 s avant le contact : sa rangée (sol0) est plus basse que celle
    // de la mine, à cette profondeur, d'au moins le rayon projeté + son contour + 2 rangées
    var k12 = D.Z0 / (D.Z0 + D.V * D.ombre), ymaxM = sol0 - (Math.ceil((((rm * k12) | 0) + 2) / k12) + 2);
    if (ymaxM > ymax) ymaxM = ymax;
    if (ymaxM < ymin + 20) ymaxM = ymin + 20;
    for (var essai = 0; essai < 600; essai++) {             // d'abord toutes les règles ; au-delà de 480 essais, sans la règle des occlusions
      var tm = F.r(tmin, tmax);
      cheminA(tm, PT);
      var mx, my;
      if (F.f() < 0.7) {                                    // une mine qui serre l'itinéraire : on la voit venir
        mx = PT.x + (F.f() < 0.5 ? -1 : 1) * F.r(ecart, ecart + 60); my = PT.y + F.r(-30, 30);
      } else { mx = F.r(xmin, xmax); my = F.r(ymin, ymaxM); }
      mx = borne(mx, xmin, xmax); my = borne(my, ymin, ymaxM);
      if (!mineOK(tm, mx, my, ecart, rm, essai < 480)) continue;
      if (essai >= 480) nRepli++;
      ajouter(KM, tm, mx, my, rm);
      return;
    }
    // repli : l'heure la moins chargée, du côté du cadre le plus éloigné de l'itinéraire
    nRepli++;
    var tf = tmin + (nObj % 5) * 0.3;
    if (tf > tmax) tf = tmax;
    cheminA(tf, PT);
    ajouter(KM, tf, PT.x > cx ? xmin : xmax, borne(PT.y, ymin, ymaxM), rm);
  }

  function celluleOK(tcc, x, y, rm) {
    for (var i = 0; i < nObj; i++) {
      var dt = tc[i] - tcc; if (dt < 0) dt = -dt;
      var px = cx + ox[i], py = hor + oy[i];
      if (kind[i] === KM) {
        if (dt < 0.14) { var lm = rm + L_CELLULE + 5; if (dist2(x, y, px, py) < lm * lm) return false; }
        if (tcc < tc[i] && (cache(tcc, x, y, L_CELLULE, tc[i], px, py) || cache(tcc, x, y, L_CELLULE, tc[i], px, sol0))) return false;
      } else if (kind[i] === KP) {
        if (dt < 0.12) {
          var d = Math.sqrt(dist2(x, y, px, py));
          if (d > ray[i] - 14 && d < ray[i] + L_CELLULE + 3) return false;      // ni sur l'anneau, ni collée à lui
        }
      } else if (dt < 0.07 && dist2(x, y, px, py) < 196) return false;
    }
    return true;
  }

  function placerTrain(F, nb, rm) {
    var tmax = D.duree - D.balayage - 0.25 - (nb - 1) * 0.12, tmin = 0.8, c, i;
    for (var essai = 0; essai < 40; essai++) {
      var t0 = F.r(tmin, tmax);
      var A = essai < 30 ? F.r(0, 40) : 0, B = essai < 30 ? F.r(0, 14) : 0, ph = F.r(0, 6.283);   // la houle : certaines cellules demandent un détour
      var ok = true;
      for (c = 0; c < nb; c++) {
        var tcc = t0 + c * 0.12;
        cheminA(tcc, PT);
        var s = ph + c * 0.9;
        var x = borne(PT.x + A * Math.sin(s), xmin, xmax), y = borne(PT.y + B * Math.cos(s), ymin, ymax);
        if (!celluleOK(tcc, x, y, rm)) { ok = false; break; }
        TT[c] = tcc; TX[c] = x; TY[c] = y;
      }
      if (ok) { for (i = 0; i < nb; i++) ajouter(KC, TT[i], TX[i], TY[i], L_CELLULE); return; }
    }
    // repli : sur l'itinéraire, à la première heure libre
    for (var t1 = tmin; t1 <= tmax + 1e-6; t1 += 0.05) {
      var libre = true;
      for (c = 0; c < nb; c++) {
        cheminA(t1 + c * 0.12, PT);
        if (!celluleOK(t1 + c * 0.12, PT.x, PT.y, rm)) { libre = false; break; }
      }
      if (libre) { for (i = 0; i < nb; i++) { cheminA(t1 + i * 0.12, PT); ajouter(KC, t1 + i * 0.12, PT.x, PT.y, L_CELLULE); } return; }
    }
    for (i = 0; i < nb; i++) { cheminA(1 + i * 0.12, PT); ajouter(KC, 1 + i * 0.12, PT.x, PT.y, L_CELLULE); }
  }

  function generer() {
    var F = flux(), g, m;
    nObj = 0; nRepli = 0;
    nG = D.nPorte;
    nM = (ver === 'coeur') ? D.nMineCoeur : D.nMine;
    if (nM > 12) nM = 12;
    nC = D.nCell; if (nC > 30) nC = 30;
    wt[0] = 0; wx[0] = Q[HX]; wy[0] = Q[HY]; nWp = nG + 1;
    // les portes, sur l'itinéraire : chaque centre est à portée de la manche depuis le précédent
    var tg0 = 0.85 + F.r(0, 0.10), tfin = D.duree - D.balayage - 0.25;
    var sp = nG > 1 ? (tfin - tg0) / (nG - 1) : 0;
    var dirx = F.f() < 0.5 ? -1 : 1, dmaxv = D.vitesse * L_ROUTE;
    var RP = D.rayonPorte;
    for (g = 1; g <= nG; g++) {
      var tgi = tg0 + (g - 1) * sp + F.r(-0.03, 0.03);
      if (tgi < wt[g - 1] + 0.2) tgi = wt[g - 1] + 0.2;
      var dm = dmaxv * (tgi - wt[g - 1]);
      if (F.f() < 0.7) dirx = -dirx;
      var ddx = dirx * F.r(0.5, 1) * dm, rest = dm * dm - ddx * ddx;
      var ddy = F.r(-1, 1) * Math.sqrt(rest > 0 ? rest : 0);
      var gx = wx[g - 1] + ddx, gy = wy[g - 1] + ddy;
      if (gx < xmin) { gx = xmin; dirx = 1; } else if (gx > xmax) { gx = xmax; dirx = -1; }
      gy = borne(gy, ymin, ymax);
      wt[g] = tgi; wx[g] = gx; wy[g] = gy;
      var kr = F.i(0, 3);
      ajouter(KP, tgi, gx, gy, kr === 2 ? RP - 2 : (kr === 3 ? RP - 4 : RP));
    }
    for (m = 0; m < nM; m++) placerMine(F);
    var reste = nC;
    while (reste > 0) { var nb = reste > 6 ? 6 : reste; placerTrain(F, nb, D.rMine); reste -= nb; }
    trier();
  }

  /* ---- les tampons des balayages ---- */
  function copie(dst) {
    if (G && typeof G.copyTo === 'function') return G.copyTo(dst);
    var b = G && G.buf ? G.buf() : null;
    if (!b) return dst;
    if (!dst || dst.length !== b.length) dst = new Uint8Array(b.length);
    dst.set(b);
    return dst;
  }
  function melange(src, p) {
    if (!(p > 0) || !src) return;
    if (G && typeof G.mixBayer === 'function') { G.mixBayer(src, p); return; }
    var b = G.buf();
    if (!b || src.length !== b.length) return;
    if (p >= 1) { b.set(src); return; }
    var BA = N.pal.BAYER, lim = p * 16, q;
    for (q = 0; q < 16; q++) PAT[q] = lim > BA[q] ? 1 : 0;       // la même règle que N.pal.dither(x, y, p)
    for (var y = 0, o = 0; y < H; y++) {
      var base = (y & 3) << 2;
      for (var x = 0; x < W; x++, o++) if (PAT[base | (x & 3)]) b[o] = src[o];
    }
  }

  /* ---- la tête : le sprite tete:dos si 40-sprites le fournit, sinon un repli procédural ---- */
  function spriteOK(s) { return !!(s && s.w > 0 && s.h > 0 && s.data && s.data.length === s.w * s.h); }
  function chercherTete() {
    spr0 = spr1 = null;
    var S = N.spr;
    if (!S || typeof S.get !== 'function' || typeof S.catalogue !== 'function') return;
    try {
      var a = S.get('tete:dos', 0, 0), b = S.get('tete:dos', 0, 1);
      if (spriteOK(a)) { spr0 = a; spr1 = spriteOK(b) ? b : a; }
    } catch (e) { spr0 = spr1 = null; }
  }

  /* ---- start ---- */
  function quartierOK(q, def) {
    if (typeof q !== 'string') return def;
    var l = N.ids && N.ids.quartiers;
    return (!l || l.indexOf(q) >= 0) ? q : def;
  }

  function start(depuis, vers) {
    lire(); couleurs(); geom();
    chercherTete();
    dep = quartierOK(depuis, 'docks'); ver = quartierOK(vers, 'artere');
    Q[T] = 0; Q[TP] = 0; Q[AV] = 0; AVN = D.V;
    cPortes = 0; cMines = 0; cCell = 0; chaine = 0;
    Q[HX] = cx; Q[HY] = borne(Math.round(0.72 * H), ymin, ymax); Q[HPX] = Q[HX]; Q[HPY] = Q[HY];
    var k;
    for (k = 0; k < NA; k++) { bX[k] = Q[HX] - cx; bY[k] = Q[HY] - hor; }
    for (k = 0; k < NB; k++) eOn[k] = 0;
    RES.portes = 0; RES.mines = 0; RES.parfait = false;
    destPret = false; snapOK = false;
    generer();
    if (G && typeof G.buf === 'function' && G.buf()) {          // la dernière image du jeu, pour le balayage d'entrée
      snap = copie(snap); snapW = W; snapH = H; snapOK = !!snap;
    }
    phase = 1;
    publierVol();
    emettre('debut', false);
    son('travelling', -1);                                       // le souffle qui monte
  }

  /* ---- la coupe d'une mine : un quart de la longueur, 8 segments au moins restent ---- */
  function longueur() {
    var J = N.joueuse;
    if (J && typeof J.len === 'function') return J.len() | 0;
    var P = N.S && N.S.player;
    return (P && typeof P.len === 'number') ? (P.len | 0) : 0;
  }
  function toucherMine() {                                       // -> true si la mine compte, false si le coup est absorbé
    var J = N.joueuse;
    if (!J || typeof J.couper !== 'function') return true;
    var L = longueur();
    if (L <= 0) return true;
    var k = L - Math.floor(L * D.coupe);
    if (k < D.longMin) k = D.longMin;
    if (k >= L) return true;                                     // rien à couper : la chaîne tombe quand même
    return J.couper(k, SRC_VOL) !== false;
  }

  function eclat(x, y, k, r) {
    var j = eI; eI = (eI + 1) % NB;
    eX[j] = Math.round(x); eY[j] = Math.round(y); eT0[j] = Q[T]; eK[j] = k; eR[j] = r > 255 ? 255 : r; eOn[j] = 1;
  }

  /* ---- ce qui se passe quand un objet franchit le plan de la tête ---- */
  function resoudre(i) {
    var t = Q[T], tprev = Q[TP], hx = Q[HX], hy = Q[HY], hpx = Q[HPX], hpy = Q[HPY];
    var f = 1, span = t - tprev;
    if (span > 1e-12) { f = (tc[i] - tprev) / span; if (f < 0) f = 0; else if (f > 1) f = 1; }
    var qx = hpx + (hx - hpx) * f, qy = hpy + (hy - hpy) * f;     // la tête à l'instant exact du contact
    var ax = cx + ox[i], ay = hor + oy[i];
    var d2 = dist2(qx, qy, ax, ay), lim;
    if (kind[i] === KC) {
      if (d2 <= L_PRISE * L_PRISE) {
        st[i] = 1; cCell++; eclat(ax, ay, 1, 3);
        ramasser(ax, ay);
      } else st[i] = 2;
    } else if (kind[i] === KP) {
      lim = ray[i] - L_PORTE_MARGE;
      if (d2 <= lim * lim) {
        st[i] = 1; cPortes++; chaine++;
        eclat(ax, ay, 0, ray[i]);
        son('porte', chaine - 1);                                // une note de plus à chaque porte enchaînée
        emettre('porte', false);
      } else { st[i] = 2; chaine = 0; }
    } else {
      lim = ray[i] * L_MINE_TOUCHE + L_TETE_TOUCHE;
      if (d2 <= lim * lim) {
        st[i] = 1;
        if (toucherMine()) {
          cMines++;
          eclat(ax, ay, 2, 6);
          son('coupe', -1);
          emettre('mine', false);
        } else eclat(ax, ay, 3, 8);                              // absorbé (BOUCLIER, TRAVERSÉE) : ni coupe ni mine comptée
      } else st[i] = 2;
    }
  }

  function finir() {
    phase = 0;                                                   // actif() est faux pendant les consommateurs de `fin`
    var parfait = (cPortes >= nG && cMines === 0);
    RES.portes = cPortes; RES.mines = cMines; RES.parfait = parfait;
    emettre('fin', parfait);
  }

  /* ---- update : la manche, le fouet du corps, le sol, les contacts ---- */
  function update(dt) {
    if (!phase) return;
    dt = +dt;
    if (!(dt > 0)) return;
    geom();
    var t = Q[T] + dt, hx = Q[HX], hy = Q[HY];
    Q[TP] = Q[T]; Q[T] = t;
    Q[HPX] = hx; Q[HPY] = hy;
    // la manche, sans inertie : direction × course, à 140 px/s
    var S = N.S, inp = S && S.input, vx = 0, vy = 0;
    if (inp) {
      var ix = +inp.x || 0, iy = +inp.y || 0, mg = (typeof inp.mag === 'number') ? inp.mag : ((ix || iy) ? 1 : 0);
      if (!(mg > 0)) mg = 0; else if (mg > 1) mg = 1;
      vx = ix * mg; vy = iy * mg;
      var l2 = vx * vx + vy * vy;
      if (l2 > 1) { var l = Math.sqrt(l2); vx /= l; vy /= l; }
    }
    hx = borne(hx + vx * D.vitesse * dt, xmin, xmax);
    hy = borne(hy + vy * D.vitesse * dt, ymin, ymax);
    Q[HX] = hx; Q[HY] = hy;
    // le corps : chaque anneau suit le précédent avec un retard (les positions sont relatives au point de fuite)
    var a = 1 - Math.exp(-dt / L_CORPS_TAU), px = hx - cx, py = hy - hor;
    for (var k = 0; k < NA; k++) {
      bX[k] += (px - bX[k]) * a; bY[k] += (py - bY[k]) * a;
      px = bX[k]; py = bY[k];
    }
    Q[AV] += dt * AVN;
    // les contacts, dans l'ordre du temps (ord va du plus loin au plus proche)
    for (var q = nObj - 1; q >= 0; q--) {
      var i = ord[q];
      if (st[i] === 0 && tc[i] <= t) resoudre(i);
    }
    if (t + 1e-9 >= D.duree) finir();
    publierVol();
  }

  /* ================================ le dessin ================================ */
  /* Le propriétaire des pixels posés ensuite (masque de test de N.gfx) : les trois formes qui écrivent dans le tampon
     (losange, lentille, tête à l'échelle 2) tiennent le masque elles-mêmes, les autres passent par N.gfx. */
  var curOwn = 0, mk = null, BAY = null;
  function own(c) { curOwn = c; if (G.owner) G.owner(c); }

  function losange(x, y, r, c) {                                 // un losange de rayon entier, plein
    var b = G.buf(), y0 = y - r, y1 = y + r;
    if (y0 < 0) y0 = 0;
    if (y1 > H - 1) y1 = H - 1;
    for (var yy = y0; yy <= y1; yy++) {
      var w = r - (yy < y ? y - yy : yy - y), xa = x - w, xb = x + w;
      if (xb < 0 || xa > W - 1) continue;
      if (xa < 0) xa = 0;
      if (xb > W - 1) xb = W - 1;
      var o = yy * W;
      b.fill(c, o + xa, o + xb + 1);
      if (mk) mk.fill(curOwn, o + xa, o + xb + 1);
    }
  }
  function lentille(x, y, rs, c, tr) {                           // ombre au sol : un losange aplati, tramé si tr < 1
    var b = G.buf(), ry = rs >> 2, lim = tr * 16;
    if (ry > 4) ry = 4;
    for (var dy = -ry; dy <= ry; dy++) {
      var yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      var ad = dy < 0 ? -dy : dy, w = rs - (((rs * ad) / (ry + 1)) | 0), xa = x - w, xb = x + w;
      if (xb < 0 || xa > W - 1) continue;
      if (xa < 0) xa = 0;
      if (xb > W - 1) xb = W - 1;
      var o = yy * W;
      if (tr >= 1) {
        b.fill(c, o + xa, o + xb + 1);
        if (mk) mk.fill(curOwn, o + xa, o + xb + 1);
      } else {
        for (var xx = xa; xx <= xb; xx++) if (lim > BAY[((yy & 3) << 2) | (xx & 3)]) { b[o + xx] = c; if (mk) mk[o + xx] = curOwn; }
      }
    }
  }
  function blitEchelle(s, x0, y0, k) {                           // un sprite à l'échelle entière k (2 pour la tête)
    var b = G.buf(), w = s.w, h = s.h, d = s.data;
    for (var yy = 0; yy < h; yy++) {
      for (var xx = 0; xx < w; xx++) {
        var v = d[yy * w + xx];
        if (!v) continue;
        v &= 15;
        for (var dy = 0; dy < k; dy++) {
          var Y = y0 + yy * k + dy;
          if (Y < 0 || Y >= H) continue;
          for (var dx = 0; dx < k; dx++) {
            var X = x0 + xx * k + dx;
            if (X >= 0 && X < W) { b[Y * W + X] = v; if (mk) mk[Y * W + X] = curOwn; }
          }
        }
      }
    }
  }

  function fondRepli() {                                         // aplat nuit, sol de lignes violettes (sans N.decor)
    G.rect(0, 0, W, hor, cNuit);
    G.rect(0, hor, W, H - hor, cVide);
    var den = sol0 - hor; if (den < 1) den = 1;
    var sc = (H - 1 - hor) / den, k, j;
    for (k = -9; k <= 9; k++) G.line(cx, hor, cx + Math.round(k * 32 * sc), H - 1, cViolet);
    var fr = Q[AV] % D.pas;                                     // profondeur déjà parcourue dans la case courante
    for (j = 0; j < 26; j++) {
      var z = (j + 1) * D.pas - fr, y = hor + Math.round(den * D.Z0 / z);
      if (y < H) G.line(0, y, W - 1, y, cViolet);
    }
  }
  function fond() {
    var d = N.decor;
    if (d && typeof d.drawVol === 'function') {
      var t = Q[T];
      DV.horizon = hor; DV.sol0 = sol0; DV.avance = L_AVANCE_PX ? Q[AV] : Q[AV] / D.pas; DV.depuis = dep; DV.vers = ver;
      DV.montee = t >= 2 ? 1 : t * 0.5;
      d.drawVol(DV);
    } else fondRepli();
  }

  function preparerDestination() {                               // la vue de face du quartier d'arrivée, dans un second tampon
    var d = N.decor;
    G.rect(0, 0, W, H, cVide);
    if (d) {
      if (typeof d.fixer === 'function') d.fixer(ver, 'calme');          // sans balayage : la vue de face est entière dès cette image
      else {
        if (typeof d.quartier === 'function') d.quartier(ver);
        if (typeof d.etat === 'function') d.etat('calme');
      }
      if (typeof d.drawFar === 'function') d.drawFar(N.cam);
    }
    dest = copie(dest); destW = W; destH = H; destPret = true;
  }

  function dessinerOmbre(i) {                                    // l'ombre d'une mine : annoncée, puis clignotante au dernier moment
    var den = sol0 - hor;
    var t = Q[T], zz = D.Z0 + D.V * (tc[i] - t);
    if (zz < L_ZMIN) return;
    var k = D.Z0 / zz, rs = (L_OMBRE * ray[i] * k) | 0;
    if (rs < 1) return;
    var sx = cx + Math.round(ox[i] * k), sy = hor + Math.round(den * k);
    if (sx + rs < 0 || sx - rs >= W || sy >= H + 4) return;
    var reste = tc[i] - t, alerte = (reste > 0 && reste < 0.7 && (((t * 4) | 0) & 1)) ? cMagenta : cSang;
    lentille(sx, sy, rs, alerte, 1);
  }

  function dessinerObjet(i) {
    var kd = kind[i];
    if (st[i] === 1 && kd !== KP) return;                        // cellule prise, mine explosée : disparues
    var t = Q[T], zz = D.Z0 + D.V * (tc[i] - t);
    if (zz < L_ZMIN) return;
    var k = D.Z0 / zz, r = (ray[i] * k) | 0;
    if (r < 1) return;
    var sx = cx + Math.round(ox[i] * k), sy = hor + Math.round(oy[i] * k);
    if (sx + 2 * r < 0 || sx - 2 * r >= W || sy - 2 * r >= H) return;
    var c;
    if (kd === KC) {
      own(oButin);
      losange(sx, sy, r, cAmbre);
      if (r >= 4) losange(sx, sy, r - 3, cJaune);
    } else if (kd === KP) {
      own(oButin);
      var th = r >= 16 ? 3 : (r >= 8 ? 2 : 1);
      G.disc(sx, sy, r - th, r, st[i] === 1 ? cOs : cJaune);
      if (r >= 8) G.disc(sx, sy, r - th - 3, r - th - 2, cAmbre, 0.5);
    } else {
      own(oEffet);
      dessinerOmbre(i);                                          // l'ombre est au sol, sous la mine, au-dessus de ce qui est plus loin
      own(oEnnemi);
      if (r >= 3) {
        var sp = r + (r >> 1) + 1, dd = (sp * 0.7) | 0;
        G.line(sx - sp, sy, sx + sp, sy, cMagenta); G.line(sx, sy - sp, sx, sy + sp, cMagenta);
        G.line(sx - dd, sy - dd, sx + dd, sy + dd, cMagenta); G.line(sx - dd, sy + dd, sx + dd, sy - dd, cMagenta);
      }
      G.circ(sx, sy, r + 1, cNuitP);
      G.circ(sx, sy, r, cMagenta);
      if (r >= 3) { c = (((t * 4) | 0) & 1) ? cBrasier : cRose; G.circ(sx, sy, r >> 1, c); }
    }
  }

  function dessinerCorps() {
    var k;
    own(oCorps);
    for (k = NA - 1; k >= 0; k--) {                              // du plus loin au plus proche : rayons 5, 4, 3, 2, 1
      var rho = ANNEAUX[k], s = (rho + 0.5) / L_CORPS_R0;        // ⌊8 × s⌋ = rho
      var x = cx + Math.round(bX[k] * s), y = hor + Math.round(bY[k] * s);
      if (rho >= 3) G.circ(x, y, rho - 1, cNuitP);
      if (rho >= 2) G.disc(x, y, rho - 1, rho, cCyan); else G.circ(x, y, rho, cCyan);
    }
  }

  function dessinerTete() {
    var t = Q[T], hxr = Math.round(Q[HX]), hyr = Math.round(Q[HY]);
    own(oCorps);
    lentille(hxr, sol0, 12, cNuitP, 0.75);                       // son ombre au sol
    own(oTete);
    var sp = (((t * 6) | 0) & 1) ? spr1 : spr0;
    if (sp) {
      G.circ(hxr, hyr, 12, cNuitP);
      blitEchelle(sp, hxr - ((sp.w * D.echelle) >> 1), hyr - ((sp.h * D.echelle) >> 1), D.echelle);
    } else {
      G.circ(hxr, hyr, 13, cNuitP);
      G.circ(hxr, hyr, 12, cCyan);
      G.circ(hxr, hyr - 3, 7, cCyanP);
    }
  }

  function dessinerEclats() {
    own(oEffet);
    var t = Q[T];
    for (var j = 0; j < NB; j++) {
      if (!eOn[j]) continue;
      var kd = eK[j], dur = E_DUREE[kd], a = t - eT0[j];
      if (a >= dur) { eOn[j] = 0; continue; }
      var u = a / dur, tr = 1 - u, x = eX[j], y = eY[j], rad;
      if (kd === 0) {                                            // porte : l'anneau s'élargit et s'éteint
        rad = eR[j] + ((16 * u) | 0);
        G.disc(x, y, rad - 1, rad, cOs, tr);
        G.disc(x, y, rad - 5, rad - 4, cJaune, tr);
      } else if (kd === 1) {                                     // cellule : une étincelle
        rad = 3 + ((8 * u) | 0);
        G.disc(x, y, rad - 1, rad, cAmbre, tr);
      } else if (kd === 2) {                                     // mine touchée : brasier tramé, couronne d'os
        rad = 6 + ((26 * u) | 0);
        G.ditherCirc(x, y, rad, cBrasier, 1 - u * 0.6);
        G.disc(x, y, rad - 3, rad, cOs, tr);
        if (u < 0.5) G.circ(x, y, 6 - ((u * 8) | 0), cOs);
      } else {                                                   // coup absorbé
        rad = 8 + ((18 * u) | 0);
        G.disc(x, y, rad - 1, rad, cOs, tr);
      }
    }
  }

  function draw() {
    if (!phase) return;
    G = N.gfx;
    if (!G || typeof G.buf !== 'function' || !G.buf()) return;
    geom();
    if (typeof G.origin === 'function') G.origin(0, 0);
    mk = (typeof G.mask === 'function') ? G.mask() : null;
    BAY = N.pal.BAYER;
    var t = Q[T], tS = D.duree - D.balayage, i, q;
    if (t >= tS && !destPret) preparerDestination();
    fond();
    dessinerCorps();                                             // sous tous les objets : une menace n'est jamais cachée par la queue
    // Ce qui n'a pas encore croisé le plan de la tête, par couches : les portes (des anneaux, on voit à travers), les
    // cellules, puis les mines avec leur ombre, qui restent donc au-dessus : une menace n'est jamais cachée par un bord.
    // Dans chaque couche, du plus loin au plus proche. Puis la tête, puis ce qui l'a dépassée.
    for (var passe = 0; passe < 3; passe++) {
      var kd = passe === 0 ? KP : (passe === 1 ? KC : KM);
      for (q = 0; q < nObj; q++) {
        i = ord[q];
        if (tc[i] <= t) break;                                   // ord décroît en tc : le reste a dépassé la tête
        if (kind[i] === kd) dessinerObjet(i);
      }
    }
    dessinerTete();
    for (q = 0; q < nObj; q++) {
      i = ord[q];
      if (tc[i] <= t) dessinerObjet(i);
    }
    dessinerEclats();
    own(0);
    // les balayages de Bayer
    if (t < D.balayage) {
      if (snapOK && snapW === W && snapH === H) melange(snap, 1 - t / D.balayage);
    } else if (t >= tS) {
      if (destPret && destW === W && destH === H) melange(dest, (t - tS) / D.balayage);
    }
  }

  /* ---- S.vol (lot I) : LE VOL vu par les pilotes, au schéma `vol` de 03-socle.js ; null hors du VOL. Les objets en vol et déjà
     visibles (rayon projeté ≥ 1), du plus proche au plus loin, avec x, y = l'endroit où ils croiseront la tête (dans le repère de
     `tete`), z = leur profondeur actuelle, r = leur rayon dans le plan de la tête, avant = les secondes avant le croisement.
     Objets et tableau préalloués : aucune allocation par pas. ---- */
  var VOLS = { tete: { x: 0, y: 0 }, objets: [], reste: 0 }, VOLO = [], NOM_VOL = ['cellule', 'porte', 'mine'];
  for (var qv = 0; qv < MAXO; qv++) VOLO.push({ type: 'cellule', x: 0, y: 0, z: 0, r: 0, avant: 0 });
  function publierVol() {
    var s = N.S;
    if (!s) return;
    if (!phase) { if (s.vol) s.vol = null; return; }
    var t = Q[T], n = 0, q, i, o;
    VOLS.tete.x = Q[HX]; VOLS.tete.y = Q[HY];
    VOLS.reste = D.duree > t ? D.duree - t : 0;
    for (q = nObj - 1; q >= 0; q--) {
      i = ord[q];
      if (st[i] !== 0 || tc[i] <= t || vu[i] > t) continue;
      o = VOLO[n];
      o.type = NOM_VOL[kind[i]]; o.x = cx + ox[i]; o.y = hor + oy[i]; o.z = D.Z0 + D.V * (tc[i] - t); o.r = ray[i]; o.avant = tc[i] - t;
      VOLS.objets[n++] = o;
    }
    VOLS.objets.length = n;
    s.vol = VOLS;
  }

  /* ---- lecture seule, pour les pilotes et les bancs ---- */
  var ET = {
    actif: false, t: 0, hx: 0, hy: 0, cx: 0, hor: 0, sol0: 0, z0: 64, vz: 0,
    portes: 0, mines: 0, cellules: 0, nPortes: 0, nMines: 0, nCellules: 0,
    n: 0, replis: 0, kind: kind, st: st, ray: ray, tc: tc, ox: ox, oy: oy, vu: vu, ord: ord,
    KC: KC, KP: KP, KM: KM
  };
  function etat() {
    ET.actif = phase !== 0; ET.t = Q[T]; ET.hx = Q[HX]; ET.hy = Q[HY]; ET.cx = cx; ET.hor = hor; ET.sol0 = sol0;
    ET.z0 = D.Z0; ET.vz = D.V; ET.portes = cPortes; ET.mines = cMines; ET.cellules = cCell;
    ET.nPortes = nG; ET.nMines = nM; ET.nCellules = nC; ET.n = nObj; ET.replis = nRepli;
    return ET;
  }

  N.vol = {
    start: start,
    update: update,
    draw: draw,
    actif: function () { return phase !== 0; },
    resultat: function () {
      if (phase !== 0) { RES.portes = cPortes; RES.mines = cMines; RES.parfait = false; }
      return RES;
    },
    etat: etat,
    ligne: function (tt, out) { return cheminA(tt, out || PT); },
    annuler: function () { phase = 0; publierVol(); }
  };
})();
