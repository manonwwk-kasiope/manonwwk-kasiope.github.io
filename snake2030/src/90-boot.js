/* ============================================================================
   SNAKE 2030 — amorçage
   Canvas, entrées tactiles, rendu du serpent, boucle principale, cycle de vie.
   ========================================================================== */

var cv, ctx, DPR = 1, CW = 0, CH = 0, SCALE = 1;

function setupCanvas() {
  cv = document.getElementById('game');
  ctx = cv.getContext('2d', { alpha: false });
  resizeCanvas();
}

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  CW = w; CH = h;
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  // hauteur de vue constante en unités monde : le jeu se voit pareil partout
  SCALE = h / K.VIEW_H;
  S.view.h = K.VIEW_H;
  S.view.w = w / SCALE;
  document.body.classList.toggle('portrait', h > w);
}

/* ----------------------------------------------------------- entrées tactiles */
var touchJoy = null;     // { id, ox, oy, x, y }
var touchBtns = {};      // id -> nom de bouton

/* L'interface possède la géométrie des contrôles : elle applique les réglages
   du joueur (position, taille, main gauche). Le coeur ne la duplique pas, il
   l'interroge — sinon la zone tactile et le dessin finissent par diverger et
   le joueur tape à côté. */
function hitBtn(x, y) {
  return (S2030.ui && S2030.ui.hitTest) ? S2030.ui.hitTest(x, y) : null;
}

function joySide(x) {
  var home = (S2030.ui && S2030.ui.joyHome) ? S2030.ui.joyHome() : null;
  if (home) return Math.abs(x - home.x) < CW * 0.5;
  return S.opt.leftHanded ? x > CW * 0.5 : x < CW * 0.5;
}

function onTouchStart(e) {
  if (S.phase === 'menu' || S.phase === 'dead' || S.phase === 'cards') return;
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    var b = hitBtn(t.clientX, t.clientY);
    if (b) { touchBtns[t.identifier] = b; S.input[b] = true; pressBtn(b); continue; }
    if (!touchJoy && joySide(t.clientX)) {
      touchJoy = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY };
      S.input.jactive = true;
      S2030.ui && S2030.ui.placeJoy && S2030.ui.placeJoy(t.clientX, t.clientY);
    }
  }
  e.preventDefault();
}

function onTouchMove(e) {
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (touchJoy && t.identifier === touchJoy.id) {
      touchJoy.x = t.clientX; touchJoy.y = t.clientY;
      var dx = touchJoy.x - touchJoy.ox, dy = touchJoy.y - touchJoy.oy;
      var mag = Math.hypot(dx, dy);
      var max = 64 * S.opt.joySize;
      if (S.opt.joyFloat && mag > max) {
        // manche flottant : l'origine se laisse entraîner, on ne bute jamais
        var k = (mag - max) / mag;
        touchJoy.ox += dx * k; touchJoy.oy += dy * k;
        dx = touchJoy.x - touchJoy.ox; dy = touchJoy.y - touchJoy.oy; mag = max;
        S2030.ui && S2030.ui.placeJoy && S2030.ui.placeJoy(touchJoy.ox, touchJoy.oy);
      }
      S.input.jmag = clamp(mag / max, 0, 1);
      if (mag > 0.001) { S.input.jx = dx / mag; S.input.jy = dy / mag; }
    }
  }
  e.preventDefault();
}

function onTouchEnd(e) {
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (touchJoy && t.identifier === touchJoy.id) {
      touchJoy = null; S.input.jactive = false; S.input.jmag = 0;
      S2030.ui && S2030.ui.releaseJoy && S2030.ui.releaseJoy();
    }
    var b = touchBtns[t.identifier];
    if (b) { S.input[b] = false; delete touchBtns[t.identifier]; }
  }
  e.preventDefault();
}

function pressBtn(b) {
  if (b === 'special') useSpecial();
  if (b === 'ult') useUlt();
}

/* --- clavier, pour mettre au point sur ordinateur --- */
var keys = {};
addEventListener('keydown', function (e) {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') { S.input.boost = true; e.preventDefault(); }
  if (e.key.toLowerCase() === 'e') useSpecial();
  if (e.key.toLowerCase() === 'r') useUlt();
  if (e.key === 'Escape') togglePause();
});
addEventListener('keyup', function (e) {
  keys[e.key.toLowerCase()] = false;
  if (e.key === ' ') S.input.boost = false;
});
function keyboardInput() {
  var kx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['q'] || keys['a'] || keys['arrowleft'] ? 1 : 0);
  var ky = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['z'] || keys['w'] || keys['arrowup'] ? 1 : 0);
  if (kx || ky) {
    var m = Math.hypot(kx, ky);
    S.input.jx = kx / m; S.input.jy = ky / m; S.input.jmag = 1; S.input.jactive = true;
  } else if (!touchJoy) { S.input.jmag = 0; S.input.jactive = false; }
}

/* ------------------------------------------------------- capacités */
function useSpecial() {
  if (S.phase !== 'play' || S.specialCd > 0) return;
  S.specialCd = S.specialCdMax || 7000;
  var s = S.snake;
  // TRANSE : la traversée dure plus longtemps
  var gt = 2200 + 700 * (S.up.f_ghostTime || 0);
  s.ghost = gt;
  s.invuln = Math.max(s.invuln, gt);
  S2030.fx && S2030.fx.ring(s.x, s.y, '#b388ff', 10, 900);
  S2030.fx && S2030.fx.flare(s.x, s.y, '#b388ff', 160);
  S2030.audio && S2030.audio.sfx('shock');
  var near = enemiesNear(s.x, s.y, 240);
  for (var i = 0; i < near.length; i++) {
    var e = near[i];
    var a = angTo(s.x, s.y, e.x, e.y);
    e.vx += Math.cos(a) * 420; e.vy += Math.sin(a) * 420;
    damageEnemy(e, 6, { x: e.x, y: e.y });
  }
  haptic(24);
}

function useUlt() {
  if (S.phase !== 'play' || S.ult < S.ultMax) return;
  S.ult = 0;
  S.timeScale = 0.25;
  S2030.audio && S2030.audio.ultimate();
  S2030.fx && S2030.fx.flash('#ffffff', 0.85);
  S2030.fx && S2030.fx.shake(26);
  S2030.ui && S2030.ui.banner('SURCHARGE');
  haptic([40, 20, 90]);
  var s = S.snake;
  setTimeout(function () { S.timeScale = 1; }, 420);
  // déferlement : vague de destruction concentrique
  var step = 0;
  var iv = setInterval(function () {
    if (S.phase !== 'play') { clearInterval(iv); return; }
    var r = 160 + step * 150;
    S2030.fx && S2030.fx.ring(s.x, s.y, '#fff3b0', r * 0.5, 1400);
    var list = enemiesNear(s.x, s.y, r);
    for (var i = 0; i < list.length; i++) damageEnemy(list[i], 40, { x: list[i].x, y: list[i].y });
    S2030.audio && S2030.audio.sfx('explode');
    if (++step > 5) clearInterval(iv);
  }, 90);
}

/* --------------------------------------------------------- rendu du serpent */
function drawSnake() {
  var s = S.snake, segs = s.segs, n = segs.length;
  var blink = s.invuln > 0 && ((S.t / 60) | 0) % 2 === 0;
  var ghost = s.ghost > 0;

  var body = ghost ? '#b388ff' : '#00e5ff';
  var edge = ghost ? '#5b2fa8' : '#0077a8';
  if (blink) body = '#ffffff';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // traînée de boost
  if (s.boosting) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,214,102,.45)';
    ctx.lineWidth = K.HEAD_R * 2.4;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    for (var t = 0; t < Math.min(n, 10); t++) ctx.lineTo(segs[t].x, segs[t].y);
    ctx.stroke();
    ctx.restore();
  }

  // corps : contour puis remplissage
  for (var pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? edge : body;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    for (var i = 0; i < n; i++) {
      if (!inView(segs[i].x, segs[i].y, 120) && i > 2) { ctx.moveTo(segs[i].x, segs[i].y); continue; }
      ctx.lineTo(segs[i].x, segs[i].y);
    }
    ctx.lineWidth = K.HEAD_R * (pass === 0 ? 1.9 : 1.5);
    ctx.stroke();
  }

  // écailles lumineuses tous les trois segments
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = ghost ? 'rgba(179,136,255,.5)' : 'rgba(120,255,255,.45)';
  for (var k = 2; k < n; k += 3) {
    if (!inView(segs[k].x, segs[k].y, 40)) continue;
    ctx.beginPath(); ctx.arc(segs[k].x, segs[k].y, K.HEAD_R * 0.32, 0, TAU); ctx.fill();
  }
  ctx.restore();

  // modules d'armes visibles
  S2030.weapons && S2030.weapons.drawMounts && S2030.weapons.drawMounts(ctx);

  // tête : halo permanent, elle doit rester repérable en toutes circonstances
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.ang);
  ctx.globalCompositeOperation = 'lighter';
  var g = ctx.createRadialGradient(0, 0, 2, 0, 0, K.HEAD_R * 3.2);
  g.addColorStop(0, ghost ? 'rgba(179,136,255,.85)' : 'rgba(0,229,255,.8)');
  g.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, K.HEAD_R * 3.2, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = blink ? '#ffffff' : (ghost ? '#d9c2ff' : '#9df5ff');
  ctx.strokeStyle = edge; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(K.HEAD_R * 1.55, 0);
  ctx.lineTo(-K.HEAD_R * 0.7, -K.HEAD_R * 1.05);
  ctx.lineTo(-K.HEAD_R * 0.25, 0);
  ctx.lineTo(-K.HEAD_R * 0.7, K.HEAD_R * 1.05);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#06131c';
  ctx.beginPath(); ctx.arc(K.HEAD_R * 0.35, -K.HEAD_R * 0.3, 2.6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(K.HEAD_R * 0.35, K.HEAD_R * 0.3, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawPickups() {
  for (var i = 0; i < S.pickups.length; i++) {
    var p = S.pickups[i];
    if (!inView(p.x, p.y, 40)) continue;
    var pulse = 1 + Math.sin(S.t / 180 + i) * 0.16;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var col = p.kind === 'core' ? '#ffd166' : (p.kind === 'heal' ? '#7CFFB2' : '#00e5ff');
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.beginPath();
    if (p.kind === 'core') {
      for (var k = 0; k < 6; k++) {
        var a = k * TAU / 6 + S.t / 700;
        var rr = k % 2 ? p.r * 0.5 : p.r * pulse;
        ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
      }
      ctx.closePath();
    } else {
      ctx.arc(p.x, p.y, p.r * pulse, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }
}

function drawBullets() {
  var i, b;
  for (i = 0; i < S.bullets.length; i++) {
    b = S.bullets[i];
    if (!inView(b.x, b.y, 30)) continue;
    if (S2030.weapons && S2030.weapons.drawBullet) S2030.weapons.drawBullet(ctx, b);
    else { ctx.fillStyle = b.color || '#fff3b0'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (i = 0; i < S.ebullets.length; i++) {
    b = S.ebullets[i];
    if (!inView(b.x, b.y, 30)) continue;
    var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3);
    g.addColorStop(0, b.color || '#ff5c3a'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawArenaEdge() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,92,138,.5)';
  ctx.lineWidth = 4;
  ctx.setLineDash([26, 18]);
  ctx.lineDashOffset = -S.t / 30;
  ctx.strokeRect(0, 0, K.ARENA_W, K.ARENA_H);
  ctx.restore();
}

/* ----------------------------------------------------------- boucle de jeu */
var lastT = 0, accFps = 0, frames = 0, fps = 60;

function frame(now) {
  requestAnimationFrame(frame);
  var raw = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;

  frames++; accFps += raw;
  if (accFps > 0.5) { fps = frames / accFps; frames = 0; accFps = 0; autoQuality(); }

  var hs = S2030.fx && S2030.fx.hitstopLeft ? S2030.fx.hitstopLeft() : 0;
  var scale = hs > 0 ? 0.08 : S.timeScale;
  var dt = raw * scale;
  S.dt = dt;

  if (S.phase === 'play' && !S.paused) {
    S.t += raw * 1000;
    keyboardInput();
    updateSnake(dt);
    S.levelT += dt;
    S2030.levels && S2030.levels.update && S2030.levels.update(dt);
    updateEnemies(dt);
    S2030.weapons && S2030.weapons.update && S2030.weapons.update(dt);
    auraTick(dt);
    poolsTick(dt);
    collide(dt);
    if (S.multT > 0) { S.multT -= raw * 1000; if (S.multT <= 0) { S.mult = 1; S.combo = 0; } }
    if (S.specialCd > 0) S.specialCd -= raw * 1000;
    updateCam(dt);
    S2030.audio && S2030.audio.setIntensity(S.intensity);
    if (S.lvlUps > 0) openCards();
  } else if (S.phase === 'menu') {
    S.t += raw * 1000;
    S.cam.x = lerp(S.cam.x, K.ARENA_W / 2, 0.02);
    S.cam.y = lerp(S.cam.y, K.ARENA_H / 2, 0.02);
  } else {
    S.t += raw * 1000;
  }

  S2030.fx && S2030.fx.update(raw);
  render();
  S2030.ui && S2030.ui.hud && S2030.ui.hud();
  syncControls();
}

function updateEnemies(dt) {
  for (var i = S.enemies.length - 1; i >= 0; i--) {
    var e = S.enemies[i];
    if (e.dead) { S.enemies.splice(i, 1); continue; }
    e.t += dt * 1000;
    if (e.hitT > 0) e.hitT -= dt * 1000;
    S2030.enemies && S2030.enemies.update && S2030.enemies.update(e, dt);
  }
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, CW, CH);

  var sh = S2030.fx && S2030.fx.shakeAmount ? S2030.fx.shakeAmount() : 0;
  var ox = 0, oy = 0;
  if (sh > 0.2 && !S.opt.reduceShake) { ox = rndR(-sh, sh); oy = rndR(-sh, sh); }

  ctx.save();
  ctx.translate(CW / 2, CH / 2);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-S.cam.x + ox, -S.cam.y + oy);

  S2030.levels && S2030.levels.drawBack && S2030.levels.drawBack(ctx);
  drawArenaEdge();
  drawPools(ctx);
  drawPickups();

  for (var i = 0; i < S.enemies.length; i++) {
    var e = S.enemies[i];
    if (!inView(e.x, e.y, e.r + 60)) continue;
    S2030.enemies && S2030.enemies.draw && S2030.enemies.draw(ctx, e);
  }

  drawBullets();
  if (S.snake) drawSnake();
  S2030.fx && S2030.fx.draw(ctx);
  S2030.levels && S2030.levels.drawFore && S2030.levels.drawFore(ctx);

  ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  S2030.fx && S2030.fx.drawScreen && S2030.fx.drawScreen(ctx, CW, CH);
  drawControls();
}

/* Les contrôles sont rendus par l'interface, en DOM : un seul dessin, une
   seule géométrie, donc zone tactile et visuel ne peuvent pas diverger. */
function drawControls() {}
function syncControls() {}

/* ---------------------------------------------------------- qualité adaptative */
var _qLow = 0;
function autoQuality() {
  if (fps < 42) {
    _qLow++;
    if (_qLow > 2 && S.opt.particles > 0.4) S.opt.particles = 0.4;
    // en dessous de 34 images/s le fil audio commence à se vider : on allège
    // les couches synthétisées plutôt que de laisser la musique hoqueter
    if (_qLow > 4 && fps < 34) S.opt.audioLite = true;
  } else if (fps > 55) { _qLow = 0; }
}

/* ------------------------------------------------------------ cartes / niveaux */
function openCards() {
  if (S.phase !== 'play') return;
  S.lvlUps--;
  S.phase = 'cards';
  S.timeScale = 1;
  var cards = S2030.upgrades ? S2030.upgrades.roll(3) : [];
  S2030.audio && S2030.audio.sfx('levelup');
  haptic(14);
  if (!cards.length) { S.phase = 'play'; return; }
  S2030.ui.showCards(cards, function (id) {
    S2030.upgrades.apply(id);
    S2030.audio && S2030.audio.sfx('card');
    S.phase = 'play';
    if (S.lvlUps > 0) setTimeout(openCards, 260);
  });
}

/* --------------------------------------------------------------- cycle de vie */
function resetRun() {
  seedRnd((S.seed = (Math.floor(performance.now()) % 100000) + 7));
  S.snake = makeSnake();
  S.enemies.length = 0; S.bullets.length = 0; S.ebullets.length = 0;
  S.pickups.length = 0; S.drones.length = 0; S.pools.length = 0;
  S.score = 0; S.mult = 1; S.multT = 0; S.combo = 0; S.kills = 0;
  S.xp = 0; S.xpNext = 12; S.lvlUps = 0;
  S.up = {}; S.ult = 0; S.special = 0; S.specialCd = 0;
  S.coins = 0; S.level = 1; S.levelT = 0; S.intensity = 0; S.levelProgress = 0;
  S.timeScale = 1; S.boss = null;
  S.specialCdMax = 7000;
  S.cam.x = S.snake.x; S.cam.y = S.snake.y;
  S2030.fx && S2030.fx.reset();
  S2030.weapons && S2030.weapons.reset && S2030.weapons.reset();
  S2030.enemies && S2030.enemies.reset && S2030.enemies.reset();
  S2030.upgrades && S2030.upgrades.reset && S2030.upgrades.reset();

  // déblocages permanents achetés entre deux parties
  var u = S.stats.unlocks || {};
  if (u.u_len) { S.snake.len += 3; S.snake.maxHp += 3; S.snake.hp = S.snake.len; }
  if (u.u_boost) { S.snake.boostMax = 125; S.snake.boostE = 125; }
  if (u.u_ult) S.ultMax = 80;
  if (u.u_shield) S.snake.shield = (S.snake.shield || 0) + 1;
  if (u.u_luck) S.up.f_luck = 1;

  // on démarre armé : le tir automatique s'enseigne tout seul, sans tutoriel
  S.up.frontCannon = u.u_start ? 2 : 1;
  S2030.levels && S2030.levels.start(1);
}

function startRun() {
  armAudio();                       // le bouton JOUER est un geste utilisateur valide
  S2030.audio && S2030.audio.resume();
  resetRun();
  S.phase = 'play';
  S.paused = false;
  S2030.ui.showScreen(null);
  S2030.audio && S2030.audio.start();
  requestWake();
}

function togglePause() {
  if (S.phase !== 'play' && !S.paused) return;
  S.paused = !S.paused;
  S2030.ui.showScreen(S.paused ? 'pause' : null);
  if (S.paused) S2030.audio && S2030.audio.stop();
  else S2030.audio && S2030.audio.start();
}

function loadStats() {
  try {
    var raw = localStorage.getItem('snake2030.v1');
    if (raw) {
      var o = JSON.parse(raw);
      if (o.stats) S.stats = Object.assign(S.stats, o.stats);
      if (o.opt) S.opt = Object.assign(S.opt, o.opt);
    }
  } catch (e) {}
}
function saveStats() {
  try { localStorage.setItem('snake2030.v1', JSON.stringify({ stats: S.stats, opt: S.opt })); } catch (e) {}
}

/* ------------------------------------------------------------------ musique */
function loadMusic() {
  if (typeof MUSIC_B64 === 'string' && MUSIC_B64.length > 100) {
    try {
      var bin = atob(MUSIC_B64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return Promise.resolve(bytes.buffer);
    } catch (e) { return Promise.reject(e); }
  }
  return fetch('neonvelocity.mp3').then(function (r) { return r.arrayBuffer(); });
}

var _armed = false;
function armAudio() {
  if (_armed || !S2030.audio) return;
  _armed = true;
  S2030.audio.init();
  loadMusic()
    .then(function (ab) { return S2030.audio.decode(ab); })
    .then(function (buf) { if (!buf) console.warn('musique : repli sur la synthèse'); })
    .catch(function () { /* la synthèse prend le relais */ });
}

/* --------------------------------------------------------------------- boot */
function boot() {
  window.__S = S; window.__K = K; window.__M = S2030;   // sondes de test
  loadStats();
  setupCanvas();
  addEventListener('resize', function () { setTimeout(resizeCanvas, 60); });
  addEventListener('orientationchange', function () { setTimeout(resizeCanvas, 200); });

  S2030.ui.build(document.getElementById('ui'));
  S2030.fx.reset();

  var root = document.getElementById('app');
  root.addEventListener('touchstart', onTouchStart, { passive: false });
  root.addEventListener('touchmove', onTouchMove, { passive: false });
  root.addEventListener('touchend', onTouchEnd, { passive: false });
  root.addEventListener('touchcancel', onTouchEnd, { passive: false });
  root.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && S.phase === 'play' && !S.paused) togglePause();
  });

  S.snake = makeSnake();
  S.cam.x = S.snake.x; S.cam.y = S.snake.y;
  S2030.levels && S2030.levels.start(1);
  S2030.ui.showScreen('menu');

  // L'audio ne peut démarrer que sur un geste utilisateur. On écoute large,
  // en capture : un bouton d'interface qui arrête la propagation ne doit pas
  // priver le jeu de sa musique.
  addEventListener('pointerdown', armAudio, true);
  addEventListener('touchstart', armAudio, true);
  addEventListener('keydown', armAudio, true);

  requestAnimationFrame(function (t) { lastT = t; frame(t); });
}
