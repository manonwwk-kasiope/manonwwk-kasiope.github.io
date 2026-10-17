/* Amorçage : boucle, pas fixe, entrées, redimensionnement, cycle de vie, quarantaine des erreurs.
   Propriétaire : lot 1. Le lot 0b l'a adapté au contrat 1.0 (CONTRAT.md § 3, 9, 10 et 16) en gardant les
   acquis de la démo (manche flottant à doigt propriétaire et origine qui suit, zone sûre, taille du pixel,
   pause en arrière-plan, quarantaine) :
     - LE TEMPS : N.horloge.image(dtReel) donne le nombre de pas fixes de 1/120 s (au plus 4) ; chaque pas
       appelle N.game.update(dtMonde), puis N.fx.update et N.cam.update. S.t vient de N.horloge.t() ;
     - LES ENTRÉES : S.input étendu (manche, boost tenu, pouvoir, apogee, pause, valider, retour, chiffre,
       car, pointer, manette, gestes et taps en px du tampon) ; les drapeaux d'un pas sont vidés après les pas ;
       les gestes du second doigt sont classés ici (repli simple de REFONTE.md § 2.16, N.R.gestes) ;
     - L'ORDRE DE DESSIN du § 9 : décor lointain, monde à l'origine de la caméra, explosions, dessus,
       crochet de mort (remappage), écran ;
     - les crochets __DT, __SEED, __FRAME, __NODRAW et ?nodraw, ?scene=nom, ?journal=1 (socle).
   Seul module autorisé à lire performance.now et Date, et à poser des écouteurs du DOM. Il fonctionne même
   si les autres modules n'existent pas : chaque étape est optionnelle et protégée. */

var N = (typeof window !== 'undefined' && window.__N) || {};
if (typeof window !== 'undefined') window.__N = N;

/* ---- état partagé ---- */
var S = {
  t: 0, dt: 0, frame: 0, phase: 'intro', seed: 2975, rngState: 2975,
  shake: 0, heat: 0, tension: 0, paused: false,
  enemies: [], shots: [], tele: [], player: null, death: null,
  view: { w: 0, h: 0, safe: { l: 0, t: 0, r: 0, b: 0 } },
  perf: { p50: 0, p90: 0, p95: 0, p99: 0, niveau: 'riche' }, jour: 20261017,
  input: { x: 0, y: 0, mag: 0, boost: false, pouvoir: false, apogee: false, pause: false, valider: false, retour: false,
    chiffre: 0, car: '', any: false, pointer: { x: 0, y: 0, actif: false, boutons: 0 },
    manette: { connectee: false, x: 0, y: 0, boutons: 0 }, gestes: [], taps: [], fire: false }
};
N.S = S;

/* N.rnd : alias du flux 'jeu' pour le code repris de la démo (interdit dans le code neuf, CONTRAT.md § 4) */
function rnd() { return N.rng ? N.rng('jeu').f() : 0; }
N.rnd = rnd; N.rndR = function (a, b) { return a + (b - a) * rnd(); }; N.rndI = function (a, b) { return a + ((rnd() * (b - a + 1)) | 0); };
N.reseed = function (s) { S.seed = s | 0; S.rngState = s | 0 || 1; };

/* ---- quarantaine : une erreur est comptée une fois par signature, la boucle survit ---- */
var ERR = { count: 0, sigs: {} };
if (typeof window !== 'undefined') window.__ERR = ERR;
function errLog(where, e) {
  var sig = where + '|' + ((e && e.message) || String(e));
  if (!ERR.sigs[sig]) { ERR.sigs[sig] = 0; try { console.error('[' + where + ']', e); } catch (x) {} }
  ERR.sigs[sig]++; ERR.count++;
}
function step(where, fn) { if (!fn) return; try { fn(); } catch (e) { errLog(where, e); } }

/* ---- palette de secours : remplacée par 00-pal.js dès qu'il existe ---- */
var FALLBACK = ['#0d0221', '#190b28', '#241734', '#541388', '#2d1b69', '#ff2a6d', '#ff8fab', '#05d9e8',
  '#d1f7ff', '#ff9e00', '#ffd319', '#ff5714', '#fffce8', '#8a8fa3', '#8b0f3a', '#01012b'];
function palTable() { return (N.pal && N.pal.C) || FALLBACK; }

/* ---- sortie ---- */
var out = null, octx = null;

function resize() {
  if (!out) return;
  var cssW = Math.max(1, window.innerWidth | 0), cssH = Math.max(1, window.innerHeight | 0);
  var dpr = 1;                                  // un pixel de jeu est un carré net : jamais de DPR ici
  out.style.width = cssW + 'px'; out.style.height = cssH + 'px';
  if (N.gfx && N.gfx.resize) {
    /* la zone sûre (encoche, barre d'accueil) est passée à gfx.resize, qui en tire la taille du pixel */
    var sa = safeArea();
    var r = N.gfx.resize(cssW, cssH, Math.max(1, cssW - sa.l - sa.r), Math.max(1, cssH - sa.t - sa.b));
    /* le canvas fait EXACTEMENT tampon x px en CSS, centré, quitte à déborder de moins d'un pixel de
       jeu : sinon le navigateur le réduit d'un facteur non entier et ampute une rangée de pixels */
    var ow = r.w * r.px, oh = r.h * r.px;
    out.style.width = ow + 'px'; out.style.height = oh + 'px';
    out.style.left = Math.floor((cssW - ow) / 2) + 'px'; out.style.top = Math.floor((cssH - oh) / 2) + 'px';
    out.width = Math.round(ow * dpr); out.height = Math.round(oh * dpr);
    S.view.w = r.w; S.view.h = r.h;
    S.view.safe = { l: Math.ceil(sa.l / r.px), t: Math.ceil(sa.t / r.px), r: Math.ceil(sa.r / r.px), b: Math.ceil(sa.b / r.px) };
  } else {
    out.width = cssW; out.height = cssH; S.view.w = cssW; S.view.h = cssH;
  }
  if (octx) octx.imageSmoothingEnabled = false;
}

/* marges sûres de l'écran (encoche, barre d'accueil), lues sur une sonde CSS env(safe-area-inset-*) */
var sonde = null;
function safeArea() {
  if (!sonde) {
    sonde = document.createElement('div');
    sonde.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
      + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(sonde);
  }
  var cs = getComputedStyle(sonde);
  return { l: parseFloat(cs.paddingLeft) || 0, t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0 };
}

/* ---- motif de contrôle : visible tant qu'aucun module ne dessine ---- */
function mire() {
  if (!octx) return;
  var C = palTable(), w = out.width, h = out.height, n = C.length, bw = Math.max(1, (w / n) | 0);
  for (var i = 0; i < n; i++) { octx.fillStyle = C[i]; octx.fillRect(i * bw, 0, bw, h); }
  octx.fillStyle = C[12];
  octx.font = '16px ui-monospace,monospace';
  octx.fillText('SNAKE 2975 — en construction', 12, 24);
}

/* ---- conversions : pixels CSS du client -> pixels du tampon ---- */
function versTampon(cx, cy, o) {
  var p = (N.gfx && N.gfx.PX) || 1, r = out ? out.getBoundingClientRect() : { left: 0, top: 0 };
  o.x = (cx - r.left) / p; o.y = (cy - r.top) / p;
  return o;
}
var TB = { x: 0, y: 0 };
function reel() { return N.horloge && N.horloge.reel ? N.horloge.reel() : 0; }
function poserTap(cx, cy, t0, doigt) {
  var T = S.input.taps; if (T.length >= 16) return;
  versTampon(cx, cy, TB);
  T.push({ x: TB.x, y: TB.y, t0: t0, t1: reel(), doigt: doigt });
}

/* ---- le clavier (N.R.controles.clavier) ---- */
var keys = {};
function codes(nom, defaut) { var c = N.R && N.R.controles && N.R.controles.clavier && N.R.controles.clavier[nom]; return c || defaut; }
function tenu(nom, defaut) { var L = codes(nom, defaut); for (var i = 0; i < L.length; i++) if (keys[L[i]]) return true; return false; }
function est(code, nom, defaut) { return codes(nom, defaut).indexOf(code) >= 0; }
function onKey(e, down) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (down && e.repeat) { if (e.cancelable) e.preventDefault(); return; }
  keys[e.code] = down;
  var inp = S.input;
  if (down) inp.any = true;
  var l = tenu('gauche', ['ArrowLeft', 'KeyA', 'KeyQ']), r = tenu('droite', ['ArrowRight', 'KeyD']);
  var u = tenu('haut', ['ArrowUp', 'KeyW', 'KeyZ']), d = tenu('bas', ['ArrowDown', 'KeyS']);
  var kx = (r ? 1 : 0) - (l ? 1 : 0), ky = (d ? 1 : 0) - (u ? 1 : 0);
  if (kx || ky) { var m = Math.sqrt(kx * kx + ky * ky); inp.x = kx / m; inp.y = ky / m; inp.mag = 1; clavierDir = true; }
  else if (clavierDir) { inp.mag = 0; clavierDir = false; }
  inp.boost = tenu('boost', ['Space']) || boostDoigt || boostSouris;
  inp.fire = inp.boost;
  if (down) {
    if (est(e.code, 'pouvoir', ['KeyE'])) inp.pouvoir = true;
    if (est(e.code, 'apogee', ['KeyR'])) inp.apogee = true;
    if (est(e.code, 'pause', ['KeyP', 'Escape'])) inp.pause = true;
    if (est(e.code, 'valider', ['Enter'])) inp.valider = true;
    if (est(e.code, 'retour', ['Escape', 'Backspace'])) inp.retour = true;
    var ch = codes('chiffres', ['Digit1', 'Digit2', 'Digit3', 'Digit4']).indexOf(e.code);
    if (ch >= 0) inp.chiffre = ch + 1;
    if (e.key && e.key.length === 1 && /[a-zA-Z]/.test(e.key) && inp.car.length < 8) inp.car += e.key.toUpperCase();
    if (e.code === 'Space' || e.code === 'Enter') gesture();
    e.preventDefault();
  }
}
var clavierDir = false;

/* Au doigt : manche virtuel flottant (repris de la démo). Il naît là où le pouce se pose, n'importe où sur
   l'écran, et reste invisible au repos. La direction est le vecteur depuis ce point d'origine ; l'origine suit
   le pouce quand il dépasse le rayon. Le doigt est suivi par son identifiant : un second doigt ne vole jamais
   la direction. Le second doigt fait les gestes : toucher (pouvoir), glissé (APOGÉE), tenu (accélération). */
function rayon() { var J = N.R && N.R.joueuse, k = (S.reglages && S.reglages.manche) || 1; return ((J && J.courseCSS) || 44) * k; }
var STICK_MORT = 0.08;
var stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, t0: 0, x0: 0, y0: 0 };
var second = { id: null, x0: 0, y0: 0, x: 0, y: 0, t0: 0, tenu: false };
var boostDoigt = false, boostSouris = false;
S.input.stick = { active: false, ox: 0, oy: 0, x: 0, y: 0, r: 44 };    // pixels CSS, pour l'indicateur
function stickUpdate() {
  var st = S.input.stick, R0 = rayon();
  st.active = stick.id !== null; st.ox = stick.ox; st.oy = stick.oy; st.x = stick.x; st.y = stick.y; st.r = R0;
  if (!st.active) { if (!clavierDir) S.input.mag = 0; return; }
  var dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy), a = Math.min(1, m / R0);
  if (a < STICK_MORT) { S.input.mag = 0; return; }        // la dernière direction est gardée
  S.input.x = dx / m; S.input.y = dy / m; S.input.mag = a;
}
function bord() { var g = N.R && N.R.gestes; return (g && g.bordPt) || 20; }
function onTouchStart(e) {
  S.input.any = true; gesture();
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (stick.id === null) {
      var b = bord(), W0 = window.innerWidth, H0 = window.innerHeight;
      stick.id = t.identifier; stick.t0 = reel(); stick.x0 = t.clientX; stick.y0 = t.clientY;
      stick.ox = Math.max(b, Math.min(W0 - b, t.clientX)); stick.oy = Math.max(b, Math.min(H0 - b, t.clientY));
      stick.x = t.clientX; stick.y = t.clientY;
      stickUpdate();
    } else if (second.id === null) {
      second.id = t.identifier; second.x0 = second.x = t.clientX; second.y0 = second.y = t.clientY; second.t0 = reel(); second.tenu = false;
    }
  }
  if (e.cancelable) e.preventDefault();
}
function onTouchMove(e) {
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (t.identifier === stick.id) {
      stick.x = t.clientX; stick.y = t.clientY;
      var R0 = rayon(), dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy);
      if (m > R0) { stick.ox = stick.x - dx / m * R0; stick.oy = stick.y - dy / m * R0; }
      stickUpdate();
    } else if (t.identifier === second.id) { second.x = t.clientX; second.y = t.clientY; }
  }
  if (e.cancelable) e.preventDefault();
}
function onTouchEnd(e) {
  var G0 = (N.R && N.R.gestes) || { toucher: { duree: 0.18, deplacementPt: 10 }, glisse: { distancePt: 24 } };
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (t.identifier === stick.id) {
      var dep = Math.hypot(t.clientX - stick.x0, t.clientY - stick.y0);
      if (dep < G0.toucher.deplacementPt) poserTap(t.clientX, t.clientY, stick.t0, 'manche');
      stick.id = null; stickUpdate();
    } else if (t.identifier === second.id) {
      var d2 = reel() - second.t0, dd = Math.hypot(t.clientX - second.x0, t.clientY - second.y0), genre = 'autre', action = 'aucune';
      if (dd >= G0.glisse.distancePt) { genre = 'glisse'; action = 'apogee'; S.input.apogee = true; }
      else if (second.tenu) { genre = 'tenu'; action = 'boost'; }
      else if (d2 <= G0.toucher.duree && dd < G0.toucher.deplacementPt) { genre = 'toucher'; action = 'pouvoir'; S.input.pouvoir = true; }
      if (genre !== 'autre' && S.input.gestes.length < 8) {
        versTampon(second.x0, second.y0, TB);
        S.input.gestes.push({ genre: genre, doigt: 'action', t0: second.t0, t1: reel(), x: TB.x, y: TB.y, dx: (t.clientX - second.x0) / ((N.gfx && N.gfx.PX) || 1), dy: (t.clientY - second.y0) / ((N.gfx && N.gfx.PX) || 1) });
      }
      if (N.journal) N.journal('geste', { genre: genre, doigt: 'action', duree: Math.max(0, d2), deplacement: dd, action: action });
      poserTap(t.clientX, t.clientY, second.t0, 'action');
      second.id = null; second.tenu = false; boostDoigt = false; S.input.boost = tenu('boost', ['Space']) || boostSouris;
    }
  }
  if (e.type === 'touchend') gesture();                 // pour le toucher, seul touchend vaut geste (MDN)
  if (e.cancelable) e.preventDefault();
}
/* le second doigt tenu au-delà de N.R.gestes.tenu.duree, sans bouger : accélération tant qu'il est posé */
function secondTenu() {
  if (second.id === null) return;
  var G0 = (N.R && N.R.gestes) || { tenu: { duree: 0.18, deplacementPt: 24 } };
  if (!second.tenu && reel() - second.t0 >= G0.tenu.duree && Math.hypot(second.x - second.x0, second.y - second.y0) < G0.tenu.deplacementPt) second.tenu = true;
  if (second.tenu) { boostDoigt = true; S.input.boost = true; }
}
/* la souris : position et boutons (N.R.controles.souris) ; un clic est un tap 'bouton' */
var souris = { t0: 0, x0: 0, y0: 0 };
function onPointer(e, quoi) {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  var p = S.input.pointer;
  versTampon(e.clientX, e.clientY, TB); p.x = TB.x; p.y = TB.y; p.actif = true; p.boutons = e.buttons | 0;
  var Sm = (N.R && N.R.controles && N.R.controles.souris) || { boost: 0, pouvoir: 2, apogee: 1 };
  if (quoi === 'down') {
    souris.t0 = reel(); souris.x0 = e.clientX; souris.y0 = e.clientY; S.input.any = true;
    if (e.button === Sm.pouvoir) S.input.pouvoir = true;
    if (e.button === Sm.apogee) S.input.apogee = true;
  } else if (quoi === 'up') {
    if (e.button === 0 && Math.hypot(e.clientX - souris.x0, e.clientY - souris.y0) < 10) poserTap(e.clientX, e.clientY, souris.t0, 'bouton');
  }
}
/* la manette : lue à chaque image (N.R.controles.manette) */
var manPrec = 0;
function lireManette() {
  var m = S.input.manette, pads = null;
  try { pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : null; } catch (e) { pads = null; }
  var gp = null;
  if (pads) for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; }
  if (!gp) { m.connectee = false; m.x = 0; m.y = 0; m.boutons = 0; return; }
  var b = 0; for (var k = 0; k < gp.buttons.length && k < 30; k++) if (gp.buttons[k] && gp.buttons[k].pressed) b |= (1 << k);
  m.connectee = true; m.x = gp.axes[0] || 0; m.y = gp.axes[1] || 0; m.boutons = b;
  var mag = Math.hypot(m.x, m.y), dz = (N.R && N.R.joueuse && N.R.joueuse.dz) || 0.12, C = (N.R && N.R.controles && N.R.controles.manette) || {};
  if (mag > dz) { S.input.x = m.x / mag; S.input.y = m.y / mag; S.input.mag = Math.min(1, mag); }
  var neuf = b & ~manPrec;
  function un(L) { if (!L) return false; for (var q = 0; q < L.length; q++) if (neuf & (1 << L[q])) return true; return false; }
  function tenuM(L) { if (!L) return false; for (var q = 0; q < L.length; q++) if (b & (1 << L[q])) return true; return false; }
  if (tenuM(C.boost)) S.input.boost = true;
  if (un(C.pouvoir)) S.input.pouvoir = true;
  if (un(C.apogee)) S.input.apogee = true;
  if (un(C.pause)) S.input.pause = true;
  if (un(C.valider)) { S.input.valider = true; S.input.any = true; }
  if (un(C.retour)) S.input.retour = true;
  manPrec = b;
}
/* l'indicateur du manche : un anneau tramé à l'origine et un point sous le pouce, en couleurs d'interface */
function drawStick() {
  var st = S.input.stick, p = N.gfx.PX || 1, r = out.getBoundingClientRect();
  var ox = Math.round((st.ox - r.left) / p), oy = Math.round((st.oy - r.top) / p);
  N.gfx.ring(ox, oy, Math.max(4, Math.round(st.r / p)), N.pal.i('acier'), 0.5);
  N.gfx.circ(Math.round((st.x - r.left) / p), Math.round((st.y - r.top) / p), 2, N.pal.i('os'));
}
/* chaque geste débloque les vidéos préparées depuis le précédent ; le premier lance aussi le son */
var audioStarted = false;
function gesture() {
  step('art.unlock', N.art && N.art.unlock ? function () { N.art.unlock(); } : null);
  S.paused = false;                                      // un retour d'arrière-plan reprend au premier geste
  /* un touchstart ne vaut pas geste pour l'iPhone : le contexte audio créé là peut rester suspendu,
     le touchend suivant le relance */
  if (audioStarted) { step('music.resume', N.music && N.music.resume ? function () { N.music.resume(); } : null); return; }
  audioStarted = true;
  /* sur iPhone, un AudioContext est « ambient » par défaut : l'interrupteur silencieux le coupe, et la
     joueuse croirait la musique cassée. « playback » le fait jouer comme une vidéo ; le jeu offre sa
     propre coupure du son. */
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  step('music.init', N.music && N.music.init ? function () { N.music.init(); N.music.start(); } : null);
}

/* ---- le crochet de mort : le monde en nuit et ardoise (CONTRAT.md § 9, étape 6) ---- */
var LUT_MORT = null;
function lutMort() {
  if (LUT_MORT || !N.pal || !N.pal.L) return LUT_MORT;
  LUT_MORT = new Uint8Array(16);
  var nuit = N.pal.i('nuit'), ardoise = N.pal.i('ardoise');
  for (var i = 0; i < 16; i++) LUT_MORT[i] = i === 0 ? 0 : (N.pal.L[i] < 0.03 ? nuit : ardoise);
  return LUT_MORT;
}

/* ---- mesure : le coût de l'image, p50 à p99 sur les 120 dernières ---- */
var PERF = new Float32Array(120), PERF2 = new Float32Array(120), perfN = 0;
function perfNote(ms) {
  PERF[perfN % 120] = ms; perfN++;
  if (perfN % 30 !== 0) return;
  var n = Math.min(perfN, 120);
  PERF2.set(PERF); var v = PERF2.subarray(0, n); v.sort();
  S.perf.p50 = v[(n * 0.5) | 0]; S.perf.p90 = v[(n * 0.9) | 0]; S.perf.p95 = v[Math.min(n - 1, (n * 0.95) | 0)]; S.perf.p99 = v[Math.min(n - 1, (n * 0.99) | 0)];
  S.perf.niveau = (N.crt && N.crt.stats && N.crt.stats.mode) || 'riche';
}

/* ---- boucle ---- */
var last = 0, NODRAW = false, maintenant = function () { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0; };
function viderUnPas() {
  var inp = S.input;
  inp.pouvoir = false; inp.apogee = false; inp.pause = false; inp.valider = false; inp.retour = false;
  inp.chiffre = 0; inp.car = ''; inp.any = false; inp.gestes.length = 0; inp.taps.length = 0;
}
function etat() { return N.game && N.game.etat ? N.game.etat() : 'jeu'; }
function frame(now) {
  requestAnimationFrame(frame);
  var t0 = maintenant();
  var dt = last ? (now - last) / 1000 : 1 / 60;
  last = now;
  if (typeof window !== 'undefined' && window.__DT) dt = window.__DT;
  if (dt > 0.25) dt = 0.25;
  if (dt < 0) dt = 0;
  S.frame++;
  if (typeof window !== 'undefined') window.__FRAME = S.frame;

  /* 1-3. le temps, les entrées, les pas fixes */
  step('manette', lireManette);
  secondTenu();
  var n = N.horloge ? N.horloge.image(dt) : 1;
  for (var k = 0; k < n; k++) {
    var dm = N.horloge ? N.horloge.avancer() : dt;
    S.t = N.horloge ? N.horloge.t() : S.t + dm; S.dt = dm;
    step('game.update', N.game && N.game.update ? function () { N.game.update(dm); } : null);
    step('fx.update', N.fx && N.fx.update ? function () { N.fx.update(dm); } : null);
    step('cam.update', N.cam && N.cam.update ? function () { N.cam.update(dm); } : null);
    if (k === 0) viderUnPas();
  }
  if (N.game && N.game.tension) step('tension', function () {
    S.tension = N.game.tension();
    if (N.music && N.music.tension) N.music.tension(S.tension);
  });

  var nodraw = NODRAW || (typeof window !== 'undefined' && window.__NODRAW);
  var drew = false;
  if (!nodraw && N.gfx && N.gfx.clear) {
    var e = etat(), d = N.ids && N.ids.tableEtats ? N.ids.tableEtats[e] : null, cam = N.cam || { x: 0, y: 0 };
    var G = N.gfx;
    step('gfx.clear', function () { G.clear(0); if (G.origin) G.origin(0, 0); });
    /* 4. le décor lointain (ou LE VOL, qui remplace 4 à 6) */
    if (e === 'vol') step('vol.draw', N.vol && N.vol.draw ? function () { N.vol.draw(); } : null);
    else {
      if (!(d && d.plein)) step('decor.drawFar', N.decor && N.decor.drawFar ? function () { N.decor.drawFar(cam); } : null);
      /* 5. le monde, à l'origine de la caméra */
      step('origin', G.origin ? function () { G.origin(cam.x, cam.y); } : null);
      step('game.draw', N.game && N.game.draw ? function () { N.game.draw(); drew = true; } : null);
      step('fx.draw', N.fx && N.fx.draw ? function () { N.fx.draw(); } : null);
      step('game.drawTop', N.game && N.game.drawTop ? function () { N.game.drawTop(); } : null);
      /* 6. le crochet de mort : le monde remappé, puis la joueuse et la cause par-dessus */
      if (e === 'mort') step('mort', function () {
        var L = lutMort(); if (L && G.remap) G.remap(L);
        if (N.joueuse && N.joueuse.drawTop) N.joueuse.drawTop();
        if (N.scene && N.scene.drawCause) N.scene.drawCause();
      });
    }
    /* 7. l'écran */
    step('origin0', G.origin ? function () { G.origin(0, 0); } : null);
    step('fx.drawEcran', N.fx && N.fx.drawEcran ? function () { N.fx.drawEcran(); } : null);
    if (N.intro && N.intro.draw && (e === 'ouverture' || e === 'panneau' || e === 'fin' || e === 'initiales' || e === 'briefing' || e === 'plongee' || e === 'titre' || e === 'demarrage'))
      step('intro.draw', function () { N.intro.draw(); });
    step('hud.draw', N.hud && N.hud.draw ? function () { N.hud.draw(); } : null);
    step('ui.draw', N.ui && N.ui.draw ? function () { N.ui.draw(); } : null);
    if (S.input.stick.active) step('stick.draw', G.ring && N.pal && N.pal.i ? drawStick : null);
    /* 8. la sortie : le tube relit le tampon et compose seul */
    var tube = !!(N.crt && N.crt.apply && !N.crt.off);
    step('gfx.present', function () { G.present(tube ? { skipScale: true } : undefined); drew = true; });
    if (tube) step('crt.apply', function () { N.crt.apply(dt); });
  }
  if (!drew && !nodraw) step('mire', mire);

  /* décroissance des secousses après lecture par le post-traitement */
  if (S.shake > 0) { S.shake *= Math.pow(0.001, dt); if (S.shake < 0.05) S.shake = 0; }
  if (S.heat > 0) { S.heat *= Math.pow(0.02, dt); if (S.heat < 0.01) S.heat = 0; }
  perfNote(maintenant() - t0);
}

function boot() {
  out = document.getElementById('out');
  if (!out) { errLog('boot', new Error('canvas #out absent')); return; }
  octx = out.getContext('2d', { alpha: false });
  var q = (typeof location !== 'undefined' && location.search) || '';
  if (typeof window !== 'undefined') {
    window.__S = S; window.__PAL = palTable();
    if (window.__SEED) N.reseed(window.__SEED);
  }
  NODRAW = /[?&]nodraw\b/.test(q);
  try { var dj = new Date(); S.jour = dj.getFullYear() * 10000 + (dj.getMonth() + 1) * 100 + dj.getDate(); } catch (e) { /* S.jour par défaut */ }
  step('gfx.init', N.gfx && N.gfx.init ? function () { N.gfx.init(out); } : null);
  step('art.load', N.art && N.art.load ? function () { N.art.load(); } : null);
  step('music.load', N.music && N.music.load ? function () { N.music.load({ base: typeof MUSIQUE_BASE !== 'undefined' ? MUSIQUE_BASE : 'musique/' }); } : null);
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('keydown', function (e) { onKey(e, true); }, { passive: false });
  window.addEventListener('keyup', function (e) { onKey(e, false); });
  var app = document.getElementById('app') || window;
  app.addEventListener('touchstart', onTouchStart, { passive: false });
  app.addEventListener('touchmove', onTouchMove, { passive: false });
  app.addEventListener('touchend', onTouchEnd, { passive: false });
  app.addEventListener('touchcancel', onTouchEnd, { passive: false });
  /* en arrière-plan : le jeu se met en pause (79-jeu passe à l'état 'pause'), le son s'endort ; au retour, le
     son reprend et le jeu attend un toucher */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      S.paused = true; keys = {}; stick.id = null; second.id = null; boostDoigt = false; stickUpdate();
      step('music.suspend', N.music && N.music.suspend ? function () { N.music.suspend(); } : null);
    } else step('music.resume', N.music && N.music.resume ? function () { N.music.resume(); } : null);
  });
  app.addEventListener('pointerdown', function (e) { onPointer(e, 'down'); gesture(); });
  app.addEventListener('pointerup', function (e) { onPointer(e, 'up'); gesture(); });
  app.addEventListener('pointermove', function (e) { onPointer(e, 'move'); });
  app.addEventListener('click', gesture);
  app.addEventListener('contextmenu', function (e) { if (e.cancelable) e.preventDefault(); });
  window.addEventListener('blur', function () { keys = {}; stick.id = null; second.id = null; boostDoigt = false; stickUpdate(); S.input.boost = false; S.input.fire = false; });

  /* l'ouverture n'est plus lancée ici : 79-jeu l'ouvre en entrant dans l'état 'ouverture' */
  step('game.reset', N.game && N.game.reset ? function () { N.game.reset(S.seed); } : null);
  var sc = /[?&]scene=([a-zA-Z0-9]+)/.exec(q);
  if (sc) step('scene', N.game && N.game.dbg && N.game.dbg.scene ? function () { N.game.dbg.scene(sc[1]); } : null);
  requestAnimationFrame(frame);
}
