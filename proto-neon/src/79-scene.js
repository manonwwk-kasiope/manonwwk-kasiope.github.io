/* ===== 79-scene.js — N.scene : la mise en scène des événements (REFONTE.md § 5.3) =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaires : lots 6a et 6b. Tout ce qui « se voit et s'entend »
   quand un événement survient passe ici, au rang 60, une seule fois par occurrence : explosions, gels,
   secousses, sons d'événement, bannières demandées au HUD, gains flottants. Le repli reprend les gestes
   de la démo (70-game.js, réparti par le lot 0b) : un kill fait une explosion magenta proportionnée, un son
   « kill » qui monte avec la chaîne, un gel court (pas plus d'un toutes les N.R.scene.kill.gelIntervalle s) et
   un gain flottant ; une mort gèle, explose en cyan, coupe la musique (cue 'mort') ; une vague s'annonce
   par une bannière. Interface : reset(), update(dt), drawCause() (pendant la mort : la cause entourée et
   son nom, N.ids.texte). Tout le reste passe par N.ev. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '79-scene';

  function I(n) { return N.pal.i(n); }
  function RS() { return (N.R && N.R.scene) || {}; }
  function sfx(nom, o) { if (N.music && N.music.sfx) N.music.sfx(nom, o || {}); }
  function boom(x, y, f, c, v) { if (N.fx && N.fx.boom) { if (v) N.fx.boom(x, y, f, c, v); else N.fx.boom(x, y, f, c); } }
  function gel(n) { if (N.fx && N.fx.hitstop) N.fx.hitstop(n); }
  function hud(fn, a, b, c, d) { if (N.hud && N.hud[fn]) N.hud[fn](a, b, c, d); }

  var gelCd = 0, T = 0, CAUSE = { x: 0, y: 0, auteurId: null, texte: '' };
  var OPT = { ci: 0, contour: true, echelle: 1 };

  function abonner() {
    var on = N.ev && N.ev.on; if (!on) return;
    on('kill', 60, function (c) {
      if (c.src && c.src.genre === 'decor' && c.src.type === 'mur') return;
      var K = RS().kill || {}, ch = N.score && N.score.chaine ? N.score.chaine() : 1;
      var gros = c.type === 'tourelle' || c.type === 'sentinelle' || c.type === 'ruche' || c.elite;
      var f = c.boss ? ((RS().cyclope && RS().cyclope.force) || 1) : c.elite ? ((RS().elite && RS().elite.force) || 0.8)
        : Math.min(K.forceMax || 0.58, (gros ? (K.forceTireur || 0.45) : (K.force || 0.32)) + (K.parEnchaine || 0.03) * Math.max(0, ch - 1));
      boom(c.x, c.y, f, I('magenta'));
      sfx(c.boss || c.elite ? 'bigkill' : 'kill', { pitch: Math.min(9, Math.max(0, ch - 1)) });
      if (gelCd <= 0) { gel(c.boss ? 24 : c.elite ? 5 : (K.gelImages || 2)); gelCd = K.gelIntervalle || 0.12; }
      var pts = (c.base || 0) * (N.score && N.score.mult ? N.score.mult() : 1);
      if (pts > 0 && !(c.src && c.src.genre === 'decor')) hud('pop', c.x, c.y - 8, '+' + pts);
    }, QUI);
    on('coup', 60, function () { sfx('impact'); }, QUI);
    on('coupe', 60, function (c) {
      sfx('coupe'); gel((RS().coupe && RS().coupe.gelImages) || 3);
      boom(c.x, c.y, 0.2, I('cyan'));
      if (N.cam && N.cam.jolt) N.cam.jolt(0, (N.R && N.R.mort && N.R.mort.coupe.jolt) || 3);
    }, QUI);
    on('mort', 60, function (c) {
      gel((N.R && N.R.mortScene && N.R.mortScene.gelImages) || 10);
      boom(c.x, c.y, 0.7, I('cyan'), 'joueuse');
      sfx('mort');
      if (N.music && N.music.cue) N.music.cue('mort');
      CAUSE.x = c.x; CAUSE.y = c.y; CAUSE.auteurId = c.auteurId;
      CAUSE.texte = (N.ids && N.ids.texte) ? N.ids.texte(c.cause, c.auteur) : 'SIGNAL PERDU';
      T = 0;
    }, QUI);
    on('ramassage', 60, function (c) {
      var p = N.S && N.S.player;
      sfx(c.type === 'noyau' ? 'noyau' : c.type === 'pastille' ? 'pastille' : 'butin', { pitch: p ? p.len : 0 });
      if (N.fx && N.fx.pickup) N.fx.pickup(c.x, c.y);
    }, QUI);
    on('lasso', 60, function (c) { sfx('lasso'); gel((RS().lasso && RS().lasso.gelImages) || 4); if (N.fx && N.fx.lasso) N.fx.lasso(c.poly, c.n); }, QUI);
    on('niveau', 60, function () { sfx('levelup'); }, QUI);
    on('vague', 60, function (c) {
      if (c.evt === 'entree') {
        hud('banniere', (c.etape === 'defile' ? '' : 'VAGUE ' + c.n + '\n') + c.nom, { duree: (RS().vague && RS().vague.duree) || 2.5 });
        sfx('vague');
      } else if (c.evt === 'nettoyee') { hud('banniere', 'VAGUE NETTOYÉE', { duree: 1.6 }); if (N.music && N.music.cue) N.music.cue('stinger'); }
    }, QUI);
    on('vol', 60, function (c) {
      if (c.evt === 'debut' && N.music && N.music.cue) N.music.cue('plongee');
      if (c.evt === 'porte') sfx('porte');
      if (c.evt === 'mine') sfx('coupe');
      if (c.evt === 'fin' && c.parfait) hud('banniere', 'VOL PARFAIT', { duree: 1.4 });
    }, QUI);
    on('inversion', 60, function (c) {
      if (N.music) { if (N.music.cue && c.evt === 'debut') N.music.cue('inversion'); if (N.music.couche) N.music.couche('inversion', c.evt === 'debut'); }
      if (c.evt === 'debut') hud('banniere', 'INVERSION', { duree: 1.2 });
    }, QUI);
    on('arene', 60, function (c) { if (c.evt === 'travellingAnnonce') { sfx('travelling'); hud('banniere', 'LE PLATEAU AVANCE', { duree: 1.6 }); } }, QUI);
    on('phase', 60, function (c) {
      if (c.evt === 'arrivee') sfx('warning');
      if (c.evt === 'mort') { sfx('colosseMort'); if (N.fx && N.fx.shake) N.fx.shake(12); }
      if (c.evt === 'entree' && c.n > 1) hud('banniere', 'PHASE ' + c.n, { duree: 1.4 });
    }, QUI);
    on('portail', 60, function () { sfx('portail'); }, QUI);
    on('arme', 60, function () { sfx('arme'); }, QUI);
    on('pouvoir', 60, function (c) { sfx(c.evt === 'pret' ? 'pouvoirPret' : c.id); }, QUI);
    on('apogee', 60, function (c) { sfx(c.evt === 'pleine' ? 'ultimePret' : 'ultime'); }, QUI);
    on('boost', 60, function (c) { sfx(c.evt === 'on' ? 'boostOn' : c.evt === 'off' ? 'boostOff' : 'boostPanne'); }, QUI);
    on('defi', 60, function (c) { sfx(c.ok ? 'defi' : 'defiRate'); }, QUI);
    on('deblocage', 60, function () { sfx('record'); }, QUI);
  }

  /* la cause entourée, pendant la séquence de mort (coordonnées MONDE, après le remappage) */
  function drawCause() {
    var g = N.gfx; if (!g || !N.pal) return;
    var x = CAUSE.x, y = CAUSE.y, L = (N.ennemis && N.ennemis.list) || [];
    for (var i = 0; i < L.length; i++) if (L[i].id === CAUSE.auteurId) { x = L[i].x; y = L[i].y; break; }
    var hz = (N.R && N.R.mortScene && N.R.mortScene.anneauHz) || 3, on = Math.floor(T * hz * 2) % 2 === 0;
    if (g.owner) g.owner(7);
    if (on) { g.ring(x, y, 15, I('nuitProfonde')); g.ring(x, y, 14, I('rosePale')); g.ring(x, y, 13, I('nuitProfonde')); }
    if (N.spr && N.spr.text && N.cam) {
      OPT.ci = I('os');
      var s = N.spr.text(CAUSE.texte, OPT);
      if (s && s.data) g.blit(s, Math.round(x - s.w / 2), Math.round(y + 18));
    }
    if (g.owner) g.owner(0);
  }

  N.scene = {
    reset: function () { gelCd = 0; T = 0; abonner(); },
    update: function (dt) { var r = (N.horloge && N.horloge.H) || 1 / 120; if (gelCd > 0) gelCd -= dt > 0 ? dt : 0; T += r; },
    drawCause: drawCause
  };
})();
