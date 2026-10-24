/* 31-rythme — N.rythme, transport musical et chorégraphie. Aucun hasard partagé.
   Raccords explicites : update(dt,simule) dans 79, drawDecor/drawTop, attendre dans 72.
   Le transport audio public de 30 fournit un curseur déjà corrigé de sa latence :
   aucune deuxième soustraction. Sans raccord audio, beat() est déjà compensé.
   Les mêmes curseurs passent par analyser(), audio, VM et pilote ; événements
   ordonnés temps -> mesure -> break/reprise -> drop, indices de mesures à zéro.
   Bus local on/off : ne modifie pas le schéma fermé de N.ev. Journal type rythme.
   Pulsation sombre plein fond ; accents lumineux bornés et admis par flashGate.
   Aucun trauma de rythme. Cyan et objets de gameplay préservés. */
(function () {
  'use strict';
  var R = N.R.rythme, Q = N.R.temps.tempsParMesure, P = R.partition;
  var cartes = typeof RYTHME_CARTES !== 'undefined' ? RYTHME_CARTES : null;
  var tables = {}, auditeurs = {}, file = {}, vague = null, pret = false;
  var simT = 0, simId = '', reelAvant = null, dernier = null, serial = 0;
  var dropT = -Infinity, dernierRole = '', media = null, rendu = null;
  var dropImage = -1, flashDrop = false, dernierTemps = '', vagueDue = null, simVague = -1, trouCle = '';
  var pixelsSombres = 0, pixelsClairs = 0, encresSombres = null;
  var V = { t: 0, id: '', mesure: 0, temps: 0, phase: 0, phrase: 0, montee: 0,
    role: 'intro', absolu: 0, pulse: 0, drop: 0, retenue: false, source: 'simulation', latence: 0, dureeTemps: R.secondesMinute / R.bpmRepli };
  function borner(x) { return Math.max(0, Math.min(1, x)); }
  function reduit() {
    if (!media) media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var s = N.S && N.S.reglages;
    return media.matches || !!(s && (s.secousse === 0 || s.flashs === false));
  }
  function construire(data) {
    cartes = data || cartes; tables = {};
    if (!cartes) return;
    var cat = cartes.catalogue && cartes.catalogue.morceaux || [];
    cat.forEach(function (c) { tables[c.id] = { bpm: c.bpm, barres: c.barres, mesures: [], drops: [], breaks: [], montees: [] }; });
    var p = cartes.piste;
    if (p) {
      var b = [], d = p.dureeMesure;
      for (var i = 0; i < p.mesures; i++) b.push((p.premiereMesure || 0) + i * d);
      tables['neon-velocity'] = { bpm: p.bpm, barres: b, mesures: [], drops: [], breaks: [], montees: [], sections: p.sections };
    }
    var map = cartes.structure && cartes.structure.morceaux || {};
    Object.keys(map).forEach(function (id) { tables[id] = Object.assign({}, tables[id], map[id]); });
    // Les variantes t1 gardent les indices annotés du morceau, sur leurs
    // barres réellement remesurées. Aucun nouveau jugement de structure.
    cat.forEach(function (m) {
      if (!m.original || map[m.id] || !tables[m.original]) return;
      var base = tables[m.original], v = tables[m.id];
      v.mesures = (base.mesures || []).map(function (x) { return Object.assign({}, x, { t: barre(v, x.i) }); });
      v.drops = (base.drops || []).map(function (x) { return Object.assign({}, x, { t: barre(v, x.mesure) }); });
      v.breaks = (base.breaks || []).map(function (x) { return Object.assign({}, x); });
      v.montees = (base.montees || []).map(function (x) { return Object.assign({}, x); });
    });
  }
  construire(cartes);
  function table(id) { return tables[id] || { bpm: R.bpmRepli, barres: [] }; }
  function barre(c, i) {
    var b = c.barres || [], n = b.length, d = R.secondesMinute * Q / (c.bpm || R.bpmRepli);
    if (!n) return i * d;
    if (i < 0) return b[0] + i * (n > 1 ? b[1] - b[0] : d);
    if (i >= n) return b[n - 1] + (i - n + 1) * (n > 1 ? b[n - 1] - b[n - 2] : d);
    return b[i];
  }
  // NV contient une demi-mesure. Le nombre de temps vient de la durée réellement cartographiée.
  function nombreTemps(c, i) {
    return Math.max(1, Math.min(Q, Math.round((barre(c, i + 1) - barre(c, i)) * (c.bpm || R.bpmRepli) / R.secondesMinute)));
  }
  function plage(c, nom, i) { return (c[nom] || []).find(function (x) { return i >= x.de && i <= x.a; }); }
  function position(id, t) {
    var c = table(id), b = c.barres || [], lo = 0, hi = b.length;
    while (lo < hi) { var k = (lo + hi) >>> 1; if (b[k] <= t + R.epsilon) lo = k + 1; else hi = k; }
    var i = b.length ? lo - 1 : Math.floor(t / (R.secondesMinute * Q / (c.bpm || R.bpmRepli)) + R.epsilon);
    // Au-delà de la carte, prolonger sa dernière mesure au lieu de figer l'indice.
    // Un retour/bouclage du média repasse par la discontinuité du transport.
    if (b.length && lo === b.length) i += Math.floor((t - b[b.length - 1] + R.epsilon) / (barre(c, b.length) - b[b.length - 1]));
    if (i < 0) return { i: -1, beat: -1, phase: 0, d: (barre(c, 0) - barre(c, -1)) / Q };
    var t0 = barre(c, i), d = (barre(c, i + 1) - t0) / nombreTemps(c, i), u = Math.max(0, (t - t0) / d), beat = Math.min(nombreTemps(c, i) - 1, Math.floor(u + R.epsilon));
    return { i: i, beat: beat, phase: borner(u - beat), d: d };
  }
  function role(id, i) {
    var c = table(id), m = (c.mesures || []).find(function (x) { return x.i === i; });
    if (m) return m.role;
    var br = (c.breaks || []).some(function (x) { return i >= x.de && i <= x.a; });
    if (br) return 'break';
    if ((c.montees || []).some(function (x) { return i >= x.de && i <= x.a; })) return 'montee';
    if ((c.drops || []).some(function (x) { return x.mesure === i; })) return 'drop';
    if ((c.mesures || []).length) return 'refrain';
    // Repli annoncé, pas une détection acoustique : phrases de huit mesures.
    var p = Math.floor(i / R.phraseMesures), k = i % R.phraseMesures;
    if (p > 0 && p % R.repliBreakPhrase === 0 && k < R.breakMesures) return 'break';
    if (k >= R.phraseMesures - R.monteeMesures) return 'montee';
    var sec = (c.sections || []).find(function (s) { return i + 1 >= s.de && i + 1 <= s.a; });
    if (sec && /RESPIRATION|PONT/.test(sec.nom)) return 'break';
    return i < R.phraseMesures ? 'intro' : 'refrain';
  }
  function emettre(nom, d) {
    d.evt = nom; d.ordre = serial++; d.source = V.source; d.id = V.id;
    if (N.journal) N.journal('rythme', d);
    (auditeurs[nom] || []).slice().forEach(function (f) { try { f(d); } catch (e) { if (N.socle) N.socle.signaler('rythme:' + nom, e); } });
  }
  function analyser(cursor) {
    var id = cursor.id || 'neon-velocity', t = Math.max(0, cursor.t), p = position(id, t), c = table(id);
    V.absolu += dernier && dernier.id === id && t >= dernier.t ? t - dernier.t : 0;
    V.id = id; V.t = t; V.source = cursor.source; V.latence = cursor.latence || 0;
    V.mesure = Math.max(0, p.i); V.temps = Math.max(0, p.beat); V.phase = p.phase; V.dureeTemps = p.d;
    V.phrase = Math.floor(V.mesure / R.phraseMesures);
    var now = p.i * Q + p.beat, change = !dernier || dernier.id !== id || t + R.epsilon < dernier.t || cursor.discontinuite;
    if (change) { dropT = -Infinity; dernierRole = ''; dropImage = -1; flashDrop = false; trouCle = '';
      Object.keys(file).forEach(function (k) { annulerCle(k, 'transport'); });
      emettre('transport', { t: t, precedent: dernier && dernier.id });
    }
    var debut = change ? now : dernier.index + 1;
    // Un saut de piste réarme le curseur, il ne rejoue jamais les drops sautés.
    for (var k = debut; k <= now; k++) {
      if (k < 0) continue;
      var i = Math.floor(k / Q), b = k % Q;
      if (b >= nombreTemps(c, i)) continue;
      var at = barre(c, i) + b * (barre(c, i + 1) - barre(c, i)) / nombreTemps(c, i);
      var d = { t: at, observe: t, ecart: t - at, mesure: i, temps: b, phrase: Math.floor(i / R.phraseMesures) };
      emettre('temps', Object.assign({}, d));
      if (b === 0) {
        emettre('mesure', Object.assign({}, d));
        var ro = role(id, i), br = !!plage(c, 'breaks', i);
        if (br && dernierRole !== 'break') emettre('break', Object.assign({}, d));
        if (!br && dernierRole === 'break') emettre('reprise', Object.assign({}, d));
        var drops = c.drops || [], drop = drops.find(function (x) { return x.mesure === i; });
        var repli = !(c.mesures || []).length && !drops.length && i > 0 && i % R.phraseMesures === 0 && !br;
        if (drop || repli || !br && dernierRole === 'break') {
          dropT = at;
          impactDrop(d);
          emettre('drop', Object.assign({ force: drop ? drop.force : R.repriseForce, repli: repli, carte: !!drop, sortieBreak: !drop && !repli }, d));
        }
        dernierRole = br ? 'break' : ro;
      }
    }
    V.role = role(id, V.mesure); V.retenue = !!plage(c, 'breaks', V.mesure);
    V.montee = V.role === 'montee' ? borner(((V.mesure % R.phraseMesures) - (R.phraseMesures - R.monteeMesures) + (V.temps + V.phase) / Q) / R.monteeMesures) : 0;
    var range = (c.montees || []).find(function (x) { return V.mesure >= x.de && V.mesure <= x.a; });
    if (range) V.montee = borner((t - barre(c, range.de)) / (barre(c, range.a + 1) - barre(c, range.de)));
    V.pulse = reduit() ? 0 : Math.max(0, 1 - V.phase * V.dureeTemps / R.pulseDuree);
    V.drop = reduit() ? 0 : borner(1 - (t - dropT) / R.dropDuree);
    dernierTemps = id + ':' + now;
    preparerTrou();
    dernier = { id: id, t: t, index: now };
    // Délivrance stable : insertion FIFO, même analyseur en VM et en audio.
    Object.keys(file).forEach(function (key) { var e = file[key];
      if (e.id !== id) { annulerCle(key, 'morceau'); return; }
      if (t + R.epsilon >= e.due) { delete file[key]; e.fn(); }
    });
    if (vague && p.i >= 0 && (vagueDue === null || t + R.epsilon >= vagueDue)) {
      var f = vague; vague = null; vagueDue = null; f();
    }
    return V;
  }
  function choixSimule() {
    var n = N.dir && N.dir.vague ? N.dir.vague() : 0, section = N.music && N.music.piste ? N.music.piste().section : '';
    if (section === 'boss' || section === 'alerte' || N.colosse && N.colosse.actif()) return 'voix-duo';
    return n === 3 ? 'electro-calme' : n === 4 ? 'voix-machine' : n >= 5 ? 'voix-plus-vite' : 'neon-velocity';
  }
  function update(dt, simule) {
    if (!R.actif || N.S && N.S.paused) return;
    var ctx = N.music && N.music.context && N.music.context(), pilot = N.pilote && N.pilote.actif && N.pilote.actif();
    if (!simule && ctx && ctx.state === 'running') {
      if (N.music.transport) { var tr = N.music.transport(); if (tr) { var curseur = tr.rythme || tr; curseur.source = 'audio'; return analyser(curseur); } }
      // Raccord30 absent : beat() est déjà compensé, jamais compter la latence deux fois.
      var b = N.music.beat(), pi = N.music.piste(), mz = N.music.morceau(), lat = Math.min(R.latenceMax, (ctx.outputLatency || 0) + (ctx.baseLatency || 0));
      if (mz) return analyser({ id: mz.id, t: Math.max(0, mz.t - lat), source: 'audio-repli', latence: lat });
      var c = table('neon-velocity'), i = Math.max(0, (pi.mesure || b.bar) - (pi.bloc ? 1 : 0));
      return analyser({ id: 'neon-velocity', t: barre(c, i) + (b.beat + b.phase) * R.secondesMinute / N.music.tempo(), source: 'audio-repli', latence: lat });
    }
    var reel = N.horloge && N.horloge.reel ? N.horloge.reel() : null;
    var delta = reel !== null && reelAvant !== null ? Math.max(0, reel - reelAvant) : Math.max(0, dt || 0);
    reelAvant = reel;
    var id = choixSimule(), n = N.dir && N.dir.vague ? N.dir.vague() : 0;
    if (id !== simId || n !== simVague) { simId = id; simVague = n; simT = 0; dernier = null; dernierRole = ''; dropT = -Infinity; }
    simT += delta;
    return analyser({ id: id, t: simT, source: 'simulation', latence: 0 });
  }
  function prochain(t, phrase) {
    var c = table(V.id), p = position(V.id, t);
    if (phrase) return barre(c, Math.max(0, p.i + (p.beat === 0 && p.phase <= R.epsilon ? 0 : 1)));
    var pas = p.d / R.subdivisions, start = barre(c, Math.max(0, p.i));
    return start + Math.ceil((t - start) / pas - R.epsilon) * pas;
  }
  function annulerCle(key, raison) {
    var e = file[key]; if (!e) return false;
    delete file[key];
    if (e.annuler) e.annuler(raison);
    return true;
  }
  function attendre(type, id, fn, opts) {
    if (!R.actif || !pret) { fn(); return; }
    opts = opts || {};
    var key = type + ':' + id, due = opts.due === undefined ? dateNaissance(V.t) : opts.due, demande = V.t, morceau = V.id;
    if (due < V.t - N.R.temps.h - R.epsilon) due = dateNaissance(V.t);
    due = autoriserNaissance(due);
    function livrer() {
      if (N.journal) N.journal('rythme-action', { type: type, id: id, morceau: morceau, demande: demande, attendu: due, observe: V.t, ecart: V.t - due,
        attente: due - demande, dureeTemps: V.dureeTemps, changementPiste: morceau !== V.id });
      fn();
    }
    if (due <= V.t + R.epsilon) { livrer(); return; }
    if (!file[key]) file[key] = { id: V.id, due: due, fn: livrer, annuler: opts.annuler };
  }
  function reset() {
    Object.keys(file).forEach(function (k) { annulerCle(k, 'reset'); });
    emettre('transport', { t: 0, reset: true });
    file = {}; vague = null; vagueDue = null; simT = 0; simId = ''; simVague = -1; reelAvant = null; dernier = null; dernierRole = ''; dropT = -Infinity; serial = 0; pret = true;
    dropImage = -1; flashDrop = false; trouCle = ''; pixelsSombres = pixelsClairs = 0;
    V.absolu = V.t = V.mesure = V.temps = V.phase = V.phrase = V.montee = V.pulse = V.drop = 0; V.retenue = false; V.id = ''; V.role = 'intro'; rendu = null;
  }
  function image() { return N.S ? N.S.frame | 0 : 0; }
  function enJeu() { return N.game && /^(jeu|boss|reapparition|attraction|mort|vol|nettoyage|plongee|victoire)$/.test(N.game.etat()); }
  function impactDrop(d) {
    dropImage = image(); flashDrop = false;
    if (!enJeu()) return;
    if (N.fx && N.fx.hitstop) N.fx.hitstop(P.gelDropImages);
    // Le monde n'est pas dessiné pendant le VOL ; la mort remappe ses encres.
    // Une onde écran passe par l'API FX dans ces états, après le remappage du monde.
    if (!reduit() && N.fx && N.fx.onde && /^(mort|vol|victoire)$/.test(N.game.etat())) {
      var g = N.gfx;
      N.fx.onde(g.W / 2 - (g.ox ? g.ox() : 0), g.H / 2 - (g.oy ? g.oy() : 0), P.ondeEpaisseur, Math.max(g.W, g.H) * P.ondeRayon, N.pal.i('ambre'), R.dropDuree, { epaisseur: P.ondeEpaisseur, ecran: true });
    }
    if (!reduit() && N.fx && N.fx.flashGate && N.gfx) {
      flashDrop = N.fx.flashGate(N.gfx.W * N.gfx.H * P.flashPart, { type: 'drop-carte', ci: N.pal.i('ambre') });
    }
    if (N.journal) N.journal('rythme-impact', { t: d.t, observe: V.t, id: V.id, gelImages: P.gelDropImages,
      onde: !reduit(), flash: flashDrop, secousseImages: 0 });
  }
  function subdivision(t, division, strict) {
    var c = table(V.id), pos = position(V.id, t), i = Math.max(0, pos.i), start = barre(c, i), d = (barre(c, i + 1) - start) / nombreTemps(c, i);
    var k = Math.ceil((t - start) / d * division - (strict ? -R.epsilon : R.epsilon));
    var due = start + k * d / division;
    if (due > barre(c, i + 1) + R.epsilon) return subdivision(barre(c, i + 1), division, false);
    return due;
  }
  function dateNaissance(t) {
    var c = table(V.id), pos = position(V.id, t), i = Math.max(0, pos.i), d = (barre(c, i + 1) - barre(c, i)) / nombreTemps(c, i);
    var n = Math.ceil((t - barre(c, i)) / d - 1 / R.subdivisions - R.epsilon);
    return barre(c, i) + (n + 1 / R.subdivisions) * d;
  }
  function autoriserNaissance(t) {
    var c = table(V.id), p = position(V.id, t), br = plage(c, 'breaks', p.i), mo = plage(c, 'montees', p.i);
    if (br && p.i > br.de) t = barre(c, br.a + 1);
    if (mo && p.i === mo.a) t = Math.max(t, barre(c, mo.a + 1));
    return t;
  }
  // Fin de l'annonce sur la grille ; aucune durée contractuelle n'est raccourcie.
  function annonce(duree, tir) {
    var min = V.t + Math.max(0, duree), due = subdivision(min, R.subdivisions, false);
    if (due < min) due = subdivision(min, R.subdivisions, true);
    if (tir) {
      var p = position(V.id, due);
      while (P.tempsTirs.indexOf(p.beat) < 0 || p.phase > R.epsilon) { due = subdivision(due, 1, true); p = position(V.id, due); }
    }
    // L'arrondi ne doit jamais enlever même une fraction du préavis demandé.
    return { t: due, duree: due - V.t, minimum: duree };
  }
  function souffle() {
    var c = table(V.id), mo = plage(c, 'montees', V.mesure);
    return !!mo && V.mesure === mo.a;
  }
  function naissanceFormation(minimum) {
    var c = table(V.id), t = V.t + minimum, drop = (c.drops || []).find(function (d) { return d.t >= t - R.epsilon; });
    if (drop && drop.t - t <= Q * V.dureeTemps) return drop.t;
    var p = position(V.id, t); return barre(c, Math.max(0, p.i + (p.beat === 0 && p.phase < R.epsilon ? 0 : 1)));
  }
  function planWarp() {
    var c = table(V.id), p = position(V.id, V.t + P.warpEntree), i = Math.max(0, p.i + 1), entree = barre(c, i), salve = barre(c, i + P.warpMesures);
    return { id: V.id, depart: entree - P.warpEntree, entree: entree, salve: salve,
      visee: salve - entree, sortie: V.dureeTemps * P.warpSortieTemps,
      recharge: V.dureeTemps * P.warpRechargeTemps, ecart: V.dureeTemps / P.divisionsSalve };
  }
  function dateSon(division) {
    var ctx = N.music && N.music.context && N.music.context();
    if (!ctx || !pret || !V.id) return null;
    var due = subdivision(V.t + V.latence + P.avanceSon, division || P.divisionsSon, false);
    return { t: due, at: ctx.currentTime - V.latence + due - V.t, id: V.id };
  }
  function echo(nom, opts) {
    if (!N.music || !N.music.sfxAt) return false;
    var d = dateSon(); if (!d) return false;
    opts = Object.assign({}, opts || {});
    if (nom === 'butin') { var k = Math.max(0, Math.floor(opts.pitch || 0)); opts.pitch = P.gamme[k % P.gamme.length]; }
    N.music.sfxAt(nom, d.at, opts);
    if (N.journal) N.journal('rythme-son', { nom: nom, morceau: d.id, t: d.t, at: d.at, demande: V.t });
    return true;
  }
  function preparerTrou() {
    if (!souffle() || !N.music || !N.music.trouRythme) return;
    var c = table(V.id), m = plage(c, 'montees', V.mesure), fin = barre(c, m.a + 1), cle = V.id + ':' + fin;
    if (trouCle === cle) return;
    var ctx = N.music.context(); if (!ctx) return;
    var debut = fin - V.dureeTemps * P.trouTemps;
    N.music.trouRythme(ctx.currentTime - V.latence + debut - V.t, ctx.currentTime - V.latence + fin - V.t);
    trouCle = cle;
  }
  function dessinDebut() {
    var g = N.gfx, buf = g && g.buf && g.buf();
    if (!buf || !pret || reduit()) { rendu = null; return false; }
    if (!rendu || rendu.buf !== buf) rendu = { buf: buf, n: 0, max: 0, vus: new Uint8Array(buf.length), g: g };
    if (!encresSombres) { encresSombres = new Uint8Array(N.pal.C.length); ['vide', 'nuit', 'nuitProfonde', 'ardoise', 'violet', 'indigo'].forEach(function (n) { encresSombres[N.pal.i(n)] = 1; }); }
    rendu.cyan = N.pal.i('cyan'); rendu.cyanPale = N.pal.i('cyanPale');
    rendu.vus.fill(0); rendu.n = 0; rendu.max = Math.floor(buf.length * R.visuel.aireMax);
    pixelsSombres = pixelsClairs = 0;
    return true;
  }
  function sombre(ci) { return !!(encresSombres && encresSombres[ci]); }
  function point(x, y, ci, fond) {
    if (!rendu) return;
    var g = rendu.g; x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= g.W || y < 0 || y >= g.H) return;
    var k = y * g.W + x, old = rendu.buf[k];
    if (old === rendu.cyan || old === rendu.cyanPale) return;
    if (fond && !sombre(old)) return;
    if (!sombre(ci) && !(rendu.vus[k] & 2)) {
      if (pixelsClairs >= rendu.max) return;
      pixelsClairs++; rendu.vus[k] |= 2;
    }
    if (!(rendu.vus[k] & 1)) { if (sombre(ci)) pixelsSombres++; rendu.vus[k] |= 1; rendu.n++; }
    rendu.buf[k] = ci;
  }
  function drawDecor() {
    if (!dessinDebut()) return;
    var g = N.gfx, W = g.W, H = g.H, p = N.pal, vi = p.i('violet'), ind = p.i('indigo'), nu = p.i('nuit'), ar = p.i('ardoise');
    var pulse = V.pulse > R.visuel.seuilPulse, pas = R.visuel.pas, off = Math.floor(V.t * pas) % pas;
    // Le fond entier respire entre encres sombres : delta L < 0,10, aucun rouge saturé.
    if (V.retenue || V.montee > 0) for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var bord = x < W * P.vignettePart * V.montee || x >= W * (1 - P.vignettePart * V.montee) || y < H * P.vignettePart * V.montee;
      if (V.retenue || bord) {
        var old = rendu.buf[y * W + x];
        // Garder les différences de matière : le break assombrit, il n'efface pas les silhouettes.
        var ink = old === vi ? (pulse ? vi : ind) : old === ind ? (pulse ? ind : ar) : old === ar ? (pulse ? ar : nu) : old === nu ? (pulse ? nu : p.i('nuitProfonde')) : old;
        point(x, y, ink, true);
      }
    }
    for (var yy = off; yy < H; yy += pas) for (var xx = 0; xx < W; xx += pas) point(xx, yy, V.retenue ? ar : pulse ? vi : ind, true);
    // Roulement 1-2-4-8 traits par temps dans la dernière mesure ; jamais de blanc.
    var roulement = souffle() ? P.roulement[Math.min(P.roulement.length - 1, V.temps)] : 1;
    var count = Math.min(P.traitsMax, Math.ceil(V.montee * roulement * Q));
    for (var z = 0; z < count; z++) {
      var sx = (z * pas + off) % W, sy = (z * z + off * pas) % H;
      for (var h = 0; h < R.visuel.longueurTrait; h++) point(sx, sy + h, vi, true);
    }
    if (V.drop > 0) {
      var rayon = (1 - V.drop) * Math.max(W, H) * P.ondeRayon;
      for (var j = 0; j < R.visuel.pointsOnde; j++) {
        var a = j * Math.PI * 2 / R.visuel.pointsOnde;
        for (var ep = 0; ep < P.ondeEpaisseur; ep++) point(W / 2 + Math.cos(a) * (rayon + ep), H / 2 + Math.sin(a) * (rayon + ep), p.i('ambre'));
      }
      if (flashDrop && image() === dropImage) {
        // Un éclair local, une seule image et une seule admission globale.
        var hauteur = Math.max(1, Math.floor(H * P.flashPart));
        for (var fy = Math.floor(H / 2); fy < Math.floor(H / 2) + hauteur; fy++) for (var fx = 0; fx < W; fx++) point(fx, fy, p.i('ambre'), true);
      }
    }
  }
  function drawTop() {
    if (!rendu || reduit()) return;
    var p = N.pal, cam = N.cam || { x: 0, y: 0 }, ci = p.i('violet');
    (N.ennemis && N.ennemis.list || []).forEach(function (e) {
      if (e.etat === 'mort' || e.etat === 'portail') return;
      for (var j = 0; j < R.visuel.contourPoints; j++) {
        var a = j * Math.PI * 2 / R.visuel.contourPoints;
        point(e.x - cam.x + Math.cos(a) * (e.r + R.visuel.contourMarge), e.y - cam.y + Math.sin(a) * (e.r + R.visuel.contourMarge), ci);
      }
    });
  }
  N.rythme = { update: update, reset: reset, lire: function () { return Object.assign({}, V); },
    carte: construire, analyser: analyser, prochain: prochain, attendre: attendre,
    annuler: function (type, id, raison) { return annulerCle(type + ':' + id, raison || 'proprietaire'); },
    annulerVague: function () { vague = null; vagueDue = null; },
    vague: function (fn) { if (!R.actif || !pret) fn(); else if (!vague) { vague = fn; vagueDue = prochain(V.t, true); } },
    on: function (nom, fn) { if (!auditeurs[nom]) auditeurs[nom] = []; if (auditeurs[nom].indexOf(fn) < 0) auditeurs[nom].push(fn); },
    off: function (nom, fn) { auditeurs[nom] = (auditeurs[nom] || []).filter(function (f) { return f !== fn; }); },
    drawDecor: drawDecor, drawTop: drawTop, reduit: reduit,
    planWarp: planWarp, annonce: annonce, subdivision: subdivision, dateSon: dateSon, echo: echo, souffle: souffle,
    naissanceFormation: naissanceFormation, dateNaissance: dateNaissance,
    apparitionsPermises: function () { return autoriserNaissance(V.t) <= V.t + R.epsilon; },
    tempsCle: function () { return dernierTemps; },
    zoom: function () { return reduit() ? 1 : 1 + (P.zoomDrop - 1) * borner(1 - (V.t - dropT) / (P.zoomDropImages * N.R.temps.imageRef)); },
    calendrier: function (n) { var c = table(choixSimule()), drops = c.drops || [], br = c.breaks || []; return { temps: (barre(c, 1) - barre(c, 0)) / nombreTemps(c, 0), regle: P.calendrier[n] || {}, drop: drops.length ? drops[0].t : null, breakT: br.length ? barre(c, br[0].de) : null }; },
    vitesseDecor: function () { return reduit() ? 1 : V.retenue ? R.decor.retenue : 1 + V.montee * R.decor.gainMontee + V.drop * R.decor.gainDrop; },
    retenueEnnemis: function () { return V.retenue ? R.ennemis.retenue : 1; },
    diagnostic: function () { return { cartes: Object.keys(tables), attente: Object.keys(file).length, vague: !!vague, pixels: rendu ? rendu.n : 0, pixelsSombres: pixelsSombres, pixelsClairs: pixelsClairs, limite: rendu ? rendu.max : 0, trauma: R.visuel.trauma }; }
  };
})();
