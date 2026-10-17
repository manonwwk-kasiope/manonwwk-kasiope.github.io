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
  view: { w: 0, h: 0, safe: { l: 0, t: 0, r: 0, b: 0 } }, input: { x: 0, y: 0, mag: 0, fire: false, any: false },
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
    var r = N.gfx.resize(cssW, cssH);
    /* le canvas fait EXACTEMENT tampon x px en CSS, centré, quitte à déborder de moins d'un pixel de
       jeu : sinon le navigateur le réduit d'un facteur non entier et ampute une rangée de pixels */
    var ow = r.w * r.px, oh = r.h * r.px;
    out.style.width = ow + 'px'; out.style.height = oh + 'px';
    out.style.left = Math.floor((cssW - ow) / 2) + 'px'; out.style.top = Math.floor((cssH - oh) / 2) + 'px';
    out.width = Math.round(ow * dpr); out.height = Math.round(oh * dpr);
    S.view.w = r.w; S.view.h = r.h;
    var sa = safeArea();                        // encoche, barre d'accueil : en pixels de jeu, arrondis vers le haut
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
  if (down && (e.code === 'Space' || e.code === 'Enter')) gesture();
  if (down) e.preventDefault();
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
function onTouchStart(e) {
  S.input.any = true; gesture();
  if (stick.id === null && e.changedTouches && e.changedTouches.length) {
    var t = e.changedTouches[0];
    stick.id = t.identifier; stick.ox = stick.x = t.clientX; stick.oy = stick.y = t.clientY;
    stickUpdate();
  }
  if (e.cancelable) e.preventDefault();
}
function onTouchMove(e) {
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (t.identifier !== stick.id) continue;
    stick.x = t.clientX; stick.y = t.clientY;
    var dx = stick.x - stick.ox, dy = stick.y - stick.oy, m = Math.hypot(dx, dy);
    if (m > STICK_R) { stick.ox = stick.x - dx / m * STICK_R; stick.oy = stick.y - dy / m * STICK_R; }
    stickUpdate();
  }
  if (e.cancelable) e.preventDefault();
}
function onTouchEnd(e) {
  for (var i = 0; e.changedTouches && i < e.changedTouches.length; i++)
    if (e.changedTouches[i].identifier === stick.id) { stick.id = null; stickUpdate(); }
  if (e.type === 'touchend') gesture();                 // pour le toucher, seul touchend vaut geste (MDN)
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

/* ---- boucle ---- */
var last = 0, DTMAX = 1 / 20;
function frame(now) {
  requestAnimationFrame(frame);
  var dt = last ? (now - last) / 1000 : 1 / 60;
  last = now;
  if (typeof window !== 'undefined' && window.__DT) dt = window.__DT;
  if (dt > DTMAX) dt = DTMAX;
  if (dt < 0) dt = 0;

  var frozen = N.fx && N.fx.hitstopLeft ? N.fx.hitstopLeft() > 0 : false;
  S.dt = frozen ? dt * 0.08 : dt;
  S.t += S.dt * 1000;
  S.frame++;
  if (typeof window !== 'undefined') window.__FRAME = S.frame;

  if (!S.paused) {
    if (S.phase === 'intro') step('intro.update', N.intro && N.intro.update ? function () { N.intro.update(S.dt); } : null);
    else step('game.update', N.game && N.game.update ? function () { N.game.update(S.dt); } : null);
    step('fx.update', N.fx && N.fx.update ? function () { N.fx.update(S.dt); } : null);
  }

  if (N.game && N.game.tension) step('tension', function () {
    S.tension = N.game.tension();
    if (N.music && N.music.tension) N.music.tension(S.tension);
  });

  /* dessin : tampon basse résolution, puis agrandissement, puis post-traitement */
  var drew = false;
  if (N.gfx && N.gfx.clear) {
    step('gfx.clear', function () { N.gfx.clear(0); });
    if (S.phase === 'intro') step('intro.draw', N.intro && N.intro.draw ? function () { N.intro.draw(); drew = true; } : null);
    else step('game.draw', N.game && N.game.draw ? function () { N.game.draw(); drew = true; } : null);
    step('fx.draw', N.fx && N.fx.draw ? function () { N.fx.draw(); } : null);
    if (S.input.stick.active) step('stick.draw', N.gfx.ring && N.pal && N.pal.i ? drawStick : null);
    step('gfx.present', function () { N.gfx.present(); drew = drew || true; });
    step('crt.apply', N.crt && N.crt.apply ? function () { N.crt.apply(S.dt); } : null);
  }
  if (!drew) step('mire', mire);

  /* décroissance des secousses après lecture par le post-traitement */
  if (S.shake > 0) { S.shake *= Math.pow(0.001, S.dt); if (S.shake < 0.05) S.shake = 0; }
  if (S.heat > 0) { S.heat *= Math.pow(0.02, S.dt); if (S.heat < 0.01) S.heat = 0; }
}

function boot() {
  out = document.getElementById('out');
  if (!out) { errLog('boot', new Error('canvas #out absent')); return; }
  octx = out.getContext('2d', { alpha: false });
  if (typeof window !== 'undefined') {
    window.__S = S; window.__PAL = palTable();
    if (window.__SEED) N.reseed(window.__SEED);
  }
  step('gfx.init', N.gfx && N.gfx.init ? function () { N.gfx.init(out); } : null);
  step('art.load', N.art && N.art.load ? function () { N.art.load(); } : null);
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
  /* en arrière-plan : le jeu se met en pause, le son s'endort ; au retour, le son reprend et le jeu
     attend le premier geste (70-game.js affiche PAUSE tant que S.paused est vrai) */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      S.paused = true; keys = {}; stick.id = null; stickUpdate();
      step('music.suspend', N.music && N.music.suspend ? function () { N.music.suspend(); } : null);
    } else step('music.resume', N.music && N.music.resume ? function () { N.music.resume(); } : null);
  });
  app.addEventListener('pointerdown', gesture);
  app.addEventListener('pointerup', gesture);
  app.addEventListener('click', gesture);
  window.addEventListener('blur', function () { keys = {}; stick.id = null; stickUpdate(); S.input.fire = false; });

  step('intro.reset', N.intro && N.intro.reset ? function () { N.intro.reset(); } : null);
  step('game.reset', N.game && N.game.reset ? function () { N.game.reset(S.seed); } : null);
  requestAnimationFrame(frame);
}
