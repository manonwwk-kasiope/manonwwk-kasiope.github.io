/* ======
   SNAKE 2030 — mise en scène
   Rig de caméra (zoom, bascule 3D, roulis), phases perspective façon Tron,
   treillis diagonal, et pouvoirs supplémentaires.
   ====== */

S2030.phases = (function () {

  /* ------ caméra */
  var cam = {
    zoom: 1, zoomT: 1, pulse: 0,
    tilt: 0, tiltT: 0,        // 0 = vue du dessus, 1 = bascule maximale
    rot: 0, rotT: 0
  };

  /* Coup de zoom bref : sert aux impacts, à l'ultime, aux montées de niveau. */
  function pulse(amount) {
    if (S.opt.reduceShake) return;
    cam.pulse = Math.max(cam.pulse, amount);
  }

  // bascule réelle autour de l'axe horizontal, en radians : c'est elle qui fait la 3D (transformation CSS, voir applyPersp)
  var persp = 0, perspT = 0;
  function perspAng() { return persp; }

  /* Cadrage serré qui respire (plongée à 200 % puis recul à 100 %). Mobile : base 1,30 ;
     bureau : 1,05. Lus à chaque image : S.desktop peut tomber au premier toucher. */
  function ZOOM_BASE() { return S.desktop ? 1.05 : 1.30; }
  function ZOOM_NEAR() { return 1.54 * ZOOM_BASE(); }
  function ZOOM_WIDE() { return 0.77 * ZOOM_BASE(); }
  var zc = { mode: 0, t: 0, next: 20 };      // 0 repos, 1 rapproché, 2 reculé

  function zoomCycle(dt) {
    if (S.phase !== 'play' || S.opt.reduceShake) { zc.mode = 0; zc.next = 20; return; }
    if (zc.mode) {
      zc.t -= dt;
      if (zc.t > 0) return;
      if (zc.mode === 1) { zc.mode = 2; zc.t = 4.6; }
      else { zc.mode = 0; zc.next = rndR(20, 32); }
      return;
    }
    zc.next -= dt;
    if (zc.next <= 0 && S.levelT > 8) {
      zc.mode = 1; zc.t = 3.4;
      S2030.audio && S2030.audio.sfx('warp');
    }
  }
  function zoomBase() {
    var z = zc.mode === 1 ? ZOOM_NEAR() : zc.mode === 2 ? ZOOM_WIDE() : ZOOM_BASE();
    /* La bascule agrandit l'image pour couvrir l'écran : sans compensation
       elle se lirait comme un coup de zoom au lieu d'un basculement. */
    if (persp > 0.001) {
      var c = Math.cos(persp);
      if (c > 0.2) z *= (4.6 * c) / (4.6 + Math.sin(persp));
    }
    return z;
  }

  function camUpdate(dt) {
    zoomCycle(dt);
    // le zoom suit aussi la vitesse : plus on fonce, plus on recule pour voir venir
    var sp = S.snake ? S.snake.speed / K.BASE_SPEED : 1;
    var want = zoomBase() / (1 + (sp - 1) * 0.22);
    if (phase.t > 0) want *= phase.zoom;
    cam.zoomT = want;
    cam.zoom = lerp(cam.zoom, cam.zoomT, 1 - Math.pow(0.02, dt));

    cam.pulse *= Math.pow(0.0015, dt);
    cam.tilt = lerp(cam.tilt, cam.tiltT, 1 - Math.pow(0.06, dt));
    cam.rot = lerp(cam.rot, cam.rotT, 1 - Math.pow(0.08, dt));
    // la bascule s'installe et se retire lentement : c'est le moment fort
    persp = lerp(persp, S.opt.reduceShake ? 0 : perspT, 1 - Math.pow(0.14, dt));
    if (persp < 0.002 && perspT === 0) persp = 0;
    joltDecay(dt);
  }

  /* Encaissement : un coup lourd fait piquer et rouler le plateau, puis il se
     redresse. Le mouvement est court — sinon on perd la lecture du jeu. */
  var jolt = { tilt: 0, rot: 0 };
  function doJolt(power, ang) {
    if (S.opt.reduceShake) return;
    var p = Math.min(2, power || 1);
    jolt.tilt = Math.min(0.46, jolt.tilt + 0.16 * p);
    jolt.rot = clamp(jolt.rot + Math.cos(ang || 0) * 0.085 * p, -0.19, 0.19);
    pulse(0.05 * p);
  }
  function joltDecay(dt) {
    var k = Math.pow(0.012, dt);
    jolt.tilt *= k; jolt.rot *= k;
    if (jolt.tilt < 0.002) jolt.tilt = 0;
    if (Math.abs(jolt.rot) < 0.002) jolt.rot = 0;
  }

  /* Facteur d'échelle effectif, lu par le rendu. */
  function zoom() { return cam.zoom * (1 + cam.pulse); }
  function tilt() { return cam.tilt + jolt.tilt; }
  function rot() { return cam.rot + jolt.rot; }

  /* ====== mise en scène ordonnée
     Ouverture écrite (grille ortho → espace → roulis → bascule), le tirage
     aléatoire ne reprend qu'une fois la progression jouée. */
  var phase = { t: 0, dur: 0, kind: '', zoom: 1, next: 2, step: 0 };

  // durées serrées : une partie dure 30 à 40 s (survie médiane 34,2 s), la bascule doit arriver vers 19 s
  var SCRIPT = [
    { kind: 'ortho', dur: 6,  zoom: 1.00, rot: 0,     persp: 0,    nom: 'GRILLE' },
    { kind: 'space', dur: 4,  zoom: 1.04, rot: 0,     persp: 0,    nom: 'ESPACE' },
    { kind: 'roll',  dur: 5,  zoom: 1.02, rot: 0.20,  persp: 0,    nom: 'ROULIS' },
    { kind: 'dive',  dur: 22, zoom: 1.00, rot: -0.05, persp: 30,   nom: 'PERSPECTIVE' }
  ];
  /* Une fois la progression jouée, on reprend dans le désordre — la bascule
     3D revient plus souvent que le reste, c'est elle qu'on vient voir. */
  var POOL = [3, 3, 2, 0, 3, 1];

  /* Un profil qui a déjà joué a déjà vu l'ouverture : on ne lui rejoue pas
     quatre bannières pour d'anciennes connaissances. */
  function _phSeen() {
    var st = S.stats;
    if (!st.phSeen) {
      st.phSeen = {};
      if ((st.runs | 0) > 0) for (var i = 0; i < SCRIPT.length; i++) st.phSeen[SCRIPT[i].kind] = 1;
    }
    return st.phSeen;
  }

  function startPhase(k) {
    phase.kind = k.kind; phase.dur = k.dur; phase.t = k.dur; phase.zoom = k.zoom;
    cam.rotT = k.rot || 0;
    perspT = (k.persp || 0) * Math.PI / 180;
    if (k.kind === 'ortho' || k.kind === 'roll' || k.kind === 'dive') startGrid(k.kind === 'ortho' ? 'ortho' : 'diag', k.dur);
    else endGrid();
    /* Quatre bannières plein écran en 22 s pour nommer des mouvements de
       caméra : la joueuse les subissait sans y rien apprendre. Le nom devient
       un tag de 11 px pendant une seconde à droite du nom de niveau ; seule la
       TOUTE PREMIÈRE rencontre d'une phase, par profil, garde sa bannière. */
    var seen = _phSeen();
    if (!seen[k.kind]) {
      seen[k.kind] = 1;
      if (typeof saveStats === 'function') saveStats();
      S2030.ui && S2030.ui.banner && S2030.ui.banner(k.nom);
    } else {
      S2030.ui && S2030.ui.phaseTag && S2030.ui.phaseTag(k.nom);
    }
    S2030.audio && S2030.audio.stinger && S2030.audio.stinger(0.7);
    pulse(0.10);
  }

  function endPhase() {
    phase.t = 0; phase.kind = '';
    cam.rotT = 0; perspT = 0;
    endGrid();
  }

  /* ====== treillis
     Deux orientations (ortho, diagonale) ; toute la géométrie passe par la normale d'une famille. */
  // pas 165 u (330 avant : un virage attendait en médiane 61 images le prochain nœud)
  var grid = { t: 0, warn: 0, spacing: 165, axis: 'ortho', a0: 0, on: 0 };

  function startGrid(axis, dur) {
    if (grid.t > 0 && grid.axis === axis) { grid.t = dur; return; }
    // la position de référence date d'avant la coupure : la reprojeter téléportait tout le monde d'un pas
    for (var i = 0; i < S.enemies.length; i++) { S.enemies[i]._rx = undefined; S.enemies[i]._ra = undefined; S.enemies[i]._rlx = undefined; }
    if (S.snake) { S.snake._ra = undefined; S.snake._rlx = undefined; }
    grid.axis = axis;
    grid.a0 = axis === 'ortho' ? 0 : Math.PI / 4;
    grid.t = dur; grid.warn = 1.4; grid.on = 0;
  }
  function endGrid() { grid.t = 0; grid.warn = 0; grid.on = 0; }

  var HALF = 3.5;    // demi-épaisseur du faisceau, u : à 165 u de pas, même densité lumineuse (et même coût) qu'à 330 u avec 7

  /* ------ circulation sur le treillis */
  /* Les lignes ne blessent pas : elles canalisent. Sur le treillis, serpent et
     ennemis n'ont que quatre caps et glissent sur la droite la plus proche. */
  var QUAD = Math.PI / 2;

  function railed() { return grid.t > 0 && grid.warn <= 0; }

  /* cap utile le plus proche, parmi les quatre de l'orientation courante */
  function railAng(a) { return grid.a0 + Math.round((a - grid.a0) / QUAD) * QUAD; }

  /* ------ circulation, seconde version
     Modèle moto-lumière : on ne tourne qu'en ATTEIGNANT une droite de la famille visée (ou en
     revenant au nœud qu'on vient de franchir, RAIL_BACK) ; entre deux virages on ne quitte
     jamais sa droite (la version « cap arrondi » laissait le serpent hors rails 63 à 87 % du temps). */
  var RAIL_HYST = 0.62;      // ~35° : un pouce qui tremble ne change pas de rail

  function railNormOf(a) { return { x: -Math.sin(a), y: Math.cos(a) }; }

  /* écart signé à la droite la plus proche de la famille que longe ce cap */
  function railOff(o, a) {
    var n = railNormOf(a);
    var u = o.x * n.x + o.y * n.y;
    return u - Math.round(u / grid.spacing) * grid.spacing;
  }
  /* pose exactement sur cette droite */
  function railPlace(o, a) {
    var n = railNormOf(a), d = railOff(o, a);
    o.x -= n.x * d; o.y -= n.y * d;
  }
  function railHold(o) {
    if (o._ra === undefined) return;
    if (!o._rEase || o._rEase <= 0) railPlace(o, o._ra);
    railClamp(o);
  }

  // borne systématique : rejouer le déplacement depuis une position hors arène divergeait (265 u en une image)
  function railClamp(o) {
    var r = o.r || K.HEAD_R;
    if (o.x < r) o.x = r; else if (o.x > K.ARENA_W - r) o.x = K.ARENA_W - r;
    if (o.y < r) o.y = r; else if (o.y > K.ARENA_H - r) o.y = K.ARENA_H - r;
  }

  // rebond sur le bord : le cap réfléchi repointe souvent vers le mur (66 % du temps collé, mesuré) ;
  // on prend, parmi les quatre rails, celui qui rentre le plus franchement dans l'arène
  function railBounce(o, nx, ny) {
    if (o._ra === undefined) return;
    var best = null, bestS = -1e9;
    for (var k = 0; k < 4; k++) {
      var r = grid.a0 + k * QUAD;
      var cx = Math.cos(r), cy = Math.sin(r);
      var dedans = cx * nx + cy * ny;                  // composante vers l'intérieur
      if (dedans <= 0.01) continue;                    // longe ou sort : écarté
      // à composante égale, on garde le cap le plus proche de celui qu'on avait
      var s2 = dedans * 10 + Math.cos(norm(r - o._ra));
      if (s2 > bestS) { bestS = s2; best = r; }
    }
    if (best === null) best = railAng(o.ang || 0);
    o._ra = best; o._rw = best; o._rw2 = undefined; o._rlx = undefined;
    // verrou : sans lui le manche tenu contre le mur y ramenait le cap dès l'image suivante (cycle à 6 Hz)
    o._rLock = 0.45;
    railPlace(o, best);
    railClamp(o);
  }

  /* Rend le cap à suivre cette image. « step » est la distance qui sera
     parcourue : c'est elle qui dit si l'intersection est atteinte. */
  // arrivée sur le réseau : on rejoint sa droite en glissant (plafonné) pendant une demi-seconde, pas d'un coup
  var RAIL_EASE = 0.5;

  // retour au nœud : une droite franchie depuis < RAIL_BACK u vaut encore (serpent et chemin rembobinés,
  // virage dans la même image) ; 72 u = 44 % du pas, pire cas 105 u ≈ 42 images à 150 u/s
  var RAIL_BACK = 72, PEND_LINGER = 120;     // ms : après un virage exécuté, le nœud reste signalé
  function sameAng(a, b) { return Math.abs(norm(a - b)) < 0.01; }
  function railRewind(o, back) {              // rembobine le chemin du serpent de « back » u
    if (o !== S.snake || !o.path || o.pathLen === undefined) return;
    var p = o.path;
    o.pathLen -= back;
    while (p.length > (o.p0 || 0) + 2 && p[p.length - 1].d > o.pathLen) p.pop();
    if (p.length && p[p.length - 1].d > o.pathLen) p[p.length - 1].d = o.pathLen;
  }
  // nœud d'attente : prochaine droite de la famille visée dans le sens de marche, ou null
  function pendingOf(o, out) {
    if (!o || o._ra === undefined || o._rw === undefined || sameAng(o._rw, o._ra)) return null;
    var n = railNormOf(o._rw), fwd = Math.cos(o._ra) * n.x + Math.sin(o._ra) * n.y, sp = grid.spacing;
    if (Math.abs(fwd) < 0.5) return null;
    var u = o.x * n.x + o.y * n.y;
    var d = ((fwd > 0 ? Math.ceil(u / sp - 1e-6) : Math.floor(u / sp + 1e-6)) * sp - u) * fwd;
    if (d < 0) d = 0;
    out = out || {};
    out.nx = o.x + Math.cos(o._ra) * d; out.ny = o.y + Math.sin(o._ra) * d; out.ang = o._rw; out.dist = d; out.done = false;
    return out;
  }
  var _pend = { nx: 0, ny: 0, ang: 0, dist: 0, done: false }, _last = { t: -1e9, nx: 0, ny: 0, ang: 0 };
  // API : nœud où le serpent va tourner, ou null ; après un virage il reste signalé PEND_LINGER ms (dist 0, done:true)
  function pending() {
    var s = S.snake, on = s && railed(), p = on ? pendingOf(s, _pend) : null;
    if (p || !on || S.t - _last.t >= PEND_LINGER) return p;
    _pend.nx = _last.nx; _pend.ny = _last.ny; _pend.ang = _last.ang; _pend.dist = 0; _pend.done = true;
    return _pend;
  }

  function railSteer(o, want, step) {
    if (o._ra === undefined) {
      o._ra = railAng(o.ang || 0); o._rw = o._ra; o._rw2 = undefined; o._rlx = undefined;
      o._rEase = RAIL_EASE;
    }

    if (o._rLock > 0) { o._rLock -= S.dt; want = undefined; }
    if (want !== null && want !== undefined) {
      // hystérésis : sous 35° d'écart, on considère que le joueur vise le rail
      // qu'il suit déjà. Sans elle, un manche tenu sur la frontière faisait
      // battre le cap jusqu'à quinze fois par seconde.
      if (Math.abs(norm(want - o._ra)) > RAIL_HYST) {
        var t = railAng(want);
        var dv = norm(want - o._ra);
        if (Math.abs(norm(t - o._ra)) >= Math.PI * 0.75) {
          // demi-tour : deux quarts enchaînés aux deux prochains nœuds, le premier du côté de la demande
          var side = dv >= 0 ? 1 : -1;
          o._rw = norm(o._ra + side * QUAD); o._rw2 = t;
        } else { o._rw = t; o._rw2 = undefined; }
      } else { o._rw = o._ra; o._rw2 = undefined; }
    }

    if (o._rw !== undefined && !sameAng(o._rw, o._ra)) {
      var d = railOff(o, o._rw), nn = railNormOf(o._rw);              // écart signé à la droite visée la plus proche
      var behind = d * (Math.cos(o._ra) * nn.x + Math.sin(o._ra) * nn.y);   // > 0 : droite derrière nous, à |d|
      var turned = Math.abs(d) <= step * 0.75 + 2;                     // on tourne pile sur la droite, jamais entre deux
      /* VERROU DE NŒUD. On ne tourne pas deux fois au même nœud. Sans lui le
         second quart d'un demi-tour s'exécutait à l'image SUIVANTE, au même
         nœud (mesuré : 3,5 u et 1 image entre les deux quarts), parce qu'après
         le premier quart la droite visée est exactement celle qu'on vient de
         quitter — et parce qu'une demande maintenue redemande le quart restant
         à chaque image. Un demi-pas de latence ne coûte aucun virage légitime :
         le nœud suivant est à un pas entier (165 u). */
      var lockR = grid.spacing * 0.5;
      var locked = o._rlx !== undefined
                && (o.x - o._rlx) * (o.x - o._rlx) + (o.y - o._rly) * (o.y - o._rly) < lockR * lockR;
      if (locked) turned = false;
      else if (!turned && o === S.snake && behind > 0 && behind < RAIL_BACK) { railRewind(o, behind); turned = true; }   // retour au nœud
      if (turned) {
        railPlace(o, o._rw); o._ra = o._rw;
        o._rlx = o.x; o._rly = o.y;                    // nœud consommé
        if (o === S.snake) { _last.t = S.t; _last.nx = o.x; _last.ny = o.y; _last.ang = o._ra; }
        if (o._rw2 !== undefined) { o._rw = o._rw2; o._rw2 = undefined; }
      }
    }
    if (o._rEase > 0) {
      // rattrapage progressif, jamais plus vite que l'objet ne se déplace
      o._rEase -= S.dt;
      var n = railNormOf(o._ra), d = railOff(o, o._ra);
      var cap = Math.max(step, 2) * 1.6;
      if (d > cap) d = cap; else if (d < -cap) d = -cap;
      o.x -= n.x * d; o.y -= n.y * d;
    } else railPlace(o, o._ra);
    return o._ra;
  }

  // ennemis : la distance qu'ils viennent de parcourir est refaite dans la direction autorisée
  function railEnemies(dt) {
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.dead || e.noRail) continue;
      var px = e._rx, py = e._ry;
      if (px === undefined) { px = e.x; py = e.y; e._ra = undefined; }
      var dx = e.x - px, dy = e.y - py;
      var mag = Math.sqrt(dx * dx + dy * dy);
      // un saut de plus d'un pas n'est pas un déplacement mais une
      // réapparition : on la laisse passer et on reprend le rail sur place
      if (mag > grid.spacing) { e._rx = e.x; e._ry = e.y; e._ra = undefined; continue; }
      e.x = px; e.y = py;
      var a = railSteer(e, mag > 0.01 ? Math.atan2(dy, dx) : undefined, mag);
      e.x += Math.cos(a) * mag; e.y += Math.sin(a) * mag;
      railHold(e);
      e.ang = a;
      if (e.vx || e.vy) {
        var vm = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        e.vx = Math.cos(a) * vm; e.vy = Math.sin(a) * vm;
      }
      railClamp(e);
      e._rx = e.x; e._ry = e.y;
    }
  }

  function gridUpdate(dt) {
    if (grid.t <= 0) return;
    grid.t -= dt;
    if (grid.warn > 0) { grid.warn -= dt; return; }
    if (grid.on < 1) grid.on = Math.min(1, grid.on + dt * 1.8);
    if (S.phase !== 'play') return;
  }

  // passe de fin d'image : ennemis ramenés sur leurs rails une fois que plus rien ne les déplacera
  function railLate(dt) {
    if (!railed() || S.phase !== 'play') return;
    railEnemies(dt);
  }

  /* Treillis : une famille = un chemin, un tracé, et seulement les droites qui coupent vraiment le
     tampon. gridSupp(n) = demi-étendue monde du tampon le long de n (roulis + échelle anisotrope) :
     l'ancien disque de rayon 0,75 (w + h) + 200 traçait 2,7 fois trop de droites, 2,3 fois trop longues.
     À 165 u de pas il y a deux fois plus de droites qu'à 330 : le faisceau est deux fois plus fin (même
     surface éclairée) et le liseré blanc, second rasterisage complet, est retiré — mesuré 4,1 ms par
     image avec, 2,4 sans, pour 2,7 ms au pas de 330. */
  function gridSupp(nx, ny, hw, hh, asp, c, sn) {
    return Math.abs(nx * c * hw - ny * sn * hh * asp) + Math.abs(nx * sn * hw / asp + ny * c * hh);
  }

  function gridDraw(ctx) {
    if (grid.t <= 0) return;
    var fade = Math.min(1, grid.t / 1.2), warn = grid.warn > 0, a = (warn ? 0.10 : 0.5 * grid.on) * fade;
    if (a <= 0.01) return;
    var cx = S.cam.x, cy = S.cam.y, sp = grid.spacing, m = HALF + 2;
    var hw = Math.abs(S.view.w) / 2, hh = Math.abs(S.view.h) / 2, rt = rot(), c = Math.cos(rt), sn = Math.sin(rt);
    var asp = (hh > 0.001 ? hw / hh : 1) / Math.max(0.2, 1 - tilt() * 0.42);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    /* G11 — LE RAIL N'EST PLUS CYAN. #5ef1ff donnait 1,14:1 contre le corps du
       serpent et #22e0ff 1,04:1 : le treillis et le serpent étaient la même
       couleur. #2a55cc donne 4,18:1, l'avertissement #142c72 8,36:1, et les deux
       rails se séparent l'un de l'autre par ΔL* = 19,5 (>= 18). Le trait
       d'avertissement passe de 2 u (1,39 px CSS sur iPhone) au plancher. */
    ctx.globalAlpha = a; ctx.strokeStyle = warn ? '#142c72' : '#2a55cc';
    ctx.lineWidth = warn ? (_LWWORLD > 2 ? _LWWORLD : 2) : HALF * 2;
    ctx.beginPath();
    for (var fm = 0; fm < 2; fm++) {
      var ra = grid.a0 + fm * QUAD, dx = Math.cos(ra), dy = Math.sin(ra), nx = -dy, ny = dx;
      var uc = cx * nx + cy * ny, un = gridSupp(nx, ny, hw, hh, asp, c, sn) + m;
      var L = gridSupp(dx, dy, hw, hh, asp, c, sn) + m;
      for (var k = Math.ceil((uc - un) / sp); k * sp <= uc + un; k++) {
        var o = k * sp - uc, px = cx + nx * o, py = cy + ny * o;
        ctx.moveTo(px - dx * L, py - dy * L); ctx.lineTo(px + dx * L, py + dy * L);
      }
    }
    ctx.stroke();
    ctx.restore();

    // nœud d'attente : disque pulsé de 10 u (couleur de la tête, alpha 0,8) et flèche fantôme de 24 u
    var pd = warn ? null : pending();
    if (pd && S.snake) {
      var col = S.snake.ghost > 0 ? '#d9c2ff' : '#fff3b0', pr = 10 * (1 + 0.18 * Math.sin(S.t / 90));
      var ax = Math.cos(pd.ang), ay = Math.sin(pd.ang);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8 * fade; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(pd.nx, pd.ny, pr, 0, TAU); ctx.fill();
      if (!pd.done) {
        ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var x0 = pd.nx + ax * 10, y0 = pd.ny + ay * 10, x1 = x0 + ax * 24, y1 = y0 + ay * 24;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.moveTo(x1 - ax * 8 - ay * 6, y1 - ay * 8 + ax * 6); ctx.lineTo(x1, y1); ctx.lineTo(x1 - ax * 8 + ay * 6, y1 - ay * 8 - ax * 6);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ------ étendue réellement visible
     Sous la bascule l'écran ne montre qu'un trapèze du tampon (bas agrandi et rogné, haut rétréci) :
     ici ce que l'oeil voit, en u monde autour de la caméra. Calculée une fois par état de caméra. */
  var VIS_D = 4.6;
  function visCover(t) { var c = Math.cos(t); return c < 0.2 ? 1 : (VIS_D + Math.sin(t)) / (VIS_D * c) * 1.015; }
  var _vis = { x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, left: 0, right: 0, top: 0, bottom: 0, persp: 0, rt: 0, vw: -1, vh: -1 };
  /* ROULIS. visibleExtent publiait un rectangle DROIT alors que toScreen tient
     compte du roulis : les coins du rectangle tourné qui débordent du rectangle
     droit étaient à l'écran et déclarés hors champ — un ennemi y apparaissait
     sous les yeux de la joueuse, et _lvPoint pouvait y faire tirer. L'erreur va
     dans les deux sens et on ne peut pas annuler les deux : on choisit
     l'INCLUSION EXCESSIVE, qui ne fait qu'armer et dessiner un peu trop tôt,
     contre l'exclusion d'un point visible, qui casse la promesse de G6.
     La rotation se fait en pixels, donc avec le rapport d'aspect : dans le
     repère normalisé du tampon, le domaine visible est le parallélogramme
     |X c − Y s/asp| <= 1, |X asp s + Y c| <= 1, dont les demi-étendues valent
     |c| + |s|/asp en X et |c| + asp|s| en Y. */
  function visibleExtent() {
    var V = _vis, cx = S.cam.x, cy = S.cam.y, rt = rot();
    if (V.vw !== S.view.w || V.vh !== S.view.h || V.persp !== persp || V.rt !== rt) {
      var hw = S.view.w / 2, hh = S.view.h / 2, top = hh, bottom = hh, side = hw;
      if (persp > 0.001) {
        var q = persp, c = visCover(q), D = VIS_D, cq = Math.cos(q), sq = Math.sin(q);
        // bas de l'écran ↔ fraction du tampon D / (c (D cos q + sin q)), haut ↔ D / (c (D cos q − sin q)), plafonnées au bord
        var vb = Math.min(1, D / (c * (D * cq + sq))), vt = Math.min(1, D / (c * (D * cq - sq)));
        bottom = hh * vb; top = hh * vt;
        side = hw * Math.min(1, (D + c * vt * sq) / (c * D));     // demi-largeur visible la plus grande (ligne du haut)
      }
      if (rt) {
        var ac = Math.abs(Math.cos(rt)), as = Math.abs(Math.sin(rt));
        var asp2 = (Math.abs(S.view.h) > 0.001 ? Math.abs(S.view.w) / Math.abs(S.view.h) : 1) / Math.max(0.2, 1 - tilt() * 0.42);
        var kx = ac + as / asp2, ky = ac + as * asp2;
        side *= kx; top *= ky; bottom *= ky;
      }
      V.left = V.right = side; V.top = top; V.bottom = bottom; V.persp = persp; V.rt = rt; V.vw = S.view.w; V.vh = S.view.h; V.cx = cx + 1;
      V.fx = hw > 0 ? side / hw : 1; V.ft = hh > 0 ? top / hh : 1; V.fb = hh > 0 ? bottom / hh : 1;   // fractions du tampon
    }
    if (V.cx !== cx || V.cy !== cy) { V.cx = cx; V.cy = cy; V.x0 = cx - V.left; V.x1 = cx + V.right; V.y0 = cy - V.top; V.y1 = cy + V.bottom; }
    return V;
  }

  // position écran d'un point monde en fractions (0..1) : roulis, échelle, bascule CSS
  function toScreen(wx, wy, out) {
    var X = (wx - S.cam.x) / (S.view.w / 2), Y = (wy - S.cam.y) / (S.view.h / 2), rt = rot();   // ±1 aux bords du tampon
    if (rt) {                                                          // la rotation se fait en pixels : rapport d'aspect
      var asp = (S.view.w / S.view.h) / (1 - tilt() * 0.42), px = X * asp, c = Math.cos(rt), sn = Math.sin(rt);
      X = (px * c - Y * sn) / asp; Y = px * sn + Y * c;
    }
    if (persp > 0.001) {
      var cv = visCover(persp), cY = cv * Y, f = VIS_D / (VIS_D - cY * Math.sin(persp));
      X = cv * X * f; Y = cY * Math.cos(persp) * f;
    }
    out = out || {};
    out.x = 0.5 + X / 2; out.y = 0.5 + Y / 2;
    return out;
  }

  /* Point monde → px CSS : caméra, SCALE, zoom, roulis, bascule (cv, CW, CH, SCALE : globales du coeur),
     puis la matrice CSS du canvas, relue par getComputedStyle quand le style change. */
  var _w2m = null, _w2k = '';
  function worldToScreen(wx, wy, out) {
    var sx = SCALE * zoom(), sy = sx * (1 - tilt() * 0.42), rt = rot(), c = Math.cos(rt), sn = Math.sin(rt);
    var px = (wx - S.cam.x) * sx, py = (wy - S.cam.y) * sy, x = px * c - py * sn, y = px * sn + py * c;
    var key = cv ? cv.style.transform + '|' + CW + 'x' + CH : '';
    if (key !== _w2k) { _w2k = key; _w2m = cv ? new DOMMatrix(getComputedStyle(cv).transform) : null; }
    if (_w2m && !_w2m.isIdentity) {         // origine 50 % 50 %, division par w
      var p = _w2m.transformPoint({ x: x, y: y, z: 0, w: 1 });
      x = p.x / p.w; y = p.y / p.w;
    }
    out = out || {};
    out.sx = x + CW / 2; out.sy = y + CH / 2;
    return out;
  }

  /* ------ sol en perspective pendant les phases */
  function drawFloor(ctx) {
    // le sol de repère n'a de sens que sous la bascule réelle
    var lean = Math.max(cam.tilt, persp * 1.6);
    if (lean < 0.02) return;
    if ((S.partEff === undefined ? S.opt.particles : S.partEff) < 0.6) return;   // en qualité réduite
    var a = Math.min(0.5, lean) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = '#3a7bff';
    ctx.lineWidth = 1.5;
    var step = 210;
    var vy0 = Math.max(0, S.cam.y - S.view.h * 0.6), vy1 = Math.min(K.ARENA_H, S.cam.y + S.view.h * 0.6);
    var x0 = Math.floor((S.cam.x - S.view.w * 0.6) / step) * step;
    var x1 = S.cam.x + S.view.w * 0.6;
    for (var x = x0; x < x1; x += step) {
      ctx.beginPath(); ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); ctx.stroke();
    }
    // les lignes horizontales se resserrent vers le fond : c'est ce
    // resserrement qui donne la lecture de profondeur
    var y = S.cam.y - S.view.h;
    var gap = 40;
    for (var k = 0; k < 12 && y < S.cam.y + S.view.h * 0.6; k++) {
      ctx.globalAlpha = a * 0.30 * (1 - k / 12);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      y += gap; gap *= 1.09;
    }
    ctx.restore();
  }

  /* ------ pouvoirs */
  /* Trois pouvoirs au maximum, utilisés à tour de rôle par le même bouton :
     le cahier des charges plafonne à trois boutons, on ne les multiplie pas. */
  var POWERS = {
    ghost: {
      nom: 'TRAVERSÉE', glyph: '◈', cd: 7000, col: '#b388ff',
      run: function () {
        var s = S.snake;
        var gt = 2200 + 700 * (S.up.f_ghostTime || 0);
        s.ghost = gt; s.invuln = Math.max(s.invuln, gt);
        S2030.fx && S2030.fx.ring(s.x, s.y, '#b388ff', 10, 900);
        S2030.fx && S2030.fx.flare(s.x, s.y, '#b388ff', 160);
        S2030.audio && S2030.audio.sfx('teleport', { x: s.x });
        var near = enemiesNear(s.x, s.y, 240);
        for (var i = 0; i < near.length; i++) {
          var e = near[i], a = angTo(s.x, s.y, e.x, e.y);
          e.vx += Math.cos(a) * 420; e.vy += Math.sin(a) * 420;
          damageEnemy(e, 6, { x: e.x, y: e.y });
        }
        pulse(0.06);
      }
    },
    slow: {
      nom: 'RALENTI', glyph: '◐', cd: 11000, col: '#9fc2ff',
      run: function () {
        var s = S.snake;
        // le monde ralentit, pas le joueur : c'est lui qui gagne du temps
        slowT = 4200;
        S2030.fx && S2030.fx.ring(s.x, s.y, '#9fc2ff', 12, 1400);
        S2030.fx && S2030.fx.flash('#9fc2ff', 0.22);
        S2030.audio && S2030.audio.sfx('boostEnd');
        S2030.ui && S2030.ui.banner && S2030.ui.banner('RALENTI');
        pulse(0.16);
        haptic([14, 40, 14]);
      }
    },
    fold: {
      nom: 'REPLI', glyph: '❖', cd: 13000, col: '#ffd166',
      run: function () {
        var s = S.snake;
        // le corps se replie : moins de segments, mais un serpent plus épais,
        // plus rapide et qui frappe beaucoup plus fort
        var take = Math.max(2, Math.floor(s.len * 0.35));
        s.len = Math.max(3, s.len - take);
        foldT = 8000; foldN = take;
        s.invuln = Math.max(s.invuln, 700);
        for (var i = 0; i < s.segs.length; i += 2) {
          S2030.fx && S2030.fx.burst(s.segs[i].x, s.segs[i].y, '#ffd166', 4, 1.1, { glow: true });
        }
        S2030.fx && S2030.fx.ring(s.x, s.y, '#ffd166', 10, 900);
        S2030.audio && S2030.audio.sfx('levelup');
        S2030.ui && S2030.ui.banner && S2030.ui.banner('REPLI');
        pulse(0.2);
        haptic([20, 30, 30]);
      }
    }
  };

  var slowT = 0, foldT = 0, foldN = 0;
  var owned = ['ghost'];
  var cds = { ghost: 0, slow: 0, fold: 0 };
  var pick = 0;

  function grant(id) {
    if (POWERS[id] && owned.indexOf(id) < 0 && owned.length < 3) {
      owned.push(id);
      S2030.ui && S2030.ui.toast && S2030.ui.toast('POUVOIR', POWERS[id].nom);
    }
  }

  /* le bouton utilise le prochain pouvoir prêt, dans l'ordre */
  function nextReady() {
    for (var k = 0; k < owned.length; k++) {
      var id = owned[(pick + k) % owned.length];
      if (cds[id] <= 0) return id;
    }
    return null;
  }

  function use() {
    if (S.phase !== 'play') return false;
    var id = nextReady();
    if (!id) return false;
    POWERS[id].run();
    cds[id] = POWERS[id].cd;
    if (S.run) S.run.usedSpecial = 1;
    pick = (owned.indexOf(id) + 1) % owned.length;
    return true;
  }

  /* état lu par l'interface pour dessiner le bouton */
  function buttonState() {
    var id = nextReady() || owned[pick % owned.length];
    var p = POWERS[id];
    return { id: id, nom: p.nom, glyph: p.glyph, col: p.col, cd: Math.max(0, cds[id]), cdMax: p.cd,
             ready: cds[id] <= 0, fill: cds[id] <= 0 ? 1 : 1 - cds[id] / p.cd };
  }

  function powersUpdate(dt) {
    var ms = dt * 1000;
    for (var k in cds) if (cds[k] > 0) cds[k] -= ms;
    if (slowT > 0) slowT -= ms;
    if (foldT > 0) {
      foldT -= ms;
      if (foldT <= 0) {
        // le repli se dénoue : les segments reviennent
        healSnake(foldN); foldN = 0;
        S2030.fx && S2030.fx.ring(S.snake.x, S.snake.y, '#ffd166', 8, 700);
      }
    }
    /* G14 : S.specialCd portait 0 ou 1, si bien qu'un compte à rebours en
       secondes affichait « 1 » du début à la fin de la recharge. Il porte
       désormais les MILLISECONDES restantes du pouvoir courant, et
       S.specialCdMax sa durée totale : la jauge du bouton (1 − cd/cdMax) est
       inchangée, le chiffre au centre devient vrai. */
    var st = buttonState();
    S.specialCd = st.ready ? 0 : Math.ceil(st.cd);
    S.specialCdMax = st.cdMax || 7000;
  }

  /* Multiplicateur de temps appliqué aux ennemis et à leurs projectiles. */
  function enemyTimeScale() { return slowT > 0 ? 0.35 : 1; }
  /* Épaisseur et puissance du serpent pendant le repli. */
  function foldFactor() { return foldT > 0 ? 1 : 0; }

  function reset() {
    cam.zoom = 1; cam.zoomT = 1; cam.pulse = 0;
    cam.tilt = 0; cam.tiltT = 0; cam.rot = 0; cam.rotT = 0;
    phase.t = 0; phase.kind = ''; phase.next = 2; phase.step = 0;
    persp = 0; perspT = 0;
    grid.t = 0; grid.warn = 0; grid.on = 0;
    slowT = 0; foldT = 0; foldN = 0; jolt.tilt = 0; jolt.rot = 0;
    owned = ['ghost']; cds = { ghost: 0, slow: 0, fold: 0 }; pick = 0;
    zc.mode = 0; zc.t = 0; zc.next = 20;
  }

  /* Redressement hors partie : la mise à jour ne tournant qu'en phase 'play',
     l'écran de fin gardait la bascule à 30° et le cadrage élargi. */
  function settle(dt) {
    perspT = 0; cam.tiltT = 0; cam.rotT = 0;
    zc.mode = 0;
    camUpdate(dt);
  }

  function update(dt) {
    camUpdate(dt);
    powersUpdate(dt);

    if (S.phase !== 'play') return;

    // les pouvoirs se débloquent en jouant, sans passer par un menu
    if (S.kills >= 25 && owned.indexOf('slow') < 0) grant('slow');
    if (S.kills >= 60 && owned.indexOf('fold') < 0) grant('fold');

    // l'ouverture s'enchaîne sans temps mort ; ensuite seulement on laisse respirer
    if (phase.t > 0) { phase.t -= dt; if (phase.t <= 0) endPhase(); }
    else {
      phase.next -= dt;
      if (phase.next <= 0) {
        if (phase.step < SCRIPT.length) {
          startPhase(SCRIPT[phase.step++]);
          phase.next = 1.0;                 // enchaînement serré
        } else {
          startPhase(SCRIPT[POOL[(rnd() * POOL.length) | 0]]);
          phase.next = rndR(10, 18);
        }
      }
    }

    gridUpdate(dt);
  }

  return {
    update: update, reset: reset, settle: settle,
    zoom: zoom, tilt: tilt, rot: rot, pulse: pulse, jolt: doJolt,
    drawFloor: drawFloor, drawDiag: gridDraw, persp: perspAng,
    use: use, grant: grant, buttonState: buttonState, powers: POWERS,
    enemyTimeScale: enemyTimeScale, foldFactor: foldFactor,
    railed: railed, railAng: railAng, railSteer: railSteer, railHold: railHold,
    railBounce: railBounce, railLate: railLate,
    railSpacing: grid.spacing,
    pending: pending, visibleExtent: visibleExtent, toScreen: toScreen, worldToScreen: worldToScreen,
    // déclencheurs directs, utiles pour la mise au point et les tests
    forcePhase: function (i) {
      startPhase(SCRIPT[(i || 0) % SCRIPT.length]);
      phase.step = SCRIPT.length; phase.t = 1e9; phase.next = 1e9;
    },
    // les déclencheurs suspendent la progression (sinon elle remplaçait l'état forcé deux secondes plus tard)
    forceDiag: function () { this.forceGrid('diag'); },
    forceGrid: function (axis) {
      phase.t = 0; phase.kind = ''; phase.next = 1e9; phase.step = SCRIPT.length;
      startGrid(axis || 'ortho', 1e9); grid.warn = 0; grid.on = 1;
    },
    forceZoom: function (m) { zc.mode = m; zc.t = m ? 99 : 0; zc.next = 99; },
    state: function () { return { phase: phase.kind, phaseT: phase.t, step: phase.step,
      diagT: grid.t, axe: grid.axis, persp: persp, perspDeg: persp * 180 / Math.PI,
      owned: owned.slice(), cds: JSON.parse(JSON.stringify(cds)), slow: slowT, fold: foldT,
      zoom: cam.zoom, zoomT: cam.zoomT, zmode: zc.mode, tilt: cam.tilt, rot: cam.rot,
      railed: railed() }; },
    inPhase: function () { return phase.t > 0; },
    inDiag: function () { return grid.t > 0; }
  };
})();
