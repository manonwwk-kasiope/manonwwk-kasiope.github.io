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

   Ajouts du lot B (REFONTE.md § 7.8), sans changer les signatures existantes :
     origin(ox,oy)              ORIGINE DE DESSIN : toutes les primitives retranchent (ox,oy), arrondi à l'entier.
                                origin(0,0) = écran. En jeu, le monde se dessine avec origin(cam.x, cam.y) ;
                                le HUD, l'interface et les cinématiques avec origin(0,0).
     layer(img,{x,y,wrapX,opaque,lut,luts})   pose un plan {w,h,data} par copie de rangées. Le plan est posé en (x,y)
                                (retranche l'origine) ; wrapX le fait boucler sans couture ; opaque : l'index 0
                                est posé aussi (sinon transparent) ; lut : table de 16 index (cyclage, quartiers) ;
                                luts : une table par rangée du plan (prioritaire sur lut).
     remap(lut[,rect])          applique une table d'index au tampon (la mort : monde en nuit et ardoise)
     owner(code) / masque(b)    propriétaire des pixels dessinés ensuite ; masque(true) alloue le masque, coût nul sinon
     copyTo(dst) / mixBayer(src,p)   copie du tampon ; fondu tramé (balayages de 0,4 s du VOL et des quartiers)
     present({skipScale})       skipScale : ni conversion, ni putImageData, ni agrandissement (20-crt.js relit buf())
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
  var OX = 0, OY = 0;                   /* origine de dessin : un point (x,y) du monde se pose en (x-OX, y-OY) */
  var MK = null, OWN = 0, maskOn = false;   /* masque de propriété : un octet par pixel, seulement s'il est armé */
  var traceDepth = 0, traced = null, copies = null;

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
    traced = null;
    MK = maskOn ? new Uint8Array(W * H) : null;
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
  function clear(ci) {
    if (buf) buf.fill((ci | 0) & 15);
    if (MK) MK.fill(0);                 // aucune propriété héritée de l'image précédente
  }

  function origin(ox, oy) { OX = RND(+ox || 0); OY = RND(+oy || 0); }

  function px(x, y, ci) {
    x = RND(x) - OX; y = RND(y) - OY;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    buf[y * W + x] = (ci | 0) & 15;
    if (MK) MK[y * W + x] = OWN;
  }

  function at(x, y) {
    x = RND(x) - OX; y = RND(y) - OY;
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
    x = RND(x) - OX; y = RND(y) - OY; w = RND(w); h = RND(h);
    if (w <= 0 || h <= 0) return;
    var c = (ci | 0) & 15, y1 = y + h - 1, x1 = x + w - 1;
    if (y < 0) y = 0; if (y1 > H - 1) y1 = H - 1;
    for (var yy = y; yy <= y1; yy++) row(x, x1, yy, c);
  }

  function ditherRect(x, y, w, h, ci, t) {
    if (t === undefined) t = 1;
    if (t >= 1) return rect(x, y, w, h, ci);
    if (!(t > 0)) return;
    x = RND(x) - OX; y = RND(y) - OY; w = RND(w); h = RND(h);
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
    x0 = RND(x0) - OX; y0 = RND(y0) - OY; x1 = RND(x1) - OX; y1 = RND(y1) - OY;
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
    x = RND(x) - OX; y = RND(y) - OY; r = RND(r);
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
    x = RND(x) - OX; y = RND(y) - OY; r = RND(r);
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
    x = RND(x) - OX; y = RND(y) - OY; r0 = RND(r0); r1 = RND(r1);
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
    x = RND(x) - OX; y = RND(y) - OY; r = RND(r);
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
    x = RND(x) - OX; y = RND(y) - OY;
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

  /* ---- plans : copie de rangées, bouclage horizontal, table de couleurs ----
     img {w,h,data} d'index ; o {x,y,wrapX,opaque,lut}. Le plan est posé en (x,y) (l'origine est retranchée, comme
     pour toute primitive). wrapX : le plan boucle sans couture sur toute la largeur du tampon. opaque : l'index 0
     est posé aussi (sinon il est transparent, comme pour blit). lut : table de 16 index appliquée à la volée
     (cyclage des enseignes, table de couleurs d'un quartier). Un plan sans lut ni transparence se copie par
     segments entiers (buf.set) : c'est le chemin rapide du ciel et du sol. */
  function layer(img, o) {
    if (!img || !img.data || !buf) return;
    var iw = img.w | 0, ih = img.h | 0, d = img.data;
    if (iw <= 0 || ih <= 0) return;
    var x0 = RND((o && o.x) || 0) - OX, y0 = RND((o && o.y) || 0) - OY;
    var wrap = !!(o && o.wrapX), opaque = !!(o && o.opaque), lut0 = (o && o.lut) || null, luts = (o && o.luts) || null;
    var ya = y0 < 0 ? -y0 : 0, yb = ih - 1;
    if (y0 + yb > H - 1) yb = H - 1 - y0;
    if (ya > yb) return;
    var fast = opaque && !lut0 && !luts;
    for (var r = ya; r <= yb; r++) {
      var so = r * iw, to = (y0 + r) * W;
      var lut = luts ? luts[r] : lut0;           /* une table par rangée du plan : rangées de fenêtres, éclipse */
      if (wrap) {
        var s0 = (-x0) % iw; if (s0 < 0) s0 += iw;         /* colonne du plan qui tombe sur la colonne 0 du tampon */
        var tx = 0;
        while (tx < W) {
          var run = iw - s0; if (run > W - tx) run = W - tx;
          if (fast) buf.set(d.subarray(so + s0, so + s0 + run), to + tx);
          else for (var k = 0; k < run; k++) {
            var v = d[so + s0 + k];
            if (!v && !opaque) continue;
            buf[to + tx + k] = lut ? lut[v] : v;
            if (MK) MK[to + tx + k] = OWN;
          }
          if (MK && fast) MK.fill(OWN, to + tx, to + tx + run);
          tx += run; s0 = 0;
        }
      } else {
        var a = x0 < 0 ? -x0 : 0, b = iw - 1;
        if (x0 + b > W - 1) b = W - 1 - x0;
        if (a > b) continue;
        if (fast) buf.set(d.subarray(so + a, so + b + 1), to + x0 + a);
        else for (var k2 = a; k2 <= b; k2++) {
          var v2 = d[so + k2];
          if (!v2 && !opaque) continue;
          buf[to + x0 + k2] = lut ? lut[v2] : v2;
          if (MK) MK[to + x0 + k2] = OWN;
        }
        if (MK && fast) MK.fill(OWN, to + x0 + a, to + x0 + b + 1);
      }
    }
  }

  /* applique une table d'index au tampon, en entier ou dans rect {x,y,w,h} (coordonnées de dessin) */
  function remap(lut, rect) {
    if (!buf || !lut) return;
    var x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
    if (rect) {
      x0 = RND(rect.x) - OX; y0 = RND(rect.y) - OY; x1 = x0 + RND(rect.w) - 1; y1 = y0 + RND(rect.h) - 1;
      if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 > W - 1) x1 = W - 1; if (y1 > H - 1) y1 = H - 1;
    }
    for (var y = y0; y <= y1; y++) {
      var o = y * W;
      for (var x = o + x0, e = o + x1; x <= e; x++) buf[x] = lut[buf[x]];
    }
  }

  /* masque de propriété (§ 7.12) : owner(code) fixe qui dessine ; masque(true) l'arme (un octet par pixel) */
  function owner(code) { if (code !== undefined) OWN = code & 255; return OWN; }
  function masque(on) {
    maskOn = !!on;
    if (maskOn) { if (!MK || MK.length !== W * H) MK = new Uint8Array(W * H); }
    else { MK = null; traced = null; copies = null; }
    return MK;
  }

  /* Les modules historiques dessinent aussi directement dans buf(). Le Proxy ne leur est fourni
     QUE dans un dessin instrumenté ; en dehors, buf() reste le véritable Uint8Array. Chaque écriture
     est suivie, même si elle repose la même encre. Aucune déduction du propriétaire par la couleur. */
  function traceBuffer(a, offset) {
    var methods = {};
    return new Proxy(a, {
      get: function (target, key) {
        if (key === 'set') return methods.set || (methods.set = function (src, at) {
          at = at === undefined ? 0 : at;
          target.set(src, at);
          if (MK) MK.fill(OWN, offset + at, offset + at + src.length);
        });
        if (key === 'fill') return methods.fill || (methods.fill = function (value, start, end) {
          target.fill(value, start, end);
          if (MK) MK.subarray(offset, offset + target.length).fill(OWN, start, end);
          return this;
        });
        if (key === 'subarray') return methods.subarray || (methods.subarray = function (start, end) {
          var sub = target.subarray(start, end);
          return traceBuffer(sub, offset + sub.byteOffset - target.byteOffset);
        });
        var v = Reflect.get(target, key, target);
        if (typeof v !== 'function' || key === 'constructor') return v;
        return methods[key] || (methods[key] = v.bind(target));
      },
      set: function (target, key, value) {
        var ok = Reflect.set(target, key, value, target), i = +key;
        if (ok && MK && Number.isInteger(i) && i >= 0 && i < target.length) MK[offset + i] = OWN;
        return ok;
      }
    });
  }
  function suivre(code, fn, ctx, args) {
    if (!MK) return fn.apply(ctx, args);
    var prev = OWN; OWN = code; traceDepth++;
    try { return fn.apply(ctx, args); }
    finally { traceDepth--; OWN = prev; }
  }
  function buffer() {
    if (!MK || !traceDepth || !buf) return buf;
    if (!traced) traced = traceBuffer(buf, 0);
    return traced;
  }

  /* copie du tampon d'index dans dst (alloué ici s'il manque ou s'il n'a pas la taille) */
  function copyTo(dst) {
    if (!buf) return dst || null;
    if (!dst || dst.length !== buf.length) dst = new Uint8Array(buf.length);
    dst.set(buf);
    if (MK) { if (!copies) copies = new WeakMap(); copies.set(dst, new Uint8Array(MK)); }
    return dst;
  }

  /* fondu tramé : là où Bayer(x,y) < p, le tampon prend src ; p de 0 (rien) à 1 (tout) */
  function mixBayer(src, p) {
    if (!buf || !src || src.length !== buf.length) return;
    if (!(p > 0)) return;
    var sm = MK && copies && copies.get(src);
    if (p >= 1) { buf.set(src); if (MK) { if (sm) MK.set(sm); else MK.fill(0); } return; }
    var B = N.pal.BAYER, lim = p * 16;
    for (var y = 0; y < H; y++) {
      var o = y * W, br = (y & 3) << 2;
      for (var x = 0; x < W; x++) if (lim > B[br | (x & 3)]) { buf[o + x] = src[o + x]; if (MK) MK[o + x] = sm ? sm[o + x] : 0; }
    }
  }

  /* ---- présentation : une seule composition, puis un agrandissement en voisin le plus proche ---- */
  function present(o) {
    if (o && o.skipScale) return;           /* le tube relit buf() lui-même : aucune conversion ici (§ 7.11) */
    if (!buf || !octx || !ictx || !u32) return;
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

  N.gfx = {
    W: 0, H: 0, PX: 2,
    init: init, resize: resize, present: present,
    clear: clear, px: px, rect: rect, line: line, circ: circ, ring: ring, blit: blit,
    ditherRect: ditherRect, ditherCirc: ditherCirc, disc: disc,
    at: at,
    origin: origin, layer: layer, remap: remap, owner: owner, masque: masque, suivre: suivre, copyTo: copyTo, mixBayer: mixBayer,
    ox: function () { return OX; }, oy: function () { return OY; },
    mask: function () { return MK; },
    buf: buffer,
    canvas: function () { return out; },
    context: function () { return octx; },
    inner: function () { return ic; }
  };
})();
