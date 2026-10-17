/* ===== 72-ennemis.js — N.ennemis : le bestiaire, les tirs ennemis, l'armement dans la vue =====

   SQUELETTE DU LOT 0b (contrat 1.0, CONTRAT.md § 10.2). Propriétaires : lots 4a et 4b. Le comportement de
   la FLÈCHE, de la MINE, de la TOURELLE et de la SENTINELLE vient de la démo (70-game.js, réparti par le lot
   0b) : la flèche chasse devant la tête puis se fige et fonce, la mine dérive, se pose et s'arme quand on
   entre dans son cercle, la tourelle se poste et tire trois balles, la sentinelle orbite et tire un laser.
   Ce qui change avec le contrat 1.0 :
     - objets au schéma du § 7 (etat ∈ portail|approche|arme|attaque|recup|fuite|proie|mort ; état privé « _ ») ;
     - chiffres de N.R.ennemis ; coordonnées MONDE ;
     - armement seulement si l'ennemi est entièrement dans la vue (N.cam.shown), télégraphe enregistré à
       chaque pas par N.fx.tele, événement 'arme' au début ; vuDepuis tenu à chaque pas ;
     - les collisions avec la joueuse passent par N.joueuse.hitTest, puis tuer (tête) ou couper (corps) ;
     - hit(e, dmg, src) retire les PV et émet 'kill' une seule fois ; zone, devorer, purge passent par lui.
   Les autres types (DARD, LARVE, LAME, RUCHE, RIVAL, PLANEUR, TRAQUEUR) ont un repli commun : ils
   approchent la tête et tuent au contact (le PLANEUR ne blesse jamais ; le TRAQUEUR ne meurt qu'au LASSO ou
   dévoré). Les parties du CYCLOPE (type 'cyclope', boss) vivent dans la liste mais sont menées par
   73-colosse.js. Événements émis : kill, apparition, arme, inversion. Consommateur : ramassage (10 : la
   PASTILLE lance l'INVERSION). Flux de hasard : 'ennemis'. Miroirs : S.enemies, S.shots. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '72-ennemis', TAU = Math.PI * 2;

  function RE() { return (N.R && N.R.ennemis) || {}; }
  function rng() { return N.rng('ennemis'); }
  function I(n) { return N.pal.i(n); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrapA(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function turnTo(a, want, m) { var d = wrapA(want - a); return wrapA(a + (d > m ? m : d < -m ? -m : d)); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function dir16(a) { var k = Math.round(a / (Math.PI / 8)); return ((k % 16) + 16) % 16; }
  function segDist2(px, py, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy, u = l > 0 ? ((px - x0) * dx + (py - y0) * dy) / l : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return d2(px, py, x0 + dx * u, y0 + dy * u);
  }
  function tete() { var s = N.S, p = s && s.player; return p && typeof p.x === 'number' ? p : null; }
  function vivante(p) { return p && (p.etat === 'vivant' || p.etat === 'reapparition'); }
  function plafonds() { var s = N.R && N.R.secteurs && N.R.secteurs[0]; return (s && s.plafondDur) || { ennemis: 40, tirs: 80 }; }

  var list = [], tirs = [], BEAMS = [], PURGE = [], TMP = [], TMP2 = [];
  var INV = { on: false, reste: 0, dur: 0 };
  var purgeT = 0;

  /* ================================ naissance ================================ */
  function stats(type) {
    var e = RE()[type] || {};
    if (type === 'cyclope') { var c = N.R && N.R.colosse; return { pv: (c && c.pvTotal) || 4500, r: 20 }; }
    if (type === 'rival') return { pv: e.pvTete || 180, r: e.r || 5.5 };
    return { pv: e.pv || 20, r: e.r || 5 };
  }
  function spawn(type, x, y, opts) {
    opts = opts || {};
    var okType = N.ids && (N.ids.ennemis.indexOf(type) >= 0 || N.ids.ennemisBoss.indexOf(type) >= 0);
    if (!okType) type = 'fleche';
    if (list.length >= plafonds().ennemis && type !== 'cyclope') return null;
    var st = stats(type), p = tete(), r = rng(), boss = type === 'cyclope';
    var pv = opts.pv || st.pv;
    if (opts.elite && N.R && N.R.f && N.R.f.pvElite) pv = N.R.f.pvElite(pv);
    var e = {
      id: N.ids.suivant(), type: type, x: x, y: y, vx: 0, vy: 0, r: st.r, ang: p ? Math.atan2(p.y - y, p.x - x) : 0,
      pv: pv, pvMax: pv, etat: opts.etat || 'approche', etatT: 0, vuDepuis: -1,
      elite: !!opts.elite, mods: { blinde: !!(opts.mods && opts.mods.blinde), rapide: !!(opts.mods && opts.mods.rapide), instable: !!(opts.mods && opts.mods.instable) },
      boss: boss, partie: boss ? (opts.partie || 'oeil') : null, tele: -1, img: 0, dir: 0,
      _st: 'repos', _cd: r.r(0.6, 1.6), _aim: 0, _tx: x, _ty: y, _kx: 0, _ky: 0, _shots: 0, _orb: 0, _sens: r.f() < 0.5 ? -1 : 1,
      _spin: r.r(0, TAU), _life: 0, _age: 0, _td: null, _t0: 0
    };
    if (type === 'mine') { e._st = 'derive'; station(e, 16); }
    if (type === 'tourelle') { e._st = 'entre'; station(e, 24); }
    if (type === 'sentinelle') { e._st = 'orbite'; e._orb = p ? Math.atan2(y - p.y, x - p.x) : 0; e._cd = r.r(2.5, 3.5); }
    if (type === 'fleche') e._st = 'chasse';
    if (type === 'planeur') { e._aim = p ? Math.atan2(p.y - y, p.x - x) : 0; e._life = (RE().planeur && RE().planeur.sortie) || 8; }
    if (INV.on && !boss && type !== 'traqueur') e.etat = 'proie';
    list.push(e);
    if (N.ev) N.ev.emit('apparition', { id: e.id, type: e.type, x: e.x, y: e.y, elite: e.elite });
    return e;
  }
  function station(e, margin) {
    var w = N.world, p = tete(), r = rng();
    for (var k = 0; k < 12; k++) {
      var x = r.r((w ? w.x0 : 0) + margin, (w ? w.x1 : 1024) - margin), y = r.r((w ? w.y0 : 0) + margin, (w ? w.y1 : 512) - margin);
      if (!p || d2(x, y, p.x, p.y) > 70 * 70) { e._tx = x; e._ty = y; return; }
    }
    e._tx = w ? (w.x0 + w.x1) / 2 : 512; e._ty = w ? (w.y0 + w.y1) / 2 : 256;
  }

  /* ================================ dégâts et mort ================================ */
  function src(e) { return { genre: 'ennemi', type: e.type, id: e.id }; }
  function hit(e, dmg, s) {
    if (!e || e.etat === 'mort') return false;
    if (e.type === 'traqueur' && !(s && (s.type === 'lasso' || s.type === 'devore' || s.genre === 'decor'))) return false;
    e.pv -= +dmg || 0;
    if (N.fx && N.fx.hit) N.fx.hit(e.id, Math.PI * e.r * e.r);
    if (e.pv <= 0) { tuerE(e, s); return true; }
    return true;
  }
  function tuerE(e, s) {
    if (e.etat === 'mort') return;
    e.etat = 'mort'; e.etatT = 0; e.pv = Math.min(e.pv, 0);
    if (e.tele >= 0) e.tele = -1;
    var p = tete(), base = (N.R && N.R.score && N.R.score.base && N.R.score.base[e.type]) || 0;
    if (N.ev) N.ev.emit('kill', { id: e.id, type: e.type, x: e.x, y: e.y, elite: e.elite, boss: e.boss, base: base,
      src: s || { genre: 'decor', type: 'purge', id: null }, distTete: p ? Math.sqrt(d2(e.x, e.y, p.x, p.y)) : 0, gen: 0 });
  }
  function zone(x, y, r, dmg, s) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      var e = list[i]; if (e.etat === 'mort') continue;
      var rr = r + e.r; if (d2(x, y, e.x, e.y) < rr * rr) { hit(e, dmg, s); if (e.etat === 'mort') n++; }
    }
    return n;
  }
  function devorer(e) { if (e && e.etat !== 'mort') { e.pv = 0; tuerE(e, { genre: 'joueuse', type: 'devore', id: null }); } }

  /* ================================ tirs ennemis ================================ */
  function tir(x, y, vx, vy, opts) {
    if (tirs.length >= plafonds().tirs) return null;
    var s = (opts && opts.src) || { genre: 'ennemi', type: 'tourelle', id: null };
    var t = { id: N.ids.suivant(), x: x, y: y, vx: vx, vy: vy, r: (opts && opts.r) || ((RE().tir && RE().tir.rayon) || 2), vie: (opts && opts.vie) || 4, src: s };
    tirs.push(t);
    if (N.journal) N.journal('tirEnnemi', { id: t.id, src: s, x: x, y: y });
    if (N.music && N.music.sfx && !(N.S && N.S.reglages && N.S.reglages.effets === false)) N.music.sfx('tirEnnemi', {});
    return t;
  }
  function effacerTirs(x, y, r) {
    for (var i = tirs.length - 1; i >= 0; i--) if (d2(tirs[i].x, tirs[i].y, x, y) < r * r) tirs.splice(i, 1);
  }

  /* ================================ armement et télégraphes ================================ */
  function peutArmer(e) {
    var m = (N.R && N.R.apparitions && N.R.apparitions.shownMarge) || 6;
    if (INV.on || e.etat === 'proie' || e.etat === 'fuite') return false;
    return !N.cam || N.cam.shown(e.x, e.y, m + e.r);
  }
  function armer(e, forme, total, cible) {
    e.tele = N.ids.suivant(); e.etat = 'arme'; e.etatT = 0; e._t0 = total;
    if (!e._td) e._td = { id: 0, forme: 'ligne', x0: 0, y0: 0, x1: 0, y1: 0, r: 0, a0: 0, a1: 0, reste: 0, total: 0, cible: 'tete', par: { type: e.type, id: e.id } };
    e._td.id = e.tele; e._td.forme = forme; e._td.total = total; e._td.cible = cible || 'tete'; e._td.par.type = e.type; e._td.par.id = e.id;
    if (N.ev) N.ev.emit('arme', { id: e.id, type: e.type, forme: forme, total: total, cible: cible || 'tete', shown: true, rallonge: false });
  }
  function teleLigne(e, x0, y0, a, len, w, reste) {
    var d = e._td; if (!d || !N.fx || !N.fx.tele) return;
    d.x0 = x0; d.y0 = y0; d.x1 = x0 + Math.cos(a) * len; d.y1 = y0 + Math.sin(a) * len; d.r = w; d.a0 = 0; d.a1 = 0; d.reste = reste;
    N.fx.tele(d);
  }
  function teleDisque(e, r, reste) {
    var d = e._td; if (!d || !N.fx || !N.fx.tele) return;
    d.x0 = e.x; d.y0 = e.y; d.x1 = e.x; d.y1 = e.y; d.r = r; d.a0 = 0; d.a1 = 0; d.reste = reste;
    N.fx.tele(d);
  }
  function finAttaque(e) { e.tele = -1; e.etat = 'approche'; e.etatT = 0; }

  /* ================================ comportements (repris de la démo) ================================ */
  var charges = 0;
  function maxCharges() {
    var s = N.S && N.S.vague, sct = N.R && N.R.secteurs && N.R.secteurs[0], v = s && sct && sct.vagues[(s.n | 0) - 1];
    return (v && v.chargesFleches) || 2;
  }
  function tirsPermis() {
    var s = N.S && N.S.vague, sct = N.R && N.R.secteurs && N.R.secteurs[0], v = s && sct && sct.vagues[(s.n | 0) - 1];
    return v ? !!v.tirsEnnemis : true;
  }
  function updFleche(e, dt, p) {
    var F = RE().fleche || {}, sp0 = (F.approche ? F.approche[0] : 50), bond = F.bond || { vitesse: 160, duree: 0.42, longueur: 67 };
    if (e._st === 'chasse') {
      var lx = p.x + Math.cos(p.ang) * (p.vit || 68) * 0.25, ly = p.y + Math.sin(p.ang) * (p.vit || 68) * 0.25;
      e.ang = turnTo(e.ang, Math.atan2(ly - e.y, lx - e.x), 2.6 * dt);
      e.vx = Math.cos(e.ang) * sp0; e.vy = Math.sin(e.ang) * sp0;
      e._cd -= dt;
      var dd = d2(e.x, e.y, p.x, p.y), dist = F.distance || [40, 110];
      if (e._cd <= 0 && dd < dist[1] * dist[1] && dd > dist[0] * dist[0] && charges < maxCharges() && peutArmer(e)) {
        charges++; e._st = 'vise'; e._aim = Math.atan2(p.y - e.y, p.x - e.x); armer(e, 'ligne', F.fige || 0.6, 'tete');
      }
    } else if (e._st === 'vise') {
      e.vx = e.vy = 0; e.ang = e._aim;
      teleLigne(e, e.x, e.y, e._aim, bond.longueur, 2, (F.fige || 0.6) - e.etatT);
      if (e.etatT >= (F.fige || 0.6)) { e._st = 'fonce'; e.etat = 'attaque'; e.etatT = 0; }
    } else if (e._st === 'fonce') {
      e.vx = Math.cos(e._aim) * bond.vitesse; e.vy = Math.sin(e._aim) * bond.vitesse;
      teleLigne(e, e.x, e.y, e._aim, Math.max(0, bond.longueur - bond.vitesse * e.etatT), 2, -e.etatT);
      if (e.etatT >= bond.duree) { e._st = 'chasse'; finAttaque(e); e.etat = 'recup'; e._cd = (F.recharge || 1.6) + rng().r(1.5, 3.5); e.ang = e._aim; }
    }
    if (e.etat === 'recup' && e.etatT > 0.6) e.etat = 'approche';
  }
  function updMine(e, dt, p) {
    var M = RE().mine || { cercle: 34, meche: 0.8, souffle: 30, derive: 4 };
    e._spin += dt * (e.etat === 'arme' ? 9 : 1.6);
    e.vx = e.vy = 0;
    if (e._st === 'derive') {
      var dx = e._tx - e.x, dy = e._ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { e._st = 'pose'; e._life = 15; } else { e.vx = dx / d * 16; e.vy = dy / d * 16; }
    } else if (e._st === 'pose') {
      e._life -= dt;
      if (e._life <= 0 && peutArmer(e)) { e._st = 'meche'; armer(e, 'disque', M.meche, 'tout'); }
    } else if (e._st === 'meche') {
      teleDisque(e, M.souffle, M.meche - e.etatT);
      if (e.etatT >= M.meche) { exploser(e, M.souffle); return; }
    }
    if (e._st !== 'meche' && vivante(p) && d2(e.x, e.y, p.x, p.y) < M.cercle * M.cercle && peutArmer(e)) { e._st = 'meche'; armer(e, 'disque', M.meche, 'tout'); }
  }
  function exploser(e, r) {
    var p = tete(), s = src(e);
    if (N.fx && N.fx.boom) N.fx.boom(e.x, e.y, 0.5, I('magenta'));
    if (vivante(p) && N.joueuse) {
      if (d2(e.x, e.y, p.x, p.y) < (r + 3) * (r + 3)) N.joueuse.tuer('souffle', s);
      else { var h = N.joueuse.hitTest(e.x, e.y, r); if (h.part && h.k > 0) { s._cause = 'souffle'; N.joueuse.couper(h.k, s); } }
    }
    e.pv = 0; e.etat = 'mort'; e.tele = -1;               // une mine qui saute d'elle-même ne rapporte rien
  }
  function updTourelle(e, dt, p) {
    var T = RE().tourelle || { vitesse: 35, vise: 0.75, balle: 95, portee: 160, tirs: 3 };
    var want = Math.atan2(p.y - e.y, p.x - e.x);
    e.vx = e.vy = 0;
    if (e._st === 'entre') {
      var dx = e._tx - e.x, dy = e._ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { e._st = 'pose'; e._cd = 0.9; } else { e.vx = dx / d * T.vitesse; e.vy = dy / d * T.vitesse; }
      e._aim = turnTo(e._aim, want, 3 * dt);
    } else if (e._st === 'pose') {
      e._aim = turnTo(e._aim, want, 3 * dt);
      e._cd -= dt;
      if (e._cd <= 0 && tirsPermis() && peutArmer(e) && d2(e.x, e.y, p.x, p.y) < T.portee * T.portee) { e._st = 'vise'; e._aim = want; armer(e, 'ligne', T.vise, 'tout'); }
    } else if (e._st === 'vise') {
      teleLigne(e, e.x, e.y, e._aim, Math.min(T.portee, 66), 2, T.vise - e.etatT);
      if (e.etatT >= T.vise) {
        tir(e.x + Math.cos(e._aim) * 7, e.y + Math.sin(e._aim) * 7, Math.cos(e._aim) * T.balle, Math.sin(e._aim) * T.balle, { src: src(e) });
        e._shots++; finAttaque(e); e.etat = 'recup';
        if (e._shots >= T.tirs) { e._shots = 0; e._st = 'entre'; station(e, 24); } else { e._st = 'pose'; e._cd = rng().r(2.2, 3.2); }
      }
    }
    e.ang = e._aim;
    if (e.etat === 'recup' && e.etatT > 0.3) e.etat = 'approche';
  }
  function updSentinelle(e, dt, p) {
    var Se = RE().sentinelle || { orbite: 80, vise: 0.85, laser: 0.35, longueur: 300, recharge: 3 };
    e.vx = e.vy = 0;
    if (e._st === 'orbite') {
      e._orb += 0.45 * dt * e._sens;
      var tx = p.x + Math.cos(e._orb) * Se.orbite, ty = p.y + Math.sin(e._orb) * Se.orbite;
      var dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) { var v = Math.min(d / dt, 36); e.vx = dx / d * v; e.vy = dy / d * v; }
      e.ang = Math.atan2(p.y - e.y, p.x - e.x);
      e._cd -= dt;
      if (e._cd <= 0 && tirsPermis() && peutArmer(e)) { e._st = 'vise'; e._aim = Math.atan2(p.y - e.y, p.x - e.x); armer(e, 'ligne', Se.vise, 'tout'); }
    } else if (e._st === 'vise') {
      teleLigne(e, e.x, e.y, e._aim, Se.longueur, 2, Se.vise - e.etatT);
      if (e.etatT >= Se.vise) { e._st = 'tire'; e.etat = 'attaque'; e.etatT = 0; BEAMS.push({ e: e, a: e._aim, t: 0, d: Se.laser, w: 3, len: Se.longueur }); }
    } else if (e._st === 'tire') {
      teleLigne(e, e.x, e.y, e._aim, Se.longueur, 2, -e.etatT);
      if (e.etatT >= Se.laser) { e._st = 'orbite'; finAttaque(e); e.etat = 'recup'; e._cd = (Se.recharge || 3) + rng().r(1.5, 3.5); }
    }
    if (e.etat === 'recup' && e.etatT > 0.3) e.etat = 'approche';
  }
  /* le repli commun des types que la démo n'avait pas : approcher la tête */
  function updGenerique(e, dt, p) {
    var c = RE()[e.type] || {}, v = c.croisiere || c.approche || c.zigzag || c.vitesse || 40;
    if (e.type === 'rival' || e.type === 'traqueur') v = (p.vit || 68) * (c.vitesse || 0.9);
    if (e.type === 'planeur') {
      e._life -= dt; e.vx = Math.cos(e._aim) * 70; e.vy = Math.sin(e._aim) * 70; e.ang = e._aim;
      if (e._life <= 0) e.etat = 'fuite';
      return;
    }
    if (typeof v !== 'number') v = 40;
    var want = Math.atan2(p.y - e.y, p.x - e.x);
    e.ang = turnTo(e.ang, want, 2.2 * dt);
    e.vx = Math.cos(e.ang) * v; e.vy = Math.sin(e.ang) * v;
  }

  /* ================================ le pas ================================ */
  function update(dt) {
    compacter();
    if (!(dt > 0)) return;
    var p = tete(), i, e, mods = 0;
    charges = 0;
    for (i = 0; i < list.length; i++) if (list[i].type === 'fleche' && (list[i]._st === 'vise' || list[i]._st === 'fonce')) charges++;
    if (INV.on) { INV.reste -= dt; if (INV.reste <= 0) finInversion(); }
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.etat === 'mort') continue;
      e.etatT += dt; e._age += dt;
      e.img = ((e._age * 6) | 0) & 7;
      if (e.boss) { vu(e, dt); continue; }                    // les parties du CYCLOPE : 73-colosse.js
      if (!p) { vu(e, dt); continue; }
      if (e.etat === 'proie') {
        var a = Math.atan2(e.y - p.y, e.x - p.x), vf = (p.vit || 68) * ((N.R && N.R.inversion && N.R.inversion.fuite) || 0.8);
        e.vx = Math.cos(a) * vf; e.vy = Math.sin(a) * vf; e.ang = a;
      } else if (e.etat === 'fuite') {
        var w = N.world, cx = w ? (w.x0 + w.x1) / 2 : 512, cy = w ? (w.y0 + w.y1) / 2 : 256, af = Math.atan2(e.y - cy, e.x - cx);
        e.vx = Math.cos(af) * 90; e.vy = Math.sin(af) * 90;
      } else if (e.type === 'fleche') updFleche(e, dt, p);
      else if (e.type === 'mine') updMine(e, dt, p);
      else if (e.type === 'tourelle') updTourelle(e, dt, p);
      else if (e.type === 'sentinelle') updSentinelle(e, dt, p);
      else updGenerique(e, dt, p);
      if (e.etat === 'mort') continue;
      if (e.mods.rapide) mods = 1.3; else mods = 1;
      if (e._kx || e._ky) { e.x += e._kx * dt; e.y += e._ky * dt; var f = Math.pow(0.02, dt); e._kx *= f; e._ky *= f; if (Math.abs(e._kx) + Math.abs(e._ky) < 2) { e._kx = 0; e._ky = 0; } }
      e.x += e.vx * dt * mods; e.y += e.vy * dt * mods;
      e.dir = dir16(e.ang);
      if (e.etat === 'fuite' && N.world && (e.x < N.world.x0 - 40 || e.x > N.world.x1 + 40 || e.y < N.world.y0 - 40 || e.y > N.world.y1 + 40)) { e.etat = 'mort'; continue; }
      vu(e, dt);
      contact(e, p);
    }
    /* les flèches ne s'empilent pas (repris de la démo) */
    for (i = 0; i < list.length; i++) {
      var A = list[i]; if (A.type !== 'fleche' || A.etat === 'mort') continue;
      for (var j = i + 1; j < list.length; j++) {
        var B = list[j]; if (B.type !== 'fleche' || B.etat === 'mort') continue;
        var dd = d2(A.x, A.y, B.x, B.y);
        if (dd < 81 && dd > 0.01) { var dn = Math.sqrt(dd), push = (9 - dn) * 0.5 / dn, px = (A.x - B.x) * push, py = (A.y - B.y) * push; A.x += px; A.y += py; B.x -= px; B.y -= py; }
      }
    }
    updTirs(dt, p);
    updBeams(dt, p);
    if (PURGE.length) {
      purgeT -= dt;
      var pas = (N.R && N.R.colosse && N.R.colosse.mort.purge) || 0.045;
      while (PURGE.length && purgeT <= 0) { var q = PURGE.shift(); if (q.etat !== 'mort') tuerE(q, { genre: 'decor', type: 'purge', id: null }); purgeT += pas; }
    }
  }
  function vu(e, dt) {
    if (N.cam && N.cam.shown(e.x, e.y, e.r)) e.vuDepuis = e.vuDepuis < 0 ? 0 : e.vuDepuis + dt; else e.vuDepuis = -1;
  }
  function contact(e, p) {
    if (!vivante(p) || !N.joueuse || e.type === 'planeur' || e.etat === 'fuite') return;
    var f = (N.R && N.R.mort && N.R.mort.ennemi && N.R.mort.ennemi.facteurRayon) || 0.8, rt = (N.R && N.R.mort && N.R.mort.rayonTete) || 3;
    var rr = e.r * f + rt;
    if (d2(e.x, e.y, p.x, p.y) >= rr * rr) return;
    if (e.etat === 'proie') { devorer(e); return; }
    if (N.joueuse.tuer('ennemi', src(e))) return;
    var d = Math.sqrt(d2(e.x, e.y, p.x, p.y)) || 1; e._kx = (e.x - p.x) / d * 120; e._ky = (e.y - p.y) / d * 120;   // protégée : il recule
  }
  function updTirs(dt, p) {
    var w = N.world;
    for (var i = tirs.length - 1; i >= 0; i--) {
      var b = tirs[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.vie -= dt;
      if (b.vie <= 0 || (w && (b.x < w.x0 - 8 || b.x > w.x1 + 8 || b.y < w.y0 - 8 || b.y > w.y1 + 8))) { tirs.splice(i, 1); continue; }
      if (!vivante(p) || !N.joueuse) continue;
      var h = N.joueuse.hitTest(b.x, b.y, b.r);
      if (h.part === 'tete') { if (N.joueuse.tuer('tir', b.src)) { tirs.splice(i, 1); continue; } }
      else if (h.part) { var s = b.src; s._cause = 'tir'; if (N.joueuse.couper(h.k, s)) { tirs.splice(i, 1); continue; } }
    }
  }
  function updBeams(dt, p) {
    for (var i = BEAMS.length - 1; i >= 0; i--) {
      var b = BEAMS[i];
      b.t += dt;
      if (b.t >= b.d || b.e.etat === 'mort') { BEAMS.splice(i, 1); continue; }
      if (!vivante(p) || !N.joueuse) continue;
      var x1 = b.e.x + Math.cos(b.a) * b.len, y1 = b.e.y + Math.sin(b.a) * b.len, hw = b.w / 2 + 3;
      if (segDist2(p.x, p.y, b.e.x, b.e.y, x1, y1) < hw * hw) N.joueuse.tuer('laser', src(b.e));
    }
  }
  function compacter() {
    var j = 0;
    for (var i = 0; i < list.length; i++) if (list[i].etat !== 'mort') list[j++] = list[i];
    list.length = j;
  }

  /* ================================ l'INVERSION ================================ */
  function inverser(dur) {
    INV.on = true; INV.reste = dur > 0 ? dur : 5; INV.dur = INV.reste;
    for (var i = 0; i < list.length; i++) { var e = list[i]; if (!e.boss && e.type !== 'traqueur' && e.etat !== 'mort') { e.etat = 'proie'; e.tele = -1; e._st = e.type === 'fleche' ? 'chasse' : e._st; } }
    tirs.length = 0; BEAMS.length = 0;
    if (N.ev) N.ev.emit('inversion', { evt: 'debut', dur: INV.dur });
  }
  function finInversion() {
    INV.on = false;
    for (var i = 0; i < list.length; i++) if (list[i].etat === 'proie') { list[i].etat = 'approche'; list[i].etatT = 0; }
    if (N.ev) N.ev.emit('inversion', { evt: 'fin', dur: INV.dur });
  }

  /* ================================ requêtes ================================ */
  function dedans(poly, x, y) {
    var c = false, n = poly.length / 2;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = poly[2 * i], yi = poly[2 * i + 1], xj = poly[2 * j], yj = poly[2 * j + 1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) c = !c;
    }
    return c;
  }
  function dans(poly) { TMP.length = 0; if (poly && poly.length >= 6) for (var i = 0; i < list.length; i++) if (list[i].etat !== 'mort' && dedans(poly, list[i].x, list[i].y)) TMP.push(list[i]); return TMP; }
  function pres(x, y, r) { TMP2.length = 0; for (var i = 0; i < list.length; i++) { var e = list[i]; if (e.etat !== 'mort' && d2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) TMP2.push(e); } return TMP2; }
  function count() { var n = 0; for (var i = 0; i < list.length; i++) if (list[i].etat !== 'mort') n++; return n; }

  /* ================================ dessin ================================ */
  var INNER = typeof Map !== 'undefined' ? new Map() : null, NP = -1;
  function inner(s) {                                       // le flash garde le contour de nuit profonde (démo)
    if (!INNER) return s;
    var o = INNER.get(s);
    if (!o) {
      o = { w: s.w, h: s.h, data: new Uint8Array(s.data.length), cx: s.cx, cy: s.cy };
      for (var i = 0; i < s.data.length; i++) o.data[i] = s.data[i] === NP ? 0 : s.data[i];
      INNER.set(s, o); if (INNER.size > 600) INNER.clear();
    }
    return o;
  }
  var OPT = { ci: 0 };
  function nomSprite(e) {
    if (e.type === 'cyclope') return e.etat === 'arme' ? 'colosse:oeil' : 'colosse';
    if (e.type === 'fleche' && e._st === 'vise') return 'fleche:armee';
    if (e.type === 'mine' && e._st === 'meche') return 'mine:alerte';
    if (e.type === 'tourelle' && e._st === 'vise') return 'tourelle:charge';
    return e.type;
  }
  function draw() {
    var g = N.gfx; if (!g || !N.pal) return;
    if (NP < 0) NP = I('nuitProfonde');
    var i, e;
    if (g.owner) g.owner(5);
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.etat === 'mort' || (N.cam && !N.cam.visible(e.x, e.y, e.r + 30))) continue;
      var s = N.spr && N.spr.get ? N.spr.get(nomSprite(e), e.dir, e.img) : null, x = e.x, y = e.y;
      if (e.type === 'fleche' && e._st === 'vise') x += (e.img & 1);           // elle tremble avant de foncer
      if (s && s.data && s.w > 0) {
        var cx = s.cx !== undefined ? s.cx : (s.w - 1) >> 1, cy = s.cy !== undefined ? s.cy : (s.h - 1) >> 1;
        if (e.etat === 'proie') { OPT.ci = I('ardoise'); g.blit(s, Math.round(x) - cx, Math.round(y) - cy, OPT); }
        else g.blit(s, Math.round(x) - cx, Math.round(y) - cy);
        if (N.fx && N.fx.isHit && N.fx.isHit(e.id)) { OPT.ci = I('os'); g.blit(inner(s), Math.round(x) - cx, Math.round(y) - cy, OPT); }
      } else {
        var rr = Math.max(2, Math.round(e.r));
        g.rect(x - rr - 1, y - rr - 1, 2 * rr + 3, 2 * rr + 3, NP);
        g.rect(x - rr, y - rr, 2 * rr + 1, 2 * rr + 1, e.etat === 'proie' ? I('ardoise') : I('magenta'));
        g.px(x, y, I('rosePale'));
      }
    }
    for (i = 0; i < BEAMS.length; i++) beamDraw(BEAMS[i]);
    for (i = 0; i < tirs.length; i++) {
      var b = tirs[i], st = N.spr && N.spr.get ? N.spr.get('tirEnnemi', 0, i) : null;
      if (st && st.data) g.blit(st, Math.round(b.x) - (st.w >> 1), Math.round(b.y) - (st.h >> 1));
      else { g.circ(b.x, b.y, b.r + 1, NP); g.circ(b.x, b.y, b.r, I('magenta')); }
    }
    if (g.owner) g.owner(0);
  }
  function beamDraw(b) {
    var g = N.gfx, c = Math.cos(b.a), s = Math.sin(b.a), nx = -s, ny = c, h = Math.floor(b.w / 2), k = b.t / b.d;
    for (var i = 9; i < b.len; i++) {
      var x = b.e.x + c * i, y = b.e.y + s * i;
      if (N.cam && !N.cam.visible(x, y, 4)) continue;
      g.px(x + nx * (h + 1), y + ny * (h + 1), NP); g.px(x - nx * (h + 1), y - ny * (h + 1), NP);
      for (var j = -h; j <= h; j++) g.px(x + nx * j, y + ny * j, j === 0 ? (k < 0.5 ? I('os') : I('rosePale')) : (Math.abs(j) < h ? I('rosePale') : I('magenta')));
    }
  }

  function abonner() {
    if (!N.ev) return;
    N.ev.on('ramassage', 10, function (c) {
      if (c.type !== 'pastille') return;
      var v = N.S && N.S.vague, D = N.R && N.R.inversion && N.R.inversion.duree;
      inverser((D && v && D[v.n]) || 5);
    }, QUI);
  }

  var ennemis = {
    reset: function () {
      list.length = 0; tirs.length = 0; BEAMS.length = 0; PURGE.length = 0; INV.on = false; INV.reste = 0; purgeT = 0;
      var s = N.S; if (s) { s.enemies = list; s.shots = tirs; }
      abonner();
    },
    update: update, draw: draw, spawn: spawn, list: list, count: count,
    hit: hit, zone: zone, devorer: devorer, dans: dans, pres: pres, tir: tir, tirs: tirs,
    effacerTirs: effacerTirs, inverser: inverser,
    fuir: function () { for (var i = 0; i < list.length; i++) if (!list[i].boss && list[i].etat !== 'mort') { list[i].etat = 'fuite'; list[i].tele = -1; } },
    purge: function (ordre) {
      var p = tete();
      PURGE.length = 0;
      for (var i = 0; i < list.length; i++) if (list[i].etat !== 'mort') PURGE.push(list[i]);
      if (p && ordre !== 'liste') PURGE.sort(function (a, b) { return d2(a.x, a.y, p.x, p.y) - d2(b.x, b.y, p.x, p.y); });
      purgeT = 0.25; tirs.length = 0; BEAMS.length = 0;
      return PURGE.length;
    }
  };
  N.ennemis = ennemis;
})();
