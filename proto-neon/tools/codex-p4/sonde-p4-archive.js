/* Banc partagé VM/navigateur. Aucun champ _privé lu : vrais objets publics,
   événements et résultats de collision. Une scène neuve par appel. */
window.__P4 = (function () {
  function copie(x) { return JSON.parse(JSON.stringify(x)); }
  function couvre(z, x, y, marge) {
    var dx = x - z.x0, dy = y - z.y0;
    if (z.forme === 'ligne') {
      var ux = z.x1 - z.x0, uy = z.y1 - z.y0, d = ux * ux + uy * uy;
      var u = d ? Math.max(0, Math.min(1, (dx * ux + dy * uy) / d)) : 0;
      return Math.hypot(dx - u * ux, dy - u * uy) <= z.r + marge + 1e-8;
    }
    if (Math.hypot(dx, dy) > z.r + marge + 1e-8) return false;
    if (z.forme === 'secteur') {
      var tau = 2 * Math.PI, angle = ((Math.atan2(dy, dx) - z.a0) % tau + tau) % tau;
      return angle <= ((z.a1 - z.a0) % tau + tau) % tau;
    }
    return z.forme === 'disque';
  }
  function scene(opts) {
    if (opts.type.indexOf('mines-') === 0) return mines(opts);
    var N = window.__N, S = window.__S, h = N.R.temps.h, phase = opts.phase || 1, type = opts.type;
    localStorage.clear(); S.jour = 20261017; S.reglages.actions = 'doigts';
    N.intro.skip(); N.game.reset(7); N.game.dbg.god(true);
    if (N.pilote) N.pilote.arreter();
    N.journal.actif(true);
    if (type === 'ruche' || type === 'sentinelle') {
      N.game.dbg.vague(4); N.ennemis.spawn(type, 440, 280, { portail: 0 });
    } else N.game.dbg.boss();
    var arme = null, attaques = 0, armeVue = null, firstTele = null, premierDanger = null;
    var trace = [], creations = [], collisions = [], erreursSchema = [], tests = 0, rates = 0, pixels = [];
    var debut = N.horloge.t(), borne = 90, previousTele = [], previousHands = {}, premiers = {}, nPas = 0;
    var tir = N.ennemis.tir, rayon = N.ennemis.rayon, tuer = N.joueuse.tuer, couper = N.joueuse.couper;
    var srcC = { genre: 'arme', type: 'canon', id: -1 };
    function t() { return N.horloge.t(); }
    function tampon(moment) {
      if (!opts.pixels) return;
      N.gfx.clear(0); N.game.draw(); N.fx.draw(); N.game.drawTop();
      var b = N.gfx.buf(), hist = Array(N.pal.C.length).fill(0), horsPalette = 0;
      for (var c of b) { if (c < hist.length) hist[c]++; else horsPalette++; }
      pixels.push({ moment: moment, t: t(), w: N.gfx.W, h: N.gfx.H, histogramme: hist, horsPalette: horsPalette, indices: Array.from(b) });
    }
    function zones() { return (S.tele || []).filter(z => z.par.type === (type === 'ruche' || type === 'sentinelle' ? type : 'cyclope')); }
    function verifier(points, tele, genre) {
      for (var p of points) {
        tests++;
        if (!tele.some(z => couvre(z, p.x, p.y, p.marge || 0))) {
          rates++; if (erreursSchema.length < 12) erreursSchema.push({ genre: genre, t: t(), point: p });
        }
      }
    }
    function enregistrer(b, genre) {
      if (!b || !arme || b.src.type !== (type === 'sentinelle' ? 'sentinelle' : 'cyclope')) return;
      var points = [];
      if (genre === 'tir') {
        // Tous les centres de la trajectoire jusqu'à expiration ; rayon testé séparément sur la vue active.
        for (var u = 0; u <= 10; u++) points.push({ x: b.x + b.vx * b.vie * u / 10, y: b.y + b.vy * b.vie * u / 10 });
      } else for (var u = 0; u <= 10; u++) points.push({ x: b.x0 + (b.x1 - b.x0) * u / 10, y: b.y0 + (b.y1 - b.y0) * u / 10 });
      var ux = genre === 'tir' ? b.vx : b.x1 - b.x0, uy = genre === 'tir' ? b.vy : b.y1 - b.y0;
      var len = Math.hypot(ux, uy), r = genre === 'tir' ? b.r : b.w / 2, bords = [];
      for (var p of points) for (var signe of [-1, 1]) bords.push({ x: p.x - uy / len * r * signe, y: p.y + ux / len * r * signe });
      creations.push({ t: t(), genre: genre, objet: copie(b), points: points, bords: bords });
      if (premierDanger === null) premierDanger = t() + h; // 70-joueuse précède 72/73 dans la boucle.
    }
    N.ennemis.tir = function () { var b = tir.apply(this, arguments); enregistrer(b, 'tir'); return b; };
    N.ennemis.rayon = function () { var b = rayon.apply(this, arguments); enregistrer(b, 'laser'); return b; };
    N.joueuse.tuer = function (cause, src) {
      var pos = copie(N.joueuse.tete), result = tuer.apply(this, arguments);
      if (arme && src && src.type === 'cyclope' && result) {
        collisions.push({ t: t(), cause: cause, pos: pos, src: copie(src), resultat: result });
        if (type === 'bond' && arme && premierDanger === null) premierDanger = t();
      }
      return result;
    };
    N.joueuse.couper = function (k, src, cause) {
      var pos = copie(N.joueuse.segPos(k)), result = couper.apply(this, arguments);
      if (arme && src && src.type === 'cyclope' && result) collisions.push({ t: t(), cause: cause, pos: pos, resultat: result });
      return result;
    };
    N.ev.on('arme', 99, function (a) {
      if (a.type === 'cyclope' && N.colosse.phase() === phase) {
        var kind = a.forme === 'secteur' ? 'rayon' : a.forme === 'ligne' ? 'ciseaux' : phase === 3 ? (attaques % 2 === 0 ? 'bond' : 'salve2') : 'salve';
        attaques++;
        if (!arme && kind === type) arme = { t: t(), annonce: copie(a), type: kind };
      } else if (a.type === type && !arme) arme = { t: t(), annonce: copie(a), type: type };
    }, 'codex-p4');
    N.horloge.avancer();
    try {
      while (t() - debut < borne && nPas++ < borne / h * 4) {
        // Maintenir un placement reproductible ; le jeu et toutes ses collisions tournent normalement.
        var pos = { x: 512, y: 290, ang: Math.PI / 2, trace: true };
        if (arme && type === 'bond') {
          var z = zones().find(z => z.forme === 'disque'); if (z) { pos.x = z.x0; pos.y = z.y0; }
          if (t() >= arme.t + arme.annonce.total - 2 * h) N.game.dbg.god(false);
        }
        N.joueuse.force(pos); S.input.fire = false;
        if (phase > 1 && N.colosse.phase() < phase) {
          var oeil = N.ennemis.list.find(e => e.boss && e.partie === 'oeil');
          if (oeil && nPas % 12 === 0) N.ennemis.hit(oeil, N.R.colosse.pvPhase, srcC);
        }
        var avantCreation = creations.length;
        N.game.dbg.simuler(h);
        var tele = copie(zones());
        // beam() appelle rayon lexicalement dans 72 : observer l'objet public réel,
        // et non le seul export instrumenté utilisé par 73.
        if (arme && type === 'sentinelle' && premierDanger === null && N.ennemis.lasers.length) {
          var b = N.ennemis.lasers.find(b => b.src.type === 'sentinelle');
          if (b) enregistrer(b, 'laser');
        }
        for (var z of tele) {
          var er = N.ids.valider('tele', z); if (er.length) erreursSchema.push({ t: t(), schema: er });
        }
        if (arme) {
          if (!trace.length) tampon('annonce');
          if (premierDanger !== null && !premiers.danger) { premiers.danger = t(); tampon('danger'); }
          if (tele.length && firstTele === null) { firstTele = t(); armeVue = copie(tele); }
          for (var j = avantCreation; j < creations.length; j++) {
            // Vérifier le dernier avertissement ET la zone du vrai danger créé.
            verifier(creations[j].points, previousTele, 'dernier-avertissement');
            verifier(creations[j].points, tele, 'danger-actif');
            verifier(creations[j].bords, tele, 'largeur-danger-actif');
          }
          var hands = N.ennemis.list.filter(e => e.boss && e.partie === 'main');
          if (type === 'ciseaux') for (var m of hands) {
            if (m.etat === 'attaque') {
              if (premierDanger === null) premierDanger = t() + h;
              var old = previousHands[m.id] || m;
              verifier([{ x: m.x, y: m.y }, { x: old.x, y: old.y }], tele.concat(previousTele), 'main');
            }
            previousHands[m.id] = { x: m.x, y: m.y };
          }
          if (type === 'ruche') {
            var larves = N.ennemis.list.filter(e => e.type === 'larve');
            if (larves.length && !premiers.larves) premiers.larves = { t: t(), objets: copie(larves) };
            for (var l of larves) if (l.etat === 'portail') {
              var lr = l.r * N.R.mort.ennemi.facteurRayon;
              verifier([{ x: l.x, y: l.y }, { x: l.x + lr, y: l.y }, { x: l.x - lr, y: l.y },
                { x: l.x, y: l.y + lr }, { x: l.x, y: l.y - lr }], tele, 'larve-portail');
            }
            if (larves.some(l => l.etat !== 'portail')) {
              if (premierDanger === null) premierDanger = t() + h;
              verifier(larves.map(l => ({ x: l.x, y: l.y })), previousTele, 'premier-contact-larves');
            }
          }
          if (type === 'sentinelle' || type === 'rayon') {
            for (var b of N.ennemis.lasers) if (b.src.type === (type === 'sentinelle' ? 'sentinelle' : 'cyclope')) {
              // Public list : un laser présent a pu expirer au même pas ; un mort doit être ignoré
              // via la disparition au pas suivant, sans lire son état privé.
              var oeil = N.ennemis.list.find(e => e.boss && e.partie === 'oeil');
              if (b.t < b.d && (type === 'sentinelle' || oeil?.etat === 'attaque'))
                verifier([{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y1 }], tele, 'laser-vivant');
            }
          }
          for (var hit of collisions) if (!hit.verifie) { verifier([hit.pos], previousTele, 'collision-reelle'); hit.verifie = true; }
          trace.push({ t: t(), pas: N.horloge.pas(), etat: N.game.etat(), tele: tele,
            lasers: copie(N.ennemis.lasers), tirs: copie(N.ennemis.tirs), mains: copie(hands.map(e => ({ id: e.id, x: e.x, y: e.y, etat: e.etat }))) });
          if (premierDanger !== null && (type === 'bond' || type === 'ruche' || t() > premierDanger + (type === 'rayon' ? 1.5 : 1.2))) break;
        }
        previousTele = tele;
        if (window.__ERR.count) break;
      }
    } finally {
      N.ennemis.tir = tir; N.ennemis.rayon = rayon; N.joueuse.tuer = tuer; N.joueuse.couper = couper;
    }
    var buf = N.gfx.buf();
    tampon('fin-scene');
    return { phase: phase, type: type, arme: arme, premiereZone: firstTele, zonesInitiales: armeVue,
      premierDegatPossible: premierDanger, avance: premierDanger === null || firstTele === null ? null : premierDanger - firstTele,
      borne: !arme || premierDanger === null, couverture: { points: tests, rates: rates }, erreursSchema: erreursSchema,
      creations: creations, collisions: collisions, premiers: premiers, trace: trace, journal: N.journal.dump(),
      err: copie(window.__ERR), pixels: pixels, tampon: { w: N.gfx.W, h: N.gfx.H, taille: buf.length } };
  }
  // Les mines issues du bond sont des ennemis publics autonomes. Deux sondes
  // séparent leur contact tête de leur souffle, qui n'ont pas la même échéance.
  function mines(opts) {
    var N = window.__N, S = window.__S, h = N.R.temps.h;
    localStorage.clear(); S.jour = 20261017; S.reglages.actions = 'doigts';
    N.intro.skip(); N.game.reset(7); N.game.dbg.god(true); N.pilote.arreter();
    N.journal.actif(true); N.game.dbg.boss(); N.horloge.avancer();
    var trace = [], mine = null, apparition = null, premier = null, degat = null, mort = null, erreursSchema = [], pixels = [];
    var ancien = N.joueuse.tuer, avantTele = [];
    N.joueuse.tuer = function (cause, src) {
      var pos = copie(N.joueuse.tete), ok = ancien.apply(this, arguments);
      if (ok && mine && src?.type === 'mine' && !mort) { mort = { cause: cause, pos: pos, src: copie(src), t: N.horloge.t() }; degat = mort.t; }
      return ok;
    };
    // Les contacts de 70 passent par sa fonction tuer locale, pas par l'export.
    // L'événement de mort confirme la collision EFFECTIVE dans les deux chemins.
    N.ev.on('mort', 99, function (d) {
      if (mine && d.auteur === 'mine' && !mort) {
        mort = { cause: d.cause, pos: { x: d.x, y: d.y }, src: { type: d.auteur, id: d.auteurId }, journal: copie(d), t: N.horloge.t() };
        degat = mort.t;
      }
    }, 'codex-p4-mines');
    try {
      for (var i = 0; i < 90 / h; i++) {
        var pos = { x: 512, y: 290, ang: Math.PI / 2, trace: true };
        if (mine) {
          pos.x = mine.x + (opts.type === 'mines-souffle' ? 15 : 0); pos.y = mine.y;
          N.game.dbg.god(false);
        }
        N.joueuse.force(pos);
        if (N.colosse.phase() < 3 && i % 12 === 0) {
          var oeil = N.ennemis.list.find(e => e.boss && e.partie === 'oeil');
          if (oeil) N.ennemis.hit(oeil, N.R.colosse.pvPhase, { genre: 'arme', type: 'canon', id: -1 });
        }
        N.game.dbg.simuler(h);
        if (!mine && N.colosse.phase() === 3) {
          mine = N.ennemis.list.find(e => e.type === 'mine') || null;
          if (mine) apparition = N.horloge.t();
        }
        var tele = copie((S.tele || []).filter(z => z.par.type === 'mine' && z.par.id === mine?.id));
        if (mine) {
          for (var z of tele) { var er = N.ids.valider('tele', z); if (er.length) erreursSchema.push(er); }
          if (premier === null && tele.length) premier = N.horloge.t();
          trace.push({ t: N.horloge.t(), etat: N.game.etat(), tele: tele, mine: { id: mine.id, x: mine.x, y: mine.y, etat: mine.etat } });
        }
        if (mort) break;
        avantTele = tele;
      }
    } finally { N.joueuse.tuer = ancien; }
    if (opts.pixels) {
      N.gfx.clear(0); N.game.draw(); N.fx.draw(); N.game.drawTop();
      var b = N.gfx.buf(), hist = Array(N.pal.C.length).fill(0), horsPalette = 0;
      for (var c of b) { if (c < hist.length) hist[c]++; else horsPalette++; }
      pixels.push({ moment: 'collision', w: N.gfx.W, h: N.gfx.H, histogramme: hist, horsPalette: horsPalette, indices: Array.from(b) });
    }
    var rate = mort && !avantTele.some(z => couvre(z, mort.pos.x, mort.pos.y, N.R.mort.rayonTete));
    return { phase: 3, type: opts.type, arme: null, apparition: apparition, premiereZone: premier, premierDegatPossible: degat,
      avance: degat === null || premier === null ? null : degat - premier, borne: !mort,
      couverture: { points: mort ? 1 : 0, rates: rate ? 1 : 0 }, erreursSchema: erreursSchema,
      collisions: mort ? [mort] : [], creations: [], trace: trace, journal: N.journal.dump(), err: copie(window.__ERR), pixels: pixels };
  }
  return { scene: scene, couvre: couvre };
})();
