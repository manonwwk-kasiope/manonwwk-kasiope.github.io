/* ===== 79-scene.js — N.scene : la mise en scène des temps forts (REFONTE.md § 5.3) et de la mort (§ 5.4) =====

   C'est le SEUL module qui transforme un événement de jeu (§ 7.4) en explosion, gel, poussée de caméra, son, voix et
   bannière. Les autres modules signalent ; celui-ci montre. Il consomme les événements au rang 60, sous le nom
   '79-scene' : kill, coup, coupe, mort, ramassage, lasso, niveau, vague, vol, inversion, arene, phase, portail, arme,
   pouvoir, apogee, boost, defi. (`carte` n'a pas de consommateur 60 au tableau du § 7.4 : voir demandes.md.)

   UNE VOIX À LA FOIS. Une seule phrase de la machine (N.music.voix) et une seule bannière à l'écran :
     - voix : la plus prioritaire couvre la moins prioritaire pendant 1 s ; jamais deux ensemble ;
     - bannière : jamais deux textes à la fois ; une toutes les 10 s au plus, sauf les événements structurels (vague,
       inversion, traqueur : priorité 1) et ceux du CYCLOPE (priorité 2) ;
     - gel : un gel d'image de kill ordinaire au plus toutes les 0,12 s ; un ralenti et un gel ne se cumulent pas
       au-delà de 0,5 s (N.fx.ralenti s'en charge).

   LA MORT (§ 5.4). 79-jeu.js séquence (gel de 10 images, cue 'mort', remappage du monde, désintégration du corps, READY ou
   SIGNAL PERDU) ; ce module la MONTRE : un anneau cyan pâle → cyan → indigo à la place de chaque segment qui disparaît, au
   rythme exact de la désintégration de 79-jeu, des éclats cyan, puis la tête qui explose en cyan (boom « joueuse »), le glitch
   de 0,3 s si c'était la dernière vie, la vignette. Le RALENTI À 0,25 est VISUEL (N.fx.ralenti(…, {visuel:true})) : il étire les
   anneaux et les éclats, mais pas l'horloge de la séquence, dont les durées testées (réapparition entre 0,9 et 1,4 s, saut dès
   0,5 s) ne bougent pas. drawCause() redessine, par-dessus le monde remappé, la CAUSE entourée d'un anneau magenta d'un pixel
   qui clignote à 3 Hz.

   Interface (§ 7.8) : N.scene = { reset(), update(dt), drawCause(), stats }. Tout le reste passe par N.ev.
   Repli : sans N.fx, N.hud, N.cam, N.decor ou N.music, chaque appel est ignoré (le jeu se joue, sans cette couche). */
N.scene = (function () {
  'use strict';
  var O = N.outils, R = N.R || {};
  var RS = R.scene || {}, RM = R.mortScene || {}, RC = (R.colosse && R.colosse.mort) || { arretImages: 24, explosions: 5, cascade: 0.66, camera: 6 };
  var KL = RS.kill || { force: 0.32, forceTireur: 0.45, parEnchaine: 0.03, forceMax: 0.58, recul: 1, gelImages: 2, gelIntervalle: 0.12 };   // → N.R
  var BUD = (RS.budgets && RS.budgets.banniereIntervalle) || 10;
  var DIS = (RM.desintegre) || { debut: 0.17, fin: 0.9, ralenti: 0.25, imagesParSegment: 2 };
  var DISSOLUTION = 0.73;                       // → N.R : durée de la désintégration en temps de jeu, celle de 79-jeu.js (CFG.mort.dissolution)
  var TAU = Math.PI * 2;

  var T = 0, empreinteFin = -99, impactEnAttente = null, impactPlanifie = false, impactSerie = 0, hsCd = 0, banFin = -99, banDeb = -99, voixFin = -99, voixPrio = -1, portailCd = 0, armeCd = 0, dangerT = 0, dangerCycle = -1;
  var mt = -1, mortN = 0, mortLen = 0, mortP = new Float32Array(128), mortHX = 0, mortHY = 0, mortGO = false, mortTete = false;
  /* ce que la scène a produit, pour les tests (« chaque effet attendu au § 5.3 exactement une fois ») */
  var ST = { booms: 0, gels: 0, ondes: 0, bannieres: 0, voix: 0, poussees: 0, sons: {} };

  /* ============================ les appels, tous gardés ============================ */
  function head() { return N.joueuse && N.joueuse.tete; }
  function fx() { return N.fx; }
  function boom(x, y, f, ci, v) { ST.booms++; if (N.fx && N.fx.boom) { try { return N.fx.boom(x, y, f, ci, v); } catch (e) { sig('boom', e); } } }
  function gel(n) { ST.gels++; if (N.fx && N.fx.hitstop) { try { N.fx.hitstop(n); } catch (e) { sig('hitstop', e); } } }
  function mouvementReduit() {
    if (N.fx && N.fx.options && N.fx.options().reduced) return true;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function shake(a) { if (mouvementReduit()) return; if (N.fx && N.fx.shake) { try { N.fx.shake(a); } catch (e) { sig('shake', e); } } }
  function onde(x, y, r0, r1, ci, d, o) { ST.ondes++; if (N.fx && N.fx.onde) { try { N.fx.onde(x, y, r0, r1, ci, d, o); } catch (e) { sig('onde', e); } } }
  function ralenti(k, d, o) { if (N.fx && N.fx.ralenti) { try { N.fx.ralenti(k, d, o); } catch (e) { sig('ralenti', e); } } }
  function apres(s, f) { if (N.fx && N.fx.apres) { if (!N.fx.apres(s, f)) f(); } else f(); }
  function sfx(nom, o) { ST.sons[nom] = (ST.sons[nom] || 0) + 1; O.sfx(nom, o); }
  function cue(nom) { if (N.music && N.music.cue) { try { N.music.cue(nom); } catch (e) { sig('cue', e); } } }
  function jolt(dx, dy) { if (mouvementReduit()) return; ST.poussees++; if (N.cam && N.cam.jolt) { try { N.cam.jolt(dx, dy); } catch (e) { sig('jolt', e); } } }
  function sig(w, e) { if (N.socle && N.socle.signaler) N.socle.signaler('scene→' + w, e); }
  function pan(x) { var V = O.VUE; return V.w > 0 ? O.clamp((x - V.x - V.w / 2) / (V.w / 2), -1, 1) : 0; }
  function nom(t) { return (N.ids && N.ids.noms && N.ids.noms[t]) || String(t || '').toUpperCase(); }

  /* la voix : une à la fois, la plus prioritaire couvre l'autre */
  function voix(mot, prio) {
    if (T < voixFin && prio <= voixPrio) return false;
    if (!N.music || !N.music.voix) return false;
    var ok = false;
    try { ok = !!N.music.voix(mot); } catch (e) { sig('voix', e); }
    voixFin = T + 1.0; voixPrio = prio; ST.voix++;
    return ok;
  }
  /* la bannière : jamais deux à la fois ; budget d'une toutes les 10 s (prio 0) */
  function banniere(txt, opts, prio) {
    if (!N.hud || !N.hud.banniere) return false;
    if (T < banFin) return false;
    if (prio === 0 && T - banDeb < BUD) return false;
    try { N.hud.banniere(txt, opts); } catch (e) { sig('banniere', e); return false; }
    banFin = T + ((opts && opts.duree) || 2) + 0.25; if (prio === 0) banDeb = T;
    ST.bannieres++;
    return true;
  }
  function pop(x, y, txt, c) { if (N.hud && N.hud.pop) { try { N.hud.pop(x, y, txt, { c: c || 'jaune' }); } catch (e) { sig('pop', e); } } }
  function tag(txt) { if (N.hud && N.hud.tag) { try { N.hud.tag(txt); } catch (e) { sig('tag', e); } } }

  /* ============================ les temps forts ============================ */
  function recul(x, y, k) {                        // la caméra part à l'opposé de l'impact (de l'ennemi vers la tête)
    var h = head(); if (!h) return;
    var dx = h.x - x, dy = h.y - y, m = Math.sqrt(dx * dx + dy * dy);
    if (m > 0.01) jolt(dx / m * k, dy / m * k);
  }
  /* Une admission, une empreinte ; la file privilégie boss et élites sans réserver
     de place dans le limiteur global. Un refus ne consomme pas notre cadence. */
  function rappelSecousse(imageMort) {
    if (mouvementReduit() || !N.fx || !N.fx.apres || !N.S) return;
    var image = imageMort + RS.impactContinu.rappelImages;
    var fin = image + RS.impactContinu.rappelDureeImages;
    var restant = (RS.impactContinu.rappelImages + RS.impactContinu.rappelDureeImages + 1) * R.temps.pasMax, serie = impactSerie;
    function attendre() {
      if (serie !== impactSerie || mouvementReduit()) return;
      if (--restant <= 0 || N.S.frame >= fin) return;
      if (N.S.frame >= image) shake(RS.impactFort.secousse);
      N.fx.apres(0, attendre);
    }
    N.fx.apres(0, attendre);
  }
  function planifierImpact() {
    if (impactPlanifie || !impactEnAttente || !N.fx || !N.fx.apres) return;
    var serie = impactSerie;
    impactPlanifie = true;
    if (!N.fx.apres(0, function () {
      if (serie !== impactSerie) return;
      impactPlanifie = false; essayerImpact();
    })) impactPlanifie = false;
  }
  function essayerImpact() {
    var p = impactEnAttente, F = RS.impactContinu, G = N.gfx;
    if (!p || !F || !G || !N.fx || !N.fx.flashGate || !N.S) return false;
    var image = N.S.frame;
    if (--p.pas <= 0 || image - p.imageMort > F.attenteImages) { impactEnAttente = null; return false; }
    if (p.derniereImage === image || T < empreinteFin) { planifierImpact(); return false; }
    p.derniereImage = image;
    var rayon = Math.sqrt(G.W * G.H * F.aire / Math.PI) / (1 + F.epaisseurFacteur / 2);
    var epaisseur = rayon * F.epaisseurFacteur, aire = Math.PI * Math.pow(rayon + epaisseur / 2, 2);
    if (!N.fx.flashGate(aire, { type: 'scene', ci: O.BRASIER })) { planifierImpact(); return false; }
    impactEnAttente = null; empreinteFin = T + F.intervalle;
    onde(p.charge.x, p.charge.y, rayon, rayon, O.BRASIER, F.duree, { epaisseur: epaisseur });
    shake(RS.impactFort.secousse);
    if (p.charge.elite || p.charge.boss) rappelSecousse(p.imageMort);
    return true;
  }
  function explosionForte(c) {
    var F = RS.impactContinu, p = impactEnAttente;
    if (!F || !N.S) return false;
    if (p && ((p.charge.boss && !c.boss) || (p.charge.elite && !c.elite && !c.boss))) {
      if (!mouvementReduit()) boom(c.x, c.y, RS.impactFort.forceAttenuee, O.MAGENTA);
      return false;
    }
    impactEnAttente = { charge: c, imageMort: N.S.frame, derniereImage: -1,
      pas: (F.attenteImages + 1) * R.temps.pasMax };
    if (T < empreinteFin && !mouvementReduit()) boom(c.x, c.y, RS.impactFort.forceAttenuee, O.MAGENTA);
    var admis = essayerImpact();
    if (!admis) planifierImpact();
    return admis;
  }
  function colosseMort(c) {
    var cas = RC.cascade || 0.66;
    gel(RC.arretImages || 24);
    var fort = explosionForte(c);
    if (fort) shake(RS.impactFort.secousse);
    if (fort && !mouvementReduit() && N.cam && N.cam.secousse) { try { N.cam.secousse(RC.camera || 6, 0, 1); } catch (e) { sig('secousse', e); } }
    sfx('colosseMort');
    // Le colosse produit déjà ses explosions publiques : ne pas superposer une deuxième cascade.
    if (N.ennemis && N.ennemis.effacerTirs) { try { N.ennemis.effacerTirs(c.x, c.y, 140); } catch (e) { sig('effacerTirs', e); } }
    apres(cas + 0.6, function () { banniere('SECTEUR NETTOYÉ', { c: 'jaune', duree: 2.6 }, 2); });
  }
  function onKill(c) {
    if (c.src && c.src.genre === 'decor') {
      if (mouvementReduit() && (c.boss || c.elite || c.type === 'rival')) explosionForte(c);
      else boom(c.x, c.y, c.boss ? 1 : 0.36, O.MAGENTA);
      return;
    }
    if (c.boss) { colosseMort(c); return; }
    var ch = N.score && N.score.chaine ? N.score.chaine() : 1;
    var fort, rival = c.type === 'rival', crash = rival && c.src && c.src.genre !== 'arme';
    if (crash) {                                                    // RIVAL écrasé : explosion d'élite au point du choc
      fort = explosionForte(c); gel((RS.rival && RS.rival.gelImages) || 6); if (fort) shake(RS.impactFort.secousse);
      sfx('crash', { pan: pan(c.x) });
      pop(c.x, c.y - 12, 'CRASH !', 'rose'); banniere('CRASH !', { c: 'rose', duree: 1.2 }, 0);
      recul(c.x, c.y, RS.impactFort.reculCrash);
    } else if (c.elite || rival) {                                  // élite : empreinte chaude admise, secousse bornée
      var E = RS.elite || { force: 0.8, gelImages: 5, ondule: 48 };
      fort = explosionForte(c); gel(E.gelImages); if (fort) shake(RS.impactFort.secousse);
      sfx('bigkill', { pan: pan(c.x) });
      banniere(nom(c.type), { c: 'magenta', duree: 1.2 }, 0);
      recul(c.x, c.y, RS.impactFort.reculElite);
    } else {
      var tireur = c.type === 'tourelle' || c.type === 'sentinelle';
      var f = Math.min(KL.forceMax, (tireur ? KL.forceTireur : KL.force) + KL.parEnchaine * Math.max(0, ch - 1));
      boom(c.x, c.y, f, O.MAGENTA);
      sfx(f > 0.5 ? 'bigkill' : 'kill', { pitch: Math.min(14, ch - 1), pan: pan(c.x) });
      if (hsCd <= 0) { gel(KL.gelImages); hsCd = KL.gelIntervalle; recul(c.x, c.y, KL.recul); }
    }
    var g = N.score && N.score.gain ? N.score.gain() : null;
    if (g && g.pts > 0 && g.x !== null && g.t === O.T.t && !crash) pop(c.x, c.y - 8, '+' + g.pts, 'jaune');
  }
  function onCoup(c) {
    var h = head(); if (!h) return;
    if (!c.absorbe) sfx('degat', { pan: pan(c.x) });
    if (N.fx && N.fx.spark) { try { N.fx.spark(c.x, c.y, h.x - c.x, h.y - c.y, 5, O.CYAN); } catch (e) { sig('spark', e); } }
    if (N.fx && N.fx.vignette) { try { N.fx.vignette(Math.atan2(c.y - h.y, c.x - h.x), 0.6); } catch (e) { sig('vignette', e); } }
    recul(c.x, c.y, 3);
  }
  function onCoupe(c) {
    var CP = RS.coupe || { gelImages: 3 }, h = head();
    gel(CP.gelImages); sfx('coupe', { pan: pan(c.x) });
    boom(c.x, c.y, 0.28, O.CYAN);
    if (h) {
      if (N.fx && N.fx.vignette) { try { N.fx.vignette(Math.atan2(c.y - h.y, c.x - h.x), 0.85); } catch (e) { sig('vignette', e); } }
      recul(c.x, c.y, 4);
    }
    tag('-' + (c.perdus | 0));
  }
  function onRamassage(c) {
    sfx(c.type === 'noyau' ? 'noyau' : (c.type === 'pastille' ? 'pastille' : 'butin'), { pitch: N.joueuse && N.joueuse.len ? N.joueuse.len() : 8, pan: pan(c.x) });
    if (N.fx && N.fx.pickup) { try { N.fx.pickup(c.x, c.y); } catch (e) { sig('pickup', e); } }
  }
  function onLasso(c) {
    var n = c.n | 0, L = RS.lasso || { gelImages: 4, gelDes: 4 };
    if (N.fx && N.fx.lasso) { try { N.fx.lasso(c.poly, n); } catch (e) { sig('lasso', e); } }
    if (n >= L.gelDes) gel(L.gelImages);
    sfx('lasso', { n: n, pitch: n });
    onde(c.x, c.y, 6, 20 + 7 * Math.min(n, 8), O.CYANP, 0.4);
    pop(c.x, c.y - 10, 'LASSO ×' + n, 'jaune');
    if (n >= 4) { voix('EXCELLENT', 1); banniere('LASSO ×' + n, { c: 'jaune', duree: 1.4 }, 0); }
  }
  function onNiveau() {
    var h = head(), V = RS.niveau || { ralenti: 0.15, duree: 0.35 };
    if (h) onde(h.x, h.y, 5, 70, O.JAUNE, 0.45, { epaisseur: 3 });
    ralenti(V.ralenti, V.duree);
    sfx('levelup');
  }
  function onVague(c) {
    var h = head();
    if (c.evt === 'entree') banniere(['VAGUE ' + c.n, c.nom || ''], { c: 'jaune', duree: 2.0 }, 1);
    else if (c.evt === 'nettoyee') {
      if (h) { onde(h.x, h.y, 6, 170, O.JAUNE, 0.7, { epaisseur: 4 }); onde(h.x, h.y, 3, 110, O.OS, 0.5, { epaisseur: 2 }); }
      cue('stinger');
      var st = N.score && N.score.stats, parfait = st && st.coupes === (onVague.coupes0 | 0);
      banniere(parfait ? ['VAGUE ' + c.n + ' NETTOYÉE', 'PARFAIT'] : 'VAGUE ' + c.n + ' NETTOYÉE', { c: 'jaune', duree: (RS.vague && RS.vague.duree) || 2.5 }, 1);
    }
    if (c.evt === 'entree' && N.score && N.score.stats) onVague.coupes0 = N.score.stats.coupes | 0;
  }
  function onVol(c) {
    if (c.evt === 'fin' && c.parfait) { sfx('porte', { pitch: 12 }); banniere('VOL PARFAIT', { c: 'jaune', duree: 1.6 }, 1); }
  }
  function onInversion(c) {
    var h = head();
    if (c.evt === 'debut') {
      cue('inversion');
      if (N.music && N.music.couche) { try { N.music.couche('inversion', true); } catch (e) { sig('couche', e); } }
      if (h) onde(h.x, h.y, 6, 120, O.ROSE, 0.6, { epaisseur: 3 });
      banniere('INVERSION !', { c: 'rose', duree: 1.6 }, 1);
    } else if (N.music && N.music.couche) { try { N.music.couche('inversion', false); } catch (e) { sig('couche', e); } }
  }
  function onArene(c) {
    if (c.evt === 'travelling') { sfx('travelling'); banniere('LE PLATEAU AVANCE', { c: 'magenta', duree: 1.8 }, 1); }
    else if (c.evt === 'convoiAnnonce') sfx('convoi', { pan: c.voie !== undefined && c.vx ? (c.vx > 0 ? -0.6 : 0.6) : 0 });
    else if (c.evt === 'convoiPasse') { jolt(0, (RS.convoi && RS.convoi.jolt) || 2); pop(head() ? head().x : 0, head() ? head().y - 14 : 0, 'BROYÉ', 'rose'); }
  }
  function onPhase(c) {
    if (c.evt === 'arrivee') {
      var A = RS.cyclope;
      if (A) ralenti(A.ralenti, A.duree, { long: true });
    } else if (c.evt === 'entree') banniere(c.n ? 'PHASE ' + c.n : 'LE CYCLOPE', { c: 'magenta', duree: 2.0 }, 2);
    else if (c.evt === 'enrage') banniere("LE CYCLOPE S'EMBALLE", { c: 'magenta', duree: 2.0, clignote: true }, 2);
    else if (c.evt === 'repit') { sfx('vague'); tag('RÉPIT'); }
  }
  function onPortail(c) {
    if (c.type === 'traqueur') { sfx('traqueur'); voix('DANGER', 2); banniere('TRAQUEUR', { c: 'rose', duree: 1.4, clignote: true }, 1); return; }
    if (portailCd <= 0) { sfx('portail', { pan: pan(c.x) }); portailCd = 0.12; }
  }
  function onArme(c) {
    if (armeCd <= 0) { sfx('arme', { pan: c.cible && c.cible.x !== undefined ? pan(c.cible.x) : 0 }); armeCd = 0.2; }
  }
  function onPouvoir(c) {
    var h = head(); if (!h || (c.evt && c.evt !== 'debut' && c.evt !== 'start')) return;
    var id = c.id;
    if (id === 'traversee' || id === 'ralenti' || id === 'repli') sfx(id);
    onde(h.x, h.y, 4, id === 'repli' ? 40 : 64, id === 'ralenti' ? O.CYANP : O.CYAN, 0.45);
    tag(nom(id));
  }
  function onApogee(c) {
    var h = head(), A = RS.apogee || { gelImages: 6, ralenti: 0.25, duree: 0.42 };
    if (!h || (c.evt && c.evt !== 'debut' && c.evt !== 'start')) return;
    gel(A.gelImages);
    ralenti(A.ralenti, A.duree, { joueuse: false });
    for (var i = 0; i < 6; i++) {
      (function (k) { apres(0.05 * k, function () { var p = head(); if (p) onde(p.x, p.y, 4 + 2 * k, 60 + 24 * k, k & 1 ? O.CYANP : O.JAUNE, 0.5, { epaisseur: 3 }); }); })(i);
    }
    if (N.decor && N.decor.eclair) { try { N.decor.eclair(); } catch (e) { sig('eclair', e); } }
    sfx('ultime'); apres(A.duree, function () { cue('drop'); });
  }
  function onDefi(c) { sfx(c.ok ? 'defi' : 'defiRate'); }

  /* ============================ la mort (§ 5.4) ============================ */
  function onMort(d) {
    var J = N.joueuse, q = J && J.segs ? J.segs() : [], i, n = Math.min(q.length >> 1, 62);
    mt = 0; mortN = 0; mortTete = false;
    // la tête d'abord dans segs() ; la désintégration part de la queue, on range donc à l'envers
    for (i = 0; i < n; i++) { mortP[2 * i] = q[2 * (n - 1 - i)]; mortP[2 * i + 1] = q[2 * (n - 1 - i) + 1]; }
    mortLen = n;
    var h = head(); mortHX = h ? h.x : d.x; mortHY = h ? h.y : d.y;
    mortGO = !(N.score && N.score.vies > 0);
    ralenti(DIS.ralenti, 0.45, { visuel: true });                  // ralenti à 0,25 : les anneaux et les éclats s'étirent, pas la séquence
    if (N.fx && N.fx.vignette) { try { N.fx.vignette(NaN, 0.9); } catch (e) { sig('vignette', e); } }
  }
  function majMort(dt) {
    var tot = mortLen + 2, k, i;
    mt += dt;
    k = Math.min(mortLen, Math.floor(mt / DISSOLUTION * tot));
    for (i = mortN; i < k; i++) if (N.fx && N.fx.desintegre) { try { N.fx.desintegre([mortP[2 * i], mortP[2 * i + 1]], 0); } catch (e) { sig('desintegre', e); } }
    mortN = Math.max(mortN, k);
    if (!mortTete && mt >= DISSOLUTION) {                          // à la fin, la tête explose en cyan
      mortTete = true;
      boom(mortHX, mortHY, 0.5, O.CYAN, 'joueuse');
      if (mortGO && N.fx && N.fx.glitch) { try { N.fx.glitch(0.8, RM.glitch || 0.3); } catch (e) { sig('glitch', e); } }
    }
  }
  /* la cause entourée d'un anneau magenta d'un pixel, qui clignote à 3 Hz ; dessinée par-dessus le monde remappé */
  function drawCause() {
    var S = N.S, d = S && S.death;
    if (N.fx && N.fx.drawMort) { try { N.fx.drawMort(); } catch (e0) { sig('drawMort', e0); } }
    if (!d) return;
    var g = N.gfx, hz = (RM.anneauHz || 3) * 2, vis = (Math.floor((mt >= 0 ? mt : T) * hz) & 1) === 0, e = null, i, L = N.ennemis;
    if (!vis) return;
    if (d.cause === 'mur') {
      var m = N.joueuse.distMur(d.x, d.y), A = O.A;
      if (m.pan === 'g') g.rect(A.x0 - 3, d.y - 12, 3, 24, O.MAGENTA); else if (m.pan === 'd') g.rect(A.x1, d.y - 12, 3, 24, O.MAGENTA);
      else if (m.pan === 'h') g.rect(d.x - 12, A.y0 - 3, 24, 3, O.MAGENTA); else g.rect(d.x - 12, A.y1, 24, 3, O.MAGENTA);
      return;
    }
    if (d.auteurId !== null && d.auteurId !== undefined && L && L.list) {
      for (i = 0; i < L.list.length; i++) if (L.list[i].id === d.auteurId) e = L.list[i];
    }
    if (e) g.ring(Math.round(e.x), Math.round(e.y), Math.round(e.r + 4), O.MAGENTA, 1);
    if (d.cause === 'morsure') g.ring(Math.round(d.x), Math.round(d.y), 8, O.MAGENTA, 1);
    else if (d.cause === 'souffle') g.ring(Math.round(d.x), Math.round(d.y), 20, O.MAGENTA, 1);
    else if (!e || d.cause === 'tir' || d.cause === 'laser' || d.cause === 'traine' || d.cause === 'convoi') g.ring(Math.round(d.x), Math.round(d.y), 9, O.MAGENTA, 1);
  }

  /* ============================ la mise à jour : danger proche, minuteries ============================ */
  // Le journal suit le même état et la même phase que la vignette et music.danger.
  function journalDanger(evt) {
    if (N.arene && N.arene.battement) N.arene.battement(evt === 'battement');
  }
  function update(dt) {
    if (!(dt >= 0)) dt = 0;
    T += dt;
    if (impactEnAttente && !impactPlanifie) planifierImpact();
    if (hsCd > 0) hsCd -= dt;
    if (portailCd > 0) portailCd -= dt;
    if (armeCd > 0) armeCd -= dt;
    if (mt >= 0) {
      if (N.game && N.game.etat && N.game.etat() !== 'mort') mt = -1;
      else majMort(dt);
      return;
    }
    /* danger proche : les bords battent à 1,2 Hz près d'un mur ; le battement de la musique suit */
    var J = N.joueuse, P = J && J.tete;
    if (!P || J.etat !== 'vivant') { if (dangerT > 0) { dangerT = 0; dangerCycle = -1; journalDanger('battementFin'); if (N.music && N.music.danger) N.music.danger(0); } return; }
    var m = J.distMur ? J.distMur(P.x, P.y) : null, al = (R.monde && R.monde.mur && R.monde.mur.alerte) || 24;
    var k = m && m.d < al ? 1 - Math.max(0, m.d) / al : 0;
    if (k > 0.05) {
      dangerT += dt;
      var hz = (RS.danger && RS.danger.bordsHz) || 1.2, pulse = 0.55 + 0.45 * Math.sin(TAU * hz * dangerT);
      var cycle = Math.floor(dangerT * hz);
      if (cycle !== dangerCycle) { dangerCycle = cycle; journalDanger('battement'); }
      var ang = m.pan === 'g' ? Math.PI : m.pan === 'd' ? 0 : m.pan === 'h' ? -Math.PI / 2 : Math.PI / 2;
      if (N.fx && N.fx.vignette) N.fx.vignette(ang, 0.55 * k * pulse);
      if (N.music && N.music.danger) N.music.danger(k);
    } else if (dangerT > 0) { dangerT = 0; dangerCycle = -1; journalDanger('battementFin'); if (N.music && N.music.danger) N.music.danger(0); }
  }

  function reset() {
    T = 0; empreinteFin = -99; impactEnAttente = null; impactPlanifie = false; impactSerie++; hsCd = 0; banFin = -99; banDeb = -99; voixFin = -99; voixPrio = -1; portailCd = 0; armeCd = 0; dangerT = 0; dangerCycle = -1; mt = -1; mortN = 0; mortLen = 0;
    ST.booms = 0; ST.gels = 0; ST.ondes = 0; ST.bannieres = 0; ST.voix = 0; ST.poussees = 0; ST.sons = {};
    onVague.coupes0 = 0;
  }

  /* ============================ l'inscription : rang 60, nom '79-scene' ============================ */
  if (N.ev) {
    var tab = { kill: onKill, coup: onCoup, coupe: onCoupe, mort: onMort, ramassage: onRamassage, lasso: onLasso, niveau: onNiveau,
      vague: onVague, vol: onVol, inversion: onInversion, arene: onArene, phase: onPhase, portail: onPortail, arme: onArme,
      pouvoir: onPouvoir, apogee: onApogee, defi: onDefi };
    Object.keys(tab).forEach(function (ev) {
      N.ev.on(ev, 60, function (c) { try { tab[ev](c || {}); } catch (e) { sig(ev, e); } }, '79-scene');
    });
  }

  return { reset: reset, update: update, drawCause: drawCause, stats: ST };
})();
