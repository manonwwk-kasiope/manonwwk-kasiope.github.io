/* ===== 70-game.js — N.game : l'état, la boucle, le défi, la montée en tension =====

   SNAKE 2975, deux minutes qui vont du calme au chaos et se comprennent en cinq secondes.

   LA BOUCLE. La joueuse est un serpent de données cyan qui avance toujours. Elle s'oriente au manche
   flottant de 90-boot.js (S.input.x, y, mag) ou au clavier ; le virage part dès l'image suivante à
   5,9 rad/s (un quart de tour en 266 ms, J-06) et un cap demandé reste mémorisé jusqu'à être atteint :
   lever le doigt ne change rien (J-02, G-20). Le tir part seul vers l'avant (J-10) ; au clavier, Espace
   le nourrit. Chaque cellule d'énergie ambre allonge le serpent, et la longueur est la puissance : deux,
   trois puis cinq canons, et un multiplicateur de score. Jouer rapporte, ne rien faire non (J-11).

   L'ARÈNE EST L'ÉCRAN. Pas de caméra : tout ce qui compte se voit, et les explosions de 50-fx.js tombent
   aux coordonnées du tampon sans glisser. La tête reste dans la zone sûre et, en portrait, hors du quart
   bas où repose le pouce (J-09) ; contre un bord elle glisse le long du mur, elle ne meurt jamais d'un
   mur. Le corps ne blesse pas la tête et il absorbe les tirs ennemis.

   LA MONTÉE. Minute un : deux types (flèche, mine) et de la place. Minute deux : les quatre (tourelle et
   sentinelle en plus), deux fois plus d'ennemis vivants, puis le colosse annoncé par
   N.intro.transition('boss') et un télégraphe long. Le nombre d'ennemis visé et la tension croissent par
   tranches de vingt secondes (critère 6 de DIRECTION.md).

   RIEN NE NAÎT DANS LE CHAMP. Les ennemis ordinaires naissent hors du tampon, à plus de 80 px de la
   tête, et entrent ; le colosse et les renforts qu'il appelle naissent dans le champ, mais seulement
   après un télégraphe d'au moins 0,9 s pendant lequel rien ne blesse (G-14). Chaque apparition est
   journalisée (dbg().stats.spawns) pour la preuve.

   PAS DE MORT INJUSTE. Toute attaque est annoncée à l'endroit exact de ses dégâts au moins 0,6 s avant
   (G-13) ; la zone qui tue la tête fait 4 px pour un sprite de 13 (G-15) ; trois vies, deux secondes
   d'invulnérabilité, et un choc repousse ce qui entoure la tête.

   LES INTERLUDES (protocole publié par 60-intro.js) : tant que N.intro.busy() est vrai, le monde est gelé
   et c'est ce module qui fait avancer l'interlude ; drawTop() pose N.intro.draw() par-dessus le monde et
   les explosions dès que N.intro.current() n'est pas nul, puis l'interface du jeu, sauf pendant busy().
   L'écran de fin (score, défi, REJOUER) se dessine donc sur le fond victoire ou défaite de 60-intro.js.

   CE QUE CE FICHIER EMPLOIE SANS EN ÊTRE PROPRIÉTAIRE, avec un repli s'il manque : N.spr (sprites et
   police 5x7), N.fx (explosions, gel, secousse, flash de frappe), N.intro (interludes), N.art (repli de
   l'écran de fin), N.music (sons ; la coupure passe par N.music.mute(v), repli stop()/start(), et ce
   module filtre de plus ses propres sons).
   N.S et N.rnd sont créés par 90-boot.js, concaténé APRÈS ce module : ils sont lus paresseusement.

   Interface : N.game.reset(graine), update(dt), draw(), drawTop(), tension(), et dbg() pour les tests.
   Crochet de test, inerte en jeu : si window.__PILOT est une fonction, update() l'appelle avant de lire les
   entrées (pilote automatique déterministe des bancs de tools/jeu/). Publie aussi S.score, S.lives,
   S.enemies, S.player, S.challenge et S.muted.
*/
N.game = (function () {
  'use strict';

  /* ============================ palette : des index nommés, jamais une couleur ============================ */
  function I(n) { return N.pal.i(n); }
  var NUIT = I('nuit'), ARDOISE = I('ardoise'), VIOLET = I('violet'), INDIGO = I('indigo'),
    MAGENTA = I('magenta'), ROSE = I('rosePale'), CYAN = I('cyan'), CYANP = I('cyanPale'), AMBRE = I('ambre'),
    JAUNE = I('jaune'), BRASIER = I('brasier'), OS = I('os'), ACIER = I('acier'), SANG = I('sang'),
    NP = I('nuitProfonde');
  var G = N.gfx;

  /* ============================ réglages ============================ */
  var DUREE = 120;              // deux minutes, horloge de jeu (pauses et interludes exclus)
  var V = 64;                   // vitesse de la tête, pixels de jeu par seconde
  var VIRAGE = 5.9;             // rad/s : un quart de tour en 266 ms (J-06 : 350 ms au plus)
  var ESP = 5;                  // espacement des segments le long de la trace (perles de 9 px)
  var LEN0 = 6, LENMAX = 64;
  var R_TETE = 2;               // rayon qui tue : 4 px pour une tête de 13 (G-15 : 60 % au plus)
  var R_PRISE = 8, R_AIMANT = 28;   // l'énergie se ramasse plus large que son sprite (G-15)
  var CADENCE = 6.5, V_TIR = 210;
  var CHAINE = 1.6;             // secondes au plus entre deux kills enchaînés
  var DEFI_BUT = 10, DEFI_PRIME = 5000;
  var VIES = 3, INVUL = 2.0;
  var DZ = 22;                  // approche d'un bord : le cap se couche le long du mur
  var BOSS_T = 76, BOSS_TELE = 2.4, BOSS_PV = 120;
  var MORT_D = 0.28;            // dissolution du serpent avant le fond de défaite (J-17 : fin en moins d'1 s)
  var GARDE = 0.45;             // l'écran de fin n'accepte un NOUVEAU toucher qu'après ce délai (J-17)
  var K_SON = 'snake2975.son', K_REC = 'snake2975.record';
  var TAU = Math.PI * 2;

  var TYPES = {
    fleche:     { r: 5,   pv: 1, pts: 100, butin: 1, hs: 2 },
    mine:       { r: 5.5, pv: 2, pts: 150, butin: 1, hs: 2 },
    tourelle:   { r: 6.5, pv: 4, pts: 250, butin: 2, hs: 3 },
    sentinelle: { r: 6.5, pv: 4, pts: 300, butin: 2, hs: 3 },
    colosse:    { r: 20,  pv: BOSS_PV, pts: 10000, butin: 24, hs: 26 }
  };
  var REPOS = { fleche: 'chasse', mine: 'pose', tourelle: 'pose', sentinelle: 'orbite' };

  /* ============================ état ============================ */
  var S = null;
  var W = 0, H = 0, portrait = false, hudH = 12;
  var AL = 0, AR = 0, AT = 0, AB = 0;          // l'arène de la tête
  var SB = { x: 0, y: 0, w: 23, h: 22 };       // cible tactile du bouton son, pixels de jeu
  var seed = 2084, rs = 1;
  var st = 'jeu', t = 0, stT = 0, ak = 0;      // ak : horloge d'animation (se fige pendant un gel)
  var firstGame = true;
  var P = null;
  var E = [], EB = [], PB = [], CELLS = [], POP = [], DEB = [], BEAMS = [], TIMERS = [], FXL = [];
  var boss = null, bossPhase = 'attente', bossT = 0, bossX = 0, bossY = 0;
  var DEFI = null, chain = 0, lastKill = -99;
  var score = 0, kills = 0, record = 0, newRecord = false;
  var spawnCd = 0, freeCd = 0, enemyStart = 5;
  var tuto = null, banner = null;
  var finV = false, finT = 0, finClip = null, purgeList = null, purgeI = 0, purgeNext = 0;
  var stats = null;
  var muted = false, muteTick = 0, muteFlash = 0;
  var hsCd = 0, dmgT = 0, dmgA = 0;
  var QT = [];                                  // touchers et touches en attente, traités dans update

  /* ============================ hasard : N.rnd, sur un état propre au jeu ============================
     Même principe que 30-music.js : on dépose notre état dans S.rngState, on tire, on restaure. Les
     apparitions ne dépendent donc ni des tirages des autres modules ni de la musique : à graine
     imposée, la partie se rejoue à l'identique. */
  function rnd() {
    var s = N.S;
    if (N.rnd && s) { var keep = s.rngState; s.rngState = rs; var r = N.rnd(); rs = s.rngState; s.rngState = keep; return r; }
    rs = (rs * 1664525 + 1013904223) % 4294967296; return rs / 4294967296;
  }
  function rr(a, b) { return a + (b - a) * rnd(); }
  function ri(a, b) { return a + ((rnd() * (b - a + 1)) | 0); }

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

  /* ============================ sons : filtrés par le bouton son ============================ */
  function sfx(name, o) { if (muted || !N.music || !N.music.sfx) return; safe('music.sfx', function () { N.music.sfx(name, o || {}); }); }

  /* ============================ effets : 50-fx.js, ou un repli minimal ============================ */
  function boom(x, y, f, c) {
    if (c === undefined) c = BRASIER;
    if (N.fx && N.fx.boom) { safe('fx.boom', function () { N.fx.boom(x, y, f, c); }); return; }
    FXL.push({ x: x, y: y, t: 0, d: 0.35 + f * 0.6, r: 6 + f * 60, c: BRASIER });
    shake(f > 0.6 ? 10 : f * 4);
  }
  function hitstop(n) { if (N.fx && N.fx.hitstop) safe('fx.hitstop', function () { N.fx.hitstop(n); }); }
  function shake(a) {
    if (N.fx && N.fx.shake) { safe('fx.shake', function () { N.fx.shake(a); }); return; }
    if (S && a > S.shake) S.shake = a;
  }
  /* repli sans 50-fx.js : un flash d'une image au plus tous les 0,34 s par objet (WCAG 2.3.1) */
  function flash(e) { if (N.fx && N.fx.hit) safe('fx.hit', function () { N.fx.hit(e); }); else if (!(e.flashT > ak - 0.34)) { e.flash = 0.03; e.flashT = ak; } }
  function isFlash(e) { return (N.fx && N.fx.isHit) ? !!safe('fx.isHit', function () { return N.fx.isHit(e); }) : e.flash > 0; }
  function ringFx(x, y, r, c, d) { FXL.push({ x: x, y: y, t: 0, d: d || 0.4, r: r, c: c, ring: true }); }

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
    G.blit(s, Math.round(x) - cx, Math.round(y) - cy, opt);
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
        G.blit(s, Math.round(x) - m0, Math.round(y) - top);
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
        if (o) { G.blit(g, x - 1, y, OPTNP); G.blit(g, x + 1, y, OPTNP); G.blit(g, x, y - 1, OPTNP); G.blit(g, x, y + 1, OPTNP); }
        OPT.ci = c; G.blit(g, x, y, OPT);
      }
      x += 6 * sc;
    }
    return str.length * 6 * sc - sc;
  }

  /* ============================ géométrie : l'arène suit le tampon et la zone sûre ============================ */
  function geom() {
    var sf = (S && S.view && S.view.safe) || { l: 0, t: 0, r: 0, b: 0 };
    W = G.W | 0; H = G.H | 0;
    portrait = H > W;
    hudH = portrait ? 21 : 12;
    AL = (sf.l | 0) + 7; AR = W - (sf.r | 0) - 7;
    AT = (sf.t | 0) + hudH + 7;
    AB = (portrait ? Math.floor(H * 0.75) : H - (sf.b | 0)) - 7;          // portrait : le quart bas est au pouce (J-09)
    if (AR - AL < 40) { AL = 7; AR = W - 7; }
    if (AB - AT < 40) { AT = Math.min(AT, H / 2 - 20); AB = Math.max(AB, H / 2 + 20); }
    SB.x = W - (sf.r | 0) - SB.w; SB.y = sf.t | 0;
  }

  /* Une rotation en pleine partie : le monde tourne d'un quart de tour avec l'écran, distances et forme
     du serpent intactes ; un autre redimensionnement l'étire proportionnellement. Rien ne sort du champ,
     et la partie se met en pause (J-12) jusqu'au toucher suivant. */
  var lastW = 0, lastH = 0;
  function sizeUp() {
    var w = G.W | 0, h = G.H | 0;
    geom();
    if (w === lastW && h === lastH) return;
    var ow = lastW, oh = lastH;
    lastW = w; lastH = h;
    if (!ow || !oh || !P) return;
    var rot = 0;
    if (Math.abs(ow - h) <= 2 && Math.abs(oh - w) <= 2 && ow !== oh) rot = ow > oh ? 1 : -1;
    var sx = w / ow, sy = h / oh, i;
    function tx(o, kx, ky) {
      var x = o[kx], y = o[ky];
      if (rot === 1) { o[kx] = oh - y; o[ky] = x; } else if (rot === -1) { o[kx] = y; o[ky] = ow - x; } else { o[kx] = x * sx; o[ky] = y * sy; }
    }
    function tv(o, kx, ky) {
      var x = o[kx], y = o[ky];
      if (rot === 1) { o[kx] = -y; o[ky] = x; } else if (rot === -1) { o[kx] = y; o[ky] = -x; }
    }
    var da = rot === 1 ? Math.PI / 2 : rot === -1 ? -Math.PI / 2 : 0;
    function ta(o, k) { if (typeof o[k] === 'number') o[k] = wrapA(o[k] + da); }
    tx(P, 'x', 'y'); ta(P, 'ang'); ta(P, 'target'); ta(P, 'a0');
    for (i = 0; i < tn; i++) {
      var j = (th - i + TN) % TN, x = TX[j], y = TY[j];
      if (rot === 1) { TX[j] = oh - y; TY[j] = x; } else if (rot === -1) { TX[j] = y; TY[j] = ow - x; } else { TX[j] = x * sx; TY[j] = y * sy; }
    }
    var p = { x: tlx, y: tly }; tx(p, 'x', 'y'); tlx = p.x; tly = p.y;
    [E, EB, PB, CELLS, POP, DEB, FXL].forEach(function (L) {
      for (var k = 0; k < L.length; k++) {
        var o = L[k]; tx(o, 'x', 'y');
        if (o.tx !== undefined) tx(o, 'tx', 'ty');
        if (o.vx !== undefined) tv(o, 'vx', 'vy');
        if (o.kx !== undefined) tv(o, 'kx', 'ky');
        ta(o, 'ang'); ta(o, 'aim'); ta(o, 'orb'); ta(o, 'a');
        if (o.pts) for (var q = 0; q < o.pts.length; q++) tx(o.pts[q], 'x', 'y');
      }
    });
    for (i = 0; i < BEAMS.length; i++) { tx(BEAMS[i], 'x0', 'y0'); tx(BEAMS[i], 'x1', 'y1'); }
    var bp = { x: bossX, y: bossY }; tx(bp, 'x', 'y'); bossX = bp.x; bossY = bp.y;
    P.x = clamp(P.x, AL, AR); P.y = clamp(P.y, AT, AB);
    trailStep(P.x, P.y);
    if (rot && st === 'jeu' && S && t > 0) S.paused = true;
    if (stats) stats.rotations++;
  }

  /* ============================ la trace : un point par pixel parcouru ============================ */
  var TN = 4096, TX = new Float32Array(TN), TY = new Float32Array(TN), th = 0, tn = 0, tlx = 0, tly = 0;
  function tpush(x, y) { th = (th + 1) % TN; TX[th] = x; TY[th] = y; if (tn < TN) tn++; tlx = x; tly = y; }
  function trailReset(x, y, a, len) {
    th = 0; tn = 0;
    var need = (len + 3) * ESP + 2, c = Math.cos(a), s = Math.sin(a);
    for (var i = need; i >= 0; i--) tpush(x - c * i, y - s * i);
  }
  function trailStep(x, y) {
    var dx = x - tlx, dy = y - tly, d = Math.sqrt(dx * dx + dy * dy), g = 0;
    while (d >= 1 && g++ < 400) { tpush(tlx + dx / d, tly + dy / d); dx = x - tlx; dy = y - tly; d = Math.sqrt(dx * dx + dy * dy); }
  }
  var SPX = 0, SPY = 0;
  function segAt(k) { var b = Math.round(k * ESP); if (b >= tn) b = tn - 1; var j = (th - b + TN) % TN; SPX = TX[j]; SPY = TY[j]; }
  function segR(k) { var q = P.len - k; return q < 1 ? 1.5 : q < 3 ? 2.5 : 4.5; }

  /* ============================ remise à zéro ============================ */
  function reset(graine) {
    S = N.S;
    if (!S) return;
    seed = (graine === undefined || graine === null) ? (S.seed | 0) : (graine | 0);
    rs = ((seed >>> 0) ^ 2654435769) >>> 0 || 1;
    listen();
    lastW = 0; lastH = 0; sizeUp(); lastW = W; lastH = H;
    if (record === 0) record = +(load(K_REC) || 0) || 0;
    st = 'jeu'; t = 0; stT = 0; ak = 0;
    var a0 = portrait ? -Math.PI / 2 : 0;
    P = {
      x: portrait ? (AL + AR) / 2 : AL + (AR - AL) * 0.38, y: portrait ? AT + (AB - AT) * 0.62 : (AT + AB) / 2,
      ang: a0, target: a0, a0: a0, len: LEN0, lives: VIES, invul: 0, fireCd: 0.5, volley: 0, surcharge: false,
      pulse: -1, gone: 0, hits: 0
    };
    trailReset(P.x, P.y, P.ang, LENMAX);
    E.length = 0; EB.length = 0; PB.length = 0; CELLS.length = 0; POP.length = 0; DEB.length = 0;
    BEAMS.length = 0; TIMERS.length = 0; FXL.length = 0; QT.length = 0;
    boss = null; bossPhase = 'attente'; bossT = 0;
    DEFI = { nom: 'DIX KILLS EN CHAÎNE', but: DEFI_BUT, prog: 0, meilleur: 0, etat: 'actif', t: -1 };
    chain = 0; lastKill = -99; score = 0; kills = 0; newRecord = false;
    spawnCd = 0; freeCd = 2; hsCd = 0; dmgT = 0; banner = null;
    enemyStart = firstGame ? 12 : 2.5;
    tuto = { on: firstGame, done: !firstGame, doneT: -1, fade: firstGame ? 1 : 0 };
    finV = false; finT = 0; finClip = null; purgeList = null; purgeI = 0;
    stats = {
      seed: seed, W: W, H: H, slices: [], spawns: [], inView: 0, kills: 0, killsBy: { fleche: 0, mine: 0, tourelle: 0, sentinelle: 0, colosse: 0 },
      hits: 0, firstEnemyT: -1, bossAnnonceT: -1, bossT: -1, bossDeathT: -1, deathT: -1, endT: -1, victoire: null,
      rotations: 0, defiT: -1, maxAlive: 0, minDistSpawn: 1e9, minDistTele: 1e9, turnT: -1, hitLog: []
    };
    for (var k = 0; k < 6; k++) stats.slices.push({ alive: 0, tension: 0, n: 0, kills: 0 });
    /* l'énergie de départ : une ligne devant la tête (on comprend où aller), quelques cellules ailleurs */
    for (k = 1; k <= 6; k++) addCell(P.x + Math.cos(P.ang) * (16 + k * 13), P.y + Math.sin(P.ang) * (16 + k * 13), 0, 0, true, 0);
    for (k = 0; k < 4; k++) freeCell(0);
    if (N.fx && N.fx.reset) safe('fx.reset', function () { N.fx.reset(); });
    applyMute();                                  // la coupure mémorisée vaut dès le démarrage
    publish();
    if (!N.intro && S.phase === 'intro') S.phase = 'play';                 // sans 60-intro.js, le jeu démarre
  }

  function publish() {
    if (!S || !P) return;
    S.score = score; S.lives = P.lives; S.enemies = E; S.player = P; S.challenge = DEFI;
    S.muted = muted;                            // la coupure du son, lisible par les autres modules qui jouent des sons
  }

  /* ============================ énergie ============================ */
  function addCell(x, y, vx, vy, free, tele) {
    if (CELLS.length > 140) return;
    CELLS.push({ x: x, y: y, vx: vx, vy: vy, t: 0, life: free ? 14 : 9, free: !!free, tele: tele || 0, f: CELLS.length & 3 });
  }
  function freeCell(tele) {
    for (var k = 0; k < 10; k++) {
      var x = rr(AL + 8, AR - 8), y = rr(AT + 8, AB - 8);
      if (d2(x, y, P.x, P.y) > 45 * 45) { addCell(x, y, 0, 0, true, tele); return; }
    }
  }
  function mult() { return Math.min(8, 1 + Math.floor(P.len / 8)); }

  /* ============================ la joueuse ============================ */
  var WDX = 0, WDY = 0;
  function sq(v) { return v <= 0 ? 0 : v >= 1 ? 1 : v * v; }
  /* près d'un mur, la composante qui y entre s'éteint : le cap se couche le long du bord, sans mort */
  function wallSteer(dx, dy) {
    var bh = false, bv = false, k;
    k = P.x - AL; if (dx < 0 && k < DZ) { dx *= sq((k - 2) / (DZ - 2)); bh = true; }
    k = AR - P.x; if (dx > 0 && k < DZ) { dx *= sq((k - 2) / (DZ - 2)); bh = true; }
    k = P.y - AT; if (dy < 0 && k < DZ) { dy *= sq((k - 2) / (DZ - 2)); bv = true; }
    k = AB - P.y; if (dy > 0 && k < DZ) { dy *= sq((k - 2) / (DZ - 2)); bv = true; }
    var m = Math.sqrt(dx * dx + dy * dy);
    if (m < 0.35) {
      var cx = (AL + AR) / 2, cy = (AT + AB) / 2, tx = 0, ty = 0, sa = Math.sin(P.ang), ca = Math.cos(P.ang);
      if (bh && bv) { tx = cx - P.x; ty = cy - P.y; }
      else if (bh) ty = Math.abs(sa) > 0.15 ? (sa > 0 ? 1 : -1) : (cy > P.y ? 1 : -1);
      else if (bv) tx = Math.abs(ca) > 0.15 ? (ca > 0 ? 1 : -1) : (cx > P.x ? 1 : -1);
      var tm = Math.sqrt(tx * tx + ty * ty) || 1;
      dx += tx / tm * (0.35 - m) * 3; dy += ty / tm * (0.35 - m) * 3;
      m = Math.sqrt(dx * dx + dy * dy);
    }
    WDX = m > 0 ? dx / m : Math.cos(P.ang); WDY = m > 0 ? dy / m : Math.sin(P.ang);
  }

  function updPlayer(dt) {
    var inp = S.input;
    if (inp && inp.mag > 0 && (inp.x || inp.y)) P.target = Math.atan2(inp.y, inp.x);     // mag 0 : on garde le cap (J-02)
    wallSteer(Math.cos(P.target), Math.sin(P.target));
    P.ang = turnTo(P.ang, Math.atan2(WDY, WDX), VIRAGE * dt);
    P.x += Math.cos(P.ang) * V * dt; P.y += Math.sin(P.ang) * V * dt;
    P.x = clamp(P.x, AL, AR); P.y = clamp(P.y, AT, AB);
    trailStep(P.x, P.y);
    if (P.invul > 0) P.invul -= dt;
    if (P.pulse >= 0) { P.pulse += dt * 60; if (P.pulse > P.len + 4) P.pulse = -1; }
    if (!tuto.done && Math.abs(wrapA(P.ang - P.a0)) > Math.PI / 4) {
      tuto.done = true; tuto.doneT = t; stats.turnT = t;
      enemyStart = Math.max(5, t + 1.2);                       // J-14 : le premier ennemi vient après le premier virage
    }
    if (tuto.done && tuto.fade > 0) tuto.fade -= dt * 2.5;
  }

  function updFire(dt) {
    P.fireCd -= dt;
    if (P.fireCd > 0) return;
    var rate = CADENCE * (P.surcharge ? 1.35 : 1) * (S.input && S.input.fire ? 1.4 : 1);
    P.fireCd += 1 / rate; if (P.fireCd < 0) P.fireCd = 0;
    var a = P.ang, c = Math.cos(a), s = Math.sin(a), hx = P.x + c * 6, hy = P.y + s * 6, n = P.len;
    if (n < 10) shot(hx, hy, a);
    else if (n < 20) { shot(hx - s * 2.5, hy + c * 2.5, a); shot(hx + s * 2.5, hy - c * 2.5, a); }
    else if (n < 32) { shot(hx, hy, a); shot(hx, hy, a - 0.13); shot(hx, hy, a + 0.13); }
    else { shot(hx - s * 2.5, hy + c * 2.5, a); shot(hx + s * 2.5, hy - c * 2.5, a); shot(hx, hy, a - 0.16); shot(hx, hy, a + 0.16); shot(hx, hy, a - 0.32); }
    P.volley++;
    sfx('tir', { pitch: P.volley % 5 });
  }
  function shot(x, y, a) {
    if (PB.length > 160) return;
    PB.push({ x: x, y: y, vx: Math.cos(a) * V_TIR, vy: Math.sin(a) * V_TIR, a: a, dmg: P.surcharge ? 2 : 1, life: 1.4 });
  }

  /* ============================ dégâts et mort ============================ */
  function hurt(sx, sy, why) {
    if (st !== 'jeu' || P.invul > 0) return;
    P.lives--; P.hits++; stats.hits++;
    stats.hitLog.push({ t: Math.round(t * 10) / 10, par: why || '?' });
    P.invul = INVUL;
    dmgT = 0.55; dmgA = Math.atan2(sy - P.y, sx - P.x);
    sfx('degat');
    boom(P.x, P.y, 0.45, CYAN); shake(7); hitstop(8);
    ringFx(P.x, P.y, 34, ROSE, 0.35);
    chain = 0; if (DEFI.etat === 'actif') DEFI.prog = 0;
    /* le choc : les tirs proches s'éteignent, les ennemis proches reculent et se taisent un instant */
    var i;
    for (i = 0; i < EB.length; i++) if (!EB[i].dead && d2(EB[i].x, EB[i].y, P.x, P.y) < 46 * 46) { spark(EB[i].x, EB[i].y, ROSE, 2); EB[i].dead = true; }
    for (i = 0; i < E.length; i++) {
      var e = E[i]; if (e.k === 'colosse' || e.dead) continue;
      var dd = d2(e.x, e.y, P.x, P.y);
      if (dd < 44 * 44) {
        var d = Math.sqrt(dd) || 1; e.kx = (e.x - P.x) / d * 120; e.ky = (e.y - P.y) / d * 120; e.stun = 0.7;
        if (e.st === 'vise' || e.st === 'fonce' || e.st === 'arme' || e.st === 'tire') { e.st = REPOS[e.k]; e.cd = 1.5; e.stT = 0; if (e.k === 'mine') e.life = Math.max(e.life || 0, 3); }
      }
    }
    for (i = 0; i < BEAMS.length; i++) if (BEAMS[i].src !== 'colosse') BEAMS[i].dead = true;
    /* la longueur sert de bouclier : un choc coupe la queue, dont une part se ramasse */
    var lost = Math.floor(P.len * 0.3);
    if (P.len - lost < 4) lost = Math.max(0, P.len - 4);
    for (i = 0; i < lost; i++) {
      segAt(P.len - i);
      if (i % 2 === 0) addCell(SPX, SPY, rr(-40, 40), rr(-40, 40), false, 0);
      debris(SPX, SPY, CYAN, 2);
    }
    P.len -= lost;
    if (P.lives <= 0) die();
  }

  function die() {
    st = 'mort'; stT = 0;
    if (DEFI.etat === 'actif') defiRate();
    boom(P.x, P.y, 0.7, CYAN); hitstop(4);
    sfx('bigkill');
    stats.deathT = t;
  }

  /* ============================ défi : DIX KILLS EN CHAÎNE ============================ */
  function defiOk() {
    DEFI.etat = 'reussi'; DEFI.t = t; DEFI.prog = DEFI.but; stats.defiT = t;
    score += DEFI_PRIME; P.surcharge = true; P.pulse = 0;
    if (P.lives < VIES + 1) P.lives++;
    sfx('defi');
    banner = { lines: ['DÉFI RÉUSSI', DEFI.nom, '+' + DEFI_PRIME + '  TIR SURCHARGÉ  +1 ♥'], c: JAUNE, icon: '✓', t: 0, d: 2.8 };
    pop(P.x, P.y - 12, '+' + DEFI_PRIME, JAUNE);
  }
  function defiRate() {
    DEFI.etat = 'rate'; DEFI.t = t;
    sfx('degat');
    TIMERS.push({ left: 0.2, fn: function () { sfx('degat'); } });   // le raté a son double coup descendant
    banner = { lines: ['DÉFI RATÉ', DEFI.nom], c: ROSE, icon: '✗', t: 0, d: 2.4 };
  }

  /* ============================ ennemis : naissance hors champ ============================ */
  function spawnPoint(r) {
    var m = r + 8;
    for (var k = 0; k < 14; k++) {
      var side = ri(0, 3), x, y;
      if (portrait && side === 2 && rnd() < 0.5) side = ri(0, 1);        // portrait : moins souvent par le bas
      if (side === 0) { x = -m; y = rr(AT - 4, Math.min(H - 8, AB + 20)); }
      else if (side === 1) { x = W + m; y = rr(AT - 4, Math.min(H - 8, AB + 20)); }
      else if (side === 2) { x = rr(8, W - 8); y = H + m; }
      else { x = rr(8, W - 8); y = -m; }
      if (d2(x, y, P.x, P.y) >= 80 * 80) return { x: x, y: y, side: side };
    }
    return null;                                       // pas de place sûre : on réessaiera
  }
  function logSpawn(e, tele) {
    var inView = e.x > -e.r && e.x < W + e.r && e.y > -e.r && e.y < H + e.r;
    var dist = Math.sqrt(d2(e.x, e.y, P.x, P.y));
    stats.spawns.push({ t: Math.round(t * 100) / 100, k: e.k, x: Math.round(e.x), y: Math.round(e.y), inView: inView, tele: tele || 0, dist: Math.round(dist), W: W, H: H });
    if (inView && !(tele >= 0.6)) stats.inView++;
    if (!inView && dist < stats.minDistSpawn) stats.minDistSpawn = Math.round(dist);
    if (inView && dist < stats.minDistTele) stats.minDistTele = Math.round(dist);
    if (stats.firstEnemyT < 0) stats.firstEnemyT = t;
  }
  var uid = 0;
  function newEnemy(k, x, y) {
    var T = TYPES[k];
    return { k: k, id: ++uid, x: x, y: y, r: T.r, pv: T.pv, pvMax: T.pv, st: 'entre', stT: 0, age: 0, flash: 0,
      ang: Math.atan2(P.y - y, P.x - x), aim: 0, cd: rr(0.6, 1.6), shots: 0, tx: x, ty: y, kx: 0, ky: 0, stun: 0,
      dead: false, orb: 0, dir: rnd() < 0.5 ? -1 : 1, spin: rr(0, TAU), life: 0 };
  }
  function station(e, margin) {
    for (var k = 0; k < 12; k++) {
      var x = rr(AL + margin, AR - margin), y = rr(AT + margin, AB - margin);
      if (d2(x, y, P.x, P.y) > 70 * 70) { e.tx = x; e.ty = y; return; }
    }
    e.tx = (AL + AR) / 2; e.ty = (AT + AB) / 2;
  }
  function spawnGroup(k) {
    var T = TYPES[k], sp0 = spawnPoint(T.r);
    if (!sp0) return 0;
    var n = 1;
    if (k === 'fleche') n = t < 30 ? ri(1, 2) : t < 60 ? ri(2, 3) : ri(2, 4);
    for (var i = 0; i < n; i++) {
      var off = (i - (n - 1) / 2) * 13, x = sp0.x, y = sp0.y, back = (i % 2) * 9;
      if (sp0.side < 2) { y += off; x += sp0.side === 0 ? -back : back; } else { x += off; y += sp0.side === 2 ? back : -back; }
      if (d2(x, y, P.x, P.y) < 70 * 70) continue;       // G-14 : jamais près de la tête, même hors champ
      var e = newEnemy(k, x, y);
      if (k === 'fleche') e.st = 'chasse';
      if (k === 'mine') { e.st = 'derive'; station(e, 16); }
      if (k === 'tourelle') { e.st = 'entre'; station(e, 24); }
      if (k === 'sentinelle') { e.st = 'orbite'; e.orb = Math.atan2(y - P.y, x - P.x); e.cd = rr(2.5, 3.5); }
      E.push(e); logSpawn(e, 0);
    }
    return n;
  }
  function counts() {
    var c = { fleche: 0, mine: 0, tourelle: 0, sentinelle: 0, colosse: 0, regular: 0 };
    for (var i = 0; i < E.length; i++) { if (E[i].dead) continue; c[E[i].k]++; if (E[i].k !== 'colosse') c.regular++; }
    return c;
  }
  /* la montée : nombre d'ennemis visé, croissant ; la minute deux deux fois plus dense que la minute un */
  function cible(tt) {
    if (tt < enemyStart) return 0;
    if (tt < 60) return 2 + 7 * clamp((tt - enemyStart) / Math.max(1, 60 - enemyStart), 0, 1);
    return 15 + 11 * clamp((tt - 60) / 60, 0, 1);
  }
  function director(dt) {
    spawnCd -= dt;
    var c = counts();
    if (c.regular < cible(t) && spawnCd <= 0) {
      var m2 = t >= 60, w;
      if (!m2) w = t < 22 ? { fleche: 1 } : { fleche: 0.7, mine: 0.3 };
      else w = { fleche: 0.34, mine: 0.16, tourelle: 0.28, sentinelle: 0.22 };
      if (c.mine >= (m2 ? 7 : 4)) w.mine = 0;
      if (c.tourelle >= 6) w.tourelle = 0;
      if (c.sentinelle >= 4) w.sentinelle = 0;
      var sum = 0, k; for (k in w) sum += w[k];
      var r = rnd() * sum, pick = 'fleche';
      for (k in w) { r -= w[k]; if (r <= 0) { pick = k; break; } }
      spawnGroup(pick);
      spawnCd = m2 ? 0.28 : 0.55;
    }
    /* énergie libre : toujours un peu à prendre */
    freeCd -= dt;
    if (freeCd <= 0) {
      freeCd = 2.6;
      var nf = 0; for (var i = 0; i < CELLS.length; i++) if (CELLS[i].free) nf++;
      if (nf < 3) freeCell(0.5);
    }
    if (bossPhase === 'attente' && t >= BOSS_T) bossAnnonce();
  }

  /* ============================ le colosse ============================ */
  function transition(name) {
    if (!N.intro || !N.intro.transition) return false;
    return !!safe('intro.transition', function () { return N.intro.transition(name); });
  }
  function bossAnnonce() {
    stats.bossAnnonceT = t;
    var cx = (AL + AR) / 2, cy = (AT + AB) / 2;
    if (portrait) { bossX = cx; bossY = P.y > cy ? AT + (AB - AT) * 0.3 : AT + (AB - AT) * 0.7; }
    else { bossY = cy; bossX = P.x > cx ? AL + (AR - AL) * 0.25 : AL + (AR - AL) * 0.75; }
    bossPhase = 'tele'; bossT = BOSS_TELE;
    /* l'interlude gèle le jeu ; le télégraphe commence au retour. Sans 60-intro.js, une bannière le remplace. */
    if (!transition('boss')) banner = { lines: ['ALERTE', 'COLOSSE EN APPROCHE'], c: MAGENTA, icon: null, t: 0, d: BOSS_TELE, blink: true };
    TIMERS.push({ left: Math.max(0, BOSS_TELE - 1.95), fn: function () { sfx('intro'); } });   // son montant, choc à l'arrivée
  }
  function bossArrive() {
    var e = newEnemy('colosse', bossX, bossY);
    e.st = 'naissance'; e.stT = 0.6; e.cd = 1.4; e.atk = null; e.atkT = 0; e.atkD = 1; e.cyc = 0; e.pts = [];
    boss = e; E.push(e); logSpawn(e, BOSS_TELE);
    stats.bossT = t; bossPhase = 'combat';
    shake(6);
    ringFx(bossX, bossY, 50, MAGENTA, 0.5); ringFx(bossX, bossY, 32, ROSE, 0.35);
    for (var i = 0; i < E.length; i++) {
      var o = E[i]; if (o === e) continue;
      var dd = d2(o.x, o.y, e.x, e.y);
      if (dd < 44 * 44) { var d = Math.sqrt(dd) || 1; o.kx = (o.x - e.x) / d * 140; o.ky = (o.y - e.y) / d * 140; }
    }
  }
  var CYCLE = ['radial', 'laser', 'radial', 'appel', 'laser', 'radial'];
  function updBoss(e, dt) {
    e.age += dt;
    /* il apparaît sans blesser pendant 0,6 s, et tant que la tête est sur lui (2 s au plus) : G-14 */
    if (e.st === 'naissance') { e.stT -= dt; if (e.stT <= 0 && (d2(e.x, e.y, P.x, P.y) > 34 * 34 || e.age > 2)) e.st = 'actif'; return; }
    var cx = (AL + AR) / 2, cy = (AT + AB) / 2;
    var ax = clamp(cx + (cx - P.x) * 0.45, AL + 26, AR - 26), ay = clamp(cy + (cy - P.y) * 0.45, AT + 24, AB - 24);
    var sp0 = e.atk ? 7 : 17, dx = ax - e.x, dy = ay - e.y, d = Math.sqrt(dx * dx + dy * dy), k;
    if (d > 1) { e.x += dx / d * Math.min(d, sp0 * dt); e.y += dy / d * Math.min(d, sp0 * dt); }
    var hard = e.pv < e.pvMax / 2;
    if (!e.atk) {
      e.cd -= dt;
      if (e.cd <= 0) {
        e.atk = CYCLE[e.cyc % CYCLE.length]; e.cyc++;
        e.atkT = e.atk === 'laser' ? 1.15 : 0.9; e.atkD = e.atkT;               // télégraphes de 0,9 à 1,15 s (G-13 : 0,8 s)
        if (e.atk === 'laser') e.aim = Math.atan2(P.y - e.y, P.x - e.x);
        if (e.atk === 'appel') {
          e.pts = [];
          for (k = 0; k < 3; k++) {
            var a = (k / 3) * TAU + e.age, px = clamp(e.x + Math.cos(a) * 40, AL + 8, AR - 8), py = clamp(e.y + Math.sin(a) * 40, AT + 8, AB - 8);
            if (d2(px, py, P.x, P.y) > 50 * 50) e.pts.push({ x: px, y: py });
          }
        }
      }
    } else {
      e.atkT -= dt;
      if (e.atkT <= 0) {
        if (e.atk === 'radial') {
          var nb = hard ? 12 : 10, off = e.cyc * 0.21;
          for (k = 0; k < nb; k++) { var aa = off + k / nb * TAU; ebullet(e.x + Math.cos(aa) * 12, e.y + Math.sin(aa) * 12, aa, hard ? 46 : 42, true); }
          if (hard) TIMERS.push({ left: 0.4, fn: function () { if (!e.dead) for (var q = 0; q < 8; q++) { var b = off + (q + 0.5) / 8 * TAU; ebullet(e.x + Math.cos(b) * 12, e.y + Math.sin(b) * 12, b, 38, true); } } });
          shake(2);
        } else if (e.atk === 'laser') {
          beam(e.x, e.y, e.aim, 0.4, 5, 'colosse');
          shake(3);
        } else if (e.atk === 'appel') {
          for (k = 0; k < e.pts.length; k++) {
            if (d2(e.pts[k].x, e.pts[k].y, P.x, P.y) < 55 * 55) continue;    // la tête est venue sur la marque : on n'y naît pas
            var m = newEnemy(t >= 60 && k === 1 ? 'fleche' : 'mine', e.pts[k].x, e.pts[k].y);
            if (m.k === 'mine') { m.st = 'pose'; m.life = 14; } else m.st = 'chasse';
            E.push(m); logSpawn(m, 0.9);
            ringFx(m.x, m.y, 12, MAGENTA, 0.25);
          }
        }
        e.atk = null; e.cd = hard ? 1.0 : 1.5;
      }
    }
    if (st === 'jeu' && P.invul <= 0 && d2(e.x, e.y, P.x, P.y) < (R_TETE + 15) * (R_TETE + 15)) hurt(e.x, e.y, 'colosse');
  }
  function bossDie(e) {
    var x = e.x, y = e.y;
    boom(x, y, 1, MAGENTA); hitstop(TYPES.colosse.hs); shake(12);
    sfx('bigkill');
    [[-18, -9, 0.1], [15, 11, 0.22], [-7, 16, 0.36], [13, -15, 0.5], [0, 2, 0.66]].forEach(function (o) {
      TIMERS.push({ left: o[2], fn: function () { boom(x + o[0], y + o[1], 0.5, MAGENTA); } });
    });
    for (var k = 0; k < TYPES.colosse.butin; k++) { var a = k / TYPES.colosse.butin * TAU; addCell(x, y, Math.cos(a) * rr(40, 90), Math.sin(a) * rr(40, 90), false, 0); }
    var i;
    for (i = 0; i < EB.length; i++) if (!EB[i].dead && d2(EB[i].x, EB[i].y, x, y) < 80 * 80) { spark(EB[i].x, EB[i].y, ROSE, 2); EB[i].dead = true; }
    for (i = 0; i < E.length; i++) {
      var o = E[i]; if (o === e) continue;
      var dd = d2(o.x, o.y, x, y);
      if (dd < 70 * 70) { var d = Math.sqrt(dd) || 1; o.kx = (o.x - x) / d * 150; o.ky = (o.y - y) / d * 150; o.stun = 0.8; }
    }
    for (i = 0; i < BEAMS.length; i++) BEAMS[i].dead = true;
    stats.bossDeathT = t;
    bossPhase = 'mort'; boss = null;
    TIMERS.push({ left: 0.7, fn: function () { if (st === 'jeu') banner = { lines: ['COLOSSE DÉTRUIT'], c: JAUNE, icon: null, t: 0, d: 2.0 }; } });
  }

  /* ============================ ennemis ordinaires ============================ */
  function ebullet(x, y, a, v, big) { if (EB.length < 140) EB.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: big ? 2 : 1.5, big: !!big }); }
  function beam(x, y, a, d, w, src) {
    var c = Math.cos(a), s = Math.sin(a), L = W + H;
    BEAMS.push({ x0: x + c * 9, y0: y + s * 9, x1: x + c * L, y1: y + s * L, t: 0, d: d, w: w, src: src });
  }
  function canAct(e) { return st === 'jeu' && e.stun <= 0 && inside(e); }

  function updFleche(e, dt) {
    var sp0 = 32 + 14 * (t / DUREE);
    if (e.st === 'chasse') {
      var lx = P.x + Math.cos(P.ang) * V * 0.25, ly = P.y + Math.sin(P.ang) * V * 0.25;
      e.ang = turnTo(e.ang, Math.atan2(ly - e.y, lx - e.x), 2.6 * dt);
      e.x += Math.cos(e.ang) * sp0 * dt; e.y += Math.sin(e.ang) * sp0 * dt;
      e.cd -= dt;
      var dd = d2(e.x, e.y, P.x, P.y);
      if (t > 25 && e.cd <= 0 && canAct(e) && dd < 80 * 80 && dd > 26 * 26 && charges < 2) {
        charges++;
        e.st = 'vise'; e.stT = 0.6; e.aim = Math.atan2(P.y - e.y, P.x - e.x);           // télégraphe : 0,6 s
      }
    } else if (e.st === 'vise') {
      e.stT -= dt; if (e.stT <= 0) { e.st = 'fonce'; e.stT = 0.42; }
    } else if (e.st === 'fonce') {
      var ox = e.x, oy = e.y;
      e.x += Math.cos(e.aim) * 155 * dt; e.y += Math.sin(e.aim) * 155 * dt;
      if (N.fx && N.fx.trail) safe('fx.trail', function () { N.fx.trail(ox, oy, e.x, e.y, ROSE); });
      e.stT -= dt; if (e.stT <= 0) { e.st = 'chasse'; e.cd = rr(3.5, 6); e.ang = e.aim; }
    }
  }
  function updMine(e, dt) {
    e.spin += dt * (e.st === 'arme' ? 9 : 1.6);
    if (e.st === 'derive') {
      var dx = e.tx - e.x, dy = e.ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { e.st = 'pose'; e.life = 15; } else { e.x += dx / d * 16 * dt; e.y += dy / d * 16 * dt; }
    } else if (e.st === 'pose') {
      e.life -= dt;
      if (e.life <= 0 && canAct(e)) { e.st = 'arme'; e.stT = 0.75; }
    } else if (e.st === 'arme') {
      e.stT -= dt;
      if (e.stT <= 0) {
        boom(e.x, e.y, 0.5, MAGENTA); sfx('kill', { pitch: 0 });
        if (st === 'jeu' && d2(e.x, e.y, P.x, P.y) < (26 + R_TETE) * (26 + R_TETE)) hurt(e.x, e.y, 'mine');
        e.dead = true; return;
      }
    }
    if (e.st !== 'arme' && canAct(e) && d2(e.x, e.y, P.x, P.y) < 34 * 34) { e.st = 'arme'; e.stT = 0.75; }   // télégraphe : 0,75 s
  }
  function updTourelle(e, dt) {
    var want = Math.atan2(P.y - e.y, P.x - e.x);
    if (e.st === 'entre') {
      var dx = e.tx - e.x, dy = e.ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { e.st = 'pose'; e.cd = 0.9; } else { e.x += dx / d * 30 * dt; e.y += dy / d * 30 * dt; }
      e.aim = turnTo(e.aim, want, 3 * dt);
    } else if (e.st === 'pose') {
      e.aim = turnTo(e.aim, want, 3 * dt);
      e.cd -= dt;
      if (e.cd <= 0 && canAct(e)) { e.st = 'vise'; e.stT = 0.65; e.aim = want; }              // télégraphe : 0,65 s
    } else if (e.st === 'vise') {
      e.stT -= dt;
      if (e.stT <= 0) {
        ebullet(e.x + Math.cos(e.aim) * 7, e.y + Math.sin(e.aim) * 7, e.aim, 74, false);
        e.shots++;
        if (e.shots >= 3) { e.shots = 0; e.st = 'entre'; station(e, 24); }
        else { e.st = 'pose'; e.cd = rr(2.2, 3.2) - 0.6 * clamp((t - 60) / 60, 0, 1); }
      }
    }
  }
  function updSentinelle(e, dt) {
    if (e.st === 'orbite') {
      e.orb += 0.45 * dt * e.dir;
      var tx = clamp(P.x + Math.cos(e.orb) * 78, 10, W - 10), ty = clamp(P.y + Math.sin(e.orb) * 78, AT - 6, H - 10);
      var dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) { e.x += dx / d * Math.min(d, 36 * dt); e.y += dy / d * Math.min(d, 36 * dt); }
      e.ang = Math.atan2(P.y - e.y, P.x - e.x);
      e.cd -= dt;
      if (e.cd <= 0 && canAct(e)) { e.st = 'vise'; e.stT = 0.85; e.aim = Math.atan2(P.y - e.y, P.x - e.x); }   // télégraphe : 0,85 s
    } else if (e.st === 'vise') {
      e.stT -= dt; if (e.stT <= 0) { e.st = 'tire'; e.stT = 0.35; beam(e.x, e.y, e.aim, 0.35, 3, 'sentinelle'); }
    } else if (e.st === 'tire') {
      e.stT -= dt; if (e.stT <= 0) { e.st = 'orbite'; e.cd = rr(4.5, 6.5) - 1.2 * clamp((t - 60) / 60, 0, 1); }
    }
  }

  var charges = 0;                              // flèches en télégraphe ou en charge, au plus deux
  function updEnemies(dt) {
    var i, e;
    charges = 0;
    for (i = 0; i < E.length; i++) if (!E[i].dead && E[i].k === 'fleche' && (E[i].st === 'vise' || E[i].st === 'fonce')) charges++;
    for (i = 0; i < E.length; i++) {
      e = E[i];
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.k === 'colosse') { updBoss(e, dt); continue; }
      e.age += dt;
      if (e.stun > 0) e.stun -= dt;
      if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; var f = Math.pow(0.02, dt); e.kx *= f; e.ky *= f; if (Math.abs(e.kx) + Math.abs(e.ky) < 2) { e.kx = 0; e.ky = 0; } }
      if (e.k === 'fleche') updFleche(e, dt);
      else if (e.k === 'mine') updMine(e, dt);
      else if (e.k === 'tourelle') updTourelle(e, dt);
      else updSentinelle(e, dt);
      if (e.dead) continue;
      /* trop loin hors du tampon : on le rappelle (une flèche qui a dépassé sa cible) */
      if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) { e.x = clamp(e.x, -40, W + 40); e.y = clamp(e.y, -40, H + 40); if (e.k === 'fleche') e.st = 'chasse'; }
      if (st === 'jeu' && P.invul <= 0) {
        var rr2 = R_TETE + e.r * 0.72;
        if (d2(e.x, e.y, P.x, P.y) < rr2 * rr2) { hurt(e.x, e.y, e.k + (e.st === 'fonce' ? ' (charge)' : '')); var d = Math.sqrt(d2(e.x, e.y, P.x, P.y)) || 1; e.kx = (e.x - P.x) / d * 120; e.ky = (e.y - P.y) / d * 120; }
      }
    }
    /* les flèches ne s'empilent pas */
    for (i = 0; i < E.length; i++) {
      var a = E[i]; if (a.k !== 'fleche' || a.dead) continue;
      for (var j = i + 1; j < E.length; j++) {
        var b = E[j]; if (b.k !== 'fleche' || b.dead) continue;
        var dd = d2(a.x, a.y, b.x, b.y);
        if (dd < 81 && dd > 0.01) { var dn = Math.sqrt(dd), push = (9 - dn) * 0.5 / dn, px = (a.x - b.x) * push, py = (a.y - b.y) * push; a.x += px; a.y += py; b.x -= px; b.y -= py; }
      }
    }
  }

  function kill(e) {
    if (e.dead) return;
    e.dead = true;
    var T = TYPES[e.k];
    kills++; stats.kills++; stats.killsBy[e.k]++;
    if (t - lastKill <= CHAINE) chain++; else chain = 1;
    lastKill = t;
    var pts = T.pts * mult();
    score += pts;
    pop(e.x, e.y - 8, '+' + pts, JAUNE);
    if (DEFI.etat === 'actif') { DEFI.prog = chain; if (chain > DEFI.meilleur) DEFI.meilleur = chain; if (chain >= DEFI.but) defiOk(); }
    var sl = stats.slices[Math.min(5, Math.floor(t / 20))]; if (sl) sl.kills++;
    if (e.k === 'colosse') { bossDie(e); return; }
    var big = e.k === 'tourelle' || e.k === 'sentinelle';
    boom(e.x, e.y, big ? 0.45 : 0.32, MAGENTA);
    sfx('kill', { pitch: Math.min(14, chain - 1) });
    if (hsCd <= 0) { hitstop(T.hs); hsCd = 0.12; }
    for (var k = 0; k < T.butin; k++) addCell(e.x, e.y, rr(-50, 50), rr(-50, 50), false, 0);
  }

  /* ============================ projectiles ============================ */
  function updShots(dt) {
    var i, j, b, e, k;
    for (i = PB.length - 1; i >= 0; i--) {
      b = PB[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -4 || b.x > W + 4 || b.y < -4 || b.y > H + 4) { PB.splice(i, 1); continue; }
      for (j = 0; j < E.length; j++) {
        e = E[j];
        if (e.dead || e.st === 'naissance') continue;
        var rr2 = e.r + 1.5;
        if (d2(b.x, b.y, e.x, e.y) < rr2 * rr2) {
          e.pv -= b.dmg; flash(e);
          if (N.fx && N.fx.spark) safe('fx.spark', function () { N.fx.spark(b.x, b.y, -b.vx, -b.vy, 2, e.k === 'colosse' ? OS : ROSE); });
          if (e.pv <= 0) kill(e);
          PB.splice(i, 1);
          break;
        }
      }
    }
    for (i = 0; i < EB.length; i++) {
      b = EB[i];
      if (b.dead) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -8 || b.x > W + 8 || b.y < -8 || b.y > H + 8) { b.dead = true; continue; }
      if (st === 'jeu' && P.invul <= 0 && d2(b.x, b.y, P.x, P.y) < (R_TETE + b.r) * (R_TETE + b.r)) { b.dead = true; hurt(b.x, b.y, b.big ? 'tir du colosse' : 'tir de tourelle'); continue; }
      /* le corps absorbe les tirs ennemis (la tête a sa propre zone) */
      for (k = 2; k <= P.len; k++) {
        segAt(k);
        var rk = segR(k) + b.r;
        if (d2(b.x, b.y, SPX, SPY) < rk * rk) { spark(b.x, b.y, CYANP, 3); b.dead = true; break; }
      }
    }
    for (i = 0; i < BEAMS.length; i++) {
      b = BEAMS[i];
      if (b.dead) continue;
      b.t += dt;
      if (b.t >= b.d) { b.dead = true; continue; }
      var hw = b.w / 2 + R_TETE;
      if (st === 'jeu' && P.invul <= 0 && segDist2(P.x, P.y, b.x0, b.y0, b.x1, b.y1) < hw * hw) hurt(b.x0, b.y0, 'laser ' + b.src);
    }
    compact(EB); compact(BEAMS);
  }
  function compact(L) { var j = 0; for (var i = 0; i < L.length; i++) if (!L[i].dead) L[j++] = L[i]; L.length = j; }

  /* ============================ énergie, éclats, textes ============================ */
  function updCells(dt) {
    for (var i = CELLS.length - 1; i >= 0; i--) {
      var c = CELLS[i];
      c.t += dt;
      if (c.tele > 0) { c.tele -= dt; continue; }
      c.life -= dt;
      if (c.life <= 0) { CELLS.splice(i, 1); continue; }
      var f = Math.pow(0.05, dt); c.vx *= f; c.vy *= f;
      if (st === 'jeu' || st === 'purge') {
        var dd = d2(c.x, c.y, P.x, P.y);
        if (dd < R_AIMANT * R_AIMANT) {
          var d = Math.sqrt(dd) || 1, pull = 160 * (1 - d / R_AIMANT) + 40;
          c.vx += (P.x - c.x) / d * pull * dt * 6; c.vy += (P.y - c.y) / d * pull * dt * 6;
        }
        if (dd < R_PRISE * R_PRISE) {
          CELLS.splice(i, 1);
          if (P.len < LENMAX) P.len++;
          score += 10 * mult();
          sfx('butin', { pitch: P.len });
          spark(c.x, c.y, JAUNE, 3);
          continue;
        }
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.x = clamp(c.x, AL - 4, AR + 4); c.y = clamp(c.y, AT - 4, AB + 4);
    }
  }
  function debris(x, y, c, n) {
    for (var i = 0; i < n && DEB.length < 300; i++) {
      var a = rr(0, TAU), v = rr(10, 60);
      DEB.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: c, t: 0, life: rr(0.35, 0.7) });
    }
  }
  function spark(x, y, c, n) {
    for (var i = 0; i < n && DEB.length < 300; i++) {
      var a = rr(0, TAU), v = rr(20, 70);
      DEB.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: c, t: 0, life: rr(0.12, 0.3) });
    }
  }
  function pop(x, y, s, c) { if (POP.length > 24) POP.shift(); POP.push({ x: x, y: y, s: s, c: c, t: 0 }); }

  function updCommon(dt) {
    var i;
    ak += dt;
    for (i = DEB.length - 1; i >= 0; i--) {
      var d = DEB[i]; d.t += dt;
      if (d.t >= d.life) { DEB.splice(i, 1); continue; }
      var f = Math.pow(0.004, dt); d.vx *= f; d.vy *= f; d.x += d.vx * dt; d.y += d.vy * dt;
    }
    for (i = POP.length - 1; i >= 0; i--) { POP[i].t += dt; POP[i].y -= dt * 14; if (POP[i].t > 0.8) POP.splice(i, 1); }
    for (i = FXL.length - 1; i >= 0; i--) { FXL[i].t += dt; if (FXL[i].t >= FXL[i].d) FXL.splice(i, 1); }
    for (i = TIMERS.length - 1; i >= 0; i--) { TIMERS[i].left -= dt; if (TIMERS[i].left <= 0) { var fn = TIMERS[i].fn; TIMERS.splice(i, 1); fn(); } }
    if (banner) { banner.t += dt; if (banner.t >= banner.d) banner = null; }
    if (dmgT > 0) dmgT -= dt;
    if (hsCd > 0) hsCd -= dt;
    if (muteFlash > 0) muteFlash -= dt;
  }

  /* ============================ statistiques de la preuve ============================ */
  function sample() {
    var k = Math.min(5, Math.floor(t / 20)), sl = stats.slices[k];
    if (!sl) return;
    var c = 0; for (var i = 0; i < E.length; i++) if (!E[i].dead) c++;
    sl.alive += c; sl.tension += tension(); sl.n++;
    if (c > stats.maxAlive) stats.maxAlive = c;
  }

  /* ============================ la boucle ============================ */
  function update(dt) {
    if (!S) S = N.S;
    if (!S) return;
    if (!P) { reset(S.seed); if (!P) return; }
    if (!(dt > 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;
    sizeUp();
    taps();
    /* un interlude en cours : le monde est gelé, c'est lui qui avance (protocole de 60-intro.js) */
    if (busy()) { safe('intro.update', function () { N.intro.update(dt); }); return; }
    if (st === 'jeu') {
      t += dt;
      if (typeof window !== 'undefined' && typeof window.__PILOT === 'function') { try { window.__PILOT(dbg()); } catch (x) { /* pilote de test */ } }
      updPlayer(dt);
      updFire(dt);
      director(dt);
      if (bossPhase === 'tele' && !busy()) { bossT -= dt; if (bossT <= 0) bossArrive(); }
      updEnemies(dt);
      updShots(dt);
      updCells(dt);
      if (chain > 0 && t - lastKill > CHAINE) { chain = 0; if (DEFI.etat === 'actif') DEFI.prog = 0; }
      sample();
      if (t >= DUREE && st === 'jeu') startPurge();
    } else if (st === 'mort') {
      stT += dt;
      /* le serpent se dissout de la tête à la queue ; le monde reste figé */
      var n = Math.floor(stT / MORT_D * (P.len + 2));
      while (P.gone < n && P.gone <= P.len) {
        segAt(P.gone); debris(SPX, SPY, P.gone % 3 ? CYAN : CYANP, 3);
        if (P.gone % 7 === 3) boom(SPX, SPY, 0.2, CYAN);
        P.gone++;
      }
      if (stT >= MORT_D) endGame(false);
    } else if (st === 'purge') {
      stT += dt;
      updPlayer(dt);
      updCells(dt);
      while (purgeList && purgeI < purgeList.length && stT >= purgeNext) {
        var e = purgeList[purgeI++];
        if (!e.dead) {
          e.dead = true;
          if (e.k === 'colosse') { boom(e.x, e.y, 1, MAGENTA); hitstop(20); sfx('bigkill'); stats.bossDeathT = t; }
          else boom(e.x, e.y, 0.36, MAGENTA);
        }
        purgeNext += 0.045;
      }
      if (purgeList && purgeI >= purgeList.length && stT >= purgeNext + 0.6) endGame(true);
    } else if (st === 'fin') {
      finT += dt;
      /* repli sans 60-intro.js : le clip de fin joue sous le panneau */
      if (!current() && !finClip && N.art && N.art.play) { finClip = finV ? 'victoire' : 'defaite'; safe('art.play', function () { N.art.play(finClip); }); }
    }
    updCommon(dt);
    for (var q = E.length - 1; q >= 0; q--) if (E[q].dead) E.splice(q, 1);
    publish();
  }

  function startPurge() {
    st = 'purge'; stT = 0;
    if (DEFI.etat === 'actif') defiRate();
    purgeList = E.slice().sort(function (a, b) { return d2(a.x, a.y, P.x, P.y) - d2(b.x, b.y, P.x, P.y); });
    purgeI = 0; purgeNext = 0.25;
    for (var i = 0; i < EB.length; i++) spark(EB[i].x, EB[i].y, ROSE, 1);
    EB.length = 0; BEAMS.length = 0;
    P.invul = 9;
  }

  function endGame(v) {
    st = 'fin'; finV = v; finT = 0; stT = 0;
    if (score > record) { newRecord = record > 0; record = score; store(K_REC, '' + record); }   // annoncé seulement s'il y avait un record à battre
    stats.endT = t; stats.victoire = v;
    QT.length = 0;
    firstGame = false;
    transition(v ? 'victoire' : 'defaite');
  }

  function restart() {
    if (N.intro && N.intro.stop) safe('intro.stop', function () { N.intro.stop(); });
    if (finClip && N.art && N.art.stop) { var f = finClip; safe('art.stop', function () { N.art.stop(f); }); }
    finClip = null;
    reset(seed + 1);
  }

  /* ============================ touchers : bouton son et relance ============================
     90-boot.js n'expose pas la position d'un clic de souris ; on écoute donc pointerdown (souris ET doigt,
     émis avant touchstart même quand celui-ci est annulé) et keydown, passivement, sans rien empêcher. Le
     traitement attend update(), après le geste de 90-boot.js (qui, lui, lance le son au premier toucher).
     Un geste reçu pendant l'ouverture ou un interlude n'est pas pour nous : il saute la scène. */
  var listening = false;
  function listen() {
    if (listening || typeof window === 'undefined' || !window.addEventListener) return;
    listening = true;
    window.addEventListener('pointerdown', function (ev) {
      var s = N.S; if (!s || s.phase === 'intro' || busy()) return;
      var c = G.canvas ? G.canvas() : null, r = c && c.getBoundingClientRect ? c.getBoundingClientRect() : { left: 0, top: 0 }, p = G.PX || 1;
      QT.push({ x: (ev.clientX - r.left) / p, y: (ev.clientY - r.top) / p, key: null });
      if (QT.length > 8) QT.shift();
    }, { passive: true });
    window.addEventListener('keydown', function (ev) {
      var s = N.S; if (!s || s.phase === 'intro' || busy() || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      QT.push({ x: -1, y: -1, key: ev.code });
      if (QT.length > 8) QT.shift();
    }, { passive: true });
  }
  function onSB(x, y) { return x >= SB.x && x < SB.x + SB.w && y >= SB.y && y < SB.y + SB.h; }
  function taps() {
    while (QT.length) {
      var q = QT.shift();
      if (q.key === 'KeyM' || (q.key === null && onSB(q.x, q.y))) { toggleMute(); continue; }
      if (st === 'fin' && !busy() && finT >= GARDE && q.key !== 'Tab' && q.key !== 'Escape') { restart(); QT.length = 0; return; }
    }
  }
  function toggleMute() {
    muted = !muted;
    store(K_SON, muted ? '0' : '1');
    if (N.music && N.music.mute) applyMute();
    else if (N.music) {                              // repli sans N.music.mute : la partition s'arrête, nos sons sont filtrés
      if (muted) { if (N.music.stop) safe('music.stop', function () { N.music.stop(); }); }
      else if (N.music.start && N.music.info && N.music.info()) safe('music.start', function () { N.music.start(); });
    }
    muteFlash = 0.35;
    if (S) S.muted = muted;
  }
  /* N.music.mute(v) (30-music.js) coupe tout, sons de 60-intro.js compris, et vaut avant même la création
     du contexte audio ; sans lui, on retombe sur stop() tenu à chaque instant. */
  function applyMute() {
    if (!N.music) return;
    if (N.music.mute) {
      if (!N.music.muted || N.music.muted() !== muted) safe('music.mute', function () { N.music.mute(muted); });
      return;
    }
    if (muted && N.music.stop) safe('music.stop', function () { N.music.stop(); });
  }
  muted = load(K_SON) === '0';

  /* ============================ tension : pilote la musique ============================
     Croissante par tranches de vingt secondes : 0,06 puis +0,175 par tranche, et un léger glissement
     dans la tranche. Batterie dès 20 s (seuil 0,20 de 30-music.js), lead dès 80 s (seuil 0,68) : deux
     couches au calme, quatre au chaos. Appelée à chaque image par 90-boot.js, ouverture, interludes et
     pause compris : c'est donc aussi là que la coupure du son est tenue (N.music.mute, ou son repli). */
  function tension() {
    if ((++muteTick % 6) === 1) applyMute();
    if (!P) return 0.06;
    if (st === 'fin') return 0.12;
    var tt = Math.min(t, DUREE - 0.001), k = Math.floor(tt / 20), f = (tt - k * 20) / 20;
    return Math.min(1, 0.06 + k * 0.175 + f * 0.03);
  }

  /* ============================ dessin : sous les explosions ============================ */
  var BG = null, bgKey = '';
  function buildBG() {
    var s = mk(W, H), d = s.data, x, y;
    var ox = Math.round(((AL + AR) / 2) % 48), oy = Math.round(((AT + AB) / 2) % 48);
    for (y = 0; y < H; y++) {
      var zone = portrait && y > AB + 7;
      for (x = 0; x < W; x++) {
        var mx = ((x - ox) % 48 + 48) % 48, my = ((y - oy) % 48 + 48) % 48, c = 0;
        if (mx === 0 || my === 0) c = zone ? NUIT : INDIGO;
        else if ((mx % 12 === 0 || my % 12 === 0) && ((x + y) & 1) === 0) c = NUIT;
        if (mx === 0 && my === 0) c = zone ? INDIGO : VIOLET;
        if (zone && c === 0 && ((x + y) & 3) === 0) c = NP;
        d[y * W + x] = c;
      }
    }
    /* le bord de l'arène : un mur doux en violet, gaine de nuit profonde à l'extérieur */
    var l = Math.round(AL - 7), r = Math.round(AR + 7), tp = Math.round(AT - 7), b = Math.round(AB + 7);
    function hp(xx, yy, c) { if (xx >= 0 && yy >= 0 && xx < W && yy < H) d[yy * W + xx] = c; }
    for (x = l; x <= r; x++) { hp(x, tp, VIOLET); hp(x, tp - 1, NP); hp(x, b, VIOLET); hp(x, b + 1, NP); }
    for (y = tp; y <= b; y++) { hp(l, y, VIOLET); hp(l - 1, y, NP); hp(r, y, VIOLET); hp(r + 1, y, NP); }
    for (var k = 1; k < 6; k++) { hp(l + k, tp + 1, INDIGO); hp(l + 1, tp + k, INDIGO); hp(r - k, tp + 1, INDIGO); hp(r - 1, tp + k, INDIGO);
      hp(l + k, b - 1, INDIGO); hp(l + 1, b - k, INDIGO); hp(r - k, b - 1, INDIGO); hp(r - 1, b - k, INDIGO); }
    return s;
  }
  function drawBG() {
    var key = W + 'x' + H + ':' + AL + ',' + AR + ',' + AT + ',' + AB;
    if (!BG || bgKey !== key) { BG = buildBG(); bgKey = key; }
    G.blit(BG, 0, 0);
    /* impulsions de données le long du treillis : plus nombreuses quand la tension monte */
    var ox = Math.round(((AL + AR) / 2) % 48), oy = Math.round(((AT + AB) / 2) % 48);
    var n = 4 + Math.floor(tension() * 14), nx = Math.ceil(W / 48) + 1, ny = Math.ceil(H / 48) + 1;
    for (var i = 0; i < n; i++) {
      var horiz = i & 1, spd = 30 + (i * 13) % 40, ph = (ak * spd + i * 97) % (horiz ? W + 20 : H + 20) - 10;
      for (var k = 0; k < 6; k++) {
        var c = k === 0 ? VIOLET : INDIGO;
        if (horiz) { var yy = oy + ((i * 5) % ny) * 48; if (yy < H && !(portrait && yy > AB + 7)) G.px(ph - k, yy, c); }
        else { var xx = ox + ((i * 3) % nx) * 48, y2 = ph - k; if (xx < W && !(portrait && y2 > AB + 7)) G.px(xx, y2, c); }
      }
    }
  }
  function drawFXL() {
    for (var i = 0; i < FXL.length; i++) {
      var f = FXL[i], k = f.t / f.d;
      if (f.ring) { G.ring(f.x, f.y, f.r * (0.3 + 0.7 * k), f.c, 1 - k); continue; }
      G.ditherCirc(f.x, f.y, f.r * 0.35 * (1 - k), OS, 1 - k * 1.5);
      G.disc(f.x, f.y, f.r * k * 0.6, f.r * k, f.c, 1 - k);
      G.ring(f.x, f.y, f.r * k + 2, AMBRE, 1 - k);
    }
  }
  function drawDebris() {
    for (var i = 0; i < DEB.length; i++) {
      var d = DEB[i], k = d.t / d.life;
      if (k > 0.6 && !N.pal.dither(Math.round(d.x), Math.round(d.y), (1 - k) / 0.4)) continue;
      G.px(d.x, d.y, d.c);
    }
  }
  function drawCells() {
    var f = Math.floor(ak * 8);
    for (var i = 0; i < CELLS.length; i++) {
      var c = CELLS[i];
      if (c.tele > 0) {                                    // une cellule libre s'allume, elle n'apparaît pas d'un coup
        var k = 1 - c.tele / 0.5; G.px(c.x, c.y, AMBRE); G.px(c.x - 3 * k, c.y, AMBRE); G.px(c.x + 3 * k, c.y, AMBRE); G.px(c.x, c.y - 3 * k, AMBRE); G.px(c.x, c.y + 3 * k, AMBRE);
        continue;
      }
      if (c.life < 2 && (f & 1)) continue;
      put(sp('butin', f + c.f), c.x, c.y);
    }
  }
  function draw() {
    if (!S) S = N.S;
    if (!S || !P) return;
    sizeUp();
    if (st === 'fin' && !current()) { drawFinBG(); return; }
    drawBG();
    drawDebris();
    drawFXL();
    drawCells();
  }

  /* ============================ dessin : par-dessus les explosions ============================ */
  function teleLine(x0, y0, a, len, k) {
    var c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c, i, x, y;
    for (i = 6; i < len; i++) { x = x0 + c * i; y = y0 + s * i; if (x < -2 || y < -2 || x > W + 2 || y > H + 2) break; G.px(x + nx, y + ny, NP); G.px(x - nx, y - ny, NP); }
    var ph = Math.floor(ak * 30), on = k > 0.66 ? 5 : 3, col = k > 0.75 ? ROSE : MAGENTA;
    for (i = 6; i < len; i++) { x = x0 + c * i; y = y0 + s * i; if (x < -2 || y < -2 || x > W + 2 || y > H + 2) break; if (((i + 6000 - ph) % 6) < on) G.px(x, y, col); }
  }
  function beamDraw(b) {
    var dx = b.x1 - b.x0, dy = b.y1 - b.y0, L = Math.sqrt(dx * dx + dy * dy), c = dx / L, s = dy / L, nx = -s, ny = c;
    var h = Math.floor(b.w / 2), k = b.t / b.d;
    for (var i = 0; i < L; i++) {
      var x = b.x0 + c * i, y = b.y0 + s * i;
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) break;
      G.px(x + nx * (h + 1), y + ny * (h + 1), NP); G.px(x - nx * (h + 1), y - ny * (h + 1), NP);
      for (var j = -h; j <= h; j++) G.px(x + nx * j, y + ny * j, j === 0 ? (k < 0.5 ? OS : ROSE) : (Math.abs(j) < h ? ROSE : MAGENTA));
    }
  }
  function spawnMark(x, y, k, r0) {
    for (var j = 0; j < 3; j++) {
      var r = r0 * (1 - k) + 4 + j * (r0 / 6);
      G.ring(x, y, r + 1, NP, 1); G.ring(x, y, r, j === 0 && k > 0.6 ? ROSE : MAGENTA, 0.45 + 0.55 * k);
    }
    G.line(x - 3, y, x + 3, y, MAGENTA); G.line(x, y - 3, x, y + 3, MAGENTA);
  }
  function drawTelegraphs() {
    var i, e, j;
    for (i = 0; i < E.length; i++) {
      e = E[i];
      if (e.dead) continue;
      if (e.k === 'fleche' && e.st === 'vise') teleLine(e.x, e.y, e.aim, 72, 1 - e.stT / 0.6);
      else if (e.k === 'tourelle' && e.st === 'vise') teleLine(e.x, e.y, e.aim, 66, 1 - e.stT / 0.65);
      else if (e.k === 'sentinelle' && e.st === 'vise') teleLine(e.x, e.y, e.aim, W + H, 1 - e.stT / 0.85);
      else if (e.k === 'mine' && e.st === 'arme') {
        var k = 1 - e.stT / 0.75;
        G.ditherCirc(e.x, e.y, 26, MAGENTA, 0.08 + 0.3 * k);
        G.ring(e.x, e.y, 27, NP, 1); G.ring(e.x, e.y, 26, k > 0.7 ? ROSE : MAGENTA, 1);
      } else if (e.k === 'colosse' && e.atk) {
        var kk = 1 - e.atkT / e.atkD;
        if (e.atk === 'radial') { for (j = 0; j < 3; j++) { var r = 34 * (1 - kk) + 14 + j * 5; G.ring(e.x, e.y, r + 1, NP, 1); G.ring(e.x, e.y, r, MAGENTA, 0.5 + 0.5 * kk); } }
        else if (e.atk === 'laser') teleLine(e.x, e.y, e.aim, W + H, kk);
        else if (e.atk === 'appel') for (j = 0; j < e.pts.length; j++) spawnMark(e.pts[j].x, e.pts[j].y, kk, 10);
      }
    }
    if (bossPhase === 'tele' && !busy()) {
      var kb = 1 - bossT / BOSS_TELE;
      spawnMark(bossX, bossY, kb, 30);
      if ((Math.floor(ak * 4) & 1) === 0) {          // la croix de visée bat à 2 Hz (G-29)
        teleLine(bossX, bossY, Math.PI, W, 0.5); teleLine(bossX, bossY, 0, W, 0.5);
        teleLine(bossX, bossY, -Math.PI / 2, H, 0.5); teleLine(bossX, bossY, Math.PI / 2, H, 0.5);
      }
      if (kb > 0.55) blitDither(sp('colosse', 0), bossX, bossY, SANG, (kb - 0.55) / 0.45);
    }
    for (i = 0; i < BEAMS.length; i++) if (!BEAMS[i].dead) beamDraw(BEAMS[i]);
  }
  function blitDither(s, x, y, c, k) {
    if (!s) return;
    var cx = s.cx !== undefined ? s.cx : (s.w - 1) >> 1, cy = s.cy !== undefined ? s.cy : (s.h - 1) >> 1;
    var x0 = Math.round(x) - cx, y0 = Math.round(y) - cy, D = N.pal.dither;
    for (var j = 0; j < s.h; j++) for (var i = 0; i < s.w; i++) if (s.data[j * s.w + i] && D(x0 + i, y0 + j, k)) G.px(x0 + i, y0 + j, c);
  }

  function enemySprite(e, f) {
    if (e.k === 'fleche') return sp('fleche:' + dir16(e.st === 'vise' || e.st === 'fonce' ? e.aim : e.ang), f);
    if (e.k === 'tourelle') return sp(e.st === 'vise' ? 'tourelle:charge' : 'tourelle', f);
    if (e.k === 'mine') return sp(e.st === 'arme' ? 'mine:alerte' : 'mine', f);
    if (e.k === 'colosse') return sp(e.atk ? 'colosse:oeil' : 'colosse', f);
    return sp(e.k, f);
  }
  function drawEnemy(e) {
    var f = Math.floor(ak * 6) + (e.id & 3), s = enemySprite(e, f), x = e.x, y = e.y;
    if (!s) return;
    if (e.k === 'colosse' && e.st === 'naissance') { if ((Math.floor(ak * 8) & 1)) { putInk(s, x, y, MAGENTA); return; } }
    if (e.k === 'fleche' && e.st === 'vise') x += (Math.floor(ak * 20) & 1) ? 1 : 0;      // elle tremble avant de foncer
    put(s, x, y);
    if (isFlash(e)) putInk(inner(s), x, y, OS);
    if (e.k === 'colosse') {
      /* sa vie se lit sur lui-même : un arc qui se vide autour de la carcasse */
      var fr = e.pv / e.pvMax, n = Math.ceil(fr * 72);
      for (var j = 0; j < n; j++) { var b = -Math.PI / 2 + j / 72 * TAU; G.px(x + Math.cos(b) * 29, y + Math.sin(b) * 29, j % 9 === 8 ? NP : ROSE); }
    }
  }
  function drawEdgeTicks() {
    var top = (S.view.safe.t | 0) + hudH + 1;
    for (var i = 0; i < E.length; i++) {
      var e = E[i];
      if (e.dead || (e.x > 1 && e.x < W - 1 && e.y > 1 && e.y < H - 1)) continue;
      var x = clamp(e.x, 3, W - 4), y = clamp(e.y, top + 2, H - 4);
      if (d2(x, y, e.x, e.y) > 45 * 45) continue;
      G.rect(x - 2, y - 2, 5, 5, NP); G.rect(x - 1, y - 1, 3, 3, MAGENTA);
    }
  }
  function drawSnake() {
    var f = Math.floor(ak * 8), k;
    if (st === 'mort' && P.gone > 0) {
      for (k = P.len; k >= P.gone; k--) { segAt(k); put(sp(k > P.len - 3 ? 'corps:5' : 'corps', f + k), SPX, SPY); }
      return;
    }
    var blink = P.invul > 0 && st === 'jeu' && (Math.floor(ak * 15) & 1);
    for (k = P.len; k >= 1; k--) {
      if (blink && k > 2 && (k & 1)) continue;
      segAt(k);
      var q = P.len - k, nm = q < 1 ? 'corps:3' : q < 2 ? 'corps:5' : q < 4 ? 'corps:7' : 'corps';
      var s = sp(nm, f + k);
      if (P.pulse >= 0 && Math.abs(k - P.pulse) < 2) putInk(s, SPX, SPY, CYANP); else put(s, SPX, SPY);
    }
  }
  function drawHead() {
    if (st === 'mort' && P.gone > 0) return;
    put(sp('tete:' + dir16(P.ang), Math.floor(ak * 5)), P.x, P.y);
    /* le cap visé, quand il diffère du cap réel de plus de 20° (J-33) */
    var d = wrapA(P.target - P.ang);
    if (st === 'jeu' && Math.abs(d) > 0.35) put(sp('chevron:' + dir16(P.target), 0), P.x + Math.cos(P.target) * 11, P.y + Math.sin(P.target) * 11);
  }
  function drawShots() {
    var f = Math.floor(ak * 12);
    for (var i = 0; i < PB.length; i++) {
      var b = PB[i];
      if (b.dmg > 1) { G.line(b.x - b.vx * 0.016, b.y - b.vy * 0.016, b.x, b.y, AMBRE); G.rect(b.x - 1, b.y - 1, 2, 2, JAUNE); }
      else put(sp('tir:' + dir16(b.a), f), b.x, b.y);
    }
  }
  function drawEnemyShots() {
    var f = Math.floor(ak * 8);
    for (var i = 0; i < EB.length; i++) if (!EB[i].dead) put(sp(EB[i].big ? 'tirEnnemi:gros' : 'tirEnnemi', f + i), EB[i].x, EB[i].y);
  }
  function drawPops() {
    for (var i = 0; i < POP.length; i++) { var p = POP[i]; if (p.t > 0.6 && (Math.floor(ak * 15) & 1)) continue; textC(p.s, p.x, p.y, p.c, true, 1); }
  }
  function drawDamage() {
    if (dmgT <= 0 || st !== 'jeu') return;
    var c = Math.cos(dmgA), s = Math.sin(dmgA);
    for (var i = 8; i < 20; i++) { G.px(P.x + c * i - s, P.y + s * i + c, NP); G.px(P.x + c * i + s, P.y + s * i - c, NP); G.px(P.x + c * i, P.y + s * i, i < 12 ? OS : ROSE); }
  }

  /* le pouce fantôme (J-14) : il mime le geste là où le pouce se pose, et s'efface au premier virage */
  function drawGhost() {
    if (!tuto.on || tuto.fade <= 0 || st !== 'jeu') return;
    var k = clamp(tuto.fade, 0, 1), sf = S.view.safe;
    var cx = Math.round(W / 2), cy = portrait ? Math.round((AB + 7 + H - (sf.b | 0)) / 2) : Math.round(H - (sf.b | 0) - 30);
    if (hasTouch()) {
      var ph = (t % 1.8) / 1.8, a = -Math.PI / 2 + Math.sin(ph * TAU) * 1.1, m = ph < 0.12 ? ph / 0.12 : 1;
      G.ring(cx, cy, 11, ACIER, 0.55 * k);
      for (var j = 1; j <= 3; j++) { var b = -Math.PI / 2 + Math.sin((ph - j * 0.025) * TAU) * 1.1; G.px(cx + Math.cos(b) * 11 * m, cy + Math.sin(b) * 11 * m, ACIER); }
      var px = cx + Math.cos(a) * 11 * m, py = cy + Math.sin(a) * 11 * m;
      G.ditherCirc(px, py, 3, OS, k); G.ditherCirc(px, py, 2, ACIER, k * 0.6);
    } else {
      /* sans écran tactile, aucun contrôle tactile : les quatre flèches du clavier (J-31) */
      var on = Math.floor(t / 0.6) % 4, keys = [[0, -9], [-9, 0], [0, 0], [9, 0]], lit = [0, 3, 2, 1][on];
      var glyphs = ['↑', '←', '↓', '→'];
      for (var q = 0; q < 4; q++) {
        var kx = cx + keys[q][0], ky = cy + keys[q][1];
        G.rect(kx - 4, ky - 4, 9, 9, NP); G.rect(kx - 3, ky - 3, 7, 7, q === lit ? ACIER : ARDOISE);
        if (k > 0.5) textC(glyphs[q], kx + 1, ky - 3, q === lit ? NP : ACIER, false, 1);
      }
    }
  }

  function drawBanner() {
    if (!banner) return;
    if (banner.blink && (Math.floor(banner.t * 3) & 1)) return;          // bat à 1,5 Hz (G-29)
    var wmax = 0, i, n = banner.lines.length;
    for (i = 0; i < n; i++) wmax = Math.max(wmax, textW(banner.lines[i], 1));
    var iw = banner.icon ? 12 : 0, w = wmax + 16 + iw, h = n * 11 + 7;
    var y = P.y > (AT + AB) / 2 ? AT + 2 : AB - h - 2, k = clamp(banner.t / 0.12, 0, 1), ww = Math.round(w * k), x = Math.round(W / 2 - ww / 2);
    G.rect(x - 1, y - 1, ww + 2, h + 2, NP);
    G.rect(x, y, ww, h, NUIT);
    G.rect(x, y, ww, 1, banner.c); G.rect(x, y + h - 1, ww, 1, banner.c);
    if (k < 1) return;
    if (banner.icon) text(banner.icon, x + 7, y + Math.round(h / 2) - 3, banner.c, false, 1);
    for (i = 0; i < n; i++) textC(banner.lines[i], W / 2 + iw / 2, y + 5 + i * 11, i === 0 ? banner.c : (banner.c === JAUNE ? OS : ACIER), false, 1);
  }

  function plate(x, y, w, h) { G.rect(x, y, w, h, NP); G.rect(x + 1, y + h, w - 2, 1, NP); }
  function drawSound() {
    var y = (S.view.safe.t | 0) + 1, cx = SB.x + SB.w - 8;
    plate(cx - 7, y - 1, 15, 13);
    if (muteFlash > 0) G.rect(cx - 7, y - 1, 15, 13, ARDOISE);
    put(sp(muted ? 'muet:acier' : 'son', 0), cx, y + 5);
  }
  function drawHUD() {
    var sf = S.view.safe, l = (sf.l | 0) + 3, y = (sf.t | 0) + 2;
    var lives = Math.max(0, P.lives), hw = textW('♥', 1) + 2, nh = Math.max(VIES, lives), sw0 = textW(pad(score, 7), 1);
    plate(l - 3, y - 2, sw0 + 6 + nh * hw + 4, 11);
    var sw = text(pad(score, 7), l, y, JAUNE, true, 1);
    var lx = l + sw + 6;
    for (var i = 0; i < nh; i++) text('♥', lx + i * hw, y, i < lives ? (i >= VIES ? JAUNE : OS) : ARDOISE, true, 1);
    /* le défi : nom, progrès, et l'issue */
    var d = DEFI, cy = portrait ? y + 10 : y, left = portrait ? l : lx + (VIES + 1) * hw + 8, right = SB.x - 4;
    var col = d.etat === 'reussi' ? JAUNE : d.etat === 'rate' ? ACIER : OS;
    var tail = d.etat === 'actif' ? ' ' + d.prog + '/' + d.but : (d.etat === 'reussi' ? ' ✓' : ' ✗');
    var nw = textW(d.nom, 1), tw = nw + textW(tail, 1);
    var tx = Math.round(clamp(W / 2 - tw / 2, left, Math.max(left, right - tw)));
    plate(tx - 3, cy - 2, tw + 6, 11);
    text(d.nom, tx, cy, col, true, 1);
    text(tail, tx + nw, cy, d.etat === 'actif' ? (chain > 0 ? JAUNE : ACIER) : (d.etat === 'reussi' ? JAUNE : ROSE), true, 1);
    if (d.etat === 'actif' && chain > 0) {                   // la fenêtre de chaîne qui se vide
      var f = clamp(1 - (t - lastKill) / CHAINE, 0, 1);
      G.rect(tx, cy + 8, Math.round(tw * f), 1, f > 0.3 ? JAUNE : ROSE);
    }
    drawSound();
  }

  function veil() { G.ditherRect(0, 0, W, H, NP, 0.5); }
  function drawPause() {
    var bw = Math.min(W - 8, 160), bh = 42, x = Math.round((W - bw) / 2), y = Math.round(H / 2 - bh / 2);
    G.rect(x - 1, y - 1, bw + 2, bh + 2, NP); G.rect(x, y, bw, bh, NUIT); G.rect(x, y, bw, 1, ACIER);
    textC('PAUSE', W / 2, y + 7, OS, false, 2);
    textC(hasTouch() ? 'TOUCHE POUR REPRENDRE' : 'ESPACE POUR REPRENDRE', W / 2, y + 28, ACIER, false, 1);
  }

  /* ============================ écran de fin ============================
     Le fond est le panneau victoire ou défaite de 60-intro.js (N.intro.current()) ; sans lui, ce module
     pose le panneau de N.art lui-même, assombri d'un cran. Par-dessus : le score et le défi. */
  var DARK = null, FINBUF = null;
  function drawFinBG() {
    var name = finV ? 'victoire' : 'defaite', a = null;
    if (N.art && N.art.get) a = safe('art.get', function () { return N.art.get(name); });
    if (!a || !a.data) { drawBG(); return; }
    if (!DARK) { DARK = new Uint8Array(16); for (var c = 0; c < 16; c++) DARK[c] = N.pal.shade(c, 0.6); DARK[0] = 0; }
    if (!FINBUF || FINBUF.w !== a.w || FINBUF.h !== a.h) FINBUF = mk(a.w, a.h);
    var src = a.data, dst = FINBUF.data;
    for (var i = 0; i < src.length; i++) dst[i] = DARK[src[i]];
    G.blit(FINBUF, Math.floor((W - a.w) / 2), Math.floor((H - a.h) / 2));
  }
  function drawFinTop() {
    var cx = W / 2, bw = Math.min(W - 10, 230), x = Math.round(cx - bw / 2), bh = 94, y = Math.round(H / 2 - bh / 2);
    if (portrait) y = Math.round(H * 0.62 - bh / 2);            // sous le bandeau du panneau en portrait
    var c0 = finV ? JAUNE : ROSE;
    G.ditherRect(x - 3, y - 3, bw + 6, bh + 6, NP, 0.6);
    G.rect(x, y, bw, bh, NUIT); G.rect(x, y, bw, 1, c0); G.rect(x, y + bh - 1, bw, 1, c0);
    textC(finV ? 'VICTOIRE' : 'DÉFAITE', cx, y + 6, finV ? JAUNE : OS, false, 2);
    var w1 = textW('SCORE ', 1), w2 = textW(pad(score, 7), 1), x1 = Math.round(cx - (w1 + w2) / 2);
    text('SCORE ', x1, y + 26, ACIER, false, 1); text(pad(score, 7), x1 + w1, y + 26, JAUNE, false, 1);
    textC(newRecord ? 'NOUVEAU RECORD' : 'RECORD ' + pad(record, 7), cx, y + 37, newRecord ? JAUNE : ACIER, false, 1);
    var ok = DEFI.etat === 'reussi';
    textC(ok ? '✓ DÉFI RÉUSSI' : '✗ DÉFI RATÉ', cx, y + 51, ok ? JAUNE : ROSE, false, 1);
    textC(DEFI.nom + (ok ? '' : '  ' + DEFI.meilleur + '/' + DEFI.but), cx, y + 62, ACIER, false, 1);
    /* estompé pendant la garde (le doigt posé à la mort ne relance pas), franc ensuite, avec un battement lent */
    var rj = hasTouch() ? 'TOUCHE POUR REJOUER' : 'ESPACE POUR REJOUER';
    textC(rj, cx, y + 79, finT < GARDE ? ARDOISE : ((finT * 1.25) % 1 < 0.8 ? OS : ACIER), false, 1);
  }

  function drawTop() {
    if (!S) S = N.S;
    if (!S || !P) return;
    /* l'interlude couvre le monde ET les explosions ; pendant busy(), il occupe seul l'écran */
    if (current()) {
      safe('intro.draw', function () { N.intro.draw(); });
      if (busy()) return;
    }
    if (st === 'fin') { if (S.paused) veil(); drawFinTop(); drawSound(); if (S.paused) drawPause(); return; }
    drawTelegraphs();
    for (var i = 0; i < E.length; i++) if (!E[i].dead) drawEnemy(E[i]);
    drawShots();
    drawSnake();
    drawEnemyShots();
    drawDamage();
    drawHead();
    drawEdgeTicks();
    drawPops();
    drawGhost();
    drawBanner();
    if (S.paused) veil();                          // le monde s'efface, le score et le défi restent nets
    drawHUD();
    if (S.paused) drawPause();
  }

  /* ============================ pour les tests ============================ */
  function dbg() {
    return {
      t: t, st: st, P: P, E: E, EB: EB, PB: PB, CELLS: CELLS, BEAMS: BEAMS, boss: boss, bossPhase: bossPhase, bossT: bossT,
      AL: AL, AR: AR, AT: AT, AB: AB, W: W, H: H, SB: SB, score: score, kills: kills, chain: chain, defi: DEFI,
      stats: stats, muted: muted, enemyStart: enemyStart, tuto: tuto, cible: cible(t), finT: finT, seed: seed, busy: busy(),
      segs: function () { var o = []; for (var k = 0; k <= P.len; k++) { segAt(k); o.push([SPX, SPY]); } return o; }
    };
  }

  return { reset: reset, update: update, draw: draw, drawTop: drawTop, tension: tension, dbg: dbg };
})();
