/* ===== 70-commun.js — N.outils : le matériel commun des modules de jeu (lot 0b) =====

   Les neuf modules de jeu répartis depuis 70-game.js (joueuse, butin, ennemis, arsenal, directeur,
   score, hud, écrans, jeu) partagent peu de choses, mais elles étaient toutes dans la même fermeture :
   les outils de calcul, l'accès aux sprites (N.spr, sinon un repli procédural dans la palette), le texte
   en police 5×7 (N.spr.text, sinon un repli), la géométrie de la vue et des murs, et une réserve d'éclats
   pour les effets quand 50-fx.js ou 79-scene.js manquent. Ce module les publie une fois.

   Il n'appartient pas au contrat 1.0 : c'est un module d'appui du lot 0b, lisible par tous, que le
   gardien pourra absorber. Il ne tire aucun hasard de jeu (les éclats cosmétiques tirent dans le flux
   'fx'), ne lit aucune horloge et n'écrit aucune couleur : tout passe par N.pal.i.

   GÉOMÉTRIE. geom() recalcule, à chaque début d'image de 79-jeu.js :
     N.outils.A     les murs courants { x0, y0, x1, y1 } en coordonnées MONDE : ceux de N.world quand
                    12-cam.js existe, sinon l'arène de repli (l'écran moins l'interface et la zone sûre)
     N.outils.VUE   le rectangle de la vue en coordonnées monde : N.cam, sinon (0, 0, W, H)
     N.outils.W, H, portrait, hudH   le tampon et l'interface
   Les modules lisent ces objets (jamais de copie) ; seul 79-jeu.js appelle geom().
*/
N.outils = (function () {
  'use strict';
  function I(n) { return N.pal.i(n); }
  var NUIT = I('nuit'), ARDOISE = I('ardoise'), VIOLET = I('violet'), INDIGO = I('indigo'),
    MAGENTA = I('magenta'), ROSE = I('rosePale'), CYAN = I('cyan'), CYANP = I('cyanPale'), AMBRE = I('ambre'),
    JAUNE = I('jaune'), BRASIER = I('brasier'), OS = I('os'), ACIER = I('acier'), SANG = I('sang'),
    NP = I('nuitProfonde');
  var TAU = Math.PI * 2;

  /* ============================ outils ============================ */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrapA(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function turnTo(a, want, m) { var d = wrapA(want - a); return wrapA(a + (d > m ? m : d < -m ? -m : d)); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function pad(n, k) { var s = '' + Math.max(0, Math.floor(n)); while (s.length < k) s = '0' + s; return s; }
  function dir16(a) { var k = Math.round(a / (Math.PI / 8)); return ((k % 16) + 16) % 16; }
  function segDist2(px, py, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy, u = l > 0 ? ((px - x0) * dx + (py - y0) * dy) / l : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return d2(px, py, x0 + dx * u, y0 + dy * u);
  }
  function inside(e) { return e.x >= e.r && e.x <= W - e.r && e.y >= e.r && e.y <= H - e.r; }
  function store(k, v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch (e) { /* stockage refusé : on joue quand même */ } }
  function load(k) { try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; } catch (e) { return null; } }
  var touchDev = null;
  function hasTouch() {
    if (touchDev === null) {
      try { touchDev = !!((typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || (typeof window !== 'undefined' && 'ontouchstart' in window)); }
      catch (e) { touchDev = false; }
    }
    return touchDev;
  }
  function busy() { return !!(N.intro && N.intro.busy && N.intro.busy()); }
  function current() { return (N.intro && N.intro.current) ? N.intro.current() : null; }

  /* les erreurs des modules voisins sont signalées une fois en console, sans casser la partie */
  var errSeen = {};
  function safe(where, fn) {
    try { return fn(); } catch (e) {
      var k = where + '|' + ((e && e.message) || e);
      if (!errSeen[k]) { errSeen[k] = 1; try { console.error('[game→' + where + ']', e); } catch (x) { /* console absente */ } }
    }
  }

  /* T : l'horloge d'animation (ak) et le temps de jeu local (t), tenus par 79-jeu.js */
  var T = { t: 0, ak: 0 };
  function blitDither(s, x, y, c, k) {
    if (!s) return;
    var cx = s.cx !== undefined ? s.cx : (s.w - 1) >> 1, cy = s.cy !== undefined ? s.cy : (s.h - 1) >> 1;
    var x0 = Math.round(x) - cx, y0 = Math.round(y) - cy, D = N.pal.dither;
    for (var j = 0; j < s.h; j++) for (var i = 0; i < s.w; i++) if (s.data[j * s.w + i] && D(x0 + i, y0 + j, k)) N.gfx.px(x0 + i, y0 + j, c);
  }
  /* ============================ sprites : N.spr, sinon un repli procédural ============================
     Les vrais viennent de 40-sprites.js (centre cx, cy ; ennemis déjà bordés de nuit profonde ; têtes,
     flèches et tirs orientés en seize directions). Le repli est minimal, pointé vers la droite. */
  function sp(name, f) {
    if (N.spr && N.spr.make) {
      var s = safe('spr.make', function () { return N.spr.make(name, f | 0); });
      if (s && s.data && s.w > 0) return s;
    }
    return fb(name);
  }
  function put(s, x, y, opt) {
    if (!s) return;
    var cx = s.cx !== undefined ? s.cx : (s.w - 1) >> 1, cy = s.cy !== undefined ? s.cy : (s.h - 1) >> 1;
    N.gfx.blit(s, Math.round(x) - cx, Math.round(y) - cy, opt);
  }
  var OPT = { ci: 0 };
  function putInk(s, x, y, c) { OPT.ci = c; put(s, x, y, OPT); }
  /* le flash de frappe blanchit l'objet mais garde son contour de nuit profonde (DIRECTION.md) */
  var INNER = typeof Map !== 'undefined' ? new Map() : null;
  function inner(s) {
    if (!INNER) return s;
    var o = INNER.get(s);
    if (!o) {
      o = { w: s.w, h: s.h, data: new Uint8Array(s.data.length), cx: s.cx, cy: s.cy };
      for (var i = 0; i < s.data.length; i++) o.data[i] = s.data[i] === NP ? 0 : s.data[i];
      INNER.set(s, o);
      if (INNER.size > 600) INNER.clear();
    }
    return o;
  }

  function mk(w, h) { return { w: w, h: h, data: new Uint8Array(w * h) }; }
  var MAP = null;
  function rows(R) {
    if (!MAP) MAP = { m: MAGENTA, s: SANG, r: ROSE, o: OS, c: CYAN, p: CYANP, a: AMBRE, j: JAUNE, n: NP, d: ARDOISE, k: ACIER };
    var h = R.length, w = R[0].length, s = mk(w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var c = MAP[R[y].charAt(x)]; if (c) s.data[y * w + x] = c; }
    return s;
  }
  var ART = {
    tete: ['..cccc....', '.ccccccc..', 'cccccppcc.', 'cccccccccc', 'cccccppcc.', '.ccccccc..', '..cccc....'],
    tir: ['ccpp'],
    chevron: ['p..', '.p.', '..p', '.p.', 'p..'],
    fleche: ['ss........', '.smm......', '..smmmm...', '..mmrrmmm.', '.smmrrrmmm', '..mmrrmmm.', '..smmmm...', '.smm......', 'ss........'],
    tourelle: ['.sssssssss.', 'smmmmmmmmms', 'smssmmmssms', 'smsmmmmmsms', 'smmmrrrmmms', 'smmmrormmms',
      'smmmrrrmmms', 'smsmmmmmsms', 'smssmmmssms', 'smmmmmmmmms', '.sssssssss.'],
    sentinelle: ['.....m.....', '....mmm....', '...mmsmm...', '..mms.smm..', '.mms.r.smm.', 'mms.ror.smm',
      '.mms.r.smm.', '..mms.smm..', '...mmsmm...', '....mmm....', '.....m.....'],
    mine: ['....m....', '.m.sms.m.', '..smmms..', '.smmrmms.', 'mmmrormmm', '.smmrmms.', '..smmms..', '.m.sms.m.', '....m....'],
    butin: ['..a..', '.aja.', 'ajjja', '.aja.', '..a..'],
    tirEnnemi: ['.nnn.', 'nmmmn', 'nmrmn', 'nmmmn', '.nnn.'],
    son: ['...o.....', '..oo..o..', 'oooo...o.', 'oooo.o.o.', 'oooo...o.', '..oo..o..', '...o.....'],
    muet: ['...o.....', '..oo.....', 'oooo.o.o.', 'oooo..o..', 'oooo.o.o.', '..oo.....', '...o.....']
  };
  function mkColosse() {
    var w = 41, h = 37, s = mk(w, h), d = s.data, cx = 20, cy = 19, x, y, k;
    function dot(px, py, c) { px |= 0; py |= 0; if (px >= 0 && py >= 0 && px < w && py < h) d[py * w + px] = c; }
    function disk(x0, y0, r, c) { for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + r * 0.6) dot(x0 + xx, y0 + yy, c); }
    function box(x0, y0, bw, bh, c) { for (var yy = 0; yy < bh; yy++) for (var xx = 0; xx < bw; xx++) dot(x0 + xx, y0 + yy, c); }
    box(1, 8, 7, 22, SANG); box(33, 8, 7, 22, SANG); box(2, 9, 5, 20, MAGENTA); box(34, 9, 5, 20, MAGENTA);
    disk(cx, cy, 16, SANG); disk(cx, cy, 14, MAGENTA);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var r2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (r2 > 90 && r2 < 170 && ((x + 2 * y) % 5 === 0)) dot(x, y, SANG); }
    for (k = 0; k < 7; k++) dot(cx - 9 + k * 3, cy - 15, ROSE);
    disk(cx, cy, 8, SANG); disk(cx, cy, 7, NP); disk(cx, cy, 5, ROSE); disk(cx, cy, 2, OS);
    return s;
  }
  function outline(s, c) {
    var w = s.w + 2, h = s.h + 2, o = mk(w, h), od = o.data, sd = s.data, x, y;
    for (y = 0; y < s.h; y++) for (x = 0; x < s.w; x++) if (sd[y * s.w + x]) od[(y + 1) * w + x + 1] = sd[y * s.w + x];
    function opq(px, py) { px -= 1; py -= 1; return px >= 0 && py >= 0 && px < s.w && py < s.h && sd[py * s.w + px] !== 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (!od[y * w + x] && (opq(x - 1, y) || opq(x + 1, y) || opq(x, y - 1) || opq(x, y + 1))) od[y * w + x] = c;
    return o;
  }
  function rotate(s, a) {
    var sz = Math.ceil(Math.sqrt(s.w * s.w + s.h * s.h)) | 1, o = mk(sz, sz);
    var c = Math.cos(a), si = Math.sin(a), cx = (s.w - 1) / 2, cy = (s.h - 1) / 2, oc = (sz - 1) / 2;
    for (var y = 0; y < sz; y++) for (var x = 0; x < sz; x++) {
      var dx = x - oc, dy = y - oc, sx = Math.round(cx + dx * c + dy * si), sy = Math.round(cy - dx * si + dy * c);
      if (sx >= 0 && sy >= 0 && sx < s.w && sy < s.h) { var v = s.data[sy * s.w + sx]; if (v) o.data[y * sz + x] = v; }
    }
    return o;
  }
  var FB = {};
  function fb(name) {
    if (FB[name] !== undefined) return FB[name];
    var p = String(name).split(':'), base = p[0], k = parseInt(p[1], 10), s = null;
    if (base === 'tete' || base === 'fleche' || base === 'tir' || base === 'chevron') {
      s = rotate(rows(ART[base]), (isNaN(k) ? (base === 'fleche' ? 12 : 0) : k) * Math.PI / 8);
      if (base === 'fleche') s = outline(s, NP);
    } else if (base === 'corps' || base === 'queue') {
      var dd = base === 'queue' ? 3 : (k === 3 || k === 5 || k === 7) ? k : 9, r = (dd - 1) / 2;
      s = mk(dd, dd);
      for (var y = 0; y < dd; y++) for (var x = 0; x < dd; x++) if ((x - r) * (x - r) + (y - r) * (y - r) <= r * r + 0.6) s.data[y * dd + x] = (x === r - 1 && y === r - 1) ? CYANP : CYAN;
    } else if (base === 'colosse') s = outline(mkColosse(), NP);
    else if (ART[base]) { s = rows(ART[base]); if (base === 'tourelle' || base === 'sentinelle' || base === 'mine') s = outline(s, NP); }
    else s = rows(['.k.', 'kkk', '.k.']);
    if (s.cx === undefined) { s.cx = (s.w - 1) >> 1; s.cy = (s.h - 1) >> 1; }
    FB[name] = s;
    return s;
  }

  /* ============================ texte : police 5x7 de N.spr, sinon un repli ============================
     N.spr.text rend la chaîne entière, accents compris ; ses capitales commencent à la rangée s.top.
     Le repli : sept rangées de cinq bits par glyphe, en base 32, capitales sans accents. */
  var TXO = { ci: 0, contour: true, ombre: false, echelle: 1 };
  var MSO = { ombre: false, echelle: 1 };
  function text(str, x, y, c, o, sc) {
    sc = sc || 1;
    if (N.spr && N.spr.text) {
      TXO.ci = c; TXO.contour = !!o; TXO.echelle = sc;
      var s = safe('spr.text', function () { return N.spr.text(str, TXO); });
      if (s && s.data) {
        var m0 = o ? sc : 0, top = s.top !== undefined ? s.top : 3 * sc + m0;
        N.gfx.blit(s, Math.round(x) - m0, Math.round(y) - top);
        return s.w - (o ? 2 * sc : 0);
      }
    }
    return textFb(str, x, y, c, o, sc);
  }
  function textW(str, sc) {
    sc = sc || 1;
    if (N.spr && N.spr.measure) { MSO.echelle = sc; var m = safe('spr.measure', function () { return N.spr.measure(str, MSO); }); if (m) return m.w; }
    return str.length * 6 * sc - sc;
  }
  function textC(str, cx, y, c, o, sc) { return text(str, cx - textW(str, sc) / 2, y, c, o, sc); }
  var FONT = {
    A: 'ehhvhhh', B: 'uhhuhhu', C: 'ehggghe', D: 'sihhhis', E: 'vgguggv', F: 'vgguggg', G: 'ehgnhhf',
    H: 'hhhvhhh', I: 'e44444e', J: '72222ic', K: 'hikokih', L: 'ggggggv', M: 'hrllhhh', N: 'hhpljhh',
    O: 'ehhhhhe', P: 'uhhuggg', Q: 'ehhhlid', R: 'uhhukih', S: 'fgge11u', T: 'v444444', U: 'hhhhhhe',
    V: 'hhhhha4', W: 'hhhllla', X: 'hha4ahh', Y: 'hhha444', Z: 'v1248gv',
    0: 'ehjlphe', 1: '4c4444e', 2: 'eh1248v', 3: 'v2421he', 4: '26aiv22', 5: 'vgu11he', 6: '68guhhe',
    7: 'v124888', 8: 'ehhehhe', 9: 'ehhf12c',
    '.': '00000cc', ':': '0cc0cc0', '/': '01248g0', '-': '000v000', '+': '044v440', '!': '4444404',
    '?': 'eh12404', '×': '0ha4ah0', '♥': 'avve400', '✓': '013ms80', '✗': '0hrerh0'
  };
  var DEACC = { 'É': 'E', 'È': 'E', 'Ê': 'E', 'À': 'A', 'Â': 'A', 'Ç': 'C', 'Î': 'I', 'Ô': 'O', 'Û': 'U', 'Ù': 'U' };
  var GLY = {};
  function glyph(ch, sc) {
    var key = ch + sc, g = GLY[key];
    if (g !== undefined) return g;
    var f = FONT[DEACC[ch] || ch], s = null;
    if (f) {
      s = mk(5 * sc, 7 * sc);
      for (var y = 0; y < 7 * sc; y++) { var v = parseInt(f.charAt((y / sc) | 0), 32); for (var x = 0; x < 5 * sc; x++) if (v & (16 >> ((x / sc) | 0))) s.data[y * 5 * sc + x] = OS; }
    }
    GLY[key] = s;
    return s;
  }
  var OPTNP = { ci: NP };
  function textFb(str, x, y, c, o, sc) {
    x = Math.round(x); y = Math.round(y);
    for (var i = 0; i < str.length; i++) {
      var g = glyph(str.charAt(i), sc);
      if (g) {
        if (o) { N.gfx.blit(g, x - 1, y, OPTNP); N.gfx.blit(g, x + 1, y, OPTNP); N.gfx.blit(g, x, y - 1, OPTNP); N.gfx.blit(g, x, y + 1, OPTNP); }
        OPT.ci = c; N.gfx.blit(g, x, y, OPT);
      }
      x += 6 * sc;
    }
    return str.length * 6 * sc - sc;
  }

  /* ============================ géométrie : murs de repli, vue, interface ============================ */
  var A = { x0: 0, y0: 0, x1: 0, y1: 0 };          // murs courants, monde
  var VUE = { x: 0, y: 0, w: 0, h: 0 };            // vue, monde
  var GEO = { A: A, VUE: VUE, W: 0, H: 0, portrait: false, hudH: 12, safe: { l: 0, t: 0, r: 0, b: 0 }, monde: false, cam: false };
  function geom() {
    var S = N.S, sf = (S && S.view && S.view.safe) || GEO.safe;
    GEO.safe = sf;
    var W = GEO.W = N.gfx.W | 0, H = GEO.H = N.gfx.H | 0;
    GEO.portrait = H > W; GEO.hudH = GEO.portrait ? 21 : 12;
    var w = N.world;
    if (w && typeof w.x0 === 'number' && typeof w.x1 === 'number') {
      A.x0 = w.x0; A.y0 = w.y0; A.x1 = w.x1; A.y1 = w.y1; GEO.monde = true;
    } else {
      /* repli : l'arène est l'écran. Le quart bas du portrait est au pouce (J-09). */
      A.x0 = sf.l | 0; A.x1 = W - (sf.r | 0);
      A.y0 = (sf.t | 0) + GEO.hudH; A.y1 = GEO.portrait ? Math.floor(H * 0.75) : H - (sf.b | 0);
      if (A.x1 - A.x0 < 54) { A.x0 = 7; A.x1 = W - 7; }
      if (A.y1 - A.y0 < 54) { A.y0 = Math.min(A.y0, H / 2 - 27); A.y1 = Math.max(A.y1, H / 2 + 27); }
      GEO.monde = false;
    }
    var c = N.cam;
    if (c && typeof c.x === 'number' && typeof c.w === 'number' && c.w > 0) { VUE.x = c.x; VUE.y = c.y; VUE.w = c.w; VUE.h = c.h; GEO.cam = true; }
    else { VUE.x = 0; VUE.y = 0; VUE.w = W; VUE.h = H; GEO.cam = false; }
    return GEO;
  }
  /* l'origine de dessin : 10-gfx.js la publie au lot 1 ; avant, tout est déjà en coordonnées écran */
  function origine(x, y) { if (N.gfx.origin) N.gfx.origin(x, y); }
  function origineMonde() { origine(GEO.cam ? VUE.x : 0, GEO.cam ? VUE.y : 0); }
  /* la vue contient-elle (x, y) à la marge m ? */
  function visible(x, y, m) { m = m || 0; return x >= VUE.x - m && x <= VUE.x + VUE.w + m && y >= VUE.y - m && y <= VUE.y + VUE.h + m; }
  /* 90-boot.js au lot 1 appelle N.hud.draw et N.ui.draw lui-même : on le sait quand l'horloge avance */
  function bootNouveau() { return !!(N.horloge && N.horloge.pas && N.horloge.pas() > 0); }
  /* le pas de la joueuse : celui de l'horloge quand 90-boot.js la fait avancer, sinon dt */
  function dtJ(dt) { return bootNouveau() && N.horloge.dtJoueuse ? N.horloge.dtJoueuse() : dt; }

  /* ============================ hasard : des flux nommés (N.rng), avec un repli ============================ */
  function flux(nom) { return (N.rng && N.rng(nom)) || null; }
  var REPLI_ETAT = 2975;
  function rf(nom) { var f = flux(nom); if (f) return f.f(); REPLI_ETAT = (REPLI_ETAT * 1664525 + 1013904223) % 4294967296; return REPLI_ETAT / 4294967296; }
  function rr(nom, a, b) { return a + (b - a) * rf(nom); }
  function ri(nom, a, b) { return a + ((rf(nom) * (b - a + 1)) | 0); }

  /* ============================ éclats et anneaux : le repli de 50-fx.js et de 79-scene.js ============================
     Quand 79-scene.js n'est pas là, 79-jeu.js fait pousser ces éclats par ses consommateurs de repli ; ils sont
     dessinés sous les explosions de N.fx. Cosmétiques : flux 'fx'. */
  var DEB = [], FXL = [], POPS = [];
  function debris(x, y, c, n) {
    for (var i = 0; i < n && DEB.length < 300; i++) {
      var a = rr('fx', 0, TAU), v = rr('fx', 10, 60);
      DEB.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: c, t: 0, life: rr('fx', 0.35, 0.7) });
    }
  }
  function spark(x, y, c, n) {
    for (var i = 0; i < n && DEB.length < 300; i++) {
      var a = rr('fx', 0, TAU), v = rr('fx', 20, 70);
      DEB.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: c, t: 0, life: rr('fx', 0.12, 0.3) });
    }
  }
  function ringFx(x, y, r, c, d) { FXL.push({ x: x, y: y, t: 0, d: d || 0.4, r: r, c: c, ring: true }); }
  function boom(x, y, f, c) {
    if (c === undefined) c = BRASIER;
    if (N.fx && N.fx.boom) { safe('fx.boom', function () { N.fx.boom(x, y, f, c); }); return; }
    FXL.push({ x: x, y: y, t: 0, d: 0.35 + f * 0.6, r: 6 + f * 60, c: BRASIER });
    shake(f > 0.6 ? 10 : f * 4);
  }
  function hitstop(n) { if (N.fx && N.fx.hitstop) safe('fx.hitstop', function () { N.fx.hitstop(n); }); }
  function shake(a) {
    var S = N.S;
    if (N.fx && N.fx.shake) { safe('fx.shake', function () { N.fx.shake(a); }); return; }
    if (S && a > S.shake) S.shake = a;
  }
  function pop(x, y, s, c) { if (POPS.length > 24) POPS.shift(); POPS.push({ x: x, y: y, s: s, c: c, t: 0 }); }
  function sfx(name, o) {
    var S = N.S;
    if ((S && S.muted) || !N.music || !N.music.sfx) return;
    safe('music.sfx', function () { N.music.sfx(name, o || {}); });
  }
  function fxUpdate(dt) {
    var i;
    for (i = DEB.length - 1; i >= 0; i--) {
      var d = DEB[i]; d.t += dt;
      if (d.t >= d.life) { DEB.splice(i, 1); continue; }
      var f = Math.pow(0.004, dt); d.vx *= f; d.vy *= f; d.x += d.vx * dt; d.y += d.vy * dt;
    }
    for (i = POPS.length - 1; i >= 0; i--) { POPS[i].t += dt; POPS[i].y -= dt * 14; if (POPS[i].t > 0.8) POPS.splice(i, 1); }
    for (i = FXL.length - 1; i >= 0; i--) { FXL[i].t += dt; if (FXL[i].t >= FXL[i].d) FXL.splice(i, 1); }
  }
  function fxDraw() {
    var i, g = N.gfx;
    for (i = 0; i < FXL.length; i++) {
      var f = FXL[i], k = f.t / f.d;
      if (f.ring) { g.ring(f.x, f.y, f.r * (0.3 + 0.7 * k), f.c, 1 - k); continue; }
      g.ditherCirc(f.x, f.y, f.r * 0.35 * (1 - k), OS, 1 - k * 1.5);
      g.disc(f.x, f.y, f.r * k * 0.6, f.r * k, f.c, 1 - k);
      g.ring(f.x, f.y, f.r * k + 2, AMBRE, 1 - k);
    }
    for (i = 0; i < DEB.length; i++) {
      var d = DEB[i], kk = d.t / d.life;
      if (kk > 0.6 && !N.pal.dither(Math.round(d.x), Math.round(d.y), (1 - kk) / 0.4)) continue;
      g.px(d.x, d.y, d.c);
    }
  }
  function fxReset() { DEB.length = 0; FXL.length = 0; POPS.length = 0; }

  return {
    NUIT: NUIT, ARDOISE: ARDOISE, VIOLET: VIOLET, INDIGO: INDIGO, MAGENTA: MAGENTA, ROSE: ROSE, CYAN: CYAN, CYANP: CYANP,
    AMBRE: AMBRE, JAUNE: JAUNE, BRASIER: BRASIER, OS: OS, ACIER: ACIER, SANG: SANG, NP: NP, TAU: TAU,
    clamp: clamp, wrapA: wrapA, turnTo: turnTo, d2: d2, pad: pad, dir16: dir16, segDist2: segDist2,
    store: store, load: load, hasTouch: hasTouch, busy: busy, current: current, safe: safe,
    sp: sp, put: put, putInk: putInk, inner: inner, mk: mk, text: text, textW: textW, textC: textC, blitDither: blitDither,
    geom: geom, geo: GEO, A: A, VUE: VUE, origine: origine, origineMonde: origineMonde, visible: visible,
    bootNouveau: bootNouveau, dtJ: dtJ,
    rf: rf, rr: rr, ri: ri,
    debris: debris, spark: spark, ringFx: ringFx, boom: boom, hitstop: hitstop, shake: shake, pop: pop, sfx: sfx,
    fxUpdate: fxUpdate, fxDraw: fxDraw, fxReset: fxReset, pops: POPS,
    flash: function (e) { if (N.fx && N.fx.hit) safe('fx.hit', function () { N.fx.hit(e); }); else if (!(e._flashT > T.ak - 0.34)) { e._flash = 0.03; e._flashT = T.ak; } },
    isFlash: function (e) { return (N.fx && N.fx.isHit) ? !!safe('fx.isHit', function () { return N.fx.isHit(e); }) : e._flash > 0; },
    T: T, taps: [], garde: 0.45
  };
})();
