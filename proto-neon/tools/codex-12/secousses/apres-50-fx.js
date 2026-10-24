/* ===== 50-fx.js — explosions, éclats, secousse, gel d'image, traînées =====

   EN GROS PIXELS, UNE EXPLOSION EST UNE FORME QUI S'ÉTEND ET SE TROUE, PAS UN FLOU. Tout se pose index
   par index dans le tampon de 10-gfx.js : aucune transparence, aucun dégradé interpolé, aucune couleur
   écrite ici (les seize viennent de N.pal). Une explosion se compose de :
     - un CŒUR qui blanchit en trois images (brasier, jaune, os) puis refroidit par la palette
       os → jaune → brasier → sang → vide. C'est un champ de température radial quantifié sur ces encres :
       des bandes concentriques, chaque frontière tramée par la matrice de Bayer, chaque bord bosselé par
       un bruit à gros grain ;
     - une boule qui se TROUE par le centre : le trou grandit plus vite qu'elle et la creuse en couronne,
       des trous en blocs la mitent, des brèches déchirées la cassent en arcs qui refroidissent ;
     - un ou deux ANNEAUX de choc tramés, partis l'un après l'autre, qui s'étendent, maigrissent et se
       PERCENT par secteurs (le bruit est angulaire : une brèche reste au même angle et s'élargit) ;
     - des ÉCLATS carrés lancés en ligne droite, freinés, avec une traînée qui refroidit d'un cran ;
       posés, ils restent au sol en ardoise de 3,2 à 4,4 s (recherche G-30, couleurs sombres) ;
     - des ÉTINCELLES d'un pixel, filées, qui traversent la boule et la dépassent.

   Interface imposée par CONTRAT.md :
     N.fx.boom(x,y,force,ci)  explosion en pixels de jeu ; force 0..1, GROSSE si force > 0,6 ; ci = encre de
                              ce qui meurt (un tiers des éclats la gardent). Secoue et chauffe l'écran
                              d'elle-même ; ne gèle PAS l'image (c'est au jeu d'appeler hitstop).
                              Rend 1 si l'explosion est pleine, 2 si le limiteur l'a atténuée, 3 s'il l'a
                              rapetissée sous le seuil de flash.
     N.fx.hitstop(n)          gèle n IMAGES : 2 pour un kill, 5 pour un gros, 8 à la mort (G-26 propose 6 à 10
                              pour le gros, 20 à 30 au coup final d'un boss). Plafond 30. Deux gels ne
                              s'additionnent jamais : pendant un gel, une demande ne peut que le porter à
                              « n images depuis son début ». L'image qui pose le gel n'est jamais gelée.
     N.fx.hitstopLeft()       images de gel restantes. 90-boot.js le lit UNE fois au début de chaque image,
                              avant S.frame++ : le gel est ancré sur S.frame, c'est donc l'avance des images
                              qui le décompte, et une lecture de plus ailleurs ne le consomme pas.
     N.fx.shake(a)            secousse en pixels de jeu, écrite dans N.S.shake (lu par 20-crt.js). Modèle à
                              trauma (G-27) : amplitude = M x trauma², le trauma monte à chaque coup et
                              redescend de 2,4 par seconde en temps réel, gel compris. Un appel garantit au moins
                              l'amplitude demandée, dans la limite M = 32 px CSS : 12 pixels de jeu à px = 2,
                              8 à px = 4, jamais moins de 7. Une grosse explosion pleine secoue au plafond ;
                              atténuée par le limiteur, 3 au plus.
     N.fx.update(dt), N.fx.draw()
     N.S.heat                 chaleur de l'écran 0..1 (halo de 20-crt.js), somme des explosions vivantes.

   LOT G (ajouts, REFONTE.md § 5.3, § 5.4, § 7.8). Les coordonnées de dessin sont celles du MONDE : draw() retranche l'origine de
  N.gfx (la caméra) ; drawEcran() et boom(…, {ecran:true}) travaillent en pixels du tampon.
     N.fx.boom(x,y,force,ci[,variante])  variante 'joueuse' : cœur os → cyan pâle → cyan → indigo, éclats cyan ; {ecran:true} : écran
     N.fx.ralenti(k,dur,{joueuse:false,visuel:true,long:true})  dur en secondes de temps RÉEL ; le plus lent gagne ; ralenti + gel
                              ne dépassent pas 0,5 s (sauf long) ; visuel : n'étire que les effets, pas l'horloge de jeu
     N.fx.k(), N.fx.kJoueuse() facteurs lus par N.horloge ; N.fx.kVisuel() le facteur des effets seuls
     N.fx.apres(sec,fn)       planificateur (avance avec fx.update, donc dans tous les états)
     N.fx.onde(x,y,r0,r1,ci,dur[,{epaisseur,ecran}])  un anneau tramé qui s'étend, maigrit et se troue
     N.fx.pickup(x,y), N.fx.lasso(poly,n), N.fx.glitch(force,dur), N.fx.vignette(angle,force)
     N.fx.desintegre(points,dur)  anneau cyan par point (plat [x,y,…] ou objets), étalés sur dur (0 : tous d'un coup)
     N.fx.tele(desc) / drawTele()  télégraphes au schéma du § 7.5 ; S.tele les liste (lot I : aujourd'hui S.tele est publié par 72-ennemis.js, qui dessine encore ses propres télégraphes et n'appelle pas N.fx.tele ; le jour où il l'appellera, c'est tele() qui publiera) ; gaine nuit profonde, rose pâle dans les 300 dernières ms
     N.fx.drawEcran()         explosions d'écran, vignette, glitch (à appeler après N.gfx.origin(0,0))

  Extras publiés, documentés pour 70-game.js :
     N.fx.hit(obj, aire)      FLASH DE FRAPPE : l'objet touché se dessine en os pendant UNE image (et pendant
                              le gel en cours s'il y en a un). Au plus 3 flashs par seconde pour un même objet
                              (WCAG, technique G19) ; aucun si les flashs sont coupés. Rend true s'il flashera.
                              obj est un objet du jeu (deux champs fxHitF/fxHitT y sont posés) ou un entier.
                              aire (pixels de jeu ; à défaut obj.w x obj.h, ou pi x obj.r²) : un objet plus
                              grand que le seuil de flash, le colosse par exemple, doit trouver une place
                              dans le limiteur, sinon il ne blanchit pas.
     N.fx.isHit(obj)          true si obj doit être dessiné en blanc à cette image. Usage :
                                N.gfx.blit(spr, x, y, N.fx.isHit(e) ? N.fx.HITOPT : null)
     N.fx.HIT, N.fx.HITOPT    l'index de os, et l'objet d'options {ci: os} prêt pour blit (jamais réalloué)
     N.fx.spark(x,y,dx,dy,n,ci)   n étincelles d'impact en éventail de ±60° autour de (dx,dy)
     N.fx.trail(x0,y0,x1,y1,ci)   traînée fixe, de l'ancienne position à la nouvelle, qui s'éclaircit au tramage
                              et disparaît en 0,15 s (derrière un tir, un dash) ; un appel par image suffit
     N.fx.flashGate(aire[, {type,ci}])  LE LIMITEUR, pour les autres modules (ci = index de crête) :
                              true si un flash de cette aire (pixels de jeu) est permis maintenant, et il est
                              alors compté ; false : dessine une version sans éclair.
     N.fx.setShake(k)         réglage joueuse 0 / 0,5 / 1 (prime sur prefers-reduced-motion, recherche V-22)
     N.fx.setFlash(b)         réglage joueuse : false = aucun blanc dans les explosions, aucune au-dessus de la
                              moitié du seuil (les grosses sont atténuées), aucun flash de frappe
     N.fx.frozen()            true si l'image en cours est gelée
     N.fx.reset()             vide explosions, particules, gel et secousse, ressème le hasard local sur N.S.seed ;
                              le journal du limiteur de flashs, lui, n'est jamais effacé
     N.fx.stats               vivantes, pic, explosions, pleines, atténuées, flashs comptés, seuil

   LE LIMITEUR DE FLASHS (WCAG 2.3.1, DIRECTION.md critère 4, recherche V-19 et G-29). Un flash est une hausse
   puis une baisse de luminance d'au moins 0,1, ou une transition vers un rouge saturé : brasier, sang et
   magenta en sont. Le seuil d'aire est le plus strict de deux lectures : 21 824 px CSS² (25 % d'un champ de
   10°, soit 5 456 pixels de jeu à px = 2 et 1 364 à px = 4) et 6,6 % du tampon. Dans toute fenêtre glissante
   d'une seconde, au plus TROIS explosions dépassant ce seuil sont pleines, dont deux moyennes au plus (la
   troisième place reste à une grosse). Au-delà, une grosse est atténuée : anneaux sans aplat, pas de cœur
   blanc, secousse de 3 pixels au plus ; une moyenne est rapetissée juste sous le seuil (ce n'est plus un
   flash, elle garde son aplat). Des explosions parties pendant la même image
   forment un seul flash (WCAG compte l'aire combinée des flashs simultanés) : une seule énorme explosion,
   même faite de plusieurs, reste permise ; c'est la répétition qui est dangereuse. Chaque pixel de la boule
   ne monte qu'une fois et ne descend qu'une fois (température unimodale, érosion monotone, Bayer monotone) :
   une explosion pleine vaut un flash, pas un stroboscope. L'horloge du limiteur est celle du jeu : pendant
   un gel elle ralentit, ce qui allonge la fenêtre réelle (prudent).

   BUDGET. 400 particules vivantes au plus (éclats, étincelles, débris, traînées), 24 explosions, tout
   préalloué en tableaux typés et recyclé ; quand tout est plein, c'est le débris le plus vieux qui cède,
   puis la traînée, puis l'étincelle ; un éclat neuf prend au pire la place de l'éclat le plus avancé.
   Aucune allocation par image. Les pixels sont écrits directement
   dans le tampon d'index de N.gfx.buf(), bornes vérifiées : c'est la cible de rendu commune.

   Rien ici ne lit l'horloge (le temps arrive par dt), rien n'écrit de couleur (N.pal), et le générateur
   partagé N.rnd n'est jamais consommé : le hasard des effets a son propre générateur à graine, pour que
   le nombre d'images par seconde ne change jamais la suite des apparitions du jeu. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ---------------- réglages ---------------- */
  var CAP = 400;              /* particules vivantes au plus */
  var NEX = 24;               /* explosions simultanées au plus */
  var SHMAX = 12;             /* secousse à trauma = 1, pixels de jeu, plafonnée à SH_CSS px CSS */
  var SH_CSS = 32;            /* une secousse se juge en angle visuel : 32 px CSS = 8 pixels de jeu à px = 4 */
  var SH_ATT = 3;             /* une explosion atténuée par le limiteur ne secoue pas plus que ça */
  var TDECAY = 2.4;           /* perte de trauma par seconde, en temps réel, gel compris */
  var HS_SLOW = 0.08;         /* 90-boot.js multiplie dt par 0,08 pendant un gel */
  var HS_MAX = 30;            /* plafond d'un gel, images */
  var FL_WIN = 1.0;           /* fenêtre glissante du limiteur, secondes */
  var FL_MAX = 3;             /* flashs permis par fenêtre */
  var FL_BURST = 0.05;        /* borne de regroupement en simulation ; même image obligatoire */
  var FL_CSS = 21824;         /* px CSS², 25 % de 341 x 256 (WCAG G176) */
  var FL_FRAC = 0.066;        /* DIRECTION.md, critère 4 */
  if (N.R && N.R.lisibiliteP10) {
    var FL_R = N.R.lisibiliteP10.flash;
    FL_WIN = FL_R.fenetre; FL_MAX = FL_R.max; FL_BURST = FL_R.rafale;
    FL_CSS = FL_R.aireCSS; FL_FRAC = FL_R.aire;
  }
  var HIT_GAP = 0.34;         /* un flash de frappe par objet tous les 0,34 s au plus */

  /* champ de température de la couronne : T = Tp (1 - K1 s²) + bruit + Bayer, puis seuils d'encre ;
     s va de 0 au bord intérieur (le plus chaud) à 1 au bord extérieur */
  var K1 = 0.80, TN = 0.10, DW = 0.15;
  var T_OS = 0.90, T_JA = 0.69, T_BR = 0.42, T_SA = 0.21;

  /* ---------------- palette, résolue par nom ---------------- */
  var VIDE = 0, NUIT = 1, ARD = 2, INDIGO = 4, MAG = 5, ROSE = 6, CYAN = 7, CYANP = 8,
    AMBRE = 9, JAUNE = 10, BRAS = 11, OS = 12, SANG = 14, NP = 15;
  var BAY = new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
  var BO = new Float32Array(16);           /* décalage de Bayer en unités de température */
  function palInit() {
    var P = N.pal;
    if (P && P.i) {
      VIDE = P.i('vide'); NUIT = P.i('nuit'); ARD = P.i('ardoise'); INDIGO = P.i('indigo');
      MAG = P.i('magenta'); ROSE = P.i('rosePale'); CYAN = P.i('cyan'); CYANP = P.i('cyanPale');
      AMBRE = P.i('ambre'); JAUNE = P.i('jaune'); BRAS = P.i('brasier'); OS = P.i('os'); SANG = P.i('sang'); NP = P.i('nuitProfonde');
      if (P.BAYER && P.BAYER.length === 16) for (var k = 0; k < 16; k++) BAY[k] = P.BAYER[k];
    }
    for (var j = 0; j < 16; j++) BO[j] = (BAY[j] - 7.5) / 16 * DW;
  }
  palInit();

  /* ---------------- hasard local, à graine ---------------- */
  var rs = 2975;
  function rnd() { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; }

  /* ---------------- bruits précalculés ----------------
     NZ : bruit de valeur 2D 128 x 128 raccordable, trois octaves (16, 8, 4 px), égalisé en rang pour que
          « n < 0,3 » couvre vraiment 30 % des pixels. Il bosselle les bords et creuse les trous en blocs.
     AN : bruit angulaire 1D de 256 cases sur un tour, pour percer les anneaux par secteurs. */
  var NS = 128, NM = 127, NZ = new Float32Array(NS * NS), AN = new Float32Array(256);
  function hsh(i, j, s) {
    var v = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(s + 1, 0x9e3779b1);
    v ^= v >>> 15; v = Math.imul(v, 0x85ebca6b); v ^= v >>> 13; v = Math.imul(v, 0xc2b2ae35); v ^= v >>> 16;
    return (v >>> 0) / 4294967296;
  }
  function equalize(a) {
    var NB = 1024, hist = new Uint32Array(NB), n = a.length, i, lo = Infinity, hi = -Infinity;
    for (i = 0; i < n; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }
    var sp = hi > lo ? (NB - 1) / (hi - lo) : 0;
    for (i = 0; i < n; i++) hist[((a[i] - lo) * sp) | 0]++;
    var cdf = new Float32Array(NB), acc = 0;
    for (i = 0; i < NB; i++) { cdf[i] = (acc + hist[i] * 0.5) / n; acc += hist[i]; }
    for (i = 0; i < n; i++) a[i] = cdf[((a[i] - lo) * sp) | 0];
  }
  (function bruit() {
    function oct(C, s, w) {
      var G = NS / C;
      for (var y = 0; y < NS; y++) {
        var gy = y / C, iy = gy | 0, fy = gy - iy; fy = fy * fy * (3 - 2 * fy);
        var y0 = iy % G, y1 = (iy + 1) % G;
        for (var x = 0; x < NS; x++) {
          var gx = x / C, ix = gx | 0, fx = gx - ix; fx = fx * fx * (3 - 2 * fx);
          var x0 = ix % G, x1 = (ix + 1) % G;
          var a = hsh(x0, y0, s), b = hsh(x1, y0, s), c = hsh(x0, y1, s), d = hsh(x1, y1, s);
          NZ[y * NS + x] += w * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
        }
      }
    }
    oct(16, 1, 0.60); oct(8, 2, 0.28); oct(4, 3, 0.12);
    equalize(NZ);
    for (var o = 0; o < 2; o++) {
      var C = o ? 8 : 24, w = o ? 0.35 : 0.65, G = 256 / C;
      for (var k = 0; k < 256; k++) {
        var g = k / C, ik = g | 0, f = g - ik; f = f * f * (3 - 2 * f);
        var a = hsh(ik % G, 7, 11 + o), b = hsh((ik + 1) % G, 7, 11 + o);
        AN[k] += w * (a + (b - a) * f);
      }
    }
    equalize(AN);
  })();

  /* angle « en losange » 0..4 sur un tour, monotone : pas d'atan2 dans les boucles de pixels */
  function dang(dx, dy) {
    if (dy >= 0) return dx >= 0 ? dy / (dx + dy + 1e-9) : 1 - dx / (dy - dx);
    return dx < 0 ? 2 - dy / (-dx - dy) : 3 + dx / (dx - dy);
  }

  /* ---------------- état partagé, lu paresseusement (90-boot.js vient APRÈS dans le bundle) ---------------- */
  function S() { return N.S || null; }
  function frameNo() { var s = N.S; return s ? (s.frame | 0) : 0; }

  var clk = 0;                /* horloge des effets, secondes, avancée par update(dt) */

  /* ---------------- réglages joueuse ---------------- */
  var userShake = null, userFlash = null, reduced = false;
  function readPrefs() {
    try {
      reduced = !!(typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { reduced = false; }
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('snake2975.fx') : null;
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o.s === 'number') userShake = o.s < 0 ? 0 : (o.s > 1 ? 1 : o.s);
        if (o && typeof o.f === 'boolean') userFlash = o.f;
      }
    } catch (e2) {}
  }
  function savePrefs() {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('snake2975.fx', JSON.stringify({ s: userShake, f: userFlash })); } catch (e) {}
  }
  readPrefs();
  function mouvementReduit() {
    // Relire la préférence : elle peut changer pendant une partie.
    try { reduced = !!(typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
    return reduced;
  }
  function shakeK() { return mouvementReduit() ? 0 : (userShake !== null ? userShake : 1); }
  function flashOn() { return userFlash !== null ? userFlash : true; }

  /* ---------------- limiteur de flashs ---------------- */
  var flT = new Float64Array(8), flI = 0;
  var burstT = -1e9, burstF = null, burstA = 0, burstFlash = false;
  for (var q0 = 0; q0 < 8; q0++) flT[q0] = -1e9;
  function thrArea() {
    var g = N.gfx || {}, W = g.W | 0, H = g.H | 0, P = (g.PX | 0) || 2;
    var a = FL_CSS / (P * P), b = FL_FRAC * W * H;
    return (b > 0 && b < a) ? b : a;
  }
  function recent() { var c = 0; for (var i = 0; i < 8; i++) if (clk - flT[i] < FL_WIN) c++; return c; }
  /* admission d'un éclair d'aire `area` (pixels de jeu). Rend l'échelle de rayon permise :
       1        plein : sous le seuil, ou simultané d'un flash déjà compté, ou une place libre (comptée) ;
       0 < k < 1  rapetissé juste sous le seuil : ce n'est plus un flash (explosions moyennes seulement) ;
       0        atténué : anneaux sans aplat, pas de blanc.
     Trois places par seconde ; les explosions moyennes n'en prennent que deux, la troisième reste à une
     grosse : sur bureau (seuil 1 364 pixels de jeu), des kills ordinaires épuisaient sinon le budget avant
     la mort du gros ennemi. Flashs coupés par la joueuse : tout reste sous la moitié du seuil. */
  /* Les deux champs publics restent au schéma journal:flash de 03-socle.
     Métadonnées locales préfixées, admises par ce schéma : aucune mutation du socle.
     _compte désigne un NOUVEAU flash, _issue distingue le sous-seuil et la rafale.
     La luminance est celle de l'encre de crête demandée, pas une mesure du tampon.
     Un appel externe sans encre garde null : ne pas inventer sa luminance ni son rouge. */
  function decision(area, k, issue, compte, type, ci) {
    if (N.journal) N.journal('flash', {
      aire: area, accepte: k === 1,
      _type: type || 'externe', _issue: issue, _compte: !!compte, _echelle: k,
      _temps: clk, _image: frameNo(),
      _luminance: ci === undefined || !N.pal || !N.pal.L ? null : N.pal.L[ci],
      _rouge: type === 'explosion' ? true : ci === undefined ? null : ci === MAG || ci === BRAS || ci === SANG
    });
    return k;
  }
  function admit(area, big, type, ci) {
    var thr = thrArea(), on = flashOn(), cap = on ? thr : thr * 0.5;
    /* Un gel n'avance pas clk : le regroupement temporel seul autorisait une
       rafale indéfinie sur des images distinctes. Seuls les départs d'une MÊME
       image peuvent partager un flash ; la borne de temps reste utile en simulation. */
    var f = frameNo();
    if (f !== burstF || clk - burstT > FL_BURST) { burstT = clk; burstF = f; burstA = 0; burstFlash = false; }
    if (on && burstFlash) { burstA += area; return decision(area, 1, 'rafale', false, type, ci); }
    if (burstA + area <= cap) { burstA += area; return decision(area, 1, 'sous-seuil', false, type, ci); }
    if (on) {
      var used = recent();
      if (used < FL_MAX && (big || used < FL_MAX - 1)) {
        flT[flI] = clk; flI = (flI + 1) & 7; burstFlash = true; burstA += area; ST.flashes++;
        return decision(area, 1, 'plein', true, type, ci);
      }
    }
    ST.refused++;
    if (big !== 2) {
      var room = cap * 0.92 - burstA;
      if (!big && room > area * 0.12) { burstA += room; ST.shrunk++; return decision(area, Math.sqrt(room / area), 'reduit', false, type, ci); }
    }
    return decision(area, 0, on ? 'budget' : 'reglage', false, type, ci);
  }
  function gate(area, type, ci) { return admit(area, 2, type, ci) > 0; }

  /* ---------------- gel d'image, ancré sur S.frame ----------------
     Images gelées : hsSet+1 .. hsEnd. 90-boot.js interroge hitstopLeft() avant S.frame++ ; posé pendant
     l'image F, un gel de n couvre exactement F+1 .. F+n. */
  var hsSet = -1e9, hsEnd = -1e9;
  function hitstop(n) {
    n = Math.round(+n || 0);
    if (!(n > 0)) return;
    if (n > HS_MAX) n = HS_MAX;
    if (N.horloge && N.horloge.geler) { try { N.horloge.geler(n / 60); } catch (e0) {} }
    var f = frameNo();
    if (f >= hsSet && f <= hsEnd && hsEnd > hsSet) { var e = hsSet + n; if (e > hsEnd) hsEnd = e; }
    else { hsSet = f; hsEnd = f + n; }
  }
  function hitstopLeft() { var r = hsEnd - frameNo(); return r > 0 ? r : 0; }
  function frozen() { var f = frameNo(); return f > hsSet && f <= hsEnd; }

  /* ---------------- secousse à trauma ---------------- */
  var trauma = 0, shakeOut = 0, shakeF = -1, shakeBase = 0;
  var shakeClock = 0, shakeDebut = -Infinity, shakeCrete = 0;
  var SH_BUD = N.R && N.R.scene && N.R.scene.budgets && N.R.scene.budgets.secousse;
  /* plafond en pixels de jeu : 12 à px = 2 (iPhone), 8 à px = 4 (bureau), jamais sous 7 (critère 4 : 6 au moins) */
  function shMax() {
    var P = (N.gfx && N.gfx.PX) | 0 || 2, m = SH_CSS / P;
    return m > SHMAX ? SHMAX : (m < 7 ? 7 : m);
  }
  function writeShake() {
    var s = S(); if (!s) return;
    shakeOut = shMax() * trauma * trauma * shakeK();
    s.shake = shakeOut;
  }
  function shake(a) {
    a = +a || 0;
    if (!(a > 0)) return;
    var M = shMax();
    if (a > M) a = M;
    var need = Math.sqrt(a / M), f = frameNo();
    /* Une rafale ne rallonge pas chaque petite secousse : sa crête remplace,
       sans addition, la précédente dans la fenêtre. Une première frappe isolée
       garde son amplitude et sa décroissance ; les impacts R12 (dont CYCLOPE)
       reprennent immédiatement la main. Aucune action sur l’horloge des flashs. */
    if (SH_BUD) {
      if (a >= SH_BUD.forte || shakeClock - shakeDebut >= SH_BUD.fenetre) {
        shakeDebut = shakeClock; shakeCrete = need;
        if (need > trauma) trauma = need;
      } else if (need > shakeCrete) {
        shakeCrete = need;
        if (need > trauma) trauma = need;
      }
      writeShake();
      return;
    }
    /* le même impact appelle souvent boom() puis shake() : dans une même image, on garde le plus fort ;
       d'une image à l'autre, les coups s'accumulent */
    if (f !== shakeF) { shakeF = f; shakeBase = trauma; }
    var t = shakeBase + 0.35 * need;
    if (t < need) t = need;
    if (t < trauma) t = trauma;
    if (t > 1) t = 1;
    trauma = t;
    writeShake();
  }

  /* ---------------- flash de frappe ---------------- */
  var HITF = new Int32Array(1024), HITT = new Float64Array(1024);
  for (var q1 = 0; q1 < 1024; q1++) { HITF[q1] = -1e9; HITT[q1] = -1e9; }
  var HITOPT = { ci: OS };
  function hit(o, aire) {
    if (!flashOn() || o === null || o === undefined) return false;
    var num = typeof o === 'number';
    if (!num && typeof o !== 'object') return false;
    var f = frameNo(), k = num ? o & 1023 : 0;
    var lastT = num ? HITT[k] : (typeof o.fxHitT === 'number' ? o.fxHitT : -1e9);
    if (clk - lastT < HIT_GAP) return (num ? HITF[k] : o.fxHitF) === f;   /* déjà blanc il y a moins de 0,34 s */
    var A = +aire;
    if (!(A > 0) && !num) A = (o.w > 0 && o.h > 0) ? o.w * o.h : (o.r > 0 ? 3.1416 * o.r * o.r : 0);
    if (A > thrArea() && !gate(A, 'frappe', OS)) return false;
    if (num) { HITT[k] = clk; HITF[k] = f; } else { o.fxHitT = clk; o.fxHitF = f; }
    return true;
  }
  function isHit(o) {
    if (o === null || o === undefined) return false;
    var hf = typeof o === 'number' ? HITF[o & 1023] : (typeof o === 'object' ? o.fxHitF : undefined);
    if (typeof hf !== 'number') return false;
    var f = frameNo();
    if (hf === f) return true;
    return f > hsSet && f <= hsEnd && hf >= hsSet;      /* image tenue pendant le gel */
  }

  /* ---------------- particules : tableaux typés, aucun objet ---------------- */
  var K_SHARD = 1, K_BODY = 2, K_SPARK = 3, K_DEBRIS = 4, K_TRAIL = 5;
  var PRIO = [9, 4, 4, 3, 0, 1];                         /* qui cède en premier quand tout est plein */
  var pvr = new Uint8Array(CAP), curVar = 0;     /* pvr : 1 = particule de la joueuse (cyan) */
  var pk = new Uint8Array(CAP), pc = new Uint8Array(CAP), pc2 = new Uint8Array(CAP), psz = new Uint8Array(CAP);
  var ppx = new Float32Array(CAP), ppy = new Float32Array(CAP), pvx = new Float32Array(CAP), pvy = new Float32Array(CAP);
  var pqx = new Float32Array(CAP), pqy = new Float32Array(CAP);
  var pa = new Float32Array(CAP), pl = new Float32Array(CAP), pd = new Float32Array(CAP);
  var fstack = new Int16Array(CAP), nfree = 0, live = 0;
  function poolReset() {
    nfree = 0; live = 0;
    for (var i = CAP - 1; i >= 0; i--) { pk[i] = 0; fstack[nfree++] = i; }
  }
  poolReset();
  function alloc(kind) {
    var i;
    if (nfree > 0) i = fstack[--nfree];
    else {
      /* tout est plein : on reprend le moins précieux, et parmi eux le plus avancé dans sa vie */
      var best = -1, bp = 99, bu = -1, pr = PRIO[kind];
      for (var j = 0; j < CAP; j++) {
        var p = PRIO[pk[j]], u = pa[j] / (pl[j] || 1);
        if (p < bp || (p === bp && u > bu)) { bp = p; bu = u; best = j; }
      }
      if (best < 0 || bp > pr) { ST.dropped++; return -1; }
      i = best; live--;
    }
    pk[i] = kind; pa[i] = 0; pvr[i] = curVar; live++;
    if (live > ST.peak) ST.peak = live;
    return i;
  }
  function kill(i) { if (pk[i]) { pk[i] = 0; fstack[nfree++] = i; live--; } }

  /* ---------------- explosions ---------------- */
  var eOn = new Uint8Array(NEX), eBig = new Uint8Array(NEX), eAtt = new Uint8Array(NEX), eCi = new Uint8Array(NEX);
  var eScr = new Uint8Array(NEX), eVar = new Uint8Array(NEX);     /* écran (pas monde) ; 1 = variante « joueuse » */
  var eSoft = new Uint8Array(NEX);         /* sans blanc : atténuée, ou flashs coupés par la joueuse */
  var eX = new Int16Array(NEX), eY = new Int16Array(NEX), eIgn = new Uint16Array(NEX);
  var eF = new Float32Array(NEX), eR = new Float32Array(NEX), eAge = new Float32Array(NEX);
  var eFire = new Float32Array(NEX), eLife = new Float32Array(NEX), eSc = new Float32Array(NEX);
  var eNx = new Uint8Array(NEX), eNy = new Uint8Array(NEX), eNx2 = new Uint8Array(NEX), eNy2 = new Uint8Array(NEX), eAo = new Uint8Array(NEX);

  /* anneaux : délai, r0, r1 (en R), durée, épaisseur départ, épaisseur fin, trame de départ */
  var RG_BIG = [0.00, 0.60, 1.70, 0.46, 5, 1, 1.00, 0.10, 0.74, 1.46, 0.60, 3, 1, 0.90];
  var RG_MED = [0.00, 0.60, 1.70, 0.34, 3, 1, 1.00, 0.08, 0.72, 1.42, 0.40, 2, 1, 0.80];
  var RG_SMA = [0.00, 0.65, 1.80, 0.24, 2, 1, 1.00];

  var ST = { ralentis: 0, live: 0, peak: 0, ex: 0, booms: 0, full: 0, atten: 0, shrunk: 0, flashes: 0, refused: 0, dropped: 0, thr: 0, last: 0 };

  function scale(g) {
    var sc = Math.sqrt((g.W | 0) * (g.H | 0)) / 287;
    if (!(sc > 0.85)) sc = 0.85;
    if (sc > 1.6) sc = 1.6;
    return sc;
  }

  /* une encre pour les éclats « de corps » : la teinte de ce qui meurt, puis plus sombre */
  function bodyHi(ci) {
    if (ci === MAG) return ROSE;
    if (ci === CYAN) return CYANP;
    if (ci === AMBRE || ci === JAUNE) return JAUNE;
    return ci;
  }
  function bodyLo(ci) {
    if (ci === MAG || ci === ROSE) return MAG;
    if (ci === CYAN || ci === CYANP) return CYAN;
    if (ci === AMBRE || ci === JAUNE) return AMBRE;
    var P = N.pal;
    return (P && P.shade) ? P.shade(ci, 0.6) : ci;
  }

  function spawnShard(x, y, ang, sp, size, drag, life, body, ci, soft) {
    var i = alloc(body ? K_BODY : K_SHARD);
    if (i < 0) return;
    ppx[i] = x; ppy[i] = y; pvx[i] = Math.cos(ang) * sp; pvy[i] = Math.sin(ang) * sp;
    psz[i] = size; pd[i] = drag; pl[i] = life;
    pc[i] = body ? bodyHi(ci) : (soft ? JAUNE : OS); pc2[i] = body ? bodyLo(ci) : JAUNE;
  }
  function spawnSpark(x, y, ang, sp, life, hot) {
    var i = alloc(K_SPARK);
    if (i < 0) return;
    ppx[i] = x; ppy[i] = y; pvx[i] = Math.cos(ang) * sp; pvy[i] = Math.sin(ang) * sp;
    psz[i] = 1; pd[i] = 7; pl[i] = life; pc[i] = curVar ? CYANP : (hot ? OS : JAUNE);
  }

  function boom(x, y, force, ci, opt) {
    var g = N.gfx;
    if (!g) return 0;
    var vj = false, scr = false;
    if (typeof opt === 'string') vj = opt === 'joueuse';
    else if (opt && typeof opt === 'object') { vj = opt.variante === 'joueuse'; scr = !!opt.ecran; }
    if (vj) ci = CYAN;
    x = Math.round(+x || 0); y = Math.round(+y || 0);
    if (x < -4000) x = -4000; if (x > 12000) x = 12000; if (y < -4000) y = -4000; if (y > 12000) y = 12000;
    var f = +force;
    if (!(f > 0)) f = 0.05;
    if (f > 1) f = 1;
    ci = (ci === undefined || ci === null) ? BRAS : ((N.pal && N.pal.i) ? (N.pal.i(ci) & 15) : (ci | 0) & 15);
    var big = f > 0.6, sc = scale(g);
    var ox = scr && g.ox ? g.ox() : 0, oy = scr && g.oy ? g.oy() : 0;     /* écran : les éclats sont posés dans le monde */
    curVar = vj ? 1 : 0;
    var R = big ? sc * (62 + 60 * (f - 0.6)) : sc * (4 + 50 * f);
    var k = admit(Math.PI * R * R * 0.75, big, vj ? 'explosion-joueuse' : 'explosion', OS), att = k === 0;
    if (k > 0 && k < 1) R *= k;
    ST.thr = thrArea();

    /* une place : la plus ancienne explosion cède si les 24 sont prises */
    var e = -1, worst = -1;
    for (var q = 0; q < NEX; q++) {
      if (!eOn[q]) { e = q; break; }
      var u = eAge[q] / eLife[q];
      if (u > worst) { worst = u; e = q; }
    }
    var soft = att || !flashOn();
    eVar[e] = vj ? 1 : 0; eScr[e] = scr ? 1 : 0;
    eOn[e] = 1; eBig[e] = big ? 1 : 0; eAtt[e] = att ? 1 : 0; eSoft[e] = soft ? 1 : 0; eCi[e] = ci;
    eX[e] = x; eY[e] = y; eF[e] = f; eR[e] = R; eSc[e] = sc; eAge[e] = 0; eIgn[e] = 0;
    eFire[e] = big ? 0.9 : 0.22 + 0.55 * f;
    var ringEnd = big ? 0.72 : (f > 0.3 ? 0.50 : 0.26);
    eLife[e] = Math.max(eFire[e], ringEnd) + 0.02;
    eNx[e] = (rnd() * 256) | 0; eNy[e] = (rnd() * 256) | 0;
    eNx2[e] = (rnd() * 256) | 0; eNy2[e] = (rnd() * 256) | 0; eAo[e] = (rnd() * 256) | 0;

    /* éclats : angle d'or pour une couverture régulière, un tiers à l'encre de ce qui meurt */
    var ns = big ? 30 : Math.round(4 + 18 * f);
    if (att) ns = Math.round(ns * 0.7);
    var bodyP = vj ? 1 : (ci === BRAS ? 0 : 0.34);
    var ga = rnd() * 6.2832;
    for (var i = 0; i < ns; i++) {
      var a = ga + i * 2.39996 + (rnd() - 0.5) * 0.45;
      var sp = sc * (big ? 270 + 200 * rnd() : 110 + 260 * f + 70 * rnd());
      var r0 = R * (0.30 + 0.32 * rnd());          /* ils partent du bord de la boule : on les voit voler */
      var zz = rnd(), size = big ? (zz < 0.25 ? 4 : (zz < 0.65 ? 3 : 2)) : (f > 0.3 ? (zz < 0.4 ? 3 : 2) : (zz < 0.5 ? 2 : 1));
      var life = big ? 0.6 + 0.3 * rnd() : 0.3 + 0.3 * f + 0.15 * rnd();
      spawnShard(x + ox + Math.cos(a) * r0, y + oy + Math.sin(a) * r0, a, sp, size, big ? 3.2 : 4.2, life, rnd() < bodyP, ci, soft);
    }
    var nk = big ? 30 : Math.round(3 + 12 * f);
    if (att) nk = Math.round(nk * 0.6);
    for (var j = 0; j < nk; j++) {
      var b = rnd() * 6.2832;
      spawnSpark(x + ox, y + oy, b, sc * (big ? 320 + 300 * rnd() : 140 + 260 * f + 90 * rnd()), 0.14 + 0.2 * rnd(), !soft);
    }

    /* la caméra : une grosse explosion pleine secoue au plafond de shMax() (12 pixels de jeu à px = 2, 8 à
       px = 4 ; critère 4 : au moins 6) ; une moyenne de 1,5 à 5 ; une petite, pas du tout */
    var amp = big ? 9 + 7.5 * (f - 0.6) : (f >= 0.25 ? 1.5 + 3.5 * (f - 0.25) / 0.35 : 0);
    if (att && amp > SH_ATT) amp = SH_ATT;
    if (amp > 0) shake(amp);

    curVar = 0;
    ST.booms++; if (att) ST.atten++; else ST.full++;
    ST.last = att ? 2 : (k < 1 ? 3 : 1);
    return ST.last;
  }

  function spark(x, y, dx, dy, n, ci) {
    n = n === undefined ? 4 : Math.round(+n || 0);
    if (n <= 0) return;
    if (n > 32) n = 32;
    var base = (dx || dy) ? Math.atan2(+dy || 0, +dx || 0) : rnd() * 6.2832;
    var spread = (dx || dy) ? 1.05 : 3.1416;
    var hot = ci === undefined || ci === null;
    var c = hot ? OS : ((N.pal && N.pal.i) ? N.pal.i(ci) & 15 : (ci | 0) & 15);
    for (var i = 0; i < n; i++) {
      var k = alloc(K_SPARK);
      if (k < 0) return;
      var a = base + (rnd() * 2 - 1) * spread * (0.35 + 0.65 * rnd()), sp = 170 + 190 * rnd();
      ppx[k] = +x || 0; ppy[k] = +y || 0; pvx[k] = Math.cos(a) * sp; pvy[k] = Math.sin(a) * sp;
      psz[k] = 1; pd[k] = 6; pl[k] = 0.12 + 0.14 * rnd(); pc[k] = c;
    }
  }

  function trail(x0, y0, x1, y1, ci) {
    var k = alloc(K_TRAIL);
    if (k < 0) return;
    ppx[k] = +x0 || 0; ppy[k] = +y0 || 0; pqx[k] = +x1 || 0; pqy[k] = +y1 || 0;
    pl[k] = 0.15; pc[k] = (ci === undefined || ci === null) ? JAUNE : ((N.pal && N.pal.i) ? N.pal.i(ci) & 15 : (ci | 0) & 15);
  }

  /* ---------------- mise à jour ---------------- */
  function update(dt) {
    dt = +dt || 0;
    if (dt < 0) dt = 0;
    if (dt > 0.1) dt = 0.1;
    var dtR = dt;                         /* temps du jeu tel qu'il arrive ; dt devient le temps des EFFETS (ralenti visuel) */
    ralentiTick(dtR);
    dt = dtR * kVisuel();
    clk += dt;
    planifie(dtR);
    var s = S(), g = N.gfx, W = g ? g.W | 0 : 0, H = g ? g.H | 0 : 0;
    var WW = (N.world && N.world.W) ? N.world.W | 0 : W, WH = (N.world && N.world.H) ? N.world.H | 0 : H;
    if (WW < W) WW = W; if (WH < H) WH = H;

    /* une secousse posée ailleurs (S.shake écrit directement) est reprise dans le trauma */
    if (s && s.shake > shakeOut + 1e-3) {
      var k0 = shakeK();
      if (k0 > 0) { var need = Math.sqrt(Math.min(1, s.shake / (shMax() * k0))); if (need > trauma) trauma = need; }
    }
    /* la secousse s'éteint en temps réel, gel compris : une image gelée qui tremble à pleine amplitude
       pendant une chaîne de gels ferait clignoter les bords clairs (mesuré : 11 flashs/s sur bureau) */
    var rdt = frozen() ? dtR / HS_SLOW : dtR;
    if (rdt > 0.05) rdt = 0.05;
    shakeClock += rdt;
    trauma -= TDECAY * rdt;
    if (trauma < 0) trauma = 0;
    writeShake();

    /* explosions et chaleur */
    var heat = 0, nex = 0;
    for (var e = 0; e < NEX; e++) {
      if (!eOn[e]) continue;
      eAge[e] += dt;
      // L'allumage est visuel : en mouvement réduit, il tient comme l'âge pendant le gel.
      if (!(mouvementReduit() && N.horloge && N.horloge.gele()) && eIgn[e] < 60000) eIgn[e]++;
      if (eAge[e] >= eLife[e]) { eOn[e] = 0; continue; }
      nex++;
      var ff = eFire[e], a = eAge[e];
      if (a < ff) {
        var u = 1 - a / ff, ign = eIgn[e] / 3;
        if (ign > 1) ign = 1;
        heat += (eAtt[e] ? 0.3 : 1) * Math.pow(eF[e], 1.3) * u * u * ign;
      }
    }
    ST.ex = nex;
    if (s) {
      if (heat > 1) heat = 1;
      if (heat > (+s.heat || 0)) s.heat = heat;
    }

    /* particules */
    for (var i = 0; i < CAP; i++) {
      var kd = pk[i];
      if (!kd) continue;
      pa[i] += dt;
      if (kd === K_DEBRIS || kd === K_TRAIL) { if (pa[i] >= pl[i]) kill(i); continue; }
      var dr = Math.exp(-pd[i] * dt);
      pvx[i] *= dr; pvy[i] *= dr;
      ppx[i] += pvx[i] * dt; ppy[i] += pvy[i] * dt;
      if (ppx[i] < -24 || ppy[i] < -24 || ppx[i] > WW + 24 || ppy[i] > WH + 24) { kill(i); continue; }
      if (kd === K_SPARK) { if (pa[i] >= pl[i]) kill(i); continue; }
      var v2 = pvx[i] * pvx[i] + pvy[i] * pvy[i];
      if (pa[i] >= pl[i] || v2 < 64) {
        /* l'éclat se pose : il reste au sol, sombre, plus de trois secondes */
        pk[i] = K_DEBRIS; pa[i] = 0; pl[i] = 3.2 + 1.2 * rnd();
        psz[i] = psz[i] >= 3 ? 2 : psz[i];
        pvx[i] = 0; pvy[i] = 0;
      }
    }
    ST.live = live;
    ondesTick(dt);
  }

  /* ---------------- dessin ---------------- */
  var buf = null, W = 0, H = 0, OX = 0, OY = 0;     /* OX, OY : origine de dessin de N.gfx (la caméra), retranchée à tout ce qui est du monde */

  function put(x, y, c) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    buf[y * W + x] = c;
  }
  function sq(x, y, s, c) {
    var x1 = x + s - 1, y1 = y + s - 1;
    if (x < 0) x = 0; if (y < 0) y = 0;
    if (x1 >= W) x1 = W - 1; if (y1 >= H) y1 = H - 1;
    for (var yy = y; yy <= y1; yy++) { var o = yy * W; for (var xx = x; xx <= x1; xx++) buf[o + xx] = c; }
  }
  /* trait de Bresenham dont la trame s'éclaircit de t0 (tête) à t1 (queue) */
  function streak(x0, y0, x1, y1, c, t0, t1) {
    var dx = x1 - x0, dy = y1 - y0, adx = dx < 0 ? -dx : dx, ady = dy < 0 ? -dy : dy;
    var n = adx > ady ? adx : ady;
    if (n === 0) return;
    var sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1, err = adx - ady, x = x0, y = y0;
    for (var k = 0; k <= n; k++) {
      var t = t0 + (t1 - t0) * k / n;
      if (x >= 0 && y >= 0 && x < W && y < H && t * 16 > BAY[((y & 3) << 2) | (x & 3)]) buf[y * W + x] = c;
      var e2 = err + err;
      if (e2 > -ady) { err -= ady; x += sx; }
      if (e2 < adx) { err += adx; y += sy; }
    }
  }

  /* un anneau épais, tramé, percé par secteurs angulaires */
  function ring(cx, cy, r, th, c, t, perf, ao, nx, ny) {
    if (!(t > 0) || r <= 0) return;
    var ro = r + th * 0.5, ri = r - th * 0.5;
    if (ri < 0) ri = 0;
    var ro2 = ro * ro, ri2 = ri * ri, Rb = Math.ceil(ro);
    var ya = cy - Rb < 0 ? -cy : -Rb, yb = cy + Rb > H - 1 ? H - 1 - cy : Rb;
    var t16 = t * 16;
    for (var dy = ya; dy <= yb; dy++) {
      var yy = cy + dy, dy2 = dy * dy;
      if (dy2 > ro2) continue;
      var xo = Math.sqrt(ro2 - dy2) | 0, xi = dy2 < ri2 ? Math.ceil(Math.sqrt(ri2 - dy2)) - 1 : -1;
      var row = yy * W, br = (yy & 3) << 2, nr = ((dy + ny) & NM) << 7;
      for (var side = 0; side < 2; side++) {
        var xa = side ? (xi >= 0 ? xi + 1 : 0) : -xo, xb = side ? xo : (xi >= 0 ? -xi - 1 : -1);
        if (cx + xa < 0) xa = -cx;
        if (cx + xb > W - 1) xb = W - 1 - cx;
        for (var dx = xa; dx <= xb; dx++) {
          var q = dx * dx + dy2;
          if (q > ro2 || q < ri2) continue;
          var xx = cx + dx;
          if (!(t16 > BAY[br | (xx & 3)])) continue;
          if (perf > 0) {
            var nn = NZ[nr | ((dx + nx) & NM)];
            var an = AN[((dang(dx, dy) * 64) + ao + nn * 18) & 255] * 0.8 + nn * 0.2;
            if (an < perf) continue;
          }
          buf[row + xx] = c;
        }
      }
    }
  }

  function ringInk(k, u, att, vj) {
    /* la couronne refroidit comme le cœur ; atténuée, elle saute le blanc et le jaune */
    var s = att ? 1 : 0;
    if (vj) { if (k === 0) return (u < 0.08 && !s) ? OS : (u < 0.25 ? CYANP : (u < 0.55 ? CYAN : INDIGO)); return u < 0.45 ? CYAN : INDIGO; }
    if (k === 0) {
      if (u < 0.08 && !s) return OS;
      if (u < 0.25) return JAUNE;
      return u < 0.55 ? BRAS : SANG;
    }
    return u < 0.45 ? BRAS : SANG;
  }

  function drawRings(e) {
    var tab = eBig[e] ? RG_BIG : (eF[e] > 0.3 ? RG_MED : RG_SMA);
    var att = eAtt[e], R = eR[e], sc = eSc[e], a = eAge[e];
    for (var k = 0; k * 7 < tab.length; k++) {
      var o = k * 7, u = (a - tab[o]) / tab[o + 3];
      if (u < 0 || u >= 1) continue;
      var ez = 1 - (1 - u) * (1 - u);
      var r = R * (tab[o + 1] + (tab[o + 2] - tab[o + 1]) * ez);
      var th = (tab[o + 4] + (tab[o + 5] - tab[o + 4]) * u) * sc;
      var t = tab[o + 6] * (1 - u);
      if (att) { th = th * 0.5; if (th < 1) th = 1; t *= 0.75; }
      if (th < 1) th = 1;
      var perf = 0.12 + 0.8 * Math.pow(u, 1.25);
      ring(eX[e] - (eScr[e] ? 0 : OX), eY[e] - (eScr[e] ? 0 : OY), r, th, ringInk(k, u, eSoft[e], eVar[e]), t, perf, (eAo[e] + k * 83) & 255, (eNx[e] + k * 37) & 255, (eNy[e] + k * 59) & 255);
    }
  }

  /* LA COURONNE. Un disque dont les bandes de température sont concentriques (os au centre, puis jaune,
     brasier, sang), chaque frontière tramée par Bayer et bosselée par le bruit. Il gonfle en trois images,
     puis un trou s'ouvre au centre et le creuse en anneau : le bord intérieur devient le plus chaud, le
     trou grandit plus vite que le bord extérieur, des brèches angulaires le cassent en arcs, des trous en
     blocs le mitent. Pour chaque pixel : le contour ne fait qu'avancer, le trou ne fait que grandir, la
     température ne monte qu'une fois puis redescend. */
  function drawFire(e) {
    var a = eAge[e], ff = eFire[e];
    if (a >= ff) return;
    var ign = eIgn[e] / 3;
    if (ign > 1) ign = 1;
    if (ign < 0.34) ign = 0.34;
    var gu = a / (0.36 * ff);
    if (gu > 1) gu = 1;
    var gro = 1 - (1 - gu) * (1 - gu) * (1 - gu);
    var Ro = eR[e] * (0.55 + 0.27 * ign + 0.18 * gro);
    var f = eF[e], a0 = 0.02 + 0.04 * f;
    var Tp = a < a0 ? 1 : 1 - Math.pow((a - a0) / (ff - a0), 1.15);
    Tp *= 0.66 + 0.34 * (ign >= 1 ? 1 : (ign - 0.34) / 0.66);
    if (Tp <= 0.05) return;
    var ah = 0.13 * ff, h = a > ah ? Math.pow((a - ah) / (ff - ah), 0.8) : 0;
    var ag = 0.42 * ff, gap = a > ag ? 0.62 * (a - ag) / (ff - ag) : 0;
    var ae = 0.28 * ff, ero = a > ae ? 0.55 * (a - ae) / (ff - ae) : 0;
    var cx = eX[e] - (eScr[e] ? 0 : OX), cy = eY[e] - (eScr[e] ? 0 : OY), inv = 1 / Ro, Rb = Math.ceil(Ro * 1.1), Rb2 = Rb * Rb;
    var nx = eNx[e], ny = eNy[e], nx2 = eNx2[e], ny2 = eNy2[e], ao = eAo[e];
    var hin = h > 0 ? h - 0.07 : -1, ih = h < 0.999 ? 1 / (1 - h) : 1000, white = eSoft[e] ? (eVar[e] ? CYANP : JAUNE) : OS, iJ = eVar[e] ? CYANP : JAUNE, iB = eVar[e] ? CYAN : BRAS, iS = eVar[e] ? INDIGO : SANG;
    var ya = cy - Rb < 0 ? -cy : -Rb, yb = cy + Rb > H - 1 ? H - 1 - cy : Rb;
    var Rh = hin > 0 ? hin * Ro : 0, Rh2 = Rh * Rh;            /* sous ce rayon, c'est le trou à coup sûr */
    for (var dy = ya; dy <= yb; dy++) {
      var yy = cy + dy, dy2 = dy * dy, span = Rb2 - dy2;
      if (span < 0) continue;
      var sp = Math.sqrt(span) | 0;
      var xin = dy2 < Rh2 ? (Math.sqrt(Rh2 - dy2) | 0) - 1 : -1;
      var row = yy * W, br = (yy & 3) << 2, nr = ((dy + ny) & NM) << 7, nr2 = ((dy + ny2) & NM) << 7;
      for (var side = 0; side < 2; side++) {
        var xa = side ? (xin >= 0 ? cx + xin + 1 : cx + 1) : cx - sp, xb = side ? cx + sp : (xin >= 0 ? cx - xin - 1 : cx);
        if (xa < 0) xa = 0; if (xb > W - 1) xb = W - 1;
        for (var xx = xa; xx <= xb; xx++) {
          var dx = xx - cx, d = Math.sqrt(dx * dx + dy2) * inv, n = NZ[nr | ((dx + nx) & NM)];
          if (d > 0.91 + 0.18 * n) continue;                        /* contour bosselé */
          var s = d;
          if (h > 0) {
            var n2 = NZ[nr2 | ((dx + nx2) & NM)];
            if (d < hin + 0.14 * n2) continue;                       /* le trou, au bord mordu */
            s = (d - h) * ih;
            if (s < 0) s = 0;
            if (ero > 0 && n2 > 1 - ero * (1.1 - s)) continue;       /* trous en blocs dans la chair */
          }
          if (gap > 0 && AN[((dang(dx, dy) * 64) + ao + n * 26) & 255] < gap) continue;   /* brèches déchirées */
          var T = Tp * (1 - K1 * s * s) + (n - 0.5) * TN + BO[br | (xx & 3)];
          if (T > T_SA) buf[row + xx] = T > T_BR ? (T > T_JA ? (T > T_OS ? white : iJ) : iB) : iS;
        }
      }
    }
  }

  /* atténuée : pas d'aplat, juste une braise en croix de cinq pixels au centre, 0,1 s */
  function drawCore(e) {
    if (eAge[e] > 0.1) return;
    var cx = eX[e] - (eScr[e] ? 0 : OX), cy = eY[e] - (eScr[e] ? 0 : OY), c0 = eVar[e] ? CYAN : BRAS, c1 = eVar[e] ? INDIGO : SANG;
    put(cx, cy, c0); put(cx - 1, cy, c1); put(cx + 1, cy, c1); put(cx, cy - 1, c1); put(cx, cy + 1, c1);
  }

  /* au sol : les débris, sous les explosions */
  function drawGround() {
    for (var i = 0; i < CAP; i++) {
      if (pk[i] !== K_DEBRIS) continue;
      var x = Math.round(ppx[i]) - OX, y = Math.round(ppy[i]) - OY, left = pl[i] - pa[i];
      if (psz[i] >= 2 && left > 0.5) { sq(x, y, 2, ARD); put(x, y, INDIGO); }
      else put(x, y, ARD);
    }
  }

  /* en l'air : traînées, éclats, étincelles, par-dessus les explosions */
  function drawAir(mode) {
    var i, k;
    mode = mode | 0;                                      /* 0 : tout ; 1 : sans les éclats de la joueuse ; 2 : eux seuls (après le remappage de la mort) */
    /* traînées fixes */
    for (i = 0; i < CAP; i++) {
      if (pk[i] !== K_TRAIL || mode === 2) continue;
      var tt = 1 - pa[i] / pl[i];
      streak(Math.round(pqx[i]) - OX, Math.round(pqy[i]) - OY, Math.round(ppx[i]) - OX, Math.round(ppy[i]) - OY, pc[i], tt, tt * 0.85);
    }
    /* éclats : un carré, et sa traînée d'un cran plus froide */
    for (i = 0; i < CAP; i++) {
      k = pk[i];
      if (k !== K_SHARD && k !== K_BODY) continue;
      if ((mode === 1 && pvr[i]) || (mode === 2 && !pvr[i])) continue;
      var u = pa[i] / pl[i], head, tail;
      if (k === K_SHARD) {
        if (u < 0.12) { head = pc[i]; tail = JAUNE; }
        else if (u < 0.35) { head = JAUNE; tail = BRAS; }
        else if (u < 0.65) { head = BRAS; tail = SANG; }
        else { head = SANG; tail = ARD; }
      } else if (pvr[i]) {
        if (u < 0.3) { head = CYANP; tail = CYAN; }
        else if (u < 0.7) { head = CYAN; tail = INDIGO; }
        else { head = INDIGO; tail = ARD; }
      } else {
        if (u < 0.3) { head = pc[i]; tail = pc2[i]; }
        else if (u < 0.7) { head = pc2[i]; tail = SANG; }
        else { head = SANG; tail = ARD; }
      }
      var s = psz[i], hx = Math.round(ppx[i]) - OX, hy = Math.round(ppy[i]) - OY;
      var vx = pvx[i], vy = pvy[i], L = Math.sqrt(vx * vx + vy * vy) * 0.05;
      if (L > 18) L = 18;
      if (L >= 1.5) {
        var m = L / Math.sqrt(vx * vx + vy * vy);
        streak(hx, hy, Math.round(ppx[i] - vx * m) - OX, Math.round(ppy[i] - vy * m) - OY, tail, 1, 0.2);
      }
      sq(hx - (s >> 1), hy - (s >> 1), s, head);
    }
    /* étincelles : un pixel et un fil */
    for (i = 0; i < CAP; i++) {
      if (pk[i] !== K_SPARK) continue;
      if ((mode === 1 && pvr[i]) || (mode === 2 && !pvr[i])) continue;
      var w = pa[i] / pl[i], c0 = pc[i], c1;
      if (c0 === OS) { c0 = w < 0.3 ? OS : (w < 0.65 ? JAUNE : AMBRE); c1 = w < 0.3 ? JAUNE : (w < 0.65 ? AMBRE : BRAS); }
      else c1 = c0;
      var sx = Math.round(ppx[i]) - OX, sy = Math.round(ppy[i]) - OY;
      var svx = pvx[i], svy = pvy[i], sl = Math.sqrt(svx * svx + svy * svy), Ls = sl * 0.032;
      if (Ls > 10) Ls = 10;
      if (Ls >= 1.5) streak(sx, sy, Math.round(ppx[i] - svx / sl * Ls) - OX, Math.round(ppy[i] - svy / sl * Ls) - OY, c1, 1, 0.3);
      put(sx, sy, c0);
    }
  }

  function draw() {
    var g = N.gfx;
    if (!g || !g.buf) return;
    buf = g.buf();
    W = g.W | 0; H = g.H | 0;
    if (!buf || W <= 0 || H <= 0) return;
    OX = g.ox ? g.ox() : 0; OY = g.oy ? g.oy() : 0;
    var e, md = enMort() ? 1 : 0;           /* à la mort, ce qui est de la joueuse se dessine APRÈS le remappage : drawMort() */
    drawGround();
    drawOndes();
    if (!md) drawDesint();
    drawLasso();
    for (e = 0; e < NEX; e++) if (eOn[e] && !eScr[e] && !(md && eVar[e])) drawRings(e);
    for (e = 0; e < NEX; e++) if (eOn[e] && !eScr[e] && !(md && eVar[e])) { if (eAtt[e]) drawCore(e); else drawFire(e); }
    drawAir(md);
    if (frameNo() - ecranVu > 2) drawEcranFx();           /* repli : l'ancienne boucle n'appelle pas drawEcran */
  }


  /* ============================================================================================
     LOT G — le temps des effets, les ondes, le LASSO, la désintégration, le glitch, la vignette, les
     télégraphes. Tout est préalloué (tableaux typés, objets créés une fois) : aucune allocation par image.
     ============================================================================================ */
  function bind() {
    var g = N.gfx;
    if (!g || !g.buf) return false;
    buf = g.buf(); W = g.W | 0; H = g.H | 0;
    return !!buf && W > 0 && H > 0;
  }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function inkOf(ci, def) { return (ci === undefined || ci === null) ? def : ((typeof ci === 'string' && N.pal && N.pal.i) ? (N.pal.i(ci) & 15) : (ci | 0) & 15); }

  /* ---- le ralenti, arbitré : le plus lent gagne ; la joueuse peut être exemptée ; « visuel » ne touche pas à l'horloge de
     jeu (la séquence de mort garde ses durées réelles : seuls les effets s'étirent) ---- */
  var RL_N = 4, rlK = new Float32Array(RL_N), rlL = new Float32Array(RL_N), rlJ = new Uint8Array(RL_N), rlV = new Uint8Array(RL_N);
  var kMonde = 1, kJou = 1, kVis = 1;
  function recalcK() {
    var a = 1, b = 1, c = 1;
    for (var i = 0; i < RL_N; i++) {
      if (!(rlL[i] > 0)) continue;
      if (rlV[i]) { if (rlK[i] < c) c = rlK[i]; continue; }
      if (rlK[i] < a) a = rlK[i];
      if (rlJ[i] && rlK[i] < b) b = rlK[i];
    }
    kMonde = a; kJou = b; kVis = c;
  }
  /* k de 0 à 1 ; dur en secondes de TEMPS RÉEL ; o : { joueuse:false (exemptée), visuel:true, long:true (au-delà du gel) } */
  function ralenti(k, dur, o) {
    k = +k; dur = +dur;
    if (!(k > 0) || !(dur > 0) || !isFinite(k) || !isFinite(dur)) return false;
    if (k > 1) k = 1;
    /* La durée appartient à N.R chez l'appelant (RALENTI = 3,5 s), pas à un plafond local. */
    var visuel = !!(o && o.visuel);
    if (!visuel && !(o && o.long)) {                       /* ralenti et gel ne se cumulent pas au-delà de 0,5 s */
      /* Le gel du monde s'use au pas fixe, même sans image dessinée. */
      var gl = N.horloge && N.horloge.resteGel ? N.horloge.resteGel() : hitstopLeft() / 60;
      if (gl > 0 && gl + dur > 0.5) { dur = 0.5 - gl; if (dur < 0.05) dur = 0.05; }
    }
    var j = 0, i, w = 1e9;
    for (i = 0; i < RL_N; i++) { if (!(rlL[i] > 0)) { j = i; w = -1; break; } if (rlL[i] < w) { w = rlL[i]; j = i; } }
    rlK[j] = k; rlL[j] = dur; rlJ[j] = (o && o.joueuse === false) ? 0 : 1; rlV[j] = visuel ? 1 : 0;
    recalcK(); ST.ralentis++;
    return true;
  }
  function kVisuel() { return kVis; }
  function ralentiTick(dtR) {
    var h = N.horloge, fixe = h && h.pas && h.pas() > 0;
    /* Un gel donne dtMonde=0 mais consomme du temps réel. Un écran arrêté, lui,
       suspend les ralentis : leur durée ne s'use pas dans le choix de cartes ou la pause. */
    var any = false, rd = fixe ? (h.arretee() ? 0 : h.H) : (kMonde > 0.05 ? dtR / kMonde : dtR);
    for (var i = 0; i < RL_N; i++) if (rlL[i] > 0) { rlL[i] -= rd; if (rlL[i] < 0) rlL[i] = 0; any = true; }
    if (any) recalcK();
  }

  /* ---- un planificateur : « dans t secondes, fais ça » (la cascade du CYCLOPE, les anneaux de l'APOGÉE) ; avance avec
     fx.update, donc dans tous les états ---- */
  var PQ_N = 24, pqT = new Float32Array(PQ_N), pqF = new Array(PQ_N);
  for (var pq0 = 0; pq0 < PQ_N; pq0++) pqF[pq0] = null;
  function apres(sec, fn) {
    for (var i = 0; i < PQ_N; i++) if (!pqF[i]) { pqT[i] = +sec || 0; pqF[i] = fn; return true; }
    return false;
  }
  function planifie(dt) {
    for (var i = 0; i < PQ_N; i++) {
      if (!pqF[i]) continue;
      pqT[i] -= dt;
      if (pqT[i] <= 0) {
        var f = pqF[i]; pqF[i] = null;
        try { f(); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('fx.apres', e); }
      }
    }
  }

  /* ---- les ondes : un anneau seul, tramé, qui s'étend, maigrit et se troue ---- */
  var ON = 16, onX = new Int16Array(ON), onY = new Int16Array(ON), onR0 = new Float32Array(ON), onR1 = new Float32Array(ON);
  var onD = new Float32Array(ON), onA = new Float32Array(ON), onC = new Uint8Array(ON), onOn = new Uint8Array(ON);
  var onN1 = new Uint8Array(ON), onN2 = new Uint8Array(ON), onN3 = new Uint8Array(ON), onTh = new Uint8Array(ON), onSc = new Uint8Array(ON);
  function onde(x, y, r0, r1, ci, dur, o) {
    var j = -1, i, w = -1;
    for (i = 0; i < ON; i++) { if (!onOn[i]) { j = i; break; } var u = onA[i] / onD[i]; if (u > w) { w = u; j = i; } }
    var scr = !!(o && o.ecran), g = N.gfx;
    onOn[j] = 1; onSc[j] = scr ? 1 : 0;
    onX[j] = Math.round(+x || 0) + (scr && g && g.ox ? g.ox() : 0); onY[j] = Math.round(+y || 0) + (scr && g && g.oy ? g.oy() : 0);
    onR0[j] = +r0 || 2; onR1[j] = +r1 || 40; onD[j] = dur > 0 ? +dur : 0.4; onA[j] = 0; onC[j] = inkOf(ci, JAUNE);
    onTh[j] = (o && o.epaisseur) ? o.epaisseur | 0 : 3;
    onN1[j] = (rnd() * 256) | 0; onN2[j] = (rnd() * 256) | 0; onN3[j] = (rnd() * 256) | 0;
    return true;
  }
  function pickup(x, y) { onde(x, y, 2, 10, JAUNE, 0.22, { epaisseur: 2 }); spark(x, y, 0, 0, 4, JAUNE); }
  function drawOndes() {
    for (var i = 0; i < ON; i++) {
      if (!onOn[i]) continue;
      var u = onA[i] / onD[i], ez = 1 - (1 - u) * (1 - u);
      var r = onR0[i] + (onR1[i] - onR0[i]) * ez, th = 1 + (onTh[i] - 1) * (1 - u);
      ring(onX[i] - OX, onY[i] - OY, r, th, onC[i], 1 - u * 0.65, 0.10 + 0.75 * u, onN1[i], onN2[i], onN3[i]);
    }
  }

  /* ---- la désintégration : un anneau cyan pâle → cyan → indigo par segment, avec des éclats cyan ---- */
  var DS = 64, dsX = new Float32Array(DS), dsY = new Float32Array(DS), dsT = new Float32Array(DS), dsOn = new Uint8Array(DS), dsB = new Uint8Array(DS);
  var DS_LIFE = 0.30;
  function desintegre(pts, dur) {
    if (!pts) return 0;
    var flat = typeof pts[0] === 'number', n = flat ? pts.length >> 1 : pts.length, i, k = 0;
    dur = +dur || 0;
    for (i = 0; i < n && k < 48; i++) {
      var px = flat ? pts[2 * i] : (pts[i].x !== undefined ? pts[i].x : pts[i][0]), py = flat ? pts[2 * i + 1] : (pts[i].y !== undefined ? pts[i].y : pts[i][1]);
      var j = -1, q;
      for (q = 0; q < DS; q++) if (!dsOn[q]) { j = q; break; }
      if (j < 0) break;
      dsOn[j] = 1; dsB[j] = 0; dsX[j] = px; dsY[j] = py; dsT[j] = (dur > 0 && n > 1) ? -dur * i / (n - 1) : 0;
      k++;
    }
    return k;
  }
  function desintTick(dt) {
    for (var i = 0; i < DS; i++) {
      if (!dsOn[i]) continue;
      dsT[i] += dt;
      if (dsT[i] < 0) continue;
      if (!dsB[i]) {
        dsB[i] = 1; curVar = 1;
        for (var k = 0; k < 3; k++) spawnShard(dsX[i], dsY[i], rnd() * 6.2832, 60 + 110 * rnd(), k === 0 ? 2 : 1, 5, 0.3 + 0.2 * rnd(), true, CYAN, true);
        spawnSpark(dsX[i], dsY[i], rnd() * 6.2832, 120 + 120 * rnd(), 0.12 + 0.12 * rnd(), false);
        curVar = 0;
      }
      if (dsT[i] >= DS_LIFE) dsOn[i] = 0;
    }
  }
  function drawDesint() {
    for (var i = 0; i < DS; i++) {
      if (!dsOn[i] || dsT[i] < 0) continue;
      var u = dsT[i] / DS_LIFE, r = 1.5 + 6.5 * Math.pow(u, 0.7), c = u < 0.3 ? CYANP : (u < 0.65 ? CYAN : INDIGO);
      var cx = Math.round(dsX[i]) - OX, cy = Math.round(dsY[i]) - OY;
      ring(cx, cy, r, 2, c, 1 - 0.5 * u, 0.1 + 0.6 * u, (i * 37) & 255, (i * 59) & 255, (i * 83) & 255);
      if (u < 0.4) put(cx, cy, CYANP);
    }
  }

  /* ---- le LASSO qui éclate : remplissage tramé cyan, puis os, puis il se troue et éclate en éclats ---- */
  var LP = new Float32Array(96), lpN = 0, lpAge = -1, lpNn = 0, lpOs = true, lpBurst = false, lpCx = 0, lpCy = 0, XS = new Float32Array(64);
  var LP_DUR = 0.5, LP_BURST = 0.14;
  function lasso(poly, n) {
    if (!poly) return false;
    var flat = typeof poly[0] === 'number', m = flat ? poly.length >> 1 : poly.length, i, ax = 0, ay = 0, step = m > 48 ? m / 48 : 1;
    lpN = 0;
    for (i = 0; i < m && lpN < 48; i += step) {
      var k = Math.floor(i), px = flat ? poly[2 * k] : (poly[k].x !== undefined ? poly[k].x : poly[k][0]), py = flat ? poly[2 * k + 1] : (poly[k].y !== undefined ? poly[k].y : poly[k][1]);
      LP[2 * lpN] = +px || 0; LP[2 * lpN + 1] = +py || 0; ax += LP[2 * lpN]; ay += LP[2 * lpN + 1]; lpN++;
    }
    if (lpN < 3) { lpN = 0; return false; }
    lpCx = ax / lpN; lpCy = ay / lpN; lpAge = 0; lpNn = n | 0; lpBurst = false;
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (i = 0; i < lpN; i++) { if (LP[2 * i] < x0) x0 = LP[2 * i]; if (LP[2 * i] > x1) x1 = LP[2 * i]; if (LP[2 * i + 1] < y0) y0 = LP[2 * i + 1]; if (LP[2 * i + 1] > y1) y1 = LP[2 * i + 1]; }
    lpOs = gate((x1 - x0) * (y1 - y0) * 0.6, 'lasso', OS);
    return true;
  }
  function lassoTick(dt) {
    if (lpAge < 0) return;
    lpAge += dt;
    if (!lpBurst && lpAge >= LP_BURST) {
      lpBurst = true; curVar = 1;
      var nb = Math.min(lpN, 24), i;
      for (i = 0; i < nb; i++) {
        var k = Math.floor(i * lpN / nb), vx = LP[2 * k] - lpCx, vy = LP[2 * k + 1] - lpCy, a = Math.atan2(vy, vx);
        spawnShard(LP[2 * k], LP[2 * k + 1], a + (rnd() - 0.5) * 0.4, 90 + 130 * rnd(), rnd() < 0.4 ? 3 : 2, 4, 0.35 + 0.25 * rnd(), true, CYAN, true);
        spawnSpark(LP[2 * k], LP[2 * k + 1], a, 160 + 160 * rnd(), 0.14 + 0.14 * rnd(), false);
      }
      curVar = 0;
    }
    if (lpAge >= LP_DUR) lpAge = -1;
  }
  function fillPoly(ci, t) {
    var y0 = 1e9, y1 = -1e9, i, j, k, x, y;
    for (i = 0; i < lpN; i++) { var yy0 = LP[2 * i + 1] - OY; if (yy0 < y0) y0 = yy0; if (yy0 > y1) y1 = yy0; }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
    var t16 = t * 16, gx = N.gfx, own = (ci === CYAN || ci === CYANP) && gx && gx.owner && gx.mask && gx.mask();   /* le remplissage cyan est la joueuse : propriétaire « corps » du masque (DIRECTION.md, critère 3) */
    if (own) gx.owner(2);
    for (y = y0; y <= y1; y++) {
      var nx = 0, ys = y + 0.5 + OY;
      for (i = 0, j = lpN - 1; i < lpN; j = i++) {
        var ya = LP[2 * i + 1], yb = LP[2 * j + 1];
        if ((ya <= ys) !== (yb <= ys) && nx < 62) XS[nx++] = LP[2 * i] + (ys - ya) / (yb - ya) * (LP[2 * j] - LP[2 * i]);
      }
      for (i = 1; i < nx; i++) { var v = XS[i]; k = i - 1; while (k >= 0 && XS[k] > v) { XS[k + 1] = XS[k]; k--; } XS[k + 1] = v; }
      for (k = 0; k + 1 < nx; k += 2) {
        var xa = Math.max(0, Math.round(XS[k] - OX)), xb = Math.min(W - 1, Math.round(XS[k + 1] - OX)), row = y * W, br = (y & 3) << 2;
        for (x = xa; x <= xb; x++) if (t16 > BAY[br | (x & 3)]) { if (own) gx.px(x + OX, y + OY, ci); else buf[row + x] = ci; }
      }
    }
    if (own) gx.owner(7);
  }
  function drawLasso() {
    if (lpAge < 0 || lpN < 3) return;
    var a = lpAge, i, j;
    if (a < 0.12) fillPoly(CYAN, 0.25 + 0.4 * a / 0.12);
    else if (a < 0.30) fillPoly(lpOs ? OS : CYANP, 0.55 * (1 - (a - 0.12) / 0.18) + 0.1);
    else fillPoly(CYAN, 0.18 * (1 - (a - 0.30) / 0.2));
    var ink = a < 0.30 ? CYANP : CYAN, tt = a < 0.4 ? 1 : 1 - (a - 0.4) / 0.1;
    if (tt <= 0) return;
    for (i = 0, j = lpN - 1; i < lpN; j = i++) streak(Math.round(LP[2 * j] - OX), Math.round(LP[2 * j + 1] - OY), Math.round(LP[2 * i] - OX), Math.round(LP[2 * i + 1] - OY), ink, tt, tt);
  }

  /* ---- le glitch (rangées décalées par bandes) et la vignette de danger : en espace ÉCRAN ---- */
  var glA = 0, glD = 0, glF = 0, vgF = 0, vgAng = NaN, vgT = 0;
  function glitch(force, dur) { glF = clamp01(+force || 0.6); glD = dur > 0 ? +dur : 0.3; glA = 0; }
  function vignette(angle, force) {
    var f = clamp01(+force || 0);
    if (f <= 0) return;
    if (f >= vgF * (vgT / 0.35) || vgT <= 0) { vgF = f; vgAng = (angle === undefined || angle === null) ? NaN : +angle; }
    vgT = 0.35;
  }
  function drawGlitch() {
    if (glA >= glD || glF <= 0) return;
    var nb = 3 + Math.floor(6 * glF), fr = Math.floor(glA * 30), fade = 1 - glA / glD;
    for (var b = 0; b < nb; b++) {
      var y0 = Math.floor(hsh(b, fr, 71) * (H - 8)), h = 2 + Math.floor(hsh(b, fr, 72) * 7), dx = Math.round((hsh(b, fr, 73) - 0.5) * 2 * (6 + 30 * glF) * fade);
      if (!dx) continue;
      for (var y = y0; y < y0 + h && y < H; y++) {
        var row = y * W;
        if (dx > 0) { buf.copyWithin(row + dx, row, row + W - dx); for (var x = 0; x < dx; x++) buf[row + x] = ARD; }
        else { buf.copyWithin(row, row - dx, row + W); for (var x2 = W + dx; x2 < W; x2++) buf[row + x2] = ARD; }
      }
      if (b < 3) { var ly = Math.floor(hsh(b, fr, 74) * H); for (var lx = 0; lx < W; lx += 2) buf[ly * W + lx] = MAG; }
    }
  }
  function drawVignette() {
    if (vgT <= 0 || vgF <= 0) return;
    var k = vgF * clamp01(vgT / 0.35), w = Math.round(5 + 13 * k), side, i, x, y;
    for (side = 0; side < 4; side++) {
      var nxv = side === 0 ? 0 : (side === 1 ? 0 : (side === 2 ? -1 : 1)), nyv = side === 0 ? -1 : (side === 1 ? 1 : 0);
      var wt = vgAng !== vgAng ? 1 : 0.3 + 0.7 * Math.max(0, (Math.cos(vgAng) * nxv + Math.sin(vgAng) * nyv));
      /* un bord s'éclaire du côté d'où vient la menace : sa normale SORTANTE est alignée sur la direction de la menace */
      for (i = 0; i < w; i++) {
        var t = k * wt * Math.pow(1 - i / w, 1.7), t16 = t * 16;
        if (t16 <= 0.5) break;
        if (side < 2) {
          y = side === 0 ? i : H - 1 - i; var rowv = y * W, br = (y & 3) << 2;
          for (x = 0; x < W; x++) if (t16 > BAY[br | (x & 3)]) buf[rowv + x] = SANG;
        } else {
          x = side === 2 ? i : W - 1 - i;
          for (y = 0; y < H; y++) if (t16 > BAY[((y & 3) << 2) | (x & 3)]) buf[y * W + x] = SANG;
        }
      }
    }
  }
  var ecranVu = -99;
  function enMort() { var G = N.game; return !!(G && G.etat && G.etat() === 'mort'); }
  /* la mort : par-dessus le monde remappé en nuit et ardoise, la désintégration cyan et l'explosion de la tête (appelée par 79-scene.drawCause) */
  function drawMort() {
    if (!bind()) return;
    var g = N.gfx, e; OX = g.ox ? g.ox() : 0; OY = g.oy ? g.oy() : 0;
    drawDesint();
    for (e = 0; e < NEX; e++) if (eOn[e] && !eScr[e] && eVar[e]) drawRings(e);
    for (e = 0; e < NEX; e++) if (eOn[e] && !eScr[e] && eVar[e]) { if (eAtt[e]) drawCore(e); else drawFire(e); }
    drawAir(2);
  }
  function drawEcranFx() {
    var e, ox = OX, oy = OY;
    OX = 0; OY = 0;
    for (e = 0; e < NEX; e++) if (eOn[e] && eScr[e]) drawRings(e);
    for (e = 0; e < NEX; e++) if (eOn[e] && eScr[e]) { if (eAtt[e]) drawCore(e); else drawFire(e); }
    for (var i = 0; i < ON; i++) if (onOn[i] && onSc[i]) { var u = onA[i] / onD[i], ez = 1 - (1 - u) * (1 - u); ring(onX[i], onY[i], onR0[i] + (onR1[i] - onR0[i]) * ez, 1 + (onTh[i] - 1) * (1 - u), onC[i], 1 - u * 0.65, 0.10 + 0.75 * u, onN1[i], onN2[i], onN3[i]); }
    drawVignette();
    drawGlitch();
    OX = ox; OY = oy;
  }
  function drawEcran() {
    if (!bind()) return;
    ecranVu = frameNo();
    drawEcranFx();
  }
  function ondesTick(dt) {
    var i;
    for (i = 0; i < ON; i++) if (onOn[i]) { onA[i] += dt; if (onA[i] >= onD[i]) onOn[i] = 0; }
    desintTick(dt); lassoTick(dt);
    if (glA < glD) glA += dt;
    if (vgT > 0) vgT -= dt;
  }

  /* ---- les télégraphes (§ 4.4) : en deux temps, magenta en pointillés qui courent (QUI et OÙ), puis rose pâle plein pendant
     les 300 dernières ms (QUAND). Toujours gainés de nuit profonde, dessinés à l'endroit exact des dégâts. ---- */
  var TN_MAX = 48, TL = [], tlN = 0, TLV = [], tMode = 0, tInk = MAG, tMar = 0, tDash = true;
  for (var tq = 0; tq < TN_MAX; tq++) TL.push({ forme: '', x0: 0, y0: 0, x1: 0, y1: 0, r: 0, a0: 0, a1: 0, reste: 0, total: 0, cible: '', par: { type: '', id: -1 } });
  var TELE_ENN = { fleche: 1, dard: 1, larve: 1, mine: 1, tourelle: 1, lame: 1, ruche: 1, sentinelle: 1, rival: 1, planeur: 1, traqueur: 1, cyclope: 1 };
  function tele(d) {
    if (!d || !d.forme) return -1;
    var pt = d.par ? d.par.type : '', pi = d.par ? d.par.id : -1, i, t = null;
    for (i = 0; i < tlN; i++) if (TL[i].par.id === pi && TL[i].par.type === pt && TL[i].forme === d.forme && pi !== -1) { t = TL[i]; break; }
    if (!t) { if (tlN >= TN_MAX) return -1; t = TL[tlN++]; }
    t.forme = d.forme; t.x0 = +d.x0 || 0; t.y0 = +d.y0 || 0; t.x1 = +d.x1 || 0; t.y1 = +d.y1 || 0; t.r = +d.r || 0;
    t.a0 = +d.a0 || 0; t.a1 = +d.a1 || 0; t.reste = d.reste === undefined ? 1 : +d.reste; t.total = d.total === undefined ? 1 : +d.total;
    t.cible = d.cible || 'tout'; t.par.type = pt; t.par.id = pi;
    TLV.length = tlN; for (i = 0; i < tlN; i++) TLV[i] = TL[i];
    var s = S(); if (s) s.tele = TLV;
    return tlN - 1;
  }
  function tpx(x, y) {
    x -= OX; y -= OY;
    if (tMode === 0) {
      for (var dy = -1; dy <= 1; dy++) { var yy = y + dy; if (yy < 0 || yy >= H) continue; for (var dx = -1; dx <= 1; dx++) { var xx = x + dx; if (xx >= 0 && xx < W) buf[yy * W + xx] = NP; } }
    } else if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = tInk;
  }
  function tline(x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), n = dx > dy ? dx : dy, sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, i = 0;
    if (n > 900) return;
    for (;;) {
      if (tMode === 0 || !tDash || ((i + tMar) % 6 + 6) % 6 < 3) tpx(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      var e2 = err + err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      i++;
    }
  }
  function tarc(cx, cy, r, a0, a1) {
    var n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r)), px = -1e9, py = -1e9;
    for (var k = 0; k <= n; k++) {
      var a = a0 + (a1 - a0) * k / n, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      if (x === px && y === py) continue;
      px = x; py = y;
      if (tMode === 0 || !tDash || (k + tMar) % 4 < 2) tpx(x, y);
    }
  }
  function thatch(x0, y0, x1, y1, step) {                                           /* hachures en diagonale, bornées à la vue */
    var xa = Math.max(Math.floor(x0), OX), xb = Math.min(Math.ceil(x1), OX + W - 1), ya = Math.max(Math.floor(y0), OY), yb = Math.min(Math.ceil(y1), OY + H - 1);
    for (var y = ya; y <= yb; y++) for (var x = xa; x <= xb; x++) if (((x + y + tMar) % step + step) % step === 0) buf[(y - OY) * W + (x - OX)] = tInk;
  }
  function telePass(t) {
    var f = t.forme, cx = t.x0, cy = t.y0;
    if (f === 'ligne') tline(t.x0, t.y0, t.x1, t.y1);
    else if (f === 'disque') tarc(cx, cy, t.r, 0, 6.2832);
    else if (f === 'secteur') { tline(cx, cy, cx + Math.cos(t.a0) * t.r, cy + Math.sin(t.a0) * t.r); tline(cx, cy, cx + Math.cos(t.a1) * t.r, cy + Math.sin(t.a1) * t.r); tarc(cx, cy, t.r, t.a0, t.a1); }
    else if (f === 'losange') { tline(cx - t.r, cy, cx, cy - t.r); tline(cx, cy - t.r, cx + t.r, cy); tline(cx + t.r, cy, cx, cy + t.r); tline(cx, cy + t.r, cx - t.r, cy); }
    else if (f === 'rect' || f === 'voie') { tline(t.x0, t.y0, t.x1, t.y0); tline(t.x1, t.y0, t.x1, t.y1); tline(t.x1, t.y1, t.x0, t.y1); tline(t.x0, t.y1, t.x0, t.y0); }
  }
  function teleFill(t) {
    var f = t.forme;
    if (f === 'rect') thatch(Math.min(t.x0, t.x1), Math.min(t.y0, t.y1), Math.max(t.x0, t.x1), Math.max(t.y0, t.y1), 8);
    else if (f === 'voie') thatch(Math.min(t.x0, t.x1), Math.min(t.y0, t.y1), Math.max(t.x0, t.x1), Math.max(t.y0, t.y1), 5);
    else if (f === 'disque') {
      var r = t.r | 0, y, x, ya = Math.max(-r, OY - t.y0 | 0), yb = Math.min(r, OY + H - 1 - t.y0 | 0);
      for (y = ya; y <= yb; y++) for (x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        var px = Math.round(t.x0) + x - OX, py = Math.round(t.y0) + y - OY;
        if (px >= 0 && py >= 0 && px < W && py < H && (tInk === ROSE ? 5 : 2) > BAY[((py & 3) << 2) | (px & 3)]) buf[py * W + px] = tInk;
      }
    } else if (f === 'secteur') {
      var ns = Math.max(3, Math.ceil(Math.abs(t.a1 - t.a0) * t.r / 5));
      for (var s = 1; s < ns; s++) {
        var a = t.a0 + (t.a1 - t.a0) * s / ns, c = Math.cos(a), sn = Math.sin(a);
        for (var d = 4; d < t.r; d += 3) { var ux = Math.round(t.x0 + c * d) - OX, uy = Math.round(t.y0 + sn * d) - OY; if (ux >= 0 && uy >= 0 && ux < W && uy < H && ((d + s + tMar) & 7) === 0) buf[uy * W + ux] = tInk; }
      }
    }
  }
  function drawTele() {
    if (!bind()) { tlN = 0; TLV.length = 0; return; }
    var g = N.gfx; OX = g.ox ? g.ox() : 0; OY = g.oy ? g.oy() : 0;
    var i, enn = 0;
    tMar = -((clk * 24) | 0);
    for (i = 0; i < tlN; i++) if (TELE_ENN[TL[i].par.type]) enn++;
    for (i = 0; i < tlN; i++) { tMode = 0; tDash = false; telePass(TL[i]); }                      /* la gaine d'abord, sous tout le reste */
    for (i = 0; i < tlN; i++) {
      var t = TL[i], deux = t.reste <= 0.3;
      tMode = 1; tInk = deux ? ROSE : MAG; tDash = !deux;
      teleFill(t); telePass(t);
    }
    tlN = 0; TLV.length = 0;
    /* repli : tant que 72-ennemis dessine ses propres avertissements, ils restent à l'écran (aucun télégraphe enregistré par eux) */
    if (!enn && N.ennemis && N.ennemis.drawTele) { try { N.ennemis.drawTele(); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('fx.drawTele→ennemis', e); } }
  }

  function resetG() {
    var i;
    for (i = 0; i < RL_N; i++) rlL[i] = 0;
    kMonde = kJou = kVis = 1;
    for (i = 0; i < PQ_N; i++) pqF[i] = null;
    for (i = 0; i < ON; i++) onOn[i] = 0;
    for (i = 0; i < DS; i++) dsOn[i] = 0;
    lpAge = -1; lpN = 0; glA = 1; glD = 0; vgT = 0; vgF = 0; tlN = 0; TLV.length = 0; curVar = 0;
  }

  function reset() {
    var s = S();
    rs = (Math.imul((s && s.seed) | 0, 0x9e3779b1) >>> 0) || 2975;
    poolReset();
    for (var e = 0; e < NEX; e++) eOn[e] = 0;
    /* le journal des flashs survit : il dit ce que l'écran a montré, pas l'état du jeu (60-intro.js
       appelle reset() à chaque interlude, une seconde après une explosion peut encore compter) */
    resetG();
    hsSet = -1e9; hsEnd = -1e9; trauma = 0; shakeOut = 0; shakeF = -1; shakeBase = 0;
    shakeClock = 0; shakeDebut = -Infinity; shakeCrete = 0;
    for (var h = 0; h < 1024; h++) { HITF[h] = -1e9; HITT[h] = -1e9; }
    readPrefs();
    if (s) { s.shake = 0; s.heat = 0; }
  }

  N.fx = {
    boom: boom, hitstop: hitstop, hitstopLeft: hitstopLeft, frozen: frozen, shake: shake,
    update: update, draw: draw, reset: reset,
    hit: hit, isHit: isHit, HIT: OS, HITOPT: HITOPT,
    spark: spark, trail: trail,
    flashGate: function (area, opts) { return gate(Math.max(0, +area || 0), opts && opts.type, opts && opts.ci); },
    flashThreshold: thrArea,
    setShake: function (k) { k = +k; userShake = (k >= 0 && k <= 1) ? k : 1; writeShake(); savePrefs(); },
    setFlash: function (b) { userFlash = !!b; savePrefs(); },
    options: function () { return { shake: shakeK(), flash: flashOn(), reduced: reduced }; },
    stats: ST,
    /* lot G (REFONTE.md § 7.8) */
    ralenti: ralenti, k: function () { return kMonde; }, kJoueuse: function () { return kJou; }, kVisuel: function () { return kVis; },
    apres: apres, onde: onde, pickup: pickup, lasso: lasso, glitch: glitch, vignette: vignette, desintegre: desintegre,
    tele: tele, drawTele: drawTele, drawEcran: drawEcran, drawMort: drawMort
  };
})();
