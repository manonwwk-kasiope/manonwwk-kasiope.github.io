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
  view: { w: 0, h: 0 }, input: { x: 0, y: 0, mag: 0, fire: false, any: false },
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
    out.width = Math.round((r.w * r.px) * dpr); out.height = Math.round((r.h * r.px) * dpr);
    S.view.w = r.w; S.view.h = r.h;
  } else {
    out.width = cssW; out.height = cssH; S.view.w = cssW; S.view.h = cssH;
  }
  if (octx) octx.imageSmoothingEnabled = false;
}

/* ---- motif de contrôle : visible tant qu'aucun module ne dessine ---- */
function mire() {
  if (!octx) return;
  var C = palTable(), w = out.width, h = out.height, n = C.length, bw = Math.max(1, (w / n) | 0);
  for (var i = 0; i < n; i++) { octx.fillStyle = C[i]; octx.fillRect(i * bw, 0, bw, h); }
  octx.fillStyle = C[12];
  octx.font = '16px ui-monospace,monospace';
  octx.fillText('NEON 2084 — en construction', 12, 24);
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
  if (down && (e.code === 'Space' || e.code === 'Enter')) startAudio();
  if (down) e.preventDefault();
}
function onTouch(e) {
  S.input.any = true; startAudio();
  var t = e.touches && e.touches[0]; if (!t) { S.input.mag = 0; return; }
  var cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.5;
  var dx = t.clientX - cx, dy = t.clientY - cy, m = Math.hypot(dx, dy) || 1;
  S.input.x = dx / m; S.input.y = dy / m; S.input.mag = Math.min(1, m / (window.innerHeight * 0.3));
  if (e.cancelable) e.preventDefault();
}
var audioStarted = false;
function startAudio() {
  if (audioStarted) return; audioStarted = true;
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
  app.addEventListener('touchstart', onTouch, { passive: false });
  app.addEventListener('touchmove', onTouch, { passive: false });
  app.addEventListener('touchend', function (e) { S.input.mag = 0; if (e.cancelable) e.preventDefault(); }, { passive: false });
  app.addEventListener('pointerdown', startAudio);
  window.addEventListener('blur', function () { keys = {}; S.input.mag = 0; S.input.fire = false; });

  step('intro.reset', N.intro && N.intro.reset ? function () { N.intro.reset(); } : null);
  step('game.reset', N.game && N.game.reset ? function () { N.game.reset(S.seed); } : null);
  requestAnimationFrame(frame);
}
