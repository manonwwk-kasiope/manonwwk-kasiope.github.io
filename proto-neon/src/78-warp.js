/* ===== 78-warp.js — N.warp : le WARP et le curseur cible (époque 2001) =====

   refonte/VISION-PROGRESSION.md § 2. Par moments choisis, le monde tombe à 0,15 de sa vitesse pendant environ 4 s ;
   une lunette balaie l'écran, le second doigt (ou le clic, ou Espace) verrouille ce qui passe sous elle, et à la fin
   du warp — ou au relâcher — tout part : un tir par verrou, l'arme choisie selon la cible. C'est l'arme contre ce
   qui est trop rapide pour le serpent.

   LE TEMPS (secondes RÉELLES, celles de update) :
     entrée 0,3 s   le facteur du monde descend de 1 à 0,15 (lissé) ; le curseur est déjà là
     visée  3,4 s   facteur 0,15 ; on verrouille (8 verrous au plus)
     salve          à la fin de la visée, ou au relâcher d'un doigt tenu : chaque verrou lance son arme, 60 ms d'écart
     sortie 0,45 s  le facteur remonte à 1 (lissé) ; les tirs partis volent dans le temps du MONDE
     recharge 1 s   aucun nouveau warp avant
   Total : environ 4,2 s de ralenti, 3,7 s utiles à la visée.

   LE CURSEUR (une lunette, en px ÉCRAN, os et jaune, jamais cyan) : il balaie seul une courbe de Lissajous (périodes
   2,6 s et 1,9 s) dans un cadre qui suit les cibles visibles (centré sur elles, 96 × 68 px au moins, la zone de jeu
   sans cible), hésite (vitesse × 0,4) quand une cible est sous lui, et une cible à moins de 26 px
   l'attire. Il se guide : la souris (bureau) le prend dès qu'elle bouge ; un GLISSÉ du second doigt le pousse
   (× 1,6 du geste) ; si 90-boot.js publie un jour S.input.action = { actif, x, y } (le second doigt en px écran,
   voir la Demande), il suit ce doigt.

   LES ENTRÉES, lues dans S.input, jamais écrites :
     taps (doigt 'action')          verrouille la cible sous le curseur, sinon la plus proche du doigt (20 px)
     boost (second doigt TENU), pointer.actif (bouton de souris), fire (Espace, K)  = la gâchette :
       l'appui verrouille sous le curseur ; tenue plus de 0,18 s, elle PEINT (tout ce qui passe sous la lunette est
       verrouillé, un verrou toutes les 0,1 s) ; relâchée après avoir peint, elle lance la salve et clôt le warp.
     gestes 'glisse' (dx, dy en pt)  pousse le curseur ;   pointer.x, y  le curseur suit la souris.
   À la souris, les taps sont ignorés (le clic a déjà verrouillé à l'appui).

   LES QUATRE ARMES, choisies par verrou, dans cet ordre (réévaluées à chaque image, figées à la salve) :
     BOMBE    au moins 3 cibles à 26 px l'une de l'autre autour du verrou : bombe lancée en cloche (0,45 s), souffle de
              rayon 30 px (26 + étalement du groupe, 34 au plus) centré sur le groupe, 70 de dégâts à chacun
     LASER    une autre cible dans le couloir (rayon + 3 px) de la ligne tête → verrou, prolongée à 340 px : la ligne
              traverse tout ce qu'elle croise, 90 de dégâts chacun ; jamais sur une TOURELLE (son blindage de face le
              renverrait : le laser porte src.x, y = la tête, comme les tirs du CANON)
     MINE     cible RAPIDE (modificateur RAPIDE, ou plus de 100 px/s mesurés dans le temps du monde) : la mine est
              jetée (0,3 s) sur sa trajectoire, là où elle sera dans 0,5 s ; armée, elle glisse (45 px/s) vers ce qui
              passe à 40 px et saute quand un ennemi est à 12 px (souffle 24 px, 90 de dégâts), ou au bout de 6 s
     MISSILE  sinon (cible isolée, mobile, boss) : tête chercheuse, 120 → 320 px/s, virage 9 rad/s, 80 de dégâts ;
              si la cible meurt avant, il prend la plus proche à 80 px
   Une cible peut porter plusieurs verrous si ses PV le demandent (⌈pv / 80⌉, 3 au plus, 4 pour le boss). Les TRAQUEURS
   ne se verrouillent pas (seul le LASSO les tue), ni les ennemis encore dans leur portail.
   Tout passe par N.ennemis.hit(e, dégâts, src), l'API publique de 72-ennemis.js (rien n'y est ajouté). src = { genre:
   'arme', type, warp, id: -1 } : missiles et mines prennent les types 'missiles' et 'minesQ' que 72-ennemis exempte déjà
   du blindage de face (un missile plonge, une mine souffle), la bombe aussi ('minesQ') ; le laser a le type 'laser'.
   Le champ warp ('missile' | 'bombe' | 'mine' | 'laser') dit quelle arme du warp a frappé.

   INTERFACE (N.warp), rien ne s'appelle au chargement :
       declencher(raison[, o])  lance un warp ('jauge' | 'pickup' | 'escadrille' | 'essai'…) ; o.duree remplace la
                                visée ; -> false s'il est déjà en cours ou en recharge
       actif()                  vrai de l'entrée à la fin de la sortie ;   capte()  vrai pendant entrée et visée (les
                                gestes du second doigt appartiennent alors au curseur)
       facteur()                le facteur de temps du MONDE pour cette image (1 hors warp, 0,15 au creux)
       update(dtReel)           à appeler AVANT la mise à jour du monde, avec le dt réel de l'image
       draw(couche)             'monde' : voile froid, étirement, traînées, annonces et tirs (après N.game.draw) ;
                                'dessus' : curseur, réticules, compteur en bas au centre (après N.game.drawTop) ; sans argument : les deux
       verrous()                copie des verrous { id, x, y, arme }
       annuler()                coupe le warp sans salve (mort de la joueuse : fait tout seul) ;  reset()  efface tout
       state()                  instantané pour les essais (phase, facteur, curseur, cible sous lui, compteurs par arme)

   CE QUE LE JEU DOIT FAIRE POUR LE BRANCHER (demandé, pas fait ici ; ce module ne touche à aucun autre fichier) :
     1. à chaque image, AVANT le monde : N.warp.update(dtReel), puis donner au monde (N.game.update, N.fx.update,
        la caméra) dt × N.warp.facteur() ; l'interface, les écrans et la musique gardent le dt réel ;
     2. dessin : N.warp.draw('monde') après N.game.draw (avant N.fx.draw), N.warp.draw('dessus') après N.game.drawTop ;
     3. déclencher : N.warp.declencher('jauge' | 'pickup' | 'escadrille') au moment choisi (jamais au hasard) ; l'entrée
        d'une escadrille ultra-rapide annoncée 1 s avant (sirène, chevrons) est au directeur ;
     4. tant que N.warp.capte(), 70-joueuse ignore boost, pouvoir et apogée (le second doigt vise) ;
     5. N.warp.reset() à chaque nouvelle partie et à chaque vague forcée ;
     6. la musique en demi-temps pendant actif() (30-music.js) ; ici, seuls les sons 'ralenti', 'arme', 'salve' et
        'explosion' sont demandés à N.music.sfx.

   RÈGLES TENUES ICI : couleurs par N.pal.i seulement ; le cyan n'est jamais posé (la joueuse le garde) ; aucun
   Math.random (générateur local à graine) ; aucune horloge lue (le temps vient de dt) ; flashs bornés : le voile est
   un remplacement d'index sombres par d'autres index sombres (vide → nuit profonde, violet → indigo…), tramé à
   l'entrée et à la sortie, sans changement de luminance notable ; le seul éclat est le laser (une ligne de 3 px). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages (→ N.R.warp) ================================ */
  var CFG = {
    facteur: 0.15, entree: 0.3, visee: 3.4, sortie: 0.45, recharge: 1.0,
    verrousMax: 8, parCible: 3, parBoss: 4,
    capture: 11, aimant: 26, cadreMin: [48, 34], aimantForce: 6, hesitation: 0.4, periodes: [2.6, 1.9], suivi: 0.07, glisse: 1.6, doigt: 20,
    tenu: 0.18, peinture: 0.1, salveEcart: 0.06,
    rapide: 100, groupe: 26, groupeMin: 3, couloir: 3,
    missile: { degats: 80, v0: 120, vmax: 320, accel: 900, virage: 9, vie: 2.2, reprise: 80 },
    bombe: { degats: 70, rayon: 30, rayonMax: 34, vol: 0.45, cloche: 22 },
    mine: { degats: 90, rayon: 24, declenche: 12, avance: 0.5, lancer: 0.3, vie: 6, flair: 40, derive: 45 },
    laser: { degats: 90, longueur: 340, vie: 0.35 },
    trainee: 0.12, stries: 28
  };
  function cfg() {
    var r = N.R && N.R.warp;
    if (r && !cfg.fait) { for (var k in r) if (Object.prototype.hasOwnProperty.call(r, k)) CFG[k] = r[k]; cfg.fait = true; }
    return CFG;
  }

  var P = null, LUT = null;
  function pal() {
    if (P) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    P = { vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), indigo: I('indigo'), violet: I('violet'), magenta: I('magenta'),
      rose: I('rosePale'), ambre: I('ambre'), jaune: I('jaune'), brasier: I('brasier'), os: I('os'), acier: I('acier'),
      sang: I('sang'), np: I('nuitProfonde') };
    /* le voile froid : les fonds sombres glissent vers le bleu de la nuit profonde ; les encres vives ne bougent pas */
    LUT = new Uint8Array(16);
    for (var i = 0; i < 16; i++) LUT[i] = i;
    LUT[P.vide] = P.np; LUT[P.nuit] = P.np; LUT[P.ardoise] = P.indigo; LUT[P.violet] = P.indigo;
    return true;
  }
  function G() { return N.gfx; }
  function S() { return N.S || {}; }
  function O() { return N.outils || null; }
  function tete() { return N.joueuse && N.joueuse.tete ? N.joueuse.tete : null; }
  function cam() { return N.cam || { x: 0, y: 0, w: (G() && G().W) || 0, h: (G() && G().H) || 0 }; }
  function sfx(nom, o) { try { if (N.music && N.music.sfx) N.music.sfx(nom, o || {}); } catch (e) { /* le son n'est jamais bloquant */ } }

  /* générateur local à graine : le warp ne consomme pas le hasard du jeu */
  var rs = 2001;
  function rnd() { rs = (rs * 1664525 + 1013904223) % 4294967296; return rs / 4294967296; }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lisse(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function segD2(px, py, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy, u = l > 0 ? ((px - x0) * dx + (py - y0) * dy) / l : 0;
    u = clamp(u, 0, 1);
    return d2(px, py, x0 + dx * u, y0 + dy * u);
  }
  function wrapA(a) { while (a > Math.PI) a -= 6.283185307; while (a < -Math.PI) a += 6.283185307; return a; }

  /* ================================ l'état ================================ */
  var W = {
    phase: 'repos', t: 0, pt: 0, f: 1, fPrec: 1, dtPrec: 0, raison: '', n: 0, rech: 0, visee: 3.4,
    cur: { x: 0, y: 0 }, cadre: { x: 0, y: 0, ax: 0, ay: 0, pret: false }, cible: { x: 0, y: 0 }, off: { x: 0, y: 0 }, th: { x: 0, y: 0 }, zone: { x0: 0, y0: 0, x1: 0, y1: 0 },
    souris: false, sourisClic: false, p0: { x: -1, y: -1 }, tenu: false, tenuT: 0, peint: false, peintT: 0,
    sous: null, verrous: [], file: [], projs: [], vit: {}, vitT: 0, stries: [], partis: [], k: 0,
    stats: null, journal: []
  };
  function statsNeuves() {
    return { warps: 0, verrous: 0, salves: 0, lances: { missile: 0, bombe: 0, mine: 0, laser: 0 },
      touches: { missile: 0, bombe: 0, mine: 0, laser: 0 }, tues: { missile: 0, bombe: 0, mine: 0, laser: 0 } };
  }
  W.stats = statsNeuves();
  function journal(e) { W.journal.push({ e: e, t: +W.t.toFixed(2) }); if (W.journal.length > 64) W.journal.shift(); }

  /* ================================ cibles ================================ */
  function liste() { return (N.ennemis && N.ennemis.list) || []; }
  function verrouillable(e) {
    if (!e || e._dead || e.etat === 'mort' || e.etat === 'portail' || e._st === 'naissance') return false;
    if (e.type === 'traqueur') return false;
    var c = cam();
    return e.x >= c.x - e.r && e.x <= c.x + c.w + e.r && e.y >= c.y - e.r && e.y <= c.y + c.h + e.r;
  }
  function verrousSur(e) { var n = 0; for (var i = 0; i < W.verrous.length; i++) if (W.verrous[i].e === e) n++; return n; }
  function plafond(e) {
    if (e.boss) return CFG.parBoss;
    return clamp(Math.ceil((e.pv > 0 ? e.pv : 1) / CFG.missile.degats), 1, CFG.parCible);
  }
  /* la cible verrouillable la plus proche du point écran (sx, sy), à capture + r (+ bonus) px */
  function plusProche(sx, sy, bonus, libre) {
    var c = cam(), wx = sx + c.x, wy = sy + c.y, L = liste(), best = null, bd = 1e9;
    for (var i = 0; i < L.length; i++) {
      var e = L[i];
      if (!verrouillable(e)) continue;
      if (libre && verrousSur(e) >= plafond(e)) continue;
      var rr = CFG.capture + e.r + (bonus || 0), d = d2(wx, wy, e.x, e.y);
      if (d < rr * rr && d < bd) { bd = d; best = e; }
    }
    return best;
  }
  /* la vitesse mesurée de chaque ennemi, en px par seconde de MONDE */
  function vitesse(e) { var v = W.vit[e.id]; return v ? Math.sqrt(v.vx * v.vx + v.vy * v.vy) : 0; }
  function mesurerVitesses(dtMonde) {
    var L = liste(), i, e, v;
    W.vitT += 1;
    for (i = 0; i < L.length; i++) {
      e = L[i]; if (e._dead) continue;
      v = W.vit[e.id];
      if (!v) { W.vit[e.id] = { x: e.x, y: e.y, vx: 0, vy: 0, n: W.vitT }; continue; }
      if (dtMonde > 1e-5) {
        var vx = (e.x - v.x) / dtMonde, vy = (e.y - v.y) / dtMonde, a = 0.35;
        if (vx * vx + vy * vy < 4e6) { v.vx += (vx - v.vx) * a; v.vy += (vy - v.vy) * a; }
      }
      v.x = e.x; v.y = e.y; v.n = W.vitT;
    }
    if ((W.vitT % 120) === 0) for (var id in W.vit) if (W.vit[id].n < W.vitT - 2) delete W.vit[id];
  }

  /* le choix de l'arme pour un verrou (documenté en tête) */
  function choisir(e) {
    var L = liste(), Pt = tete(), i, o, n = 0, sx = 0, sy = 0, et = 0;
    var gr = CFG.groupe * CFG.groupe;
    for (i = 0; i < L.length; i++) {
      o = L[i]; if (!verrouillable(o)) continue;
      if (d2(o.x, o.y, e.x, e.y) <= gr) { n++; sx += o.x; sy += o.y; }
    }
    if (n >= CFG.groupeMin) {
      var cx = sx / n, cy = sy / n;
      for (i = 0; i < L.length; i++) { o = L[i]; if (verrouillable(o) && d2(o.x, o.y, e.x, e.y) <= gr) et = Math.max(et, Math.sqrt(d2(o.x, o.y, cx, cy)) + o.r); }
      return { arme: 'bombe', x: cx, y: cy, r: clamp(Math.max(CFG.bombe.rayon, et + 4), CFG.bombe.rayon, CFG.bombe.rayonMax) };
    }
    if (Pt && e.type !== 'tourelle') {
      var dx = e.x - Pt.x, dy = e.y - Pt.y, l = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / l, uy = dy / l;
      var x1 = Pt.x + ux * CFG.laser.longueur, y1 = Pt.y + uy * CFG.laser.longueur, k = 0;
      for (i = 0; i < L.length; i++) {
        o = L[i]; if (o === e || !verrouillable(o) || o.type === 'traqueur') continue;
        var w = o.r + CFG.couloir;
        if (segD2(o.x, o.y, Pt.x + ux * 8, Pt.y + uy * 8, x1, y1) < w * w) k++;
      }
      if (k >= 1) return { arme: 'laser', x0: Pt.x, y0: Pt.y, x1: x1, y1: y1, n: k + 1 };
    }
    var v = W.vit[e.id];
    if ((e.mods && e.mods.rapide) || vitesse(e) >= CFG.rapide) {
      var A = O() && O().A, mx = e.x + (v ? v.vx : 0) * CFG.mine.avance, my = e.y + (v ? v.vy : 0) * CFG.mine.avance;
      if (A) { mx = clamp(mx, A.x0 + 6, A.x1 - 6); my = clamp(my, A.y0 + 6, A.y1 - 6); }
      return { arme: 'mine', x: mx, y: my };
    }
    return { arme: 'missile' };
  }

  /* ================================ le curseur ================================ */
  function zone() {
    var g = G(), s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 }, o = O(), hud = (o && o.geo && o.geo.hudH) || 12;
    var Wd = g.W | 0, Hd = g.H | 0, z = W.zone;
    z.x0 = (sf.l | 0) + 10; z.x1 = Wd - (sf.r | 0) - 10;
    z.y0 = (sf.t | 0) + hud + 10; z.y1 = (Hd > Wd ? Math.floor(Hd * 0.76) : Hd - (sf.b | 0) - 10);
    if (z.x1 < z.x0 + 8) z.x1 = z.x0 + 8; if (z.y1 < z.y0 + 8) z.y1 = z.y0 + 8;
    return z;
  }
  /* le cadre de la lunette : centré sur les cibles visibles (lissé, 0,4 s), assez large pour les couvrir toutes ;
     sans cible, toute la zone de jeu */
  function cadre(z, dt) {
    var c = cam(), L = liste(), n = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, B = W.cadre;
    for (var i = 0; i < L.length; i++) {
      var e = L[i]; if (!verrouillable(e)) continue;
      var sx = e.x - c.x, sy = e.y - c.y; n++;
      if (sx < x0) x0 = sx; if (sx > x1) x1 = sx; if (sy < y0) y0 = sy; if (sy > y1) y1 = sy;
    }
    var cx, cy, ax, ay;
    if (n) {
      ax = Math.max(CFG.cadreMin[0], (x1 - x0) / 2 + 14); ay = Math.max(CFG.cadreMin[1], (y1 - y0) / 2 + 14);
      cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
    } else { ax = (z.x1 - z.x0) / 2; ay = (z.y1 - z.y0) / 2; cx = (z.x0 + z.x1) / 2; cy = (z.y0 + z.y1) / 2; }
    ax = Math.min(ax, (z.x1 - z.x0) / 2); ay = Math.min(ay, (z.y1 - z.y0) / 2);
    cx = clamp(cx, z.x0 + ax, z.x1 - ax); cy = clamp(cy, z.y0 + ay, z.y1 - ay);
    var q = B.pret ? 1 - Math.exp(-dt / 0.4) : 1;
    B.x += (cx - B.x) * q; B.y += (cy - B.y) * q; B.ax += (ax - B.ax) * q; B.ay += (ay - B.ay) * q; B.pret = true;
  }
  function majCurseur(dt, I) {
    var z = zone(), c = W.cur, T = W.cible;
    W.sous = plusProche(c.x, c.y, 0, true);
    var vit = W.sous ? CFG.hesitation : 1;
    W.th.x += 6.283185307 / CFG.periodes[0] * vit * dt;
    W.th.y += 6.283185307 / CFG.periodes[1] * vit * dt;
    var guide = false;
    if (I && I.action && I.action.actif) { T.x = I.action.x; T.y = I.action.y; guide = true; }
    else if (W.souris && I && I.pointer) { T.x = I.pointer.x; T.y = I.pointer.y; guide = true; }
    else {
      var a = Math.exp(-dt / 1.5);
      W.off.x *= a; W.off.y *= a;
      cadre(z, dt);
      var B = W.cadre;
      T.x = B.x + B.ax * Math.sin(W.th.x) + W.off.x;
      T.y = B.y + B.ay * Math.sin(W.th.y) + W.off.y;
    }
    T.x = clamp(T.x, z.x0, z.x1); T.y = clamp(T.y, z.y0, z.y1);
    var q = 1 - Math.exp(-dt / (guide ? 0.04 : CFG.suivi));
    c.x += (T.x - c.x) * q; c.y += (T.y - c.y) * q;
    /* l'aimant : une cible libre proche attire la lunette (moitié moins quand on la guide) */
    var cc = cam(), L = liste(), best = null, bd = CFG.aimant * CFG.aimant;
    for (var i = 0; i < L.length; i++) {
      var e = L[i]; if (!verrouillable(e) || verrousSur(e) >= plafond(e)) continue;
      var d = d2(c.x, c.y, e.x - cc.x, e.y - cc.y); if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      var dd = Math.sqrt(bd), f = Math.min(1, CFG.aimantForce * dt) * (1 - dd / CFG.aimant) * (guide ? 0.5 : 1);
      c.x += (best.x - cc.x - c.x) * f; c.y += (best.y - cc.y - c.y) * f;
    }
    c.x = clamp(c.x, z.x0, z.x1); c.y = clamp(c.y, z.y0, z.y1);
  }

  /* ================================ verrous ================================ */
  function verrouiller(sx, sy, bonus) {
    if (W.verrous.length >= CFG.verrousMax) return null;
    var e = plusProche(sx, sy, bonus || 0, true);
    if (!e) return null;
    var v = { id: e.id, e: e, age: 0, choix: choisir(e), rang: verrousSur(e) };
    W.verrous.push(v);
    W.stats.verrous++;
    sfx('arme', { type: 'verrouillage' });
    journal('verrou ' + e.type + ' ' + v.choix.arme);
    return v;
  }
  function entrees(dt) {
    var I = S().input; if (!I) return;
    var p = I.pointer, i;
    if (p) {
      if (W.p0.x < 0) { W.p0.x = p.x; W.p0.y = p.y; }
      else if (!W.souris && (p.x !== W.p0.x || p.y !== W.p0.y)) { W.souris = true; journal('souris'); }
      if (p.actif) { W.souris = true; W.sourisClic = true; }
    }
    majCurseur(dt, I);
    /* le glissé du second doigt pousse la lunette */
    var px = (G() && G().PX) || 1;
    if (I.gestes) for (i = 0; i < I.gestes.length; i++) {
      var g = I.gestes[i];
      if (g.genre === 'glisse' && g.doigt === 'action') { W.off.x += (g.dx || 0) / px * CFG.glisse; W.off.y += (g.dy || 0) / px * CFG.glisse; journal('glisse'); }
    }
    /* le toucher : un verrou sous la lunette, sinon sous le doigt */
    if (I.taps && !W.sourisClic) for (i = 0; i < I.taps.length; i++) {
      var t = I.taps[i]; if (t.doigt !== 'action') continue;
      if (!verrouiller(W.cur.x, W.cur.y, 0)) verrouiller(t.x, t.y, CFG.doigt - CFG.capture);
    }
    /* la gâchette : appuyer verrouille, tenir peint, relâcher après avoir peint lance la salve */
    var tient = !!(I.boost || I.fire || (p && p.actif && ((p.boutons | 0) & 1)));
    if (tient && !W.tenu) { W.tenu = true; W.tenuT = 0; W.peint = false; W.peintT = CFG.peinture; verrouiller(W.cur.x, W.cur.y, 0); }
    if (tient) {
      W.tenuT += dt;
      if (W.tenuT >= CFG.tenu) {
        W.peint = true; W.peintT -= dt;
        if (W.peintT <= 0 && verrouiller(W.cur.x, W.cur.y, 0)) W.peintT = CFG.peinture;
      }
    } else if (W.tenu) {
      W.tenu = false;
      if (W.peint && W.verrous.length) salve('relache');
      W.peint = false;
    }
  }

  /* ================================ la salve et les tirs ================================ */
  function salve(raison) {
    if (W.phase !== 'entree' && W.phase !== 'visee') return;
    if (W.planRythme && N.rythme.lire().t + N.R.rythme.epsilon < W.planRythme.salve) return;
    var i, v, ok = 0;
    for (i = 0; i < W.verrous.length; i++) {
      v = W.verrous[i];
      if (!v.e || v.e._dead) continue;
      v.choix = choisir(v.e);
      W.file.push({ delai: ok * (W.planRythme ? W.planRythme.ecart : CFG.salveEcart), v: v });
      W.partis.push({ x: v.e.x, y: v.e.y, r: v.e.r, t: 0 });
      ok++;
    }
    W.verrous.length = 0;
    if (ok) { W.stats.salves++; sfx('salve', { pitch: ok }); }
    journal('salve ' + raison + ' ' + ok);
    W.phase = 'sortie'; W.pt = 0;
  }
  function src(arme) {
    var Pt = tete();
    if (arme === 'missile') return { genre: 'arme', type: 'missiles', warp: 'missile', id: -1 };
    if (arme === 'mine') return { genre: 'arme', type: 'minesQ', warp: 'mine', id: -1 };
    if (arme === 'bombe') return { genre: 'arme', type: 'minesQ', warp: 'bombe', id: -1 };
    return { genre: 'arme', type: 'laser', warp: 'laser', id: -1, x: Pt ? Pt.x : undefined, y: Pt ? Pt.y : undefined };
  }
  function frapper(e, degats, arme) {
    if (!N.ennemis || !N.ennemis.hit || !e || e._dead) return false;
    if (e.etat === 'portail' || e._st === 'naissance' || e.type === 'traqueur') return false;
    W.stats.touches[arme]++;
    var mort = !!N.ennemis.hit(e, degats, src(arme));
    if (mort) W.stats.tues[arme]++;
    return mort;
  }
  function souffle(x, y, r, degats, arme) {
    var L = liste().slice(), n = 0;
    for (var i = 0; i < L.length; i++) {
      var e = L[i]; if (e._dead) continue;
      var rr = r + e.r;
      if (d2(x, y, e.x, e.y) < rr * rr) { frapper(e, degats, arme); n++; }
    }
    var o = O();
    if (o && o.boom) o.boom(x, y, r > 28 ? 0.5 : 0.4, P.ambre);
    sfx('explosion', { pan: 0 });
    return n;
  }
  function lancer(v) {
    var Pt = tete(), e = v.e, ch = v.choix, x0 = Pt ? Pt.x : e.x, y0 = Pt ? Pt.y : e.y;
    W.stats.lances[ch.arme]++;
    if (ch.arme === 'missile') {
      var a = Math.atan2(e.y - y0, e.x - x0), cote = (W.stats.lances.missile & 1) ? 1 : -1;
      W.projs.push({ k: 'missile', x: x0, y: y0, a: a + cote * (0.9 + rnd() * 0.5), v: CFG.missile.v0, e: e, vie: CFG.missile.vie, tr: [] });
    } else if (ch.arme === 'bombe') {
      W.projs.push({ k: 'bombe', x0: x0, y0: y0, x: ch.x, y: ch.y, r: ch.r, t: 0, d: CFG.bombe.vol });
    } else if (ch.arme === 'mine') {
      W.projs.push({ k: 'mine', x0: x0, y0: y0, x: ch.x, y: ch.y, t: 0, vie: CFG.mine.vie, e: e, ex: e.x, ey: e.y });
    } else {
      /* le laser : instantané, sur la ligne tête → cible prolongée ; il touche tout ce qu'il croise */
      var dx = e.x - x0, dy = e.y - y0, l = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / l, uy = dy / l;
      var x1 = x0 + ux * CFG.laser.longueur, y1 = y0 + uy * CFG.laser.longueur, L = liste().slice(), imp = [];
      for (var i = 0; i < L.length; i++) {
        var o = L[i]; if (o._dead) continue;
        var w = o.r + CFG.couloir;
        if (segD2(o.x, o.y, x0 + ux * 6, y0 + uy * 6, x1, y1) < w * w) { frapper(o, CFG.laser.degats, 'laser'); imp.push(o.x, o.y); }
      }
      W.projs.push({ k: 'laser', x0: x0, y0: y0, x1: x1, y1: y1, t: 0, d: CFG.laser.vie, imp: imp });
      sfx('arme', { type: 'laser' });
      var oo = O(); if (oo && oo.spark) for (var j = 0; j + 1 < imp.length; j += 2) oo.spark(imp[j], imp[j + 1], P.os, 3);
    }
  }
  function majTirs(dtR, dm) {
    var i, q, L, o = O();
    /* la file de la salve s'écoule en temps réel : les départs s'égrènent même au creux du ralenti */
    for (i = W.file.length - 1; i >= 0; i--) {
      q = W.file[i]; q.delai -= dtR;
      if (q.delai <= 0) { W.file.splice(i, 1); if (q.v.e && !q.v.e._dead) lancer(q.v); }
    }
    for (i = W.projs.length - 1; i >= 0; i--) {
      q = W.projs[i];
      if (q.k === 'missile') {
        if (!q.e || q.e._dead || !verrouillable(q.e)) {
          q.e = null; L = liste();
          var bd = CFG.missile.reprise * CFG.missile.reprise;
          for (var k = 0; k < L.length; k++) if (verrouillable(L[k])) { var dk = d2(q.x, q.y, L[k].x, L[k].y); if (dk < bd) { bd = dk; q.e = L[k]; } }
        }
        if (q.e) {
          var want = Math.atan2(q.e.y - q.y, q.e.x - q.x), da = wrapA(want - q.a), m = CFG.missile.virage * dm;
          q.a = wrapA(q.a + (da > m ? m : (da < -m ? -m : da)));
        }
        q.v = Math.min(CFG.missile.vmax, q.v + CFG.missile.accel * dm);
        q.tr.push(q.x, q.y); if (q.tr.length > 14) q.tr.splice(0, 2);
        q.x += Math.cos(q.a) * q.v * dm; q.y += Math.sin(q.a) * q.v * dm;
        q.vie -= dm;
        if (q.e) {
          var rr = q.e.r + 3;
          if (d2(q.x, q.y, q.e.x, q.e.y) < rr * rr) {
            frapper(q.e, CFG.missile.degats, 'missile');
            if (o && o.spark) o.spark(q.x, q.y, P.os, 4);
            if (o && o.boom) o.boom(q.x, q.y, 0.18, P.brasier);
            W.projs.splice(i, 1); continue;
          }
        }
        if (q.vie <= 0) { if (o && o.spark) o.spark(q.x, q.y, P.ambre, 2); W.projs.splice(i, 1); }
      } else if (q.k === 'bombe') {
        q.t += dm;
        if (q.t >= q.d) { souffle(q.x, q.y, q.r, CFG.bombe.degats, 'bombe'); W.projs.splice(i, 1); }
      } else if (q.k === 'mine') {
        q.t += dm; q.vie -= dm;
        if (q.t >= CFG.mine.lancer) {
          L = liste(); var saute = q.vie <= 0, proie = null, pd = CFG.mine.flair * CFG.mine.flair;
          /* armée, elle glisse vers ce qui passe à 40 px (45 px/s) : la trajectoire annoncée n'a pas à être exacte */
          for (var h = 0; h < L.length; h++) { if (L[h]._dead || L[h].etat === 'portail') continue; var dh = d2(q.x, q.y, L[h].x, L[h].y); if (dh < pd) { pd = dh; proie = L[h]; } }
          if (proie && pd > 1) { var dl = Math.sqrt(pd), pas = Math.min(dl, CFG.mine.derive * dm); q.x += (proie.x - q.x) / dl * pas; q.y += (proie.y - q.y) / dl * pas; }
          for (var j = 0; j < L.length && !saute; j++) {
            var e = L[j]; if (e._dead || e.etat === 'portail') continue;
            var rd = CFG.mine.declenche + e.r;
            if (d2(q.x, q.y, e.x, e.y) < rd * rd) saute = true;
          }
          if (saute) { souffle(q.x, q.y, CFG.mine.rayon, CFG.mine.degats, 'mine'); W.projs.splice(i, 1); }
        }
      } else if (q.k === 'laser') {
        q.t += dm; if (q.t >= q.d) W.projs.splice(i, 1);
      }
    }
    for (i = W.partis.length - 1; i >= 0; i--) { W.partis[i].t += dtR; if (W.partis[i].t > 0.25) W.partis.splice(i, 1); }
  }

  /* ================================ le temps ================================ */
  function declencher(raison, o) {
    if (!pal() || !G() || !G().W) return false;
    cfg();
    if (W.phase !== 'repos' || W.rech > 0) return false;
    o = o || {};
    W.planRythme = N.rythme && N.rythme.lire().id ? N.rythme.planWarp() : null;
    W.phase = W.planRythme ? 'attente' : 'entree'; W.pt = 0; W.raison = String(raison || 'essai'); W.n++; W.stats.warps++;
    W.visee = W.planRythme ? W.planRythme.visee : o.duree > 0 ? +o.duree : CFG.visee;
    W.verrous.length = 0; W.souris = false; W.sourisClic = false; W.tenu = !!(S().input && (S().input.boost || S().input.fire));
    W.tenuT = 0; W.peint = false; W.off.x = 0; W.off.y = 0; W.th.x = 0; W.th.y = 0;
    var I = S().input; W.p0.x = I && I.pointer ? I.pointer.x : -1; W.p0.y = I && I.pointer ? I.pointer.y : -1;
    var z = zone(); W.cadre.pret = false; cadre(z, 0); W.cur.x = W.cadre.x; W.cur.y = W.cadre.y;
    /* les stries du monde qui s'étire : des rayons depuis le centre, tirés à la graine du warp */
    rs = (2001 + W.n * 7919) >>> 0;
    W.stries.length = 0;
    for (var i = 0; i < CFG.stries; i++) W.stries.push({ a: rnd() * 6.283185307, r: 0.3 + rnd() * 0.7, v: 0.05 + rnd() * 0.08, c: rnd() < 0.2 ? 1 : 0 });
    sfx('ralenti');
    journal('warp ' + W.raison);
    return true;
  }
  function annuler() {
    if (W.phase === 'attente' || W.phase === 'entree' || W.phase === 'visee') { W.planRythme = null; W.verrous.length = 0; W.phase = 'sortie'; W.pt = 0; journal('annule'); }
  }
  function reset() {
    W.planRythme = null; W.phase = 'repos'; W.pt = 0; W.f = 1; W.fPrec = 1; W.rech = 0; W.verrous.length = 0; W.file.length = 0; W.projs.length = 0;
    W.partis.length = 0; W.vit = {}; W.tenu = false; W.peint = false; W.k = 0; W.sous = null;
  }
  function update(dtReel) {
    if (!pal()) return;
    cfg();
    var dt = dtReel > 0 ? Math.min(0.1, dtReel) : 0;
    if (S().paused) return;
    W.t += dt;
    if (W.planRythme && N.rythme.lire().id !== W.planRythme.id) annuler();
    if (W.phase === 'attente') {
      W.f = 1;
      if (N.rythme.lire().t + N.R.rythme.epsilon >= W.planRythme.depart) { W.phase = 'entree'; W.pt = 0; }
      else return;
    }
    mesurerVitesses(W.dtPrec * W.fPrec);
    if (W.phase === 'repos') { if (W.rech > 0) W.rech -= dt; W.f = 1; }
    else {
      W.pt += dt;
      if (N.joueuse && N.joueuse.etat === 'mort') annuler();
      if (W.phase === 'entree') {
        if (W.planRythme) W.pt = Math.max(0, N.rythme.lire().t - W.planRythme.depart);
        W.f = 1 + (CFG.facteur - 1) * lisse(W.pt / CFG.entree);
        if (W.pt + N.R.rythme.epsilon >= CFG.entree) { W.phase = 'visee'; W.pt = 0; W.f = CFG.facteur; journal('visee'); }
      } else if (W.phase === 'visee') {
        W.f = CFG.facteur;
        if (W.planRythme) W.pt = Math.max(0, N.rythme.lire().t - W.planRythme.entree);
        if (W.pt + N.R.rythme.epsilon >= W.visee) salve('fin');
      }
      if (W.phase === 'entree' || W.phase === 'visee') entrees(dt);
      else W.sous = null;
      for (var i = W.verrous.length - 1; i >= 0; i--) {
        var v = W.verrous[i];
        if (!v.e || v.e._dead || v.e.etat === 'mort') { W.verrous.splice(i, 1); continue; }
        v.age += dt; v.choix = choisir(v.e);
      }
      if (W.phase === 'sortie') {
        var sortie = W.planRythme ? W.planRythme.sortie : CFG.sortie;
        if (W.planRythme) W.pt = Math.max(0, N.rythme.lire().t - W.planRythme.salve);
        W.f = CFG.facteur + (1 - CFG.facteur) * lisse(W.pt / sortie);
        if (W.pt >= sortie) { W.phase = 'repos'; W.pt = 0; W.f = 1; W.rech = W.planRythme ? W.planRythme.recharge : CFG.recharge; journal('fin'); }
      }
    }
    /* l'intensité du voile : 0 hors warp, 1 au creux */
    W.k = clamp((1 - W.f) / (1 - CFG.facteur), 0, 1);
    majTirs(dt, dt * W.f);
    W.fPrec = W.f; W.dtPrec = dt;
    for (var s = 0; s < W.stries.length; s++) { var st = W.stries[s]; st.r += st.v * dt; if (st.r > 1.05) st.r -= 0.75; }
  }

  /* ================================ le dessin ================================ */
  function voile(g) {
    var B = g.buf(), Wd = g.W, Hd = g.H, BY = N.pal.BAYER, k = W.k, x, y, o;
    if (!B || !(k > 0)) return;
    if (k >= 1) { for (o = 0; o < B.length; o++) B[o] = LUT[B[o]]; }
    else {
      var s = k * 16;
      for (y = 0; y < Hd; y++) { o = y * Wd; var r = (y & 3) << 2; for (x = 0; x < Wd; x++, o++) if (BY[r | (x & 3)] < s) B[o] = LUT[B[o]]; }
    }
    /* la lunette : les bords s'enfoncent dans la nuit profonde, tramés */
    var b1 = Math.max(4, Math.round(Math.min(Wd, Hd) * 0.03)), b2 = b1 * 2;
    g.ditherRect(0, 0, Wd, b1, P.np, 0.5 * k); g.ditherRect(0, Hd - b1, Wd, b1, P.np, 0.5 * k);
    g.ditherRect(0, 0, b1, Hd, P.np, 0.5 * k); g.ditherRect(Wd - b1, 0, b1, Hd, P.np, 0.5 * k);
    g.ditherRect(0, b1, Wd, b2, P.np, 0.25 * k); g.ditherRect(0, Hd - b1 - b2, Wd, b2, P.np, 0.25 * k);
    g.ditherRect(b1, 0, b2, Hd, P.np, 0.25 * k); g.ditherRect(Wd - b1 - b2, 0, b2, Hd, P.np, 0.25 * k);
  }
  function stries(g) {
    var Wd = g.W, Hd = g.H, cx = Wd / 2, cy = Hd / 2, R = Math.sqrt(cx * cx + cy * cy), k = W.k;
    for (var i = 0; i < W.stries.length; i++) {
      var s = W.stries[i]; if (s.r < 0.32) continue;
      var c = Math.cos(s.a), sn = Math.sin(s.a), r0 = s.r * R, l = (8 + 34 * (s.r - 0.3)) * k;
      var col = s.c ? P.acier : P.indigo;
      /* une strie : des points tous les deux pixels, du rayon r0 vers l'extérieur */
      for (var d = 0; d < l; d += 2) {
        var x = Math.round(cx + c * (r0 + d)), y = Math.round(cy + sn * (r0 + d));
        if (x < 0 || y < 0 || x >= Wd || y >= Hd) break;
        g.px(x, y, col);
      }
    }
  }
  function trainees(g) {
    var L = liste(), k = W.k;
    for (var i = 0; i < L.length; i++) {
      var e = L[i]; if (e._dead || e.etat === 'portail') continue;
      var v = W.vit[e.id]; if (!v) continue;
      var vx = v.vx * CFG.trainee * k, vy = v.vy * CFG.trainee * k, l = Math.sqrt(vx * vx + vy * vy);
      if (l < 3) continue;
      if (l > 44) { vx *= 44 / l; vy *= 44 / l; l = 44; }
      var ux = vx / l, uy = vy / l, n = Math.floor(l);
      for (var d = e.r; d < n; d++) {
        if ((d & 1) && d > n * 0.5) continue;
        g.px(e.x - ux * d, e.y - uy * d, d < n * 0.5 ? P.magenta : P.sang);
      }
    }
  }
  function pointille(g, x0, y0, x1, y1, c, pas) {
    var dx = x1 - x0, dy = y1 - y0, l = Math.sqrt(dx * dx + dy * dy), n = Math.floor(l / pas);
    for (var i = 0; i <= n; i++) g.px(x0 + dx * i / (n || 1), y0 + dy * i / (n || 1), c);
  }
  function annonces(g) {
    var clign = ((W.t * 6) | 0) & 1;
    for (var i = 0; i < W.verrous.length; i++) {
      var v = W.verrous[i], ch = v.choix, e = v.e;
      if (ch.arme === 'bombe') { g.ring(ch.x, ch.y, ch.r, P.ambre, 0.5); g.ring(ch.x, ch.y, ch.r + 1, P.np, 0.5); }
      else if (ch.arme === 'laser') pointille(g, ch.x0, ch.y0, ch.x1, ch.y1, clign ? P.os : P.jaune, 4);
      else if (ch.arme === 'mine') {
        pointille(g, e.x, e.y, ch.x, ch.y, P.jaune, 3);
        g.line(ch.x - 2, ch.y - 2, ch.x + 2, ch.y + 2, P.jaune); g.line(ch.x - 2, ch.y + 2, ch.x + 2, ch.y - 2, P.jaune);
      }
    }
  }
  function tirs(g) {
    var bat = ((W.t * 4) | 0) & 1;
    for (var i = 0; i < W.projs.length; i++) {
      var q = W.projs[i];
      if (q.k === 'missile') {
        var tr = q.tr;
        for (var j = 0; j + 1 < tr.length; j += 2) g.px(tr[j], tr[j + 1], j < tr.length - 6 ? P.brasier : P.ambre);
        g.rect(q.x - 1, q.y - 1, 3, 3, P.np); g.rect(q.x - 1, q.y - 1, 2, 2, P.os);
        g.px(q.x - Math.cos(q.a) * 2, q.y - Math.sin(q.a) * 2, P.jaune);
      } else if (q.k === 'bombe') {
        var u = clamp(q.t / q.d, 0, 1), bx = q.x0 + (q.x - q.x0) * u, by = q.y0 + (q.y - q.y0) * u - Math.sin(Math.PI * u) * CFG.bombe.cloche;
        g.ring(q.x, q.y, Math.max(2, q.r * (1 - u * 0.7)), P.ambre, 0.6);
        g.rect(bx - 2, by - 2, 5, 5, P.np); g.rect(bx - 1, by - 1, 3, 3, P.ambre); g.px(bx, by - 1, P.os);
      } else if (q.k === 'mine') {
        var w = clamp(q.t / CFG.mine.lancer, 0, 1), mx = q.x0 + (q.x - q.x0) * w, my = q.y0 + (q.y - q.y0) * w - Math.sin(Math.PI * w) * 10;
        if (w >= 1) g.ring(q.x, q.y, CFG.mine.declenche, P.jaune, 0.25);
        g.rect(mx - 2, my - 1, 5, 3, P.np); g.rect(mx - 1, my - 2, 3, 5, P.np);
        g.rect(mx - 1, my, 3, 1, w >= 1 && bat ? P.jaune : P.ambre); g.rect(mx, my - 1, 1, 3, w >= 1 && bat ? P.jaune : P.ambre);
        g.px(mx, my, P.os);
      } else if (q.k === 'laser') {
        var lu = q.t / q.d, dx = q.x1 - q.x0, dy = q.y1 - q.y0, l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l, ny = dx / l;
        if (lu < 0.6) { g.line(q.x0 + nx, q.y0 + ny, q.x1 + nx, q.y1 + ny, P.jaune); g.line(q.x0 - nx, q.y0 - ny, q.x1 - nx, q.y1 - ny, P.jaune); }
        if (lu < 0.8) g.line(q.x0, q.y0, q.x1, q.y1, P.os); else pointille(g, q.x0, q.y0, q.x1, q.y1, P.jaune, 2);
        for (var m = 0; m + 1 < q.imp.length; m += 2) g.ring(q.imp[m], q.imp[m + 1], 3 + lu * 6, P.os, 1 - lu);
      }
    }
  }
  /* les coins d'un réticule carré de demi-côté h, bras de a px, avec leur ombre en nuit profonde */
  function coins(g, x, y, h, a, c) {
    x = Math.round(x); y = Math.round(y); h = Math.round(h);
    var s = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (var pass = 0; pass < 2; pass++) {
      var col = pass ? c : P.np, o = pass ? 0 : 1;
      for (var i = 0; i < 4; i++) {
        var cx = x + s[i][0] * h + o, cy = y + s[i][1] * h + o;
        g.rect(s[i][0] < 0 ? cx : cx - a + 1, cy, a, 1, col);
        g.rect(cx, s[i][1] < 0 ? cy : cy - a + 1, 1, a, col);
      }
    }
  }
  /* l'icône de l'arme, 5 × 5, jaune sur nuit profonde : flèche (missile), rond (bombe), losange (mine), trait (laser) */
  function icone(g, x, y, arme) {
    x = Math.round(x); y = Math.round(y);
    g.rect(x - 3, y - 3, 7, 7, P.np);
    var c = P.jaune;
    if (arme === 'missile') { g.px(x, y - 2, c); g.rect(x - 1, y - 1, 3, 1, c); g.rect(x, y, 1, 3, c); g.px(x - 2, y, c); g.px(x + 2, y, c); }
    else if (arme === 'bombe') { g.rect(x - 1, y - 1, 3, 3, P.ambre); g.rect(x - 2, y, 5, 1, P.ambre); g.rect(x, y - 2, 1, 5, P.ambre); g.px(x + 1, y - 2, c); }
    else if (arme === 'mine') { g.px(x, y - 2, c); g.rect(x - 1, y - 1, 3, 1, c); g.rect(x - 2, y, 5, 1, c); g.rect(x - 1, y + 1, 3, 1, c); g.px(x, y + 2, c); g.px(x, y, P.os); }
    else { g.rect(x - 2, y, 5, 1, P.os); g.px(x - 2, y - 1, c); g.px(x + 2, y + 1, c); }
  }
  function texte(str, ci, k) {
    if (!N.spr || !N.spr.text) return null;
    try { return N.spr.text(str, { ci: ci, contour: P.np, echelle: k || 1 }); } catch (e) { return null; }
  }
  function reticules(g) {
    var c = cam(), i, v, sx, sy;
    for (i = 0; i < W.verrous.length; i++) {
      v = W.verrous[i]; sx = v.e.x - c.x; sy = v.e.y - c.y;
      var h = v.e.r + 4 + v.rang * 2 + Math.max(0, 9 * (1 - v.age / 0.15));
      coins(g, sx, sy, h, 3, v.age < 0.08 ? P.os : P.magenta);
      if (v.rang === 0) icone(g, sx, sy - h - 6, v.choix.arme);
    }
    for (i = 0; i < W.partis.length; i++) {
      var p = W.partis[i]; if ((((p.t * 20) | 0) & 1)) continue;
      coins(g, p.x - c.x, p.y - c.y, p.r + 4 + p.t * 30, 2, P.os);
    }
  }
  function curseur(g) {
    var x = Math.round(W.cur.x), y = Math.round(W.cur.y), k = W.phase === 'entree' ? lisse(W.pt / CFG.entree) : 1, R = Math.round(4 + 5 * k);
    var s = W.sous, cc = cam();
    if (s) {
      /* une cible capturable : des crochets jaunes qui la serrent en tournant d'un pas toutes les 0,1 s */
      var h = s.r + 3 + (((W.t * 10) | 0) % 3);
      coins(g, s.x - cc.x, s.y - cc.y, h, 2, P.jaune);
    }
    g.ring(x, y, R + 1, P.np, 1); g.ring(x, y, R, W.tenu ? P.jaune : P.os, 1); g.ring(x, y, R - 1, P.np, 1);
    var t0 = R + 2, t1 = R + 5;
    g.rect(x - t1, y, t1 - t0 + 1, 1, P.jaune); g.rect(x + t0, y, t1 - t0 + 1, 1, P.jaune);
    g.rect(x, y - t1, 1, t1 - t0 + 1, P.jaune); g.rect(x, y + t0, 1, t1 - t0 + 1, P.jaune);
    g.px(x, y, s ? P.jaune : P.os);
    if (W.verrous.length) {
      var n = texte('' + W.verrous.length, P.jaune, 1);
      if (n && n.data) g.blit(n, x + R + 3, y - R - n.h);
    }
  }
  function compteur(g) {
    var z = W.zone, Wd = g.W, Hd = g.H, sf = (S().view && S().view.safe) || { b: 0 }, cx = Math.round(Wd / 2);
    /* en bas, au centre, loin du HUD et des bandeaux de vague du haut */
    var y = Hd > Wd ? Math.min(Hd - (sf.b | 0) - 12, z.y1 + 8) : Hd - (sf.b | 0) - 13, k = W.phase === 'sortie' ? 1 - lisse(W.pt / CFG.sortie) : 1;
    if (!(k > 0.05)) return;
    var lab = texte('WARP', P.jaune, 1), pip = 4, nb = CFG.verrousMax, lw = lab ? lab.w : 20;
    var tw = lw + 4 + nb * pip, x0 = cx - (tw >> 1);
    y += Math.round((1 - k) * 6);
    g.rect(x0 - 3, y - 2, tw + 6, 13, P.np);
    if (lab && lab.data) g.blit(lab, x0, y);
    var n = W.verrous.length;
    for (var i = 0; i < nb; i++) {
      var px = x0 + lw + 4 + i * pip;
      if (i < n) g.rect(px, y + 1, 3, 3, P.magenta); else { g.rect(px, y + 1, 3, 3, P.ardoise); g.px(px + 1, y + 2, P.np); }
    }
    /* le temps restant : une barre qui se vide, os sur nuit profonde */
    var u = W.phase === 'visee' ? 1 - W.pt / W.visee : (W.phase === 'entree' ? 1 : 0);
    g.rect(x0 + lw + 4, y + 6, Math.round((nb * pip - 1) * clamp(u, 0, 1)), 1, u < 0.3 && (((W.t * 8) | 0) & 1) ? P.jaune : P.os);
  }
  function draw(couche) {
    if (!pal() || !G() || !G().buf || !G().buf()) return;
    var g = G(), ox = g.ox ? g.ox() : 0, oy = g.oy ? g.oy() : 0, c = cam();
    var monde = couche === undefined || couche === 'monde', dessus = couche === undefined || couche === 'dessus';
    if (monde) {
      if (W.k > 0) {
        g.origin(0, 0); voile(g); stries(g);
        g.origin(c.x, c.y); trainees(g);
      }
      if (W.projs.length || W.verrous.length) { g.origin(c.x, c.y); annonces(g); tirs(g); }
    }
    if (dessus && (W.phase !== 'repos' || W.partis.length)) {
      g.origin(0, 0);
      reticules(g);
      if (W.phase === 'entree' || W.phase === 'visee') curseur(g);
      compteur(g);
    }
    g.origin(ox, oy);
  }

  N.warp = {
    declencher: declencher, update: update, draw: draw, annuler: annuler, reset: reset,
    actif: function () { return W.phase !== 'repos'; },
    capte: function () { return W.phase === 'entree' || W.phase === 'visee'; },
    facteur: function () { return W.f; },
    verrous: function () {
      var o = [];
      for (var i = 0; i < W.verrous.length; i++) { var v = W.verrous[i]; o.push({ id: v.id, x: v.e.x, y: v.e.y, arme: v.choix.arme }); }
      return o;
    },
    state: function () {
      var pr = { missile: 0, bombe: 0, mine: 0, laser: 0 };
      for (var i = 0; i < W.projs.length; i++) pr[W.projs[i].k]++;
      var st = W.stats;
      return { phase: W.phase, t: +W.t.toFixed(2), pt: +W.pt.toFixed(2), facteur: +W.f.toFixed(3), raison: W.raison, n: W.n, recharge: +Math.max(0, W.rech).toFixed(2),
        curseur: { x: Math.round(W.cur.x), y: Math.round(W.cur.y) }, sous: W.sous ? W.sous.id : null, souris: W.souris, tenu: W.tenu,
        verrous: W.verrous.length, file: W.file.length, tirs: pr,
        stats: { warps: st.warps, verrous: st.verrous, salves: st.salves, lances: JSON.parse(JSON.stringify(st.lances)),
          touches: JSON.parse(JSON.stringify(st.touches)), tues: JSON.parse(JSON.stringify(st.tues)) },
        journal: W.journal.slice() };
    },
    CFG: CFG
  };
})();
