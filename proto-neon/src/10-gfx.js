/* ===== 10-gfx.js — le tampon basse résolution, la mise à l'échelle, les primitives =====

   LES GROS PIXELS SONT RÉELS, PAS SIMULÉS. Tout le jeu se dessine dans un Uint8Array d'index de
   palette de W x H. Une seule fois par image, ce tampon est composé vers un canvas interne W x H par
   un ImageData, puis present() l'agrandit en voisin le plus proche vers le canvas de sortie.
   C'est la seule chaîne qui garantisse un carré net, et c'est aussi la plus rapide : sur iPhone
   844x390 à px = 2 on dessine 422x195 = 82 290 pixels au lieu de 329 160, soit neuf fois moins.

   Conséquences pour qui dessine :
     - un pixel de jeu ne peut porter qu'un index 0..15. Pas d'alpha, pas de dégradé : trame
       (N.pal.dither) ou ombre (N.pal.shade).
     - toutes les primitives arrondissent leurs coordonnées. Un sprite ne tombe jamais entre deux
       pixels, même si on lui passe une position flottante.
     - rien ici ne lit l'horloge et rien n'écrit de couleur : la table vient de N.pal.

   Interface imposée par CONTRAT.md :
     N.gfx.init(canvasSortie) / resize(cssW,cssH[,sûreW,sûreH]) -> {w,h,px} / W,H,PX
     clear(ci) / px(x,y,ci) / rect(x,y,w,h,ci) / line(x0,y0,x1,y1,ci) / circ(x,y,r,ci)
     ring(x,y,r,ci,t) / blit(sprite,x,y,opts) / present()

   Extras publiés en plus, parce que le look du prototype en dépend :
     ditherRect(x,y,w,h,ci,t)   aplat tramé — voiles, dégradés de ciel, halos carrés
     ditherCirc(x,y,r,ci,t)     disque tramé — le cœur d'une explosion
     disc(x,y,r0,r1,ci,t)       couronne épaisse tramée, de r0 à r1
     buf()                      le Uint8Array d'index, en lecture directe (tests, 20-crt.js)
     canvas() / context()       le canvas de sortie et son contexte (20-crt.js en a besoin)
     at(x,y)                    l'index posé en (x,y), -1 hors tampon (tests)
*/
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  var out = null, octx = null;          /* canvas de sortie, fourni par 90-boot.js */
  var ic = null, ictx = null;           /* canvas interne, exactement W x H */
  var img = null, u32 = null;           /* son ImageData et la vue 32 bits dessus */
  var buf = null;                       /* le tampon d'index : la vérité du rendu */
  var W = 0, H = 0, PX = 2;
  var smoothOK = false;                 /* le lissage a-t-il été désarmé depuis le dernier resize */
  /* contrat 1.0 (lot 0b, squelette ; le lot 1 l'optimise) : l'origine de dessin et le masque de propriété */
  var OX = 0, OY = 0;                   /* origine courante : les primitives retranchent (OX, OY) */
  var MK = null, OWN = 0;               /* masque de propriété : null hors mesure, coût nul */

  var RND = Math.round;

  function mkCanvas(w, h) {
    var c;
    if (typeof document !== 'undefined' && document.createElement) c = document.createElement('canvas');
    else if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    else return null;
    c.width = w; c.height = h;
    return c;
  }

  /* ---- taille (DIRECTION.md) : px = max(2, ⌊min(largeur sûre / 360, hauteur sûre / 180)⌋) ----
     Le plus gros pixel tel que la zone sûre (hors encoche, îlot et barre d'accueil, passée par 90-boot.js)
     garde au moins 360 x 180 pixels de jeu ; sans zone sûre, l'écran entier. Pas de plafond : un grand
     écran de bureau reçoit de plus gros pixels, jamais plus de monde. La taille ne dépend plus d'un
     arrondi de la seule largeur : iPhone 13 (844 x 390, sûre 750 x 369) et iPhone 16 (852 x 393, sûre
     734 x 372) tombent tous deux à px = 2, là où round(cssW / 340) donnait 2 et 3.
     Tampon = ceil(cssW/px) x ceil(cssH/px) : pas de letterbox, le décor couvre tout l'écran, quitte à
     dépasser de moins d'un gros pixel. */
  function resize(cssW, cssH, safeW, safeH) {
    cssW = Math.max(1, cssW | 0); cssH = Math.max(1, cssH | 0);
    var sw = +safeW, sh = +safeH;
    if (!(sw > 0) || sw > cssW) sw = cssW;
    if (!(sh > 0) || sh > cssH) sh = cssH;
    var p = Math.floor(Math.min(sw / 360, sh / 180));
    if (!(p >= 2)) p = 2;
    var w = Math.ceil(cssW / p), h = Math.ceil(cssH / p);
    if (w === W && h === H && p === PX && buf) { smoothOK = false; return { w: W, h: H, px: PX }; }
    W = w; H = h; PX = p;
    buf = new Uint8Array(W * H);
    if (MK) MK = new Uint8Array(W * H);
    ic = mkCanvas(W, H);
    ictx = ic ? ic.getContext('2d', { alpha: false }) : null;
    if (ictx) {
      ictx.imageSmoothingEnabled = false;
      img = ictx.createImageData(W, H);
      u32 = new Uint32Array(img.data.buffer);
    } else { img = null; u32 = null; }
    smoothOK = false;
    N.gfx.W = W; N.gfx.H = H; N.gfx.PX = PX;
    return { w: W, h: H, px: PX };
  }

  function init(canvasSortie) {
    out = canvasSortie || null;
    octx = out ? out.getContext('2d', { alpha: false }) : null;
    smoothOK = false;
    if (!W || !H) {
      var cw = 0, ch = 0;
      if (typeof window !== 'undefined') { cw = window.innerWidth | 0; ch = window.innerHeight | 0; }
      resize(cw || 960, ch || 540);
    }
  }

  /* ---- primitives ---- */
  function clear(ci) { if (buf) buf.fill((ci | 0) & 15); }

  function px(x, y, ci) {
    x = RND(x - OX); y = RND(y - OY);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    buf[y * W + x] = (ci | 0) & 15;
    if (MK) MK[y * W + x] = OWN;
  }

  function at(x, y) {
    x = RND(x); y = RND(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    return buf[y * W + x];
  }

  /* remplit une portion de ligne, déjà en entiers, sans vérifier deux fois les bornes */
  function row(x0, x1, y, c) {
    if (y < 0 || y >= H) return;
    if (x0 < 0) x0 = 0;
    if (x1 > W - 1) x1 = W - 1;
    if (x1 < x0) return;
    var o = y * W;
    buf.fill(c, o + x0, o + x1 + 1);
    if (MK) MK.fill(OWN, o + x0, o + x1 + 1);
  }

  function rect(x, y, w, h, ci) {
    x = RND(x - OX); y = RND(y - OY); w = RND(w); h = RND(h);
    if (w <= 0 || h <= 0) return;
    var c = (ci | 0) & 15, y1 = y + h - 1, x1 = x + w - 1;
    if (y < 0) y = 0; if (y1 > H - 1) y1 = H - 1;
    for (var yy = y; yy <= y1; yy++) row(x, x1, yy, c);
  }

  function ditherRect(x, y, w, h, ci, t) {
    if (t === undefined) t = 1;
    if (t >= 1) return rect(x, y, w, h, ci);
    if (!(t > 0)) return;
    x = RND(x - OX); y = RND(y - OY); w = RND(w); h = RND(h);
    var c = (ci | 0) & 15, D = N.pal.dither;
    var x0 = x < 0 ? 0 : x, y0 = y < 0 ? 0 : y;
    var x1 = x + w - 1, y1 = y + h - 1;
    if (x1 > W - 1) x1 = W - 1; if (y1 > H - 1) y1 = H - 1;
    for (var yy = y0; yy <= y1; yy++) {
      var o = yy * W;
      for (var xx = x0; xx <= x1; xx++) if (D(xx, yy, t)) { buf[o + xx] = c; if (MK) MK[o + xx] = OWN; }
    }
  }

  /* Bresenham entier : aucune position intermédiaire, aucun lissage */
  function line(x0, y0, x1, y1, ci) {
    x0 = RND(x0 - OX); y0 = RND(y0 - OY); x1 = RND(x1 - OX); y1 = RND(y1 - OY);
    var c = (ci | 0) & 15;
    var dx = x1 - x0 < 0 ? x0 - x1 : x1 - x0;
    var dy = y1 - y0 < 0 ? y0 - y1 : y1 - y0;
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy, e2;
    /* garde-fou : une ligne absurde ne doit pas geler l'image */
    var guard = dx + dy + 4;
    for (;;) {
      if (x0 >= 0 && y0 >= 0 && x0 < W && y0 < H) { buf[y0 * W + x0] = c; if (MK) MK[y0 * W + x0] = OWN; }
      if (x0 === x1 && y0 === y1) break;
      if (--guard < 0) break;
      e2 = err + err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  function circ(x, y, r, ci) {
    x = RND(x - OX); y = RND(y - OY); r = RND(r);
    if (r < 0) return;
    var c = (ci | 0) & 15, rr = r * r;
    var dy0 = -r, dy1 = r;
    if (y + dy0 < 0) dy0 = -y; if (y + dy1 > H - 1) dy1 = H - 1 - y;
    for (var dy = dy0; dy <= dy1; dy++) {
      var dx = (Math.sqrt(rr - dy * dy) + 0.5) | 0;
      row(x - dx, x + dx, y + dy, c);
    }
  }

  function ditherCirc(x, y, r, ci, t) {
    if (t === undefined) t = 1;
    if (t >= 1) return circ(x, y, r, ci);
    if (!(t > 0)) return;
    x = RND(x - OX); y = RND(y - OY); r = RND(r);
    if (r < 0) return;
    var c = (ci | 0) & 15, rr = r * r, D = N.pal.dither;
    var dy0 = -r, dy1 = r;
    if (y + dy0 < 0) dy0 = -y; if (y + dy1 > H - 1) dy1 = H - 1 - y;
    for (var dy = dy0; dy <= dy1; dy++) {
      var dx = (Math.sqrt(rr - dy * dy) + 0.5) | 0;
      var yy = y + dy, o = yy * W;
      var a = x - dx, b = x + dx;
      if (a < 0) a = 0; if (b > W - 1) b = W - 1;
      for (var xx = a; xx <= b; xx++) if (D(xx, yy, t)) { buf[o + xx] = c; if (MK) MK[o + xx] = OWN; }
    }
  }

  /* Couronne épaisse tramée, de r0 à r1 : une explosion est une forme, pas un flou. */
  function disc(x, y, r0, r1, ci, t) {
    if (t === undefined) t = 1;
    x = RND(x - OX); y = RND(y - OY); r0 = RND(r0); r1 = RND(r1);
    if (r1 < r0) { var sw = r0; r0 = r1; r1 = sw; }
    if (r1 < 0) return;
    if (r0 < 0) r0 = 0;
    var c = (ci | 0) & 15, a2 = r0 * r0, b2 = r1 * r1, D = N.pal.dither, full = t >= 1;
    var dy0 = -r1, dy1 = r1;
    if (y + dy0 < 0) dy0 = -y; if (y + dy1 > H - 1) dy1 = H - 1 - y;
    for (var dy = dy0; dy <= dy1; dy++) {
      var yy = y + dy, o = yy * W, d2 = dy * dy;
      var ox = (Math.sqrt(b2 - d2) + 0.5) | 0;
      var ax = x - ox, bx = x + ox;
      if (ax < 0) ax = 0; if (bx > W - 1) bx = W - 1;
      for (var xx = ax; xx <= bx; xx++) {
        var ex = xx - x, q = ex * ex + d2;
        if (q < a2 || q > b2) continue;
        if (full || D(xx, yy, t)) { buf[o + xx] = c; if (MK) MK[o + xx] = OWN; }
      }
    }
  }

  /* Anneau d'épaisseur 1 trame, algorithme du point milieu, chaque pixel filtré par le tramage. */
  function ring(x, y, r, ci, t) {
    if (t === undefined) t = 1;
    x = RND(x - OX); y = RND(y - OY); r = RND(r);
    if (r < 0) return;
    var c = (ci | 0) & 15, D = N.pal.dither, full = t >= 1;
    if (!full && !(t > 0)) return;

    function pt(px0, py0) {
      if (px0 < 0 || py0 < 0 || px0 >= W || py0 >= H) return;
      if (full || D(px0, py0, t)) { buf[py0 * W + px0] = c; if (MK) MK[py0 * W + px0] = OWN; }
    }
    if (r === 0) { pt(x, y); return; }

    var ox = r, oy = 0, err = 1 - r;
    while (ox >= oy) {
      pt(x + ox, y + oy); pt(x - ox, y + oy); pt(x + ox, y - oy); pt(x - ox, y - oy);
      pt(x + oy, y + ox); pt(x - oy, y + ox); pt(x + oy, y - ox); pt(x - oy, y - ox);
      oy++;
      if (err < 0) err += 2 * oy + 1;
      else { ox--; err += 2 * (oy - ox) + 1; }
    }
  }

  /* Sprite d'index de palette. 0 est transparent. opts {flipX,flipY,ci} ; ci remplace l'encre. */
  function blit(sprite, x, y, opts) {
    if (!sprite || !sprite.data) return;
    var sw = sprite.w | 0, sh = sprite.h | 0;
    if (sw <= 0 || sh <= 0) return;
    x = RND(x - OX); y = RND(y - OY);
    var d = sprite.data;
    var fx = !!(opts && opts.flipX), fy = !!(opts && opts.flipY);
    var ink = (opts && opts.ci !== undefined && opts.ci !== null) ? ((N.pal.i(opts.ci) | 0) & 15) : -1;

    /* On balaie l'ESPACE CIBLE déjà découpé, et on remonte au pixel source. Le découpage est donc
       exact par construction et il ne reste aucun test de bornes dans la boucle intérieure. */
    var tx0 = x < 0 ? 0 : x, tx1 = x + sw - 1, ty0 = y < 0 ? 0 : y, ty1 = y + sh - 1;
    if (tx1 > W - 1) tx1 = W - 1;
    if (ty1 > H - 1) ty1 = H - 1;
    if (tx1 < tx0 || ty1 < ty0) return;

    for (var ty = ty0; ty <= ty1; ty++) {
      var sy = ty - y; if (fy) sy = sh - 1 - sy;
      var so = sy * sw, to = ty * W;
      for (var tx = tx0; tx <= tx1; tx++) {
        var sx = tx - x; if (fx) sx = sw - 1 - sx;
        var vv = d[so + sx];
        if (!vv) continue;
        buf[to + tx] = ink >= 0 ? ink : (vv & 15);
        if (MK) MK[to + tx] = OWN;
      }
    }
  }

  /* ---- présentation : une seule composition, puis un agrandissement en voisin le plus proche ---- */
  function present(opts) {
    if (!buf || !octx || !ictx || !u32) return;
    /* skipScale : 20-crt.js relit buf() et compose seul ; ni conversion, ni putImageData, ni agrandissement */
    if (opts && opts.skipScale) return;
    var P = N.pal.U32, b = buf, u = u32, nn = b.length, j = 0;

    /* déroulé par quatre : c'est la boucle la plus chaude du prototype */
    var lim = nn - 3;
    while (j < lim) {
      u[j] = P[b[j]]; u[j + 1] = P[b[j + 1]]; u[j + 2] = P[b[j + 2]]; u[j + 3] = P[b[j + 3]];
      j += 4;
    }
    while (j < nn) { u[j] = P[b[j]]; j++; }
    ictx.putImageData(img, 0, 0);

    /* la sortie fait exactement W*PX x H*PX : un gros pixel est un carré entier, partout pareil */
    var ow = W * PX, oh = H * PX;
    if (out.width !== ow) { out.width = ow; smoothOK = false; }
    if (out.height !== oh) { out.height = oh; smoothOK = false; }
    if (!smoothOK) {
      octx.msImageSmoothingEnabled = false;
      octx.webkitImageSmoothingEnabled = false;
      octx.mozImageSmoothingEnabled = false;
      smoothOK = true;
    }
    /* Remis à chaque image sans condition : 20-crt.js travaille sur CE contexte et y laisse des
       états de composition. Trois écritures de propriété valent mieux qu'un agrandissement lissé. */
    octx.imageSmoothingEnabled = false;
    octx.globalAlpha = 1;
    octx.globalCompositeOperation = 'source-over';
    octx.drawImage(ic, 0, 0, W, H, 0, 0, ow, oh);
  }

  /* ---- contrat 1.0 : origine, plans, remappage, masque (squelette du lot 0b, le lot 1 les optimise) ---- */
  function origin(ox, oy) { OX = RND(+ox || 0); OY = RND(+oy || 0); }
  /* un plan {w, h, data} posé par copie de rangées en (x, y) ; wrapX : bouclé en largeur ; opaque : l'index 0
     est posé aussi ; lut : table de 16 index appliquée en copiant (cyclage) */
  function layer(im, o) {
    if (!im || !im.data || !buf) return;
    o = o || {};
    var x = RND((+o.x || 0) - OX), y = RND((+o.y || 0) - OY), iw = im.w | 0, ih = im.h | 0, d = im.data, lut = o.lut || null, op = !!o.opaque;
    if (iw <= 0 || ih <= 0) return;
    var y0 = y < 0 ? 0 : y, y1 = Math.min(H - 1, y + ih - 1);
    for (var ty = y0; ty <= y1; ty++) {
      var so = (ty - y) * iw, to = ty * W;
      for (var tx = 0; tx < W; tx++) {
        var sx = tx - x;
        if (o.wrapX) { sx %= iw; if (sx < 0) sx += iw; } else if (sx < 0 || sx >= iw) continue;
        var v = d[so + sx];
        if (!v && !op) continue;
        buf[to + tx] = lut ? (lut[v & 15] & 15) : (v & 15);
        if (MK) MK[to + tx] = OWN;
      }
    }
  }
  /* applique une table d'index au tampon, en entier ou sur rect {x, y, w, h} (ÉCRAN) */
  function remap(lut, r) {
    if (!buf || !lut) return;
    var x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
    if (r) { x0 = Math.max(0, RND(r.x)); y0 = Math.max(0, RND(r.y)); x1 = Math.min(W - 1, RND(r.x + r.w) - 1); y1 = Math.min(H - 1, RND(r.y + r.h) - 1); }
    for (var yy = y0; yy <= y1; yy++) { var o = yy * W; for (var xx = x0; xx <= x1; xx++) buf[o + xx] = lut[buf[o + xx]] & 15; }
  }
  function owner(code) { OWN = (code | 0) & 255; }
  /* masque(true) l'arme (remis à zéro), masque(false) le désarme ; rend le masque courant (ou null) */
  function masque(b) {
    if (b === true) { MK = new Uint8Array(W * H); OWN = 0; }
    else if (b === false) { var m = MK; MK = null; return m; }
    return MK;
  }

  N.gfx = {
    W: 0, H: 0, PX: 2,
    origin: origin, layer: layer, remap: remap, owner: owner, masque: masque,
    originX: function () { return OX; }, originY: function () { return OY; },
    init: init, resize: resize, present: present,
    clear: clear, px: px, rect: rect, line: line, circ: circ, ring: ring, blit: blit,
    ditherRect: ditherRect, ditherCirc: ditherCirc, disc: disc,
    at: at,
    buf: function () { return buf; },
    canvas: function () { return out; },
    context: function () { return octx; },
    inner: function () { return ic; }
  };
})();
