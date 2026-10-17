/* ===== 12-cam.js — le monde qui dépasse l'écran, ses murs, la caméra qui suit la tête =====

   REFONTE.md § 3.2 (le monde), § 3.3 (la caméra), § 4.6 (le TRAVELLING), § 7.8 (interfaces).

   N.world — le monde fait 1 024 × 512 px, indépendant de l'écran et de l'orientation : une rotation ne change que
   la fenêtre (la vue), jamais l'état. Les MURS COURANTS sont un rectangle (x0, y0, x1, y1) : la ligne mortelle est
   ce bord, la bande électrifiée de 3 px se dessine juste au-delà (15-decor.js). Ils glissent par
   arena(rect, durée) (2 s au moins) et par travelling() : l'arène de 576 px qui voyage à travers le monde.
   Une position finale est ANNONCÉE dès le premier instant (mursAnnonces()), pour être hachurée avant que le mur
   n'arrive : la mort au mur doit toujours être juste.

       N.world = { W, H, x0, y0, x1, y1,
                   arena(rect, dur), reset(),             rect : {x,y,w,h}
                   travelling({largeur, vx, depuis}), stop(),
                   enMouvement(), mursAnnonces() -> [rect] (réutilisé), voyage() -> {actif, attend, vx, restant},
                   distMur(x, y[, out]) -> {d, nx, ny, pan, mobile},
                   rect() -> {x,y,w,h} }

   N.cam — suit la tête et ANTICIPE son cap. Les coordonnées du monde sont en px de jeu, l'origine en haut à gauche ;
   la vue (cam.w × cam.h) est le tampon. La caméra est arrondie au pixel UNE SEULE FOIS par image : aucun plan ne
   recule d'un pixel quand elle avance. Elle est mise à jour après les ennemis : shown() et anticipee() lisent donc
   la vue de l'image précédente (le retard vaut 2,4 px par image au plus, couvert par la marge de 24 px).

       N.cam = { x, y, w, h,                              entiers : coin haut-gauche de la vue, taille de la vue
                 update(dt), reset([x, y]),
                 toScreen(x,y,out), toWorld(sx,sy,out),
                 visible(x,y,m), shown(x,y,m), anticipee(sec,out), devant(),
                 jolt(dx,dy), secousse(amp,dx,dy), focus(x,y,dur), mode('jeu'|'boss'|'libre'),
                 suit(obj) }                              obj {x,y,ang,vit} ; par défaut N.joueuse.tete

   La cible = la tête + une avance dans le sens du cap visé (0,30 × la demi-largeur à l'horizontale, 0,42 × la
   demi-hauteur à la verticale, × 1,4 en accélération). Le suivi est un amorti critique (constante 0,22 s). La tête
   reste entre 15 % et 85 % de la vue sur les deux axes (en portrait, en vertical, entre 15 % et 72 %). La caméra
   est bornée au monde (ou à l'arène courante) avec 16 px de débord : on voit le mur et un peu de décor au-delà,
   c'est ce qui rend juste la mort au mur. Quand la tête longe un mur, le cadre PASSE AVANT la borne (la vue
   déborde alors de quelques px de plus, sur du décor) : sinon les deux règles se contrediraient.
   Aucun module n'appelle N.world.update : c'est N.cam.update qui avance les murs.
*/
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ---- les chiffres : ceux de N.R s'il existe, sinon les valeurs de REFONTE.md (→ N.R) ---- */
  function R() { return N.R || {}; }
  function RM() { return R().monde || {}; }
  function RC() { return R().camera || {}; }
  var W0 = 1024, H0 = 512;                        // → N.R.monde.W / H
  var GLISSE_MIN = 2, VOYAGE_GLISSE = 3;          // → N.R.monde.mobile.glissementMin ; § 4.6 : 3 s pour la mise en place
  var TRAV_LARGEUR = 576;                         // → N.R.monde.travelling.largeur
  var ALERTE = 24;                                // → N.R.monde.mur.alerte

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(u) { u = u < 0 ? 0 : (u > 1 ? 1 : u); return u * u * (3 - 2 * u); }   // lissé : le mur démarre et s'arrête en douceur

  /* ================================ le monde ================================ */
  var Wd = {
    W: W0, H: H0, x0: 0, y0: 0, x1: W0, y1: H0
  };
  var from = { x0: 0, y0: 0, x1: W0, y1: H0 };     // arène au départ du glissement
  var to = { x0: 0, y0: 0, x1: W0, y1: H0 };       // arène visée
  var glT = 0, glD = 0, gliding = false;
  var trav = { actif: false, attend: false, vx: 0, largeur: TRAV_LARGEUR, fin: 0 };
  var annonces = [], annPool = [{ x: 0, y: 0, w: 0, h: 0 }];
  var rectOut = { x: 0, y: 0, w: 0, h: 0 };
  var distOut = { d: 0, nx: 0, ny: 0, pan: 'g', mobile: false };

  function lireRect(r, out) {
    if (r.w !== undefined) { out.x0 = r.x; out.y0 = r.y; out.x1 = r.x + r.w; out.y1 = r.y + r.h; }
    else { out.x0 = r.x0; out.y0 = r.y0; out.x1 = r.x1; out.y1 = r.y1; }
    out.x0 = clamp(out.x0, 0, Wd.W); out.x1 = clamp(out.x1, 0, Wd.W);
    out.y0 = clamp(out.y0, 0, Wd.H); out.y1 = clamp(out.y1, 0, Wd.H);
    return out;
  }
  function arena(rect, dur) {
    if (!rect) return;
    from.x0 = Wd.x0; from.y0 = Wd.y0; from.x1 = Wd.x1; from.y1 = Wd.y1;
    lireRect(rect, to);
    glD = Math.max(GLISSE_MIN, +dur || GLISSE_MIN); glT = 0; gliding = true;
    trav.actif = false; trav.attend = false;
  }

  function reset() {
    Wd.x0 = 0; Wd.y0 = 0; Wd.x1 = Wd.W; Wd.y1 = Wd.H;
    to.x0 = 0; to.y0 = 0; to.x1 = Wd.W; to.y1 = Wd.H;
    from.x0 = 0; from.y0 = 0; from.x1 = Wd.W; from.y1 = Wd.H;
    gliding = false; glT = glD = 0;
    trav.actif = false; trav.attend = false; trav.vx = 0;
  }

  /* l'arène qui voyage : une fenêtre de 576 × 512 qui traverse le monde. Si l'arène n'a pas déjà cette largeur,
     les murs glissent d'abord (3 s) jusqu'à la position de départ, puis elle part. `depuis` : abscisse du bord
     gauche de départ (par défaut : le côté d'où l'on part, à l'opposé du sens de marche). */
  function travelling(o) {
    o = o || {};
    var L = o.largeur > 0 ? +o.largeur : TRAV_LARGEUR;
    var vx = +o.vx || 0; if (!vx) vx = 12;
    var dep = o.depuis;
    if (typeof dep !== 'number') dep = vx > 0 ? 0 : Wd.W - L;
    dep = clamp(dep, 0, Wd.W - L);
    trav.largeur = L; trav.vx = vx;
    trav.fin = vx > 0 ? Wd.W - L : 0;                        // bord gauche d'arrivée
    var deja = Math.abs((Wd.x1 - Wd.x0) - L) < 1 && Wd.y0 <= 0.5 && Wd.y1 >= Wd.H - 0.5 && Math.abs(Wd.x0 - dep) < 1;
    if (deja) { gliding = false; trav.actif = true; trav.attend = false; return; }
    from.x0 = Wd.x0; from.y0 = Wd.y0; from.x1 = Wd.x1; from.y1 = Wd.y1;
    to.x0 = dep; to.x1 = dep + L; to.y0 = 0; to.y1 = Wd.H;
    glD = VOYAGE_GLISSE; glT = 0; gliding = true;
    trav.actif = false; trav.attend = true;
  }
  function stop() { trav.actif = false; trav.attend = false; trav.vx = 0; }

  function updateWorld(dt) {
    if (!(dt > 0)) return;
    if (gliding) {
      glT += dt;
      var u = glT >= glD ? 1 : ease(glT / glD);
      Wd.x0 = from.x0 + (to.x0 - from.x0) * u; Wd.x1 = from.x1 + (to.x1 - from.x1) * u;
      Wd.y0 = from.y0 + (to.y0 - from.y0) * u; Wd.y1 = from.y1 + (to.y1 - from.y1) * u;
      if (glT >= glD) {
        gliding = false;
        Wd.x0 = to.x0; Wd.x1 = to.x1; Wd.y0 = to.y0; Wd.y1 = to.y1;
        if (trav.attend) { trav.attend = false; trav.actif = true; }
      }
    } else if (trav.actif) {
      var dx = trav.vx * dt, L = Wd.x1 - Wd.x0;
      var nx0 = Wd.x0 + dx;
      if ((trav.vx > 0 && nx0 >= trav.fin) || (trav.vx < 0 && nx0 <= trav.fin)) { nx0 = trav.fin; trav.actif = false; }
      Wd.x0 = nx0; Wd.x1 = nx0 + L;
    }
  }

  function enMouvement() { return gliding || trav.actif; }

  /* les rectangles à hachurer dès maintenant : la position finale d'un glissement, ou le point d'arrêt d'un voyage */
  function mursAnnonces() {
    annonces.length = 0;                              // le tableau et son rectangle sont réutilisés : à lire tout de suite
    var a = annPool[0];
    if (gliding || trav.attend) { a.x = to.x0; a.y = to.y0; a.w = to.x1 - to.x0; a.h = to.y1 - to.y0; annonces.push(a); }
    else if (trav.actif) { a.x = trav.fin; a.y = Wd.y0; a.w = Wd.x1 - Wd.x0; a.h = Wd.y1 - Wd.y0; annonces.push(a); }
    return annonces;
  }

  /* distance au mur le plus proche : d (négative hors de l'arène), la normale qui pointe vers l'intérieur,
     le pan ('g','d','h','b') et si CE mur bouge. L'objet rendu est réutilisé : le lire tout de suite. */
  function distMur(x, y, out) {
    out = out || distOut;
    var dg = x - Wd.x0, dd = Wd.x1 - x, dh = y - Wd.y0, db = Wd.y1 - y;
    var d = dg, pan = 'g', nx = 1, ny = 0;
    if (dd < d) { d = dd; pan = 'd'; nx = -1; ny = 0; }
    if (dh < d) { d = dh; pan = 'h'; nx = 0; ny = 1; }
    if (db < d) { d = db; pan = 'b'; nx = 0; ny = -1; }
    out.d = d; out.nx = nx; out.ny = ny; out.pan = pan;
    var vertical = (pan === 'g' || pan === 'd');
    out.mobile = gliding || (trav.actif && vertical);
    return out;
  }
  function rect() { rectOut.x = Wd.x0; rectOut.y = Wd.y0; rectOut.w = Wd.x1 - Wd.x0; rectOut.h = Wd.y1 - Wd.y0; return rectOut; }
  function voyage() { return { actif: trav.actif, attend: trav.attend, vx: trav.vx, restant: (trav.actif || trav.attend) ? Math.abs(trav.fin - Wd.x0) : 0 }; }

  Wd.arena = arena; Wd.reset = reset; Wd.travelling = travelling; Wd.stop = stop;
  Wd.enMouvement = enMouvement; Wd.mursAnnonces = mursAnnonces; Wd.distMur = distMur; Wd.rect = rect; Wd.voyage = voyage;
  Wd.update = updateWorld;               // interne : appelé par N.cam.update, jamais par un autre module
  N.world = Wd;

  /* ================================ la caméra ================================ */
  var Cm = { x: 0, y: 0, w: 0, h: 0 };
  var cx = 0, cy = 0, vx = 0, vy = 0;        // centre de la vue (flottant) et sa vitesse : le suivi vit sur le CENTRE,
                                             // pour qu'une rotation (la vue change) ne fasse jamais sauter la caméra
  var jx = 0, jy = 0;                        // poussées (jolt), en px, qui s'amortissent
  var fo = { t: 0, d: 0, x: 0, y: 0 };       // cadrage scénarisé
  var modeC = 'jeu';
  var suiviObj = null;
  var tete = { x: 0, y: 0, ang: 0, vit: 0 };
  var outV = { x: 0, y: 0, w: 0, h: 0 };
  var devantV = 0;
  var init = false;

  function S() { return N.S || null; }
  function vue() { Cm.w = (N.gfx && N.gfx.W) | 0 || 422; Cm.h = (N.gfx && N.gfx.H) | 0 || 195; }
  function portrait() { return Cm.h > Cm.w; }

  /* la tête et son cap : N.cam.suit(obj) > N.joueuse.tete > rien (la caméra reste où elle est) */
  function lireTete() {
    var o = suiviObj || (N.joueuse && N.joueuse.tete) || null;
    if (!o || typeof o.x !== 'number') return false;
    tete.x = o.x; tete.y = o.y; tete.ang = +o.ang || 0; tete.vit = +o.vit || 0;
    return true;
  }
  /* le cap VISÉ : la direction du manche s'il est tenu, sinon le cap de la tête */
  var capX = 1, capY = 0;
  function lireCap() {
    var s = S(), inp = s && s.input;
    if (inp && inp.mag > 0.1 && (inp.x || inp.y)) {
      var m = Math.sqrt(inp.x * inp.x + inp.y * inp.y) || 1;
      capX = inp.x / m; capY = inp.y / m;
    } else { capX = Math.cos(tete.ang); capY = Math.sin(tete.ang); }
  }

  function boost() { var s = S(), inp = s && s.input; return !!(inp && inp.boost); }

  /* les bornes du centre de la vue : monde ou arène courante, 16 px de débord ; si la vue est plus grande que
     l'arène, on la centre dessus */
  function bornes() {
    var deb = (RC().debord) || 16;                       // → N.R.camera.debord
    var lo = Wd.x0 - deb, hi = Wd.x1 + deb - Cm.w;
    bx0 = lo <= hi ? lo : (lo + hi) / 2; bx1 = lo <= hi ? hi : (lo + hi) / 2;
    lo = Wd.y0 - deb; hi = Wd.y1 + deb - Cm.h;
    by0 = lo <= hi ? lo : (lo + hi) / 2; by1 = lo <= hi ? hi : (lo + hi) / 2;
  }
  var bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;

  /* amorti critique (smooth-damp) : constante de temps ts, intégré en forme fermée donc stable à tout dt */
  var amP = 0, amV = 0;                      // résultat de amorti(), lu tout de suite : aucune allocation par pas
  function amorti(pos, cible, v, dt, ts) {
    var om = 2 / ts, e = Math.exp(-om * dt);
    var d = pos - cible, tmp = (v + om * d) * dt;
    amV = (v - om * tmp) * e; amP = cible + (d + tmp) * e;
  }

  function update(dt) {
    vue();
    updateWorld(dt);
    bornes();
    var c = RC();
    var ok = lireTete();
    if (!init) {
      // première image : sans tête, la caméra se pose au centre du monde
      cx = ok ? tete.x : Wd.W / 2; cy = ok ? tete.y : Wd.H / 2; vx = vy = 0; init = true;
    }
    if (!(dt > 0)) dt = 0;
    if (modeC !== 'libre' && (ok || fo.t > 0)) {
      var tx, ty;
      if (fo.t > 0) { tx = fo.x; ty = fo.y; fo.t -= dt; }
      else {
        lireCap();
        var aX = (c.avanceX !== undefined ? c.avanceX : 0.30) * (Cm.w / 2);
        var aY = (c.avanceY !== undefined ? c.avanceY : 0.42) * (Cm.h / 2);
        var k = boost() ? (c.avanceBoost !== undefined ? c.avanceBoost : 1.4) : 1;
        tx = tete.x + capX * aX * k; ty = tete.y + capY * aY * k;
        if (modeC === 'boss' && N.colosse && typeof N.colosse.oeil === 'function') {
          var oe = N.colosse.oeil();
          if (oe && typeof oe.x === 'number') {
            var kt = (c.cyclope && c.cyclope.tete) || 0.7, ko = (c.cyclope && c.cyclope.oeil) || 0.3;
            tx = kt * tx + ko * oe.x; ty = kt * ty + ko * oe.y;
          }
        }
      }
      var ts = (c.amorti !== undefined ? c.amorti : 0.22);
      if (dt > 0) {
        amorti(cx, tx, vx, dt, ts); cx = amP; vx = amV;
        amorti(cy, ty, vy, dt, ts); cy = amP; vy = amV;
      }
    }
    // bornes (l'état est borné aussi : une borne qui s'écarte laisse la caméra repartir en douceur)
    var ex = cx - Cm.w / 2, ey = cy - Cm.h / 2;
    if (ex < bx0) { ex = bx0; if (vx < 0) vx = 0; } else if (ex > bx1) { ex = bx1; if (vx > 0) vx = 0; }
    if (ey < by0) { ey = by0; if (vy < 0) vy = 0; } else if (ey > by1) { ey = by1; if (vy > 0) vy = 0; }
    cx = ex + Cm.w / 2; cy = ey + Cm.h / 2;
    // la tête dans le cadre (15 à 85 %, en portrait 15 à 72 % en vertical) : elle PASSE AVANT la borne. Contre un mur,
    // la vue montre alors un peu plus que les 16 px de débord (du décor, rien d'autre) : devant() n'y perd rien.
    if (ok) {
      var cad = c.cadre || { min: 0.15, max: 0.85, portraitMaxY: 0.72 };
      var maxY = portrait() ? cad.portraitMaxY : cad.max;
      var lx = cx - Cm.w / 2, ly = cy - Cm.h / 2;
      var sx = tete.x - lx, sy = tete.y - ly;
      var mx0 = cad.min * Cm.w + 1, mx1 = cad.max * Cm.w - 1, my0 = cad.min * Cm.h + 1, my1 = maxY * Cm.h - 1;   // 1 px de garde : l'arrondi final ne sort pas du cadre
      if (sx < mx0) { lx = tete.x - mx0; if (vx < 0) vx = 0; } else if (sx > mx1) { lx = tete.x - mx1; if (vx > 0) vx = 0; }
      if (sy < my0) { ly = tete.y - my0; if (vy < 0) vy = 0; } else if (sy > my1) { ly = tete.y - my1; if (vy > 0) vy = 0; }
      cx = lx + Cm.w / 2; cy = ly + Cm.h / 2;
      ex = lx; ey = ly;
    }
    // poussées : s'amortissent en 0,15 s ; rien si la secousse est coupée
    if (jx !== 0 || jy !== 0) {
      var f = Math.exp(-dt * 20);
      jx *= f; jy *= f;
      if (Math.abs(jx) < 0.05) jx = 0; if (Math.abs(jy) < 0.05) jy = 0;
    }
    // arrondi UNIQUE, en dernier
    Cm.x = Math.round(ex + jx); Cm.y = Math.round(ey + jy);
  }

  function reset(x, y) {
    vue();
    var ok = lireTete();
    if (typeof x !== 'number') { x = ok ? tete.x : Wd.W / 2; y = ok ? tete.y : Wd.H / 2; }
    cx = x; cy = y; vx = vy = 0; jx = jy = 0; fo.t = 0; init = true; modeC = 'jeu';
    bornes();
    var ex = clamp(cx - Cm.w / 2, bx0, bx1), ey = clamp(cy - Cm.h / 2, by0, by1);
    cx = ex + Cm.w / 2; cy = ey + Cm.h / 2;
    Cm.x = Math.round(ex); Cm.y = Math.round(ey);
  }

  function toScreen(x, y, out) { out = out || {}; out.x = x - Cm.x; out.y = y - Cm.y; return out; }
  function toWorld(sx, sy, out) { out = out || {}; out.x = sx + Cm.x; out.y = sy + Cm.y; return out; }
  function visible(x, y, m) { m = +m || 0; return x >= Cm.x - m && x <= Cm.x + Cm.w + m && y >= Cm.y - m && y <= Cm.y + Cm.h + m; }
  /* ENTIÈREMENT dans la vue, à m px du bord : c'est la condition d'armement d'une attaque (§ 3.8) */
  function shown(x, y, m) { m = +m || 0; return x >= Cm.x + m && x <= Cm.x + Cm.w - m && y >= Cm.y + m && y <= Cm.y + Cm.h - m; }
  /* le rectangle de la vue si la tête avait avancé de sec secondes de trajet (les apparitions s'y interdisent) */
  function anticipee(sec, out) {
    out = out || outV;
    vue();
    var dx = 0, dy = 0;
    if (lireTete()) { var d = tete.vit * (+sec || 0); dx = Math.cos(tete.ang) * d; dy = Math.sin(tete.ang) * d; }
    bornes();
    out.x = Math.round(clamp(Cm.x + dx, bx0, bx1)); out.y = Math.round(clamp(Cm.y + dy, by0, by1));
    out.w = Cm.w; out.h = Cm.h;
    return out;
  }
  /* la distance visible devant la tête, mesurée le long du cap de la tête jusqu'au bord de la vue (critère du § 3.3) */
  function devant() {
    if (!lireTete()) return 0;
    var dx = Math.cos(tete.ang), dy = Math.sin(tete.ang);
    var tx = Infinity, ty = Infinity;
    if (dx > 1e-6) tx = (Cm.x + Cm.w - tete.x) / dx; else if (dx < -1e-6) tx = (Cm.x - tete.x) / dx;
    if (dy > 1e-6) ty = (Cm.y + Cm.h - tete.y) / dy; else if (dy < -1e-6) ty = (Cm.y - tete.y) / dy;
    devantV = Math.max(0, Math.min(tx, ty));
    return devantV;
  }

  /* la secousse du réglage SECOUSSE (0 à 1) et le mouvement réduit coupent les poussées */
  function facteurSecousse() {
    var s = S(), r = s && s.reglages, k = 1;
    if (r && typeof r.secousse === 'number') k = r.secousse > 1 ? r.secousse / 100 : r.secousse;
    if (typeof window !== 'undefined' && window.matchMedia) { try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) k = 0; } catch (e) {} }
    return k < 0 ? 0 : (k > 1 ? 1 : k);
  }
  /* décale la caméra de 2 à 6 px dans le sens (dx,dy), amortis en 0,15 s */
  function jolt(dx, dy) {
    var m = Math.sqrt(dx * dx + dy * dy);
    if (!(m > 0)) return;
    var j = RC().jolt || { min: 2, max: 6 };
    var a = clamp(m, j.min, j.max) * facteurSecousse();
    jx += dx / m * a; jy += dy / m * a;
  }
  /* la secousse À TRAUMA reste dans 20-crt.js, en espace écran : N.S.shake (amplitude, px de jeu) et la direction
     facultative N.S.shakeX/shakeY, lues par 20-crt.js. Ce raccourci les écrit, multipliées par le réglage SECOUSSE. */
  function secousse(amp, dx, dy) {
    var s = S(); if (!s) return;
    var a = (+amp || 0) * facteurSecousse();
    if (a > (s.shake || 0)) s.shake = a;
    var m = Math.sqrt((dx || 0) * (dx || 0) + (dy || 0) * (dy || 0));
    if (m > 0) { s.shakeX = dx / m; s.shakeY = dy / m; }
  }
  /* cadrage scénarisé : pendant dur secondes la cible est (x,y), puis la caméra revient à la tête */
  function focus(x, y, dur) { fo.x = x; fo.y = y; fo.t = Math.max(0, +dur || 0); fo.d = fo.t; }
  function mode(m) {
    if (m === 'jeu' || m === 'boss' || m === 'libre') modeC = m;
    return modeC;
  }
  function suit(o) { suiviObj = o || null; }

  Cm.update = update; Cm.reset = reset; Cm.toScreen = toScreen; Cm.toWorld = toWorld;
  Cm.visible = visible; Cm.shown = shown; Cm.anticipee = anticipee; Cm.devant = devant;
  Cm.jolt = jolt; Cm.secousse = secousse; Cm.focus = focus; Cm.mode = mode; Cm.suit = suit;
  Cm.bornes = function () { bornes(); return { x0: bx0, x1: bx1, y0: by0, y1: by1 }; };   // pour les tests
  N.cam = Cm;
})();
