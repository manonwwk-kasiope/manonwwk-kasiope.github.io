/* tools/mesure/sonde.js — la sonde injectée dans la page avant le jeu (addInitScript). Elle publie
   window.__MESURE, que les scripts de tools/mesure/criteres/ appellent par page.evaluate. Elle ne modifie
   pas le jeu : elle lit les crochets du contrat (__N, __S, __ERR, __FRAME, __N.game.dbg, __N.journal) et,
   quand un banc le demande, enveloppe une fonction publique pour l'observer (N.gfx.present par image,
   N.cam.update par pas, N.music.sfx, N.hud.banniere, N.spr.text) sans changer ce qu'elle fait.

   Codes de palette (DIRECTION.md) : 0 vide, 1 nuit, 2 ardoise, 3 violet, 4 indigo, 5 magenta, 6 rose pâle,
   7 cyan, 8 cyan pâle, 9 ambre, 10 jaune, 11 brasier, 12 os, 13 acier, 14 sang, 15 nuit profonde.
   Codes du masque (N.ids.proprietaires) : 0 aucun, 1 tête, 2 corps, 3 arsenal, 4 icônes de vie, 5 ennemi,
   6 butin, 7 effet, 8 décor, 9 HUD. */
(function () {
  'use strict';
  if (window.__MESURE) return;
  var M = {};
  window.__MESURE = M;

  /* ---- les couts d'image, mesurés autour de chaque rappel de requestAnimationFrame (R-20) ----
     Actif seulement si le banc a posé window.__MESURE_COUTS = true avant le chargement. */
  M.couts = new Float64Array(1 << 16); M.nCouts = 0;
  if (window.__MESURE_COUTS) {
    var raf = window.requestAnimationFrame.bind(window);
    var perf = window.performance;
    window.requestAnimationFrame = function (cb) {
      return raf(function (ts) {
        var t0 = perf.now();
        try { cb(ts); } finally { M.couts[M.nCouts++ & 0xffff] = perf.now() - t0; }
      });
    };
  }
  M.lireCouts = function (depuis) {
    var n = M.nCouts, a = Math.max(depuis || 0, n - 0xffff), out = [];
    for (var i = a; i < n; i++) out.push(M.couts[i & 0xffff]);
    return out;
  };

  /* ---- présence des interfaces ---- */
  function racine(nom) {
    if (nom === 'N') return window.__N;
    if (nom === 'S') return window.__S;
    return window[nom];
  }
  M.valeur = function (chemin) {
    var p = chemin.split('.'), o = racine(p[0]);
    for (var i = 1; i < p.length; i++) { if (o === null || o === undefined) return undefined; o = o[p[i]]; }
    return o;
  };
  M.existe = function (chemin) { var v = M.valeur(chemin); return v !== undefined && v !== null; };
  M.absents = function (liste) { return liste.filter(function (c) { return !M.existe(c); }); };

  /* ---- état ---- */
  M.vagueN = function () { var N = window.__N; try { var v = N.dir && N.dir.vague ? N.dir.vague() : 0; return v && typeof v === 'object' ? (v.n | 0) : (v | 0); } catch (e) { return 0; } };
  M.etat = function () { var g = window.__N && window.__N.game; try { return g && typeof g.etat === 'function' ? g.etat() : null; } catch (e) { return null; } };
  M.dbg = function () { var g = window.__N && window.__N.game; return g && g.dbg && (typeof g.dbg === 'object' || typeof g.dbg === 'function') ? g.dbg : null; };
  M.t = function () { var N = window.__N; try { return N && N.horloge ? N.horloge.t() : (window.__S ? window.__S.t : 0); } catch (e) { return 0; } };
  M.erreurs = function () { var E = window.__ERR; return E ? { count: E.count, sigs: Object.keys(E.sigs || {}).slice(0, 12) } : { count: -1, sigs: [] }; };

  /* ---- le tampon et le masque ---- */
  M.tampon = function () {
    var g = window.__N.gfx, b = g.buf();
    return { W: g.W, H: g.H, PX: g.PX, buf: b };
  };
  M.masque = function () {
    var d = M.dbg(), m = d && d.masque ? d.masque() : null;
    M.raisonMasque = null;
    if (!m) M.raisonMasque = 'N.game.dbg.masque() a rendu null';
    else if (m.length !== window.__N.gfx.W * window.__N.gfx.H) M.raisonMasque = 'masque de propriété de taille différente du tampon';
    else if (!m.some(function (v) { return v !== 0; })) M.raisonMasque = 'N.game.dbg.masque() ne publie aucun propriétaire (tous les codes à 0)';
    return M.raisonMasque ? null : m;
  };
  M.b64 = function (u8) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(s);
  };
  M.tamponB64 = function (avecMasque) {
    var t = M.tampon(), r = { W: t.W, H: t.H, PX: t.PX, buf: M.b64(t.buf) };
    if (avecMasque) { var m = M.masque(); r.masque = m ? M.b64(m) : null; }
    return r;
  };
  M.copie = function (u8) { return new Uint8Array(u8); };

  /* ---- l'analyse d'une image du tampon (index) et de son masque (codes) ----
     Rend les parts sur le tampon complet ; o.zone = {x0,y0,x1,y1} restreint au rectangle. */
  M.L = [0.002, 0.006, 0.012, 0.041, 0.024, 0.240, 0.438, 0.555, 0.873, 0.457, 0.679, 0.281, 0.967, 0.277, 0.061, 0.002];
  M.analyse = function (buf, W, H, masque, o) {
    o = o || {};
    var N = window.__N, L = (N && N.pal && N.pal.L) ? N.pal.L : M.L, seuil = (N && N.pal && N.pal.SEUIL_LUMINEUX) || 0.10;
    var z = o.zone || { x0: 0, y0: 0, x1: W, y1: H };
    var parIndex = new Array(16).fill(0), horsPalette = 0, total = 0, lum = 0, somL = 0;
    var cyanHors = 0, cyanHorsTeteCorps = 0, decor = 0, decorLum = 0, decorCyan = 0, decorMagenta = 0, parCode = new Array(16).fill(0);
    for (var y = z.y0; y < z.y1; y++) for (var x = z.x0; x < z.x1; x++) {
      var i = y * W + x, c = buf[i]; total++;
      if (c > 15) { horsPalette++; continue; }
      parIndex[c]++; somL += L[c]; if (L[c] > seuil) lum++;
      if (masque) {
        var m = masque[i]; parCode[m & 15]++;
        var cy = c === 7 || c === 8;
        if (cy && !(m >= 1 && m <= 4)) cyanHors++;
        if (cy && !(m === 1 || m === 2)) cyanHorsTeteCorps++;
        if (m === 8) { decor++; if (L[c] > seuil) decorLum++; if (cy) decorCyan++; if (c === 5 || c === 6) decorMagenta++; }
      }
    }
    return {
      total: total, horsPalette: horsPalette, parIndex: parIndex, lumineux: lum / total, moyenneL: somL / total,
      vide: parIndex[0] / total, brasier: parIndex[11] / total, cyan: (parIndex[7] + parIndex[8]) / total,
      masque: !!masque, parCode: masque ? parCode : null,
      cyanHorsMasque: masque ? cyanHors / total : null, cyanHorsTeteCorps: masque ? cyanHorsTeteCorps / total : null,
      decor: masque ? decor / total : null, decorLumineux: masque ? decorLum / total : null,
      decorCyan: masque ? decorCyan : null, decorMagenta: masque ? decorMagenta / total : null
    };
  };
  /* gaine des menaces : chaque pixel d'ennemi (code 5) au bord de sa forme doit être en nuit profonde (15) */
  M.gaine = function (buf, W, H, masque) {
    var bord = 0, gaine = 0;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x; if (masque[i] !== 5) continue;
      var auBord = x === 0 || y === 0 || x === W - 1 || y === H - 1 ||
        masque[i - 1] !== 5 || masque[i + 1] !== 5 || masque[i - W] !== 5 || masque[i + W] !== 5;
      if (!auBord) continue; bord++; if (buf[i] === 15) gaine++;
    }
    return { bord: bord, gaine: gaine, part: bord ? gaine / bord : null };
  };
  M.analyseCourante = function (o) {
    var t = M.tampon(), m = (o && o.masque === false) ? null : M.masque();
    var r = M.analyse(t.buf, t.W, t.H, m, o);
    r.raisonMasque = M.raisonMasque; r.W = t.W; r.H = t.H; r.PX = t.PX; r.etat = M.etat(); r.t = M.t(); r.image = window.__FRAME;
    if (m && o && o.gaine) r.gaine = M.gaine(t.buf, t.W, t.H, m);
    return r;
  };
  M.diffPart = function (a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n / a.length; };

  /* ---- les observateurs : par image (après le dessin, avant la sortie), par pas, par appel ---- */
  M._obs = {};
  M.parImage = function (id, code, max) {
    var N = window.__N, fn = new Function('N', 'S', 'M', code), out = [], orig = N.gfx.present, actif = true;
    N.gfx.present = function () {
      if (actif) {
        try { out.push(fn(window.__N, window.__S, M)); } catch (e) { out.push({ erreurSonde: String(e && e.message || e) }); }
        if (max && out.length >= max) actif = false;
      }
      return orig.apply(this, arguments);
    };
    M._obs[id] = { out: out, stop: function () { actif = false; N.gfx.present = orig; } };
    return true;
  };
  M.parPas = function (id, code, max) {
    var N = window.__N, fn = new Function('N', 'S', 'M', code), out = [], orig = N.cam.update, actif = true;
    N.cam.update = function () {
      var r = orig.apply(this, arguments);
      if (actif) { try { var v = fn(window.__N, window.__S, M); if (v !== undefined) out.push(v); } catch (e) { out.push({ erreurSonde: String(e && e.message || e) }); } if (max && out.length >= max) actif = false; }
      return r;
    };
    M._obs[id] = { out: out, stop: function () { actif = false; N.cam.update = orig; } };
    return true;
  };
  /* enveloppe la fonction au chemin donné ('N.music.sfx') et journalise ses appels */
  M.appels = function (id, chemin, max) {
    var p = chemin.split('.'), nom = p.pop(), o = M.valeur(p.join('.'));
    if (!o || typeof o[nom] !== 'function') return false;
    var orig = o[nom], out = [], actif = true;
    o[nom] = function () {
      if (actif && (!max || out.length < max)) {
        var a = [];
        for (var i = 0; i < arguments.length; i++) { var v = arguments[i]; a.push(v === null || typeof v !== 'object' ? v : (function () { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return String(v); } })()); }
        out.push({ t: M.t(), image: window.__FRAME, etat: M.etat(), args: a });
      }
      return orig.apply(this, arguments);
    };
    M._obs[id] = { out: out, stop: function () { actif = false; o[nom] = orig; } };
    return true;
  };
  M.lire = function (id, vider) { var o = M._obs[id]; if (!o) return null; var r = o.out.slice(); if (vider) o.out.length = 0; return r; };
  M.arreter = function (id) { var o = M._obs[id]; if (!o) return null; o.stop(); delete M._obs[id]; return o.out; };

  /* ---- démarrer une partie : reset(graine, {depart:'plongee'}), réglages, pilote ---- */
  var JEU = ['plongee', 'jeu', 'nettoyage', 'reapparition', 'defile', 'alerte', 'boss', 'vol', 'cartes', 'mort', 'victoire'];
  M.ETATS_JEU = JEU;
  M.demarrer = function (o) {
    o = o || {};
    var N = window.__N, S = window.__S, g = N.game, d = M.dbg(), r = { ok: false, etapes: [] };
    if (N.journal && N.journal.actif) N.journal.actif(true);
    if (o.jour && S) S.jour = o.jour;
    g.reset(o.graine === undefined ? 1 : o.graine, { depart: o.depart || 'plongee', mode: o.mode || 'banc' });
    r.etapes.push('reset:' + M.etat());
    if (o.actions && S && S.reglages) S.reglages.actions = o.actions;
    if (o.god && d && d.god) d.god(true);
    if (o.pilote && N.pilote) { N.pilote.lancer(o.pilote, o.variante ? { variante: o.variante } : undefined); }
    r.etat = M.etat(); r.ok = JEU.indexOf(r.etat) >= 0;
    if (!r.ok) r.raison = 'départ impossible : état ' + r.etat + ' après N.game.reset(graine, {depart:\'plongee\'}) ; aucun écran contourné';
    return r;
  };
  /* ---- une partie complète en mode simulé, échantillonnée, dans la page (aucun aller-retour) ---- */
  M.simulerPartie = function (o) {
    o = o || {};
    var N = window.__N, S = window.__S, d = M.dbg(), pas = o.pas || 0.25, maxT = o.maxT || 540;
    var J = [], E = [], parPas = { pas: 0, secoues: 0, mouvement: {}, pasVague: {}, transitions: [], etat: null, fini: false };
    if (N.journal && N.journal.dump) N.journal.dump({ vider: true });
    /* les appels observés pendant la partie : bannières, toasts, sections, repères et sons */
    var OBS = o.observer || ['N.hud.banniere', 'N.hud.toast', 'N.music.cue', 'N.music.section', 'N.music.sfx'], obsOk = [];
    for (var q = 0; q < OBS.length; q++) if (M.appels('obs:' + OBS[q], OBS[q], 30000)) obsOk.push(OBS[q]);
    var dem = M.demarrer(o);
    if (!dem.ok) { for (var q3 = 0; q3 < obsOk.length; q3++) M.arreter('obs:' + obsOk[q3]); return { ok: false, raison: 'départ impossible : état ' + dem.etat + ' après N.game.reset(graine, {depart:\'plongee\'})', demarrage: dem, erreurs: M.erreurs() }; }
    /* le crochet par pas, sur N.cam.update : secousse et arène en mouvement, pas à pas */
    var crochet = false;
    if (N.cam && typeof N.cam.update === 'function') {
      /* au premier passage en fin, le pilote est coupé : sinon il valide REJOUER et dbg.simuler enchaîne
         une nouvelle partie dans la même tranche */
      crochet = M.parPas('__partie', 'var o = M.__pp, e = M.etat(), v = M.vagueN(); o.pas++; o.pasVague[v] = (o.pasVague[v] || 0) + 1;' +
        'if (e !== o.etat) { o.transitions.push({ t: M.t(), etat: e, vague: v }); o.etat = e; }' +
        'if ((e === "fin" || e === "initiales") && !o.fini) { o.fini = true; if (N.pilote && N.pilote.arreter) N.pilote.arreter(); }' +
        'if (o.fini) return;' +
        'if ((+S.shake || 0) > 0) o.secoues++; if (N.world && N.world.enMouvement && N.world.enMouvement()) o.mouvement[v] = (o.mouvement[v] || 0) + 1;');
      M.__pp = parPas;
    }
    var dernier = -1, fige = 0, raison = 'temps';
    while (true) {
      d.simuler(pas);
      var lot = N.journal && N.journal.dump ? N.journal.dump({ vider: true }) : [];
      for (var k = 0; k < lot.length; k++) J.push(lot[k]);
      var e = M.etat(), t = M.t();
      var ech = { t: t, etat: e, vivants: N.ennemis ? (N.ennemis.count ? N.ennemis.count() : (N.ennemis.list || []).length) : (S.enemies || []).length };
      try { var vg = N.dir && N.dir.vague ? N.dir.vague() : null; ech.vague = vg && typeof vg === 'object' ? vg.n : vg; if (vg && typeof vg === 'object') { ech.vagueNom = vg.nom; ech.quartier = vg.quartier; ech.etape = vg.etape; } } catch (x) { ech.vague = null; }
      try { ech.mouvement = N.world && N.world.enMouvement ? !!N.world.enMouvement() : null; } catch (x) { ech.mouvement = null; }
      try { ech.len = S.player ? S.player.len : null; ech.vies = N.score ? N.score.vies : null; ech.score = N.score ? N.score.score : null; } catch (x) { }
      try { ech.defiVague = N.score && N.score.defiVague ? (N.score.defiVague.id || true) : null; ech.defis = N.score && N.score.defis ? N.score.defis.length : null; } catch (x) { }
      try { ech.decor = N.decor && N.decor.etat ? N.decor.etat() : null; if (typeof ech.decor !== 'string') ech.decor = null; } catch (x) { ech.decor = null; }
      if (o.echantillon) { try { ech.x = (new Function('N', 'S', 'M', o.echantillon))(N, S, M); } catch (x) { ech.x = { erreurSonde: String(x) }; } }
      E.push(ech);
      if (e === 'fin' || e === 'initiales' || (crochet && parPas.fini)) { raison = 'fin'; break; }
      if (t >= maxT) { raison = 'temps'; break; }
      if (t === dernier) { if (++fige > (o.figeMax || 80)) { raison = 'figee:' + e; break; } } else fige = 0;
      dernier = t;
    }
    if (crochet) M.arreter('__partie');
    var appels = {};
    for (var q2 = 0; q2 < obsOk.length; q2++) {
      var l = M.arreter('obs:' + obsOk[q2]) || [];
      appels[obsOk[q2]] = l.map(function (a) { return { t: a.t, etat: a.etat, a: a.args[0], o: a.args[1] && typeof a.args[1] === 'object' ? a.args[1] : undefined }; });
    }
    var fin = { etat: M.etat(), t: M.t(), err: M.erreurs() };
    try { fin.score = N.score ? N.score.score : null; fin.vies = N.score ? N.score.vies : null; fin.cartes = N.cartes && N.cartes.prises ? N.cartes.prises() : null; } catch (x) { }
    try { fin.prochain = N.score && N.score.prochain ? N.score.prochain() : null; fin.energie = N.score ? N.score.energie : null; } catch (x) { }
    return { ok: raison.indexOf('figee:') !== 0, raison: raison.indexOf('figee:') === 0 ? 'horloge de jeu figée dans ' + M.etat() + ' : N.horloge.t()=' + M.t() + ', N.horloge.pas()=' + N.horloge.pas() : raison, demarrage: dem, journal: J, echantillons: E, parPas: crochet ? parPas : null, fin: fin, appels: appels };
  };
})();
