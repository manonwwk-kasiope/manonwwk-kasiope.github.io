/* ===== 76-directeur.js — N.dir : les cinq vagues du secteur 1, leurs formations, la pastille, le traqueur, la tension =====

   REFONTE.md § 4.1 (structure), § 4.2 (vagues chiffrées), § 4.3 (formations annoncées 1 s avant), § 4.5 (élites), § 3.8
   (apparitions justes). Les cinq vagues nommées (ÉVEIL, MEUTE, BATTERIE, ESSAIM, DÉFERLANTE) sont lues dans
   N.R.secteurs[0].vagues : durée nominale, quota, plafond d'ennemis vivants, charges de flèches, formations datées (« instant
   après l'entrée »), TRAVELLING, CONVOIS, PASTILLE, PIC (élite avec bannière). À chaque vague, le quartier et l'état du décor
   sont posés (N.decor.quartier / N.decor.etat) puis `vague` est émis.

   RIEN NE NAÎT DANS LE CHAMP (§ 3.8) : un ennemi naît hors de la vue courante ET de la vue anticipée (la tête avancée de 1,15 s),
   avec 24 px de marge, à 70 px au moins de la tête, à 16 px au moins à l'intérieur des murs courants (donc devant le mur arrière
   pendant un TRAVELLING). Faute de point valide, la formation attend. Tout passe par un portail de 600 ms ; les deux seules
   exceptions annoncées par leur propre marqueur de 1,5 s sont le DUO et le CHAMP DE MINES (sur la trajectoire anticipée). Les
   formations tombent sur la grille des temps de jeu (144,6 BPM) : au plus tard au temps suivant.

   ÉMET `vague` (seul émetteur) : { n, etape: 'vague', evt: 'entree'|'pic'|'nettoyee'|'soupape', nom, quartier } et `portail`
   (élites, traqueur). C'est 79-jeu.js (rang 10) qui en déduit NETTOYAGE, CARTES, VOL ; ce module ne change jamais d'état de jeu.
   DEMANDE : N.ennemis.spawn / fuir / counts, N.butin.libre / lacher (PASTILLE), N.arene.entree(w) / pic() / nettoyee() (73-arene
   n'écoute pas `vague` : le contrat n'en prévoit pas), N.colosse.start() / surKill(c) / estOeil(id), N.hud.banniere / tag.
   CONSOMME `kill` (10) : mort de l'œil du CYCLOPE, dernière action de la joueuse (TRAQUEUR) ; `ramassage` (10) : idem ;
   `inversion` (10) : les apparitions s'arrêtent pendant la chasse retournée.

   Interface (§ 7.8) : reset(secteur, opts), update(dt), vague(), phase(), tension(), progression(), entrees().
   Ajouts : demarrer(n), info(), lancerBoss(), fini(), bossMort(), stats, nombreVagues(), tempsVague(), fin(), formation(nom, opts). */
N.dir = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = R.directeur;
  function secteur() { return R.secteurs[st.secteur]; }
  function reglage() { return CFG.vagues[st.n - 1] || {}; }
  function effectif(nom) { return (reglage().formationsEffectifs || {})[nom] || R.formations[nom]; }
  function taille(nom) {
    var f = effectif(nom);
    if (!f) return 0;
    if (nom === 'nuee') return f.larves[1];
    if (nom === 'essaim') return f.ruches * (1 + f.larves);
    if (nom === 'garde') return f.sentinelles + f.fleches;
    return f.fleches || f.mines || f.dards || f.tourelles || f.lames || 0;
  }
  function plafond() {
    var w = info(), r = reglage(), cap = Math.min(w ? w.plafond : secteur().plafondDur.ennemis, secteur().plafondDur.ennemis);
    if (r.plafonds) { var palier = cap; for (var i = 0; i < r.plafonds.length; i++) if (st.tw >= r.plafonds[i].t) palier = r.plafonds[i].n; cap = Math.min(cap, palier); }
    if (N.S && N.S.surcharge) cap = Math.min(secteur().plafondDur.ennemis, Math.ceil(cap * R.surcharge.densite));
    return cap;
  }
  var st = {
    n: 0, tw: 0, phase: 'attente', entrees: 0, fini: false, secteur: 0, tuto: true, nettoye: false, bossMort: false,
    queue: [], spawned: 0, freeCd: 2, pic: null, picFait: false, pastilleFaite: false, derniereAction: 0, traqueurs: 0, traqueurT: -99,
    prochainGroupe: 0, melangeT: 0, lastBeat: -1, beat: false, gate: 0, turn: 0, angPrec: null, vus: {}, alive: 0, elroy: false, premiere: true
  };
  var stats = { spawns: [], inView: 0, minDistSpawn: 1e9, parVague: [], maxAlive: 0, minDistTele: 1e9, respirations: [] };
  var repos = { demande: false, fini: false, pic: 0, duree: 0, debut: null };
  var VAGUES = null;
  var alimentation = { credit: 0, types: {}, total: 0 };

  function vagues() { return VAGUES || (VAGUES = (R && R.secteurs && R.secteurs[0] && R.secteurs[0].vagues) || []); }
  function info() { return vagues()[Math.max(0, st.n - 1)] || null; }
  function rr(a, b) { return O.rr('dir', a, b); }
  function ri(a, b) { return O.ri('dir', a, b); }
  function rnd() { return O.rf('dir'); }
  function tete() { return N.joueuse && N.joueuse.tete; }
  function banniere(t, o) { if (N.hud && N.hud.banniere) O.safe('hud.banniere', function () { N.hud.banniere(t, o); }); }
  function etiquette(t) { if (N.hud && N.hud.tag) O.safe('hud.tag', function () { N.hud.tag(t); }); }

  function reset(secteur, opts) {
    VAGUES = null;
    st.n = 0; st.tw = 0; st.phase = 'attente'; st.entrees = 0; st.fini = false; st.nettoye = false; st.bossMort = false;
    st.queue.length = 0; st.spawned = 0; st.freeCd = 2; st.pic = null; st.picFait = false; st.pastilleFaite = false; st.traqueurs = 0; st.traqueurT = -99;
    st.prochainGroupe = 0; st.melangeT = 0; st.lastBeat = -1; st.turn = 0; st.angPrec = null; st.vus = {}; st.alive = 0; st.elroy = false; st.premiere = true;
    repos.demande = repos.fini = false; repos.pic = 0; repos.duree = 0; repos.debut = null;
    st.secteur = secteur | 0; st.tuto = !(opts && opts.sansTuto);
    stats.spawns.length = 0; stats.inView = 0; stats.minDistSpawn = 1e9; stats.parVague.length = 0; stats.maxAlive = 0; stats.minDistTele = 1e9;
    stats.respirations.length = 0;
    if (opts && opts.vague) demarrer(opts.vague);
  }

  /* demarrer(n) : la vague n commence. `vague` est émis ; 79-jeu repasse en état `jeu`. */
  function demarrer(n) {
    var vs = vagues();
    n = O.clamp(n | 0, 1, vs.length || 1);
    var w = vs[n - 1] || {};
    st.n = n; st.tw = 0; st.phase = 'vague'; st.fini = false; st.nettoye = false; st.entrees++;
    alimentation.credit = 0; alimentation.types = {}; alimentation.total = 0;
    st.spawned = 0; st.picFait = false; st.pastilleFaite = false; st.traqueurs = 0; st.traqueurT = -99; st.prochainGroupe = 0; st.melangeT = 0; st.elroy = false;
    repos.demande = repos.fini = false; repos.pic = 0; repos.duree = 0; repos.debut = null;
    st.derniereAction = O.T.t; st.freeCd = 2; st.lastBeat = -1;
    st.queue.length = 0;
    if (N.hud && N.hud.reserverBanniere) N.hud.reserverBanniere(false);
    var fs = []; // le plan de rencontres est maintenant piloté par la pression
    for (var i = 0; i < fs.length; i++) st.queue.push({ t: fs[i].t, f: fs[i].f, essais: 0, fait: false, annonce: 0 });
    if (N.rythme) {
      var calendrier = N.rythme.calendrier(n);
      if (calendrier.drop !== null && calendrier.regle.formationDrop) st.queue.forEach(function (q) {
        if (q.f === calendrier.regle.formationDrop) q.t = Math.max(0, calendrier.drop - R.temps.tempsParMesure * calendrier.temps - R.formations.annonce - calendrier.temps);
      });
      st.rythmePic = calendrier.regle.picDrop ? calendrier.drop : null;
    } else st.rythmePic = null;
    st.queue.sort(function (a, b) { return a.t - b.t; });
    if (n === 1 && st.premiere) {                      // le premier ennemi de la première partie : 3 s après un virage de plus de 45°, 6 s au plus tard
      st.gate = st.tuto ? secteur().premierEnnemi.delai : secteur().premierEnnemi.partiesSuivantes; st.turn = 0; st.angPrec = null;
    } else st.gate = 0;
    if (N.decor) {                                     // le quartier et l'état de la vague (le décor le déduit aussi de `vague`)
      if (N.decor.quartier) O.safe('decor.quartier', function () { N.decor.quartier(w.quartier || 'docks'); });
      if (N.decor.etat) O.safe('decor.etat', function () { N.decor.etat(w.etat || 'montee'); });
    }
    if (N.ev) N.ev.emit('vague', { n: n, etape: 'vague', evt: 'entree', nom: w.nom || ('VAGUE ' + n), quartier: w.quartier || 'docks' });
    if (N.arene && N.arene.entree) O.safe('arene.entree', function () { N.arene.entree(w); });
  }

  /* ============================ les points de naissance (§ 3.8) ============================ */
  var QV = { x: 0, y: 0, w: 0, h: 0 };
  function validePt(x, y, vue) {
    var V = O.VUE, a = CFG.margeVue, A = O.A, P = tete();
    if (x > V.x - a && x < V.x + V.w + a && y > V.y - a && y < V.y + V.h + a) return false;
    if (vue && x > vue.x - a && x < vue.x + vue.w + a && y > vue.y - a && y < vue.y + vue.h + a) return false;
    if (x < A.x0 + CFG.murs || x > A.x1 - CFG.murs || y < A.y0 + CFG.murs || y > A.y1 - CFG.murs) return false;
    if (P && O.d2(x, y, P.x, P.y) < CFG.distTete * CFG.distTete) return false;
    if (O.geo.portrait && y > V.y + V.h && rnd() < (((R && R.apparitions && R.apparitions.portraitBas) !== undefined ? R.apparitions.portraitBas : 0.5))) return false;
    var m = N.arene && N.arene.murArriere ? N.arene.murArriere() : null;
    if (m && m.actif) { if ((m.sens > 0 && x < m.x + 24) || (m.sens < 0 && x > m.x - 24)) return false; }          // devant le mur arrière, jamais derrière
    return true;
  }
  function vueAnt() {
    if (!N.cam || !N.cam.anticipee) return null;
    var q = N.cam.anticipee(CFG.anticipee, QV);
    return q;
  }
  /* un point hors de la vue, au plus à 110 px de son bord, sinon n'importe où dans l'arène */
  function pointHors() {
    var V = O.VUE, A = O.A, vue = vueAnt(), k, x, y;
    for (k = 0; k < 36; k++) {
      x = rr(V.x - 110, V.x + V.w + 110); y = rr(V.y - 110, V.y + V.h + 110);
      if (validePt(x, y, vue)) return { x: x, y: y };
    }
    for (k = 0; k < 40; k++) {
      x = rr(A.x0 + CFG.murs, A.x1 - CFG.murs); y = rr(A.y0 + CFG.murs, A.y1 - CFG.murs);
      if (validePt(x, y, vue)) return { x: x, y: y };
    }
    return null;
  }
  function cote() {
    var P = tete();
    return P ? Math.atan2(P.y, P.x) : 0;
  }
  function logSpawn(e, tele) {
    var V = O.VUE, P = tete();
    var inView = e.x > V.x - e.r && e.x < V.x + V.w + e.r && e.y > V.y - e.r && e.y < V.y + V.h + e.r;
    var dist = P ? Math.sqrt(O.d2(e.x, e.y, P.x, P.y)) : 0;
    stats.spawns.push({ t: Math.round(O.T.t * 100) / 100, k: e.type, x: Math.round(e.x), y: Math.round(e.y), inView: inView, tele: tele || 0, dist: Math.round(dist), vague: st.n });
    if (inView && !(tele >= 0.6)) stats.inView++;
    if (!inView) { if (dist < stats.minDistSpawn) stats.minDistSpawn = Math.round(dist); }
    else if (tele >= 0.6 && dist < stats.minDistTele) stats.minDistTele = Math.round(dist);
  }
  /* créer un ennemi : portail de 600 ms (le double pour une élite), modificateur RAPIDE de la vague 5, compte du quota */
  function mk(type, x, y, o) {
    o = o || {};
    var comptes = N.ennemis.counts();
    if ((type !== 'traqueur' && comptes.regular >= plafond()) || comptes.regular + comptes.traqueur >= secteur().plafondDur.ennemis) return null;
    var w = info(), por = o.portail !== undefined ? o.portail : ((R && R.apparitions && R.apparitions.portail) || 0.6) * (o.elite ? 2 : 1);
    var mods = o.mods || {};
    if (w && w.rapide && !o.elite && type !== 'mine' && type !== 'ruche' && rnd() < w.rapide) { mods = { rapide: true }; }
    var fin = rythmeFormationFin;
    if (fin !== null) fin += (rythmeFormationIndex++ % R.rythme.partition.cascadeNombre) * N.rythme.lire().dureeTemps / R.rythme.partition.divisionsCascade;
    else if (o.elite && N.rythme) fin = N.rythme.naissanceFormation(por);
    var e = N.ennemis.spawn(type, x, y, { portail: por, elite: !!o.elite, mods: mods, st: o.st, rythmeFin: fin === null ? undefined : fin });
    if (!e) return null;
    if (o.cd0 !== undefined) e._cd0 = o.cd0;
    if (o.mere) e._mere = o.mere;
    if (o.tx !== undefined) { e._tx = o.tx; e._ty = o.ty; }
    if (!o.sansCompte) st.spawned++;
    if (type !== 'traqueur') { alimentation.types[type] = (alimentation.types[type] || 0) + 1; alimentation.total++; }
    logSpawn(e, por);
    if (N.ev && (o.elite || type === 'traqueur')) N.ev.emit('portail', { type: type, x: x, y: y, dur: por, elite: !!o.elite });
    return e;
  }
  /* membre d'une formation à (x, y) : s'il est dans le champ, on le recule le long de l'axe depuis la tête, sinon on l'abandonne */
  function membre(type, x, y, a, o) {
    var vue = vueAnt(), P = tete(), k;
    for (k = 0; k < 4; k++) {
      if (validePt(x, y, vue)) return mk(type, x, y, o);
      if (!P) break;
      var d = Math.sqrt(O.d2(x, y, P.x, P.y)) || 1; x += (x - P.x) / d * 10; y += (y - P.y) / d * 10;
    }
    return null;
  }
  function dirTete(p) { var P = tete(); return P ? Math.atan2(P.y - p.y, P.x - p.x) : 0; }

  /* ============================ les formations (§ 4.3) ============================ */
  // Les tailles de réservation et les tailles produites lisent la même règle N.R.
  var NOMS = { file: 'FILE', meute: 'MEUTE', nuee: 'NUÉE', duoMines: 'DUO DE MINES', champMines: 'CHAMP DE MINES', pince: 'PINCE',
    batterie: 'BATTERIE', essaim: 'ESSAIM', duel: 'DUEL', garde: 'GARDE' };
  function ligne(type, p, n, esp, o) {
    var a = dirTete(p), c = Math.cos(a + Math.PI / 2), s = Math.sin(a + Math.PI / 2), made = 0;
    for (var i = 0; i < n; i++) {
      var off = (i - (n - 1) / 2) * esp;
      if (membre(type, p.x + c * off, p.y + s * off, a, o)) made++;
    }
    return made;
  }
  function deuxCotes() {
    var P = tete(), vue = vueAnt(), k, a, b;
    for (k = 0; k < 24; k++) {
      a = pointHors(); b = pointHors();
      if (!a || !b) break;
      if (P) {
        var dx1 = a.x - P.x, dy1 = a.y - P.y, dx2 = b.x - P.x, dy2 = b.y - P.y;
        var cs = (dx1 * dx2 + dy1 * dy2) / ((Math.sqrt(dx1 * dx1 + dy1 * dy1) * Math.sqrt(dx2 * dx2 + dy2 * dy2)) || 1);
        if (cs > -0.2) continue;
      }
      return [a, b];
    }
    a = pointHors(); b = pointHors();
    return a && b ? [a, b] : null;
  }
  function devantTete(d) {
    var P = tete(), A = O.A;
    if (!P) return { x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2 };
    return { x: O.clamp(P.x + Math.cos(P.ang) * d, A.x0 + 24, A.x1 - 24), y: O.clamp(P.y + Math.sin(P.ang) * d, A.y0 + 24, A.y1 - 24) };
  }
  function nbMines() { var c = N.ennemis.counts(); return c.mine || 0; }
  /* formation(nom, opts) -> nombre d'ennemis créés (0 : pas de place, on réessaie) */
  var rythmeFormationFin = null, rythmeFormationIndex = 0;
  function formation(nom, opts) {
    if (N.rythme && !N.rythme.apparitionsPermises()) return 0;
    rythmeFormationFin = N.rythme ? N.rythme.naissanceFormation(R.apparitions.portail) : null;
    rythmeFormationIndex = 0;
    try { return formationFaire(nom, opts); } finally { rythmeFormationFin = null; }
  }
  function formationFaire(nom, opts) {
    var made = 0, p, i, e, n, P = tete(), o = opts || {}, F = effectif(nom);
    if (!P || !F || N.ennemis.counts().regular + taille(nom) > plafond()) return 0;
    if (nom === 'file') { p = pointHors(); if (!p) return 0; made = ligne('fleche', p, F.fleches, CFG.ecartFile); }
    else if (nom === 'meute') {
      p = pointHors(); if (!p) return 0;
      var a = dirTete(p), c = Math.cos(a + Math.PI / 2), s = Math.sin(a + Math.PI / 2), cx = Math.cos(a), cy = Math.sin(a);
      for (i = 0; i < F.fleches; i++) {                             // un V dont la pointe regarde la tête
        var lat = (i - (F.fleches - 1) / 2) * CFG.ecartMeute, back = Math.abs(lat) * 0.8;
        if (membre('fleche', p.x + c * lat - cx * back, p.y + s * lat - cy * back, a, null)) made++;
      }
    } else if (nom === 'nuee') {
      p = pointHors(); if (!p) return 0;
      n = ri(F.larves[0], F.larves[1]);
      for (i = 0; i < n; i++) { var ra = 5 + i * 3, an = i * 0.95; if (membre('larve', p.x + Math.cos(an) * ra, p.y + Math.sin(an) * ra, an, null)) made++; }
    } else if (nom === 'duoMines' || nom === 'champMines') {
      var f = (R && R.formations && R.formations[nom]) || {}, mar = f.marqueurs || 1.5, A = O.A, spots = [];
      if (nbMines() > CFG.maxMines - F.mines) return 0;
      if (nom === 'duoMines') {
        var d0 = Math.max(90, f.distanceMin || 90), lat0 = rr(0, 1) < 0.5 ? 1 : -1;
        for (i = 0; i < F.mines; i++) { var pp = devantTete(d0 + 14 + i * 26); spots.push({ x: pp.x + Math.cos(P.ang + Math.PI / 2) * lat0 * (10 + i * 22), y: pp.y + Math.sin(P.ang + Math.PI / 2) * lat0 * (10 + i * 22) }); }
      } else {
        var cc = devantTete(Math.max(100, f.distanceMin || 100) + 40);
        for (i = 0; i < F.mines; i++) spots.push({ x: cc.x + ((i % F.grille) - (F.grille - 1) / 2) * CFG.ecartMines, y: cc.y + (((i / F.grille) | 0) - (Math.ceil(F.mines / F.grille) - 1) / 2) * CFG.ecartMines });
      }
      for (i = 0; i < spots.length; i++) {
        var sx = O.clamp(spots[i].x, A.x0 + 18, A.x1 - 18), sy = O.clamp(spots[i].y, A.y0 + 18, A.y1 - 18);
        if (O.d2(sx, sy, P.x, P.y) < (nom === 'champMines' ? 100 : 90) * (nom === 'champMines' ? 100 : 90)) continue;
        if (mk('mine', sx, sy, { portail: mar, st: 'pose' })) made++;
      }
    } else if (nom === 'pince') {
      var cs2 = deuxCotes(); if (!cs2) return 0;
      for (i = 0; i < F.dards; i++) if (membre('dard', cs2[i % cs2.length].x, cs2[i % cs2.length].y, 0, null)) made++;
    } else if (nom === 'duel') {
      var ds = deuxCotes(); if (!ds) return 0;
      for (i = 0; i < F.lames; i++) if (membre('lame', ds[i % ds.length].x, ds[i % ds.length].y, 0, null)) made++;
    } else if (nom === 'batterie') {
      p = pointHors(); if (!p) return 0;
      var ab = dirTete(p), cb = Math.cos(ab + Math.PI / 2), sb = Math.sin(ab + Math.PI / 2);
      for (i = 0; i < F.tourelles; i++) {
        var lb = (i - (F.tourelles - 1) / 2) * CFG.ecartBatterie;
        if (membre('tourelle', p.x + cb * lb, p.y + sb * lb, ab, { cd0: 0.9 + i * F.ecartTirs })) made++;
      }
    } else if (nom === 'essaim') {
      p = pointHors(); if (!p) return 0;
      for (var h = 0; h < F.ruches; h++) {
        var hive = membre('ruche', p.x + h * CFG.ecartBatterie, p.y, 0, null);
        if (!hive) continue;
        made++;
        for (i = 0; i < F.larves; i++) { var ar = i / F.larves * O.TAU; var l = mk('larve', hive.x + Math.cos(ar) * (hive.r + 6), hive.y + Math.sin(ar) * (hive.r + 6), { mere: hive.id }); if (l) made++; }
      }
    } else if (nom === 'garde') {
      p = pointHors(); if (!p) return 0;
      for (i = 0; i < F.sentinelles; i++) if (membre('sentinelle', p.x + i * CFG.ecartBatterie, p.y, 0, null)) made++;
      var ag = dirTete(p), cg = Math.cos(ag + Math.PI / 2), sg = Math.sin(ag + Math.PI / 2);
      for (i = 0; i < F.fleches; i++) { var lg = (i - (F.fleches - 1) / 2) * CFG.ecartFile; if (membre('fleche', p.x + cg * lg - Math.cos(ag) * 16, p.y + sg * lg - Math.sin(ag) * 16, ag, null)) made++; }
    } else return 0;
    if (made > 0 && !o.sansEtiquette) {
      var nm = NOMS[nom] || nom.toUpperCase();
      if (!st.vus[nom]) { st.vus[nom] = true; banniere(nm, { c: 'magenta', duree: 1.2 }); } else etiquette(nm);
    }
    return made;
  }

  /* ============================ le pic de la vague : une élite avec bannière (§ 4.5) ============================ */
  function lancerPic() {
    var w = info(), pc = w && w.pic;
    if (!pc) return true;
    var E = (R && R.elites && R.elites[pc.elite]) || {}, p = pointHors();
    if (!p) return false;
    var e;
    if (pc.elite === 'rival') e = mk('rival', p.x, p.y, { elite: true });
    else e = mk(E.type || 'fleche', p.x, p.y, { elite: true, mods: (E.mods || []).reduce(function (m, k) { m[k] = true; return m; }, {}) });
    if (!e) return false;
    if (pc.avec) formation(pc.avec, { sansEtiquette: true });
    if (pc.banniere) banniere(E.nom || pc.elite.toUpperCase(), { c: 'magenta', duree: 2.2, clignote: true });
    if (N.ev) N.ev.emit('vague', { n: st.n, etape: 'vague', evt: 'pic', nom: w.nom || ('VAGUE ' + st.n), quartier: w.quartier || 'docks' });
    if (N.arene && N.arene.pic) O.safe('arene.pic', function () { N.arene.pic(); });
    O.sfx('portail');
    return !!e;
  }
  /* la PASTILLE : un seul objet par vague, devant la tête, qui lance l'INVERSION quand on la prend (72-ennemis) */
  function poserPastille() {
    var P = tete(), A = O.A;
    if (!P) return false;
    var d = [70, 90, 55, 110], i;
    for (i = 0; i < d.length; i++) {
      var q = devantTete(d[i]);
      if (O.d2(q.x, q.y, P.x, P.y) > 45 * 45 && q.x > A.x0 + 20 && q.x < A.x1 - 20) {
        if (N.butin && N.butin.lacher) N.butin.lacher(q.x, q.y, 1, { type: 'pastille', vie: (R && R.butin && R.butin.pastille && R.butin.pastille.expire) || 12 });
        O.sfx('pastille');
        return true;
      }
    }
    return false;
  }
  /* le TRAQUEUR, de la vague 2 à la vague 5 : il entre si la joueuse n'a ni détruit ni ramassé quoi que ce soit pendant 7 s */
  function traqueur() {
    var T = secteur().traqueur;
    if (T.vagues.indexOf(st.n) < 0 || st.tw < 6) return;
    var now = O.T.t, inaction = now - st.derniereAction;
    if (st.traqueurs >= CFG.maxTraqueurs) return;
    if (st.traqueurs === 0 && inaction < (T.inaction || 7)) return;
    if (st.traqueurs === 1 && (inaction < (T.inaction || 7) || now - st.traqueurT < (T.second || 6))) return;
    var p = pointHors();
    if (!p) return;
    if (!mk('traqueur', p.x, p.y, { portail: T.annonce, sansCompte: true })) return;
    st.traqueurs++; st.traqueurT = now;
    banniere('TRAQUEUR', { c: 'magenta', duree: T.annonce || 1.5, clignote: true });
    O.sfx('traqueur');
  }

  // Pression normalisée, calculée uniquement depuis la vue publique des ennemis.
  function intensite() {
    var poids = R.intensite.poids, total = 0, L = N.ennemis.list;
    for (var i = 0; i < L.length; i++) {
      var e = L[i];
      if (e.etat !== 'mort' && e.etat !== 'portail' && !e.boss && e.type !== 'traqueur' && (!N.cam || !N.cam.shown || N.cam.shown(e.x, e.y, e.r))) total += poids[e.type] || 1;
    }
    return O.clamp(total / (Math.max(1, plafond()) * R.intensite.referencePoids), 0, 1);
  }
  function cibleIntensite() {
    var c = R.intensite, w = info(), u = O.clamp(st.tw / Math.max(R.temps.h, w.duree * c.courbe.creteA), 0, 1);
    return c.cibles[st.n - 1] * (c.courbe.entree + (c.courbe.crete - c.courbe.entree) * u);
  }
  function rencontre() {
    var c = R.intensite, types = c.types[st.n - 1], candidats = [], min = Infinity;
    for (var i = 0; i < types.length; i++) {
      var type = types[i], n = alimentation.types[type] || 0;
      if (type === 'mine' && nbMines() >= CFG.maxMines) continue;
      if (type === 'fleche' && (n + 1) / (alimentation.total + 1) > c.flecheMax) continue;
      if (n < min) { candidats.length = 0; min = n; }
      if (n === min) candidats.push(type);
    }
    return candidats.length ? candidats[ri(0, candidats.length - 1)] : null;
  }
  function pointRencontre() {
    // Le plus proche des points sûrs : une rencontre hors champ doit pouvoir rejoindre l'action.
    // Aucun point dans la vue courante ou anticipée n'est admis.
    var best = null, dist = Infinity, P = tete();
    for (var i = 0; i < R.intensite.placement.candidatMax; i++) {
      var p = pointHors(); if (!p) continue;
      var d = O.d2(p.x, p.y, P.x, P.y);
      if (d < dist) { best = p; dist = d; }
    }
    return best;
  }
  function alimenter(dt, w) {
    var c = R.intensite, pression = intensite(), cible = cibleIntensite();
    alimentation.credit = Math.min(c.creditMax, alimentation.credit + dt * c.debits[st.n - 1]);
    if (!st.beat) return;
    var n = 0;
    while (alimentation.credit >= 1 && vivants() < plafond() && n < c.parTempsMax && pression < cible) {
      var type = rencontre(), p = pointRencontre();
      if (!type || !p || !mk(type, p.x, p.y)) break;
      alimentation.credit--; n++; pression = intensite();
    }
  }

  /* ============================ la vague ============================ */
  function vivants() { var c = N.ennemis.counts(); return c.regular; }
  /* Une vraie baisse de densité, avant le nettoyage et le pic suivant. La vague
     cesse d'alimenter le terrain à sa durée nominale (ou dès son objectif atteint).
     La purge publique retire les attaques sans score de combat ; le chronomètre
     ne compte que les pas effectivement sous le seuil strict de N.R. */
  function respirer(w, c, dt) {
    if (!repos.demande || repos.fini) return;
    var r = R.secteurs[st.secteur].respiration;
    if (c.regular < r.part * Math.max(1, repos.pic)) {
      if (repos.debut === null) repos.debut = st.tw;
      repos.duree = st.tw - repos.debut;
    } else { repos.duree = 0; repos.debut = null; }
    if (repos.duree + 1e-9 >= r.duree) {
      repos.fini = true;
      var recu = { n: st.n, pic: repos.pic, debut: repos.debut, fin: st.tw, duree: repos.duree, part: r.part };
      stats.respirations.push(recu);
      if (N.journal) N.journal('respiration', recu);
    }
  }
  function demanderRespiration(w) {
    if (repos.demande) return;
    repos.demande = true;
    if (N.hud && N.hud.reserverBanniere) N.hud.reserverBanniere(true);
    N.ennemis.purge('indifferent');
    if (N.arene && N.arene.nettoyee) N.arene.nettoyee();
    if (N.decor && N.decor.etat) N.decor.etat('calme');
    etiquette('RESPIRATION');
  }
  function update(dt) {
    if (st.phase !== 'vague') return;
    var w = info(); if (!w) return;
    if (!repos.demande && N.ennemis.desengagerHorsCombat) N.ennemis.desengagerHorsCombat(dt, R.intensite.horsCombat);
    var P = tete(), c = N.ennemis.counts(), i;
    st.tw += dt;
    st.alive = c.regular;
    if (c.regular > repos.pic) repos.pic = c.regular;
    respirer(w, c, dt);
    if (c.regular > stats.maxAlive) stats.maxAlive = c.regular;
    var datePic = st.rythmePic !== null && N.rythme ? Math.max(0, st.rythmePic - R.temps.tempsParMesure * N.rythme.lire().dureeTemps) : w.pic && w.pic.t;
    var picEnAttente = w.pic && !st.picFait && st.tw >= datePic;
    var chassePause = repos.demande || picEnAttente || (N.ennemis.inversion && N.ennemis.inversion() > 0) || (N.rythme && !N.rythme.apparitionsPermises());
    /* la grille des temps de jeu : on n'apparaît qu'au changement de temps (au plus tard 0,41 s plus tard) */
    var b = N.rythme ? N.rythme.tempsCle() : N.music && N.music.grille ? Math.floor(N.music.grille(O.T.t).total) : Math.floor(O.T.t / secteur().grilleTemps); st.beat = b !== st.lastBeat; st.lastBeat = b;
    /* le virage de plus de 45° du premier ennemi de la première partie */
    if (st.gate > 0 && P) {
      if (st.angPrec !== null) st.turn += Math.abs(O.wrapA(P.ang - st.angPrec));
      st.angPrec = P.ang;
      if (st.turn > secteur().premierEnnemi.apresVirageDeg * Math.PI / 180 && st.tw < st.gate) st.gate = st.tw;
    }
    var cap = plafond(), regl = reglage();
    if (!chassePause && N.serpents && N.serpents.pasPartie) N.serpents.pasPartie(dt, cap);
    var calendrierMusical = N.rythme && N.rythme.calendrier(st.n);
    var formationMusicale = calendrierMusical && calendrierMusical.regle.formationDrop;
    /* les formations datées : la première seule pendant l'entrée de 6 s ; elles attendent si le plafond est atteint */
    if (formationMusicale && !chassePause && st.beat && st.tw >= st.prochainGroupe) {
      for (i = 0; i < st.queue.length; i++) {
        var q = st.queue[i];
        if (q.fait || q.f !== formationMusicale) continue;
        if (q.t > st.tw) break;
        if (i > 0 && st.tw < secteur().entree) break;                            // entrée calme de 6 s : seule la première formation
        if (i === 0 && st.gate > st.tw) break;
        if (N.ennemis.counts().regular + taille(q.f) > cap) break;      // le plafond ne cesse jamais de s’appliquer
        if (!q.annonce) {                                                   // annoncée 1 s avant (§ 4.3) : son nom d'abord, ses ennemis ensuite
          q.annonce = st.tw;
          q.rythmeFinAnnonce = N.rythme ? N.rythme.annonce(R.formations.annonce).t : null;
          var nm = NOMS[q.f] || q.f.toUpperCase();
          if (!st.vus[q.f]) { st.vus[q.f] = true; banniere(nm, { c: 'magenta', duree: 1.4 }); } else etiquette(nm);
          break;
        }
        if (q.rythmeFinAnnonce !== null && N.rythme ? N.rythme.lire().t < q.rythmeFinAnnonce : st.tw - q.annonce < R.formations.annonce) break;
        var made = formation(q.f, { sansEtiquette: true });
        if (made > 0) { q.fait = true; st.prochainGroupe = st.tw + (regl.intervalle || 0); break; }
        q.essais++;
        if (q.essais > CFG.essaisFormation) { q.fait = true; }
        break;
      }
    }
    // L'alimentation suit une pression pondérée et une dette de débit bornée.
    // Aucun changement de grille musicale ici : r2b garde le propriétaire du rythme.
    if (!chassePause && !(st.gate > st.tw)) alimenter(dt, w);
    var quota = regl.quota !== undefined ? regl.quota : w.quota;
    /* le pic, entre 55 et 75 % de la durée */
    if (!repos.demande && !st.picFait && w.pic && st.tw >= datePic && (!N.rythme || N.rythme.apparitionsPermises())) { if (lancerPic()) st.picFait = true; }
    if (!repos.demande && !st.pastilleFaite && w.pastille && st.tw >= w.pastille) { st.pastilleFaite = poserPastille(); if (!st.pastilleFaite && st.tw > w.pastille + 6) st.pastilleFaite = true; }
    if (!chassePause) traqueur();
    /* la traque de fin de vague (Cruise Elroy) : moins de 20 % du quota à venir, les dernières flèches accélèrent de 30 % */
    if (!st.elroy && st.spawned >= quota * (1 - secteur().elroy.reste)) st.elroy = true;
    if (st.elroy) for (i = 0; i < N.ennemis.list.length; i++) { var en = N.ennemis.list[i]; if (en.type === 'fleche') en._traque = true; }
    /* énergie libre : toujours un peu à prendre */
    st.freeCd -= dt;
    if (st.freeCd <= 0) {
      st.freeCd = CFG.energieLibre;
      if (N.butin.nbLibres() < CFG.energieMin) N.butin.libre(0.5);
    }
    /* La respiration fait partie du budget V1. Les autres budgets sont
       explicités dans N.R ; le combat nominal V4/V5 reste intact.
       Une queue suspendue ne peut plus conditionner la fin après la purge. */
    var tousLances = st.queue.every(function (q) { return q.fait; });
    var quotaFait = st.spawned >= quota * CFG.quotaPart;
    var objectif = tousLances && quotaFait && c.regular <= secteur().finVague.vivantsMax && st.tw > CFG.vagueMin;
    var debutRepos = regl.dureeMax !== undefined ? regl.dureeMax - secteur().respiration.duree : w.duree;
    if ((!w.pic || st.picFait) && (objectif || st.tw + 1e-9 >= debutRepos)) demanderRespiration(w);
    if (!st.fini && repos.fini) terminerVague('nettoyee', w);

  }
  function terminerVague(evt, w) {
    st.fini = true; st.phase = 'nettoyage'; st.nettoye = true;
    stats.parVague.push({ n: st.n, duree: st.tw, spawns: st.spawned });
    if (st.n === 1) st.premiere = false;
    if (N.ennemis.fuir) N.ennemis.fuir();
    if (N.arene && N.arene.nettoyee) O.safe('arene.nettoyee', function () { N.arene.nettoyee(); });
    if (N.ev) N.ev.emit('vague', { n: st.n, etape: 'vague', evt: evt, nom: w.nom || ('VAGUE ' + st.n), quartier: w.quartier || 'docks' });
  }

  /* le gros ennemi : N.colosse (73-colosse.js) mène le combat ; 79-jeu a déjà passé WARNING et le panneau */
  function lancerBoss() {
    st.phase = 'boss';
    if (N.arene && N.arene.nettoyee) O.safe('arene.nettoyee', function () { N.arene.nettoyee(); });      // plus de TRAVELLING ni de CONVOIS pendant le combat
    if (N.colosse && N.colosse.start) { O.safe('colosse.start', function () { N.colosse.start(); }); return null; }
    return null;
  }

  function progression() {
    var vs = vagues(), tot = 0, fait = 0;
    for (var i = 0; i < vs.length; i++) { tot += vs[i].duree; if (i + 1 < st.n) fait += vs[i].duree; else if (i + 1 === st.n) fait += Math.min(st.tw, vs[i].duree); }
    if (st.phase === 'boss' || st.n > vs.length) return 1;
    return tot > 0 ? O.clamp(fait / tot, 0, 1) : 0;
  }
  /* croissante vague après vague (critère 6 de DIRECTION.md) : 0,06 au départ, 1 au colosse ; la densité du moment s'y ajoute */
  function tension() {
    if (st.phase === 'attente') return 0.06;
    if (st.phase === 'boss') return 1;
    if (repos.demande) return R.secteurs[st.secteur].respiration.part * 0.06;
    var w = info(), dens = w && w.plafond ? O.clamp(st.alive / w.plafond, 0, 1) : 0;
    return O.clamp(0.06 + 0.62 * progression() + 0.3 * dens, 0, 1);
  }

  /* `kill` rang 10 : la mort de l'œil du gros ennemi ferme le secteur (79-jeu lit bossMort(), puis passe en VICTOIRE) ;
     la dernière action de la joueuse repousse le TRAQUEUR ; N.colosse est prévenu de chaque kill (il n'a pas d'écouteur) */
  if (N.ev) {
    N.ev.on('kill', 10, function (c) {
      var decor = c.src && c.src.genre === 'decor';
      if (!decor) st.derniereAction = O.T.t;
      if (N.colosse && N.colosse.surKill) O.safe('colosse.surKill', function () { N.colosse.surKill(c); });
      if (c.boss && !decor && !(N.colosse && N.colosse.estOeil && !N.colosse.estOeil(c.id))) st.bossMort = true;
    }, '76-directeur');
    N.ev.on('ramassage', 10, function () { st.derniereAction = O.T.t; }, '76-directeur');
    N.ev.on('inversion', 10, function (c) { if (c.evt === 'fin') st.derniereAction = O.T.t; }, '76-directeur');
  }

  return {
    bossMort: function () { return st.bossMort; },
    reset: reset, update: update, vague: function () { return st.n; }, phase: function () { return st.phase; },
    intensite: intensite, cibleIntensite: cibleIntensite,
    tension: tension, progression: progression, entrees: function () { return st.entrees; },
    demarrer: demarrer, info: info, lancerBoss: lancerBoss, fini: function () { return st.fini; }, stats: stats,
    plafond: plafond, effectif: effectif, tailleFormation: taille,
    tempsVague: function () { return st.tw; }, nombreVagues: function () { return vagues().length; },
    fin: function () { st.phase = 'attente'; }, formation: formation,
    respiration: function () { return { active: repos.demande, finie: repos.fini, pic: repos.pic, duree: repos.duree, debut: repos.debut }; }
  };
})();
