/* tools/L4a/harnais.js — le harnais de mesure du lot 4a, injecté dans la page d'essai par banc.mjs.
   Il ne change rien au jeu : il fait avancer la simulation pas à pas (la même suite d'appels que la boucle de
   90-boot.js et que dbg.simuler), conduit la tête par un script d'entrées à graine, et OBSERVE les ennemis à
   chaque pas : débuts et fins d'armement, télégraphes publiés, tirs, bonds, schémas. Code de banc : il peut
   tirer son propre hasard (graine du banc), il n'est jamais livré dans le jeu. */
(function () {
  'use strict';
  var N = window.__N, S = window.__S;
  var H = window.__L4A = {};

  function lcg(g) { var s = (g * 2654435761) >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  /* prépare une partie : graine, vague, directeur et arsenal muets (sauf demande), tête placée */
  H.prep = function (o) {
    o = o || {};
    if (!H.orig) H.orig = { dir: N.dir.update, arsenal: N.arsenal.update, joueuse: N.joueuse.update };
    N.dir.update = o.dir ? H.orig.dir : function () { };
    N.arsenal.update = o.arsenal ? H.orig.arsenal : function () { };
    N.joueuse.update = o.gel ? function () { } : H.orig.joueuse;
    N.game.reset(o.graine || 1, { depart: 'v' + (o.vague || 2), etat: 'jeu' });
    N.game.dbg.god(o.god !== false);
    N.ennemis.reset();
    if (N.journal) { N.journal.actif(true); N.journal.dump({ vider: true }); }
    var w = N.world;
    N.joueuse.reset({ x: o.x || (w.x0 + w.x1) / 2, y: o.y || (w.y0 + w.y1) / 2, ang: o.ang || 0, len: o.len || 14 });
    if (N.cam && N.cam.reset) N.cam.reset(S.player.x, S.player.y);
    H.rnd = lcg((o.graine || 1) * 7919 + 13);
    H.script = o.script || 'aleatoire'; H.cap = o.ang || 0; H.capVise = H.cap; H.tScript = 0;
    H.obs = {}; H.res = H.vide();
    H.inv = null; H.tues = {}; H.idsTirs = {};             // les identifiants repartent de 1 à chaque partie
    N.ev.on('kill', 95, function (c) { H.tues[c.id] = 1; }, 'banc-L4a-tues');
    return true;
  };
  H.vide = function () {
    return { pas: 0, armements: 0, armHorsVue: 0, attaques: [], annulees: 0, teleVus: 0, teleManques: 0, tirs: 0, tirsHorsVue: 0, tireurHorsVue: 0,
      bonds: [], schemas: 0, schemasFaux: 0, exSchema: [], maxEnnemis: 0, maxTirs: 0, armPendantInv: 0, tirsPendantInv: 0, morts: 0, coupes: 0 };
  };
  /* le script d'entrées de la tête : 'aleatoire' (cap tiré toutes les 0,6 s), 'cercle', 'droit', 'fige' */
  function conduire(dt) {
    var p = S.player, w = N.world;
    if (H.script === 'fige') return;
    H.tScript -= dt;
    if (H.script === 'cercle') H.capVise += 0.9 * dt;
    else if (H.script === 'aleatoire' && H.tScript <= 0) { H.tScript = 0.6; H.capVise = p.ang + (H.rnd() - 0.5) * 2.2; }
    /* rester loin des murs : la tête vise le centre quand elle approche d'un bord */
    var m = 70;
    if (p.x < w.x0 + m || p.x > w.x1 - m || p.y < w.y0 + m || p.y > w.y1 - m) H.capVise = Math.atan2((w.y0 + w.y1) / 2 - p.y, (w.x0 + w.x1) / 2 - p.x);
    N.game.dbg.input({ x: Math.cos(H.capVise), y: Math.sin(H.capVise), mag: 1, boost: false });
  }
  /* un pas de simulation, puis l'observation */
  H.pas = function () {
    var dt0 = N.horloge.H || 1 / 120;
    conduire(dt0);
    var dt = N.horloge.avancer();
    S.t = N.horloge.t(); S.dt = dt;
    var nTirs = N.ennemis.tirs.length, ids = H.idsTirs || (H.idsTirs = {});
    N.game.update(dt); N.fx.update(dt); N.cam.update(dt);
    observer(nTirs);
    H.res.pas++;
  };
  H.courir = function (sec) { var n = Math.round(sec * 120); for (var i = 0; i < n; i++) H.pas(); return H.res; };
  function teleDe(id) { var L = S.tele || []; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function observer() {
    var t = N.horloge.t(), L = N.ennemis.list, cam = N.cam, R = H.res, inv = N.ennemis.inversion && N.ennemis.inversion();
    if (L.length > R.maxEnnemis) R.maxEnnemis = L.length;
    if (N.ennemis.tirs.length > R.maxTirs) R.maxTirs = N.ennemis.tirs.length;
    for (var i = 0; i < L.length; i++) {
      var e = L[i], o = H.obs[e.id];
      if (!o) o = H.obs[e.id] = { type: e.type, prec: e.etat, armT: -1, x0: 0, y0: 0, lig: 0, rapide: e.mods.rapide, tirs: 0, st: e._st };
      /* le schéma, à chaque pas */
      var er = N.ids.valider('ennemi', e); R.schemas++; if (er.length) { R.schemasFaux++; if (R.exSchema.length < 5) R.exSchema.push(e.type + ':' + er.join(';')); }
      if (e.etat === 'arme' && o.prec !== 'arme') {
        R.armements++; o.armT = t; o.x0 = e.x; o.y0 = e.y; o.tele = e.tele; o.premier = true;
        if (cam && !cam.shown(e.x, e.y, e.r + 6)) R.armHorsVue++;
        if (inv) R.armPendantInv++;
        if (e.type === 'fleche' && e._td) o.lig = Math.sqrt(Math.pow(e._td.x1 - e._td.x0, 2) + Math.pow(e._td.y1 - e._td.y0, 2));
      } else if (e.etat === 'arme') {
        /* le télégraphe est publié à chaque pas de l'armement (S.tele : celui du pas précédent) */
        if (teleDe(e.tele)) R.teleVus++; else if (!o.premier) { R.teleManques++; (R.exManques || (R.exManques = [])).length < 8 && R.exManques.push(e.type + '/' + e._st + ' reste=' + e._reste.toFixed(3) + ' vu=' + e._armeVu + ' nTele=' + (S.tele || []).length); }
        o.premier = false;
        if (e.type === 'fleche' && e._td) o.lig = Math.sqrt(Math.pow(e._td.x1 - e._td.x0, 2) + Math.pow(e._td.y1 - e._td.y0, 2));
      }
      if (o.prec === 'arme' && e.etat !== 'arme') {
        var d = t - o.armT, frappe = e.etat === 'attaque' || (e.type === 'tourelle' && e.etat === 'recup') || (e.type === 'mine' && e.etat === 'mort' && !H.tues[e.id]);
        if (frappe) {
          R.attaques.push({ type: e.type, d: Math.round(d * 1000) / 1000, rapide: e.mods.rapide });
          if (cam && !cam.shown(e.x, e.y, e.r + 6)) R.tireurHorsVue++;
          if (e.type === 'fleche') { o.bondX = e.x; o.bondY = e.y; o.ligBond = o.lig; }
        } else R.annulees++;
      }
      /* la fin du bond de la flèche : la distance parcourue contre la ligne montrée */
      if (e.type === 'fleche' && o.prec === 'attaque' && e.etat !== 'attaque' && e.etat !== 'mort' && o.bondX !== undefined) {   // un bond interrompu par la mort n'est pas un bond
        R.bonds.push({ ligne: Math.round(o.ligBond * 10) / 10, bond: Math.round(Math.sqrt(Math.pow(e.x - o.bondX, 2) + Math.pow(e.y - o.bondY, 2)) * 10) / 10, etat: e.etat, st: e._st, fait: Math.round(e._fait * 10) / 10, len: Math.round(e._len * 10) / 10, mort: e.etat === 'mort' });
        o.bondX = undefined;
      }
      o.prec = e.etat;
    }
    /* les tirs : chaque nouveau tir naît dans la vue, d'un tireur sous les yeux */
    var T = N.ennemis.tirs;
    for (var k = 0; k < T.length; k++) {
      var b = T[k], erb = N.ids.valider('tir', b); R.schemas++; if (erb.length) { R.schemasFaux++; if (R.exSchema.length < 5) R.exSchema.push('tir:' + erb.join(';')); }
      if (!H.idsTirs[b.id]) { H.idsTirs[b.id] = 1; R.tirs++; if (cam && !cam.visible(b.x, b.y, 0)) R.tirsHorsVue++; if (inv) R.tirsPendantInv++; }
    }
  }

  /* ---- les essais ponctuels ---- */
  /* la tourelle : 100 tirs du canon, d'origines tirées tout autour ; ceux de ± 45° autour de la face ricochent */
  H.blindage = function (graine) {
    H.prep({ graine: graine, script: 'fige' });
    var p = S.player, e = N.ennemis.spawn('tourelle', p.x + 80, p.y, { etat: 'approche' }), rnd = lcg(graine), r = { face: 0, ricochetsFace: 0, cote: 0, ricochetsCote: 0 };
    for (var k = 0; k < 100; k++) {
      e.pv = e.pvMax; e.etat = 'approche'; e.ang = rnd() * Math.PI * 2;
      var a = rnd() * Math.PI * 2, src = { genre: 'arme', type: 'canon', id: -1, _x: e.x + Math.cos(a) * 40, _y: e.y + Math.sin(a) * 40 };
      var dA = Math.abs(Math.atan2(Math.sin(a - e.ang), Math.cos(a - e.ang))) * 180 / Math.PI;
      if (Math.abs(dA - 45) < 0.5) continue;                     // la frontière exacte n'est pas un test
      var pv0 = e.pv; N.ennemis.hit(e, 1, src); var ric = e.pv === pv0;
      if (dA < 45) { r.face++; if (ric) r.ricochetsFace++; } else { r.cote++; if (ric) r.ricochetsCote++; }
    }
    return r;
  };
  /* la flèche dans l'axe du canon, à moins de 60 px, sans charger : elle esquive */
  H.esquive = function (graine) {
    H.prep({ graine: graine, script: 'droit', ang: 0 });
    var p = S.player, e = N.ennemis.spawn('fleche', p.x + 50, p.y + (lcg(graine)() - 0.5) * 8, { etat: 'approche' });
    e._cd = 9; var st0 = N.ennemis.stats.esquives, x0 = e.x, y0 = e.y, vu = false;
    for (var k = 0; k < 40 && !vu; k++) { H.pas(); if (e._st === 'esquive') vu = true; }
    return { esquive: vu, compteur: N.ennemis.stats.esquives - st0, deport: Math.round(Math.abs(e.y - y0)) };
  };
  /* la mine : abattue sous la tête, elle saute sans blesser ; armée, son disque tue au bord exact */
  H.mineAbattue = function (graine) {
    H.prep({ graine: graine, script: 'fige', god: false });
    var p = S.player, m = N.ennemis.spawn('mine', p.x + 12, p.y + 4, { etat: 'approche' });
    var len0 = p.len;
    N.ennemis.hit(m, 999, { genre: 'arme', type: 'canon', id: -1 });
    H.courir(0.5);
    return { vivante: S.player.etat === 'vivant', coupee: S.player.len < len0 };
  };
  H.mineDisque = function (graine, dist) {
    H.prep({ graine: graine, script: 'fige', god: false, len: 4 });
    N.joueuse.update = function () { };                      // la tête ne bouge plus : on pose la mine à la distance voulue
    var p = S.player, m = N.ennemis.spawn('mine', p.x + dist, p.y, { etat: 'approche' }), R = N.R.ennemis.mine;
    m._tx = m.x; m._ty = m.y;
    /* la mine s'arme (la tête est dans son cercle) ; on mesure le rayon publié, puis l'issue */
    var rTele = null;
    for (var k = 0; k < 140 && m.etat !== 'mort'; k++) { H.pas(); var tl = teleDe(m.tele); if (tl) rTele = tl.r; }
    return { dist: dist, rTele: rTele, souffle: R.souffle, morte: S.player.etat === 'mort', cause: S.death && S.death.cause };
  };
  /* la chaîne : une mine abattue emporte ses voisines (comptées pour la joueuse), sans la blesser */
  H.chaine = function (graine) {
    H.prep({ graine: graine, script: 'fige', god: false });
    var p = S.player, kills = 0, src = [];
    N.ev.on('kill', 95, function (c) { kills++; src.push(c.src.genre + '/' + c.src.type); }, 'banc-L4a');
    var a = N.ennemis.spawn('mine', p.x + 60, p.y, { etat: 'approche' }); N.ennemis.spawn('mine', p.x + 80, p.y + 10, { etat: 'approche' }); N.ennemis.spawn('mine', p.x + 100, p.y - 5, { etat: 'approche' });
    N.ennemis.hit(a, 999, { genre: 'arme', type: 'canon', id: -1 });
    H.courir(0.8);
    N.ev.off('kill', 'banc-L4a');
    return { kills: kills, sources: src, vivante: S.player.etat === 'vivant' };
  };
  /* le TRAQUEUR : invulnérable aux armes, mort au LASSO, dévorable, en fuite à la fin de la vague */
  H.traqueur = function (graine) {
    H.prep({ graine: graine, script: 'aleatoire' });
    var p = S.player, r = {};
    var t = N.ennemis.spawn('traqueur', p.x - 90, p.y, {}); H.courir(0.8);
    var pv0 = t.pv; r.armes = ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ', 'apogee', 'grappe', 'eperon'].every(function (a) { N.ennemis.hit(t, 999, { genre: 'arme', type: a, id: -1 }); return t.etat !== 'mort' && t.pv === pv0; });
    var base = null; N.ev.on('kill', 95, function (c) { if (c.id === t.id) base = c.base; }, 'banc-L4a');
    N.ennemis.hit(t, 40 + 4 * 14, { genre: 'arme', type: 'lasso', id: -1 }); r.lasso = t.etat === 'mort'; r.baseLasso = base;
    var t2 = N.ennemis.spawn('traqueur', p.x + 60, p.y, { etat: 'approche' }); base = null;
    N.ev.off('kill', 'banc-L4a'); N.ev.on('kill', 95, function (c) { if (c.id === t2.id) base = c.base; }, 'banc-L4a');
    N.ennemis.inverser(5); r.proie = t2.etat === 'proie';
    N.ennemis.devorer(t2); r.devore = t2.etat === 'mort'; r.baseDevore = base;
    N.ev.off('kill', 'banc-L4a');
    var t3 = N.ennemis.spawn('traqueur', p.x + 70, p.y + 20, { etat: 'approche' });
    N.ennemis.purge('distance'); r.fuitALaPurge = t3.etat === 'fuite';
    H.courir(2.5); r.parti = N.ennemis.list.indexOf(t3) < 0 || t3.etat === 'mort';
    /* la vitesse : 0,95 fois la croisière de la tête, sur 2 s de poursuite en ligne droite */
    H.prep({ graine: graine, script: 'droit', ang: 0 });
    var t4 = N.ennemis.spawn('traqueur', S.player.x - 60, S.player.y, { etat: 'approche' }); H.courir(0.3);
    var x0 = t4.x, px0 = S.player.x; H.courir(2);
    r.rapport = Math.round((t4.x - x0) / (S.player.x - px0) * 1000) / 1000;
    return r;
  };
  /* l'INVERSION : proies en une image, plus de tirs, plus d'attaques, plus de dégâts ; points dévorés ; la fin */
  H.inversion = function (graine) {
    H.prep({ graine: graine, script: 'aleatoire', god: false });
    var p = S.player, types = ['fleche', 'dard', 'larve', 'mine', 'tourelle', 'sentinelle', 'traqueur'], rnd = lcg(graine);
    for (var k = 0; k < 14; k++) { var a = rnd() * 6.283, d = 70 + rnd() * 60; N.ennemis.spawn(types[k % types.length], p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6, {}); }
    N.game.dbg.god(true); H.courir(2.5); N.game.dbg.god(false);
    var tirs0 = N.ennemis.tirs.length, ordinaires = 0;
    N.ennemis.inverser(5);
    var L = N.ennemis.list, proies = 0;
    for (var i = 0; i < L.length; i++) if (L[i].etat !== 'mort') { ordinaires++; if (L[i].etat === 'proie') proies++; }
    var r = { ordinaires: ordinaires, proies: proies, tirsAvant: tirs0, tirsApres: N.ennemis.tirs.length, teleApres: 0 };
    H.res = H.vide();
    /* pendant : aucune attaque commencée ; la tête au contact les dévore (on la pose sur cinq proies) */
    var bases = []; N.ev.on('kill', 95, function (c) { if (c.src && c.src.type === 'devore') bases.push(c.base); }, 'banc-L4a');
    H.pas(); r.teleApres = (S.tele || []).filter(function (t) { return t.par && t.par.type !== 'cyclope'; }).length;
    var vivante = true;
    for (var j = 0; j < 5; j++) {
      var cible = null; for (i = 0; i < L.length; i++) if (L[i].etat === 'proie' && L[i].type !== 'traqueur') { cible = L[i]; break; }
      if (!cible) break;
      N.joueuse.reset({ x: cible.x - Math.cos(cible.ang) * 2, y: cible.y - Math.sin(cible.ang) * 2, ang: cible.ang, len: 14 });
      for (var g = 0; g < 30 && cible.etat !== 'mort'; g++) { H.pas(); if (S.player.etat !== 'vivant') vivante = false; }   // un gel (hitstop) peut suivre la proie précédente
    }
    /* et le reste du temps, la tête traverse le groupe : 0 dégât */
    H.script = 'aleatoire';
    for (var q = 0; q < 120 * 4; q++) { var inv = N.ennemis.inversion(); if (!inv) break; H.pas(); if (S.player.etat !== 'vivant') vivante = false; }
    N.ev.off('kill', 'banc-L4a');
    r.bases = bases; r.vivantePendant = vivante; r.armPendant = H.res.armPendantInv; r.tirsPendant = H.res.tirsPendantInv;
    return r;
  };
  /* la fin de l'INVERSION : une proie posée sur la tête reste inoffensive 0,5 s, puis redevient mortelle */
  H.finInversion = function (graine) {
    H.prep({ graine: graine, script: 'fige', god: false });
    var e = N.ennemis.spawn('fleche', S.player.x + 20, S.player.y, { etat: 'approche' });
    N.ennemis.inverser(0.3);
    var tFin = -1, tMort = -1;
    for (var k = 0; k < 240; k++) {
      var pendant = !!N.ennemis.inversion(), p = S.player;
      /* pendant : à 20 px de la tête (sans la toucher) ; après : posée sur elle */
      if (pendant) { e.x = p.x + Math.cos(p.ang) * 20; e.y = p.y + Math.sin(p.ang) * 20; } else { e.x = p.x + Math.cos(p.ang) * 2; e.y = p.y + Math.sin(p.ang) * 2; }
      H.pas();
      if (pendant && !N.ennemis.inversion() && tFin < 0) tFin = N.horloge.t();
      if (S.player.etat === 'mort') { tMort = N.horloge.t(); break; }
    }
    return { delai: tMort >= 0 && tFin >= 0 ? Math.round((tMort - tFin) * 1000) / 1000 : null, cause: S.death && S.death.cause };
  };
  /* les plafonds : 40 ennemis, 80 tirs */
  H.plafonds = function (graine) {
    H.prep({ graine: graine, script: 'fige' });
    var p = S.player, n = 0, t = 0;
    for (var k = 0; k < 60; k++) if (N.ennemis.spawn('mine', p.x + 30 + (k % 10) * 20, p.y - 100 + ((k / 10) | 0) * 20, { etat: 'approche' })) n++;
    for (k = 0; k < 120; k++) if (N.ennemis.tir(p.x, p.y - 80, 10, 0, { vie: 30 })) t++;
    return { ennemis: n, compte: N.ennemis.count(), tirs: t, liste: N.ennemis.tirs.length };
  };
})();
