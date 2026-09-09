/* ======
   SNAKE 2030 — amorçage
   Canvas, entrées tactiles, rendu du serpent, boucle principale, cycle de vie.
   ====== */

var cv, ctx, DPR = 1, CW = 0, CH = 0, SCALE = 1, _pxApplied = 1.5, _pxVoulu = 1.5;
var _fsbSync = null, _fsHelp = null;

/* ------ quarantaine des erreurs
   Une exception dans une étape de frame() n'emporte plus l'image : chaque
   étape est isolée, l'entité fautive est marquée dead et retirée (aussitôt
   si c'est son update qui lève, à l'image suivante si c'est son dessin), et
   l'erreur est journalisée une fois par signature — message plus première
   ligne de pile — dans window.__ERR = { count, sigs }. */
var ERR = { count: 0, sigs: {} };

function errSig(e) {
  var msg = (e && e.message != null) ? String(e.message) : String(e);
  var line = '';
  var st = (e && e.stack) ? String(e.stack).split('\n') : [];
  for (var i = 0; i < st.length; i++) {
    var l = st[i].trim();
    if (!l) continue;
    // V8 répète le message en tête de pile ; on veut la première vraie ligne
    if (i === 0 && l.indexOf('@') < 0 && l.indexOf('at ') !== 0 && l.indexOf(msg) >= 0) continue;
    line = l; break;
  }
  return msg + (line ? ' @ ' + line : '');
}

function errLog(where, e) {
  ERR.count++;
  var sig = where + ' | ' + errSig(e);
  if (ERR.sigs[sig]) { ERR.sigs[sig]++; return; }
  ERR.sigs[sig] = 1;
  try { console.warn('SNAKE 2030 — erreur mise en quarantaine : ' + sig); } catch (x) { /* rien */ }
}

/* Repère monde de l'image en cours, gardé pour le rétablir après une
   exception survenue au milieu d'un save() : on déroule toute la pile, on
   remet les attributs à leur défaut et on repose la caméra. */
var _WX = { bw: 0, bh: 0, rt: 0, sx: 1, sy: 1, ox: 0, oy: 0 };

function worldXf(g, W) {
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.translate(W.bw / 2, W.bh / 2);
  if (W.rt) g.rotate(W.rt);
  g.scale(W.sx, W.sy);
  g.translate(-S.cam.x + W.ox, -S.cam.y + W.oy);
}

function gfxRecover(g, W) {
  try {
    for (var k = 0; k < 32; k++) g.restore();   // au-delà de la pile : sans effet
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)';
    g.setLineDash([]); g.lineWidth = 1;
    if ('filter' in g) g.filter = 'none';
    if (W) { g.save(); worldXf(g, W); }
    else g.setTransform(DPR, 0, 0, DPR, 0, 0);
  } catch (x) { /* contexte perdu : l'image suivante repart de zéro */ }
}

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
  /* Hauteur de vue de référence en unités monde, puis la largeur est bornée :
     jamais moins de 1000 unités (fenêtre haute et étroite : on dézoome au
     lieu de couper) ni plus de 1600 (écran ultra-large : on ne voit pas toute
     l'arène). La hauteur suit — ce n'est plus une constante. */
  SCALE = h / K.VIEW_H;
  if (w / SCALE < 1000) SCALE = w / 1000;
  if (w / SCALE > 1600) SCALE = w / 1600;
  S.view.h = h / SCALE;
  S.view.w = w / SCALE;
  // bureau : une fenêtre haute est une fenêtre, pas un téléphone à tourner
  var portrait = !S.desktop && h > w;
  document.body.classList.toggle('portrait', portrait);
  /* Le bandeau « tourne ton téléphone » est opaque et avale les touchers : la
     partie continuait derrière, le joueur encaissant des coups qu'il ne
     pouvait ni voir ni éviter. On met en pause comme pour l'arrière-plan. */
  if (portrait && S.phase === 'play' && !S.paused) togglePause();
}

/* ------ entrées tactiles */
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
  if (e.cancelable) e.preventDefault();
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
  if (e.cancelable) e.preventDefault();
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
  if (e.cancelable) e.preventDefault();
}

function pressBtn(b) {
  if (b === 'special') useSpecial();
  if (b === 'ult') useUlt();
}

/* --- clavier : pilotage complet sur ordinateur ---
   Directions lues sur e.code, la position physique de la touche : ZQSD et
   WASD marchent tels quels sur AZERTY comme sur QWERTY, plus les flèches.
   Actions lues sur e.key. Les raccourcis du navigateur (Cmd+R, Ctrl+…,
   Alt+…) ne touchent jamais au jeu ; la répétition automatique d'une touche
   maintenue ne relance pas une action. Écouteurs en capture sur window : un
   événement synthétique posé sur document sans bubbles y passe aussi. */
var keys = {};
var KEY_ONCE = { e: 1, r: 1, f: 1, p: 1, escape: 1, enter: 1 };
function clearKeys() { for (var k in keys) keys[k] = false; }
function keyName(e) {
  var k = e.key || '';
  if (!k && e.code) {
    var c = e.code;
    if (c.length === 4 && c.indexOf('Key') === 0) k = c.charAt(3);
    else if (c === 'Space') k = ' ';
    else k = c;
  }
  return k.toLowerCase();
}
function toggleFullscreenKey() {
  if (inFullscreen()) leaveFullscreen();
  else goFullscreen(_fsHelp);
}
addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // un écran affiché (menu, cartes, pause, fin, réglages) a la priorité sur les touches de jeu
  if (S2030.ui && S2030.ui.key && S2030.ui.key(e)) return;
  var k = keyName(e), code = e.code || '';
  if (e.repeat && KEY_ONCE[k]) return;
  if (code) keys[code] = true;
  if (!e.repeat && DIR_KEYS[code]) { mouse.on = false; mouse.acc = 0; }   // 'auto' : la souris rend la main
  var space = code === 'Space' || e.key === ' ';
  if ((space || code.indexOf('Arrow') === 0) && e.cancelable) e.preventDefault();
  if (space) {
    if (S.paused) { if (!e.repeat) togglePause(); return; }
    S.input.boost = true;
    return;
  }
  if (k === 'e') useSpecial();
  else if (k === 'r') useUlt();
  else if (k === 'p' || k === 'escape') togglePause();
  else if (k === 'enter') { if (S.paused) togglePause(); }
  else if (k === 'f') toggleFullscreenKey();
}, true);
addEventListener('keyup', function (e) {
  var code = e.code || '';
  if (code) keys[code] = false;
  if (code === 'Space' || e.key === ' ') S.input.boost = false;
}, true);
function keyboardInput() {
  var kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.KeyQ || keys.ArrowLeft ? 1 : 0);
  var ky = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.KeyZ || keys.ArrowUp ? 1 : 0);
  _kdir = !!(kx || ky);
  if (kx || ky) {
    var m = Math.hypot(kx, ky);
    S.input.jx = kx / m; S.input.jy = ky / m; S.input.jmag = 1; S.input.jactive = true;
  } else if (!touchJoy) { S.input.jmag = 0; S.input.jactive = false; }
}

/* --- souris (bureau). S.opt.mouse 'auto' : active après 8 px cumulés, rendue à la première touche de
   direction. Gauche = boost, droit = spécial, molette ou central = ultime. */
var mouse = { x: 0, y: 0, has: false, on: false, acc: 0, lb: false, moveAt: -1e9, cur: '', aim: null };
var _kdir = false, _mh = { sx: 0, sy: 0 };
var DIR_KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyZ: 1, KeyQ: 1 };
function mouseActive() {
  var m = S.opt.mouse || 'auto';
  return !!S.desktop && mouse.has && m !== 'never' && (m === 'always' || mouse.on);
}
function inPlay() { return S.phase === 'play' && !S.paused; }
function onMouseMove(e) {
  if (!S.desktop) return;
  if (mouse.has && !mouse.on) { mouse.acc += Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y); if (mouse.acc >= 8) mouse.on = true; }
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.has = true; mouse.moveAt = performance.now();
  if (mouse.cur === 'none') mouseCursor(mouse.moveAt);     // réticule sans attendre l'image suivante
}
function onMouseDown(e) {
  if (!S.desktop || (e.target && e.target.tagName === 'BUTTON')) return;   // le bouton pause n'est pas un boost
  if (e.button === 0) { mouse.lb = true; if (inPlay()) S.input.boost = true; }
  else if (e.button === 1) { e.preventDefault(); if (inPlay()) useUlt(); }
}
function onMouseUp(e) {
  if (!S.desktop || e.button !== 0) return;
  mouse.lb = false; S.input.boost = false;
}
function onWheel(e) {
  if (!S.desktop || !inPlay()) return;          // en pause la molette défile les réglages
  e.preventDefault();
  if (e.deltaY) useUlt();
}
function onContextMenu(e) {
  e.preventDefault();
  if (S.desktop && inPlay()) useSpecial();
}
/* souris → S.input (avant updateSnake) : au-delà de 24 px, cap = atan2 − roulis, jmag = |d|/120 dans [0,25 ; 1] ;
   touche de direction tenue : les touches dirigent, la souris vise (mouse.aim) */
function mouseInput() {
  mouse.aim = null;
  if (!S.snake || !mouseActive()) return;
  var P = S2030.phases, s = S.snake, h = P.worldToScreen(s.x, s.y, _mh);
  var dx = mouse.x - h.sx, dy = mouse.y - h.sy, L = Math.hypot(dx, dy), inp = S.input;
  if (L > 24) {
    var cap = Math.atan2(dy, dx) - P.rot();
    if (_kdir) mouse.aim = cap;
    else { inp.jx = Math.cos(cap); inp.jy = Math.sin(cap); inp.jmag = clamp(L / 120, 0.25, 1); inp.jactive = true; }
  } else if (!_kdir) { inp.jmag = 0; inp.jactive = false; }
}
/* visée souris, après updateSnake et avant les armes */
function mouseAim() {
  if (mouse.aim === null) return;
  var s = S.snake;
  s.aim = norm(s.ang + clamp(norm(mouse.aim - s.ang), -RAIL_LOOK, RAIL_LOOK));
}
/* curseur : réticule en jeu, masqué après 1,5 s sans mouvement */
function mouseCursor(now) {
  var want = (S.desktop && inPlay()) ? (now - mouse.moveAt > 1500 ? 'none' : 'ret') : '';
  if (want === mouse.cur) return;
  mouse.cur = want;
  S2030.ui && S2030.ui.cursor && S2030.ui.cursor(want);
}

/* ------ capacités */
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
  /* Un flash à 0,85 mangeait l'écran une demi-seconde et la bannière cachait
     le déferlement : 0,4 pendant 120 ms, et on regarde le jeu. */
  S2030.fx && S2030.fx.flash('#ffffff', 0.4, null, null, 120);
  S2030.fx && S2030.fx.shake(18);
  haptic([40, 20, 90]);
  // minuteries en temps de jeu (S.t, contrat : jamais l'horloge murale) : le
  // ralenti et le déferlement durent le même nombre d'images d'une machine à
  // l'autre, et s'arrêtent avec la pause
  _ultEnd = S.t + 420;
  _ultStep = 0; _ultNext = S.t + 90;   // premier palier à 90 ms, comme l'ancien setInterval
}

/* Déferlement de l'ultime : vague de destruction concentrique, six paliers à
   90 ms de jeu ; le ralenti se relâche à 420 ms de jeu. Appelé chaque image de
   jeu par frame(). */
var _ultEnd = -1, _ultStep = 9, _ultNext = 0;
function ultTick() {
  if (_ultEnd >= 0 && S.t >= _ultEnd) { _ultEnd = -1; S.timeScale = 1; }
  if (_ultStep > 5) return;
  if (S.phase !== 'play') { _ultStep = 9; return; }
  while (_ultStep <= 5 && S.t >= _ultNext) {
    var s = S.snake, r = 160 + _ultStep * 188;          // six paliers : 160 -> 1 100 u
    S2030.fx && S2030.fx.ring(s.x, s.y, '#fff3b0', r * 0.5, 1400);
    var list = enemiesNear(s.x, s.y, r);
    // les dégâts suivent le SECTEUR (S.level = numéro de secteur) : 50 au secteur 1
    var udm = 40 + 10 * (S.level || 1);
    for (var i = 0; i < list.length; i++) damageEnemy(list[i], udm, { x: list[i].x, y: list[i].y });
    S2030.audio && S2030.audio.sfx('explode');
    _ultStep++; _ultNext += 90;
  }
}

/* ------ rendu du serpent */
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

  drawBoostArc(s);
}

// jauge de boost autour de la tête : arc de 270°, rayon 2,2 × HEAD_R, 3 px d'écran, ambre (rouge sous 20 %)
function drawBoostArc(s) {
  var f = clamp(s.boostE / (s.boostMax || 100), 0, 1);
  if (f >= 1 && !s.boosting) return;
  var zm = 1;
  try { if (S2030.phases && S2030.phases.zoom) zm = S2030.phases.zoom(); } catch (x) { zm = 1; }
  var r = K.HEAD_R * 2.2, a0 = aimAng() - Math.PI * 0.75, span = Math.PI * 1.5;   // se remplit de l'arrière-gauche vers l'avant
  ctx.save();
  ctx.lineCap = 'butt'; ctx.lineWidth = 3 / (SCALE * zm); ctx.strokeStyle = f < 0.2 ? '#ff2a2a' : '#ffd166';
  ctx.globalAlpha = 0.28;                          // piste discrète sur les 270°, puis la part remplie
  ctx.beginPath(); ctx.arc(s.x, s.y, r, a0, a0 + span); ctx.stroke();
  if (f > 0.002) { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(s.x, s.y, r, a0, a0 + span * f); ctx.stroke(); }
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
    try {
      if (S2030.weapons && S2030.weapons.drawBullet) S2030.weapons.drawBullet(ctx, b);
      else { ctx.fillStyle = b.color || '#fff3b0'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
    } catch (x) { b.life = 0; errLog('bullet.draw:' + (b.kind || '?'), x); gfxRecover(ctx, _WX); }
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

/* ------ boucle de jeu */
var lastT = 0, accFps = 0, accReal = 0, frames = 0, fps = 60;

function frame(now) {
  requestAnimationFrame(frame);
  var real = Math.min(0.05, (now - lastT) / 1000 || 0.016);   // temps d'image réel, s
  lastT = now;
  // pas de temps imposé par une sonde de test (window.__DT, en secondes) : la
  // latence « en images » mesurée sur le treillis ne dépend plus du taux
  // d'images réel de la machine de test, et la suite d'états du jeu devient
  // la même d'une exécution à l'autre ; jamais posé en jeu normal. La mesure
  // de qualité, elle, regarde toujours le temps d'image réel.
  var raw = window.__DT > 0 ? Math.min(0.05, +window.__DT) : real;

  frames++; accFps += raw; accReal += real;
  if (accFps > 0.5) { fps = frames / accReal; frames = 0; accFps = 0; accReal = 0; autoQuality(); }

  /* HITSTOP compté en IMAGES. On lit d'abord, on gèle, PUIS on consomme :
     une pose faite plus loin dans cette image (un kill, un coup reçu) ne peut
     donc pas être avalée par l'image qui la pose. C'est ce décalage qui
     manquait — fx.hitstop(12) ne gelait rien du tout. */
  var hs = S2030.fx && S2030.fx.hitstopLeft ? S2030.fx.hitstopLeft() : 0;
  var scale = hs > 0 ? 0.08 : S.timeScale;
  var dt = raw * scale;
  S.dt = dt;
  if (hs > 0 && S2030.fx.hitstopStep) S2030.fx.hitstopStep();

  // le réglage de netteté s'applique sans passer par un événement de mise en page
  try {
    qualitySample(real);
    qualityTilt();
    if (_fsbSync) _fsbSync();
    if (S.opt.px !== _pxVoulu) { _pxVoulu = S.opt.px; _qStep = 0; _qBon = 0; applyQuality(); }
    mouseCursor(now);
  } catch (e) { errLog('quality', e); }

  /* Chaque étape est isolée : une exception dans l'une ne prive pas les
     suivantes, et render() puis hud() tournent quoi qu'il arrive. */
  if (S.phase === 'play' && !S.paused) {
    S.t += raw * 1000;
    try { keyboardInput(); } catch (e) { errLog('keyboardInput', e); }
    try { mouseInput(); } catch (e) { errLog('mouseInput', e); }
    try { ultTick(); } catch (e) { errLog('ultTick', e); }
    try { updateSnake(dt); } catch (e) { errLog('updateSnake', e); }
    try { mouseAim(); } catch (e) { errLog('mouseAim', e); }
    S.levelT += dt;
    try { S2030.levels && S2030.levels.update && S2030.levels.update(dt); } catch (e) { errLog('levels.update', e); }
    updateEnemies(dt);                       // try/catch par ennemi
    try { S2030.weapons && S2030.weapons.update && S2030.weapons.update(dt); } catch (e) { errLog('weapons.update', e); }
    try { S2030.phases && S2030.phases.update(dt); } catch (e) { errLog('phases.update', e); }
    try { auraTick(dt); } catch (e) { errLog('auraTick', e); }
    try { sonicTick(dt); } catch (e) { errLog('sonicTick', e); }
    try { poolsTick(dt); } catch (e) { errLog('poolsTick', e); }
    try { collide(dt); } catch (e) { errLog('collide', e); }
    // dernier mot au treillis : plus rien ne déplacera les ennemis après
    try { S2030.phases && S2030.phases.railLate && S2030.phases.railLate(dt); } catch (e) { errLog('railLate', e); }
    if (S.multT > 0) { S.multT -= raw * 1000; if (S.multT <= 0) { S.mult = 1; S.combo = 0; } }
    if (S.specialCd > 0) S.specialCd -= raw * 1000;
    try { updateCam(dt); } catch (e) { errLog('updateCam', e); }
    /* DERNIER MOT sur l'arrivée pilotée du boss, sur le ralenti d'entrée et sur
       la fuite de fin de secteur. Placé APRÈS updateCam et après phases.update :
       la projection que le boss doit viser est celle de l'image RÉELLEMENT
       dessinée. Écrit plus tôt (avant updateCam), le cliquet de la cible jugeait
       la caméra de l'image précédente et deux essais sur vingt sortaient du
       cadre quand la caméra filait — sy 0,068 et sx 0,924, mesurés. S.timeScale
       y est écrit après updateSnake, donc après DILATATION et après le ralenti
       de blessure : le ralenti de boss garde la priorité. */
    try { S2030.levels && S2030.levels.late && S2030.levels.late(dt); } catch (e) { errLog('levels.late', e); }
    try { S2030.audio && S2030.audio.setIntensity(S.intensity); } catch (e) { errLog('audio.setIntensity', e); }
    try { readyTick(); } catch (e) { errLog('readyTick', e); }
    if (S.lvlUps > 0) { try { openCards(); } catch (e) { errLog('openCards', e); } }
  } else if (S.phase === 'dead' || S.phase === 'cards') {
    S.t += raw * 1000;
    // la caméra continue de se redresser : sinon le récapitulatif se lit sur
    // une image penchée à 30° et gardée telle quelle
    try { S2030.phases && S2030.phases.settle && S2030.phases.settle(raw); } catch (e) { errLog('phases.settle', e); }
  } else if (S.phase === 'menu') {
    S.t += raw * 1000;
    S.cam.x = lerp(S.cam.x, K.ARENA_W / 2, 0.02);
    S.cam.y = lerp(S.cam.y, K.ARENA_H / 2, 0.02);
  } else {
    S.t += raw * 1000;
  }

  try { S2030.fx && S2030.fx.update(raw); } catch (e) { errLog('fx.update', e); }
  try { render(); } catch (e) { errLog('render', e); gfxRecover(ctx, null); }
  try { S2030.ui && S2030.ui.hud && S2030.ui.hud(); } catch (e) { errLog('hud', e); }
  syncControls();
}

function updateEnemies(dt) {
  var ts = 1;
  try { ts = S2030.phases ? S2030.phases.enemyTimeScale() : 1; } catch (x) { errLog('enemyTimeScale', x); }
  dt *= ts;
  var E = S2030.enemies;
  for (var i = S.enemies.length - 1; i >= 0; i--) {
    var e = S.enemies[i];
    if (e.dead) { S.enemies.splice(i, 1); continue; }
    e.t += dt * 1000;
    if (e.hitT > 0) e.hitT -= dt * 1000;
    if (!E || !E.update) continue;
    try { E.update(e, dt); }
    catch (x) { e.dead = true; e.qrt = 1; S.enemies.splice(i, 1); errLog('enemy.update:' + e.type, x); }
  }
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, CW, CH);

  var P = S2030.phases;
  try { applyPersp((P && P.persp) ? P.persp() : 0); } catch (x) { errLog('applyPersp', x); }
  drawWorld(ctx, CW, CH);

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  try { S2030.fx && S2030.fx.drawScreen && S2030.fx.drawScreen(ctx, CW, CH); }
  catch (x) { errLog('fx.drawScreen', x); gfxRecover(ctx, null); }
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
  var zm = 1, tl = 0, rt = 0;
  try { if (P) { zm = P.zoom(); tl = P.tilt(); rt = P.rot(); } } catch (x) { errLog('phases.camera', x); }
  var sx2 = SCALE * zm, sy2 = SCALE * zm * (1 - tl * 0.42);
  // la vue change de taille avec le zoom et avec la cible : le tri du visible
  // doit suivre, sinon la perspective révèle les trous là où l'on a coupé
  S.view.w = bw / sx2; S.view.h = bh / sy2;
  _WX.bw = bw; _WX.bh = bh; _WX.rt = rt; _WX.sx = sx2; _WX.sy = sy2; _WX.ox = ox; _WX.oy = oy;
  g.save();
  worldXf(g, _WX);

  /* Chaque couche est isolée : si l'une lève au milieu d'un save(), on
     déroule la pile et on repose la caméra avant de passer à la suivante. */
  try {
    try { S2030.levels && S2030.levels.drawBack && S2030.levels.drawBack(g); } catch (x) { errLog('levels.drawBack', x); gfxRecover(g, _WX); }
    try { P && P.drawFloor(g); } catch (x) { errLog('phases.drawFloor', x); gfxRecover(g, _WX); }
    try { drawArenaEdge(); } catch (x) { errLog('drawArenaEdge', x); gfxRecover(g, _WX); }
    try { drawPools(g); } catch (x) { errLog('drawPools', x); gfxRecover(g, _WX); }
    try { drawPickups(); } catch (x) { errLog('drawPickups', x); gfxRecover(g, _WX); }

    var E = S2030.enemies;
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.qrt || !inView(e.x, e.y, e.r + 60)) continue;
      if (!E || !E.draw) continue;
      try { E.draw(g, e); }
      catch (x) { e.dead = true; e.qrt = 1; errLog('enemy.draw:' + e.type, x); gfxRecover(g, _WX); }
    }

    try { drawBullets(); } catch (x) { errLog('drawBullets', x); gfxRecover(g, _WX); }
    try { if (S.snake) drawSnake(); } catch (x) { errLog('drawSnake', x); gfxRecover(g, _WX); }
    try { P && P.drawDiag(g); } catch (x) { errLog('phases.drawDiag', x); gfxRecover(g, _WX); }
    try { S2030.fx && S2030.fx.draw(g); } catch (x) { errLog('fx.draw', x); gfxRecover(g, _WX); }
    try { S2030.levels && S2030.levels.drawFore && S2030.levels.drawFore(g); } catch (x) { errLog('levels.drawFore', x); gfxRecover(g, _WX); }
  } finally {
    g.restore();
    ctx = _prev;
  }
}

/* ------ perspective
   Transformation CSS 3D posée sur le canvas : le rendu reste plat, seul l'affichage penche,
   sur le processeur graphique (la première version recopiait 96 bandes par image : 73 % du
   temps processeur et un escalier sur les diagonales). Le plan penché ne couvre plus l'écran,
   d'où l'agrandissement calculé ici et la compensation de zoom côté caméra. */
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
  if (q <= 0.0005) {
    cv.style.transform = '';
    cv.style.willChange = '';            // la couche promue ne doit pas survivre
    cv.style.backfaceVisibility = '';
    return;
  }
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

/* ------ qualité adaptative
   Trois défauts mesurés sur l'ancienne version : le seuil de 42 images/s ne se
   déclenchait jamais pendant la bascule 3D (le jeu y lit 48 à 54 im/s de
   moyenne tout en perdant une image sur six) ; la dégradation ne remontait
   jamais ; et elle écrasait le réglage du joueur dans son profil enregistré.
   On regarde donc la proportion d'images longues plutôt que la moyenne, on
   remonte dès que ça respire, et l'ajustement automatique reste en mémoire
   sans jamais toucher au choix du joueur. */
var _qWin = [], _qStep = 0, _qHold = 0, _qBon = 0;
var PX_CRANS = [1, 1.25, 1.5, 2];

function qualitySample(raw) {
  _qWin.push(raw);
  if (_qWin.length > 120) _qWin.shift();
}

/* On ne remonte jamais pendant la bascule (la mesure redevient bonne PARCE QU'ON A BAISSÉ :
   neuf changements en 90 s mesurés) et seulement après seize contrôles d'affilée sans aucune
   image longue. Descente (G1) dès que la fenêtre de deux secondes contient au moins deux
   images longues (≈ 1 %) ; une image isolée ne compte pas. */
function autoQuality() {
  if (_qWin.length < 60) return;
  var longues = 0;
  for (var i = 0; i < _qWin.length; i++) if (_qWin[i] > 0.033) longues++;
  var part = longues / _qWin.length;
  if (_qHold > 0) { _qHold--; return; }

  if (longues >= 2 && part > 0.01 && _qStep < 3) {
    _qStep++; _qBon = 0;
    applyQuality();
    _qHold = 4;                 // deux secondes de répit, puis on remesure
    _qWin.length = 0;
    return;
  }

  var penche = S2030.phases && S2030.phases.persp && S2030.phases.persp() > 0.01;
  if (longues === 0 && _qStep > 0 && !penche) {
    // seize contrôles sains d'affilée — huit secondes sans une image longue —
    // pour regagner un cran : remonter vite, c'est retomber tout de suite
    if (++_qBon >= 16) {
      _qStep--; _qBon = 0;
      applyQuality();
      _qHold = 12;
      _qWin.length = 0;
    }
  } else if (longues >= 2) _qBon = 0;    // une image longue isolée ne remet pas à zéro
}

/* Le cran automatique s'applique par-dessus le choix du joueur sans jamais
   l'écraser : S.opt.px reste ce qu'il a réglé, S.pxEff est ce qui est rendu.
   La bascule coûte un cran de plus, de façon déterministe : c'est le moment
   où le compositeur travaille le plus, et une règle fixe ne peut pas osciller
   comme le ferait une boucle de rétroaction. */
function applyQuality() {
  var voulu = S.opt.px || 1.5;
  var base = 0;
  for (var k = 0; k < PX_CRANS.length; k++) if (PX_CRANS[k] <= voulu) base = k;
  var penche = S2030.phases && S2030.phases.persp && S2030.phases.persp() > 0.01;
  var i = Math.max(0, base - _qStep - (penche ? 1 : 0));
  S.pxEff = PX_CRANS[i];
  /* On n'écrit PLUS dans S.opt : c'est l'objet enregistré dans le profil, et
     « densité des particules » est un réglage du joueur à part entière. La
     dégradation vit dans S.partEff, que le rendu lit. */
  var vp = S.opt.particles === undefined ? 1 : S.opt.particles;
  S.partEff = Math.min(vp, _qStep >= 2 ? 0.4 : (_qStep >= 1 ? 0.7 : 1));
  if (S.pxEff !== _pxApplied) { _pxApplied = S.pxEff; resizeCanvas(); }
}

/* La bascule s'installe et se retire progressivement : on ne rebascule la
   netteté qu'aux deux franchissements, pas à chaque image. */
var _penchePrec = false;
function qualityTilt() {
  var penche = !!(S2030.phases && S2030.phases.persp && S2030.phases.persp() > 0.01);
  if (penche === _penchePrec) return;
  _penchePrec = penche;
  applyQuality();
  _qWin.length = 0; _qBon = 0; _qHold = 8;
}

/* ------ cartes / niveaux */
/* Montée de niveau : 350 ms de ralenti tenu AVANT l'écran de cartes. Le
   passage était instantané — on voyait l'écran, jamais la montée. Appelé
   chaque image de jeu par frame() tant que S.lvlUps > 0. */
var _lvlSeq = 0, _cardsNext = 0;
function openCards() {
  if (S.phase !== 'play') return;
  /* Deux écrans de cartes ne se touchent pas. Absorber la file (S.lvlUps = 0)
     ne suffit pas : une montée GAGNÉE juste après la fermeture — les six vagues
     d'un ultime tombent volontiers dans les images qui suivent — rouvrait un
     écran 610 ms plus tard. Mesuré sur 20 parties 'sloppy' : 14 enchaînements
     de moins de 2 s sur 534, soit 2,6 %. La montée n'est pas perdue, elle
     attend, et sera absorbée par l'écran suivant. */
  if (S.t < _cardsNext) return;
  var s = S.snake;
  if (_lvlSeq === 0) {
    _lvlSeq = S.t + 350;
    S.timeScale = 0.15;
    s.invuln = Math.max(s.invuln, 900);
    S2030.fx && S2030.fx.flash('#ffffff', 0.3);
    S2030.fx && S2030.fx.ring(s.x, s.y, '#ffffff', 10, 2000, { w: 6, life: 0.5 });
    S2030.phases && S2030.phases.pulse(0.08);
    S2030.audio && S2030.audio.sfx('levelup');
    haptic(14);
    return;
  }
  if (S.t < _lvlSeq) {
    S.timeScale = 0.15;
    s.invuln = Math.max(s.invuln, 300);
    return;
  }
  _lvlSeq = 0;
  /* Plusieurs montées en attente ne donnent plus une file d'écrans enchaînés à
     610 ms d'intervalle : UN SEUL écran, quatre cartes au lieu de trois, et la
     file entière est absorbée par le choix (S.lvlUps = 0). */
  var pend = S.lvlUps;
  S.lvlUps--;                                     // sécurité : si la main sort vide, on ne reboucle pas
  S.phase = 'cards';
  S.timeScale = 1; _ultEnd = -1; _ultStep = 9;   // un ultime en cours s'arrête là, comme avant
  /* TROPHÉE : la carte d'un boss abattu n'est jamais commune. */
  var trophy = !!S.trophyNext;
  S.trophyNext = 0;
  var cards = S2030.upgrades
    ? (trophy ? S2030.upgrades.roll(3, { trophy: true }) : S2030.upgrades.roll(pend >= 2 ? 4 : 3))
    : [];
  if (!cards.length) { S.phase = 'play'; return; }
  S2030.audio && S2030.audio.sfx('card');
  S2030.ui.showCards(cards, function (id) {
    S2030.upgrades.apply(id);
    S.cardsTaken = (S.cardsTaken | 0) + 1;
    S2030.audio && S2030.audio.sfx('card');
    S.lvlUps = 0;                                 // toute la file est absorbée
    _cardsNext = S.t + 2500;                      // pas deux écrans coup sur coup
    S.phase = 'play';
  });
}

/* Sons « prêt » : l'ultime et le pouvoir se remplissaient en silence.
   ultReady existait dans la banque et n'était appelé nulle part. */
var _rdyUlt = 0, _rdyPow = 0, _rdyPowArm = 0;
function readyTick() {
  var full = S.ult >= (S.ultMax || 100);
  if (full) {
    if (!_rdyUlt) {
      _rdyUlt = 1;
      S2030.audio && S2030.audio.sfx('ultReady');
      S2030.ui && S2030.ui.toast && S2030.ui.toast('APOGÉE PRÊTE', '★ / R');
    }
  } else _rdyUlt = 0;
  if (!_rdyPow) {
    if (S.specialCd > 0) _rdyPowArm = 1;
    else if (_rdyPowArm || S.t > 2500) {
      _rdyPow = 1;
      S2030.ui && S2030.ui.toast && S2030.ui.toast('POUVOIR PRÊT', '◈ / E');
    }
  }
}

/* ------ cycle de vie */
function resetRun() {
  // graine tirée de l'horloge, sauf si une sonde de test l'impose (window.__SEED :
  // même exception que window.__S/__K/__M dans boot) — mêmes vagues d'une
  // exécution à l'autre pour la batterie de non-régression
  var sd = (typeof window !== 'undefined' && window.__SEED != null) ? (Math.floor(+window.__SEED) || 1)
         : (Math.floor(performance.now()) % 100000) + 7;
  seedRnd((S.seed = sd));
  S.snake = makeSnake();
  S.enemies.length = 0; S.bullets.length = 0; S.ebullets.length = 0;
  S.pickups.length = 0; S.drones.length = 0; S.pools.length = 0;
  S.score = 0; S.mult = 1; S.multT = 0; S.multTMax = 5000; S.combo = 0; S.kills = 0;
  S.xp = 0; S.xpNext = 6; S.lvlUps = 0; S.cardsTaken = 0;
  S.up = {}; S.ult = 0; S.special = 0; S.specialCd = 0;
  S.coins = 0; S.level = 1; S.levelT = 0; S.intensity = 0; S.levelProgress = 0;
  S.timeScale = 1; S.boss = null; S.bossBornT = 0; S.bossKills = 0; S.trophyNext = 0; _ultEnd = -1; _ultStep = 9;
  _lvlSeq = 0; _cardsNext = 0; _rdyUlt = 0; _rdyPow = 0; _rdyPowArm = 0;
  mouse.on = false; mouse.acc = 0; mouse.aim = null;
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
  // la transition (plein écran, armement audio, remise à zéro) saccade par
  // nature : la mesure de qualité repart de zéro, sinon le premier cran
  // tombait dès la première seconde sur une machine parfaitement saine
  _qWin.length = 0; _qBon = 0; _qHold = 10; _qStep = 0; applyQuality();
  // bureau : la fenêtre est jouable telle quelle, F bascule le plein écran ;
  // goFullscreen() verrouille aussi le paysage, on saute les deux
  if (!S.desktop) goFullscreen();
  armAudio();                       // le bouton JOUER est un geste utilisateur valide
  S2030.audio && S2030.audio.resume();
  /* La phase est posée AVANT la remise à zéro : resetRun se termine par
     levels.start(1), et _lvSay renonce tant que S.phase !== 'play'. Dans
     l'ordre inverse, la bannière « NIVEAU 1 — LA GRILLE » n'était jamais
     émise — la seule des onze qui manquait. S.levelT vient d'être remise à
     zéro par resetRun, l'échéance « moins d'une seconde » est donc tenue. */
  S.phase = 'play';
  resetRun();
  S.paused = false;
  S2030.ui.showScreen(null);
  S2030.audio && S2030.audio.start();
  requestWake();
}

/* reason 'blur' : pause subie (fenêtre inactive, onglet caché), bandeau
   distinct de la pause volontaire. Toute pause vide le clavier : une touche
   enfoncée à cet instant ne doit pas rester collée à la reprise. */
function togglePause(reason) {
  if (S.phase !== 'play' && !S.paused) return;
  S.paused = !S.paused;
  clearKeys();
  if (S2030.ui.setPauseBlur) S2030.ui.setPauseBlur(S.paused && reason === 'blur');
  S2030.ui.showScreen(S.paused ? 'pause' : null);
  if (S.paused) S2030.audio && S2030.audio.stop();
  else {
    S2030.audio && S2030.audio.start();
    if (S.phase === 'play') requestWake();
  }
}

/* Perte de focus (fenêtre, onglet, page) : plus aucune entrée ne reste
   enfoncée — ni touche, ni manche, ni bouton — et la partie se met en pause. */
function loseFocus() {
  clearKeys();
  var inp = S.input;
  inp.jx = 0; inp.jy = 0; inp.jmag = 0;
  inp.jactive = false; inp.boost = false; inp.special = false; inp.ult = false;
  touchJoy = null; touchBtns = {}; mouse.lb = false;
  if (S.snake) S.snake.boosting = false;
  S2030.ui && S2030.ui.releaseJoy && S2030.ui.releaseJoy();
  if (S.phase === 'play' && !S.paused) togglePause('blur');
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

/* ------ musique
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
    /* le seul texte de l'interface qui vivait hors de la feuille de 26-ui.js :
        sans var(--uis) le réglage « Taille de l'interface » ne l'atteignait pas
        et il restait sous le plancher typographique. */
    'border-radius:8px;padding:8px 18px;' +
    'font:600 calc(var(--uis,1)*max(var(--fmin,11px),10px))/1.2 system-ui,sans-serif;' +
    'letter-spacing:.16em;text-transform:uppercase;cursor:pointer;white-space:nowrap}' +
    '#ui #fsb.on{display:block}' +
    '#ui #fsb:active{background:rgba(0,229,255,.22)}' +
    '#ui #fshelp{position:absolute;inset:0;z-index:60;display:none;align-items:center;' +
    'justify-content:center;background:rgba(3,4,10,.88);pointer-events:auto;padding:16px}' +
    '#ui #fshelp.on{display:flex}' +
    '#ui #fshelp .card{max-width:460px;width:100%;max-height:100%;overflow-y:auto;' +
    '-webkit-overflow-scrolling:touch;touch-action:pan-y;' +
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
  /* Le coeur avale les gestes posés sur #app, qui contient l'interface : sans
     ce branchement la carte ne défilait pas et, sous 305 px de haut, le
     bouton « J'ai compris » devenait inatteignable — le jeu restait bloqué
     derrière la notice. */
  if (typeof _uiScrollable === 'function') _uiScrollable(help.querySelector('.card'));

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
      : why === 'frame'
        ? 'Le jeu est affiché dans un cadre qui n\'autorise pas le plein écran. ' +
          'Ouvre cette page dans son propre onglet — le bouton fonctionnera alors ' +
          'directement.'
        : 'Ton navigateur a refusé le passage en plein écran. Essaie depuis un ' +
          'onglet ordinaire, sans mode de navigation restreint, ou ajoute le jeu ' +
          'à ton écran d\'accueil.';
    help.classList.add('on');
    btn.classList.remove('on');          // il tombait sous « J'ai compris »
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
    /* L'écran de fin s'appelle 'over', pas 'dead' : mon premier garde-fou le
       masquait donc là où il devait justement être. La phase et le nom
       d'écran n'ont jamais eu le même vocabulaire. */
    var ecr = (S2030.ui && S2030.ui.screen) ? S2030.ui.screen() : null;
    // 'null' n'est plus accepté : c'est l'état pendant l'animation de mort et
    // juste après REJOUER, où le bouton se retrouvait posé sur le jeu
    var libre = ecr === 'menu' || ecr === 'over';
    var notice = help.classList.contains('on');
    btn.classList.toggle('on', !notice && libre && (S.phase === 'menu' || S.phase === 'dead'));
    btn.textContent = (inFullscreen() ? 'Quitter le plein écran' : 'Plein écran') + (S.desktop ? ' (F)' : '');
  }
  _fsHelp = showHelp;
  // sondage toutes les 300 ms : le bouton restait allumé par-dessus le jeu
  // pendant l'animation de mort et après REJOUER. On le synchronise dans la
  // boucle, où le changement d'écran est immédiatement visible.
  _fsbSync = sync;
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

/* ------ boot */
function boot() {
  window.__S = S; window.__K = K; window.__M = S2030; window.__ERR = ERR;   // sondes de test
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
  root.addEventListener('contextmenu', onContextMenu);
  root.addEventListener('mousemove', onMouseMove);
  root.addEventListener('mousedown', onMouseDown);
  root.addEventListener('mouseup', onMouseUp);
  root.addEventListener('wheel', onWheel, { passive: false });

  /* Arrière-plan : pause subie, verrou d'écran rendu (le système le lâche de
     toute façon). Retour : contexte audio relancé — Safari le laisse en
     'interrupted' après un appel — et verrou redemandé si une partie est en
     cours, même en pause : l'écran doit rester allumé sur le bandeau. */
  document.addEventListener('visibilitychange', function () {
    var hid = document.hidden === true || document.visibilityState === 'hidden';
    if (hid) { loseFocus(); releaseWake(); return; }
    if (S2030.audio && S2030.audio.ready) S2030.audio.resume();
    if (S.phase === 'play') { releaseWake(); requestWake(); }
  });
  addEventListener('blur', loseFocus);
  addEventListener('pagehide', loseFocus);
  /* Sortie du plein écran pendant la partie (Échap avalé par le navigateur,
     changement de fenêtre) : c'est une interruption, on met en pause. */
  function onFsChange() {
    if (!inFullscreen() && S.phase === 'play' && !S.paused) togglePause();
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  /* Un vrai toucher sur ce qui se croyait un bureau : contrôles tactiles,
     bandeau de rotation et cadrage mobile reviennent. */
  addEventListener('touchstart', function () {
    if (!S.desktop) return;
    S.desktop = false;
    resizeCanvas();
    S2030.ui && S2030.ui.syncDesktop && S2030.ui.syncDesktop();
    S2030.ui && S2030.ui.relayout && S2030.ui.relayout();
  }, true);

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
  // et à chaque geste ensuite : un contexte 'interrupted' (Safari) repart
  function kickAudio() { if (_armed && S2030.audio && S2030.audio.ready) S2030.audio.resume(); }
  addEventListener('pointerdown', kickAudio, true);
  addEventListener('touchstart', kickAudio, true);

  requestAnimationFrame(function (t) { lastT = t; frame(t); });
}
