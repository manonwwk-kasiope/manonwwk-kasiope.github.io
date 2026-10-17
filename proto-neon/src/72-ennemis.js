/* ===== 72-ennemis.js — N.ennemis : le bestiaire (flèche, mine, tourelle, sentinelle, CYCLOPE de repli) =====

   Tiré de 70-game.js (lot 0b) : newEnemy, spawnPoint, updFleche, updMine, updTourelle, updSentinelle, updBoss,
   ebullet, beam, kill (interne : seuls hit, zone, devorer et purge l'appellent), drawEnemy, drawTelegraphs. Chaque ennemi est un objet au schéma `ennemi` (§ 7.5) ; ce
   qui est propre à l'IA est préfixé « _ » (état fin `_st`, minuteurs `_stT`, `_cd`, cible `_aim`…). Le champ
   public `etat` ('portail' | 'approche' | 'arme' | 'attaque' | 'recup' | 'fuite' | 'proie' | 'mort') se déduit
   de l'état fin. Le gros ennemi de la démo vit ici sous le type `cyclope` (boss: true, partie: 'oeil') ; le lot 5b
   le remplace par N.colosse.

   ÉMET `kill` (seul émetteur : dans hit, zone, devorer, purge), `apparition` (fin du portail). N'applique JAMAIS
   les effets d'un kill (points, butin, explosion, gel) : ils arrivent par N.ev. Les appelants (arsenal, lasso,
   mine) ne font que demander l'action : hit(e, dmg, src).
   DEMANDE à N.joueuse : tuer('souffle', src) quand une mine explose sur la tête. Les contacts, les tirs et les
   lasers qui touchent la joueuse sont testés par N.joueuse (elle lit tirs et lasers ici).

   Interface (§ 7.8) : reset(), update(dt), draw(), spawn(type, x, y, opts), list, count(), hit(e, dmg, src),
   zone(x, y, r, dmg, src), devorer(e), dans(poly), pres(x, y, r), tir(x, y, vx, vy, opts), tirs,
   effacerTirs(x, y, r), inverser(dur), fuir(), purge(ordre). Ajouts : lasers, drawTele(), drawEnemies().
   Chiffres : N.R.ennemis (pv, rayon) ; la cadence de l'IA de la démo est dans CFG, marquée « → N.R ». */
N.ennemis = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                    // → N.R : valeurs de la démo, la refonte (lots 4a et 5b) les remplace
    pvBoss: 1200, rBoss: 20, bossNaissance: 0.6, bossTele: 2.4,
    vFleche: 32, vFlecheRampe: 14, tirTourelle: 74, tirBossRadial: 42, tirBossRadialDur: 46,
    plafondTirs: 140, vieTir: 9
  };
  var TAU = O.TAU;
  var S = null;
  var list = [], tirs = [], lasers = [];
  var charges = 0, inv = { t: 0 }, purgeFile = null, purgeI = 0, purgeNext = 0, purgeT = 0;
  var AL = 0, AR = 0, AT = 0, AB = 0;

  function conf(t) { return (R && R.ennemis && R.ennemis[t]) || {}; }
  function arena() { var A = O.A; AL = A.x0 + 7; AR = A.x1 - 7; AT = A.y0 + 7; AB = A.y1 - 7; }
  function tete() { return N.joueuse && N.joueuse.tete; }
  function tvit() { var P = tete(); return P ? P.vit : 68; }
  function prog() { return N.dir && N.dir.progression ? O.clamp(+N.dir.progression() || 0, 0, 1) : O.clamp(O.T.t / 120, 0, 1); }
  function rr(a, b) { return O.rr('ennemis', a, b); }
  function ri(a, b) { return O.ri('ennemis', a, b); }
  function rnd() { return O.rf('ennemis'); }
  function srcDe(e) { return { genre: 'ennemi', type: e.type, id: e.id }; }

  /* état fin -> état public */
  var ETAT = { entre: 'approche', chasse: 'approche', derive: 'approche', orbite: 'approche', pose: 'approche', actif: 'approche',
    vise: 'arme', arme: 'arme', fonce: 'attaque', tire: 'attaque', naissance: 'portail', portail: 'portail', mort: 'mort', fuite: 'fuite' };

  function reset() {
    S = N.S;
    list.length = 0; tirs.length = 0; lasers.length = 0;
    charges = 0; purgeFile = null; purgeI = 0; inv.t = 0;
    if (S) { S.enemies = list; S.shots = tirs; if (!S.tele) S.tele = []; }
  }

  /* ============================ naissance ============================ */
  function newEnemy(type, x, y, opts) {
    var c = conf(type), P = tete();
    var boss = type === 'cyclope';
    var pv = boss ? CFG.pvBoss : (c.pv || 20);
    var e = {
      id: N.ids.suivant(), type: type, x: x, y: y, vx: 0, vy: 0, r: boss ? CFG.rBoss : (c.r || 5), ang: P ? Math.atan2(P.y - y, P.x - x) : 0,
      pv: pv, pvMax: pv, etat: 'approche', etatT: 0, vuDepuis: -1,
      elite: !!(opts && opts.elite), mods: { blinde: false, rapide: false, instable: false },
      boss: boss, partie: boss ? 'oeil' : null, tele: -1, img: 0, dir: 0,
      _st: 'entre', _stT: 0, _age: 0, _flash: 0, _aim: 0, _cd: rr(0.6, 1.6), _shots: 0, _tx: x, _ty: y, _kx: 0, _ky: 0, _stun: 0,
      _dead: false, _orb: 0, _sens: rnd() < 0.5 ? -1 : 1, _spin: rr(0, TAU), _life: 0, _teleTotal: 0, _portail: 0, _flashT: -9
    };
    if (opts && opts.mods) for (var k in opts.mods) e.mods[k] = !!opts.mods[k];
    return e;
  }
  function station(e, margin) {
    var P = tete();
    for (var k = 0; k < 12; k++) {
      var x = rr(AL + margin, AR - margin), y = rr(AT + margin, AB - margin);
      if (!P || O.d2(x, y, P.x, P.y) > 70 * 70) { e._tx = x; e._ty = y; return; }
    }
    e._tx = (AL + AR) / 2; e._ty = (AT + AB) / 2;
  }
  /* spawn(type, x, y, opts) : opts { portail: s, elite, mods, st }. Un ennemi avec portail existe, ne touche
     pas et n'agit pas pendant ce délai (§ 2.3 : 600 ms d'apparition) ; `apparition` part à la fin du portail. */
  function spawn(type, x, y, opts) {
    arena();
    opts = opts || {};
    var e = newEnemy(type, x, y, opts), P = tete();
    if (type === 'fleche') e._st = 'chasse';
    else if (type === 'mine') { e._st = 'derive'; station(e, 16); }
    else if (type === 'tourelle') { e._st = 'entre'; station(e, 24); }
    else if (type === 'sentinelle') { e._st = 'orbite'; e._orb = P ? Math.atan2(y - P.y, x - P.x) : 0; e._cd = rr(2.5, 3.5); }
    else if (type === 'cyclope') { e._st = 'naissance'; e._stT = CFG.bossNaissance; e._cd = 1.4; e._atk = null; e._atkT = 0; e._atkD = 1; e._cyc = 0; e._pts = []; }
    if (opts.st) e._st = opts.st;
    if (opts.portail > 0) { e._portail = opts.portail; e._portailTotal = opts.portail; e.etat = 'portail'; }
    else apparu(e);
    list.push(e);
    return e;
  }
  function apparu(e) {
    e.etat = ETAT[e._st] || 'approche';
    if (N.ev) N.ev.emit('apparition', { id: e.id, type: e.type, x: e.x, y: e.y, elite: !!e.elite });
  }

  /* ============================ les tirs et les lasers ============================ */
  function tir(x, y, vx, vy, opts) {
    opts = opts || {};
    if (tirs.length >= CFG.plafondTirs) return null;
    var b = { id: N.ids.suivant(), x: x, y: y, vx: vx, vy: vy, r: opts.r || (opts.big ? 2 : 1.5), vie: opts.vie || CFG.vieTir,
      src: opts.src || { genre: 'ennemi', type: 'tourelle', id: -1 }, _big: !!opts.big, _dead: false };
    tirs.push(b);
    return b;
  }
  function ebullet(e, x, y, a, v, big) { return tir(x, y, Math.cos(a) * v, Math.sin(a) * v, { big: big, src: srcDe(e) }); }
  function beam(e, x, y, a, d, w) {
    var c = Math.cos(a), s = Math.sin(a), Ln = (O.VUE.w + O.VUE.h) * 1.2 + 200;
    lasers.push({ x0: x + c * 9, y0: y + s * 9, x1: x + c * Ln, y1: y + s * Ln, t: 0, d: d, w: w, src: srcDe(e), _dead: false });
  }
  function effacerTirs(x, y, r) {
    for (var i = 0; i < tirs.length; i++) {
      var b = tirs[i];
      if (!b._dead && O.d2(b.x, b.y, x, y) < r * r) { O.spark(b.x, b.y, O.ROSE, 2); b._dead = true; }
    }
  }

  /* ============================ la mort d'un ennemi ============================ */
  var SRC_PAR_DEFAUT = { genre: 'arme', type: 'canon', id: -1 };
  function kill(e, src) {
    if (e._dead) return false;
    e._dead = true; e.etat = 'mort'; e.pv = Math.min(e.pv, 0);
    var P = tete(), base = (R && R.score && R.score.base && R.score.base[e.type]) || 0;
    if (N.ev) N.ev.emit('kill', {
      id: e.id, type: e.type, x: e.x, y: e.y, elite: !!e.elite, boss: !!e.boss, base: base, src: src || SRC_PAR_DEFAUT,
      distTete: P ? Math.sqrt(O.d2(e.x, e.y, P.x, P.y)) : 0, gen: 0
    });
    return true;
  }
  /* hit(e, dmg, src) : les PV tombent ; à zéro, `kill` part une seule fois. -> true si l'ennemi est mort. */
  function hit(e, dmg, src) {
    if (!e || e._dead || e.etat === 'mort') return false;
    if (e._st === 'naissance' || e.etat === 'portail') return false;      // rien ne blesse avant son apparition
    e.pv -= dmg; O.flash(e);
    if (e.pv <= 0) return kill(e, src);
    return false;
  }
  function zone(x, y, r, dmg, src) {
    var n = 0, snap = list.slice();
    for (var i = 0; i < snap.length; i++) {
      var e = snap[i];
      if (e._dead) continue;
      var rr2 = r + e.r;
      if (O.d2(x, y, e.x, e.y) < rr2 * rr2) { hit(e, dmg, src); n++; }
    }
    return n;
  }
  function devorer(e) { return kill(e, { genre: 'joueuse', type: 'devore', id: -1 }); }
  function pres(x, y, r) {
    var o = [];
    for (var i = 0; i < list.length; i++) { var e = list[i]; if (!e._dead && O.d2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) o.push(e); }
    return o;
  }
  function dans(poly) {
    var o = [];
    if (!poly || poly.length < 6) return o;
    var nv = poly.length / 2;
    for (var i = 0; i < list.length; i++) {
      var e = list[i], dedans = false;
      if (e._dead) continue;
      for (var a = 0, b = nv - 1; a < nv; b = a++) {
        var xa = poly[a * 2], ya = poly[a * 2 + 1], xb = poly[b * 2], yb = poly[b * 2 + 1];
        if (((ya > e.y) !== (yb > e.y)) && (e.x < (xb - xa) * (e.y - ya) / (yb - ya) + xa)) dedans = !dedans;
      }
      if (dedans) o.push(e);
    }
    return o;
  }
  function count() { var n = 0; for (var i = 0; i < list.length; i++) if (!list[i]._dead && !list[i].boss) n++; return n; }
  function counts() {
    var c = { fleche: 0, mine: 0, tourelle: 0, sentinelle: 0, cyclope: 0, regular: 0 };
    for (var i = 0; i < list.length; i++) { var e = list[i]; if (e._dead) continue; c[e.type] = (c[e.type] || 0) + 1; if (!e.boss) c.regular++; }
    return c;
  }
  function inverser(dur) { inv.t = Math.max(inv.t, dur || 0); }
  function fuir() { for (var i = 0; i < list.length; i++) if (!list[i].boss) list[i]._st = 'fuite'; }
  /* purge(ordre) : tous les ennemis meurent l'un après l'autre (les plus proches de la tête d'abord, un toutes
     les 45 ms), tirs et lasers effacés. Chaque mort émet `kill` avec src decor/purge : pas de points ni de butin. */
  function purge(ordre) {
    var P = tete();
    purgeFile = list.filter(function (e) { return !e._dead; });
    if (P && ordre !== 'indifferent') purgeFile.sort(function (a, b) { return O.d2(a.x, a.y, P.x, P.y) - O.d2(b.x, b.y, P.x, P.y); });
    purgeI = 0; purgeT = 0; purgeNext = 0.25;
    for (var i = 0; i < tirs.length; i++) { O.spark(tirs[i].x, tirs[i].y, O.ROSE, 1); tirs[i]._dead = true; }
    for (i = 0; i < lasers.length; i++) lasers[i]._dead = true;
    return purgeFile.length;
  }
  function purgeEnCours() { return !!purgeFile && purgeI < purgeFile.length; }

  /* ============================ l'IA ============================ */
  function canAct(e) { return e._stun <= 0 && O.visible(e.x, e.y, -e.r + 2) && e.etat !== 'portail'; }

  function updFleche(e, dt, P) {
    var sp0 = CFG.vFleche + CFG.vFlecheRampe * prog();
    var t = O.T.t;
    if (e._st === 'chasse') {
      var lx = P.x + Math.cos(P.ang) * P.vit * 0.25, ly = P.y + Math.sin(P.ang) * P.vit * 0.25;
      e.ang = O.turnTo(e.ang, Math.atan2(ly - e.y, lx - e.x), 2.6 * dt);
      e.x += Math.cos(e.ang) * sp0 * dt; e.y += Math.sin(e.ang) * sp0 * dt;
      e._cd -= dt;
      var dd = O.d2(e.x, e.y, P.x, P.y);
      if (t > 25 && e._cd <= 0 && canAct(e) && dd < 80 * 80 && dd > 26 * 26 && charges < 2) {
        charges++;
        e._st = 'vise'; e._stT = 0.6; e._teleTotal = 0.6; e._aim = Math.atan2(P.y - e.y, P.x - e.x);           // télégraphe : 0,6 s
      }
    } else if (e._st === 'vise') {
      e._stT -= dt; if (e._stT <= 0) { e._st = 'fonce'; e._stT = 0.42; }
    } else if (e._st === 'fonce') {
      var ox = e.x, oy = e.y;
      e.x += Math.cos(e._aim) * 155 * dt; e.y += Math.sin(e._aim) * 155 * dt;
      if (N.fx && N.fx.trail) O.safe('fx.trail', function () { N.fx.trail(ox, oy, e.x, e.y, O.ROSE); });
      e._stT -= dt; if (e._stT <= 0) { e._st = 'chasse'; e._cd = rr(3.5, 6); e.ang = e._aim; }
    }
  }
  function updMine(e, dt, P) {
    e._spin += dt * (e._st === 'arme' ? 9 : 1.6);
    if (e._st === 'derive') {
      var dx = e._tx - e.x, dy = e._ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { e._st = 'pose'; e._life = 15; } else { e.x += dx / d * 16 * dt; e.y += dy / d * 16 * dt; }
    } else if (e._st === 'pose') {
      e._life -= dt;
      if (e._life <= 0 && canAct(e)) { e._st = 'arme'; e._stT = 0.75; e._teleTotal = 0.75; }
    } else if (e._st === 'arme') {
      e._stT -= dt;
      if (e._stT <= 0) {
        /* le disque montré est exactement le disque qui tue */
        O.boom(e.x, e.y, 0.5, O.MAGENTA); O.sfx('kill', { pitch: 0 });
        var rs = 26 + ((R && R.mort && R.mort.rayonTete) || 3);
        if (O.d2(e.x, e.y, P.x, P.y) < rs * rs && N.joueuse.etat !== 'mort' && !N.joueuse.invul()) N.joueuse.tuer('souffle', srcDe(e));
        e._dead = true; e.etat = 'mort'; return;
      }
    }
    if (e._st !== 'arme' && canAct(e) && O.d2(e.x, e.y, P.x, P.y) < 34 * 34) { e._st = 'arme'; e._stT = 0.75; e._teleTotal = 0.75; }   // télégraphe : 0,75 s
  }
  function updTourelle(e, dt, P) {
    var want = Math.atan2(P.y - e.y, P.x - e.x), t = O.T.t;
    if (e._st === 'entre') {
      var dx = e._tx - e.x, dy = e._ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { e._st = 'pose'; e._cd = 0.9; } else { e.x += dx / d * 30 * dt; e.y += dy / d * 30 * dt; }
      e._aim = O.turnTo(e._aim, want, 3 * dt);
    } else if (e._st === 'pose') {
      e._aim = O.turnTo(e._aim, want, 3 * dt);
      e._cd -= dt;
      if (e._cd <= 0 && canAct(e)) { e._st = 'vise'; e._stT = 0.65; e._teleTotal = 0.65; e._aim = want; }              // télégraphe : 0,65 s
    } else if (e._st === 'vise') {
      e._stT -= dt;
      if (e._stT <= 0) {
        ebullet(e, e.x + Math.cos(e._aim) * 7, e.y + Math.sin(e._aim) * 7, e._aim, CFG.tirTourelle, false);
        e._shots++;
        if (e._shots >= 3) { e._shots = 0; e._st = 'entre'; station(e, 24); }
        else { e._st = 'pose'; e._cd = rr(2.2, 3.2) - 0.6 * O.clamp((t - 60) / 60, 0, 1); }
      }
    }
  }
  function updSentinelle(e, dt, P) {
    var t = O.T.t;
    if (e._st === 'orbite') {
      e._orb += 0.45 * dt * e._sens;
      var V = O.VUE;
      var tx = O.clamp(P.x + Math.cos(e._orb) * 78, V.x + 10, V.x + V.w - 10), ty = O.clamp(P.y + Math.sin(e._orb) * 78, AT - 6, V.y + V.h - 10);
      var dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) { e.x += dx / d * Math.min(d, 36 * dt); e.y += dy / d * Math.min(d, 36 * dt); }
      e.ang = Math.atan2(P.y - e.y, P.x - e.x);
      e._cd -= dt;
      if (e._cd <= 0 && canAct(e)) { e._st = 'vise'; e._stT = 0.85; e._teleTotal = 0.85; e._aim = Math.atan2(P.y - e.y, P.x - e.x); }   // télégraphe : 0,85 s
    } else if (e._st === 'vise') {
      e._stT -= dt; if (e._stT <= 0) { e._st = 'tire'; e._stT = 0.35; beam(e, e.x, e.y, e._aim, 0.35, 3); }
    } else if (e._st === 'tire') {
      e._stT -= dt; if (e._stT <= 0) { e._st = 'orbite'; e._cd = rr(4.5, 6.5) - 1.2 * O.clamp((t - 60) / 60, 0, 1); }
    }
  }

  /* ---- le CYCLOPE de la démo (repli de N.colosse) : radial, laser, appel ---- */
  var CYCLE = ['radial', 'laser', 'radial', 'appel', 'laser', 'radial'];
  function updBoss(e, dt, P) {
    e._age += dt;
    /* il apparaît sans blesser pendant 0,6 s, et tant que la tête est sur lui (2 s au plus) : G-14 */
    if (e._st === 'naissance') { e._stT -= dt; if (e._stT <= 0 && (O.d2(e.x, e.y, P.x, P.y) > 34 * 34 || e._age > 2)) { e._st = 'actif'; e.etat = 'approche'; } return; }
    var cx = (AL + AR) / 2, cy = (AT + AB) / 2, t = O.T.t;
    var ax = O.clamp(cx + (cx - P.x) * 0.45, AL + 26, AR - 26), ay = O.clamp(cy + (cy - P.y) * 0.45, AT + 24, AB - 24);
    var sp0 = e._atk ? 7 : 17, dx = ax - e.x, dy = ay - e.y, d = Math.sqrt(dx * dx + dy * dy), k;
    if (d > 1) { e.x += dx / d * Math.min(d, sp0 * dt); e.y += dy / d * Math.min(d, sp0 * dt); }
    var hard = e.pv < e.pvMax / 2;
    if (!e._atk) {
      e._cd -= dt;
      if (e._cd <= 0) {
        e._atk = CYCLE[e._cyc % CYCLE.length]; e._cyc++;
        e._atkT = e._atk === 'laser' ? 1.15 : 0.9; e._atkD = e._atkT; e._teleTotal = e._atkT;               // télégraphes de 0,9 à 1,15 s (G-13 : 0,8 s)
        if (e._atk === 'laser') e._aim = Math.atan2(P.y - e.y, P.x - e.x);
        if (e._atk === 'appel') {
          e._pts = [];
          for (k = 0; k < 3; k++) {
            var a = (k / 3) * TAU + e._age, px = O.clamp(e.x + Math.cos(a) * 40, AL + 8, AR - 8), py = O.clamp(e.y + Math.sin(a) * 40, AT + 8, AB - 8);
            if (O.d2(px, py, P.x, P.y) > 50 * 50) e._pts.push({ x: px, y: py });
          }
        }
      }
    } else {
      e._atkT -= dt;
      if (e._atkT <= 0) {
        if (e._atk === 'radial') {
          var nb = hard ? 12 : 10, off = e._cyc * 0.21;
          for (k = 0; k < nb; k++) { var aa = off + k / nb * TAU; ebullet(e, e.x + Math.cos(aa) * 12, e.y + Math.sin(aa) * 12, aa, hard ? CFG.tirBossRadialDur : CFG.tirBossRadial, true); }
          if (hard) e._renfort = 0.4;
          e._off = off;
          O.shake(2);
        } else if (e._atk === 'laser') {
          beam(e, e.x, e.y, e._aim, 0.4, 5);
          O.shake(3);
        } else if (e._atk === 'appel') {
          for (k = 0; k < e._pts.length; k++) {
            if (O.d2(e._pts[k].x, e._pts[k].y, P.x, P.y) < 55 * 55) continue;    // la tête est venue sur la marque : on n'y naît pas
            var m = spawn(t >= 60 && k === 1 ? 'fleche' : 'mine', e._pts[k].x, e._pts[k].y, { portail: 0 });
            if (m.type === 'mine') { m._st = 'pose'; m._life = 14; m.etat = 'approche'; }
            O.ringFx(m.x, m.y, 12, O.MAGENTA, 0.25);
          }
        }
        e._atk = null; e._cd = hard ? 1.0 : 1.5; e._teleTotal = 0;
      }
    }
    if (e._renfort > 0) {                                  // la seconde ronde de la phase dure
      e._renfort -= dt;
      if (e._renfort <= 0) for (var q = 0; q < 8; q++) { var b = e._off + (q + 0.5) / 8 * TAU; ebullet(e, e.x + Math.cos(b) * 12, e.y + Math.sin(b) * 12, b, 38, true); }
    }
  }

  /* ============================ mise à jour ============================ */
  function update(dt) {
    if (!S) S = N.S;
    arena();
    var P = tete(), i, e;
    if (!P) return;
    charges = 0;
    for (i = 0; i < list.length; i++) if (!list[i]._dead && list[i].type === 'fleche' && (list[i]._st === 'vise' || list[i]._st === 'fonce')) charges++;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e._dead) continue;
      e._age += 0; e.etatT += dt; e.img = (e.img + 1) | 0;
      if (e._flash > 0) e._flash -= dt;
      if (e._portail > 0) {                               // le portail : il existe, il ne touche pas, il n'agit pas
        e._portail -= dt;
        if (e._portail <= 0) { e._portail = 0; apparu(e); }
        continue;
      }
      /* vue : depuis combien de temps l'ennemi est entièrement visible */
      var plein = N.cam && N.cam.shown ? N.cam.shown(e.x, e.y, 0) : O.visible(e.x, e.y, -e.r);
      e.vuDepuis = plein ? (e.vuDepuis < 0 ? 0 : e.vuDepuis + dt) : -1;
      if (e.boss) { updBoss(e, dt, P); e.etat = ETAT[e._st] || 'approche'; if (e._atk) e.etat = 'arme'; continue; }
      if (e._stun > 0) e._stun -= dt;
      if (e._kx || e._ky) { e.x += e._kx * dt; e.y += e._ky * dt; var f = Math.pow(0.02, dt); e._kx *= f; e._ky *= f; if (Math.abs(e._kx) + Math.abs(e._ky) < 2) { e._kx = 0; e._ky = 0; } }
      if (e._st === 'fuite') {                            // fuir() : il s'éloigne de la tête
        var dd0 = Math.sqrt(O.d2(e.x, e.y, P.x, P.y)) || 1; e.x += (e.x - P.x) / dd0 * 60 * dt; e.y += (e.y - P.y) / dd0 * 60 * dt;
      } else if (e.type === 'fleche') updFleche(e, dt, P);
      else if (e.type === 'mine') updMine(e, dt, P);
      else if (e.type === 'tourelle') updTourelle(e, dt, P);
      else updSentinelle(e, dt, P);
      if (e._dead) continue;
      e.etat = ETAT[e._st] || 'approche';
      e.dir = O.dir16(e.type === 'fleche' && (e._st === 'vise' || e._st === 'fonce') ? e._aim : e.ang);
      /* trop loin hors de la vue : on le rappelle (une flèche qui a dépassé sa cible) */
      var V = O.VUE;
      if (e.x < V.x - 60 || e.x > V.x + V.w + 60 || e.y < V.y - 60 || e.y > V.y + V.h + 60) {
        e.x = O.clamp(e.x, V.x - 40, V.x + V.w + 40); e.y = O.clamp(e.y, V.y - 40, V.y + V.h + 40);
        if (e.type === 'fleche') e._st = 'chasse';
      }
    }
    /* les flèches ne s'empilent pas */
    for (i = 0; i < list.length; i++) {
      var a = list[i]; if (a.type !== 'fleche' || a._dead) continue;
      for (var j = i + 1; j < list.length; j++) {
        var b = list[j]; if (b.type !== 'fleche' || b._dead) continue;
        var dd = O.d2(a.x, a.y, b.x, b.y);
        if (dd < 81 && dd > 0.01) { var dn = Math.sqrt(dd), push = (9 - dn) * 0.5 / dn, px = (a.x - b.x) * push, py = (a.y - b.y) * push; a.x += px; a.y += py; b.x -= px; b.y -= py; }
      }
    }
    /* tirs ennemis : ils avancent ; N.joueuse teste ce qu'ils touchent */
    for (i = 0; i < tirs.length; i++) {
      var s = tirs[i];
      if (s._dead) continue;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vie -= dt;
      var VU = O.VUE;
      if (s.vie <= 0 || s.x < VU.x - 8 || s.x > VU.x + VU.w + 8 || s.y < VU.y - 8 || s.y > VU.y + VU.h + 8) s._dead = true;
    }
    for (i = 0; i < lasers.length; i++) {
      var z = lasers[i];
      if (z._dead) continue;
      z.t += dt; if (z.t >= z.d) z._dead = true;
    }
    /* la purge : un ennemi meurt toutes les 45 ms */
    if (purgeFile) {
      purgeT += dt;
      while (purgeI < purgeFile.length && purgeT >= purgeNext) {
        var pe = purgeFile[purgeI++];
        if (!pe._dead) kill(pe, { genre: 'decor', type: 'purge', id: -1 });
        purgeNext += 0.045;
      }
      if (purgeI >= purgeFile.length) purgeFile = null;
    }
    compact(tirs); compact(lasers);
    for (i = list.length - 1; i >= 0; i--) if (list[i]._dead) list.splice(i, 1);
  }
  function compact(L) { var j = 0; for (var i = 0; i < L.length; i++) if (!L[i]._dead) L[j++] = L[i]; L.length = j; }

  /* ============================ dessin ============================ */
  function enemySprite(e, f) {
    var sp = O.sp;
    if (e.type === 'fleche') return sp('fleche:' + O.dir16(e._st === 'vise' || e._st === 'fonce' ? e._aim : e.ang), f);
    if (e.type === 'tourelle') return sp(e._st === 'vise' ? 'tourelle:charge' : 'tourelle', f);
    if (e.type === 'mine') return sp(e._st === 'arme' ? 'mine:alerte' : 'mine', f);
    if (e.type === 'cyclope') return sp(e._atk ? 'colosse:oeil' : 'colosse', f);
    return sp(e.type, f);
  }
  function drawEnemy(e) {
    var ak = O.T.ak, f = Math.floor(ak * 6) + (e.id & 3), s = enemySprite(e, f), x = e.x, y = e.y;
    if (!s) return;
    if (e.boss && e._st === 'naissance') { if ((Math.floor(ak * 8) & 1)) { O.putInk(s, x, y, O.MAGENTA); return; } }
    if (e.type === 'fleche' && e._st === 'vise') x += (Math.floor(ak * 20) & 1) ? 1 : 0;      // elle tremble avant de foncer
    O.put(s, x, y);
    if (O.isFlash(e)) O.putInk(O.inner(s), x, y, O.OS);
    if (e.boss) {
      /* sa vie se lit sur lui-même : un arc qui se vide autour de la carcasse */
      var fr = e.pv / e.pvMax, n = Math.ceil(fr * 72);
      for (var j = 0; j < n; j++) { var b = -Math.PI / 2 + j / 72 * TAU; N.gfx.px(x + Math.cos(b) * 29, y + Math.sin(b) * 29, j % 9 === 8 ? O.NP : O.ROSE); }
    }
  }
  function drawEnemyShots() {
    var f = Math.floor(O.T.ak * 8);
    for (var i = 0; i < tirs.length; i++) if (!tirs[i]._dead) O.put(O.sp(tirs[i]._big ? 'tirEnnemi:gros' : 'tirEnnemi', f + i), tirs[i].x, tirs[i].y);
  }
  function drawEnemies() {
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e._dead || e.etat === 'portail') continue;
      drawEnemy(e);
    }
  }
  function draw() { drawEnemies(); drawEnemyShots(); }

  /* ---- les télégraphes : le repli de N.fx.tele / N.fx.drawTele (lot 6a). Chaque attaque est annoncée à
     l'endroit exact de ses dégâts (G-13). ---- */
  function teleLine(x0, y0, a, len, k) {
    var g = N.gfx, c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c, i, x, y, V = O.VUE;
    function dehors(xx, yy) { return xx < V.x - 2 || yy < V.y - 2 || xx > V.x + V.w + 2 || yy > V.y + V.h + 2; }
    for (i = 6; i < len; i++) { x = x0 + c * i; y = y0 + s * i; if (dehors(x, y)) break; g.px(x + nx, y + ny, O.NP); g.px(x - nx, y - ny, O.NP); }
    var ph = Math.floor(O.T.ak * 30), on = k > 0.66 ? 5 : 3, col = k > 0.75 ? O.ROSE : O.MAGENTA;
    for (i = 6; i < len; i++) { x = x0 + c * i; y = y0 + s * i; if (dehors(x, y)) break; if (((i + 6000 - ph) % 6) < on) g.px(x, y, col); }
  }
  function beamDraw(b) {
    var g = N.gfx, dx = b.x1 - b.x0, dy = b.y1 - b.y0, Ln = Math.sqrt(dx * dx + dy * dy), c = dx / Ln, s = dy / Ln, nx = -s, ny = c, V = O.VUE;
    var h = Math.floor(b.w / 2), k = b.t / b.d;
    for (var i = 0; i < Ln; i++) {
      var x = b.x0 + c * i, y = b.y0 + s * i;
      if (x < V.x - 4 || y < V.y - 4 || x > V.x + V.w + 4 || y > V.y + V.h + 4) break;
      g.px(x + nx * (h + 1), y + ny * (h + 1), O.NP); g.px(x - nx * (h + 1), y - ny * (h + 1), O.NP);
      for (var j = -h; j <= h; j++) g.px(x + nx * j, y + ny * j, j === 0 ? (k < 0.5 ? O.OS : O.ROSE) : (Math.abs(j) < h ? O.ROSE : O.MAGENTA));
    }
  }
  function spawnMark(x, y, k, r0) {
    var g = N.gfx;
    for (var j = 0; j < 3; j++) {
      var r = r0 * (1 - k) + 4 + j * (r0 / 6);
      g.ring(x, y, r + 1, O.NP, 1); g.ring(x, y, r, j === 0 && k > 0.6 ? O.ROSE : O.MAGENTA, 0.45 + 0.55 * k);
    }
    g.line(x - 3, y, x + 3, y, O.MAGENTA); g.line(x, y - 3, x, y + 3, O.MAGENTA);
  }
  function drawTele() {
    var g = N.gfx, V = O.VUE, i, e, j, ak = O.T.ak;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e._dead) continue;
      if (e.etat === 'portail') {                       // le portail du gros ennemi : croix de visée et silhouette qui se précise
        var kb = e._portailTotal > 0 ? 1 - e._portail / e._portailTotal : 1;
        spawnMark(e.x, e.y, kb, e.boss ? 30 : 12);
        if (e.boss) {
          if ((Math.floor(ak * 4) & 1) === 0) {          // la croix de visée bat à 2 Hz (G-29)
            teleLine(e.x, e.y, Math.PI, V.w, 0.5); teleLine(e.x, e.y, 0, V.w, 0.5);
            teleLine(e.x, e.y, -Math.PI / 2, V.h, 0.5); teleLine(e.x, e.y, Math.PI / 2, V.h, 0.5);
          }
          if (kb > 0.55) O.blitDither(O.sp('colosse', 0), e.x, e.y, O.SANG, (kb - 0.55) / 0.45);
        }
        continue;
      }
      if (e.type === 'fleche' && e._st === 'vise') teleLine(e.x, e.y, e._aim, 72, 1 - e._stT / 0.6);
      else if (e.type === 'tourelle' && e._st === 'vise') teleLine(e.x, e.y, e._aim, 66, 1 - e._stT / 0.65);
      else if (e.type === 'sentinelle' && e._st === 'vise') teleLine(e.x, e.y, e._aim, V.w + V.h, 1 - e._stT / 0.85);
      else if (e.type === 'mine' && e._st === 'arme') {
        var k = 1 - e._stT / 0.75;
        g.ditherCirc(e.x, e.y, 26, O.MAGENTA, 0.08 + 0.3 * k);
        g.ring(e.x, e.y, 27, O.NP, 1); g.ring(e.x, e.y, 26, k > 0.7 ? O.ROSE : O.MAGENTA, 1);
      } else if (e.boss && e._atk) {
        var kk = 1 - e._atkT / e._atkD;
        if (e._atk === 'radial') { for (j = 0; j < 3; j++) { var r = 34 * (1 - kk) + 14 + j * 5; g.ring(e.x, e.y, r + 1, O.NP, 1); g.ring(e.x, e.y, r, O.MAGENTA, 0.5 + 0.5 * kk); } }
        else if (e._atk === 'laser') teleLine(e.x, e.y, e._aim, V.w + V.h, kk);
        else if (e._atk === 'appel') for (j = 0; j < e._pts.length; j++) spawnMark(e._pts[j].x, e._pts[j].y, kk, 10);
      }
    }
    for (i = 0; i < lasers.length; i++) if (!lasers[i]._dead) beamDraw(lasers[i]);
  }

  return {
    reset: reset, update: update, draw: draw, drawEnemies: drawEnemies, drawTele: drawTele,
    spawn: spawn, list: list, count: count, counts: counts, hit: hit, zone: zone, devorer: devorer, dans: dans, pres: pres,
    tir: tir, tirs: tirs, lasers: lasers, effacerTirs: effacerTirs, inverser: inverser, fuir: fuir, purge: purge, purgeEnCours: purgeEnCours
  };
})();
