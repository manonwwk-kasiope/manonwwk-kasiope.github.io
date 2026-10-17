/* ===== 76-directeur.js — N.dir : les vagues, les apparitions, l'énergie libre, la tension =====

   Tiré de 70-game.js (lot 0b) : spawnPoint, spawnGroup, counts, cible, director, la cadence de l'énergie libre.
   REPLI du lot 5a : la démo menait deux minutes d'un seul tenant ; ici le même directeur mène les cinq vagues
   de N.R.secteurs[0].vagues (durée, plafond, vitesse, quartier lus dans N.R), dans l'ordre. Les formations
   nommées, le TRAQUEUR, la PASTILLE, le DÉFILÉ et les portails arrivent avec le lot 5a.

   RIEN NE NAÎT DANS LE CHAMP : les ennemis ordinaires naissent hors de la vue (N.cam / N.outils.VUE), à plus de
   80 px de la tête, et entrent. Chaque apparition est comptée (stats.spawns) pour la preuve.

   ÉMET `vague` (seul émetteur) : { n, etape: 'vague', evt: 'entree'|'pic'|'nettoyee'|'soupape', nom, quartier }.
   C'est 79-jeu.js (rang 10) qui en déduit NETTOYAGE, CARTES, VOL ; ce module ne change jamais d'état de jeu.
   Il DEMANDE : N.ennemis.spawn, N.butin.libre, N.ennemis.purge (fin de vague).

   Interface (§ 7.8) : reset(secteur, opts), update(dt), vague(), phase(), tension(), progression(), entrees().
   Ajouts : demarrer(n), info(), lancerBoss(), fini(). */
N.dir = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                    // → N.R
    premierEnnemi: 4.5, cadence: [0.55, 0.45, 0.4, 0.34, 0.28], energieLibre: 2.6, energieMin: 3, bossTele: 2.4,
    maxMines: [4, 4, 6, 7, 7], maxTourelles: 6, maxSentinelles: 4
  };
  var st = { n: 0, tw: 0, phase: 'attente', spawnCd: 0, freeCd: 2, entrees: 0, fini: false, secteur: 0, tuto: true, nettoye: false, bossMort: false };
  var stats = { spawns: [], inView: 0, minDistSpawn: 1e9, parVague: [] };
  var VAGUES = null;

  function vagues() { return VAGUES || (VAGUES = (R && R.secteurs && R.secteurs[0] && R.secteurs[0].vagues) || []); }
  function info() { return vagues()[Math.max(0, st.n - 1)] || null; }
  function rr(a, b) { return O.rr('dir', a, b); }
  function ri(a, b) { return O.ri('dir', a, b); }
  function rnd() { return O.rf('dir'); }

  function reset(secteur, opts) {
    VAGUES = null;
    st.n = 0; st.tw = 0; st.phase = 'attente'; st.spawnCd = 0; st.freeCd = 2; st.entrees = 0; st.fini = false; st.nettoye = false; st.bossMort = false;
    st.secteur = secteur | 0; st.tuto = !(opts && opts.sansTuto);
    stats.spawns.length = 0; stats.inView = 0; stats.minDistSpawn = 1e9; stats.parVague.length = 0;
    if (opts && opts.vague) demarrer(opts.vague);
  }

  /* demarrer(n) : la vague n commence. `vague` est émis ; 79-jeu repasse en état `jeu`. */
  function demarrer(n) {
    var vs = vagues();
    n = O.clamp(n | 0, 1, vs.length || 1);
    st.n = n; st.tw = 0; st.phase = 'vague'; st.spawnCd = 0; st.fini = false; st.nettoye = false; st.entrees++;
    var w = vs[n - 1] || {};
    if (N.ev) N.ev.emit('vague', { n: n, etape: 'vague', evt: 'entree', nom: w.nom || ('VAGUE ' + n), quartier: w.quartier || 'docks' });
  }

  /* ---- un point de naissance hors de la vue, à 80 px au moins de la tête ---- */
  function spawnPoint(r) {
    var m = r + 8, V = O.VUE, P = N.joueuse.tete, portrait = O.geo.portrait, A = O.A;
    for (var k = 0; k < 14; k++) {
      var side = ri(0, 3), x, y;
      if (portrait && side === 2 && rnd() < 0.5) side = ri(0, 1);        // portrait : moins souvent par le bas
      if (side === 0) { x = V.x - m; y = rr(A.y0 - 4, Math.min(V.y + V.h - 8, A.y1 + 20)); }
      else if (side === 1) { x = V.x + V.w + m; y = rr(A.y0 - 4, Math.min(V.y + V.h - 8, A.y1 + 20)); }
      else if (side === 2) { x = rr(V.x + 8, V.x + V.w - 8); y = V.y + V.h + m; }
      else { x = rr(V.x + 8, V.x + V.w - 8); y = V.y - m; }
      if (O.d2(x, y, P.x, P.y) >= 80 * 80) return { x: x, y: y, side: side };
    }
    return null;                                       // pas de place sûre : on réessaiera
  }
  function logSpawn(e) {
    var V = O.VUE, P = N.joueuse.tete;
    var inView = e.x > V.x - e.r && e.x < V.x + V.w + e.r && e.y > V.y - e.r && e.y < V.y + V.h + e.r;
    var dist = Math.sqrt(O.d2(e.x, e.y, P.x, P.y));
    stats.spawns.push({ t: Math.round(O.T.t * 100) / 100, k: e.type, x: Math.round(e.x), y: Math.round(e.y), inView: inView, tele: 0, dist: Math.round(dist), vague: st.n });
    if (inView) stats.inView++;
    else if (dist < stats.minDistSpawn) stats.minDistSpawn = Math.round(dist);
  }
  function spawnGroup(type) {
    var r = (R && R.ennemis && R.ennemis[type] && R.ennemis[type].r) || 5, sp0 = spawnPoint(r), P = N.joueuse.tete;
    if (!sp0) return 0;
    var n = 1;
    if (type === 'fleche') n = st.n <= 1 ? ri(1, 2) : st.n <= 3 ? ri(2, 3) : ri(2, 4);
    var made = 0;
    for (var i = 0; i < n; i++) {
      var off = (i - (n - 1) / 2) * 13, x = sp0.x, y = sp0.y, back = (i % 2) * 9;
      if (sp0.side < 2) { y += off; x += sp0.side === 0 ? -back : back; } else { x += off; y += sp0.side === 2 ? back : -back; }
      if (O.d2(x, y, P.x, P.y) < 70 * 70) continue;       // G-14 : jamais près de la tête, même hors champ
      var e = N.ennemis.spawn(type, x, y);
      logSpawn(e); made++;
    }
    return made;
  }
  function plafond() { var w = info(); return (w && w.plafond) || 10; }
  /* la montée : le nombre d'ennemis visé croît dans la vague jusqu'au plafond de N.R */
  function cible() {
    var w = info(); if (!w) return 0;
    var dep = st.tuto && st.n === 1 ? CFG.premierEnnemi : 1;
    if (st.tw < dep) return 0;
    return 2 + (plafond() - 2) * O.clamp((st.tw - dep) / Math.max(1, w.duree * 0.7 - dep), 0, 1);
  }
  function update(dt) {
    if (st.phase !== 'vague') return;
    var w = info(); if (!w) return;
    st.tw += dt; st.spawnCd -= dt;
    var c = N.ennemis.counts(), i = st.n - 1;
    if (!st.fini && c.regular < cible() && st.spawnCd <= 0) {
      var pick = 'fleche', wt;
      if (st.n === 1) wt = st.tw < 12 ? { fleche: 1 } : { fleche: 0.7, mine: 0.3 };
      else if (st.n === 2) wt = { fleche: 0.55, mine: 0.25, tourelle: 0.2 };
      else wt = { fleche: 0.34, mine: 0.16, tourelle: 0.28, sentinelle: 0.22 };
      if (c.mine >= CFG.maxMines[Math.min(4, i)]) wt.mine = 0;
      if (c.tourelle >= CFG.maxTourelles) wt.tourelle = 0;
      if (c.sentinelle >= CFG.maxSentinelles) wt.sentinelle = 0;
      var sum = 0, k; for (k in wt) sum += wt[k];
      var r = rnd() * sum; for (k in wt) { r -= wt[k]; if (r <= 0) { pick = k; break; } }
      spawnGroup(pick);
      st.spawnCd = CFG.cadence[Math.min(4, i)];
    }
    /* énergie libre : toujours un peu à prendre */
    st.freeCd -= dt;
    if (st.freeCd <= 0) {
      st.freeCd = CFG.energieLibre;
      if (N.butin.nbLibres() < CFG.energieMin) N.butin.libre(0.5);
    }
    /* la fin de la vague : plus d'apparition ; le nettoyage purge ce qui reste (79-jeu le déclenche) */
    if (st.tw >= w.duree && !st.fini) {
      st.fini = true; st.phase = 'nettoyage'; st.nettoye = true;
      stats.parVague.push({ n: st.n, duree: st.tw });
      if (N.ev) N.ev.emit('vague', { n: st.n, etape: 'vague', evt: 'nettoyee', nom: w.nom || ('VAGUE ' + st.n), quartier: w.quartier || 'docks' });
    }
  }

  /* le gros ennemi : naît en face de la tête, après un portail de 2,4 s (G-14) */
  function lancerBoss() {
    var A = O.A, P = N.joueuse.tete, cx = (A.x0 + A.x1) / 2, cy = (A.y0 + A.y1) / 2, x, y;
    if (O.geo.portrait) { x = cx; y = P.y > cy ? A.y0 + (A.y1 - A.y0) * 0.3 : A.y0 + (A.y1 - A.y0) * 0.7; }
    else { y = cy; x = P.x > cx ? A.x0 + (A.x1 - A.x0) * 0.25 : A.x0 + (A.x1 - A.x0) * 0.75; }
    st.phase = 'boss';
    var e = N.ennemis.spawn('cyclope', x, y, { portail: CFG.bossTele });
    logSpawn(e);
    if (N.ev) N.ev.emit('portail', { type: 'cyclope', x: x, y: y, dur: CFG.bossTele, elite: false });
    return e;
  }

  function progression() {
    var vs = vagues(), tot = 0, fait = 0;
    for (var i = 0; i < vs.length; i++) { tot += vs[i].duree; if (i + 1 < st.n) fait += vs[i].duree; else if (i + 1 === st.n) fait += Math.min(st.tw, vs[i].duree); }
    if (st.phase === 'boss' || st.n > vs.length) return 1;
    return tot > 0 ? O.clamp(fait / tot, 0, 1) : 0;
  }
  /* croissante vague après vague (critère 6 de DIRECTION.md) : 0,06 au départ, 1 au colosse */
  function tension() {
    if (st.phase === 'attente') return 0.06;
    if (st.phase === 'boss') return 1;
    return O.clamp(0.06 + 0.9 * progression(), 0, 1);
  }

  /* `kill` rang 10 : la mort du gros ennemi ferme le secteur (79-jeu lit bossMort(), puis passe en VICTOIRE) */
  if (N.ev) N.ev.on('kill', 10, function (c) { if (c.boss && !(c.src && c.src.genre === 'decor')) st.bossMort = true; }, '76-directeur');

  return {
    bossMort: function () { return st.bossMort; },
    reset: reset, update: update, vague: function () { return st.n; }, phase: function () { return st.phase; },
    tension: tension, progression: progression, entrees: function () { return st.entrees; },
    demarrer: demarrer, info: info, lancerBoss: lancerBoss, fini: function () { return st.fini; }, stats: stats,
    tempsVague: function () { return st.tw; }, nombreVagues: function () { return vagues().length; },
    fin: function () { st.phase = 'attente'; }
  };
})();
