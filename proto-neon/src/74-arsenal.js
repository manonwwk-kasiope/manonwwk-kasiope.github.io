/* ===== 74-arsenal.js — N.arsenal : les armes de la joueuse, leurs tirs, la perte de palier =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaires : lots 3a (CANON) et 3b (les cinq autres). Le tir vient
   de la démo (70-game.js, réparti par le lot 0b) : il part seul vers l'avant à cadence fixe (J-10), un trait
   cyan à tête pâle par bouche. Ce qui change : la cadence, les dégâts, la portée et le nombre de bouches
   sont ceux du palier du CANON dans N.R.armes.canon.paliers, multipliés par N.cartes.mods (degats,
   cadence) ; un tir qui touche demande les dégâts à N.ennemis.hit, avec la source {genre:'arme',
   type:'canon'} : 'kill' est émis par 72-ennemis, jamais ici. Le palier RAYON (IV) est, dans le repli, un
   palier III plus fort. Les autres armes montent de palier (monter) sans tirer encore (lot 3b).
   Consommateurs : kill (50 : GRAPPE, repli inerte), mort (50 : perte d'un palier de la meilleure arme),
   carte (50 : une carte d'arme fait monter son palier). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '74-arsenal', MAX_TIRS = 160;

  function I(n) { return N.pal.i(n); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function dir16(a) { var k = Math.round(a / (Math.PI / 8)); return ((k % 16) + 16) % 16; }
  function paliers(arme) { var A = N.R && N.R.armes && N.R.armes[arme]; return (A && A.paliers) || null; }

  var NIV = { canon: 1, tourelles: 0, arc: 0, missiles: 0, drones: 0, minesQ: 0 };
  var tirs = [];
  var cd = 0.5, salve = 0, ARMES = [];
  var SRC = { genre: 'arme', type: 'canon', id: -1 };
  var DESC = { arme: null, de: 0, a: 0 };

  function palier() {
    var P = paliers('canon'), n = Math.max(1, Math.min(4, NIV.canon));
    if (!P) return { tirs: 1, cadence: 6.5, degats: 10, portee: 130, vitesse: 210 };
    var p = P[n - 1];
    if (p.continu) { var b = P[2]; return { tirs: 2, ecartAngle: b.ecartAngle, cadence: b.cadence, degats: p.degats, portee: p.portee, vitesse: b.vitesse }; }
    return p;
  }
  function tirer(x, y, a, p, mods) {
    if (tirs.length >= MAX_TIRS) return;
    var v = p.vitesse || 210;
    tirs.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: a, dmg: (p.degats || 10) * ((mods && mods.degats) || 1), vie: (p.portee || 130) / v, perce: p.perce || 1 });
  }

  function update(dt) {
    if (!(dt > 0)) return;
    var s = N.S, P = s && s.player, mods = N.cartes && N.cartes.mods, p = palier();
    /* les tirs en vol */
    var L = (N.ennemis && N.ennemis.list) || [], i, j, b, e;
    for (i = tirs.length - 1; i >= 0; i--) {
      b = tirs[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.vie -= dt;
      if (b.vie <= 0) { tirs.splice(i, 1); continue; }
      for (j = 0; j < L.length; j++) {
        e = L[j];
        if (e.etat === 'mort') continue;
        var rr = e.r + 1.5;
        if (d2(b.x, b.y, e.x, e.y) < rr * rr) {
          N.ennemis.hit(e, b.dmg, SRC);
          if (N.fx && N.fx.spark) N.fx.spark(b.x, b.y, -b.vx, -b.vy, 2, e.boss ? I('os') : I('rosePale'));
          if (--b.perce <= 0) { tirs.splice(i, 1); break; }
        }
      }
    }
    /* le tir automatique, vers l'avant */
    if (!P || P.etat === 'mort' || P.etat === 'absent') return;
    cd -= dt;
    if (cd > 0) return;
    var rate = (p.cadence || 6.5) * ((mods && mods.cadence) || 1);
    cd += 1 / rate; if (cd < 0) cd = 0;
    var a = P.ang, c = Math.cos(a), sn = Math.sin(a), hx = P.x + c * 6, hy = P.y + sn * 6;
    if ((p.tirs || 1) === 1) tirer(hx, hy, a, p, mods);
    else if (p.ecartAngle) { tirer(hx, hy, a - p.ecartAngle, p, mods); tirer(hx, hy, a + p.ecartAngle, p, mods); }
    else if (p.alterne) { var cote = (salve & 1) ? 1 : -1, e2 = p.ecartBouches || 2; tirer(hx - sn * e2 * cote, hy + c * e2 * cote, a, p, mods); }
    else { tirer(hx - sn * 2.5, hy + c * 2.5, a, p, mods); tirer(hx + sn * 2.5, hy - c * 2.5, a, p, mods); }
    salve++;
    if (N.music && N.music.sfx && !(s.reglages && s.reglages.effets === false)) N.music.sfx('tir', { pitch: salve % 5 });
  }

  function draw() {
    var g = N.gfx; if (!g || !N.pal) return;
    if (g.owner) g.owner(3);
    var f = N.S ? ((N.S.frame | 0) >> 2) : 0;
    for (var i = 0; i < tirs.length; i++) {
      var b = tirs[i];
      if (N.cam && !N.cam.visible(b.x, b.y, 4)) continue;
      var s = N.spr && N.spr.get ? N.spr.get(NIV.canon >= 3 ? 'lance' : 'tir', dir16(b.a), f) : null;
      if (s && s.data && s.w > 0) g.blit(s, Math.round(b.x) - (s.w >> 1), Math.round(b.y) - (s.h >> 1));
      else { g.px(b.x, b.y, I('cyanPale')); g.px(b.x - Math.cos(b.a), b.y - Math.sin(b.a), I('cyan')); g.px(b.x - 2 * Math.cos(b.a), b.y - 2 * Math.sin(b.a), I('cyan')); }
    }
    if (g.owner) g.owner(0);
  }

  function monter(arme) {
    if (!(arme in NIV)) return 0;
    NIV[arme] = Math.min(4, NIV[arme] + 1);
    return NIV[arme];
  }
  function descendre() {
    var best = null;
    for (var k in NIV) if (NIV[k] > 1 && (!best || NIV[k] > NIV[best])) best = k;
    DESC.arme = best; DESC.de = best ? NIV[best] : 0;
    if (best) NIV[best]--;
    DESC.a = best ? NIV[best] : 0;
    return DESC;
  }
  function abonner() {
    if (!N.ev) return;
    N.ev.on('kill', 50, function () { /* GRAPPE (mods.grappe) : lot 3b, par N.ennemis.zone */ }, QUI);
    N.ev.on('mort', 50, function () { descendre(); }, QUI);
    N.ev.on('carte', 50, function (c) { if (c.id in NIV) monter(c.id); }, QUI);
  }

  N.arsenal = {
    reset: function () {
      NIV.canon = 1; NIV.tourelles = 0; NIV.arc = 0; NIV.missiles = 0; NIV.drones = 0; NIV.minesQ = 0;
      tirs.length = 0; cd = 0.5; salve = 0;
      abonner();
    },
    update: update, draw: draw, monter: monter, descendre: descendre,
    niveau: function (arme) { return NIV[arme] | 0; },
    armes: function () { ARMES.length = 0; for (var k in NIV) if (NIV[k] > 0) ARMES.push({ id: k, niveau: NIV[k] }); return ARMES; },
    tirs: tirs
  };
})();
