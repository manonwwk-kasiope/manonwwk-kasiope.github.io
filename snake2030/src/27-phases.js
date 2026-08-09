/* ============================================================================
   SNAKE 2030 — mise en scène
   Rig de caméra (zoom, bascule 3D, roulis), phases perspective façon Tron,
   treillis diagonal, et pouvoirs supplémentaires.
   ========================================================================== */

S2030.phases = (function () {

  /* ---------------------------------------------------------------- caméra */
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

  /* Bascule réelle autour de l'axe horizontal, en radians. C'est elle qui
     fait la 3D : le monde est rendu à plat dans un tampon, puis déformé en
     bandes avec une division perspective. Une transformation affine — la
     seule que sache poser un contexte 2D — ne peut pas l'exprimer, d'où le
     détour par le tampon. */
  var persp = 0, perspT = 0;
  function perspAng() { return persp; }

  /* Le plateau est cadré serré par défaut, et le cadrage respire : de temps
     en temps la caméra plonge à 200 %, puis se recule jusqu'à 100 % — la
     vue d'ensemble qui suit le rapprochement se lit comme une respiration,
     pas comme un réglage qui dérive. */
  var ZOOM_BASE = 1.30, ZOOM_NEAR = 2.00, ZOOM_WIDE = 1.00;
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
    var z = zc.mode === 1 ? ZOOM_NEAR : zc.mode === 2 ? ZOOM_WIDE : ZOOM_BASE;
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

  /* ================================================== mise en scène ordonnée
     La partie s'ouvre sur une progression écrite, pas sur un tirage : grille
     orthogonale vue du dessus, puis l'espace nu, puis la grille qui roule
     autour de l'axe de vue, puis la bascule autour de l'axe horizontal — et
     là seulement le jeu devient réellement tridimensionnel. Le tirage
     aléatoire ne reprend qu'une fois la progression jouée. */
  var phase = { t: 0, dur: 0, kind: '', zoom: 1, next: 2, step: 0 };

  /* Durées serrées : mesuré en conditions réelles, une partie dure trente à
     quarante secondes au réglage de difficulté par défaut. Une ouverture qui
     n'amenait la bascule qu'à cinquante-cinq secondes ne se voyait jamais.
     Resserrée à 23 s, elle restait hors d'atteinte pour quatre parties sur
     trente (survie médiane 34,2 s) — elle démarre maintenant vers 19 s. Reste
     c'est exactement ce que le joueur a signalé. Elle arrive maintenant vers
     vingt-trois secondes. */
  var SCRIPT = [
    { kind: 'ortho', dur: 6,  zoom: 1.00, rot: 0,     persp: 0,    nom: 'GRILLE' },
    { kind: 'space', dur: 4,  zoom: 1.04, rot: 0,     persp: 0,    nom: 'ESPACE' },
    { kind: 'roll',  dur: 5,  zoom: 1.02, rot: 0.20,  persp: 0,    nom: 'ROULIS' },
    { kind: 'dive',  dur: 22, zoom: 1.00, rot: -0.05, persp: 30,   nom: 'PERSPECTIVE' }
  ];
  /* Une fois la progression jouée, on reprend dans le désordre — la bascule
     3D revient plus souvent que le reste, c'est elle qu'on vient voir. */
  var POOL = [3, 3, 2, 0, 3, 1];

  function startPhase(k) {
    phase.kind = k.kind; phase.dur = k.dur; phase.t = k.dur; phase.zoom = k.zoom;
    cam.rotT = k.rot || 0;
    perspT = (k.persp || 0) * Math.PI / 180;
    if (k.kind === 'ortho' || k.kind === 'roll' || k.kind === 'dive') startGrid(k.kind === 'ortho' ? 'ortho' : 'diag', k.dur);
    else endGrid();
    S2030.ui && S2030.ui.banner && S2030.ui.banner(k.nom);
    S2030.audio && S2030.audio.sfx('warp');
    pulse(0.10);
  }

  function endPhase() {
    phase.t = 0; phase.kind = '';
    cam.rotT = 0; perspT = 0;
    endGrid();
  }

  /* ================================================================ treillis
     Deux orientations : orthogonale (lignes horizontales et verticales) et
     diagonale. Toute la géométrie passe par la normale d'une famille, ce qui
     évite d'écrire deux fois les mêmes formules avec un facteur racine de
     deux qui traîne. */
  var grid = { t: 0, warn: 0, spacing: 330, axis: 'ortho', a0: 0, on: 0 };

  function startGrid(axis, dur) {
    if (grid.t > 0 && grid.axis === axis) { grid.t = dur; return; }
    /* La position de référence de chaque ennemi n'est écrite que par la passe
       de rail : après une coupure, elle date d'avant. Le déplacement de toute
       la coupure était alors pris pour celui d'une image et reprojeté, ce qui
       téléportait tout le monde de près d'un pas de treillis. */
    for (var i = 0; i < S.enemies.length; i++) { S.enemies[i]._rx = undefined; S.enemies[i]._ra = undefined; }
    if (S.snake) S.snake._ra = undefined;
    grid.axis = axis;
    grid.a0 = axis === 'ortho' ? 0 : Math.PI / 4;
    grid.t = dur; grid.warn = 1.4; grid.on = 0;
  }
  function endGrid() { grid.t = 0; grid.warn = 0; grid.on = 0; }

  var HALF = 7;      // demi-épaisseur du faisceau, en unités monde

  /* ------------------------------------------ circulation sur le treillis */
  /* Les lignes ne blessent pas : elles canalisent. Tant que le treillis est
     là, serpent et ennemis n'ont plus que quatre caps possibles et glissent
     sur la droite la plus proche. Personne ne peut plus couper à travers —
     c'est la contrainte qui fait le sel de la séquence. */
  var QUAD = Math.PI / 2;

  function railed() { return grid.t > 0 && grid.warn <= 0; }

  /* cap utile le plus proche, parmi les quatre de l'orientation courante */
  function railAng(a) { return grid.a0 + Math.round((a - grid.a0) / QUAD) * QUAD; }

  /* Normale à la droite que longe ce cap. Les deux familles se distinguent
     par la parité du quadrant ; la normale suffit à tout calculer. */
  function railNorm(a, out) {
    var ra = railAng(a);
    out.x = -Math.sin(ra); out.y = Math.cos(ra);
    return out;
  }
  var _n = { x: 0, y: 1 }, _n2 = { x: 0, y: 1 };

  /* ------------------------------------------- circulation, seconde version
     Première version : on arrondissait le cap, puis on ramenait le corps vers
     la droite la plus proche avec un plafond de vitesse. Mesuré en partie
     réelle, ça ne tenait pas : à chaque virage le serpent traversait la maille
     en biais pendant près d'une seconde, et il n'était réellement sur ses
     droites que 13 % du temps en orthogonal, 37 % en diagonal. Baisser le
     plafond n'y changeait rien — ça allongeait la traversée.

     Le bon modèle est celui d'une moto-lumière : on ne tourne qu'en ATTEIGNANT
     une droite de la famille visée. Entre deux virages on ne quitte jamais sa
     droite, et le virage est net. */
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

  /* La passe de rail rejouait le déplacement à partir d'une position déjà
     sortie de l'arène, ce qui repoussait l'objet plus loin dehors à chaque
     image — croissance géométrique mesurée, jusqu'à 265 u en une image et
     des ennemis vivants hors du cadre visible. On borne systématiquement. */
  function railClamp(o) {
    var r = o.r || K.HEAD_R;
    if (o.x < r) o.x = r; else if (o.x > K.ARENA_W - r) o.x = K.ARENA_W - r;
    if (o.y < r) o.y = r; else if (o.y > K.ARENA_H - r) o.y = K.ARENA_H - r;
  }

  /* Rebond sur le bord de l'arène. Le cap est réfléchi par le coeur, mais le
     rail verrouillé continuait de pointer vers le mur : le serpent y restait
     collé. Et se contenter du cap réfléchi ne suffit pas — sur le treillis
     diagonal, une diagonale réfléchie repointe très souvent vers le bord,
     surtout dans un coin. Mesuré avant correction : le serpent passait 66 %
     de la séquence collé au bord. On choisit donc, parmi les quatre rails,
     celui qui rentre le plus franchement dans l'arène. */
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
    o._ra = best; o._rw = best;
    /* Sans verrou, le manche tenu contre le mur ramenait le cap dans le mur
       dès l'image suivante : cycle limite mesuré à 6 Hz, le serpent avançant
       de 4 u en 6 s. On lui laisse le temps de décoller. */
    o._rLock = 0.45;
    railPlace(o, best);
    railClamp(o);
  }

  /* Rend le cap à suivre cette image. « step » est la distance qui sera
     parcourue : c'est elle qui dit si l'intersection est atteinte. */
  /* Arrivée sur le réseau : on ne pose PAS l'objet sur sa droite d'un coup —
     mesuré, 84 % des ennemis et le serpent sautaient jusqu'à 166 u en une
     image, la tête se détachant du corps. On rejoint en glissant, plafonné,
     pendant une demi-seconde. */
  var RAIL_EASE = 0.5;

  function railSteer(o, want, step) {
    if (o._ra === undefined) {
      o._ra = railAng(o.ang || 0); o._rw = o._ra;
      o._rEase = RAIL_EASE;
    }

    if (o._rLock > 0) { o._rLock -= S.dt; want = undefined; }
    if (want !== null && want !== undefined) {
      // hystérésis : sous 35° d'écart, on considère que le joueur vise le rail
      // qu'il suit déjà. Sans elle, un manche tenu sur la frontière faisait
      // battre le cap jusqu'à quinze fois par seconde.
      if (Math.abs(norm(want - o._ra)) > RAIL_HYST) {
        var t = railAng(want);
        if (Math.abs(norm(t - o._ra)) < Math.PI * 0.75) o._rw = t;   // demi-tour refusé
      } else o._rw = o._ra;
    }

    if (o._rw !== undefined && o._rw !== o._ra) {
      // la droite visée se rapproche à mesure qu'on avance : on tourne pile
      // dessus, jamais entre deux
      if (Math.abs(railOff(o, o._rw)) <= step * 0.75 + 2) {
        railPlace(o, o._rw);
        o._ra = o._rw;
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

  /* Les ennemis se déplacent chacun à leur façon — vitesse, position posée à
     la main, téléportation. On leur applique la même règle : on récupère la
     distance qu'ils viennent de parcourir, et on la refait dans la direction
     autorisée. Ils gardent leur allure, ils perdent le droit de couper. */
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

  /* Passe de fin d'image : les ennemis sont ramenés sur leurs rails une fois
     que plus rien ne les déplacera. La séparation entre corps, appliquée
     après la mise à jour des phases, défaisait sinon une partie du travail. */
  function railLate(dt) {
    if (!railed() || S.phase !== 'play') return;
    railEnemies(dt);
  }

  /* On ne trace que les droites qui traversent la vue : une ligne d'arène
     mesure plusieurs milliers d'unités, et rasteriser un faisceau lumineux
     hors écran coûtait à lui seul un tiers des images par seconde. */
  function gridDraw(ctx) {
    if (grid.t <= 0) return;
    var fade = Math.min(1, grid.t / 1.2);
    var warn = grid.warn > 0;
    var q = S.partEff === undefined ? S.opt.particles : S.partEff;
    var R = (Math.abs(S.view.w) + Math.abs(S.view.h)) * 0.75 + 200;
    var cx = S.cam.x, cy = S.cam.y;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    for (var fam = 0; fam < 2; fam++) {
      var ra = grid.a0 + fam * QUAD;                 // cap longeant la famille
      var dx = Math.cos(ra), dy = Math.sin(ra);
      var nx = -dy, ny = dx;                         // normale
      var uc = cx * nx + cy * ny;                    // caméra projetée
      var k0 = Math.ceil((uc - R) / grid.spacing);
      var k1 = Math.floor((uc + R) / grid.spacing);
      for (var k = k0; k <= k1; k++) {
        var c = k * grid.spacing;
        // point de la droite le plus proche de la caméra, puis on étend
        var px = cx + nx * (c - uc), py = cy + ny * (c - uc);
        var a = (warn ? 0.10 : 0.5 * grid.on) * fade;
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = warn ? '#22e0ff' : '#5ef1ff';
        ctx.lineWidth = warn ? 2 : HALF * 2;
        ctx.beginPath();
        ctx.moveTo(px - dx * R, py - dy * R);
        ctx.lineTo(px + dx * R, py + dy * R);
        ctx.stroke();
        if (!warn && q > 0.6) {
          // le liseré blanc ne survit qu'en qualité pleine : c'est un second
          // rasterisage complet du faisceau, pour un gain visuel marginal
          ctx.globalAlpha = a * 0.5;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* --------------------------------- sol en perspective pendant les phases */
  function drawFloor(ctx) {
    // le sol de repère n'a de sens que sous la bascule réelle
    var lean = Math.max(cam.tilt, persp * 1.6);
    if (lean < 0.02) return;
    if ((S.partEff === undefined ? S.opt.particles : S.partEff) < 0.6) return;   // en qualité réduite
    var a = Math.min(0.5, lean) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = '#00e5ff';
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

  /* ------------------------------------------------------------- pouvoirs */
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
        S2030.audio && S2030.audio.sfx('shock', { x: s.x });
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
      nom: 'RALENTI', glyph: '◐', cd: 11000, col: '#5ef1ff',
      run: function () {
        var s = S.snake;
        // le monde ralentit, pas le joueur : c'est lui qui gagne du temps
        slowT = 4200;
        S2030.fx && S2030.fx.ring(s.x, s.y, '#5ef1ff', 12, 1400);
        S2030.fx && S2030.fx.flash('#5ef1ff', 0.22);
        S2030.audio && S2030.audio.sfx('warp');
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
    pick = (owned.indexOf(id) + 1) % owned.length;
    return true;
  }

  /* état lu par l'interface pour dessiner le bouton */
  function buttonState() {
    var id = nextReady() || owned[pick % owned.length];
    var p = POWERS[id];
    return { id: id, nom: p.nom, glyph: p.glyph, col: p.col,
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
    // le compte à rebours du bouton reste lisible par l'interface d'origine
    var st = buttonState();
    S.specialCd = st.ready ? 0 : 1;
    S.specialCdMax = 1;
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

    /* La progression s'enchaîne sans temps mort tant qu'elle n'est pas
       jouée : c'est une ouverture, pas une loterie. Ensuite seulement on
       laisse respirer entre deux mises en scène. */
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
    // déclencheurs directs, utiles pour la mise au point et les tests
    forcePhase: function (i) {
      startPhase(SCRIPT[(i || 0) % SCRIPT.length]);
      phase.step = SCRIPT.length; phase.t = 1e9; phase.next = 1e9;
    },
    /* Les déclencheurs suspendent la progression : sans cela elle reprenait la
       main deux secondes plus tard et remplaçait l'état forcé, ce qui rendait
       le crochet inutilisable pour observer quoi que ce soit. */
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
