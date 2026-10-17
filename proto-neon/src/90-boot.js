/* Amorçage : horloge, redimensionnement, entrées, boucle d'images, quarantaine des erreurs.
   Seul module autorisé à lire performance.now et à toucher au DOM hors interface.
   Il fonctionne même si les autres modules n'existent pas encore : chaque étape est optionnelle et
   protégée, pour qu'un module en cours d'écriture puisse être vu à l'écran sans attendre les autres. */

var N = (typeof window !== 'undefined' && window.__N) || {};
if (typeof window !== 'undefined') window.__N = N;

/* ---- état partagé ---- */
var S = {
  t: 0, dt: 0, frame: 0, phase: 'intro', seed: 2084, rngState: 2084,
  shake: 0, heat: 0, score: 0, lives: 3, tension: 0,
  enemies: [], player: null, challenge: null, paused: false,
  view: { w: 0, h: 0, safe: { l: 0, t: 0, r: 0, b: 0 } },
  /* le coût de l'image sur les 120 dernières (ms) et le préréglage courant du tube (repris du lot L1) */
  perf: { p50: 0, p90: 0, p95: 0, p99: 0, niveau: 'riche' },
  /* REFONTE § 7.8 : boost, pouvoir, apogee (vrais pendant un pas, vidés après la mise à jour), gestes et taps (vidés après la mise à jour) */
  input: {
    x: 0, y: 0, mag: 0, fire: false, any: false, boost: false, pouvoir: false, apogee: false, gestes: [], taps: [],
    /* § 7.8 : vrais pendant UN pas (vidés après la mise à jour) ; chiffre 1..4 ou 0 ; car = lettres tapées pendant l'image */
    pause: false, valider: false, retour: false, chiffre: 0, car: '',
    pointer: { x: 0, y: 0, actif: false, boutons: 0 },                 // souris, en px ÉCRAN
    manette: { connectee: false, x: 0, y: 0, boutons: 0 }              // → demandes.md : lecture de navigator.getGamepads pas encore faite
  },
};
N.S = S;

/* générateur à graine : aucun Math.random dans tout le prototype */
function rnd() { S.rngState = (S.rngState * 1664525 + 1013904223) % 4294967296; return S.rngState / 4294967296; }
function rndR(a, b) { return a + (b - a) * rnd(); }
function rndI(a, b) { return a + ((rnd() * (b - a + 1)) | 0); }
N.rnd = rnd; N.rndR = rndR; N.rndI = rndI;
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
  octx.fillText('modules : ' + Object.keys(N).filter(function (k) { return k !== 'S'; }).join(' '), 12, 44);
}

/* ---- entrées : un seul point d'entrée, clavier et doigt ---- */
var keys = {};
function onKey(e, down) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.repeat) return;
  keys[e.code] = down;
  if (down) S.input.any = true;
  var l = keys.ArrowLeft || keys.KeyA || keys.KeyQ, r = keys.ArrowRight || keys.KeyD;
  var u = keys.ArrowUp || keys.KeyW || keys.KeyZ, d = keys.ArrowDown || keys.KeyS;
  S.input.x = (r ? 1 : 0) - (l ? 1 : 0); S.input.y = (d ? 1 : 0) - (u ? 1 : 0);
  S.input.mag = (S.input.x || S.input.y) ? 1 : 0;
  S.input.fire = !!(keys.Space || keys.KeyK);
  if (down) clavierMenus(e);
  if (down && (e.code === 'Space' || e.code === 'Enter')) gesture();
  if (down) e.preventDefault();
}
/* § 2.15 : Entrée et Espace valident, Échap et Retour arrière reviennent, P met en pause, 1 à 4 choisissent une carte ;
   les lettres tapées s'accumulent dans car (initiales). Chaque champ ne dure qu'un pas (entreeFin). */
function clavierMenus(e) {
  var c = e.code, m = /^(?:Digit|Numpad)([1-4])$/.exec(c);
  if (c === 'Space' || c === 'Enter' || c === 'NumpadEnter') S.input.valider = true;
  else if (c === 'Escape' || c === 'Backspace') S.input.retour = true;
  else if (c === 'KeyP') S.input.pause = true;
  if (m) S.input.chiffre = +m[1];
  if (e.key && e.key.length === 1 && /[A-Za-z0-9]/.test(e.key) && S.input.car.length < 8) S.input.car += e.key.toUpperCase();
}
/* souris (§ 2.15) : le curseur en px ÉCRAN ; un clic gauche relâché est un tap (les écrans et les boutons du HUD le lisent) */
function sourisMaj(e, actif) {
  var p = S.input.pointer;
  pxEcran(e.clientX, e.clientY, p);
  if (actif !== undefined) p.actif = actif;
  p.boutons = e.buttons | 0;
}
function onPointer(e) {
  if (e.pointerType !== 'mouse') return;                 // le doigt passe par les événements tactiles (§ 2.16)
  if (e.type === 'pointerdown') { sourisMaj(e, true); S.input.any = true; }
  else if (e.type === 'pointermove') sourisMaj(e);
  else if (e.type === 'pointerup' || e.type === 'pointercancel') {
    sourisMaj(e, false);
    if (e.type === 'pointerup' && e.button === 0) {
      var o = { x: 0, y: 0, t0: performance.now() - 80, t1: performance.now(), doigt: 'action' };
      pxEcran(e.clientX, e.clientY, o); S.input.taps.push(o);
    }
  }
}
/* Au doigt : manche virtuel flottant, le standard des jeux d'action sur téléphone (recherche/
   jouabilite-mobile.md). Il naît là où le pouce se pose, n'importe où sur l'écran, et reste invisible
   au repos. La direction est le vecteur depuis ce point d'origine ; l'origine suit le pouce quand il
   dépasse le rayon, pour qu'un demi-tour soit immédiat. Le doigt est suivi par son identifiant : un
   second doigt qui se pose ou se lève ne vole jamais la direction. */
var STICK_R = 44, STICK_MORT = 0.08;             // rayon en pixels CSS et zone morte : non sourcés, à régler au jury
var stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
S.input.stick = { active: false, ox: 0, oy: 0, x: 0, y: 0, r: STICK_R };   // pixels CSS, pour l'indicateur
function stickUpdate() {
  var st = S.input.stick;
  st.active = stick.id !== null; st.ox = stick.ox; st.oy = stick.oy; st.x = stick.x; st.y = stick.y;
  if (!st.active) { S.input.mag = 0; return; }
  var dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy), a = Math.min(1, m / STICK_R);
  if (a < STICK_MORT) { S.input.mag = 0; return; }        // la dernière direction est gardée
  S.input.x = dx / m; S.input.y = dy / m; S.input.mag = a;
}
/* ---- § 2.16 : un geste, une action, aucune confusion ----
   Le manche est le premier doigt posé. Un doigt posé pendant que le manche est tenu depuis au moins 150 ms est un
   doigt d'action ; posé avant, il attend (si le manche se lève il devient le manche, sinon il n'est rien). Le doigt
   d'action est classé UNE fois, au premier de trois instants : TOUCHER (relevé en moins de 180 ms, déplacé de moins
   de 10 pt : pouvoir), GLISSÉ (24 pt ou plus en moins de 220 ms : apogée, dès le seuil), TENU (encore posé à 180 ms,
   moins de 24 pt : boost tant qu'il reste posé). Tout autre geste ne fait rien. Unités : les seuils en pt (px CSS) ;
   x, y des gestes et des taps en px ÉCRAN (pixels du tampon), dx, dy en pt. Chiffres de § 2.16, → N.R.entree. */
var G_ATTENTE = 150, G_TOUCHER_T = 180, G_TOUCHER_D = 10, G_GLISSE_D = 24, G_GLISSE_T = 220, G_BORD = 20, G_TAP_T = 300;   // ms, pt
var doigts = [], stickT0 = 0;
function doigtDe(id) { for (var i = 0; i < doigts.length; i++) if (doigts[i].id === id) return doigts[i]; return null; }
function retirer(d) { var i = doigts.indexOf(d); if (i >= 0) doigts.splice(i, 1); }
function deplace(d) { return Math.hypot(d.x - d.x0, d.y - d.y0); }
function pxEcran(cx, cy, o) {
  var r = out ? out.getBoundingClientRect() : { left: 0, top: 0 }, p = (N.gfx && N.gfx.PX) || 1;
  o.x = Math.round((cx - r.left) / p); o.y = Math.round((cy - r.top) / p);
  return o;
}
function geste(genre, d, t1) {
  var o = { genre: genre, doigt: 'action', t0: d.t0, t1: t1, x: 0, y: 0, dx: d.x - d.x0, dy: d.y - d.y0 };
  pxEcran(d.x0, d.y0, o);
  S.input.gestes.push(o);
}
function tap(d, t1) {
  var o = { x: 0, y: 0, t0: d.t0, t1: t1, doigt: d.role === 'manche' ? 'manche' : 'action' };
  pxEcran(d.x, d.y, o);
  S.input.taps.push(o);
}
function prendreManche(d, now) {
  /* l'origine ne naît jamais à moins de 20 pt des bords gauche, droit et bas de la zone sûre : décalée vers l'intérieur */
  var sa = safeArea(), W = window.innerWidth, H = window.innerHeight;
  var ox = Math.min(Math.max(d.x, sa.l + G_BORD), Math.max(sa.l + G_BORD, W - sa.r - G_BORD));
  var oy = Math.min(d.y, Math.max(0, H - sa.b - G_BORD));
  d.role = 'manche';
  stick.id = d.id; stick.ox = ox; stick.oy = oy; stick.x = d.x; stick.y = d.y;
  stickT0 = now;
  stickUpdate();
}
/* à chaque image, avant la mise à jour : les doigts qui attendent, et le TENU */
function entreeUpdate() {
  if (!doigts.length) return;
  var now = performance.now(), boost = false;
  for (var i = 0; i < doigts.length; i++) {
    var d = doigts[i];
    if (d.role === 'attente' && stick.id !== null && now - stickT0 >= G_ATTENTE) d.role = 'rien';
    if (d.role !== 'action') continue;
    if (d.classe === null && now - d.t0 >= G_TOUCHER_T) { d.classe = 'tenu'; geste('tenu', d, now); }
    if (d.classe === 'tenu') boost = true;
  }
  S.input.boost = boost;
}
/* après la mise à jour : un pas de pouvoir ou d'apogée, et les listes d'événements, ne durent qu'une image */
function entreeFin() {
  var I = S.input;
  I.pouvoir = false; I.apogee = false;
  I.pause = false; I.valider = false; I.retour = false; I.chiffre = 0; I.car = '';
  I.gestes.length = 0; I.taps.length = 0;
}
function entreeRaz() {
  doigts.length = 0; S.input.boost = false; S.input.pouvoir = false; S.input.apogee = false; S.input.gestes.length = 0; S.input.taps.length = 0;
  S.input.pause = false; S.input.valider = false; S.input.retour = false; S.input.chiffre = 0; S.input.car = '';
  S.input.pointer.actif = false; S.input.pointer.boutons = 0;
}
function onTouchStart(e) {
  S.input.any = true; gesture();
  var now = performance.now();
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (doigtDe(t.identifier)) continue;
    var d = { id: t.identifier, role: 'rien', x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t0: now, classe: null };
    doigts.push(d);
    if (stick.id === null) prendreManche(d, now);                 // le premier doigt posé est le manche, jamais une action
    else d.role = (now - stickT0 >= G_ATTENTE) ? 'action' : 'attente';
  }
  if (e.cancelable) e.preventDefault();
}
function onTouchMove(e) {
  var now = performance.now();
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i], d = doigtDe(t.identifier);
    if (d) { d.x = t.clientX; d.y = t.clientY; }
    if (t.identifier !== stick.id) {
      if (d && d.role === 'action' && d.classe === null && deplace(d) >= G_GLISSE_D && now - d.t0 < G_GLISSE_T) {
        d.classe = 'glisse'; geste('glisse', d, now); S.input.apogee = true;       // dès que le seuil est franchi
      }
      continue;
    }
    stick.x = t.clientX; stick.y = t.clientY;
    var dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy);
    if (m > STICK_R) { stick.ox = stick.x - dx / m * STICK_R; stick.oy = stick.y - dy / m * STICK_R; }
    stickUpdate();
  }
  if (e.cancelable) e.preventDefault();
}
function onTouchEnd(e) {
  var now = performance.now(), fin = e.type === 'touchend';
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i], d = doigtDe(t.identifier);
    if (!d) continue;
    d.x = t.clientX; d.y = t.clientY;
    retirer(d);
    var court = now - d.t0 < G_TAP_T && deplace(d) < G_TOUCHER_D;
    if (d.role === 'manche') {
      stick.id = null; stickUpdate();
      if (fin && court) tap(d, now);                                // le toucher bref du manche ne fait que poser une origine
      for (var j = 0; j < doigts.length; j++) if (doigts[j].role === 'attente') {   // le doigt qui attendait devient le manche
        prendreManche(doigts[j], now); break;
      }
    } else if (d.role === 'action') {
      if (fin && d.classe === null && now - d.t0 < G_TOUCHER_T && deplace(d) < G_TOUCHER_D) {
        d.classe = 'toucher'; geste('toucher', d, now); S.input.pouvoir = true; tap(d, now);   // au relâcher
      }
    }
  }
  var boost = false;
  for (var k = 0; k < doigts.length; k++) if (doigts[k].role === 'action' && doigts[k].classe === 'tenu') boost = true;
  S.input.boost = boost;
  if (fin) gesture();                                    // pour le toucher, seul touchend vaut geste (MDN)
  if (e.cancelable) e.preventDefault();
}
/* l'indicateur : un anneau tramé à l'origine et un point sous le pouce, en couleurs d'interface */
function drawStick() {
  var st = S.input.stick, p = N.gfx.PX || 1, r = out.getBoundingClientRect();
  var ox = Math.round((st.ox - r.left) / p), oy = Math.round((st.oy - r.top) / p);
  N.gfx.ring(ox, oy, Math.max(4, Math.round(STICK_R / p)), N.pal.i('acier'), 0.5);
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

/* ---- la mesure (repris du lot L1) : le coût de l'image, p50 à p99 sur les 120 dernières ; il nourrit le
   préréglage adaptatif du tube (N.crt._note). ?perf=1 l'affiche en bas à gauche ; ?tube=riche|sobre|pur|coupe
   fixe le tube ; ?auto=0 coupe l'adaptation. ---- */
var PERF = new Float32Array(120), PERF2 = new Float32Array(120), perfN = 0;
var PERF_AFF = false, perfSpr = null, perfMaj = -1, TXP = { ci: 0, contour: 0, echelle: 1 };
var maintenant = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return 0; };
function perfNote(ms, dtReel) {
  PERF[perfN % 120] = ms; perfN++;
  if (N.crt && N.crt._note) { try { N.crt._note(ms, dtReel); } catch (e) { errLog('crt.note', e); } }
  S.perf.niveau = (N.crt && N.crt.niveau) ? N.crt.niveau() : 'riche';
  if (perfN % 30 !== 0) return;
  var n = Math.min(perfN, 120);
  PERF2.set(PERF); var v = PERF2.subarray(0, n); v.sort();
  S.perf.p50 = v[(n * 0.5) | 0]; S.perf.p90 = v[Math.min(n - 1, (n * 0.9) | 0)]; S.perf.p95 = v[Math.min(n - 1, (n * 0.95) | 0)]; S.perf.p99 = v[Math.min(n - 1, (n * 0.99) | 0)];
}
function f1(v) { return (Math.round((+v || 0) * 10) / 10).toFixed(1).replace('.', ','); }
function drawPerf() {
  var G = N.gfx, sf = S.view.safe, x = (sf.l | 0) + 2;
  if (perfMaj !== perfN && N.spr && N.spr.text) {
    perfMaj = perfN;
    var tube = (N.crt && N.crt.niveau ? N.crt.niveau() : S.perf.niveau) + (N.crt && N.crt.auto && N.crt.auto() ? ' AUTO' : '');
    TXP.ci = N.pal.i('os'); TXP.contour = N.pal.i('nuitProfonde');
    perfSpr = N.spr.text('P50 ' + f1(S.perf.p50) + '  P95 ' + f1(S.perf.p95) + '  P99 ' + f1(S.perf.p99) + ' MS\nTUBE ' + String(tube).toUpperCase(), TXP);
  }
  if (perfSpr && perfSpr.data) {
    var y = G.H - (sf.b | 0) - perfSpr.h - 2;
    G.rect(x - 1, y - 1, perfSpr.w + 2, perfSpr.h + 2, N.pal.i('nuitProfonde'));
    G.blit(perfSpr, x, y);
  } else {
    var yb = G.H - (sf.b | 0) - 8, q = [S.perf.p50, S.perf.p95, S.perf.p99], c = ['acier', 'ambre', 'brasier'];
    for (var i = 0; i < 3; i++) G.rect(x, yb + i * 2, Math.min(60, Math.round(q[i] * 2)), 1, N.pal.i(c[i]));
  }
}

/* ---- boucle ---- */
var last = null, SANS_DESSIN = false;
function frame(now) {
  requestAnimationFrame(frame);
  var t0 = maintenant(), dtReel = last === null ? 1 / 60 : (now - last) / 1000;
  last = now;
  /* Le pas de test remplace aussi le temps fourni à l'accumulateur (zéro est permis).
     La borne de rattrapage appartient à l'horloge : PAS_MAX, aucun grand pas variable. */
  if (typeof window !== 'undefined' && typeof window.__DT === 'number' && isFinite(window.__DT)) dtReel = window.__DT;
  if (!(dtReel >= 0) || !isFinite(dtReel)) dtReel = 0;
  var dtImage = Math.min(dtReel, 0.05), h = N.horloge, n = 0;
  S.frame++;
  if (typeof window !== 'undefined') window.__FRAME = S.frame;
  entreeUpdate();
  step('horloge.image', function () { n = h.image(dtReel); });
  for (var i = 0; i < n; i++) {
    step('horloge.avancer', function () { S.dt = h.avancer(); S.t = h.t(); });
    if (!S.paused) {
      /* Les écrans arrêtent LE MONDE, pas leur garde ni leurs films. Même convention
         que dbg.simuler (79-jeu.js) : H pour les interfaces, dtMonde pour le reste.
         Un hitstop n'est pas un arrêt d'écran : son zéro est conservé. */
      var dtJeu = S.dt === 0 && h.arretee() ? h.H : S.dt;
      step('game.update', N.game && N.game.update ? function () { N.game.update(dtJeu); } : null);
      /* Les fonds de fin ne sont pas des interludes bloquants : ils se révèlent
         dans le temps d'interface, même quand le monde s'est arrêté. */
      if (N.game && N.game.etat && N.game.etat() === 'fin' && N.intro && N.intro.current && N.intro.current() && !N.intro.busy())
        step('intro.updateFin', function () { N.intro.update(h.H); });
      step('fx.update', N.fx && N.fx.update ? function () { N.fx.update(S.dt); } : null);
      /* 79-jeu.js avance déjà la caméra une fois par pas ; ne pas la doubler ici. */
    }
    /* Aucun effacement si l'image n'a rendu aucun pas (écrans à 144 Hz, par exemple).
       Une impulsion ne doit jamais être consommée par les deux pas d'une même image. */
    entreeFin();
  }

  if (N.game && N.game.tension) step('tension', function () {
    S.tension = N.game.tension();
    if (N.music && N.music.tension) N.music.tension(S.tension);
  });

  if (SANS_DESSIN) { perfNote(maintenant() - t0, dtReel); return; }

  /* § 7.7 : le monde, les explosions, les acteurs du dessus, puis les écrans.
     game.draw() possède déjà drawFar / drawPlateau / drawFront et leur origine. */
  var drew = false;
  if (N.gfx && N.gfx.clear) {
    step('gfx.clear', function () { N.gfx.origin(0, 0); N.gfx.clear(0); });
    var etat = N.game && N.game.etat ? N.game.etat() : null;
    var vol = etat === 'vol' && N.vol && N.vol.actif && N.vol.actif();
    if (vol) step('vol.draw', function () { N.vol.draw(); drew = true; });
    else {
      step('game.draw', N.game && N.game.draw ? function () { N.game.draw(); drew = true; } : null);
      step('fx.draw', N.fx && N.fx.draw ? function () { N.fx.draw(); } : null);
      step('game.drawTop', N.game && N.game.drawTop ? function () { N.game.drawTop(); } : null);
    }
    step('gfx.origin', function () { N.gfx.origin(0, 0); });
    step('fx.drawEcran', N.fx && N.fx.drawEcran ? function () { N.fx.drawEcran(); } : null);
    /* Le repli d'ecranVieux dessine déjà l'interface quand reset() vient de remettre
       pas() à zéro en fin d'image. Éviter une seconde couche pendant cette seule image. */
    if (h && h.pas() > 0) {
      var plein = N.ids && N.ids.tableEtats[etat] && N.ids.tableEtats[etat].plein;
      var film = N.intro && N.intro.current && N.intro.current();
      /* 60-intro : victoire/défaite sont le FOND du bilan ; les films bloquants
         sont au-dessus de l'interface. Les dessiner tous après ui effaçait le bilan. */
      if (film && !N.intro.busy()) step('intro.fondFin', function () { N.intro.draw(); });
      if (!plein && etat !== 'titre' && etat !== 'plongee' && !(film && N.intro.busy()))
        step('hud.draw', N.hud && N.hud.draw ? function () { N.hud.draw(); } : null);
      step('ui.draw', N.ui && N.ui.actif && N.ui.actif() ? function () { N.ui.draw(); } : null);
      if (film && N.intro.busy()) step('intro.draw', function () { N.intro.draw(); });
    }
    if (S.input.stick.active) step('stick.draw', N.gfx.ring && N.pal && N.pal.i ? drawStick : null);
    if (PERF_AFF) step('perf.draw', drawPerf);
    step('gfx.present', function () { N.gfx.present({ skipScale: !!(N.crt && N.crt._actif && N.crt._actif()) }); drew = true; });
    step('crt.apply', N.crt && N.crt.apply ? function () { N.crt.apply(dtImage); } : null);
  }
  if (!drew) step('mire', mire);
  perfNote(maintenant() - t0, dtReel);

  /* Le tube et les secousses sont des effets d'image, même pendant un gel du monde. */
  if (S.shake > 0) { S.shake *= Math.pow(0.001, dtImage); if (S.shake < 0.05) S.shake = 0; }
  if (S.heat > 0) { S.heat *= Math.pow(0.02, dtImage); if (S.heat < 0.01) S.heat = 0; }
}

function boot() {
  out = document.getElementById('out');
  if (!out) { errLog('boot', new Error('canvas #out absent')); return; }
  octx = out.getContext('2d', { alpha: false });
  if (typeof window !== 'undefined') {
    window.__S = S; window.__PAL = palTable();
    if (window.__SEED) N.reseed(window.__SEED);
  }
  var q = (typeof location !== 'undefined' && location.search) || '';
  PERF_AFF = /[?&]perf=1\b/.test(q);
  SANS_DESSIN = /[?&]nodraw(?:=1)?(?:&|$)/.test(q);
  step('gfx.init', N.gfx && N.gfx.init ? function () { N.gfx.init(out); } : null);
  var tb = /[?&]tube=(riche|sobre|pur|coupe)\b/.exec(q);
  if (tb && N.crt && N.crt.preset) step('crt.preset', function () { N.crt.preset(tb[1]); if (N.crt.auto) N.crt.auto(false); });
  if (/[?&]auto=0\b/.test(q) && N.crt && N.crt.auto) step('crt.auto', function () { N.crt.auto(false); });
  step('art.load', N.art && N.art.load ? function () { N.art.load(); } : null);
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('keydown', function (e) { onKey(e, true); }, { passive: false });
  window.addEventListener('keyup', function (e) { onKey(e, false); });
  var app = document.getElementById('app') || window;
  /* les gestes du système neutralisés (§ 2.16) : plus de « page précédente » au balayage du bord, ni de sélection ni de loupe */
  if (app.style) {
    app.style.touchAction = 'none'; app.style.overscrollBehavior = 'none'; app.style.userSelect = 'none';
    app.style.webkitUserSelect = 'none'; app.style.webkitTouchCallout = 'none';
  }
  if (document.body && document.body.style) { document.body.style.overscrollBehavior = 'none'; document.body.style.touchAction = 'none'; }
  app.addEventListener('touchstart', onTouchStart, { passive: false });
  app.addEventListener('touchmove', onTouchMove, { passive: false });
  app.addEventListener('touchend', onTouchEnd, { passive: false });
  app.addEventListener('touchcancel', onTouchEnd, { passive: false });
  /* en arrière-plan : le jeu se met en pause, le son s'endort ; au retour, le son reprend et le jeu
     attend le premier geste (70-game.js affiche PAUSE tant que S.paused est vrai) */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      S.paused = true; keys = {}; stick.id = null; entreeRaz(); stickUpdate();
      step('music.suspend', N.music && N.music.suspend ? function () { N.music.suspend(); } : null);
    } else step('music.resume', N.music && N.music.resume ? function () { N.music.resume(); } : null);
  });
  app.addEventListener('pointerdown', onPointer);
  app.addEventListener('pointermove', onPointer);
  app.addEventListener('pointerup', onPointer);
  app.addEventListener('pointercancel', onPointer);
  app.addEventListener('pointerdown', gesture);
  app.addEventListener('pointerup', gesture);
  app.addEventListener('click', gesture);
  window.addEventListener('blur', function () { keys = {}; stick.id = null; entreeRaz(); stickUpdate(); S.input.fire = false; });

  /* 79-jeu dirige désormais demarrage → titre → plongee ; l'ancienne ouverture
     ne doit pas lancer une seconde machine d'états au-dessus de 80-ecrans. */
  S.phase = 'play';
  step('game.reset', N.game && N.game.reset ? function () { N.game.reset(S.seed); } : null);
  requestAnimationFrame(frame);
}
