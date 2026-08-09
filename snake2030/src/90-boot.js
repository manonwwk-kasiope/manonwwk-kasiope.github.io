/* ============================================================================
   SNAKE 2030 — amorçage
   Canvas, entrées tactiles, rendu du serpent, boucle principale, cycle de vie.
   ========================================================================== */

var cv, ctx, DPR = 1, CW = 0, CH = 0, SCALE = 1, _pxApplied = 1.5, _pxVoulu = 1.5;

function setupCanvas() {
  cv = document.getElementById('game');
  ctx = cv.getContext('2d', { alpha: false });
  resizeCanvas();
}

/* Plafond de densité de pixels. Mesuré sur une partie réelle : à 2, neuf pour
   cent des images dépassent 33 ms et la lecture saccade ; à 1,5, aucune, et
   l'affichage reste verrouillé à soixante images par seconde. Le coût est
   entièrement en remplissage — le profil ne montrait plus une seule fonction
   JavaScript significative. Un halo néon supporte très bien 1,5 ; une image
   sur dix perdue, non. Le joueur peut remonter le curseur s'il veut. */
function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, S.pxEff || S.opt.px || 1.5);
  var w = window.innerWidth, h = window.innerHeight;
  CW = w; CH = h;
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  _perspApplied = -1;                      // la distance d'oeil dépend de la hauteur
  // hauteur de vue constante en unités monde : le jeu se voit pareil partout
  SCALE = h / K.VIEW_H;
  S.view.h = K.VIEW_H;
  S.view.w = w / SCALE;
  var portrait = h > w;
  document.body.classList.toggle('portrait', portrait);
  /* Le bandeau « tourne ton téléphone » est opaque et avale les touchers : la
     partie continuait derrière, le joueur encaissant des coups qu'il ne
     pouvait ni voir ni éviter. On met en pause comme pour l'arrière-plan. */
  if (portrait && S.phase === 'play' && !S.paused) togglePause();
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
    // bande du haut réservée au HUD : le manche flottant s'y dessinait par-dessus
    if (t.clientY < CH * 0.22) continue;
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
  if (S2030.phases) { S2030.phases.use(); return; }
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
    ctx.lineWidth = S.headR * 2.4;
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
    ctx.lineWidth = S.headR * (pass === 0 ? 1.9 : 1.5);
    ctx.stroke();
  }

  // écailles lumineuses tous les trois segments
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = ghost ? 'rgba(179,136,255,.5)' : 'rgba(120,255,255,.45)';
  for (var k = 2; k < n; k += 3) {
    if (!inView(segs[k].x, segs[k].y, 40)) continue;
    ctx.beginPath(); ctx.arc(segs[k].x, segs[k].y, S.headR * 0.32, 0, TAU); ctx.fill();
  }
  ctx.restore();

  // modules d'armes visibles
  S2030.weapons && S2030.weapons.drawMounts && S2030.weapons.drawMounts(ctx);

  // tête : halo permanent, elle doit rester repérable en toutes circonstances
  ctx.save();
  ctx.translate(s.x, s.y);
  // la tête suit la visée, pas la trajectoire : sur le treillis elle pivote
  // vers sa cible pendant que le corps reste sur son rail
  ctx.rotate(aimAng());
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

  // le réglage de netteté s'applique sans passer par un événement de mise en page
  qualitySample(raw);
  if (S.opt.px !== _pxVoulu) { _pxVoulu = S.opt.px; _qStep = 0; applyQuality(); }

  if (S.phase === 'play' && !S.paused) {
    S.t += raw * 1000;
    keyboardInput();
    updateSnake(dt);
    S.levelT += dt;
    S2030.levels && S2030.levels.update && S2030.levels.update(dt);
    updateEnemies(dt);
    S2030.weapons && S2030.weapons.update && S2030.weapons.update(dt);
    S2030.phases && S2030.phases.update(dt);
    auraTick(dt);
    sonicTick(dt);
    poolsTick(dt);
    collide(dt);
    // dernier mot au treillis : plus rien ne déplacera les ennemis après
    S2030.phases && S2030.phases.railLate && S2030.phases.railLate(dt);
    if (S.multT > 0) { S.multT -= raw * 1000; if (S.multT <= 0) { S.mult = 1; S.combo = 0; } }
    if (S.specialCd > 0) S.specialCd -= raw * 1000;
    updateCam(dt);
    S2030.audio && S2030.audio.setIntensity(S.intensity);
    if (S.lvlUps > 0) openCards();
  } else if (S.phase === 'dead' || S.phase === 'cards') {
    S.t += raw * 1000;
    // la caméra continue de se redresser : sinon le récapitulatif se lit sur
    // une image penchée à 30° et gardée telle quelle
    S2030.phases && S2030.phases.settle && S2030.phases.settle(raw);
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
  dt *= S2030.phases ? S2030.phases.enemyTimeScale() : 1;
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

  var P = S2030.phases;
  applyPersp((P && P.persp) ? P.persp() : 0);
  drawWorld(ctx, CW, CH);

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  S2030.fx && S2030.fx.drawScreen && S2030.fx.drawScreen(ctx, CW, CH);
  drawControls();
}

/* Dessine le monde à plat dans le contexte donné, dont la surface fait
   bw x bh pixels CSS. Hors perspective c'est l'écran ; en perspective c'est
   un tampon plus grand, parce que la division perspective a besoin de
   matière hors cadre. */
function drawWorld(g, bw, bh) {
  /* Les aides de dessin de ce module écrivent dans le « ctx » global. Plutôt
     que de leur ajouter un paramètre — et d'en oublier une —, on échange le
     global le temps de la passe. Les modules qui reçoivent déjà un contexte
     en argument ne sont pas concernés. */
  var _prev = ctx;
  ctx = g;

  var sh = S2030.fx && S2030.fx.shakeAmount ? S2030.fx.shakeAmount() : 0;
  var ox = 0, oy = 0;
  if (sh > 0.2 && !S.opt.reduceShake) { ox = rndR(-sh, sh); oy = rndR(-sh, sh); }

  var P = S2030.phases;
  var zm = P ? P.zoom() : 1, tl = P ? P.tilt() : 0, rt = P ? P.rot() : 0;
  var sx2 = SCALE * zm, sy2 = SCALE * zm * (1 - tl * 0.42);
  // la vue change de taille avec le zoom et avec la cible : le tri du visible
  // doit suivre, sinon la perspective révèle les trous là où l'on a coupé
  S.view.w = bw / sx2; S.view.h = bh / sy2;
  g.save();
  g.translate(bw / 2, bh / 2);
  if (rt) g.rotate(rt);
  g.scale(sx2, sy2);
  g.translate(-S.cam.x + ox, -S.cam.y + oy);

  S2030.levels && S2030.levels.drawBack && S2030.levels.drawBack(g);
  P && P.drawFloor(g);
  drawArenaEdge();
  drawPools(g);
  drawPickups();

  for (var i = 0; i < S.enemies.length; i++) {
    var e = S.enemies[i];
    if (!inView(e.x, e.y, e.r + 60)) continue;
    S2030.enemies && S2030.enemies.draw && S2030.enemies.draw(g, e);
  }

  drawBullets();
  if (S.snake) drawSnake();
  P && P.drawDiag(g);
  S2030.fx && S2030.fx.draw(g);
  S2030.levels && S2030.levels.drawFore && S2030.levels.drawFore(g);

  g.restore();
  ctx = _prev;
}

/* ------------------------------------------------------------- perspective
   Première version : le monde était rendu à plat dans un tampon, puis
   recopié bande par bande en appliquant la division perspective. Ça
   fonctionnait, mais un profil l'a réglée — quatre-vingt-seize recopies
   redimensionnées par image pesaient 73 % du temps processeur, et les bandes
   laissaient un escalier visible sur les longues diagonales.

   Le navigateur sait faire exactement cela, en vraie perspective, sur le
   processeur graphique, pour rien : une transformation CSS 3D posée sur
   l'élément canvas. Le rendu reste plat et ignore tout de la bascule ; seul
   l'affichage penche. Aucun coût par image, aucun escalier.

   Le plan penché ne couvre plus l'écran — son bord haut recule — d'où
   l'agrandissement calculé ici, et la compensation de zoom côté caméra pour
   que la bascule ne se lise pas comme un rapprochement. */
var PERSP_D = 4.6;          // distance de l'oeil, en demi-hauteurs d'écran
var _perspApplied = -1;

/* Agrandissement nécessaire pour que le plan penché couvre encore l'écran. */
function perspCover(t) {
  var c = Math.cos(t);
  if (c < 0.2) return 1;
  // 1,5 % de marge : sans elle un liseré de 4 px reste découvert en haut,
  // le calcul étant exact au pixel près et l'arrondi du navigateur non
  return (PERSP_D + Math.sin(t)) / (PERSP_D * c) * 1.015;
}

function applyPersp(t) {
  var q = Math.round(t * 400) / 400;          // on ne touche au style qu'utile
  if (q === _perspApplied) return;
  _perspApplied = q;
  if (!cv) return;
  if (q <= 0.0005) { cv.style.transform = ''; return; }
  var P = (CH * 0.5 * PERSP_D).toFixed(0);
  cv.style.transformOrigin = '50% 50%';
  cv.style.willChange = 'transform';
  cv.style.backfaceVisibility = 'hidden';
  cv.style.transform = 'perspective(' + P + 'px) rotateX(' + (q * 180 / Math.PI).toFixed(2) +
                       'deg) scale(' + perspCover(q).toFixed(4) + ')';
}

/* Les contrôles sont rendus par l'interface, en DOM : un seul dessin, une
   seule géométrie, donc zone tactile et visuel ne peuvent pas diverger. */
function drawControls() {}
function syncControls() {}

/* ---------------------------------------------------------- qualité adaptative
   Trois défauts mesurés sur l'ancienne version : le seuil de 42 images/s ne se
   déclenchait jamais pendant la bascule 3D (le jeu y lit 48 à 54 im/s de
   moyenne tout en perdant une image sur six) ; la dégradation ne remontait
   jamais ; et elle écrasait le réglage du joueur dans son profil enregistré.
   On regarde donc la proportion d'images longues plutôt que la moyenne, on
   remonte dès que ça respire, et l'ajustement automatique reste en mémoire
   sans jamais toucher au choix du joueur. */
var _qWin = [], _qWinT = 0, _qStep = 0, _qHold = 0;
var PX_CRANS = [1, 1.25, 1.5, 2];

function qualitySample(raw) {
  _qWin.push(raw);
  if (_qWin.length > 90) _qWin.shift();
}

function autoQuality() {
  if (_qWin.length < 45) return;
  var longues = 0;
  for (var i = 0; i < _qWin.length; i++) if (_qWin[i] > 0.033) longues++;
  var part = longues / _qWin.length;
  if (_qHold > 0) { _qHold--; return; }

  if (part > 0.08 && _qStep < 3) {
    _qStep++;
    applyQuality();
    _qHold = 6;                       // on laisse la mesure se renouveler
    _qWin.length = 0;
  } else if (part < 0.01 && _qStep > 0) {
    _qStep--;
    applyQuality();
    _qHold = 12;                      // on remonte plus prudemment qu'on ne descend
    _qWin.length = 0;
  }
}

/* Le cran automatique s'applique par-dessus le choix du joueur, sans jamais
   l'écraser : S.opt.px reste ce qu'il a réglé, S.pxEff est ce qui est rendu. */
function applyQuality() {
  var voulu = S.opt.px || 1.5;
  var i = 0;
  for (var k = 0; k < PX_CRANS.length; k++) if (PX_CRANS[k] <= voulu) i = k;
  i = Math.max(0, i - _qStep);
  S.pxEff = PX_CRANS[i];
  S.opt.particles = _qStep >= 2 ? 0.4 : (_qStep >= 1 ? 0.7 : 1);
  if (S.pxEff !== _pxApplied) { _pxApplied = S.pxEff; resizeCanvas(); }
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
  S2030.phases && S2030.phases.reset();
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
  goFullscreen();
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

/* ------------------------------------------------------------------ musique
   Deux pistes jouées chacune en entier, l'une après l'autre, puis on
   recommence. Page servie depuis un site : diffusion en flux, mémoire
   constante — deux pistes de plus de quatre minutes décodées coûteraient près
   de deux cents mégaoctets de PCM. Page autonome : les pistes sont embarquées
   en URI de données ; si la politique de sécurité les refuse sur un élément
   média, on retombe sur le décodage en mémoire de la première. */
var MUSIC_FILES = ['neonvelocity-2.mp3', 'neonvelocity.mp3'];

function musicList() {
  if (typeof MUSIC_B64 === 'string' && MUSIC_B64.length > 100) {
    var out = [];
    if (typeof MUSIC_B64_2 === 'string' && MUSIC_B64_2.length > 100)
      out.push('data:audio/mpeg;base64,' + MUSIC_B64_2);
    out.push('data:audio/mpeg;base64,' + MUSIC_B64);
    return out;
  }
  return MUSIC_FILES;
}

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

/* Plein écran. Trois mondes différents, et un seul bouton pour les couvrir :
   - navigateur classique : l'API existe et répond, on bascule ;
   - page embarquée (iframe sans allow="fullscreen") : l'API existe mais
     refuse — c'est le cas qui donnait « je clique et rien ne se passe » ;
   - Safari sur iPhone : l'API n'existe pas du tout, seul « Sur l'écran
     d'accueil » donne un vrai plein écran.
   Dans les deux derniers cas le bouton ouvre une notice au lieu de rester
   muet : un bouton qui ne fait rien est un bug, pas une limite. */
function inFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function fullscreenAvailable() {
  var el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}
function isStandalone() {
  try {
    return !!(navigator.standalone ||
      (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
  } catch (e) { return false; }
}
/* Pourquoi le plein écran est hors de portée ici, ou '' s'il est possible. */
function fullscreenBlocker() {
  if (!fullscreenAvailable()) return 'ios';
  if (document.fullscreenEnabled === false) return 'frame';
  return '';
}
function lockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock)
      screen.orientation.lock('landscape')['catch'](function () {});
  } catch (e) {}
}
/* onFail n'est appelé que si la demande est réellement refusée. */
function goFullscreen(onFail) {
  if (inFullscreen()) return;
  var why = fullscreenBlocker();
  if (why) { onFail && onFail(why); return; }
  var el = document.documentElement;
  var fn = el.requestFullscreen || el.webkitRequestFullscreen;
  try {
    var p = fn.call(el, { navigationUI: 'hide' });
    if (p && p.then) p.then(lockLandscape, function () { onFail && onFail('denied'); });
    else lockLandscape();
  } catch (e) { onFail && onFail('denied'); }
}
/* Safari sur iPhone n'a pas d'API plein écran, mais il replie sa barre
   d'outils quand la page défile. Le document est verrouillé à cent pour cent
   de hauteur, donc il n'y a jamais rien à faire défiler et la barre reste.
   On lui donne quatre-vingts pixels de marge le temps d'un défilement, puis
   on remet tout en place. C'est au mieux quelques dizaines de pixels gagnés,
   pas un vrai plein écran — la notice reste donc affichée. */
var _nudgeOn = false;
function nudgeChrome() {
  /* Deux appuis rapprochés mémorisaient les styles DÉJÀ modifiés et les
     réinstallaient pour de bon : la page restait défilable et 80 px trop
     haute jusqu'au rechargement. Un seul repli à la fois. */
  if (_nudgeOn) return;
  _nudgeOn = true;
  var h = document.documentElement, b = document.body;
  var ph = h.style.cssText, pb = b.style.cssText;
  h.style.height = 'auto'; h.style.overflowY = 'auto';
  b.style.height = (window.innerHeight + 80) + 'px'; b.style.overflowY = 'auto';
  try { window.scrollTo(0, 64); } catch (e) {}
  setTimeout(function () {
    h.style.cssText = ph; b.style.cssText = pb;
    try { window.scrollTo(0, 0); } catch (e) {}
    resizeCanvas();
    _nudgeOn = false;
  }, 900);
}

function leaveFullscreen() {
  try {
    var fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn) fn.call(document);
  } catch (e) {}
}

/* Bouton plein écran, posé par le coeur pour ne pas dépendre de l'interface.
   Il ne vit que sur le menu et l'écran de fin : en jeu il se superposait au
   HUD, et le bas de l'écran appartient aux pouces. */
function buildFullscreenButton() {
  var ui = document.getElementById('ui');
  if (!ui) return;
  // lancé depuis l'icône d'accueil : on est déjà en plein écran, rien à proposer
  if (isStandalone()) return;

  /* Les sélecteurs sont préfixés par #ui : l'interface pose un
     « #ui button{font:inherit;color:inherit;background:none;border:0} » dont
     la spécificité (1,0,1) bat un simple #fsb (1,0,0). Sans ce préfixe le
     bouton perd bordure, fond, couleur et taille — il ne restait qu'un
     libellé gris posé sous les boutons de fin de partie. */
  var st = document.createElement('style');
  st.textContent =
    '#ui #fsb{position:absolute;left:calc(env(safe-area-inset-left,0px) + 10px);' +
    'bottom:calc(env(safe-area-inset-bottom,0px) + 10px);' +
    'pointer-events:auto;z-index:40;display:none;' +
    'border:1px solid rgba(0,229,255,.5);background:rgba(5,6,15,.8);color:#00e5ff;' +
    'border-radius:8px;padding:8px 18px;font:600 10px/1.2 system-ui,sans-serif;' +
    'letter-spacing:.16em;text-transform:uppercase;cursor:pointer;white-space:nowrap}' +
    '#ui #fsb.on{display:block}' +
    '#ui #fsb:active{background:rgba(0,229,255,.22)}' +
    '#ui #fshelp{position:absolute;inset:0;z-index:60;display:none;align-items:center;' +
    'justify-content:center;background:rgba(3,4,10,.88);pointer-events:auto;padding:16px}' +
    '#ui #fshelp.on{display:flex}' +
    '#ui #fshelp .card{max-width:460px;width:100%;max-height:100%;overflow-y:auto;' +
    'border:1px solid rgba(0,229,255,.34);border-radius:14px;background:#080b18;' +
    'padding:18px 20px;color:#cfe9f2;font:400 13px/1.6 system-ui,-apple-system,sans-serif}' +
    '#ui #fshelp h3{color:#00e5ff;font:700 12px/1.3 system-ui,sans-serif;letter-spacing:.2em;' +
    'text-transform:uppercase;margin-bottom:10px}' +
    '#ui #fshelp ol{margin:10px 0 0 18px}#ui #fshelp li{margin-bottom:6px}' +
    '#ui #fshelp b{color:#9df5ff}' +
    '#ui #fshelp .close{margin-top:16px;width:100%;border:1px solid rgba(0,229,255,.5);' +
    'background:rgba(0,229,255,.1);color:#00e5ff;border-radius:9px;padding:10px;' +
    'font:600 11px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}';
  document.head.appendChild(st);

  var help = document.createElement('div');
  help.id = 'fshelp';
  help.innerHTML =
    '<div class="card"><h3>Plein écran</h3><div class="body"></div>' +
    '<button class="close" type="button">J\'ai compris</button></div>';
  ui.appendChild(help);
  var body = help.querySelector('.body');

  function showHelp(why) {
    // on tente quand même de récupérer la barre du navigateur
    if (why === 'ios') nudgeChrome();
    body.innerHTML = why === 'ios'
      ? 'Safari sur iPhone n\'autorise aucune page à passer en plein écran. ' +
        'Je viens de replier ce qui pouvait l\'être, mais la seule méthode qui ' +
        'donne un vrai plein écran :' +
        '<ol><li>touche le bouton <b>Partager</b> de Safari (le carré avec la flèche) ;</li>' +
        '<li>choisis <b>Sur l\'écran d\'accueil</b> ;</li>' +
        '<li>lance SNAKE 2030 depuis l\'icône : plus aucune barre, vrai plein écran.</li></ol>'
      : 'Le jeu est affiché dans un cadre qui n\'autorise pas le plein écran. ' +
        'Ouvre cette page dans son propre onglet — le bouton fonctionnera alors ' +
        'directement.';
    help.classList.add('on');
  }
  /* Le coeur appelle preventDefault() sur les touchstart de #app, ce qui
     supprime le click de compatibilité : un simple addEventListener('click')
     ne se déclenche jamais au doigt. On passe donc par le même branchement
     tactile que le reste de l'interface. */
  function tap(el, fn) {
    if (typeof _uiTap === 'function') return _uiTap(el, fn);
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); fn(el); });
    el.addEventListener('click', function (e) { e.stopPropagation(); fn(el); });
    return el;
  }

  tap(help.querySelector('.close'), function () { help.classList.remove('on'); });

  var btn = document.createElement('button');
  btn.id = 'fsb';
  btn.type = 'button';
  btn.textContent = 'Plein écran';
  ui.appendChild(btn);
  tap(btn, function () {
    if (inFullscreen()) leaveFullscreen();
    else goFullscreen(showHelp);
  });

  function sync() {
    /* Le bouton se posait dès que la phase valait 'menu', donc aussi par-dessus
       les écrans ouverts DEPUIS le menu : il recouvrait à 88 % la pilule RETOUR
       des réglages et des déblocages, et le joueur ne pouvait plus revenir.
       On regarde l'écran réellement affiché, pas la phase. */
    var ecr = (S2030.ui && S2030.ui.screen) ? S2030.ui.screen() : null;
    var libre = ecr === 'menu' || ecr === 'dead' || ecr === null;
    btn.classList.toggle('on', libre && (S.phase === 'menu' || S.phase === 'dead'));
    btn.textContent = inFullscreen() ? 'Quitter le plein écran' : 'Plein écran';
  }
  setInterval(sync, 300);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
}

var _armed = false;
function armAudio() {
  if (_armed || !S2030.audio) return;
  _armed = true;
  S2030.audio.init();
  if (S2030.audio.playlist && S2030.audio.playlist(musicList(), decodeMusic)) return;
  decodeMusic();
}

/* Repli mémoire : on suit l'ordre de la liste, une piste entière à la fois.
   L'ancienne version décodait toujours 'neonvelocity.mp3' en dur, si bien que
   la piste demandée en premier n'était jamais jouée dans aucun cas dégradé. */
function decodeMusic(i) {
  var liste = musicList();
  var n = (i || 0) % liste.length;
  S2030.audio.onTrackEnd(function () { decodeMusic(n + 1); });
  loadSource(liste[n])
    .then(function (ab) { return S2030.audio.decode(ab); })
    .then(function (buf) {
      if (!buf) console.warn('musique : repli sur la synthèse');
      else S2030.audio.start();
    })
    .catch(function () { /* la synthèse prend le relais */ });
}

/* Charge une entrée de la liste, qu'elle soit un fichier ou une URI de
   données. Le décodage en mémoire ne passe jamais par fetch('data:…') : une
   page publiée sert souvent une politique dont le connect-src l'interdirait. */
function loadSource(u) {
  if (u.indexOf('data:') === 0) {
    try {
      var b64 = u.slice(u.indexOf(',') + 1);
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return Promise.resolve(bytes.buffer);
    } catch (e) { return Promise.reject(e); }
  }
  return fetch(u).then(function (r) { return r.arrayBuffer(); });
}

/* --------------------------------------------------------------------- boot */
function boot() {
  window.__S = S; window.__K = K; window.__M = S2030;   // sondes de test
  loadStats();
  setupCanvas();
  addEventListener('resize', function () { setTimeout(resizeCanvas, 60); });
  addEventListener('orientationchange', function () { setTimeout(resizeCanvas, 200); });

  S2030.ui.build(document.getElementById('ui'));
  buildFullscreenButton();
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
