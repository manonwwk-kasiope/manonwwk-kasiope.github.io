/* =========================================================================
   SNAKE 2030 — 20-fx.js
   Module S2030.fx : particules, ondes, halos, secousse, hitstop, textes,
   flashs plein écran. Tout est préalloué : zéro allocation par image.

   Dépendances (fournies par 10-core.js dans la closure partagée) :
     S, K, rnd, rndR, rndI, pick, chance, clamp, lerp, inView
   ========================================================================= */

/* ---------------------------------------------------------------- réglages */

var _FX_NPART  = 800;   // particules
var _FX_NRING  = 60;    // ondes de choc
var _FX_NFLARE = 40;    // halos additifs
var _FX_NTEXT  = 30;    // textes flottants

var _FX_AQ        = 20;    // quantification de l'alpha (batching)
var _FX_SHAKE_MAX = 30;    // unités monde
var _FX_HIT_MAX   = 140;   // ms
var _FX_STREAK_MAX = 96;   // longueur max d'une traînée, unités monde

var _fxFontFam = "'Rajdhani','Orbitron',ui-sans-serif,system-ui,sans-serif";

/* ------------------------------------------------------------------- pools */

var _fxParts  = new Array(_FX_NPART);
var _fxRings  = new Array(_FX_NRING);
var _fxFlares = new Array(_FX_NFLARE);
var _fxTexts  = new Array(_FX_NTEXT);

var _fxPi = 0, _fxRi = 0, _fxFi = 0, _fxTi = 0;

(function _fxAlloc() {
  var i;
  for (i = 0; i < _FX_NPART; i++) {
    _fxParts[i] = {
      on: false, x: 0, y: 0, vx: 0, vy: 0, g: 0, dr: 2.4,
      s: 2, s0: 2, l: 0, ml: 1, c: '#fff', gl: 1, sh: 1,
      rot: 0, spin: 0, st: 0.06, fd: 1, sk: 1
    };
  }
  for (i = 0; i < _FX_NRING; i++) {
    _fxRings[i] = {
      on: false, x: 0, y: 0, r: 0, sp: 0, l: 0, ml: 1,
      c: '#fff', w: 3, gl: 1, sq: 1, rot: 0, ea: 3.2
    };
  }
  for (i = 0; i < _FX_NFLARE; i++) {
    _fxFlares[i] = { on: false, x: 0, y: 0, r: 20, r0: 20, l: 0, ml: 1, c: '#fff', a0: 1 };
  }
  for (i = 0; i < _FX_NTEXT; i++) {
    _fxTexts[i] = { on: false, x: 0, y: 0, vy: -34, l: 0, ml: 1, s: '', c: '#fff', sz: 15, out: 1 };
  }
})();

/* ------------------------------------------------------- état global du fx */

var _fxShake   = 0;   // amplitude courante, unités monde
var _fxHit     = 0;   // hitstop restant, ms
var _fxFlashA  = 0;   // flash plein écran
var _fxFlashC  = '#ffffff';
var _fxVigA    = 0;   // flash en vignette (bords)
var _fxVigC    = '#ff2b52';
var _fxGlitch  = 0;   // 0..1

/* ------------------------------------------------------- caches sans alloc */

var _fxRgbCache  = {};   // '#ff0' -> '255,255,0'
var _fxGradCache = {};   // couleur -> { g: CanvasGradient, c: ctx }
var _fxFonts     = new Array(96);
var _fxVig       = { g: null, c: null, col: '', w: 0, h: 0 };
var _fxInViewFn  = null;

function _fxAlwaysVis() { return true; }

function _fxVis(x, y, m) {
  if (_fxInViewFn === null) {
    _fxInViewFn = (typeof inView === 'function') ? inView : _fxAlwaysVis;
  }
  return _fxInViewFn(x, y, m);
}

function _fxHex(ch) {
  var c = ch.charCodeAt(0);
  if (c >= 48 && c <= 57) return c - 48;
  if (c >= 97 && c <= 102) return c - 87;
  if (c >= 65 && c <= 70) return c - 55;
  return 15;
}

/* Renvoie 'r,g,b' pour n'importe quelle couleur CSS simple. Mis en cache. */
function _fxRgb(col) {
  var v = _fxRgbCache[col];
  if (v !== undefined) return v;
  var r = 255, g = 255, b = 255;
  if (typeof col === 'string') {
    if (col.charCodeAt(0) === 35) { // '#'
      if (col.length >= 7) {
        r = _fxHex(col[1]) * 16 + _fxHex(col[2]);
        g = _fxHex(col[3]) * 16 + _fxHex(col[4]);
        b = _fxHex(col[5]) * 16 + _fxHex(col[6]);
      } else if (col.length >= 4) {
        r = _fxHex(col[1]) * 17; g = _fxHex(col[2]) * 17; b = _fxHex(col[3]) * 17;
      }
    } else if (col.indexOf('rgb') === 0) {
      var o = col.indexOf('('), e = col.indexOf(')');
      if (o > 0 && e > o) {
        var p = col.slice(o + 1, e).split(',');
        r = parseInt(p[0], 10) | 0; g = parseInt(p[1], 10) | 0; b = parseInt(p[2], 10) | 0;
      }
    }
  }
  v = r + ',' + g + ',' + b;
  _fxRgbCache[col] = v;
  return v;
}

/* Dégradé radial en espace unitaire (centre 0,0 rayon 1), mis en cache. */
function _fxGlowGrad(ctx, col) {
  var e = _fxGradCache[col];
  if (e !== undefined && e.c === ctx) return e.g;
  var base = _fxRgb(col);
  var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0.00, 'rgba(' + base + ',1)');
  g.addColorStop(0.16, 'rgba(' + base + ',0.70)');
  g.addColorStop(0.40, 'rgba(' + base + ',0.26)');
  g.addColorStop(0.70, 'rgba(' + base + ',0.07)');
  g.addColorStop(1.00, 'rgba(' + base + ',0)');
  _fxGradCache[col] = { g: g, c: ctx };
  return g;
}

function _fxFont(sz) {
  if (sz < 6) sz = 6; else if (sz > 90) sz = 90;
  sz = sz | 0;
  var f = _fxFonts[sz];
  if (f === undefined) { f = '800 ' + sz + 'px ' + _fxFontFam; _fxFonts[sz] = f; }
  return f;
}

/* bruit déterministe (jamais Math.random, jamais Date.now) */
function _fxHash(i) {
  var v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/* ------------------------------------------------------------- préférences */

function _fxOpt() {
  return (typeof S !== 'undefined' && S && S.opt) ? S.opt : null;
}
function _fxPartF() {           // densité de particules 0..2
  var o = _fxOpt();
  if (o && typeof o.particles === 'number') {
    return o.particles < 0 ? 0 : (o.particles > 2 ? 2 : o.particles);
  }
  return 1;
}
function _fxFlashF() {          // atténuation des flashs
  var o = _fxOpt();
  return (o && o.reduceFlash) ? 0.28 : 1;
}
function _fxShakeF() {          // atténuation des secousses
  var o = _fxOpt();
  return (o && o.reduceShake) ? 0.3 : 1;
}

/* ------------------------------------------------------------- allocateurs */

function _fxNextPart() {
  var p = _fxParts[_fxPi];
  _fxPi = (_fxPi + 1) % _FX_NPART;
  return p;
}
function _fxNextRing() {
  var r = _fxRings[_fxRi];
  _fxRi = (_fxRi + 1) % _FX_NRING;
  return r;
}
function _fxNextFlare() {
  var f = _fxFlares[_fxFi];
  _fxFi = (_fxFi + 1) % _FX_NFLARE;
  return f;
}
function _fxNextText() {
  var t = _fxTexts[_fxTi];
  _fxTi = (_fxTi + 1) % _FX_NTEXT;
  return t;
}

/* ---------------------------------------------------------------- émission */

/**
 * Gerbe de particules.
 * opts (tous optionnels) :
 *   ang     direction centrale, radians (défaut 0)
 *   spread  demi-ouverture, radians (défaut PI = cercle complet)
 *   g       gravité, u/s²         drag    freinage /s (défaut 2.4)
 *   life    durée de base, s      size    demi-taille de base, u
 *   glow    false => rendu normal, sinon additif
 *   shape   'spark' | 'dot' | 'shard'
 *   spin    rotation rad/s (shard) stretch facteur de traînée (spark)
 *   vx,vy   vitesse héritée       fade    1 linéaire, 2 rapide
 *   shrink  0..1 rétrécissement   jitter  dispersion initiale, u
 */
function _fxBurst(x, y, color, n, power, opts) {
  if (n === undefined || n === null) n = 10;
  if (power === undefined || power === null) power = 140;
  var f = _fxPartF();
  n = (n * f) | 0;
  if (n < 1) n = 1;
  if (n > _FX_NPART) n = _FX_NPART;

  var o = opts || null;
  var a0 = (o && o.ang !== undefined) ? o.ang : 0;
  var sp = (o && o.spread !== undefined) ? o.spread : Math.PI;
  var gr = (o && o.g !== undefined) ? o.g : 0;
  var dg = (o && o.drag !== undefined) ? o.drag : 2.4;
  var lf = (o && o.life !== undefined) ? o.life : (0.30 + (power > 450 ? 0.45 : power / 1000));
  var sz = (o && o.size !== undefined) ? o.size : (1.7 + (power > 600 ? 1.2 : power / 500));
  var gl = (o && o.glow === false) ? 0 : 1;
  var shn = (o && o.shape) || 'spark';
  var sh = shn === 'dot' ? 0 : (shn === 'shard' ? 2 : 1);
  var spin = (o && o.spin !== undefined) ? o.spin : 6;
  var st = (o && o.stretch !== undefined) ? o.stretch : 0.055;
  var ivx = (o && o.vx) || 0, ivy = (o && o.vy) || 0;
  var fd = (o && o.fade !== undefined) ? o.fade : 1;
  var sk = (o && o.shrink !== undefined) ? o.shrink : 0.7;
  var jt = (o && o.jitter !== undefined) ? o.jitter : 0;
  var arr = (color && color.length !== undefined && typeof color !== 'string') ? color : null;

  for (var i = 0; i < n; i++) {
    var p = _fxNextPart();
    var a = a0 + rndR(-sp, sp);
    var v = power * rndR(0.26, 1.15);
    p.on = true;
    p.x = x + (jt ? rndR(-jt, jt) : 0);
    p.y = y + (jt ? rndR(-jt, jt) : 0);
    p.vx = Math.cos(a) * v + ivx;
    p.vy = Math.sin(a) * v + ivy;
    p.g = gr;
    p.dr = dg;
    p.s = p.s0 = sz * rndR(0.6, 1.45);
    p.ml = p.l = lf * rndR(0.6, 1.3);
    p.c = arr ? pick(arr) : color;
    p.gl = gl;
    p.sh = sh;
    p.rot = rndR(-3.14159, 3.14159);
    p.spin = spin ? rndR(-spin, spin) : 0;
    p.st = st;
    p.fd = fd;
    p.sk = sk;
  }
}

/** Onde de choc. opts : {life, w, glow, squash, rot, ease} */
function _fxRing(x, y, color, r0, speed, opts) {
  if (_fxPartF() <= 0) return;
  var o = opts || null;
  var r = _fxNextRing();
  r.on = true;
  r.x = x; r.y = y;
  r.r = (r0 === undefined ? 6 : r0);
  r.sp = (speed === undefined ? 320 : speed);
  r.ml = r.l = (o && o.life !== undefined) ? o.life : 0.42;
  r.c = color || '#7df9ff';
  r.w = (o && o.w !== undefined) ? o.w : 4;
  r.gl = (o && o.glow === false) ? 0 : 1;
  r.sq = (o && o.squash !== undefined) ? o.squash : 1;
  r.rot = (o && o.rot !== undefined) ? o.rot : 0;
  r.ea = (o && o.ease !== undefined) ? o.ease : 3.2;
}

/** Halo radial additif — c'est lui qui fait le bloom. opts : {life, a} */
function _fxFlare(x, y, color, rad, opts) {
  var o = opts || null;
  var f = _fxNextFlare();
  f.on = true;
  f.x = x; f.y = y;
  f.r0 = f.r = (rad === undefined ? 40 : rad);
  f.ml = f.l = (o && o.life !== undefined) ? o.life : 0.26;
  f.c = color || '#ffffff';
  f.a0 = ((o && o.a !== undefined) ? o.a : 0.95) * _fxFlashF() * 0.6 + ((o && o.a !== undefined) ? o.a : 0.95) * 0.4;
  if (f.a0 > 1) f.a0 = 1;
}

/** Traînée courte (moteur, projectile, boost). */
function _fxTrail(x, y, ang, color) {
  if (_fxPartF() <= 0.001) return;
  var p = _fxNextPart();
  var a = (ang === undefined ? 0 : ang) + Math.PI + rndR(-0.35, 0.35);
  var v = rndR(30, 110);
  p.on = true;
  p.x = x; p.y = y;
  p.vx = Math.cos(a) * v;
  p.vy = Math.sin(a) * v;
  p.g = 0; p.dr = 3.4;
  p.s = p.s0 = rndR(1.2, 2.8);
  p.ml = p.l = rndR(0.12, 0.26);
  p.c = color || '#7df9ff';
  p.gl = 1; p.sh = 1;
  p.rot = a; p.spin = 0;
  p.st = 0.05; p.fd = 1; p.sk = 0.9;
}

/** Texte flottant monde. opts : {size, vy, life, outline} */
function _fxText(x, y, str, color, opts) {
  var o = opts || null;
  var t = _fxNextText();
  t.on = true;
  t.x = x; t.y = y;
  t.vy = (o && o.vy !== undefined) ? o.vy : -42;
  t.ml = t.l = (o && o.life !== undefined) ? o.life : 0.85;
  t.s = (str === undefined || str === null) ? '' : ('' + str);
  t.c = color || '#ffffff';
  t.sz = (o && o.size !== undefined) ? o.size : 15;
  t.out = (o && o.outline === false) ? 0 : 1;
}

function _fxShakeAdd(amount) {
  if (!amount) return;
  _fxShake += amount * _fxShakeF();
  if (_fxShake > _FX_SHAKE_MAX) _fxShake = _FX_SHAKE_MAX;
}

function _fxHitstop(ms) {
  if (!ms) return;
  if (ms > _FX_HIT_MAX) ms = _FX_HIT_MAX;
  if (ms > _fxHit) _fxHit = ms;
}

/** Flash plein écran. mode 'edge' => vignette (idéal pour les dégâts). */
function _fxFlash(color, a, mode) {
  if (a === undefined) a = 0.5;
  a *= _fxFlashF();
  if (mode === 'edge') {
    if (a > _fxVigA) { _fxVigA = a > 1 ? 1 : a; _fxVigC = color || '#ff2b52'; }
  } else {
    if (a > _fxFlashA) { _fxFlashA = a > 1 ? 1 : a; _fxFlashC = color || '#ffffff'; }
  }
}

function _fxGlitchAdd(a) {
  a = (a === undefined ? 0.6 : a) * _fxFlashF();
  if (a > _fxGlitch) _fxGlitch = a > 1 ? 1 : a;
}

/* ------------------------------------------------------------------ update */

function _fxUpdate(dt) {
  if (!dt || dt < 0) dt = 0;
  var i, k;

  // particules
  for (i = 0; i < _FX_NPART; i++) {
    var p = _fxParts[i];
    if (!p.on) continue;
    p.l -= dt;
    if (p.l <= 0) { p.on = false; continue; }
    if (p.g !== 0) p.vy += p.g * dt;
    if (p.dr !== 0) {
      k = 1 / (1 + p.dr * dt);
      p.vx *= k; p.vy *= k;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.spin !== 0) p.rot += p.spin * dt;
  }

  // ondes
  for (i = 0; i < _FX_NRING; i++) {
    var r = _fxRings[i];
    if (!r.on) continue;
    r.l -= dt;
    if (r.l <= 0) { r.on = false; continue; }
    r.r += r.sp * dt;
    r.sp *= 1 / (1 + r.ea * dt);
  }

  // halos
  for (i = 0; i < _FX_NFLARE; i++) {
    var f = _fxFlares[i];
    if (!f.on) continue;
    f.l -= dt;
    if (f.l <= 0) { f.on = false; continue; }
    f.r = f.r0 * (1 + 0.55 * (1 - f.l / f.ml));
  }

  // textes
  for (i = 0; i < _FX_NTEXT; i++) {
    var t = _fxTexts[i];
    if (!t.on) continue;
    t.l -= dt;
    if (t.l <= 0) { t.on = false; continue; }
    t.y += t.vy * dt;
    t.vy *= 1 / (1 + 2.6 * dt);
  }

  // secousse : amortissement exponentiel (demi-vie ~90 ms)
  if (_fxShake > 0) {
    _fxShake *= Math.pow(0.00045, dt);
    _fxShake -= 1.2 * dt;
    if (_fxShake < 0.02) _fxShake = 0;
  }

  // hitstop : décrément garanti même si le cœur ralentit dt
  if (_fxHit > 0) {
    var d = dt * 1000;
    if (d < 4) d = 4;
    _fxHit -= d;
    if (_fxHit < 0) _fxHit = 0;
  }

  // flashs
  if (_fxFlashA > 0) {
    _fxFlashA *= 1 / (1 + 9 * dt);
    _fxFlashA -= 0.7 * dt;
    if (_fxFlashA < 0.004) _fxFlashA = 0;
  }
  if (_fxVigA > 0) {
    _fxVigA *= 1 / (1 + 4.5 * dt);
    _fxVigA -= 0.35 * dt;
    if (_fxVigA < 0.004) _fxVigA = 0;
  }
  if (_fxGlitch > 0) {
    _fxGlitch *= 1 / (1 + 7 * dt);
    _fxGlitch -= 0.6 * dt;
    if (_fxGlitch < 0.01) _fxGlitch = 0;
  }

  // le cœur lit ces valeurs pour décaler la caméra
  if (typeof S !== 'undefined' && S) {
    S.shake = _fxShake;
    S.hitstop = _fxHit;
    if (_fxShake > 0) {
      var tt = S.t || 0;
      var amp = _fxShake * 0.66;
      S.shakeX = (Math.sin(tt * 0.081) + Math.sin(tt * 0.213 + 1.7) * 0.5) * amp;
      S.shakeY = (Math.cos(tt * 0.097 + 0.6) + Math.sin(tt * 0.171 + 2.4) * 0.5) * amp;
    } else {
      S.shakeX = 0; S.shakeY = 0;
    }
  }
}

/* ------------------------------------------------------------ dessin monde */

/* Un seul passage par couche, avec regroupement des états pour limiter
   les changements de contexte. glow = 1 -> composition 'lighter'. */
function _fxDrawParts(ctx, glow) {
  var curF = null, curS = null, curA = -1, curW = -1, open = false;
  var any = false;

  for (var i = 0; i < _FX_NPART; i++) {
    var p = _fxParts[i];
    if (!p.on || p.gl !== glow) continue;
    if (!_fxVis(p.x, p.y, 64)) continue;

    var tl = p.l / p.ml;
    var a = p.fd === 2 ? tl * tl : tl;
    if (tl > 0.88) a = 1;
    if (a <= 0.02) continue;
    var ab = (a * _FX_AQ) | 0;
    if (ab < 1) continue;

    if (!any) {
      ctx.globalCompositeOperation = glow ? 'lighter' : 'source-over';
      ctx.lineCap = 'round';
      any = true;
    }

    var s = p.s0 * (1 - p.sk + p.sk * tl);
    if (s < 0.4) s = 0.4;

    if (p.sh === 0) {
      // point / pixel
      if (open) { ctx.stroke(); open = false; }
      if (p.c !== curF) { ctx.fillStyle = p.c; curF = p.c; }
      if (ab !== curA) { ctx.globalAlpha = ab / _FX_AQ; curA = ab; }
      ctx.fillRect(p.x - s, p.y - s, s + s, s + s);
    } else {
      var x0, y0, x1, y1;
      if (p.sh === 2) {
        // éclat orienté par sa rotation
        var dx = Math.cos(p.rot) * s * 1.9, dy = Math.sin(p.rot) * s * 1.9;
        x0 = p.x - dx; y0 = p.y - dy; x1 = p.x + dx; y1 = p.y + dy;
      } else {
        // traînée orientée par la vitesse
        var sp2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        var len = sp2 * p.st;
        if (len > _FX_STREAK_MAX) len = _FX_STREAK_MAX;
        if (len < s * 0.9) len = s * 0.9;
        var ux, uy;
        if (sp2 > 0.001) { ux = p.vx / sp2; uy = p.vy / sp2; }
        else { ux = Math.cos(p.rot); uy = Math.sin(p.rot); }
        x0 = p.x; y0 = p.y; x1 = p.x - ux * len; y1 = p.y - uy * len;
      }
      var wb = Math.round(s * 2) * 0.5;
      if (wb < 0.5) wb = 0.5;
      if (!open || p.c !== curS || ab !== curA || wb !== curW) {
        if (open) ctx.stroke();
        if (p.c !== curS) { ctx.strokeStyle = p.c; curS = p.c; }
        if (ab !== curA) { ctx.globalAlpha = ab / _FX_AQ; curA = ab; }
        if (wb !== curW) { ctx.lineWidth = wb; curW = wb; }
        ctx.beginPath();
        open = true;
      }
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
  }
  if (open) ctx.stroke();
  if (any) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
}

function _fxDrawFlares(ctx) {
  var any = false;
  for (var i = 0; i < _FX_NFLARE; i++) {
    var f = _fxFlares[i];
    if (!f.on) continue;
    if (!_fxVis(f.x, f.y, f.r + 8)) continue;
    var tl = f.l / f.ml;
    var a = f.a0 * tl * tl;
    if (a <= 0.01) continue;
    if (!any) { ctx.globalCompositeOperation = 'lighter'; any = true; }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(f.x, f.y);
    ctx.scale(f.r, f.r);
    ctx.fillStyle = _fxGlowGrad(ctx, f.c);
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  if (any) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
}

function _fxDrawRings(ctx) {
  var anyG = false, anyN = false;
  var curC = null, curA = -1, curW = -1;
  var pass, i;
  for (pass = 1; pass >= 0; pass--) {
    curC = null; curA = -1; curW = -1;
    for (i = 0; i < _FX_NRING; i++) {
      var r = _fxRings[i];
      if (!r.on || r.gl !== pass) continue;
      if (!_fxVis(r.x, r.y, r.r + r.w + 8)) continue;
      var tl = r.l / r.ml;
      var a = tl * tl * 0.9 + tl * 0.1;
      if (a <= 0.02) continue;
      var w = r.w * (0.15 + 0.85 * tl);
      if (w < 0.4) w = 0.4;
      var ab = (a * _FX_AQ) | 0;
      if (ab < 1) continue;

      if (pass === 1 && !anyG) { ctx.globalCompositeOperation = 'lighter'; anyG = true; }
      if (pass === 0 && !anyN) { ctx.globalCompositeOperation = 'source-over'; anyN = true; }

      if (r.c !== curC) { ctx.strokeStyle = r.c; curC = r.c; }
      if (ab !== curA) { ctx.globalAlpha = ab / _FX_AQ; curA = ab; }
      if (w !== curW) { ctx.lineWidth = w; curW = w; }

      if (r.sq !== 1) {
        ctx.save();
        ctx.translate(r.x, r.y);
        if (r.rot) ctx.rotate(r.rot);
        ctx.scale(1, r.sq);
        ctx.beginPath();
        ctx.arc(0, 0, r.r, 0, 6.2831853);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, 6.2831853);
        ctx.stroke();
      }
    }
  }
  if (anyG || anyN) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
}

function _fxDrawTexts(ctx) {
  var any = false;
  var curFont = null, curC = null, curA = -1;
  for (var i = 0; i < _FX_NTEXT; i++) {
    var t = _fxTexts[i];
    if (!t.on || t.s === '') continue;
    if (!_fxVis(t.x, t.y, 90)) continue;
    var tl = t.l / t.ml;
    var a = tl > 0.6 ? 1 : tl / 0.6;
    if (a <= 0.03) continue;
    var age = t.ml - t.l;
    var pop = age < 0.11 ? (1.42 - 0.42 * (age / 0.11)) : 1;
    var fnt = _fxFont(t.sz * pop);
    var ab = (a * _FX_AQ) | 0;
    if (ab < 1) continue;

    if (!any) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      any = true;
    }
    if (fnt !== curFont) { ctx.font = fnt; curFont = fnt; }
    if (ab !== curA) { ctx.globalAlpha = ab / _FX_AQ; curA = ab; }
    if (t.out) {
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(4,2,14,0.8)';
      ctx.strokeText(t.s, t.x, t.y);
      curC = null;
    }
    if (t.c !== curC) { ctx.fillStyle = t.c; curC = t.c; }
    ctx.fillText(t.s, t.x, t.y);
  }
  if (any) {
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}

function _fxDraw(ctx) {
  _fxDrawFlares(ctx);      // bloom au fond
  _fxDrawParts(ctx, 1);    // particules additives
  _fxDrawRings(ctx);       // ondes de choc
  _fxDrawParts(ctx, 0);    // débris opaques par-dessus
  _fxDrawTexts(ctx);
}

/* ------------------------------------------------------------ dessin écran */

function _fxVigGrad(ctx, col, w, h) {
  if (_fxVig.g && _fxVig.c === ctx && _fxVig.col === col && _fxVig.w === w && _fxVig.h === h) {
    return _fxVig.g;
  }
  var base = _fxRgb(col);
  var cx = w * 0.5, cy = h * 0.5;
  var r1 = Math.sqrt(cx * cx + cy * cy);
  var g = ctx.createRadialGradient(cx, cy, r1 * 0.28, cx, cy, r1);
  g.addColorStop(0, 'rgba(' + base + ',0)');
  g.addColorStop(0.55, 'rgba(' + base + ',0.35)');
  g.addColorStop(1, 'rgba(' + base + ',1)');
  _fxVig.g = g; _fxVig.c = ctx; _fxVig.col = col; _fxVig.w = w; _fxVig.h = h;
  return g;
}

function _fxDrawScreen(ctx, w, h) {
  // vignette de danger / dégâts
  if (_fxVigA > 0.004) {
    ctx.globalAlpha = _fxVigA;
    ctx.fillStyle = _fxVigGrad(ctx, _fxVigC, w, h);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // glitch : décalage chromatique en bandes
  if (_fxGlitch > 0.01) {
    var tt = (typeof S !== 'undefined' && S) ? (S.t || 0) : 0;
    var nb = 3 + ((_fxGlitch * 4) | 0);
    if (nb > 6) nb = 6;
    var seed = (tt * 0.06) | 0;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.13 * _fxGlitch;
    for (var i = 0; i < nb; i++) {
      var y = _fxHash(seed + i * 7.3) * h;
      var bh = 2 + _fxHash(seed + i * 3.1 + 41) * h * 0.055;
      var off = (_fxHash(seed + i * 5.7 + 91) - 0.5) * 52 * _fxGlitch;
      ctx.fillStyle = '#ff2b6d';
      ctx.fillRect(off, y, w, bh);
      ctx.fillStyle = '#22e0ff';
      ctx.fillRect(-off, y, w, bh);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // flash plein écran (additif : garde le fond lisible)
  if (_fxFlashA > 0.004) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = _fxFlashA;
    ctx.fillStyle = _fxFlashC;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* ------------------------------------------------------------------- reset */

function _fxReset() {
  var i;
  for (i = 0; i < _FX_NPART; i++) _fxParts[i].on = false;
  for (i = 0; i < _FX_NRING; i++) _fxRings[i].on = false;
  for (i = 0; i < _FX_NFLARE; i++) _fxFlares[i].on = false;
  for (i = 0; i < _FX_NTEXT; i++) { _fxTexts[i].on = false; _fxTexts[i].s = ''; }
  _fxPi = _fxRi = _fxFi = _fxTi = 0;
  _fxShake = 0; _fxHit = 0;
  _fxFlashA = 0; _fxVigA = 0; _fxGlitch = 0;
  if (typeof S !== 'undefined' && S) {
    S.shake = 0; S.hitstop = 0; S.shakeX = 0; S.shakeY = 0;
  }
}

/* -------------------------------------------------------------- API module */

S2030.fx = {
  burst: _fxBurst,
  ring: _fxRing,
  flare: _fxFlare,
  trail: _fxTrail,
  shake: _fxShakeAdd,
  hitstop: _fxHitstop,
  text: _fxText,
  flash: _fxFlash,

  update: _fxUpdate,
  draw: _fxDraw,
  drawScreen: _fxDrawScreen,
  reset: _fxReset,

  // extras lus par le cœur
  shakeAmount: function () { return _fxShake; },
  hitstopLeft: function () { return _fxHit; },
  shakeX: function () { return (typeof S !== 'undefined' && S) ? (S.shakeX || 0) : 0; },
  shakeY: function () { return (typeof S !== 'undefined' && S) ? (S.shakeY || 0) : 0; },

  // extras utiles aux autres modules
  glitch: _fxGlitchAdd,
  setFont: function (fam) {
    if (!fam || fam === _fxFontFam) return;
    _fxFontFam = fam;
    for (var i = 0; i < _fxFonts.length; i++) _fxFonts[i] = undefined;
  },

  // combos prêts à l'emploi (aucune allocation)
  hit: function (x, y, color, power) {
    _fxBurst(x, y, color || '#fff2c0', 5, power || 190, { life: 0.2, size: 1.6, spread: 1.0, ang: rndR(-3.14159, 3.14159) });
    _fxFlare(x, y, color || '#fff2c0', 22, { life: 0.14, a: 0.7 });
  },
  kill: function (x, y, color, big) {
    var n = big ? 34 : 16;
    _fxBurst(x, y, color || '#ff5ad6', n, big ? 420 : 260, { size: big ? 3.2 : 2.2, life: big ? 0.5 : 0.34, drag: 2.0 });
    _fxBurst(x, y, '#ffffff', big ? 12 : 6, big ? 300 : 190, { size: 1.6, life: 0.2 });
    _fxRing(x, y, color || '#ff5ad6', big ? 14 : 8, big ? 520 : 330, { w: big ? 6 : 3.5, life: big ? 0.55 : 0.38 });
    _fxFlare(x, y, color || '#ff5ad6', big ? 110 : 54, { life: big ? 0.35 : 0.22, a: big ? 1 : 0.8 });
    _fxShakeAdd(big ? 9 : 2.4);
    _fxHitstop(big ? 55 : 12);
  },
  pickup: function (x, y, color) {
    _fxBurst(x, y, color || '#7df9ff', 8, 150, { size: 1.6, life: 0.28, shape: 'dot', drag: 3.2 });
    _fxRing(x, y, color || '#7df9ff', 4, 220, { w: 2.2, life: 0.3 });
    _fxFlare(x, y, color || '#7df9ff', 34, { life: 0.2, a: 0.65 });
  }
};
