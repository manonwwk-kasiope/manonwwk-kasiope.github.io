/* LE DÉFILÉ (§ 4.7) : bonus joué entre V3 et V4. Les planeurs ordinaires de
   N.ennemis portent le tir/LASSO et le score ; ce module produit leurs courbes,
   les rend inoffensifs et compte uniquement leurs vrais kills de joueuse.
   Aucun réglage local : nombres/durée/prime viennent de N.R.defile.
   Le raccord de la machine d'états est livré à part dans tools/codex-10/.
   API : demarrer(), update(dt), draw(), fini(), joue(), bilan(), prendreRare(), reset(). */
N.defile = (function () {
  'use strict';
  var O = N.outils, R = N.R, ids = {}, t = 0, groupes = 0, pris = 0;
  var actif = false, joue = false, termine = false, parfait = false, rare = false;
  function cfg() { return R.defile; }
  function journal(evt) {
    if (N.journal) N.journal('defile', { evt: evt, t: t, escadrilles: groupes, attrapes: pris, total: cfg().planeurs, parfait: parfait });
  }
  function publier() {
    if (N.S) N.S.defile = { actif: actif, t: t, duree: cfg().duree, escadrilles: groupes, attrapes: pris, total: cfg().planeurs, parfait: parfait };
  }
  function reset() {
    ids = {}; t = 0; groupes = 0; pris = 0;
    actif = joue = termine = parfait = rare = false; publier();
  }
  function escadrille() {
    var c = cfg(), V = O.VUE, gauche = (groupes % 2) === 0;
    var marge = R.apparitions.margeVue || R.camera.debord;
    var rayon = Math.min(V.w, V.h) / 2, x0 = gauche ? V.x - marge : V.x + V.w + marge;
    var y0 = V.y + V.h / 2, sens = gauche ? 1 : -1;
    var courbe = { x0: x0, y0: y0, cx: x0 + sens * rayon, cy: y0,
      r: rayon, a0: gauche ? Math.PI : 0, sens: sens, vx: sens, vy: 0 };
    for (var i = 0; i < c.parEscadrille; i++) {
      var e = N.ennemis.spawn('planeur', x0, y0, { st: 'actif' });
      /* Comme les formations de N.dir, le producteur renseigne l'instance rendue
         par spawn : 72-ennemis possède ensuite son mouvement et ses collisions. */
      e._courbe = courbe;
      e._decal = -i / (c.parEscadrille * c.sortie);
      e._inoff = c.duree;                     // le contact ne blesse jamais ; le mur reste à la joueuse
      ids[e.id] = true;
    }
    groupes++; journal('escadrille');
  }
  function demarrer() {
    reset(); actif = joue = true;
    N.dir.fin(); N.ennemis.reset();
    if (N.arene && N.arene.nettoyee) N.arene.nettoyee();
    if (N.decor) { N.decor.quartier('ciel'); N.decor.etat('calme'); }
    if (N.hud && N.hud.banniere) N.hud.banniere('LE DÉFILÉ', { c: 'acier' });
    escadrille(); publier(); journal('debut');
    return true;
  }
  function finir() {
    actif = false; termine = true; parfait = pris === cfg().planeurs;
    if (parfait) {
      N.score.ajouter(cfg().parfait); rare = !!R.cartes.defileParfaitRare;
      if (N.hud && N.hud.banniere) N.hud.banniere('PARFAIT', { c: 'jaune' });
    }
    N.ennemis.reset(); publier(); journal('fin');
  }
  function update(dt) {
    if (!actif || !(dt > 0)) return;
    t = Math.min(cfg().duree, t + dt);
    while (groupes < cfg().escadrilles && t + 1e-9 >= groupes * cfg().intervalle) escadrille();
    if (t + 1e-9 >= cfg().duree) finir();
    publier();
  }
  function draw() {
    if (!actif) return;
    var sf = O.geo.safe, rad = R.hud.radar, ecart = R.hud.tempsForts.palier.marge;
    var x = O.geo.portrait ? O.geo.W - sf.r - R.hud.bouton.px * 2 - 2 - rad[0] - ecart : Math.round(O.geo.W / 2 - rad[0] / 2);
    var y = sf.t + rad[1] + ecart;
    if (O.geo.portrait && N.score.defi) y += R.hud.police[1] + ecart;
    var sc = N.gfx.PX * R.hud.police[1] < 17 ? 2 : 1;
    O.origine(0, 0);
    O.textC(pris + ' / ' + cfg().planeurs, x + rad[0] / 2, y, O.OS, true, sc);
  }
  if (N.ev) N.ev.on('kill', 30, function (e) {
    if (!actif || !ids[e.id] || !e.src || (e.src.genre !== 'arme' && e.src.genre !== 'joueuse')) return;
    delete ids[e.id]; pris++; publier(); journal('prise');
  }, '76-defile');
  return { reset: reset, demarrer: demarrer, update: update, draw: draw,
    actif: function () { return actif; }, fini: function () { return termine; }, joue: function () { return joue; },
    bilan: function () { return { attrapes: pris, total: cfg().planeurs, parfait: parfait, t: t, escadrilles: groupes }; },
    prendreRare: function () { var r = rare; rare = false; return r; } };
})();
