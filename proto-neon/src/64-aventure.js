/* ===== 64-aventure.js — N.film et N.aventure : le voyage, de 1976 à l'intergalactique, de bout en bout =====

   refonte/VISION-PROGRESSION.md (§ 1 les époques, § 6 les deux personnages, la fin à deux, le teaser SNAKE 3019) et
   refonte/INTERMEDES.md. Deux objets, rien ne s'appelle au chargement.

   N.film — un lecteur de film plein écran
     jouer(nom, { surFin, duree, legende, sautable, carte, focal })
         joue le clip cine/<nom>.mp4 (N.art.play / get / stop) ; si la vidéo ne peut pas jouer, son panneau fixe
         art/<nom>.png ; sans panneau (ou nom null), un ciel d'étoiles. Révélation tramée de 0,3 s par seuil de Bayer
         sur la dernière image à l'écran ; recadrage comme 60-intro.js : en paysage l'image couvre l'écran, recadrée
         sur son point focal et prolongée en miroir un cran plus sombre ; en portrait, un bandeau fondu au tramage en
         haut et en bas, le texte dessous. duree : 4,5 s par défaut. legende : une ligne tapée lettre à lettre sous
         l'image. carte : { titre, sous, haut } — un titre en grand, tapé, dans la zone haute de l'image (haut) ou
         au centre. sautable (vrai par défaut) : un toucher ou une touche, passé une garde de 300 ms, finit le film.
         surFin(pourquoi) : 'fin' | 'saut'.
     update(dt) / draw()     draw remplit tout le tampon ;   actif() ;   sauter() ;   stop() (sans surFin) ;   state()

   N.aventure — le déroulé, une liste d'étapes déclarative (ETAPES ci-dessous)
     choix du personnage (N.choix) → film « connexion » → 1976 (N.terminal) → film « fissure » → 1982 (N.arcade) →
     LE NÉON : la main passe au jeu (79-jeu.js) par aJouer(info) → le jeu rend la main par reprendre(evt) aux moments
     clés → films « profondeur », « warp », « espace » (époques futures : les films seuls pour l'instant), chacun suivi
     d'un nouvel aJouer → film de fin du personnage (« fin-elle » / « fin-lui ») → N.choix.marquerFini(qui) → si les
     deux sont finis : « retrouvailles », puis « teaser-3019 » avec la carte SNAKE 3019, puis l'écran À SUIVRE ;
     sinon une invitation à rejouer avec l'autre pilote. Puis surFin(bilan).
     Les films propres au personnage sont choisis par N.art.pour(base) (« fin » → « fin-elle »).
     demarrer({ aJouer, surFin, qui, rattraper, graines })
         aJouer(info)  info = { etape: 'neon' | 'jeu-1993' | 'jeu-2001' | 'jeu-2975', epoque: 1987…, qui, premiere }
         surFin(bilan) bilan = { issue: 'fin' | 'abandon', qui, deux }
         qui           'elle' | 'lui' : saute l'écran de choix (essais, ou choix fait ailleurs)
         rattraper     vrai par défaut : un reprendre('fin') (ou 'warp'…) arrivé avant les films intermédiaires les
                       joue d'abord, à la suite, sans rendre la main entre eux — le voyage reste complet tant que le
                       jeu n'a pas encore ses époques futures
     update(dt) / draw()  à appeler à la place du jeu tant que actif()
     actif()       vrai quand l'aventure tient l'écran (choix, films, 1976, 1982) ; faux pendant que le jeu joue
     enCours()     vrai de demarrer à surFin, y compris pendant que le jeu joue
     etape()       l'id de l'étape en cours : 'choix', 'connexion', '1976', 'fissure', '1982', 'neon', 'profondeur', …
     reprendre(evt)  'profondeur' | 'warp' | 'espace' | 'fin' | 'abandon' (ou { evt }) -> true si accepté
     sauter()      saute ce qui est en cours (film fini, époque à sa fissure ou à son passage, choix par défaut)
     stop()        coupe tout, sans surFin ;   state()  instantané pour les essais ;   ETAPES

   ============================== CE QUE 79-jeu.js DEVRA FAIRE POUR LE BRANCHER ==============================
   (demandé à la cheffe d'orchestre ; ce module ne touche à aucun autre fichier)
   1. Un nouvel état « aventure » (N.ids.etats). Au « JOUER » de l'écran-titre, au lieu de lancer(false) :
          aller('aventure');
          N.aventure.demarrer({ aJouer: entrerDansLeNeon, surFin: finAventure });
   2. Dans update(dt), tout en haut, après le pilote :  if (et === 'aventure') { N.aventure.update(dt); return; }
      Dans draw() :  if (et === 'aventure') { N.aventure.draw(); return; }   drawTop() : rien dans cet état.
      La piste principale se tait tant que l'étape est '1976' ou '1982' (N.terminal et N.arcade ont leur musique) ;
      pendant les films, elle peut rester sur une section calme ; elle repart au premier aJouer.
   3. entrerDansLeNeon(info) — appelé par l'aventure quand la main passe au jeu :
          info.premiere (etape 'neon')  → lancer(false) : plongée puis vague 1, comme aujourd'hui ;
          sinon (après un film d'époque) → reprendre l'état gelé : aller(etatAvantAventure).
   4. Aux moments clés, DANS update (pas dans draw : la dernière image du jeu sert de fond à la révélation),
      le jeu rend la main et se gèle :
          etatAvantAventure = et; if (N.aventure.reprendre('profondeur')) aller('aventure');
      'profondeur' à l'entrée de l'époque 1993, 'warp' au premier warp (N.warp), 'espace' à l'entrée de 2975 ;
      AUJOURD'HUI, seul existe 'fin' : à la victoire, après le film « apotheose », au lieu de terminer(true) :
          if (N.aventure.enCours() && N.aventure.reprendre('fin')) aller('aventure'); else terminer(true);
      (l'aventure joue alors « profondeur », « warp », « espace » à la suite, puis la fin.)
   5. finAventure(bilan) : terminer(true) (écran de fin et score) ou retour au titre. Une défaite pendant le néon ne
      regarde pas l'aventure : elle attend, et « REJOUER » relance le néon ; quitter vers le titre : N.aventure.stop().
   6. Les films de la partie (« chasse », « rival »…) restent ceux de N.intro ; N.film ne sert qu'au voyage.
   ===========================================================================================================

   RÈGLES TENUES ICI : couleurs par N.pal.i seulement ; aucune encre cyan (le cyan des films vient des clips où le
   serpent est à l'image, 05-art.js en décide) ; aucun Math.random (bruit par hachage local) ; aucune horloge lue (le
   temps vient de dt) ; flashs bornés : la révélation est un tramage de 0,3 s, rien ne clignote en grand, les étoiles
   sont des pixels isolés ; textes par N.spr.text. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages ================================ */
  var CFG = { duree: 4.5, garde: 0.3, revele: 0.3, legende: 0.45, lettre: 0.04, carte: 0.9, lettreCarte: 0.09, fondu: 8 };
  /* point focal des illustrations (coordonnées de l'image 384 x 216) : ce que le recadrage garde */
  var FOCAL = { 'teaser-3019': [200, 100], retrouvailles: [194, 108], 'fin-elle': [150, 110] };

  /* ================================ palette ================================ */
  var P = null, DKA = null, DKB = null, DKT = null, BAY = null;
  function pal() {
    if (P) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    P = { vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), violet: I('violet'), indigo: I('indigo'),
      magenta: I('magenta'), rose: I('rosePale'), cyan: I('cyan'), cyanP: I('cyanPale'), ambre: I('ambre'),
      jaune: I('jaune'), brasier: I('brasier'), os: I('os'), acier: I('acier'), sang: I('sang'), np: I('nuitProfonde') };
    BAY = N.pal.BAYER || new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
    function table(pairs) { var t = new Uint8Array(16); for (var k = 0; k < 16; k++) t[k] = k; for (var n in pairs) t[P[n]] = P[pairs[n]]; return t; }
    /* un cran plus sombre, tramé entre deux tables (comme 60-intro.js) : le cyan garde un pixel sur deux */
    DKA = table({ nuit: 'np', ardoise: 'nuit', violet: 'indigo', indigo: 'ardoise', magenta: 'sang', rose: 'magenta',
      cyan: 'cyan', cyanP: 'cyan', ambre: 'brasier', jaune: 'ambre', brasier: 'sang', os: 'acier', acier: 'acier', sang: 'sang' });
    DKB = table({ nuit: 'np', ardoise: 'nuit', violet: 'indigo', indigo: 'ardoise', magenta: 'sang', rose: 'magenta',
      cyan: 'indigo', cyanP: 'cyan', ambre: 'brasier', jaune: 'ambre', brasier: 'sang', os: 'acier', acier: 'ardoise', sang: 'nuit' });
    DKT = new Uint8Array(16); DKT[P.cyan] = 8; DKT[P.acier] = 8; DKT[P.sang] = 8;
    return true;
  }
  function G() { return N.gfx; }
  function S() { return N.S || {}; }
  /* bruit local, déterministe, sans état : N.rnd appartient au jeu */
  function hash(a, b, c) {
    var h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function signaler(ou, e) { try { if (N.socle && N.socle.signaler) N.socle.signaler(ou, e); } catch (x) {} }
  function art(nom) { try { return nom && N.art && N.art.get ? N.art.get(nom) : null; } catch (e) { return null; } }
  function sfx(nom, o) { try { if (N.music && N.music.sfx) N.music.sfx(nom, o); } catch (e) {} }

  /* ================================ géométrie ================================ */
  var L = { W: 0, H: 0, x0: 0, y0: 0, x1: 0, y1: 0, sw: 0, sh: 0, portrait: false, px: 2 };
  function layout() {
    var g = G(), s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 };
    L.W = g.W | 0; L.H = g.H | 0; L.px = g.PX | 0 || 2;
    L.x0 = sf.l | 0; L.y0 = sf.t | 0; L.x1 = L.W - (sf.r | 0); L.y1 = L.H - (sf.b | 0);
    if (L.x1 - L.x0 < 40) { L.x0 = 0; L.x1 = L.W; }
    if (L.y1 - L.y0 < 40) { L.y0 = 0; L.y1 = L.H; }
    L.sw = L.x1 - L.x0; L.sh = L.y1 - L.y0;
    L.portrait = L.H > L.W;
  }
  /* coin haut-gauche d'une image iw x ih autour de son point focal f ; en portrait, posée à la rangée by */
  var POS = { x: 0, y: 0 };
  function cadre(iw, ih, f, by) {
    var W = L.W, H = L.H, x, y;
    if (iw <= W) x = ((W - iw) / 2) | 0;
    else { x = Math.round(W / 2 - f[0]); if (x > 0) x = 0; if (x < W - iw) x = W - iw; }
    if (by !== null && by !== undefined) y = by;
    else if (ih <= H) y = ((H - ih) / 2) | 0;
    else { y = Math.round(H / 2 - f[1]); if (y > 0) y = 0; if (y < H - ih) y = H - ih; }
    POS.x = x; POS.y = y; return POS;
  }
  /* le haut du bandeau en portrait : un peu au-dessus du centre, le texte va dessous */
  function bandeauY(ih) { return Math.max(L.y0 + 6, Math.round((L.H - ih) * 0.34)); }

  /* pose d'une image dans le tampon d'index : seuil de Bayer thr (0..16, 16 = plein), fondu tramé de fade rangées en
     haut et en bas (portrait) ; une image plus étroite (ou moins haute, hors portrait) que l'écran est prolongée en
     miroir, un cran plus sombre : chaque pixel reste un pixel de l'image, rien n'est agrandi */
  function poser(img, ox, oy, thr, fade) {
    var g = G(); if (!img || !img.data || !g || !g.buf) return;
    var B = g.buf(); if (!B) return;
    var W = g.W, H = g.H, iw = img.w, ih = img.h, d = img.data;
    var exX = iw < W, exY = !(fade > 0) && ih < H;
    var x0 = exX ? 0 : (ox < 0 ? 0 : ox), x1 = exX ? W : (ox + iw > W ? W : ox + iw);
    var y0 = exY ? 0 : (oy < 0 ? 0 : oy), y1 = exY ? H : (oy + ih > H ? H : oy + ih);
    for (var y = y0; y < y1; y++) {
      var sy = y - oy, ey = false;
      if (sy < 0) { sy = -sy - 1; ey = true; if (sy >= ih) sy = ih - 1; }
      else if (sy >= ih) { sy = 2 * ih - sy - 1; ey = true; if (sy < 0) sy = 0; }
      var ft = 16;
      if (fade > 0) { var e = sy < ih - 1 - sy ? sy : ih - 1 - sy; if (e < fade) ft = ((e + 0.5) / fade) * 16; }
      var t = thr < ft ? thr : ft, row = sy * iw, o = y * W, br = (y & 3) << 2;
      for (var x = x0; x < x1; x++) {
        var sx = x - ox, ex = ey;
        if (sx < 0) { sx = -sx - 1; ex = true; if (sx >= iw) sx = iw - 1; }
        else if (sx >= iw) { sx = 2 * iw - sx - 1; ex = true; if (sx < 0) sx = 0; }
        var c = d[row + sx];
        if (!c) continue;
        var b = BAY[br | (x & 3)];
        if (t < 16 && !(b < t)) continue;
        if (ex) c = b < DKT[c] ? DKA[c] : DKB[c];
        B[o + x] = c;
      }
    }
  }
  /* le ciel de repli : nuit profonde qui s'éclaircit vers le bas par paliers tramés, des étoiles isolées qui
     scintillent lentement */
  function etoiles(u, thr) {
    var g = G(), W = L.W, H = L.H, B = g.buf(), t16 = thr === undefined ? 16 : thr;
    for (var y = 0; y < H; y++) {
      var o = y * W, br = (y & 3) << 2, v = y / H, palier = v < 0.55 ? 0 : (v < 0.7 ? 3 : (v < 0.85 ? 6 : 9));
      for (var x = 0; x < W; x++) {
        var b = BAY[br | (x & 3)];
        if (t16 >= 16 || b < t16) B[o + x] = b < palier ? P.nuit : P.np;
      }
    }
    if (t16 < 16) return;
    var n = (W * H / 240) | 0;
    for (var i = 0; i < n; i++) {
      var sx = (hash(i, 3, 5) * W) | 0, sy = (hash(i, 9, 2) * H) | 0, k = hash(i, 1, 1);
      var bat = hash(i, Math.floor(u * 1.5 + k * 7), 4) < 0.15;          // un scintillement lent, pixel par pixel
      B[sy * W + sx] = bat ? P.os : (k < 0.4 ? P.acier : (k < 0.8 ? P.violet : P.rose));
    }
  }

  /* ================================ texte ================================ */
  function txt(str, k, ci, contour) {
    if (!N.spr || !N.spr.text) return null;
    try { return N.spr.text(str, { ci: ci, echelle: k, ombre: true, contour: !!contour }); } catch (e) { return null; }
  }
  function largeur(str, k) { var sp = txt(str, k, P.os, false); return sp ? sp.w - k : str.length * 6 * k; }
  /* pose les n premières lettres : le préfixe a la mise en page du début de la ligne complète, rien ne bouge */
  function ecrire(str, x, y, k, ci, n, contour) {
    var g = G(); if (!g || !g.blit) return;
    var s = (n === undefined || n >= str.length) ? str : str.slice(0, Math.max(0, n));
    if (!s) return;
    var sp = txt(s, k, ci, contour); if (!sp || !sp.data) return;
    var m0 = contour ? k : 0;
    g.blit(sp, Math.round(x) - m0, Math.round(y) - (sp.top !== undefined ? sp.top : m0));
  }
  /* la plus grande échelle entière qui tienne dans la largeur sûre, entre 1 et kmax ; cible : des capitales de
     28 px CSS (cible), jamais moins de 14 px */
  function echelle(strs, kmax, cible, marge) {
    var k = Math.max(1, Math.min(kmax, Math.round((cible || 28) / (7 * L.px))));
    var room = L.sw - 2 * (marge === undefined ? 6 : marge);
    for (; k > 1; k--) {
      var ok = true;
      for (var i = 0; i < strs.length; i++) if (largeur(strs[i], k) > room) { ok = false; break; }
      if (ok) break;
    }
    return k;
  }
  /* aplat sombre derrière un bloc de texte, bords tramés : lisible sur n'importe quelle image */
  function plaque(x, y, w, h) {
    var g = G(); if (!g) return;
    g.rect(x, y, w, h, P.np);
    if (g.ditherRect) { g.ditherRect(x, y - 2, w, 2, P.np, 0.5); g.ditherRect(x, y + h, w, 2, P.np, 0.5); }
  }

  /* ======================================================================================================
     N.film
     ====================================================================================================== */
  var F = { on: false, nom: null, t: 0, d: CFG.duree, legende: '', sautable: true, surFin: null, clip: false,
    video: false, videoVue: false, repli: false, saute: false, garde: 0, typed: 0, bip: 0, carte: null, focal: null,
    n: 0, journal: [] };
  var SNAP = { w: 0, h: 0, data: null };
  function fjournal(e) { F.journal.push({ e: e, t: +F.t.toFixed(2) }); if (F.journal.length > 64) F.journal.shift(); }
  /* la dernière image à l'écran, copiée : la révélation tramée part d'elle, pas du noir */
  function figer() {
    var g = G(); if (!g || !g.buf || !g.buf()) { SNAP.w = 0; return; }
    var b = g.buf();
    if (!SNAP.data || SNAP.data.length !== b.length) SNAP.data = new Uint8Array(b.length);
    SNAP.data.set(b); SNAP.w = g.W; SNAP.h = g.H;
  }
  function jouer(nom, o) {
    if (!pal() || !G()) return false;
    o = o || {};
    if (F.on) arreterFilm();
    F.on = true; F.nom = nom || null; F.t = 0; F.d = o.duree > 0 ? +o.duree : CFG.duree;
    F.legende = o.legende ? String(o.legende) : ''; F.sautable = o.sautable !== false;
    F.surFin = typeof o.surFin === 'function' ? o.surFin : null;
    F.carte = o.carte && o.carte.titre ? { titre: String(o.carte.titre), sous: o.carte.sous ? String(o.carte.sous) : '', haut: !!o.carte.haut } : null;
    F.focal = o.focal || (nom && FOCAL[nom]) || [192, 108];
    F.saute = false; F.garde = 0; F.typed = 0; F.bip = 0; F.video = false; F.videoVue = false;
    F.clip = false;
    if (nom) { try { F.clip = !!(N.art && N.art.play && N.art.play(nom)); } catch (e) { F.clip = false; } }
    F.repli = !art(nom);
    F.n++;
    figer();
    var s = S(); if (s.input) s.input.any = false;       // un geste déjà fait ne saute pas ce film
    F.journal.length = 0;
    fjournal('film ' + (nom || '-') + (F.clip ? ' clip' : ' panneau'));
    return true;
  }
  function arreterFilm() {
    if (F.nom) { try { if (N.art && N.art.stop) N.art.stop(F.nom); } catch (e) {} }
    F.on = false;
  }
  function finFilm(pourquoi) {
    if (!F.on) return;
    fjournal(pourquoi + ' ' + (F.nom || '-'));
    F.saute = pourquoi === 'saut';
    arreterFilm();
    var f = F.surFin; F.surFin = null;
    if (f) { try { f(pourquoi); } catch (e) { signaler('film.surFin', e); } }
  }
  function updateFilm(dt) {
    if (!F.on) return;
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    F.t += dt; F.garde += dt;
    if (F.clip && F.nom) {
      var fin = true;
      try { fin = N.art.ended(F.nom); } catch (e) { fin = true; }
      F.video = !fin; if (F.video && F.t > 0.5) F.videoVue = true;
    }
    if (F.repli && art(F.nom)) F.repli = false;           // le panneau finit de se décoder
    var s = S(), inp = s.input;
    if (inp) {
      if (F.garde < CFG.garde || !F.sautable) inp.any = false;
      else if (inp.any || (inp.taps && inp.taps.length)) { inp.any = false; finFilm('saut'); return; }
    }
    if (F.t >= F.d) finFilm('fin');
  }
  function drawFilm() {
    if (!pal()) return;
    var g = G(); if (!g || !g.buf || !g.buf()) return;
    if (g.origin) g.origin(0, 0);
    layout();
    var u = F.t, rv = clamp01(u / CFG.revele), B = g.buf(), img = art(F.nom), pos = null, thr = rv * 16;
    /* sous la révélation : la dernière image, figée */
    var snapOk = rv < 1 && SNAP.data && SNAP.w === g.W && SNAP.h === g.H && B.length === SNAP.data.length;
    if (snapOk) B.set(SNAP.data); else if (rv >= 1 || !img) g.rect(0, 0, L.W, L.H, P.np);
    if (img) {
      if (L.portrait) {
        /* le bandeau : le reste de l'écran s'efface au même seuil de Bayer que l'image se révèle */
        if (g.ditherRect) g.ditherRect(0, 0, L.W, L.H, P.vide, rv);
        pos = cadre(img.w, img.h, F.focal, bandeauY(img.h));
        poser(img, pos.x, pos.y, thr, CFG.fondu);
      } else {
        pos = cadre(img.w, img.h, F.focal, null);
        poser(img, pos.x, pos.y, thr, 0);
      }
    } else etoiles(u, snapOk ? thr : 16);
    if (F.legende && u > CFG.legende) legende(img, u);
    if (F.carte) carte(img, pos, u);
  }
  function legende(img, u) {
    var str = F.legende, k = echelle([str], 3, 28, 10), w = largeur(str, k), n = Math.floor((u - CFG.legende) / CFG.lettre) + 1;
    var x = Math.round(L.x0 + (L.sw - w) / 2);
    var y = (L.portrait && img) ? Math.min(Math.round(bandeauY(img.h) + img.h + 14), L.y1 - 7 * k - 10) : L.y1 - 7 * k - 10;
    plaque(x - 4 * k, y - 3 * k, w + 8 * k, 13 * k);
    ecrire(str, x, y, k, P.os, n, false);
    if (n <= str.length && n > F.typed) { if (n - F.bip >= 2) { F.bip = n; sfx('tir', { pitch: n % 5 }); } F.typed = n; }
  }
  /* la carte de titre : le titre en grand, tapé lettre à lettre, puis la ligne du dessous ; dans la zone haute de
     l'image si haut (le teaser laisse son ciel vide pour ça), sinon au centre */
  function carte(img, pos, u) {
    var C = F.carte, a = u - CFG.carte; if (a < 0) return;
    var kt = echelle([C.titre], 4, 42, 8), wt = largeur(C.titre, kt);
    var nt = Math.floor(a / CFG.lettreCarte) + 1;
    var ks = C.sous ? echelle([C.sous], Math.max(1, kt - 1), 42, 8) : 1, ws = C.sous ? largeur(C.sous, ks) : 0;
    var hBloc = 7 * kt + (C.sous ? 6 + 7 * ks : 0), y;
    if (C.haut && img && pos) y = Math.max(L.y0 + 6, pos.y + Math.round(img.h * 0.07));
    else y = Math.round(L.y0 + (L.sh - hBloc) / 2);
    var x = Math.round(L.x0 + (L.sw - wt) / 2);
    ecrire(C.titre, x, y, kt, P.os, nt, true);
    if (nt <= C.titre.length && nt > F.typed) { F.typed = nt; if (C.titre.charAt(nt - 1) !== ' ') sfx('tir', { pitch: nt % 5 }); }
    if (!C.sous) return;
    var as = a - C.titre.length * CFG.lettreCarte - 0.3; if (as < 0) return;
    var ns = Math.floor(as / CFG.lettre) + 1;
    ecrire(C.sous, Math.round(L.x0 + (L.sw - ws) / 2), y + 7 * kt + 6, ks, P.rose, ns, true);
  }

  N.film = {
    jouer: jouer, update: updateFilm, draw: drawFilm,
    actif: function () { return F.on; },
    sauter: function () { if (F.on) finFilm('saut'); },
    stop: function () { F.surFin = null; if (F.on) { fjournal('stop ' + (F.nom || '-')); arreterFilm(); } },
    state: function () {
      return { actif: F.on, nom: F.nom, t: +F.t.toFixed(2), duree: F.d, legende: F.legende, typed: F.typed,
        clip: F.clip, video: F.video, videoVue: F.videoVue, panneau: !!art(F.nom), repli: F.repli, saute: F.saute,
        carte: F.carte ? F.carte.titre : null, n: F.n, journal: F.journal.slice() };
    },
    CFG: CFG, FOCAL: FOCAL
  };

  /* ======================================================================================================
     N.aventure
     ======================================================================================================
     Une étape : { id, type, … }. Les types :
       choix   l'écran ELLE / LUI (N.choix) ; sans lui, le personnage de demarrer({ qui }) ou 'elle'
       film    base (N.art.pour en fait « base-elle » / « base-lui » s'il existe), legende (texte, ou { elle, lui }),
               duree, carte ; evt : l'étape n'est atteinte que par reprendre(evt)
       epoque  module (N.terminal, N.arcade), graine ; sans le module, l'étape est passée
       jeu     la main passe au jeu par aJouer ; elle revient par reprendre
       bilan   marque le personnage fini (N.choix.marquerFini) et regarde si les deux le sont
     si : 'deux' (seulement quand les deux pilotes sont finis) | 'seul' (seulement sinon). */
  var ETAPES = [
    { id: 'choix', type: 'choix' },
    { id: 'connexion', type: 'film', base: 'connexion', legende: '1976 — LE TERMINAL' },
    { id: '1976', type: 'epoque', module: 'terminal', graine: 1976 },
    { id: 'fissure', type: 'film', base: 'fissure', legende: 'LA GRILLE SE BRISE' },
    { id: '1982', type: 'epoque', module: 'arcade', graine: 1982 },
    { id: 'eclat', type: 'film', base: 'neon', legende: '1987 — LE NÉON' },
    { id: 'neon', type: 'jeu', epoque: 1987 },
    { id: 'profondeur', type: 'film', base: 'profondeur', evt: 'profondeur', legende: '1993 — LA PROFONDEUR' },
    { id: 'jeu-1993', type: 'jeu', epoque: 1993 },
    { id: 'warp', type: 'film', base: 'warp', evt: 'warp', legende: '2001 — LE WARP' },
    { id: 'jeu-2001', type: 'jeu', epoque: 2001 },
    { id: 'espace', type: 'film', base: 'espace', evt: 'espace', legende: '2975 — L\'INTERGALACTIQUE' },
    { id: 'jeu-2975', type: 'jeu', epoque: 2975 },
    { id: 'fin', type: 'film', base: 'fin', evt: 'fin', duree: 5, legende: { elle: 'FIN — LA PILOTE', lui: 'FIN — LE PILOTE' } },
    { id: 'bilan', type: 'bilan' },
    { id: 'rejouer', type: 'film', si: 'seul', base: { elle: 'pilote-lui', lui: 'pilote-elle' }, duree: 3.5,
      legende: { elle: 'LE PILOTE T\'ATTEND', lui: 'LA PILOTE T\'ATTEND' } },
    { id: 'retrouvailles', type: 'film', si: 'deux', base: 'retrouvailles', duree: 5, legende: 'LES DEUX MONDES SE TOUCHENT' },
    { id: 'teaser', type: 'film', si: 'deux', base: 'teaser-3019', duree: 5.5,
      carte: { titre: 'SNAKE 3019', sous: 'BIENTÔT. À DEUX.', haut: true } },
    { id: 'asuivre', type: 'film', si: 'deux', base: null, duree: 12, carte: { titre: 'À SUIVRE', sous: 'SNAKE 3019' } }
  ];
  var MAX_PAS = 64;                                          // garde-fou contre une boucle d'étapes vides

  var A = { on: false, i: -1, qui: null, deux: false, main: false, aJouer: null, surFin: null, opts: null,
    suite: false, cible: -1, vus: {}, t: 0, joues: [], journal: [], profil: { elle: false, lui: false }, premiere: true };
  function ajournal(e) { A.journal.push({ e: e, t: +A.t.toFixed(2) }); if (A.journal.length > 96) A.journal.shift(); }
  function etapeCourante() { return A.i >= 0 && A.i < ETAPES.length ? ETAPES[A.i] : null; }
  function selon(v) { return (v && typeof v === 'object') ? (v[A.qui || 'elle'] || null) : v; }
  function existe(nom) {
    try { if (N.art && N.art.names && N.art.names().indexOf(nom) >= 0) return true; } catch (e) {}
    return typeof CINE_DISPO !== 'undefined' && CINE_DISPO.indexOf(nom) >= 0;
  }
  /* le film propre au personnage : N.art.pour lit N.choix.personnage() ; sans choix fait là (choix sauté, N.choix
     absent), le personnage retenu ici */
  function nomFilm(base) {
    if (!base) return null;
    var n = base;
    try { if (N.art && N.art.pour) n = N.art.pour(base); } catch (e) { n = base; }
    if (n === base && A.qui && existe(base + '-' + A.qui)) n = base + '-' + A.qui;
    return n;
  }
  function moduleDe(nom) { var m = N[nom]; return (m && typeof m.start === 'function' && typeof m.update === 'function') ? m : null; }
  function preparerSuivant(i) {
    for (var j = i + 1; j < ETAPES.length; j++) {
      var e = ETAPES[j];
      if (e.type !== 'film') continue;
      var n = nomFilm(selon(e.base));
      if (n) { try { if (N.art && N.art.prepare) N.art.prepare(n); } catch (x) {} }
      return;
    }
  }
  function marquerFini(qui) {
    A.profil[qui] = true;
    try { if (N.choix && N.choix.marquerFini) N.choix.marquerFini(qui); } catch (e) { signaler('aventure.marquerFini', e); }
  }
  function lesDeuxFinis() {
    try { if (N.choix && N.choix.lesDeuxFinis) return !!N.choix.lesDeuxFinis(); } catch (e) {}
    return A.profil.elle && A.profil.lui;
  }
  function suite() { A.suite = true; }

  /* entre dans l'étape i, ou la première suivante qui a lieu ; les étapes instantanées s'enchaînent ici */
  function entrer(i) {
    for (var pas = 0; pas < MAX_PAS; pas++, i++) {
      A.main = false;
      if (i >= ETAPES.length) { finir('fin'); return; }
      var e = ETAPES[i];
      A.i = i;
      if (e.si === 'deux' && !A.deux) continue;
      if (e.si === 'seul' && A.deux) continue;
      if (A.cible >= 0) {                                   // rattrapage : on va vers la cible sans rendre la main
        if (i === A.cible) A.cible = -1;
        else if (e.type === 'jeu' || (e.evt && A.vus[e.id])) continue;
      }
      if (e.type === 'choix') {
        if (A.opts.qui === 'elle' || A.opts.qui === 'lui') { A.qui = A.opts.qui; ajournal('choix donné ' + A.qui); continue; }
        if (N.choix && N.choix.start && N.choix.start({ surFin: function (qui) { A.qui = qui === 'lui' ? 'lui' : 'elle'; ajournal('choisi ' + A.qui); suite(); } }) !== false) {
          A.main = true; ajournal('choix'); return;
        }
        A.qui = A.qui || 'elle'; ajournal('choix absent, ' + A.qui); continue;
      }
      if (e.type === 'film') {
        var nom = nomFilm(selon(e.base));
        if (!N.film.jouer(nom, { duree: e.duree, legende: selon(e.legende), carte: e.carte, surFin: suite })) { ajournal('film impossible ' + e.id); continue; }
        A.vus[e.id] = true; A.joues.push(nom || e.id); A.main = true;
        ajournal('film ' + e.id + ' ' + (nom || '-'));
        preparerSuivant(i);
        return;
      }
      if (e.type === 'epoque') {
        var m = moduleDe(e.module), ok = false;
        var gr = (A.opts.graines && A.opts.graines[e.id]) || e.graine;
        if (m) { try { ok = m.start({ graine: gr, surFin: suite }) !== false; } catch (x) { signaler('aventure.' + e.module, x); ok = false; } }
        if (!ok) { ajournal('époque ' + e.id + ' absente'); continue; }
        A.main = true; ajournal('époque ' + e.id);
        preparerSuivant(i);
        return;
      }
      if (e.type === 'bilan') {
        marquerFini(A.qui || 'elle');
        A.deux = lesDeuxFinis();
        ajournal('fini ' + A.qui + (A.deux ? ' — les deux' : ''));
        continue;
      }
      if (e.type === 'jeu') {
        ajournal('jeu ' + e.id);
        if (!A.aJouer) {                                     // sans jeu (page d'essai nue) : le voyage se raconte d'une traite
          ajournal('sans jeu');
          var j = indexEvt('fin', i);
          if (j < 0) { finir('fin'); return; }
          A.cible = j; continue;
        }
        var info = { etape: e.id, epoque: e.epoque, qui: A.qui, premiere: A.premiere };
        A.premiere = false;
        try { A.aJouer(info); } catch (x) { signaler('aventure.aJouer', x); }
        return;
      }
      ajournal('étape inconnue ' + e.id);
    }
    finir('fin');
  }
  function indexEvt(evt, apres) {
    for (var j = apres + 1; j < ETAPES.length; j++) if (ETAPES[j].evt === evt) return j;
    return -1;
  }
  function couper() {
    var e = etapeCourante();
    if (F.on) N.film.stop();
    if (e && e.type === 'epoque') { var m = moduleDe(e.module); if (m && m.stop) { try { m.stop(); } catch (x) {} } }
    if (e && e.type === 'choix' && N.choix && N.choix.stop && N.choix.actif && N.choix.actif()) { try { N.choix.stop(); } catch (x) {} }
  }
  function finir(issue) {
    if (!A.on) return;
    couper();
    A.on = false; A.main = false;
    ajournal('aventure ' + issue);
    var f = A.surFin; A.surFin = null;
    if (f) { try { f({ issue: issue, qui: A.qui, deux: A.deux }); } catch (e) { signaler('aventure.surFin', e); } }
  }

  function demarrer(o) {
    o = o || {};
    if (!pal()) return false;
    if (A.on) couper();
    A.on = true; A.i = -1; A.main = false; A.suite = false; A.cible = -1; A.vus = {}; A.t = 0; A.joues = [];
    A.journal.length = 0; A.premiere = true; A.deux = false;
    A.qui = (o.qui === 'elle' || o.qui === 'lui') ? o.qui : null;
    A.aJouer = typeof o.aJouer === 'function' ? o.aJouer : null;
    A.surFin = typeof o.surFin === 'function' ? o.surFin : null;
    A.opts = { qui: A.qui, rattraper: o.rattraper !== false, graines: o.graines || null };
    ajournal('début');
    entrer(0);
    return true;
  }
  function update(dt) {
    if (!A.on) return;
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    A.t += dt;
    var e = etapeCourante();
    if (A.main && e) {
      if (e.type === 'choix' && N.choix) { try { N.choix.update(dt); } catch (x) { signaler('aventure.choix', x); } }
      else if (e.type === 'film') updateFilm(dt);
      else if (e.type === 'epoque') { var m = moduleDe(e.module); if (m) { try { m.update(dt); } catch (x) { signaler('aventure.' + e.module, x); } } }
    }
    if (A.suite && A.on) { A.suite = false; entrer(A.i + 1); }
  }
  function draw() {
    if (!A.on) return;
    var e = etapeCourante(); if (!e) return;
    if (e.type === 'choix' && N.choix) { try { N.choix.draw(); } catch (x) { signaler('aventure.choix', x); } }
    else if (e.type === 'film') drawFilm();
    else if (e.type === 'epoque') { var m = moduleDe(e.module); if (m) { try { m.draw(); } catch (x) { signaler('aventure.' + e.module, x); } } }
  }
  function reprendre(evt) {
    if (evt && typeof evt === 'object') evt = evt.evt || evt.type;
    evt = String(evt || '').toLowerCase();
    var e = etapeCourante();
    if (!A.on || !e) return false;
    if (evt === 'abandon') { ajournal('abandon'); finir('abandon'); return true; }
    if (e.type !== 'jeu') { ajournal('reprendre ignoré ' + evt + ' (' + e.id + ')'); return false; }
    var j = indexEvt(evt, A.i);
    if (j < 0) { ajournal('reprendre inconnu ' + evt); return false; }
    ajournal('reprendre ' + evt);
    if (A.opts.rattraper) { A.cible = j; entrer(A.i + 1); }
    else entrer(j);
    return true;
  }
  function sauter() {
    var e = etapeCourante(); if (!A.on || !e || !A.main) return false;
    ajournal('sauter ' + e.id);
    if (e.type === 'film') { N.film.sauter(); return true; }
    if (e.type === 'epoque') { var m = moduleDe(e.module); if (m && m.skip) { m.skip(); return true; } if (m && m.stop) m.stop(); suite(); return true; }
    if (e.type === 'choix') { couper(); A.qui = A.qui || 'elle'; suite(); return true; }
    return false;
  }

  N.aventure = {
    demarrer: demarrer, update: update, draw: draw, reprendre: reprendre, sauter: sauter,
    actif: function () { return A.on && A.main; },
    enCours: function () { return A.on; },
    etape: function () { var e = etapeCourante(); return A.on && e ? e.id : null; },
    stop: function () { if (!A.on) return; couper(); A.on = false; A.main = false; A.surFin = null; ajournal('stop'); },
    state: function () {
      var e = etapeCourante();
      return { enCours: A.on, actif: A.on && A.main, etape: A.on && e ? e.id : null, type: e ? e.type : null, i: A.i,
        qui: A.qui, deux: A.deux, cible: A.cible >= 0 ? ETAPES[A.cible].id : null, t: +A.t.toFixed(2),
        vus: Object.keys(A.vus), joues: A.joues.slice(), film: N.film.state(), journal: A.journal.slice() };
    },
    ETAPES: ETAPES
  };
})();
