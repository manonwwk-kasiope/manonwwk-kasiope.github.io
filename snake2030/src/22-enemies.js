/* ============================================================================
   SNAKE 2030 — 22-enemies.js — le bestiaire
   Onze silhouettes, onze menaces lisibles, six modificateurs d'élite.
   Règle d'or : le joueur doit toujours comprendre pourquoi il meurt.
   Tout ce qui va tuer se télégraphie une demi-seconde avant.
   ========================================================================== */

/* ------------------------------------------------------------- palette ---- */
var _EN_WHITE = '#ffffff';
var _EN_DARK  = '#080a16';
var _EN_HOT   = '#fff3b0';
var _EN_EBULL = '#ff6a00';   // projectiles ennemis : orange/rouge, jamais autre
var _EN_ALERT = '#ff2b2b';   // danger imminent

/* tableaux de pointillés partagés : setLineDash copie, aucune allocation */
var _EN_D_NONE = [];
var _EN_D_AIM  = [13, 9];
var _EN_D_SCAN = [5, 7];
var _EN_D_BIG  = [22, 14];

/* ------------------------------------------------- couleurs mises en cache */
var _enRgbCache = {}, _enLiteCache = {}, _enFadeCache = {};

function _enRgb(hex) {
  var v = _enRgbCache[hex];
  if (v) return v;
  var h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
  if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  var n = parseInt(h, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _enRgbCache[hex] = v;
  return v;
}
/** Version éclaircie : sert de coeur lumineux au trait néon. */
function _enLite(hex) {
  var v = _enLiteCache[hex];
  if (v) return v;
  var c = _enRgb(hex);
  v = 'rgb(' + (c[0] + ((255 - c[0]) * 0.62) | 0) + ',' +
               (c[1] + ((255 - c[1]) * 0.62) | 0) + ',' +
               (c[2] + ((255 - c[2]) * 0.62) | 0) + ')';
  _enLiteCache[hex] = v;
  return v;
}
function _enFade(hex, a) {
  var k = hex + '|' + a;
  var v = _enFadeCache[k];
  if (v) return v;
  var c = _enRgb(hex);
  v = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  _enFadeCache[k] = v;
  return v;
}

/* Dégradés radiaux unitaires mis en cache : un seul par couleur, réutilisé
   sous transformation (les coordonnées d'un dégradé suivent la matrice). */
var _enGradCache = {}, _enGradCtx = null;
function _enGrad(ctx, color) {
  if (_enGradCtx !== ctx) { _enGradCache = {}; _enGradCtx = ctx; }
  var g = _enGradCache[color];
  if (g) return g;
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, _enFade(color, 0.95));
  g.addColorStop(0.35, _enFade(color, 0.42));
  g.addColorStop(1, _enFade(color, 0));
  _enGradCache[color] = g;
  return g;
}

/* ------------------------------------------------------ primitives de dessin */

/** Halo additif centré, sans allocation (dégradé mis en cache). */
function _enGlow(ctx, x, y, r, color, a) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.fillStyle = _enGrad(ctx, color);
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Trait néon : nappe large additive + coeur fin clair. Le chemin courant
    est conservé entre les deux passes, on ne le reconstruit pas. */
function _enNeon(ctx, color, wOut, wIn, a) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3 * (a === undefined ? 1 : a);
  ctx.strokeStyle = color; ctx.lineWidth = wOut;
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = (a === undefined ? 1 : a);
  ctx.strokeStyle = _enLite(color); ctx.lineWidth = wIn;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Remplissage sombre : garde l'intérieur lisible sur fond chargé. */
function _enShell(ctx, color, a) {
  ctx.globalAlpha = a === undefined ? 0.72 : a;
  ctx.fillStyle = _EN_DARK;
  ctx.fill();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Ligne de visée en pointillés, repère monde. */
function _enSight(ctx, x1, y1, x2, y2, color, a, w, dash) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.setLineDash(dash || _EN_D_AIM);
  ctx.lineDashOffset = -S.t / 26;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash(_EN_D_NONE);
  ctx.restore();
}

/** Cercle de danger : montre exactement la zone qui va faire mal. */
function _enDanger(ctx, x, y, r, k, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color || _EN_ALERT;
  ctx.globalAlpha = 0.22 + 0.5 * k;
  ctx.lineWidth = 2 + 3 * k;
  ctx.setLineDash(_EN_D_SCAN);
  ctx.lineDashOffset = S.t / 18;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.setLineDash(_EN_D_NONE);
  ctx.globalAlpha = 0.10 + 0.16 * k;
  ctx.fillStyle = color || _EN_ALERT;
  ctx.beginPath(); ctx.arc(x, y, r * k, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Arc de vie, uniquement pour les grosses cibles : lisibilité de la menace. */
function _enHpArc(ctx, e, color) {
  if (e.hp >= e.maxHp) return;
  var k = clamp(e.hp / e.maxHp, 0, 1);
  var r = e.r + 9;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'butt';
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = _EN_DARK; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r, -2.5, -0.64); ctx.stroke();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = k < 0.34 ? _EN_ALERT : color;
  ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.arc(0, 0, r, -2.5, -2.5 + 1.86 * k); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
}

/** Couronne d'élite : deux anneaux contrarotatifs + pointes. */
function _enElite(ctx, e, color) {
  var a = S.t / 620, r = e.r + 7;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = _EN_HOT;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.setLineDash(_EN_D_SCAN);
  ctx.lineDashOffset = a * 30;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.lineDashOffset = -a * 44;
  ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, TAU); ctx.stroke();
  ctx.setLineDash(_EN_D_NONE);
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (var i = 0; i < 3; i++) {
    var ta = a + i * 2.0944;
    var cx = Math.cos(ta), sy = Math.sin(ta);
    ctx.moveTo(cx * (r + 3), sy * (r + 3));
    ctx.lineTo(cx * (r + 12), sy * (r + 12));
  }
  ctx.lineWidth = 2.4; ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------ tampon de trajectoire ---- */
/* Un seul enregistrement partagé de la tête : les miroirs y puisent avec un
   décalage. Index direct, aucune recherche, aucune allocation en jeu.        */
var _EN_MIR_N = 256, _EN_MIR_STEP = 25;   // 6.4 s d'historique
var _enMirBuf = new Array(_EN_MIR_N);
for (var _enI = 0; _enI < _EN_MIR_N; _enI++) _enMirBuf[_enI] = { t: -1e9, x: 0, y: 0, a: 0, sp: 0 };
var _enMirI = 0, _enMirLast = -1e9;

/* -------------------------------------------------------- état de module --- */
var _enFrameT = -1;      // horodatage de la dernière passe globale
var _enParaN = 0;        // parasites accrochés
var _enParaScanT = -1e9; // dernière resynchronisation du compte
var _enJamT = -1e9;      // fin du brouillage des armes (temps de jeu, ms)
var _enBlastDepth = 0;
var _enScratch = [[], [], [], [], []];   // tampons pour enemiesNear imbriqués

/** enemiesNear renvoie un tableau partagé : on recopie avant d'appeler quoi
    que ce soit qui pourrait le réutiliser (dégâts -> mort -> explosion). */
function _enCollect(x, y, r, depth) {
  var src = enemiesNear(x, y, r);
  var dst = _enScratch[depth] || (_enScratch[depth] = []);
  dst.length = 0;
  for (var i = 0; i < src.length; i++) dst.push(src[i]);
  return dst;
}

function _enApplyPara() {
  var s = S.snake;
  if (!s) return;
  var _enBase = 1 + 0.2 * (S.up.f_agility || 0);
  s.turnBoost = _enParaN > 0 ? _enBase * clamp(1 - 0.15 * _enParaN, 0.45, 1) : _enBase;
}

/** Passe globale, exécutée une seule fois par image (le coeur n'offre pas de
    point d'entrée par image à ce module : on se cale sur S.t). */
function _enFrameTick() {
  if (_enFrameT === S.t) return;
  _enFrameT = S.t;
  var s = S.snake;
  if (!s) return;

  if (S.t - _enMirLast >= _EN_MIR_STEP) {
    _enMirLast = S.t;
    _enMirI = (_enMirI + 1) % _EN_MIR_N;
    var m = _enMirBuf[_enMirI];
    m.t = S.t; m.x = s.x; m.y = s.y; m.a = s.ang; m.sp = s.speed;
  }

  // resynchronisation périodique du compte de parasites : le suivi incrémental
  // suffit en régime normal, ceci rattrape les remises à zéro d'arène.
  if (S.t - _enParaScanT > 400) {
    _enParaScanT = S.t;
    var n = 0, list = S.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.dead && e.type === 'parasite' && e.st === 1) n++;
    }
    if (n !== _enParaN) { _enParaN = n; _enApplyPara(); }
    
  }
}

/* ------------------------------------------------------------ déplacement -- */

function _enSteer(e, tx, ty, dt, turn, speed) {
  var want = angTo(e.x, e.y, tx, ty);
  var d = norm(want - e.ang), m = turn * dt;
  e.ang = norm(e.ang + (d < -m ? -m : (d > m ? m : d)));
  e.vx = Math.cos(e.ang) * speed;
  e.vy = Math.sin(e.ang) * speed;
  e.x += e.vx * dt; e.y += e.vy * dt;
}

function _enGo(e, ang, dt, speed) {
  e.vx = Math.cos(ang) * speed;
  e.vy = Math.sin(ang) * speed;
  e.x += e.vx * dt; e.y += e.vy * dt;
}

/** Maintient l'ennemi dans l'arène. bounce : renvoie aussi le cap. */
function _enArena(e, bounce) {
  var m = e.r + 4;
  if (e.x < m) { e.x = m; if (bounce) e.ang = norm(Math.PI - e.ang); }
  else if (e.x > K.ARENA_W - m) { e.x = K.ARENA_W - m; if (bounce) e.ang = norm(Math.PI - e.ang); }
  if (e.y < m) { e.y = m; if (bounce) e.ang = -e.ang; }
  else if (e.y > K.ARENA_H - m) { e.y = K.ARENA_H - m; if (bounce) e.ang = -e.ang; }
}

/** Segment du serpent le plus proche. Renvoie l'index, -1 si rien. */
function _enNearestSeg(x, y, maxD) {
  var s = S.snake;
  if (!s) return -1;
  var segs = s.segs, bi = -1, bd = maxD * maxD;
  for (var i = 0; i < segs.length; i++) {
    var d = dist2(x, y, segs[i].x, segs[i].y);
    if (d < bd) { bd = d; bi = i; }
  }
  return bi;
}

/** Le corps (tête comprise) touche-t-il ce disque ? */
function _enTouchesBody(x, y, r) {
  var s = S.snake;
  if (!s) return false;
  var rr = (r + K.HEAD_R) * (r + K.HEAD_R);
  if (dist2(x, y, s.x, s.y) < rr) return true;
  var segs = s.segs;
  for (var i = 0; i < segs.length; i += 2) {
    if (dist2(x, y, segs[i].x, segs[i].y) < rr) return true;
  }
  return false;
}

/* ------------------------------------------------------------- explosions -- */

function _enBlast(x, y, radius, dmg, color, srcId) {
  if (_enBlastDepth > 3) return;
  _enBlastDepth++;
  var fx = S2030.fx;
  if (fx) {
    fx.ring(x, y, color, radius * 0.25, radius * 2.4, { w: 6, life: 0.4 });
    fx.ring(x, y, _EN_WHITE, 5, radius * 1.5, { w: 2.5, life: 0.24 });
    fx.burst(x, y, color, 24, radius * 2.6, { size: 2.6, life: 0.46, drag: 2.4 });
    fx.burst(x, y, _EN_HOT, 9, radius * 1.6, { size: 1.7, life: 0.26 });
    fx.flare(x, y, color, radius * 0.85, { life: 0.28, a: 0.95 });
    fx.shake(clamp(radius * 0.06, 2, 14));
  }
  S2030.audio && S2030.audio.sfx('explode');

  var list = _enCollect(x, y, radius, _enBlastDepth);
  for (var i = 0; i < list.length; i++) {
    var o = list[i];
    if (o.dead || o.id === srcId) continue;
    var f = 1 - clamp(dist(x, y, o.x, o.y) / radius, 0, 1);
    // dmg est exprimé en segments pour le joueur : on le convertit en points
    // de vie pour les ennemis, avec atténuation au bord du souffle.
    damageEnemy(o, dmg * 9 * (0.4 + 0.6 * f), { x: o.x, y: o.y, type: 'shock' });
  }
  if (_enTouchesBody(x, y, radius)) hurtSnake(dmg, x, y);
  _enBlastDepth--;
}

/* ------------------------------------------------------------------ butin -- */

function _enLoot(e) {
  var n = e.loot === undefined ? 1 : e.loot;
  if (e.elite) n += 3;
  for (var i = 0; i < n; i++) {
    addPickup('energy', e.x + rndR(-e.r, e.r), e.y + rndR(-e.r, e.r));
  }
  var cp = (e.coreP || 0) + (e.elite ? 0.55 : 0);
  if (chance(cp)) addPickup('core', e.x, e.y);
  if (chance((e.healP || 0.015) + (e.elite ? 0.12 : 0))) addPickup('heal', e.x + rndR(-8, 8), e.y + rndR(-8, 8));
}

/* ==========================================================================
   COMPORTEMENTS
   ========================================================================== */

/* -------------------------------------------------------------- chasseur --- */
/* Fonce sur la tête, ondule pour ne pas être un rail, arme un bond quand il
   arrive à portée : il se fige, gonfle, puis se jette en ligne droite.       */
function _enUpChaser(e, dt, s) {
  var cs = e.cdScale || 1;

  if (e.st === 1) {                                   // armement du bond
    e.stT -= dt * 1000;
    var wa = angTo(e.x, e.y, s.x, s.y), d1 = norm(wa - e.ang), m1 = 1.5 * dt;
    e.ang = norm(e.ang + (d1 < -m1 ? -m1 : (d1 > m1 ? m1 : d1)));
    _enGo(e, e.ang, dt, e.speed * 0.12);
    if (e.stT <= 0) {
      e.st = 2; e.stT = e.lungeDur;
      S2030.fx && S2030.fx.ring(e.x, e.y, e.color, e.r * 0.6, 340, { w: 3, life: 0.24 });
      S2030.audio && S2030.audio.sfx('zap');
    }
    return;
  }
  if (e.st === 2) {                                   // bond
    e.stT -= dt * 1000;
    _enGo(e, e.ang, dt, e.speed * e.lungeMul);
    if (S2030.fx && chance(0.55)) S2030.fx.trail(e.x, e.y, e.ang, e.color);
    if (e.stT <= 0) { e.st = 0; e.cdT = e.cd * cs; }
    return;
  }

  e.cdT -= dt * 1000;
  var d = dist(e.x, e.y, s.x, s.y);
  var wob = Math.sin((e.t + e.id * 211) / 240) * (d > 170 ? 0.55 : 0.12);
  var ta = angTo(e.x, e.y, s.x, s.y) + wob;
  var diff = norm(ta - e.ang), m = e.turn * dt;
  e.ang = norm(e.ang + (diff < -m ? -m : (diff > m ? m : diff)));
  _enGo(e, e.ang, dt, e.speed);
  if (e.cdT <= 0 && d < e.lungeR && d > 44) { e.st = 1; e.stT = e.lungeWind * cs; }
}

/* ----------------------------------------------------------- intercepteur -- */
/* Vise le point où la tête SERA. Il gèle sa cible pendant l'armement : la
   ligne affichée est exactement la trajectoire qu'il prendra.                */
function _enUpInter(e, dt, s) {
  var cs = e.cdScale || 1;
  var d = dist(e.x, e.y, s.x, s.y);
  var tt = clamp(d / e.dashSpeed, 0, 1.2) * e.lead;
  e.px = clamp(s.x + Math.cos(s.ang) * s.speed * tt, 24, K.ARENA_W - 24);
  e.py = clamp(s.y + Math.sin(s.ang) * s.speed * tt, 24, K.ARENA_H - 24);

  if (e.st === 1) {                                   // verrouillage
    e.stT -= dt * 1000;
    var a2 = angTo(e.x, e.y, e.lx, e.ly), df = norm(a2 - e.ang), mm = 3.2 * dt;
    e.ang = norm(e.ang + (df < -mm ? -mm : (df > mm ? mm : df)));
    _enGo(e, e.ang, dt, e.speed * 0.2);
    if (e.stT <= 0) {
      e.st = 2; e.stT = e.dashMs;
      e.ang = angTo(e.x, e.y, e.lx, e.ly);
      S2030.fx && S2030.fx.ring(e.x, e.y, _EN_WHITE, e.r, 460, { w: 2.5, life: 0.22 });
      S2030.audio && S2030.audio.sfx('zap');
    }
    return;
  }
  if (e.st === 2) {                                   // fuseau
    e.stT -= dt * 1000;
    _enGo(e, e.ang, dt, e.dashSpeed);
    if (S2030.fx) S2030.fx.trail(e.x, e.y, e.ang, e.color);
    if (e.stT <= 0) { e.st = 0; e.cdT = e.cd * cs; }
    _enArena(e, true);
    return;
  }

  e.cdT -= dt * 1000;
  _enSteer(e, e.px, e.py, dt, e.turn, e.speed);
  var al = Math.abs(norm(angTo(e.x, e.y, e.px, e.py) - e.ang));
  if (e.cdT <= 0 && al < 0.3 && d > 110 && d < 560) {
    e.st = 1; e.stT = e.windMs * cs;
    e.lx = e.px; e.ly = e.py;
  }
}

/* ------------------------------------------------------------------ mine --- */
/* Immobile, dort. S'amorce quand le serpent entre dans son rayon : la mèche
   brûle, le disque de souffle grandit à l'écran, puis tout saute.            */
function _enUpMine(e, dt, s) {
  e.spin += dt * (e.st === 1 ? 5.4 : 0.9);
  if (e.st === 0) {
    e.x += Math.cos(e.t / 1400 + e.id) * 5 * dt;
    e.y += Math.sin(e.t / 1700 + e.id) * 5 * dt;
    if (_enTouchesBody(e.x, e.y, e.armR)) {
      e.st = 1; e.stT = e.fuse;
      S2030.audio && S2030.audio.sfx('shock');
      S2030.fx && S2030.fx.ring(e.x, e.y, _EN_ALERT, e.r, 200, { w: 2, life: 0.3 });
    }
    return;
  }
  e.stT -= dt * 1000;
  if (e.beepT === undefined) e.beepT = 0;
  e.beepT -= dt * 1000;
  if (e.beepT <= 0) {
    e.beepT = 60 + 220 * (e.stT / e.fuse);
    S2030.audio && S2030.audio.sfx('click');
    S2030.fx && S2030.fx.flare(e.x, e.y, _EN_ALERT, e.r * 1.8, { life: 0.1, a: 0.6 });
  }
  if (e.stT <= 0) {
    e.detonated = true;
    damageEnemy(e, e.hp + 999, { x: e.x, y: e.y, type: 'shock' });
  }
}

/* --------------------------------------------------------------- tireur ---- */
/* Garde sa bande de distance, tourne autour, et arme un tir lent en montrant
   la ligne exacte du projectile pendant 0,7 s.                               */
function _enUpShooter(e, dt, s) {
  var cs = e.cdScale || 1;
  var d = dist(e.x, e.y, s.x, s.y);
  var toS = angTo(e.x, e.y, s.x, s.y);

  var mv;
  if (d > e.range + e.band) mv = toS;
  else if (d < e.range - e.band) mv = toS + Math.PI;
  else mv = toS + e.orbit * 1.4;
  if (chance(0.004)) e.orbit = -e.orbit;
  var sp = e.aimT > 0 ? e.speed * 0.25 : e.speed;
  _enGo(e, mv, dt, sp);
  e.ang = norm(e.ang + clamp(norm(toS - e.ang), -2.6 * dt, 2.6 * dt));

  if (e.aimT > 0) {
    e.aimT -= dt * 1000;
    if (e.aimT <= 0) {
      var n = e.salvo + (e.elite ? 2 : 0);
      for (var i = 0; i < n; i++) {
        var a = e.aimA + (i - (n - 1) * 0.5) * e.spread;
        addEBullet({
          x: e.x + Math.cos(a) * e.r * 1.25, y: e.y + Math.sin(a) * e.r * 1.25,
          vx: Math.cos(a) * e.bSpeed, vy: Math.sin(a) * e.bSpeed,
          r: e.bR, dmg: e.dmg, life: 4.2, color: _EN_EBULL, kind: 'plasma'
        });
      }
      S2030.audio && S2030.audio.sfx('shoot');
      S2030.fx && S2030.fx.burst(e.x + Math.cos(e.aimA) * e.r, e.y + Math.sin(e.aimA) * e.r,
        _EN_EBULL, 6, 220, { ang: e.aimA, spread: 0.5, life: 0.2, size: 1.6 });
      S2030.fx && S2030.fx.flare(e.x, e.y, _EN_EBULL, e.r * 2.2, { life: 0.14, a: 0.8 });
      e.cdT = e.cd * cs;
      e.recoil = 1;
    }
  } else {
    e.cdT -= dt * 1000;
    if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - dt * 4);
    if (e.cdT <= 0 && d < e.range + 300) {
      e.aimT = e.aimMs * cs;
      e.aimA = toS;
      S2030.audio && S2030.audio.sfx('click');
    }
  }
}

/* -------------------------------------------------------------- trancheur -- */
/* Se met en garde, montre une ligne laser d'un bout à l'autre de l'arène,
   puis traverse tout en ligne droite. Coupe le corps, pas seulement la tête. */
function _enUpCutter(e, dt, s) {
  var cs = e.cdScale || 1;

  if (e.st === 1) {                                   // charge
    e.stT -= dt * 1000;
    e.spin += dt * 22;
    var df = norm(angTo(e.x, e.y, s.x, s.y) - e.ang), m = 2.4 * dt;
    e.ang = norm(e.ang + (df < -m ? -m : (df > m ? m : df)));
    _enGo(e, e.ang, dt, -e.speed * 0.35);            // recule pour prendre son élan
    if (e.stT <= 0) {
      e.st = 2; e.stT = e.dashMs;
      S2030.audio && S2030.audio.sfx('laser');
      S2030.fx && S2030.fx.ring(e.x, e.y, e.color, e.r, 620, { w: 3, life: 0.24 });
    }
    return;
  }
  if (e.st === 2) {                                   // traversée
    e.stT -= dt * 1000;
    e.spin += dt * 34;
    _enGo(e, e.ang, dt, e.dashSpeed);
    if (S2030.fx) { S2030.fx.trail(e.x, e.y, e.ang, e.color); S2030.fx.trail(e.x, e.y, e.ang, _EN_WHITE); }
    var segs = s.segs, rr = (e.r + K.HEAD_R * 0.8) * (e.r + K.HEAD_R * 0.8);
    for (var i = 0; i < segs.length; i += 2) {
      if (dist2(e.x, e.y, segs[i].x, segs[i].y) < rr) {
        hurtSnake(e.dmg, e.x, e.y);
        S2030.fx && S2030.fx.burst(e.x, e.y, e.color, 12, 300, { size: 2, life: 0.3 });
        break;
      }
    }
    var b = e.r + 4;
    if (e.x < b || e.x > K.ARENA_W - b || e.y < b || e.y > K.ARENA_H - b) e.stT = 0;
    _enArena(e, true);
    if (e.stT <= 0) { e.st = 3; e.stT = e.restMs * cs; }
    return;
  }
  if (e.st === 3) {                                   // récupération, vulnérable
    e.stT -= dt * 1000;
    e.spin += dt * 2;
    _enGo(e, e.ang, dt, e.speed * 0.22);
    if (e.stT <= 0) e.st = 0;
    return;
  }

  e.spin += dt * 6;
  var d = dist(e.x, e.y, s.x, s.y);
  _enSteer(e, s.x, s.y, dt, e.turn, e.speed);
  if (d < 620) { e.st = 1; e.stT = e.chargeMs * cs; }
}

/* -------------------------------------------------------------- pondeuse --- */
/* Lente, encaisse, garde ses distances et ouvre ses pétales pour cracher une
   nichée. L'ouverture est visible bien avant l'éjection.                     */
function _enUpSpawner(e, dt, s) {
  var cs = e.cdScale || 1;
  var d = dist(e.x, e.y, s.x, s.y);
  var toS = angTo(e.x, e.y, s.x, s.y);
  var mv = d < e.keep ? toS + Math.PI : toS + e.orbit * 1.25;
  _enGo(e, mv, dt, e.speed * (e.st === 1 ? 0.35 : 1));
  e.ang = norm(e.ang + dt * 0.7);

  if (e.st === 1) {
    e.stT -= dt * 1000;
    e.open = 1 - clamp(e.stT / (e.openMs * cs), 0, 1);
    if (e.stT <= 0) {
      e.st = 0; e.open = 0; e.cdT = e.cd * cs;
      var alive = 0, list = S.enemies;
      for (var i = 0; i < list.length; i++) if (!list[i].dead && list[i].type === e.child) alive++;
      var n = e.brood + (e.elite ? 2 : 0);
      for (var k = 0; k < n && alive < e.maxBrood; k++, alive++) {
        var a = e.ang + k * (TAU / n) + rndR(-0.3, 0.3);
        var c = spawnEnemy(e.child, e.x + Math.cos(a) * (e.r + 10), e.y + Math.sin(a) * (e.r + 10),
          e.elite && chance(0.25) ? { mod: 'fast' } : null);
        if (c) { c.ang = a; c.birth = 1; }
        S2030.fx && S2030.fx.burst(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, e.color, 8, 260,
          { ang: a, spread: 0.6, life: 0.3, size: 1.8 });
      }
      S2030.fx && S2030.fx.ring(e.x, e.y, e.color, e.r * 0.7, 420, { w: 4, life: 0.35 });
      S2030.fx && S2030.fx.flare(e.x, e.y, _EN_WHITE, e.r * 2, { life: 0.16, a: 0.85 });
      S2030.audio && S2030.audio.sfx('zap');
    }
    return;
  }
  e.cdT -= dt * 1000;
  e.open = Math.max(0, e.open - dt * 3);
  if (e.cdT <= 0 && d < 900) { e.st = 1; e.stT = e.openMs * cs; }
}

/* ---------------------------------------------------------------- larve ---- */
function _enUpMite(e, dt, s) {
  if (e.birth > 0) {
    e.birth -= dt * 2.6;
    _enGo(e, e.ang, dt, e.speed * 1.5);
    return;
  }
  var wob = Math.sin((e.t + e.id * 97) / 130) * 0.9;
  var ta = angTo(e.x, e.y, s.x, s.y) + wob;
  var df = norm(ta - e.ang), m = e.turn * dt;
  e.ang = norm(e.ang + (df < -m ? -m : (df > m ? m : df)));
  _enGo(e, e.ang, dt, e.speed);
}

/* -------------------------------------------------------------- parasite --- */
/* Se colle à un anneau du corps, l'étouffe (le serpent tourne moins bien) et
   mord périodiquement. Il faut le décrocher au tir.                          */
function _enUpParasite(e, dt, s) {
  if (e.st === 1) {                                   // accroché
    var segs = s.segs;
    if (e.seg >= segs.length) { e.seg = segs.length - 1; }
    if (e.seg < 0) {                                  // le serpent a fondu sous lui
      e.st = 0;
      _enParaN = Math.max(0, _enParaN - 1); _enApplyPara();
      return;
    }
    var sg = segs[e.seg];
    e.x = sg.x + Math.cos(e.side) * K.HEAD_R * 0.55;
    e.y = sg.y + Math.sin(e.side) * K.HEAD_R * 0.55;
    e.ang = sg.ang;
    e.biteT -= dt * 1000;
    if (e.biteT <= 900 && !e.warned) {
      e.warned = 1;
      S2030.fx && S2030.fx.ring(e.x, e.y, _EN_ALERT, e.r, 160, { w: 2, life: 0.35 });
    }
    if (e.biteT <= 0) {
      e.biteT = e.biteMs; e.warned = 0;
      hurtSnake(1, e.x, e.y);
      S2030.fx && S2030.fx.burst(e.x, e.y, e.color, 14, 280, { size: 2, life: 0.32 });
      S2030.audio && S2030.audio.sfx('hurt');
    }
    return;
  }

  var d = dist(e.x, e.y, s.x, s.y);
  var tx = s.x, ty = s.y;
  if (d < 260) {
    var bi = _enNearestSeg(e.x, e.y, 240);
    if (bi >= 0) {
      var t = s.segs[bi];
      tx = t.x; ty = t.y;
      if (dist2(e.x, e.y, t.x, t.y) < (e.r + K.HEAD_R * 0.9) * (e.r + K.HEAD_R * 0.9)) {
        e.st = 1; e.seg = bi; e.biteT = e.biteMs; e.warned = 0;
        e.side = angTo(t.x, t.y, e.x, e.y);
        _enParaN++; _enApplyPara();
        S2030.fx && S2030.fx.ring(e.x, e.y, e.color, 4, 300, { w: 3, life: 0.3 });
        S2030.audio && S2030.audio.sfx('shock');
        return;
      }
    }
  }
  _enSteer(e, tx, ty, dt, e.turn, e.speed);
}

/* -------------------------------------------------------------- brouilleur - */
/* Champ nul : tout projectile du joueur qui franchit la coque est absorbé.
   Pour le tuer il faut entrer dans le champ — où les armes se coupent.       */
function _enUpJammer(e, dt, s) {
  var d = dist(e.x, e.y, s.x, s.y);
  var toS = angTo(e.x, e.y, s.x, s.y);
  var mv = d < e.keep ? toS + Math.PI * 0.85 : toS;
  _enGo(e, mv, dt, e.speed);
  e.ang = norm(e.ang + dt * 1.3);
  e.fr = e.field * (1 + Math.sin(e.t / 420) * 0.05);

  // absorption des projectiles joueur sur la coque du champ
  var rOut = e.fr, rIn = e.fr * 0.78;
  var bs = S.bullets;
  for (var i = bs.length - 1; i >= 0; i--) {
    var b = bs[i];
    var dd = dist2(b.x, b.y, e.x, e.y);
    if (dd > rOut * rOut || dd < rIn * rIn) continue;
    bs.splice(i, 1);
    var ba = angTo(e.x, e.y, b.x, b.y);
    S2030.fx && S2030.fx.burst(b.x, b.y, e.color, 5, 190, { ang: ba, spread: 1.1, life: 0.2, size: 1.4 });
    e.absorbT = 220;
    e.absorbA = ba;
  }
  if (e.absorbT > 0) e.absorbT -= dt * 1000;

  // brouillage des armes tant que la tête baigne dans le champ
  if (d < e.fr) {
    _enJamT = S.t + 180;
    S.jamT = _enJamT;
    if (e.zapT === undefined) e.zapT = 0;
    e.zapT -= dt * 1000;
    if (e.zapT <= 0) {
      e.zapT = 340;
      S2030.fx && S2030.fx.glitch && S2030.fx.glitch(0.28);
      S2030.audio && S2030.audio.sfx('zap');
    }
  }
}

/* ---------------------------------------------------------------- voleur --- */
/* Vise le butin au sol, l'empoche, puis file vers le bord de l'arène. Tué,
   il rend tout — et un peu plus.                                             */
function _enUpThief(e, dt, s) {
  e.scanT -= dt * 1000;

  if (e.st === 1) {                                   // fuite
    _enGo(e, e.ang, dt, e.fleeSpeed);
    if (S2030.fx && chance(0.4)) S2030.fx.trail(e.x, e.y, e.ang, e.color);
    var m = e.r + 6;
    if (e.x < m || e.x > K.ARENA_W - m || e.y < m || e.y > K.ARENA_H - m) {
      S2030.fx && S2030.fx.ring(e.x, e.y, e.color, 8, 520, { w: 3, life: 0.4 });
      S2030.fx && S2030.fx.text(e.x, e.y - 20, 'BUTIN VOLÉ', e.color);
      S2030.audio && S2030.audio.sfx('warp');
      S.score = Math.max(0, S.score - 40 * e.carry);
      e.dead = true;                                   // s'échappe : aucune récompense
    }
    return;
  }

  var tgt = e.tgt;
  if (e.scanT <= 0) {
    e.scanT = 280;
    tgt = null;
    var bd = 1e9, ps = S.pickups;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var dd = dist2(e.x, e.y, p.x, p.y);
      if (dd < bd) { bd = dd; tgt = p; }
    }
    e.tgt = tgt;
  }

  if (tgt) {
    _enSteer(e, tgt.x, tgt.y, dt, e.turn, e.speed);
    if (dist2(e.x, e.y, tgt.x, tgt.y) < 900) {
      var k = S.pickups.indexOf(tgt);
      if (k >= 0) {
        S.pickups.splice(k, 1);
        e.carry++;
        e.tgt = null; e.scanT = 0;
        S2030.fx && S2030.fx.burst(e.x, e.y, e.color, 10, 240, { size: 1.8, life: 0.3 });
        S2030.fx && S2030.fx.flare(e.x, e.y, e.color, e.r * 2.4, { life: 0.18, a: 0.8 });
        S2030.audio && S2030.audio.sfx('pickup');
      } else { e.tgt = null; e.scanT = 0; }
    }
  } else {
    _enSteer(e, s.x, s.y, dt, e.turn, e.speed * 0.85);
  }

  if (e.carry >= 3 || (e.carry > 0 && S.pickups.length === 0)) {
    e.st = 1;
    var ex = e.x < K.ARENA_W * 0.5 ? -60 : K.ARENA_W + 60;
    var ey = e.y < K.ARENA_H * 0.5 ? -60 : K.ARENA_H + 60;
    e.ang = angTo(e.x, e.y, ex, ey);
    S2030.fx && S2030.fx.text(e.x, e.y - 24, 'IL FUIT !', _EN_ALERT);
  }
}

/* ---------------------------------------------------------------- miroir --- */
/* Rejoue ta propre trajectoire avec 1,5 s de retard. On ne le sème pas : on
   le tue, ou on lui fait traverser ses propres alliés.                       */
function _enUpMirror(e, dt, s) {
  var back = (e.delay / _EN_MIR_STEP) | 0;
  var idx = (_enMirI - back + _EN_MIR_N * 2) % _EN_MIR_N;
  var m = _enMirBuf[idx];
  var ok = (S.t - m.t) < e.delay * 2.2 && m.t > 0;
  e.ghosted = ok ? 1 : 0;
  var tx = ok ? m.x : s.x, ty = ok ? m.y : s.y;
  var sp = ok ? Math.max(s.baseSpeed * 0.9, m.sp * 0.99) : e.speed;
  var d = dist(e.x, e.y, tx, ty);
  if (d > 260) sp *= 1.22;                            // rattrape s'il décroche
  _enSteer(e, tx, ty, dt, e.turn, sp);
  if (S2030.fx && chance(0.35)) S2030.fx.trail(e.x, e.y, e.ang, e.color);
  if (e.glT === undefined) e.glT = 0;
  e.glT -= dt * 1000;
  if (e.glT <= 0 && inView(e.x, e.y, 80)) {
    e.glT = rndR(280, 900);
    e.glOff = rndR(-4, 4);
  }
}

/* ==========================================================================
   MODIFICATEURS D'ÉLITE — statistiques ET comportement ET visuel
   ========================================================================== */

var _enMods = {

  /* Plaques de chrome : encaisse, mais elles éclatent à mi-vie et la bête
     devient nerveuse. On voit le blindage tomber. */
  armored: {
    name: 'BLINDÉ', color: '#9fb6d0',
    apply: function (e) {
      e.hp = e.maxHp = Math.round(e.maxHp * 2.4);
      e.speed *= 0.78;
      e.mArm = 1; e.armBroken = 0; e.armSpin = rndR(0, TAU);
    }
  },

  /* Vitesse et cadence : moitié moins de points de vie, deux fois plus vite,
     laisse une rémanence néon. */
  fast: {
    name: 'RAPIDE', color: '#ffe45e',
    apply: function (e) {
      e.speed *= 1.55;
      e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * 0.7));
      e.r *= 0.9;
      e.cdScale = 0.6;
      e.mFast = 1;
    }
  },

  /* Clignote toutes les 2,5 s : marque la destination une demi-seconde avant
     de sauter, on peut anticiper. */
  teleporter: {
    name: 'SAUTEUR', color: '#b388ff',
    apply: function (e) {
      e.speed *= 0.86;
      e.mTp = 1; e.tpT = rndR(1200, 2400); e.tpPh = 0; e.tpX = e.x; e.tpY = e.y;
    }
  },

  /* Coeur instable : clignote de plus en plus vite, explose à la mort. */
  explosive: {
    name: 'INSTABLE', color: '#ff8a3d',
    apply: function (e) {
      e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * 0.85));
      e.speed *= 1.1;
      e.mExp = 1; e.expR = 150; e.expDmg = 2;
    }
  },

  /* Se répare s'il n'est pas touché pendant 1,5 s : il faut finir le travail. */
  regen: {
    name: 'RÉGÉNÈRE', color: '#7CFFB2',
    apply: function (e) {
      e.hp = e.maxHp = Math.round(e.maxHp * 1.3);
      e.speed *= 0.95;
      e.mReg = 1; e.regT = 0; e.regFx = 0;
    }
  },

  /* Arc d'énergie en rotation : il gobe les tirs qui arrivent dans le secteur
     couvert. Il faut tirer dans son dos ou saturer la garde. */
  shielded: {
    name: 'GARDE', color: '#00e5ff',
    apply: function (e) {
      e.mShl = 1;
      e.shMax = 5 + Math.round(e.maxHp * 0.3);
      e.shHp = e.shMax;
      e.shA = rnd() * TAU;
      e.shSpin = rndR(0.7, 1.5) * (chance(0.5) ? 1 : -1);
      e.shArc = 1.25;
      e.shDown = 0;
      e.speed *= 0.9;
    }
  }
};

function _enModTick(e, dt, s) {
  // le blindage cède immédiatement devant les tirs spectraux
  if (e.mArm && !e.armBroken && S.up.f_phaseShot) e.armBroken = 1;
  if (e.mArm && !e.armBroken && e.hp < e.maxHp * 0.5) {
    e.armBroken = 1;
    e.speed *= 1.55;
    S2030.fx && S2030.fx.burst(e.x, e.y, '#9fb6d0', 18, 300, { size: 2.4, life: 0.45, shape: 'shard' });
    S2030.fx && S2030.fx.ring(e.x, e.y, '#9fb6d0', e.r, 380, { w: 3, life: 0.3 });
    S2030.audio && S2030.audio.sfx('hit');
  }

  if (e.mFast && S2030.fx && chance(0.5)) S2030.fx.trail(e.x, e.y, e.ang, e.color);

  if (e.mTp) {
    e.tpT -= dt * 1000;
    if (e.tpPh === 0 && e.tpT <= 520) {
      e.tpPh = 1;
      var a = angTo(e.x, e.y, s.x, s.y) + rndR(-0.9, 0.9);
      var dd = clamp(dist(e.x, e.y, s.x, s.y) * 0.6, 150, 340);
      e.tpX = clamp(e.x + Math.cos(a) * dd, 30, K.ARENA_W - 30);
      e.tpY = clamp(e.y + Math.sin(a) * dd, 30, K.ARENA_H - 30);
      S2030.audio && S2030.audio.sfx('click');
    }
    if (e.tpT <= 0) {
      S2030.fx && S2030.fx.ring(e.x, e.y, '#b388ff', e.r, 420, { w: 3, life: 0.3 });
      S2030.fx && S2030.fx.burst(e.x, e.y, '#b388ff', 12, 220, { size: 1.8, life: 0.3 });
      e.x = e.tpX; e.y = e.tpY;
      e.ang = angTo(e.x, e.y, s.x, s.y);
      S2030.fx && S2030.fx.ring(e.x, e.y, _EN_WHITE, 3, 380, { w: 2.5, life: 0.26 });
      S2030.fx && S2030.fx.flare(e.x, e.y, '#b388ff', e.r * 2.4, { life: 0.2, a: 0.9 });
      S2030.audio && S2030.audio.sfx('warp');
      e.tpT = rndR(2200, 3200); e.tpPh = 0;
    }
  }

  if (e.mReg) {
    if (e.hitT > 0) e.regT = 0; else e.regT += dt * 1000;
    if (e.regT > 1500 && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.075 * dt);
      e.regFx -= dt * 1000;
      if (e.regFx <= 0) {
        e.regFx = 420;
        S2030.fx && S2030.fx.burst(e.x, e.y, '#7CFFB2', 4, 90, { size: 1.3, life: 0.4, drag: 1.2 });
      }
    }
  }

  if (e.mShl) {
    if (e.shDown > 0) {
      e.shDown -= dt * 1000;
      if (e.shDown <= 0) {
        e.shHp = e.shMax;
        S2030.fx && S2030.fx.ring(e.x, e.y, '#00e5ff', e.r, 260, { w: 2.5, life: 0.3 });
      }
    } else {
      e.shA = norm(e.shA + e.shSpin * dt);
      var rr = e.r + 15, rr2 = rr * rr, ri2 = (e.r + 4) * (e.r + 4);
      var bs = S.bullets;
      for (var i = bs.length - 1; i >= 0; i--) {
        var b = bs[i];
        var dd2 = dist2(b.x, b.y, e.x, e.y);
        if (dd2 > rr2 || dd2 < ri2) continue;
        var ba = angTo(e.x, e.y, b.x, b.y);
        if (Math.abs(norm(ba - e.shA)) > e.shArc) continue;
        /* TIRS SPECTRAUX : « tes tirs ignorent blindages et boucliers ». La
           carte posait un indicateur que rien ne lisait — mesuré, le bouclier
           avalait exactement autant de tirs avec elle que sans. */
        if (S.up.f_phaseShot) continue;
        bs.splice(i, 1);
        e.shHp--;
        e.shFlash = 1;
        S2030.fx && S2030.fx.burst(b.x, b.y, '#00e5ff', 4, 170, { ang: ba, spread: 0.9, life: 0.18, size: 1.3 });
        if (e.shHp <= 0) {
          e.shDown = 3800;
          S2030.fx && S2030.fx.ring(e.x, e.y, '#00e5ff', e.r + 12, 460, { w: 4, life: 0.36 });
          S2030.fx && S2030.fx.burst(e.x, e.y, '#00e5ff', 16, 280, { size: 2, life: 0.36 });
          S2030.audio && S2030.audio.sfx('shock');
          break;
        }
      }
      if (e.shFlash > 0) e.shFlash = Math.max(0, e.shFlash - dt * 4);
    }
  }
}

/* ==========================================================================
   DESSIN
   ========================================================================== */

/* -------- télégraphes, repère monde, dessinés SOUS les corps -------------- */

function _enTeChaser(ctx, e, col) {
  if (e.st !== 1) return;
  var k = 1 - clamp(e.stT / e.lungeWind, 0, 1);
  var L = e.lungeR * 0.85 * k;
  _enSight(ctx, e.x, e.y, e.x + Math.cos(e.ang) * L, e.y + Math.sin(e.ang) * L, _EN_ALERT, 0.35 + 0.5 * k, 2 + 2 * k);
}

function _enTeInter(ctx, e, col) {
  if (e.st === 1) {
    var k = 1 - clamp(e.stT / e.windMs, 0, 1);
    _enSight(ctx, e.x, e.y, e.lx, e.ly, _EN_WHITE, 0.3 + 0.55 * k, 1.6 + 2.4 * k, _EN_D_BIG);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(e.lx, e.ly);
    ctx.rotate(S.t / 260);
    var r = 26 - 12 * k;
    ctx.strokeStyle = _EN_ALERT; ctx.globalAlpha = 0.5 + 0.5 * k; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
    ctx.stroke();
    ctx.restore();
  } else if (e.st === 0 && e.px !== undefined && inView(e.px, e.py, 40)) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(e.px, e.py, 13, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function _enTeMine(ctx, e, col) {
  if (e.st !== 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.setLineDash(_EN_D_SCAN);
    ctx.beginPath(); ctx.arc(e.x, e.y, e.armR, 0, TAU); ctx.stroke();
    ctx.setLineDash(_EN_D_NONE);
    ctx.restore();
    return;
  }
  var k = 1 - clamp(e.stT / e.fuse, 0, 1);
  _enDanger(ctx, e.x, e.y, e.blast, k, _EN_ALERT);
}

function _enTeShooter(ctx, e, col) {
  if (e.aimT <= 0) return;
  var k = 1 - clamp(e.aimT / e.aimMs, 0, 1);
  var n = e.salvo + (e.elite ? 2 : 0);
  for (var i = 0; i < n; i++) {
    var a = e.aimA + (i - (n - 1) * 0.5) * e.spread;
    _enSight(ctx, e.x, e.y, e.x + Math.cos(a) * 620, e.y + Math.sin(a) * 620, _EN_EBULL, 0.18 + 0.42 * k, 1.4 + 2 * k);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(e.x + Math.cos(e.aimA) * 190, e.y + Math.sin(e.aimA) * 190);
  ctx.globalAlpha = 0.35 + 0.55 * k;
  ctx.strokeStyle = _EN_ALERT; ctx.lineWidth = 2;
  var r = 30 - 16 * k;
  ctx.beginPath();
  for (var q = 0; q < 4; q++) {
    var a2 = q * 1.5708 + 0.785;
    ctx.moveTo(Math.cos(a2) * r, Math.sin(a2) * r);
    ctx.lineTo(Math.cos(a2) * (r + 9), Math.sin(a2) * (r + 9));
  }
  ctx.stroke();
  ctx.restore();
}

function _enTeCutter(ctx, e, col) {
  if (e.st !== 1) return;
  var k = 1 - clamp(e.stT / e.chargeMs, 0, 1);
  var L = 260 + 900 * k;
  _enSight(ctx, e.x, e.y, e.x + Math.cos(e.ang) * L, e.y + Math.sin(e.ang) * L, col, 0.3 + 0.55 * k, 2 + 4 * k, _EN_D_BIG);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.14 + 0.2 * k;
  ctx.strokeStyle = _EN_WHITE;
  ctx.lineWidth = (e.r * 1.6) * k;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x + Math.cos(e.ang) * L, e.y + Math.sin(e.ang) * L);
  ctx.stroke();
  ctx.restore();
}

function _enTeJammer(ctx, e, col) {
  var r = e.fr || e.field;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // remplissage très léger, ne doit pas masquer le jeu
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.fill();
  // coque : c'est elle qui mange les tirs, elle doit se voir
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = col; ctx.lineWidth = 3;
  ctx.setLineDash(_EN_D_SCAN);
  ctx.lineDashOffset = -S.t / 22;
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.78, 0, TAU); ctx.stroke();
  ctx.setLineDash(_EN_D_NONE);
  // rayons de balayage
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = e.t / 900 + i * 1.047;
    ctx.moveTo(e.x + Math.cos(a) * r * 0.3, e.y + Math.sin(a) * r * 0.3);
    ctx.lineTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
  }
  ctx.stroke();
  if (e.absorbT > 0) {
    var k = e.absorbT / 220;
    ctx.globalAlpha = 0.5 * k;
    ctx.strokeStyle = _EN_WHITE; ctx.lineWidth = 5 * k;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, e.absorbA - 0.5, e.absorbA + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function _enTeParasite(ctx, e, col) {
  if (e.st !== 1 || e.biteT > 900) return;
  var k = 1 - clamp(e.biteT / 900, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3 + 0.5 * k;
  ctx.strokeStyle = _EN_ALERT;
  ctx.lineWidth = 1.5 + 2.5 * k;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 12 - 8 * k, 0, TAU); ctx.stroke();
  ctx.restore();
}

function _enTeThief(ctx, e, col) {
  if (e.st !== 1) return;
  var L = 90;
  _enSight(ctx, e.x, e.y, e.x + Math.cos(e.ang) * L, e.y + Math.sin(e.ang) * L, col, 0.6, 3, _EN_D_AIM);
}

var _enTele = {
  chaser: _enTeChaser, interceptor: _enTeInter, mine: _enTeMine,
  shooter: _enTeShooter, cutter: _enTeCutter, jammer: _enTeJammer,
  parasite: _enTeParasite, thief: _enTeThief
};

/* -------- corps, repère local (déjà translaté sur l'ennemi) --------------- */

function _enDrChaser(ctx, e, col) {
  var r = e.r;
  var puff = e.st === 1 ? 1 + 0.3 * (1 - clamp(e.stT / e.lungeWind, 0, 1)) : 1;
  _enGlow(ctx, 0, 0, r * 2.6, e.st === 1 ? _EN_ALERT : col, e.st === 2 ? 0.55 : 0.34);
  ctx.rotate(e.ang);
  ctx.scale(puff, puff);
  // fer de lance à ailerons
  ctx.beginPath();
  ctx.moveTo(r * 1.5, 0);
  ctx.lineTo(-r * 0.25, -r * 0.72);
  ctx.lineTo(-r * 1.05, -r * 1.0);
  ctx.lineTo(-r * 0.6, 0);
  ctx.lineTo(-r * 1.05, r * 1.0);
  ctx.lineTo(-r * 0.25, r * 0.72);
  ctx.closePath();
  _enShell(ctx, col);
  _enNeon(ctx, e.st === 1 ? _EN_ALERT : col, 7, 2.2);
  // oeil
  ctx.beginPath();
  ctx.moveTo(r * 0.85, 0); ctx.lineTo(r * 0.1, -r * 0.26); ctx.lineTo(r * 0.1, r * 0.26); ctx.closePath();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = e.st === 1 ? _EN_ALERT : _enLite(col);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(e.t / 120);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function _enDrInter(ctx, e, col) {
  var r = e.r;
  _enGlow(ctx, 0, 0, r * 2.8, col, e.st === 2 ? 0.6 : 0.32);
  ctx.rotate(e.ang);
  // dard : deux fourches avant
  ctx.beginPath();
  ctx.moveTo(r * 1.75, 0);
  ctx.lineTo(r * 0.2, -r * 0.5);
  ctx.lineTo(-r * 1.1, -r * 0.62);
  ctx.lineTo(-r * 0.5, 0);
  ctx.lineTo(-r * 1.1, r * 0.62);
  ctx.lineTo(r * 0.2, r * 0.5);
  ctx.closePath();
  _enShell(ctx, col);
  _enNeon(ctx, e.st >= 1 ? _EN_WHITE : col, 7, 2.2);
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.5); ctx.lineTo(r * 1.5, -r * 0.15);
  ctx.moveTo(r * 0.55, r * 0.5); ctx.lineTo(r * 1.5, r * 0.15);
  _enNeon(ctx, col, 5, 1.6, 0.9);
  // viseur interne
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t / 90);
  ctx.strokeStyle = _EN_WHITE; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(-r * 0.05, 0, r * 0.32, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function _enDrMine(ctx, e, col) {
  var r = e.r;
  var armed = e.st === 1;
  var k = armed ? 1 - clamp(e.stT / e.fuse, 0, 1) : 0;
  var beat = armed ? 0.5 + 0.5 * Math.sin(e.t / (40 + 120 * (1 - k))) : 0.35 + 0.15 * Math.sin(e.t / 700);
  var c = armed ? _EN_ALERT : col;
  _enGlow(ctx, 0, 0, r * (2.2 + 1.6 * k * beat), c, 0.3 + 0.45 * beat);
  ctx.rotate(e.spin);
  // pointes
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = i * 1.0472;
    ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
    ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5);
  }
  _enNeon(ctx, c, 6, 2.4);
  // fût octogonal
  ctx.beginPath();
  for (var q = 0; q < 8; q++) {
    var a2 = q * 0.7854 + 0.3927;
    var x = Math.cos(a2) * r * 0.82, y = Math.sin(a2) * r * 0.82;
    if (q === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  _enShell(ctx, c, 0.85);
  _enNeon(ctx, c, 7, 2.2);
  // oeil central qui bat
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = armed ? _EN_ALERT : _enLite(col);
  ctx.globalAlpha = 0.45 + 0.55 * beat;
  ctx.beginPath(); ctx.arc(0, 0, r * (0.24 + 0.2 * beat), 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function _enDrShooter(ctx, e, col) {
  var r = e.r;
  var aim = e.aimT > 0;
  var k = aim ? 1 - clamp(e.aimT / e.aimMs, 0, 1) : 0;
  _enGlow(ctx, 0, 0, r * 2.4, aim ? _EN_ALERT : col, 0.28 + 0.35 * k);
  ctx.rotate(e.ang);
  // canon
  var rec = (e.recoil || 0) * r * 0.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.4 - rec, -r * 0.3);
  ctx.lineTo(r * 1.85 - rec, -r * 0.2);
  ctx.lineTo(r * 1.85 - rec, r * 0.2);
  ctx.lineTo(r * 0.4 - rec, r * 0.3);
  ctx.closePath();
  _enShell(ctx, col, 0.9);
  _enNeon(ctx, aim ? _EN_ALERT : col, 6, 2);
  // corps hexagonal
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = i * 1.0472;
    var x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  _enShell(ctx, col);
  _enNeon(ctx, col, 8, 2.4);
  // bouche du canon qui chauffe
  if (aim) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = _EN_ALERT;
    ctx.globalAlpha = 0.4 + 0.6 * k;
    ctx.beginPath(); ctx.arc(r * 1.8, 0, r * (0.16 + 0.28 * k), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.rotate(-e.ang);
  _enHpArc(ctx, e, col);
}

function _enDrCutter(ctx, e, col) {
  var r = e.r;
  var hot = e.st === 1 || e.st === 2;
  var rest = e.st === 3;
  _enGlow(ctx, 0, 0, r * (e.st === 2 ? 3.4 : 2.4), hot ? _EN_WHITE : col, rest ? 0.16 : (e.st === 2 ? 0.6 : 0.34));
  ctx.rotate(e.ang);
  // fuselage
  ctx.beginPath();
  ctx.moveTo(r * 1.7, 0);
  ctx.lineTo(0, -r * 0.5);
  ctx.lineTo(-r * 1.4, 0);
  ctx.lineTo(0, r * 0.5);
  ctx.closePath();
  _enShell(ctx, col, rest ? 0.55 : 0.8);
  _enNeon(ctx, col, 7, 2.2, rest ? 0.5 : 1);
  // lames contrarotatives
  ctx.rotate(e.spin);
  ctx.beginPath();
  var L = rest ? r * 1.0 : r * (1.9 + (e.st === 2 ? 0.5 : 0));
  ctx.moveTo(-L, 0); ctx.lineTo(L, 0);
  ctx.moveTo(-L * 0.3, -L * 0.55); ctx.lineTo(L * 0.3, L * 0.55);
  _enNeon(ctx, hot ? _EN_WHITE : col, hot ? 9 : 6, hot ? 3 : 1.8, rest ? 0.45 : 1);
  ctx.rotate(-e.spin);
  if (rest) {
    // fenêtre de vulnérabilité clairement marquée
    ctx.rotate(-e.ang);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(e.t / 130);
    ctx.strokeStyle = '#7CFFB2'; ctx.lineWidth = 2;
    ctx.setLineDash(_EN_D_SCAN);
    ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, TAU); ctx.stroke();
    ctx.setLineDash(_EN_D_NONE);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

function _enDrSpawner(ctx, e, col) {
  var r = e.r;
  var o = e.open || 0;
  _enGlow(ctx, 0, 0, r * (2.2 + o), col, 0.3 + 0.4 * o);
  ctx.rotate(e.ang);
  // pétales
  for (var i = 0; i < 6; i++) {
    var a = i * 1.0472 + o * 0.32;
    var ca = Math.cos(a), sa = Math.sin(a);
    var d0 = r * (0.55 + 0.55 * o);
    ctx.beginPath();
    ctx.moveTo(ca * d0, sa * d0);
    ctx.lineTo(ca * (d0 + r * 0.85) - sa * r * 0.42, sa * (d0 + r * 0.85) + ca * r * 0.42);
    ctx.lineTo(ca * (d0 + r * 1.1), sa * (d0 + r * 1.1));
    ctx.lineTo(ca * (d0 + r * 0.85) + sa * r * 0.42, sa * (d0 + r * 0.85) - ca * r * 0.42);
    ctx.closePath();
    _enShell(ctx, col, 0.8);
    _enNeon(ctx, col, 6, 1.8);
  }
  // ruche
  ctx.beginPath();
  for (var q = 0; q < 6; q++) {
    var a2 = q * 1.0472 + 0.5236;
    var x = Math.cos(a2) * r * 0.72, y = Math.sin(a2) * r * 0.72;
    if (q === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  _enShell(ctx, col, 0.9);
  _enNeon(ctx, col, 9, 2.6);
  // coeur : blanchit avant l'éjection
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 + 0.65 * o;
  ctx.fillStyle = o > 0.15 ? _EN_WHITE : _enLite(col);
  ctx.beginPath(); ctx.arc(0, 0, r * (0.2 + 0.28 * o), 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.rotate(-e.ang);
  _enHpArc(ctx, e, col);
}

function _enDrMite(ctx, e, col) {
  var r = e.r;
  _enGlow(ctx, 0, 0, r * 2.4, col, 0.3);
  ctx.rotate(e.ang);
  ctx.beginPath();
  ctx.moveTo(r * 1.4, 0);
  ctx.lineTo(-r * 0.8, -r * 0.85);
  ctx.lineTo(-r * 0.3, 0);
  ctx.lineTo(-r * 0.8, r * 0.85);
  ctx.closePath();
  _enShell(ctx, col, 0.6);
  _enNeon(ctx, col, 4.5, 1.5);
}

function _enDrParasite(ctx, e, col) {
  var r = e.r;
  var att = e.st === 1;
  var warn = att && e.biteT < 900;
  var k = warn ? 1 - clamp(e.biteT / 900, 0, 1) : 0;
  var c = warn ? _EN_ALERT : col;
  _enGlow(ctx, 0, 0, r * (2.2 + k), c, 0.3 + 0.4 * k);
  ctx.rotate(e.ang + (att ? 1.5708 : 0));
  // crochets
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = -1.9 + i * 0.76;
    var fl = Math.sin(e.t / 180 + i) * 0.18;
    ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
    ctx.quadraticCurveTo(Math.cos(a + fl) * r * 1.5, Math.sin(a + fl) * r * 1.5,
                         Math.cos(a + fl * 2) * r * 1.9, Math.sin(a + fl * 2) * r * 2.1);
  }
  _enNeon(ctx, c, 5, 1.6);
  // carapace
  ctx.beginPath();
  ctx.ellipse ? ctx.ellipse(0, 0, r * 1.05, r * 0.82, 0, 0, TAU) : ctx.arc(0, 0, r, 0, TAU);
  _enShell(ctx, c, 0.85);
  _enNeon(ctx, c, 7, 2.2);
  // suçoir
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = warn ? _EN_ALERT : _enLite(col);
  ctx.globalAlpha = att ? 0.5 + 0.5 * Math.sin(e.t / (warn ? 70 : 260)) : 0.6;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function _enDrJammer(ctx, e, col) {
  var r = e.r;
  _enGlow(ctx, 0, 0, r * 2.6, col, 0.34);
  ctx.rotate(e.ang);
  // trois barres d'antenne
  ctx.beginPath();
  for (var i = 0; i < 3; i++) {
    var a = i * 2.0944 + e.t / 700;
    ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
    ctx.lineTo(Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75);
  }
  _enNeon(ctx, col, 6, 2);
  // disque
  ctx.beginPath();
  for (var q = 0; q < 8; q++) {
    var a2 = q * 0.7854;
    var x = Math.cos(a2) * r * (q % 2 ? 0.7 : 1), y = Math.sin(a2) * r * (q % 2 ? 0.7 : 1);
    if (q === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  _enShell(ctx, col, 0.9);
  _enNeon(ctx, col, 8, 2.4);
  // parasites visuels dans le disque
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, TAU); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = _EN_WHITE;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (var k = 0; k < 4; k++) {
    var yy = -r * 0.7 + ((e.t / 6 + k * 90) % (r * 1.6));
    ctx.moveTo(-r, yy); ctx.lineTo(r, yy);
  }
  ctx.stroke();
  ctx.restore();
  ctx.rotate(-e.ang);
  _enHpArc(ctx, e, col);
}

function _enDrThief(ctx, e, col) {
  var r = e.r;
  var fl = e.st === 1;
  _enGlow(ctx, 0, 0, r * (2.2 + 0.35 * e.carry), col, 0.3 + 0.12 * e.carry);
  ctx.rotate(e.ang);
  // corps voûté
  ctx.beginPath();
  ctx.moveTo(r * 1.35, 0);
  ctx.lineTo(r * 0.1, -r * 0.8);
  ctx.lineTo(-r * 1.2, -r * 0.55);
  ctx.lineTo(-r * 0.75, 0);
  ctx.lineTo(-r * 1.2, r * 0.55);
  ctx.lineTo(r * 0.1, r * 0.8);
  ctx.closePath();
  _enShell(ctx, col, 0.8);
  _enNeon(ctx, fl ? _EN_ALERT : col, 7, 2.2);
  // pattes
  ctx.beginPath();
  var sw = Math.sin(e.t / 70) * r * 0.5;
  ctx.moveTo(-r * 0.2, -r * 0.7); ctx.lineTo(-r * 0.6 + sw, -r * 1.5);
  ctx.moveTo(-r * 0.2, r * 0.7); ctx.lineTo(-r * 0.6 - sw, r * 1.5);
  _enNeon(ctx, col, 4, 1.5);
  // besace : un point par ressource volée
  for (var i = 0; i < e.carry && i < 4; i++) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#00e5ff';
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(e.t / 150 + i);
    ctx.beginPath();
    ctx.arc(-r * 0.9, -r * 0.55 + i * r * 0.42, r * 0.24, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

function _enDrMirror(ctx, e, col) {
  var r = e.r;
  _enGlow(ctx, 0, 0, r * 3, col, 0.4);
  ctx.rotate(e.ang);
  var off = e.glOff || 0;
  // aberration chromatique : deux copies décalées, effet « c'est toi, en faux »
  for (var p = 0; p < 2; p++) {
    ctx.save();
    ctx.translate(p === 0 ? -off : off, p === 0 ? off * 0.4 : -off * 0.4);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = p === 0 ? '#ff2e63' : '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.55, 0);
    ctx.lineTo(-r * 0.7, -r * 1.05);
    ctx.lineTo(-r * 0.25, 0);
    ctx.lineTo(-r * 0.7, r * 1.05);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // silhouette chrome, exactement la forme de la tête du joueur
  ctx.beginPath();
  ctx.moveTo(r * 1.55, 0);
  ctx.lineTo(-r * 0.7, -r * 1.05);
  ctx.lineTo(-r * 0.25, 0);
  ctx.lineTo(-r * 0.7, r * 1.05);
  ctx.closePath();
  _enShell(ctx, col, 0.75);
  _enNeon(ctx, col, 7, 2.4);
  // yeux morts
  ctx.fillStyle = '#101426';
  ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.3, 2.6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.35, r * 0.3, 2.6, 0, TAU); ctx.fill();
  ctx.rotate(-e.ang);
  _enHpArc(ctx, e, col);
}

var _enDr = {
  chaser: _enDrChaser, interceptor: _enDrInter, mine: _enDrMine,
  shooter: _enDrShooter, cutter: _enDrCutter, spawner: _enDrSpawner,
  mite: _enDrMite, parasite: _enDrParasite, jammer: _enDrJammer,
  thief: _enDrThief, mirror: _enDrMirror
};

/* -------- surcouche des modificateurs, repère local ---------------------- */

function _enModDraw(ctx, e, col) {
  if (e.mArm && !e.armBroken) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#9fb6d0';
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = e.armSpin + i * 1.5708;
      ctx.arc(0, 0, e.r * 1.12, a - 0.5, a + 0.5);
      ctx.moveTo(Math.cos(a + 0.6) * e.r * 1.12, Math.sin(a + 0.6) * e.r * 1.12);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  if (e.mExp) {
    var hpk = clamp(e.hp / e.maxHp, 0, 1);
    var per = 90 + 420 * hpk;
    var b = 0.5 + 0.5 * Math.sin(e.t / per);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.6 * b * (1.2 - hpk);
    ctx.fillStyle = _EN_ALERT;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.55, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, e.r * (1.2 + 0.25 * b), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  if (e.mReg && e.regT > 1500 && e.hp < e.maxHp) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(e.t / 160);
    ctx.strokeStyle = '#7CFFB2'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (var q = 0; q < 6; q++) {
      var a2 = q * 1.0472 + e.t / 900;
      var x = Math.cos(a2) * e.r * 1.3, y = Math.sin(a2) * e.r * 1.3;
      if (q === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  if (e.mTp && e.tpPh === 1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(e.t / 60);
    ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.5, 0, TAU); ctx.stroke();
    // marqueur de destination, en coordonnées locales
    var dx = e.tpX - e.x, dy = e.tpY - e.y;
    ctx.setLineDash(_EN_D_SCAN);
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx, dy); ctx.stroke();
    ctx.setLineDash(_EN_D_NONE);
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(dx, dy - e.r); ctx.lineTo(dx + e.r, dy);
    ctx.lineTo(dx, dy + e.r); ctx.lineTo(dx - e.r, dy); ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  if (e.mShl && e.shDown <= 0) {
    var k = clamp(e.shHp / e.shMax, 0, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#00e5ff';
    ctx.globalAlpha = 0.25 + 0.45 * k + 0.5 * (e.shFlash || 0);
    ctx.lineWidth = 3 + 3 * (e.shFlash || 0);
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 15, e.shA - e.shArc, e.shA + e.shArc);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (var w = -1; w <= 1; w += 2) {
      var aa = e.shA + w * e.shArc;
      ctx.moveTo(Math.cos(aa) * (e.r + 5), Math.sin(aa) * (e.r + 5));
      ctx.lineTo(Math.cos(aa) * (e.r + 22), Math.sin(aa) * (e.r + 22));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* ==========================================================================
   DÉFINITIONS
   ========================================================================== */

var _enDefs = {

  chaser: {
    name: 'TRAQUEUR', silhouette: 'delta',
    hp: 9, speed: 104, r: 13, dmg: 1, score: 10, xp: 1, color: '#ff2e63',
    turn: 3.0, lungeR: 205, lungeMul: 2.1, lungeWind: 300, lungeDur: 380, cd: 1700,
    drawR: 220,
    loot: 1, coreP: 0.03,
    init: function (e) { e.st = 0; e.stT = 0; e.cdT = rndR(200, 1200); }
  },

  interceptor: {
    name: 'INTERCEPTEUR', silhouette: 'dart',
    hp: 14, speed: 120, r: 14, dmg: 1, score: 24, xp: 2, color: '#b388ff',
    turn: 2.3, lead: 1.05, dashSpeed: 360, windMs: 520, dashMs: 520, cd: 2100,
    drawR: 620,
    loot: 1, coreP: 0.07,
    init: function (e) { e.st = 0; e.stT = 0; e.cdT = rndR(400, 1600); e.px = e.x; e.py = e.y; e.lx = e.x; e.ly = e.y; }
  },

  mine: {
    name: 'MINE', silhouette: 'octaspike',
    hp: 7, speed: 0, r: 15, dmg: 2, score: 14, xp: 2, color: '#ff8a3d',
    armR: 132, fuse: 800, blast: 140, blastDmg: 2, suicide: true, drawR: 160,
    loot: 1, coreP: 0.05,
    init: function (e) { e.st = 0; e.stT = 0; e.spin = rnd() * TAU; e.beepT = 0; e.detonated = 0; }
  },

  shooter: {
    name: 'ARTILLEUR', silhouette: 'hexgun',
    hp: 18, speed: 66, r: 16, dmg: 1, score: 28, xp: 3, color: '#ff6a00',
    turn: 2.4, range: 340, band: 90, aimMs: 720, cd: 1500,
    bSpeed: 195, bR: 6, salvo: 1, spread: 0.2, drawR: 640,
    loot: 2, coreP: 0.09,
    init: function (e) { e.aimT = 0; e.aimA = 0; e.cdT = rndR(300, 1500); e.orbit = chance(0.5) ? 1 : -1; e.recoil = 0; }
  },

  cutter: {
    name: 'TRANCHEUR', silhouette: 'blade',
    hp: 12, speed: 92, r: 12, dmg: 2, score: 32, xp: 3, color: '#ff4fd8',
    turn: 2.0, chargeMs: 600, dashSpeed: 540, dashMs: 820, restMs: 760, drawR: 1180,
    loot: 1, coreP: 0.08,
    init: function (e) { e.st = 0; e.stT = 0; e.spin = rnd() * TAU; }
  },

  spawner: {
    name: 'PONDEUSE', silhouette: 'hive',
    hp: 100, speed: 32, r: 27, dmg: 2, score: 95, xp: 11, color: '#8a4dff',
    turn: 1.1, keep: 430, cd: 2500, openMs: 720, brood: 2, child: 'mite', maxBrood: 16,
    loot: 4, coreP: 0.85, healP: 0.3,
    init: function (e) { e.st = 0; e.stT = 0; e.cdT = rndR(600, 1800); e.open = 0; e.orbit = chance(0.5) ? 1 : -1; }
  },

  mite: {
    name: 'LARVE', silhouette: 'shard',
    hp: 3, speed: 134, r: 7, dmg: 1, score: 4, xp: 1, color: '#c08cff',
    turn: 3.8, loot: 0, coreP: 0.01, healP: 0.004,
    init: function (e) { e.birth = 0; }
  },

  parasite: {
    name: 'PARASITE', silhouette: 'tick',
    hp: 9, speed: 170, r: 10, dmg: 1, score: 20, xp: 2, color: '#e04fff',
    turn: 3.4, biteMs: 3200,
    loot: 1, coreP: 0.06,
    init: function (e) { e.st = 0; e.seg = -1; e.biteT = 0; e.side = 0; e.warned = 0; }
  },

  jammer: {
    name: 'BROUILLEUR', silhouette: 'disc',
    hp: 40, speed: 74, r: 20, dmg: 1, score: 55, xp: 6, color: '#6c5cff',
    turn: 1.7, field: 200, keep: 230, drawR: 230,
    loot: 3, coreP: 0.4, healP: 0.12,
    init: function (e) { e.fr = e.field; e.absorbT = 0; e.absorbA = 0; e.zapT = 0; }
  },

  thief: {
    name: 'VOLEUR', silhouette: 'runner',
    hp: 14, speed: 150, r: 13, dmg: 1, score: 26, xp: 2, color: '#ffb43c',
    turn: 3.2, fleeSpeed: 215,
    loot: 1, coreP: 0.15,
    init: function (e) { e.st = 0; e.carry = 0; e.tgt = null; e.scanT = 0; }
  },

  mirror: {
    name: 'MIROIR', silhouette: 'chrome',
    hp: 30, speed: 152, r: 15, dmg: 2, score: 60, xp: 7, color: '#cfe9ff',
    turn: 5.0, delay: 1500,
    loot: 2, coreP: 0.35, healP: 0.1,
    init: function (e) { e.glT = 0; e.glOff = 0; e.ghosted = 0; }
  }
};

var _enUp = {
  chaser: _enUpChaser, interceptor: _enUpInter, mine: _enUpMine,
  shooter: _enUpShooter, cutter: _enUpCutter, spawner: _enUpSpawner,
  mite: _enUpMite, parasite: _enUpParasite, jammer: _enUpJammer,
  thief: _enUpThief, mirror: _enUpMirror
};

/* ==========================================================================
   API
   ========================================================================== */

function _enUpdate(e, dt) {
  _enFrameTick();
  var s = S.snake;
  if (!s) return;
  var f = _enUp[e.type];
  if (f) f(e, dt, s);
  _enModTick(e, dt, s);
  if (e.type !== 'thief' || e.st !== 1) _enArena(e, false);
}

function _enDraw(ctx, e) {
  var col = e.hitT > 0 ? _EN_WHITE : e.color;
  var tg = _enTele[e.type];
  if (tg) tg(ctx, e, col);

  ctx.save();
  ctx.translate(e.x, e.y);
  var f = _enDr[e.type];
  if (f) f(ctx, e, col);
  _enModDraw(ctx, e, col);
  if (e.elite) _enElite(ctx, e, col);
  if (e.hitT > 0) {
    // éclat blanc franc : l'impact doit se sentir même dans le fouillis
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(e.hitT / 90, 0, 1) * 0.55;
    ctx.fillStyle = _EN_WHITE;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.25, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function _enOnDeath(e) {
  var fx = S2030.fx;
  var big = e.elite || e.maxHp >= 40;

  if (fx) {
    if (fx.kill) fx.kill(e.x, e.y, e.color, big);
    else {
      fx.burst(e.x, e.y, e.color, big ? 34 : 16, big ? 420 : 260, { size: big ? 3 : 2, life: 0.4 });
      fx.ring(e.x, e.y, e.color, big ? 14 : 8, big ? 520 : 330, { w: big ? 6 : 3.5, life: 0.4 });
    }
    if (e.elite) fx.text(e.x, e.y - e.r - 12, '+' + Math.round(e.score * S.mult), _EN_HOT);
  }

  _enLoot(e);

  switch (e.type) {

    case 'mine':
      // amorcée, elle part toujours à pleine charge (mèche finie ou percutée) ;
      // abattue en sommeil, elle ne fait qu'un pétard.
      var live = e.detonated || e.st === 1;
      _enBlast(e.x, e.y, live ? e.blast : e.blast * 0.75,
        live ? e.blastDmg : 1, '#ff8a3d', e.id);
      break;

    case 'spawner':
      // elle vide sa couvée en mourant
      var n = 3 + (e.elite ? 3 : 0);
      for (var i = 0; i < n; i++) {
        var a = i * (TAU / n) + rnd();
        var c = spawnEnemy('mite', e.x + Math.cos(a) * (e.r + 8), e.y + Math.sin(a) * (e.r + 8), null);
        if (c) { c.ang = a; c.birth = 1; }
      }
      S2030.fx && S2030.fx.ring(e.x, e.y, e.color, e.r, 560, { w: 5, life: 0.45 });
      break;

    case 'parasite':
      if (e.st === 1) {
        _enParaN = Math.max(0, _enParaN - 1);
        _enApplyPara();
      }
      S2030.fx && S2030.fx.burst(e.x, e.y, e.color, 12, 200, { size: 1.6, life: 0.4, shape: 'shard' });
      break;

    case 'jammer':
      // impulsion terminale : le champ s'effondre et rend les tirs
      S2030.fx && S2030.fx.ring(e.x, e.y, e.color, e.fr || e.field, -260, { w: 5, life: 0.45 });
      S2030.fx && S2030.fx.ring(e.x, e.y, _EN_WHITE, 6, 420, { w: 3, life: 0.3 });
      S2030.fx && S2030.fx.glitch && S2030.fx.glitch(0.45);
      if (_enJamT > S.t) { _enJamT = S.t; S.jamT = S.t; }
      break;

    case 'thief':
      // il rend tout ce qu'il portait, plus une prime
      for (var k = 0; k < e.carry; k++) {
        addPickup('energy', e.x + rndR(-18, 18), e.y + rndR(-18, 18));
      }
      if (e.carry >= 2) addPickup('core', e.x, e.y);
      if (e.carry > 0) S2030.fx && S2030.fx.text(e.x, e.y - 22, 'RÉCUPÉRÉ', '#00e5ff');
      break;

    case 'mirror':
      S2030.fx && S2030.fx.glitch && S2030.fx.glitch(0.5);
      S2030.fx && S2030.fx.burst(e.x, e.y, '#00e5ff', 10, 240, { size: 1.8, life: 0.35 });
      S2030.fx && S2030.fx.burst(e.x, e.y, '#ff2e63', 10, 240, { size: 1.8, life: 0.35 });
      break;
  }

  // coeur instable : détonation à la mort, quel que soit le type
  if (e.mExp) _enBlast(e.x, e.y, e.expR, e.expDmg, '#ff8a3d', e.id);
  if (e.mArm && !e.armBroken) {
    S2030.fx && S2030.fx.burst(e.x, e.y, '#9fb6d0', 12, 280, { size: 2.2, life: 0.4, shape: 'shard' });
  }
}

S2030.enemies = {
  defs: _enDefs,
  mods: _enMods,
  update: _enUpdate,
  draw: _enDraw,
  onDeath: _enOnDeath,

  /* --- extras lisibles par les autres modules --------------------------- */

  /** true si les armes du joueur sont brouillées (champ d'un brouilleur). */
  isJammed: function () { return S.t < _enJamT; },

  /** Nombre de parasites accrochés au corps. */
  parasites: function () { return _enParaN; },

  /** Explosion utilisable par les niveaux ou le boss. */
  blast: function (x, y, r, dmg, color) { _enBlast(x, y, r, dmg || 1, color || '#ff8a3d', 0); },

  /** Remise à zéro entre deux parties. */
  reset: function () {
    _enParaN = 0; _enJamT = -1e9; _enFrameT = -1; _enBlastDepth = 0; _enParaScanT = -1e9;
    _enMirI = 0; _enMirLast = -1e9;
    for (var i = 0; i < _EN_MIR_N; i++) _enMirBuf[i].t = -1e9;
    if (S.snake) S.snake.turnBoost = 1 + 0.2 * (S.up.f_agility || 0);
    S.jamT = -1e9;
  }
};
