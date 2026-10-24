/* tools/L3a/harnais.js — le harnais de la page d'essai du lot 3a, injecté par les bancs (jamais livré au jeu).
   Il gèle la boucle d'images (__DT minuscule : 90-boot.js ne fait plus de pas) et avance le jeu pas à pas,
   dans l'ordre de la boucle (CONTRAT.md § 9). Il isole la joueuse : directeur, ennemis et arsenal peuvent
   être mis en sommeil, et des cibles fixes posées. Son hasard est une suite congruentielle à graine. */
(function () {
  var N = window.__N, S = window.__S;
  window.__DT = 1e-12;
  var H = { orig: {}, ev: [], graine: 1 };
  H.rnd = function () { H.graine = (H.graine * 1103515245 + 12345) & 0x7fffffff; return H.graine / 0x7fffffff; };
  H.pas = function (n, chaque) {
    for (var i = 0; i < n; i++) {
      if (chaque) chaque(i);
      var dt = N.horloge.avancer();
      S.t = N.horloge.t(); S.dt = dt;
      N.game.update(dt); N.fx.update(dt); N.cam.update(dt);
      S.input.pouvoir = false; S.input.apogee = false; S.input.chiffre = 0; S.input.valider = false;
      S.frame++;
    }
  };
  H.endormir = function (mod, fn) { var m = N[mod]; if (!H.orig[mod + '.' + fn]) H.orig[mod + '.' + fn] = m[fn]; m[fn] = function () {}; };
  H.reveiller = function () { for (var k in H.orig) { var p = k.split('.'); N[p[0]][p[1]] = H.orig[k]; } H.orig = {}; };
  /* une partie neuve en état 'jeu', la joueuse posée, et rien d'autre que ce qu'on demande */
  H.bac = function (o) {
    o = o || {};
    H.reveiller();
    N.game.reset(o.graine || 7, { etat: 'jeu' });
    if (!o.directeur) H.endormir('dir', 'update');
    if (!o.ennemisVivants) H.endormir('ennemis', 'update');
    if (!o.arsenal) H.endormir('arsenal', 'update');
    N.ennemis.reset(); N.butin.reset(); N.butin.list.length = 0;
    var w = N.world;
    N.joueuse.reset({ x: o.x !== undefined ? o.x : (w.x0 + w.x1) / 2, y: o.y !== undefined ? o.y : (w.y0 + w.y1) / 2, ang: o.ang || 0, len: o.len || 8 });
    N.cam.reset(N.joueuse.tete.x, N.joueuse.tete.y);
    N.game.dbg.god(!!o.god);
    S.input.x = Math.cos(o.ang || 0); S.input.y = Math.sin(o.ang || 0); S.input.mag = 0; S.input.boost = false;
    S.reglages && (S.reglages.actions = o.actions || 'doigts');
    H.ev.length = 0; H.ecouter();
    return N.joueuse._etat();
  };
  /* tous les événements, consignés (le banc lit l'ordre et le nombre) */
  var NOMS = ['kill', 'coup', 'coupe', 'mort', 'ramassage', 'lasso', 'pouvoir', 'apogee', 'boost'];
  H.ecouter = function () {
    NOMS.forEach(function (nom) {
      N.ev.on(nom, 95, function (c) { H.ev.push({ nom: nom, pas: N.horloge.pas(), c: JSON.parse(JSON.stringify(c, function (k, v) { return (v && v.buffer) ? Array.from(v) : v; })) }); }, 'zz-banc');
    });
  };
  H.compte = function (nom) { var n = 0; for (var i = 0; i < H.ev.length; i++) if (H.ev[i].nom === nom) n++; return n; };
  /* une cible fixe : un ennemi sans cerveau (son module est endormi) */
  H.cible = function (type, x, y, pv) {
    var e = N.ennemis.spawn(type || 'mine', x, y, {});
    if (e) { e.etat = 'approche'; if (pv) { e.pv = pv; e.pvMax = pv; } }
    return e;
  };
  H.manche = function (a, mag) { S.input.x = Math.cos(a); S.input.y = Math.sin(a); S.input.mag = mag === undefined ? 0.8 : mag; };
  window.L3 = H;
})();
