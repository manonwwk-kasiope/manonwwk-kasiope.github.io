/* ===== 72-ennemis.js — N.ennemis : le bestiaire du secteur 1 (REFONTE.md § 4.4, § 4.5, § 3.8, § 2.17) =====

   FLÈCHE, DARD, LARVE, MINE, TOURELLE, LAME, RUCHE, SENTINELLE, TRAQUEUR, RIVAL (et PLANEUR, prêt pour LE DÉFILÉ),
   élites (FLÈCHE BLINDÉE, RUCHE INSTABLE, LE RIVAL) et modificateurs (BLINDÉ, RAPIDE, INSTABLE). Chaque ennemi est un
   objet au schéma `ennemi` (§ 7.5) ; ce qui est propre à l'IA est préfixé « _ » (état fin `_st`, minuteurs `_stT`, `_cd`…).
   Le champ public `etat` ('portail'|'approche'|'arme'|'attaque'|'recup'|'fuite'|'proie'|'mort') se déduit de l'état fin.

   LE CYCLOPE n'est plus ici : il vit dans 73-colosse.js. Ses objets (œil, mains) sont créés par spawn(…, { ext: true }) :
   ils sont dans `list` (la joueuse les touche, les armes les visent), mais 72-ennemis ne les déplace pas, ne les dessine
   pas ; hit() demande à N.colosse.touche(e, dmg, src) les dégâts effectifs.

   ÉMET `kill` (seul émetteur : hit, zone, devorer, purge), `apparition` (fin du portail), `inversion` (debut / fin),
   `arme` (une attaque s'arme : forme, durée, cible, vue). N'applique JAMAIS les effets d'un kill (points, butin,
   explosion, gel) : ils arrivent par N.ev. CONSOMME `ramassage` (10) : la PASTILLE lance l'INVERSION.
   DEMANDE à N.joueuse : tuer('souffle'|'traine', src) et couper(k, src, cause) ; elle lit ici `list`, `tirs`, `lasers`.
   DEMANDE à N.arene / N.colosse (s'ils existent) : draw() de l'un et de l'autre, appelés dans draw().

   Interface (§ 7.8) : reset(), update(dt), draw(), spawn(type, x, y, opts), list, count(), hit(e, dmg, src), zone(x, y, r, dmg, src),
   devorer(e), dans(poly), pres(x, y, r), tir(x, y, vx, vy, opts), tirs, effacerTirs(x, y, r), inverser(dur), fuir(), purge(ordre).
   Ajouts : lasers, counts(), drawTele(), drawEnemies(), purgeEnCours(), rayon(x0, y0, x1, y1, dur, w, src), teleLigne, marque,
   inversion() -> secondes restantes, charges(), publierTele() (rafraîchissement après 73-colosse).
   Chiffres : N.R.ennemis, N.R.elites, N.R.modificateurs, N.R.inversion ; les valeurs de la démo qui manquent : CFG (→ N.R). */
N.ennemis = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                    // → N.R
    plafondTirs: 80, vieTir: 9, tirTaille: 2,
    nuee: 55, larveRecup: 1.2, larveCd: [1.6, 3.2],
    flecheBonds: 160, mineSouffle: 30, mineDegats: 40, fuseSouffle: 34, fuseDegats: 60,
    tourelleTourne: 1.2, tourelleVie: 1.7
  };
  var TAU = O.TAU;
  var TP = R.publicationTele;
  var S = null;
  var list = [], tirs = [], lasers = [], fuses = [];
  var charges = 0, inv = { t: 0, total: 0 }, purgeFile = null, purgeI = 0, purgeNext = 0, purgeT = 0;
  var AL = 0, AR = 0, AT = 0, AB = 0;

  function conf(t) { return (R && R.ennemis && R.ennemis[t]) || {}; }
  function arena() { var A = O.A; AL = A.x0 + 7; AR = A.x1 - 7; AT = A.y0 + 7; AB = A.y1 - 7; }
  function tete() { return N.joueuse && N.joueuse.tete; }
  function vague() { return (N.dir && N.dir.vague && N.dir.vague()) || 1; }
  function wave() { return (N.dir && N.dir.info && N.dir.info()) || null; }
  function rr(a, b) { return O.rr('ennemis', a, b); }
  function ri(a, b) { return O.ri('ennemis', a, b); }
  function rnd() { return O.rf('ennemis'); }
  function srcDe(e) { return { genre: 'ennemi', type: e.type, id: e.id }; }
  function vitesseTete() { var P = tete(); return P ? P.vit : 68; }
  function maxCharges() { var w = wave(); return (w && w.chargesFleches) || 1; }
  function allure(e) {
    var m = 1, M = (R && R.modificateurs) || {};
    if (e.mods.rapide) m *= (M.rapide && M.rapide.allure) || 1.5;
    if (e.mods.blinde && !e._plaques) m *= (M.blinde && M.blinde.allure) || 1.4;
    return m;
  }
  function recharge(e, v) { return v * (e.mods.rapide ? ((R && R.modificateurs && R.modificateurs.rapide.recharges) || 0.7) : 1); }
  function vu6(e) { return N.cam && N.cam.shown ? N.cam.shown(e.x, e.y, 6) : O.visible(e.x, e.y, -(e.r + 6)); }
  function segsJ() { return N.joueuse && N.joueuse.segs ? N.joueuse.segs() : []; }

  /* état fin -> état public */
  var ETAT = { entre: 'approche', chasse: 'approche', croise: 'approche', zig: 'approche', orbite: 'approche', garde: 'approche',
    derive: 'approche', pose: 'approche', actif: 'approche', esquive: 'approche',
    vise: 'arme', arme: 'arme', verrou: 'arme', mord: 'arme', recule: 'arme', couve: 'arme',
    fonce: 'attaque', tire: 'attaque', traverse: 'attaque',
    recup: 'recup', proie: 'proie', mort: 'mort', fuite: 'fuite', naissance: 'portail', portail: 'portail' };
  var BASE = { fleche: 'chasse', dard: 'croise', larve: 'zig', mine: 'pose', tourelle: 'pose', lame: 'chasse', ruche: 'garde',
    sentinelle: 'orbite', traqueur: 'chasse', planeur: 'actif', rival: 'actif' };

  function reset() {
    S = N.S;
    list.length = 0; tirs.length = 0; lasers.length = 0; fuses.length = 0;
    charges = 0; purgeFile = null; purgeI = 0;
    if (inv.t > 0 && N.ev) N.ev.emit('inversion', { evt: 'fin', dur: 0 });
    inv.t = 0; inv.total = 0;
    TVN = 0; TV.length = 0;
    if (S) { S.enemies = list; S.shots = tirs; S.tele = TV; }
  }

  /* ============================ naissance ============================ */
  function newEnemy(type, x, y, opts) {
    var c = conf(type), P = tete(), E = (R && R.elites) || {}, M = (R && R.modificateurs) || {};
    var boss = type === 'cyclope';
    var pv = boss ? ((R && R.colosse && R.colosse.pvTotal) || 4500) : (c.pv || c.pvTete || 20);
    var elite = !!(opts && opts.elite), mods = { blinde: false, rapide: false, instable: false };
    if (opts && opts.mods) for (var k in opts.mods) mods[k] = !!opts.mods[k];
    if (elite && type !== 'rival') pv *= E.pv || 3;
    if (mods.blinde) pv *= (M.blinde && M.blinde.pv) || 2;
    var r = boss ? 14 : (c.r || 5);
    if (elite && type !== 'rival') r += 2;
    var e = {
      id: N.ids.suivant(), type: type, x: x, y: y, vx: 0, vy: 0, r: r, ang: P ? Math.atan2(P.y - y, P.x - x) : 0,
      pv: pv, pvMax: pv, etat: 'approche', etatT: 0, vuDepuis: -1,
      elite: elite, mods: mods,
      boss: boss, partie: boss ? ((opts && opts.partie) || 'oeil') : null, tele: -1, img: 0, dir: 0,
      _st: BASE[type] || 'chasse', _stT: 0, _age: 0, _flash: 0, _aim: 0, _cd: rr(0.6, 1.6), _shots: 0, _tx: x, _ty: y, _kx: 0, _ky: 0, _stun: 0,
      _dead: false, _orb: 0, _sens: rnd() < 0.5 ? -1 : 1, _spin: rr(0, TAU), _life: 0, _teleTotal: 0, _portail: 0, _flashT: -9,
      _plaques: !!mods.blinde, _ext: !!(opts && opts.ext), _mere: -1, _ext300: false, _esqCd: 0, _traque: false
    };
    return e;
  }
  /* station d'une tourelle : une bande de 120 ± 25 px autour de la tête */
  function station(e, margin) {
    var P = tete(), b = conf('tourelle');
    for (var k = 0; k < 12; k++) {
      var a = rr(0, TAU), d = (b.bande || 120) + rr(-(b.bandeAlea || 25), (b.bandeAlea || 25));
      var x = P ? P.x + Math.cos(a) * d : rr(AL, AR), y = P ? P.y + Math.sin(a) * d : rr(AT, AB);
      x = O.clamp(x, AL + margin, AR - margin); y = O.clamp(y, AT + margin, AB - margin);
      if (!P || O.d2(x, y, P.x, P.y) > 70 * 70) { e._tx = x; e._ty = y; return; }
    }
    e._tx = (AL + AR) / 2; e._ty = (AT + AB) / 2;
  }
  function stationMine(e) {
    var P = tete();
    for (var k = 0; k < 12; k++) {
      var x = rr(AL + 16, AR - 16), y = rr(AT + 16, AB - 16);
      if (!P || O.d2(x, y, P.x, P.y) > 90 * 90) { e._tx = x; e._ty = y; return; }
    }
    e._tx = (AL + AR) / 2; e._ty = (AT + AB) / 2;
  }
  /* spawn(type, x, y, opts) : opts { portail: s, elite, mods, st, stT, ext }. Un ennemi avec portail existe, ne touche
     pas et n'agit pas pendant ce délai (§ 2.3 : 600 ms d'apparition) ; `apparition` part à la fin du portail. */
  function spawn(type, x, y, opts) {
    arena();
    opts = opts || {};
    var e = newEnemy(type, x, y, opts), P = tete();
    if (type === 'mine') { e._st = 'derive'; stationMine(e); }
    else if (type === 'tourelle') { e._st = 'entre'; station(e, 24); }
    else if (type === 'sentinelle') { e._orb = P ? Math.atan2(y - P.y, x - P.x) : 0; e._cd = rr(2.5, 3.5); }
    else if (type === 'ruche') { e._cd = rr(1.2, 2.2); e._petales = 0; }
    else if (type === 'cyclope') { e._st = 'actif'; e._cd = 1.4; }
    if (opts.st) e._st = opts.st;
    if (opts.stT !== undefined) e._stT = opts.stT;
    if (inv.t > 0 && !e.boss && type !== 'traqueur' && type !== 'planeur') { e._stAvant = e._st; e._st = 'proie'; }
    if (opts.portail > 0) { e._portail = opts.portail; e._portailTotal = opts.portail; e.etat = 'portail'; }
    else apparu(e);
    list.push(e);
    return e;
  }
  function apparu(e) {
    e.etat = ETAT[e._st] || 'approche';
    if (N.ev) N.ev.emit('apparition', { id: e.id, type: e.type, x: e.x, y: e.y, elite: !!e.elite });
  }
  /* une attaque s'arme : événement `arme` (armement du journal, § 3.8 règle 3) */
  function armer(e, forme, total, cible) {
    e._teleTotal = total; e._ext300 = false;
    if (N.ev) N.ev.emit('arme', { id: e.id, type: e.type, forme: forme, total: total, cible: cible || 'tete', shown: vu6(e), rallonge: false });
  }

  /* ============================ les tirs et les lasers ============================ */
  function tir(x, y, vx, vy, opts) {
    opts = opts || {};
    if (tirs.length >= CFG.plafondTirs) return null;
    var b = { id: N.ids.suivant(), x: x, y: y, vx: vx, vy: vy, r: opts.r || (opts.big ? CFG.tirTaille + 1 : CFG.tirTaille), vie: opts.vie || TP.tirVie,
      src: opts.src || { genre: 'ennemi', type: 'tourelle', id: -1 }, _big: !!opts.big, _dead: false };
    tirs.push(b);
    return b;
  }
  function ebullet(e, x, y, a, v, big, vie) { return tir(x, y, Math.cos(a) * v, Math.sin(a) * v, { big: big, src: srcDe(e), vie: vie }); }
  /* rayon(x0, y0, x1, y1, dur, w, src) : un laser que 72 dessine et fait expirer ; l'appelant peut muter x1, y1 à chaque pas */
  function rayon(x0, y0, x1, y1, dur, w, src) {
    var z = { x0: x0, y0: y0, x1: x1, y1: y1, t: 0, d: dur, w: w, src: src || { genre: 'ennemi', type: 'sentinelle', id: -1 }, _dead: false };
    lasers.push(z);
    return z;
  }
  function beam(e, x, y, a, d, w, len) {
    var c = Math.cos(a), s = Math.sin(a), Ln = len || (conf('sentinelle').longueur || 300);
    return rayon(x + c * 9, y + s * 9, x + c * Ln, y + s * Ln, d, w, srcDe(e));
  }
  function effacerTirs(x, y, r) {
    for (var i = 0; i < tirs.length; i++) {
      var b = tirs[i];
      if (!b._dead && O.d2(b.x, b.y, x, y) < r * r) { O.spark(b.x, b.y, O.ROSE, 2); b._dead = true; }
    }
  }

  /* ============================ souffles : mines et INSTABLE ============================
     Le disque montré est exactement le disque qui tue : la tête dans le rayon meurt, le corps est coupé au premier
     segment touché, les ennemis du disque sont blessés (réaction en chaîne). `epargne` : une mine abattue ne blesse
     pas la joueuse. */
  function souffle(x, y, r, dmgEnnemis, e, epargne) {
    var P = tete(), rs = r + ((R && R.mort && R.mort.rayonTete) || 3);
    O.boom(x, y, r > 32 ? 0.6 : 0.5, O.MAGENTA); O.sfx('kill', { pitch: 0 });
    if (!epargne && P && N.joueuse && N.joueuse.etat !== 'mort' && !N.joueuse.invul()) {
      var src = e ? srcDe(e) : { genre: 'ennemi', type: 'mine', id: -1 };
      if (O.d2(x, y, P.x, P.y) < rs * rs) { N.joueuse.tuer('souffle', src); }
      else {
        var q = segsJ(), k, rc = r + 3.5;
        for (k = 2; k * 2 + 1 < q.length; k++) {
          if (O.d2(x, y, q[k * 2], q[k * 2 + 1]) < rc * rc) { N.joueuse.couper(k, src, 'souffle'); break; }
        }
      }
    }
    var snap = list.slice();
    for (var i = 0; i < snap.length; i++) {
      var t = snap[i];
      if (t._dead || t === e || t.boss || t.etat === 'portail') continue;
      var rq = r + t.r;
      if (O.d2(x, y, t.x, t.y) < rq * rq) hit(t, dmgEnnemis, { genre: 'ennemi', type: 'mine', id: -1 });
    }
  }
  function nouvelleFuse(x, y) {
    var I = (R && R.modificateurs && R.modificateurs.instable) || {};
    fuses.push({ x: x, y: y, t: I.meche || 0.8, d: I.meche || 0.8, r: I.souffle || CFG.fuseSouffle });
  }

  /* ============================ la mort d'un ennemi ============================ */
  var SRC_PAR_DEFAUT = { genre: 'arme', type: 'canon', id: -1 };
  function kill(e, src) {
    if (e._dead) return false;
    e._dead = true; e.etat = 'mort'; e.pv = Math.min(e.pv, 0);
    var P = tete(), base = (R && R.score && R.score.base && R.score.base[e.type]) || 0;
    src = src || SRC_PAR_DEFAUT;
    if (N.ev) N.ev.emit('kill', {
      id: e.id, type: e.type, x: e.x, y: e.y, elite: !!e.elite, boss: !!e.boss, base: base, src: src,
      distTete: P ? Math.sqrt(O.d2(e.x, e.y, P.x, P.y)) : 0, gen: 0
    });
    if (src.genre !== 'decor') {
      if (e.mods.instable) nouvelleFuse(e.x, e.y);
      if (e.type === 'mine') souffle(e.x, e.y, CFG.mineSouffle, CFG.mineDegats, e, true);     // abattue : n'explose pas sur la joueuse
    }
    return true;
  }
  /* la tourelle est blindée de face : un tir d'arme reçu dans ± 45° de sa face ricoche */
  function ricoche(e, src) {
    if (!src || src.genre !== 'arme' || src.type === 'lasso' || src.type === 'minesQ' || src.type === 'missiles') return false;
    var P = tete(); if (!P) return false;
    var ox = src.x !== undefined ? src.x : P.x, oy = src.y !== undefined ? src.y : P.y;
    var a = Math.atan2(oy - e.y, ox - e.x), d = Math.abs(O.wrapA(a - e._aim));
    return d < (((conf('tourelle').blindageDeg) || 45) * Math.PI / 180);
  }
  /* hit(e, dmg, src) : les PV tombent ; à zéro, `kill` part une seule fois. -> true si l'ennemi est mort. */
  function hit(e, dmg, src) {
    if (!e || e._dead || e.etat === 'mort') return false;
    if (e._st === 'naissance' || e.etat === 'portail') return false;      // rien ne blesse avant son apparition
    if (e.type === 'traqueur') return (src && src.type === 'lasso') ? kill(e, src) : false;     // seul un LASSO le tue
    if (e._ext && e.boss) {
      if (N.colosse && N.colosse.touche) dmg = N.colosse.touche(e, dmg, src);
      if (!(dmg > 0)) return false;
    } else if (e.type === 'tourelle' && e._st !== 'proie' && ricoche(e, src)) {
      O.spark(e.x + Math.cos(e._aim) * e.r, e.y + Math.sin(e._aim) * e.r, O.OS, 3); O.sfx('ricochet'); return false;
    }
    if (e._st === 'recup' && e.type === 'lame') dmg *= conf('lame').degatsRecup || 2;
    e.pv -= dmg; O.flash(e);
    if (e.mods.blinde && e._plaques && e.pv <= e.pvMax * ((R && R.modificateurs && R.modificateurs.blinde.eclatent) || 0.5)) {
      e._plaques = false; O.debris(e.x, e.y, O.SANG, 8); O.sfx('impact');
    }
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
    var c = { fleche: 0, dard: 0, larve: 0, mine: 0, tourelle: 0, lame: 0, ruche: 0, sentinelle: 0, rival: 0, planeur: 0, traqueur: 0, cyclope: 0, regular: 0 };
    for (var i = 0; i < list.length; i++) {
      var e = list[i]; if (e._dead) continue;
      c[e.type] = (c[e.type] || 0) + 1;
      if (!e.boss && e.type !== 'traqueur' && e.type !== 'planeur') c.regular++;
    }
    return c;
  }

  /* ============================ l'INVERSION : la chasse retournée (§ 2.17) ============================ */
  function inverser(dur) {
    dur = +dur || 0;
    if (dur <= 0) return;
    var debut = inv.t <= 0;
    inv.t = Math.max(inv.t, dur); inv.total = Math.max(inv.total, inv.t);
    if (!debut) return;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e._dead || e.boss || e.type === 'traqueur' || e.type === 'planeur') continue;
      e._stAvant = BASE[e.type]; e._st = 'proie';
    }
    for (i = 0; i < tirs.length; i++) tirs[i]._dead = true;
    for (i = 0; i < lasers.length; i++) lasers[i]._dead = true;
    if (N.ev) N.ev.emit('inversion', { evt: 'debut', dur: dur });
  }
  function finInversion() {
    inv.t = 0; inv.total = 0;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e._dead || e._st !== 'proie') continue;
      e._st = e._stAvant || BASE[e.type] || 'chasse'; e._cd = rr(1.0, 2.0);
    }
    if (N.ev) N.ev.emit('inversion', { evt: 'fin', dur: 0 });
  }
  /* la proie fuit à 0,8 × la vitesse de la tête, longe les murs ; la tête qui la rejoint la dévore (rayon un peu plus
     grand que celui du contact mortel : on la mange avant qu'elle ne tue) */
  function updProie(e, dt, P) {
    var vf = ((R && R.inversion && R.inversion.fuite) || 0.8) * Math.max(40, vitesseTete()) * (e.type === 'mine' ? 0.15 : 1);
    var dx = e.x - P.x, dy = e.y - P.y, d = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / d, uy = dy / d;
    if (e.type === 'tourelle' || e.type === 'ruche') vf *= 0.5;
    var nx = e.x + ux * vf * dt, ny = e.y + uy * vf * dt, mar = e.r + 2;
    if (nx < AL + mar || nx > AR - mar) { nx = e.x; ny = e.y + (uy >= 0 ? 1 : -1) * vf * dt; if (ny < AT + mar || ny > AB - mar) ny = e.y + (e.y < (AT + AB) / 2 ? 1 : -1) * vf * dt; }
    if (ny < AT + mar || ny > AB - mar) { ny = e.y; nx = e.x + (ux >= 0 ? 1 : -1) * vf * dt; }
    e.x = O.clamp(nx, AL, AR); e.y = O.clamp(ny, AT, AB);
    e.ang = Math.atan2(uy, ux);
    var rq = 3 + e.r + 4;
    if (d < rq && N.joueuse && N.joueuse.etat === 'vivant') devorer(e);
  }

  function inverserSurPastille(c) {
    if (!c || c.type !== 'pastille') return;
    var n = vague(), D = (R && R.inversion && R.inversion.duree) || {};
    inverser(D[n] || 4);
  }
  if (N.ev) N.ev.on('ramassage', 10, inverserSurPastille, '72-ennemis');

  function fuir() { for (var i = 0; i < list.length; i++) if (!list[i].boss && !list[i]._ext) list[i]._st = 'fuite'; }
  /* purge(ordre) : tous les ennemis meurent l'un après l'autre (les plus proches de la tête d'abord, un toutes
     les 45 ms), tirs et lasers effacés. Chaque mort émet `kill` avec src decor/purge : pas de points ni de butin. */
  function purge(ordre) {
    var P = tete();
    purgeFile = list.filter(function (e) { return !e._dead; });
    if (P && ordre !== 'indifferent') purgeFile.sort(function (a, b) { return O.d2(a.x, a.y, P.x, P.y) - O.d2(b.x, b.y, P.x, P.y); });
    purgeI = 0; purgeT = 0; purgeNext = 0.25;
    for (var i = 0; i < tirs.length; i++) { O.spark(tirs[i].x, tirs[i].y, O.ROSE, 1); tirs[i]._dead = true; }
    for (i = 0; i < lasers.length; i++) lasers[i]._dead = true;
    fuses.length = 0;
    return purgeFile.length;
  }
  function purgeEnCours() { return !!purgeFile && purgeI < purgeFile.length; }

  /* ============================ l'IA ============================ */
  function canAct(e) { return e._stun <= 0 && O.visible(e.x, e.y, -e.r + 2) && e.etat !== 'portail'; }
  /* on n'arme que sous les yeux de la joueuse : entièrement dans la vue, à 6 px du bord (§ 3.8 règle 3) */
  function peutArmer(e) { return canAct(e) && vu6(e); }
  /* sorti du cadre pendant l'armement : une seule rallonge de 300 ms ; encore dehors au tir : annule et recharge */
  function verifTir(e) {
    if (vu6(e)) return true;
    if (!e._ext300) { e._ext300 = true; e._stT += 0.3; return null; }
    return false;
  }
  function avance(e, a, v, dt) { e.x += Math.cos(a) * v * dt; e.y += Math.sin(a) * v * dt; }
  function bornes(e) {
    var m = e.r + 1, rb = '';
    if (e.x < AL - 7 + m) { e.x = AL - 7 + m; rb += 'x'; } else if (e.x > AR + 7 - m) { e.x = AR + 7 - m; rb += 'x'; }
    if (e.y < AT - 7 + m) { e.y = AT - 7 + m; rb += 'y'; } else if (e.y > AB + 7 - m) { e.y = AB + 7 - m; rb += 'y'; }
    return rb;
  }

  /* ---- FLÈCHE : le chasseur, qui vise la tête ---- */
  function updFleche(e, dt, P) {
    var c = conf('fleche'), a0 = (c.approche || [50, 70]), n = vague();
    var sp0 = (a0[0] + (a0[1] - a0[0]) * O.clamp((n - 1) / 4, 0, 1)) * allure(e);
    if (e._traque) sp0 *= 1.3;                                        // la traque de fin de vague (Cruise Elroy)
    var dd = O.d2(e.x, e.y, P.x, P.y), bond = c.bond || { vitesse: 160, duree: 0.42, longueur: 67 };
    if (e._esqCd > 0) e._esqCd -= dt;
    if (e._st === 'chasse') {
      var lx = P.x + Math.cos(P.ang) * P.vit * 0.25, ly = P.y + Math.sin(P.ang) * P.vit * 0.25;
      e.ang = O.turnTo(e.ang, Math.atan2(ly - e.y, lx - e.x), 2.6 * dt);
      avance(e, e.ang, sp0, dt);
      e._cd -= dt;
      var dm = c.distance || [40, 110];
      if (e._cd <= 0 && peutArmer(e) && dd < dm[1] * dm[1] && dd > dm[0] * dm[0] && charges < maxCharges()) {
        charges++;
        e._st = 'vise'; e._stT = c.fige || 0.6; e._aim = Math.atan2(P.y - e.y, P.x - e.x); armer(e, 'ligne', e._stT, 'tete');
      } else if (c.esquive && e._esqCd <= 0 && dd < (c.esquive.distance || 60) * (c.esquive.distance || 60)) {
        /* esquive latérale : dans l'axe de la tête (moins de 12°) à moins de 60 px, sans charger */
        var ah = Math.abs(O.wrapA(P.ang - Math.atan2(e.y - P.y, e.x - P.x)));
        if (ah < (c.esquive.angleDeg || 12) * Math.PI / 180) {
          e._st = 'esquive'; e._stT = c.esquive.duree || 0.25; e._esqCd = recharge(e, c.esquive.recharge || 1.2);
          e._esqDir = O.wrapA(P.ang + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2);
        }
      }
    } else if (e._st === 'esquive') {
      avance(e, e._esqDir, (c.esquive && c.esquive.vitesse) || 70, dt);
      e._stT -= dt; if (e._stT <= 0) e._st = 'chasse';
    } else if (e._st === 'vise') {
      e._stT -= dt;
      if (e._stT <= 0) {
        var v = verifTir(e);
        if (v === null) return;
        if (v === false) { e._st = 'chasse'; e._cd = recharge(e, c.recharge || 1.6); return; }
        e._st = 'fonce'; e._stT = (bond.duree || 0.42);
      }
    } else if (e._st === 'fonce') {
      var ox = e.x, oy = e.y, bv = bond.vitesse || CFG.flecheBonds;
      e.x += Math.cos(e._aim) * bv * dt; e.y += Math.sin(e._aim) * bv * dt;
      if (N.fx && N.fx.trail) O.safe('fx.trail', function () { N.fx.trail(ox, oy, e.x, e.y, O.ROSE); });
      e._stT -= dt; if (e._stT <= 0) { e._st = 'chasse'; e._cd = recharge(e, c.recharge || 1.6) + rr(0, 0.8); e.ang = e._aim; }
    }
  }

  /* ---- DARD : le coupeur, qui vise où l'on va ---- */
  function updDard(e, dt, P) {
    var c = conf('dard'), d2 = O.d2(e.x, e.y, P.x, P.y), fz = c.fuseau || { vitesse: 165, duree: 0.5, longueur: 82 };
    if (e._st === 'croise') {
      e.ang = O.turnTo(e.ang, Math.atan2(P.y - e.y, P.x - e.x), 2.2 * dt);
      avance(e, e.ang, (c.croisiere || 60) * allure(e), dt);
      e._cd -= dt;
      if (e._cd <= 0 && peutArmer(e) && d2 < 200 * 200 && d2 > 40 * 40 && charges < maxCharges() + 1) {
        var d = Math.sqrt(d2), tl = Math.min(d / (c.avance || 165), 1.0);
        e._tx = P.x + Math.cos(P.ang) * P.vit * tl; e._ty = P.y + Math.sin(P.ang) * P.vit * tl;           // cible GELÉE
        e._aim = Math.atan2(e._ty - e.y, e._tx - e.x); e._st = 'verrou'; e._stT = c.verrou || 0.6; armer(e, 'losange', e._stT, 'tete');
      }
    } else if (e._st === 'verrou') {
      e._stT -= dt;
      if (e._stT <= 0) {
        var v = verifTir(e);
        if (v === null) return;
        if (v === false) { e._st = 'croise'; e._cd = recharge(e, c.recharge || 2.0); return; }
        e._st = 'fonce'; e._stT = fz.duree || 0.5;
      }
    } else if (e._st === 'fonce') {
      e.x += Math.cos(e._aim) * (fz.vitesse || 165) * dt; e.y += Math.sin(e._aim) * (fz.vitesse || 165) * dt;
      var rb = bornes(e);                                                  // rebondit sur les murs
      if (rb.indexOf('x') >= 0) e._aim = Math.PI - e._aim;
      if (rb.indexOf('y') >= 0) e._aim = -e._aim;
      e.ang = e._aim;
      e._stT -= dt; if (e._stT <= 0) { e._st = 'croise'; e._cd = recharge(e, c.recharge || 2.0); }
    }
  }

  /* ---- LARVE : la nuée, qui mord la queue ---- */
  function queueJ(P) {
    var q = segsJ(), n = q.length;
    if (n >= 4) return { x: q[n - 2], y: q[n - 1] };
    return { x: P.x, y: P.y };
  }
  function updLarve(e, dt, P) {
    var c = conf('larve'), q = queueJ(P), v = (c.zigzag || CFG.nuee) * allure(e), orb = c.orbite || 30;
    if (e._st === 'zig') {
      var a = Math.atan2(q.y - e.y, q.x - e.x) + Math.sin(e._age * 7 + e.id) * 0.9;
      e.ang = a; avance(e, a, v, dt);
      if (O.d2(e.x, e.y, q.x, q.y) < (orb + 6) * (orb + 6)) { e._st = 'orbite'; e._orb = Math.atan2(e.y - q.y, e.x - q.x); e._cd = rr(CFG.larveCd[0], CFG.larveCd[1]); }
    } else if (e._st === 'orbite') {
      e._orb += 1.8 * dt * e._sens;
      var tx = q.x + Math.cos(e._orb) * orb, ty = q.y + Math.sin(e._orb) * orb;
      var dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.5) { e.x += dx / d * Math.min(d, v * 1.2 * dt); e.y += dy / d * Math.min(d, v * 1.2 * dt); }
      e.ang = Math.atan2(q.y - e.y, q.x - e.x);
      if (O.d2(e.x, e.y, q.x, q.y) > 80 * 80) e._st = 'zig';
      e._cd -= dt;
      if (e._cd <= 0 && peutArmer(e)) { e._st = 'mord'; e._stT = c.annonce || 0.5; e._tx = q.x; e._ty = q.y; armer(e, 'disque', e._stT, 'corps'); }
    } else if (e._st === 'mord') {
      e._stT -= dt;
      e._tx = q.x; e._ty = q.y;
      if (e._stT <= 0) {
        var J = N.joueuse;
        if (J && J.etat === 'vivant' && !J.invul() && O.d2(e.x, e.y, q.x, q.y) < 40 * 40 && J.len() > 4) {
          J.couper(Math.max(1, J.len() - (c.coupe || 1)), srcDe(e), 'ennemi');
          O.spark(q.x, q.y, O.ROSE, 4);
        }
        e._st = 'recup'; e._stT = CFG.larveRecup; e._cd = rr(CFG.larveCd[0], CFG.larveCd[1]);
      }
    } else if (e._st === 'recup') {
      e._stT -= dt;
      avance(e, e.ang + Math.PI, v * 0.9, dt);
      if (e._stT <= 0) e._st = 'zig';
    }
  }

  /* ---- MINE : le contrôle de zone ---- */
  function segDansCercle(x, y, r) {
    var P = tete();
    if (P && O.d2(x, y, P.x, P.y) < r * r) return true;
    var q = segsJ();
    for (var k = 1; k * 2 + 1 < q.length; k++) if (O.d2(x, y, q[k * 2], q[k * 2 + 1]) < r * r) return true;
    return false;
  }
  function updMine(e, dt, P) {
    var c = conf('mine'), cercle = c.cercle || 34, meche = c.meche || 0.8;
    e._spin += dt * (e._st === 'arme' ? 9 : 1.6);
    if (e._st === 'derive') {
      var dx = e._tx - e.x, dy = e._ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { e._st = 'pose'; } else { e.x += dx / d * 16 * dt; e.y += dy / d * 16 * dt; }
    } else if (e._st === 'arme') {
      e._stT -= dt;
      if (e._stT <= 0) {
        e._dead = true; e.etat = 'mort';
        souffle(e.x, e.y, c.souffle || CFG.mineSouffle, CFG.mineDegats, e, false);
        return;
      }
    }
    /* elle s'amorce quand la tête ou un segment entre dans le cercle d'armement (34 px, toujours affiché) */
    if (e._st !== 'arme' && canAct(e) && segDansCercle(e.x, e.y, cercle)) { e._st = 'arme'; e._stT = meche; armer(e, 'disque', meche, 'tout'); }
  }

  /* ---- TOURELLE : le tireur, blindée de face ---- */
  function updTourelle(e, dt, P) {
    var c = conf('tourelle'), want = Math.atan2(P.y - e.y, P.x - e.x);
    if (e._st === 'entre') {
      var dx = e._tx - e.x, dy = e._ty - e.y, d = Math.sqrt(dx * dx + dy * dy), sp0 = (c.vitesse || 35) * allure(e);
      if (d < 2) { e._st = 'pose'; e._cd = e._cd0 !== undefined ? e._cd0 : 0.9; e._cd0 = undefined; } else { e.x += dx / d * sp0 * dt; e.y += dy / d * sp0 * dt; }
      e._aim = O.turnTo(e._aim, want, CFG.tourelleTourne * dt);
    } else if (e._st === 'pose') {
      e._aim = O.turnTo(e._aim, want, CFG.tourelleTourne * dt);
      e._cd -= dt;
      if (e._cd <= 0 && peutArmer(e) && O.d2(e.x, e.y, P.x, P.y) < (c.portee || 160) * (c.portee || 160)) {
        e._st = 'vise'; e._stT = c.vise || 0.75; e._aim = want; armer(e, 'ligne', e._stT, 'tete');
      }
    } else if (e._st === 'vise') {
      e._stT -= dt;
      if (e._stT <= 0) {
        var v = verifTir(e);
        if (v === null) return;
        if (v === false) { e._st = 'pose'; e._cd = recharge(e, 1.5); return; }
        ebullet(e, e.x + Math.cos(e._aim) * 7, e.y + Math.sin(e._aim) * 7, e._aim, c.balle || 95, false, CFG.tourelleVie);
        O.sfx('tirEnnemi');
        e._shots++;
        if (e._shots >= (c.tirs || 3)) { e._shots = 0; e._st = 'entre'; station(e, 24); e._cd0 = recharge(e, 1.2); }
        else { e._st = 'pose'; e._cd = recharge(e, 1.6 + rr(0, 0.8)); }
      }
    }
  }

  /* ---- LAME : la trancheuse ---- */
  function updLame(e, dt, P) {
    var c = conf('lame'), tv = c.traverse || { vitesse: 230, duree: 0.82, longueur: 190 };
    if (e._st === 'chasse') {
      e.ang = O.turnTo(e.ang, Math.atan2(P.y - e.y, P.x - e.x), 2.0 * dt);
      avance(e, e.ang, (c.approche || 45) * allure(e), dt);
      e._cd -= dt;
      if (e._cd <= 0 && peutArmer(e) && O.d2(e.x, e.y, P.x, P.y) < (c.declenche || 150) * (c.declenche || 150) && charges < maxCharges() + 1) {
        e._aim = Math.atan2(P.y - e.y, P.x - e.x);
        e._st = 'recule'; e._stT = c.recul || 0.6; armer(e, 'ligne', e._stT + 0.2, 'tout');
        e._tx = e.x - Math.cos(e._aim) * (c.approche || 45) * e._stT * 0.6; e._ty = e.y - Math.sin(e._aim) * (c.approche || 45) * e._stT * 0.6;
        e._cut = {};
      }
    } else if (e._st === 'recule') {
      var k = Math.min(1, dt * 4);
      e.x += (e._tx - e.x) * k; e.y += (e._ty - e.y) * k;
      e._stT -= dt;
      if (e._stT <= 0) {
        var v = verifTir(e);
        if (v === null) return;
        if (v === false) { e._st = 'chasse'; e._cd = recharge(e, 1.6); return; }
        e._st = 'fonce'; e._stT = tv.duree || 0.82; e._cut = {};
      }
    } else if (e._st === 'fonce') {
      e.x += Math.cos(e._aim) * (tv.vitesse || 230) * dt; e.y += Math.sin(e._aim) * (tv.vitesse || 230) * dt;
      bornes(e);
      /* elle coupe le corps (une fois par passage) ; la tête qui la touche meurt par le contact de 70-joueuse */
      var q = segsJ(), kk, rc = e.r + 3.5;
      for (kk = 2; kk * 2 + 1 < q.length; kk++) {
        if (O.d2(e.x, e.y, q[kk * 2], q[kk * 2 + 1]) < rc * rc) {
          if (!e._cut.fait && N.joueuse && N.joueuse.etat === 'vivant' && !N.joueuse.invul()) { e._cut.fait = true; N.joueuse.couper(kk, srcDe(e), 'ennemi'); }
          break;
        }
      }
      e._stT -= dt; if (e._stT <= 0) { e._st = 'recup'; e._stT = c.recup || 0.8; e.ang = e._aim; }
    } else if (e._st === 'recup') {
      e._stT -= dt; if (e._stT <= 0) { e._st = 'chasse'; e._cd = recharge(e, 1.6 + rr(0, 1.0)); }
    }
  }

  /* ---- RUCHE : la source, cible prioritaire ---- */
  function larvesDe(e) { var n = 0; for (var i = 0; i < list.length; i++) if (!list[i]._dead && list[i]._mere === e.id) n++; return n; }
  function updRuche(e, dt, P) {
    var c = conf('ruche'), d = Math.sqrt(O.d2(e.x, e.y, P.x, P.y)) || 1, g = c.garde || 90, v = (c.vitesse || 25) * allure(e);
    if (e._st === 'garde') {
      var s = d > g + 10 ? 1 : d < g - 10 ? -1 : 0;
      if (s) { e.x += (P.x - e.x) / d * v * s * dt; e.y += (P.y - e.y) / d * v * s * dt; }
      e._cd -= dt;
      if (e._cd <= 0) {
        if (larvesDe(e) + (c.larves || 3) <= (c.larvesMax || 12) && count() + (c.larves || 3) <= 36 && canAct(e)) { e._st = 'couve'; e._stT = (c.petales || 0.7) + (c.couvee || 0.6); armer(e, 'disque', e._stT, 'tout'); }
        else e._cd = 0.5;
      }
    } else if (e._st === 'couve') {
      e._stT -= dt;
      e._petales = O.clamp(1 - (e._stT - (c.couvee || 0.6)) / (c.petales || 0.7), 0, 1);
      if (e._stT <= 0) {
        for (var k = 0; k < (c.larves || 3); k++) {
          var a = (k / (c.larves || 3)) * TAU + e._age, l = spawn('larve', e.x + Math.cos(a) * (e.r + TP.rucheDecalage), e.y + Math.sin(a) * (e.r + TP.rucheDecalage), { portail: TP.ruchePortail });
          l._mere = e.id;
        }
        O.ringFx(e.x, e.y, 22, O.MAGENTA, 0.3);
        e._st = 'garde'; e._cd = recharge(e, c.periode || 3.5); e._petales = 0;
      }
    }
  }

  /* ---- SENTINELLE : le tireur d'élite ---- */
  function lasersSentinelles() { var n = 0; for (var i = 0; i < lasers.length; i++) if (!lasers[i]._dead && lasers[i].src && lasers[i].src.type === 'sentinelle') n++; return n; }
  function chargesSentinelles() { var n = 0; for (var i = 0; i < list.length; i++) if (!list[i]._dead && list[i].type === 'sentinelle' && list[i]._st === 'vise') n++; return n; }
  function updSentinelle(e, dt, P) {
    var c = conf('sentinelle');
    if (e._st === 'orbite') {
      e._orb += 0.45 * dt * e._sens * allure(e);
      var V = O.VUE, orb = c.orbite || 80;
      var tx = O.clamp(P.x + Math.cos(e._orb) * orb, Math.max(V.x, AL) + 10, Math.min(V.x + V.w, AR) - 10), ty = O.clamp(P.y + Math.sin(e._orb) * orb, Math.max(V.y, AT) + 6, Math.min(V.y + V.h, AB) - 10);
      var dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) { e.x += dx / d * Math.min(d, 36 * dt); e.y += dy / d * Math.min(d, 36 * dt); }
      e.ang = Math.atan2(P.y - e.y, P.x - e.x);
      e._cd -= dt;
      if (e._cd <= 0 && peutArmer(e) && lasersSentinelles() + chargesSentinelles() < (c.lasersMax || 2)) {
        e._st = 'vise'; e._stT = c.vise || 0.85; e._aim = Math.atan2(P.y - e.y, P.x - e.x); armer(e, 'ligne', e._stT, 'tete');
      }
    } else if (e._st === 'vise') {
      e._stT -= dt;
      if (e._stT <= 0) {
        var v = verifTir(e);
        if (v === null) return;
        if (v === false) { e._st = 'orbite'; e._cd = recharge(e, c.recharge || 3); return; }
        e._st = 'tire'; e._stT = c.laser || 0.35; beam(e, e.x, e.y, e._aim, c.laser || 0.35, 3, c.longueur || 300);
      }
    } else if (e._st === 'tire') {
      e._stT -= dt; if (e._stT <= 0) { e._st = 'orbite'; e._cd = recharge(e, (c.recharge || 3) + rr(0, 0.8)); }
    }
  }

  /* ---- TRAQUEUR : contre l'attente ---- */
  function updTraqueur(e, dt, P) {
    var c = conf('traqueur'), a = Math.atan2(P.y - e.y, P.x - e.x);
    e.ang = a; avance(e, a, (c.vitesse || 0.95) * Math.max(32, vitesseTete()), dt);
    e._spin += dt * 2;
  }

  /* ---- PLANEUR : la cible bonus du DÉFILÉ (courbe de Galaga, ne tire pas) ---- */
  function updPlaneur(e, dt, P) {
    e._life += dt;
    var c = e._courbe;
    if (!c) { e._dead = true; e.etat = 'mort'; return; }
    var u = e._life / (conf('planeur').sortie || 8) + (e._decal || 0);
    if (u < 0) { e.x = c.x0; e.y = c.y0; return; }
    var ang = c.sens * u * TAU * 0.9;
    e.x = c.cx + Math.cos(c.a0 + ang) * c.r * (1 - 0.35 * u) + c.vx * u * 140;
    e.y = c.cy + Math.sin(c.a0 + ang) * c.r * (1 - 0.35 * u) + c.vy * u * 140;
    e.ang = c.a0 + ang + (c.sens > 0 ? Math.PI / 2 : -Math.PI / 2);
    if (u > 1.05) { e._dead = true; e.etat = 'mort'; }
  }

  /* ---- RIVAL : l'autre serpent (traînée mortelle, coupe-route) ---- */
  function updRival(e, dt, P) {
    var c = conf('rival'), v = (c.vitesse || 0.9) * Math.max(50, vitesseTete()) * allure(e);
    var A = O.A, mar = c.evitementMurs || 24;
    var vis = c.visee || 40, tx = P.x + Math.cos(P.ang) * vis, ty = P.y + Math.sin(P.ang) * vis;
    var dP = Math.sqrt(O.d2(e.x, e.y, P.x, P.y));
    var devant = Math.cos(P.ang) * (e.x - P.x) + Math.sin(P.ang) * (e.y - P.y);
    var cr = c.coupeRoute || { distance: 60, annonce: 0.5 };
    if (e._st === 'actif' && e._cd <= 0 && devant > 0 && dP < cr.distance + 20 && dP > 20) {
      e._st = 'arme'; e._stT = cr.annonce; e._tx = tx + Math.cos(P.ang) * 30; e._ty = ty + Math.sin(P.ang) * 30; armer(e, 'losange', e._stT, 'tete');
    }
    if (e._st === 'arme') { e._stT -= dt; tx = e._tx; ty = e._ty; if (e._stT <= 0) { e._st = 'actif'; e._cd = 4.0; } }
    else e._cd -= dt;
    var want = Math.atan2(ty - e.y, tx - e.x);
    if (e.x < A.x0 + mar) want = O.turnTo(want, 0, 1.4); else if (e.x > A.x1 - mar) want = O.turnTo(want, Math.PI, 1.4);
    if (e.y < A.y0 + mar) want = O.turnTo(want, Math.PI / 2, 1.4); else if (e.y > A.y1 - mar) want = O.turnTo(want, -Math.PI / 2, 1.4);
    e.ang = O.turnTo(e.ang, want, v / (c.rayonVirage || 14) * dt);
    avance(e, e.ang, v, dt);
    /* la traînée : un pixel, 1,5 s ; le corps suit la tête à 5 px d'écart */
    var T = e._trail || (e._trail = []), t = O.T.t, last = T.length ? T[T.length - 1] : null, i;
    if (!last || O.d2(last.x, last.y, e.x, e.y) >= 1.2) T.push({ x: e.x, y: e.y, t: t });
    while (T.length && t - T[0].t > (c.traine || 1.5)) T.shift();
    var seg = e._segs || (e._segs = []), esp = c.espacement || 5, acc = 0, ns = 0;
    for (i = T.length - 2; i >= 0 && ns < (c.segments || 10); i--) {
      acc += Math.sqrt(O.d2(T[i].x, T[i].y, T[i + 1].x, T[i + 1].y));
      if (acc >= esp * (ns + 1)) { seg[ns] = seg[ns] || { x: 0, y: 0 }; seg[ns].x = T[i].x; seg[ns].y = T[i].y; ns++; }
    }
    seg.length = ns;
    /* la traînée tue la tête (cause traine) et coupe le corps de la joueuse */
    var J = N.joueuse;
    if (J && J.etat === 'vivant' && !J.invul()) {
      var amin = c.traineAgeMin || 0.15, rt = 3 + (c.traineLargeur || 1) * 0.5;
      for (i = 0; i < T.length; i++) {
        if (t - T[i].t < amin) break;
        if (O.d2(T[i].x, T[i].y, P.x, P.y) < rt * rt) { J.tuer('traine', srcDe(e)); return; }
      }
      var q = segsJ(), k, fini = false;
      for (k = 2; k * 2 + 1 < q.length && !fini; k++) {
        for (i = 0; i < T.length; i += 2) {
          if (t - T[i].t < amin) break;
          if (O.d2(T[i].x, T[i].y, q[k * 2], q[k * 2 + 1]) < 4.5 * 4.5) { J.couper(k, srcDe(e), 'traine'); fini = true; break; }
        }
      }
    }
    /* il meurt en s'écrasant : mur, son corps, le corps de la joueuse (prime CRASH) */
    var crash = false;
    if (e.x < A.x0 + 3 || e.x > A.x1 - 3 || e.y < A.y0 + 3 || e.y > A.y1 - 3) crash = true;
    if (!crash && J && J.hitTest && J.etat === 'vivant') { var h = J.hitTest(e.x, e.y, 2); if (h.part === 'corps' || h.part === 'queue') crash = true; }
    if (!crash && ns > 3) for (i = 3; i < ns; i++) if (O.d2(e.x, e.y, seg[i].x, seg[i].y) < 2.5 * 2.5) { crash = true; break; }
    if (crash) kill(e, { genre: 'joueuse', type: 'devore', id: -1 });
  }

  /* ============================ mise à jour ============================ */
  function update(dt) {
    if (!S) S = N.S;
    arena();
    var P = tete(), i, e;
    if (!P) return;
    var recompte = 0;
    for (i = 0; i < list.length; i++) if (!list[i]._dead && list[i].type === 'fleche' && (list[i]._st === 'vise' || list[i]._st === 'fonce')) recompte++;
    charges = recompte;
    if (inv.t > 0) { inv.t -= dt; if (inv.t <= 0) finInversion(); }
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e._dead) continue;
      e.etatT += dt; e.img = (e.img + 1) | 0; e._age += dt;
      if (e._flash > 0) e._flash -= dt;
      if (e._portail > 0) {                               // le portail : il existe, il ne touche pas, il n'agit pas
        e._portail -= dt;
        if (e._portail <= 0) { e._portail = 0; apparu(e); }
        continue;
      }
      /* vue : depuis combien de temps l'ennemi est entièrement visible */
      var plein = N.cam && N.cam.shown ? N.cam.shown(e.x, e.y, 0) : O.visible(e.x, e.y, -e.r);
      e.vuDepuis = plein ? (e.vuDepuis < 0 ? 0 : e.vuDepuis + dt) : -1;
      if (e._ext) { if (e.etat !== 'mort') e.etat = 'approche'; continue; }       // le CYCLOPE (73-colosse) se pilote seul
      if (e._stun > 0) e._stun -= dt;
      if (e._kx || e._ky) { e.x += e._kx * dt; e.y += e._ky * dt; var f = Math.pow(0.02, dt); e._kx *= f; e._ky *= f; if (Math.abs(e._kx) + Math.abs(e._ky) < 2) { e._kx = 0; e._ky = 0; } }
      if (e._st === 'proie') updProie(e, dt, P);
      else if (e._st === 'fuite') {                       // fuir() : il s'éloigne de la tête
        var dd0 = Math.sqrt(O.d2(e.x, e.y, P.x, P.y)) || 1; e.x += (e.x - P.x) / dd0 * 60 * dt; e.y += (e.y - P.y) / dd0 * 60 * dt;
      } else if (e.type === 'fleche') updFleche(e, dt, P);
      else if (e.type === 'dard') updDard(e, dt, P);
      else if (e.type === 'larve') updLarve(e, dt, P);
      else if (e.type === 'mine') updMine(e, dt, P);
      else if (e.type === 'tourelle') updTourelle(e, dt, P);
      else if (e.type === 'lame') updLame(e, dt, P);
      else if (e.type === 'ruche') updRuche(e, dt, P);
      else if (e.type === 'sentinelle') updSentinelle(e, dt, P);
      else if (e.type === 'traqueur') updTraqueur(e, dt, P);
      else if (e.type === 'planeur') updPlaneur(e, dt, P);
      else if (e.type === 'rival') updRival(e, dt, P);
      if (e._dead) continue;
      e.etat = ETAT[e._st] || 'approche';
      var dirA = (e._st === 'vise' || e._st === 'fonce' || e._st === 'verrou' || e._st === 'recule') ? e._aim : e.ang;
      e.dir = O.dir16(dirA);
      /* trop loin hors de la vue : on le rappelle (une flèche qui a dépassé sa cible) */
      var V = O.VUE;
      if (e.type !== 'planeur' && e.type !== 'rival' && (e.x < V.x - 60 || e.x > V.x + V.w + 60 || e.y < V.y - 60 || e.y > V.y + V.h + 60)) {
        e.x = O.clamp(e.x, Math.max(V.x - 40, AL), Math.min(V.x + V.w + 40, AR)); e.y = O.clamp(e.y, Math.max(V.y - 40, AT), Math.min(V.y + V.h + 40, AB));
        if (e.type === 'fleche' && e._st !== 'proie' && e._st !== 'fuite') e._st = 'chasse';
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
    /* les mèches des INSTABLES */
    for (i = fuses.length - 1; i >= 0; i--) {
      var fu = fuses[i]; fu.t -= dt;
      if (fu.t <= 0) { fuses.splice(i, 1); souffle(fu.x, fu.y, fu.r, CFG.fuseDegats, null, false); }
    }
    /* tirs ennemis : ils avancent ; N.joueuse teste ce qu'ils touchent */
    var VU = O.VUE, A = O.A;
    for (i = 0; i < tirs.length; i++) {
      var s = tirs[i];
      if (s._dead) continue;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vie -= dt;
      if (s.vie <= 0 || s.x < VU.x - 8 || s.x > VU.x + VU.w + 8 || s.y < VU.y - 8 || s.y > VU.y + VU.h + 8 || s.x < A.x0 - 8 || s.x > A.x1 + 8 || s.y < A.y0 - 8 || s.y > A.y1 + 8) s._dead = true;
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
    vitesses(dt);
    publierTele();
  }

  /* ---- vx, vy : la vitesse observée de chaque ennemi (px/s), déplacement entre deux mises à jour. Les pilotes prédisent « déplacé de
     (vx, vy) × t » (refonte/lots/pilotes.md § 3) ; avant, ces champs du schéma `ennemi` restaient à 0. Lecture seule : aucun module
     du jeu ne les lit. Un saut de rappel ou de portail (plus de 600 px/s) n'est pas une vitesse : il compte pour 0. ---- */
  function vitesses(dt) {
    if (!(dt > 0)) return;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e._px === undefined) { e.vx = 0; e.vy = 0; }
      else {
        var vx = (e.x - e._px) / dt, vy = (e.y - e._py) / dt;
        if (vx * vx + vy * vy > 360000) { vx = 0; vy = 0; }
        e.vx = vx; e.vy = vy;
      }
      e._px = e.x; e._py = e.y;
    }
  }

  /* ---- S.tele (lot I) : les télégraphes vivants, au schéma `tele` de 03-socle.js, recalculés à chaque pas de jeu à l'endroit exact des
     dégâts (REFONTE.md § 4.4) : la zone que lira le pilote (pilotes.md § 3.1), pas son dessin. `r` est le rayon qui tue de la zone
     SANS la tête (la marge de 4 px du pilote la rajoute) ; `reste` va de `total` à 0 ; `cible` dit ce qui est frappé. Objets et
     tableau préalloués. Le dessin reste celui de drawTele() ci-dessous (le repli de N.fx.tele, que personne n'appelle encore :
     quand 72 passera par N.fx.tele, c'est lui qui publiera S.tele). codex-p4 : les dangers actifs restent avec reste=0 ;
     73 ajoute ses prévisions par l'interface publique publierTele(ajouter), puis demande un rafraîchissement après son pas.
     La RUCHE prévoit les contacts de sa nichée, pas un souffle fictif autour de la mère. ---- */
  var TVN = 0, TV = [], TVP = [];
  for (var qt = 0; qt < 48; qt++) TVP.push({ id: 0, forme: 'ligne', x0: 0, y0: 0, x1: 0, y1: 0, r: 0, a0: 0, a1: 0, reste: 0, total: 0, cible: 'tete', par: { type: '', id: -1 } });
  function teleAjouter(id, forme, x0, y0, x1, y1, r, reste, total, cible, type, a0, a1, parId) {
    // Pas de troncature : nichées et salves peuvent dépasser le pool initial du lot I.
    if (TVN >= TVP.length) TVP.push({ par: {} });
    var t = TVP[TVN]; TV[TVN] = t; TVN++;
    t.id = id; t.forme = forme; t.x0 = x0; t.y0 = y0; t.x1 = x1; t.y1 = y1; t.r = r; t.a0 = a0 || 0; t.a1 = a1 || 0;
    t.reste = reste > 0 ? reste : 0; t.total = total > 0 ? total : 0; t.cible = cible; t.par.type = type; t.par.id = parId === undefined ? id : parId;
    return id;
  }
  function publierTele() {
    var s = S || N.S, i, e, r, u, id;
    if (!s) return;
    TVN = 0;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (!e._dead && e.type === 'larve' && e._mere !== undefined && e.etat === 'portail') {
        // Les enfants restent immobiles dans leur portail, puis le contact tête devient possible.
        e.tele = teleAjouter(e.id, 'disque', e.x, e.y, e.x, e.y,
          e.r * R.mort.ennemi.facteurRayon, e._portail, TP.ruchePortail, 'tete', 'ruche', 0, 0, e._mere);
        continue;
      }
      if (e._dead || e.etat === 'portail' || e._ext || e._st === 'proie') { e.tele = -1; continue; }
      id = -1; r = 0.8 * e.r;
      var st = e._st, tot = e._teleTotal || 0.6, rest = e._stT, c;
      if (e.type === 'fleche' && st === 'vise') {
        c = (conf('fleche').bond && conf('fleche').bond.longueur) || 67;
        id = teleAjouter(e.id, 'ligne', e.x, e.y, e.x + Math.cos(e._aim) * c, e.y + Math.sin(e._aim) * c, r, rest, tot, 'tete', e.type);
      } else if (e.type === 'dard' && st === 'verrou') {
        c = (conf('dard').fuseau && conf('dard').fuseau.longueur) || 82;
        id = teleAjouter(e.id, 'ligne', e.x, e.y, e.x + Math.cos(e._aim) * c, e.y + Math.sin(e._aim) * c, r, rest, tot, 'tete', e.type);
      } else if (e.type === 'larve' && st === 'mord') {
        id = teleAjouter(e.id, 'disque', e._tx, e._ty, e._tx, e._ty, 12, rest, tot, 'corps', e.type);
      } else if (e.type === 'mine' && st === 'arme') {
        id = teleAjouter(e.id, 'disque', e.x, e.y, e.x, e.y, conf('mine').souffle || CFG.mineSouffle, rest, tot, 'tout', e.type);
      } else if (e.type === 'tourelle' && st === 'vise') {
        c = conf('tourelle').portee || 160;
        id = teleAjouter(e.id, 'ligne', e.x, e.y, e.x + Math.cos(e._aim) * c, e.y + Math.sin(e._aim) * c, CFG.tirTaille, rest, tot, 'tete', e.type);
      } else if (e.type === 'sentinelle' && st === 'vise') {
        c = conf('sentinelle').longueur || 300;
        id = teleAjouter(e.id, 'ligne', e.x, e.y, e.x + Math.cos(e._aim) * c, e.y + Math.sin(e._aim) * c, 1.5, rest, tot, 'tete', e.type);
      } else if (e.type === 'ruche' && st === 'couve') {
        c = conf('ruche').larves;
        for (var k = 0; k < c; k++) {
          var ag = k / c * TAU + e._age + rest;
          var lx = e.x + Math.cos(ag) * (e.r + TP.rucheDecalage), ly = e.y + Math.sin(ag) * (e.r + TP.rucheDecalage);
          id = teleAjouter(e.id, 'disque', lx, ly, lx, ly, conf('larve').r * R.mort.ennemi.facteurRayon,
            rest + TP.ruchePortail, tot + TP.ruchePortail, 'tete', e.type);
        }
      } else if (e.type === 'lame' && st === 'recule') {
        c = (conf('lame').traverse && conf('lame').traverse.longueur) || 190;
        id = teleAjouter(e.id, 'ligne', e._tx, e._ty, e._tx + Math.cos(e._aim) * c, e._ty + Math.sin(e._aim) * c, r, rest + 0.2, tot, 'tout', e.type);
      } else if (e.type === 'rival' && st === 'arme') {
        id = teleAjouter(e.id, 'losange', e._tx, e._ty, e._tx, e._ty, 5, rest, tot, 'tete', e.type);
      }
      e.tele = id;
    }
    for (i = 0; i < fuses.length; i++) {                      // la mèche d'un INSTABLE : le disque de souffle
      u = fuses[i];
      teleAjouter(-1 - i, 'disque', u.x, u.y, u.x, u.y, u.r, u.t, u.d, 'tout', 'instable');
    }
    for (i = 0; i < lasers.length; i++) {
      u = lasers[i];
      if (!u._dead) teleAjouter(u.src.id, 'ligne', u.x0, u.y0, u.x1, u.y1, u.w / 2, 0, u.d, 'tete', u.src.type);
    }
    for (i = 0; i < tirs.length; i++) {
      u = tirs[i];
      if (!u._dead && u.src.type === 'cyclope') teleAjouter(u.id, 'ligne', u.x, u.y,
        u.x + u.vx * u.vie, u.y + u.vy * u.vie, u.r, 0, TP.tirVie, 'tout', 'cyclope', 0, 0, u.src.id);
    }
    if (N.colosse && N.colosse.publierTele) N.colosse.publierTele(teleAjouter);
    TV.length = TVN;
    if (s.tele !== TV) s.tele = TV;
  }
  function compact(L) { var j = 0; for (var i = 0; i < L.length; i++) if (!L[i]._dead) L[j++] = L[i]; L.length = j; }

  /* ============================ sprites : ceux de 40-sprites.js, sinon des replis dessinés ici ============================ */
  var NOMS = null;
  function connu(base) {
    if (NOMS === null) {
      NOMS = {};
      try { var l = N.spr && N.spr.names ? N.spr.names() : []; for (var i = 0; i < l.length; i++) NOMS[String(l[i]).split(':')[0]] = 1; } catch (x) { /* liste absente */ }
    }
    return !!NOMS[base];
  }
  var COL = null;
  function col() {
    if (!COL) COL = { m: O.MAGENTA, s: O.SANG, r: O.ROSE, o: O.OS, a: O.AMBRE, j: O.JAUNE, n: O.NP, b: O.BRASIER, d: O.ARDOISE, k: O.ACIER };
    return COL;
  }
  function rows(RW, outline) {
    var h = RW.length, w = RW[0].length, s = O.mk(w, h), C = col(), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var c = C[RW[y].charAt(x)]; if (c) s.data[y * w + x] = c; }
    if (outline) s = bordure(s);
    s.cx = (s.w - 1) >> 1; s.cy = (s.h - 1) >> 1;
    return s;
  }
  function bordure(s) {
    var w = s.w + 2, h = s.h + 2, o = O.mk(w, h), od = o.data, sd = s.data, x, y;
    for (y = 0; y < s.h; y++) for (x = 0; x < s.w; x++) if (sd[y * s.w + x]) od[(y + 1) * w + x + 1] = sd[y * s.w + x];
    function opq(px, py) { px -= 1; py -= 1; return px >= 0 && py >= 0 && px < s.w && py < s.h && sd[py * s.w + px] !== 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (!od[y * w + x] && (opq(x - 1, y) || opq(x + 1, y) || opq(x, y - 1) || opq(x, y + 1))) od[y * w + x] = O.NP;
    return o;
  }
  function tourne(s, a) {
    var sz = Math.ceil(Math.sqrt(s.w * s.w + s.h * s.h)) | 1, o = O.mk(sz, sz), c = Math.cos(a), si = Math.sin(a), cx = (s.w - 1) / 2, cy = (s.h - 1) / 2, oc = (sz - 1) / 2;
    for (var y = 0; y < sz; y++) for (var x = 0; x < sz; x++) {
      var dx = x - oc, dy = y - oc, sx = Math.round(cx + dx * c + dy * si), sy = Math.round(cy - dx * si + dy * c);
      if (sx >= 0 && sy >= 0 && sx < s.w && sy < s.h) { var v = s.data[sy * s.w + sx]; if (v) o.data[y * sz + x] = v; }
    }
    o.cx = (sz - 1) >> 1; o.cy = (sz - 1) >> 1;
    return o;
  }
  var FB = {};
  var ART = {
    dard: ['m....m.', 'sm..ms.', '.smmms.', '..mrm..', '.smmms.', 'sm.o.ms', 'm.....m'],
    larve: ['.m.m.m.', '..sms..', 'msmrmsm', '..sms..', '.m.m.m.'],
    lame: ['..sss..', '.smmms.', 'smmrmms', 'smrrrms', 'smmrmms', '.smmms.', '..sss..'],
    lameD: ['m.......m', '.m.....m.', '..s...s..', '..smmms..', '.smmrmms.', '.smrrrms.', '.smmrmms.', '..smmms..', '..s...s..', '.m.....m.', 'm.......m'],
    ruche: ['...sss.sss...', '..smmmsmmms..', '.smmmmmmmmms.', 'smmmrrrrrmmms', 'smmrrooorrmms', 'smmrroooorrms', 'smmrrooorrmms', 'smmmrrrrrmmms', '.smmmmmmmmms.', '..smmmsmmms..', '...sss.sss...'],
    traqueur: ['..ddddd..', '.dkkkkkd.', 'dkkddkkkd', 'dkdrrdkkd', 'dkdrrdkkd', 'dkkddkkkd', '.dkkkkkd.', '..ddddd..'],
    planeur: ['r..r..r', '.rsmsr.', '..rmr..', '...r...'],
    perle: ['.sss.', 'smrms', 'smmms', '.sss.'],
    rivalT: ['..sssss..', '.smmmmms.', 'smrrmrrms', 'smrrmrrms', 'smmmmmmms', '.smssssm.', '..m.m.m..']
  };
  function fbSpr(nom, f) {
    var k = nom + '|' + f;
    if (FB[k]) return FB[k];
    var p = nom.split(':'), b = p[0], s = null;
    if (b === 'dard') s = tourne(rows(ART.dard, true), (parseInt(p[1], 10) || 0) * Math.PI / 8);
    else if (b === 'lame') s = rows((p[1] === 'deployee' || p[1] === 'deploye') ? ART.lameD : ART.lame, true);
    else if (ART[b]) s = rows(ART[b], true);
    else s = rows(['.k.', 'kkk', '.k.'], false);
    FB[k] = s;
    return s;
  }
  function spr(nom, f) {
    var b = nom.split(':')[0];
    if (connu(b)) return O.sp(nom, f);
    return fbSpr(nom, f & 1);
  }

  function enemySprite(e, f) {
    var t = e.type;
    if (t === 'fleche') return O.sp('fleche:' + O.dir16((e._st === 'vise' || e._st === 'fonce') ? e._aim : e.ang), f);
    if (t === 'tourelle') return O.sp(e._st === 'vise' ? 'tourelle:charge' : 'tourelle', f);
    if (t === 'mine') return O.sp(e._st === 'arme' ? 'mine:alerte' : 'mine', f);
    if (t === 'dard') return spr('dard:' + O.dir16(e._st === 'fonce' || e._st === 'verrou' ? e._aim : e.ang), f);
    if (t === 'lame') return spr((e._st === 'recule' || e._st === 'fonce') ? 'lame:deployee' : 'lame', f);
    if (t === 'rival') return spr('rivalT', f);
    return spr(t, f);
  }
  function encre(e) {
    if (e._st === 'proie') return (inv.t < 1 && (Math.floor(O.T.ak * 8) & 1)) ? -1 : O.ARDOISE;
    if (e._st === 'recup' && e.type === 'lame') return O.ROSE;
    return -1;
  }
  function ringTrame(x, y, r, c, t) {
    var g = N.gfx, n = Math.max(24, Math.floor(r * 2.6));
    for (var j = 0; j < n; j++) {
      var a = j / n * TAU, px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
      if (N.pal.dither(px, py, t)) g.px(px, py, c);
    }
  }
  function drawEnemy(e) {
    var ak = O.T.ak, f = Math.floor(ak * 6) + (e.id & 3), s = enemySprite(e, f), x = e.x, y = e.y, ink;
    if (!s) return;
    if (e.type === 'fleche' && e._st === 'vise') x += (Math.floor(ak * 20) & 1) ? 1 : 0;      // elle tremble avant de se jeter
    if (e.mods.rapide && e._st !== 'proie') { O.blitDither(s, x - Math.cos(e.ang) * 5, y - Math.sin(e.ang) * 5, O.SANG, 0.5); O.blitDither(s, x - Math.cos(e.ang) * 9, y - Math.sin(e.ang) * 9, O.SANG, 0.25); }
    ink = encre(e);
    if (ink >= 0) O.putInk(s, x, y, ink); else O.put(s, x, y);
    if (O.isFlash(e)) O.putInk(O.inner(s), x, y, O.OS);
    var g = N.gfx, j;
    if (e.mods.blinde && e._plaques) {                       // plaques de sang à rivets rose pâle
      for (j = 0; j < 8; j++) { var ba = j * TAU / 8 + 0.4; g.px(x + Math.cos(ba) * (e.r + 1.5), y + Math.sin(ba) * (e.r + 1.5), (j & 1) ? O.ROSE : O.SANG); }
    }
    if (e.mods.instable && e._st !== 'proie') {              // cœur en brasier qui bat plus vite quand les PV baissent
      var bat = 3 + 6 * (1 - e.pv / e.pvMax);
      if (Math.floor(ak * bat * 2) & 1) g.px(x, y, O.BRASIER);
    }
    if (e.elite) {                                           // la couronne : pointillés rose pâle qui tournent
      var n = 12, ra = e.r + 5;
      for (j = 0; j < n; j += 2) { var ca = ak * 1.4 + j * TAU / n; g.px(x + Math.cos(ca) * ra, y + Math.sin(ca) * ra, O.ROSE); }
    }
    if (e.type === 'ruche') {                                // l'arc de PV d'un pixel
      var nn = Math.ceil(e.pv / e.pvMax * 40);
      for (j = 0; j < nn; j++) g.px(x + Math.cos(-Math.PI / 2 + j / 40 * TAU) * (e.r + 3), y + Math.sin(-Math.PI / 2 + j / 40 * TAU) * (e.r + 3), O.ROSE);
      if (e._petales > 0) for (j = 0; j < 6; j++) { var pa = j * TAU / 6 + e._spin; g.px(x + Math.cos(pa) * (e.r + 1 + 4 * e._petales), y + Math.sin(pa) * (e.r + 1 + 4 * e._petales), O.ROSE); }
    }
    if (e.type === 'traqueur') {                             // halo de pointillés qui tourne (ne se confond pas avec le RIVAL)
      for (j = 1; j < 10; j += 2) { var ha = e._spin + j * TAU / 10; g.px(x + Math.cos(ha) * (e.r + 3), y + Math.sin(ha) * (e.r + 3), O.ROSE); }
    }
    if (e.type === 'rival') drawRival(e);
    if (e.type === 'mine' && e._st !== 'arme') ringTrame(x, y, conf('mine').cercle || 34, e._st === 'proie' ? O.ARDOISE : O.VIOLET, 0.35);   // le cercle d'armement est toujours affiché
  }
  function drawRival(e) {
    var g = N.gfx, T = e._trail, t = O.T.t, i, C = conf('rival');
    if (T) for (i = 0; i < T.length; i++) {                  // la traînée : 1 px magenta ; plus vive dès qu'elle tue
      var age = t - T[i].t;
      if (age > 0.1 || (i & 1)) g.px(T[i].x, T[i].y, age > (C.traineAgeMin || 0.15) ? O.MAGENTA : O.SANG);
    }
    var sg = e._segs;
    if (sg) for (i = sg.length - 1; i >= 0; i--) O.put(fbSpr('perle', 0), sg[i].x, sg[i].y);
  }
  function drawEnemyShots() {
    var f = Math.floor(O.T.ak * 8);
    for (var i = 0; i < tirs.length; i++) if (!tirs[i]._dead) O.put(O.sp(tirs[i]._big ? 'tirEnnemi:gros' : 'tirEnnemi', f + i), tirs[i].x, tirs[i].y);
  }
  function drawEnemies() {
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e._dead || e.etat === 'portail' || e._ext) continue;
      drawEnemy(e);
    }
  }
  /* le plateau en mouvement (N.arene) et le corps du CYCLOPE (N.colosse) se dessinent d'ici : 79-jeu n'appelle que N.ennemis.draw() */
  function draw() {
    O.origineMonde();                                  // tout ce qui suit est en coordonnées MONDE
    if (N.arene && N.arene.draw) O.safe('arene.draw', function () { N.arene.draw(); });
    drawEnemies();
    if (N.colosse && N.colosse.draw && N.colosse.actif && N.colosse.actif()) O.safe('colosse.draw', function () { N.colosse.draw(); });
    drawEnemyShots();
  }

  /* ---- les télégraphes : le repli de N.fx.tele / N.fx.drawTele. Deux temps : magenta en pointillés qui courent
     (QUI et OÙ), puis rose pâle plein pendant les 300 dernières ms (QUAND). Toujours gainés de nuit profonde, dessinés
     à l'endroit exact des dégâts (G-13). ---- */
  function teleLine(x0, y0, a, len, k, rest) {
    var g = N.gfx, c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c, i, x, y, V = O.VUE;
    function dehors(xx, yy) { return xx < V.x - 2 || yy < V.y - 2 || xx > V.x + V.w + 2 || yy > V.y + V.h + 2; }
    var fin = rest !== undefined ? rest <= ((R && R.ennemis && R.ennemis.tele && R.ennemis.tele.finRosePale) || 0.3) : k > 0.75;
    for (i = 6; i < len; i++) { x = x0 + c * i; y = y0 + s * i; if (dehors(x, y)) break; g.px(x + nx, y + ny, O.NP); g.px(x - nx, y - ny, O.NP); }
    var ph = Math.floor(O.T.ak * 30), col2 = fin ? O.ROSE : O.MAGENTA;
    for (i = 6; i < len; i++) { x = x0 + c * i; y = y0 + s * i; if (dehors(x, y)) break; if (fin || ((i + 6000 - ph) % 6) < 3) g.px(x, y, col2); }
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
  function losange(x, y, r, c) {
    var g = N.gfx;
    g.line(x - r, y, x, y - r, c); g.line(x, y - r, x + r, y, c); g.line(x + r, y, x, y + r, c); g.line(x, y + r, x - r, y, c);
  }
  function drawTele() {
    var g = N.gfx, i, e;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e._dead) continue;
      if (e.etat === 'portail') {                       // le portail : croix de visée et anneaux qui se resserrent
        var kb = e._portailTotal > 0 ? 1 - e._portail / e._portailTotal : 1;
        spawnMark(e.x, e.y, kb, e.elite ? 24 : (e.type === 'ruche' ? 22 : 12));
        continue;
      }
      if (e._ext || e._st === 'proie') continue;
      var rest = e._stT, tot = e._teleTotal || 0.6, kk = tot > 0 ? 1 - rest / tot : 1;
      if (e.type === 'fleche' && e._st === 'vise') teleLine(e.x, e.y, e._aim, (conf('fleche').bond && conf('fleche').bond.longueur) || 67, kk, rest);
      else if (e.type === 'dard' && e._st === 'verrou') {
        teleLine(e.x, e.y, e._aim, (conf('dard').fuseau && conf('dard').fuseau.longueur) || 82, kk, rest);
        var lr = 9 - 4 * kk; losange(e._tx, e._ty, lr + 1, O.NP); losange(e._tx, e._ty, lr, kk > 0.6 ? O.ROSE : O.MAGENTA);
      } else if (e.type === 'tourelle' && e._st === 'vise') {
        var po = conf('tourelle').portee || 160;
        teleLine(e.x, e.y, e._aim, po, kk, rest);
        var ix = e.x + Math.cos(e._aim) * po, iy = e.y + Math.sin(e._aim) * po; losange(ix, iy, 3, O.NP); losange(ix, iy, 2, kk > 0.7 ? O.ROSE : O.MAGENTA);
      } else if (e.type === 'sentinelle' && e._st === 'vise') teleLine(e.x, e.y, e._aim, (conf('sentinelle').longueur || 300), kk, rest);
      else if (e.type === 'lame' && e._st === 'recule') teleLine(e._tx, e._ty, e._aim, (conf('lame').traverse && conf('lame').traverse.longueur) || 190, kk, rest + 0.2);
      else if (e.type === 'larve' && e._st === 'mord') {
        var rr0 = 12 * (1 - kk) + 3; g.ring(e._tx, e._ty, rr0 + 1, O.NP, 1); g.ring(e._tx, e._ty, rr0, kk > 0.6 ? O.ROSE : O.MAGENTA, 1);
      } else if (e.type === 'mine' && e._st === 'arme') {
        var mk = 1 - e._stT / ((conf('mine').meche) || 0.8), sr = conf('mine').souffle || CFG.mineSouffle;
        g.ditherCirc(e.x, e.y, sr, O.MAGENTA, 0.08 + 0.3 * mk);
        g.ring(e.x, e.y, sr + 1, O.NP, 1); g.ring(e.x, e.y, sr, mk > 0.7 ? O.ROSE : O.MAGENTA, 1);
      } else if (e.type === 'ruche' && e._st === 'couve') {
        g.ring(e.x, e.y, e.r + 4 + 6 * (1 - kk), O.MAGENTA, 0.5 + 0.5 * kk);
      } else if (e.type === 'rival' && e._st === 'arme') {
        losange(e._tx, e._ty, 5, O.NP); losange(e._tx, e._ty, 4, O.ROSE);
      }
    }
    for (i = 0; i < fuses.length; i++) {                // la mèche d'un INSTABLE : le disque de souffle qui se remplit
      var fu = fuses[i], fk = 1 - fu.t / fu.d;
      g.ditherCirc(fu.x, fu.y, fu.r, O.MAGENTA, 0.08 + 0.3 * fk);
      g.ring(fu.x, fu.y, fu.r + 1, O.NP, 1); g.ring(fu.x, fu.y, fu.r, fk > 0.7 ? O.ROSE : O.MAGENTA, 1);
    }
    for (i = 0; i < lasers.length; i++) if (!lasers[i]._dead) beamDraw(lasers[i]);
  }

  return {
    reset: reset, update: update, draw: draw, drawEnemies: drawEnemies, drawTele: drawTele,
    spawn: spawn, list: list, count: count, counts: counts, hit: hit, zone: zone, devorer: devorer, dans: dans, pres: pres,
    tir: tir, tirs: tirs, lasers: lasers, effacerTirs: effacerTirs, inverser: inverser, fuir: fuir, purge: purge, purgeEnCours: purgeEnCours,
    rayon: rayon, teleLigne: teleLine, marque: spawnMark, inversion: function () { return Math.max(0, inv.t); }, charges: function () { return charges; }, publierTele: publierTele
  };
})();
